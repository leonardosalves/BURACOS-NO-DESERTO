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
    templates: ["counter", "timeline", "bar-chart"],
    defaultTemplate: "counter",
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

export const MOTION_TEMPLATE_OPERATIONAL_CATALOG = {
  counter: {
    id: "counter",
    label: "Contador numerico",
    kind: "number",
    ideal_for: ["stat_number", "curiosity_punch"],
    avoid_for: ["location", "region_pin", "timeline_date"],
    slots: ["value", "label", "suffix"],
    ideal_duration_seconds: 3.5,
    tags: ["numero", "impacto", "dado", "retencao"],
    fallback: true,
  },
  "bar-chart": {
    id: "bar-chart",
    label: "Grafico de barras",
    kind: "comparison",
    ideal_for: ["comparison", "stat_number"],
    avoid_for: ["location", "region_pin"],
    slots: ["title", "items"],
    ideal_duration_seconds: 4.5,
    tags: ["comparacao", "ranking", "grafico", "dados"],
    fallback: false,
  },
  "pictogram-chart": {
    id: "pictogram-chart",
    label: "Pictograma de dados",
    kind: "data_visual",
    ideal_for: ["comparison", "stat_number"],
    avoid_for: ["location", "region_pin"],
    slots: ["title", "segments", "source"],
    ideal_duration_seconds: 6,
    tags: ["proporcao", "segmentos", "infografico"],
    fallback: false,
  },
  timeline: {
    id: "timeline",
    label: "Linha do tempo",
    kind: "chronology",
    ideal_for: ["timeline_date", "historical_fact"],
    avoid_for: ["location", "region_pin"],
    slots: ["title", "events"],
    ideal_duration_seconds: 5,
    tags: ["datas", "historia", "processo", "cronologia"],
    fallback: false,
  },
  "location-intro": {
    id: "location-intro",
    label: "Introducao geografica",
    kind: "geo",
    ideal_for: ["location"],
    avoid_for: ["stat_number", "comparison", "curiosity_punch"],
    slots: ["location", "region", "country", "place_type"],
    ideal_duration_seconds: 8,
    tags: ["mapa", "cidade", "poi", "zoom", "satelite"],
    fallback: false,
  },
  "geo-map": {
    id: "geo-map",
    label: "Pin regional",
    kind: "geo_pin",
    ideal_for: ["region_pin", "location"],
    avoid_for: ["stat_number", "comparison"],
    slots: ["location", "region"],
    ideal_duration_seconds: 4,
    tags: ["mapa", "pin", "regiao"],
    fallback: false,
  },
};

export function operationalCatalogForTemplates(templateIds = []) {
  const ids = Array.isArray(templateIds) ? templateIds : [];
  return ids
    .map((id) => MOTION_TEMPLATE_OPERATIONAL_CATALOG[String(id || "")])
    .filter(Boolean);
}

function scoreTemplateForContext(templateId, trigger, context = {}) {
  const id = String(templateId || "");
  const meta = MOTION_TEMPLATE_OPERATIONAL_CATALOG[id] || null;
  const def = MOTION_SCENE_TRIGGERS[trigger];
  const text = String(context.text || "");
  const preferred = Array.isArray(context.preferredTemplates)
    ? context.preferredTemplates.map(String)
    : [];
  const priority = Array.isArray(context.priority) ? context.priority : [];
  const previousTemplates = Array.isArray(context.previousTemplates)
    ? context.previousTemplates.map(String)
    : [];
  let score = 0;
  const reasons = [];
  const warnings = [];

  if (APPROVED_ORCHESTRATION_TEMPLATES.has(id)) {
    score += 25;
    reasons.push("template aprovado para orquestracao");
  } else {
    score -= 100;
    warnings.push("template ainda nao aprovado para orquestracao");
  }

  if (def?.templates?.includes(id)) {
    score += 35;
    reasons.push(`encaixa no trigger ${trigger}`);
  } else if (meta?.fallback) {
    score += 4;
    reasons.push("fallback operacional disponivel");
  } else {
    score -= 30;
    warnings.push(`nao e template natural para ${trigger}`);
  }

  if (meta?.ideal_for?.includes(trigger)) {
    score += 18;
    reasons.push("catalogo operacional recomenda para este tipo de cena");
  }
  if (meta?.avoid_for?.includes(trigger)) {
    score -= 28;
    warnings.push("catalogo operacional recomenda evitar neste tipo de cena");
  }

  const priorityIndex = priority.indexOf(id);
  if (priorityIndex >= 0) {
    score += Math.max(3, 14 - priorityIndex * 2);
    reasons.push("prioridade do pacote de nicho");
  }

  if (preferred.includes(id)) {
    score += 16;
    reasons.push("presente no catalogo aprovado do nicho");
  }

  if (previousTemplates.slice(-2).includes(id)) {
    score -= 12;
    warnings.push("penalizado para evitar repeticao visual");
  }

  if (
    trigger === "comparison" &&
    /\b(maior|menor|versus|vs\.?|dobro|triplo|supera|ultrapassa)\b/i.test(text)
  ) {
    score += id === "bar-chart" || id === "pictogram-chart" ? 10 : -4;
  }
  if (trigger === "stat_number" && /\d/.test(text)) {
    score += id === "counter" ? 10 : 4;
  }
  if (
    (trigger === "timeline_date" || trigger === "historical_fact") &&
    /\b(1\d{3}|20\d{2})\b/.test(text)
  ) {
    score += id === "timeline" ? 12 : 3;
  }
  if (
    (trigger === "location" || trigger === "region_pin") &&
    /\b(?:em|na|no|de)\s+[A-Z]/.test(text)
  ) {
    score += id === "location-intro" || id === "geo-map" ? 10 : -8;
  }

  return { template_id: id, score, reasons, warnings };
}

export function pickTemplateDecisionForTrigger(
  trigger,
  nichePack = "documentary-prestige",
  preferredTemplates = [],
  context = {}
) {
  const def = MOTION_SCENE_TRIGGERS[trigger];
  if (!def) {
    return {
      template_id: "counter",
      score: 0,
      fallback: true,
      reasons: ["trigger desconhecido; usando fallback operacional"],
      warnings: ["classificacao de cena ausente do catalogo"],
      candidates: [],
    };
  }

  const priority = NICHE_TEMPLATE_PRIORITY[nichePack] || [];
  const candidateIds = [
    ...def.templates,
    ...priority,
    ...preferredTemplates,
    def.defaultTemplate,
    "counter",
  ].filter(Boolean);
  const uniqueCandidates = [...new Set(candidateIds.map(String))].filter((id) =>
    APPROVED_ORCHESTRATION_TEMPLATES.has(id)
  );

  const scored = uniqueCandidates
    .map((id) =>
      scoreTemplateForContext(id, trigger, {
        ...context,
        preferredTemplates,
        priority,
      })
    )
    .sort((a, b) => b.score - a.score);

  const selected = scored[0];
  if (!selected) {
    return {
      template_id: "counter",
      score: 0,
      fallback: true,
      reasons: [
        "nenhum template aprovado encaixou; usando fallback operacional",
      ],
      warnings: [`sem candidato aprovado para ${trigger}`],
      candidates: [],
    };
  }

  return {
    ...selected,
    fallback: !def.templates.includes(selected.template_id),
    candidates: scored.slice(0, 4),
  };
}

export const REMOTION_TEMPLATE_LIMITS = {
  shortMax: 1,
  longMax: 8,
  /** @deprecated não força mínimo de templates — geo é opcional */
  longTargetMin: 5,
};

/** Cenas mapa/local: só quando o roteiro cita lugar ou POI; nunca obrigatório. */
export { GEO_SCENE_LIMITS } from "./geoSceneEligibility.js";

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
  return pickTemplateDecisionForTrigger(trigger, nichePack, preferredTemplates)
    .template_id;
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
  if ((tpl === "location-intro" || tpl === "geo-map") && isVertical) {
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
