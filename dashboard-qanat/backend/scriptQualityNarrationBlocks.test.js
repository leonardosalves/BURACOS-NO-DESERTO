import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNarrationBlocks } from "./scriptQuality/jsonSalvage.js";
import { splitNarrationIntoBlocks } from "../shared/narrationBlocks.js";

const narration =
  "Como deter um exército invasor usando apenas insetos? " +
  "Eles catapultavam colmeias de abelhas para dentro de fortalezas inimigas. " +
  "Durante o cerco de Temiscira, defensores gregos usaram essa biologia contra o exército de Roma. " +
  "Projetistas militares desenvolveram vasos de barro frágeis. " +
  "No impacto, os recipientes liberavam os insetos. " +
  "Essa tática obrigava os soldados nos túneis a recuar. " +
  "O ataque interrompia a escavação sem depender de combate direto.";

const blockPhrases = [
  { block: 1, phrase: "Eles catapultavam colmeias de abelhas" },
  { block: 2, phrase: "Durante o cerco de Temiscira" },
  { block: 3, phrase: "Projetistas militares desenvolveram vasos" },
  { block: 4, phrase: "Essa tática obrigava os soldados" },
  { block: 5, phrase: "O ataque interrompia a escavação" },
];

test("normalizeNarrationBlocks distributes a one-paragraph script by block anchors", () => {
  const result = normalizeNarrationBlocks(
    {
      narrative_script: narration,
      technical_config: { script: narration, block_phrases: blockPhrases },
    },
    5
  );

  const paragraphs = result.technical_config.script.split(/\n\n+/);
  assert.equal(paragraphs.length, 5);
  assert.match(paragraphs[0], /^Como deter/);
  assert.match(paragraphs[1], /^Durante o cerco/);
  assert.match(paragraphs[2], /^Projetistas militares/);
  assert.match(paragraphs[3], /^Essa tática/);
  assert.match(paragraphs[4], /^O ataque/);
  assert.equal(result.technical_config.block_phrases.length, 5);
});

test("splitNarrationIntoBlocks balances sentences when phrase anchors are unavailable", () => {
  const blocks = splitNarrationIntoBlocks({
    narrativeScript: narration,
    blockScript: narration,
    expectedBlocks: 5,
  });

  assert.equal(blocks.length, 5);
  assert.ok(blocks.every((block) => block.length > 10));
  assert.equal(blocks.join(" "), narration);
});

