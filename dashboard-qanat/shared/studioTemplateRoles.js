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
