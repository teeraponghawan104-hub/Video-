import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLATFORM_PRESETS,
  DEFAULT_ENHANCEMENT_SETTINGS,
  calculateOutputMetrics,
  computeReframeGeometry,
  createCasKernel,
  validateCustomPresetName,
  buildFfmpegFilterChain,
} from './upscaleEngine';
import {
  formatBareetOutputFilename,
  classifyResolutionTier,
  evaluateTikTokQualityAdvice,
  parseMp4TopBoxes,
  stampBareetPureFallback,
  computeTargetUpscaleDimensions,
  sanitizeMp4ForUniversalPlayback,
  applyCleanBareetMoovTags,
} from './bareetEngine';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

test('calculateOutputMetrics computes TikTok 1080p60 upscale ratio and safe bitrate', () => {
  const tiktokPreset = PLATFORM_PRESETS.find((p) => p.id === 'tiktok_1080p60')!;
  const metrics = calculateOutputMetrics(
    540,
    960,
    16,
    tiktokPreset,
    DEFAULT_ENHANCEMENT_SETTINGS
  );

  assert.equal(metrics.outputWidth, 1080);
  assert.equal(metrics.outputHeight, 1920);
  assert.equal(metrics.pixelRatioIncrease, 4);
  assert.equal(metrics.effectiveFps, 60);
  assert.equal(metrics.targetBitrateMbps, 16.5);
  assert.equal(metrics.estimatedFileSizeMb, 33);
  assert.equal(metrics.compressionBypassStatus, 'optimal');
});

test('calculateOutputMetrics warns when antiCompressionBitrateLock is disabled and bitrate exceeds platform limit', () => {
  const tiktokPreset = PLATFORM_PRESETS.find((p) => p.id === 'tiktok_1080p60')!;
  const metrics = calculateOutputMetrics(540, 960, 15, tiktokPreset, {
    ...DEFAULT_ENHANCEMENT_SETTINGS,
    antiCompressionBitrateLock: false,
  });

  assert.equal(metrics.compressionBypassStatus, 'warning_high_bitrate');
  assert.ok(metrics.targetBitrateMbps > tiktokPreset.maxSafeBitrateMbps);
});

test('computeReframeGeometry calculates fit-blur and center-crop coordinates accurately for 16:9 to 9:16', () => {
  const fitGeo = computeReframeGeometry(1920, 1080, 1080, 1920, 'fit-blur');
  assert.equal(fitGeo.fgW, 1080);
  assert.equal(fitGeo.fgH, 608);
  assert.equal(fitGeo.fgX, 0);
  assert.equal(fitGeo.fgY, 656);
  assert.equal(fitGeo.needsBackgroundFill, true);

  const cropGeo = computeReframeGeometry(1920, 1080, 1080, 1920, 'center-crop');
  assert.equal(cropGeo.fgH, 1920);
  assert.equal(cropGeo.fgW, 3413);
  assert.equal(cropGeo.needsBackgroundFill, false);
});

test('createCasKernel preserves energy sum of 1.0 across all sharpness settings', () => {
  const kernelSharp = createCasKernel(80, 20);
  const sumSharp = kernelSharp.reduce((acc, v) => acc + v, 0);
  assert.ok(Math.abs(sumSharp - 1.0) < 1e-6);

  const kernelSmooth = createCasKernel(0, 90);
  const sumSmooth = kernelSmooth.reduce((acc, v) => acc + v, 0);
  assert.ok(Math.abs(sumSmooth - 1.0) < 1e-6);
});

test('validateCustomPresetName rejects empty or overly short names', () => {
  assert.equal(validateCustomPresetName('   ').valid, false);
  assert.equal(validateCustomPresetName('A').valid, false);
  assert.equal(validateCustomPresetName('TikTok Night Vlog 60fps').valid, true);
});

test('buildFfmpegFilterChain generates valid lanczos, cas, hqdn3d, and yuv420p filter chain', () => {
  const vf = buildFfmpegFilterChain({
    targetWidth: 1080,
    targetHeight: 1920,
    effectiveFps: 60,
    sharpness: 68,
    deblockDenoise: 42,
    microContrast: 35,
    vibrance: 14,
    brightness: 4,
    reframeMode: 'center-crop',
  });
  assert.ok(
    vf.includes(
      'scale=1080:1920:force_original_aspect_ratio=increase:force_divisible_by=2:flags=lanczos'
    )
  );
  assert.ok(vf.includes('cas=0.68'));
  assert.ok(vf.includes('hqdn3d='));
  assert.ok(vf.includes('fps=60'));
  assert.ok(vf.includes('format=yuv420p'));
});

test('formatBareetOutputFilename produces clean _bareet.mp4 output names without duplicate suffixes', () => {
  assert.equal(
    formatBareetOutputFilename('IMG_0720_TikTok_1080p60.MOV'),
    'IMG_0720_TikTok_1080p60_bareet.mp4'
  );
  assert.equal(
    formatBareetOutputFilename('clip_bareet.mp4'),
    'clip_bareet.mp4'
  );
});

test('classifyResolutionTier and evaluateTikTokQualityAdvice classify 1080p60 and 4K60 accurately', () => {
  assert.equal(classifyResolutionTier(1080, 1920), '1080p');
  assert.equal(classifyResolutionTier(2160, 3840), '4K');
  assert.equal(classifyResolutionTier(540, 960), '720p');

  const optimalAdvice = evaluateTikTokQualityAdvice({
    width: 1080,
    height: 1920,
    fps: 60,
    bitrateMbps: 22.5,
  });
  assert.equal(optimalAdvice.bitrateWarning.status, 'optimal');
  assert.equal(optimalAdvice.fpsWarning, null);
  assert.equal(optimalAdvice.hasAnyWarning, false);

  const lowResAdvice = evaluateTikTokQualityAdvice({
    width: 540,
    height: 960,
    fps: 30,
    bitrateMbps: 3.0,
  });
  assert.equal(lowResAdvice.bitrateWarning.status, 'low');
  assert.equal(lowResAdvice.hasAnyWarning, true);
});

test('parseMp4TopBoxes and stampBareetPureFallback parse and append free box with Processed by KrispBareet****bareet', () => {
  const ftyp = new Uint8Array([
    0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 2, 0,
  ]);
  const stamped = stampBareetPureFallback(ftyp);
  const boxes = parseMp4TopBoxes(stamped);
  assert.equal(boxes.length, 2);
  assert.equal(boxes[0].type, 'ftyp');
  assert.equal(boxes[1].type, 'free');
  const text = new TextDecoder().decode(stamped);
  assert.ok(text.includes('Processed by KrispBareet****bareet'));
});

test('computeTargetUpscaleDimensions computes portrait 9:16 and landscape 16:9 2K/4K dimensions accurately', () => {
  const portrait2k = computeTargetUpscaleDimensions(1080, 1920, '2k', 'keep');
  assert.equal(portrait2k.width, 1440);
  assert.equal(portrait2k.height, 2560);
  assert.equal(portrait2k.defaultBitrateMbps, 22);

  const portrait4k = computeTargetUpscaleDimensions(720, 1280, '4k', 'keep');
  assert.equal(portrait4k.width, 2160);
  assert.equal(portrait4k.height, 3840);
  assert.equal(portrait4k.defaultBitrateMbps, 28);

  const landscape4k = computeTargetUpscaleDimensions(1920, 1080, '4k', 'keep');
  assert.equal(landscape4k.width, 3840);
  assert.equal(landscape4k.height, 2160);

  const forcedPortrait = computeTargetUpscaleDimensions(1920, 1080, '2k', '9:16');
  assert.equal(forcedPortrait.width, 1440);
  assert.equal(forcedPortrait.height, 2560);
});

test('sanitizeMp4ForUniversalPlayback repairs 0xFFFFFFFFFFFFFFFF mvhd duration after engine.mjs bareetv10 patch', async () => {
  const sampleBytes = new Uint8Array(
    fs.readFileSync(path.join(process.cwd(), 'public/assets/sample_story_1080p.mp4'))
  );
  const eng = (await import('../../public/engine.mjs')) as unknown as {
    patchFile: (b: Uint8Array, opts: { mode: string }) => { output: Uint8Array };
  };
  const patched = eng.patchFile(sampleBytes, { mode: 'bareetv10' }).output;
  const repaired = sanitizeMp4ForUniversalPlayback(patched);

  const tmpOut = path.join(os.tmpdir(), `test_sanitized_${Date.now()}.mp4`);
  try {
    fs.writeFileSync(tmpOut, repaired);
    const probeJson = JSON.parse(
      execFileSync(
        'ffprobe',
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration,bit_rate:stream=codec_type,duration',
          '-of',
          'json',
          tmpOut,
        ],
        { encoding: 'utf8' }
      )
    );
    const dur = Number(probeJson.format?.duration || 0);
    assert.ok(dur > 3.0 && dur < 4.5, `Expected positive ~3.48s duration, got ${dur}`);
    assert.ok(Number(probeJson.format?.bit_rate || 0) > 0, 'Expected valid format bit_rate');

    // Confirm full decode without warnings/errors
    const decodeStderr = execFileSync(
      'ffmpeg',
      ['-v', 'warning', '-i', tmpOut, '-f', 'null', '-'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    assert.equal(decodeStderr.trim(), '');
  } finally {
    fs.rmSync(tmpOut, { force: true });
  }
});

test('applyCleanBareetMoovTags embeds Bareet tags, shifts stco accurately, and preserves positive duration and clean decode', () => {
  const sampleBytes = new Uint8Array(
    fs.readFileSync(path.join(process.cwd(), 'public/assets/sample_story_1080p.mp4'))
  );
  const tagged = applyCleanBareetMoovTags(sampleBytes);

  const tmpOut = path.join(os.tmpdir(), `test_tagged_${Date.now()}.mp4`);
  try {
    fs.writeFileSync(tmpOut, tagged);
    const probeJson = JSON.parse(
      execFileSync(
        'ffprobe',
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration,bit_rate:format_tags=encoder,comment:stream=codec_type,duration',
          '-of',
          'json',
          tmpOut,
        ],
        { encoding: 'utf8' }
      )
    );
    const dur = Number(probeJson.format?.duration || 0);
    assert.ok(dur > 3.0 && dur < 4.5, `Expected positive ~3.48s duration, got ${dur}`);
    assert.equal(probeJson.format?.tags?.encoder, 'KrispBareet****bareet');
    assert.equal(
      probeJson.format?.tags?.comment,
      'Processed by KrispBareet****bareet'
    );

    const decodeStderr = execFileSync(
      'ffmpeg',
      ['-v', 'warning', '-i', tmpOut, '-f', 'null', '-'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    assert.equal(decodeStderr.trim(), '');
  } finally {
    fs.rmSync(tmpOut, { force: true });
  }
});

test('applyCleanBareetMoovTags appends clean free signature box when MP4 contains fragmented moof boxes', () => {
  const ftyp = new Uint8Array([
    0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 2, 0,
  ]);
  const moov = new Uint8Array([
    0, 0, 0, 8, 0x6d, 0x6f, 0x6f, 0x76,
  ]);
  const moof = new Uint8Array([
    0, 0, 0, 8, 0x6d, 0x6f, 0x6f, 0x66,
  ]);
  const combined = new Uint8Array(ftyp.length + moov.length + moof.length);
  combined.set(ftyp, 0);
  combined.set(moov, ftyp.length);
  combined.set(moof, ftyp.length + moov.length);

  const out = applyCleanBareetMoovTags(combined);
  const boxes = parseMp4TopBoxes(out);
  assert.deepEqual(
    boxes.map((b) => b.type),
    ['ftyp', 'moov', 'moof', 'free']
  );
});





