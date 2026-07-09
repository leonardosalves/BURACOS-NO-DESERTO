#!/usr/bin/env node
/**
 * Restaura o catalogo Engenharia no servidor (85 templates).
 * Uso: node scripts/seed-engenharia-template-catalog.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildEngenhariaCatalogExport } from "../dashboard-qanat/shared/remotionTemplateEngenhariaSeed.js";
import {
  purgeTestNichesFromCatalogFile,
  syncCatalogForNiche,
} from "../dashboard-qanat/backend/remotionTemplateCatalogService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(
  __dirname,
  "../dashboard-qanat/backend/data/remotion-template-catalog.json"
);

const NICHE = "Engenharia";
const exportData = buildEngenhariaCatalogExport(NICHE);
const templates = exportData.niches[NICHE].templates;

console.log(`Gerando ${templates.length} templates para ${NICHE}...`);

const synced = syncCatalogForNiche(NICHE, templates, { replace: true });
console.log(`Sync: ${synced.count} templates em ${synced.niche}`);

const purged = purgeTestNichesFromCatalogFile();
if (purged.removed) {
  console.log(
    `Removidos ${purged.removed} nichos de teste: ${purged.niches.join(", ")}`
  );
}

const onDisk = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
const engCount = onDisk.niches?.[NICHE]?.templates?.length ?? 0;
console.log(`Catalogo em disco: ${engCount} templates em ${NICHE}`);
console.log("OK — recarregue o dashboard (F5) no nicho Engenharia.");
