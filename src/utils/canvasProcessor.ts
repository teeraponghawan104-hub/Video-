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
    title: 'Bangkok Night Street Vlog (ต้นฉบับ 540×960 มืดและติดบีบอัด)',
    category: 'Lifestyle / Vlog 9:16',
    sourceWidth: 540,
    sourceHeight: 960,
    sourceFps: 30,
    durationSec: 12,
    originalBitrateMbps: 3.2,
  },
  {
    id: 'skincare_studio',
    title: 'Glow Serum Product Close-up (ต้นฉบับ 720×1280 ขอบตัวอักษรเบลอ)',
    category: 'TikTok Shop / Review 9:16',
    sourceWidth: 720,
    sourceHeight: 1280,
    sourceFps: 30,
    durationSec: 10,
    originalBitrateMbps: 4.8,
  },
  {
    id: 'landscape_dance',
    title: 'Studio Motion Showcase 16:9 (แปลงแนวนอนเป็น 9:16 เต็มจอ)',
    category: 'Horizontal 16:9 -> Vertical',
    sourceWidth: 1280,
    sourceHeight: 720,
    sourceFps: 30,
    durationSec: 15,
    originalBitrateMbps: 5.5,
  },
];

/**
 * Renders a procedural creator scene onto an offscreen canvas so the user can
 * immediately inspect pixel-level before/after upscaling, sharpening, and reframing
 * even before uploading a local video file.
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
    // Deep night urban gradient
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0c1324');
    bg.addColorStop(0.55, '#192236');
    bg.addColorStop(1, '#0f141c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Bokeh street lights moving gently
    const bokehColors = ['#f97316', '#38bdf8', '#fb7185', '#facc15', '#a855f7'];
    for (let i = 0; i < 14; i++) {
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

    // Architectural storefront grid & crisp signage details (tests CAS sharpening!)
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

    // Fine micro-texture lines inside signage
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.18)';
    ctx.lineWidth = 1;
    for (let y = cardY + 12; y < cardY + cardH - 10; y += 8) {
      ctx.beginPath();
      ctx.moveTo(cardX + 12, y);
      ctx.lineTo(cardX + cardW - 12, y);
      ctx.stroke();
    }

    // Creator subject silhouette + rim light
    const cx = width * 0.5 + Math.sin(timeSec * 1.8) * (width * 0.025);
    const cy = height * 0.65;
    const headR = width * 0.13;

    // Shoulders
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = Math.max(2, width * 0.006);
    ctx.beginPath();
    ctx.ellipse(cx, cy + headR * 1.85, headR * 1.85, headR * 1.2, 0, Math.PI, 0, false);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fine text caption & detail chart for sharpness comparison
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${Math.round(width * 0.062)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('YAOWARAT NIGHT VLOG', width * 0.5, cardY + cardH * 0.42);

    ctx.fillStyle = '#fb923c';
    ctx.font = `600 ${Math.round(width * 0.036)}px "JetBrains Mono", monospace`;
    ctx.fillText('ISO 3200 · F/1.8 · 4K CAS TEST', width * 0.5, cardY + cardH * 0.72);
  } else if (clipId === 'skincare_studio') {
    // Clean studio product showcase
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#1e293b');
    bg.addColorStop(0.5, '#0f172a');
    bg.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Pedestal
    const pedW = width * 0.58;
    const pedH = height * 0.12;
    const pedX = (width - pedW) / 2;
    const pedY = height * 0.68;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(pedX, pedY, pedW, pedH, 12);
    ctx.fill();

    // Serum Bottle with fine typography (great for testing upscale text clarity)
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

    // Dropper cap
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(botX + botW * 0.3, botY - botH * 0.14, botW * 0.4, botH * 0.14);

    // Label on bottle
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
    // 16:9 Landscape clip for reframing demonstration
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(0.5, '#1e293b');
    bg.addColorStop(1, '#0f172a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Horizon grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 8; i++) {
      const y = height * 0.5 + i * (height * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Animated frequency rings
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

  // Simulate compression softness on the "Before" source pass so the user sees genuine pixel restoration
  if (simulateLowResCompression) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

/**
 * Renders the split-screen comparison view:
 * Left of `splitPct`: Original un-enhanced low-res source frame
 * Right of `splitPct`: Upscaled + CAS Sharpened + Color-Graded + Anti-Compress frame
 */
export function renderSplitComparisonFrame(
  targetCanvas: HTMLCanvasElement,
  sourceElement: HTMLVideoElement | HTMLCanvasElement,
  srcW: number,
  srcH: number,
  preset: PlatformPreset,
  settings: EnhancementSettings,
  splitPct: number
) {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const dstW = targetCanvas.width;
  const dstH = targetCanvas.height;
  const geo = computeReframeGeometry(srcW, srcH, dstW, dstH, settings.reframeMode);

  ctx.clearRect(0, 0, dstW, dstH);

  // Helper to draw source with current reframe geometry
  const drawSceneGeometry = (isEnhanced: boolean) => {
    ctx.save();

    if (isEnhanced) {
      // Combine contrast, brightness, and saturation/vibrance adjustments
      const contrastPct = 100 + settings.microContrast * 0.42 + settings.sharpness * 0.18;
      const saturatePct = 100 + settings.vibrance * 0.85;
      const brightPct = 100 + settings.brightness * 0.5;
      ctx.filter = `contrast(${contrastPct.toFixed(0)}%) saturate(${saturatePct.toFixed(0)}%) brightness(${brightPct.toFixed(0)}%)`;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    } else {
      // Original compressed source appearance (fast nearest-neighbor without expensive blur filter)
      ctx.filter = 'contrast(92%) saturate(88%)';
      ctx.imageSmoothingEnabled = false;
    }

    if (geo.needsBackgroundFill) {
      ctx.save();
      ctx.filter = 'brightness(45%) saturate(110%)';
      ctx.drawImage(sourceElement, -12, -12, dstW + 24, dstH + 24);
      ctx.restore();
    }

    ctx.drawImage(sourceElement, geo.fgX, geo.fgY, geo.fgW, geo.fgH);

    // Apply subtle crisp edge pass on enhanced side to simulate CAS high-frequency recovery
    if (isEnhanced && settings.sharpness > 15) {
      const crispAlpha = Math.min(0.28, (settings.sharpness / 100) * 0.26);
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = crispAlpha;
      ctx.drawImage(sourceElement, geo.fgX, geo.fgY, geo.fgW, geo.fgH);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  };

  const splitX = Math.round((Math.max(0, Math.min(100, splitPct)) / 100) * dstW);

  // 1. Draw Enhanced (Right side / Full base)
  drawSceneGeometry(true);

  // 2. Clip and Draw Original (Left side of splitX)
  if (splitX > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, dstH);
    ctx.clip();
    drawSceneGeometry(false);
    ctx.restore();
  }

  // 3. Draw Divider Line
  if (splitPct > 1 && splitPct < 99) {
    ctx.save();
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, dstH);
    ctx.stroke();

    // Handle circle in the middle
    const cy = dstH * 0.5;
    ctx.fillStyle = '#090D16';
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(splitX, cy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left/Right arrows inside handle
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(splitX - 7, cy);
    ctx.lineTo(splitX - 2, cy - 4);
    ctx.lineTo(splitX - 2, cy + 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(splitX + 7, cy);
    ctx.lineTo(splitX + 2, cy - 4);
    ctx.lineTo(splitX + 2, cy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
