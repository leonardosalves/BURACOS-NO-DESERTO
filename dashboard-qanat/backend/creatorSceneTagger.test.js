import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tagStoryboardWithMotion,
  tagSceneWithMotion,
  calcularPotencialMotion,
  extrairMarcosHistoricos,
  detectarBeatPoints,
  isStoryboardTagged,
  contarCenasTaggeadas,
} from "./creatorSceneTagger.js";

test("tagScene detecta dado numérico e sugere shot", () => {
  const cena = tagSceneWithMotion(
    {
      narration_text: "A estrutura atingiu 73 metros de altura em 1927.",
    },
    { format: "16:9", niche: "engenharia" }
  );
  assert.ok(cena.scene_function.includes("dado_numerico"));
  assert.equal(cena.extracted_data.valor, "73");
  assert.ok(cena.suggested_shot);
});

test("tagStoryboard marca todas as cenas + flag", () => {
  const sb = tagStoryboardWithMotion(
    {
      visual_prompts: [
        { scene: 1, narration_text: "Em primeiro lugar, o top 10 revela." },
        {
          scene: 2,
          narration_text: "Comparando o modelo A versus o B.",
        },
      ],
    },
    { format: "9:16", niche: "humor" }
  );
  assert.ok(isStoryboardTagged(sb));
  assert.equal(contarCenasTaggeadas(sb), 2);
  assert.ok(sb.visual_prompts[1].scene_function.includes("comparacao"));
});

test("respeita scene_function já definido pelo criador", () => {
  const cena = tagSceneWithMotion(
    { narration_text: "Texto qualquer.", scene_function: ["timeline"] },
    { format: "16:9" }
  );
  assert.deepEqual(cena.scene_function, ["timeline"]);
});

test("Radar: calcularPotencialMotion retorna shot cards", () => {
  const ideia = calcularPotencialMotion(
    { tema: "A linha do tempo da construção em 1927 e 1950" },
    { format: "16:9", niche: "engenharia" }
  );
  assert.ok(Array.isArray(ideia.potencial_motion));
  assert.ok(ideia.potencial_score >= 0);
});

test("História Livre: extrairMarcosHistoricos detecta datas", () => {
  const marcos = extrairMarcosHistoricos(
    "Em 1927 começou. No século XX evoluiu. Em 1950 terminou."
  );
  assert.ok(marcos.some((m) => m.year === "1927"));
  assert.ok(marcos.some((m) => m.year === "1950"));
  assert.ok(marcos.some((m) => String(m.year).includes("Séc")));
});

test("Fatos com Graça: detectarBeatPoints acha viradas", () => {
  const beats = detectarBeatPoints(
    "Ele tentou de tudo, MAS no final foi um DESASTRE."
  );
  assert.ok(beats.length > 0);
  assert.ok(beats.some((b) => b.tipo === "virada" || b.tipo === "enfase"));
});

test("não quebra com storyboard vazio", () => {
  assert.equal(tagStoryboardWithMotion(null), null);
  assert.deepEqual(tagStoryboardWithMotion({}), {});
});
