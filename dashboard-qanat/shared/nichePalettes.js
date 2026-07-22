/**
 * nichePalettes.js — Paletas de cores padrão por nicho para motion templates.
 * Cada nicho tem primary, accent, bg (overlay), text.
 * O usuário pode sobrescrever via Editor do Lumiera (salvo no PostgreSQL).
 */

export const NICHE_PALETTES = {
  Engenharia: {
    primary: "#F5A623",
    accent: "#4A9EFF",
    bg: "rgba(10, 10, 18, 0.82)",
    text: "#FFFFFF",
    bar: "#F5A623",
    line: "rgba(255,255,255,0.15)",
  },
  Natureza: {
    primary: "#4CAF50",
    accent: "#81C784",
    bg: "rgba(8, 18, 10, 0.82)",
    text: "#FFFFFF",
    bar: "#4CAF50",
    line: "rgba(255,255,255,0.12)",
  },
  Tecnologia: {
    primary: "#7C4DFF",
    accent: "#00E5FF",
    bg: "rgba(12, 8, 24, 0.85)",
    text: "#FFFFFF",
    bar: "#7C4DFF",
    line: "rgba(255,255,255,0.12)",
  },
  Financas: {
    primary: "#FFD700",
    accent: "#00C853",
    bg: "rgba(10, 12, 8, 0.84)",
    text: "#FFFFFF",
    bar: "#FFD700",
    line: "rgba(255,255,255,0.12)",
  },
  Saude: {
    primary: "#FF5252",
    accent: "#FF8A80",
    bg: "rgba(18, 8, 10, 0.82)",
    text: "#FFFFFF",
    bar: "#FF5252",
    line: "rgba(255,255,255,0.12)",
  },
  Ciencia: {
    primary: "#00BCD4",
    accent: "#B388FF",
    bg: "rgba(6, 14, 18, 0.84)",
    text: "#FFFFFF",
    bar: "#00BCD4",
    line: "rgba(255,255,255,0.12)",
  },
  Historia: {
    primary: "#FF8F00",
    accent: "#FFCC02",
    bg: "rgba(16, 12, 6, 0.84)",
    text: "#FFFFFF",
    bar: "#FF8F00",
    line: "rgba(255,255,255,0.12)",
  },
  Esporte: {
    primary: "#FF3D00",
    accent: "#FFEA00",
    bg: "rgba(14, 8, 6, 0.84)",
    text: "#FFFFFF",
    bar: "#FF3D00",
    line: "rgba(255,255,255,0.12)",
  },
  Educacao: {
    primary: "#2196F3",
    accent: "#64FFDA",
    bg: "rgba(8, 12, 20, 0.84)",
    text: "#FFFFFF",
    bar: "#2196F3",
    line: "rgba(255,255,255,0.12)",
  },
  Entretenimento: {
    primary: "#E040FB",
    accent: "#FF6E40",
    bg: "rgba(16, 6, 18, 0.84)",
    text: "#FFFFFF",
    bar: "#E040FB",
    line: "rgba(255,255,255,0.12)",
  },
  Viagem: {
    primary: "#26C6DA",
    accent: "#FFA726",
    bg: "rgba(6, 14, 16, 0.82)",
    text: "#FFFFFF",
    bar: "#26C6DA",
    line: "rgba(255,255,255,0.12)",
  },
  Culinaria: {
    primary: "#FF7043",
    accent: "#FFCA28",
    bg: "rgba(16, 10, 6, 0.84)",
    text: "#FFFFFF",
    bar: "#FF7043",
    line: "rgba(255,255,255,0.12)",
  },
};

/** Paleta fallback quando o nicho não é reconhecido */
export const DEFAULT_PALETTE = {
  primary: "#F5A623",
  accent: "#4A9EFF",
  bg: "rgba(10, 10, 18, 0.82)",
  text: "#FFFFFF",
  bar: "#F5A623",
  line: "rgba(255,255,255,0.15)",
};

/**
 * Resolve a paleta para um nicho (case-insensitive, com fallback).
 */
export function resolveNichePalette(niche) {
  if (!niche) return DEFAULT_PALETTE;
  const key = Object.keys(NICHE_PALETTES).find(
    (k) => k.toLowerCase() === String(niche).toLowerCase()
  );
  return key ? NICHE_PALETTES[key] : DEFAULT_PALETTE;
}

/**
 * Gera CSS variables string para injeção inline no overlay.
 */
export function paletteToCssVars(palette) {
  const p = palette || DEFAULT_PALETTE;
  return [
    `--sc-primary: ${p.primary}`,
    `--sc-accent: ${p.accent}`,
    `--sc-bg: ${p.bg}`,
    `--sc-text: ${p.text}`,
    `--sc-bar: ${p.bar || p.primary}`,
    `--sc-line: ${p.line || "rgba(255,255,255,0.15)"}`,
    `--sc-ink: ${p.text}`,
  ].join("; ");
}
