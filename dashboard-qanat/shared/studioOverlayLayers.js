/**
 * Camadas de composição Remotion para papéis Studio (background, overlay, transição, bug).
 */

export function resolveStudioOverlayLayer(overlay = {}) {
  const props = overlay.props || {};
  const z =
    String(overlay.studio_z_index || props.studio_z_index || "")
      .trim()
      .toLowerCase() || "";
  const role = String(overlay.studio_role || props.studio_role || "")
    .trim()
    .toLowerCase();
  if (z === "under" || role === "background_frame") return "under";
  return "over";
}

export function resolveStudioOverlayOpacity(overlay = {}) {
  const props = overlay.props || {};
  const raw = overlay.studio_opacity ?? props.studio_opacity;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return String(overlay.studio_role || props.studio_role || "") === "logo_bug"
      ? 0.35
      : 1;
  }
  return Math.min(1, Math.max(0, n));
}

export function splitOverlaysByStudioLayer(overlays = []) {
  const underlays = [];
  const topOverlays = [];
  for (const overlay of Array.isArray(overlays) ? overlays : []) {
    if (resolveStudioOverlayLayer(overlay) === "under") {
      underlays.push(overlay);
    } else {
      topOverlays.push(overlay);
    }
  }
  return { underlays, overlays: topOverlays };
}

export function attachStudioOverlayMeta(overlay = {}) {
  const props = overlay.props || {};
  return {
    ...overlay,
    studio_z_index: overlay.studio_z_index || props.studio_z_index,
    studio_role: overlay.studio_role || props.studio_role,
    studio_opacity: overlay.studio_opacity ?? props.studio_opacity,
  };
}
