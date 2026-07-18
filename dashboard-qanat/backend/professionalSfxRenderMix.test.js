import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateNormalizedProfessionalSfxVolume,
  calculateProfessionalSfxRenderVolume,
  parseVolumeDetectOutput,
} from "./professionalSfxRenderMix.js";

test("interpreta a medição de volume do ffmpeg", () => {
  assert.deepEqual(
    parseVolumeDetectOutput("mean_volume: -31.6 dB\nmax_volume: -3.6 dB"),
    { meanDb: -31.6, maxDb: -3.6 }
  );
});

test("normaliza detalhe audível sem estourar o pico", () => {
  const volume = calculateProfessionalSfxRenderVolume({
    category: "detail",
    requestedVolume: 0.11,
    meanDb: -31.6,
    maxDb: -3.6,
  });
  assert.ok(volume >= 0.4);
  assert.ok(volume <= 0.55);
});

test("impacto fica perceptível abaixo da narração", () => {
  const volume = calculateProfessionalSfxRenderVolume({
    category: "impact",
    requestedVolume: 0.15,
    meanDb: -21.1,
    maxDb: -1.7,
  });
  assert.ok(volume >= 0.5);
  assert.ok(volume <= 0.68);
});

test("arquivo já normalizado recebe ganho de reprodução audível", () => {
  assert.equal(
    calculateNormalizedProfessionalSfxVolume({
      category: "impact",
      requestedVolume: 0.15,
    }),
    0.72
  );
  assert.ok(
    calculateNormalizedProfessionalSfxVolume({
      category: "detail",
      requestedVolume: 0.11,
    }) >= 0.7
  );
});
