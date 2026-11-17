import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Upload,
  Eye,
  Camera,
  Columns,
  Film,
} from 'lucide-react';
import {
  EnhancementSettings,
  OutputMetrics,
  PlatformPreset,
} from '../utils/upscaleEngine';
import {
  DemoClipSpec,
  renderSplitComparisonFrame,
} from '../utils/canvasProcessor';
import { exportHighResSnapshot } from '../utils/videoExporter';

interface VideoPreviewStageProps {
  activePreset: PlatformPreset;
  settings: EnhancementSettings;
  metrics: OutputMetrics;
  selectedDemoClip: DemoClipSpec;
  onSelectDemoClip: (clip: DemoClipSpec) => void;
  uploadedVideoUrl: string | null;
  uploadedVideoName: string | null;
  sourceDims: { width: number; height: number; durationSec: number };
  onUploadVideo: (file: File) => void;
  onClearUploadedVideo: () => void;
  onSourceDimensionsChange: (width: number, height: number, durationSec: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoElRef: React.MutableRefObject<HTMLVideoElement | null>;
  isExportingNow: boolean;
  onCaptureSnapshot: (fullResDataUrl: string) => void;
}

export const VideoPreviewStage: React.FC<VideoPreviewStageProps> = ({
  activePreset,
  settings,
  metrics,
  selectedDemoClip,
  uploadedVideoUrl,
  uploadedVideoName,
  sourceDims,
  onUploadVideo,
  onSourceDimensionsChange,
  canvasRef,
  videoElRef,
  isExportingNow,
  onCaptureSnapshot,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [splitPct, setSplitPct] = useState(0);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeVideoSrc = uploadedVideoUrl || '/assets/sample_story_1080p.mp4';

  const stateRef = useRef({
    isPlaying,
    splitPct,
    activePreset,
    settings,
    selectedDemoClip,
    activeVideoSrc,
    isExportingNow,
  });

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      splitPct,
      activePreset,
      settings,
      selectedDemoClip,
      activeVideoSrc,
      isExportingNow,
    };
  }, [isPlaying, splitPct, activePreset, settings, selectedDemoClip, activeVideoSrc, isExportingNow]);

  useEffect(() => {
    const vid = document.createElement('video');
    vid.src = activeVideoSrc;
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.crossOrigin = 'anonymous';
    vid.preload = 'auto';

    const handleLoadedMetadata = () => {
      const w = vid.videoWidth || 1080;
      const h = vid.videoHeight || 1920;
      const dur =
        Number.isFinite(vid.duration) && vid.duration > 0
          ? Number(vid.duration.toFixed(1))
          : 3.5;
      onSourceDimensionsChange(w, h, dur);
      vid.play().catch(() => {});
    };

    vid.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElRef.current = vid;

    return () => {
      vid.pause();
      vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElRef.current = null;
    };
  }, [activeVideoSrc, onSourceDimensionsChange, videoElRef]);

  useEffect(() => {
    const vid = videoElRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    let rafId = 0;
    let lastDrawTime = 0;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }

    const renderLoop = (now: number) => {
      rafId = requestAnimationFrame(renderLoop);

      const {
        splitPct: currentSplit,
        activePreset: preset,
        settings: enhSettings,
        isExportingNow: exporting,
      } = stateRef.current;

      const minInterval = exporting ? 90 : 42;
      if (now - lastDrawTime < minInterval) {
        return;
      }
      lastDrawTime = now;

      const targetCanvas = canvasRef.current;
      const offscreen = offscreenCanvasRef.current;
      const effectiveSplit = exporting ? 0 : currentSplit;

      if (targetCanvas && offscreen) {
        const previewHeight =
          preset.aspectRatio === '16:9' ? 540 : preset.aspectRatio === '4:5' ? 650 : 720;
        const previewWidth =
          preset.aspectRatio === '16:9' ? 960 : preset.aspectRatio === '4:5' ? 520 : 405;

        if (targetCanvas.width !== previewWidth || targetCanvas.height !== previewHeight) {
          targetCanvas.width = previewWidth;
          targetCanvas.height = previewHeight;
        }

        const vid = videoElRef.current;
        if (vid && vid.readyState >= 2 && vid.videoWidth > 0) {
          const vw = vid.videoWidth;
          const vh = vid.videoHeight;
          if (offscreen.width !== vw || offscreen.height !== vh) {
            offscreen.width = vw;
            offscreen.height = vh;
          }
          const offCtx = offscreen.getContext('2d');
          if (offCtx) {
            offCtx.drawImage(vid, 0, 0, vw, vh);
          }
          renderSplitComparisonFrame(
            targetCanvas,
            vid,
            vw,
            vh,
            preset,
            enhSettings,
            effectiveSplit
          );
        } else if (offscreen.width > 0 && offscreen.height > 0) {
          renderSplitComparisonFrame(
            targetCanvas,
            offscreen,
            offscreen.width,
            offscreen.height,
            preset,
            enhSettings,
            effectiveSplit
          );
        }
      }
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [canvasRef, videoElRef]);

  const handlePointerMoveOnCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSplit || splitPct === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(4, Math.min(rect.width - 4, e.clientX - rect.left));
    setSplitPct(Math.round((relX / rect.width) * 100));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSplitPct(0);
      onUploadVideo(file);
      e.target.value = '';
    }
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFileOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSplitPct(0);
      onUploadVideo(file);
    }
  };

  const handleTakePureSnapshot = () => {
    if (videoElRef.current && videoElRef.current.readyState >= 2) {
      const vid = videoElRef.current;
      const dataUrl = exportHighResSnapshot(
        vid,
        vid.videoWidth || 1080,
        vid.videoHeight || 1920,
        activePreset,
        settings,
        metrics
      );
      onCaptureSnapshot(dataUrl);
    } else if (offscreenCanvasRef.current && offscreenCanvasRef.current.width > 0) {
      const off = offscreenCanvasRef.current;
      const dataUrl = exportHighResSnapshot(
        off,
        off.width,
        off.height,
        activePreset,
        settings,
        metrics
      );
      onCaptureSnapshot(dataUrl);
    }
  };

  const aspectContainerClass =
    activePreset.aspectRatio === '16:9'
      ? 'aspect-video max-w-[680px] w-full'
      : activePreset.aspectRatio === '4:5'
      ? 'aspect-[4/5] h-[250px] sm:h-[420px] lg:h-[470px]'
      : 'aspect-[9/16] h-[270px] sm:h-[430px] lg:h-[480px]';

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFileOver(true);
      }}
      onDragLeave={() => setIsDraggingFileOver(false)}
      onDrop={handleDropFile}
      className={`flex flex-col h-full bg-[#0E131F] border rounded-2xl overflow-hidden transition-colors ${
        isDraggingFileOver ? 'border-orange-500 bg-orange-950/10' : 'border-slate-800/80'
      }`}
    >
      {/* Top Bar: Active Video Info on left, Prominent Upload Button on right */}
      <div className="flex items-center justify-between gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800/70">
        <div className="flex items-center gap-2 min-w-0">
          <Film className="w-4 h-4 text-orange-400 shrink-0" />
          <div className="truncate text-xs">
            <span className="font-medium text-slate-200 truncate">
              {uploadedVideoName || 'คลิปตัวอย่างพร้อมทดสอบ (.MP4)'}
            </span>
            <span className="text-slate-400 ml-2 font-mono">
              ({sourceDims.width}×{sourceDims.height} · {sourceDims.durationSec}s)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="อัปโหลดไฟล์วิดีโอจากเครื่อง"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-semibold text-white bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-orange-400" />
            <span>เลือกวิดีโอจากเครื่อง</span>
          </button>
        </div>
      </div>

      {/* Center Canvas Stage */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-3 sm:p-5 bg-[#080B12] select-none">
        <div
          className={`relative ${aspectContainerClass} bg-slate-950 border border-slate-800/90 rounded-xl overflow-hidden shadow-xl ${
            splitPct > 0 ? 'cursor-ew-resize' : 'cursor-default'
          }`}
          onPointerDown={(e) => {
            if (splitPct === 0) return;
            setIsDraggingSplit(true);
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = Math.max(4, Math.min(rect.width - 4, e.clientX - rect.left));
            setSplitPct(Math.round((relX / rect.width) * 100));
          }}
          onPointerMove={handlePointerMoveOnCanvas}
          onPointerUp={() => setIsDraggingSplit(false)}
          onPointerLeave={() => setIsDraggingSplit(false)}
        >
          <canvas
            ref={canvasRef}
            data-testid="upscale-preview-canvas"
            className="w-full h-full object-contain block"
          />

          {/* Pure DOM Split Divider Overlay (Only shown when user activates 50/50 Compare Mode; NEVER baked into canvas or video export!) */}
          {splitPct > 0 && splitPct < 100 && (
            <div
              style={{ left: `${splitPct}%` }}
              className="absolute top-0 bottom-0 -translate-x-1/2 pointer-events-none flex flex-col items-center justify-center"
            >
              <div className="w-0.5 h-full bg-orange-500/90" />
              <div className="absolute w-7 h-7 rounded-full bg-slate-950 border-2 border-orange-500 flex items-center justify-center text-[10px] text-white font-mono shadow-lg">
                ↔
              </div>
            </div>
          )}

          {/* Subtle Corner Badges */}
          {splitPct > 18 && (
            <div className="absolute top-2.5 left-2.5 pointer-events-none bg-black/75 px-2 py-0.5 rounded text-[10px] text-slate-300 whitespace-nowrap">
              ก่อนทำ
            </div>
          )}
          <div className="absolute top-2.5 right-2.5 pointer-events-none bg-black/80 px-2 py-0.5 rounded text-[10px] text-orange-300 font-medium whitespace-nowrap">
            อัพสเกล HD {metrics.outputWidth}×{metrics.outputHeight}
          </div>

          {/* Optional Safe Zone Guide */}
          {showSafeZone && activePreset.aspectRatio === '9:16' && (
            <div
              data-testid="tiktok-safe-zone-overlay"
              className="absolute inset-0 pointer-events-none flex flex-col justify-between"
            >
              <div
                style={{ height: `${activePreset.safeZonePadding.topPct}%` }}
                className="w-full bg-rose-950/40 border-b border-dashed border-rose-400/60 flex items-center justify-center"
              >
                <span className="text-[10px] text-rose-200">พื้นที่แถบค้นหา TikTok</span>
              </div>
              <div className="flex-1 flex justify-end items-end">
                <div
                  style={{ width: `${activePreset.safeZonePadding.rightPct}%` }}
                  className="h-[65%] bg-rose-950/40 border-l border-t border-dashed border-rose-400/60 flex flex-col items-center justify-around py-3 text-[9px] text-rose-200"
                >
                  <span>โปรไฟล์</span>
                  <span>หัวใจ</span>
                  <span>คอมเมนต์</span>
                  <span>แชร์</span>
                </div>
              </div>
              <div
                style={{ height: `${activePreset.safeZonePadding.bottomPct}%` }}
                className="w-full bg-rose-950/40 border-t border-dashed border-rose-400/60 flex items-center px-3"
              >
                <span className="text-[10px] text-rose-200">
                  พื้นที่แคปชัน TikTok (วางซับไตเติลเหนือเส้นนี้)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quiet inline caption below canvas */}
        <div
          data-testid="output-resolution-readout"
          className="mt-3 flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums"
        >
          <span>
            {splitPct > 0
              ? 'โหมดเปรียบเทียบก่อน/หลัง (เส้นแบ่งจะไม่ติดไปในไฟล์ .MP4 ที่ส่งออก)'
              : 'แสดงผลภาพอัพสเกลเต็มจอ 100%'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-200">
            {metrics.outputWidth}×{metrics.outputHeight} ({metrics.effectiveFps} FPS)
          </span>
          <span aria-hidden="true">·</span>
          <span>MP4 (H.264)</span>
        </div>
      </div>

      {/* Minimal Bottom Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-5 py-3 border-t border-slate-800/70">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            aria-label={isPlaying ? 'หยุดเล่นชั่วคราว' : 'เล่นวิดีโอ'}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'หยุดเล่น' : 'เล่นวิดีโอ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSplitPct(splitPct === 0 ? 50 : 0)}
            aria-pressed={splitPct > 0}
            className={`min-h-[38px] inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              splitPct > 0
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{splitPct === 0 ? 'เทียบก่อน/หลัง 50/50' : 'ปิดเส้นแบ่ง (ดูเต็มจอ)'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {activePreset.aspectRatio === '9:16' && (
            <button
              type="button"
              onClick={() => setShowSafeZone((prev) => !prev)}
              aria-pressed={showSafeZone}
              className={`min-h-[38px] inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                showSafeZone
                  ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>กรอบ TikTok</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleTakePureSnapshot}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>เซฟภาพนิ่ง</span>
          </button>
        </div>
      </div>
    </div>
  );
};
