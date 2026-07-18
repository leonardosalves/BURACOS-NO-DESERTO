import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNarrationOnlyPrompt,
  buildCreatorPhase2Prompt,
} from "./scriptQuality.js";
import { resolvePovPlacement } from "../shared/povBlock.js";

test("NARRADORPRO recebe contrato POV na fase de narração com slot no miolo", () => {
  const placement = resolvePovPlacement({
    enablePov: true,
    totalBlocks: 8,
    povBlockIndex: 5,
  });
  const prompt = buildNarrationOnlyPrompt({
    niche: "Profissões",
    format: "LONGO",
    idea: { title: "O lastreiro", promise: "Ofício por dentro" },
    enablePov: true,
    povPlacement: placement,
  });
  assert.match(prompt, /BLOCO POV/);
  assert.match(prompt, /BLOCO 5/);
  assert.match(prompt, /EXATAMENTE 2 cenas/);
  assert.match(prompt, /VIDEO A/);
  assert.match(prompt, /VIDEO B/);
  assert.match(prompt, /NUNCA intro/i);
});

test("fase 2 visual inclui POV e preserva narração", () => {
  const placement = resolvePovPlacement({
    enablePov: true,
    totalBlocks: 6,
    povBlockIndex: 3,
  });
  const prompt = buildCreatorPhase2Prompt({
    niche: "Ofícios",
    format: "SHORTS",
    idea: { title: "Teste" },
    approvedNarration: "Eu aperto o parafuso e sinto a vibração.",
    enablePov: true,
    povPlacement: placement,
  });
  assert.match(prompt, /is_pov/);
  assert.match(prompt, /VIDEO A/);
  assert.match(prompt, /VIDEO B/);
  assert.match(prompt, /use_source_audio/);
  assert.match(prompt, /copie EXATAMENTE em narrative_script/);
  assert.match(prompt, /Eu aperto o parafuso/);
});
