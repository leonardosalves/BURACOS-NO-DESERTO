import toast from "react-hot-toast";
import type { StudioClip } from "./timelineStudioTypes";
import {
  locationIntroHasSatellite,
  locationIntroNeedsSatelliteFetch,
  motionClipNeedsAssetEnrichment,
  studioClipsNeedingEnrichment,
} from "./timelineStudioMotionAssets";

export type { MotionOrchestrationResult } from "./timelineStudioMotionAssets";

export {
  locationIntroHasSatellite,
  locationIntroNeedsSatelliteFetch,
  motionClipNeedsAssetEnrichment,
  studioClipsNeedingEnrichment,
} from "./timelineStudioMotionAssets";

export function clipsNeedingSatelliteFetch(clips: StudioClip[]): StudioClip[] {
  return clips.filter(locationIntroNeedsSatelliteFetch);
}

export async function autoFetchSatelliteForClips(
  clips: StudioClip[],
  getProjectUrl: (endpoint: string) => string,
  {
    onStudioSynced,
    silent = false,
  }: {
    onStudioSynced?: (studio: unknown) => void;
    silent?: boolean;
  } = {}
): Promise<boolean> {
  const { autoOrchestrateMotionForStudio } =
    await import("./timelineStudioMotionAssets");
  return autoOrchestrateMotionForStudio(clips, getProjectUrl, {
    onStudioSynced,
    silent,
  });
}

export async function fetchProjectSatellite(
  getProjectUrl: (endpoint: string) => string,
  { silent = false }: { silent?: boolean } = {}
) {
  const { fetchMotionOrchestration } =
    await import("./timelineStudioMotionAssets");
  return fetchMotionOrchestration(getProjectUrl, { silent, force: true });
}

export function applySatelliteResultToClip(
  clip: StudioClip,
  data: {
    results?: Array<{ id?: string; ok?: boolean; reason?: string }>;
    motion_scenes?: Array<{ id?: string; props?: Record<string, unknown> }>;
  }
): Partial<StudioClip> | null {
  const hit = (data.results || []).find((row) => row.id === clip.id);
  if (hit?.ok === false) {
    const detail =
      hit.reason === "geocode_failed"
        ? "geocode_failed — preencha local, região e país conforme a narração do projeto"
        : hit.reason || "Falha ao enriquecer template Remotion";
    throw new Error(detail);
  }
  const motion = (data.motion_scenes || []).find((ms) => ms.id === clip.id);
  if (motion?.props) {
    return { props: { ...clip.props, ...motion.props } };
  }
  return null;
}
