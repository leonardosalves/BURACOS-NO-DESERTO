/**
 * Migra o template PIP original (Norma_NBR_6118) para o catalogo versionado em git.
 * Uso: node scripts/migrate-pip-template-to-catalog.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { syncCatalogForNiche } from "../dashboard-qanat/backend/remotionTemplateCatalogService.js";
import { repairCorruptedTemplateStringLiterals } from "../dashboard-qanat/shared/remotionTemplateSourceRepair.js";
import { patchGeoPipTemplateSourceForChrome } from "../dashboard-qanat/shared/geoPipTemplateSourcePatch.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");

const NORMA_TIMELINE =
  "C:/Users/Leo/Desktop/Lumiera Videos/videos curtos shorts/Norma_NBR_6118/timeline_studio.json";
const DESKTOP_BACKUP = "C:/Users/Leo/Desktop/lumiera-templates-backup.json";

const PIP_CATALOG_ID = "eng-image-media-picture-in-picture";
const PIP_DATA_SLOTS = [
  "mainMediaUrl",
  "pipMediaUrl",
  "mainTitle",
  "mainSubtitle",
  "pipTitle",
  "pipSubtitle",
  "pipTag",
  "coordinateText",
  "distanceText",
  "descriptorText",
  "projectCode",
  "statusText",
  "location",
  "panelLabel",
  "pipDelayFrames",
  "pipWidth",
  "pipHeight",
  "pipPosition",
  "pipInset",
  "showMainContentLabel",
  "showPointerLines",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
  "geoPipOverlayChrome",
];

function loadPipFromNorma() {
  if (!fs.existsSync(NORMA_TIMELINE)) {
    throw new Error(`Projeto Norma nao encontrado: ${NORMA_TIMELINE}`);
  }
  const studio = JSON.parse(fs.readFileSync(NORMA_TIMELINE, "utf8"));
  const clip = (studio.clips || []).find(
    (c) => c.props?.geo_pip_composite && c.props?.studio_source_code
  );
  if (!clip?.props?.studio_source_code) {
    throw new Error("studio_source_code PIP nao encontrado em Norma_NBR_6118");
  }
  let source = repairCorruptedTemplateStringLiterals(
    String(clip.props.studio_source_code)
  );
  source = patchGeoPipTemplateSourceForChrome(source);
  return {
    source,
    name:
      clip.props.template_studio_name || "Engenharia Picture in Picture Draft",
    category: clip.props.template_studio_category || "image-media",
    subcategory:
      clip.props.template_studio_subcategory || "Picture in Picture",
    dataSlots:
      clip.props.template_studio_data_slots?.length > 0
        ? clip.props.template_studio_data_slots
        : PIP_DATA_SLOTS,
  };
}

function loadEngenhariaTemplates() {
  if (fs.existsSync(DESKTOP_BACKUP)) {
    const parsed = JSON.parse(fs.readFileSync(DESKTOP_BACKUP, "utf8"));
    if (Array.isArray(parsed) && parsed.length) return parsed;
  }
  return [];
}

function buildPipCatalogEntry(pip) {
  const source = pip.source.trim();
  return {
    id: PIP_CATALOG_ID,
    name: pip.name,
    category: pip.category,
    subcategory: pip.subcategory,
    niche: "Engenharia",
    status: "approved",
    description:
      "PIP tecnico importado do projeto Norma_NBR_6118 (madrugada 09/07). Versionado em git.",
    dataSlots: pip.dataSlots,
    shortPreview: "live",
    longPreview: "live",
    sourceCode: { short: source, long: source },
  };
}

function upsertPip(templates, pipEntry) {
  const list = Array.isArray(templates) ? [...templates] : [];
  const idx = list.findIndex(
    (tpl) =>
      tpl.id === PIP_CATALOG_ID ||
      String(tpl.subcategory || "")
        .toLowerCase()
        .includes("picture in picture")
  );
  if (idx >= 0) list[idx] = { ...list[idx], ...pipEntry };
  else list.push(pipEntry);
  return list.filter((tpl) => tpl.id !== "eng-case-test");
}

const pip = loadPipFromNorma();
const pipEntry = buildPipCatalogEntry(pip);
const base = loadEngenhariaTemplates();
const templates = upsertPip(base, pipEntry);

const result = syncCatalogForNiche("Engenharia", templates, { replace: true });

console.log(
  JSON.stringify(
    {
      pipChars: pip.source.length,
      pipId: PIP_CATALOG_ID,
      pipHasEngineeringPictureInPicture: pip.source.includes(
        "EngineeringPictureInPicture"
      ),
      templatesInCatalog: result.count,
      catalogPath:
        process.env.LUMIERA_TEMPLATE_CATALOG_PATH ||
        path.join(REPO, "dashboard-qanat/backend/data/remotion-template-catalog.json"),
      sync: result,
    },
    null,
    2
  )
);