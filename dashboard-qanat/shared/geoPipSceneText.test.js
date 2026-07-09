import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGeoPipOverlayStudioProps,
  extractSceneSubject,
  resolveGeoPipBlockNarration,
  resolveGeoPipReferenceLabel,
  resolveGeoPipSceneNarration,
  resolveGeoPipSectorLabel,
  summarizeGeoPipFooterSubject,
} from "./geoPipSceneText.js";

describe("geoPipSceneText", () => {
  it("resolveGeoPipReferenceLabel usa local real da IA", () => {
    assert.equal(
      resolveGeoPipReferenceLabel({
        location: "Palmanova",
        country: "Itália",
      }),
      "Palmanova"
    );
    assert.equal(
      resolveGeoPipReferenceLabel({
        referencePoint: "Golden Gate",
        location: "San Francisco",
      }),
      "Golden Gate"
    );
  });

  it("resolveGeoPipBlockNarration usa visual_prompts geo do storyboard", () => {
    const narr = resolveGeoPipBlockNarration(
      {
        visual_prompts: [
          {
            block: 1,
            narration_text: "Primeira cena do bloco.",
          },
          {
            block: 1,
            narration_text:
              "Muitos acham que o Brasil está livre de tremores de terra, mas a engenharia civil teve que criar um escudo silencioso.",
            production: { data_type: "location" },
          },
        ],
      },
      1
    );
    assert.match(narr, /tremores|engenharia civil/i);
    assert.doesNotMatch(narr, /Primeira cena/i);
  });

  it("resolveGeoPipSceneNarration ignora placeholder do template", () => {
    const narr = resolveGeoPipSceneNarration(
      {
        block: 1,
        narration_text: "Engenharia Picture in Picture Draft",
      },
      {
        visual_prompts: [
          {
            block: 1,
            narration_text: "Texto real do bloco geo.",
            production: { data_type: "location" },
          },
        ],
      }
    );
    assert.equal(narr, "Texto real do bloco geo.");
  });

  it("summarizeGeoPipFooterSubject resume assunto sem legenda inteira", () => {
    const summary = summarizeGeoPipFooterSubject(
      "Muitos acham que o Brasil está livre de tremores de terra, mas a engenharia civil teve que criar um escudo silencioso."
    );
    assert.ok(summary.split(/\s+/).length <= 8);
    assert.match(summary, /engenharia civil|escudo/i);
    assert.doesNotMatch(summary, /Muitos acham/i);
  });

  it("extractSceneSubject usa primeira frase da narração", () => {
    const subject = extractSceneSubject(
      "No Brasil, a infraestrutura rodoviária impressiona. Outro trecho."
    );
    assert.match(subject, /Brasil/i);
    assert.equal(subject.includes("Outro trecho"), false);
  });

  it("resolveGeoPipSectorLabel ignora placeholder de setor estrutural", () => {
    const sector = resolveGeoPipSectorLabel(
      { panelLabel: "SETOR ESTRUTURAL A-03" },
      "A ponte de Laufenburg revela engenharia suíça."
    );
    assert.match(sector, /Laufenburg|engenharia/i);
  });

  it("buildGeoPipOverlayStudioProps preenche slots do template PIP", () => {
    const { studio_props, referencePoint, scene_subject, pipMediaUrl } =
      buildGeoPipOverlayStudioProps(
        {
          location: "Palmanova",
          country: "Itália",
          geo_pip_composite: true,
          flyover_video: "ASSETS/satellite/palmanova.mp4",
          template_studio_subcategory: "Picture in Picture",
        },
        {
          narration: "A fortaleza estelar de Palmanova impressiona.",
          dataSlots: ["pipMediaUrl", "pipTitle", "location"],
          flyoverDurationSec: 8.4,
        }
      );
    assert.equal(referencePoint, "Palmanova");
    assert.match(scene_subject, /Palmanova|fortaleza/i);
    assert.equal(studio_props.pipTitle, "");
    assert.equal(studio_props.location, scene_subject);
    assert.equal(pipMediaUrl, "ASSETS/satellite/palmanova.mp4");
    assert.equal(studio_props.durationSeconds, 8.4);
  });
});
