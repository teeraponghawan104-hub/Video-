import React from 'react';
import { PLATFORM_PRESETS, PlatformPreset } from '../utils/upscaleEngine';
import { Check, ArrowUpRight } from 'lucide-react';

interface PlatformGuideSectionProps {
  activePreset: PlatformPreset;
  onSelectPreset: (preset: PlatformPreset) => void;
}

export const PlatformGuideSection: React.FC<PlatformGuideSectionProps> = ({
  activePreset,
  onSelectPreset,
}) => {
  return (
    <section
      id="platform-specs"
      aria-labelledby="platform-specs-heading"
      className="bg-[#111827] border border-slate-800/90 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="platform-specs-heading" className="text-base font-semibold text-slate-100">
            ตารางมาตรฐานความละเอียดและบิตเรตป้องกันการบีบอัด (Social Platform Anti-Compression Matrix)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            เปรียบเทียบเพดานบิตเรตและสัดส่วนวิดีโอที่ทำให้ TikTok, IG Reels และ YouTube Shorts ไม่ลดทอนความคมชัดหลังโพสต์
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 bg-slate-900/50">
              <th className="py-3 px-5">แพลตฟอร์มและโหมด</th>
              <th className="py-3 px-4">สัดส่วน</th>
              <th className="py-3 px-4 text-right">ความละเอียดเป้าหมาย</th>
              <th className="py-3 px-4 text-right">เฟรมเรต</th>
              <th className="py-3 px-4 text-right">บิตเรตแนะนำ / สูงสุด</th>
              <th className="py-3 px-4">ตัวเข้ารหัส (Codec)</th>
              <th className="py-3 px-5 text-right">เลือกใช้งาน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs">
            {PLATFORM_PRESETS.map((preset) => {
              const isCurrent = preset.id === activePreset.id;
              return (
                <tr
                  key={preset.id}
                  className={`transition-colors ${
                    isCurrent ? 'bg-orange-500/10' : 'hover:bg-slate-800/35'
                  }`}
                >
                  <td className="py-3 px-5">
                    <div className="font-semibold text-slate-100">{preset.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                      {preset.antiCompressTip}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-300">
                    {preset.aspectRatio}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                    {preset.targetWidth}×{preset.targetHeight}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                    {preset.targetFps} FPS
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    <span className="text-orange-400 font-semibold">
                      {preset.recommendedBitrateMbps} Mbps
                    </span>
                    <span className="text-slate-500"> / {preset.maxSafeBitrateMbps} Mbps</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">{preset.codecLabel}</td>
                  <td className="py-3 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectPreset(preset)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        isCurrent
                          ? 'bg-orange-500 text-slate-950 font-semibold'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>ใช้อยู่</span>
                        </>
                      ) : (
                        <>
                          <span>ใช้พรีเซ็ตนี้</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
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
  );
};
