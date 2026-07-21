/**
 * nicheMotionPreferences.js
 * Preferências de motion por nicho (paleta + shot cards preferidos + transição).
 */

const NICHE_MOTION = {
  engenharia: {
    palette: {
      primary: "#F5A623",
      bg: "#1A1A2E",
      accent: "#E74C3C",
      text: "#FFFFFF",
    },
    preferidos: [
      "crane-rise-reveal",
      "odometer-digit-roll",
      "space-camera-moves",
      "gauge-readout-moves",
      "chart-live-moves",
    ],
    transicao: "shot-transitions",
    camera_padrao: "slow-push-in",
  },
  historia: {
    palette: {
      primary: "#C9A86A",
      bg: "#2A2118",
      accent: "#8B6F47",
      text: "#F5EFE6",
    },
    preferidos: [
      "timeline-travel",
      "brand-ink-open",
      "paper-title-card",
      "text-as-mask",
      "document-typewriter-reveal",
    ],
    transicao: "transition-hidden-cut",
    camera_padrao: "slow-push-in",
  },
  ciencia: {
    palette: {
      primary: "#4A9EFF",
      bg: "#0D1B2A",
      accent: "#00D9FF",
      text: "#FFFFFF",
    },
    preferidos: [
      "chart-live-moves",
      "particle-sand-fill",
      "dataviz-landscape-open",
      "crane-rise-reveal",
    ],
    transicao: "wipe-transitions",
    camera_padrao: "multiplane",
  },
  tecnologia: {
    palette: {
      primary: "#7C5CFF",
      bg: "#0F0F1A",
      accent: "#00E5FF",
      text: "#FFFFFF",
    },
    preferidos: [
      "spotlight-hero-card",
      "command-palette-summon",
      "type-entrance-moves",
      "neon-frame-forerun",
    ],
    transicao: "transition-travel",
    camera_padrao: "drone-dive-landing",
  },
  humor: {
    palette: {
      primary: "#FFD93D",
      bg: "#1A1A2E",
      accent: "#FF6B6B",
      text: "#FFFFFF",
    },
    preferidos: [
      "cel-flash-stomp",
      "impact-feedback",
      "beat-cut-moves",
      "riso-print-hits",
    ],
    transicao: "shot-transitions",
    camera_padrao: "crash-zoom-punch",
  },
  ranking: {
    palette: {
      primary: "#FF8C42",
      bg: "#16161D",
      accent: "#FFD23F",
      text: "#FFFFFF",
    },
    preferidos: [
      "list-stack-press",
      "odometer-digit-roll",
      "spotlight-hero-card",
      "particle-sand-fill",
      "row-embed",
    ],
    transicao: "color-block-step-wipe",
    camera_padrao: "slow-push-in",
  },
};

const DEFAULT_NICHE = {
  palette: {
    primary: "#F5A623",
    bg: "#12121A",
    accent: "#4A9EFF",
    text: "#FFFFFF",
  },
  preferidos: [
    "spotlight-hero-card",
    "gradient-word-sweep",
    "card-flip-reveal",
  ],
  transicao: "shot-transitions",
  camera_padrao: "slow-push-in",
};

export function resolveNicheMotionPrefs(niche = "") {
  const t = String(niche).toLowerCase();
  if (/engenh|constru|industrial|obra|m[aá]quina|militar/.test(t))
    return NICHE_MOTION.engenharia;
  if (/hist[oó]ri|antig|arqueol|medieval|ru[ií]na/.test(t))
    return NICHE_MOTION.historia;
  if (/ci[eê]nci|biolog|qu[ií]mic|f[ií]sic|natur|espa[cç]o/.test(t))
    return NICHE_MOTION.ciencia;
  if (/tecnolog|digital|software|ia|robot|futur|app/.test(t))
    return NICHE_MOTION.tecnologia;
  if (/humor|gra[cç]a|com[eé]dia|engra[cç]ad|fatos/.test(t))
    return NICHE_MOTION.humor;
  if (/ranking|top|lista|compara|versus/.test(t)) return NICHE_MOTION.ranking;
  return DEFAULT_NICHE;
}

export function listNichePresets() {
  return Object.keys(NICHE_MOTION);
}
