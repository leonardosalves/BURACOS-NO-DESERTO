/**
 * Policy de templates na área de Render + presets de canal.
 * Controla intro, end card, chapter, effects, subscribe mid, frame, etc.
 */

export const RENDER_TEMPLATE_POLICY_PRESETS = {
  legacy: {
    id: "legacy",
    label: "Legado",
    description: "Comportamento atual: sem camadas extras de policy.",
    policy: {
      mode: "legacy",
      effects: { enabled: false, selection: "off" },
      intro: { enabled: false, template_id: "auto" },
      end_card: {
        enabled: false,
        template_id: "auto",
        replace_brand_outro: true,
      },
      chapter_title: {
        enabled: false,
        template_id: "auto",
        source: "auto",
      },
      subscribe_mid: { enabled: false, position: "mid", percent: 0.5 },
      frame: { enabled: false, template_id: "auto" },
      media_layouts: { enabled: false, selection: "off" },
      transitions: { enabled: false, selection: "off" },
      overlay_budget: { max_coverage: 0.35, max_dense_per_minute: 4 },
    },
  },
  "doc-engenharia": {
    id: "doc-engenharia",
    label: "Documental Engenharia",
    description: "Efeitos sutis, chapters, charts; end card opcional off.",
    policy: {
      mode: "smart",
      effects: {
        enabled: true,
        selection: "auto",
        intensity: "subtle",
      },
      intro: { enabled: false, template_id: "auto" },
      end_card: {
        enabled: false,
        template_id: "auto",
        replace_brand_outro: true,
      },
      chapter_title: {
        enabled: true,
        template_id: "auto",
        source: "auto",
      },
      subscribe_mid: { enabled: false, position: "mid", percent: 0.5 },
      frame: { enabled: false, template_id: "auto" },
      media_layouts: { enabled: true, selection: "auto" },
      transitions: { enabled: true, selection: "auto" },
      overlay_budget: { max_coverage: 0.28, max_dense_per_minute: 3 },
    },
  },
  "shorts-curiosidade": {
    id: "shorts-curiosidade",
    label: "Shorts curiosidade",
    description: "Subscribe no meio, efeitos leves, sem chapter.",
    policy: {
      mode: "smart",
      effects: {
        enabled: true,
        selection: "auto",
        intensity: "subtle",
      },
      intro: { enabled: false, template_id: "auto" },
      end_card: {
        enabled: false,
        template_id: "auto",
        replace_brand_outro: true,
      },
      chapter_title: {
        enabled: false,
        template_id: "auto",
        source: "auto",
      },
      subscribe_mid: { enabled: true, position: "mid", percent: 0.5 },
      frame: { enabled: false, template_id: "auto" },
      media_layouts: { enabled: true, selection: "auto" },
      transitions: { enabled: false, selection: "off" },
      overlay_budget: { max_coverage: 0.4, max_dense_per_minute: 6 },
    },
  },
  smart: {
    id: "smart",
    label: "Inteligente (completo)",
    description: "Policy smart com auto em efeitos, mídia e transitions.",
    policy: {
      mode: "smart",
      effects: {
        enabled: true,
        selection: "auto",
        intensity: "normal",
      },
      intro: { enabled: false, template_id: "auto" },
      end_card: {
        enabled: false,
        template_id: "auto",
        replace_brand_outro: true,
      },
      chapter_title: {
        enabled: true,
        template_id: "auto",
        source: "auto",
      },
      subscribe_mid: { enabled: true, position: "mid", percent: 0.5 },
      frame: { enabled: false, template_id: "auto" },
      media_layouts: { enabled: true, selection: "auto" },
      transitions: { enabled: true, selection: "auto" },
      overlay_budget: { max_coverage: 0.32, max_dense_per_minute: 4 },
    },
  },
};

/** Default do produto: Legado — sem camadas extras na timeline Timing. */
const DEFAULT_POLICY = RENDER_TEMPLATE_POLICY_PRESETS.legacy.policy;

function asBool(value, fallback = false) {
  if (value === true || value === false) return value;
  return fallback;
}

function asSelection(value, fallback = "auto") {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (v === "auto" || v === "manual" || v === "off") return v;
  return fallback;
}

function hasOwn(obj, key) {
  return (
    obj &&
    typeof obj === "object" &&
    Object.prototype.hasOwnProperty.call(obj, key)
  );
}

/**
 * Normaliza e preenche defaults de render_template_policy.
 * Defaults dependem do aspect ratio quando o campo não veio no raw.
 */
export function normalizeRenderTemplatePolicy(raw = {}, aspectRatio = "16:9") {
  const input = raw && typeof raw === "object" ? raw : {};
  const isShort = String(aspectRatio || "") === "9:16";
  // Default LEGADO quando o projeto ainda não tem policy (evita encher Timing de Remotion)
  const rawMode = String(input.mode || "")
    .trim()
    .toLowerCase();
  const mode = rawMode === "smart" ? "smart" : "legacy";

  const effectsIn = input.effects || {};
  const effects = {
    enabled: asBool(
      effectsIn.enabled,
      hasOwn(effectsIn, "enabled") ? false : mode === "smart"
    ),
    selection: asSelection(effectsIn.selection, "auto"),
    template_id: effectsIn.template_id || undefined,
    intensity: ["subtle", "normal", "strong"].includes(effectsIn.intensity)
      ? effectsIn.intensity
      : "normal",
  };

  const introIn = input.intro || {};
  const intro = {
    enabled: asBool(introIn.enabled, false),
    template_id: introIn.template_id || "auto",
  };

  const endIn = input.end_card || {};
  const end_card = {
    enabled: asBool(endIn.enabled, false),
    template_id: endIn.template_id || "auto",
    replace_brand_outro: asBool(endIn.replace_brand_outro, true),
  };

  const chapterIn = input.chapter_title || {};
  const chapter_title = {
    enabled: asBool(
      chapterIn.enabled,
      hasOwn(chapterIn, "enabled") ? false : !isShort && mode === "smart"
    ),
    template_id: chapterIn.template_id || "auto",
    source: ["youtube_chapters", "narrador_blocks", "auto"].includes(
      chapterIn.source
    )
      ? chapterIn.source
      : "auto",
  };

  const subIn = input.subscribe_mid || {};
  const subscribe_mid = {
    enabled: asBool(
      subIn.enabled,
      hasOwn(subIn, "enabled") ? false : isShort && mode === "smart"
    ),
    position: subIn.position === "percent" ? "percent" : "mid",
    percent: Number.isFinite(Number(subIn.percent))
      ? Math.min(0.9, Math.max(0.1, Number(subIn.percent)))
      : 0.5,
  };

  const frameIn = input.frame || {};
  const frame = {
    enabled: asBool(frameIn.enabled, false),
    template_id: frameIn.template_id || "auto",
  };

  const mediaIn = input.media_layouts || {};
  const media_layouts = {
    enabled: asBool(
      mediaIn.enabled,
      hasOwn(mediaIn, "enabled") ? false : mode === "smart"
    ),
    selection: asSelection(mediaIn.selection, "auto"),
  };

  const transIn = input.transitions || {};
  const transitions = {
    enabled: asBool(
      transIn.enabled,
      hasOwn(transIn, "enabled") ? false : mode === "smart" && !isShort
    ),
    selection: asSelection(transIn.selection, "auto"),
  };

  const budgetIn = input.overlay_budget || {};
  const overlay_budget = {
    max_coverage: Number.isFinite(Number(budgetIn.max_coverage))
      ? Math.min(0.8, Math.max(0.05, Number(budgetIn.max_coverage)))
      : DEFAULT_POLICY.overlay_budget.max_coverage,
    max_dense_per_minute: Number.isFinite(Number(budgetIn.max_dense_per_minute))
      ? Math.max(1, Math.round(Number(budgetIn.max_dense_per_minute)))
      : DEFAULT_POLICY.overlay_budget.max_dense_per_minute,
  };

  if (mode === "legacy") {
    return {
      mode: "legacy",
      preset_id: String(input.preset_id || "legacy"),
      effects: { ...effects, enabled: false, selection: "off" },
      intro: { ...intro, enabled: false },
      end_card: { ...end_card, enabled: false },
      chapter_title: { ...chapter_title, enabled: false },
      subscribe_mid: { ...subscribe_mid, enabled: false },
      frame: { ...frame, enabled: false },
      media_layouts: { ...media_layouts, enabled: false, selection: "off" },
      transitions: { ...transitions, enabled: false, selection: "off" },
      overlay_budget,
    };
  }

  return {
    mode,
    preset_id: String(
      input.preset_id || (mode === "legacy" ? "legacy" : "smart")
    ),
    template_niche: String(input.template_niche || "").trim() || undefined,
    effects,
    intro,
    end_card,
    chapter_title,
    subscribe_mid,
    frame,
    media_layouts,
    transitions,
    overlay_budget,
  };
}

export function resolveRenderTemplatePolicy(config = {}, aspectRatio = "") {
  const ar = aspectRatio || config.aspect_ratio || config.format || "16:9";
  return normalizeRenderTemplatePolicy(config.render_template_policy || {}, ar);
}

export function applyRenderTemplatePreset(
  presetId = "legacy",
  aspectRatio = "16:9"
) {
  const preset =
    RENDER_TEMPLATE_POLICY_PRESETS[presetId] ||
    RENDER_TEMPLATE_POLICY_PRESETS.legacy;
  return normalizeRenderTemplatePolicy(
    { ...preset.policy, preset_id: preset.id },
    aspectRatio
  );
}

export function listRenderTemplatePresets() {
  return Object.values(RENDER_TEMPLATE_POLICY_PRESETS).map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
  }));
}

/** Detecta asset de brand outro (logo final / endscreen). */
export function isBrandOutroAsset(assetPath = "") {
  const p = String(assetPath || "").toLowerCase();
  if (!p) return false;
  return (
    p.includes("logo_final_") ||
    p.includes("logo.") ||
    p.includes("/logo") ||
    p.includes("endscreen") ||
    p.includes("end_screen") ||
    p.includes("inscreva")
  );
}

/**
 * Valida composição antes do render (end card vs logo, etc.).
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateRenderTemplateComposition({
  policy = null,
  scenes = [],
  motionScenes = [],
  config = {},
} = {}) {
  const errors = [];
  const warnings = [];
  const p =
    policy ||
    resolveRenderTemplatePolicy(config, config.aspect_ratio || config.format);

  if (p.mode === "legacy") {
    return { ok: true, errors, warnings };
  }

  if (p.end_card.enabled && p.end_card.replace_brand_outro) {
    const logoScenes = (Array.isArray(scenes) ? scenes : []).filter((s) =>
      isBrandOutroAsset(s?.asset || s?.file || s?.path || "")
    );
    const hasEndCard = (Array.isArray(motionScenes) ? motionScenes : []).some(
      (ms) =>
        String(ms.props?.studio_role || "").toLowerCase() === "end_card" ||
        /end\s*card/i.test(String(ms.props?.template_studio_subcategory || ""))
    );
    if (logoScenes.length && hasEndCard) {
      errors.push(
        "End Card ativo: remova o logo_final_/endscreen da timeline ou desative o End Card."
      );
    } else if (logoScenes.length && p.end_card.enabled) {
      warnings.push(
        "End Card ligado: o brand outro (logo final) deve ser omitido no render."
      );
    }
  }

  if (p.frame.enabled) {
    const hasFrame = (Array.isArray(motionScenes) ? motionScenes : []).some(
      (ms) =>
        String(ms.props?.studio_role || "") === "identity_frame" ||
        String(ms.props?.template_studio_category || "").toLowerCase() ===
          "frame"
    );
    if (!hasFrame) {
      warnings.push(
        "Frame de identidade ligado, mas nenhum template frame do nicho foi encontrado."
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Orçamento de overlays densos: filtra cenas se cobertura exceder policy.
 */
export function enforceOverlayBudget(
  scenes = [],
  policy = null,
  totalDurationSec = 0
) {
  const p = policy || DEFAULT_POLICY;
  const budget = p.overlay_budget || DEFAULT_POLICY.overlay_budget;
  const list = Array.isArray(scenes) ? [...scenes] : [];
  if (!list.length) return list;

  const duration =
    totalDurationSec > 0
      ? totalDurationSec
      : Math.max(
          ...list.map(
            (s) =>
              (Number(s.start_hint) || 0) + (Number(s.duration_seconds) || 0)
          ),
          1
        );

  const denseRoles = new Set([
    "chart",
    "content_animation",
    "text_overlay",
    "quote",
    "media_layout",
    "overlay",
    "lower_third",
  ]);

  // Só aplica budget a cenas Studio com role denso explícito.
  // Cenas nativas (counter/location-intro) sem studio_role não contam.
  const dense = list.filter((s) => {
    const role = String(s.props?.studio_role || "").trim();
    return role && denseRoles.has(role);
  });
  const denseDuration = dense.reduce(
    (sum, s) => sum + (Number(s.duration_seconds) || 0),
    0
  );
  const coverage = denseDuration / Math.max(duration, 1);
  const maxPerMin = budget.max_dense_per_minute || 4;
  const maxCount = Math.max(1, Math.ceil((duration / 60) * maxPerMin));

  if (coverage <= budget.max_coverage && dense.length <= maxCount) {
    return list;
  }

  const ranked = dense
    .map((s, i) => ({
      s,
      i,
      score:
        (Number(s.confidence) || 0) * 10 +
        (Number(s.props?.studio_props_meta?.confidence) || 0) * 5 +
        (s.props?.template_studio_id ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const keepIds = new Set(
    ranked.slice(0, maxCount).map((entry) => entry.s.id || entry.i)
  );
  return list.filter((s, i) => {
    const role = String(s.props?.studio_role || "").trim();
    if (!role || !denseRoles.has(role)) return true;
    return keepIds.has(s.id || i);
  });
}
