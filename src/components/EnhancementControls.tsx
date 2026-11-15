import React, { useState } from 'react';
import {
  RotateCcw,
  Download,
  ListPlus,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import {
  ENHANCEMENT_PROFILES,
  EnhancementProfile,
  EnhancementSettings,
  OutputMetrics,
  PLATFORM_PRESETS,
  PlatformPreset,
  ReframeMode,
  ScaleMultiplier,
  validateCustomPresetName,
} from '../utils/upscaleEngine';

interface EnhancementControlsProps {
  activePreset: PlatformPreset;
  onSelectPreset: (preset: PlatformPreset) => void;
  settings: EnhancementSettings;
  onUpdateSettings: (patch: Partial<EnhancementSettings>) => void;
  onResetSettings: () => void;
  metrics: OutputMetrics;
  onStartImmediateExport: () => void;
  onAddToQueue: () => void;
  isExportingNow: boolean;
}

const SIMPLE_PROFILE_LABELS: Record<string, { title: string; desc: string }> = {
  tiktok_ultra_crisp: {
    title: 'คมชัดพิเศษ TikTok',
    desc: 'เน้นขอบภาพและตัวอักษรคมกริบ ไม่มัวหลังโพสต์',
  },
  portrait_beauty_hd: {
    title: 'บุคคล & รีวิวบิวตี้',
    desc: 'คมชัดเฉพาะดวงตาและสินค้า ผิวดูเนียนธรรมชาติ',
  },
  night_lowlight_rescue: {
    title: 'คลิปแสงน้อย / กลางคืน',
    desc: 'ลดเม็ดนอยส์และดึงรายละเอียดในที่มืด',
  },
  anime_game_4x: {
    title: 'อนิเมะ & เกมเพลย์ 4K',
    desc: 'เร่งเส้นขอบคมชัดสูงสุดระดับ 4x',
  },
};

export const EnhancementControls: React.FC<EnhancementControlsProps> = ({
  activePreset,
  onSelectPreset,
  settings,
  onUpdateSettings,
  onResetSettings,
  metrics,
  onStartImmediateExport,
  onAddToQueue,
  isExportingNow,
}) => {
  const [customProfiles, setCustomProfiles] = useState<EnhancementProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('tiktok_ultra_crisp');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [presetError, setPresetError] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);

  const allProfiles = [...ENHANCEMENT_PROFILES, ...customProfiles];

  const handleApplyProfile = (profile: EnhancementProfile) => {
    setActiveProfileId(profile.id);
    onUpdateSettings(profile.settings);
  };

  const handleSaveCustomProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCustomPresetName(newPresetName);
    if (!validation.valid) {
      setPresetError(validation.error || 'ชื่อพรีเซ็ตไม่ถูกต้อง');
      return;
    }

    const created: EnhancementProfile = {
      id: `custom_${Date.now()}`,
      name: newPresetName.trim(),
      subtitle: `ความคมชัด ${settings.sharpness}% · ${settings.scaleMultiplier}x`,
      settings: { ...settings },
    };

    setCustomProfiles((prev) => [...prev, created]);
    setActiveProfileId(created.id);
    setNewPresetName('');
    setPresetError(null);
    setShowSaveForm(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0E131F] border border-slate-800/80 rounded-2xl overflow-hidden justify-between">
      <div className="p-6 space-y-6 overflow-y-auto">
        {/* Step 1: Choose Platform */}
        <section aria-labelledby="step-platform-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="step-platform-heading" className="text-sm font-semibold text-white">
              1. เลือกแพลตฟอร์มที่จะโพสต์
            </h2>
            <button
              type="button"
              onClick={() => {
                setActiveProfileId('tiktok_ultra_crisp');
                onResetSettings();
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ค่าเริ่มต้น</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PLATFORM_PRESETS.map((preset) => {
              const selected = preset.id === activePreset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    selected
                      ? 'bg-orange-500/15 border-orange-500 text-white'
                      : 'bg-slate-900/50 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-semibold truncate w-full">
                    {preset.platformLabel}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                    {preset.targetWidth}×{preset.targetHeight} · {preset.targetFps}FPS
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Choose Style Preset */}
        <section aria-labelledby="step-style-heading" className="space-y-3 pt-4 border-t border-slate-800/70">
          <div className="flex items-center justify-between">
            <h2 id="step-style-heading" className="text-sm font-semibold text-white">
              2. เลือกโหมดความคมชัด
            </h2>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              {([2, 4] as ScaleMultiplier[]).map((mult) => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => onUpdateSettings({ scaleMultiplier: mult })}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    settings.scaleMultiplier === mult
                      ? 'bg-orange-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  อัพสเกล {mult}x
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allProfiles.map((prof) => {
              const isSelected = activeProfileId === prof.id;
              const labelInfo = SIMPLE_PROFILE_LABELS[prof.id] || {
                title: prof.name,
                desc: prof.subtitle,
              };
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => handleApplyProfile(prof)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-slate-600 text-white'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-900/80'
                  }`}
                >
                  <span className="text-xs font-semibold">{labelInfo.title}</span>
                  <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {labelInfo.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Primary Single Slider: Sharpness */}
          <div className="pt-2 space-y-1.5">
            <div className="flex justify-between text-xs">
              <label htmlFor="slider-sharpness" className="text-slate-300 font-medium">
                ระดับความคมชัด (Sharpness)
              </label>
              <span className="font-mono tabular-nums text-orange-400 font-semibold">
                {settings.sharpness}%
              </span>
            </div>
            <input
              id="slider-sharpness"
              type="range"
              min={0}
              max={100}
              value={settings.sharpness}
              onChange={(e) => onUpdateSettings({ sharpness: Number(e.target.value) })}
              className="w-full accent-orange-500 cursor-pointer"
            />
          </div>
        </section>

        {/* Step 3: Progressive Disclosure for Advanced Controls */}
        <section className="pt-3 border-t border-slate-800/70">
          <button
            type="button"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="w-full flex items-center justify-between py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>ตั้งค่าเพิ่มเติม (ลดนอยส์, ปรับสี, จัดกรอบภาพ)</span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
              {/* Reframe Mode */}
              <div className="space-y-1.5">
                <span className="block text-xs text-slate-300">การจัดกรอบภาพ ({activePreset.aspectRatio})</span>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                  {(
                    [
                      { id: 'center-crop', label: 'เต็มจอ' },
                      { id: 'fit-blur', label: 'ขอบเบลอ' },
                      { id: 'stretch', label: 'ยืดภาพ' },
                    ] as { id: ReframeMode; label: string }[]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onUpdateSettings({ reframeMode: item.id })}
                      className={`py-1 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        settings.reframeMode === item.id
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Denoise Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <label htmlFor="slider-denoise" className="text-slate-300">
                    ลดนอยส์และรอยแตกภาพ
                  </label>
                  <span className="font-mono tabular-nums text-slate-300">{settings.deblockDenoise}%</span>
                </div>
                <input
                  id="slider-denoise"
                  type="range"
                  min={0}
                  max={100}
                  value={settings.deblockDenoise}
                  onChange={(e) => onUpdateSettings({ deblockDenoise: Number(e.target.value) })}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              {/* Vibrance & Brightness */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <label htmlFor="slider-vibrance" className="text-slate-300">
                      ความสดของสี
                    </label>
                    <span className="font-mono tabular-nums text-slate-300">
                      {settings.vibrance > 0 ? `+${settings.vibrance}` : settings.vibrance}
                    </span>
                  </div>
                  <input
                    id="slider-vibrance"
                    type="range"
                    min={-50}
                    max={50}
                    value={settings.vibrance}
                    onChange={(e) => onUpdateSettings({ vibrance: Number(e.target.value) })}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <label htmlFor="slider-brightness" className="text-slate-300">
                      ความสว่างเงามืด
                    </label>
                    <span className="font-mono tabular-nums text-slate-300">
                      {settings.brightness > 0 ? `+${settings.brightness}` : settings.brightness}
                    </span>
                  </div>
                  <input
                    id="slider-brightness"
                    type="range"
                    min={-30}
                    max={30}
                    value={settings.brightness}
                    onChange={(e) => onUpdateSettings({ brightness: Number(e.target.value) })}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Save Custom Preset */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  ล็อกบิตเรตอัตโนมัติ {metrics.targetBitrateMbps} Mbps
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveForm((prev) => !prev);
                    setPresetError(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>บันทึกค่านี้ไว้ใช้ซ้ำ</span>
                </button>
              </div>

              {showSaveForm && (
                <form onSubmit={handleSaveCustomProfile} className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      id="custom-preset-input"
                      type="text"
                      value={newPresetName}
                      onChange={(e) => {
                        setNewPresetName(e.target.value);
                        if (presetError) setPresetError(null);
                      }}
                      placeholder="ชื่อโหมดของคุณ..."
                      aria-label="ชื่อพรีเซ็ตส่วนตัว"
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold bg-orange-500 text-slate-950 rounded-lg hover:bg-orange-400 transition-colors whitespace-nowrap shrink-0"
                    >
                      บันทึก
                    </button>
                  </div>
                  {presetError && (
                    <p role="alert" className="text-xs text-rose-400">
                      {presetError}
                    </p>
                  )}
                </form>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Clean Bottom CTA Area */}
      <div className="p-5 bg-[#0A0E17] border-t border-slate-800/80 space-y-2.5">
        <button
          type="button"
          disabled={isExportingNow}
          onClick={onStartImmediateExport}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-slate-950 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-orange-500/10"
        >
          <Download className="w-4 h-4" />
          <span>
            {isExportingNow
              ? 'กำลังอัพสเกลวิดีโอ...'
              : `อัพสเกลและดาวน์โหลด (${metrics.outputWidth}×${metrics.outputHeight})`}
          </span>
        </button>

        <button
          type="button"
          onClick={onAddToQueue}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
        >
          <ListPlus className="w-3.5 h-3.5" />
          <span>เพิ่มเข้าคิวเพื่อทำหลายไฟล์พร้อมกัน</span>
        </button>
      </div>
    </div>
  );
};
