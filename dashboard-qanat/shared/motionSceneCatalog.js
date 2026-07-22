/**
 * Catálogo de cenas Remotion planejáveis pela IA.
 * Mapeia triggers → templates shotcraft (138 cards) + legados.
 * Integrado com shotcraftCatalog.js para orquestração completa.
 */

export const MOTION_SCENE_TRIGGERS = {
  stat_number: {
    id: "stat_number",
    label: "Dado numérico",
    templates: ["odometer-digit-roll", "gauge-readout-moves", "particle-sand-fill", "chart-live-moves"],
    defaultTemplate: "odometer-digit-roll",
    layout: "fullscreen",
  },
  comparison: {
    id: "comparison",
    label: "Comparação",
    templates: ["before-after-slider-scrub", "text-column-converge", "chart-live-moves"],
    defaultTemplate: "before-after-slider-scrub",
    layout: "fullscreen",
  },
  location: {
    id: "location",
    label: "Lugar / cidade",
    templates: ["space-camera-moves", "crane-rise-reveal", "gradient-word-sweep"],
    defaultTemplate: "space-camera-moves",
    layout: "fullscreen",
  },
  region_pin: {
    id: "region_pin",
    label: "Pin regional",
    templates: ["space-camera-moves", "overhead-camera-moves"],
    defaultTemplate: "space-camera-moves",
    layout: "fullscreen",
  },
  timeline_date: {
    id: "timeline_date",
    label: "Cronologia / datas",
    templates: ["timeline-travel", "document-typewriter-reveal"],
    defaultTemplate: "timeline-travel",
    layout: "fullscreen",
  },
  historical_fact: {
    id: "historical_fact",
    label: "Fato histórico",
    templates: ["timeline-travel", "document-typewriter-reveal", "gradient-word-sweep"],
    defaultTemplate: "timeline-travel",
    layout: "pip",
  },
  curiosity_punch: {
    id: "curiosity_punch",
    label: "Curiosidade / impacto",
    templates: ["crash-zoom-punch", "cel-flash-stomp", "beat-cut-moves", "impact-feedback"],
    defaultTemplate: "crash-zoom-punch",
    layout: "fullscreen",
  },
  lista: {
    id: "lista",
    label: "Lista / enumeração",
    templates: ["list-stack-press", "wall-reveal-moves", "beat-step-list-theme-cycle"],
    defaultTemplate: "list-stack-press",
    layout: "fullscreen",
  },
  ranking: {
    id: "ranking",
    label: "Ranking / posição",
    templates: ["list-stack-press", "wall-reveal-moves", "odometer-digit-roll"],
    defaultTemplate: "list-stack-press",
    layout: "fullscreen",
  },
  impacto: {
    id: "impacto",
    label: "Impacto / ritmo",
    templates: ["impact-feedback", "slam-entrance-moves", "montage-rhythm-moves", "crash-zoom-punch"],
    defaultTemplate: "impact-feedback",
    layout: "fullscreen",
  },
  abertura: {
    id: "abertura",
    label: "Abertura / intro",
    templates: ["brand-ink-open", "trailer-grammar-moves", "neon-frame-forerun", "brand-frame-snap"],
    defaultTemplate: "brand-ink-open",
    layout: "fullscreen",
  },
  encerramento: {
    id: "encerramento",
    label: "Encerramento / final",
    templates: ["ui-strip-away-outro", "edit-hook-moves", "outro-group-photo-launch"],
    defaultTemplate: "ui-strip-away-outro",
    layout: "fullscreen",
  },
  texto: {
    id: "texto",
    label: "Texto / título",
    templates: ["gradient-word-sweep", "marker-underline-title", "type-entrance-moves", "typewriter-moves"],
    defaultTemplate: "gradient-word-sweep",
    layout: "pip",
  },
  camera: {
    id: "camera",
    label: "Câmera / movimento",
    templates: ["space-camera-moves", "crane-rise-reveal", "depth-layer-moves", "overhead-camera-moves"],
    defaultTemplate: "space-camera-moves",
    layout: "fullscreen",
  },
  elemento: {
    id: "elemento",
    label: "Elemento / UI",
    templates: ["canvas-materialize-moves", "glow-flyline-moves", "panel-grid-moves", "fui-hud-moves"],
    defaultTemplate: "canvas-materialize-moves",
    layout: "pip",
  },
  transicao: {
    id: "transicao",
    label: "Transição",
    templates: ["shot-transitions", "transition-hidden-cut", "wipe-transitions", "circle-match-iris"],
    defaultTemplate: "shot-transitions",
    layout: "fullscreen",
  },
};

/** Prioridade de template por pacote de nicho (video-shotcraft). */
export const NICHE_TEMPLATE_PRIORITY = {
  "documentary-prestige": [
    "crane-rise-reveal", "timeline-travel", "odometer-digit-roll", "space-camera-moves",
  ],
  "data-journalist": [
    "odometer-digit-roll", "chart-live-moves", "gauge-readout-moves", "particle-sand-fill",
  ],
  "geography-explorer": [
    "space-camera-moves", "crane-rise-reveal", "overhead-camera-moves", "runway-ground-skim",
  ],
  "mystery-reveal": [
    "crash-zoom-punch", "transition-hidden-cut", "tension-camera-moves", "cel-flash-stomp",
  ],
  "social-proof": [
    "impact-feedback", "particle-celebrate-hits", "odometer-digit-roll", "slam-entrance-moves",
  ],
  "industrial-impact": [
    "crash-zoom-punch", "montage-rhythm-moves", "odometer-digit-roll", "gauge-readout-moves",
  ],
};

export const DEFAULT_DURATIONS = {
  // video-shotcraft templates
  "odometer-digit-roll": 3.5,
  "chart-live-moves": 4.5,
  "particle-sand-fill": 4,
  "gauge-readout-moves": 4,
  "crane-rise-reveal": 4.5,
  "dataviz-landscape-open": 4.5,
  "autolayout-gap-dial": 4,
  "ai-stream-response": 5,
  "before-after-slider-scrub": 4.5,
  "text-column-converge": 4,
  "timeline-travel": 5,
  "document-typewriter-reveal": 4,
  "list-stack-press": 4,
  "wall-reveal-moves": 4,
  "beat-step-list-theme-cycle": 3.5,
  "spotlight-hero-card": 4,
  "card-flip-reveal": 3.5,
  "spotlight-sweep-moves": 4,
  "brand-ink-open": 4,
  "trailer-grammar-moves": 4,
  "brand-frame-snap": 3.5,
  "letterspace-materialize": 4,
  "neon-frame-forerun": 4,
  "neon-frame-orbit-drop": 4,
  "ui-strip-away-outro": 4,
  "edit-hook-moves": 3.5,
  "outro-group-photo-launch": 4,
  "shot-transitions": 2,
  "wipe-transitions": 2,
  "page-turn-transitions": 2,
  "transition-hidden-cut": 2,
  "transition-travel": 2.5,
  "circle-match-iris": 2,
  "line-carry-transition": 2,
  "color-block-step-wipe": 2,
  "bottom-push-stack-wipe": 2,
  "tear-streak-transitions": 2,
  "print-texture-transitions": 2.5,
  "bubble-swarm-takeover": 2.5,
  "space-camera-moves": 5,
  "tension-camera-moves": 4.5,
  "depth-layer-moves": 4.5,
  "overhead-camera-moves": 4,
  "crash-zoom-punch": 3,
  "graze-face-tour": 4,
  "steep-tilt-glide": 4,
  "runway-ground-skim": 4,
  "scroll-brake-moves": 4,
  "gradient-word-sweep": 3.5,
  "marker-underline-title": 3,
  "type-entrance-moves": 3.5,
  "typewriter-moves": 4,
  "type-assembly-moves": 4,
  "type-rhythm-sync": 3.5,
  "cel-flash-stomp": 3,
  "impact-feedback": 3,
  "beat-cut-moves": 3.5,
  "montage-rhythm-moves": 4,
  "slam-entrance-moves": 3,
  "particle-celebrate-hits": 3.5,
  "canvas-materialize-moves": 4.5,
  "glow-flyline-moves": 4,
  "panel-grid-moves": 4,
  "fui-hud-moves": 4,
  // Geo removido — somente video-shotcraft
};

/** Todos os templates aprovados para orquestração (video-shotcraft registry). */
export const APPROVED_ORCHESTRATION_TEMPLATES = new Set([
  // dados
  "odometer-digit-roll", "chart-live-moves", "particle-sand-fill",
  "gauge-readout-moves", "crane-rise-reveal", "dataviz-landscape-open",
  "autolayout-gap-dial", "ai-stream-response",
  // comparacao
  "before-after-slider-scrub", "text-column-converge",
  // timeline
  "timeline-travel", "document-typewriter-reveal",
  // lista
  "list-stack-press", "wall-reveal-moves", "beat-step-list-theme-cycle",
  // destaque
  "spotlight-hero-card", "card-flip-reveal", "spotlight-sweep-moves",
  // abertura
  "brand-ink-open", "trailer-grammar-moves", "brand-frame-snap",
  "letterspace-materialize", "neon-frame-forerun", "neon-frame-orbit-drop",
  // encerramento
  "ui-strip-away-outro", "edit-hook-moves", "outro-group-photo-launch",
  // transicao
  "shot-transitions", "wipe-transitions", "page-turn-transitions",
  "transition-hidden-cut", "transition-travel", "circle-match-iris",
  "line-carry-transition", "color-block-step-wipe", "bottom-push-stack-wipe",
  "tear-streak-transitions", "print-texture-transitions", "bubble-swarm-takeover",
  // camera
  "space-camera-moves", "tension-camera-moves", "depth-layer-moves",
  "overhead-camera-moves", "crash-zoom-punch", "graze-face-tour",
  "steep-tilt-glide", "runway-ground-skim", "scroll-brake-moves",
  // texto
  "gradient-word-sweep", "marker-underline-title", "type-entrance-moves",
  "typewriter-moves", "type-assembly-moves", "type-rhythm-sync",
  "cel-flash-stomp", "split-flap-title",
  // impacto
  "impact-feedback", "beat-cut-moves", "montage-rhythm-moves",
  "slam-entrance-moves", "particle-celebrate-hits", "rhythm-interrupt-moves",
  // elemento
  "canvas-materialize-moves", "glow-flyline-moves", "panel-grid-moves",
  "fui-hud-moves", "light-play-moves",
]);

export const MOTION_TEMPLATE_OPERATIONAL_CATALOG = {
  "odometer-digit-roll": {
    id: "odometer-digit-roll", label: "Odômetro digital", kind: "number",
    ideal_for: ["stat_number", "ranking", "curiosity_punch"], avoid_for: ["location", "region_pin"],
    slots: ["value", "unit", "label"], ideal_duration_seconds: 3.5,
    tags: ["numero", "metrica", "recorde", "dado"], fallback: true,
  },
  "chart-live-moves": {
    id: "chart-live-moves", label: "Gráfico ao vivo", kind: "comparison",
    ideal_for: ["stat_number", "comparison"], avoid_for: ["location"],
    slots: ["title", "items"], ideal_duration_seconds: 4.5,
    tags: ["grafico", "dados", "tendencia"], fallback: false,
  },
  "particle-sand-fill": {
    id: "particle-sand-fill", label: "Preenchimento por partículas", kind: "data_visual",
    ideal_for: ["stat_number", "comparison", "ranking"], avoid_for: ["location"],
    slots: ["title", "value", "unit"], ideal_duration_seconds: 4,
    tags: ["proporcao", "barras", "particulas"], fallback: false,
  },
  "before-after-slider-scrub": {
    id: "before-after-slider-scrub", label: "Antes/Depois slider", kind: "comparison",
    ideal_for: ["comparison"], avoid_for: ["location", "stat_number"],
    slots: ["beforeLabel", "afterLabel", "title"], ideal_duration_seconds: 4.5,
    tags: ["antes", "depois", "comparacao", "evolucao"], fallback: false,
  },
  "timeline-travel": {
    id: "timeline-travel", label: "Linha do tempo", kind: "chronology",
    ideal_for: ["timeline_date", "historical_fact"], avoid_for: ["location", "stat_number"],
    slots: ["milestones", "highlightIndex"], ideal_duration_seconds: 5,
    tags: ["datas", "historia", "cronologia", "sequencia"], fallback: false,
  },
  "list-stack-press": {
    id: "list-stack-press", label: "Lista empilhada", kind: "list",
    ideal_for: ["lista", "ranking"], avoid_for: ["location"],
    slots: ["items", "counterLabel"], ideal_duration_seconds: 4,
    tags: ["lista", "ranking", "top", "posicao"], fallback: false,
  },
  "spotlight-hero-card": {
    id: "spotlight-hero-card", label: "Hero em destaque", kind: "highlight",
    ideal_for: ["curiosity_punch", "ranking", "impacto"], avoid_for: ["timeline_date"],
    slots: ["title", "subtitle", "image"], ideal_duration_seconds: 4,
    tags: ["destaque", "foco", "hero", "principal"], fallback: false,
  },
  "crash-zoom-punch": {
    id: "crash-zoom-punch", label: "Crash zoom", kind: "impact",
    ideal_for: ["impacto", "curiosity_punch"], avoid_for: ["timeline_date", "lista"],
    slots: ["label"], ideal_duration_seconds: 1,
    tags: ["zoom", "impacto", "punch"], fallback: false,
  },
  "beat-cut-moves": {
    id: "beat-cut-moves", label: "Corte no beat", kind: "rhythm",
    ideal_for: ["impacto"], avoid_for: ["timeline_date", "location"],
    slots: ["cuts"], ideal_duration_seconds: 2.5,
    tags: ["beat", "corte", "ritmo", "montagem"], fallback: false,
  },
  "brand-ink-open": {
    id: "brand-ink-open", label: "Abertura ink", kind: "opening",
    ideal_for: ["abertura"], avoid_for: ["stat_number", "comparison"],
    slots: ["wordmark", "tagline"], ideal_duration_seconds: 3,
    tags: ["abertura", "intro", "marca"], fallback: false,
  },
  "gradient-word-sweep": {
    id: "gradient-word-sweep", label: "Palavra em gradiente", kind: "text",
    ideal_for: ["texto", "curiosity_punch"], avoid_for: ["location"],
    slots: ["word", "context"], ideal_duration_seconds: 3,
    tags: ["palavra", "destaque", "gradiente"], fallback: false,
  },
  "space-camera-moves": {
    id: "space-camera-moves", label: "Câmera espacial", kind: "camera",
    ideal_for: ["camera", "impacto"], avoid_for: ["texto", "lista"],
    slots: ["target"], ideal_duration_seconds: 5,
    tags: ["camera", "3D", "drone", "mergulho"], fallback: false,
  },
  "card-flip-reveal": {
    id: "card-flip-reveal", label: "Revelação por flip", kind: "reveal",
    ideal_for: ["curiosity_punch", "impacto"], avoid_for: ["timeline_date"],
    slots: ["front", "back"], ideal_duration_seconds: 3.5,
    tags: ["revelar", "flip", "surpresa"], fallback: false,
  },
  "document-typewriter-reveal": {
    id: "document-typewriter-reveal", label: "Documento typewriter", kind: "chronology",
    ideal_for: ["historical_fact", "timeline_date"], avoid_for: ["impacto"],
    slots: ["title", "lines"], ideal_duration_seconds: 5,
    tags: ["documento", "historia", "registro"], fallback: false,
  },
  // Legados mantidos para compatibilidade
  counter: {
    id: "counter", label: "Contador numerico", kind: "number",
    ideal_for: ["stat_number", "curiosity_punch"], avoid_for: ["location", "region_pin", "timeline_date"],
    slots: ["value", "label", "suffix"], ideal_duration_seconds: 3.5,
    tags: ["numero", "impacto", "dado", "retencao"], fallback: true,
  },
  "bar-chart": {
    id: "bar-chart", label: "Grafico de barras", kind: "comparison",
    ideal_for: ["comparison", "stat_number"], avoid_for: ["location", "region_pin"],
    slots: ["title", "items"], ideal_duration_seconds: 4.5,
    tags: ["comparacao", "ranking", "grafico", "dados"], fallback: false,
  },
  "pictogram-chart": {
    id: "pictogram-chart", label: "Pictograma de dados", kind: "data_visual",
    ideal_for: ["comparison", "stat_number"], avoid_for: ["location", "region_pin"],
    slots: ["title", "segments", "source"], ideal_duration_seconds: 6,
    tags: ["proporcao", "segmentos", "infografico"], fallback: false,
  },
  timeline: {
    id: "timeline", label: "Linha do tempo", kind: "chronology",
    ideal_for: ["timeline_date", "historical_fact"], avoid_for: ["location", "region_pin"],
    slots: ["title", "events"], ideal_duration_seconds: 5,
    tags: ["datas", "historia", "processo", "cronologia"], fallback: false,
  },
  "location-intro": {
    id: "location-intro", label: "Introducao geografica", kind: "geo",
    ideal_for: ["location"], avoid_for: ["stat_number", "comparison", "curiosity_punch"],
    slots: ["location", "region", "country", "place_type"], ideal_duration_seconds: 8,
    tags: ["mapa", "cidade", "poi", "zoom", "satelite"], fallback: false,
  },
  "geo-map": {
    id: "geo-map", label: "Pin regional", kind: "geo_pin",
    ideal_for: ["region_pin", "location"], avoid_for: ["stat_number", "comparison"],
    slots: ["location", "region"], ideal_duration_seconds: 4,
    tags: ["mapa", "pin", "regiao"], fallback: false,
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
    score += ["bar-chart", "pictogram-chart", "before-after-slider-scrub", "particle-sand-fill"].includes(id) ? 10 : -4;
  }
  if (trigger === "stat_number" && /\d/.test(text)) {
    score += ["odometer-digit-roll", "counter", "chart-live-moves"].includes(id) ? 10 : 4;
  }
  if (
    (trigger === "timeline_date" || trigger === "historical_fact") &&
    /\b(1\d{3}|20\d{2})\b/.test(text)
  ) {
    score += ["timeline-travel", "timeline", "document-typewriter-reveal"].includes(id) ? 12 : 3;
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
  const usedTemplates = context.usedTemplates instanceof Set ? context.usedTemplates : new Set();
  const def = MOTION_SCENE_TRIGGERS[trigger];
  if (!def) {
    // Fallback: primeiro template aprovado não usado
    const fallbackId = [...APPROVED_ORCHESTRATION_TEMPLATES].find((id) => !usedTemplates.has(id)) || "odometer-digit-roll";
    return {
      template_id: fallbackId,
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
  ].filter(Boolean);
  const uniqueCandidates = [...new Set(candidateIds.map(String))].filter(
    (id) => APPROVED_ORCHESTRATION_TEMPLATES.has(id) && !usedTemplates.has(id)
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
    // Todos templates já usados — não gera cena (evita repetição)
    return {
      template_id: null,
      score: 0,
      fallback: true,
      reasons: ["todos templates disponíveis já usados neste vídeo"],
      warnings: [`sem candidato disponível para ${trigger}`],
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
  shortMax: 3,
  longMax: 8,
  longTargetMin: 4,
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
  "pictogram-chart", "kinetic-text", "bar-chart", "timeline", "counter",
  "odometer-digit-roll", "chart-live-moves", "particle-sand-fill",
  "before-after-slider-scrub", "timeline-travel", "list-stack-press",
  "spotlight-hero-card", "crane-rise-reveal", "beat-cut-moves",
  "brand-ink-open", "trailer-grammar-moves", "space-camera-moves",
  "crash-zoom-punch", "slam-entrance-moves", "montage-rhythm-moves",
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
