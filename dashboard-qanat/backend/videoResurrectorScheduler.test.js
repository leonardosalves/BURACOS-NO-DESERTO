import test from "node:test";
import assert from "node:assert/strict";
import { resolveDueResurrectorSlots } from "./videoResurrectorRoutes.js";
import {
  isWithinResurrectorAutoWindow,
  computeResurrectorSchedule,
} from "./videoResurrector.js";

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

test("janela 11:00–11:05 está ativa", () => {
  assert.equal(
    isWithinResurrectorAutoWindow(new Date(2026, 6, 12, 11, 0), 11),
    true
  );
  assert.equal(
    isWithinResurrectorAutoWindow(new Date(2026, 6, 12, 11, 5), 11),
    true
  );
  assert.equal(
    isWithinResurrectorAutoWindow(new Date(2026, 6, 12, 11, 6), 11),
    false
  );
  assert.equal(
    isWithinResurrectorAutoWindow(new Date(2026, 6, 12, 12, 0), 11),
    false
  );
});

test("agenda manhã só dentro de 11:00–11:05", () => {
  const inWindow = new Date(2026, 6, 12, 11, 3);
  assert.deepEqual(resolveDueResurrectorSlots(state({}), inWindow), [
    "morning",
  ]);

  const afterWindow = new Date(2026, 6, 12, 11, 10);
  assert.deepEqual(resolveDueResurrectorSlots(state({}), afterWindow), []);
});

test("não recupera lotes perdidos à noite (só na janela)", () => {
  const now = new Date(2026, 6, 12, 20, 0);
  assert.deepEqual(resolveDueResurrectorSlots(state({}), now), []);
});

test("tarde só em 18:00–18:05", () => {
  assert.deepEqual(
    resolveDueResurrectorSlots(state({}), new Date(2026, 6, 12, 18, 2)),
    ["afternoon"]
  );
  assert.deepEqual(
    resolveDueResurrectorSlots(state({}), new Date(2026, 6, 12, 18, 10)),
    []
  );
});

test("não repete lote já registrado na janela", () => {
  const now = new Date(2026, 6, 12, 18, 1);
  const runs = {
    date: "2026-07-12",
    morning: { ranAt: "2026-07-12T14:00:00Z" },
    afternoon: { ranAt: "2026-07-12T21:01:00Z" },
  };
  assert.deepEqual(resolveDueResurrectorSlots(state(runs), now), []);
});

test("respeita automação desativada", () => {
  const now = new Date(2026, 6, 12, 11, 1);
  assert.deepEqual(
    resolveDueResurrectorSlots(state({}, { autoRunWhenAppOpen: false }), now),
    []
  );
});

test("schedule marca inMorningWindow só nos 5 minutos", () => {
  const base = state({});
  const open = computeResurrectorSchedule(base, new Date(2026, 6, 12, 11, 4));
  assert.equal(open.inMorningWindow, true);
  const closed = computeResurrectorSchedule(base, new Date(2026, 6, 12, 11, 6));
  assert.equal(closed.inMorningWindow, false);
});
