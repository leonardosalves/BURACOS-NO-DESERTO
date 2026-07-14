/**
 * Detecta visual_prompts que são apenas scaffolding para geração de vídeo
 * (keyframes POV, prompt-only) — NÃO devem criar slot de upload/timeline.
 *
 * Shared entre backend (timelineSceneSync) e frontend (timelineNarration).
 */

export function isPromptOnlyKeyframe(vp = {}) {
  if (!vp || typeof vp !== "object") return false;
  if (vp.prompt_only === true || vp.exclude_from_timeline === true) return true;
  if (vp.pov_keyframe === true || vp.is_pov_keyframe === true) return true;
  if (vp.upload_required === false && vp.scene_kind === "pov_keyframe")
    return true;
  const kind = String(vp.scene_kind || "").toLowerCase();
  if (kind === "pov_keyframe" || kind === "keyframe") return true;
  // Roles de frame POV sem video_role A/B = só scaffolding de prompt
  const role = String(vp.role || vp.frame_role || "").toUpperCase();
  const videoRole = String(vp.video_role || "").toUpperCase();
  if (
    (role === "A_START" || role === "A_END_B_START" || role === "B_END") &&
    videoRole !== "A" &&
    videoRole !== "B"
  ) {
    return true;
  }
  return false;
}
