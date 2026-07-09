import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveNeedsNlmDiscovery,
  shouldPauseNotebooklmNarration,
} from "./notebooklmService.js";

describe("shouldPauseNotebooklmNarration", () => {
  it("pausa na primeira rodada de descoberta interativa", () => {
    const pause = shouldPauseNotebooklmNarration(
      {
        available: true,
        interactiveDiscovery: true,
        questions: ["Você gostaria que eu fizesse essa pesquisa na web agora?"],
      },
      {
        scriptPhase: "narration",
        skipNotebooklmPending: false,
        needsDiscovery: true,
        userTurns: 0,
        briefFinalized: false,
      }
    );
    assert.equal(pause, true);
  });

  it("exige descoberta interativa mesmo com sessao antiga", () => {
    const needs = resolveNeedsNlmDiscovery({
      scriptPhase: "narration",
      skipNotebooklmPending: false,
      briefFinalized: false,
    });
    assert.equal(needs, true);
  });

  it("nao exige descoberta ao prosseguir com brief", () => {
    const needs = resolveNeedsNlmDiscovery({
      scriptPhase: "narration",
      skipNotebooklmPending: true,
      briefFinalized: true,
    });
    assert.equal(needs, false);
  });

  it("nao pausa quando brief finalizado e prosseguir", () => {
    const pause = shouldPauseNotebooklmNarration(
      { available: true, questions: [] },
      {
        scriptPhase: "narration",
        skipNotebooklmPending: true,
        needsDiscovery: false,
        userTurns: 2,
        briefFinalized: true,
      }
    );
    assert.equal(pause, false);
  });
});
