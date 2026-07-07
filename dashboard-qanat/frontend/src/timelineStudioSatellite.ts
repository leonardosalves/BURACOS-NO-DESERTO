import toast from "react-hot-toast";
import type { StudioClip } from "./timelineStudioTypes";

export type SatelliteFetchResult = {
  studio?: unknown;
  motion_scenes?: Array<{ id?: string; props?: Record<string, unknown> }>;
  results?: Array<{ id?: string; ok?: boolean; reason?: string }>;
  quality?: { ok?: boolean; score?: number };
};

let inflight: Promise<SatelliteFetchResult | null> | null = null;

export function locationIntroHasSatellite(clip: StudioClip): boolean {
  const props = clip.props || {};
  const mapProvider = String(props.map_provider || "");
  const hasCoords =
    Number.isFinite(Number(props.lat)) && Number.isFinite(Number(props.lng));
  const isCesiumReady = mapProvider === "cesium" && hasCoords;
  if (isCesiumReady) return true;
  if (String(props.backgroundImage || "").trim()) return true;
  if (
    Array.isArray(props.zoom_keyframes) &&
    props.zoom_keyframes.some((kf: { image?: string }) =>
      Boolean(String(kf?.image || "").trim())
    )
  ) {
    return true;
  }
  return false;
}

export function locationIntroNeedsSatelliteFetch(clip: StudioClip): boolean {
  if (clip.templateId !== "location-intro") return false;
  const location = String(clip.props?.location || clip.label || "").trim();
  if (!location) return false;
  return !locationIntroHasSatellite(clip);
}

export function clipsNeedingSatelliteFetch(clips: StudioClip[]): StudioClip[] {
  return clips.filter(locationIntroNeedsSatelliteFetch);
}

export async function fetchProjectSatellite(
  getProjectUrl: (endpoint: string) => string,
  { silent = false }: { silent?: boolean } = {}
): Promise<SatelliteFetchResult | null> {
  if (inflight) return inflight;

  inflight = (async () => {
    if (!silent) {
      toast("Baixando voo satélite automaticamente…", {
        icon: "🛰️",
        duration: 4000,
      });
    }
    const res = await fetch(
      getProjectUrl("/api/ai/creator/motion-scenes/satellite"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as SatelliteFetchResult;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function applySatelliteResultToClip(
  clip: StudioClip,
  data: SatelliteFetchResult
): Partial<StudioClip> | null {
  const hit = (data.results || []).find((row) => row.id === clip.id);
  if (hit?.ok === false) {
    const detail =
      hit.reason === "geocode_failed"
        ? "geocode_failed — preencha local/cidade/país ou use nome canônico (ex.: Laufenburg, Suíça)"
        : hit.reason || "Falha ao baixar mapa satélite";
    throw new Error(detail);
  }
  const motion = (data.motion_scenes || []).find((ms) => ms.id === clip.id);
  if (motion?.props) {
    return { props: { ...clip.props, ...motion.props } };
  }
  return null;
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
  const pending = clipsNeedingSatelliteFetch(clips);
  if (!pending.length) return false;

  try {
    const data = await fetchProjectSatellite(getProjectUrl, { silent });
    if (!data) return false;

    if (data.studio && onStudioSynced) {
      onStudioSynced(data.studio);
    }

    const failed = (data.results || []).filter((r) => r?.ok === false);
    const q = data.quality;
    if (!silent) {
      toast.success(
        `Voo satélite · QC ${q?.score ?? "—"}/100${q?.ok ? " ✓" : ""}`
      );
    }
    if (failed.length > 0) {
      toast(
        `Geocode falhou em ${failed.length} cena(s) — revise o nome do local no inspector`,
        { icon: "🗺️", duration: 6000 }
      );
    }
    return true;
  } catch (err) {
    if (!silent) {
      toast.error(`Mapa: ${(err as Error).message || "erro desconhecido"}`);
    }
    return false;
  }
}
