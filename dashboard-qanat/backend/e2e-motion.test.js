/**
 * e2e-motion.test.js
 * criador → tag → motion plan → override → validação
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  tagStoryboardWithMotion,
  isStoryboardTagged,
} from "./creatorSceneTagger.js";
import {
  buildMotionPlan,
  validateMotionPlan,
  applyMotionOverrides,
} from "./motionDirector.js";
import { SHOTCRAFT_CATALOG } from "./shotcraftCatalog.js";
import { TOTAL_MAPPED_CARDS } from "./shotcraftPropsMap.js";

const STORYBOARD_MOCK = {
  visual_prompts: [
    {
      scene: 1,
      narration_text:
        "Em 1927, começou a construção da estrutura mais ambiciosa da época.",
    },
    {
      scene: 2,
      narration_text:
        "Ela atingiu impressionantes 73 metros de altura, um recorde mundial.",
    },
    {
      scene: 3,
      narration_text:
        "Comparando com o modelo anterior, era praticamente o dobro do tamanho.",
    },
    {
      scene: 4,
      narration_text:
        "Em primeiro lugar no ranking, superou todas as expectativas.",
    },
    {
      scene: 5,
      narration_text: "E o mais incrível: ninguém acreditava que fosse possível.",
    },
  ],
};

test("E2E: pré-requisitos do sistema", () => {
  assert.equal(SHOTCRAFT_CATALOG.length, 106, "catálogo deve ter 106 cards");
  assert.ok(TOTAL_MAPPED_CARDS >= 20, "props mapeados dos cards principais");
});

test("E2E: Fase 5 — criador taggeia o storyboard", () => {
  const tagged = tagStoryboardWithMotion(STORYBOARD_MOCK, {
    format: "16:9",
    niche: "engenharia",
  });

  assert.ok(isStoryboardTagged(tagged));
  assert.equal(tagged.visual_prompts.length, 5);
  assert.ok(tagged.visual_prompts[1].scene_function.includes("dado_numerico"));
  assert.equal(tagged.visual_prompts[1].extracted_data.valor, "73");
  assert.ok(tagged.visual_prompts[2].scene_function.includes("comparacao"));
  assert.ok(tagged.visual_prompts[3].scene_function.includes("ranking"));
  for (const cena of tagged.visual_prompts) {
    assert.ok(cena.suggested_shot, `cena ${cena.scene} deve ter suggested_shot`);
  }
});

test("E2E: Fase 4 — motionDirector gera o motion plan", () => {
  const tagged = tagStoryboardWithMotion(STORYBOARD_MOCK, {
    format: "16:9",
    niche: "engenharia",
  });
  const plan = buildMotionPlan({
    storyboard: tagged,
    niche: "engenharia",
    format: "16:9",
  });

  assert.ok(plan.abertura);
  assert.ok(plan.encerramento);
  assert.equal(plan.cenas.length, 5);
  assert.ok(plan.palette);
  assert.equal(plan.abertura.templateId, "brand-ink-open");
  for (const cena of plan.cenas) {
    assert.ok(
      cena.motion_shot || cena.camera_move,
      `cena ${cena.scene_ref} deve ter motion_shot ou camera_move`
    );
  }
  assert.ok(validateMotionPlan(plan).ok);
});

test("E2E: Fase 7 — applyMotionOverrides troca shot card", () => {
  const tagged = tagStoryboardWithMotion(STORYBOARD_MOCK, {
    format: "16:9",
    niche: "engenharia",
  });
  const plan = buildMotionPlan({
    storyboard: tagged,
    niche: "engenharia",
    format: "16:9",
  });
  const ref = plan.cenas[0].scene_ref;
  const merged = applyMotionOverrides(plan, {
    cenas: {
      [String(ref)]: { templateId: "odometer-digit-roll", style: "odometer-digit-roll" },
    },
  });
  assert.equal(merged.cenas[0].motion_shot.templateId, "odometer-digit-roll");
});
