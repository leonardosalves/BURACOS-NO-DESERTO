/**
 * Rotas de workflow: stock, TTS, gaps, publish-prep, creator pipeline, presets, BGM.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import {
  analyzeSceneGaps,
  fetchStockForScenes,
  generateNarrationTts,
  runPublishPrep,
  runCreatorPipeline,
  applyListiclePreset,
  LISTICLE_WORKFLOW_PRESETS,
  getWorkflowApiKeys,
  runPythonScript,
} from "./workflowTools.js";
import {
  buildYoutubeMetadataPrompt,
  buildFallbackYoutubeMetadata,
  resolveYoutubeMetadataContext,
  YOUTUBE_METADATA_PIPELINE_VERSION,
} from "./youtubeMetadataOptimizer.js";

export function registerWorkflowRoutes(app, deps) {
  const {
    getProjectDir,
    WORKSPACE_DIR,
    PYTHON_PATH,
    getApiKeys,
    getXaiApiKey,
    getAiProvider,
    getOpenRouterApiKey,
    getEpidemicSoundKey,
    buildProjectTranscript,
    buildTimelineFromStoryboard,
    enhanceYoutubeTitlesMetadata,
    callGeminiWithRetry,
    generateMetadataWithXai,
    generateYoutubeThumbnailImages,
    runAutoSoundtrackLogic,
    readJsonFile,
  } = deps;

  async function generateYoutubeMetadataForProject(projDir) {
    const apiKeys = getApiKeys(projDir);
    const xaiKey = getXaiApiKey(projDir);
    const aiProvider = getAiProvider(projDir);

    const configPath = path.join(projDir, "config_qanat.json");
    const timingsPath = path.join(projDir, "block_timings.json");
    const transcriptPath = path.join(projDir, "transcripts_readable.txt");
    const storyboardPath = path.join(projDir, "storyboard.json");

    let config = readJsonFile(configPath) || {};
    let timings = readJsonFile(timingsPath) || { starts: [] };
    let transcript = fs.existsSync(transcriptPath) ? fs.readFileSync(transcriptPath, "utf8") : "";
    let storyboard = readJsonFile(storyboardPath) || {};

    transcript = buildProjectTranscript({ transcript, config, storyboard });
    if (!transcript) throw new Error("Roteiro não encontrado para gerar metadados.");

    const projectName = path.basename(projDir);
    const metadataCtx = resolveYoutubeMetadataContext({ config, timings, storyboard, projectName });
    const { format, niche, totalDuration, chaptersText, category, profile, rpmHint } = metadataCtx;

    const prompt = buildYoutubeMetadataPrompt({
      transcript,
      chaptersText,
      storyboard,
      config,
      format,
      niche,
      totalDuration,
      category,
      profile,
      rpmHint,
    });

    let text = "";
    let fallback = false;

    if (aiProvider === "xai" && xaiKey) {
      text = await generateMetadataWithXai(prompt, xaiKey, format);
    } else {
      try {
        text = await callGeminiWithRetry(apiKeys[0], prompt, { temperature: 0.55 });
      } catch (geminiErr) {
        if (xaiKey) {
          text = await generateMetadataWithXai(prompt, xaiKey, format);
        } else {
          text = buildFallbackYoutubeMetadata({
            transcript,
            chaptersText,
            storyboard,
            config,
            format,
            niche,
            category,
            profile,
            rpmHint,
          });
          fallback = true;
        }
      }
    }

    const parsed = await enhanceYoutubeTitlesMetadata(text, {
      transcript,
      format,
      storyboard,
      config,
      apiKey: fallback ? null : apiKeys[0],
    });

    const payload = {
      text,
      format,
      niche,
      totalDuration,
      category,
      profile: { id: profile.id, label: profile.label },
      rpm: rpmHint.rpm,
      palette: rpmHint.palette,
      parsed,
      fallback,
    };

    fs.writeFileSync(
      path.join(projDir, "youtube_metadata_cache.json"),
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        pipelineVersion: YOUTUBE_METADATA_PIPELINE_VERSION,
        format,
        niche,
        category,
        profile: payload.profile,
        rpm: rpmHint.rpm,
        palette: rpmHint.palette,
        parsed,
        text,
      }, null, 2),
      "utf8",
    );

    return payload;
  }

  function buildCreatorPipelineHandlers() {
    return {
      sync: async (projDir, log) => {
        if (!fs.existsSync(path.join(projDir, "find_block_timings.py"))) {
          throw new Error("find_block_timings.py não encontrado no projeto.");
        }
        await runPythonScript(PYTHON_PATH, projDir, "find_block_timings.py");
        if (fs.existsSync(path.join(projDir, "align_transcripts.py"))) {
          await runPythonScript(PYTHON_PATH, projDir, "align_transcripts.py");
        }
        log("[Pipeline] Sincronização Whisper concluída.");
      },
      stock: async (projDir, log) => {
        const result = await fetchStockForScenes(projDir, {
          workspaceDir: WORKSPACE_DIR,
          onLog: log,
        });
        if (!result.success && result.error) throw new Error(result.error);
        log(`[Pipeline] ${result.fetched?.length || 0} arquivos baixados.`);
      },
      automap: async (projDir, log) => {
        const configPath = path.join(projDir, "config_qanat.json");
        let config = readJsonFile(configPath) || {};
        config.timeline_map_epoch = Number(config.timeline_map_epoch || 0) + 1;
        const mapped = buildTimelineFromStoryboard(projDir, {
          remapping: true,
          rotateOffset: config.timeline_map_epoch,
        });
        config.timeline_assets = mapped.timelineAssets;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
        log(`[Pipeline] Timeline mapeada (${mapped.assetCount} assets no pool).`);
      },
      bgm: async (projDir, log) => {
        const config = readJsonFile(path.join(projDir, "config_qanat.json")) || {};
        const mode = config.aspect_ratio === "9:16" || config.video_format === "SHORTS" ? "SHORTS" : "LONGO";
        const token = getEpidemicSoundKey(projDir) || "";
        const logs = await runAutoSoundtrackLogic(projDir, token, mode);
        logs.forEach((line) => log(line));
      },
      mix: async (projDir, log) => {
        if (!fs.existsSync(path.join(projDir, "mix_bgm.py"))) {
          log("[Pipeline] mix_bgm.py ausente — pulando mix.");
          return;
        }
        await runPythonScript(PYTHON_PATH, projDir, "mix_bgm.py");
        log("[Pipeline] Mix BGM concluído.");
      },
      metadata: async (projDir, log) => {
        await generateYoutubeMetadataForProject(projDir);
        log("[Pipeline] Metadados YouTube gerados.");
      },
      thumbnails: async (projDir, log) => {
        const cachePath = path.join(projDir, "youtube_metadata_cache.json");
        if (!fs.existsSync(cachePath)) {
          log("[Pipeline] Sem cache de metadados — pulando thumbnails.");
          return;
        }
        const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
        const thumbs = cache?.parsed?.thumbnails || [];
        if (!thumbs.length) return;
        const result = await generateYoutubeThumbnailImages({
          projectDir: projDir,
          projectName: path.basename(projDir),
          thumbnails: thumbs,
          format: cache.format || "LONG",
          palette: cache.palette || [],
        });
        log(`[Pipeline] ${result.thumbnails?.length || 0} thumbnails geradas.`);
      },
    };
  }

  app.get("/api/workflow/scene-gaps", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const config = readJsonFile(path.join(projDir, "config_qanat.json")) || {};
      const storyboard = readJsonFile(path.join(projDir, "storyboard.json")) || {};
      res.json(analyzeSceneGaps(projDir, { config, storyboard }));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/stock/fetch-for-scenes", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { maxScenes = 12, onlyMissing = true } = req.body || {};
      const logs = [];
      const result = await fetchStockForScenes(projDir, {
        workspaceDir: WORKSPACE_DIR,
        maxScenes,
        onlyMissing,
        onLog: (msg) => logs.push(msg),
      });
      res.json({ ...result, logs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tts/generate-narration", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { voice, rate, engine } = req.body || {};
      const result = await generateNarrationTts(projDir, {
        voice: voice || "pt-BR-AntonioNeural",
        rate: rate || "+0%",
        platform: engine || "edge",
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/publish-prep", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const logs = [];
      const result = await runPublishPrep(projDir, {
        generateMetadata: generateYoutubeMetadataForProject,
        generateThumbnails: async (dir, metadata) => generateYoutubeThumbnailImages({
          projectDir: dir,
          projectName: path.basename(dir),
          thumbnails: metadata?.parsed?.thumbnails || [],
          format: metadata?.format || "LONG",
          palette: metadata?.palette || [],
        }),
        onLog: (msg) => logs.push(msg),
      });
      res.json({ ...result, logs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/creator/listicle-presets", (req, res) => {
    const format = req.query?.format === "LONGO" ? "LONGO" : "SHORTS";
    res.json({ presets: LISTICLE_WORKFLOW_PRESETS[format] || LISTICLE_WORKFLOW_PRESETS.SHORTS });
  });

  app.post("/api/creator/apply-preset", (req, res) => {
    try {
      const { presetId, format = "SHORTS" } = req.body || {};
      const list = LISTICLE_WORKFLOW_PRESETS[format] || LISTICLE_WORKFLOW_PRESETS.SHORTS;
      const preset = list.find((p) => p.id === presetId);
      if (!preset) return res.status(404).json({ error: "Preset não encontrado." });
      res.json({ applied: applyListiclePreset(preset, { format }) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/creator/run-pipeline", async (req, res) => {
    const projDir = getProjectDir(req);
    const stepsParam = req.query?.steps || "sync,stock,automap,bgm,mix,metadata,thumbnails";
    const steps = String(stepsParam).split(",").map((s) => s.trim()).filter(Boolean);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sendLog = (text) => {
      res.write(`data: ${JSON.stringify({ type: "log", text })}\n\n`);
    };

    try {
      const results = await runCreatorPipeline(projDir, {
        steps,
        handlers: buildCreatorPipelineHandlers(),
        onLog: sendLog,
      });
      res.write(`data: ${JSON.stringify({ type: "complete", results })}\n\n`);
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
    }
    res.end();
  });

  app.post("/api/ai/apply-bgm", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const config = readJsonFile(path.join(projDir, "config_qanat.json")) || {};
      const mode = config.aspect_ratio === "9:16" || config.video_format === "SHORTS" ? "SHORTS" : "LONGO";
      const token = getEpidemicSoundKey(projDir) || "";
      const logs = await runAutoSoundtrackLogic(projDir, token, mode);
      res.json({ success: true, logs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/workflow/save-keys", (req, res) => {
    try {
      const { pexels_api_key, pixabay_api_key, global = true } = req.body || {};
      const projDir = getProjectDir(req);

      if (global) {
        const globalPath = path.join(WORKSPACE_DIR, "dashboard-qanat", "backend", "render_config_global.json");
        let globalCfg = readJsonFile(globalPath) || {};
        if (typeof pexels_api_key === "string") globalCfg.pexels_api_key = pexels_api_key.trim();
        if (typeof pixabay_api_key === "string") globalCfg.pixabay_api_key = pixabay_api_key.trim();
        fs.writeFileSync(globalPath, JSON.stringify(globalCfg, null, 2), "utf8");
      } else {
        const configPath = path.join(projDir, "config_qanat.json");
        let config = readJsonFile(configPath) || {};
        if (typeof pexels_api_key === "string") config.pexels_api_key = pexels_api_key.trim();
        if (typeof pixabay_api_key === "string") config.pixabay_api_key = pixabay_api_key.trim();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      }

      res.json({ success: true, keys: getWorkflowApiKeys(WORKSPACE_DIR, projDir) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/workflow/keys-status", (req, res) => {
    const projDir = getProjectDir(req);
    const keys = getWorkflowApiKeys(WORKSPACE_DIR, projDir);
    res.json({
      pexels: !!keys.pexels,
      pixabay: !!keys.pixabay,
    });
  });

  return { generateYoutubeMetadataForProject, buildCreatorPipelineHandlers };
}