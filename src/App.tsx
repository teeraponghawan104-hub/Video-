import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_ENHANCEMENT_SETTINGS,
  EnhancementSettings,
  PLATFORM_PRESETS,
  PlatformPreset,
  calculateOutputMetrics,
} from './utils/upscaleEngine';
import { DEMO_CLIPS, DemoClipSpec } from './utils/canvasProcessor';
import { VideoPreviewStage } from './components/VideoPreviewStage';
import { EnhancementControls } from './components/EnhancementControls';
import { RenderJob, RenderQueuePanel } from './components/RenderQueuePanel';
import { PlatformGuideSection } from './components/PlatformGuideSection';
import { CheckCircle2, Download, X } from 'lucide-react';

type ActiveTab = 'studio' | 'queue' | 'specs';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [activePreset, setActivePreset] = useState<PlatformPreset>(PLATFORM_PRESETS[0]);
  const [settings, setSettings] = useState<EnhancementSettings>(DEFAULT_ENHANCEMENT_SETTINGS);
  const [selectedDemoClip, setSelectedDemoClip] = useState<DemoClipSpec>(DEMO_CLIPS[0]);

  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedVideoName, setUploadedVideoName] = useState<string | null>(null);

  const [sourceDims, setSourceDims] = useState({
    width: DEMO_CLIPS[0].sourceWidth,
    height: DEMO_CLIPS[0].sourceHeight,
    durationSec: DEMO_CLIPS[0].durationSec,
  });

  const [isExportingNow, setIsExportingNow] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{
    title: string;
    subtitle: string;
    downloadUrl?: string;
    downloadName?: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([
    {
      id: 'seed-job-1',
      clipTitle: 'Bangkok Night Street Vlog (540p → 1080p60)',
      platformName: 'TikTok 1080p60 Anti-Compress',
      platformLabel: 'TikTok',
      resolution: '1080×1920',
      fps: 60,
      bitrateMbps: 16.5,
      estimatedSizeMb: 24.8,
      casSharpness: 68,
      status: 'completed',
      progressPct: 100,
      createdAt: 'เมื่อสักครู่',
      downloadUrl: 'data:text/plain;charset=utf-8,KrispScale-TikTok-1080p60-Export-Manifest',
      downloadFilename: 'Bangkok_Night_Vlog_TikTok_1080p60.webm',
    },
  ]);

  const metrics = useMemo(
    () =>
      calculateOutputMetrics(
        sourceDims.width,
        sourceDims.height,
        sourceDims.durationSec,
        activePreset,
        settings
      ),
    [sourceDims, activePreset, settings]
  );

  const handleUpdateSettings = useCallback((patch: Partial<EnhancementSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_ENHANCEMENT_SETTINGS);
  }, []);

  const handleSourceDimensionsChange = useCallback(
    (width: number, height: number, durationSec: number) => {
      setSourceDims((prev) => {
        if (
          prev.width === width &&
          prev.height === height &&
          prev.durationSec === durationSec
        ) {
          return prev;
        }
        return { width, height, durationSec };
      });
    },
    []
  );

  const handleUploadVideo = (file: File) => {
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }
    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    setUploadedVideoName(file.name);
  };

  const handleClearUploadedVideo = () => {
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }
    setUploadedVideoUrl(null);
    setUploadedVideoName(null);
  };

  const createCanvasExportBlobUrl = async (): Promise<{
    url: string;
    ext: string;
  }> => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return {
        url: 'data:text/plain;charset=utf-8,KrispScale-Export',
        ext: 'webm',
      };
    }

    if (typeof MediaRecorder !== 'undefined' && typeof canvas.captureStream === 'function') {
      try {
        const stream = canvas.captureStream(60);
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: Math.round(metrics.targetBitrateMbps * 1_000_000),
        });
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const blobPromise = new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            resolve(new Blob(chunks, { type: mimeType }));
          };
        });

        recorder.start();
        await new Promise((r) => setTimeout(r, 700));
        recorder.stop();
        const blob = await blobPromise;
        if (blob.size > 0) {
          return { url: URL.createObjectURL(blob), ext: 'webm' };
        }
      } catch {
        // Fallback to high-res PNG below
      }
    }

    return {
      url: canvas.toDataURL('image/png'),
      ext: 'png',
    };
  };

  const handleCaptureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const filename = `KrispScale_${activePreset.platformLabel}_${metrics.outputWidth}x${metrics.outputHeight}.png`;

    setBannerNotice({
      title: `บันทึกภาพเฟรมคมชัดสูง ${metrics.outputWidth}×${metrics.outputHeight} สำเร็จ`,
      subtitle: `ความคมชัด ${settings.sharpness}% สำหรับ ${activePreset.platformLabel}`,
      downloadUrl: dataUrl,
      downloadName: filename,
    });
  };

  const handleAddToQueue = () => {
    const clipLabel = uploadedVideoName || selectedDemoClip.title;
    const newJob: RenderJob = {
      id: `job-${Date.now()}`,
      clipTitle: clipLabel,
      platformName: activePreset.name,
      platformLabel: activePreset.platformLabel,
      resolution: `${metrics.outputWidth}×${metrics.outputHeight}`,
      fps: metrics.effectiveFps,
      bitrateMbps: metrics.targetBitrateMbps,
      estimatedSizeMb: metrics.estimatedFileSizeMb,
      casSharpness: settings.sharpness,
      status: 'queued',
      progressPct: 0,
      createdAt: 'เมื่อสักครู่',
    };

    setRenderJobs((prev) => [newJob, ...prev]);
    setBannerNotice({
      title: 'เพิ่มลงคิวไฟล์เรียบร้อยแล้ว',
      subtitle: `${activePreset.platformLabel} (${metrics.outputWidth}×${metrics.outputHeight})`,
    });
  };

  const runJobSimulationAndExport = async (jobId: string) => {
    setRenderJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: 'processing', progressPct: 25 } : j
      )
    );

    await new Promise((r) => setTimeout(r, 200));
    setRenderJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, progressPct: 70 } : j))
    );

    const exported = await createCanvasExportBlobUrl();
    const safePlatform = activePreset.platformLabel.replace(/\s+/g, '_');
    const filename = `KrispScale_${safePlatform}_${metrics.outputWidth}x${metrics.outputHeight}_${metrics.effectiveFps}fps.${exported.ext}`;

    setRenderJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: 'completed',
              progressPct: 100,
              downloadUrl: exported.url,
              downloadFilename: filename,
            }
          : j
      )
    );

    return { url: exported.url, filename };
  };

  const handleStartImmediateExport = async () => {
    if (isExportingNow) return;
    setIsExportingNow(true);

    const clipLabel = uploadedVideoName || selectedDemoClip.title;
    const newJobId = `job-${Date.now()}`;
    const newJob: RenderJob = {
      id: newJobId,
      clipTitle: clipLabel,
      platformName: activePreset.name,
      platformLabel: activePreset.platformLabel,
      resolution: `${metrics.outputWidth}×${metrics.outputHeight}`,
      fps: metrics.effectiveFps,
      bitrateMbps: metrics.targetBitrateMbps,
      estimatedSizeMb: metrics.estimatedFileSizeMb,
      casSharpness: settings.sharpness,
      status: 'processing',
      progressPct: 15,
      createdAt: 'เมื่อสักครู่',
    };

    setRenderJobs((prev) => [newJob, ...prev]);

    const { url, filename } = await runJobSimulationAndExport(newJobId);
    setIsExportingNow(false);

    setBannerNotice({
      title: `อัพสเกลวิดีโอ ${metrics.outputWidth}×${metrics.outputHeight} เสร็จเรียบร้อย`,
      subtitle: `พร้อมโพสต์ลง ${activePreset.platformLabel} โดยไม่ถูกบีบอัดซ้ำ`,
      downloadUrl: url,
      downloadName: filename,
    });
  };

  const handleProcessAllQueued = async () => {
    const queuedIds = renderJobs.filter((j) => j.status === 'queued').map((j) => j.id);
    for (const id of queuedIds) {
      await runJobSimulationAndExport(id);
    }
  };

  const handleRemoveJob = (id: string) => {
    setRenderJobs((prev) => prev.filter((j) => j.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080B12] text-slate-100">
      {/* Strict 3-Zone Top Bar Contract — Ultra Clean & Minimal */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0B0F19] border-b border-slate-800/70">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('studio');
          }}
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          KrispScale
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="เมนูหลัก" className="flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'studio'
                ? 'text-white underline underline-offset-8 decoration-orange-500 decoration-2'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            อัพสเกลวิดีโอ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'queue'
                ? 'text-white underline underline-offset-8 decoration-orange-500 decoration-2'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ไฟล์ที่ส่งออก ({renderJobs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'specs'
                ? 'text-white underline underline-offset-8 decoration-orange-500 decoration-2'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ตารางบิตเรต TikTok
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleStartImmediateExport}
            disabled={isExportingNow}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isExportingNow ? 'กำลังเรนเดอร์...' : 'ส่งออกวิดีโอ HD'}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Notification Banner when Export / Snapshot completes */}
        {bannerNotice && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-100"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-semibold">{bannerNotice.title}</span>
                <span className="text-emerald-300/80 ml-2">{bannerNotice.subtitle}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {bannerNotice.downloadUrl && (
                <a
                  href={bannerNotice.downloadUrl}
                  download={bannerNotice.downloadName || 'krispscale-output.webm'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-400 text-slate-950 rounded-lg hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดไฟล์</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setBannerNotice(null)}
                aria-label="ปิดการแจ้งเตือน"
                className="p-1 text-emerald-300 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: Minimalist 2-Column Studio Workspace */}
        {activeTab === 'studio' && (
          <section
            id="studio-workspace"
            aria-label="พื้นที่อัพสเกลวิดีโอ"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
          >
            {/* Left 7 Cols: Clean Video Preview */}
            <div className="lg:col-span-7 flex flex-col lg:h-[680px]">
              <VideoPreviewStage
                activePreset={activePreset}
                settings={settings}
                metrics={metrics}
                selectedDemoClip={selectedDemoClip}
                onSelectDemoClip={setSelectedDemoClip}
                uploadedVideoUrl={uploadedVideoUrl}
                uploadedVideoName={uploadedVideoName}
                onUploadVideo={handleUploadVideo}
                onClearUploadedVideo={handleClearUploadedVideo}
                onSourceDimensionsChange={handleSourceDimensionsChange}
                canvasRef={canvasRef}
                onCaptureSnapshot={handleCaptureSnapshot}
              />
            </div>

            {/* Right 5 Cols: Simple 3-Step Controls */}
            <div className="lg:col-span-5 flex flex-col lg:h-[680px]">
              <EnhancementControls
                activePreset={activePreset}
                onSelectPreset={setActivePreset}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onResetSettings={handleResetSettings}
                metrics={metrics}
                onStartImmediateExport={handleStartImmediateExport}
                onAddToQueue={handleAddToQueue}
                isExportingNow={isExportingNow}
              />
            </div>
          </section>
        )}

        {/* TAB 2: Export Queue */}
        {activeTab === 'queue' && (
          <RenderQueuePanel
            jobs={renderJobs}
            onProcessAllQueued={handleProcessAllQueued}
            onRemoveJob={handleRemoveJob}
            onAddCurrentToQueue={handleAddToQueue}
          />
        )}

        {/* TAB 3: Platform Bitrate Reference */}
        {activeTab === 'specs' && (
          <PlatformGuideSection
            activePreset={activePreset}
            onSelectPreset={(preset) => {
              setActivePreset(preset);
              setActiveTab('studio');
            }}
          />
        )}
      </main>
    </div>
  );
}
