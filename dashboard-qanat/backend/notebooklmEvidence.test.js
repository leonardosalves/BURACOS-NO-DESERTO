import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNotebooklmEvidenceMap,
  assessNotebooklmEvidenceReadiness,
} from "./notebooklmResearchBrief.js";

test("evidence map retains claims without pretending they are verified sources", () => {
  const evidence = buildNotebooklmEvidenceMap({
    facts: ["A ponte foi inaugurada em 62 d.C."],
    stats: [{ value: "450", unit: "metros", label: "comprimento" }],
  });
  assert.equal(evidence.length, 2);
  assert.equal(evidence[0].confidence, "needs_source_review");
});

test("long-form evidence gate requires multiple claims and a statistic", () => {
  const report = assessNotebooklmEvidenceReadiness(
    { evidence: [{ type: "fact" }] },
    "LONGO"
  );
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.includes("número")));
});
