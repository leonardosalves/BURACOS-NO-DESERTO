import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_PATH = path.join(__dirname, "../remotion-renderer/src/overlays/listicleLottieRules.json");

const KEY_ALIASES = {
  compass: "direction",
  clock: "time",
  hourglass: "time",
  ship: "anchor",
  sword: "shield",
  temple: "pillar",
  hammer: "gear",
  pickaxe: "gear",
  microscope: "dna",
  telescope: "rocket",
};

let cachedRules = null;

function loadRules() {
  if (cachedRules) return cachedRules;
  cachedRules = JSON.parse(fs.readFileSync(RULES_PATH, "utf8"));
  return cachedRules;
}

function resolveKey(key) {
  return KEY_ALIASES[key] || key;
}

export function lottieVariantSeed(parts = []) {
  const raw = parts.filter((p) => p !== undefined && p !== null && String(p).length > 0).join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Identidade única do vídeo — pasta do projeto + tema + títulos dos itens. */
export function buildListicleVideoSeed(config = {}, storyboard = {}, projectSlug = "") {
  const listItems = Array.isArray(storyboard.list_items)
    ? storyboard.list_items
    : Array.isArray(storyboard.listicle_meta?.items)
      ? storyboard.listicle_meta.items
      : [];
  const titles = listItems
    .map((it) => String(it.title || it.name || "").trim())
    .filter(Boolean)
    .join("§");
  return [
    projectSlug || config.project_slug || "",
    storyboard.strategy?.title_main || "",
    storyboard.list_topic || storyboard.listicle_meta?.topic || "",
    config.niche || "",
    titles,
  ].filter(Boolean).join("|");
}

function buildLottieCatalog() {
  const { rules = [], rankPool = [] } = loadRules();
  const catalog = [...new Set([
    ...rankPool.map(resolveKey),
    ...rules.map((r) => resolveKey(r.key)),
  ])].filter(Boolean);
  return catalog.length ? catalog : ["time", "direction", "shield", "flame", "award"];
}

/**
 * Ícone por item — videoSeed (projeto) é o fator principal para variar entre vídeos.
 * Título/hook entram no hash mas não fixam o mesmo ícone em todos os vídeos do nicho.
 */
export function pickListicleLottieKey({
  visualHook = "",
  title = "",
  rank,
  isClimax = false,
  isIntro = false,
  videoSeed = "",
} = {}) {
  if (isIntro) return "sparkles";
  if (isClimax) return "crown";

  const titleBlob = String(title).trim();
  const hookBlob = String(visualHook).trim();
  const pool = buildLottieCatalog();
  const idx = lottieVariantSeed([videoSeed, rank, titleBlob, hookBlob]) % pool.length;
  return pool[idx];
}