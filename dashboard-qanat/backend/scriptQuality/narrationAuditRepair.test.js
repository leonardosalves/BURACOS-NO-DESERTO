import { test } from "node:test";
import assert from "node:assert/strict";
import { runNarrationAuditRepairLoop } from "./narrationAuditRepair.js";

test("retorna audit.integrity mesmo quando já aprovado", async () => {
  const result = await runNarrationAuditRepairLoop({
    storyboard: { narrative_script: "texto ok" },
    maxAttempts: 2,
    evaluate: async () => ({
      approved: true,
      issues: [],
      integrity: { ok: true, issues: [] },
      editorial: { ok: true, issues: [] },
    }),
  });
  assert.equal(result.approved, true);
  assert.ok(result.audit);
  assert.ok(result.audit.integrity);
  assert.equal(result.audit.integrity.ok, true);
});

test("nunca deixa audit undefined (evita crash finalRepair.audit.integrity)", async () => {
  const result = await runNarrationAuditRepairLoop({
    storyboard: { narrative_script: "curto" },
    maxAttempts: 2,
    evaluate: async () => ({
      approved: false,
      issues: ["Video longo ainda nao tem desenvolvimento suficiente."],
      integrity: {
        ok: false,
        issues: ["Video longo ainda nao tem desenvolvimento suficiente."],
      },
      editorial: { ok: true, issues: [] },
    }),
    repair: async (sb) => ({
      ...sb,
      narrative_script: sb.narrative_script + " com mais detalhes e cadeia causal.",
    }),
  });
  assert.ok(result.audit, "audit deve existir");
  assert.ok(result.audit.integrity, "audit.integrity deve existir");
  assert.ok(Array.isArray(result.audit.issues));
  // Após reparo o evaluate final ainda pode falhar — o importante é não crashar
  assert.equal(typeof result.approved, "boolean");
});

test("storyboard null devolve audit seguro", async () => {
  const result = await runNarrationAuditRepairLoop({ storyboard: null });
  assert.equal(result.approved, false);
  assert.ok(result.audit.integrity);
});
