import fs from "fs";
import path from "path";
import { enrichGeoPipStudioClips } from "../shared/geoPipFlyoverEnrich.js";
import { probeFlyoverVideoDurationSec } from "./motionFlyoverUpload.js";

function resolveFlyoverAbsPath(projDir, relPath = "") {
  const raw = String(relPath || "")
    .trim()
    .replace(/^ASSETS[\\/]/i, "");
  if (!raw) return "";
  return path.join(projDir, "ASSETS", raw.split("/").join(path.sep));
}

export function enrichGeoPipStudioClipsOnLoad(
  studio,
  projDir,
  storyboard = {}
) {
  return enrichGeoPipStudioClips(studio, {
    storyboard,
    resolveFlyoverDurationSec(relPath) {
      const abs = resolveFlyoverAbsPath(projDir, relPath);
      if (!abs || !fs.existsSync(abs)) return 0;
      return probeFlyoverVideoDurationSec(abs);
    },
  });
}
