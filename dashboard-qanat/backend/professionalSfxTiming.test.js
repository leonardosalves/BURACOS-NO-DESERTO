import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProfessionalSfxScenes,
  buildSfxPlaybackSegments,
  normalizeProfessionalSfxEvents,
} from "./professionalSfxTiming.js";

const scenes = [
  { scene_ref: "1.1", start: 10, end: 16, duration: 6 },
  { scene_ref: "1.2", start: 16, end: 22, duration: 6 },
];

test("cenas SFX priorizam timing visual e usam fala apenas como fallback", () => {
  const [visual, fallback] = buildProfessionalSfxScenes([
    { scene_ref: "1.1", start: 5, end: 9, speech_start: 3, speech_end: 8 },
    { scene_ref: "1.2", speech_start: 9, speech_end: 12 },
  ]);
  assert.deepEqual([visual.start, visual.end], [5, 9]);
  assert.deepEqual([fallback.start, fallback.end], [9, 12]);
});

test("wizard resolve cenas pelos slots da timeline quando prompts não têm start/end", () => {
  const resolved = buildProfessionalSfxScenes(
    [
      { scene: "1.1", block: 1, narration_text: "Abertura" },
      { scene: "1.2", block: 1, narration_text: "Virada" },
    ],
    {
      timelineAssets: {
        1: [
          { audio_start: 0, fixed: 2.78825 },
          { audio_start: 2.788, fixed: 8.36475 },
        ],
      },
      narrationChunkPlan: {
        chunks: [
          { scene_ref: "1.1", start_s: 0, end_s: 3.631 },
          { scene_ref: "1.2", start_s: 3.981, end_s: 10.303 },
        ],
      },
    }
  );

  assert.deepEqual(
    resolved.map(({ start, end }) => [start, end]),
    [
      [0, 2.788],
      [2.788, 11.153],
    ]
  );
});

test("SFX do wizard não colapsa em 0.25s nem posiciona riser no zero", () => {
  const wizardScenes = buildProfessionalSfxScenes(
    [
      { scene: "1.1", block: 1 },
      { scene: "1.2", block: 1 },
    ],
    {
      timelineAssets: {
        1: [
          { audio_start: 0, fixed: 2.78825 },
          { audio_start: 2.788, fixed: 8.36475 },
        ],
      },
    }
  );
  const events = normalizeProfessionalSfxEvents({
    rawEvents: [
      {
        scene_ref: "1.1",
        category: "ambience",
        duration: 0.25,
        confidence: 0.9,
      },
      {
        scene_ref: "1.2",
        category: "riser",
        duration: 0.25,
        confidence: 0.9,
      },
    ],
    scenes: wizardScenes,
    totalDuration: 46.052,
    isShort: true,
  });

  assert.equal(events[0].duration, 2);
  assert.equal(events[0].time, 0);
  assert.equal(events[1].duration, 0.8);
  assert.equal(events[1].time, 10.353);
});

test("detalhe não antecipa ação sem âncora de primeiro quadro", () => {
  const [event] = normalizeProfessionalSfxEvents({
    rawEvents: [
      {
        scene_ref: "1.1",
        offset: 0,
        category: "detail",
        duration: 1,
        confidence: 0.9,
      },
    ],
    scenes,
    totalDuration: 30,
  });
  assert.equal(event.time, 10.12);
});

test("riser termina exatamente na virada da cena", () => {
  const [event] = normalizeProfessionalSfxEvents({
    rawEvents: [
      {
        scene_ref: "1.1",
        offset: 0,
        category: "riser",
        duration: 2,
        confidence: 0.9,
      },
    ],
    scenes,
    totalDuration: 30,
  });
  assert.equal(event.time, 14);
  const [segment] = buildSfxPlaybackSegments({
    event,
    sourceDuration: 1.4,
    totalDuration: 30,
  });
  assert.equal(segment.start, 14.6);
  assert.equal(segment.start + segment.duration, 16);
});

test("ambiente curto entra em loop apenas até o fim planejado", () => {
  const [segment] = buildSfxPlaybackSegments({
    event: {
      category: "ambience",
      time: 2,
      duration: 5,
      scene_end: 7,
      volume: 0.12,
    },
    sourceDuration: 1.2,
    totalDuration: 20,
  });
  assert.equal(segment.loop, true);
  assert.equal(segment.duration, 5);
});

test("ação contínua repete no máximo três vezes e reduz o volume", () => {
  const segments = buildSfxPlaybackSegments({
    event: {
      category: "detail",
      time: 3,
      duration: 1,
      scene_end: 8,
      repeat_mode: "pulse",
      repeat_interval: 1.1,
      repeat_count: 3,
      volume: 0.25,
    },
    sourceDuration: 0.8,
    totalDuration: 20,
  });
  assert.equal(segments.length, 3);
  assert.deepEqual(
    segments.map((segment) => segment.volume),
    [0.25, 0.19, 0.145]
  );
});

test("impacto nunca é repetido mesmo que a IA solicite", () => {
  const segments = buildSfxPlaybackSegments({
    event: {
      category: "impact",
      time: 4,
      duration: 2,
      scene_end: 8,
      repeat_mode: "pulse",
      repeat_count: 3,
    },
    sourceDuration: 0.6,
    totalDuration: 20,
  });
  assert.equal(segments.length, 1);
  assert.equal(segments[0].duration, 0.6);
});
