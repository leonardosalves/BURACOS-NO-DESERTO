import test from "node:test";
import assert from "node:assert/strict";

import {
  mergeGlobalStudioIntoProjectConfig,
  VISUAL_CONFIG_KEYS,
} from "./globalStudioDefaults.js";
import { resolveCaptionRenderSettings } from "./captionConfig.js";

const CAPTION_GROUPING_KEYS = [
  "shorts_caption_max_words_per_chunk",
  "shorts_caption_max_lines",
  "shorts_caption_respect_sentences",
  "long_caption_max_words_per_chunk",
  "long_caption_max_lines",
  "long_caption_respect_sentences",
];

test("global visual defaults include every caption grouping setting", () => {
  for (const key of CAPTION_GROUPING_KEYS) {
    assert.ok(VISUAL_CONFIG_KEYS.includes(key), `${key} must be global`);
  }
});

test("global caption settings reach the render resolver for both formats", () => {
  const config = mergeGlobalStudioIntoProjectConfig(
    { caption_mode_short: "caption-highlight" },
    {
      studio_visual: {
        caption_mode_short: "caption-shimmer-gold",
        caption_mode_long: "caption-weight-shift",
        shorts_caption_max_words_per_chunk: 3,
        shorts_caption_max_lines: 2,
        shorts_caption_respect_sentences: false,
        long_caption_max_words_per_chunk: 6,
        long_caption_max_lines: 1,
        long_caption_respect_sentences: true,
      },
    }
  );

  assert.deepEqual(resolveCaptionRenderSettings(config, "9:16"), {
    captionMode: "caption-shimmer-gold",
    captionStyle: "shorts-viral",
    captionEffect: "caption-shimmer-gold",
    shortsCaptionBgmPulse: false,
    captionMaxWordsPerChunk: 3,
    captionMaxLines: 2,
    captionRespectSentences: false,
  });
  assert.deepEqual(resolveCaptionRenderSettings(config, "16:9"), {
    captionMode: "caption-weight-shift",
    captionStyle: "documentary",
    captionEffect: "caption-weight-shift",
    shortsCaptionBgmPulse: false,
    captionMaxWordsPerChunk: 6,
    captionMaxLines: 1,
    captionRespectSentences: true,
  });
});
