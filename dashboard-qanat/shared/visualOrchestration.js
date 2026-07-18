/**
 * Contrato visual_orchestration do NARRADORPRO → motion scenes / policy.
 */

import {
  applyStudioRoleToScene,
  catalogCategoryForRole,
} from "./studioTemplateRoles.js";
import { enrichStudioTemplateScene } from "./studioTemplatePropsBinder.js";

const PLACEMENT_KINDS = new Set([
  "chart",
  "quote",
  "lower_third",
  "text_overlay",
  "content_animation",
  "background",
  "media_layout",
]);

/**
 * Normaliza JSON (string ou objeto) de visual_orchestration.
 */
export function normalizeVisualOrchestration(raw = null) {
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;

  const chapters = Array.isArray(data.chapters)
    ? data.chapters
        .map((c) => ({
          block: Math.max(1, Number(c.block) || 1),
          title: String(c.title || "").trim(),
          start_hint_sec: Number(c.start_hint_sec) || 0,
        }))
        .filter((c) => c.title)
    : [];

  const placements = Array.isArray(data.placements)
    ? data.placements.map((p, i) => normalizePlacement(p, i)).filter(Boolean)
    : [];

  const avoid = Array.isArray(data.avoid)
    ? data.avoid.map((a) => String(a || "").trim()).filter(Boolean)
    : [];

  return {
    niche: String(data.niche || "").trim(),
    format: String(data.format || "")
      .trim()
      .toLowerCase(),
    chapters,
    placements,
    avoid,
    source: String(data.source || "narradorpro").trim(),
  };
}

function normalizePlacement(p = {}, index = 0) {
  const kind = String(p.kind || p.role || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (!PLACEMENT_KINDS.has(kind) && kind !== "background_frame") return null;

  const role = kind === "background" ? "background_frame" : kind;
  const anchor = p.anchor && typeof p.anchor === "object" ? p.anchor : {};
  const data = p.data && typeof p.data === "object" ? p.data : {};

  return {
    id: String(p.id || `vo-${role}-${index + 1}`),
    kind: role,
    reason: String(p.reason || "").trim(),
    preferred_subcategories: Array.isArray(p.preferred_subcategories)
      ? p.preferred_subcategories.map((s) => String(s).trim())
      : [],
    anchor: {
      type: String(anchor.type || "block").toLowerCase(),
      block: Number(anchor.block) || 1,
      text: String(anchor.text || "").trim(),
      start: Number.isFinite(Number(anchor.start))
        ? Number(anchor.start)
        : null,
      duration: Number.isFinite(Number(anchor.duration))
        ? Number(anchor.duration)
        : null,
    },
    data,
  };
}

/**
 * Extrai visual_orchestration de storyboard/config/parsed narrador.
 */
export function resolveVisualOrchestration(storyboard = {}, config = {}) {
  return (
    normalizeVisualOrchestration(storyboard.visual_orchestration) ||
    normalizeVisualOrchestration(config.visual_orchestration) ||
    normalizeVisualOrchestration(
      storyboard.narradorpro?.visual_orchestration
    ) ||
    null
  );
}

/**
 * Converte placements do NARRADORPRO em motion scenes Studio.
 */
export function injectNarradorProPlacements({
  scenes = [],
  visualOrchestration = null,
  visualPrompts = [],
  blockTimings = {},
  config = {},
  studioNiche = "",
  aspectRatio = "16:9",
  accentColor = "#D4AF37",
  nichePack = "",
  researchContext = {},
  preferredStudioIds = [],
  pickStudioTemplateByCategory,
} = {}) {
  const vo = normalizeVisualOrchestration(visualOrchestration);
  if (!vo?.placements?.length) {
    return { scenes: [...scenes], injected: [] };
  }
  if (typeof pickStudioTemplateByCategory !== "function" || !studioNiche) {
    return { scenes: [...scenes], injected: [] };
  }

  const previousStudioIds = scenes
    .map((s) => String(s.props?.template_studio_id || "").trim())
    .filter(Boolean);
  const previousStudioCategories = scenes
    .map((s) => String(s.props?.template_studio_category || "").trim())
    .filter(Boolean);

  const injected = [];
  let result = [...scenes];

  for (const placement of vo.placements) {
    if (vo.avoid.some((a) => a.includes(placement.kind))) continue;

    const category = catalogCategoryForRole(placement.kind);
    const narration =
      placement.anchor.text ||
      placement.data.quote ||
      placement.data.title ||
      placement.data.label ||
      blockNarration(visualPrompts, placement.anchor.block);

    const studioPick = pickStudioTemplateByCategory({
      category,
      role: placement.kind,
      niche: studioNiche,
      aspectRatio,
      preferredStudioIds,
      previousStudioIds,
      previousStudioCategories,
      scene: {
        narration_text: narration,
        block: placement.anchor.block,
        props: { ...placement.data },
      },
      researchContext,
      config,
      motionTemplateId: "studio-runtime",
      requiredSubcategoryHint: placement.preferred_subcategories[0] || "",
    });
    if (!studioPick?.studio_source_code) continue;

    const startHint = resolvePlacementStart(
      placement,
      visualPrompts,
      blockTimings
    );
    const duration =
      placement.anchor.duration || (placement.kind === "lower_third" ? 4 : 5);

    let scene = {
      id: `ms-narrador-${placement.id}`,
      scene_ref: `block-${placement.anchor.block}`,
      block: placement.anchor.block,
      start_hint: startHint,
      duration_seconds: duration,
      layout: placement.kind === "lower_third" ? "pip" : "fullscreen",
      template_id: studioPick.motion_template_id || "studio-runtime",
      trigger: placement.kind,
      confidence: 0.88,
      props: {
        aspect_ratio: aspectRatio,
        presentation: placement.kind === "lower_third" ? "pip" : "fullscreen",
        layout: placement.kind === "lower_third" ? "pip" : "fullscreen",
        accentColor,
        ...flattenPlacementData(placement),
        template_studio_id: studioPick.id,
        template_studio_name: studioPick.name,
        template_studio_category: studioPick.category,
        template_studio_subcategory: studioPick.subcategory,
        template_studio_motion_template_id: studioPick.motion_template_id,
        template_studio_data_slots: Array.isArray(studioPick.dataSlots)
          ? studioPick.dataSlots
          : [],
        studio_source_code: studioPick.studio_source_code,
      },
      narration_text: narration,
      media_mode: "remotion",
      niche_pack: nichePack,
      source: "narradorpro_placement",
      narrador_placement: placement.kind,
    };

    scene = enrichStudioTemplateScene(scene, {
      template: studioPick,
      researchContext,
      config,
    });
    scene = applyStudioRoleToScene(scene, studioPick);

    result = result.filter((s) => s.id !== scene.id);
    result.push(scene);
    injected.push(scene);
    previousStudioIds.push(studioPick.id);
    if (studioPick.category) previousStudioCategories.push(studioPick.category);
  }

  result.sort(
    (a, b) => (Number(a.start_hint) || 0) - (Number(b.start_hint) || 0)
  );
  return { scenes: result, injected };
}

function flattenPlacementData(placement = {}) {
  const d = placement.data || {};
  const out = { ...d };
  if (d.quote) {
    out.quote = d.quote;
    out.text = d.quote;
    out.title = d.quote.slice(0, 60);
  }
  if (d.attribution) out.attribution = d.attribution;
  if (d.value != null) out.value = d.value;
  if (d.unit) out.suffix = d.unit;
  if (d.label) out.label = d.label;
  if (d.title) out.title = d.title;
  if (d.subtitle) out.subtitle = d.subtitle;
  return out;
}

function blockNarration(visualPrompts = [], block = 1) {
  return (visualPrompts || [])
    .filter((vp) => Number(vp.block) === block)
    .map((vp) =>
      String(vp.narration_text || vp.asset?.narration_segment || "").trim()
    )
    .filter(Boolean)
    .join(" ")
    .slice(0, 220);
}

function resolvePlacementStart(placement, visualPrompts, blockTimings) {
  if (placement.anchor.start != null)
    return Math.max(0, placement.anchor.start);
  if (placement.anchor.type === "narration_span" && placement.anchor.text) {
    const needle = placement.anchor.text.slice(0, 40).toLowerCase();
    for (const vp of visualPrompts || []) {
      const n = String(
        vp.narration_text || vp.asset?.narration_segment || ""
      ).toLowerCase();
      if (n.includes(needle)) {
        if (Number.isFinite(Number(vp.speech_start)))
          return Number(vp.speech_start);
        if (Number.isFinite(Number(vp.asset?.audio_start)))
          return Number(vp.asset.audio_start);
      }
    }
  }
  const block = placement.anchor.block || 1;
  const starts = blockTimings.starts || [];
  const idx = Math.max(0, block - 1);
  if (Number.isFinite(Number(starts[idx]))) return Number(starts[idx]);
  const vp = (visualPrompts || []).find((v) => Number(v.block) === block);
  if (Number.isFinite(Number(vp?.speech_start))) return Number(vp.speech_start);
  return 0;
}

/** Prompt fragment for NARRADORPRO / script rewrite. */
export const VISUAL_ORCHESTRATION_PROMPT_FRAGMENT = `
OPCIONAL — orquestração visual (visual_orchestration):
Se houver números, citações, nomes de lugares/pessoas ou etapas claras, inclua:
{
  "visual_orchestration": {
    "chapters": [{ "block": 1, "title": "…", "start_hint_sec": 0 }],
    "placements": [
      {
        "kind": "chart|quote|lower_third|text_overlay|content_animation|background",
        "reason": "por que o template ajuda",
        "anchor": { "type": "block|time|narration_span", "block": 1, "text": "trecho", "start": 12.4, "duration": 4 },
        "data": { "value": 42, "unit": "%", "label": "…", "quote": "…", "attribution": "…" },
        "preferred_subcategories": ["Stat Counter"]
      }
    ],
    "avoid": ["credits_roll_generic", "fake_stats"]
  }
}
Regras: só coloque placement se o dado for real na narração; quote opcional; lower_third para nome/lugar; chart só com número verificado.
`.trim();
