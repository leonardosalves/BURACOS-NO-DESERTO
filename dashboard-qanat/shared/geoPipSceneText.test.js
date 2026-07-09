import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGeoPipOverlayStudioProps,
  extractSceneSubject,
  resolveGeoPipReferenceLabel,
  resolveGeoPipSectorLabel,
} from "./geoPipSceneText.js";

describe("geoPipSceneText", () => {
  it("resolveGeoPipReferenceLabel prioriza país", () => {
    assert.equal(
      resolveGeoPipReferenceLabel({
        country: "Brasil",
        location: "São Paulo",
      }),
      "Brasil"
    );
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

  it("buildGeoPipOverlayStudioProps preenche slots PIP", () => {
    const { studio_props, referencePoint, scene_subject } =
      buildGeoPipOverlayStudioProps(
        { country: "Brasil", geo_pip_composite: true },
        {
          narration: "No Brasil, 62% das pontes precisam de manutenção.",
          dataSlots: ["referencePoint", "sectorLabel", "subtitle"],
          flyoverDurationSec: 8.4,
        }
      );
    assert.equal(referencePoint, "Brasil");
    assert.match(scene_subject, /Brasil|pontes|manutenção/i);
    assert.equal(studio_props.referencePoint, "Brasil");
    assert.equal(studio_props.durationSeconds, 8.4);
  });
});