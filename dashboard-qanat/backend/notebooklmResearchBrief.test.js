import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  buildNotebooklmBriefMarkdown,
  parseNotebooklmBriefMarkdown,
  writeNotebooklmBrief,
  loadNotebooklmBrief,
  shouldSkipWebResearchForBrief,
  formatNotebooklmBriefPromptBlock,
} from "./notebooklmResearchBrief.js";

describe("notebooklmResearchBrief", () => {
  it("gera MD temporário com fatos e frontmatter", () => {
    const md = buildNotebooklmBriefMarkdown(
      {
        niche: "Engenharia de Guerra",
        format: "SHORTS",
        status: "ready",
        accumulatedSummary:
          "1. Os túneis de Củ Chi tinham 250 km de extensão.\n2. Em 1968, 45 mil soldados usaram o sistema em Ho Chi Minh.",
        turns: [
          {
            role: "assistant",
            content: "Você quer pesquisa na web sobre os túneis?",
          },
          { role: "user", content: "Sim, traga números reais." },
        ],
      },
      { project: "Teste_Projeto" }
    );
    assert.match(md, /^---/);
    assert.match(md, /Brief de Pesquisa/i);
    assert.match(md, /250 km/);
    assert.match(md, /viral-short-form/i);
  });

  it("persiste e recarrega brief do disco", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nlm-brief-"));
    const session = {
      niche: "História",
      format: "LONGO",
      status: "finalized",
      accumulatedSummary: [
        "1. A ponte de Roma ligava duas margens em 62 d.C.",
        "2. Engenheiros romanos usaram 11 mil toneladas de pedra.",
        "3. A estrutura media 450 metros sobre o rio Tiber.",
        "4. O imperador Trajano inaugurou a obra com 20 mil espectadores.",
      ].join("\n"),
      turns: [],
    };
    writeNotebooklmBrief(tmp, session, { project: "Roma_Ponte" });
    const loaded = loadNotebooklmBrief(tmp);
    assert.equal(loaded.available, true);
    assert.ok(loaded.parsed.facts.length >= 2);
    assert.equal(shouldSkipWebResearchForBrief(loaded), true);
  });

  it("formata prompt com skill SHORTS", () => {
    const parsed = parseNotebooklmBriefMarkdown(
      buildNotebooklmBriefMarkdown(
        {
          format: "SHORTS",
          accumulatedSummary: "1. Fato com 90% de umidade no túnel.",
          turns: [],
        },
        { project: "X" }
      )
    );
    const block = formatNotebooklmBriefPromptBlock(
      { available: true, parsed, markdown: "x" },
      "SHORTS"
    );
    assert.match(block, /viral-short-form|80–130 palavras/i);
    assert.match(block, /notebooklm_research_brief/i);
  });
});
