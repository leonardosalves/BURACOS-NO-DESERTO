/**
 * Upload de MP4 gerado externamente (Grok / Google Flow) para cenas location-intro.
 */

import fs from "fs";
import path from "path";

const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".m4v", ".mkv"]);

export function resolveFlyoverDest(
  projDir,
  motionId,
  filename = "geo-flyover.mp4"
) {
  const safeId = String(motionId || "geo").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = path.extname(String(filename || "")).toLowerCase() || ".mp4";
  if (!VIDEO_EXTS.has(ext)) {
    throw new Error("Formato inválido — use MP4, WebM ou MOV.");
  }
  const satelliteDir = path.join(projDir, "ASSETS", "satellite");
  fs.mkdirSync(satelliteDir, { recursive: true });
  const destName = `${safeId}-geo-flyover${ext}`;
  return {
    absPath: path.join(satelliteDir, destName),
    relPath: `ASSETS/satellite/${destName}`,
    fileName: destName,
  };
}

export function patchMotionSceneFlyover(motionScenes, motionId, relPath) {
  const id = String(motionId || "").trim();
  if (!id) return motionScenes;
  let found = false;
  const next = (Array.isArray(motionScenes) ? motionScenes : []).map((ms) => {
    if (String(ms?.id || "") !== id) return ms;
    found = true;
    const props = ms.props && typeof ms.props === "object" ? ms.props : {};
    return {
      ...ms,
      props: {
        ...props,
        flyover_video: relPath,
        map_provider: props.map_provider || "ai_t2v",
        geo_generation: props.geo_generation || "ai_prompt",
      },
    };
  });
  if (!found) {
    throw new Error(`Cena motion "${id}" não encontrada no storyboard.`);
  }
  return next;
}
