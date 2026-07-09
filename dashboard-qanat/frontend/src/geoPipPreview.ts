import { GEO_PIP_MEDIA_WINDOW_9x16 } from "../../shared/geoPipStudioTemplate.js";
import {
  isGeoPipShortMode,
  stripGeoPipMapMediaForTemplateProps,
} from "@lumiera/shared/studioTemplateRenderProps.js";

export { GEO_PIP_MEDIA_WINDOW_9x16, stripGeoPipMapMediaForTemplateProps };

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

/** Short 9:16 — vídeo geo só no quadradinho PIP, B-roll atrás. */
export function isGeoMediaPipPreview(props: Record<string, unknown> = {}) {
  return isGeoPipShortMode(props);
}
