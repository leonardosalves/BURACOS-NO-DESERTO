import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { installNarrationAtomically } from "./narrationUpload.js";

test("invalid narration upload preserves previous master", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-upload-"));
  const dest = path.join(dir, "master.mp3");
  const temp = path.join(dir, "incoming.tmp");
  fs.writeFileSync(dest, "previous");
  fs.writeFileSync(temp, "not-an-mp3");
  await assert.rejects(
    installNarrationAtomically(temp, dest, { probeDuration: async () => 10 }),
    /assinatura MP3/
  );
  assert.equal(fs.readFileSync(dest, "utf8"), "previous");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("valid narration replaces master only after validation", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-upload-"));
  const dest = path.join(dir, "master.mp3");
  const temp = path.join(dir, "incoming.tmp");
  fs.writeFileSync(dest, "previous");
  fs.writeFileSync(temp, Buffer.concat([Buffer.from("ID3"), Buffer.alloc(32)]));
  const result = await installNarrationAtomically(temp, dest, {
    probeDuration: async () => 12.5,
  });
  assert.equal(result.duration, 12.5);
  assert.equal(fs.readFileSync(dest).subarray(0, 3).toString(), "ID3");
  fs.rmSync(dir, { recursive: true, force: true });
});
