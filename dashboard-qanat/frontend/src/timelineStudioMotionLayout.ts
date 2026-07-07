import { FULLSCREEN_TEMPLATES } from "@lumiera/shared/motionSceneCatalog.js";
import type { StudioClip } from "./timelineStudioTypes";

/** Zona inferior reservada para legendas em 9:16 (alinha com OverlayPreview). */
export const SHORTS_CAPTION_SAFE_BOTTOM_PCT = 22;

export function isFullscreenMotionClip(clip: StudioClip): boolean {
  const templateId = String(clip.templateId || "");
  const props = (clip.props || {}) as Record<string, unknown>;
  const layout = String(props.layout || "").trim();

  // Regra global: mapas/geo nunca em PIP
  if (templateId === "location-intro" || templateId === "geo-map") return true;
  if (layout === "fullscreen") return true;
  if (FULLSCREEN_TEMPLATES.has(templateId)) return true;
  return false;
}
