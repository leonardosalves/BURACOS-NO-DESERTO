/**
 * Preserva edições manuais do usuário ao re-orquestrar motion scenes Studio.
 */

import { isGeoMotionTemplate } from "./geoSceneEligibility.js";

export const STUDIO_USER_LOCK_PROP = "studio_user_locked";
export const STUDIO_USER_LOCKED_SLOTS_PROP = "studio_user_locked_slots";
export const TIMING_MANUAL_PROP = "timing_manual";

const ARRAY_SLOTS = new Set([
  "items",
  "segments",
  "bars",
  "series",
  "events",
  "steps",
  "milestones",
]);

const NUMBER_SLOTS = new Set([
  "value",
  "delayPerChar",
  "durationSeconds",
  "durationInFrames",
]);

const COLOR_SLOTS = new Set([
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
]);

export function studioSlotKind(slot = "") {
  const key = String(slot || "").trim();
  if (ARRAY_SLOTS.has(key)) return "array";
  if (NUMBER_SLOTS.has(key)) return "number";
  if (COLOR_SLOTS.has(key)) return "color";
  return "text";
}

export function isMotionStudioClip(clip = {}) {
  return Boolean(
    clip.motionScene ||
    clip.motionScenePrimary ||
    clip.props?.motion_scene ||
    clip.props?.studio_source_code ||
    clip.trackId === "motion"
  );
}

export function clipHasStudioUserLock(clip = {}) {
  return clip?.props?.[STUDIO_USER_LOCK_PROP] === true;
}

export function clipHasTimingManual(clip = {}) {
  return (
    clip?.props?.[TIMING_MANUAL_PROP] === true || clip?.timing_manual === true
  );
}

function lockedSlotsFromClip(clip = {}) {
  const fromProps = clip.props?.[STUDIO_USER_LOCKED_SLOTS_PROP];
  if (Array.isArray(fromProps) && fromProps.length) {
    return fromProps.map((s) => String(s || "").trim()).filter(Boolean);
  }
  const dataSlots = Array.isArray(clip.props?.template_studio_data_slots)
    ? clip.props.template_studio_data_slots
    : [];
  const studioProps = clip.props?.studio_props;
  if (studioProps && typeof studioProps === "object") {
    return Object.keys(studioProps).filter(
      (k) => dataSlots.includes(k) || k in studioProps
    );
  }
  return dataSlots.filter(
    (slot) => clip.props?.[slot] !== undefined && clip.props[slot] !== ""
  );
}

function pickLockedProps(
  existingProps = {},
  plannedProps = {},
  lockedSlots = []
) {
  const out = { ...plannedProps };
  const nextStudio = { ...(plannedProps.studio_props || {}) };
  let studioChanged = false;

  for (const slot of lockedSlots) {
    if (existingProps[slot] !== undefined) {
      out[slot] = existingProps[slot];
    }
    if (existingProps.studio_props?.[slot] !== undefined) {
      nextStudio[slot] = existingProps.studio_props[slot];
      studioChanged = true;
    }
  }

  if (studioChanged || existingProps.studio_props) {
    out.studio_props = studioChanged
      ? { ...(plannedProps.studio_props || {}), ...nextStudio }
      : existingProps.studio_props || plannedProps.studio_props;
  }

  out[STUDIO_USER_LOCK_PROP] = true;
  out[STUDIO_USER_LOCKED_SLOTS_PROP] = lockedSlots;
  if (existingProps.studio_props_meta) {
    out.studio_props_meta = {
      ...existingProps.studio_props_meta,
      user_locked: true,
      user_locked_slots: lockedSlots,
    };
  }
  return out;
}

const GEO_ASSET_PROP_KEYS = [
  "flyover_video",
  "ai_video_prompt",
  "ai_video_negative_prompt",
  "geo_prompt_shotlist",
  "geo_prompt_brief",
  "map_provider",
  "geo_generation",
  "geo_pip_composite",
  "geo_pip_window",
  "geo_pip_mode",
  "geo_pip_native",
  "referencePoint",
  "location",
  "region",
  "country",
  "lat",
  "lng",
  "fly_mode",
  "place_type",
  "presentation",
  "layout",
  "aspect_ratio",
];

const GEO_STUDIO_META_KEYS = [
  "template_studio_id",
  "template_studio_name",
  "template_studio_category",
  "template_studio_subcategory",
  "template_studio_motion_template_id",
  "template_studio_data_slots",
  "studio_source_code",
  "studio_props",
  "studio_props_meta",
];

function clipHasGeoUserAssets(props = {}) {
  return Boolean(
    String(props.flyover_video || "").trim() ||
    String(props.ai_video_prompt || "").trim()
  );
}

/** Mantém mapa/PIP quando o usuario ja enviou flyover ou prompt geo. */
export function mergeGeoMotionAssets(existing = {}, planned = {}) {
  const exProps = existing.props || {};
  if (!clipHasGeoUserAssets(exProps)) return planned;

  const preserved = {};
  for (const key of GEO_ASSET_PROP_KEYS) {
    const value = exProps[key];
    if (value !== undefined && value !== null && value !== "") {
      preserved[key] = value;
    }
  }

  const hadGeoTemplate =
    isGeoMotionTemplate(existing.templateId) ||
    isGeoMotionTemplate(exProps.template_id) ||
    isGeoMotionTemplate(exProps.overlayType) ||
    exProps.geo_pip_composite ||
    exProps.geo_pip_native;

  const plannedTpl = String(
    planned.templateId || planned.template_id || ""
  ).trim();
  const plannedIsGeo = isGeoMotionTemplate(plannedTpl);

  let merged = {
    ...planned,
    props: {
      ...(planned.props || {}),
      ...preserved,
    },
  };

  if (hadGeoTemplate && !plannedIsGeo) {
    merged = {
      ...merged,
      templateId: "location-intro",
      label: existing.label || merged.label,
      props: {
        ...merged.props,
        overlayType: "location-intro",
        motion_scene: true,
      },
    };
    if (exProps.geo_pip_composite || exProps.geo_pip_native) {
      for (const key of GEO_STUDIO_META_KEYS) {
        if (exProps[key] !== undefined) merged.props[key] = exProps[key];
      }
    }
  }

  return merged;
}

/** Mescla clip planejado com edições manuais do usuário no clip existente. */
export function mergeMotionClipPreservingUserEdits(
  existing = {},
  planned = {}
) {
  const geoMerged = mergeGeoMotionAssets(existing, planned);
  const propsLocked = clipHasStudioUserLock(existing);
  const timingLocked = clipHasTimingManual(existing);
  if (!propsLocked && !timingLocked) return geoMerged;

  let merged = { ...geoMerged };
  if (timingLocked) {
    merged = {
      ...merged,
      start: Number(existing.start) || merged.start,
      duration: Number(existing.duration) || merged.duration,
      timing_manual: true,
    };
  }

  if (propsLocked) {
    const lockedSlots = lockedSlotsFromClip(existing);
    merged = {
      ...merged,
      label: existing.label || merged.label,
      props: pickLockedProps(
        existing.props || {},
        planned.props || {},
        lockedSlots
      ),
    };
    if (timingLocked) {
      merged.props = {
        ...merged.props,
        [TIMING_MANUAL_PROP]: true,
      };
    }
  } else if (timingLocked) {
    merged.props = {
      ...(merged.props || {}),
      [TIMING_MANUAL_PROP]: true,
    };
  }

  return merged;
}

export function markStudioClipUserEdit(
  clip = {},
  { slot = null, timing = false } = {}
) {
  const props = { ...(clip.props || {}) };
  if (timing) {
    props[TIMING_MANUAL_PROP] = true;
  }
  if (slot) {
    props[STUDIO_USER_LOCK_PROP] = true;
    const slots = new Set(
      (Array.isArray(props[STUDIO_USER_LOCKED_SLOTS_PROP])
        ? props[STUDIO_USER_LOCKED_SLOTS_PROP]
        : []
      ).map((s) => String(s || "").trim())
    );
    slots.add(String(slot).trim());
    props[STUDIO_USER_LOCKED_SLOTS_PROP] = [...slots];
  }
  return {
    ...clip,
    timing_manual: timing ? true : clip.timing_manual,
    props,
  };
}

export function resolveStudioInspectorSlots(clip = {}) {
  const dataSlots = Array.isArray(clip.props?.template_studio_data_slots)
    ? clip.props.template_studio_data_slots.map((s) => String(s || "").trim())
    : [];
  if (dataSlots.length) return dataSlots;
  const studioProps = clip.props?.studio_props;
  if (studioProps && typeof studioProps === "object") {
    return Object.keys(studioProps);
  }
  return [];
}
