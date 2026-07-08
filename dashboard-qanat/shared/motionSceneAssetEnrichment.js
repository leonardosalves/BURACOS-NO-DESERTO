/**
 * Orquestração de assets por template Remotion — não só mapa/satélite.
 * Detecta clips/cenas que precisam de dados e resolve motion_scenes a partir da timeline.
 */

import { MOTION_SCENE_TRIGGERS } from "./motionSceneCatalog.js";
import {
  clipMatchesSuppression,
  collectSuppressionState,
  storyboardRowMatchesSuppression,
} from "./timelineStudioRemotionSuppress.js";

const GEO_TEMPLATES = new Set(["location-intro", "geo-map"]);

const PLACEHOLDER_BAR_ITEMS = [
  { label: "A", value: 72 },
  { label: "B", value: 54 },
  { label: "C", value: 38 },
];

export function motionSceneFromStudioClip(clip = {}) {
  const templateId = String(clip.templateId || clip.props?.overlayType || "");
  if (!templateId) return null;
  const isMotion =
    clip.motionScene ||
    clip.trackId === "motion" ||
    clip.props?.motion_scene ||
    clip.props?.media_mode === "remotion";
  if (!isMotion) return null;

  return {
    id: String(clip.id || ""),
    scene_ref: String(clip.props?.scene_ref || ""),
    block: Number(clip.props?.block) || 1,
    start_hint: Number(clip.start) || 0,
    duration_seconds: Math.max(0.5, Number(clip.duration) || 4),
    template_id: templateId,
    trigger: String(clip.props?.trigger || ""),
    narration_text: String(
      clip.props?.narration_text || clip.label || ""
    ).trim(),
    props: { ...(clip.props || {}) },
    media_mode: "remotion",
    layout: clip.props?.layout || "pip",
  };
}

export function isPlaceholderCounterProps(props = {}) {
  const label = String(props.label || "").toUpperCase();
  return (
    Number(props.value) === 100 &&
    (label === "DADO" || label === "IMPACTO" || label === "")
  );
}

export function isPlaceholderBarChartProps(props = {}) {
  const items = Array.isArray(props.items) ? props.items : [];
  if (items.length !== 3) return false;
  return PLACEHOLDER_BAR_ITEMS.every((ref, i) => {
    const row = items[i] || {};
    return row.label === ref.label && Number(row.value) === ref.value;
  });
}

export function isPlaceholderTimelineProps(props = {}) {
  const events = Array.isArray(props.events) ? props.events : [];
  return events.length === 1 && String(events[0]?.year || "") === "—";
}

export function motionSceneNeedsAssetEnrichment(scene = {}) {
  const templateId = String(scene.template_id || "");
  const props = scene.props || {};

  if (templateId === "location-intro") {
    if (String(props.ai_video_prompt || "").trim().length >= 80) {
      return false;
    }
    return Boolean(String(props.location || "").trim());
  }

  if (templateId === "geo-map") {
    if (String(props.ai_video_prompt || "").trim().length >= 80) {
      return false;
    }
    return Boolean(String(props.location || "").trim());
  }

  if (templateId === "counter") {
    return isPlaceholderCounterProps(props);
  }
  if (templateId === "bar-chart") {
    return isPlaceholderBarChartProps(props);
  }
  if (templateId === "timeline") {
    return isPlaceholderTimelineProps(props);
  }
  if (templateId === "kinetic-text") {
    return !String(props.text || "").trim();
  }
  if (templateId === "lower-third") {
    return (
      !String(props.subtitle || "").trim() &&
      Boolean(String(scene.narration_text || "").trim())
    );
  }

  return false;
}

export function motionClipNeedsAssetEnrichment(clip = {}) {
  const scene = motionSceneFromStudioClip(clip);
  if (!scene) return false;
  return motionSceneNeedsAssetEnrichment(scene);
}

export function studioClipsNeedingEnrichment(clips = []) {
  return (Array.isArray(clips) ? clips : []).filter((c) =>
    motionClipNeedsAssetEnrichment(c)
  );
}

/**
 * Une storyboard.motion_scenes com clips da timeline (props mais recentes).
 */
export function resolveMotionScenesForEnrichment(storyboard = {}, studio = {}) {
  const suppressedIds = new Set(
    (Array.isArray(studio.suppressedMotionSceneIds)
      ? studio.suppressedMotionSceneIds
      : []
    )
      .map((id) => String(id || "").trim())
      .filter(Boolean)
  );
  const fromStoryboard = Array.isArray(storyboard.motion_scenes)
    ? storyboard.motion_scenes
        .filter((ms) => !suppressedIds.has(String(ms?.id || "")))
        .map((ms) => ({ ...ms, props: { ...ms.props } }))
    : [];
  const clips = Array.isArray(studio.clips) ? studio.clips : [];
  const fromClips = clips.map(motionSceneFromStudioClip).filter(Boolean);

  if (!fromStoryboard.length) return fromClips;
  if (!fromClips.length) return fromStoryboard;

  const clipById = new Map(fromClips.map((s) => [String(s.id), s]));
  return fromStoryboard.map((ms) => {
    const clipScene = clipById.get(String(ms.id || ""));
    if (!clipScene) return ms;
    return {
      ...ms,
      ...clipScene,
      props: { ...(ms.props || {}), ...(clipScene.props || {}) },
      narration_text: clipScene.narration_text || ms.narration_text || "",
    };
  });
}

function suppressedRemotionIdSet(studio = {}) {
  return collectSuppressionState(studio).ids;
}

export function studioNeedsMotionOrchestration(
  clips = [],
  storyboard = {},
  studio = {}
) {
  if (studioClipsNeedingEnrichment(clips).length > 0) return true;

  const suppression = collectSuppressionState(studio);

  const motionClips = (Array.isArray(clips) ? clips : []).filter(
    (c) =>
      (c.trackId === "motion" || c.motionScene) &&
      !clipMatchesSuppression(c, suppression)
  );
  const storyboardMotion = (
    Array.isArray(storyboard.motion_scenes) ? storyboard.motion_scenes : []
  ).filter((ms) => !storyboardRowMatchesSuppression(ms, "motion", suppression));
  if (
    storyboardMotion.length > 0 &&
    motionClips.length < storyboardMotion.length
  ) {
    return true;
  }

  const overlayClips = (Array.isArray(clips) ? clips : []).filter(
    (c) => c.trackId === "overlays" && !clipMatchesSuppression(c, suppression)
  );
  const overlaysSource = (
    Array.isArray(storyboard.overlays_ai)
      ? storyboard.overlays_ai
      : Array.isArray(storyboard.overlays)
        ? storyboard.overlays
        : []
  ).filter((o) => !storyboardRowMatchesSuppression(o, "overlays", suppression));
  if (
    overlaysSource.length > 0 &&
    overlayClips.length < overlaysSource.length
  ) {
    return true;
  }

  const hasVisualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts.length > 0
    : false;
  if (
    motionClips.length === 0 &&
    hasVisualPrompts &&
    storyboardMotion.length > 0
  ) {
    return true;
  }

  return false;
}

export function listSupportedMotionTemplates() {
  return Object.values(MOTION_SCENE_TRIGGERS).flatMap((t) => t.templates || []);
}

export function isGeoTemplate(templateId = "") {
  return GEO_TEMPLATES.has(String(templateId));
}
