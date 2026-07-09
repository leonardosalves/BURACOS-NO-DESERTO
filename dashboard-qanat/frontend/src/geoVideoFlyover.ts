export const GEO_MOTION_TEMPLATE_IDS = new Set(["location-intro", "geo-map"]);

export type GeoMotionScene = {
  id: string;
  scene_ref?: string;
  template_id?: string;
  trigger?: string;
  start_hint?: number;
  duration_seconds?: number;
  narration_text?: string;
  props?: Record<string, unknown>;
};

export function isGeoMotionScene(scene: GeoMotionScene): boolean {
  return GEO_MOTION_TEMPLATE_IDS.has(String(scene.template_id || ""));
}

export function filterGeoMotionScenes(
  scenes: unknown[] | null | undefined
): GeoMotionScene[] {
  if (!Array.isArray(scenes)) return [];
  return scenes
    .filter(
      (s) => s && typeof s === "object" && isGeoMotionScene(s as GeoMotionScene)
    )
    .map((s) => s as GeoMotionScene);
}

export function motionSceneHasGeoPrompt(scene: GeoMotionScene): boolean {
  const prompt = String(scene.props?.ai_video_prompt || "").trim();
  return prompt.length >= 80;
}

export function motionSceneFlyoverPath(scene: GeoMotionScene): string {
  return String(scene.props?.flyover_video || "").trim();
}

export function motionSceneHasFlyover(scene: GeoMotionScene): boolean {
  return motionSceneFlyoverPath(scene).length > 0;
}

export function geoSceneLabel(scene: GeoMotionScene): string {
  const props = scene.props || {};
  return String(
    props.location || props.label || scene.scene_ref || scene.id || "Local"
  ).trim();
}

export async function uploadMotionFlyoverVideo(
  getProjectUrl: (path: string) => string,
  motionId: string,
  file: File
): Promise<{
  ok: boolean;
  flyover_video?: string;
  motion_scenes?: GeoMotionScene[];
  studio?: unknown;
  error?: string;
}> {
  const url = getProjectUrl(
    `/api/upload-motion-flyover?motion_id=${encodeURIComponent(motionId)}&filename=${encodeURIComponent(file.name)}`
  );
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    flyover_video?: string;
    motion_scenes?: GeoMotionScene[];
    studio?: unknown;
  };
  if (!res.ok) {
    return { ok: false, error: data.error || "Falha no upload do vídeo geo." };
  }
  return {
    ok: true,
    flyover_video: data.flyover_video,
    motion_scenes: data.motion_scenes,
    studio: data.studio,
  };
}

export function patchMotionSceneProps(
  scenes: GeoMotionScene[],
  motionId: string,
  patch: Record<string, unknown>
): GeoMotionScene[] {
  return scenes.map((ms) => {
    if (String(ms.id) !== String(motionId)) return ms;
    return {
      ...ms,
      props: { ...(ms.props || {}), ...patch },
    };
  });
}
