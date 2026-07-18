import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import {
  extractImageFromGeminiResponse,
  writeEmptyColorFrame,
  resolveCollageMediaFile,
  ensureCardDir,
  mediaUrl,
} from "./collageBrollMedia.js";

test("extractImageFromGeminiResponse lê inlineData", () => {
  const fake = {
    candidates: [
      {
        content: {
          parts: [
            { text: "ok" },
            {
              inlineData: {
                mimeType: "image/png",
                data: Buffer.from("hello").toString("base64"),
              },
            },
          ],
        },
      },
    ],
  };
  const img = extractImageFromGeminiResponse(fake);
  assert.ok(img);
  assert.equal(img.mimeType, "image/png");
  assert.equal(Buffer.from(img.base64, "base64").toString(), "hello");
});

test("mediaUrl e ensureCardDir path-safe", () => {
  const dir = ensureCardDir("sess_test", "c01");
  assert.ok(fs.existsSync(dir));
  const url = mediaUrl("sess_test", "c01", "still.png");
  assert.ok(url.includes("/api/collage-broll/media/"));
  assert.ok(url.includes("still.png"));
});

test("writeEmptyColorFrame + resolveCollageMediaFile", async () => {
  const sessionId = `t_${Date.now()}`;
  const cardId = "c09";
  const dir = ensureCardDir(sessionId, cardId);
  const first = path.join(dir, "frames", "first-frame.png");
  await writeEmptyColorFrame(first, "#0B3D5C");
  assert.ok(fs.existsSync(first));
  assert.ok(fs.statSync(first).size > 100);
  const resolved = resolveCollageMediaFile(
    sessionId,
    cardId,
    "first-frame.png"
  );
  assert.ok(resolved);
  assert.ok(resolved.endsWith("first-frame.png"));
  // cleanup
  fs.rmSync(path.dirname(dir), { recursive: true, force: true });
});
