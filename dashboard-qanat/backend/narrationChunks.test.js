import test from "node:test";
import assert from "node:assert/strict";
import { resolveExpressivePause } from "./narrationChunks.js";

test("expressive narration pauses preserve questions and reveals", () => {
  assert.equal(
    resolveExpressivePause({ text: "Como isso foi possível?" }).reason,
    "pausa após pergunta"
  );
  assert.equal(
    resolveExpressivePause({ text: "Mas o detalhe muda tudo." }).ms,
    900
  );
  assert.equal(
    resolveExpressivePause({ text: "Texto comum.", changesBlock: true }).reason,
    "virada de bloco"
  );
});
