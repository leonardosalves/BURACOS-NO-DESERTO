/**
 * Indexa TODOS os JSON em lottie_assets/ — NUNCA apaga arquivos.
 * Gera chunks de imports (evita OOM no TypeScript) + pools com todas as variantes.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "../src/overlays/lottie_assets");
const OUT_DIR = path.join(__dirname, "../src/overlays/lottie-registry");
const OUT_INDEX = path.join(__dirname, "../src/overlays/lottieRegistry.generated.ts");
const OUT_CATALOG = path.join(__dirname, "../src/overlays/lottieCatalog.json");

const CHUNK_SIZE = 48;

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

function safeVarName(filename) {
  return `lf_${filename.replace(/\.json$/i, "").replace(/[^a-zA-Z0-9]/g, "_")}`;
}

function sortPoolEntries(entries) {
  return [...entries].sort((a, b) => {
    const pa = CATEGORY_PRIORITY[a.category] ?? 99;
    const pb = CATEGORY_PRIORITY[b.category] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.variant - b.variant;
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });

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

// Remove old chunks
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.startsWith("chunk-") && f.endsWith(".ts")) fs.unlinkSync(path.join(OUT_DIR, f));
}

const chunkImports = [];
for (let i = 0; i < files.length; i += CHUNK_SIZE) {
  const slice = files.slice(i, i + CHUNK_SIZE);
  const chunkId = Math.floor(i / CHUNK_SIZE);
  const lines = slice.map((file) => {
    const varName = safeVarName(file);
    return `import ${varName} from "../lottie_assets/${file}";\nexport const entries_${chunkId}_${varName} = { ${JSON.stringify(file)}: ${varName} };`;
  });
  const chunkFile = path.join(OUT_DIR, `chunk-${chunkId}.ts`);
  fs.writeFileSync(chunkFile, `/* eslint-disable */\n${lines.join("\n")}\n`, "utf8");
  chunkImports.push(`import * as chunk${chunkId} from "./lottie-registry/chunk-${chunkId}";`);
}

const chunkCount = Math.ceil(files.length / CHUNK_SIZE);
const mergeLines = [];
for (let c = 0; c < chunkCount; c++) {
  mergeLines.push(`  ...extractChunkEntries(chunk${c}),`);
}

const indexContent = `/* eslint-disable */
// AUTO-GENERATED — NUNCA apaga lottie_assets. ${files.length} arquivos, ${keys.length} pools.
import { LOTTIE_POOLS } from "./lottiePools.generated";

${chunkImports.join("\n")}

function extractChunkEntries(mod: Record<string, unknown>) {
  const out: Record<string, object> = {};
  for (const [k, v] of Object.entries(mod)) {
    if (!k.startsWith("entries_")) continue;
    Object.assign(out, v as Record<string, object>);
  }
  return out;
}

const LOTTIE_BY_FILE: Record<string, object> = {
${mergeLines.join("\n")}
};

export { LOTTIE_BY_FILE, LOTTIE_POOLS };

export const LOTTIE_REGISTRY: Record<string, object> = {
${keys.map((key) => {
  const f = poolObj[key][0];
  return `  ${JSON.stringify(key)}: LOTTIE_BY_FILE[${JSON.stringify(f)}],`;
}).join("\n")}
};

export const LOTTIE_FILE_COUNT = ${files.length};
export const LOTTIE_KEYS = ${JSON.stringify(keys)} as const;
export type LottieRegistryKey = typeof LOTTIE_KEYS[number];
`;

const poolsContent = `/* eslint-disable */
// AUTO-GENERATED pools — todas as variantes por chave
export const LOTTIE_POOLS: Record<string, string[]> = ${JSON.stringify(poolObj, null, 2)};
`;

fs.writeFileSync(OUT_INDEX, indexContent, "utf8");
fs.writeFileSync(path.join(__dirname, "../src/overlays/lottiePools.generated.ts"), poolsContent, "utf8");
fs.writeFileSync(OUT_CATALOG, JSON.stringify({
  generated_at: new Date().toISOString(),
  file_count: files.length,
  key_count: keys.length,
  policy: "append_only_never_delete",
  scope: "global_all_videos",
  files: catalog,
  pools: poolObj,
}, null, 2), "utf8");

console.log(`[lottie-registry] ${files.length} arquivos · ${keys.length} pools · ${chunkCount} chunks`);