import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLATFORM_PRESETS,
  DEFAULT_ENHANCEMENT_SETTINGS,
  calculateOutputMetrics,
  computeReframeGeometry,
  createCasKernel,
  validateCustomPresetName,
} from './upscaleEngine';

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
