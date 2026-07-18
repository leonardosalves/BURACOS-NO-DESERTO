import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  scoreSummaryGrounding,
  tokenizeEvidence,
  buildMetadataGroundedUnderstanding,
  ytDlpCandidates,
  mergeVideoContexts,
} from "./videoUnderstandingService.js";
import { parseReferenceUrl } from "./openmontageReference.js";

describe("videoUnderstanding grounding", () => {
  it("detecta resumo ancorado em máquinas pesadas", () => {
    const evidence =
      "Descubra as 16 maiores máquinas pesadas já construídas pela engenharia Bagger 293 Komatsu mineração";
    const good =
      "Ranking das maiores máquinas pesadas de mineração e construção, como Bagger e Komatsu.";
    const bad =
      "Uma mãe compartilha a experiência de depressão pós-parto e baby blues sem amor imediato pelo filho.";
    assert.ok(scoreSummaryGrounding(good, evidence) >= 0.2);
    assert.ok(scoreSummaryGrounding(bad, evidence) < 0.12);
  });

  it("tokenizeEvidence remove stopwords curtas", () => {
    const toks = tokenizeEvidence(
      "as 16 maiores maquinas pesadas da engenharia"
    );
    assert.ok(
      toks.includes("maquinas") || toks.includes("maquinas".normalize())
    );
    assert.ok(toks.includes("pesadas"));
    assert.ok(!toks.includes("das"));
  });

  it("buildMetadataGroundedUnderstanding usa descrição real", () => {
    const u = buildMetadataGroundedUnderstanding({
      title: "16 maiores máquinas pesadas",
      description:
        "Conheça a monstruosa Bagger 293 e a Komatsu PC8000 em obras de mineração.",
      uploader: "curiosidades",
      duration_sec: 166,
    });
    assert.match(u.summary, /Bagger|Komatsu|máquinas|maquinas/i);
    assert.equal(u.grounded_on_metadata, true);
  });

  it("ytDlpCandidates inclui path do agent-reach no Windows", () => {
    const list = ytDlpCandidates();
    assert.ok(list.length >= 2);
    assert.ok(list.some((p) => /yt-dlp/i.test(p)));
  });
});

describe("parseReferenceUrl tiktok", () => {
  it("aceita short link vt.tiktok.com", () => {
    const p = parseReferenceUrl("https://vt.tiktok.com/ZSXM1yPcP/");
    assert.equal(p.valid, true);
    assert.equal(p.platform, "tiktok");
  });

  it("extrai videoId de URL canônica", () => {
    const p = parseReferenceUrl(
      "https://www.tiktok.com/@curiosidades_incriveis12/video/7661096475639811349"
    );
    assert.equal(p.valid, true);
    assert.equal(p.videoId, "7661096475639811349");
  });
});

describe("mergeVideoContexts", () => {
  it("prefere descrição longa do oEmbed quando yt-dlp falha", () => {
    const merged = mergeVideoContexts(
      { ok: false, error: "no ytdlp" },
      {
        ok: true,
        source: "tiktok_oembed",
        title: "16 maiores máquinas",
        description:
          "Descubra as 16 maiores máquinas pesadas Bagger 293 Komatsu mineração",
        uploader: "curiosidades",
      }
    );
    assert.equal(merged.ok, true);
    assert.match(merged.description, /Bagger|máquinas/i);
  });
});
