import type { ConfigData, OutputVideo, WorkspaceStatus } from "./appTypes";
import type { ProjectListItem } from "./ProjectsLibraryPanel";

const CACHE_VERSION = 2;
const PROJECTS_CACHE_KEY = "lumiera.offline.projects.v2";
const PROJECT_CACHE_PREFIX = "lumiera.offline.project.v2:";
const MAX_PROJECTS_CACHE_CHARS = 200_000;
const MAX_PROJECT_SNAPSHOT_CHARS = 700_000;

export type OfflineProjectSnapshot = {
  version: number;
  savedAt: number;
  config?: ConfigData | null;
  storyboard?: unknown;
  status?: WorkspaceStatus | null;
  outputs?: OutputVideo[];
};

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(
  key: string,
  value: unknown,
  maxChars = MAX_PROJECT_SNAPSHOT_CHARS
) {
  if (!canUseStorage()) return;
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > maxChars) return;
    window.localStorage.setItem(key, serialized);
  } catch {
    // Storage can be full or disabled. Offline cache is helpful, never critical.
  }
}

function projectKey(projectName: string) {
  return `${PROJECT_CACHE_PREFIX}${encodeURIComponent(projectName.trim())}`;
}

export function loadCachedProjects(): ProjectListItem[] {
  const cached = readJson<{ version?: number; projects?: ProjectListItem[] }>(
    PROJECTS_CACHE_KEY
  );
  return cached?.version === CACHE_VERSION && Array.isArray(cached.projects)
    ? cached.projects
    : [];
}

export function saveCachedProjects(projects: ProjectListItem[]) {
  writeJson(
    PROJECTS_CACHE_KEY,
    {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      projects,
    },
    MAX_PROJECTS_CACHE_CHARS
  );
}

export function loadCachedProjectSnapshot(
  projectName: string
): OfflineProjectSnapshot | null {
  if (!projectName.trim()) return null;
  const cached = readJson<OfflineProjectSnapshot>(projectKey(projectName));
  return cached?.version === CACHE_VERSION ? cached : null;
}

export function updateCachedProjectSnapshot(
  projectName: string,
  patch: Partial<Omit<OfflineProjectSnapshot, "version" | "savedAt">>
) {
  if (!projectName.trim()) return;
  const prev = loadCachedProjectSnapshot(projectName) || {
    version: CACHE_VERSION,
    savedAt: 0,
  };
  writeJson(projectKey(projectName), {
    ...prev,
    ...patch,
    version: CACHE_VERSION,
    savedAt: Date.now(),
  });
}
