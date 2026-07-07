/**
 * Fase 3 — enriquecimento LLM opcional + dedupe com overlays_ai.
 */

import {
  DEFAULT_DURATIONS,
  MOTION_SCENE_TRIGGERS,
  resolveLayoutForTemplate,
} from "../shared/motionSceneCatalog.js";
import { nicheDesignPromptBlock } from "../shared/nicheDesignPack.js";
import {
  buildPropsForTemplate,
  resolveNichePack,
} from "./motionScenePlanner.js";

const VALID_TEMPLATES = new Set(
  Object.values(MOTION_SCENE_TRIGGERS).flatMap((t) => t.templates || [])
);

function extractJsonCandidate(text) {
  const raw = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const firstObject = raw.indexOf("{");
  const firstArray = raw.indexOf("[");
  const start =
    firstObject === -1
      ? firstArray
      : firstArray === -1
        ? firstObject
        : Math.min(firstObject, firstArray);
  if (start === -1) return raw;
  const closeForOpen = raw[start] === "{" ? "}" : "]";
  const stack = [closeForOpen];
  let inString = false;
  let escaped = false;
  for (let i = start + 1; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      if (ch !== stack.pop()) break;
      if (stack.length === 0) return raw.slice(start, i + 1);
    }
  }
  const fallback = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return fallback ? fallback[0] : raw;
}

export function parseMotionSceneLlmPayload(text) {
  const candidate = extractJsonCandidate(text);
  const variants = [
    candidate,
    candidate.replace(/,\s*([}\]])/g, "$1"),
    candidate
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/,\s*([}\]])/g, "$1"),
  ];
  let lastError = null;
  for (const variant of variants) {
    try {
      const parsed = JSON.parse(variant);
      if (Array.isArray(parsed)) return { motion_scenes: parsed };
      if (Array.isArray(parsed?.motion_scenes)) return parsed;
      if (Array.isArray(parsed?.scenes))
        return { motion_scenes: parsed.scenes };
      return parsed;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("JSON inválido na resposta LLM");
}

function overlaySceneRef(overlay = {}) {
  return String(
    overlay.start || overlay.scene_ref || overlay.scene || ""
  ).trim();
}

function motionSceneRef(scene = {}) {
  return String(scene.scene_ref || scene.scene || "").trim();
}

function overlayDedupeKey(overlay = {}) {
  const type = String(overlay.type || overlay.template_id || "").trim();
  const scene = overlaySceneRef(overlay);
  if (!type) return "";
  if (scene) return `${type}::${scene}`;
  const block = Number(overlay.block || overlay.props?.block || 0);
  if (block > 0) return `${type}::block-${block}`;
  return "";
}

function motionDedupeKey(scene = {}) {
  const type = String(scene.template_id || "").trim();
  const sceneRef = motionSceneRef(scene);
  if (!type) return "";
  if (sceneRef) return `${type}::${sceneRef}`;
  const block = Number(scene.block || 0);
  if (block > 0) return `${type}::block-${block}`;
  return "";
}

/**
 * Remove motion scenes que colidem com overlays_ai (mesmo template + cena/bloco).
 */
export function dedupeMotionScenesAgainstOverlays(
  motionScenes = [],
  overlaysAi = []
) {
  const overlays = Array.isArray(overlaysAi) ? overlaysAi : [];
  const overlayKeys = new Set(overlays.map(overlayDedupeKey).filter(Boolean));

  if (!overlayKeys.size) {
    return { scenes: motionScenes, removed: [] };
  }

  const removed = [];
  const scenes = (Array.isArray(motionScenes) ? motionScenes : []).filter(
    (ms) => {
      const key = motionDedupeKey(ms);
      if (key && overlayKeys.has(key)) {
        removed.push({ id: ms.id, key, reason: "overlay_ai_duplicate" });
        return false;
      }
      return true;
    }
  );

  return { scenes, removed };
}

function summarizeOverlaysForPrompt(overlaysAi = []) {
  return (Array.isArray(overlaysAi) ? overlaysAi : [])
    .slice(0, 24)
    .map((o) => {
      const type = String(o.type || "").trim();
      const scene = overlaySceneRef(o);
      const label =
        o.props?.location ||
        o.props?.title ||
        o.props?.text ||
        o.props?.label ||
        "";
      return `- ${type} @ cena ${scene || "?"} — ${String(label).slice(0, 60)}`;
    })
    .join("\n");
}

export function buildMotionSceneEnrichmentPrompt({
  heuristicPlan = {},
  storyboard = {},
  config = {},
  overlaysAi = [],
}) {
  const niche = String(config.niche || storyboard?.strategy?.niche || "Geral");
  const nichePack =
    heuristicPlan.niche_pack || resolveNichePack(config, storyboard);
  const accent = String(config.accent_color || "#D4AF37");
  const scenes = (heuristicPlan.motion_scenes || []).slice(0, 16);
  if (!scenes.length) return null;

  const visualContext = (storyboard.visual_prompts || [])
    .slice(0, 20)
    .map((vp) => ({
      scene: vp.scene,
      block: vp.block,
      narration: String(
        vp.narration_text || vp.asset?.narration_segment || ""
      ).slice(0, 160),
    }));

  const templateList = [...VALID_TEMPLATES].join(", ");
  const overlaySummary = summarizeOverlaysForPrompt(overlaysAi);

  return [
    `Você é diretor de motion graphics Remotion para vídeo documental (nicho: "${niche}", pack: "${nichePack}").`,
    "Refine o plano heurístico abaixo — melhore props, escolha de template e duração.",
    "",
    "REGRAS:",
    `- Use APENAS template_id: ${templateList}`,
    "- NUNCA duplique overlays já planejados em overlays_ai (mesmo template + mesma cena/bloco).",
    "- NÃO adicione cenas novas — refine APENAS as do plano heurístico (mesmos id).",
    "- Preserve start_hint de cada cena; nunca empilhe cenas em start_hint 0.",
    "- Extraia dados reais da narração: nomes de lugares, números, anos, comparações.",
    "- ESCOLHA DE TEMPLATE: location-intro = zoom geografico continuo ate o alvo; geo-map = pin regional; counter/bar-chart/timeline = dados da narração.",
    "- location-intro: location, region, country; variant satellite; place_type city|poi|historic_site; structure_exists boolean.",
    "- REGRA GEO 16:9: location-intro deve ser fullscreen, vindo em zoom continuo estilo Google Maps desde globo/regiao (ex.: Europa) -> pais -> cidade -> alvo; sem transicao/corte entre mapas.",
    "- REGRA GEO 9:16 ENGENHARIA: location-intro deve ser PIP tecnico de mapa, nao embaixo, com o mapa animado dentro da janela PIP e preservando legendas.",
    "- REGRA GEO: pais/cidade/regiao usa place_type city, mapa antigo/satelite aberto, fronteira desenhada e zoom final mostrando o pais/cidade inteiro.",
    "- REGRA GEO: ponte, monumento, edificio, predio, templo, torre, museu, estadio, ruina ou ponto especifico visivel no mapa usa place_type poi, zoom continuo ate o objeto e orbita 360; nao trate como cidade/pais.",
    "- REGRA GEO: se for mapa antigo de pais/cidade, preserve enquadramento aberto com fronteira desenhada; nao faca close de POI.",
    "- location-intro SEMPRE fly_mode earth_descent (globo terrestre → cidade com boundary OSM ou POI/terreno).",
    "- PIP para mapas/geo só é permitido em 9:16 no nicho Engenharia; em 16:9 geo sempre fullscreen.",
    "- NUNCA use kinetic-text automaticamente enquanto nao houver template aprovado no Remotion Template Studio; texto solto sobre video e proibido.",
    "- Shorts 9:16 usam no maximo 1 template Remotion automatico; videos 16:9 longos usam ate 8 templates.",
    "- location-intro cidade: place_type city, zoom_from 3, zoom_to 10 (máx), boundaryGeoJson obrigatório.",
    "- location-intro POI (forte, ponte, monumento): place_type poi, zoom_from 3, zoom_to 17.",
    "- location-intro: duration_seconds minimo 8, max 10 em shorts 9:16 e max 20 em videos longos 16:9.",
    "- geo-map: só quando basta pin regional (sem descida); props.location + region obrigatórios.",
    "- counter: value numérico real + label curto em PT-BR (extraído da narração).",
    "- bar-chart: props.items com labels e valores reais da narração (mín. 2 itens).",
    "- timeline: events com year + label (mín. 2 eventos quando houver datas).",
    "- kinetic-text: props.text = frase de impacto da narração (≤60 chars).",
    "- lower-third: props.subtitle com o fato histórico da narração.",
    "- Mantenha id, scene_ref, block e start_hint do plano heurístico quando possível.",
    `- accentColor padrão: ${accent}`,
    "",
    nicheDesignPromptBlock(nichePack),
    "",
    overlaySummary
      ? `OVERLAYS_AI (não duplicar):\n${overlaySummary}`
      : "OVERLAYS_AI: (nenhum)",
    "",
    "PLANO HEURÍSTICO:",
    JSON.stringify(scenes, null, 2),
    "",
    "CONTEXTO visual_prompts:",
    JSON.stringify(visualContext, null, 2),
    "",
    'Retorne APENAS JSON: { "motion_scenes": [ ... ], "notes": "breve" }',
  ].join("\n");
}

function normalizeLlmMotionScene(
  raw,
  heuristicById,
  { accentColor, nichePack }
) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || "").trim();
  const heuristic = id ? heuristicById.get(id) : null;
  const trigger = String(raw.trigger || heuristic?.trigger || "").trim();
  let templateId = String(
    raw.template_id || heuristic?.template_id || ""
  ).trim();
  if (!VALID_TEMPLATES.has(templateId)) {
    templateId = heuristic?.template_id || "lower-third";
  }
  const narration = String(
    raw.narration_text || heuristic?.narration_text || ""
  ).trim();
  const aspectRatio = String(
    raw.props?.aspect_ratio || heuristic?.props?.aspect_ratio || "16:9"
  );
  const baseProps = buildPropsForTemplate(
    templateId,
    trigger,
    narration,
    accentColor,
    aspectRatio,
    nichePack
  );
  const llmProps = raw.props && typeof raw.props === "object" ? raw.props : {};

  const rawDuration =
    Number(raw.duration_seconds) ||
    Number(heuristic?.duration_seconds) ||
    DEFAULT_DURATIONS[templateId] ||
    4;
  const maxLocationDuration =
    templateId === "location-intro"
      ? aspectRatio === "9:16"
        ? 10
        : 20
      : Number.POSITIVE_INFINITY;

  const scene = {
    ...(heuristic || {}),
    ...raw,
    id: id || heuristic?.id || `ms-llm-${Date.now()}`,
    scene_ref: String(raw.scene_ref || heuristic?.scene_ref || ""),
    block: Number(raw.block || heuristic?.block) || 1,
    start_hint: Number.isFinite(Number(raw.start_hint))
      ? Number(raw.start_hint)
      : Number(heuristic?.start_hint) || 0,
    duration_seconds: Math.min(maxLocationDuration, Math.max(0.5, rawDuration)),
    template_id: templateId,
    trigger: trigger || heuristic?.trigger || "curiosity_punch",
    layout:
      raw.layout ||
      heuristic?.layout ||
      resolveLayoutForTemplate(templateId, trigger, {
        text: narration,
        aspectRatio,
        niche: nichePack,
      }),
    props: { ...baseProps, ...llmProps },
    narration_text: narration || heuristic?.narration_text || "",
    media_mode: "remotion",
    niche_pack: nichePack,
    confidence: Math.min(
      1,
      Math.max(
        0.5,
        Number(raw.confidence) || Number(heuristic?.confidence) || 0.75
      )
    ),
    source: "llm",
  };

  const triggerMeta = MOTION_SCENE_TRIGGERS[scene.trigger] || {};
  scene.rve_ref = heuristic?.rve_ref ?? triggerMeta.rveRef ?? null;
  scene.remotion_ref =
    heuristic?.remotion_ref ?? triggerMeta.remotionRef ?? null;

  if (templateId === "location-intro") {
    const isEngineeringShort =
      aspectRatio === "9:16" &&
      /engenharia|engineering|industrial/i.test(String(nichePack || ""));
    const layout = isEngineeringShort ? "pip" : "fullscreen";
    scene.layout = layout;
    scene.props = {
      ...scene.props,
      aspect_ratio: aspectRatio,
      niche: scene.props?.niche || nichePack,
      presentation: layout,
      layout,
    };
  }

  return scene;
}

export function applyLlmEnrichmentToPlan(
  heuristicPlan = {},
  llmPayload = {},
  { config = {}, storyboard = {} } = {}
) {
  const rawScenes = Array.isArray(llmPayload?.motion_scenes)
    ? llmPayload.motion_scenes
    : [];
  if (!rawScenes.length) {
    return { ...heuristicPlan, source: heuristicPlan.source || "heuristic" };
  }

  const accentColor = String(config.accent_color || "#D4AF37");
  const nichePack =
    heuristicPlan.niche_pack || resolveNichePack(config, storyboard);
  const heuristicById = new Map(
    (heuristicPlan.motion_scenes || []).map((s) => [String(s.id), s])
  );

  const llmById = new Map();
  for (const raw of rawScenes) {
    const normalized = normalizeLlmMotionScene(raw, heuristicById, {
      accentColor,
      nichePack,
    });
    if (!normalized?.id) continue;
    if (!heuristicById.has(String(normalized.id))) continue;
    llmById.set(String(normalized.id), normalized);
  }

  const motion_scenes = (heuristicPlan.motion_scenes || []).map((heuristic) => {
    const llm = llmById.get(String(heuristic.id));
    if (!llm) return heuristic;
    const startHint = Number.isFinite(Number(llm.start_hint))
      ? Number(llm.start_hint)
      : Number(heuristic.start_hint) || 0;
    const safeStart =
      startHint > 0
        ? startHint
        : Number(heuristic.start_hint) > 0
          ? Number(heuristic.start_hint)
          : startHint;
    return {
      ...heuristic,
      ...llm,
      start_hint: safeStart,
      props: { ...(heuristic.props || {}), ...(llm.props || {}) },
    };
  });

  return {
    ...heuristicPlan,
    motion_scenes,
    planner_version: 2,
    source: "heuristic+llm",
    llm_notes: String(llmPayload?.notes || "").slice(0, 500),
    planned_at: new Date().toISOString(),
  };
}

export async function enrichMotionScenesWithLlm(
  heuristicPlan,
  {
    storyboard = {},
    config = {},
    overlaysAi = [],
    callGemini,
    getApiKey,
    projDir,
    parseAiJson,
  } = {}
) {
  const prompt = buildMotionSceneEnrichmentPrompt({
    heuristicPlan,
    storyboard,
    config,
    overlaysAi,
  });
  if (!prompt) {
    return {
      plan: heuristicPlan,
      llm: { skipped: true, reason: "empty_heuristic" },
    };
  }

  const apiKey = getApiKey?.(projDir);
  if (!apiKey || !callGemini) {
    return {
      plan: heuristicPlan,
      llm: { skipped: true, reason: "no_api_key" },
    };
  }

  const text = await callGemini(projDir, prompt, {
    temperature: 0.32,
    maxRetries: 2,
  });
  if (!text) {
    return {
      plan: heuristicPlan,
      llm: { skipped: true, reason: "empty_response" },
    };
  }

  let payload;
  try {
    payload = parseAiJson
      ? await parseAiJson(text, apiKey, "motion scenes LLM")
      : parseMotionSceneLlmPayload(text);
  } catch (err) {
    return {
      plan: heuristicPlan,
      llm: { error: err.message, fallback: "heuristic" },
    };
  }

  let plan = applyLlmEnrichmentToPlan(heuristicPlan, payload, {
    config,
    storyboard,
  });
  const deduped = dedupeMotionScenesAgainstOverlays(
    plan.motion_scenes,
    overlaysAi
  );
  plan = { ...plan, motion_scenes: deduped.scenes };

  return {
    plan,
    llm: {
      enriched: true,
      notes: plan.llm_notes || null,
      dedupe_removed: deduped.removed,
    },
  };
}
