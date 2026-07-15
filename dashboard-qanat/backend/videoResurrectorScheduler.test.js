import test from "node:test";
import assert from "node:assert/strict";
import { resolveDueResurrectorSlots } from "./videoResurrectorRoutes.js";

const state = (dailyRuns = {}, settings = {}) => ({
  settings: {
    enabled: true,
    autoRunWhenAppOpen: true,
    morningHour: 11,
    afternoonHour: 18,
    ...settings,
  },
  dailyRuns,
});

test("agenda manhã quando o horário passou", () => {
  const now = new Date(2026, 6, 12, 11, 5);
  assert.deepEqual(resolveDueResurrectorSlots(state({}), now), ["morning"]);
});

test("recupera manhã e tarde após reinício noturno", () => {
  const now = new Date(2026, 6, 12, 20, 0);
  assert.deepEqual(resolveDueResurrectorSlots(state({}), now), [
    "morning",
    "afternoon",
  ]);
});

test("não repete lote já registrado", () => {
  const now = new Date(2026, 6, 12, 19, 0);
  const runs = { morning: { ranAt: "2026-07-12T14:00:00Z" } };
  assert.deepEqual(resolveDueResurrectorSlots(state(runs), now), ["afternoon"]);
});

test("respeita automação desativada", () => {
  const now = new Date(2026, 6, 12, 20, 0);
  assert.deepEqual(
    resolveDueResurrectorSlots(state({}, { autoRunWhenAppOpen: false }), now),
    []
  );
});
