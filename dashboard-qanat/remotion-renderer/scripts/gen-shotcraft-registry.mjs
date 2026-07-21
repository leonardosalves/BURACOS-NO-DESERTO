/**
 * Gera manifesto de demos do video-shotcraft (exports reais).
 * Uso: node scripts/gen-shotcraft-registry.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demosRoot = path.resolve(
  __dirname,
  "../../vendor/video-shotcraft/demos"
);
const outPath = path.resolve(
  __dirname,
  "../src/overlays/shotcraft-demos-manifest.json"
);

if (!fs.existsSync(demosRoot)) {
  console.error("Demos não encontrados em", demosRoot);
  console.error("Clone: git clone --depth 1 https://github.com/Vincentwei1021/video-shotcraft.git dashboard-qanat/vendor/video-shotcraft");
  process.exit(1);
}

const rows = [];
for (const dir of fs.readdirSync(demosRoot, { withFileTypes: true })) {
  if (!dir.isDirectory() || dir.name.startsWith("_")) continue;
  const dirPath = path.join(demosRoot, dir.name);
  let tsx = fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => path.join(dirPath, f))[0];
  if (!tsx) {
    const nested = fs
      .readdirSync(dirPath, { recursive: true })
      .filter((f) => String(f).endsWith(".tsx"))
      .map((f) => path.join(dirPath, f))[0];
    tsx = nested;
  }
  let exportName = null;
  if (tsx && fs.existsSync(tsx)) {
    const src = fs.readFileSync(tsx, "utf8");
    const m = src.match(/export const (\w+)/);
    exportName = m?.[1] || null;
  }
  rows.push({
    id: dir.name,
    file: tsx ? path.basename(tsx) : "",
    export: exportName,
  });
}

fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf8");
console.log(`Wrote ${rows.length} demos → ${outPath}`);
