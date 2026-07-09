import { GEO_PIP_MEDIA_WINDOW_9x16 } from "../../shared/geoPipStudioTemplate.js";

export { GEO_PIP_MEDIA_WINDOW_9x16 };

export type GeoPipWindow = {
  leftPct?: number;
  topPct?: number;
  widthPct?: number;
  heightPct?: number;
  radiusPx?: number;
};

export function resolveGeoPipWindowRect(
  width: number,
  height: number,
  window: GeoPipWindow = GEO_PIP_MEDIA_WINDOW_9x16
) {
  const leftPct = Number(window.leftPct ?? 52);
  const topPct = Number(window.topPct ?? 66);
  const widthPct = Number(window.widthPct ?? 44);
  const heightPct = Number(window.heightPct ?? 22);
  const radiusPx = Number(window.radiusPx ?? 14);
  return {
    left: `${leftPct}%`,
    top: `${topPct}%`,
    width: `${widthPct}%`,
    height: `${heightPct}%`,
    borderRadius: radiusPx,
  };
}

export function isGeoMediaPipPreview(props: Record<string, unknown> = {}) {
  const aspect = String(props.aspect_ratio || "");
  const presentation = String(props.presentation || props.layout || "");
  return aspect === "9:16" && presentation === "pip";
}
