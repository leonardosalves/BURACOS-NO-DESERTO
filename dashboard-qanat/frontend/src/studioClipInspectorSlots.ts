import type { StudioClip } from "./timelineStudioTypes";

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

export type StudioSlotKind = "text" | "number" | "color" | "array";

export function studioSlotKind(slot: string): StudioSlotKind {
  if (ARRAY_SLOTS.has(slot)) return "array";
  if (NUMBER_SLOTS.has(slot)) return "number";
  if (COLOR_SLOTS.has(slot)) return "color";
  return "text";
}

export function resolveStudioInspectorSlots(clip: StudioClip): string[] {
  const dataSlots = Array.isArray(clip.props?.template_studio_data_slots)
    ? (clip.props.template_studio_data_slots as string[]).map((s) =>
        String(s).trim()
      )
    : [];
  if (dataSlots.length) return dataSlots;
  const studioProps = clip.props?.studio_props;
  if (
    studioProps &&
    typeof studioProps === "object" &&
    !Array.isArray(studioProps)
  ) {
    return Object.keys(studioProps as Record<string, unknown>);
  }
  return [];
}

export function slotDisplayValue(clip: StudioClip, slot: string): string {
  const props = clip.props || {};
  const studioProps =
    props.studio_props && typeof props.studio_props === "object"
      ? (props.studio_props as Record<string, unknown>)
      : {};
  const raw = props[slot] ?? studioProps[slot];
  if (raw === undefined || raw === null) return "";
  if (studioSlotKind(slot) === "array") {
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return "";
    }
  }
  return String(raw);
}

export function parseSlotInput(slot: string, raw: string): unknown {
  const kind = studioSlotKind(slot);
  if (kind === "array") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    return JSON.parse(trimmed) as unknown;
  }
  if (kind === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  return raw;
}

export function applyStudioSlotPatch(
  clip: StudioClip,
  slot: string,
  value: unknown
): Partial<StudioClip> {
  const props = { ...(clip.props || {}) };
  const studioProps = {
    ...(props.studio_props &&
    typeof props.studio_props === "object" &&
    !Array.isArray(props.studio_props)
      ? (props.studio_props as Record<string, unknown>)
      : {}),
    [slot]: value,
  };
  const locked = new Set(
    (Array.isArray(props[STUDIO_USER_LOCKED_SLOTS_PROP])
      ? (props[STUDIO_USER_LOCKED_SLOTS_PROP] as string[])
      : []
    ).map((s) => String(s).trim())
  );
  locked.add(slot);

  return {
    props: {
      ...props,
      [slot]: value,
      studio_props: studioProps,
      [STUDIO_USER_LOCK_PROP]: true,
      [STUDIO_USER_LOCKED_SLOTS_PROP]: [...locked],
    },
  };
}

export function applyTimingManualPatch(
  clip: StudioClip,
  patch: Partial<StudioClip>
): Partial<StudioClip> {
  return {
    ...patch,
    timing_manual: true,
    props: {
      ...(clip.props || {}),
      ...(patch.props || {}),
      [TIMING_MANUAL_PROP]: true,
    },
  };
}
