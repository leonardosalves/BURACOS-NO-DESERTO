import test from "node:test";
import assert from "node:assert/strict";
import {
  compareResurrectionOpportunity,
  diagnoseResurrectionOpportunity,
} from "./videoResurrectionDiagnosis.js";

test("Short com projeto recomenda remake criativo", () => {
  const result = diagnoseResurrectionOpportunity(
    { format: "SHORTS", ageDays: 180, hasLumieraProject: true },
    {
      available: true,
      metrics: { views: 500, shares: 4, subscribersGained: 2 },
    }
  );
  assert.equal(result.recommendedTreatment, "short_remake");
  assert.ok(result.score >= 50);
});

test("vídeo longo com duração forte recomenda nova embalagem", () => {
  const result = diagnoseResurrectionOpportunity(
    { format: "LONG", ageDays: 120, hasLumieraProject: true },
    { available: true, metrics: { views: 200, averageViewDuration: 180 } }
  );
  assert.equal(result.recommendedTreatment, "long_repackage_and_recirculate");
});

test("ordena pela oportunidade antes da idade", () => {
  const rows = [
    { publishedAt: "2020-01-01", diagnosis: { score: 20 } },
    { publishedAt: "2024-01-01", diagnosis: { score: 80 } },
  ].sort(compareResurrectionOpportunity);
  assert.equal(rows[0].diagnosis.score, 80);
});
