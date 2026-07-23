import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  classifyNarrationSegment,
  planMotionScenesFromStoryboard,
  syncMotionScenesToStudio,
  applyMotionScenesToVisualPrompts,
  isPrimaryRemotionMotionScene,
  buildPropsForTemplate,
  limitMotionScenesForFormat,
  motionScenesToMotionClips,
  boostStudioMotionScenesForLongForm,
  backfillVisualPromptNarration,
} from "../backend/motionScenePlanner.js";
import {
  buildNarrationArtifacts,
  isVisualPromptNarration,
} from "../backend/narrationIntegrity.js";
import { syncCatalogForNiche } from "../backend/remotionTemplateCatalogService.js";

const BRIDGE_TSX = `"use client";
import { AbsoluteFill, useCurrentFrame } from "remotion";
export const exampleProps = { title: "BRIDGE" };
export default function BridgeCounter() {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: frame / 30 }} />;
}`;

const BRIDGE_NICHE = "__test_motion_planner_bridge__";
const TEST_CATALOG_PATH = path.join(
  os.tmpdir(),
  `lumiera-motion-planner-catalog-${process.pid}.json`
);

before(() => {
  process.env.LUMIERA_TEMPLATE_CATALOG_PATH = TEST_CATALOG_PATH;
  fs.writeFileSync(TEST_CATALOG_PATH, JSON.stringify({ niches: {} }), "utf8");
});

after(() => {
  delete process.env.LUMIERA_TEMPLATE_CATALOG_PATH;
  try {
    fs.unlinkSync(TEST_CATALOG_PATH);
  } catch {
    /* ignore */
  }
});

describe("integridade entre narração e prompt visual", () => {
  const visualPrompt =
    "Photorealistic 2k cinematic wide shot of building flying, structure. Documentary science style, dramatic lighting, sharp detail, no text overlay. No readable text, subtitles, labels, logos or watermarks in the source media.";

  it("nunca usa o prompt visual como fallback de narração", () => {
    const repaired = backfillVisualPromptNarration(
      {
        narrative_script:
          "A primeira frase. A segunda frase aprovada permanece correta.",
        visual_prompts: [
          {
            scene: "1.1",
            block: 1,
            prompt: visualPrompt,
            narration_text: visualPrompt,
          },
        ],
      },
      {
        block_phrases: [
          {
            block: 1,
            phrase: `${visualPrompt} A segunda frase aprovada permanece correta.`,
          },
        ],
      }
    );

    assert.equal(
      repaired.visual_prompts[0].narration_text,
      "A segunda frase aprovada permanece correta."
    );
    assert.equal(
      isVisualPromptNarration(
        repaired.visual_prompts[0].narration_text,
        visualPrompt
      ),
      false
    );
  });

  it("deixa a narração vazia quando não existe fonte narrativa segura", () => {
    const repaired = backfillVisualPromptNarration(
      {
        narrative_script: "Roteiro contínuo sem divisão confiável por blocos.",
        visual_prompts: [
          {
            scene: "3.1",
            block: 3,
            prompt: visualPrompt,
            narration_text: visualPrompt,
          },
        ],
      },
      {}
    );

    assert.equal(repaired.visual_prompts[0].narration_text, undefined);
  });

  it("remove instrução visual e falas duplicadas dos artefatos de voz", () => {
    const artifacts = buildNarrationArtifacts([
      { scene: "1.1", block: 1, narration_text: "Narração correta." },
      { scene: "1.2", block: 1, narration_text: "Narração correta." },
      {
        scene: "2.1",
        block: 2,
        narration_text: visualPrompt,
        prompt: visualPrompt,
      },
    ]);

    assert.equal(artifacts.transcript, "Narração correta.");
    assert.deepEqual(artifacts.blockPhrases, [
      { block: 1, phrase: "Narração correta." },
    ]);
  });
});

describe("motionScenePlanner", () => {
  it("detecta estatística com porcentagem", () => {
    const r = classifyNarrationSegment(
      "No Brasil, 62% dos usuários não protegem seus dados."
    );
    assert.equal(r?.trigger, "stat_number");
    assert.ok(r.confidence >= 0.65);
  });

  it("não dispara location só por mapa sem lugar nomeado", () => {
    const r = classifyNarrationSegment(
      "O Google Maps esconde uma fortaleza estelar com precisão absurda."
    );
    assert.notEqual(r?.trigger, "location");
  });

  it("dispara location quando cidade é citada no roteiro", () => {
    const r = classifyNarrationSegment(
      "Na cidade de Bangcoc, a bacia de argila esconde um segredo sísmico."
    );
    assert.equal(r?.trigger, "location");
  });

  it("detecta curiosidade curta", () => {
    const r = classifyNarrationSegment("Um segredo incrível foi revelado.");
    assert.equal(r?.trigger, "curiosity_punch");
  });

  it("curiosidade vira crash-zoom-punch aprovado em vez de kinetic-text", () => {
    const plan = planMotionScenesFromStoryboard(
      {
        visual_prompts: [
          {
            scene: "1.1",
            block: 1,
            narration_text: "Um segredo incrivel foi revelado.",
            speech_start: 0,
            duration_seconds: 3,
          },
        ],
      },
      { niche: "Engenharia", aspect_ratio: "16:9" }
    );
    assert.equal(plan.motion_scenes.length, 1);
    assert.equal(plan.motion_scenes[0].template_id, "crash-zoom-punch");
  });

  it("planeja motion_scenes a partir de visual_prompts", () => {
    const storyboard = {
      visual_prompts: [
        {
          scene: "1.1",
          block: 1,
          narration_text: "No Brasil, 62% não protegem dados.",
          speech_start: 0,
          duration_seconds: 4,
        },
        {
          scene: "2.1",
          block: 2,
          narration_text:
            "O Google Maps revela uma fortaleza estelar em Palmanova.",
          speech_start: 6,
          duration_seconds: 6,
        },
      ],
    };
    const plan = planMotionScenesFromStoryboard(storyboard, {
      niche: "Engenharia",
      aspect_ratio: "16:9",
      accent_color: "#D4AF37",
    });
    assert.ok(plan.motion_scenes.length >= 2);
    const templates = plan.motion_scenes.map((s) => s.template_id);
    assert.ok(templates.includes("odometer-digit-roll") || templates.includes("chart-live-moves"));
    assert.ok(templates.includes("space-camera-moves") || templates.includes("crane-rise-reveal"));
    assert.ok(plan.motion_scenes_review);
    assert.ok(plan.motion_scenes[0].template_decision);
    assert.ok(plan.motion_scenes[0].decision_reason);
    assert.ok(plan.motion_scenes_review.scenes.length >= 2);
    assert.ok(
      plan.motion_scenes_review.operational_catalog.some(
        (tpl) => tpl.id === "odometer-digit-roll" || tpl.id === "space-camera-moves"
      )
    );
  });

  it("registra revisao de cenas sem template automatico", () => {
    const plan = planMotionScenesFromStoryboard(
      {
        visual_prompts: [
          {
            scene: "1.1",
            block: 1,
            narration_text:
              "A camera observa lentamente a textura da parede ao amanhecer.",
          },
        ],
      },
      { niche: "Arquitetura", aspect_ratio: "16:9" }
    );
    assert.equal(plan.motion_scenes.length, 0);
    assert.equal(plan.motion_scenes_review.skipped_count, 1);
    assert.equal(plan.motion_scenes_review.skipped[0].skipped, true);
  });

  it("motion scenes vão para trilha motion sem remover B-roll", () => {
    const motionScenes = [
      {
        id: "ms-3.2",
        scene_ref: "3.2",
        block: 3,
        start_hint: 35,
        duration_seconds: 5,
        layout: "pip",
        template_id: "location-intro",
        media_mode: "remotion",
        props: { location: "Palmanova", presentation: "pip" },
      },
    ];
    const studio = {
      version: 1,
      clips: [
        {
          id: "video-3-0",
          trackId: "video",
          start: 34,
          duration: 6,
          source: "ASSETS/cena_3.jpg",
          props: { type: "image", blockKey: 3 },
        },
      ],
    };
    const synced = syncMotionScenesToStudio(studio, motionScenes);
    const videoClips = synced.clips.filter((c) => c.trackId === "video");
    const motionClips = synced.clips.filter((c) => c.trackId === "motion");
    assert.equal(videoClips.length, 1);
    assert.equal(videoClips[0].source, "ASSETS/cena_3.jpg");
    assert.equal(motionClips.length, 1);
    assert.equal(motionClips[0].templateId, "location-intro");
    assert.ok(synced.tracks.some((t) => t.id === "motion"));
  });

  it("marca visual_prompts com media_mode remotion", () => {
    const storyboard = {
      visual_prompts: [
        { scene: "3.2", block: 3, narration_text: "Palmanova" },
        { scene: "4.1", block: 4, narration_text: "Outro trecho" },
      ],
    };
    const motionScenes = [
      {
        id: "ms-3.2",
        scene_ref: "3.2",
        layout: "fullscreen",
        template_id: "location-intro",
        media_mode: "remotion",
      },
    ];
    const next = applyMotionScenesToVisualPrompts(storyboard, motionScenes);
    assert.equal(next.visual_prompts[0].media_mode, "remotion");
    assert.equal(next.visual_prompts[1].media_mode, undefined);
  });

  it("syncMotionScenesToStudio preserva props editadas pelo usuário", () => {
    const motionScenes = [
      {
        id: "ms-2.1",
        scene_ref: "2.1",
        block: 2,
        start_hint: 10,
        duration_seconds: 4,
        template_id: "counter",
        media_mode: "remotion",
        props: {
          template_studio_id: "counter-1",
          studio_source_code:
            '"use client";\nimport { useCurrentFrame } from "remotion";\nexport default function T(){useCurrentFrame();return null;}',
          value: 40,
          label: "GENÉRICO",
          studio_props: { value: 40, label: "GENÉRICO" },
        },
      },
    ];
    const studio = {
      version: 1,
      clips: [
        {
          id: "ms-2.1",
          trackId: "motion",
          start: 12,
          duration: 5,
          templateId: "counter",
          motionScene: true,
          label: "BRASIL 62%",
          props: {
            studio_user_locked: true,
            studio_user_locked_slots: ["value", "label"],
            value: 62,
            label: "BRASIL",
            studio_props: { value: 62, label: "BRASIL" },
            studio_source_code:
              '"use client";\nimport { useCurrentFrame } from "remotion";\nexport default function T(){useCurrentFrame();return null;}',
          },
        },
      ],
    };
    const synced = syncMotionScenesToStudio(studio, motionScenes);
    const clip = synced.clips.find((c) => c.id === "ms-2.1");
    assert.equal(clip.props.value, 62);
    assert.equal(clip.props.label, "BRASIL");
    assert.equal(clip.label, "BRASIL 62%");
  });

  it("sync remove cena motion antiga ao trocar por geo (short 9:16)", () => {
    const motionScenes = [
      {
        id: "ms-geo-1",
        scene_ref: "1.1",
        block: 1,
        start_hint: 0,
        duration_seconds: 8,
        layout: "pip",
        template_id: "location-intro",
        media_mode: "remotion",
        props: {
          aspect_ratio: "9:16",
          presentation: "pip",
          geo_pip_composite: true,
          studio_source_code:
            '"use client";\nimport { useCurrentFrame } from "remotion";\nexport default function T(){useCurrentFrame();return null;}',
        },
      },
    ];
    const studio = {
      version: 1,
      clips: [
        {
          id: "motion-studio-old",
          trackId: "motion",
          start: 0,
          duration: 8,
          templateId: "bar-chart",
          motionScene: true,
          label: "Engenharia Bar chart Draft",
          props: {
            motion_scene: true,
            studio_source_code:
              '"use client";\nimport { useCurrentFrame } from "remotion";\nexport default function T(){useCurrentFrame();return null;}',
          },
        },
      ],
    };
    const synced = syncMotionScenesToStudio(studio, motionScenes);
    const motionClips = synced.clips.filter((c) => c.trackId === "motion");
    assert.equal(motionClips.length, 1);
    assert.equal(motionClips[0].templateId, "location-intro");
    assert.equal(motionClips[0].id, "ms-geo-1");
  });

  it("sync com B-roll ausente não remove clips video existentes", () => {
    const motionScenes = [
      {
        id: "ms-1.2",
        scene_ref: "1.2",
        block: 1,
        start_hint: 3.587,
        duration_seconds: 5,
        layout: "pip",
        template_id: "location-intro",
        media_mode: "remotion",
        props: { location: "Palmanova", presentation: "pip" },
      },
    ];
    const studio = {
      version: 1,
      clips: [
        {
          id: "video-2-1",
          trackId: "video",
          start: 21.612,
          duration: 8,
          source: "Designer_hands.jpeg",
        },
        {
          id: "ms-1.2",
          trackId: "motion",
          start: 3.587,
          duration: 5,
          templateId: "location-intro",
          motionScene: true,
          props: { motion_scene: true },
        },
      ],
    };
    const synced = syncMotionScenesToStudio(studio, motionScenes);
    const videoClips = synced.clips.filter((c) => c.trackId === "video");
    assert.equal(videoClips.length, 1);
    assert.equal(videoClips[0].id, "video-2-1");
  });

  it("location-intro padrão: fullscreen + earth_descent para POI e cidade", () => {
    const poi = buildPropsForTemplate(
      "location-intro",
      "location",
      "A fortaleza estelar de Palmanova revela um segredo.",
      "#C5A889"
    );
    assert.equal(poi.presentation, "fullscreen");
    assert.equal(poi.fly_mode, "earth_descent");
    assert.equal(poi.place_type, "poi");
    assert.equal(poi.structure_exists, true);
    assert.equal(poi.zoom_from, 3);
    assert.equal(poi.zoom_to, 17);

    const city = buildPropsForTemplate(
      "location-intro",
      "location",
      "Na cidade de Roma, a engenharia antiga impressiona.",
      "#C5A889"
    );
    assert.equal(city.presentation, "fullscreen");
    assert.equal(city.fly_mode, "earth_descent");
    assert.equal(city.place_type, "city");
    assert.equal(city.zoom_to, 10);

    const historic = buildPropsForTemplate(
      "location-intro",
      "location",
      "O único prédio da cidade caiu e não existe mais no local.",
      "#C5A889"
    );
    assert.equal(historic.place_type, "historic_site");
    assert.equal(historic.structure_exists, false);
    assert.equal(historic.presentation, "fullscreen");
  });

  it("plan location (shotcraft) usa space-camera-moves fullscreen", () => {
    const plan = planMotionScenesFromStoryboard(
      {
        visual_prompts: [
          {
            scene: "2.1",
            block: 2,
            narration_text:
              "O Google Maps esconde uma fortaleza estelar em Palmanova.",
            speech_start: 12,
            duration_seconds: 4,
          },
        ],
      },
      { niche: "Engenharia" }
    );
    const scene = plan.motion_scenes.find((s) => s.template_id === "space-camera-moves");
    assert.ok(scene);
    assert.equal(scene.layout, "fullscreen");
  });

  it("location shotcraft respeita duração default do template", () => {
    const storyboard = {
      visual_prompts: [
        {
          scene: "2.1",
          block: 2,
          narration_text: "A Ponte de Laufenburg revela o detalhe estrutural.",
          speech_start: 4,
          duration_seconds: 30,
        },
      ],
    };
    const shortPlan = planMotionScenesFromStoryboard(storyboard, {
      niche: "Engenharia",
      aspect_ratio: "9:16",
    });
    const longPlan = planMotionScenesFromStoryboard(storyboard, {
      niche: "Engenharia",
      aspect_ratio: "16:9",
    });
    const shortScene = shortPlan.motion_scenes.find((s) => s.template_id === "space-camera-moves");
    const longScene  = longPlan.motion_scenes.find((s) => s.template_id === "space-camera-moves");
    assert.ok(shortScene && longScene);
    assert.equal(shortScene.duration_seconds, 5);
    assert.equal(longScene.duration_seconds, 5);
  });

  it("E2E cidade PT-BR short 9:16 — space-camera-moves fullscreen", () => {
    const plan = planMotionScenesFromStoryboard(
      {
        visual_prompts: [
          {
            scene: "1.1",
            block: 1,
            narration_text:
              "Na cidade de Bangcoc, a bacia de argila esconde um segredo sísmico.",
            speech_start: 0,
            duration_seconds: 8,
          },
          {
            scene: "3.1",
            block: 3,
            narration_text:
              "770 km do epicentro — amplificação sísmica recorde.",
            speech_start: 38,
            duration_seconds: 4,
          },
        ],
      },
      { niche: "Engenharia", aspect_ratio: "9:16" }
    );
    const scene = plan.motion_scenes.find((s) => s.template_id === "space-camera-moves");
    assert.ok(scene);
    assert.equal(scene.layout, "fullscreen");
  });

  it("limita shorts e longos a templates aprovados (shotcraft)", () => {
    const scenes = Array.from({ length: 10 }, (_, i) => ({
      id: `ms-${i}`,
      block: i + 1,
      scene_ref: `${i + 1}.1`,
      template_id: i === 0 ? "space-camera-moves" : "odometer-digit-roll",
      trigger: i === 0 ? "location" : "stat_number",
      start_hint: i * 4,
    }));
    const shortScenes = limitMotionScenesForFormat(scenes, "9:16");
    const longScenes = limitMotionScenesForFormat(scenes, "16:9");
    assert.ok(shortScenes.length >= 1 && shortScenes.length <= 3);
    assert.ok(longScenes.length >= 1 && longScenes.length <= 8);
    assert.ok(longScenes.every((s) => s.template_id !== "kinetic-text"));
  });

  it("boostStudioMotionScenesForLongForm atinge minimo 5 templates Studio", () => {
    const BOOST_NICHE = "__test_studio_boost_long__";
    const mkTpl = (id, subcategory, slots) => ({
      id,
      name: id,
      category: "motion-visual",
      subcategory,
      niche: BOOST_NICHE,
      status: "approved",
      description: "",
      dataSlots: slots,
      shortPreview: "x",
      longPreview: "x",
      sourceCode: { short: BRIDGE_TSX, long: BRIDGE_TSX },
    });
    syncCatalogForNiche(BOOST_NICHE, [
      mkTpl("boost-counter", "Stat Counter", ["value", "label"]),
      mkTpl("boost-bar", "Bar chart", ["items", "title"]),
      mkTpl("boost-pictogram", "Pie Donut Pictogram", ["value", "label"]),
      mkTpl("boost-timeline", "Timeline steps", ["events", "title"]),
      mkTpl("boost-geo", "Mapa Geo Location", ["location"]),
      mkTpl("boost-text", "Kinetic Title Quote", ["text"]),
    ]);

    const visualPrompts = [
      {
        scene: "2.1",
        block: 2,
        narration_text: "Em 1930 a estrutura suportava 40% da carga máxima.",
        speech_start: 12,
        duration_seconds: 4,
      },
      {
        scene: "3.1",
        block: 3,
        narration_text: "Comparando o material A 200 MPa contra o material B 40 MPa.",
        speech_start: 24,
        duration_seconds: 4,
      },
      {
        scene: "4.1",
        block: 4,
        narration_text: "Na cidade de Palmanova, a fortaleza estelar impressiona.",
        speech_start: 36,
        duration_seconds: 4,
      },
      {
        scene: "5.1",
        block: 5,
        narration_text: "No ano de 1850 começou a expansão, e até 1860 a infraestrutura cresceu.",
        speech_start: 48,
        duration_seconds: 4,
      },
      {
        scene: "6.1",
        block: 6,
        narration_text: "O gráfico de pizza registrou 92% de aprovação.",
        speech_start: 60,
        duration_seconds: 4,
      },
      {
        scene: "7.1",
        block: 7,
        narration_text: "Um segredo incrível revelou um enigma chocante no relatório.",
        speech_start: 72,
        duration_seconds: 4,
      },
    ];

    const boosted = boostStudioMotionScenesForLongForm({
      scenes: [],
      visualPrompts,
      consumedVpRefs: new Set(),
      config: {
        niche: BOOST_NICHE,
        aspect_ratio: "16:9",
        motion_template_pack: { enabled: true, niche: BOOST_NICHE },
        accent_color: "#D4AF37",
      },
      blockTimings: {},
      researchContext: {},
      studioNiche: BOOST_NICHE,
      aspectRatio: "16:9",
      nichePack: "industrial-impact",
    });

    const studioCount = boosted.filter(
      (s) => s.props?.template_studio_id
    ).length;
    assert.ok(studioCount >= 5);
    assert.ok(boosted.some((s) => s.boosted));
  });

  it("planeja cena com template Studio quando pack do nicho está ativo", () => {
    syncCatalogForNiche(BRIDGE_NICHE, [
      {
        id: "bridge-counter-studio",
        name: "Bridge Counter Draft",
        category: "chart-data",
        subcategory: "Counter",
        niche: BRIDGE_NICHE,
        status: "approved",
        description: "Contador de teste",
        dataSlots: ["value", "label"],
        shortPreview: "counter",
        longPreview: "counter",
        sourceCode: { short: BRIDGE_TSX, long: BRIDGE_TSX },
      },
    ]);

    const plan = planMotionScenesFromStoryboard(
      {
        visual_prompts: [
          {
            scene: "2.1",
            block: 2,
            narration_text: "No Brasil, 62% dos usuarios nao protegem dados.",
            speech_start: 0,
            duration_seconds: 4,
          },
        ],
      },
      {
        niche: BRIDGE_NICHE,
        aspect_ratio: "9:16",
        motion_template_pack: {
          enabled: true,
          niche: BRIDGE_NICHE,
          template_ids: [],
        },
      }
    );

    assert.equal(plan.motion_scenes.length, 1);
    const scene = plan.motion_scenes[0];
    assert.equal(scene.props.template_studio_id, "bridge-counter-studio");
    assert.ok(
      String(scene.props.studio_source_code || "").includes("useCurrentFrame")
    );
    assert.ok(scene.props.studio_props);
    assert.equal(scene.props.studio_props.value, 62);
    assert.equal(scene.props.value, 62);

    const clips = motionScenesToMotionClips(plan.motion_scenes);
    assert.equal(
      clips[0].props.studio_source_code,
      scene.props.studio_source_code
    );
  });

  it("pip layout permanece overlay, não vídeo primário", () => {
    assert.equal(
      isPrimaryRemotionMotionScene({
        media_mode: "remotion",
        layout: "pip",
        template_id: "geo-map",
      }),
      false
    );
    assert.equal(
      isPrimaryRemotionMotionScene({
        media_mode: "remotion",
        layout: "fullscreen",
        template_id: "location-intro",
      }),
      true
    );
  });
});
