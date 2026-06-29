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

function lottieVariantSeed(parts = []) {
  const raw = parts.filter((p) => p !== undefined && p !== null && String(p).length > 0).join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return h;
}

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

  const { rules = [], rankPool = [] } = loadRules();
  const titleBlob = String(title).trim();
  const hookBlob = String(visualHook).trim();

  for (const rule of rules) {
    const re = new RegExp(rule.re, "i");
    if (re.test(titleBlob)) return resolveKey(rule.key);
  }
  for (const rule of rules) {
    const re = new RegExp(rule.re, "i");
    if (re.test(hookBlob)) return resolveKey(rule.key);
  }

  const pool = rankPool.map(resolveKey).filter(Boolean);
  const safePool = pool.length ? pool : ["time", "direction", "shield", "flame", "award"];
  const idx = lottieVariantSeed([videoSeed, rank, titleBlob, hookBlob]) % safePool.length;
  return safePool[idx];
}