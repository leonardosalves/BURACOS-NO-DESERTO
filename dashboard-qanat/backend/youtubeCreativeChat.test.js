import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  buildCreativeChatSystemPrompt,
  loadProjectCreativeContext,
  loadCreativeChat,
  saveCreativeChat,
  selectCreativeConcept,
} from "./youtubeCreativeChat.js";

describe("youtubeCreativeChat", () => {
  it("buildCreativeChatSystemPrompt inclui título e schema de 3 conceitos", () => {
    const p = buildCreativeChatSystemPrompt({
      title: "Recorde brasileiro 7000 km/h",
      niche: "engenharia",
      format: "LONG",
      hook: "7 mil por hora",
      description: "motor de plasma",
      narrationExcerpt: "O Brasil alcançou 7000 km/h no espaço",
      accentColor: "#D4AF37",
    });
    assert.match(p, /Recorde brasileiro/);
    assert.match(p, /whyItWorks/);
    assert.match(p, /concepts/);
    assert.match(p, /3 conceitos/i);
  });

  it("loadProjectCreativeContext lê config do projeto", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-chat-"));
    fs.writeFileSync(
      path.join(dir, "config_qanat.json"),
      JSON.stringify({
        video_title: "Motor quantico",
        niche: "engenharia",
        aspect_ratio: "16:9",
      }),
      "utf8"
    );
    const ctx = loadProjectCreativeContext(dir);
    assert.equal(ctx.title, "Motor quantico");
    assert.equal(ctx.niche, "engenharia");
    assert.equal(ctx.format, "LONG");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("selectCreativeConcept persiste seleção", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-chat-sel-"));
    saveCreativeChat(dir, {
      messages: [],
      lastConcepts: [
        { id: "1", title: "A" },
        { id: "2", title: "B" },
      ],
      selectedConceptId: null,
    });
    const r = selectCreativeConcept(dir, "2");
    assert.equal(r.ok, true);
    assert.equal(r.concept.title, "B");
    const store = loadCreativeChat(dir);
    assert.equal(store.selectedConceptId, "2");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
