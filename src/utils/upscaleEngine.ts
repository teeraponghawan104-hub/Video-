export type PlatformId =
  | 'tiktok_1080p60'
  | 'tiktok_2k60'
  | 'reels_1080p60'
  | 'shorts_4k60'
  | 'youtube_4k60'
  | 'feed_portrait_4_5';

export type ReframeMode = 'center-crop' | 'fit-blur' | 'stretch';

export type ScaleMultiplier = 1 | 2 | 4;

export interface PlatformPreset {
  id: PlatformId;
  name: string;
  platformLabel: string;
  aspectRatio: '9:16' | '16:9' | '4:5';
  targetWidth: number;
  targetHeight: number;
  targetFps: 30 | 60;
  recommendedBitrateMbps: number;
  maxSafeBitrateMbps: number;
  codecLabel: string;
  colorSpace: string;
  antiCompressTip: string;
  safeZonePadding: {
    topPct: number;
    bottomPct: number;
    rightPct: number;
    leftPct: number;
  };
}

export interface EnhancementSettings {
  scaleMultiplier: ScaleMultiplier;
  sharpness: number; // 0 to 100 (Contrast-Adaptive Sharpening)
  deblockDenoise: number; // 0 to 100 (Compression artifact removal)
  microContrast: number; // 0 to 100 (Local detail pop)
  vibrance: number; // -50 to +50
  brightness: number; // -30 to +30
  fpsBoost60: boolean;
  antiCompressionBitrateLock: boolean;
  reframeMode: ReframeMode;
}

export interface EnhancementProfile {
  id: string;
  name: string;
  subtitle: string;
  settings: Partial<EnhancementSettings>;
}

export interface OutputMetrics {
  outputWidth: number;
  outputHeight: number;
  pixelRatioIncrease: number;
  targetBitrateMbps: number;
  estimatedFileSizeMb: number;
  effectiveFps: number;
  compressionBypassStatus: 'optimal' | 'warning_high_bitrate' | 'warning_low_res';
  statusMessage: string;
}

export interface ReframeGeometry {
  fgX: number;
  fgY: number;
  fgW: number;
  fgH: number;
  needsBackgroundFill: boolean;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: 'tiktok_1080p60',
    name: 'TikTok 1080p60 Anti-Compress',
    platformLabel: 'TikTok',
    aspectRatio: '9:16',
    targetWidth: 1080,
    targetHeight: 1920,
    targetFps: 60,
    recommendedBitrateMbps: 16.5,
    maxSafeBitrateMbps: 22.0,
    codecLabel: 'H.264 High Profile (4.2)',
    colorSpace: 'Rec.709 Full',
    antiCompressTip:
      'ล็อกความละเอียดที่ 1080×1920 บิตเรต 16.5 Mbps 60FPS เพื่อป้องกันอัลกอริทึม TikTok บังคับบีบอัดซ้ำเหลือ 720p',
    safeZonePadding: { topPct: 11, bottomPct: 22, rightPct: 16, leftPct: 5 },
  },
  {
    id: 'tiktok_2k60',
    name: 'TikTok 2K QHD Creator Master',
    platformLabel: 'TikTok Pro',
    aspectRatio: '9:16',
    targetWidth: 1440,
    targetHeight: 2560,
    targetFps: 60,
    recommendedBitrateMbps: 24.0,
    maxSafeBitrateMbps: 30.0,
    codecLabel: 'H.265 / HEVC Main10',
    colorSpace: 'Rec.709 / HDR10',
    antiCompressTip:
      'เหมาะสำหรับอัปโหลดผ่าน TikTok Desktop Web Studio รองรับความคมชัดระดับไมโครคอนทราสต์สูงสุด',
    safeZonePadding: { topPct: 11, bottomPct: 22, rightPct: 16, leftPct: 5 },
  },
  {
    id: 'reels_1080p60',
    name: 'Instagram Reels 1080p60 Crisp',
    platformLabel: 'IG Reels',
    aspectRatio: '9:16',
    targetWidth: 1080,
    targetHeight: 1920,
    targetFps: 60,
    recommendedBitrateMbps: 15.0,
    maxSafeBitrateMbps: 20.0,
    codecLabel: 'H.264 High Profile',
    colorSpace: 'Rec.709',
    antiCompressTip:
      'เปิดโหมด Upload at Highest Quality ใน IG คู่กับบิตเรต 15 Mbps เพื่อรักษาความคมของใบหน้าและตัวอักษร',
    safeZonePadding: { topPct: 12, bottomPct: 24, rightPct: 14, leftPct: 5 },
  },
  {
    id: 'shorts_4k60',
    name: 'YouTube Shorts 4K60 Ultra',
    platformLabel: 'YT Shorts',
    aspectRatio: '9:16',
    targetWidth: 2160,
    targetHeight: 3840,
    targetFps: 60,
    recommendedBitrateMbps: 38.0,
    maxSafeBitrateMbps: 50.0,
    codecLabel: 'VP9 / H.264 High',
    colorSpace: 'Rec.709',
    antiCompressTip:
      'YouTube Shorts รองรับการเข้ารหัส VP9 ที่ความละเอียด 2160×3840 ให้ภาพใสคมชัดไร้รอยแตกของบล็อกพิกเซล',
    safeZonePadding: { topPct: 10, bottomPct: 20, rightPct: 15, leftPct: 5 },
  },
  {
    id: 'feed_portrait_4_5',
    name: 'Facebook & IG Feed 4:5 Portrait',
    platformLabel: 'FB / IG Feed',
    aspectRatio: '4:5',
    targetWidth: 1080,
    targetHeight: 1350,
    targetFps: 60,
    recommendedBitrateMbps: 14.0,
    maxSafeBitrateMbps: 18.0,
    codecLabel: 'H.264 High Profile',
    colorSpace: 'Rec.709',
    antiCompressTip:
      'สัดส่วน 4:5 กินพื้นที่หน้าจอมือถือในฟีด Facebook และ IG มากที่สุด พร้อมรักษาความคมชัดของขอบภาพ',
    safeZonePadding: { topPct: 8, bottomPct: 12, rightPct: 8, leftPct: 5 },
  },
  {
    id: 'youtube_4k60',
    name: 'YouTube 4K60 Widescreen Master',
    platformLabel: 'YouTube 16:9',
    aspectRatio: '16:9',
    targetWidth: 3840,
    targetHeight: 2160,
    targetFps: 60,
    recommendedBitrateMbps: 45.0,
    maxSafeBitrateMbps: 65.0,
    codecLabel: 'H.264 / VP9 4K',
    colorSpace: 'Rec.709',
    antiCompressTip:
      'การอัพสเกลคลิป 1080p เป็น 4K (3840×2160) บังคับให้ YouTube ใช้ตัวเข้ารหัส av01/vp9 แทน avc1 ภาพจึงคมชัดขึ้นแม้ดูบนจอ 1080p',
    safeZonePadding: { topPct: 6, bottomPct: 10, rightPct: 6, leftPct: 6 },
  },
];

export const ENHANCEMENT_PROFILES: EnhancementProfile[] = [
  {
    id: 'tiktok_ultra_crisp',
    name: 'TikTok Ultra Crisp (CAS + Anti-Block)',
    subtitle: 'เร่งความคมขอบภาพและลบเม็ดพิกเซลแตกจากการบีบอัด',
    settings: {
      scaleMultiplier: 2,
      sharpness: 68,
      deblockDenoise: 42,
      microContrast: 35,
      vibrance: 14,
      brightness: 4,
      fpsBoost60: true,
      antiCompressionBitrateLock: true,
    },
  },
  {
    id: 'portrait_beauty_hd',
    name: 'Creator Face & Skin Clarity',
    subtitle: 'คมชัดเฉพาะดวงตา เส้นผม และตัวอักษร โดยผิวยังเนียนเป็นธรรมชาติ',
    settings: {
      scaleMultiplier: 2,
      sharpness: 48,
      deblockDenoise: 60,
      microContrast: 22,
      vibrance: 10,
      brightness: 6,
      fpsBoost60: true,
      antiCompressionBitrateLock: true,
    },
  },
  {
    id: 'night_lowlight_rescue',
    name: 'Night & Low-Light Denoise Rescue',
    subtitle: 'กู้คืนคลิปถ่ายกลางคืน ลดนอยส์เม็ดสีและดึงรายละเอียดในเงามืด',
    settings: {
      scaleMultiplier: 2,
      sharpness: 54,
      deblockDenoise: 78,
      microContrast: 40,
      vibrance: 12,
      brightness: 14,
      fpsBoost60: true,
      antiCompressionBitrateLock: true,
    },
  },
  {
    id: 'anime_game_4x',
    name: 'Anime & Gameplay 4x Razor Edge',
    subtitle: 'อัพสเกลเส้นการ์ตูน เกมเพลย์ และ UI ให้คมกริบระดับ 4K 60FPS',
    settings: {
      scaleMultiplier: 4,
      sharpness: 82,
      deblockDenoise: 50,
      microContrast: 45,
      vibrance: 20,
      brightness: 2,
      fpsBoost60: true,
      antiCompressionBitrateLock: true,
    },
  },
];

export const DEFAULT_ENHANCEMENT_SETTINGS: EnhancementSettings = {
  scaleMultiplier: 2,
  sharpness: 68,
  deblockDenoise: 42,
  microContrast: 35,
  vibrance: 14,
  brightness: 4,
  fpsBoost60: true,
  antiCompressionBitrateLock: true,
  reframeMode: 'center-crop',
};

export function calculateOutputMetrics(
  sourceWidth: number,
  sourceHeight: number,
  durationSec: number,
  preset: PlatformPreset,
  settings: EnhancementSettings
): OutputMetrics {
  const safeSrcW = Math.max(1, sourceWidth);
  const safeSrcH = Math.max(1, sourceHeight);
  const safeDuration = Math.max(1, durationSec);

  // Target dimensions follow the selected platform preset or scale multiplier
  const scaleFactor = settings.scaleMultiplier === 4 ? 1.0 : settings.scaleMultiplier === 2 ? 1.0 : 0.75;
  const outputWidth =
    settings.scaleMultiplier === 1
      ? Math.round(preset.targetWidth * scaleFactor)
      : preset.targetWidth;
  const outputHeight =
    settings.scaleMultiplier === 1
      ? Math.round(preset.targetHeight * scaleFactor)
      : preset.targetHeight;

  const srcPixels = safeSrcW * safeSrcH;
  const dstPixels = outputWidth * outputHeight;
  const pixelRatioIncrease = Number((dstPixels / srcPixels).toFixed(2));

  const effectiveFps = settings.fpsBoost60 ? preset.targetFps : 30;

  let targetBitrateMbps = preset.recommendedBitrateMbps;
  if (!settings.antiCompressionBitrateLock) {
    // Uncapped high bitrate may trigger platform harsh re-encoding on TikTok/Reels
    targetBitrateMbps = Number((preset.maxSafeBitrateMbps * 1.25).toFixed(1));
  } else if ( !settings.fpsBoost60 ) {
    targetBitrateMbps = Number((preset.recommendedBitrateMbps * 0.78).toFixed(1));
  }

  // File size in MB = (bitrate in Mbps * duration in sec) / 8
  const estimatedFileSizeMb = Number(((targetBitrateMbps * safeDuration) / 8).toFixed(1));

  let compressionBypassStatus: OutputMetrics['compressionBypassStatus'] = 'optimal';
  let statusMessage = 'พร้อมโพสต์ — บิตเรตและความละเอียดอยู่ในเกณฑ์ไม่ถูกบีบอัดซ้ำ';

  if (targetBitrateMbps > preset.maxSafeBitrateMbps) {
    compressionBypassStatus = 'warning_high_bitrate';
    statusMessage = `บิตเรตสูงเกินขีดจำกัดของ ${preset.platformLabel} (${preset.maxSafeBitrateMbps} Mbps) แนะนำให้เปิด Anti-Compression Lock`;
  } else if (outputWidth < 1080 && outputHeight < 1080) {
    compressionBypassStatus = 'warning_low_res';
    statusMessage = 'ความละเอียดต่ำกว่า 1080p แนะนำให้เลือกตัวคูณ 2x หรือ 4x เพื่อความคมชัดระดับ HD';
  }

  return {
    outputWidth,
    outputHeight,
    pixelRatioIncrease,
    targetBitrateMbps,
    estimatedFileSizeMb,
    effectiveFps,
    compressionBypassStatus,
    statusMessage,
  };
}

export function computeReframeGeometry(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  mode: ReframeMode
): ReframeGeometry {
  const safeSrcW = Math.max(1, srcW);
  const safeSrcH = Math.max(1, srcH);
  const safeDstW = Math.max(1, dstW);
  const safeDstH = Math.max(1, dstH);

  if (mode === 'stretch') {
    return {
      fgX: 0,
      fgY: 0,
      fgW: safeDstW,
      fgH: safeDstH,
      needsBackgroundFill: false,
    };
  }

  const srcAspect = safeSrcW / safeSrcH;
  const dstAspect = safeDstW / safeDstH;

  if (mode === 'center-crop') {
    // Cover destination canvas completely
    let fgW = safeDstW;
    let fgH = safeDstH;
    if (srcAspect > dstAspect) {
      fgH = safeDstH;
      fgW = Math.round(safeDstH * srcAspect);
    } else {
      fgW = safeDstW;
      fgH = Math.round(safeDstW / srcAspect);
    }
    const fgX = Math.round((safeDstW - fgW) / 2);
    const fgY = Math.round((safeDstH - fgH) / 2);
    return {
      fgX,
      fgY,
      fgW,
      fgH,
      needsBackgroundFill: false,
    };
  }

  // 'fit-blur' -> Contain source inside destination and fill remaining bars with blurred ambient video
  let fgW = safeDstW;
  let fgH = safeDstH;
  if (srcAspect > dstAspect) {
    fgW = safeDstW;
    fgH = Math.round(safeDstW / srcAspect);
  } else {
    fgH = safeDstH;
    fgW = Math.round(safeDstH * srcAspect);
  }
  const fgX = Math.round((safeDstW - fgW) / 2);
  const fgY = Math.round((safeDstH - fgH) / 2);
  const needsBackgroundFill = Math.abs(srcAspect - dstAspect) > 0.02;

  return {
    fgX,
    fgY,
    fgW,
    fgH,
    needsBackgroundFill,
  };
}

/**
 * Pure 3x3 Contrast-Adaptive Sharpening (CAS) kernel generator.
 * Returns a 9-element array representing the 3x3 convolution matrix.
 */
export function createCasKernel(sharpness: number, deblockDenoise: number): number[] {
  const clampedSharp = Math.max(0, Math.min(100, sharpness));
  const clampedDenoise = Math.max(0, Math.min(100, deblockDenoise));

  // Net sharpening strength balances CAS edge enhancement against deblock smoothing
  const strength = (clampedSharp / 100) * 1.35 - (clampedDenoise / 100) * 0.25;

  if (strength <= 0) {
    // Mild gaussian smoothing when denoise dominates
    const blurAmt = Math.min(0.12, Math.abs(strength) * 0.5);
    const center = 1 - blurAmt * 4;
    return [0, blurAmt, 0, blurAmt, center, blurAmt, 0, blurAmt, 0];
  }

  const edgeWeight = -strength * 0.25;
  const centerWeight = 1 + strength;
  return [
    0,
    edgeWeight,
    0,
    edgeWeight,
    centerWeight,
    edgeWeight,
    0,
    edgeWeight,
    0,
  ];
}

/**
 * Validates custom preset name when user saves a custom preset.
 */
export function validateCustomPresetName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'กรุณาระบุชื่อพรีเซ็ตก่อนบันทึก' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'ชื่อพรีเซ็ตต้องมีอย่างน้อย 2 ตัวอักษร' };
  }
  if (trimmed.length > 40) {
    return { valid: false, error: 'ชื่อพรีเซ็ตต้องไม่เกิน 40 ตัวอักษร' };
  }
  return { valid: true };
}

/**
 * Builds a complete, hardware/CPU-safe FFmpeg video filtergraph (-vf) string
 * combining Lanczos scaling, aspect-ratio reframing, 3D temporal denoise (hqdn3d),
 * Contrast-Adaptive Sharpening (cas + unsharp), color grading (eq), and yuv420p output.
 */
export function buildFfmpegFilterChain(params: {
  targetWidth: number;
  targetHeight: number;
  effectiveFps: number;
  sharpness: number;
  deblockDenoise: number;
  microContrast: number;
  vibrance: number;
  brightness: number;
  reframeMode: ReframeMode;
}): string {
  const maxDim = Math.max(params.targetWidth, params.targetHeight);
  const capScale = maxDim > 3840 ? 3840 / maxDim : 1;
  const w = Math.max(2, Math.round((params.targetWidth * capScale) / 2) * 2);
  const h = Math.max(2, Math.round((params.targetHeight * capScale) / 2) * 2);

  const stages: string[] = [];

  if (params.reframeMode === 'stretch') {
    stages.push(`scale=${w}:${h}:flags=lanczos,setsar=1`);
  } else if (params.reframeMode === 'fit-blur') {
    stages.push(
      `split[bg][fg];[bg]scale=${w}:${h}:force_original_aspect_ratio=increase:force_divisible_by=2:flags=fast_bilinear,crop=${w}:${h},boxblur=16:2[bgblur];[fg]scale=${w}:${h}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos[fgscaled];[bgblur][fgscaled]overlay=(W-w)/2:(H-h)/2,setsar=1`
    );
  } else {
    stages.push(
      `scale=${w}:${h}:force_original_aspect_ratio=increase:force_divisible_by=2:flags=lanczos,crop=${w}:${h},setsar=1`
    );
  }

  const dn = Math.min(100, Math.max(0, params.deblockDenoise)) / 100;
  if (dn > 0.05) {
    stages.push(
      `hqdn3d=${(dn * 3.2).toFixed(2)}:${(dn * 2.4).toFixed(2)}:${(dn * 4.0).toFixed(2)}:${(dn * 3.0).toFixed(2)}`
    );
  }

  const sharpNorm = Math.min(100, Math.max(0, params.sharpness)) / 100;
  if (sharpNorm > 0.02) {
    const casStrength = Number(Math.min(0.95, Math.max(0.05, sharpNorm)).toFixed(2));
    stages.push(`cas=${casStrength}`);
  }

  const contrast = Number((1 + (Math.min(100, Math.max(0, params.microContrast)) / 100) * 0.16).toFixed(2));
  const saturation = Number(Math.max(0.5, 1 + (Math.min(50, Math.max(-50, params.vibrance)) / 100) * 0.45).toFixed(2));
  const bright = Number(((Math.min(30, Math.max(-30, params.brightness)) / 100) * 0.12).toFixed(3));
  const gamma = Number((1 + Math.max(0, params.brightness / 100) * 0.15).toFixed(2));
  stages.push(`eq=contrast=${contrast}:saturation=${saturation}:brightness=${bright}:gamma=${gamma}`);

  const fps =
    params.effectiveFps === 120 ? 120 : params.effectiveFps === 60 ? 60 : 30;
  stages.push(`fps=${fps}`);
  stages.push('format=yuv420p');

  return stages.join(',');
}

