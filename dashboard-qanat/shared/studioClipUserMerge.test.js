import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clipHasStudioUserLock,
  mergeMotionClipPreservingUserEdits,
  markStudioClipUserEdit,
  studioSlotKind,
} from "./studioClipUserMerge.js";

describe("studioClipUserMerge", () => {
  it("studioSlotKind classifica slots", () => {
    assert.equal(studioSlotKind("items"), "array");
    assert.equal(studioSlotKind("value"), "number");
    assert.equal(studioSlotKind("accentColor"), "color");
    assert.equal(studioSlotKind("text"), "text");
  });

  it("mergeMotionClipPreservingUserEdits mantém props editadas pelo usuário", () => {
    const existing = {
      id: "ms-2.1",
      start: 12,
      duration: 5,
      label: "BRASIL 62%",
      props: {
        studio_user_locked: true,
        studio_user_locked_slots: ["value", "label"],
        value: 62,
        label: "BRASIL",
        studio_props: { value: 62, label: "BRASIL" },
        template_studio_data_slots: ["value", "label", "suffix"],
      },
    };
    const planned = {
      id: "ms-2.1",
      start: 10,
      duration: 4,
      label: "DADO",
      props: {
        value: 40,
        label: "GENÉRICO",
        suffix: "%",
        studio_props: { value: 40, label: "GENÉRICO", suffix: "%" },
        template_studio_data_slots: ["value", "label", "suffix"],
      },
    };
    const merged = mergeMotionClipPreservingUserEdits(existing, planned);
    assert.equal(merged.props.value, 62);
    assert.equal(merged.props.label, "BRASIL");
    assert.equal(merged.props.suffix, "%");
    assert.equal(merged.label, "BRASIL 62%");
    assert.equal(merged.start, 10);
  });

  it("mergeMotionClipPreservingUserEdits mantém timing manual", () => {
    const existing = {
      id: "ms-1.1",
      start: 18.5,
      duration: 6.2,
      props: { timing_manual: true },
    };
    const planned = { id: "ms-1.1", start: 12, duration: 4, props: {} };
    const merged = mergeMotionClipPreservingUserEdits(existing, planned);
    assert.equal(merged.start, 18.5);
    assert.equal(merged.duration, 6.2);
    assert.equal(merged.props.timing_manual, true);
  });

  it("markStudioClipUserEdit registra slot bloqueado", () => {
    const clip = markStudioClipUserEdit(
      { id: "ms-1", props: {} },
      { slot: "text" }
    );
    assert.equal(clip.props.studio_user_locked, true);
    assert.ok(clip.props.studio_user_locked_slots.includes("text"));
    assert.ok(clipHasStudioUserLock(clip));
  });
});
