import {
  EnhancementSettings,
  PlatformPreset,
  computeReframeGeometry,
} from './upscaleEngine';

export interface DemoClipSpec {
  id: 'street_vlog' | 'skincare_studio' | 'landscape_dance';
  title: string;
  category: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceFps: number;
  durationSec: number;
  originalBitrateMbps: number;
}

export const DEMO_CLIPS: DemoClipSpec[] = [
  {
    id: 'street_vlog',
    title: 'Bangkok Night Street Vlog (540×960)',
    category: 'Lifestyle / Vlog 9:16',
    sourceWidth: 540,
    sourceHeight: 960,
    sourceFps: 30,
    durationSec: 6,
    originalBitrateMbps: 3.2,
  },
  {
    id: 'skincare_studio',
    title: 'Glow Serum Product Close-up (720×1280)',
    category: 'TikTok Shop / Review 9:16',
    sourceWidth: 720,
    sourceHeight: 1280,
    sourceFps: 30,
    durationSec: 6,
    originalBitrateMbps: 4.8,
  },
  {
    id: 'landscape_dance',
    title: 'Studio Motion Showcase 16:9 (1280×720)',
    category: 'Horizontal 16:9 -> Vertical',
    sourceWidth: 1280,
    sourceHeight: 720,
    sourceFps: 30,
    durationSec: 6,
    originalBitrateMbps: 5.5,
  },
];

/**
 * Renders a procedural creator scene onto an offscreen canvas for demo preview.
 */
export function drawProceduralSourceFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  clipId: DemoClipSpec['id'],
  simulateLowResCompression: boolean
) {
  ctx.save();

  if (clipId === 'street_vlog') {
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0c1324');
    bg.addColorStop(0.55, '#192236');
    bg.addColorStop(1, '#0f141c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const bokehColors = ['#f97316', '#38bdf8', '#fb7185', '#facc15', '#a855f7'];
    for (let i = 0; i < 12; i++) {
      const angle = timeSec * (0.4 + (i % 3) * 0.2) + i * 1.3;
      const bx = width * (0.15 + ((i * 19) % 70) / 100) + Math.sin(angle) * (width * 0.06);
      const by = height * (0.18 + ((i * 23) % 55) / 100) + Math.cos(angle * 0.8) * (height * 0.03);
      const radius = width * (0.04 + (i % 4) * 0.018);

      const radGrad = ctx.createRadialGradient(bx, by, 1, bx, by, radius);
      const color = bokehColors[i % bokehColors.length];
      radGrad.addColorStop(0, color + 'cc');
      radGrad.addColorStop(0.6, color + '44');
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#38bdf888';
    ctx.lineWidth = Math.max(1.5, width * 0.005);
    const cardW = width * 0.72;
    const cardH = height * 0.24;
    const cardX = (width - cardW) / 2;
    const cardY = height * 0.26 + Math.sin(timeSec * 1.5) * 6;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();

    const cx = width * 0.5 + Math.sin(timeSec * 1.8) * (width * 0.025);
    const cy = height * 0.65;
    const headR = width * 0.13;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = Math.max(2, width * 0.006);
    ctx.beginPath();
    ctx.ellipse(cx, cy + headR * 1.85, headR * 1.85, headR * 1.2, 0, Math.PI, 0, false);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${Math.round(width * 0.062)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('YAOWARAT NIGHT VLOG', width * 0.5, cardY + cardH * 0.42);

    ctx.fillStyle = '#fb923c';
    ctx.font = `600 ${Math.round(width * 0.036)}px "JetBrains Mono", monospace`;
    ctx.fillText('ISO 3200 · F/1.8 · 4K CAS TEST', width * 0.5, cardY + cardH * 0.72);
  } else if (clipId === 'skincare_studio') {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#1e293b');
    bg.addColorStop(0.5, '#0f172a');
    bg.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const pedW = width * 0.58;
    const pedH = height * 0.12;
    const pedX = (width - pedW) / 2;
    const pedY = height * 0.68;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(pedX, pedY, pedW, pedH, 12);
    ctx.fill();

    const botW = width * 0.28;
    const botH = height * 0.34;
    const botX = (width - botW) / 2;
    const botY = pedY - botH + Math.sin(timeSec * 2) * 5;

    const bottleGrad = ctx.createLinearGradient(botX, botY, botX + botW, botY + botH);
    bottleGrad.addColorStop(0, '#f97316');
    bottleGrad.addColorStop(0.5, '#ea580c');
    bottleGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = bottleGrad;
    ctx.beginPath();
    ctx.roundRect(botX, botY, botW, botH, 18);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(botX + botW * 0.3, botY - botH * 0.14, botW * 0.4, botH * 0.14);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(botX + botW * 0.1, botY + botH * 0.25, botW * 0.8, botH * 0.52);

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(width * 0.036)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText('LUMINA C+', width * 0.5, botY + botH * 0.44);
    ctx.font = `500 ${Math.round(width * 0.022)}px "JetBrains Mono", monospace`;
    ctx.fillText('20% ULTRA SERUM', width * 0.5, botY + botH * 0.56);
    ctx.fillText('NET 30ML / 1.0 FL OZ', width * 0.5, botY + botH * 0.68);
  } else {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(0.5, '#1e293b');
    bg.addColorStop(1, '#0f172a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 8; i++) {
      const y = height * 0.5 + i * (height * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const cx = width * 0.5 + Math.cos(timeSec * 1.4) * (width * 0.12);
    const cy = height * 0.46;
    for (let r = 1; r <= 4; r++) {
      ctx.strokeStyle = r % 2 === 0 ? '#f97316cc' : '#38bdf8cc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r * (height * 0.07) + ((timeSec * 25) % 18), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(height * 0.08)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText('16:9 STUDIO MASTER -> 9:16 REFRAME', width * 0.5, height * 0.22);
  }

  if (simulateLowResCompression) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

/**
 * Memory-safe, hardware-accelerated Upscaling & CAS Detail Pass.
 * Avoids multi-buffer offscreen allocations so mobile and desktop GPUs never crash or OOM.
 */
function drawFramePass(
  ctx: CanvasRenderingContext2D,
  dstW: number,
  dstH: number,
  sourceElement: HTMLVideoElement | HTMLCanvasElement,
  srcW: number,
  srcH: number,
  settings: EnhancementSettings,
  isEnhanced: boolean
) {
  const geo = computeReframeGeometry(srcW, srcH, dstW, dstH, settings.reframeMode);

  ctx.save();

  if (geo.needsBackgroundFill) {
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, dstW, dstH);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.drawImage(sourceElement, -12, -12, dstW + 24, dstH + 24);
    ctx.restore();
  }

  if (!isEnhanced) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceElement, geo.fgX, geo.fgY, geo.fgW, geo.fgH);
    ctx.restore();
    return;
  }

  // 1. Base high-quality bicubic/lanczos hardware upscale pass (Zero ctx.filter so GPU never stalls)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceElement, geo.fgX, geo.fgY, geo.fgW, geo.fgH);

  // 2. Hardware-accelerated CAS micro-contrast & edge clarity pass via 'overlay' blend
  const contrastAlpha = Math.min(
    0.32,
    Math.max(0, (settings.sharpness * 0.22 + settings.microContrast * 0.35) / 100)
  );
  if (contrastAlpha > 0.02) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = contrastAlpha;
    ctx.drawImage(sourceElement, geo.fgX, geo.fgY, geo.fgW, geo.fgH);
  }

  // 3. Sub-pixel edge definition pass for high sharpness (>45%)
  if (settings.sharpness > 45) {
    const edgeAlpha = Math.min(0.16, ((settings.sharpness - 45) / 55) * 0.16);
    ctx.globalCompositeOperation = 'hard-light';
    ctx.globalAlpha = edgeAlpha;
    ctx.drawImage(sourceElement, geo.fgX - 0.5, geo.fgY - 0.5, geo.fgW + 1, geo.fgH + 1);
  }

  // 4. Brightness & Vibrance adjustment via GPU fill composite (zero pixel readback)
  if (settings.brightness > 2) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(0.18, (settings.brightness / 100) * 0.25);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(geo.fgX, geo.fgY, geo.fgW, geo.fgH);
  } else if (settings.brightness < -2) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = Math.min(0.22, (Math.abs(settings.brightness) / 100) * 0.3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(geo.fgX, geo.fgY, geo.fgW, geo.fgH);
  }

  if (settings.vibrance > 5) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = Math.min(0.14, (settings.vibrance / 100) * 0.2);
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(geo.fgX, geo.fgY, geo.fgW, geo.fgH);
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
}

let frameHeartbeatCount = 0;

/**
 * Pure 100% Full-Frame Enhanced Render used for Video Export & Frame Snapshot Export.
 */
export function renderPureEnhancedFrame(
  targetCanvas: HTMLCanvasElement,
  sourceElement: HTMLVideoElement | HTMLCanvasElement,
  srcW: number,
  srcH: number,
  _preset: PlatformPreset,
  settings: EnhancementSettings
) {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const dstW = targetCanvas.width;
  const dstH = targetCanvas.height;
  ctx.clearRect(0, 0, dstW, dstH);

  drawFramePass(ctx, dstW, dstH, sourceElement, srcW, srcH, settings, true);

  // Opaque 2x2 corner pixel micro-variation ensures Chromium CanvasCaptureMediaStream
  // detects an actual 8-bit RGBA change on every tick even when source video frames repeat.
  frameHeartbeatCount = (frameHeartbeatCount + 1) % 16;
  ctx.fillStyle = `rgb(${9 + frameHeartbeatCount}, 13, 22)`;
  ctx.fillRect(0, 0, 2, 2);
}

/**
 * Interactive Preview Renderer.
 */
export function renderSplitComparisonFrame(
  targetCanvas: HTMLCanvasElement,
  sourceElement: HTMLVideoElement | HTMLCanvasElement,
  srcW: number,
  srcH: number,
  _preset: PlatformPreset,
  settings: EnhancementSettings,
  splitPct: number
) {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const dstW = targetCanvas.width;
  const dstH = targetCanvas.height;
  ctx.clearRect(0, 0, dstW, dstH);

  const splitX = Math.round((Math.max(0, Math.min(100, splitPct)) / 100) * dstW);

  drawFramePass(ctx, dstW, dstH, sourceElement, srcW, srcH, settings, true);

  if (splitX > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, dstH);
    ctx.clip();
    drawFramePass(ctx, dstW, dstH, sourceElement, srcW, srcH, settings, false);
    ctx.restore();
  }
}
