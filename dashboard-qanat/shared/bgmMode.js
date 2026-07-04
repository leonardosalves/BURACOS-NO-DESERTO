/**
 * Resolução de modo BGM — fonte única backend + frontend.
 * @returns {'single'|'block'|'emotion'}
 */
export function resolveBgmMode(config = {}, storyboard = {}, format = "LONG") {
  if (config.bgm_mode === "block") return "block";
  if (format === "SHORT" || config.use_single_bgm === true) return "single";
  if (config.bgm_mode === "emotion") return "emotion";
  if (storyboard?.bgm_emotion_plan?.segments?.length) return "emotion";
  return "emotion";
}