/**
 * Enriquece clips PIP geo: duração do flyover (ffprobe) e narração do bloco.
 */

import {
  bindGeoPipTemplateStudioProps,
  resolvePipMediaUrl,
} from "./geoPipTemplateProps.js";
import {
  resolveGeoPipSceneNarration,
  summarizeGeoPipFooterSubject,
} from "./geoPipSceneText.js";

export function isGeoPipMotionClip(clip = {}) {
  const props = clip.props && typeof clip.props === "object" ? clip.props : {};
  return Boolean(props.geo_pip_composite);
}

export function enrichGeoPipMotionClip(
  clip = {},
  { storyboard = {}, resolveFlyoverDurationSec } = {}
) {
  if (!isGeoPipMotionClip(clip)) return { clip, changed: false };

  const props = { ...(clip.props || {}) };
  let changed = false;

  const sceneNarration = resolveGeoPipSceneNarration(props, storyboard);
  if (
    sceneNarration &&
    sceneNarration !== String(props.narration_text || "").trim()
  ) {
    props.narration_text = sceneNarration;
    changed = true;
  }

  const footer = summarizeGeoPipFooterSubject(sceneNarration);
  if (footer && footer !== String(props.scene_subject || "").trim()) {
    props.scene_subject = footer;
    changed = true;
  }

  const flyover = resolvePipMediaUrl(props);
  let flyoverDur = Number(
    props.flyover_duration_sec ??
      props.durationSeconds ??
      props.studio_props?.durationSeconds ??
      0
  );
  if (
    (!Number.isFinite(flyoverDur) || flyoverDur <= 0) &&
    flyover &&
    resolveFlyoverDurationSec
  ) {
    const probed = Number(resolveFlyoverDurationSec(flyover));
    if (Number.isFinite(probed) && probed > 0) flyoverDur = probed;
  }

  if (Number.isFinite(flyoverDur) && flyoverDur > 0) {
    const rounded = Math.max(0.5, Math.round(flyoverDur * 100) / 100);
    if (Number(clip.duration) !== rounded) changed = true;
    if (Number(props.durationSeconds) !== rounded) changed = true;

    props.flyover_duration_sec = rounded;
    props.durationSeconds = rounded;
    props.durationInFrames = Math.max(1, Math.round(rounded * 30));
    props.studio_props = {
      ...(props.studio_props || {}),
      durationSeconds: rounded,
      durationInFrames: props.durationInFrames,
    };

    const bound = bindGeoPipTemplateStudioProps(props, {
      narration: sceneNarration,
      dataSlots: props.template_studio_data_slots,
      flyoverUrl: flyover,
      flyoverDurationSec: rounded,
    });
    Object.assign(props, bound.studio_props);
    props.studio_props = {
      ...(props.studio_props || {}),
      ...bound.studio_props,
    };
    props.location = bound.location;
    props.scene_subject = bound.location || footer;

    return {
      clip: { ...clip, duration: rounded, props },
      changed: true,
    };
  }

  if (changed) {
    const bound = bindGeoPipTemplateStudioProps(props, {
      narration: sceneNarration,
      dataSlots: props.template_studio_data_slots,
      flyoverUrl: flyover,
    });
    Object.assign(props, bound.studio_props);
    props.studio_props = {
      ...(props.studio_props || {}),
      ...bound.studio_props,
    };
    props.location = bound.location;
    return { clip: { ...clip, props }, changed: true };
  }

  return { clip, changed: false };
}

export function enrichGeoPipStudioClips(
  studio = {},
  { storyboard = {}, resolveFlyoverDurationSec } = {}
) {
  if (!studio || !Array.isArray(studio.clips)) {
    return { studio, changed: false };
  }
  let changed = false;
  const clips = studio.clips.map((clip) => {
    const { clip: next, changed: clipChanged } = enrichGeoPipMotionClip(clip, {
      storyboard,
      resolveFlyoverDurationSec,
    });
    if (clipChanged) changed = true;
    return next;
  });
  return {
    studio: changed ? { ...studio, clips } : studio,
    changed,
  };
}
