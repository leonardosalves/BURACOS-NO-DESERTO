import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enrichGeoPipMotionClip } from "./geoPipFlyoverEnrich.js";

describe("geoPipFlyoverEnrich", () => {
  it("sincroniza duracao do flyover e narração do bloco", () => {
    const { clip, changed } = enrichGeoPipMotionClip(
      {
        id: "motion-studio-1",
        start: 11.4,
        duration: 4,
        props: {
          geo_pip_composite: true,
          block: 1,
          narration_text: "Engenharia Picture in Picture Draft",
          flyover_video: "ASSETS/satellite/fly.mp4",
        },
      },
      {
        storyboard: {
          blocks: [
            {
              block: 1,
              narration_text:
                "Muitos acham que o Brasil está livre de tremores de terra, mas a engenharia civil teve que criar um escudo silencioso.",
            },
          ],
        },
        resolveFlyoverDurationSec: () => 10.2,
      }
    );
    assert.equal(changed, true);
    assert.equal(clip.duration, 10.2);
    assert.equal(clip.props.flyover_duration_sec, 10.2);
    assert.equal(clip.props.durationSeconds, 10.2);
    assert.match(clip.props.narration_text, /engenharia civil/i);
    assert.ok(String(clip.props.scene_subject || "").length > 0);
    assert.equal(clip.props.showMainContentLabel, false);
  });
});
