import fs from "fs";
import path from "path";

const DEFAULT_LEO_ROOT = "C:\\Users\\Leo\\Desktop\\Lumiera Videos";

let cachedProjectsRoot = null;

function readProjectsRootFromFile() {
  const candidates = [
    process.env.LUMIERA_PROJECTS_ROOT_FILE,
    path.resolve(__dirname, "..", "..", ".lumiera-projects-root"),
    "C:\\Lumiera\\.lumiera-projects-root",
  ].filter(Boolean);
  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const line = fs
        .readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find(Boolean);
      if (line && fs.existsSync(line)) return line;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function isSystemServiceProfile(home = "") {
  return /systemprofile/i.test(String(home || process.env.USERPROFILE || ""));
}

function scanUsersDesktopLumieraVideos() {
  const found = [];
  const drive = process.env.SystemDrive || "C:";
  const usersRoot = path.join(drive, "Users");
  if (!fs.existsSync(usersRoot)) return found;
  let entries;
  try {
    entries = fs.readdirSync(usersRoot, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (/^(Public|Default|Default User|All Users)$/i.test(ent.name)) continue;
    const candidate = path.join(
      usersRoot,
      ent.name,
      "Desktop",
      "Lumiera Videos"
    );
    if (fs.existsSync(candidate)) found.push(candidate);
  }
  return found;
}

function pickBestProjectsRoot(candidates = []) {
  let best = null;
  let bestScore = -1;
  for (const root of candidates) {
    if (!root || !fs.existsSync(root)) continue;
    let score = 0;
    for (const sub of ["videos curtos shorts", "videos longos"]) {
      const dir = path.join(root, sub);
      if (!fs.existsSync(dir)) continue;
      try {
        score += fs
          .readdirSync(dir, { withFileTypes: true })
          .filter((d) => d.isDirectory()).length;
      } catch {
        /* ignore */
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = root;
    }
  }
  return best;
}

export function resolveProjectsRoot() {
  if (cachedProjectsRoot) return cachedProjectsRoot;

  const fromFile = readProjectsRootFromFile();
  if (fromFile) {
    cachedProjectsRoot = fromFile;
    return cachedProjectsRoot;
  }

  const fromEnv = String(process.env.LUMIERA_PROJECTS_ROOT || "").trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    cachedProjectsRoot = fromEnv;
    return cachedProjectsRoot;
  }

  const home = process.env.USERPROFILE || process.env.HOME || "";
  const candidates = [];

  if (!isSystemServiceProfile(home) && home) {
    candidates.push(path.join(home, "Desktop", "Lumiera Videos"));
  }

  candidates.push(DEFAULT_LEO_ROOT);
  candidates.push(...scanUsersDesktopLumieraVideos());

  const picked = pickBestProjectsRoot([...new Set(candidates)]);
  cachedProjectsRoot =
    picked ||
    (home && !isSystemServiceProfile(home)
      ? path.join(home, "Desktop", "Lumiera Videos")
      : DEFAULT_LEO_ROOT);

  return cachedProjectsRoot;
}

export function getProjectsDirs() {
  const root = resolveProjectsRoot();
  return {
    projectsRoot: root,
    longsDir: path.join(root, "videos longos"),
    shortsDir: path.join(root, "videos curtos shorts"),
  };
}

export function ensureProjectsDirs() {
  const { projectsRoot, longsDir, shortsDir } = getProjectsDirs();
  for (const dir of [projectsRoot, longsDir, shortsDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  return { projectsRoot, longsDir, shortsDir };
}

/** Limpa cache (testes). */
export function resetProjectsRootCache() {
  cachedProjectsRoot = null;
}
