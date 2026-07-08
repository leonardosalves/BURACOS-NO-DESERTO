/**
 * Catálogo de cenas Remotion planejáveis pela IA.
 * Mapeia triggers → templates Lumiera + referências RVE/Remotion upstream.
 */

export const MOTION_SCENE_TRIGGERS = {
  stat_number: {
    id: "stat_number",
    label: "Dado numérico",
    templates: ["counter", "bar-chart"],
    defaultTemplate: "counter",
    layout: "fullscreen",
    rveRef: "circular-progress",
    remotionRef: "audiogram",
  },
  comparison: {
    id: "comparison",
    label: "Comparação",
    templates: ["bar-chart", "pictogram-chart"],
    defaultTemplate: "bar-chart",
    layout: "fullscreen",
    rveRef: "chart-animation",
    remotionRef: "d3-example",
  },
  location: {
    id: "location",
    label: "Lugar / cidade",
    templates: ["location-intro", "geo-map"],
    defaultTemplate: "location-intro",
    layout: "fullscreen",
    rveRef: null,
    remotionRef: "mapbox-example",
  },
  region_pin: {
    id: "region_pin",
    label: "Pin regional",
    templates: ["geo-map"],
    defaultTemplate: "geo-map",
    layout: "fullscreen",
    rveRef: null,
    remotionRef: "mapbox-example",
  },
  timeline_date: {
    id: "timeline_date",
    label: "Cronologia / datas",
    templates: ["timeline"],
    defaultTemplate: "timeline",
    layout: "fullscreen",
    rveRef: "line-chart",
    remotionRef: "typewriter",
  },
  historical_fact: {
    id: "historical_fact",
    label: "Fato histórico",
    templates: ["lower-third", "timeline"],
    defaultTemplate: "lower-third",
    layout: "pip",
    rveRef: "popping-text",
    remotionRef: "morph-text",
  },
  curiosity_punch: {
    id: "curiosity_punch",
    label: "Curiosidade / impacto",
    templates: ["kinetic-text", "counter"],
    defaultTemplate: "kinetic-text",
    layout: "fullscreen",
    rveRef: "popping-text",
    remotionRef: "wavy-meme",
  },
};

/** Prioridade de template por pacote de nicho (Timeline Studio). */
export const NICHE_TEMPLATE_PRIORITY = {
  "documentary-prestige": [
    "lower-third",
    "timeline",
    "counter",
    "location-intro",
  ],
  "data-journalist": ["counter", "bar-chart", "pictogram-chart", "lower-third"],
  "geography-explorer": [
    "location-intro",
    "geo-map",
    "pictogram-chart",
    "timeline",
  ],
  "mystery-reveal": ["kinetic-text", "counter", "lower-third", "timeline"],
  "social-proof": ["counter", "kinetic-text", "bar-chart", "lower-third"],
  "industrial-impact": ["counter", "bar-chart", "timeline", "lower-third"],
};

export const DEFAULT_DURATIONS = {
  counter: 3.5,
  "bar-chart": 4.5,
  "pictogram-chart": 6,
  timeline: 5,
  "lower-third": 3,
  "kinetic-text": 2.5,
  "geo-map": 4,
  "location-intro": 8,
};

export const APPROVED_ORCHESTRATION_TEMPLATES = new Set([
  "location-intro",
  "geo-map",
  "counter",
  "bar-chart",
  "pictogram-chart",
  "timeline",
]);

export const REMOTION_TEMPLATE_LIMITS = {
  shortMax: 1,
  longMax: 8,
  longTargetMin: 5,
};

/** Padrão global location-intro: fullscreen globo→alvo; cidade marca território OSM. */
export const LOCATION_INTRO_DEFAULTS = {
  presentation: "fullscreen",
  layout: "fullscreen",
  variant: "ai_geo_video",
  map_style: "photoreal_satellite",
  map_provider: "ai_t2v",
  geo_generation: "ai_prompt",
  zoom_from: 3,
  zoom_to_poi: 17,
  zoom_to_city: 10,
  duration_seconds: 8,
  duration_seconds_short_max: 10,
  duration_seconds_long_max: 20,
  fly_mode: "earth_descent",
};

export const MOTION_TRACK_ID = "motion";

export const FULLSCREEN_TEMPLATES = new Set([
  "pictogram-chart",
  "kinetic-text",
  "bar-chart",
  "timeline",
  "counter",
]);

export function defaultMotionTrack() {
  return {
    id: MOTION_TRACK_ID,
    type: "motion",
    label: "Cenas Remotion",
    color: "#6A1B9A",
    height: 36,
  };
}

export function pickTemplateForTrigger(
  trigger,
  nichePack = "documentary-prestige",
  preferredTemplates = []
) {
  const def = MOTION_SCENE_TRIGGERS[trigger];
  if (!def) return "lower-third";
  const preferred = (
    Array.isArray(preferredTemplates) ? preferredTemplates : []
  ).filter(
    (tpl) =>
      APPROVED_ORCHESTRATION_TEMPLATES.has(String(tpl)) &&
      def.templates.includes(tpl)
  );
  if (preferred.length) return preferred[0];
  const priority = NICHE_TEMPLATE_PRIORITY[nichePack] || [];
  for (const tpl of priority) {
    if (def.templates.includes(tpl)) return tpl;
  }
  return def.defaultTemplate;
}

/** Objetos muito específicos — PIP educativo em 16:9 quando o espectador pode não reconhecer. */
export const SPECIFIC_OBJECT_RE =
  /\b(armadura|armaduras|elmo|escudo|espada|lan[cç]a|machado|besta|catapulta|obelisco|rel[ií]quia|artefato|ferramenta|instrumento|m[aá]quina|motor|turbina|válvula|valvula|pist[aã]o|engrenagem|torno|ponte rolante|guindaste|escavadeira|betoneira|estrutura met[aá]lica|viga|pilar|arco|aqueduto|muralha|basti[aã]o|trincheira)\b/i;

export const HISTORIC_DESTROYED_RE =
  /\b(caiu|ru[ií]na|ruinas|demolido|destru[ií]do|n[aã]o existe mais|nao existe mais|desapareceu|derrubado|colapsou|desmoronou|perdeu|foi destru[ií]d[oa]|desabou|incendiou)\b/i;

export function inferStructureExists(text = "") {
  return !HISTORIC_DESTROYED_RE.test(String(text || ""));
}

export function inferSpecificObject(text = "") {
  return SPECIFIC_OBJECT_RE.test(String(text || ""));
}

/**
 * Fullscreen por padrão (geo sempre). PIP só em 16:9 + objeto específico educativo.
 */
export function resolvePresentationForScene({
  templateId = "",
  trigger = "",
  text = "",
  aspectRatio = "16:9",
  hasReferenceAsset = false,
  niche = "",
} = {}) {
  const tpl = String(templateId || "");
  const trig = String(trigger || "");
  const isVertical = String(aspectRatio || "16:9") === "9:16";
  const isEngineering = /engenharia|engineering|industrial/i.test(
    String(niche || "")
  );
  if (tpl === "location-intro" && isVertical && isEngineering) {
    return "pip";
  }
  if (
    tpl === "location-intro" ||
    tpl === "geo-map" ||
    trig === "location" ||
    trig === "region_pin"
  ) {
    return "fullscreen";
  }
  if (FULLSCREEN_TEMPLATES.has(tpl)) return "fullscreen";
  const isWide = !isVertical;
  if (
    isWide &&
    (hasReferenceAsset || inferSpecificObject(text)) &&
    (trig === "historical_fact" || trig === "stat_number")
  ) {
    return "pip";
  }
  const def = MOTION_SCENE_TRIGGERS[trig];
  return def?.layout === "fullscreen" ? "fullscreen" : "pip";
}

export function resolveLayoutForTemplate(templateId, trigger, opts = {}) {
  if (templateId === "location-intro" || trigger === "location") {
    const presentation = resolvePresentationForScene({
      templateId,
      trigger,
      text: opts.text,
      aspectRatio: opts.aspectRatio,
      hasReferenceAsset: opts.hasReferenceAsset,
      niche: opts.niche,
    });
    if (presentation === "pip") return "pip";
    return "fullscreen";
  }
  if (FULLSCREEN_TEMPLATES.has(templateId)) return "fullscreen";
  return resolvePresentationForScene({
    templateId,
    trigger,
    text: opts.text,
    aspectRatio: opts.aspectRatio,
    hasReferenceAsset: opts.hasReferenceAsset,
    niche: opts.niche,
  });
}
