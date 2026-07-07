import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { syncNarrationToTimelineStudio } from "../backend/timelineStudioMigration.js";

describe("timelineStudioNarrationSync", () => {
  it("syncNarrationToTimelineStudio atualiza voice e captions sem remover video", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-narr-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "narracao_mestra_premium.mp3"),
        "fake-mp3"
      );
      fs.writeFileSync(
        path.join(tmp, "block_timings.json"),
        JSON.stringify({ total_duration: 12.5, starts: [0], durations: [12.5] })
      );
      fs.writeFileSync(
        path.join(tmp, "word_transcripts.json"),
        JSON.stringify([
          {
            start_time: 0,
            words: [
              { word: "Olá", start: 0, end: 0.4 },
              { word: "mundo", start: 0.5, end: 1.0 },
            ],
          },
        ])
      );

      const studio = {
        version: 1,
        clips: [
          {
            id: "video-1-0",
            trackId: "video",
            start: 0,
            duration: 10,
            source: "clip.jpg",
          },
          {
            id: "voice-main",
            trackId: "voice",
            start: 0,
            duration: 5,
            source: "narracao_mestra_premium.mp3",
          },
          {
            id: "cap-old",
            trackId: "captions",
            start: 0,
            duration: 0.2,
            label: "stale",
          },
        ],
        totalDuration: 10,
      };

      const { studio: next, changed } = syncNarrationToTimelineStudio(
        tmp,
        studio
      );

      assert.equal(changed, true);
      const video = next.clips.filter((c) => c.trackId === "video");
      const voice = next.clips.find((c) => c.trackId === "voice");
      const captions = next.clips.filter((c) => c.trackId === "captions");

      assert.equal(video.length, 1);
      assert.equal(voice?.duration, 12.5);
      assert.equal(voice?.source, "narracao_mestra_premium.mp3");
      assert.equal(captions.length, 2);
      assert.equal(captions[0].label, "Olá");
      assert.equal(captions[1].label, "mundo");
      assert.equal(next.totalDuration, 12.5);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("syncNarrationToTimelineStudio retorna changed=false quando já está alinhado", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-narr-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "narracao_mestra_premium.mp3"),
        "fake-mp3"
      );
      fs.writeFileSync(
        path.join(tmp, "block_timings.json"),
        JSON.stringify({ total_duration: 8, starts: [0], durations: [8] })
      );
      fs.writeFileSync(
        path.join(tmp, "word_transcripts.json"),
        JSON.stringify([
          {
            start_time: 1,
            words: [{ word: "teste", start: 0, end: 0.5 }],
          },
        ])
      );

      const studio = {
        clips: [
          {
            id: "voice-main",
            trackId: "voice",
            start: 0,
            duration: 8,
            source: "narracao_mestra_premium.mp3",
          },
          {
            id: "cap-1-0",
            trackId: "captions",
            start: 1,
            duration: 0.5,
            label: "teste",
            props: { text: "teste" },
          },
        ],
        totalDuration: 8,
      };

      const first = syncNarrationToTimelineStudio(tmp, studio);
      const second = syncNarrationToTimelineStudio(tmp, first.studio);
      assert.equal(second.changed, false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
