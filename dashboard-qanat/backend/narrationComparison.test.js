import test from "node:test";
import assert from "node:assert/strict";
import { compareNarrationChunksWithWhisper } from "./narrationComparison.js";

test("comparison identifies missing and unexpected words per chunk", () => {
  const rows = compareNarrationChunksWithWhisper(
    {
      chunks: [
        {
          id: "c1",
          block: 1,
          text: "A ponte caiu durante a noite",
          start_s: 0,
          end_s: 3,
        },
      ],
    },
    [
      { clean: "a", start: 0 },
      { clean: "ponte", start: 0.5 },
      { clean: "durante", start: 1 },
      { clean: "o", start: 1.5 },
      { clean: "dia", start: 2 },
    ]
  );
  assert.ok(rows[0].coverage < 92);
  assert.ok(rows[0].missing.includes("caiu"));
  assert.ok(rows[0].unexpected.includes("dia"));
});
