/**
 * Indexa TODOS os JSON em lottie_assets/ — NUNCA apaga arquivos.
 * Gera apenas metadados (pools + keys). JSONs são carregados em runtime (fetch/fs).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "../src/overlays/lottie_assets");
const OUT_INDEX = path.join(__dirname, "../src/overlays/lottieRegistry.generated.ts");
const OUT_ASSET_MAP = path.join(__dirname, "../src/overlays/lottieAssetMap.generated.ts");
const OUT_CATALOG = path.join(__dirname, "../src/overlays/lottieCatalog.json");
const LEGACY_CHUNK_DIR = path.join(__dirname, "../src/overlays/lottie-registry");

const CATEGORY_PRIORITY = {
  nature: 0, edu: 1, life: 2, tech: 3, biz: 4, sports: 5,
  interact: 6, social: 7, arrow: 8, ui: 9, misc: 10,
};

function parseFilename(filename) {
  const standard = filename.match(/^lottie_([a-z]+)_([a-z0-9]+)_(\d+)\.json$/);
  if (standard) {
    return { category: standard[1], key: standard[2], variant: Number(standard[3]), filename };
  }
  const simple = filename.match(/^([a-z0-9_]+)\.json$/);
  if (simple) {
    return { category: "misc", key: simple[1].replace(/^weather_/, ""), variant: 1, filename };
  }
  return null;
}

function sortPoolEntries(entries) {
  return [...entries].sort((a, b) => {
    const pa = CATEGORY_PRIORITY[a.category] ?? 99;
    const pb = CATEGORY_PRIORITY[b.category] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.variant - b.variant;
  });
}

const files = fs.readdirSync(ASSETS_DIR).filter((f) => f.endsWith(".json")).sort();
const byKey = new Map();
const catalog = [];

for (const file of files) {
  const parsed = parseFilename(file);
  if (!parsed) {
    catalog.push({ filename: file, key: null, category: null, variant: null });
    continue;
  }
  if (!byKey.has(parsed.key)) byKey.set(parsed.key, []);
  byKey.get(parsed.key).push(parsed);
  catalog.push({ filename: file, key: parsed.key, category: parsed.category, variant: parsed.variant });
}

const keys = [...byKey.keys()].sort();
const poolObj = Object.fromEntries(
  keys.map((k) => [k, sortPoolEntries(byKey.get(k)).map((e) => e.filename)]),
);

if (fs.existsSync(LEGACY_CHUNK_DIR)) {
  for (const f of fs.readdirSync(LEGACY_CHUNK_DIR)) {
    fs.unlinkSync(path.join(LEGACY_CHUNK_DIR, f));
  }
  fs.rmdirSync(LEGACY_CHUNK_DIR);
}

const indexContent = `/* eslint-disable */
// AUTO-GENERATED — metadata only. ${files.length} arquivos, ${keys.length} pools. JSON via lottieAssetMap.generated.ts.
import { LOTTIE_POOLS } from "./lottiePools.generated";

export { LOTTIE_POOLS };

export const LOTTIE_FILE_COUNT = ${files.length};
export const LOTTIE_DEFAULT_FILE = ${JSON.stringify(poolObj.award?.[0] || "lottie_biz_award_1.json")};
export const LOTTIE_KEYS = ${JSON.stringify(keys)} as const;
export type LottieRegistryKey = typeof LOTTIE_KEYS[number];
`;

const poolsContent = `/* eslint-disable */
// AUTO-GENERATED pools — todas as variantes por chave
export const LOTTIE_POOLS: Record<string, string[]> = ${JSON.stringify(poolObj, null, 2)};
`;

const importLines = files.map((file, i) => `import lottieAsset${i} from "./lottie_assets/${file}";`);
const mapEntries = files.map((file, i) => `  ${JSON.stringify(file)}: lottieAsset${i},`);
const assetMapContent = `/* eslint-disable */
// AUTO-GENERATED — webpack-safe static imports for Remotion bundle (${files.length} arquivos).
${importLines.join("\n")}

export const LOTTIE_ASSET_MAP: Record<string, object> = {
${mapEntries.join("\n")}
};
`;

fs.writeFileSync(OUT_INDEX, indexContent, "utf8");
fs.writeFileSync(OUT_ASSET_MAP, assetMapContent, "utf8");
fs.writeFileSync(path.join(__dirname, "../src/overlays/lottiePools.generated.ts"), poolsContent, "utf8");
fs.writeFileSync(OUT_CATALOG, JSON.stringify({
  generated_at: new Date().toISOString(),
  file_count: files.length,
  key_count: keys.length,
  policy: "append_only_never_delete",
  scope: "global_all_videos",
  load_mode: "webpack_static_imports",
  files: catalog,
  pools: poolObj,
}, null, 2), "utf8");

console.log(`[lottie-registry] ${files.length} arquivos · ${keys.length} pools · metadata-only`);