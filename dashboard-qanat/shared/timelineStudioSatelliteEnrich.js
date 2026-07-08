/**
 * Normaliza clips geográficos location-intro / geo-map para modo IA T2V.
 */

const GEO_TEMPLATES = new Set(["location-intro", "geo-map"]);

export function sceneSatelliteKey(clipId = "") {
  return String(clipId || "")
    .trim()
    .replace(/\./g, "_");
}

export function enrichSatelliteMotionClip(clip = {}) {
  const tpl = String(clip.templateId || clip.props?.overlayType || "");
  if (!GEO_TEMPLATES.has(tpl)) return clip;

  const props = { ...(clip.props || {}) };

  if (!String(props.map_provider || "").trim()) {
    props.map_provider = "ai_t2v";
  }
  if (!String(props.geo_generation || "").trim()) {
    props.geo_generation = "ai_prompt";
  }
  if (!String(props.variant || "").trim()) {
    props.variant = "ai_geo_video";
  }
  if (!String(props.map_style || "").trim()) {
    props.map_style = "photoreal_satellite";
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
