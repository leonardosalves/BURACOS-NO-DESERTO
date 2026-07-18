/**
 * Regra: se o FRAME de identidade (full video) está ativo/selecionado,
 * as quinas decorativas (azul/amarelo) dos OUTROS templates devem sumir
 * para não sobrepor o frame.
 */

export const SUPPRESS_TEMPLATE_CORNERS_PROP = "suppress_template_corners";

function roleOf(item = {}) {
  const props = item.props || item.remotionProps || {};
  return String(
    item.studio_role ||
      props.studio_role ||
      item.orchestration_role ||
      props.orchestration_role ||
      ""
  )
    .trim()
    .toLowerCase();
}

/**
 * Cena/clip é o frame de identidade do canal (full video).
 */
export function isIdentityFrameItem(item = {}) {
  const role = roleOf(item);
  if (role === "identity_frame" || role === "background_frame") return true;
  const cat = String(item.category || item.props?.studio_category || "")
    .trim()
    .toLowerCase();
  if (cat === "frame") return true;
  const id = String(item.id || item.templateId || "").toLowerCase();
  if (id.includes("identity-frame") || id.includes("seed-frame-")) return true;
  return false;
}

/**
 * Há frame de identidade cobrindo o vídeo (ou quase o vídeo inteiro).
 * @param {object[]} items - motion_scenes ou studio.clips
 * @param {{ totalDurationSec?: number, minCoverage?: number }} [opts]
 */
export function hasActiveFullVideoIdentityFrame(items = [], opts = {}) {
  const list = Array.isArray(items) ? items : [];
  const total = Number(opts.totalDurationSec) || 0;
  const minCoverage = Number(opts.minCoverage);
  const coverageNeed = Number.isFinite(minCoverage) ? minCoverage : 0.55;

  for (const item of list) {
    if (!isIdentityFrameItem(item)) continue;
    // desativado explicitamente
    if (item.enabled === false || item.props?.enabled === false) continue;
    if (item.hidden === true || item.props?.hidden === true) continue;

    const dur = Number(
      item.duration ??
        item.duration_seconds ??
        item.props?.durationSeconds ??
        item.end - item.start ??
        0
    );
    // Policy frame full-duration: sem total, presença basta
    if (!total || total <= 0) return true;
    if (dur >= total * coverageNeed) return true;
    // clip do 0 até quase o fim
    const start = Number(item.start ?? item.start_sec ?? 0);
    if (start <= 0.5 && dur >= total * 0.45) return true;
  }
  return false;
}

/**
 * Marca props dos templates (exceto o frame) com suppress_template_corners.
 * @param {object[]} scenes
 * @param {{ force?: boolean, totalDurationSec?: number }} [opts]
 * @returns {object[]}
 */
export function applySuppressTemplateCornersToScenes(scenes = [], opts = {}) {
  const list = Array.isArray(scenes) ? scenes : [];
  const active =
    opts.force === true ||
    hasActiveFullVideoIdentityFrame(list, {
      totalDurationSec: opts.totalDurationSec,
    });
  if (!active) {
    // limpa flag residual se frame desligado
    return list.map((scene) => {
      if (!scene?.props?.[SUPPRESS_TEMPLATE_CORNERS_PROP]) return scene;
      const props = { ...scene.props };
      delete props[SUPPRESS_TEMPLATE_CORNERS_PROP];
      return { ...scene, props };
    });
  }

  return list.map((scene) => {
    if (isIdentityFrameItem(scene)) {
      const props = { ...(scene.props || {}) };
      delete props[SUPPRESS_TEMPLATE_CORNERS_PROP];
      return { ...scene, props };
    }
    return {
      ...scene,
      props: {
        ...(scene.props || {}),
        [SUPPRESS_TEMPLATE_CORNERS_PROP]: true,
      },
    };
  });
}

/**
 * Para clips do Timeline Studio (mesma regra).
 */
export function applySuppressTemplateCornersToClips(clips = [], opts = {}) {
  const list = Array.isArray(clips) ? clips : [];
  const asScenes = list.map((c) => ({
    ...c,
    duration:
      c.duration ?? (c.end != null && c.start != null ? c.end - c.start : 0),
    props: c.props || {},
    studio_role: c.props?.studio_role || c.studio_role,
  }));
  const next = applySuppressTemplateCornersToScenes(asScenes, opts);
  return list.map((clip, i) => {
    const scene = next[i];
    if (!scene) return clip;
    return {
      ...clip,
      props: {
        ...(clip.props || {}),
        ...(scene.props || {}),
      },
    };
  });
}

/**
 * Lê o flag a partir de props de overlay/input.
 */
export function shouldSuppressTemplateCorners(props = {}) {
  const p = props && typeof props === "object" ? props : {};
  if (p[SUPPRESS_TEMPLATE_CORNERS_PROP] === true) return true;
  if (p.hideCorners === true || p.showCorners === false) return true;
  if (p.studio_suppress_corners === true) return true;
  return false;
}
