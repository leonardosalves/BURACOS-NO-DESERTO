import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import test, { describe, it } from "node:test";
import {
  appendNarrationAuditEvent,
  assertNarrationChunksApproved,
  assertApprovedNarrationMasterReady,
  latestNarrationReviews,
  narrationChunkApprovalState,
  readNarrationAudit,
} from "./narrationAudit.js";

test("narration audit appends immutable ordered events", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-audit-"));
  appendNarrationAuditEvent(dir, {
    type: "chunk",
    status: "generating",
    chunk_id: "chunk-01",
  });
  appendNarrationAuditEvent(dir, {
    type: "chunk",
    status: "generated",
    chunk_id: "chunk-01",
  });
  const audit = readNarrationAudit(dir);
  assert.equal(audit.events.length, 2);
  assert.equal(audit.events[1].status, "generated");
  assert.ok(audit.events.every((event) => event.id && event.at));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("latest review selects newest decision without deleting history", () => {
  const events = [
    { type: "review", chunk_id: "c1", decision: "rejected" },
    { type: "review", chunk_id: "c1", decision: "approved" },
  ];
  assert.equal(latestNarrationReviews(events).c1.decision, "approved");
  assert.equal(events.length, 2);
});

describe("narrationChunkApprovalState", () => {
  const plan = {
    chunks: [
      {
        id: "chunk-01",
        status: "generated",
        duration_s: 3.2,
        generated_at: "2026-07-15T10:00:00.000Z",
      },
    ],
  };

  it("aceita revisão posterior ao áudio atual", () => {
    const state = narrationChunkApprovalState(plan, [
      {
        type: "review",
        chunk_id: "chunk-01",
        decision: "approved",
        at: "2026-07-15T10:01:00.000Z",
      },
    ]);
    assert.equal(state.ready, true);
  });

  it("invalida aprovação quando o áudio foi regenerado", () => {
    const state = narrationChunkApprovalState(plan, [
      {
        type: "review",
        chunk_id: "chunk-01",
        decision: "approved",
        at: "2026-07-15T09:59:00.000Z",
      },
    ]);
    assert.equal(state.ready, false);
    assert.equal(state.blockers[0].reason, "audio_changed_after_review");
    assert.throws(() => assertNarrationChunksApproved(plan, []), {
      code: "NARRATION_REVIEW_REQUIRED",
    });
  });

  it("exige master montado depois da aprovação", () => {
    const events = [
      {
        type: "review",
        chunk_id: "chunk-01",
        decision: "approved",
        at: "2026-07-15T10:01:00.000Z",
      },
    ];
    assert.throws(() => assertApprovedNarrationMasterReady(plan, events), {
      code: "APPROVED_MASTER_REQUIRED",
    });
    assert.doesNotThrow(() =>
      assertApprovedNarrationMasterReady(plan, [
        ...events,
        { type: "master_assembled", at: "2026-07-15T10:02:00.000Z" },
      ])
    );
  });
});
