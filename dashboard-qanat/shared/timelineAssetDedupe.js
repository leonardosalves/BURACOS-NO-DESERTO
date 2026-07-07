/**
 * Remove slots vazios da orquestração que duplicam assets user_locked no mesmo bloco.
 */

function normNarration(text = "") {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function isEmptyOrchestratedSlot(slot = {}) {
  if (String(slot?.asset || "").trim()) return false;
  if (slot?.user_locked && slot?.manual_asset) return false;
  return Boolean(
    slot?.orchestrated ||
    slot?.production ||
    slot?.motion_template_id ||
    slot?.motion_scene_id ||
    (String(slot?.scene_ref || "").trim() && slot?.generation_prompt)
  );
}

function mergeOrchestratedMetaIntoFilled(slots = []) {
  return slots.map((slot) => {
    if (!String(slot?.asset || "").trim()) return slot;
    const narr = normNarration(slot.narration_segment);
    if (!narr) return slot;
    const twin = slots.find(
      (s) =>
        isEmptyOrchestratedSlot(s) &&
        normNarration(s.narration_segment) === narr
    );
    if (!twin) return slot;
    return {
      ...slot,
      scene_ref: slot.scene_ref || twin.scene_ref,
      chunk_id: slot.chunk_id || twin.chunk_id,
      production: slot.production || twin.production,
      generation_prompt: slot.generation_prompt || twin.generation_prompt,
      stock_query: slot.stock_query || twin.stock_query,
      editor_notes: slot.editor_notes || twin.editor_notes,
      motion_template_id: slot.motion_template_id || twin.motion_template_id,
      motion_scene_id: slot.motion_scene_id || twin.motion_scene_id,
      orchestrated: slot.orchestrated ?? twin.orchestrated,
    };
  });
}

/**
 * Remove placeholder orquestrado quando o bloco já tem mídia real (mesma narração/chunk/cena).
 */
export function dedupeOrchestratedTimelineSlots(timelineAssets = {}) {
  const out = {};
  let removed = 0;

  for (const [blockKey, rawSlots] of Object.entries(timelineAssets || {})) {
    let slots = Array.isArray(rawSlots) ? [...rawSlots] : [];
    slots = mergeOrchestratedMetaIntoFilled(slots);

    const filled = slots.filter((s) => String(s?.asset || "").trim());
    const narrCovered = new Set(
      filled.map((s) => normNarration(s.narration_segment)).filter(Boolean)
    );
    const chunkCovered = new Set(
      filled.map((s) => String(s.chunk_id || "").trim()).filter(Boolean)
    );
    const refCovered = new Set(
      filled.map((s) => String(s.scene_ref || "").trim()).filter(Boolean)
    );

    const pruned = slots.filter((slot) => {
      if (!isEmptyOrchestratedSlot(slot)) return true;

      const narr = normNarration(slot.narration_segment);
      const chunk = String(slot.chunk_id || "").trim();
      const ref = String(slot.scene_ref || "").trim();

      if (narr && narrCovered.has(narr)) {
        removed += 1;
        return false;
      }
      if (chunk && chunkCovered.has(chunk)) {
        removed += 1;
        return false;
      }
      if (ref && refCovered.has(ref)) {
        removed += 1;
        return false;
      }

      return true;
    });

    if (pruned.length) out[blockKey] = pruned;
  }

  return { timeline: out, removed };
}

/** prune motion-only + dedupe orquestrados — pipeline único pós-orquestração. */
export function normalizeTimelineAssetSlots(
  timelineAssets = {},
  { pruneMotionOnly } = {}
) {
  const pruneFn =
    pruneMotionOnly ||
    ((ta) => {
      const out = {};
      for (const [blockKey, rawSlots] of Object.entries(ta || {})) {
        const slots = Array.isArray(rawSlots) ? [...rawSlots] : [];
        const hasFilled = slots.some((s) => String(s?.asset || "").trim());
        const pruned = slots.filter((slot) => {
          if (String(slot?.asset || "").trim()) return true;
          if (slot?.user_locked) return true;
          if (!slot?.motion_template_id && !slot?.motion_scene_id) return true;
          if (!hasFilled) return true;
          return false;
        });
        if (pruned.length) out[blockKey] = pruned;
      }
      return out;
    });

  const { timeline: deduped, removed: dedupeRemoved } =
    dedupeOrchestratedTimelineSlots(timelineAssets);
  const pruned = pruneFn(deduped);
  return { timeline: pruned, removed: dedupeRemoved };
}
