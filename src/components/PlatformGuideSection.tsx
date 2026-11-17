import React from 'react';
import { PLATFORM_PRESETS, PlatformPreset } from '../utils/upscaleEngine';
import { Check, ArrowUpRight } from 'lucide-react';

interface PlatformGuideSectionProps {
  activePreset: PlatformPreset;
  onSelectPreset: (preset: PlatformPreset) => void;
}

const BAREET_BITRATE_TABLE = [
  {
    res: '720p HD (720×1280)',
    fps30: '6 – 10 Mbps',
    fps60: '10 – 15 Mbps',
    note: 'เหมาะสำหรับคลิปสั้นทั่วไป เน้นอัปโหลดไว',
  },
  {
    res: '1080p Full HD (1080×1920)',
    fps30: '10 – 15 Mbps',
    fps60: '15 – 25 Mbps',
    note: 'มาตรฐานหลักที่คมชัดที่สุดบน TikTok มือถือทุกเครื่อง',
  },
  {
    res: '2K QHD (1440×2560)',
    fps30: '20 – 30 Mbps',
    fps60: '20 – 30 Mbps',
    note: 'สำหรับคลิปที่ต้องการรายละเอียดใบหน้าและตัวอักษรคมกริบ',
  },
  {
    res: '4K UHD (2160×3840)',
    fps30: '20 – 35 Mbps',
    fps60: '20 – 40 Mbps',
    note: 'ความละเอียดสูงสุด ไม่ re-encode เมื่อผ่าน Bareet Engine',
  },
];

export const PlatformGuideSection: React.FC<PlatformGuideSectionProps> = ({
  activePreset,
  onSelectPreset,
}) => {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-16 pt-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          คู่มือตั้งค่า Export & สเปกบิตเรต TikTok
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
          ตั้งค่าจากโปรแกรมตัดต่อ (CapCut, Premiere Pro, DaVinci) ตามตารางนี้ แล้วนำไฟล์มาเข้า Bareet Engine เพื่อล็อกความคมชัด 100% โดยไม่ถูก TikTok บีบอัดซ้ำ
        </p>
      </div>

      {/* Bareet Method Recommended Bitrate Table */}
      <section className="overflow-hidden rounded-2xl border border-[#12152A] bg-[#0B0D18]/80">
        <div className="border-b border-[#12152A] px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-100">
            ค่าบิตเรตแนะนำสำหรับ Bareet Engine (Recommended Bitrate)
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            ฟอร์แมตที่รองรับทันทีโดยไม่ re-encode: MP4 หรือ MOV · วิดีโอ H.264 (AVC) หรือ HEVC (H.265) · เสียง AAC
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#12152A] bg-[#07080F]/60 text-[11px] font-semibold text-zinc-400">
                <th className="px-5 py-3">ความละเอียดคลิป</th>
                <th className="px-4 py-3 text-right">บิตเรตแนะนำ (30 FPS)</th>
                <th className="px-4 py-3 text-right">บิตเรตแนะนำ (60 FPS)</th>
                <th className="px-5 py-3">คำแนะนำการใช้งาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#12152A]">
              {BAREET_BITRATE_TABLE.map((row) => (
                <tr key={row.res} className="hover:bg-[#12152A]/40">
                  <td className="px-5 py-3.5 font-semibold text-zinc-100">
                    {row.res}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-zinc-200 tabular-nums">
                    {row.fps30}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-300 tabular-nums">
                    {row.fps60}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3 Cards for CapCut / iPhone / Premiere */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#12152A] bg-[#0B0D18]/70 p-5">
          <div className="font-mono text-xs text-[#7DD9FF]">01 · CapCut (มือถือ & PC)</div>
          <h3 className="mt-2 text-base font-semibold text-zinc-100">
            ตั้งค่าส่งออกจาก CapCut
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            เลือกความละเอียด 1080p หรือ 2K/4K เฟรมเรต 60fps ปรับ Code Rate (บิตเรต) เป็น &ldquo;แนะนำ (Recommended)&rdquo; หรือกำหนดเองที่ 18–25 Mbps โคเด็ก H.264
          </p>
        </div>
        <div className="rounded-2xl border border-[#12152A] bg-[#0B0D18]/70 p-5">
          <div className="font-mono text-xs text-[#7DD9FF]">02 · iPhone / iOS (.MOV)</div>
          <h3 className="mt-2 text-base font-semibold text-zinc-100">
            คลิปถ่ายตรงจาก iPhone
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            รองรับไฟล์ .MOV (H.264 และ HEVC) จากกล้อง iPhone โดยตรง ระบบจะแพตช์คอนเทนเนอร์และแปลงเป็นไฟล์ _bareet.mp4 พร้อมอัปทันทีโดยไม่ลดความคมชัด
          </p>
        </div>
        <div className="rounded-2xl border border-[#12152A] bg-[#0B0D18]/70 p-5">
          <div className="font-mono text-xs text-[#7DD9FF]">03 · วิธีอัปขึ้น TikTok</div>
          <h3 className="mt-2 text-base font-semibold text-zinc-100">
            อัปโหลดให้ภาพไม่แตก
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            นำไฟล์ _bareet.mp4 ที่ดาวน์โหลดไปอัปโหลดผ่านแอป TikTok (เปิดปุ่ม &ldquo;อนุญาตให้อัปโหลดคุณภาพสูง / HD&rdquo;) หรืออัปผ่านเว็บ TikTok Studio บนคอมพิวเตอร์
          </p>
        </div>
      </section>

      {/* Platform Preset Matrix */}
      <section
        id="platform-specs"
        aria-labelledby="platform-specs-heading"
        className="overflow-hidden rounded-2xl border border-[#12152A] bg-[#0B0D18]/80"
      >
        <div className="border-b border-[#12152A] px-5 py-4">
          <h2
            id="platform-specs-heading"
            className="text-base font-semibold text-zinc-100"
          >
            ตารางสเปกมาตรฐานแต่ละแพลตฟอร์ม (TikTok · Reels · Shorts)
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            เปรียบเทียบเพดานบิตเรตและสัดส่วนวิดีโอของแต่ละแพลตฟอร์มโซเชียลมีเดีย
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#12152A] bg-[#07080F]/60 text-[11px] font-semibold text-zinc-400">
                <th className="px-5 py-3">แพลตฟอร์มและโหมด</th>
                <th className="px-4 py-3">สัดส่วน</th>
                <th className="px-4 py-3 text-right">ความละเอียด</th>
                <th className="px-4 py-3 text-right">เฟรมเรต</th>
                <th className="px-4 py-3 text-right">บิตเรตแนะนำ / สูงสุด</th>
                <th className="px-4 py-3">โคเด็ก</th>
                <th className="px-5 py-3 text-right">เลือกพรีเซ็ต</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#12152A] text-xs">
              {PLATFORM_PRESETS.map((preset) => {
                const isCurrent = preset.id === activePreset.id;
                return (
                  <tr
                    key={preset.id}
                    className={`transition-colors ${
                      isCurrent ? 'bg-[#0EA5E9]/10' : 'hover:bg-[#12152A]/40'
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-zinc-100">{preset.name}</div>
                      <div className="mt-0.5 max-w-md text-[11px] text-zinc-400">
                        {preset.antiCompressTip}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-zinc-300 tabular-nums">
                      {preset.aspectRatio}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-zinc-200 tabular-nums">
                      {preset.targetWidth}×{preset.targetHeight}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-zinc-200 tabular-nums">
                      {preset.targetFps} FPS
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                      <span className="font-semibold text-[#7DD9FF]">
                        {preset.recommendedBitrateMbps} Mbps
                      </span>
                      <span className="text-zinc-500">
                        {' '}
                        / {preset.maxSafeBitrateMbps} Mbps
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-zinc-300">
                      {preset.codecLabel}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectPreset(preset)}
                        className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          isCurrent
                            ? 'bg-[#0EA5E9] font-semibold text-[#07080F]'
                            : 'border border-[#1B2040] bg-[#12152A] text-zinc-200 hover:border-[#0EA5E9]/50'
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>ใช้อยู่</span>
                          </>
                        ) : (
                          <>
                            <span>เลือกสเปกนี้</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
