import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMotionPlan,
  detectarSceneFunctions,
  extrairDados,
  applyMotionPlanToStoryboard,
  applyMotionOverrides,
  ensureShotcraftOnStoryboard,
  enrichSceneFunctionsOnVisualPrompts,
  motionPlanFromStoryboard,
} from "./motionDirector.js";
import {
  normalizeMotionShotProps,
  normalizeMotionShot,
  buildShotProps,
} from "./shotcraftPropsMap.js";
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
  const fn = detectarSceneFunctions("Enquanto o modelo A tem 10, o B tem 20.");
  assert.ok(fn.includes("comparacao"));
});

test("detecta ranking", () => {
  const fn = detectarSceneFunctions("Em primeiro lugar, o top 10 revela...");
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
          narration_text: "Comparando com o modelo anterior, era o dobro.",
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
    next.visual_prompts[0].motion_shot || next.visual_prompts[0].scene_function
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

test("normalizeMotionShotProps mapeia valor/unidade e dataPoints→items", () => {
  const a = normalizeMotionShotProps({ valor: "300", unidade: "metros" });
  assert.equal(a.value, 300);
  assert.equal(a.unit, "metros");

  const b = normalizeMotionShotProps({ dataPoints: [10, 20, 30] });
  assert.equal(b.items.length, 3);
  assert.equal(b.items[1].value, 20);

  const shot = normalizeMotionShot({
    templateId: "odometer-digit-roll",
    props: { valor: "73", unidade: "m" },
  });
  assert.equal(shot.props.value, 73);
  assert.ok(shot.duration_seconds >= 1);
});

test("buildShotProps chart-live-moves inclui items parameterizados", () => {
  const props = buildShotProps("chart-live-moves", {
    dados: { valor: "42", unidade: "%" },
    narration: "A taxa subiu para 42 por cento no período.",
    palette: { primary: "#F5A623" },
  });
  assert.ok(Array.isArray(props.items));
  assert.ok(props.items.length >= 1);
  assert.equal(props.items[0].value, 42);
});

test("motionPlanFromStoryboard prefere visual_prompts do editor", () => {
  const sb = {
    visual_prompts: [
      {
        scene: "1.1",
        narration_text: "300 metros",
        motion_shot: {
          templateId: "odometer-digit-roll",
          props: { valor: "300", unidade: "metros" },
          start_seconds: 0.5,
        },
      },
    ],
    motion_plan: {
      cenas: [
        {
          scene_ref: "1.1",
          motion_shot: { templateId: "gauge-readout-moves" },
        },
      ],
    },
  };
  const plan = motionPlanFromStoryboard(sb);
  assert.equal(plan.cenas[0].motion_shot.templateId, "odometer-digit-roll");
  assert.equal(plan.cenas[0].motion_shot.props.value, 300);
  assert.equal(plan.cenas[0].motion_shot.start_seconds, 0.5);
});

test("buildMotionPlan injeta value real no odometer e timing", () => {
  const plan = buildMotionPlan({
    storyboard: {
      visual_prompts: [
        {
          scene: "2.1",
          narration_text: "A torre atingiu 73 metros de altura.",
        },
      ],
    },
    niche: "engenharia",
    format: "16:9",
  });
  const shot = plan.cenas[0].motion_shot;
  assert.ok(shot, "cena numérica deve ter motion_shot");
  if (shot.templateId === "odometer-digit-roll" || shot.props?.value != null) {
    assert.ok(
      shot.props.value != null || shot.props.valor != null,
      "props devem carregar o valor"
    );
  }
  assert.ok(typeof shot.start_seconds === "number");
  assert.ok(typeof shot.duration_seconds === "number");
});

test("applyMotionOverrides troca template e rebuilda props", () => {
  const plan = buildMotionPlan({
    storyboard: {
      visual_prompts: [
        {
          scene: "1",
          narration_text: "Mediu 300 metros no total.",
        },
      ],
    },
    niche: "engenharia",
    format: "16:9",
  });
  const ref = String(plan.cenas[0].scene_ref);
  // força extracted_data no plan
  plan.cenas[0].extracted_data = { valor: "300", unidade: "metros" };
  if (plan.cenas[0].motion_shot) {
    plan.cenas[0].motion_shot.templateId = "gauge-readout-moves";
  }
  const merged = applyMotionOverrides(plan, {
    cenas: {
      [ref]: { templateId: "odometer-digit-roll" },
    },
  });
  assert.equal(merged.cenas[0].motion_shot.templateId, "odometer-digit-roll");
  assert.equal(merged.cenas[0].motion_shot.props.value, 300);
});
