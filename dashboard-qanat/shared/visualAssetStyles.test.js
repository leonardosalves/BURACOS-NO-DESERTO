import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_VISUAL_ASSET_STYLE,
  VISUAL_ASSET_STYLES,
  buildMapOnlyPromptsDirective,
  buildVisualAssetStyleDirective,
  enforceMapOnlyInPrompt,
  enforceVisualAssetStyleInPrompt,
  getVisualAssetStyle,
  isMapOnlyPromptsEnabled,
  normalizeVisualAssetStyleId,
} from "./visualAssetStyles.js";

test("catalogo tem pelo menos 10 estilos com ids unicos", () => {
  assert.ok(VISUAL_ASSET_STYLES.length >= 10);
  const ids = VISUAL_ASSET_STYLES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const style of VISUAL_ASSET_STYLES) {
    assert.ok(style.label);
    assert.ok(style.promptClause.length > 20);
  }
});

test("normalize cai no default para id invalido", () => {
  assert.equal(normalizeVisualAssetStyleId(""), DEFAULT_VISUAL_ASSET_STYLE);
  assert.equal(normalizeVisualAssetStyleId("xyz"), DEFAULT_VISUAL_ASSET_STYLE);
  assert.equal(normalizeVisualAssetStyleId("anime"), "anime");
});

test("directive e enforce embutem clausula de estilo", () => {
  const directive = buildVisualAssetStyleDirective("hyperreal_3d");
  assert.match(directive.systemBlock, /3D hiper-realista|hyperreal_3d/i);
  assert.match(directive.promptClause, /3D CGI/i);

  const enforced = enforceVisualAssetStyleInPrompt(
    "Close-up of a bronze seal on parchment",
    "hyperreal_3d"
  );
  assert.match(enforced, /Style:/i);
  assert.match(enforced, /3D CGI/i);
});

test("getVisualAssetStyle default", () => {
  assert.equal(getVisualAssetStyle().id, DEFAULT_VISUAL_ASSET_STYLE);
});

test("modo somente mapas injeta cartografia e epoca", () => {
  assert.equal(isMapOnlyPromptsEnabled(true), true);
  assert.equal(isMapOnlyPromptsEnabled(false), false);
  const dir = buildMapOnlyPromptsDirective();
  assert.match(dir.systemBlock, /SOMENTE DE MAPAS/i);
  assert.match(dir.systemBlock, /IDADE|ÉPOCA|EPOCA/i);

  const withMap = enforceMapOnlyInPrompt(
    "Roman legion marching near the Rhine"
  );
  assert.match(withMap, /map/i);

  const styled = enforceVisualAssetStyleInPrompt(
    "Battle of Actium at sea",
    "vintage_archive",
    { mapOnly: true }
  );
  assert.match(styled, /map|cartograph/i);

  const combined = buildVisualAssetStyleDirective("anime", { mapOnly: true });
  assert.match(combined.systemBlock, /MAPAS/i);
  assert.match(combined.systemBlock, /anime/i);
});
