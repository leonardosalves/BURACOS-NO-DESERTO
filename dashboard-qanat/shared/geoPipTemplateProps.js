/**
 * Liga dados geo/flyover aos dataSlots do template Studio Picture in Picture.
 * Não inventa chrome — só preenche pipMediaUrl, pipTitle, location, etc.
 */

import { formatCoordDms } from "./geoPipStudioTemplate.js";
import {
  resolveGeoPipReferenceLabel,
  resolveGeoPipSectorLabel,
  summarizeGeoPipFooterSubject,
} from "./geoPipSceneText.js";

/** Props vazias que devem sobrescrever defaults do TSX (não filtrar como placeholder). */
export const GEO_PIP_FORCE_EMPTY_KEYS = [
  "descriptorText",
  "statusText",
  "pipTag",
  "pipTitle",
  "pipSubtitle",
  "coordinateText",
  "distanceText",
  "mainTitle",
  "mainSubtitle",
  "mainMediaUrl",
  "backgroundColor",
  "panelLabel",
];

export const GEO_PIP_OVERLAY_PROP_KEYS = [
  "geoPipOverlayChrome",
  "backgroundColor",
];

export const GEO_PIP_CHROME_DEFAULT_KEYS = [
  "descriptorText",
  "statusText",
  "pipTag",
  "pipTitle",
  "pipSubtitle",
  "coordinateText",
  "distanceText",
  "mainMediaUrl",
  "showPointerLines",
  "showMainContentLabel",
  "mainTitle",
  "mainSubtitle",
  "location",
  "panelLabel",
  "backgroundColor",
  "geoPipOverlayChrome",
  "pipPosition",
  "pipInset",
];

/** Slots editados manualmente no inspector — não sobrescrever no preview/render. */
export function resolveStudioUserLockedSlots(props = {}) {
  const raw = props.studio_user_locked_slots;
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.map((slot) => String(slot || "").trim()).filter(Boolean));
}

export function pickUserLockedStudioValues(props = {}, locked = null) {
  const slots = locked || resolveStudioUserLockedSlots(props);
  const studio =
    props.studio_props && typeof props.studio_props === "object"
      ? props.studio_props
      : {};
  const out = {};
  for (const slot of slots) {
    if (props[slot] !== undefined) out[slot] = props[slot];
    else if (studio[slot] !== undefined) out[slot] = studio[slot];
  }
  return out;
}

/** Limpa chrome técnico; sem título central; rodapé = resumo do assunto. */
export function applyGeoPipChromeProps(
  studio = {},
  { narration = "", sector = "", lockedSlots = null } = {}
) {
  const locked = lockedSlots || new Set();
  const footer =
    summarizeGeoPipFooterSubject(narration) ||
    String(sector || studio.location || "").trim();

  const defaults = {
    descriptorText: "",
    statusText: "",
    pipTag: "",
    pipTitle: "",
    pipSubtitle: "",
    coordinateText: "",
    distanceText: "",
    mainMediaUrl: "",
    showPointerLines: false,
    showMainContentLabel: false,
    mainTitle: "",
    mainSubtitle: "",
    location: footer,
    panelLabel: "",
    backgroundColor: "transparent",
    geoPipOverlayChrome: true,
    pipPosition: "top-right",
    pipInset: 132,
  };

  const out = { ...studio };
  for (const [key, value] of Object.entries(defaults)) {
    if (!locked.has(key)) out[key] = value;
  }
  return out;
}

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mkv)(\?|$)/i;

export function isPictureInPictureStudioTemplate(props = {}) {
  const sub = String(props.template_studio_subcategory || "")
    .trim()
    .toLowerCase();
  return sub.includes("picture in picture");
}

export function isVideoMediaUrl(url = "") {
  return VIDEO_EXT_RE.test(String(url || "").trim());
}

/** flyover_video / tiles → pipMediaUrl do template. */
export function resolvePipMediaUrl(props = {}) {
  const studio = props.studio_props || {};
  const candidates = [
    studio.pipMediaUrl,
    props.pipMediaUrl,
    studio.flyover_video,
    props.flyover_video,
    studio.backgroundImage,
    props.backgroundImage,
  ];
  for (const raw of candidates) {
    const v = String(raw || "").trim();
    if (v) return v;
  }
  return "";
}

/**
 * Preenche studio_props com os slots do template PIP (design intacto).
 */
export function bindGeoPipTemplateStudioProps(
  props = {},
  {
    narration = "",
    dataSlots = [],
    flyoverUrl = "",
    mainMediaUrl = "",
    flyoverDurationSec = 0,
  } = {}
) {
  const slots = Array.isArray(dataSlots)
    ? dataSlots.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const slotSet = new Set(slots);
  const hasSlots = slotSet.size > 0;
  const pipTemplate =
    isPictureInPictureStudioTemplate(props) ||
    slotSet.has("pipMediaUrl") ||
    slotSet.has("pipTitle");

  const reference = resolveGeoPipReferenceLabel(props);
  const sector = resolveGeoPipSectorLabel(props, narration);
  const locked = resolveStudioUserLockedSlots(props);
  const studio = { ...(props.studio_props || {}) };
  const filled = [];

  const assign = (key, value) => {
    if (!key || locked.has(key) || value === undefined || value === null)
      return;
    const clean = String(value).trim();
    if (!clean) return;
    studio[key] = clean;
    if (!filled.includes(key)) filled.push(key);
  };

  const wants = (key) => !hasSlots || slotSet.has(key);

  const media = String(flyoverUrl || resolvePipMediaUrl(props) || "").trim();
  if (media && wants("pipMediaUrl")) assign("pipMediaUrl", media);

  const broll = String(mainMediaUrl || studio.mainMediaUrl || "").trim();
  if (broll && wants("mainMediaUrl")) assign("mainMediaUrl", broll);

  if (reference && wants("pipTitle")) assign("pipTitle", reference);

  if (sector && wants("location")) assign("location", sector);

  const lat = Number(props.lat ?? studio.lat);
  const lng = Number(props.lng ?? studio.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && wants("coordinateText")) {
    assign(
      "coordinateText",
      `${formatCoordDms(lat, "lat")} • ${formatCoordDms(lng, "lng")}`
    );
  }

  if (!hasSlots && pipTemplate) {
    if (media) assign("pipMediaUrl", media);
    if (reference) assign("pipTitle", reference);
    if (sector) assign("location", sector);
  }

  const dur = Number(flyoverDurationSec);
  if (Number.isFinite(dur) && dur > 0) {
    studio.durationSeconds = dur;
    studio.durationInFrames = Math.max(1, Math.round(dur * 30));
    filled.push("durationSeconds", "durationInFrames");
  }

  const chromed = applyGeoPipChromeProps(studio, {
    narration: String(narration || props.narration_text || "").trim(),
    sector,
    lockedSlots: locked,
  });
  Object.assign(studio, chromed);
  Object.assign(studio, pickUserLockedStudioValues(props, locked));
  for (const key of GEO_PIP_FORCE_EMPTY_KEYS) {
    if (!filled.includes(key)) filled.push(key);
  }
  if (!filled.includes("showMainContentLabel"))
    filled.push("showMainContentLabel");
  if (!filled.includes("showPointerLines")) filled.push("showPointerLines");

  return {
    studio_props: studio,
    pipTitle: reference,
    location: chromed.location || sector,
    pipMediaUrl: media,
    mainMediaUrl: "",
    filled_slots: filled,
  };
}

/** Mescla props de render: flyover → pipMediaUrl; mantém design do TSX. */
/** Duração efetiva do clip PIP — prioriza upload/ffprobe sobre default do template. */
export function resolveGeoPipClipDurationSec(clip = {}) {
  const props = clip.props && typeof clip.props === "object" ? clip.props : {};
  const studio =
    props.studio_props && typeof props.studio_props === "object"
      ? props.studio_props
      : {};
  const hasFlyover = Boolean(resolvePipMediaUrl(props));
  const candidates = [
    props.flyover_duration_sec,
    studio.flyover_duration_sec,
    props.durationSeconds,
    studio.durationSeconds,
    Number(props.durationInFrames) > 0
      ? Number(props.durationInFrames) / 30
      : 0,
    Number(studio.durationInFrames) > 0
      ? Number(studio.durationInFrames) / 30
      : 0,
  ];
  if (!hasFlyover) candidates.push(clip.duration);
  for (const raw of candidates) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const fallback = Math.max(0.5, Number(clip.duration) || 4);
  if (
    hasFlyover &&
    (props.geo_pip_composite || isPictureInPictureStudioTemplate(props))
  ) {
    return Math.max(fallback, 10);
  }
  return fallback;
}

/** Duração do flyover (upload/ffprobe), sem usar clip.duration da timeline. */
export function resolveGeoPipFlyoverDurationSec(clip = {}) {
  return resolveGeoPipClipDurationSec(clip);
}

/** Duração efetiva na timeline — max(clip, flyover) para não cortar o vídeo. */
export function resolveGeoPipTimelineDurationSec(clip = {}) {
  const flyover = resolveGeoPipFlyoverDurationSec(clip);
  const timeline = Math.max(0, Number(clip.duration) || 0);
  if (flyover > 0) return Math.max(timeline, flyover);
  return Math.max(0.5, timeline || 4);
}

/** Scrub 1:1 do MP4 flyover — HTML video nativo (sem seek por frame do Remotion). */
export function resolveGeoPipFlyoverVideoScrubSec(clip = {}, playhead = 0) {
  const flyoverDur = resolveGeoPipFlyoverDurationSec(clip);
  const start = Number(clip.start) || 0;
  const local = Math.max(0, Number(playhead) - start);
  return Math.min(Math.max(0, flyoverDur - 0.04), local);
}

/**
 * Segundos locais no preview: animação segue o clip na timeline;
 * o flyover é distribuído linearmente ao longo dessa duração.
 */
export function resolveGeoPipPreviewScrubSec(clip = {}, playhead = 0) {
  const clipDur = resolveGeoPipTimelineDurationSec(clip);
  const flyoverDur = resolveGeoPipFlyoverDurationSec(clip) || clipDur;
  const start = Number(clip.start) || 0;
  const local = Math.max(
    0,
    Math.min(Math.max(0, clipDur - 0.04), Number(playhead) - start)
  );
  if (flyoverDur > 0 && clipDur > 0) {
    return Math.min(
      Math.max(0, flyoverDur - 0.04),
      local * (flyoverDur / clipDur)
    );
  }
  return local;
}

export function mapGeoPipFlyoverToTemplateRenderProps(props = {}) {
  if (!props || typeof props !== "object") return props;
  const pipTemplate =
    isPictureInPictureStudioTemplate(props) || props.geo_pip_composite;
  if (!pipTemplate) return props;

  const locked = resolveStudioUserLockedSlots(props);
  const userLocked = pickUserLockedStudioValues(props, locked);
  const bound = bindGeoPipTemplateStudioProps(props, {
    narration: String(props.narration_text || ""),
    dataSlots: props.template_studio_data_slots,
    flyoverUrl: resolvePipMediaUrl(props),
    mainMediaUrl: String(props.mainMediaUrl || "").trim(),
  });

  const out = { ...props, ...bound.studio_props, ...userLocked };
  out.studio_props = {
    ...(props.studio_props || {}),
    ...bound.studio_props,
    ...userLocked,
  };
  if (bound.pipMediaUrl) out.pipMediaUrl = bound.pipMediaUrl;
  if (!locked.has("pipTitle") && bound.pipTitle) out.pipTitle = bound.pipTitle;
  if (!locked.has("location") && bound.location) out.location = bound.location;
  for (const key of GEO_PIP_FORCE_EMPTY_KEYS) {
    if (locked.has(key)) continue;
    if (key in bound.studio_props) out[key] = bound.studio_props[key];
  }
  if (!locked.has("showMainContentLabel")) {
    if (bound.studio_props.showMainContentLabel !== undefined) {
      out.showMainContentLabel = bound.studio_props.showMainContentLabel;
    }
  }
  if (!locked.has("showPointerLines")) {
    if (bound.studio_props.showPointerLines !== undefined) {
      out.showPointerLines = bound.studio_props.showPointerLines;
    }
  }
  for (const key of GEO_PIP_OVERLAY_PROP_KEYS) {
    if (locked.has(key)) continue;
    if (key in bound.studio_props) out[key] = bound.studio_props[key];
  }
  if (!locked.has("mainMediaUrl")) out.mainMediaUrl = "";
  return out;
}
