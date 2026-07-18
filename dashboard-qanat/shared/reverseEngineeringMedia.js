export const REVERSE_ENGINEERING_SOURCE = "video-reverse-engineering";
export const REVERSE_ENGINEERING_VIDEO_TYPE = "vídeo IA (max 10s)";
export const REVERSE_ENGINEERING_IMAGE_TYPE = "imagem IA";

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

function reverseMediaStrategy(storyboard = {}) {
  return String(
    storyboard?.reverse_engineering?.media_strategy ||
      storyboard?.media_strategy ||
      ""
  )
    .trim()
    .toLowerCase();
}

/**
 * Resolve image vs video for a reverse-engineering scene.
 * Respects adaptive strategy — does NOT force every scene to video.
 */
export function resolveReverseEngineeringMediaType(
  scene = {},
  storyboard = null
) {
  const strategy = reverseMediaStrategy(storyboard || {});
  if (strategy === "video_only") return "video";

  const mode = String(
    scene?.media_mode || scene?.media_type || scene?.mediaType || ""
  )
    .trim()
    .toLowerCase();
  if (mode === "image" || mode === "imagem" || mode === "foto") return "image";
  if (mode === "video" || mode === "vídeo" || mode === "video_only")
    return "video";

  const broll = String(scene?.production?.broll_type || "")
    .trim()
    .toLowerCase();
  if (broll === "image" || broll === "imagem" || broll === "foto")
    return "image";
  if (broll === "video" || broll === "vídeo") return "video";

  const type = String(scene?.type || scene?.tipo || "")
    .trim()
    .toLowerCase();
  if (
    type.includes("imagem") ||
    type.includes("image") ||
    type.includes("foto") ||
    type.includes("still")
  ) {
    return "image";
  }
  if (type.includes("vídeo") || type.includes("video")) return "video";

  const imagePrompt = String(
    scene?.image_prompt || scene?.prompt_visual || ""
  ).trim();
  const videoPrompt = String(
    scene?.video_prompt || scene?.ai_video_prompt || ""
  ).trim();

  if (imagePrompt && !videoPrompt) return "image";
  if (videoPrompt && !imagePrompt) return "video";

  // Adaptive default: prefer the production prompt field if present
  if (imagePrompt && videoPrompt) {
    // Prefer explicit media_reason cues
    const reason = String(
      scene?.production?.media_reason || scene?.media_reason || ""
    ).toLowerCase();
    if (/imagem|image|foto|still|estatic|estát/.test(reason)) return "image";
    if (/video|vídeo|movimento|motion|acao|ação/.test(reason)) return "video";
  }

  // Legacy reverse dossiers without media_mode: keep video only if clearly motion
  return "video";
}

export function isVideoVisualPrompt(scene = {}, storyboard = null) {
  const type = String(scene?.type || scene?.tipo || "").toLowerCase();
  if (
    type.includes("imagem") ||
    type.includes("image") ||
    type.includes("foto")
  )
    return false;
  if (type.includes("vídeo") || type.includes("video")) return true;

  const mode = String(scene?.media_mode || "").toLowerCase();
  if (mode === "image" || mode === "imagem") return false;
  if (mode === "video" || mode === "vídeo") return true;

  const broll = String(scene?.production?.broll_type || "").toLowerCase();
  if (broll === "image" || broll === "imagem") return false;
  if (broll === "video") return true;

  const reverseScene =
    sceneHasReverseEngineeringMarker(scene) ||
    (storyboard && isReverseEngineeringStoryboard(storyboard));
  if (reverseScene) {
    return (
      resolveReverseEngineeringMediaType(scene, storyboard || {}) === "video"
    );
  }
  return false;
}

function buildVideoPromptFromScene(scene = {}) {
  const explicit = String(
    scene.video_prompt || scene.ai_video_prompt || ""
  ).trim();
  if (explicit) return explicit;
  return [
    String(
      scene.visual_description || scene.image_prompt || scene.prompt || ""
    ).trim(),
    String(scene.shot || "").trim()
      ? `Shot: ${String(scene.shot).trim()}.`
      : "",
    String(scene.camera || "").trim()
      ? `Camera movement: ${String(scene.camera).trim()}.`
      : "",
    "Natural continuous action, cinematic motion, coherent subject and environment, no static slideshow, no text or watermark.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildImagePromptFromScene(scene = {}) {
  return (
    String(scene.image_prompt || "").trim() ||
    String(scene.prompt || "").trim() ||
    String(scene.visual_description || "").trim()
  );
}

/**
 * Normaliza cenas de Engenharia Reversa respeitando a estratégia de mídia:
 * - video_only → todas vídeo
 * - adaptive → preserva image|video por cena (não força vídeo em tudo)
 */
export function normalizeReverseEngineeredStoryboard(storyboard = {}) {
  if (!Array.isArray(storyboard?.visual_prompts)) return storyboard;
  if (!isReverseEngineeringStoryboard(storyboard)) return storyboard;

  const strategy = reverseMediaStrategy(storyboard);
  let changed = false;
  const visualPrompts = storyboard.visual_prompts.map((scene = {}) => {
    const mediaType =
      strategy === "video_only"
        ? "video"
        : resolveReverseEngineeringMediaType(scene, storyboard);

    const production = {
      ...(scene.production && typeof scene.production === "object"
        ? scene.production
        : {}),
      broll_type: mediaType,
      generation_source: REVERSE_ENGINEERING_SOURCE,
    };

    let normalized;
    if (mediaType === "image") {
      const imagePrompt = buildImagePromptFromScene(scene);
      normalized = {
        ...scene,
        type: REVERSE_ENGINEERING_IMAGE_TYPE,
        media_mode: "image",
        prompt: imagePrompt,
        image_prompt: imagePrompt,
        // Clear video tails so UI/stock/SFX treat this as still
        video_prompt: "",
        ai_video_prompt: "",
        provenance: REVERSE_ENGINEERING_SOURCE,
        production,
      };
    } else {
      const videoPrompt = buildVideoPromptFromScene(scene);
      normalized = {
        ...scene,
        type: REVERSE_ENGINEERING_VIDEO_TYPE,
        media_mode: "video",
        prompt: videoPrompt,
        video_prompt: videoPrompt,
        ai_video_prompt: videoPrompt,
        provenance: REVERSE_ENGINEERING_SOURCE,
        production,
      };
    }

    if (
      scene.type !== normalized.type ||
      scene.media_mode !== normalized.media_mode ||
      scene.prompt !== normalized.prompt ||
      String(scene.video_prompt || "") !==
        String(normalized.video_prompt || "") ||
      String(scene.ai_video_prompt || "") !==
        String(normalized.ai_video_prompt || "") ||
      String(scene.image_prompt || "") !==
        String(normalized.image_prompt || "") ||
      scene.provenance !== REVERSE_ENGINEERING_SOURCE ||
      scene.production?.broll_type !== mediaType ||
      scene.production?.generation_source !== REVERSE_ENGINEERING_SOURCE
    ) {
      changed = true;
    }
    // Always return the normalized shape so image scenes never keep a stale video_prompt.
    return normalized;
  });

  return changed
    ? { ...storyboard, visual_prompts: visualPrompts }
    : storyboard;
}
