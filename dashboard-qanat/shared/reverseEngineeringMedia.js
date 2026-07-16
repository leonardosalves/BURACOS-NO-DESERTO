export const REVERSE_ENGINEERING_SOURCE = "video-reverse-engineering";
export const REVERSE_ENGINEERING_VIDEO_TYPE = "vídeo IA (max 10s)";

function sceneHasReverseEngineeringMarker(scene = {}) {
  return (
    scene?.provenance === REVERSE_ENGINEERING_SOURCE ||
    scene?.generation_source === REVERSE_ENGINEERING_SOURCE ||
    scene?.production?.generation_source === REVERSE_ENGINEERING_SOURCE
  );
}

export function isReverseEngineeringStoryboard(storyboard = {}) {
  const prompts = Array.isArray(storyboard?.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  return Boolean(
    storyboard?.reverse_engineering ||
    prompts.some((scene) => sceneHasReverseEngineeringMarker(scene))
  );
}

export function isVideoVisualPrompt(scene = {}, storyboard = null) {
  const type = String(scene?.type || scene?.tipo || "").toLowerCase();
  if (type.includes("vídeo") || type.includes("video")) return true;
  if (String(scene?.media_mode || "").toLowerCase() === "video") return true;
  if (String(scene?.production?.broll_type || "").toLowerCase() === "video") {
    return true;
  }
  const reverseScene =
    sceneHasReverseEngineeringMarker(scene) ||
    (storyboard && isReverseEngineeringStoryboard(storyboard));
  return Boolean(
    reverseScene &&
    String(scene?.video_prompt || scene?.ai_video_prompt || "").trim()
  );
}

/** Toda cena de um dossiê de Engenharia Reversa é uma solicitação de vídeo. */
export function normalizeReverseEngineeredStoryboard(storyboard = {}) {
  if (!Array.isArray(storyboard?.visual_prompts)) return storyboard;
  if (!isReverseEngineeringStoryboard(storyboard)) return storyboard;

  let changed = false;
  const visualPrompts = storyboard.visual_prompts.map((scene = {}) => {
    const videoPrompt = String(
      scene.video_prompt ||
        scene.ai_video_prompt ||
        scene.visual_description ||
        scene.prompt ||
        scene.image_prompt ||
        ""
    ).trim();
    const production = {
      ...(scene.production && typeof scene.production === "object"
        ? scene.production
        : {}),
      broll_type: "video",
      generation_source: REVERSE_ENGINEERING_SOURCE,
    };
    const normalized = {
      ...scene,
      type: REVERSE_ENGINEERING_VIDEO_TYPE,
      media_mode: "video",
      prompt: videoPrompt,
      video_prompt: videoPrompt,
      ai_video_prompt: videoPrompt,
      provenance: REVERSE_ENGINEERING_SOURCE,
      production,
    };
    if (
      scene.type !== normalized.type ||
      scene.media_mode !== "video" ||
      scene.prompt !== videoPrompt ||
      scene.video_prompt !== videoPrompt ||
      scene.ai_video_prompt !== videoPrompt ||
      scene.provenance !== REVERSE_ENGINEERING_SOURCE ||
      scene.production?.broll_type !== "video" ||
      scene.production?.generation_source !== REVERSE_ENGINEERING_SOURCE
    ) {
      changed = true;
    }
    return changed ? normalized : scene;
  });

  return changed
    ? { ...storyboard, visual_prompts: visualPrompts }
    : storyboard;
}
