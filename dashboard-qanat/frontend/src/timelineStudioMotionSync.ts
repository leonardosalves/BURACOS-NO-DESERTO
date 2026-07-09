import type { MotionSceneDraft } from "./motionEditorConfig";

export type StudioMotionSyncPayload = {
  motion_scenes?: unknown[];
  motion_scenes_synced?: boolean;
};

/** GET leve: backend propaga timing da timeline → motion_scenes do storyboard. */
export async function pullStudioMotionScenes(
  getProjectUrl: (path: string) => string
): Promise<StudioMotionSyncPayload | null> {
  try {
    const res = await fetch(getProjectUrl("/api/timeline-studio?light=1"));
    if (!res.ok) return null;
    return (await res.json()) as StudioMotionSyncPayload;
  } catch {
    return null;
  }
}

export function applyStudioMotionScenesToStoryboard(
  data: StudioMotionSyncPayload | null | undefined,
  onChange: (
    scenes: MotionSceneDraft[],
    opts?: { skipPersist?: boolean }
  ) => void
): boolean {
  const scenes = data?.motion_scenes;
  if (!Array.isArray(scenes) || scenes.length < 1) return false;
  onChange(scenes as MotionSceneDraft[], { skipPersist: true });
  return true;
}