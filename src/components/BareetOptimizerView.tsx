import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  BAREET_PATCH_OPTIONS,
  UPSCALE_SHARPNESS_PRESETS,
  computeTargetUpscaleDimensions,
  inspectVideoFileInBrowser,
  processVideoWithBareetEngine,
  formatFileSizeMb,
  formatDurationShort,
  formatBareetOutputFilename,
  type BareetPatchMode,
  type UpscaleResolutionTier,
  type UpscaleSharpnessPreset,
  type UpscaleAspectMode,
  type VideoInspectorInfo,
  type QualityAdvice,
  type BareetProcessResult,
} from '../utils/bareetEngine';
import {
  saveUploadedVideoToDb,
  loadUploadedVideoFromDb,
  clearUploadedVideoFromDb,
  savePatchedHistoryEntry,
  loadPatchedHistoryEntries,
  deletePatchedHistoryEntry,
  type PatchedHistoryEntry,
} from '../utils/videoStorage';

interface BareetOptimizerViewProps {
  onOpenAnalyzer: () => void;
  onOpenGuide: () => void;
}

function playCompletionChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.09); // A5
    osc2.frequency.setValueAtTime(1174.66, now + 0.09); // D6
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now + 0.09);
    osc1.stop(now + 0.38);
    osc2.stop(now + 0.38);
  } catch {
    // ignore audio autoplay restrictions
  }
}

export const BareetOptimizerView: React.FC<BareetOptimizerViewProps> = ({
  onOpenAnalyzer,
  onOpenGuide,
}) => {
  const [chosenMode, setChosenMode] =
    useState<BareetPatchMode>('upscale_1080p60');
  const [resolutionTier, setResolutionTier] =
    useState<UpscaleResolutionTier>('2k');
  const [sharpnessPreset, setSharpnessPreset] =
    useState<UpscaleSharpnessPreset>('crisp');
  const [aspectMode, setAspectMode] = useState<UpscaleAspectMode>('keep');
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [inspectorInfo, setInspectorInfo] = useState<VideoInspectorInfo | null>(
    null
  );
  const [qualityAdvice, setQualityAdvice] = useState<QualityAdvice | null>(
    null
  );
  const [cachedBytes, setCachedBytes] = useState<Uint8Array | null>(null);
  const [isCheckingFile, setIsCheckingFile] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showAdviceDetail, setShowAdviceDetail] = useState<boolean>(true);
  const [showSourcePreview, setShowSourcePreview] = useState<boolean>(false);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [customBitrateMbps, setCustomBitrateMbps] = useState<number | null>(
    null
  );
  const [customFps, setCustomFps] = useState<number | null>(null);
  const [previewCompareTab, setPreviewCompareTab] = useState<'after' | 'before'>(
    'after'
  );

  // Processing state
  const [phase, setPhase] = useState<'idle' | 'optimizing' | 'ready' | 'failed'>(
    'idle'
  );
  const [progressPct, setProgressPct] = useState<number>(0);
  const [progressStageLabel, setProgressStageLabel] = useState<string>('');
  const [stepLogs, setStepLogs] = useState<string[]>([]);
  const [doneResult, setDoneResult] = useState<BareetProcessResult | null>(
    null
  );
  const [donePreviewUrl, setDonePreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState<boolean>(false);

  // History state
  const [historyEntries, setHistoryEntries] = useState<PatchedHistoryEntry[]>(
    []
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const refreshHistory = useCallback(async () => {
    const entries = await loadPatchedHistoryEntries();
    setHistoryEntries(entries);
  }, []);

  useEffect(() => {
    void refreshHistory();
    loadUploadedVideoFromDb().then((saved) => {
      if (saved) {
        void handleSelectSingleFile(saved, false);
      }
    });
  }, [refreshHistory]);

  useEffect(() => {
    if (!pickedFile) {
      setSourcePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pickedFile);
    setSourcePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pickedFile]);

  useEffect(() => {
    if (!doneResult?.blob) {
      setDonePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(doneResult.blob);
    setDonePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doneResult]);

  const handleSelectSingleFile = async (
    file: File,
    persistToDb = true,
    overrideMode?: BareetPatchMode
  ) => {
    setPickedFile(file);
    setDoneResult(null);
    setErrorMsg(null);
    setPhase('idle');
    setStepLogs([]);
    setCustomBitrateMbps(null);
    setCustomFps(null);
    setIsCheckingFile(true);

    if (persistToDb) {
      void saveUploadedVideoToDb(file);
    }

    try {
      const activeMode = overrideMode || chosenMode;
      const { info, advice, bytes } = await inspectVideoFileInBrowser(
        file,
        activeMode
      );
      setInspectorInfo(info);
      setQualityAdvice(advice);
      setCachedBytes(bytes);
    } catch {
      setInspectorInfo(null);
      setQualityAdvice(null);
      setCachedBytes(null);
    } finally {
      setIsCheckingFile(false);
    }
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const firstFile = files[0];
    if (files.length > 1) {
      showToast(`ทำได้ทีละ 1 วิดีโอ ระบบจะใช้เฉพาะ ${firstFile.name}`);
    }
    void handleSelectSingleFile(firstFile, true);
  };

  const handleClearFile = () => {
    setPickedFile(null);
    setInspectorInfo(null);
    setQualityAdvice(null);
    setCachedBytes(null);
    setDoneResult(null);
    setErrorMsg(null);
    setPhase('idle');
    setStepLogs([]);
    setCustomBitrateMbps(null);
    setCustomFps(null);
    setShowSourcePreview(false);
    void clearUploadedVideoFromDb();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadDemoSampleClip = async () => {
    setIsLoadingSample(true);
    try {
      const res = await fetch('/assets/sample_story_1080p.mp4');
      if (!res.ok) throw new Error('Sample clip fetch failed');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'IMG_0720_TikTok_1080p60.mp4', {
        type: 'video/mp4',
      });
      await handleSelectSingleFile(sampleFile, true);
      showToast('โหลดคลิปตัวอย่าง IMG_0720_TikTok_1080p60.mp4 พร้อมทดสอบแล้ว');
    } catch {
      showToast('ไม่สามารถโหลดไฟล์ตัวอย่างได้ กรุณาเลือกไฟล์จากเครื่อง');
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleModeChange = (newMode: BareetPatchMode) => {
    setChosenMode(newMode);
    if (pickedFile) {
      void handleSelectSingleFile(pickedFile, false, newMode);
    }
  };

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickedFile || phase === 'optimizing') return;

    setPhase('optimizing');
    setErrorMsg(null);
    setDoneResult(null);
    setPreviewCompareTab('after');
    setProgressPct(8);
    setProgressStageLabel('กำลังอ่านไฟล์…');
    setStepLogs(['กำลังอ่านไฟล์วิดีโอในเบราว์เซอร์…']);

    try {
      const effectiveTargetBitrate =
        customBitrateMbps !== null ? customBitrateMbps : undefined;
      const effectiveTargetFps =
        customFps !== null ? customFps : inspectorInfo?.fps || 60;

      const res = await processVideoWithBareetEngine(pickedFile, chosenMode, {
        preloadedBytes: cachedBytes || undefined,
        resolutionTier,
        sharpnessPreset,
        aspectMode,
        targetBitrateMbps: effectiveTargetBitrate,
        targetFps: effectiveTargetFps,
        sourceWidth: inspectorInfo?.width,
        sourceHeight: inspectorInfo?.height,
        forceReencode:
          customFps !== null && customFps !== (inspectorInfo?.fps || 60),
        onStage: (_stageKey, logText, pct) => {
          setProgressPct(pct);
          setProgressStageLabel(logText);
          setStepLogs((prev) =>
            prev[prev.length - 1] === logText ? prev : [...prev, logText]
          );
        },
      });

      setDoneResult(res);
      setPhase('ready');
      setProgressPct(100);
      if (soundOn) {
        playCompletionChime();
      }

      const appliedFpsLabel =
        res.outputFps ||
        (customFps !== null ? customFps : inspectorInfo?.fps || 60);
      const outW = res.outputWidth || inspectorInfo?.width || 1080;
      const outH = res.outputHeight || inspectorInfo?.height || 1920;
      const historyEntry: PatchedHistoryEntry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: res.outputName,
        size: res.outputSizeBytes,
        mode: res.appliedMode,
        resolutionLabel: `${outW}×${outH} · ${appliedFpsLabel}fps`,
        patchedAt: Date.now(),
        blob: res.blob,
      };
      await savePatchedHistoryEntry(historyEntry);
      await refreshHistory();
    } catch (err) {
      setPhase('failed');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'เกิดข้อผิดพลาดขณะประมวลผลวิดีโอ กรุณาลองใหม่อีกครั้ง'
      );
    }
  };

  const triggerDownloadBlob = (blob: Blob, filename: string) => {
    const safeFilename = filename.endsWith('.mp4')
      ? filename
      : formatBareetOutputFilename(filename);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    showToast(`กำลังดาวน์โหลด ${safeFilename}`);
  };

  const handleShareOrSaveMobile = async (blob: Blob, filename: string) => {
    const safeFilename = filename.endsWith('.mp4')
      ? filename
      : formatBareetOutputFilename(filename);
    const mp4File = new File([blob], safeFilename, { type: 'video/mp4' });
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };
    if (
      typeof nav.share === 'function' &&
      typeof nav.canShare === 'function' &&
      nav.canShare({ files: [mp4File] })
    ) {
      try {
        await nav.share({
          files: [mp4File],
          title: safeFilename,
          text: 'ปรับความคมชัดด้วย Bareet Engine พร้อมอัป TikTok',
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    triggerDownloadBlob(blob, safeFilename);
  };

  const handleDeleteHistoryItem = async (id: string, name: string) => {
    await deletePatchedHistoryEntry(id);
    await refreshHistory();
    showToast(`ลบ ${name} ออกจากประวัติแล้ว`);
  };

  const activePatchOption =
    BAREET_PATCH_OPTIONS.find((o) => o.id === chosenMode) ||
    BAREET_PATCH_OPTIONS[0];

  const fileExt =
    pickedFile?.name.split('.').pop()?.toUpperCase().slice(0, 4) || 'MP4';

  // Interactive Bitrate & Frame Rate Control Panel (exact bareet.dev O modal formula + live slider)
  const renderBitrateGauge = (advice: QualityAdvice) => {
    const { mbps: originalMbps, warnBelow, recMin, recMax, clipLabel } =
      advice.bitrateWarning;
    const activeMbps =
      customBitrateMbps !== null
        ? Number(customBitrateMbps.toFixed(1))
        : originalMbps;
    const originalFps = inspectorInfo?.fps || 60;
    const activeFps = customFps !== null ? customFps : originalFps;
    const isCustomized = customBitrateMbps !== null || customFps !== null;

    const scaleMax = Math.max(40, recMax / 0.75);
    const toPct = (v: number) =>
      Math.min(97, Math.max(3, (v / scaleMax) * 100));

    const activeStatus: 'low' | 'optimal' | 'high' =
      activeMbps < warnBelow
        ? 'low'
        : activeMbps > recMax * 1.25
        ? 'high'
        : 'optimal';

    return (
      <div className="mt-3 rounded-xl border border-[#1B2040]/80 bg-[#07080F]/70 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
            <span className="flex h-5 items-center justify-center rounded-md bg-[#0EA5E9]/15 px-1.5 font-mono text-[10px] font-semibold text-[#7DD9FF]">
              BITRATE
            </span>
            <span>ความคมชัดบิตเรต ({clipLabel})</span>
          </div>
          <div className="flex items-baseline gap-1 font-mono tabular-nums">
            <span
              className={`text-sm font-bold ${
                activeStatus === 'optimal'
                  ? 'text-emerald-300'
                  : 'text-amber-300'
              }`}
            >
              {activeMbps}
            </span>
            <span className="text-[11px] text-zinc-500">Mbps</span>
          </div>
        </div>

        {/* Interactive Gauge Bar + Range Slider */}
        <div className="relative mt-3 select-none">
          <div className="relative py-2">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-[#12152A]">
              <div
                className="h-full bg-gradient-to-r from-red-500/70 to-amber-400/70"
                style={{ width: `${(warnBelow / scaleMax) * 100}%` }}
              />
              <div
                className="h-full bg-[#1B2040]"
                style={{
                  width: `${Math.max(0, ((recMin - warnBelow) / scaleMax) * 100)}%`,
                }}
              />
              <div
                className="h-full bg-gradient-to-r from-emerald-500/80 to-emerald-400/80"
                style={{ width: `${((recMax - recMin) / scaleMax) * 100}%` }}
              />
            </div>

            {/* Visual Thumb */}
            <div
              className="pointer-events-none absolute top-0.5 transition-all duration-75"
              style={{ left: `${toPct(activeMbps)}%` }}
            >
              <div
                className={`-ml-[7px] h-5 w-3.5 rounded border-2 border-zinc-100 shadow-[0_0_12px_rgba(56,189,248,0.65)] ${
                  activeStatus === 'optimal' ? 'bg-emerald-400' : 'bg-amber-300'
                }`}
              />
            </div>

            {/* Real Interactive Range Input Overlaid Across the Full Bar */}
            <input
              type="range"
              aria-label="ปรับบิตเรตวิดีโอ (Mbps)"
              min={2}
              max={40}
              step={0.5}
              value={Math.min(40, Math.max(2, activeMbps))}
              onChange={(e) => setCustomBitrateMbps(Number(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <div className="relative mt-1 flex items-center justify-between text-[10px] text-zinc-400 tabular-nums">
            <span>
              {customBitrateMbps !== null
                ? `ตั้งค่าเป้าหมาย: ${activeMbps} Mbps (ต้นฉบับ ${originalMbps} Mbps)`
                : `คลิปนี้: ${originalMbps} Mbps (ลากแถบเพื่อปรับได้)`}
            </span>
            <span className="font-medium text-emerald-300">
              แนะนำ {recMin}–{recMax} Mbps
            </span>
          </div>

          {/* Quick Bitrate Preset Buttons */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCustomBitrateMbps(null)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors tabular-nums ${
                customBitrateMbps === null
                  ? 'border-[#0EA5E9] bg-[#0EA5E9]/20 text-white'
                  : 'border-[#1B2040] bg-[#0B0D18] text-zinc-400 hover:border-[#0284C7]/60 hover:text-zinc-200'
              }`}
            >
              ค่าเดิม ({originalMbps} Mbps)
            </button>
            <button
              type="button"
              onClick={() => setCustomBitrateMbps(recMin)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors tabular-nums ${
                customBitrateMbps === recMin
                  ? 'border-emerald-500/80 bg-emerald-500/20 text-emerald-200'
                  : 'border-[#1B2040] bg-[#0B0D18] text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-200'
              }`}
            >
              TikTok แนะนำ ({recMin} Mbps)
            </button>
            <button
              type="button"
              onClick={() => setCustomBitrateMbps(recMax)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors tabular-nums ${
                customBitrateMbps === recMax
                  ? 'border-[#38BDF8] bg-[#0EA5E9]/20 text-[#7DD9FF]'
                  : 'border-[#1B2040] bg-[#0B0D18] text-zinc-300 hover:border-[#38BDF8]/50 hover:text-[#7DD9FF]'
              }`}
            >
              คมชัดสูงสุด ({recMax} Mbps)
            </button>
          </div>
        </div>

        {/* Interactive FPS Smoothness Bar & Selector */}
        <div className="mt-3.5 border-t border-[#12152A] pt-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-zinc-300">ความลื่นไหล (Frame Rate)</span>
            <div className="flex items-center gap-1 font-mono tabular-nums">
              {([30, 60, 120] as const).map((fpsOpt) => {
                const isSelected = activeFps === fpsOpt;
                return (
                  <button
                    key={fpsOpt}
                    type="button"
                    onClick={() =>
                      setCustomFps(fpsOpt === originalFps ? null : fpsOpt)
                    }
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                      isSelected
                        ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-200'
                        : 'border-[#1B2040] bg-[#0B0D18] text-zinc-400 hover:border-[#0284C7]/50 hover:text-zinc-200'
                    }`}
                  >
                    {fpsOpt} FPS
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="mt-2 flex gap-[2px]"
            role="group"
            aria-label="แถบเลือกเฟรมเรต"
          >
            {Array.from({ length: 30 }, (_, idx) => {
              const filled =
                idx < Math.floor((Math.min(60, activeFps) / 60) * 30);
              const targetSegmentFps = idx < 15 ? 30 : 60;
              return (
                <button
                  key={idx}
                  type="button"
                  title={`ตั้งค่า ${targetSegmentFps} FPS`}
                  onClick={() =>
                    setCustomFps(
                      targetSegmentFps === originalFps ? null : targetSegmentFps
                    )
                  }
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    filled
                      ? 'bg-emerald-400/90 hover:bg-emerald-300'
                      : 'bg-[#1B2040] hover:bg-[#0284C7]/60'
                  }`}
                />
              );
            })}
          </div>

          {isCustomized && (
            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-2.5 py-1.5 text-[11px] text-[#7DD9FF]">
              <span>
                ตั้งค่ากำหนดเอง: <strong>{activeMbps} Mbps</strong> ·{' '}
                <strong>{activeFps} FPS</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomBitrateMbps(null);
                  setCustomFps(null);
                }}
                className="font-semibold text-white underline decoration-[#7DD9FF]/50 underline-offset-2 hover:text-[#7DD9FF]"
              >
                รีเซ็ตค่าเดิม
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      {/* Top Optimizer Header (exact bareet.dev ed layout) */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#7DD9FF]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
            <span>AI Upscale 2K/4K × Bareet Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-[28px]">
            อัพสเกล & ปรับวิดีโอก่อนอัป TikTok
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            ขยายความละเอียด 1080p / 2K / 4K เร่งความคมขอบภาพ ดันบิตเรตสูง 60–120 FPS พร้อมแพตช์ Bareet ป้องกัน TikTok ลดคุณภาพ
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSoundOn((prev) => !prev)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#12152A] bg-[#0B0D18] text-zinc-400 transition-colors hover:border-[#1B2040] hover:text-zinc-200"
          title={soundOn ? 'เปิดเสียงแจ้งเตือนเมื่อเสร็จ' : 'ปิดเสียงแจ้งเตือน'}
          aria-label={soundOn ? 'เปิดเสียงแจ้งเตือนเมื่อเสร็จ' : 'ปิดเสียงแจ้งเตือน'}
          aria-pressed={soundOn}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
            {soundOn ? (
              <path
                d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"
                strokeLinecap="round"
              />
            ) : (
              <path d="m16 9 5 6m0-6-5 6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Quota & Capability Strip (exact bareet.dev ec strip) */}
      <div className="mb-4 grid grid-cols-2 divide-x divide-[#12152A] overflow-hidden rounded-2xl border border-[#12152A] bg-[#0B0D18]/80">
        <div className="min-w-0 px-3.5 py-3 sm:px-4">
          <div className="flex items-center gap-1.5 text-lg font-semibold leading-none text-emerald-300 tabular-nums">
            <span>∞</span>
            <span className="text-xs font-medium text-zinc-300">
              ไม่จำกัดรอบ
            </span>
          </div>
          <div className="mt-1 truncate text-[11px] text-zinc-500">
            รอบฟรีวันนี้ · ประมวลผลในเครื่องของคุณ
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#12152A]">
            <div className="h-full w-full rounded-full bg-emerald-400" />
          </div>
        </div>

        <div className="min-w-0 px-3.5 py-3 sm:px-4">
          <div className="flex items-center gap-1.5 text-lg font-semibold leading-none text-zinc-100 tabular-nums">
            <span>4K · 120 FPS</span>
          </div>
          <div className="mt-1 truncate text-[11px] text-zinc-500">
            ความละเอียดสูงสุด · รองรับ MP4 & MOV
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#12152A]">
            <div className="h-full w-full rounded-full bg-[#38BDF8]" />
          </div>
        </div>
      </div>

      {/* Main Optimizer Card OR Ready Card */}
      {phase === 'ready' && doneResult ? (
        /* Ready / Download Result Card (exact bareet.dev eL card) */
        <div className="relative overflow-hidden rounded-2xl border border-emerald-700/40 bg-gradient-to-br from-emerald-950/40 via-[#0B0D18] to-[#0B0D18] p-5 shadow-2xl sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl"
          />

          <div className="relative flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-emerald-200">
                เสร็จแล้ว พร้อมอัปโหลด
              </div>
              <div
                className="mt-0.5 truncate text-sm font-medium text-zinc-200"
                title={doneResult.outputName}
              >
                {doneResult.outputName}
              </div>
            </div>
          </div>

          {/* Result Spec Summary & Before -> After Comparison */}
          <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-300 tabular-nums">
            <span className="rounded-md bg-[#12152A] px-2.5 py-1 font-medium text-zinc-200">
              {formatFileSizeMb(doneResult.outputSizeBytes)}
            </span>
            <span className="rounded-md bg-[#0EA5E9]/15 px-2.5 py-1 font-medium text-[#7DD9FF]">
              เอนจิน: {doneResult.appliedMode}
            </span>
            <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 font-medium text-emerald-300">
              {doneResult.usedRefineryServer
                ? 'AI Upscale + Bareet Patch'
                : 'ไม่ re-encode ภาพคมเท่าต้นฉบับ'}
            </span>
            <span className="text-zinc-500">
              ({(doneResult.elapsedMs / 1000).toFixed(2)} วินาที)
            </span>
          </div>

          {pickedFile && (
            <div className="relative mt-4 grid grid-cols-3 gap-2 rounded-xl border border-[#1B2040] bg-[#07080F]/75 p-3 text-xs tabular-nums">
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500">ความละเอียด</div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-400">
                  {inspectorInfo?.width || 1080}×{inspectorInfo?.height || 1920}
                </div>
                <div className="truncate font-mono text-xs font-bold text-emerald-300">
                  → {doneResult.outputWidth || inspectorInfo?.width || 1080}×
                  {doneResult.outputHeight || inspectorInfo?.height || 1920}
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500">บิตเรต</div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-400">
                  {inspectorInfo?.bitrateMbps || 0.8} Mbps
                </div>
                <div className="truncate font-mono text-xs font-bold text-[#7DD9FF]">
                  →{' '}
                  {doneResult.outputBitrateMbps ||
                    inspectorInfo?.bitrateMbps ||
                    0.8}{' '}
                  Mbps
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500">ขนาดไฟล์</div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-400">
                  {formatFileSizeMb(pickedFile.size)}
                </div>
                <div className="truncate font-mono text-xs font-bold text-zinc-100">
                  → {formatFileSizeMb(doneResult.outputSizeBytes)}
                </div>
              </div>
            </div>
          )}

          {/* Playable Output Video Preview with Before/After Toggle */}
          {donePreviewUrl && (
            <div className="relative mt-4">
              {sourcePreviewUrl && (
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-400">เปรียบเทียบวิดีโอ:</span>
                  <div className="inline-flex rounded-lg border border-[#1B2040] bg-[#07080F] p-0.5">
                    <button
                      type="button"
                      onClick={() => setPreviewCompareTab('after')}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        previewCompareTab === 'after'
                          ? 'bg-[#0EA5E9]/20 text-[#7DD9FF]'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      หลังอัพสเกล (ใหม่)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewCompareTab('before')}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        previewCompareTab === 'before'
                          ? 'bg-[#12152A] text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      ต้นฉบับ (เดิม)
                    </button>
                  </div>
                </div>
              )}
              <div className="overflow-hidden rounded-xl border border-[#1B2040] bg-black">
                <video
                  key={previewCompareTab}
                  src={
                    previewCompareTab === 'before' && sourcePreviewUrl
                      ? sourcePreviewUrl
                      : donePreviewUrl
                  }
                  controls
                  playsInline
                  className="mx-auto max-h-[340px] w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Download & Share Buttons */}
          <div className="relative mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                triggerDownloadBlob(doneResult.blob, doneResult.outputName)
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(14,165,233,0.3)] transition hover:from-[#0EA5E9] hover:to-[#38BDF8]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d="M12 4v11m0 0-4-4m4 4 4-4M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>ดาวน์โหลดไฟล์ MP4</span>
            </button>

            <button
              type="button"
              onClick={() =>
                void handleShareOrSaveMobile(
                  doneResult.blob,
                  doneResult.outputName
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-[#1B2040] bg-[#12152A] px-4 py-3.5 text-sm font-medium text-zinc-100 transition-colors hover:border-[#0EA5E9]/50 hover:bg-[#1B2040]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>แชร์ / บันทึกเข้ามือถือ</span>
            </button>

            <button
              type="button"
              onClick={handleClearFile}
              className="rounded-xl border border-[#1B2040] bg-[#0B0D18]/80 px-4 py-3.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-[#12152A]"
            >
              วิดีโอใหม่
            </button>
          </div>

          <p className="relative mt-3 text-[11px] text-zinc-500">
            ไฟล์ที่ปรับแล้วถูกเก็บไว้ในประวัติเครื่องนี้ สามารถกลับมาดาวน์โหลดซ้ำได้ตลอดเวลา
          </p>
        </div>
      ) : (
        /* Optimizer Form Card (exact bareet.dev ef form) */
        <form
          onSubmit={(e) => void handleProcessSubmit(e)}
          className="space-y-4 rounded-2xl border border-[#12152A] bg-[#0B0D18]/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-5"
        >
          {/* Patch Mode Selector (ep in bareet.dev) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">
                เลือกแพตช์ (Bareet Patch Mode)
              </label>
              <span className="text-[11px] text-[#7DD9FF]">
                {activePatchOption.badge}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {BAREET_PATCH_OPTIONS.map((opt) => {
                const active = opt.id === chosenMode;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={phase === 'optimizing'}
                    onClick={() => handleModeChange(opt.id)}
                    className={`rounded-xl border px-3 py-2 text-left transition-all ${
                      active
                        ? 'border-[#0EA5E9] bg-[#0EA5E9]/15 text-white shadow-[0_0_14px_rgba(14,165,233,0.18)]'
                        : 'border-[#1B2040] bg-[#07080F]/60 text-zinc-400 hover:border-[#1B2040] hover:bg-[#12152A]/60 hover:text-zinc-200'
                    }`}
                  >
                    <div className="truncate text-xs font-semibold">
                      {opt.name}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-zinc-400">
                      {opt.noReencode
                        ? 'แพตช์ไม่ re-encode'
                        : '2K/4K + Bareet'}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {activePatchOption.description}
            </p>

            {/* Upscale Resolution, Sharpness & Aspect Controls */}
            {(chosenMode === 'upscale_1080p60' ||
              customBitrateMbps !== null) && (
              <div className="mt-3 space-y-2.5 rounded-xl border border-[#1B2040] bg-[#07080F]/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-zinc-300">
                    ความละเอียดเป้าหมาย (Upscale Resolution)
                  </span>
                  <span className="font-mono text-[10px] text-[#7DD9FF] tabular-nums">
                    {(() => {
                      const d = computeTargetUpscaleDimensions(
                        inspectorInfo?.width || 1080,
                        inspectorInfo?.height || 1920,
                        resolutionTier,
                        aspectMode
                      );
                      return `${d.width}×${d.height}`;
                    })()}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: '1080p', label: '1080p FHD' },
                      { id: '2k', label: '2K QHD' },
                      { id: '4k', label: '4K UHD' },
                      { id: 'original', label: 'เท่าต้นฉบับ' },
                    ] as const
                  ).map((item) => {
                    const active = resolutionTier === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={phase === 'optimizing'}
                        onClick={() => setResolutionTier(item.id)}
                        className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                          active
                            ? 'border-[#38BDF8] bg-[#0EA5E9]/20 text-white'
                            : 'border-[#1B2040] bg-[#0B0D18] text-zinc-400 hover:border-[#0284C7]/60 hover:text-zinc-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[10px] font-medium text-zinc-400">
                      ความคมชัด (CAS + Denoise)
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'balanced', label: 'นุ่มนวล' },
                          { id: 'crisp', label: 'คมชัดสูง' },
                          { id: 'ultra', label: 'Ultra' },
                        ] as const
                      ).map((sp) => {
                        const active = sharpnessPreset === sp.id;
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            disabled={phase === 'optimizing'}
                            onClick={() => setSharpnessPreset(sp.id)}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                              active
                                ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-200'
                                : 'border-[#1B2040] bg-[#0B0D18] text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {sp.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-[10px] font-medium text-zinc-400">
                      สัดส่วนภาพ (Aspect Ratio)
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {(
                        [
                          { id: 'keep', label: 'สัดส่วนเดิม' },
                          { id: '9:16', label: 'TikTok 9:16' },
                        ] as const
                      ).map((asp) => {
                        const active = aspectMode === asp.id;
                        return (
                          <button
                            key={asp.id}
                            type="button"
                            disabled={phase === 'optimizing'}
                            onClick={() => setAspectMode(asp.id)}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                              active
                                ? 'border-[#0EA5E9] bg-[#0EA5E9]/20 text-[#7DD9FF]'
                                : 'border-[#1B2040] bg-[#0B0D18] text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {asp.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dropzone or Picked File View */}
          <div>
            <label className="sr-only">ไฟล์วิดีโอ (.mp4 / .mov)</label>
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                if (phase !== 'optimizing') setIsDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsDragging(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              className={`relative overflow-hidden rounded-2xl border transition-all ${
                isDragging
                  ? 'border-2 border-dashed border-[#38BDF8] bg-[#0EA5E9]/10 shadow-[inset_0_0_32px_rgba(56,189,248,0.12)]'
                  : pickedFile
                  ? 'border border-[#1B2040] bg-[#12152A]/40'
                  : 'border-2 border-dashed border-[#1B2040] bg-[#12152A]/30 hover:border-[#0284C7]/60 hover:bg-[#12152A]/50'
              }`}
            >
              {pickedFile && !isDragging ? (
                <div className="p-4" aria-live="polite">
                  {/* File Header Row */}
                  <div className="flex items-start gap-3.5">
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#0EA5E9]/40 bg-[#0EA5E9]/10 text-[#7DD9FF]">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        <rect
                          x="2.75"
                          y="5.75"
                          width="13.5"
                          height="12.5"
                          rx="2.25"
                        />
                        <path
                          d="m16.25 10.25 4.2-2.4a.5.5 0 0 1 .8.43v7.44a.5.5 0 0 1-.8.43l-4.2-2.4"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="absolute -bottom-1.5 rounded-md border border-[#1B2040] bg-[#0B0D18] px-1.5 text-[9px] font-bold tracking-wide text-zinc-300">
                        {fileExt}
                      </span>
                    </span>

                    <span className="min-w-0 flex-1 pt-0.5">
                      <span
                        className="block truncate text-[15px] font-semibold text-zinc-50"
                        title={pickedFile.name}
                      >
                        {pickedFile.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-400 tabular-nums">
                        {formatFileSizeMb(pickedFile.size)}
                        {inspectorInfo
                          ? ` · ${inspectorInfo.width}×${inspectorInfo.height} · ${inspectorInfo.fps} FPS`
                          : ''}
                      </span>
                    </span>

                    {phase !== 'optimizing' && (
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-lg border border-[#1B2040] bg-[#0B0D18]/80 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-[#0284C7]/60 hover:text-white"
                        >
                          เปลี่ยนไฟล์
                        </button>
                        <button
                          type="button"
                          onClick={handleClearFile}
                          aria-label={`เอา ${pickedFile.name} ออก`}
                          title={`เอา ${pickedFile.name} ออก`}
                          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-[#12152A] hover:text-zinc-200"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <path
                              d="M6 6l12 12M18 6 6 18"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </span>
                    )}
                  </div>

                  {/* Precheck Verdict Banner */}
                  <div
                    className={`mt-3.5 flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      isCheckingFile
                        ? 'bg-[#0B0D18]/60 text-zinc-400'
                        : inspectorInfo?.alreadyPatched
                        ? 'bg-[#0EA5E9]/10 text-[#7DD9FF]'
                        : inspectorInfo?.compatibleWithDirectPatch &&
                          chosenMode !== 'upscale_1080p60'
                        ? 'bg-emerald-500/10 text-emerald-200'
                        : 'bg-amber-500/10 text-amber-200'
                    }`}
                  >
                    {isCheckingFile ? (
                      <span className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    ) : (
                      <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-current/15 text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                    <span className="min-w-0 break-words">
                      {isCheckingFile
                        ? 'กำลังตรวจไฟล์…'
                        : inspectorInfo?.alreadyPatched
                        ? 'เคยผ่าน Bareet Engine แล้ว — กดประมวลผลเพื่อรับไฟล์ได้ทันที'
                        : inspectorInfo?.compatibleWithDirectPatch &&
                          chosenMode !== 'upscale_1080p60'
                        ? 'พร้อมแล้ว Method จัดการในเครื่องนี้ได้เลย — ไม่ re-encode ภาพคมเท่าเดิม'
                        : 'พร้อมประมวลผลด้วยโหมด Method Prep (จัดเตรียมโครงสร้าง MP4 + แพตช์ Bareet อัตโนมัติ)'}
                    </span>
                  </div>

                  {/* Detailed File Spec Card (exact bareet.dev em component) */}
                  {inspectorInfo && (
                    <div className="mt-2.5 rounded-lg border border-[#12152A] bg-[#07080F]/60 px-3 py-2.5 text-xs">
                      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                        <dt className="text-zinc-500">วิดีโอ</dt>
                        <dd className="truncate text-zinc-200 tabular-nums">
                          {inspectorInfo.width}×{inspectorInfo.height} ·{' '}
                          {inspectorInfo.fps} FPS ·{' '}
                          {formatDurationShort(inspectorInfo.durationSec)}
                        </dd>

                        <dt className="text-zinc-500">รูปแบบ</dt>
                        <dd className="truncate text-zinc-200 tabular-nums">
                          {inspectorInfo.codec} · {inspectorInfo.bitDepth}-bit ·{' '}
                          {inspectorInfo.bitrateMbps} Mbps
                        </dd>

                        <dt className="text-zinc-500">เสียง</dt>
                        <dd className="truncate text-zinc-200 tabular-nums">
                          {inspectorInfo.hasAudio
                            ? `${inspectorInfo.audioCodec} · 48.0 kHz · 2ch`
                            : 'ไม่มีเสียง'}
                        </dd>

                        <dt className="text-zinc-500">ค่าใช้จ่าย</dt>
                        <dd className="font-medium text-emerald-300">
                          ฟรี — ประมวลผลในเบราว์เซอร์ของคุณโดยตรง
                        </dd>
                      </dl>

                      {/* Toggle buttons for Bitrate Advice & Video Preview */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-[#12152A] pt-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setShowAdviceDetail((p) => !p)}
                          className="font-medium text-[#7DD9FF] transition-colors hover:text-white"
                        >
                          {showAdviceDetail
                            ? 'ซ่อนเกจวัดบิตเรต TikTok ▲'
                            : 'ดูเกจวัดบิตเรต & ความลื่นไหล ▼'}
                        </button>
                        <span className="text-zinc-700">·</span>
                        <button
                          type="button"
                          onClick={() => setShowSourcePreview((p) => !p)}
                          className="font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                        >
                          {showSourcePreview
                            ? 'ซ่อนตัวอย่างวิดีโอ ▲'
                            : 'ดูตัวอย่างวิดีโอต้นฉบับ ▶'}
                        </button>
                      </div>

                      {showAdviceDetail &&
                        qualityAdvice &&
                        renderBitrateGauge(qualityAdvice)}

                      {showSourcePreview && sourcePreviewUrl && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-[#1B2040] bg-black">
                          <video
                            src={sourcePreviewUrl}
                            controls
                            playsInline
                            className="mx-auto max-h-[260px] w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Empty Dropzone Button */
                <button
                  type="button"
                  disabled={phase === 'optimizing'}
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex min-h-[184px] w-full flex-col items-center justify-center gap-2 px-6 py-8 text-center disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all ${
                      isDragging
                        ? 'scale-110 border-[#38BDF8]/60 bg-[#0EA5E9]/20 text-[#7DD9FF]'
                        : 'border-[#1B2040] bg-[#0B0D18]/80 text-zinc-400 group-hover:border-[#0284C7]/50 group-hover:text-[#7DD9FF]'
                    }`}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      aria-hidden="true"
                      className={isDragging ? '' : 'anim-float'}
                    >
                      <path
                        d="M12 15V4m0 0-4 4m4-4 4 4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      isDragging ? 'text-[#7DD9FF]' : 'text-zinc-100'
                    }`}
                  >
                    {isDragging
                      ? 'วางไฟล์ที่นี่'
                      : 'เลือกวิดีโอ หรือลากไฟล์มาวาง'}
                  </span>
                  <span className="text-xs text-zinc-500">
                    MP4 / MOV · ทีละ 1 วิดีโอ · รองรับถึง 4K 120fps
                  </span>
                  {!isDragging && (
                    <span className="mt-2 rounded-lg bg-[#0284C7] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(14,165,233,0.25)] transition group-hover:bg-[#0EA5E9]">
                      เลือกไฟล์
                    </span>
                  )}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,video/mp4,video/quicktime,video/*"
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </div>

            {/* Instant 1-Click Sample Video Loader for quick testing */}
            {!pickedFile && (
              <div className="mt-2.5 flex items-center justify-between rounded-xl border border-[#12152A] bg-[#07080F]/60 px-3.5 py-2 text-xs">
                <span className="text-zinc-400">
                  ต้องการทดสอบระบบทันทีโดยไม่ต้องเลือกไฟล์?
                </span>
                <button
                  type="button"
                  disabled={isLoadingSample}
                  onClick={() => void handleLoadDemoSampleClip()}
                  className="font-semibold text-[#7DD9FF] underline decoration-[#0EA5E9]/40 underline-offset-4 transition-colors hover:text-white disabled:opacity-50"
                >
                  {isLoadingSample
                    ? 'กำลังโหลด…'
                    : 'โหลดคลิปตัวอย่าง 1080p 60fps'}
                </button>
              </div>
            )}
          </div>

          {/* Active Processing Summary Note */}
          {(() => {
            const willReencode =
              chosenMode === 'upscale_1080p60' ||
              customBitrateMbps !== null ||
              (customFps !== null && customFps !== (inspectorInfo?.fps || 60));
            const targetDims = computeTargetUpscaleDimensions(
              inspectorInfo?.width || 1080,
              inspectorInfo?.height || 1920,
              resolutionTier,
              aspectMode
            );
            const targetMbps =
              customBitrateMbps !== null
                ? Number(customBitrateMbps.toFixed(1))
                : targetDims.defaultBitrateMbps;
            const targetFps =
              customFps !== null ? customFps : inspectorInfo?.fps || 60;

            return (
              <div className="rounded-xl border border-[#12152A] bg-[#07080F]/50 px-3.5 py-2.5 text-xs text-zinc-400">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-zinc-200">
                    {willReencode
                      ? `ผลลัพธ์ที่จะได้: ${targetDims.width}×${targetDims.height} · ${targetFps} FPS · ${targetMbps} Mbps`
                      : 'โหมดแพตช์ MP4 โดยตรง (ไม่ re-encode)'}
                  </span>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      willReencode ? 'text-[#7DD9FF]' : 'text-emerald-300'
                    }`}
                  >
                    {willReencode
                      ? `${UPSCALE_SHARPNESS_PRESETS[sharpnessPreset].label} + Bareet`
                      : 'ขนาดไฟล์เท่าเดิม 100%'}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {willReencode
                    ? 'อัพสเกลความละเอียดด้วย Lanczos + CAS Sharpening พร้อมดันบิตเรตสูงและฝังแท็ก Bareet v10'
                    : 'ปรับโครงสร้างอะตอม MP4 ในเบราว์เซอร์โดยไม่ลดหรือเพิ่มขนาดไฟล์ (เลือก AI Upscale + Bareet หากต้องการขยายความละเอียดและบิตเรต)'}
                </p>
              </div>
            );
          })()}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!pickedFile || phase === 'optimizing' || isCheckingFile}
            aria-busy={phase === 'optimizing'}
            className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(14,165,233,0.25)] transition hover:from-[#0EA5E9] hover:to-[#38BDF8] hover:shadow-[0_0_28px_rgba(56,189,248,0.35)] ${
              phase === 'optimizing'
                ? 'cursor-wait'
                : 'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none'
            }`}
          >
            {phase === 'optimizing' ? (
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
                <path
                  d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12L13 2Z"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span>
              {phase === 'optimizing' ? 'กำลังประมวลผล…' : 'ประมวลผลวิดีโอ'}
            </span>
          </button>
        </form>
      )}

      {/* Progress & Step Log Card (exact bareet.dev eb component) */}
      {(phase === 'optimizing' ||
        (stepLogs.length > 0 && phase !== 'ready')) && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#12152A] bg-[#0B0D18]/80">
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-200">
                {progressStageLabel || 'กำลังประมวลผล…'}
              </span>
              <span className="font-mono font-semibold text-[#7DD9FF] tabular-nums">
                {Math.round(progressPct)}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#12152A]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0284C7] to-[#38BDF8] transition-all duration-200"
                style={{ width: `${Math.min(100, Math.max(4, progressPct))}%` }}
              />
            </div>
          </div>

          {stepLogs.length > 0 && (
            <ol className="space-y-2 border-t border-[#12152A] px-4 py-3.5 text-xs">
              {stepLogs.map((log, idx) => {
                const isLast = idx === stepLogs.length - 1;
                const status =
                  isLast && phase === 'optimizing'
                    ? 'run'
                    : isLast && phase === 'failed'
                    ? 'fail'
                    : 'done';
                return (
                  <li key={`${log}-${idx}`} className="flex items-center gap-2.5">
                    {status === 'run' ? (
                      <span className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#7DD9FF] border-r-transparent" />
                    ) : status === 'fail' ? (
                      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[9px] font-bold text-red-300">
                        ✕
                      </span>
                    ) : (
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <span
                      className={
                        status === 'run'
                          ? 'text-zinc-100'
                          : status === 'fail'
                          ? 'text-red-200'
                          : 'text-zinc-400'
                      }
                    >
                      {log}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {phase === 'optimizing' && (
            <p className="border-t border-[#12152A] px-4 py-2.5 text-xs text-amber-200">
              ระหว่างประมวลผล อย่าสลับแอปหรือล็อกหน้าจอ
            </p>
          )}
        </div>
      )}

      {/* Error Alert Card (exact bareet.dev ev component) */}
      {phase === 'failed' && errorMsg && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-red-900/60 bg-gradient-to-br from-red-950/50 to-[#0B0D18] p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300">
              !
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-red-200">
                มีบางอย่างผิดพลาด
              </div>
              <div className="mt-1 text-sm leading-relaxed text-red-100/80">
                {errorMsg}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearFile}
            className="mt-4 w-full rounded-xl border border-[#1B2040] bg-[#0B0D18] py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-[#12152A] sm:w-auto sm:px-5"
          >
            ลองไฟล์อื่น
          </button>
        </div>
      )}

      {/* Recent Processed Files History (exact bareet.dev el section) */}
      {historyEntries.length > 0 && (
        <section
          id="hist-section"
          className="mt-6 rounded-2xl border border-[#12152A] bg-[#0B0D18]/70 p-4 sm:p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">
              ประวัติล่าสุด ({historyEntries.length})
            </h2>
            <span className="text-[11px] text-zinc-500">
              เก็บไว้ในเบราว์เซอร์เครื่องนี้
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {historyEntries.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-[#12152A] bg-[#07080F]/60 px-3 py-2.5 transition-colors hover:border-[#1B2040]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-[#7DD9FF]">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 2.75h7l4 4V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4.75a2 2 0 0 1 2-2Z"
                      strokeLinejoin="round"
                    />
                    <path d="M14 2.75V7h4" strokeLinejoin="round" />
                    <path
                      d="m10 10 5 3-5 3v-6Z"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-sm font-medium text-zinc-100"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500 tabular-nums">
                    <span>{formatFileSizeMb(item.size)}</span>
                    <span>·</span>
                    <span className="text-[#7DD9FF]">{item.mode}</span>
                    <span>·</span>
                    <span>{item.resolutionLabel}</span>
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => triggerDownloadBlob(item.blob, item.name)}
                  className="shrink-0 rounded-lg border border-[#1B2040] bg-[#12152A] px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:border-[#0EA5E9]/50 hover:text-white"
                >
                  ดาวน์โหลด
                </button>

                <button
                  type="button"
                  onClick={() => void handleDeleteHistoryItem(item.id, item.name)}
                  aria-label={`ลบ ${item.name}`}
                  title={`ลบ ${item.name}`}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-[#12152A] hover:text-zinc-300"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3 Simple Steps Section (exact bareet.dev Landing steps) */}
      <section className="mt-12">
        <h2 className="text-center text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
          ใช้งานง่ายใน 3 ขั้นตอน
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#12152A] bg-[#0B0D18]/70 p-4 transition-colors hover:border-[#0284C7]/40">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#0EA5E9]/25 bg-[#0EA5E9]/10 text-[#7DD9FF]">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path
                    d="M12 15V4m0 0-4 4m4-4 4 4M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-mono text-xs text-zinc-600">01</span>
            </div>
            <div className="mt-3.5 text-sm font-semibold text-zinc-100">
              เลือกวิดีโอ
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              ไฟล์ MP4 หรือ MOV จากมือถือหรือโปรแกรมตัดต่อ (CapCut / Premiere)
            </p>
          </div>

          <div className="rounded-2xl border border-[#12152A] bg-[#0B0D18]/70 p-4 transition-colors hover:border-[#0284C7]/40">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#0EA5E9]/25 bg-[#0EA5E9]/10 text-[#7DD9FF]">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path
                    d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12L13 2Z"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-mono text-xs text-zinc-600">02</span>
            </div>
            <div className="mt-3.5 text-sm font-semibold text-zinc-100">
              เอนจินปรับให้
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              ประมวลผลอะตอม MP4 ในเบราว์เซอร์ของคุณโดยตรง ไม่ลดคุณภาพภาพ
            </p>
          </div>

          <div className="rounded-2xl border border-[#12152A] bg-[#0B0D18]/70 p-4 transition-colors hover:border-[#0284C7]/40">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#0EA5E9]/25 bg-[#0EA5E9]/10 text-[#7DD9FF]">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path
                    d="M12 4v11m0 0-4-4m4 4 4-4M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-mono text-xs text-zinc-600">03</span>
            </div>
            <div className="mt-3.5 text-sm font-semibold text-zinc-100">
              ดาวน์โหลด
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              ได้ไฟล์ _bareet.mp4 ที่ปรับแล้ว พร้อมอัปโหลดลง TikTok และทุกแพลตฟอร์ม
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section (exact bareet.dev FAQ questions & answers) */}
      <section className="mt-12">
        <h2 className="text-center text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
          คำถามที่พบบ่อย
        </h2>
        <div className="mt-6 space-y-2.5">
          <details className="group rounded-xl border border-[#12152A] bg-[#0B0D18]/70 px-4 open:border-[#1B2040] open:bg-[#0B0D18]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-sm font-medium text-zinc-100 [&::-webkit-details-marker]:hidden">
              <span>วิดีโอของฉันถูกส่งขึ้นเซิร์ฟเวอร์ไหม?</span>
              <span className="text-zinc-500 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-3.5 text-xs leading-relaxed text-zinc-400">
              ไฟล์ส่วนใหญ่ประมวลผลในเบราว์เซอร์ของคุณและไม่ออกจากเครื่อง เฉพาะไฟล์ที่ต้องแปลงฟอร์แมต (Method Prep) จึงจะส่งไปประมวลผลและถูกลบอัตโนมัติทันทีหลังจากเสร็จ
            </p>
          </details>

          <details className="group rounded-xl border border-[#12152A] bg-[#0B0D18]/70 px-4 open:border-[#1B2040] open:bg-[#0B0D18]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-sm font-medium text-zinc-100 [&::-webkit-details-marker]:hidden">
              <span>คลิป 4K หรือ 60fps จะแตกบน TikTok ไหม?</span>
              <span className="text-zinc-500 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-3.5 text-xs leading-relaxed text-zinc-400">
              สำหรับคลิป MP4 และ MOV แบบ H.264 หรือ HEVC ระบบไม่ re-encode วิดีโอ ภาพจึงคมชัดเท่าไฟล์ที่คุณใส่มา รองรับถึง 4K 120fps พร้อมอัปตามคุณภาพที่คุณถ่ายหรือตัดต่อมา
            </p>
          </details>

          <details className="group rounded-xl border border-[#12152A] bg-[#0B0D18]/70 px-4 open:border-[#1B2040] open:bg-[#0B0D18]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-sm font-medium text-zinc-100 [&::-webkit-details-marker]:hidden">
              <span>เช็กยอดวิว บิตเรต หรือชาโดว์แบนของคลิป TikTok ได้ไหม?</span>
              <span className="text-zinc-500 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-3.5 text-xs leading-relaxed text-zinc-400">
              ได้ กดที่แถบ{' '}
              <button
                type="button"
                onClick={onOpenAnalyzer}
                className="font-semibold text-[#7DD9FF] underline"
              >
                วิเคราะห์คลิป
              </button>{' '}
              ด้านบนเพื่อวางลิงก์คลิป TikTok สาธารณะ หรือตรวจโครงสร้างอะตอมของไฟล์ในเครื่องได้เลย และดูตารางค่าบิตเรตแนะนำได้ที่หน้า{' '}
              <button
                type="button"
                onClick={onOpenGuide}
                className="font-semibold text-[#7DD9FF] underline"
              >
                คู่มือตั้งค่า
              </button>
            </p>
          </details>
        </div>
      </section>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="rounded-full border border-[#0284C7]/50 bg-[#0B0D18]/95 px-4 py-2 text-xs font-medium text-zinc-100 shadow-lg shadow-black/50">
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
};
