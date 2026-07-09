/**
 * Liga dados geo/flyover aos dataSlots do template Studio Picture in Picture.
 * Não inventa chrome — só preenche pipMediaUrl, pipTitle, location, etc.
 */

import { formatCoordDms } from "./geoPipStudioTemplate.js";
import {
  extractSceneSubject,
  resolveGeoPipReferenceLabel,
  resolveGeoPipSectorLabel,
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
];

/** Título + subtítulo centrais a partir do assunto narrado (até 2 frases). */
export function splitNarrationTitleSubtitle(narration = "", maxTitle = 52, maxSubtitle = 72) {
  const subject = extractSceneSubject(narration);
  if (!subject) return { mainTitle: "", mainSubtitle: "" };

  const sentences = subject
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);

  if (sentences.length >= 2) {
    return {
      mainTitle: sentences[0].slice(0, maxTitle),
      mainSubtitle: sentences[1].slice(0, maxSubtitle),
    };
  }

  const words = subject.split(/\s+/).filter(Boolean);
  if (words.length <= 5) {
    return { mainTitle: subject.slice(0, maxTitle), mainSubtitle: "" };
  }

  const mid = Math.ceil(words.length / 2);
  return {
    mainTitle: words.slice(0, mid).join(" ").slice(0, maxTitle),
    mainSubtitle: words.slice(mid).join(" ").slice(0, maxSubtitle),
  };
}

/** Limpa chrome técnico; centro = assunto narrado; rodapé = setor/local. */
export function applyGeoPipChromeProps(studio = {}, { narration = "", sector = "" } = {}) {
  const { mainTitle, mainSubtitle } = splitNarrationTitleSubtitle(narration);
  const hasCenter = Boolean(mainTitle || mainSubtitle);
  const location = String(sector || studio.location || "").trim();

  return {
    ...studio,
    descriptorText: "",
    statusText: "",
    pipTag: "",
    pipTitle: "",
    pipSubtitle: "",
    coordinateText: "",
    distanceText: "",
    mainMediaUrl: "",
    showPointerLines: false,
    showMainContentLabel: hasCenter,
    mainTitle: mainTitle || "",
    mainSubtitle: mainSubtitle || "",
    location,
  };
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
  const studio = { ...(props.studio_props || {}) };
  const filled = [];

  const assign = (key, value) => {
    if (!key || value === undefined || value === null) return;
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
  });
  Object.assign(studio, chromed);
  for (const key of GEO_PIP_FORCE_EMPTY_KEYS) {
    if (!filled.includes(key)) filled.push(key);
  }
  if (!filled.includes("showMainContentLabel")) filled.push("showMainContentLabel");
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
  const candidates = [
    props.durationSeconds,
    studio.durationSeconds,
    clip.duration,
    Number(props.durationInFrames) > 0
      ? Number(props.durationInFrames) / 30
      : 0,
    Number(studio.durationInFrames) > 0
      ? Number(studio.durationInFrames) / 30
      : 0,
  ];
  for (const raw of candidates) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return Math.max(0.5, Number(clip.duration) || 4);
}

export function mapGeoPipFlyoverToTemplateRenderProps(props = {}) {
  if (!props || typeof props !== "object") return props;
  const pipTemplate =
    isPictureInPictureStudioTemplate(props) || props.geo_pip_composite;
  if (!pipTemplate) return props;

  const bound = bindGeoPipTemplateStudioProps(props, {
    narration: String(props.narration_text || ""),
    dataSlots: props.template_studio_data_slots,
    flyoverUrl: resolvePipMediaUrl(props),
    mainMediaUrl: String(props.mainMediaUrl || "").trim(),
  });

  const out = { ...props, ...bound.studio_props };
  out.studio_props = {
    ...(props.studio_props || {}),
    ...bound.studio_props,
  };
  if (bound.pipMediaUrl) out.pipMediaUrl = bound.pipMediaUrl;
  if (bound.pipTitle) out.pipTitle = bound.pipTitle;
  if (bound.location) out.location = bound.location;
  for (const key of GEO_PIP_FORCE_EMPTY_KEYS) {
    if (key in bound.studio_props) out[key] = bound.studio_props[key];
  }
  if (bound.studio_props.showMainContentLabel !== undefined) {
    out.showMainContentLabel = bound.studio_props.showMainContentLabel;
  }
  if (bound.studio_props.showPointerLines !== undefined) {
    out.showPointerLines = bound.studio_props.showPointerLines;
  }
  out.mainMediaUrl = "";
  return out;
}
