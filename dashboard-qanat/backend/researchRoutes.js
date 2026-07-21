/**
 * Rotas de pesquisa profunda (padrão DeerFlow → Lumiera).
 */

import fs from "fs";
import path from "path";
import { runDeepResearch, planDeepResearch } from "./deerFlowResearch.js";
import { buildCompetitorLlmFns } from "./researchLlmHelpers.js";
import {
  analyzeVideoUnderstanding,
  runAnalyzeReferenceVideoDeep,
} from "./videoUnderstandingService.js";
import { runVideoReverseEngineering } from "./videoReverseEngineering.js";
import { saveCreatorHistory } from "./creatorHistoryService.js";

export function registerResearchRoutes(app, deps) {
  const {
    WORKSPACE_DIR,
    BACKEND_DIR,
    getApiKey,
    getApiKeys,
    getAiProvider,
    getGeminiModel,
    callGeminiWithRetry,
    callNvidiaWithRetry,
    NVIDIA_MODELS,
    getProjectDir,
  } = deps;

  app.post("/api/research/deep/plan", (req, res) => {
    try {
      const topic = String(
        req.body?.topic || req.body?.requirement || ""
      ).trim();
      if (!topic)
        return res.status(400).json({ error: "Informe topic ou requirement." });
      const niche = String(req.body?.niche || "Geral").trim();
      const formatRaw = String(req.body?.format || "SHORTS").toUpperCase();
      const format =
        formatRaw === "LONG" || formatRaw === "LONGO" ? "LONGO" : "SHORTS";
      res.json({ ok: true, plan: planDeepResearch(topic, { niche, format }) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/research/deep", async (req, res) => {
    try {
      const topic = String(
        req.body?.topic || req.body?.requirement || ""
      ).trim();
      if (!topic)
        return res.status(400).json({ error: "Informe topic ou requirement." });

      const useAi = req.body?.useAi !== false;
      const { llmFn, repairJsonFn } = buildCompetitorLlmFns(
        {
          workspaceDir: WORKSPACE_DIR,
          getAiProvider,
          getApiKey,
          getApiKeys,
          getGeminiModel,
          callGeminiWithRetry,
          callNvidiaWithRetry,
          NVIDIA_MODELS,
        },
        { useAi }
      );

      const formatRaw = String(req.body?.format || "SHORTS").toUpperCase();
      const format =
        formatRaw === "LONG" || formatRaw === "LONGO" ? "LONGO" : "SHORTS";
      const legs = Array.isArray(req.body?.legs) ? req.body.legs : undefined;

      const projDir = getProjectDir ? getProjectDir(req) : WORKSPACE_DIR;
      const result = await runDeepResearch(WORKSPACE_DIR, {
        topic,
        niche: String(req.body?.niche || "Geral").trim(),
        format,
        legs,
        llmFn: legs && !legs.includes("competitors") ? null : llmFn,
        repairJsonFn:
          legs && !legs.includes("competitors") ? null : repairJsonFn,
        getApiKeys,
        apiKey: getApiKey(WORKSPACE_DIR),
        backendDir: BACKEND_DIR,
        notebooklmDeep: req.body?.notebooklmDeep === true,
        enqueueIdeas: req.body?.enqueueIdeas !== false,
        maxCompetitors: Math.min(
          Math.max(Number(req.body?.maxCompetitors) || 5, 1),
          8
        ),
        projDir,
      });

      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res
        .status(500)
        .json({ error: "Falha na pesquisa profunda", details: err.message });
    }
  });

  app.post("/api/research/analyze-reference-video", async (req, res) => {
    try {
      const url = String(req.body?.url || "").trim();
      if (!url) return res.status(400).json({ error: "Informe url do vídeo." });

      const formatRaw = String(req.body?.format || "SHORTS").toUpperCase();
      const format =
        formatRaw === "LONG" || formatRaw === "LONGO" ? "LONGO" : "SHORTS";
      const niche = String(req.body?.niche || "Geral").trim();
      const topic = String(req.body?.topic || "").trim();
      const question = String(req.body?.question || "").trim();
      const persist = req.body?.persist === true;
      const understandingOnly = req.body?.understandingOnly === true;

      const geminiKeys = getApiKeys(WORKSPACE_DIR);
      const apiKey = geminiKeys[0] || null;
      if (!apiKey) {
        return res.status(400).json({
          error:
            "Configure chave Gemini em Configurações → IA para análise multimodal (provider atual não é Gemini).",
        });
      }

      if (understandingOnly) {
        const result = await analyzeVideoUnderstanding({
          url,
          format,
          question,
          callGeminiWithRetry,
          apiKey,
          workspaceDir: WORKSPACE_DIR,
        });
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
      }

      const result = await runAnalyzeReferenceVideoDeep({
        url,
        format,
        niche,
        topic,
        question,
        persist,
        callGeminiWithRetry,
        apiKey,
        workspaceDir: WORKSPACE_DIR,
        getGeminiModel,
      });

      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: "Falha na análise multimodal do vídeo",
        details: err.message,
      });
    }
  });

  app.post("/api/research/reverse-engineer-video", async (req, res) => {
    try {
      const url = String(req.body?.url || "").trim();
      if (!url)
        return res.status(400).json({ error: "Informe a URL do video." });
      if (req.body?.rightsConfirmed !== true) {
        return res.status(400).json({
          error:
            "Confirme que voce possui o video, tem permissao ou usara o resultado de forma transformativa.",
        });
      }

      const formatRaw = String(req.body?.format || "SHORTS").toUpperCase();
      const format =
        formatRaw === "LONG" || formatRaw === "LONGO" ? "LONGO" : "SHORTS";
      const mode =
        String(req.body?.mode || "transformative").toLowerCase() === "faithful"
          ? "faithful"
          : "transformative";
      const mediaStrategy =
        String(req.body?.mediaStrategy || "").toLowerCase() === "video_only"
          ? "video_only"
          : "adaptive";
      // Provedor ativo: gemini | openrouter | xai | nvidia | inference | local
      // Multimodal (entender o vídeo) usa Gemini se houver chave; o JSON/roteiro usa o provedor escolhido.
      const provider =
        typeof getAiProvider === "function"
          ? getAiProvider(WORKSPACE_DIR)
          : "gemini";
      const geminiKeys = getApiKeys(WORKSPACE_DIR);
      const apiKey = geminiKeys[0] || null;
      if (provider === "gemini" && !apiKey) {
        return res.status(400).json({
          error:
            "Configure uma chave Gemini em Configurações → IA, ou escolha outro provedor (OpenRouter, xAI, NVIDIA, Inference, Local).",
        });
      }

      let visualAssetStyle = String(
        req.body?.visualAssetStyle || req.body?.visual_asset_style || ""
      ).trim();
      let visualMapOnly =
        req.body?.visualMapOnly === true ||
        req.body?.visual_map_only_prompts === true;
      try {
        const projDir = getProjectDir ? getProjectDir(req) : null;
        if (projDir) {
          const cfgPath = path.join(projDir, "config_qanat.json");
          if (fs.existsSync(cfgPath)) {
            const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
            if (!visualAssetStyle)
              visualAssetStyle = String(cfg.visual_asset_style || "").trim();
            if (
              req.body?.visualMapOnly === undefined &&
              req.body?.visual_map_only_prompts === undefined
            ) {
              visualMapOnly = Boolean(cfg.visual_map_only_prompts);
            }
          }
        }
      } catch {
        /* ignore */
      }

      const result = await runVideoReverseEngineering({
        url,
        format,
        mode,
        mediaStrategy,
        visualAssetStyle: visualAssetStyle || "photorealistic",
        visualMapOnly,
        niche: String(req.body?.niche || "Geral").trim(),
        instructions: String(req.body?.instructions || "").trim(),
        callGeminiWithRetry,
        apiKey,
        workspaceDir: WORKSPACE_DIR,
        getGeminiModel,
      });
      if (!result.ok) return res.status(400).json(result);

      // Auto-salva snapshot inicial no PostgreSQL
      try {
        const titleStr = result.title || "Engenharia Reversa";
        const nowStr = new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        await saveCreatorHistory(
          "video-reverse-engineering",
          `[Gerado] ${titleStr} (${nowStr})`,
          {
            url,
            niche: String(req.body?.niche || "Geral").trim(),
            format,
            result,
          }
        );
      } catch (autoErr) {
        console.warn(
          "[ResearchRoutes] Auto-snapshot Postgres:",
          autoErr.message
        );
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: "Falha na engenharia reversa do video.",
        details: err.message,
      });
    }
  });
}
