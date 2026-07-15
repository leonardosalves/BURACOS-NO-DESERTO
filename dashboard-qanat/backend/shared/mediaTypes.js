/**
 * Fonte única de verdade para classificação de mídia (imagem vs vídeo).
 * Resolve BUGs 2 e 7: isVideoSceneType duplicada e divergente,
 * regex de extensão de vídeo incompleta.
 */

/** Extensões de vídeo reconhecidas — cobre todos os formatos usados no pipeline. */
export const VIDEO_EXT_RE =
  /\.(mp4|webm|mov|m4v|mkv|avi|mpeg|mpg)(?:\?|#|$)/i;

/** Verifica se um caminho de asset é vídeo pela extensão. */
export function isVideoAssetPath(src = "") {
  return VIDEO_EXT_RE.test(String(src || ""));
}

/**
 * Determina se um type de cena é vídeo.
 * "imagem"/still SEMPRE vence antes de checar vídeo —
 * garante que "imagem com vídeo ref" nunca seja classificado como vídeo.
 */
export function isVideoSceneType(type = "") {
  const t = String(type || "").toLowerCase();
  if (!t) return false;
  if (t.includes("imagem") || t === "image" || t.includes("still"))
    return false;
  return (
    t.includes("vídeo") ||
    t.includes("video") ||
    t.includes("seedance") ||
    t.includes("mp4")
  );
}

/** Verifica se o type é explicitamente uma imagem estática. */
export function isExplicitStillType(type = "") {
  const t = String(type || "").toLowerCase();
  return (
    t.includes("imagem ia") ||
    t === "image" ||
    t === "imagem" ||
    t.includes("still")
  );
}
