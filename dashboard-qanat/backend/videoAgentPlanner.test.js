import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeVideoAgentToolsForFormat,
  planVideoAgentLocally,
} from "./videoAgentPlanner.js";

test("LONGO plans only the long render target", () => {
  const plan = planVideoAgentLocally(
    "Crie um vídeo longo documental com narração sobre engenharia romana",
    { format: "LONGO" }
  );
  const keys = plan.lumieraActions.map((action) => action.action);

  assert.ok(keys.includes("render_long"));
  assert.ok(!keys.includes("render_short"));
});

test("SHORTS collapses competing render targets to render_short", () => {
  const tools = normalizeVideoAgentToolsForFormat(
    ["creator_script", "render_long", "beat_sync", "render_short"],
    "SHORTS"
  );

  assert.deepEqual(tools, ["creator_script", "beat_sync", "render_short"]);
});
