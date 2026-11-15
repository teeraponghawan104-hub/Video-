import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Upload,
  Eye,
  Camera,
} from 'lucide-react';
import {
  EnhancementSettings,
  OutputMetrics,
  PlatformPreset,
} from '../utils/upscaleEngine';
import {
  DEMO_CLIPS,
  DemoClipSpec,
  drawProceduralSourceFrame,
  renderSplitComparisonFrame,
} from '../utils/canvasProcessor';

interface VideoPreviewStageProps {
  activePreset: PlatformPreset;
  settings: EnhancementSettings;
  metrics: OutputMetrics;
  selectedDemoClip: DemoClipSpec;
  onSelectDemoClip: (clip: DemoClipSpec) => void;
  uploadedVideoUrl: string | null;
  uploadedVideoName: string | null;
  onUploadVideo: (file: File) => void;
  onClearUploadedVideo: () => void;
  onSourceDimensionsChange: (width: number, height: number, durationSec: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCaptureSnapshot: () => void;
}

export const VideoPreviewStage: React.FC<VideoPreviewStageProps> = ({
  activePreset,
  settings,
  metrics,
  selectedDemoClip,
  onSelectDemoClip,
  uploadedVideoUrl,
  uploadedVideoName,
  onUploadVideo,
  onClearUploadedVideo,
  onSourceDimensionsChange,
  canvasRef,
  onCaptureSnapshot,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [splitPct, setSplitPct] = useState(50);
  // Default Safe Zone to FALSE so the video canvas is clean and minimal on load
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const stateRef = useRef({
    isPlaying,
    splitPct,
    activePreset,
    settings,
    selectedDemoClip,
    uploadedVideoUrl,
  });

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      splitPct,
      activePreset,
      settings,
      selectedDemoClip,
      uploadedVideoUrl,
    };
  }, [isPlaying, splitPct, activePreset, settings, selectedDemoClip, uploadedVideoUrl]);

  useEffect(() => {
    if (!uploadedVideoUrl) {
      onSourceDimensionsChange(
        selectedDemoClip.sourceWidth,
        selectedDemoClip.sourceHeight,
        selectedDemoClip.durationSec
      );
      return;
    }

    const vid = document.createElement('video');
    vid.src = uploadedVideoUrl;
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.crossOrigin = 'anonymous';

    const handleLoadedMetadata = () => {
      const w = vid.videoWidth || 720;
      const h = vid.videoHeight || 1280;
      const dur = Number.isFinite(vid.duration) && vid.duration > 0 ? Math.round(vid.duration) : 12;
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
  }, [uploadedVideoUrl, selectedDemoClip, onSourceDimensionsChange]);

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
    let startTime = performance.now();
    let pausedElapsed = 0;
    let lastDrawTime = 0;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }

    const renderLoop = (now: number) => {
      rafId = requestAnimationFrame(renderLoop);

      if (now - lastDrawTime < 42) {
        return;
      }
      lastDrawTime = now;

      const {
        isPlaying: playing,
        splitPct: currentSplit,
        activePreset: preset,
        settings: enhSettings,
        selectedDemoClip: demoClip,
        uploadedVideoUrl: customUrl,
      } = stateRef.current;

      if (playing) {
        pausedElapsed = (now - startTime) / 1000;
      } else {
        startTime = now - pausedElapsed * 1000;
      }

      const targetCanvas = canvasRef.current;
      const offscreen = offscreenCanvasRef.current;

      if (targetCanvas && offscreen) {
        const previewHeight =
          preset.aspectRatio === '16:9' ? 540 : preset.aspectRatio === '4:5' ? 650 : 720;
        const previewWidth =
          preset.aspectRatio === '16:9' ? 960 : preset.aspectRatio === '4:5' ? 520 : 405;

        if (targetCanvas.width !== previewWidth || targetCanvas.height !== previewHeight) {
          targetCanvas.width = previewWidth;
          targetCanvas.height = previewHeight;
        }

        if (customUrl && videoElRef.current && videoElRef.current.readyState >= 2) {
          const vid = videoElRef.current;
          renderSplitComparisonFrame(
            targetCanvas,
            vid,
            vid.videoWidth || 720,
            vid.videoHeight || 1280,
            preset,
            enhSettings,
            currentSplit
          );
        } else {
          const srcW = demoClip.sourceWidth;
          const srcH = demoClip.sourceHeight;
          if (offscreen.width !== srcW || offscreen.height !== srcH) {
            offscreen.width = srcW;
            offscreen.height = srcH;
          }
          const offCtx = offscreen.getContext('2d');
          const loopedTime = pausedElapsed % demoClip.durationSec;
          if (offCtx) {
            drawProceduralSourceFrame(offCtx, srcW, srcH, loopedTime, demoClip.id, true);
          }
          renderSplitComparisonFrame(
            targetCanvas,
            offscreen,
            srcW,
            srcH,
            preset,
            enhSettings,
            currentSplit
          );
        }
      }
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [canvasRef]);

  const handlePointerMoveOnCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSplit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setSplitPct(Math.round((relX / rect.width) * 100));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadVideo(file);
    }
  };

  const aspectContainerClass =
    activePreset.aspectRatio === '16:9'
      ? 'aspect-video max-w-[680px] w-full'
      : activePreset.aspectRatio === '4:5'
      ? 'aspect-[4/5] h-[250px] sm:h-[420px] lg:h-[470px]'
      : 'aspect-[9/16] h-[270px] sm:h-[430px] lg:h-[480px]';

  return (
    <div className="flex flex-col h-full bg-[#0E131F] border border-slate-800/80 rounded-2xl overflow-hidden">
      {/* Minimal Top Bar: Clip switcher on left, Upload on right */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800/70">
        <div className="flex items-center gap-1 overflow-x-auto">
          {DEMO_CLIPS.map((clip) => {
            const isSelected = !uploadedVideoUrl && selectedDemoClip.id === clip.id;
            return (
              <button
                key={clip.id}
                type="button"
                onClick={() => {
                  onClearUploadedVideo();
                  onSelectDemoClip(clip);
                }}
                className={`min-h-[36px] px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {clip.id === 'street_vlog'
                  ? 'Vlog กลางคืน'
                  : clip.id === 'skincare_studio'
                  ? 'รีวิวสินค้า'
                  : 'คลิป 16:9'}
              </button>
            );
          })}
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
          {uploadedVideoName && (
            <span className="hidden sm:inline text-xs text-orange-400 truncate max-w-[120px]">
              {uploadedVideoName}
            </span>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-orange-400" />
            <span>เลือกวิดีโอ</span>
          </button>
        </div>
      </div>

      {/* Center Canvas Stage */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-3 sm:p-5 bg-[#080B12] select-none">
        <div
          className={`relative ${aspectContainerClass} bg-slate-950 border border-slate-800/90 rounded-xl overflow-hidden shadow-xl cursor-ew-resize`}
          onPointerDown={(e) => {
            setIsDraggingSplit(true);
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
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

          {/* Subtle Corner Badges */}
          {splitPct > 18 && (
            <div className="absolute top-2.5 left-2.5 pointer-events-none bg-black/75 px-2 py-0.5 rounded text-[10px] text-slate-300 whitespace-nowrap">
              ก่อนทำ
            </div>
          )}
          {splitPct < 82 && (
            <div className="absolute top-2.5 right-2.5 pointer-events-none bg-black/80 px-2 py-0.5 rounded text-[10px] text-orange-300 font-medium whitespace-nowrap">
              หลังอัพสเกล HD
            </div>
          )}

          {/* Optional Safe Zone Guide (Only visible when toggled on) */}
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
          <span>ลากเส้นสีส้มบนภาพเพื่อเทียบความคมชัด</span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-200">
            {metrics.outputWidth}×{metrics.outputHeight} ({metrics.effectiveFps} FPS)
          </span>
          <span aria-hidden="true">·</span>
          <span>{metrics.targetBitrateMbps} Mbps</span>
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
            className="min-h-[38px] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {splitPct === 0 ? 'เทียบต้นฉบับ 50/50' : 'ดูภาพเต็ม 100%'}
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
            onClick={onCaptureSnapshot}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>เซฟภาพ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
