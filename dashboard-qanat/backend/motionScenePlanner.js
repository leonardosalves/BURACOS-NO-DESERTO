/**
 * Planejador de cenas Remotion — detecta trechos do roteiro e escolhe templates.
 */

import {
  DEFAULT_DURATIONS,
  FULLSCREEN_TEMPLATES,
  MOTION_SCENE_TRIGGERS,
  pickTemplateForTrigger,
  resolveLayoutForTemplate,
} from "../shared/motionSceneCatalog.js";
import { resolvePackByAlias } from "./timelineStudioNichePacks.js";
import { detectNicheCategory } from "./overlayOrchestration.js";

const YEAR_RE = /\b(1\d{3}|20\d{2})\b/;
const YEAR_GLOBAL_RE = /\b(1\d{3}|20\d{2})\b/g;
const STAT_RE =
  /(\d{1,3}(?:[.,]\d+)?)\s*(%|por\s*cento|bilh[oõ]es?|milh[oõ]es?|mil\b|anos?|km|m\b|volts?|reais|R\$)/i;
const COMPARISON_RE =
  /\b(maior|menor|versus|vs\.?|comparad[oa]|dobro|triplo|supera|ultrapassa)\b/i;
const LOCATION_RE =
  /\b(?:em|na|no|de)\s+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][a-záàâãéèêíìîóòôõúùûç]+){0,3})\b/;
const MAP_KEYWORDS =
  /\b(mapa|google\s*maps|sat[eé]lite|a[eé]reo|aerial|fortaleza|castelo|cidade|regi[aã]o|pa[ií]s|continente|amaz[oô]nia|deserto|oceano)\b/i;
const CURIOSITY_RE =
  /\b(chocante|incr[ií]vel|segredo|enigma|mist[eé]rio|nunca|ningu[eé]m|descobr|revela|imposs[ií]vel|absurdo)\b/i;
const HISTORICAL_RE =
  /\b(em\s+\d{3,4}|s[eé]culo|antig[oa]s?|imp[eé]rio|dinastia|guerra|revolu[cç][aã]o)\b/i;

const KNOWN_PLACES = [
  {
    pattern: /palmanova|forte estelar|fortaleza estelar/i,
    location: "Palmanova",
    region: "Vêneto",
    country: "Itália",
  },
  {
    pattern: /bourtange/i,
    location: "Fort Bourtange",
    region: "Groningen",
    country: "Países Baixos",
  },
  {
    pattern: /amaz[oô]nia/i,
    location: "Amazônia",
    region: "Norte",
    country: "Brasil",
  },
  { pattern: /brasil/i, location: "Brasil", region: "", country: "Brasil" },
  {
    pattern: /egito|pir[aâ]mide/i,
    location: "Egito",
    region: "",
    country: "Egito",
  },
  {
    pattern: /roma|romanos?/i,
    location: "Roma",
    region: "Lácio",
    country: "Itália",
  },
  {
    pattern: /google\s*maps/i,
    location: "Local no mapa",
    region: "",
    country: "",
  },
];

export function classifyNarrationSegment(text = "") {
  const t = String(text || "").trim();
  if (!t || t.length < 8) return null;

  if (STAT_RE.test(t) && COMPARISON_RE.test(t)) {
    return { trigger: "comparison", confidence: 0.78 };
  }

  if (STAT_RE.test(t)) {
    return { trigger: "stat_number", confidence: 0.85 };
  }

  if (MAP_KEYWORDS.test(t) || KNOWN_PLACES.some((p) => p.pattern.test(t))) {
    return { trigger: "location", confidence: 0.82 };
  }

  const locMatch = t.match(LOCATION_RE);
  if (locMatch && locMatch[1] && locMatch[1].length > 3) {
    return { trigger: "location", confidence: 0.7, place: locMatch[1] };
  }

  if (CURIOSITY_RE.test(t) && t.length < 120) {
    return { trigger: "curiosity_punch", confidence: 0.68 };
  }

  if (HISTORICAL_RE.test(t) && YEAR_RE.test(t)) {
    return { trigger: "historical_fact", confidence: 0.75 };
  }

  const years = [...t.matchAll(YEAR_GLOBAL_RE)].map((m) => m[1]);
  if (years.length >= 2) {
    return { trigger: "timeline_date", confidence: 0.72, years };
  }

  if (YEAR_RE.test(t) && /\b(ano|data|em)\b/i.test(t)) {
    return { trigger: "historical_fact", confidence: 0.65 };
  }

  return null;
}

function parseStatValue(text) {
  const m = String(text).match(
    /(\d{1,3}(?:[.,]\d+)?)\s*(%|por\s*cento|bilh[oõ]es?|milh[oõ]es?|mil\b)?/i
  );
  if (!m) return { value: 0, suffix: "", label: "DADO" };
  let value = Number(String(m[1]).replace(",", "."));
  const unit = String(m[2] || "").toLowerCase();
  let suffix = "";
  if (unit.includes("%") || unit.includes("cento")) suffix = "%";
  else if (unit.includes("bilh")) {
    value *= 1e9;
    suffix = "";
  } else if (unit.includes("milh")) {
    value *= 1e6;
  }
  const label = text.slice(0, 48).replace(/\d+/g, "").trim() || "IMPACTO";
  return {
    value: Math.round(value),
    suffix,
    label: label.toUpperCase().slice(0, 32),
  };
}

function resolvePlace(text) {
  for (const p of KNOWN_PLACES) {
    if (p.pattern.test(text)) return p;
  }
  const m = text.match(LOCATION_RE);
  if (m?.[1]) {
    return { location: m[1], region: "", country: "" };
  }
  return { location: "Local", region: "", country: "" };
}

export function buildPropsForTemplate(
  templateId,
  trigger,
  text,
  accentColor = "#D4AF37"
) {
  const t = String(text || "").trim();

  switch (templateId) {
    case "counter": {
      const { value, suffix, label } = parseStatValue(t);
      return {
        value: value || 100,
        label,
        suffix,
        position: "center",
        theme: "minimal",
        accentColor,
      };
    }
    case "bar-chart":
      return {
        title: "COMPARAÇÃO",
        items: [
          { label: "A", value: 72 },
          { label: "B", value: 54 },
          { label: "C", value: 38 },
        ],
        position: "center",
        theme: "minimal",
        accentColor,
      };
    case "pictogram-chart":
      return {
        title: "DADOS",
        icon: "compass",
        source: "Fonte: narração",
        segments: [
          { label: "Principal", value: 45, color: accentColor },
          { label: "Secundário", value: 30, color: "#78909C" },
          { label: "Outros", value: 25, color: "#455A64" },
        ],
      };
    case "location-intro": {
      const place = resolvePlace(t);
      return {
        location: place.location,
        region: place.region,
        country: place.country,
        variant: "satellite",
        accentColor: "#FFFFFF",
        zoom_from: 8,
        zoom_to: 14,
        map_style: "satellite",
      };
    }
    case "geo-map": {
      const place = resolvePlace(t);
      return {
        location: place.location,
        region: place.region || place.country,
        accentColor: "#00E5FF",
        position: "bottom-right",
      };
    }
    case "timeline": {
      const years = [...t.matchAll(YEAR_GLOBAL_RE)].map((m) => m[1]);
      const events =
        years.length >= 2
          ? years.slice(0, 4).map((y, i) => ({
              year: y,
              label:
                i === 0 ? "Início" : i === years.length - 1 ? "Atual" : "Marco",
            }))
          : [{ year: "—", label: t.slice(0, 40) }];
      return { title: "CRONOLOGIA", events, position: "bottom-center" };
    }
    case "lower-third": {
      const year = YEAR_RE.exec(t)?.[1] || "";
      return {
        title: year ? `Em ${year}` : "FATO HISTÓRICO",
        subtitle: t.slice(0, 80),
        variant: "glass",
        position: "bottom-left",
        theme: "ancient",
        accentColor,
      };
    }
    case "kinetic-text":
      return {
        text: t.split(/[.!?]/)[0].slice(0, 60).toUpperCase() || "REVELAÇÃO",
        position: "center",
        theme: "minimal",
        accentColor,
      };
    default:
      return { title: t.slice(0, 40), accentColor };
  }
}

export function resolveNichePack(config = {}, storyboard = {}) {
  const fromConfig = String(config.motion_niche_pack || "").trim();
  if (fromConfig) return fromConfig;
  const niche = String(
    config.niche || storyboard?.strategy?.niche || ""
  ).trim();
  const alias = resolvePackByAlias(niche);
  if (alias) return alias;
  const cat = detectNicheCategory(niche);
  if (cat === "history") return "documentary-prestige";
  if (cat === "nature") return "geography-explorer";
  if (cat === "finance" || cat === "tech") return "data-journalist";
  if (cat === "industrial") return "industrial-impact";
  return "documentary-prestige";
}

function sceneStartHint(vp, blockTimings = {}) {
  if (Number.isFinite(Number(vp?.speech_start))) return Number(vp.speech_start);
  if (Number.isFinite(Number(vp?.asset?.audio_start)))
    return Number(vp.asset.audio_start);
  const block = Number(vp?.block) || 1;
  const starts = blockTimings.starts || [];
  const idx = Math.max(0, block - 1);
  return Number(starts[idx]) || 0;
}

/**
 * Gera motion_scenes[] a partir de visual_prompts do storyboard.
 */
export function planMotionScenesFromStoryboard(
  storyboard = {},
  config = {},
  blockTimings = {}
) {
  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  const nichePack = resolveNichePack(config, storyboard);
  const accentColor = String(config.accent_color || "#D4AF37");
  const scenes = [];
  const usedTriggers = new Set();

  for (const vp of visualPrompts) {
    const narration = String(
      vp.narration_text || vp.asset?.narration_segment || ""
    ).trim();
    if (!narration) continue;

    const classified = classifyNarrationSegment(narration);
    if (!classified || classified.confidence < 0.65) continue;

    const trigger = classified.trigger;
    const templateId = pickTemplateForTrigger(trigger, nichePack);
    const layout = resolveLayoutForTemplate(templateId, trigger);

    const dedupeKey = `${trigger}-${templateId}-${vp.scene || vp.block}`;
    if (usedTriggers.has(dedupeKey)) continue;
    usedTriggers.add(dedupeKey);

    const duration =
      Number(vp.duration_seconds) > 0
        ? Math.min(
            Number(vp.duration_seconds),
            DEFAULT_DURATIONS[templateId] || 4
          )
        : DEFAULT_DURATIONS[templateId] || 4;

    const triggerMeta = MOTION_SCENE_TRIGGERS[trigger] || {};

    scenes.push({
      id: `ms-${String(vp.scene || vp.block || scenes.length + 1).replace(/\s/g, "")}`,
      scene_ref: String(vp.scene || ""),
      block: Number(vp.block) || 1,
      start_hint: sceneStartHint(vp, blockTimings),
      duration_seconds: duration,
      layout,
      template_id: templateId,
      trigger,
      confidence: classified.confidence,
      props: buildPropsForTemplate(templateId, trigger, narration, accentColor),
      narration_text: narration,
      media_mode: "remotion",
      niche_pack: nichePack,
      rve_ref: triggerMeta.rveRef || null,
      remotion_ref: triggerMeta.remotionRef || null,
      pip:
        layout === "pip"
          ? { position: "bottom-right", background: "stock_or_satellite" }
          : null,
    });
  }

  return {
    motion_scenes: scenes,
    niche_pack: nichePack,
    planned_at: new Date().toISOString(),
    planner_version: 1,
    source: "heuristic",
  };
}

export function clipsTimeOverlap(a, b, epsilon = 0.35) {
  const aStart = Number(a?.start) || 0;
  const aEnd = aStart + (Number(a?.duration) || 0);
  const bStart = Number(b?.start) || 0;
  const bEnd = bStart + (Number(b?.duration) || 0);
  return aStart < bEnd - epsilon && bStart < aEnd - epsilon;
}

export function isPrimaryRemotionMotionScene(ms = {}) {
  if (ms.media_mode !== "remotion") return false;
  const layout = String(ms.layout || "").trim();
  if (layout === "fullscreen") return true;
  return FULLSCREEN_TEMPLATES.has(String(ms.template_id || ""));
}

export function motionScenesToVideoClips(motionScenes = []) {
  return (Array.isArray(motionScenes) ? motionScenes : [])
    .filter(isPrimaryRemotionMotionScene)
    .map((ms, i) => ({
      id: String(ms.id || `motion-v-${i + 1}`),
      trackId: "video",
      start: Math.max(0, Number(ms.start_hint) || 0),
      duration: Math.max(0.5, Number(ms.duration_seconds) || 4),
      label: String(
        ms.props?.location ||
          ms.props?.label ||
          ms.props?.text ||
          ms.props?.title ||
          ms.template_id
      ),
      templateId: ms.template_id,
      props: {
        ...(ms.props || {}),
        media_mode: "remotion",
        motion_scene: true,
        scene_ref: String(ms.scene_ref || ""),
        block: Number(ms.block) || 1,
        layout: ms.layout || "fullscreen",
        trigger: ms.trigger,
      },
      color: "#6A1B9A",
      motionScene: true,
      motionScenePrimary: true,
    }));
}

export function motionScenesToOverlayClips(motionScenes = []) {
  return (Array.isArray(motionScenes) ? motionScenes : [])
    .filter((ms) => !isPrimaryRemotionMotionScene(ms))
    .map((ms, i) => ({
      id: String(ms.id || `motion-${i + 1}`),
      trackId: "overlays",
      start: Math.max(0, Number(ms.start_hint) || 0),
      duration: Math.max(0.5, Number(ms.duration_seconds) || 4),
      label: String(
        ms.props?.location ||
          ms.props?.label ||
          ms.props?.text ||
          ms.props?.title ||
          ms.template_id
      ),
      templateId: ms.template_id,
      props: {
        ...(ms.props || {}),
        overlayType: ms.template_id,
        motion_scene: true,
        layout: ms.layout || "fullscreen",
        trigger: ms.trigger,
      },
      color: "#00897B",
      motionScene: true,
    }));
}

export function applyMotionScenesToVisualPrompts(
  storyboard = {},
  motionScenes = []
) {
  const scenes = Array.isArray(motionScenes) ? motionScenes : [];
  const bySceneRef = new Map(
    scenes
      .filter((ms) => isPrimaryRemotionMotionScene(ms) && ms.scene_ref)
      .map((ms) => [String(ms.scene_ref), ms])
  );
  if (!bySceneRef.size) return storyboard;

  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts.map((vp) => {
        const ref = String(vp.scene || vp.scene_ref || "").trim();
        const ms = ref ? bySceneRef.get(ref) : null;
        if (!ms) return vp;
        return {
          ...vp,
          media_mode: "remotion",
          motion_scene_id: ms.id,
          motion_template_id: ms.template_id,
        };
      })
    : [];

  return { ...storyboard, visual_prompts: visualPrompts };
}

export function syncMotionScenesToStudio(studio, motionScenes = []) {
  if (!studio || !Array.isArray(studio.clips)) return studio;

  const videoClips = motionScenesToVideoClips(motionScenes);
  const overlayClips = motionScenesToOverlayClips(motionScenes);
  if (!videoClips.length && !overlayClips.length) return studio;

  const withoutMotion = studio.clips.filter(
    (c) => !c.motionScene && !c.props?.motion_scene
  );

  const withoutReplacedVideo = withoutMotion.filter((clip) => {
    if (clip.trackId !== "video" || !videoClips.length) return true;
    return !videoClips.some((rv) => clipsTimeOverlap(clip, rv));
  });

  const merged = [...withoutReplacedVideo, ...videoClips, ...overlayClips].sort(
    (a, b) => (Number(a.start) || 0) - (Number(b.start) || 0)
  );
  return { ...studio, clips: merged, updatedAt: new Date().toISOString() };
}
