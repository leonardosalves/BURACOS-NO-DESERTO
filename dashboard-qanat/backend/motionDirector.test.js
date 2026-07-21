import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMotionPlan,
  detectarSceneFunctions,
  extrairDados,
  applyMotionPlanToStoryboard,
  ensureShotcraftOnStoryboard,
  enrichSceneFunctionsOnVisualPrompts,
} from "./motionDirector.js";
import { SHOTCRAFT_CATALOG, CATALOG_STATS } from "./shotcraftCatalog.js";

test("catálogo tem 106 shot cards e 12 categorias", () => {
  assert.equal(SHOTCRAFT_CATALOG.length, 106);
  assert.equal(CATALOG_STATS.categories.length, 12);
  assert.ok(CATALOG_STATS.categories.includes("dados"));
  assert.ok(CATALOG_STATS.categories.includes("impacto"));
});

test("detecta dado numérico na narração", () => {
  const fn = detectarSceneFunctions(
    "A estrutura atingiu 73 metros de altura em 1927."
  );
  assert.ok(fn.includes("dado_numerico"));
  assert.ok(fn.includes("timeline"));
});

test("detecta comparação", () => {
  const fn = detectarSceneFunctions(
    "Enquanto o modelo A tem 10, o B tem 20."
  );
  assert.ok(fn.includes("comparacao"));
});

test("detecta ranking", () => {
  const fn = detectarSceneFunctions(
    "Em primeiro lugar, o top 10 revela..."
  );
  assert.ok(fn.includes("ranking"));
});

test("extrai dados numéricos", () => {
  const d = extrairDados("Atingiu 73 metros em 1927.");
  assert.equal(d.valor, "73");
  assert.equal(d.unidade, "metros");
  assert.equal(d.ano, "1927");
});

test("buildMotionPlan gera abertura + cenas + encerramento", () => {
  const plan = buildMotionPlan({
    storyboard: {
      scenes: [
        {
          scene: 1,
          narration_text: "A estrutura tinha 73 metros de altura.",
        },
        {
          scene: 2,
          narration_text:
            "Comparando com o modelo anterior, era o dobro.",
        },
      ],
    },
    niche: "engenharia",
    format: "16:9",
  });
  assert.ok(plan.abertura.templateId);
  assert.equal(plan.cenas.length, 2);
  assert.ok(plan.encerramento.templateId);
  assert.ok(plan.cenas[0].motion_shot);
  assert.equal(plan.palette.primary, "#F5A623");
});

test("SHORTS usa abertura trailer-bumper", () => {
  const plan = buildMotionPlan({
    storyboard: { scenes: [{ scene: 1, narration_text: "Teste." }] },
    niche: "humor",
    format: "9:16",
  });
  assert.equal(plan.format, "9:16");
  assert.equal(plan.abertura.style, "trailer-bumper");
});

test("applyMotionPlanToStoryboard injeta motion_shot nas cenas", () => {
  const storyboard = {
    visual_prompts: [
      {
        scene: "1.1",
        narration_text: "A torre mediu 300 metros de altura.",
      },
    ],
  };
  const plan = buildMotionPlan({
    storyboard,
    niche: "engenharia",
    format: "16:9",
  });
  const next = applyMotionPlanToStoryboard(storyboard, plan);
  assert.ok(next.motion_plan);
  assert.ok(
    next.visual_prompts[0].motion_shot ||
      next.visual_prompts[0].scene_function
  );
});

test("ensureShotcraftOnStoryboard e enrichSceneFunctions", () => {
  const { storyboard, plan, validation } = ensureShotcraftOnStoryboard(
    {
      visual_prompts: [
        {
          scene: "1.1",
          narration_text: "Em 1927, a estrutura atingiu 73 metros.",
        },
      ],
    },
    { niche: "engenharia", format: "16:9" }
  );
  assert.ok(validation.ok);
  assert.ok(plan.abertura.templateId);
  assert.ok(storyboard.visual_prompts[0].motion_shot);

  const enriched = enrichSceneFunctionsOnVisualPrompts([
    { narration_text: "Top 10 revela o primeiro lugar." },
  ]);
  assert.ok(enriched[0].scene_function.includes("ranking"));
  assert.ok(enriched[0].extracted_data);
});
