import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveStockSearchQuery,
  resolveNicheFallbackQuery,
} from "./stockSearchQuery.js";

test("resolveNicheFallbackQuery mapeia engenharia", () => {
  assert.equal(
    resolveNicheFallbackQuery("engineering"),
    "industrial machinery construction site"
  );
  assert.equal(
    resolveNicheFallbackQuery("Engenharia civil"),
    "industrial machinery construction site"
  );
  assert.equal(resolveNicheFallbackQuery(""), null);
});

test("preferSceneStockQuery usa stock_query do VPE", () => {
  const q = resolveStockSearchQuery(
    {
      stock_query: "riveted steel frame construction",
      narration_text: "algo fraco",
      prompt: "Unreal Engine 5 Octane render hyperrealistic CGI steel",
    },
    { preferSceneStockQuery: true, niche: "engineering" }
  );
  assert.equal(q, "riveted steel frame construction");
});

test("fallback final usa nicho em vez de genérico puro", () => {
  const q = resolveStockSearchQuery(
    { narration_text: "", prompt: "" },
    { niche: "engineering" }
  );
  assert.equal(q, "industrial machinery construction site");
  assert.notEqual(q, "documentary detail object");
});

test("sem nicho ainda cai no fallback legado", () => {
  const q = resolveStockSearchQuery({ narration_text: "", prompt: "" }, {});
  assert.equal(q, "documentary detail object");
});

test("stock_query CGI continua rejeitado", () => {
  const q = resolveStockSearchQuery(
    {
      stock_query: "unreal engine octane cgi render",
      narration_text: "",
      prompt: "",
    },
    { preferSceneStockQuery: true, niche: "engineering" }
  );
  assert.equal(q, "industrial machinery construction site");
});
