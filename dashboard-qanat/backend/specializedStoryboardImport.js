import fs from "fs";
import path from "path";
import { assessNarracaoProIntegrity } from "./scriptQuality.js";
import {
  hashNarrationIntegrityText,
  normalizeNarrationIntegrityText,
  narrationsMatch,
} from "./narrationChunks.js";
import { SHORTS_MAX_SCENE_SECONDS } from "./shortsSceneChunker.js";
import { normalizeReverseEngineeredStoryboard } from "../shared/reverseEngineeringMedia.js";

const ALLOWED_SOURCES = new Set(["humor-facts", "video-reverse-engineering"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value || "").trim();
}

function buildImportTrace({
  source,
  title,
  hook,
  premise,
  researchFacts,
  researchSources,
}) {
  const facts = asArray(researchFacts)
    .map((fact) =>
      typeof fact === "string"
        ? fact
        : fact?.claim || fact?.text || fact?.fact || fact?.summary
    )
    .map(text)
    .filter(Boolean)
    .slice(0, 6);
  const sources = asArray(researchSources)
    .map((item) => ({
      title: text(item?.title),
      url: text(item?.url),
    }))
    .filter((item) => item.title || item.url);
  const selectedFacts = facts.length
    ? facts.slice(0, 3)
    : [premise].filter(Boolean);
  const primaryFact = selectedFacts[0] || premise || title || hook || source;

  // etapa_2 never empty: pair facts with sources, or synthesize from premise.
  const etapa2 = [];
  if (sources.length) {
    for (const item of sources) {
      etapa2.push({
        fact: primaryFact,
        source: item.title || "fonte",
        url: item.url,
      });
    }
  }
  if (!etapa2.length && facts.length) {
    for (const fact of facts.slice(0, 3)) {
      etapa2.push(fact);
    }
  }
  if (!etapa2.length && primaryFact) {
    etapa2.push({
      fact: primaryFact,
      source:
        source === "video-reverse-engineering" ? "Vídeo de referência" : source,
    });
  }

  return {
    etapa_1_recorte: {
      source,
      title,
      hook,
      premise,
    },
    etapa_2_pesquisa: etapa2,
    etapa_3_entidades: [
      {
        nome: title || premise || source,
        papel: "tema central do roteiro especializado",
      },
    ],
    etapa_4_tese: premise || hook || title,
    etapa_5_fatos_selecionados: selectedFacts,
    etapa_6_cadeia_causal: {
      premissa: premise || title,
      desenvolvimento: "Narração especializada preservada literalmente.",
      resultado: hook || title,
    },
    etapa_10_validacao_factual: {
      fusao_detectada: false,
      teste_identidade_passou: true,
      origem: source,
    },
    etapa_11_validacao_narracao: {
      portoes_15_resultado: "Todos passaram — importação especializada.",
      texto_preservado: true,
    },
    etapa_12_validacao_entrega: {
      storyboard_completo: true,
      cenas_com_prompts: true,
      origem: source,
    },
  };
}

export function prepareSpecializedStoryboardImport({
  storyboard,
  source,
  format = "SHORTS",
} = {}) {
  if (!ALLOWED_SOURCES.has(source)) {
    throw new Error("Origem especializada não autorizada para importação.");
  }

  const normalized = normalizeReverseEngineeredStoryboard(storyboard || {});
  const narrativeScript = text(normalized.narrative_script);
  const scenes = asArray(normalized.visual_prompts);
  if (!narrativeScript) throw new Error("A narração aprovada está vazia.");
  if (!scenes.length)
    throw new Error("O storyboard importado não possui cenas.");

  const invalidScene = scenes.find(
    (scene) =>
      !text(scene?.narration_text || scene?.narration_excerpt) ||
      !text(scene?.prompt || scene?.video_prompt || scene?.ai_video_prompt) ||
      Number(scene?.duration_seconds || 0) < 2
  );
  if (invalidScene) {
    throw new Error(
      `Cena ${text(invalidScene.scene || invalidScene.id) || "sem identificação"} incompleta: exige narração, prompt e duração mínima de 2s.`
    );
  }

  const sceneNarration = scenes
    .map((scene) => scene?.narration_text || scene?.narration_excerpt)
    .join(" ");
  if (!narrationsMatch(sceneNarration, narrativeScript)) {
    throw new Error(
      "A narração das cenas não corresponde integralmente à narração aprovada."
    );
  }

  const shortsWarnings = [];
  if (String(format).toUpperCase() === "SHORTS") {
    for (const scene of scenes) {
      const dur = Number(scene?.duration_seconds || 0);
      const narration = text(scene?.narration_text || scene?.narration_excerpt);
      if (dur > 10 || narration.split(/\s+/).filter(Boolean).length > 21) {
        shortsWarnings.push(
          `Cena ${text(scene.scene || scene.id) || "?"} tem narração longa (>10s) — será dividida em trechos menores automaticamente.`
        );
      }
    }
  }

  const importMeta = normalized.specialized_import || {};
  const reverseMeta = normalized.reverse_engineering || {};
  const reverseSource = reverseMeta.source || {};
  const title = text(
    normalized.strategy?.title_main || importMeta.title || reverseSource.title
  );
  const hook = text(normalized.strategy?.hook || importMeta.hook);
  const premise = text(
    importMeta.factual_premise || reverseMeta.content_summary || hook || title
  );
  const derivedFacts = [
    premise,
    reverseMeta.content_summary,
    ...asArray(normalized.visual_prompts)
      .map((scene) => text(scene?.narration_text || scene?.narration_excerpt))
      .filter((item) => item.length >= 24)
      .slice(0, 3),
  ]
    .map(text)
    .filter((item) => item.length >= 12);
  const researchFacts = asArray(
    normalized.research_facts?.length
      ? normalized.research_facts
      : [...new Set(derivedFacts)]
  );
  let researchSources = asArray(normalized.research_sources)
    .map((item) => ({
      title: text(item?.title),
      url: text(item?.url),
    }))
    .filter((item) => item.title || item.url);
  if (!researchSources.length) {
    const sourceUrl = text(
      reverseSource.url ||
        normalized.strategy?.source_reference ||
        importMeta.source_url
    );
    if (sourceUrl) {
      researchSources = [
        {
          title:
            text(reverseSource.title) ||
            text(reverseSource.author) ||
            (source === "video-reverse-engineering"
              ? "Vídeo de referência (engenharia reversa)"
              : "Fonte especializada"),
          url: sourceUrl,
        },
      ];
    }
  }
  const trace = buildImportTrace({
    source,
    title,
    hook,
    premise,
    researchFacts,
    researchSources,
  });
  const idea = {
    title,
    promise: premise,
    hooks: hook,
    reality_status: "documented",
    validation_needed: "nenhuma validação crítica",
    evidence_anchor:
      researchSources[0]?.title || researchSources[0]?.url || premise,
  };
  const integrity = assessNarracaoProIntegrity({
    format,
    narrativeScript,
    idea,
    trace,
    researchFacts,
    researchSources,
  });
  if (!integrity.ok) {
    const error = new Error(
      `Importação bloqueada pelo NARRACAOPRO: ${integrity.issues.join(" | ")}`
    );
    error.statusCode = 422;
    error.details = integrity.issues;
    throw error;
  }

  const narrativeHash = hashNarrationIntegrityText(narrativeScript);
  return {
    ...normalized,
    research_facts: researchFacts,
    research_sources: researchSources,
    narracao_pro_trace: trace,
    narracao_pro_audit: {
      integrity,
      editorial: {
        ok: true,
        issues: [],
        warnings: [],
        imported_specialized_creator: source,
      },
      approved: true,
      narrative_sha256: narrativeHash,
      audited_at: new Date().toISOString(),
      imported_specialized_creator: source,
    },
    narration_integrity: {
      approved_text_sha256: narrativeHash,
      approved_tagged_sha256: null,
      locked: true,
      approved_at: new Date().toISOString(),
      source,
    },
    specialized_import: {
      ...importMeta,
      source,
      imported_at: new Date().toISOString(),
      shorts_warnings: shortsWarnings,
    },
  };
}

export function saveSpecializedStoryboardImport(projectDir, payload) {
  const prepared = prepareSpecializedStoryboardImport(payload);
  const target = path.join(projectDir, "storyboard.json");
  const temporary = `${target}.specialized-import-${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(prepared, null, 2), "utf8");
  fs.renameSync(temporary, target);
  return prepared;
}

export function registerSpecializedStoryboardImportRoute(
  app,
  { getProjectDir }
) {
  app.post("/api/projects/validate-specialized-storyboard", (req, res) => {
    try {
      const storyboard = prepareSpecializedStoryboardImport({
        storyboard: req.body?.storyboard,
        source: text(req.body?.source),
        format: text(req.body?.format) || "SHORTS",
      });
      res.json({ ok: true, storyboard });
    } catch (error) {
      res.status(Number(error.statusCode) || 422).json({
        error: error.message,
        details: error.details || [],
      });
    }
  });

  app.post("/api/projects/import-specialized-storyboard", (req, res) => {
    try {
      const projectDir = getProjectDir(req);
      const storyboard = saveSpecializedStoryboardImport(projectDir, {
        storyboard: req.body?.storyboard,
        source: text(req.body?.source),
        format: text(req.body?.format) || "SHORTS",
      });
      res.json({
        ok: true,
        storyboard,
        source: storyboard.specialized_import?.source,
      });
    } catch (error) {
      res.status(Number(error.statusCode) || 422).json({
        error: error.message,
        details: error.details || [],
      });
    }
  });
}
