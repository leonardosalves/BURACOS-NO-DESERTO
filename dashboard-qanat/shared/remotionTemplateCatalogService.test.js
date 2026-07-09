import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  attachStudioTemplateToScene,
  createCatalogNiche,
  listCatalogNiches,
  mapStudioTemplateToMotionId,
  pickStudioTemplateForTrigger,
  getCatalogForNiche,
  pruneCatalogEntriesWithoutSource,
  purgeLegacySeedTemplatesFromCatalogFile,
  resolveStudioSourceCode,
  syncCatalogForNiche,
} from "../backend/remotionTemplateCatalogService.js";
import {
  isLegacySeedTemplateId,
  LEGACY_SEED_TEMPLATE_IDS,
} from "./remotionTemplateLegacy.js";

const SAMPLE_TSX = `"use client";
import { AbsoluteFill, useCurrentFrame } from "remotion";
export const exampleProps = { title: "TESTE", value: 42 };
export default function BridgeSample() {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundColor: frame > 0 ? "#111" : "#000" }} />;
}`;

const TEST_NICHE = "__test_studio_bridge__";
const TEST_CATALOG_PATH = path.join(
  os.tmpdir(),
  `lumiera-catalog-test-${process.pid}.json`
);

before(() => {
  process.env.LUMIERA_TEMPLATE_CATALOG_PATH = TEST_CATALOG_PATH;
  fs.writeFileSync(TEST_CATALOG_PATH, JSON.stringify({ niches: {} }), "utf8");
});

after(() => {
  delete process.env.LUMIERA_TEMPLATE_CATALOG_PATH;
  try {
    fs.unlinkSync(TEST_CATALOG_PATH);
  } catch {
    /* ignore */
  }
});

describe("remotionTemplateCatalogService bridge", () => {
  it("ignora templates seed legados no sync", () => {
    const result = syncCatalogForNiche("__test_legacy_eng__", [
      {
        id: LEGACY_SEED_TEMPLATE_IDS[0],
        name: "Engineering Bar Grid",
        category: "chart-data",
        subcategory: "Bar chart",
        status: "approved",
        sourceCode: {
          short: "export function Old() { return null; }",
          long: "export function Old() { return null; }",
        },
      },
    ]);
    assert.equal(result.count, 0);
    assert.ok(isLegacySeedTemplateId(LEGACY_SEED_TEMPLATE_IDS[0]));
  });

  it("purgeLegacySeedTemplatesFromCatalogFile remove seeds do JSON", () => {
    syncCatalogForNiche("__purge_test__", [
      {
        id: LEGACY_SEED_TEMPLATE_IDS[1],
        name: "Legacy Flyover",
        category: "maps",
        subcategory: "Flyover",
        status: "approved",
      },
      {
        id: "valid-studio-keep",
        name: "Valid Keep",
        category: "chart-data",
        subcategory: "Counter",
        status: "approved",
        sourceCode: { short: SAMPLE_TSX, long: SAMPLE_TSX },
      },
    ]);
    purgeLegacySeedTemplatesFromCatalogFile();
    const kept = syncCatalogForNiche("__purge_test__", [
      {
        id: "valid-studio-keep",
        name: "Valid Keep",
        category: "chart-data",
        subcategory: "Counter",
        status: "approved",
        sourceCode: { short: SAMPLE_TSX, long: SAMPLE_TSX },
      },
    ]);
    assert.equal(kept.count, 1);
  });

  it("createCatalogNiche cria catalogo vazio e listCatalogNiches oculta nichos de teste", () => {
    const nicheName = "__test_create_catalog_niche__";
    const created = createCatalogNiche(nicheName);
    assert.equal(created.ok, true);
    assert.equal(created.niche, nicheName);
    assert.equal(created.count, 0);

    const niches = listCatalogNiches();
    assert.ok(!niches.some((row) => row.niche === nicheName));
  });

  it("mapStudioTemplateToMotionId mapeia bar chart corretamente", () => {
    const id = mapStudioTemplateToMotionId({
      name: "Engenharia Bar chart Draft",
      category: "chart-data",
      subcategory: "Bar chart",
      shortPreview: "bars",
    });
    assert.equal(id, "bar-chart");
  });

  it("pruneCatalogEntriesWithoutSource remove metadados sem TSX", () => {
    syncCatalogForNiche("__prune_test__", [
      {
        id: "meta-only",
        name: "Meta Only",
        category: "chart-data",
        subcategory: "Counter",
        status: "approved",
      },
      {
        id: "tsx-ready",
        name: "TSX Ready",
        category: "chart-data",
        subcategory: "Counter",
        status: "approved",
        sourceCode: { short: SAMPLE_TSX, long: SAMPLE_TSX },
      },
    ]);
    const pruned = pruneCatalogEntriesWithoutSource();
    assert.ok(pruned.removed >= 1);
    const catalog = getCatalogForNiche("__prune_test__");
    assert.equal(catalog.templates.length, 1);
    assert.equal(catalog.templates[0].id, "tsx-ready");
  });

  it("getCatalogForNiche resolve nicho sem diferenciar maiusculas", () => {
    syncCatalogForNiche("Engenharia", [
      {
        id: "eng-case-test",
        name: "Case Test",
        category: "chart-data",
        subcategory: "Counter",
        status: "approved",
        sourceCode: { short: SAMPLE_TSX, long: SAMPLE_TSX },
      },
    ]);
    const upper = getCatalogForNiche("ENGENHARIA");
    assert.equal(upper.templates.length, 1);
    assert.equal(upper.templates[0].id, "eng-case-test");
    syncCatalogForNiche("Engenharia", []);
  });

  it("sync persiste sourceCode e pick escolhe template do nicho", () => {
    syncCatalogForNiche(TEST_NICHE, [
      {
        id: "studio-bar-1",
        name: "Test Bar chart",
        category: "chart-data",
        subcategory: "Bar chart",
        niche: TEST_NICHE,
        status: "approved",
        description: "Barras de teste",
        dataSlots: ["title", "items"],
        shortPreview: "bars",
        longPreview: "bars",
        sourceCode: { short: SAMPLE_TSX, long: SAMPLE_TSX },
      },
      {
        id: "studio-counter-1",
        name: "Test Counter",
        category: "chart-data",
        subcategory: "Counter",
        niche: TEST_NICHE,
        status: "approved",
        description: "Contador",
        dataSlots: ["value", "label"],
        shortPreview: "counter",
        longPreview: "counter",
        sourceCode: { short: SAMPLE_TSX, long: SAMPLE_TSX },
      },
    ]);

    const pick = pickStudioTemplateForTrigger({
      trigger: "comparison",
      motionTemplateId: "bar-chart",
      niche: TEST_NICHE,
      aspectRatio: "9:16",
    });

    assert.ok(pick);
    assert.equal(pick.id, "studio-bar-1");
    assert.ok(pick.studio_source_code.includes("useCurrentFrame"));

    const scene = attachStudioTemplateToScene(
      {
        template_id: "bar-chart",
        props: { title: "COMPARACAO", aspect_ratio: "9:16" },
      },
      pick
    );

    assert.equal(scene.props.template_studio_id, "studio-bar-1");
    assert.ok(scene.props.studio_source_code);
    assert.equal(
      resolveStudioSourceCode(pick, "16:9"),
      resolveStudioSourceCode(pick, "9:16")
    );
  });
});
