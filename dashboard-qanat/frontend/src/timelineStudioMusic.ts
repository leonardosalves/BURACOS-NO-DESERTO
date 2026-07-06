import type { ConfigData } from "./appTypes";
import type { StudioClip, TimelineStudioState } from "./timelineStudioTypes";

export function resolveStudioBgmSource(config: ConfigData = {}): string | null {
  if (config.use_single_bgm && String(config.single_bgm || "").trim()) {
    return String(config.single_bgm).trim();
  }

  const mappings = Array.isArray(config.bgm_mappings)
    ? config.bgm_mappings
    : [];
  if (mappings.length > 0) {
    const sorted = [...mappings].sort(
      (a, b) => Number(a.block) - Number(b.block)
    );
    const file = String(sorted[0]?.file || "").trim();
    if (file) return file;
  }

  for (const key of ["bgm_file", "background_music", "music_file"] as const) {
    const file = String(config[key] || "").trim();
    if (file) return file;
  }

  return null;
}

export function upsertMusicClipInStudio(
  studio: TimelineStudioState,
  config: ConfigData
): TimelineStudioState {
  const bgm = resolveStudioBgmSource(config);
  const withoutMusic = studio.clips.filter((c) => c.trackId !== "music");
  if (!bgm) {
    if (withoutMusic.length === studio.clips.length) return studio;
    return { ...studio, clips: withoutMusic };
  }

  const total =
    Number(studio.totalDuration) > 0 ? Number(studio.totalDuration) : 120;
  const existing = studio.clips.find((c) => c.trackId === "music");
  const musicClip: StudioClip = {
    id: existing?.id || "music-main",
    trackId: "music",
    start: 0,
    duration: total,
    label: bgm.split("/").pop() || bgm,
    source: bgm,
    color: "#5C6BC0",
    props: {
      ...(existing?.props || {}),
      volume:
        Number(config.project_music_volume ?? (config as any).music_volume) ||
        0.15,
    },
  };

  return {
    ...studio,
    clips: [...withoutMusic, musicClip].sort(
      (a, b) => (Number(a.start) || 0) - (Number(b.start) || 0)
    ),
  };
}
