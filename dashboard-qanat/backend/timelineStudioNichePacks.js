/**
 * Pacotes de nicho e templates inseríveis no Timeline Studio — Fase 4
 */

import { OVERLAY_MIN_DURATION } from "./overlayTiming.js";

export const STUDIO_TEMPLATE_DEFS = {
  "pictogram-chart": {
    templateId: "pictogram-chart",
    label: "Pictograma",
    color: "#00897B",
    duration: OVERLAY_MIN_DURATION["pictogram-chart"] || 6,
    defaultProps: {
      title: "COMPARAÇÃO GLOBAL",
      icon: "ship",
      source: "Fonte: dados públicos",
      segments: [
        { label: "Líder", value: 42, color: "#1565C0" },
        { label: "Segundo", value: 28, color: "#E53935" },
        { label: "Outros", value: 30, color: "#78909C" },
      ],
    },
  },
  "location-intro": {
    templateId: "location-intro",
    label: "Intro Local",
    color: "#00897B",
    duration: OVERLAY_MIN_DURATION["location-intro"] || 5,
    defaultProps: {
      location: "Cidade",
      region: "Região",
      country: "País",
      variant: "satellite",
      accentColor: "#FFFFFF",
    },
  },
  "bar-chart": {
    templateId: "bar-chart",
    label: "Barras",
    color: "#00897B",
    duration: OVERLAY_MIN_DURATION["bar-chart"] || 4.5,
    defaultProps: {
      title: "COMPARAÇÃO",
      items: [
        { label: "A", value: 72 },
        { label: "B", value: 54 },
        { label: "C", value: 38 },
      ],
      position: "center",
      theme: "minimal",
    },
  },
  counter: {
    templateId: "counter",
    label: "Contador",
    color: "#00897B",
    duration: OVERLAY_MIN_DURATION.counter || 3.5,
    defaultProps: {
      value: 1000000,
      label: "IMPACTO",
      suffix: "",
      position: "center",
      theme: "minimal",
      accentColor: "#D4AF37",
    },
  },
  "lower-third": {
    templateId: "lower-third",
    label: "Lower Third",
    color: "#00897B",
    duration: OVERLAY_MIN_DURATION["lower-third"] || 3,
    defaultProps: {
      title: "Título",
      subtitle: "Subtítulo",
      variant: "glass",
      position: "bottom-left",
      theme: "minimal",
    },
  },
  timeline: {
    templateId: "timeline",
    label: "Linha do tempo",
    color: "#00897B",
    duration: OVERLAY_MIN_DURATION.timeline || 5,
    defaultProps: {
      title: "CRONOLOGIA",
      events: [
        { year: "1900", label: "Início" },
        { year: "1950", label: "Expansão" },
        { year: "2000", label: "Atual" },
      ],
      position: "bottom-center",
    },
  },
  "geo-map": {
    templateId: "geo-map",
    label: "Mapa",
    color: "#00897B",
    duration: OVERLAY_MIN_DURATION["geo-map"] || 4,
    defaultProps: {
      title: "REGIÃO",
      highlight: "BR",
      position: "center",
    },
  },
  "kinetic-text": {
    templateId: "kinetic-text",
    label: "Texto cinético",
    color: "#00897B",
    duration: OVERLAY_MIN_DURATION["kinetic-text"] || 2.5,
    defaultProps: {
      text: "REVELAÇÃO",
      position: "center",
      theme: "minimal",
    },
  },
};

export const NICHE_PACK_CATALOG = [
  {
    id: "documentary-prestige",
    label: "Documentário Premium",
    description: "Lower thirds elegantes, cronologia e contadores discretos.",
    templateIds: ["lower-third", "timeline", "counter", "bar-chart"],
  },
  {
    id: "data-journalist",
    label: "Jornalismo de Dados",
    description: "Pictogramas, barras e infográficos full-screen.",
    templateIds: ["pictogram-chart", "bar-chart", "counter", "lower-third"],
  },
  {
    id: "geography-explorer",
    label: "Explorador Geográfico",
    description: "Intros de local, mapas e pictogramas regionais.",
    templateIds: [
      "location-intro",
      "geo-map",
      "pictogram-chart",
      "timeline",
      "lower-third",
    ],
  },
  {
    id: "mystery-reveal",
    label: "Mistério & Revelação",
    description: "Texto cinético, contadores e lower thirds dramáticos.",
    templateIds: ["kinetic-text", "counter", "lower-third", "timeline"],
  },
  {
    id: "social-proof",
    label: "Prova Social Viral",
    description: "Contadores, barras e lower thirds para Shorts virais.",
    templateIds: ["counter", "bar-chart", "kinetic-text", "lower-third"],
  },
  {
    id: "industrial-impact",
    label: "Impacto Industrial",
    description: "Contadores de escala, barras e cronologia técnica.",
    templateIds: ["counter", "bar-chart", "timeline", "lower-third"],
  },
];

export function listNichePackCatalog() {
  return NICHE_PACK_CATALOG.map((pack) => ({
    ...pack,
    templates: pack.templateIds
      .map((id) => STUDIO_TEMPLATE_DEFS[id])
      .filter(Boolean),
  }));
}

export function buildStudioOverlayClip({
  templateId,
  playhead = 0,
  props = {},
  duration,
  label,
}) {
  const def = STUDIO_TEMPLATE_DEFS[templateId];
  if (!def) return null;

  const mergedProps = { ...def.defaultProps, ...props };
  const dur = duration ?? def.duration ?? 4;

  return {
    id: `overlay-${templateId}-${Date.now()}`,
    trackId: "overlays",
    start: Math.max(0, Number(playhead) || 0),
    duration: dur,
    label: label || def.label,
    templateId: def.templateId,
    props: { ...mergedProps, overlayType: def.templateId },
    color: def.color || "#00897B",
  };
}

export function resolvePackByAlias(text = "") {
  const t = String(text).toLowerCase();
  if (/jornalismo|dados|data|stat|número|numero/.test(t))
    return "data-journalist";
  if (/geograf|mapa|país|pais|cidade|travel|explor/.test(t))
    return "geography-explorer";
  if (/mistério|misterio|revela|enigma/.test(t)) return "mystery-reveal";
  if (/social|viral|short/.test(t)) return "social-proof";
  if (/industrial|engenharia|militar/.test(t)) return "industrial-impact";
  if (/document|premium|prestige/.test(t)) return "documentary-prestige";
  return null;
}
