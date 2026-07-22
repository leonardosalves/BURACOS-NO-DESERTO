/**
 * templateSeedData.js — Builds seed data from the shotcraft registry.
 * Reads the manifest and registry to produce template/niche/category seeds.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MANIFEST_PATH = join(
  __dirname,
  "../remotion-renderer/src/overlays/shotcraft-demos-manifest.json"
);

/** Category metadata for seed */
const CATEGORIES = [
  {
    category: "dados",
    label: "Dados & Métricas",
    subcategories: ["odometer", "gauge", "chart", "counter", "dataviz"],
    icon: "bar-chart",
  },
  {
    category: "comparacao",
    label: "Comparação",
    subcategories: ["before-after", "versus", "slider"],
    icon: "columns",
  },
  {
    category: "timeline",
    label: "Timeline & Cronologia",
    subcategories: ["travel", "typewriter", "chronolog"],
    icon: "clock",
  },
  {
    category: "lista",
    label: "Lista & Ranking",
    subcategories: ["stack", "wall", "ranking", "top"],
    icon: "list",
  },
  {
    category: "texto",
    label: "Texto & Tipografia",
    subcategories: ["kinetic", "sweep", "stomp", "marker", "type"],
    icon: "type",
  },
  {
    category: "transicao",
    label: "Transições",
    subcategories: ["wipe", "push", "iris", "match-cut", "hidden-cut"],
    icon: "shuffle",
  },
  {
    category: "camera",
    label: "Câmera & Movimento",
    subcategories: ["crane", "drone", "space", "depth", "orbit"],
    icon: "video",
  },
  {
    category: "impacto",
    label: "Impacto & Ênfase",
    subcategories: ["crash-zoom", "slam", "punch", "flash"],
    icon: "zap",
  },
  {
    category: "abertura",
    label: "Abertura & Brand",
    subcategories: ["brand-ink", "neon", "frame-snap", "logo"],
    icon: "play-circle",
  },
  {
    category: "encerramento",
    label: "Encerramento & Outro",
    subcategories: ["outro", "strip-away", "launch", "group-photo"],
    icon: "stop-circle",
  },
  {
    category: "elemento",
    label: "Elementos & UI",
    subcategories: ["card", "bubble", "cursor", "hud", "stream"],
    icon: "layout",
  },
];

/** Niche palettes for seed */
const NICHES = [
  {
    niche: "Engenharia",
    label: "Engenharia & Construção",
    palette: {
      primary: "#F5A623",
      accent: "#4A9EFF",
      bg: "rgba(10,10,18,0.82)",
      text: "#FFFFFF",
      bar: "#F5A623",
      line: "rgba(255,255,255,0.15)",
    },
  },
  {
    niche: "Natureza",
    label: "Natureza & Meio Ambiente",
    palette: {
      primary: "#4CAF50",
      accent: "#81C784",
      bg: "rgba(8,18,10,0.82)",
      text: "#FFFFFF",
      bar: "#4CAF50",
      line: "rgba(255,255,255,0.12)",
    },
  },
  {
    niche: "Tecnologia",
    label: "Tecnologia & Inovação",
    palette: {
      primary: "#7C4DFF",
      accent: "#00E5FF",
      bg: "rgba(12,8,24,0.85)",
      text: "#FFFFFF",
      bar: "#7C4DFF",
      line: "rgba(255,255,255,0.12)",
    },
  },
  {
    niche: "Financas",
    label: "Finanças & Economia",
    palette: {
      primary: "#FFD700",
      accent: "#00C853",
      bg: "rgba(10,12,8,0.84)",
      text: "#FFFFFF",
      bar: "#FFD700",
      line: "rgba(255,255,255,0.12)",
    },
  },
  {
    niche: "Saude",
    label: "Saúde & Bem-estar",
    palette: {
      primary: "#FF5252",
      accent: "#FF8A80",
      bg: "rgba(18,8,10,0.82)",
      text: "#FFFFFF",
      bar: "#FF5252",
      line: "rgba(255,255,255,0.12)",
    },
  },
  {
    niche: "Ciencia",
    label: "Ciência & Pesquisa",
    palette: {
      primary: "#00BCD4",
      accent: "#B388FF",
      bg: "rgba(6,14,18,0.84)",
      text: "#FFFFFF",
      bar: "#00BCD4",
      line: "rgba(255,255,255,0.12)",
    },
  },
  {
    niche: "Historia",
    label: "História & Cultura",
    palette: {
      primary: "#FF8F00",
      accent: "#FFCC02",
      bg: "rgba(16,12,6,0.84)",
      text: "#FFFFFF",
      bar: "#FF8F00",
      line: "rgba(255,255,255,0.12)",
    },
  },
  {
    niche: "Esporte",
    label: "Esporte & Fitness",
    palette: {
      primary: "#FF3D00",
      accent: "#FFEA00",
      bg: "rgba(14,8,6,0.84)",
      text: "#FFFFFF",
      bar: "#FF3D00",
      line: "rgba(255,255,255,0.12)",
    },
  },
  {
    niche: "Educacao",
    label: "Educação & Ensino",
    palette: {
      primary: "#2196F3",
      accent: "#64FFDA",
      bg: "rgba(8,12,20,0.84)",
      text: "#FFFFFF",
      bar: "#2196F3",
      line: "rgba(255,255,255,0.12)",
    },
  },
  {
    niche: "Entretenimento",
    label: "Entretenimento & Mídia",
    palette: {
      primary: "#E040FB",
      accent: "#FF6E40",
      bg: "rgba(16,6,18,0.84)",
      text: "#FFFFFF",
      bar: "#E040FB",
      line: "rgba(255,255,255,0.12)",
    },
  },
  {
    niche: "Viagem",
    label: "Viagem & Turismo",
    palette: {
      primary: "#26C6DA",
      accent: "#FFA726",
      bg: "rgba(6,14,16,0.82)",
      text: "#FFFFFF",
      bar: "#26C6DA",
      line: "rgba(255,255,255,0.12)",
    },
  },
  {
    niche: "Culinaria",
    label: "Culinária & Gastronomia",
    palette: {
      primary: "#FF7043",
      accent: "#FFCA28",
      bg: "rgba(16,10,6,0.84)",
      text: "#FFFFFF",
      bar: "#FF7043",
      line: "rgba(255,255,255,0.12)",
    },
  },
];

/** Infer category from template_id patterns */
function inferCategory(id) {
  if (
    /odometer|digit|gauge|chart|dataviz|particle|counter|stat|metric|readout/.test(
      id
    )
  )
    return "dados";
  if (/before-after|versus|slider|column-converge|compar/.test(id))
    return "comparacao";
  if (/timeline|travel|typewriter|chronolog/.test(id)) return "timeline";
  if (/list|stack|wall|ranking|top/.test(id)) return "lista";
  if (
    /word|text|type|letter|title|marker|sweep|kinetic|stomp|gradient-word|letterspace/.test(
      id
    )
  )
    return "texto";
  if (
    /wipe|push|iris|match-cut|hidden-cut|transition|crossfade|dissolve/.test(id)
  )
    return "transicao";
  if (/camera|crane|drone|space|zoom|depth|orbit|dolly|pan|tilt/.test(id))
    return "camera";
  if (/crash|slam|punch|flash|impact|stomp|beat-cut/.test(id)) return "impacto";
  if (/brand|open|intro|neon|frame-snap|logo|ink/.test(id)) return "abertura";
  if (/outro|encerr|close|end|launch|strip-away|group-photo/.test(id))
    return "encerramento";
  return "elemento";
}

/** Infer energy from template_id patterns */
function inferEnergy(id) {
  if (/crash|slam|punch|flash|stomp|beat|impact|zoom/.test(id)) return "high";
  if (/fade|dissolve|gentle|slow|ambient|drift/.test(id)) return "low";
  return "medium";
}

/**
 * Build the complete seed data object.
 */
export function buildSeedData() {
  let manifest = [];
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  } catch {
    console.warn("[TemplateSeed] Could not read manifest, using empty seed");
  }

  const templates = manifest.map((entry) => ({
    template_id: entry.id,
    name: entry.id
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    category: inferCategory(entry.id),
    niche: null, // templates are niche-agnostic by default
    energy: inferEnergy(entry.id),
    formats: ["16:9", "9:16"],
    tsx_source: null, // TSX lives in remotion-renderer, not in DB
    palette: null,
    default_props: null,
    duration_seconds: 4.0,
    approved: true,
  }));

  return {
    templates,
    niches: NICHES,
    categories: CATEGORIES,
  };
}
