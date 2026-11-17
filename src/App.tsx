import React, { useEffect, useState } from 'react';
import { PLATFORM_PRESETS, PlatformPreset } from './utils/upscaleEngine';
import { BareetOptimizerView } from './components/BareetOptimizerView';
import { TikTokAnalyzerView } from './components/TikTokAnalyzerView';
import { PlatformGuideSection } from './components/PlatformGuideSection';
import { AppLogoIcon } from './components/AppLogoIcon';
import { PWAInstallModal } from './components/PWAInstallModal';
import { usePWAInstall } from './utils/usePWAInstall';

type ActiveTab = 'optimizer' | 'analyzer' | 'guide';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('optimizer');
  const [activePreset, setActivePreset] = useState<PlatformPreset>(
    PLATFORM_PRESETS[0]
  );
  const [showAnnouncement, setShowAnnouncement] = useState<boolean>(true);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  const { isInstallable, isIOS, install } = usePWAInstall();

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#07080F] text-zinc-100 pb-16 md:pb-0">
      {/* Subtle Top Radial Signal Glow (matches bareet.dev backdrop) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 -top-40 z-0 h-96 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(14,165,233,0.14),transparent)]"
      />

      {/* 3-Zone Top Bar Contract (matches bareet.dev header) */}
      <header className="sticky top-0 z-30 border-b border-[#12152A] bg-[#07080F]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Zone 1: Brand + Primary Navigation */}
          <div className="flex items-center gap-6">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('optimizer');
              }}
              className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
            >
              <AppLogoIcon className="h-8 w-8 shrink-0 rounded-xl shadow-md" />
              <span>Bareet Method</span>
            </a>

            <nav
              aria-label="เมนูหลัก"
              className="hidden md:flex items-center gap-1 text-sm"
            >
              <button
                type="button"
                onClick={() => setActiveTab('optimizer')}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'optimizer'
                    ? 'bg-[#12152A] text-white'
                    : 'text-zinc-400 hover:bg-[#0B0D18] hover:text-zinc-200'
                }`}
              >
                หน้าแรก
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analyzer')}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'analyzer'
                    ? 'bg-[#12152A] text-white'
                    : 'text-zinc-400 hover:bg-[#0B0D18] hover:text-zinc-200'
                }`}
              >
                วิเคราะห์
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'guide'
                    ? 'bg-[#12152A] text-white'
                    : 'text-zinc-400 hover:bg-[#0B0D18] hover:text-zinc-200'
                }`}
              >
                วิธีใช้ & ตารางบิตเรต
              </button>
            </nav>
          </div>

          {/* Zone 3: Right Action Control */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1B2040] bg-[#0B0D18] px-3.5 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:border-[#0EA5E9]/50 hover:bg-[#12152A] hover:text-white whitespace-nowrap shrink-0"
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
                <rect x="6" y="2" width="12" height="20" rx="2" />
                <path d="M12 18h.01" strokeLinecap="round" />
              </svg>
              <span>ติดตั้งแอป</span>
            </button>
          </div>
        </div>
      </header>

      {/* Emerald Patch Status Announcement Bar (matches bareet.dev announcement strip) */}
      {showAnnouncement && (
        <div className="relative z-10 border-b border-emerald-900/40 bg-gradient-to-r from-emerald-950/60 via-emerald-950/35 to-[#07080F] px-4 py-2.5">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                ✓
              </span>
              <span className="truncate font-medium text-emerald-100">
                ระบบแพตช์ใหม่ Bareet Engine (v10 / v17) เปิดใช้งานแล้ว — ปรับวิดีโอในเบราว์เซอร์ ไม่ re-encode ภาพคมเท่าต้นฉบับ
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAnnouncement(false)}
              aria-label="ปิดประกาศ"
              className="shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-[#12152A] hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1">
        {activeTab === 'optimizer' && (
          <BareetOptimizerView
            onOpenAnalyzer={() => setActiveTab('analyzer')}
            onOpenGuide={() => setActiveTab('guide')}
          />
        )}

        {activeTab === 'analyzer' && <TikTokAnalyzerView />}

        {activeTab === 'guide' && (
          <PlatformGuideSection
            activePreset={activePreset}
            onSelectPreset={(preset) => {
              setActivePreset(preset);
              setActiveTab('optimizer');
            }}
          />
        )}
      </main>

      {/* Footer (matches bareet.dev footer) */}
      <footer className="relative z-10 border-t border-[#12152A] bg-[#07080F]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 font-bold text-zinc-100">
                <AppLogoIcon className="h-6 w-6 rounded-lg" />
                <span>Bareet Method</span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">
                เอนจินวิดีโอของเราเอง · ปรับวิดีโอให้พร้อมใช้ทุกที่ ไม่ลดคุณภาพ
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-400">
              <button
                type="button"
                onClick={() => setActiveTab('optimizer')}
                className="transition-colors hover:text-zinc-100"
              >
                หน้าแรก (ปรับวิดีโอ)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analyzer')}
                className="transition-colors hover:text-zinc-100"
              >
                วิเคราะห์คลิป TikTok
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className="transition-colors hover:text-zinc-100"
              >
                คู่มือบิตเรต & การตั้งค่า
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[#12152A]/80 pt-4 text-[11px] text-zinc-500">
            <span>© 2026 Bareet Method · ประมวลผลในเครื่องของคุณเป็นหลัก</span>
            <span className="font-mono">engine 1.0</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar (< 768px) */}
      <nav
        aria-label="เมนูมือถือ"
        className="fixed bottom-0 left-0 right-0 z-30 grid h-14 grid-cols-4 items-center border-t border-[#12152A] bg-[#07080F]/95 px-2 backdrop-blur-md md:hidden"
      >
        <button
          type="button"
          onClick={() => setActiveTab('optimizer')}
          className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg transition-colors ${
            activeTab === 'optimizer'
              ? 'text-[#38BDF8]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12L13 2Z"
              strokeLinejoin="round"
            />
          </svg>
          <span className="mt-0.5 text-[10px] font-medium whitespace-nowrap">
            หน้าแรก
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analyzer')}
          className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg transition-colors ${
            activeTab === 'analyzer'
              ? 'text-[#38BDF8]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <span className="mt-0.5 text-[10px] font-medium whitespace-nowrap">
            วิเคราะห์
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg transition-colors ${
            activeTab === 'guide'
              ? 'text-[#38BDF8]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M4 6h16M4 12h16M4 18h10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="mt-0.5 text-[10px] font-medium whitespace-nowrap">
            คู่มือบิตเรต
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowInstallModal(true)}
          className="flex min-h-[44px] flex-col items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-[#38BDF8]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="6" y="2" width="12" height="20" rx="2" />
            <path d="M12 18h.01" strokeLinecap="round" />
          </svg>
          <span className="mt-0.5 text-[10px] font-medium whitespace-nowrap">
            ติดตั้งแอป
          </span>
        </button>
      </nav>

      {/* Cross-Platform Install Modal (PC, Android, iOS) */}
      <PWAInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        isInstallable={isInstallable}
        isIOS={isIOS}
        onTriggerInstall={install}
      />
    </div>
  );
}
