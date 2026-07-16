import fs from "fs";
import path from "path";

const LOG_DIR = "logs";
const LOG_FILE = "lumiera-events.jsonl";
const MAX_LOG_BYTES = 5 * 1024 * 1024;

function sanitizeLogValue(value, depth = 0) {
  if (depth > 5) return "[depth-limit]";
  if (
    value == null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (typeof value === "string") return value.slice(0, 2000);
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeLogValue(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !/(api.?key|token|secret|password|authorization)/i.test(key)
        )
        .slice(0, 100)
        .map(([key, item]) => [key, sanitizeLogValue(item, depth + 1)])
    );
  }
  return String(value).slice(0, 2000);
}

function rotateProjectLog(logPath) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size < MAX_LOG_BYTES) {
      return;
    }
    const previous = `${logPath}.1`;
    fs.rmSync(previous, { force: true });
    fs.renameSync(logPath, previous);
  } catch {
    // Logging must never interrupt video production.
  }
}

export function projectEventLogPath(projectDir) {
  return path.join(projectDir, LOG_DIR, LOG_FILE);
}

export function appendProjectEventLog(
  projectDir,
  {
    level = "info",
    component = "lumiera",
    event,
    message = "",
    details = {},
  } = {}
) {
  if (!projectDir || !event) return null;
  try {
    const logPath = projectEventLogPath(projectDir);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    rotateProjectLog(logPath);
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      event,
      message: String(message || "").slice(0, 2000),
      details: sanitizeLogValue(details),
    };
    fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
    return entry;
  } catch (error) {
    console.warn(
      "[ProjectLog] Falha ao persistir evento:",
      error?.message || error
    );
    return null;
  }
}

export function summarizeTimelineAssets(
  timelineAssets = {},
  visualPrompts = []
) {
  const blocks = {};
  const duplicateFiles = [];
  const seenFiles = new Map();
  for (const [blockKey, rawAssets] of Object.entries(timelineAssets || {})) {
    const assets = Array.isArray(rawAssets) ? rawAssets : [];
    blocks[blockKey] = {
      asset_slots: assets.length,
      empty_slots: assets.filter((asset) => !String(asset?.asset || "").trim())
        .length,
      scene_count: (visualPrompts || []).filter(
        (scene) => String(Number(scene?.block) || 1) === String(blockKey)
      ).length,
    };
    assets.forEach((asset, index) => {
      const file = String(asset?.asset || "").trim();
      if (!file) return;
      if (seenFiles.has(file)) {
        duplicateFiles.push({
          file,
          first: seenFiles.get(file),
          repeated: `${blockKey}:${index}`,
        });
      } else {
        seenFiles.set(file, `${blockKey}:${index}`);
      }
    });
  }
  return { blocks, duplicate_files: duplicateFiles };
}
