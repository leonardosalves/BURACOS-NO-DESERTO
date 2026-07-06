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
