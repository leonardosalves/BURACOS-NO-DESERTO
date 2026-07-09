import {
  bindGeoPipTemplateStudioProps,
  resolveGeoPipClipDurationSec,
} from "@lumiera/shared/geoPipTemplateProps.js";
import type { StudioClip } from "./timelineStudioTypes";

type TranscriptWord = { word?: string; start?: number; end?: number };
type TranscriptSegment = {
  words?: TranscriptWord[];
  start_time?: number;
  end_time?: number;
  duration?: number;
  text?: string;
};

/** Trecho narrado no instante do playhead (assunto da cena, não legenda). */
export function narrationSubjectAtPlayhead(
  wordTranscripts: TranscriptSegment[] | undefined,
  globalSec: number,
  windowSec = 4
): string {
  if (!Array.isArray(wordTranscripts) || !wordTranscripts.length) return "";

  const words: Array<{ word: string; start: number; end: number }> = [];
  for (const seg of wordTranscripts) {
    const segStart = Number(seg.start_time) || 0;
    for (const w of seg.words || []) {
      const token = String(w.word || "").trim();
      if (!token) continue;
      let start = Number(w.start);
      let end = Number(w.end);
      if (!Number.isFinite(start)) continue;
      if (!Number.isFinite(end)) end = start + 0.25;
      if (start < segStart + 2) {
        start += segStart;
        end += segStart;
      }
      words.push({ word: token, start, end });
    }
  }
  if (!words.length) return "";

  const from = Math.max(0, globalSec - windowSec * 0.35);
  const to = globalSec + windowSec * 0.65;
  const picked = words
    .filter((w) => w.end >= from && w.start <= to)
    .map((w) => w.word);
  if (!picked.length) return "";

  const phrase = picked.join(" ").replace(/\s+/g, " ").trim();
  if (phrase.length < 12) return phrase;

  const sentences = phrase.split(/(?<=[.!?])\s+/);
  return sentences[0] || phrase.slice(0, 80);
}

export function mergeGeoPipPreviewProps(
  clip: StudioClip,
  playhead: number,
  wordTranscripts?: TranscriptSegment[],
  mainMediaUrl?: string
): Record<string, unknown> {
  const base = (clip.props || {}) as Record<string, unknown>;
  const liveNarration =
    narrationSubjectAtPlayhead(wordTranscripts, playhead) ||
    String(base.narration_text || "").trim();

  const dataSlots = Array.isArray(base.template_studio_data_slots)
    ? (base.template_studio_data_slots as string[])
    : [];

  const clipDurationSec = resolveGeoPipClipDurationSec(clip);
  const bound = bindGeoPipTemplateStudioProps(base, {
    narration: liveNarration,
    dataSlots,
    flyoverUrl: String(base.flyover_video || base.pipMediaUrl || "").trim(),
    mainMediaUrl: String(mainMediaUrl || base.mainMediaUrl || "").trim(),
    flyoverDurationSec: clipDurationSec,
  });

  return {
    ...base,
    ...bound.studio_props,
    studio_props: {
      ...(base.studio_props as Record<string, unknown>),
      ...bound.studio_props,
    },
    pipTitle: bound.pipTitle,
    pipMediaUrl: bound.pipMediaUrl,
    location: bound.location,
    mainMediaUrl: bound.mainMediaUrl,
    narration_text: liveNarration || base.narration_text,
  };
}
