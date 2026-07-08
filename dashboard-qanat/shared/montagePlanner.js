/**
 * Política de montagem — mais imagens, intercalação, perfil emocional.
 */

export function resolveEmotionalOverlayProfile(storyboard = {}, config = {}) {
  const niche = String(
    config.niche || storyboard?.strategy?.niche || ""
  ).toLowerCase();
  const narration = String(
    storyboard.narrative_script || storyboard.narrative_script_tagged || ""
  ).toLowerCase();

  const tragedy =
    /colapso|desmoron|morte|vitima|trag[eé]dia|desastre|falha|estrutural/.test(
      narration
    );
  const dataHeavy =
    /engenharia|dado|estat|percent|metro|tonelada|laudo|pericia/.test(
      `${niche} ${narration}`
    );

  if (tragedy && dataHeavy) {
    return {
      id: "engineering-tragedy",
      overlayIntensity: 0.55,
      motionPriority: "facts-first",
      maxMotionPerMinute: 0.35,
      preferLowerThird: true,
    };
  }
  if (dataHeavy) {
    return {
      id: "data-journalist",
      overlayIntensity: 0.7,
      motionPriority: "charts",
      maxMotionPerMinute: 0.5,
      preferLowerThird: false,
    };
  }
  return {
    id: "documentary-balanced",
    overlayIntensity: 0.6,
    motionPriority: "balanced",
    maxMotionPerMinute: 0.45,
    preferLowerThird: false,
  };
}

function inferPromptMediaType(vp = {}) {
  const t = String(vp.type || vp.media_mode || "").toLowerCase();
  if (/vídeo|video|clip|motion|seedance|ltx/.test(t)) return "video";
  return "image";
}

export function boostImageRatioInVisualPrompts(
  visualPrompts = [],
  aspectRatio = "16:9"
) {
  const vps = (Array.isArray(visualPrompts) ? visualPrompts : []).map((vp) => ({
    ...vp,
  }));
  const total = vps.length;
  if (!total) return vps;

  const targetRatio = aspectRatio === "9:16" ? 0.62 : 0.48;
  const targetImages = Math.ceil(total * targetRatio);
  let imageCount = vps.filter(
    (vp) => inferPromptMediaType(vp) === "image"
  ).length;
  let need = Math.max(0, targetImages - imageCount);

  for (const vp of vps) {
    if (need <= 0) break;
    if (vp.media_mode === "remotion" || vp.motion_scene_id) continue;
    if (inferPromptMediaType(vp) === "video") {
      vp.type = "image";
      vp.media_mode = "image";
      need--;
      imageCount++;
    }
  }

  return vps;
}

export function interleaveVisualPromptAssets(
  visualPrompts = [],
  motionScenes = []
) {
  const motionRefs = new Set(
    (Array.isArray(motionScenes) ? motionScenes : [])
      .map((ms) => String(ms.scene_ref || "").trim())
      .filter(Boolean)
  );

  return (Array.isArray(visualPrompts) ? visualPrompts : []).map(
    (vp, index) => {
      const ref = String(vp.scene || vp.scene_ref || "").trim();
      const hasMotion = motionRefs.has(ref) || vp.media_mode === "remotion";
      const slotKind = hasMotion ? "motion" : inferPromptMediaType(vp);
      return {
        ...vp,
        production: {
          ...(vp.production || {}),
          slot_kind: slotKind,
          interleave_index: index,
          prefer_image_gap: !hasMotion && slotKind === "image",
        },
      };
    }
  );
}

export function capOverlaysForFormat(storyboard = {}, config = {}) {
  const aspectRatio = String(
    config.aspect_ratio || config.format || "16:9"
  ).trim();
  if (aspectRatio !== "9:16") return storyboard;
  const overlays = Array.isArray(storyboard.overlays_ai)
    ? storyboard.overlays_ai
    : [];
  if (overlays.length <= 2) return storyboard;
  return {
    ...storyboard,
    overlays_ai: overlays.slice(0, 2),
    overlays_ai_capped: true,
  };
}

export function applyMontageAssetPolicy(
  storyboard = {},
  config = {},
  { motionScenes = [] } = {}
) {
  const aspectRatio = String(
    config.aspect_ratio || config.format || "16:9"
  ).trim();
  const profile = resolveEmotionalOverlayProfile(storyboard, config);
  let visualPrompts = boostImageRatioInVisualPrompts(
    storyboard.visual_prompts || [],
    aspectRatio
  );
  visualPrompts = interleaveVisualPromptAssets(visualPrompts, motionScenes);
  let next = {
    ...storyboard,
    visual_prompts: visualPrompts,
    montage_profile: profile,
  };
  next = capOverlaysForFormat(next, config);
  return next;
}
