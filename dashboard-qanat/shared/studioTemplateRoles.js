/**
 * Papéis visuais dos templates Studio no vídeo (overlay, transição, fundo, bug).
 */

export const STUDIO_ROLES = [
  "overlay",
  "transition",
  "background_frame",
  "logo_bug",
];

export function resolveStudioRole(template = {}) {
  const cat = String(
    template.category || template.props?.template_studio_category || ""
  )
    .trim()
    .toLowerCase();
  if (cat === "transition") return "transition";
  if (cat === "background") return "background_frame";
  if (cat === "logo-branding") return "logo_bug";
  return "overlay";
}

export function applyStudioRoleToScene(scene = {}, template = {}) {
  const role = resolveStudioRole(template);
  const props = { ...(scene.props || {}), studio_role: role };

  if (role === "transition") {
    const dur = Math.min(Math.max(2, Number(scene.duration_seconds) || 3), 4);
    return {
      ...scene,
      duration_seconds: dur,
      layout: "fullscreen",
      props: {
        ...props,
        presentation: "fullscreen",
        layout: "fullscreen",
      },
    };
  }

  if (role === "background_frame") {
    return {
      ...scene,
      layout: "fullscreen",
      props: {
        ...props,
        presentation: "fullscreen",
        layout: "fullscreen",
        studio_z_index: "under",
      },
    };
  }

  if (role === "logo_bug") {
    return {
      ...scene,
      layout: "pip",
      props: {
        ...props,
        presentation: "pip",
        layout: "pip",
        studio_opacity: 0.35,
      },
    };
  }

  return { ...scene, props };
}

export function subcategoryMatchesRole(template = {}, role = "") {
  const sub = String(template.subcategory || "")
    .trim()
    .toLowerCase();
  const cat = String(template.category || "")
    .trim()
    .toLowerCase();

  if (role === "transition") {
    return (
      cat === "transition" ||
      /transition|wipe|dissolve|fade|burn|pulse/i.test(sub)
    );
  }
  if (role === "background_frame") {
    return (
      cat === "background" ||
      cat === "frame" ||
      /background|backdrop|pattern|frame|border/i.test(sub)
    );
  }
  if (role === "logo_bug") {
    return cat === "logo-branding" || /logo|bug|watermark|branding/i.test(sub);
  }
  if (role === "overlay") {
    if (
      cat === "transition" ||
      cat === "background" ||
      cat === "frame" ||
      cat === "logo-branding"
    ) {
      return false;
    }
    if (/transition|wipe|dissolve|fade|backdrop|logo|watermark/i.test(sub)) {
      return false;
    }
    return true;
  }
  return true;
}

export function catalogCategoryForRole(role = "") {
  const r = String(role || "")
    .trim()
    .toLowerCase();
  if (r === "transition") return "transition";
  if (r === "background_frame" || r === "frame" || r === "background")
    return "background";
  if (r === "logo_bug" || r === "logo_branding" || r === "logo-branding")
    return "logo-branding";
  if (r === "cinematic" || r === "scene_effect") return "cinematic";
  if (r === "chart" || r === "chart_data" || r === "chart-data")
    return "chart-data";
  if (r === "text" || r === "text_overlay" || r === "text-overlay")
    return "text";
  if (r === "content_animation" || r === "content-animation")
    return "content-animation";
  if (r === "media_layout" || r === "image_media" || r === "image-media")
    return "image-media";
  if (r === "intro_outro" || r === "intro-outro") return "intro-outro";
  return "text";
}
