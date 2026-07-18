import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  saveCollageSession,
  loadCollageSession,
  rejectCollageCard,
  patchCollageSessionCard,
} from "./collageBrollSession.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "data", "collage-broll-sessions");

test("save + load session", () => {
  const id = `test_${Date.now()}`;
  const saved = saveCollageSession(id, {
    mode: "geo",
    items: [
      { id: "c01", status: "approved", visual_proposition: "A" },
      { id: "c04", status: "pending", visual_proposition: "B" },
    ],
  });
  assert.equal(saved.sessionId, id);
  const loaded = loadCollageSession(id);
  assert.ok(loaded);
  assert.equal(loaded.items.length, 2);
  assert.equal(loaded.items[0].status, "approved");
});

test("rejectCollageCard altera só o card alvo", () => {
  const id = `test_rej_${Date.now()}`;
  saveCollageSession(id, {
    items: [
      { id: "c01", status: "approved", visual_proposition: "ok" },
      { id: "c04", status: "pending", visual_proposition: "ruim" },
      { id: "c05", status: "pending", visual_proposition: "x" },
    ],
  });
  const result = rejectCollageCard({
    sessionId: id,
    cardId: "c04",
    reason: "geo_error",
    note: "equador errado",
    regenerate: false,
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.cardId, "c04");
  assert.equal(result.rejectionReason, "geo_error");
  const loaded = loadCollageSession(id);
  const c01 = loaded.items.find((i) => i.id === "c01");
  const c04 = loaded.items.find((i) => i.id === "c04");
  const c05 = loaded.items.find((i) => i.id === "c05");
  assert.equal(c01.status, "approved");
  assert.equal(c04.status, "rejected");
  assert.equal(c04.rejectionNote, "equador errado");
  assert.equal(c05.status, "pending");
});

test("patchCollageSessionCard não muta outros", () => {
  const id = `test_patch_${Date.now()}`;
  saveCollageSession(id, {
    items: [
      { id: "c01", status: "approved" },
      { id: "c02", status: "pending" },
    ],
  });
  patchCollageSessionCard(id, "c02", {
    status: "rejected",
    rejectionReason: "other",
  });
  const loaded = loadCollageSession(id);
  assert.equal(loaded.items[0].status, "approved");
  assert.equal(loaded.items[1].status, "rejected");
});

// cleanup test files
test("cleanup test sessions", () => {
  if (!fs.existsSync(DIR)) return;
  for (const f of fs.readdirSync(DIR)) {
    if (f.startsWith("test_")) {
      fs.unlinkSync(path.join(DIR, f));
    }
  }
  assert.ok(true);
});
