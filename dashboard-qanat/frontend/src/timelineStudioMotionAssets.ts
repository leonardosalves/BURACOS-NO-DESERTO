import toast from "react-hot-toast";
import type { StudioClip } from "./timelineStudioTypes";

export type MotionOrchestrationResult = {
  skipped?: boolean;
  reason?: string;
  studio?: unknown;
  motion_scenes?: Array<{ id?: string; props?: Record<string, unknown> }>;
  results?: Array<{ id?: string; ok?: boolean; reason?: string }>;
  quality?: { ok?: boolean; score?: number };
  enriched?: number;
  motion_count?: number;
  remotion_restored?: number;
};

let inflight: Promise<MotionOrchestrationResult | null> | null = null;
let lastFailureToastAt = 0;

function toastOrchestrationFailures(
  failed: Array<{ reason?: string }>,
  silent: boolean
) {
  if (!failed.length) return;
  const now = Date.now();
  if (now - lastFailureToastAt < 8000) return;
  lastFailureToastAt = now;
  const reasons = [
    ...new Set(
      failed.map((r) => String(r.reason || "").trim()).filter(Boolean)
    ),
  ];
  const detail =
    reasons[0] === "geocode_failed"
      ? "geocode falhou — preencha Local, Região e País do vídeo ativo"
      : reasons.length
        ? reasons.slice(0, 2).join(" · ")
        : "";
  toast(
    detail
      ? `Falha em ${failed.length} template(s): ${detail}`
      : `Falha em ${failed.length} template(s) — revise dados no inspector`,
    { icon: "⚠️", duration: 7000 }
  );
}

export function locationIntroHasSatellite(clip: StudioClip): boolean {
  const props = clip.props || {};
  const prompt = String(props.ai_video_prompt || "").trim();
  if (prompt.length >= 80) return true;
  const mapProvider = String(props.map_provider || "");
  if (mapProvider === "ai_t2v" && prompt.length > 0) return true;
  return false;
}

function isPlaceholderCounter(props: Record<string, unknown>): boolean {
  const label = String(props.label || "").toUpperCase();
  return (
    Number(props.value) === 100 &&
    (label === "DADO" || label === "IMPACTO" || label === "")
  );
}

function isPlaceholderBarChart(props: Record<string, unknown>): boolean {
  const items = Array.isArray(props.items) ? props.items : [];
  if (items.length !== 3) return false;
  const ref = [
    { label: "A", value: 72 },
    { label: "B", value: 54 },
    { label: "C", value: 38 },
  ];
  return ref.every((r, i) => {
    const row = items[i] as { label?: string; value?: number };
    return row?.label === r.label && Number(row?.value) === r.value;
  });
}

export function motionClipNeedsAssetEnrichment(clip: StudioClip): boolean {
  const templateId = String(clip.templateId || "");
  const props = clip.props || {};

  if (templateId === "location-intro") {
    return locationIntroNeedsSatelliteFetch(clip);
  }
  if (templateId === "geo-map") {
    return !String(props.ai_video_prompt || "").trim();
  }
  if (templateId === "counter") return isPlaceholderCounter(props);
  if (templateId === "bar-chart") return isPlaceholderBarChart(props);
  if (templateId === "kinetic-text") {
    return !String(props.text || "").trim();
  }
  if (templateId === "timeline") {
    const events = Array.isArray(props.events) ? props.events : [];
    return events.length <= 1 && String(events[0]?.year || "") === "—";
  }
  if (templateId === "lower-third") {
    return (
      !String(props.subtitle || "").trim() &&
      Boolean(String(props.narration_text || clip.label || "").trim())
    );
  }
  return false;
}

export function locationIntroNeedsSatelliteFetch(clip: StudioClip): boolean {
  if (clip.templateId !== "location-intro") return false;
  const location = String(clip.props?.location || clip.label || "").trim();
  if (!location) return false;
  return !locationIntroHasSatellite(clip);
}

export function studioClipsNeedingEnrichment(
  clips: StudioClip[]
): StudioClip[] {
  return clips.filter(motionClipNeedsAssetEnrichment);
}

export async function fetchMotionOrchestration(
  getProjectUrl: (endpoint: string) => string,
  { silent = false, force = false }: { silent?: boolean; force?: boolean } = {}
): Promise<MotionOrchestrationResult | null> {
  if (inflight) return inflight;

  inflight = (async () => {
    if (!silent) {
      toast("Orquestrando templates Remotion (mapa, dados, texto)…", {
        icon: "✨",
        duration: 4500,
      });
    }
    const tryAuto = await fetch(
      getProjectUrl("/api/timeline-studio/auto-orchestrate-motion"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          force,
          restore_suppressed_motion: false,
        }),
      }
    );
    if (tryAuto.ok) {
      return (await tryAuto.json()) as MotionOrchestrationResult;
    }
    const autoErr = await tryAuto.text();
    const isMissingRoute =
      tryAuto.status === 404 ||
      autoErr.includes(
        "Cannot POST /api/timeline-studio/auto-orchestrate-motion"
      );
    if (!isMissingRoute) {
      throw new Error(autoErr);
    }
    const fallback = await fetch(
      getProjectUrl("/api/ai/creator/orchestrate-production"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          use_llm: false,
          fetch_satellite: true,
          sync_timeline: true,
          rebuild_asset_slots: false,
          restore_suppressed_motion: false,
        }),
      }
    );
    if (!fallback.ok) throw new Error(await fallback.text());
    const data = await fallback.json();
    return {
      studio: data.studio,
      motion_scenes: data.motion_scenes,
      enriched: Number(data.satellite?.enriched) || 0,
      results: data.satellite?.results,
      quality: data.quality,
      motion_count: data.motion_count,
    } as MotionOrchestrationResult;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export async function autoOrchestrateMotionForStudio(
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
  const pending = studioClipsNeedingEnrichment(clips);
  const motionClips = clips.filter(
    (c) => c.trackId === "motion" || c.motionScene
  );
  if (!pending.length && motionClips.length > 0) return false;

  try {
    const data = await fetchMotionOrchestration(getProjectUrl, { silent });
    if (!data || data.skipped) return false;

    if (data.studio && onStudioSynced) {
      onStudioSynced(data.studio);
    }

    const failed = (data.results || []).filter((r) => r?.ok === false);
    const q = data.quality;
    if (!silent) {
      const n = Number(data.enriched) || 0;
      const motionN = Number(data.motion_count) || 0;
      const restored = Number(data.remotion_restored) || 0;
      toast.success(
        `Remotion · ${n} enriquecida(s) · ${motionN} motion · ${restored > 0 ? `${restored} template(s) sincronizado(s)` : "timeline atualizada"} · QC ${q?.score ?? "—"}/100${q?.ok ? " ✓" : ""}`
      );
    }
    if (failed.length > 0) {
      toastOrchestrationFailures(failed, silent);
    }
    return true;
  } catch (err) {
    if (!silent) {
      toast.error(`Orquestração: ${(err as Error).message || "erro"}`);
    }
    return false;
  }
}
