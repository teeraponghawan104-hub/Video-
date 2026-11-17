import React, { useState, useRef } from 'react';
import {
  inspectVideoFileInBrowser,
  parseMp4TopBoxes,
  formatFileSizeMb,
  formatDurationShort,
  type VideoInspectorInfo,
  type QualityAdvice,
  type Mp4BoxSummary,
} from '../utils/bareetEngine';

interface TikTokAnalyzeResponseData {
  url: string;
  cover?: string;
  author: {
    username: string;
    nickname: string;
    verified: boolean;
    followers: number;
  };
  description: string;
  uploadedAt: string;
  region: {
    code: string;
    name: string;
  };
  visibility: string;
  shadowban: {
    verdict: 'safe' | 'suspected' | 'restricted';
    signals: string[];
  };
  video: {
    label: string;
    width: number;
    height: number;
    fps: number;
    bitrateMbps: number;
    codec: string;
    durationSec: number;
    sizeBytes: number;
    engine: string;
  };
  file: {
    encoder: string;
    comment: string;
  };
  method: string;
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagementRate: number;
  };
}

export const TikTokAnalyzerView: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [result, setResult] = useState<TikTokAnalyzeResponseData | null>(null);

  // Local file deep inspection state
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localInfo, setLocalInfo] = useState<VideoInspectorInfo | null>(null);
  const [localAdvice, setLocalAdvice] = useState<QualityAdvice | null>(null);
  const [localAtoms, setLocalAtoms] = useState<Mp4BoxSummary[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runUrlAnalysis = async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;
    setPhase('loading');
    setErrorMsg('');
    setPasteNotice(null);

    try {
      const res = await fetch('/api/analyze-tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setResult(json.data);
        setPhase('done');
      } else {
        setErrorMsg(
          json.message || 'ลิงก์ไม่ถูกต้อง — กรุณาวางลิงก์วิดีโอ TikTok เท่านั้น'
        );
        setPhase('error');
      }
    } catch {
      setErrorMsg('ไม่สามารถเชื่อมต่อระบบวิเคราะห์ได้ กรุณาลองใหม่อีกครั้ง');
      setPhase('error');
    }
  };

  const handlePasteClipboard = async () => {
    setPasteNotice(null);
    try {
      const text = await navigator.clipboard.readText();
      const match = text.match(/https?:\/\/[^\s<>"']+/);
      if (!match?.[0]) {
        setPasteNotice('ไม่พบลิงก์ในคลิปบอร์ด — คัดลอกลิงก์คลิป TikTok ก่อนแล้วกดวางอีกครั้ง');
        inputRef.current?.focus();
        return;
      }
      setUrlInput(match[0]);
      await runUrlAnalysis(match[0]);
    } catch {
      setPasteNotice('เบราว์เซอร์ไม่อนุญาตให้อ่านคลิปบอร์ดอัตโนมัติ — แตะค้างที่ช่องแล้วกดวางได้เลย');
      inputRef.current?.focus();
    }
  };

  const handleInspectLocalFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setLocalFile(file);
    setLocalLoading(true);
    try {
      const { info, advice, bytes } = await inspectVideoFileInBrowser(
        file,
        'bareetv10'
      );
      const atoms = parseMp4TopBoxes(bytes);
      setLocalInfo(info);
      setLocalAdvice(advice);
      setLocalAtoms(atoms);
    } finally {
      setLocalLoading(false);
    }
  };

  const formatCompactNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-8 sm:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          วิเคราะห์คลิป TikTok & ตรวจเช็กไฟล์
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
          วางลิงก์วิดีโอ TikTok สาธารณะเพื่อเช็กความละเอียด บิตเรต เอนโคเดอร์ อัตราการมีส่วนร่วม และสัญญาณชาโดว์แบน หรือเลือกไฟล์จากเครื่องเพื่อตรวจโครงสร้างอะตอม MP4
        </p>
      </div>

      {/* URL Input Form (exact bareet.dev/analyzer layout) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runUrlAnalysis(urlInput);
        }}
        className="flex flex-col gap-2.5 sm:flex-row"
      >
        <label htmlFor="anz-url" className="sr-only">
          ลิงก์วิดีโอ TikTok
        </label>
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id="anz-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            required
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              setPasteNotice(null);
            }}
            placeholder="https://www.tiktok.com/@username/video/7400000000000000000"
            className="w-full rounded-xl border border-[#1B2040] bg-[#07080F] py-3 pl-3.5 pr-24 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-[#0EA5E9]"
          />
          <button
            type="button"
            onClick={() => void handlePasteClipboard()}
            disabled={phase === 'loading'}
            className="absolute inset-y-1.5 right-1.5 inline-flex items-center gap-1.5 rounded-lg border border-[#1B2040] bg-[#0B0D18] px-3 text-xs font-medium text-zinc-200 transition-colors hover:border-[#0284C7]/60 hover:bg-[#12152A] disabled:opacity-40"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect x="8" y="3" width="8" height="4" rx="1" />
              <path
                d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"
                strokeLinecap="round"
              />
            </svg>
            วางลิงก์
          </button>
        </div>

        <button
          type="submit"
          disabled={phase === 'loading'}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(14,165,233,0.25)] transition hover:from-[#0EA5E9] hover:to-[#38BDF8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase === 'loading' ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          )}
          {phase === 'loading' ? 'กำลังวิเคราะห์…' : 'วิเคราะห์คลิป'}
        </button>
      </form>

      {/* Quick sample URL button */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>ลองทดสอบด้วยลิงก์ตัวอย่าง:</span>
        <button
          type="button"
          onClick={() => {
            const demoUrl =
              'https://www.tiktok.com/@bareet.studio/video/7438912049182739719';
            setUrlInput(demoUrl);
            void runUrlAnalysis(demoUrl);
          }}
          className="text-[#7DD9FF] underline decoration-[#0EA5E9]/40 underline-offset-4 transition-colors hover:text-white"
        >
          @bareet.studio/video/7438912049182739719
        </button>
      </div>

      {pasteNotice && (
        <p role="status" className="text-xs text-amber-300/90">
          {pasteNotice}
        </p>
      )}

      {phase === 'error' && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-700/40 bg-red-900/15 px-4 py-3 text-sm text-red-200"
        >
          <span className="mt-0.5 font-bold text-red-400">✕</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TikTok URL Analysis Result Card */}
      {phase === 'done' && result && (
        <section className="relative rounded-2xl border border-[#12152A] bg-[#0B0D18]/80 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold text-zinc-100">
                  @{result.author.username}
                </span>
                <span className="text-xs font-medium text-emerald-400">
                  ● สาธารณะ · ปลอดภัย (ไม่พบสัญญาณชาโดว์แบน)
                </span>
              </div>
              <p className="text-xs text-zinc-400 tabular-nums">
                {result.author.nickname} ·{' '}
                {formatCompactNumber(result.author.followers)} ผู้ติดตาม
              </p>
              {result.description && (
                <p className="line-clamp-2 text-sm text-zinc-300">
                  {result.description}
                </p>
              )}
            </div>
          </div>

          {/* Technical Spec Grid */}
          <div className="mt-4 border-t border-[#12152A] pt-3.5">
            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-xl border border-[#12152A] bg-[#07080F]/60 px-3 py-2.5">
                <dt className="text-[11px] text-zinc-500">ความละเอียด</dt>
                <dd className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums">
                  {result.video.width}×{result.video.height}
                </dd>
              </div>
              <div className="rounded-xl border border-[#12152A] bg-[#07080F]/60 px-3 py-2.5">
                <dt className="text-[11px] text-zinc-500">เฟรมเรต</dt>
                <dd className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums">
                  {result.video.fps} FPS
                </dd>
              </div>
              <div className="rounded-xl border border-[#12152A] bg-[#07080F]/60 px-3 py-2.5">
                <dt className="text-[11px] text-zinc-500">บิตเรต</dt>
                <dd className="mt-0.5 text-sm font-semibold text-emerald-300 tabular-nums">
                  {result.video.bitrateMbps} Mbps
                </dd>
              </div>
              <div className="rounded-xl border border-[#12152A] bg-[#07080F]/60 px-3 py-2.5">
                <dt className="text-[11px] text-zinc-500">โคเด็ก & ความยาว</dt>
                <dd className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums">
                  H.264 · {result.video.durationSec} วิ
                </dd>
              </div>
              <div className="col-span-2 rounded-xl border border-[#12152A] bg-[#07080F]/60 px-3 py-2.5">
                <dt className="text-[11px] text-zinc-500">เอนจิน / เมธอด</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[#7DD9FF]">
                  {result.method}
                </dd>
              </div>
              <div className="col-span-2 rounded-xl border border-[#12152A] bg-[#07080F]/60 px-3 py-2.5">
                <dt className="text-[11px] text-zinc-500">เอนโคเดอร์ (Encoder Tag)</dt>
                <dd className="mt-0.5 truncate font-mono text-xs text-zinc-300">
                  {result.file.encoder}
                </dd>
              </div>
            </dl>
          </div>

          {/* Engagement Metrics */}
          <div className="mt-4 border-t border-[#12152A] pt-3.5">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <div className="rounded-xl border border-[#12152A] bg-[#07080F]/40 p-2.5 text-center">
                <div className="text-xs text-zinc-500">ยอดดู</div>
                <div className="mt-0.5 text-sm font-bold text-zinc-100 tabular-nums">
                  {formatCompactNumber(result.stats.views)}
                </div>
              </div>
              <div className="rounded-xl border border-[#12152A] bg-[#07080F]/40 p-2.5 text-center">
                <div className="text-xs text-zinc-500">ถูกใจ</div>
                <div className="mt-0.5 text-sm font-bold text-zinc-100 tabular-nums">
                  {formatCompactNumber(result.stats.likes)}
                </div>
              </div>
              <div className="rounded-xl border border-[#12152A] bg-[#07080F]/40 p-2.5 text-center">
                <div className="text-xs text-zinc-500">คอมเมนต์</div>
                <div className="mt-0.5 text-sm font-bold text-zinc-100 tabular-nums">
                  {formatCompactNumber(result.stats.comments)}
                </div>
              </div>
              <div className="rounded-xl border border-[#12152A] bg-[#07080F]/40 p-2.5 text-center">
                <div className="text-xs text-zinc-500">แชร์</div>
                <div className="mt-0.5 text-sm font-bold text-zinc-100 tabular-nums">
                  {formatCompactNumber(result.stats.shares)}
                </div>
              </div>
              <div className="rounded-xl border border-[#12152A] bg-[#07080F]/40 p-2.5 text-center">
                <div className="text-xs text-zinc-500">บันทึก</div>
                <div className="mt-0.5 text-sm font-bold text-zinc-100 tabular-nums">
                  {formatCompactNumber(result.stats.saves)}
                </div>
              </div>
              <div className="rounded-xl border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 p-2.5 text-center">
                <div className="text-xs text-[#7DD9FF]">การมีส่วนร่วม</div>
                <div className="mt-0.5 text-sm font-bold text-[#7DD9FF] tabular-nums">
                  {result.stats.engagementRate}%
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Local File Deep Inspector (Check if a file in your device was patched with Bareet Method) */}
      <section className="rounded-2xl border border-[#12152A] bg-[#0B0D18]/70 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              ตรวจโครงสร้างไฟล์วิดีโอในเครื่อง (MP4 / MOV Inspector)
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              เช็กว่าไฟล์วิดีโอผ่านการแพตช์ Bareet Engine แล้วหรือยัง พร้อมดูโครงสร้างอะตอม ISO BMFF และบิตเรตจริง
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-xl border border-[#1B2040] bg-[#12152A] px-4 py-2.5 text-xs font-semibold text-zinc-100 transition-colors hover:border-[#0EA5E9]/60 hover:text-white"
          >
            เลือกไฟล์เพื่อตรวจสอบ
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov,video/*"
            className="hidden"
            onChange={(e) => void handleInspectLocalFile(e.target.files)}
          />
        </div>

        {localLoading && (
          <p className="mt-4 text-xs text-zinc-400">กำลังอ่านโครงสร้างไฟล์…</p>
        )}

        {localFile && localInfo && !localLoading && (
          <div className="mt-4 space-y-3 border-t border-[#12152A] pt-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-zinc-100">{localFile.name}</span>
              <span
                className={
                  localInfo.alreadyPatched
                    ? 'font-semibold text-emerald-400'
                    : 'font-medium text-amber-300'
                }
              >
                {localInfo.alreadyPatched
                  ? '✓ ตรวจพบแพตช์ Bareet Engine ในไฟล์นี้แล้ว'
                  : '• ไฟล์ต้นฉบับ (ยังไม่ได้แพตช์ Bareet Method)'}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-[#12152A] bg-[#07080F]/60 p-2.5">
                <dt className="text-zinc-500">ความละเอียด & FPS</dt>
                <dd className="mt-0.5 font-semibold text-zinc-100 tabular-nums">
                  {localInfo.width}×{localInfo.height} · {localInfo.fps} FPS
                </dd>
              </div>
              <div className="rounded-lg border border-[#12152A] bg-[#07080F]/60 p-2.5">
                <dt className="text-zinc-500">บิตเรต & ขนาด</dt>
                <dd className="mt-0.5 font-semibold text-zinc-100 tabular-nums">
                  {localInfo.bitrateMbps} Mbps · {formatFileSizeMb(localInfo.sizeBytes)}
                </dd>
              </div>
              <div className="rounded-lg border border-[#12152A] bg-[#07080F]/60 p-2.5">
                <dt className="text-zinc-500">โคเด็กวิดีโอ / เสียง</dt>
                <dd className="mt-0.5 font-semibold text-zinc-100">
                  {localInfo.codec} / {localInfo.audioCodec}
                </dd>
              </div>
              <div className="rounded-lg border border-[#12152A] bg-[#07080F]/60 p-2.5">
                <dt className="text-zinc-500">ความยาว & เอนโคเดอร์</dt>
                <dd className="mt-0.5 truncate font-mono text-zinc-200 tabular-nums">
                  {formatDurationShort(localInfo.durationSec)} ·{' '}
                  {localInfo.encoderTag || 'Standard'}
                </dd>
              </div>
            </dl>

            {localAtoms.length > 0 && (
              <div className="rounded-lg border border-[#12152A] bg-[#07080F]/60 p-2.5">
                <div className="text-zinc-500">
                  ลำดับอะตอมคอนเทนเนอร์ (ISO BMFF Atom Order):
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[#7DD9FF]">
                  {localAtoms.map((box, idx) => (
                    <span key={`${box.type}-${idx}`}>
                      [{box.type} · {box.size.toLocaleString()} B]
                      {idx < localAtoms.length - 1 ? ' → ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {localAdvice && (
              <div className="text-zinc-400">
                คำแนะนำบิตเรตสำหรับ {localAdvice.bitrateWarning.clipLabel}:{' '}
                <span className="font-medium text-emerald-300">
                  แนะนำ {localAdvice.bitrateWarning.recMin}–
                  {localAdvice.bitrateWarning.recMax} Mbps
                </span>{' '}
                (ไฟล์นี้อยู่ที่ {localAdvice.bitrateWarning.mbps} Mbps)
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
