import React, { useState } from 'react';
import { Monitor, Smartphone, X, Download, Share } from 'lucide-react';
import { AppLogoIcon } from './AppLogoIcon';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isIOS: boolean;
  onTriggerInstall: () => Promise<boolean>;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isIOS,
  onTriggerInstall,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<'ios' | 'android' | 'desktop'>(
    isIOS ? 'ios' : 'android'
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-[#0E131F] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header with App Icon Identity */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <AppLogoIcon className="w-12 h-12 shrink-0 rounded-2xl shadow-lg" />
            <div>
              <h2 id="pwa-modal-title" className="text-base font-bold text-white">
                ติดตั้งแอป KrispScale
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                สตูดิโออัพสเกลวิดีโอ 4K 60FPS สำหรับคอมพิวเตอร์, Android และ iOS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างติดตั้งแอป"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Direct One-Click Install if browser supports beforeinstallprompt */}
        {isInstallable && (
          <button
            type="button"
            onClick={async () => {
              const ok = await onTriggerInstall();
              if (ok) onClose();
            }}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-orange-500 hover:bg-orange-400 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ติดตั้งลงเครื่องทันที (Install App)</span>
          </button>
        )}

        {/* Platform Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedDevice('ios')}
            className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedDevice === 'ios'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iOS (iPhone)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedDevice('android')}
            className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedDevice === 'android'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedDevice('desktop')}
            className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedDevice === 'desktop'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>PC / Mac</span>
          </button>
        </div>

        {/* Device-specific concise instructions */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 text-xs text-slate-300 space-y-2.5 leading-relaxed">
          {selectedDevice === 'ios' && (
            <>
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Share className="w-3.5 h-3.5 text-orange-400" />
                <span>วิธีเพิ่มไอคอนแอปบน iPhone / iPad (Safari):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                <li>กดปุ่ม <strong>แชร์ (Share)</strong> ที่แถบด้านล่างของ Safari</li>
                <li>เลื่อนลงมาแล้วแตะ <strong>เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</strong></li>
                <li>กด <strong>เพิ่ม (Add)</strong> เพื่อใช้งานแบบเต็มจอพร้อมไอคอนแอป KrispScale</li>
              </ol>
            </>
          )}

          {selectedDevice === 'android' && (
            <>
              <div className="font-semibold text-white">
                วิธีติดตั้งแอปบนมือถือ Android (Chrome):
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                <li>แตะไอคอนเมนู <strong>จุดสามจุด (⋮)</strong> มุมขวาบนของเบราว์เซอร์</li>
                <li>เลือกเมนู <strong>ติดตั้งแอป (Install app)</strong> หรือ <strong>เพิ่มลงในหน้าจอหลัก</strong></li>
                <li>ไอคอน KrispScale จะปรากฏบนหน้ารวมแอปเหมือนแอปทั่วไปทันที</li>
              </ol>
            </>
          )}

          {selectedDevice === 'desktop' && (
            <>
              <div className="font-semibold text-white">
                วิธีติดตั้งบนคอมพิวเตอร์ Windows / Mac:
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                <li>คลิกไอคอน <strong>ติดตั้ง (รูปหน้าจอพร้อมลูกศรลง)</strong> ด้านขวาของแถบ URL ใน Chrome หรือ Edge</li>
                <li>คลิก <strong>ติดตั้ง (Install)</strong> เพื่อเปิดแอปแยกหน้าต่างอิสระบน Desktop</li>
              </ol>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
        >
          เข้าใจแล้ว
        </button>
      </div>
    </div>
  );
};
