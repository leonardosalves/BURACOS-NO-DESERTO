import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  injectStudioBackgroundFrames,
  injectStudioTransitionScenes,
} from "./studioTemplateRoleInjector.js";
import {
  pickStudioTemplateByCategory,
  syncCatalogForNiche,
} from "../backend/remotionTemplateCatalogService.js";

const ROLE_TSX = `"use client";
import { AbsoluteFill, useCurrentFrame } from "remotion";
export const exampleProps = { text: "TRANS" };
export default function RoleTpl() {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: frame / 30 }} />;
}`;

const ROLE_NICHE = "__test_studio_role_inject__";
const TEST_CATALOG_PATH = path.join(
  os.tmpdir(),
  `lumiera-cat-studioTemplateRoleInjector-${process.pid}.json`
);

before(() => {
  process.env.LUMIERA_TEMPLATE_CATALOG_PATH = TEST_CATALOG_PATH;
  fs.writeFileSync(TEST_CATALOG_PATH, JSON.stringify({ niches: {} }), "utf8");
});

after(() => {
  delete process.env.LUMIERA_TEMPLATE_CATALOG_PATH;
  try {
    fs.unlinkSync(TEST_CATALOG_PATH);
  } catch {}
});

describe("studioTemplateRoleInjector", () => {
  it("injeta transição entre blocos em 16:9", () => {
    syncCatalogForNiche(ROLE_NICHE, [
      {
        id: "role-transition",
        name: "Chapter Wipe",
        category: "transition",
        subcategory: "Wipe",
        niche: ROLE_NICHE,
        status: "approved",
        description: "Transição entre capítulos",
        dataSlots: ["text"],
        shortPreview: "wipe",
        longPreview: "wipe",
        sourceCode: { short: ROLE_TSX, long: ROLE_TSX },
      },
    ]);

    const visualPrompts = [
      {
        scene: "1.1",
        block: 1,
        narration_text: "Introdução ao tema.",
        speech_start: 0,
      },
      {
        scene: "2.1",
        block: 2,
        narration_text: "Segundo bloco com dados técnicos.",
        speech_start: 30,
      },
      {
        scene: "3.1",
        block: 3,
        narration_text: "Terceiro bloco continua a análise.",
        speech_start: 60,
      },
    ];

    const { scenes, injected } = injectStudioTransitionScenes({
      scenes: [],
      visualPrompts,
      config: {
        niche: ROLE_NICHE,
        aspect_ratio: "16:9",
        motion_template_pack: { enabled: true, niche: ROLE_NICHE },
      },
      studioNiche: ROLE_NICHE,
      aspectRatio: "16:9",
      pickStudioTemplateByCategory,
    });

    assert.equal(injected.length, 2);
    assert.equal(scenes.length, 2);
    assert.ok(scenes.every((s) => s.props?.studio_role === "transition"));
    assert.ok(scenes.some((s) => s.block === 2));
    assert.ok(scenes.some((s) => s.block === 3));
  });

  it("injeta background em bloco técnico de engenharia", () => {
    syncCatalogForNiche(ROLE_NICHE, [
      {
        id: "role-background",
        name: "Tech Grid Frame",
        category: "background",
        subcategory: "Grid",
        niche: ROLE_NICHE,
        status: "approved",
        description: "Fundo técnico",
        dataSlots: ["text", "projectCode"],
        shortPreview: "grid",
        longPreview: "grid",
        sourceCode: { short: ROLE_TSX, long: ROLE_TSX },
      },
    ]);

    const visualPrompts = [
      {
        scene: "2.1",
        block: 2,
        narration_text:
          "A estrutura de concreto suporta 40 MPa de resistência na fundação.",
        speech_start: 12,
      },
    ];

    const { scenes, injected } = injectStudioBackgroundFrames({
      scenes: [],
      visualPrompts,
      config: {
        niche: "Engenharia",
        aspect_ratio: "16:9",
        motion_template_pack: { enabled: true, niche: ROLE_NICHE },
        project_name: "Ponte Teste",
      },
      studioNiche: ROLE_NICHE,
      aspectRatio: "16:9",
      pickStudioTemplateByCategory,
    });

    assert.equal(injected.length, 1);
    assert.equal(scenes[0].props.studio_role, "background_frame");
    assert.equal(scenes[0].props.studio_z_index, "under");
    assert.ok(scenes[0].props.projectCode);
  });

  it("não injeta roles em shorts 9:16", () => {
    const { scenes, injected } = injectStudioTransitionScenes({
      scenes: [],
      visualPrompts: [
        { block: 2, narration_text: "Bloco dois.", speech_start: 5 },
      ],
      config: {
        motion_template_pack: { enabled: true, niche: ROLE_NICHE },
      },
      studioNiche: ROLE_NICHE,
      aspectRatio: "9:16",
      pickStudioTemplateByCategory,
    });
    assert.equal(injected.length, 0);
    assert.equal(scenes.length, 0);
  });
});
