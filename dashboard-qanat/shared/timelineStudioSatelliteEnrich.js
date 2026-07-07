/**
 * Preenche paths ASSETS/satellite/* para location-intro / geo-map.
 * Usado no backend (persistir no disco) e no frontend (preview).
 */

const SATELLITE_TEMPLATES = new Set(["location-intro", "geo-map"]);

export function sceneSatelliteKey(clipId = "") {
  return String(clipId || "")
    .trim()
    .replace(/\./g, "_");
}

export function enrichSatelliteMotionClip(clip = {}) {
  const tpl = String(clip.templateId || clip.props?.overlayType || "");
  if (!SATELLITE_TEMPLATES.has(tpl)) return clip;

  const key = sceneSatelliteKey(clip.id);
  const props = { ...(clip.props || {}) };

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
      const row = { ...kf };
      const zoom = Number(row.zoom);
      if (!Number.isFinite(zoom) || String(row.image || "").trim()) return row;
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

export function enrichStudioSatelliteClips(studio = {}) {
  if (!studio || !Array.isArray(studio.clips)) return studio;
  const clips = studio.clips.map((clip) => {
    if (clip.trackId !== "motion" && !clip.motionScene) return clip;
    return enrichSatelliteMotionClip(clip);
  });
  return { ...studio, clips };
}
