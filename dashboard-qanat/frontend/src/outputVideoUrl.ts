/** URL do proxy de mídia para vídeos em OUTPUT/qanat_persa_video_final. */

export function buildOutputVideoMediaUrl(
  activeProject: string,
  fileName: string,
  opts?: { download?: boolean }
): string {
  const project =
    activeProject === "Buracos no Deserto"
      ? ""
      : `/${encodeURIComponent(activeProject)}`;
  const name = encodeURIComponent(
    String(fileName || "")
      .replace(/\\/g, "/")
      .split("/")
      .pop() || fileName
  );
  const base = `/api/projects-media${project}/OUTPUT/qanat_persa_video_final/${name}`;
  return opts?.download ? `${base}?download=true` : base;
}
