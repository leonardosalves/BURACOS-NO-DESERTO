import {
  activeVideoAt,
  clipsOnTrack,
  type StudioClip,
} from "./timelineStudioTypes";

function sceneSatelliteKey(clipId: string): string {
  return String(clipId || "")
    .trim()
    .replace(/\./g, "_");
}

/** Preenche paths ASSETS/satellite/* quando zoom_keyframes estão vazios no disco. */
export function enrichSatelliteMotionClip(clip: StudioClip): StudioClip {
  const tpl = String(clip.templateId || "");
  if (tpl !== "location-intro" && tpl !== "geo-map") return clip;

  const key = sceneSatelliteKey(clip.id);
  const props = { ...(clip.props || {}) } as Record<string, unknown>;

  if (!String(props.flyover_video || "").trim()) {
    props.flyover_video = `ASSETS/satellite/${key}-flyover.mp4`;
  }
  if (!String(props.backgroundImage || "").trim()) {
    props.backgroundImage = `ASSETS/satellite/${key}-z10.jpg`;
  }
  if (!String(props.backgroundImageWide || "").trim()) {
    props.backgroundImageWide = `ASSETS/satellite/${key}-z3.jpg`;
  }
  if (!String(props.boundaryGeoJson || "").trim()) {
    props.boundaryGeoJson = `ASSETS/satellite/${key}-boundary.json`;
  }
  if (!String(props.map_provider || "").trim()) {
    props.map_provider = "blender";
  }
  if (Array.isArray(props.zoom_keyframes)) {
    props.zoom_keyframes = props.zoom_keyframes.map((kf) => {
      if (!kf || typeof kf !== "object") return kf;
      const row = kf as { zoom?: number; image?: string };
      const zoom = Number(row.zoom);
      if (!Number.isFinite(zoom) || String(row.image || "").trim()) return kf;
      return { ...row, image: `ASSETS/satellite/${key}-z${zoom}.jpg` };
    });
  }

  return {
    ...clip,
    props: {
      ...props,
      presentation: "fullscreen",
      layout: "fullscreen",
    },
  };
}

/** Resolve paths ASSETS/… para URLs servidas pelo backend. */

export function resolveMediaUrl(
  source: string,
  getAssetUrl: (fileName: string) => string,
  getMusicUrl?: (fileName: string) => string
): string {
  const s = String(source || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/api/")) return s;
  const normalized = s.replace(/^ASSETS\//i, "").replace(/\\/g, "/");
  const isProjectRoot = /\.(mp3|wav|m4a|aac)$/i.test(normalized);
  if (isProjectRoot && getMusicUrl) {
    return getMusicUrl(normalized.split("/").pop() || normalized);
  }
  const assetName = normalized.includes("/")
    ? normalized
    : normalized.split("/").pop() || normalized;
  return getAssetUrl(assetName);
}

export function resolveMotionSceneProps(
  props: Record<string, unknown> = {},
  getAssetUrl: (fileName: string) => string,
  getMusicUrl?: (fileName: string) => string
): Record<string, unknown> {
  const p = { ...props };
  for (const key of [
    "backgroundImage",
    "backgroundImageWide",
    "boundaryGeoJson",
    "flyover_video",
  ] as const) {
    const val = p[key];
    if (typeof val === "string" && val.trim()) {
      p[key] = resolveMediaUrl(val, getAssetUrl, getMusicUrl);
    }
  }
  if (Array.isArray(p.zoom_keyframes)) {
    p.zoom_keyframes = p.zoom_keyframes.map((kf) => {
      if (!kf || typeof kf !== "object") return kf;
      const row = kf as { zoom?: number; image?: string };
      if (!row.image) return kf;
      return {
        ...row,
        image: resolveMediaUrl(row.image, getAssetUrl, getMusicUrl),
      };
    });
  }
  return p;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|$)/i;
const PRELOAD_CACHE_MAX = 48;
const preloadedUrls = new Set<string>();

function isVideoUrl(url: string): boolean {
  return VIDEO_EXT.test(url);
}

function rememberPreloadedUrl(url: string): boolean {
  if (preloadedUrls.has(url)) return false;
  preloadedUrls.add(url);
  if (preloadedUrls.size > PRELOAD_CACHE_MAX) {
    const oldest = preloadedUrls.values().next().value;
    if (oldest) preloadedUrls.delete(oldest);
  }
  return true;
}

/** Pré-carrega B-roll perto do playhead para o preview pintar no primeiro mount. */
export function preloadStudioMediaAtPlayhead(
  clips: StudioClip[],
  playhead: number,
  getAssetUrl: (fileName: string) => string,
  getMusicUrl?: (fileName: string) => string,
  windowSec = 8
): void {
  if (typeof document === "undefined") return;

  const active = activeVideoAt(clips, playhead);
  const nearby = clipsOnTrack(clips, "video").filter((clip) => {
    const source = String(clip.source || "").trim();
    if (!source) return false;
    const end = clip.start + clip.duration;
    return playhead >= clip.start - windowSec && playhead <= end + windowSec;
  });

  const urls = new Set<string>();
  for (const clip of [active, ...nearby].filter(Boolean) as StudioClip[]) {
    const url = resolveMediaUrl(clip.source!, getAssetUrl, getMusicUrl);
    if (url) urls.add(url);
  }

  const motionNear = clipsOnTrack(clips, "motion").filter((clip) => {
    const end = clip.start + clip.duration;
    return playhead >= clip.start - windowSec && playhead <= end + windowSec;
  });
  for (const clip of motionNear) {
    const enriched = enrichSatelliteMotionClip(clip);
    const props = resolveMotionSceneProps(
      (enriched.props || {}) as Record<string, unknown>,
      getAssetUrl,
      getMusicUrl
    );
    const flyover = String(props.flyover_video || "").trim();
    if (flyover) urls.add(flyover);
    for (const key of ["backgroundImage", "backgroundImageWide"] as const) {
      const img = String(props[key] || "").trim();
      if (img) urls.add(img);
    }
    if (Array.isArray(props.zoom_keyframes)) {
      for (const kf of props.zoom_keyframes) {
        const img = String((kf as { image?: string })?.image || "").trim();
        if (img) urls.add(img);
      }
    }
  }

  const activeUrl = active?.source
    ? resolveMediaUrl(active.source, getAssetUrl, getMusicUrl)
    : "";

  for (const url of urls) {
    if (!rememberPreloadedUrl(url)) continue;
    if (isVideoUrl(url)) {
      const video = document.createElement("video");
      video.preload = url === activeUrl ? "auto" : "metadata";
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      video.load();
      continue;
    }
    const img = new Image();
    img.src = url;
  }
}
