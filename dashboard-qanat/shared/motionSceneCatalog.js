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
    layout: "pip",
    rveRef: null,
    remotionRef: "mapbox-example",
  },
  region_pin: {
    id: "region_pin",
    label: "Pin regional",
    templates: ["geo-map"],
    defaultTemplate: "geo-map",
    layout: "pip",
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

/** Padrão global location-intro: PIP com descida; cidade marca território OSM. */
export const LOCATION_INTRO_DEFAULTS = {
  presentation: "pip",
  layout: "pip",
  variant: "satellite",
  map_style: "satellite",
  zoom_from: 3,
  zoom_to_poi: 17,
  zoom_to_city: 10,
  duration_seconds: 8,
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
  nichePack = "documentary-prestige"
) {
  const def = MOTION_SCENE_TRIGGERS[trigger];
  if (!def) return "lower-third";
  const priority = NICHE_TEMPLATE_PRIORITY[nichePack] || [];
  for (const tpl of priority) {
    if (def.templates.includes(tpl)) return tpl;
  }
  return def.defaultTemplate;
}

export function resolveLayoutForTemplate(templateId, trigger) {
  if (FULLSCREEN_TEMPLATES.has(templateId)) return "fullscreen";
  const def = MOTION_SCENE_TRIGGERS[trigger];
  return def?.layout || "pip";
}
