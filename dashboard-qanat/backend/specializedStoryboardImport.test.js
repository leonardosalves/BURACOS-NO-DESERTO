import test from "node:test";
import assert from "node:assert/strict";
import { prepareSpecializedStoryboardImport } from "./specializedStoryboardImport.js";

function validStoryboard(source = "humor-facts") {
  return {
    strategy: {
      title_main: "Polvos têm três corações",
      hook: "Dois deles param quando o polvo nada.",
    },
    narrative_script: "Primeira frase. Segunda frase.",
    research_facts: ["Polvos possuem três corações."],
    research_sources: [
      { title: "Smithsonian Ocean", url: "https://ocean.si.edu/" },
    ],
    specialized_import: {
      source,
      factual_premise: "Polvos possuem três corações.",
    },
    visual_prompts: [
      {
        scene: "1.1",
        narration_text: "Primeira frase.",
        prompt: "A cinematic octopus swimming through clear ocean water.",
        type: "imagem IA",
        media_mode: "image",
        image_prompt: "A cinematic octopus swimming through clear ocean water.",
        duration_seconds: 4,
      },
      {
        scene: "1.2",
        narration_text: "Segunda frase.",
        prompt: "Close-up of an octopus with subtle anatomical graphics.",
        type: "vídeo IA (max 10s)",
        media_mode: "video",
        video_prompt: "Close-up of an octopus with subtle anatomical graphics.",
        duration_seconds: 4,
      },
    ],
  };
}

test("importação especializada gera auditoria e trava a narração", () => {
  const result = prepareSpecializedStoryboardImport({
    storyboard: validStoryboard(),
    source: "humor-facts",
    format: "SHORTS",
  });
  assert.equal(result.narracao_pro_audit.approved, true);
  assert.equal(
    result.narracao_pro_trace.etapa_11_validacao_narracao.texto_preservado,
    true
  );
  assert.equal(
    result.narration_integrity.approved_text_sha256,
    result.narracao_pro_audit.narrative_sha256
  );
  assert.equal(result.visual_prompts[0].media_mode, "image");
  assert.equal(result.visual_prompts[1].media_mode, "video");
});

test("importação especializada bloqueia narração de cenas incompleta", () => {
  const storyboard = validStoryboard();
  storyboard.visual_prompts[1].narration_text = "Texto alterado.";
  assert.throws(
    () =>
      prepareSpecializedStoryboardImport({
        storyboard,
        source: "humor-facts",
        format: "SHORTS",
      }),
    /não corresponde integralmente/i
  );
});

test("importação especializada bloqueia origem não autorizada", () => {
  assert.throws(
    () =>
      prepareSpecializedStoryboardImport({
        storyboard: validStoryboard(),
        source: "qualquer-origem",
      }),
    /não autorizada/i
  );
});

test("engenharia reversa importa mesmo sem research_sources explícitas", () => {
  const storyboard = {
    strategy: {
      title_main: "O Inesperado Poder do Álcool: Histórias Reais Absurdas",
      hook: "Prepare-se para histórias tão inacreditáveis que você vai duvidar que são reais.",
    },
    narrative_script:
      "O álcool influenciou decisões absurdas ao longo da história. Essas histórias reais mostram o poder inesperado da bebida.",
    visual_prompts: [
      {
        scene: "1.1",
        narration_text:
          "O álcool influenciou decisões absurdas ao longo da história.",
        prompt: "Cinematic historical tavern scene at night.",
        type: "vídeo IA (max 10s)",
        media_mode: "video",
        video_prompt: "Cinematic historical tavern scene at night.",
        duration_seconds: 5,
      },
      {
        scene: "1.2",
        narration_text:
          "Essas histórias reais mostram o poder inesperado da bebida.",
        prompt: "Documentary style montage of archival photographs.",
        type: "vídeo IA (max 10s)",
        media_mode: "video",
        video_prompt: "Documentary style montage of archival photographs.",
        duration_seconds: 5,
      },
    ],
    reverse_engineering: {
      source: {
        url: "https://www.tiktok.com/@curiosopraki/video/76446",
        title: "O Inesperado Poder do Álcool",
        author: "curiosopraki",
      },
      content_summary:
        "Este vídeo explora duas narrativas reais e extraordinárias onde o álcool desempenha um papel central.",
    },
  };

  const result = prepareSpecializedStoryboardImport({
    storyboard,
    source: "video-reverse-engineering",
    format: "SHORTS",
  });

  assert.equal(result.narracao_pro_audit.approved, true);
  assert.ok(result.research_sources.length >= 1);
  assert.ok(result.research_sources[0].url.includes("tiktok.com"));
  assert.ok(result.narracao_pro_trace.etapa_2_pesquisa.length >= 1);
  assert.equal(result.specialized_import.source, "video-reverse-engineering");
});
