/**
 * genShotcraftRegistry.mjs
 * Gera shotcraftRegistry.ts a partir do catálogo backend + demos vendor (se existirem).
 *
 * Uso:
 *   node scripts/genShotcraftRegistry.mjs
 *
 * Não importa os demos TSX no bundle Remotion (muitos são composições showcase
 * sem props). O registry lista templateIds + metadados; o ShotcraftLayer renderiza
 * via data-driven renderers (props do motion plan).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ACTIVE_DEMOS_DIR = path.resolve(
  __dirname,
  "../src/overlays/shotcraft-demos"
);
const VENDOR_DEMOS_DIR = path.resolve(ROOT, "vendor/video-shotcraft/demos");
const DEMOS_DIR = fs.existsSync(ACTIVE_DEMOS_DIR)
  ? ACTIVE_DEMOS_DIR
  : VENDOR_DEMOS_DIR;
const CATALOG_PATH = path.resolve(ROOT, "backend/shotcraftCatalog.js");
const OUT_FILE = path.resolve(
  __dirname,
  "../src/overlays/shotcraftRegistry.ts"
);

async function loadCatalogIds() {
  try {
    const mod = await import(pathToFileURL(CATALOG_PATH).href);
    const list = mod.SHOTCRAFT_CATALOG || [];
    return list.map((c) => ({
      templateId: c.templateId,
      category: c.category,
      styles: c.styles || [],
      energy: c.energy || "medium",
      formats: c.supportedFormats || [],
    }));
  } catch (err) {
    console.warn("[genShotcraftRegistry] catálogo JS:", err.message);
    return [];
  }
}

function scanDemos() {
  if (!fs.existsSync(DEMOS_DIR)) return [];
  return fs
    .readdirSync(DEMOS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => {
      const dir = path.join(DEMOS_DIR, d.name);
      const tsx = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".tsx"))
        .map((f) => path.join(dir, f))[0];
      let exportName = null;
      let layoutMode = "fluid";
      if (tsx && fs.existsSync(tsx)) {
        const src = fs.readFileSync(tsx, "utf8");
        const m = src.match(/export const (\w+)/);
        exportName = m?.[1] || null;
        const fixedWidth = /width\s*:\s*1920/.test(src);
        const fixedHeight = /height\s*:\s*1080/.test(src);
        const absoluteCoordinates = (src.match(/(?:left|right)\s*:\s*\d{3,4}/g) || []).length;
        layoutMode = fixedWidth && fixedHeight || absoluteCoordinates >= 3 ? "legacy" : "fluid";
      }
      return {
        templateId: d.name,
        demoFile: tsx ? path.basename(tsx) : null,
        exportName,
        layoutMode,
        hasDemo: Boolean(tsx && exportName),
      };
    });
}

async function main() {
  const catalog = await loadCatalogIds();
  const demos = scanDemos();
  const demoById = new Map(demos.map((d) => [d.templateId, d]));

  const rows = catalog.map((c) => {
    const demo = demoById.get(c.templateId);
    return {
      ...c,
      hasDemo: Boolean(demo?.hasDemo),
      demoFile: demo?.demoFile || null,
      exportName: demo?.exportName || null,
      layoutMode: demo?.layoutMode || "fluid",
    };
  });

  // demos sem entrada no catálogo
  for (const d of demos) {
    if (!catalog.some((c) => c.templateId === d.templateId)) {
      rows.push({
        templateId: d.templateId,
        category: "elemento",
        styles: [],
        energy: "medium",
        formats: ["16:9"],
        hasDemo: d.hasDemo,
        demoFile: d.demoFile,
        exportName: d.exportName,
        layoutMode: d.layoutMode,
      });
    }
  }

  const body = `/**
 * shotcraftRegistry.ts
 * ⚠️ GERADO AUTOMATICAMENTE — não editar à mão.
 * Fonte: scripts/genShotcraftRegistry.mjs
 * Cards no catálogo: ${catalog.length} · Demos vendor: ${demos.length}
 */

export type ShotcraftRegistryEntry = {
  templateId: string;
  category: string;
  styles: string[];
  energy: string;
  formats: string[];
  hasDemo: boolean;
  demoFile: string | null;
  exportName: string | null;
  layoutMode: "fluid" | "legacy";
};

export const SHOTCRAFT_REGISTRY_ENTRIES: ShotcraftRegistryEntry[] = ${JSON.stringify(rows, null, 2)};

export const SHOTCRAFT_TEMPLATE_IDS = SHOTCRAFT_REGISTRY_ENTRIES.map(
  (e) => e.templateId
);

export const TOTAL_SHOTCRAFT_COMPONENTS = SHOTCRAFT_REGISTRY_ENTRIES.length;

export function getShotcraftRegistryEntry(
  templateId: string
): ShotcraftRegistryEntry | null {
  return (
    SHOTCRAFT_REGISTRY_ENTRIES.find((e) => e.templateId === templateId) || null
  );
}

/** IDs com demo vendor disponível (para integração futura de import dinâmico). */
export const SHOTCRAFT_DEMO_IDS = SHOTCRAFT_REGISTRY_ENTRIES.filter(
  (e) => e.hasDemo
).map((e) => e.templateId);
`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, body, "utf8");
  console.log(
    `✅ Registry gerado: ${OUT_FILE} (${rows.length} entradas, ${SHOTCRAFT_DEMO_IDS_COUNT(rows)} com demo)`
  );
}

function SHOTCRAFT_DEMO_IDS_COUNT(rows) {
  return rows.filter((r) => r.hasDemo).length;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
