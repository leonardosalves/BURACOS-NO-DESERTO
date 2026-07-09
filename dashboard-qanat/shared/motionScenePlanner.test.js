import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyNarrationSegment,
  planMotionScenesFromStoryboard,
  syncMotionScenesToStudio,
  applyMotionScenesToVisualPrompts,
  isPrimaryRemotionMotionScene,
  buildPropsForTemplate,
  limitMotionScenesForFormat,
  motionScenesToMotionClips,
} from "../backend/motionScenePlanner.js";
import { syncCatalogForNiche } from "../backend/remotionTemplateCatalogService.js";

const BRIDGE_TSX = `"use client";
import { AbsoluteFill, useCurrentFrame } from "remotion";
export const exampleProps = { title: "BRIDGE" };
export default function BridgeCounter() {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: frame / 30 }} />;
}`;

const BRIDGE_NICHE = "__test_motion_planner_bridge__";

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

  it("curiosidade vira counter aprovado em vez de kinetic-text", () => {
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
    assert.equal(plan.motion_scenes[0].template_id, "counter");
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
          scene: "1.2",
          block: 1,
          narration_text:
            "O Google Maps revela uma fortaleza estelar em Palmanova.",
          speech_start: 4,
          duration_seconds: 6,
        },
      ],
    };
    const plan = planMotionScenesFromStoryboard(storyboard, {
      niche: "Engenharia",
      accent_color: "#D4AF37",
    });
    assert.ok(plan.motion_scenes.length >= 2);
    const templates = plan.motion_scenes.map((s) => s.template_id);
    assert.ok(templates.includes("counter") || templates.includes("bar-chart"));
    assert.ok(templates.includes("location-intro"));
    assert.ok(plan.motion_scenes_review);
    assert.ok(plan.motion_scenes[0].template_decision);
    assert.ok(plan.motion_scenes[0].decision_reason);
    assert.ok(plan.motion_scenes_review.scenes.length >= 2);
    assert.ok(
      plan.motion_scenes_review.operational_catalog.some(
        (tpl) => tpl.id === "counter" || tpl.id === "location-intro"
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

  it("plan location-intro usa duração mínima 8s", () => {
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
    const loc = plan.motion_scenes.find(
      (s) => s.template_id === "location-intro"
    );
    assert.ok(loc);
    assert.equal(loc.duration_seconds, 8);
    assert.equal(loc.layout, "fullscreen");
  });

  it("location-intro respeita teto 10s shorts e 20s longos", () => {
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
    assert.equal(shortPlan.motion_scenes[0].duration_seconds, 10);
    assert.equal(longPlan.motion_scenes[0].duration_seconds, 20);
  });

  it("E2E cidade PT-BR (alias geocode) short 9:16 — location-intro PIP + place_type city", () => {
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
    const loc = plan.motion_scenes.find(
      (s) => s.template_id === "location-intro"
    );
    assert.ok(loc);
    assert.equal(plan.motion_scenes.length, 1);
    assert.equal(loc.layout, "pip");
    assert.equal(loc.props.presentation, "pip");
    assert.equal(loc.props.place_type, "city");
    assert.equal(loc.props.aspect_ratio, "9:16");
    assert.equal(loc.duration_seconds, 8);
  });

  it("limita shorts a 1 template e longos a 8 templates aprovados", () => {
    const scenes = Array.from({ length: 10 }, (_, i) => ({
      id: `ms-${i}`,
      template_id:
        i === 9 ? "kinetic-text" : i === 0 ? "location-intro" : "counter",
      trigger: i === 0 ? "location" : "stat_number",
      start_hint: i * 4,
    }));
    const shortScenes = limitMotionScenesForFormat(scenes, "9:16");
    const longScenes = limitMotionScenesForFormat(scenes, "16:9");
    assert.equal(shortScenes.length, 1);
    assert.equal(shortScenes[0].template_id, "location-intro");
    assert.equal(longScenes.length, 8);
    assert.ok(longScenes.every((s) => s.template_id !== "kinetic-text"));
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
