import type { Dispatch, SetStateAction } from "react";
import type { ConfigData } from "./appTypes";
import type { MotionSceneDraft } from "./motionEditorConfig";

export type StudioMotionSyncPayload = {
  motion_scenes?: unknown[];
  motion_scenes_synced?: boolean;
  timeline_assets?: ConfigData["timeline_assets"];
  timeline_assets_synced?: boolean;
};

/** GET leve: backend propaga timing da timeline → storyboard + timeline_assets. */
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

export function applyStudioTimelineAssetsToConfig(
  data: StudioMotionSyncPayload | null | undefined,
  setConfig: Dispatch<SetStateAction<ConfigData | null>>
): boolean {
  const timelineAssets = data?.timeline_assets;
  if (!timelineAssets || typeof timelineAssets !== "object") return false;
  setConfig((prev) =>
    prev ? { ...prev, timeline_assets: timelineAssets } : prev
  );
  return Boolean(data?.timeline_assets_synced);
}
