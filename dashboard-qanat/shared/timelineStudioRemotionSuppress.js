/**
 * Supressão permanente de cenas Remotion / overlays IA na Timeline Studio.
 * IDs + fingerprints impedem reimportação do storyboard no F5.
 */

export function isRemotionStudioClip(clip = {}) {
  return (
    clip.trackId === "motion" ||
    clip.trackId === "overlays" ||
    clip.motionScene ||
    clip.motionScenePrimary ||
    clip.legacyOverlay ||
    Boolean(clip.templateId) ||
    clip.props?.media_mode === "remotion" ||
    clip.props?.motion_scene === true
  );
}

export function remotionClipFingerprint(clip = {}) {
  const trackId = String(clip.trackId || "motion").trim();
  const templateId = String(
    clip.templateId || clip.props?.overlayType || ""
  ).trim();
  const start = Number(clip.start) || 0;
  if (!templateId) return "";
  return `${trackId}::${templateId}::${start.toFixed(3)}`;
}

function normLabel(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function labelsOverlap(a = "", b = "") {
  const ta = new Set(a.split(" ").filter((t) => t.length > 2));
  const tb = new Set(b.split(" ").filter((t) => t.length > 2));
  if (!ta.size || !tb.size) return false;
  let shared = 0;
  for (const token of ta) {
    if (tb.has(token)) shared += 1;
  }
  const minSize = Math.min(ta.size, tb.size);
  return shared >= Math.max(2, Math.ceil(minSize * 0.5));
}

function clipSemanticKey(clip = {}) {
  const templateId = String(
    clip.templateId || clip.props?.overlayType || ""
  ).trim();
  const label = normLabel(
    clip.label ||
      clip.props?.title ||
      clip.props?.text ||
      clip.props?.location ||
      clip.props?.label ||
      ""
  );
  const sceneRef = String(clip.props?.scene_ref || "").trim();
  if (sceneRef) return `${templateId}::scene:${sceneRef}`;
  if (label) return `${templateId}::label:${label.slice(0, 48)}`;
  return remotionClipFingerprint(clip);
}

function clipDisplayLabel(clip = {}) {
  const generic = normLabel(clip.label || "");
  const tpl = normLabel(clip.templateId || clip.props?.overlayType || "");
  const rich = normLabel(
    clip.props?.title ||
      clip.props?.text ||
      clip.props?.location ||
      clip.props?.label ||
      ""
  );
  if (rich && (!generic || generic === tpl)) return rich;
  return rich || generic;
}

function clipsAreSemanticDuplicates(a = {}, b = {}) {
  const tplA = String(a.templateId || a.props?.overlayType || "").trim();
  const tplB = String(b.templateId || b.props?.overlayType || "").trim();
  if (!tplA || tplA !== tplB) return false;
  const refA = String(a.props?.scene_ref || "").trim();
  const refB = String(b.props?.scene_ref || "").trim();
  if (refA && refB && refA === refB) return true;
  const labelA = clipDisplayLabel(a);
  const labelB = clipDisplayLabel(b);
  if (labelA && labelB && labelsOverlap(labelA, labelB)) return true;
  const startA = Number(a.start) || 0;
  const startB = Number(b.start ?? b.start_hint) || 0;
  return Math.abs(startA - startB) < 2;
}

function storyboardRowSemanticKey(row = {}) {
  const templateId = String(
    row.type || row.template_id || row.templateId || ""
  ).trim();
  const label = normLabel(
    row.props?.title ||
      row.props?.text ||
      row.props?.location ||
      row.props?.label ||
      row.label ||
      ""
  );
  const sceneRef = String(row.scene_ref || row.props?.scene_ref || "").trim();
  if (sceneRef) return `${templateId}::scene:${sceneRef}`;
  if (label) return `${templateId}::label:${label.slice(0, 48)}`;
  const start = Number(row.start ?? row.start_hint) || 0;
  return `${templateId}::start:${start.toFixed(3)}`;
}

export function collectSuppressionState(studio = {}) {
  const ids = new Set(
    (Array.isArray(studio.suppressedMotionSceneIds)
      ? studio.suppressedMotionSceneIds
      : []
    )
      .map((id) => String(id || "").trim())
      .filter(Boolean)
  );
  const fingerprints = new Set(
    (Array.isArray(studio.suppressedRemotionFingerprints)
      ? studio.suppressedRemotionFingerprints
      : []
    )
      .map((fp) => String(fp || "").trim())
      .filter(Boolean)
  );
  return { ids, fingerprints };
}

export function clipMatchesSuppression(
  clip = {},
  state = collectSuppressionState()
) {
  const id = String(clip.id || "").trim();
  if (id && state.ids.has(id)) return true;
  const fp = remotionClipFingerprint(clip);
  if (fp && state.fingerprints.has(fp)) return true;
  return false;
}

export function storyboardRowMatchesSuppression(
  row = {},
  trackId = "overlays",
  state = collectSuppressionState()
) {
  const id = String(row.id || "").trim();
  if (id && state.ids.has(id)) return true;
  const templateId = String(row.type || row.template_id || "").trim();
  const start = Number(row.start ?? row.start_hint) || 0;
  const fp = `${trackId}::${templateId}::${start.toFixed(3)}`;
  if (fp && state.fingerprints.has(fp)) return true;
  return false;
}

/**
 * Expande exclusão para aliases no storyboard + duplicatas semânticas na timeline.
 */
export function expandDeletedClipSuppressions(
  storyboard = {},
  studio = {},
  deletedClip = {}
) {
  const state = collectSuppressionState(studio);
  const ids = new Set(state.ids);
  const fingerprints = new Set(state.fingerprints);

  const deletedId = String(deletedClip?.id || "").trim();
  if (deletedId) ids.add(deletedId);

  const fp = remotionClipFingerprint(deletedClip);
  if (fp) fingerprints.add(fp);

  for (const ms of storyboard.motion_scenes || []) {
    if (storyboardRowMatchesSuppression(ms, "motion", { ids, fingerprints })) {
      const msId = String(ms?.id || "").trim();
      if (msId) ids.add(msId);
    }
  }
  for (const key of ["overlays_ai", "overlays"]) {
    for (const row of storyboard[key] || []) {
      if (
        storyboardRowMatchesSuppression(row, "overlays", { ids, fingerprints })
      ) {
        const rowId = String(row?.id || "").trim();
        if (rowId) ids.add(rowId);
      }
    }
  }

  const semantic = clipSemanticKey(deletedClip);
  const templateId = String(
    deletedClip?.templateId || deletedClip?.props?.overlayType || ""
  ).trim();
  const deletedStart = Number(deletedClip?.start) || 0;

  if (templateId) {
    for (const key of ["overlays_ai", "overlays"]) {
      for (const row of storyboard[key] || []) {
        const rowId = String(row?.id || "").trim();
        const rowType = String(row?.type || row?.templateId || "").trim();
        const rowStart = Number(row?.start) || 0;
        const rowSemantic = storyboardRowSemanticKey(row);
        if (
          rowType === templateId &&
          (rowId === deletedId ||
            rowSemantic === semantic ||
            clipsAreSemanticDuplicates(deletedClip, {
              templateId: rowType,
              start: rowStart,
              props: row.props || {},
            }))
        ) {
          if (rowId) ids.add(rowId);
          fingerprints.add(`overlays::${rowType}::${rowStart.toFixed(3)}`);
        }
      }
    }

    for (const ms of storyboard.motion_scenes || []) {
      const msId = String(ms?.id || "").trim();
      const msTpl = String(ms?.template_id || "").trim();
      const msStart = Number(ms?.start_hint ?? ms?.start) || 0;
      const msSemantic = storyboardRowSemanticKey(ms);
      if (
        msTpl === templateId &&
        (msId === deletedId ||
          msSemantic === semantic ||
          clipsAreSemanticDuplicates(deletedClip, {
            templateId: msTpl,
            start: msStart,
            props: {
              ...(ms.props || {}),
              location: ms.props?.location || ms.narration_text,
            },
          }))
      ) {
        if (msId) ids.add(msId);
        fingerprints.add(`motion::${msTpl}::${msStart.toFixed(3)}`);
      }
    }
  }

  for (const clip of studio.clips || []) {
    if (!isRemotionStudioClip(clip)) continue;
    if (String(clip.id || "") === deletedId) continue;
    const clipTpl = String(
      clip.templateId || clip.props?.overlayType || ""
    ).trim();
    if (clipTpl !== templateId) continue;
    if (
      clipSemanticKey(clip) === semantic ||
      clipsAreSemanticDuplicates(deletedClip, clip)
    ) {
      const cid = String(clip.id || "").trim();
      if (cid) ids.add(cid);
      const cfp = remotionClipFingerprint(clip);
      if (cfp) fingerprints.add(cfp);
    }
  }

  return {
    suppressedMotionSceneIds: [...ids],
    suppressedRemotionFingerprints: [...fingerprints],
  };
}

export function mergeDeletedClipSuppressions(
  storyboard = {},
  previousStudio = {},
  nextStudio = {}
) {
  const previousRemotionClips = (
    Array.isArray(previousStudio?.clips) ? previousStudio.clips : []
  ).filter(isRemotionStudioClip);

  const nextIds = new Set(
    (Array.isArray(nextStudio?.clips) ? nextStudio.clips : [])
      .map((clip) => String(clip.id || "").trim())
      .filter(Boolean)
  );

  let merged = {
    ...nextStudio,
    suppressedMotionSceneIds: [
      ...(Array.isArray(nextStudio?.suppressedMotionSceneIds)
        ? nextStudio.suppressedMotionSceneIds
        : []),
    ],
    suppressedRemotionFingerprints: [
      ...(Array.isArray(nextStudio?.suppressedRemotionFingerprints)
        ? nextStudio.suppressedRemotionFingerprints
        : []),
    ],
  };

  for (const clip of previousRemotionClips) {
    const id = String(clip.id || "").trim();
    if (!id || nextIds.has(id)) continue;
    const expanded = expandDeletedClipSuppressions(storyboard, merged, clip);
    merged = { ...merged, ...expanded };
  }

  return merged;
}

export function stripSuppressedRemotionClips(studio = {}) {
  if (!studio || !Array.isArray(studio.clips)) return studio;
  const state = collectSuppressionState(studio);
  if (!state.ids.size && !state.fingerprints.size) return studio;

  const clips = studio.clips.filter(
    (clip) => !clipMatchesSuppression(clip, state)
  );
  if (clips.length === studio.clips.length) return studio;
  return { ...studio, clips };
}

export function applySuppressionFields(studio = {}, fields = {}) {
  const ids = new Set(
    [
      ...(Array.isArray(studio.suppressedMotionSceneIds)
        ? studio.suppressedMotionSceneIds
        : []),
      ...(Array.isArray(fields.suppressedMotionSceneIds)
        ? fields.suppressedMotionSceneIds
        : []),
    ]
      .map((id) => String(id || "").trim())
      .filter(Boolean)
  );
  const fingerprints = new Set(
    [
      ...(Array.isArray(studio.suppressedRemotionFingerprints)
        ? studio.suppressedRemotionFingerprints
        : []),
      ...(Array.isArray(fields.suppressedRemotionFingerprints)
        ? fields.suppressedRemotionFingerprints
        : []),
    ]
      .map((fp) => String(fp || "").trim())
      .filter(Boolean)
  );
  return {
    ...studio,
    suppressedMotionSceneIds: [...ids],
    suppressedRemotionFingerprints: [...fingerprints],
  };
}
