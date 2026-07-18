import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  injectNarradorProPlacements,
  normalizeVisualOrchestration,
  resolveVisualOrchestration,
} from "./visualOrchestration.js";

describe("visualOrchestration", () => {
  it("normaliza JSON string e placements", () => {
    const vo = normalizeVisualOrchestration(
      JSON.stringify({
        chapters: [{ block: 2, title: "Aço vs concreto" }],
        placements: [
          {
            kind: "quote",
            anchor: { type: "block", block: 2 },
            data: { quote: "A estrutura venceu o tempo.", attribution: "Eng." },
          },
          { kind: "invalid_x", anchor: {} },
        ],
      })
    );
    assert.equal(vo.chapters.length, 1);
    assert.equal(vo.placements.length, 1);
    assert.equal(vo.placements[0].kind, "quote");
  });

  it("resolve a partir do storyboard", () => {
    const vo = resolveVisualOrchestration(
      {
        visual_orchestration: {
          placements: [
            {
              kind: "chart",
              anchor: { block: 1 },
              data: { value: 62, unit: "%", label: "usuarios" },
            },
          ],
        },
      },
      {}
    );
    assert.equal(vo.placements[0].kind, "chart");
  });

  it("injeta placement com pick mock", () => {
    const pick = () => ({
      id: "quote-tpl",
      name: "Quote",
      category: "intro-outro",
      subcategory: "Quote Card",
      motion_template_id: "studio-runtime",
      dataSlots: ["quote", "attribution"],
      studio_source_code:
        "export default function T(){ const f=useCurrentFrame(); return null; }",
      studio_pick_score: 50,
    });
    const { scenes, injected } = injectNarradorProPlacements({
      scenes: [],
      visualOrchestration: {
        placements: [
          {
            kind: "quote",
            anchor: { type: "block", block: 1, start: 10, duration: 4 },
            data: { quote: "Teste", attribution: "A" },
          },
        ],
      },
      visualPrompts: [
        { block: 1, narration_text: "Teste de citacao.", speech_start: 10 },
      ],
      studioNiche: "Engenharia",
      pickStudioTemplateByCategory: pick,
    });
    assert.equal(injected.length, 1);
    assert.equal(scenes[0].source, "narradorpro_placement");
    assert.equal(scenes[0].start_hint, 10);
  });
});
