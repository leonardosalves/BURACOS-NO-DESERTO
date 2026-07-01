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
import { KOKORO_VOICES, KOKORO_DEFAULT_VOICE, KOKORO_DEFAULT_SPEED } from "./kokoroTts.js";
import {
  loadFishSpeechConfig,
  probeFishSpeechServer,
  buildFishSpeechVoiceList,
  previewFishSpeechVoice,
  FISH_SPEECH_DEFAULT_VOICE,
} from "./fishSpeechTts.js";
import {
  probeChatterbox,
  CHATTERBOX_VOICES,
  CHATTERBOX_DEFAULT_VOICE,
} from "./chatterboxTts.js";
import {
  loadVoiceboxConfig,
  probeVoiceboxServer,
  buildVoiceboxVoiceList,
} from "./voiceboxTts.js";
import { flattenWordTranscripts, realignTimelineAssetsToSpeech } from "./timelineSceneSync.js";
import {
  buildYoutubeMetadataPrompt,
  buildFallbackYoutubeMetadata,
  resolveYoutubeMetadataContext,
  YOUTUBE_METADATA_PIPELINE_VERSION,
} from "./youtubeMetadataOptimizer.js";
import { injectStudioAgentsContext } from "./studioAgents.js";
import {
  getComfyuiStatus,
  startComfyui,
  stopComfyui,
  runComfyuiInstall,
  runComfyuiModelDownload,
  queueLtxGeneration,
  getComfyuiHistory,
  getComfyuiProgress,
  resolveComfyuiOutputFile,
} from "./comfyuiService.js";
import {
  getComfyMcpDashboard,
  saveComfyCloudConfig,
  testComfyCloudConnection,
  getComfyCloudQueue,
  buildCursorMcpConfig,
  loadComfyCloudConfig,
} from "./comfyCloudMcp.js";
import { buildCapabilityMenu } from "./openmontageCapability.js";
import { analyzeReferenceVideo } from "./openmontageReference.js";
import { extractBrowserResponse } from "./geminiBrowser.js";
import { runClipFactory } from "./clipFactory.js";
import { searchArchiveOrg } from "./archiveOrgStock.js";

export function registerWorkflowRoutes(app, deps) {
  const {
    getProjectDir,
    WORKSPACE_DIR,
    PYTHON_PATH,
    getApiKeys,
    getXaiApiKey,
    getAiProvider,
    getOpenRouterApiKey,
    getNvidiaApiKey,
    getEpidemicSoundKey,
    buildProjectTranscript,
    buildTimelineFromStoryboard,
    enhanceYoutubeTitlesMetadata,
    callGeminiWithRetry,
    callGeminiLlm,
    generateMetadataWithXai,
    generateMetadataWithNvidia,
    generateYoutubeThumbnailImages,
    runAutoSoundtrackLogic,
    readJsonFile,
  } = deps;

  async function generateYoutubeMetadataForProject(projDir, ctx = {}) {
    const { req, res } = ctx;
    const apiKeys = getApiKeys(projDir);
    const xaiKey = getXaiApiKey(projDir);
    const aiProvider = getAiProvider(projDir);
    const nvidiaKey = getNvidiaApiKey ? getNvidiaApiKey(projDir) : null;

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

    let prompt = buildYoutubeMetadataPrompt({
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
    prompt = injectStudioAgentsContext(prompt, WORKSPACE_DIR, {
      niche,
      task: "metadata",
      format,
    });

    let text = "";
    let fallback = false;

    if (aiProvider === "nvidia" && nvidiaKey && generateMetadataWithNvidia) {
      text = await generateMetadataWithNvidia(prompt, nvidiaKey, format);
    } else if (aiProvider === "xai" && xaiKey) {
      text = await generateMetadataWithXai(prompt, xaiKey, format);
    } else if (req && res && callGeminiLlm) {
      try {
        const responseText = await callGeminiLlm(req, res, projDir, {
          title: "Metadados YouTube (SEO)",
          prompt,
          temperature: 0.55,
        });
        if (responseText == null) {
          const err = new Error("Gemini browser pending");
          err.geminiBrowserPending = true;
          throw err;
        }
        text = responseText;
      } catch (geminiErr) {
        if (geminiErr.geminiBrowserPending) throw geminiErr;
        if (nvidiaKey && generateMetadataWithNvidia) {
          text = await generateMetadataWithNvidia(prompt, nvidiaKey, format);
        } else if (xaiKey) {
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
    } else {
      try {
        text = await callGeminiWithRetry(apiKeys[0], prompt, { temperature: 0.55 });
      } catch (geminiErr) {
        if (nvidiaKey && generateMetadataWithNvidia) {
          text = await generateMetadataWithNvidia(prompt, nvidiaKey, format);
        } else if (xaiKey) {
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

  function persistRealignedTimeline(projDir, log = () => {}) {
    const configPath = path.join(projDir, "config_qanat.json");
    const storyboardPath = path.join(projDir, "storyboard.json");
    const timingsPath = path.join(projDir, "block_timings.json");
    const wordsPath = path.join(projDir, "word_transcripts.json");

    if (!fs.existsSync(configPath) || !fs.existsSync(timingsPath) || !fs.existsSync(wordsPath)) return;

    const config = readJsonFile(configPath) || {};
    if (!config.timeline_assets || !Object.keys(config.timeline_assets).length) return;

    const storyboard = readJsonFile(storyboardPath) || {};
    const timings = readJsonFile(timingsPath) || { starts: [], durations: [] };
    const flatTranscriptWords = flattenWordTranscripts(readJsonFile(wordsPath) || []);
    if (!flatTranscriptWords.length) return;

    config.timeline_assets = realignTimelineAssetsToSpeech({
      timelineAssets: config.timeline_assets,
      blockTimings: timings,
      flatTranscriptWords,
      visualPrompts: Array.isArray(storyboard.visual_prompts) ? storyboard.visual_prompts : [],
      blockPhrases: Array.isArray(config.block_phrases) ? config.block_phrases : [],
      preserveExplicitFixed: true,
    });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    log("[Pipeline] Timeline realinhada aos tempos dos blocos (anti-tela-preta).");
  }

  function buildCreatorPipelineHandlers() {
    return {
      sync: async (projDir, log) => {
        const narrationPath = path.join(projDir, "narracao_mestra_premium.mp3");
        if (!fs.existsSync(narrationPath)) {
          throw new Error(
            "narracao_mestra_premium.mp3 não encontrado. Gere a narração (TTS) antes de sincronizar com Whisper.",
          );
        }
        if (!fs.existsSync(path.join(projDir, "find_block_timings.py"))) {
          throw new Error("find_block_timings.py não encontrado no projeto.");
        }
        await runPythonScript(PYTHON_PATH, projDir, "find_block_timings.py");
        if (fs.existsSync(path.join(projDir, "align_transcripts.py"))) {
          await runPythonScript(PYTHON_PATH, projDir, "align_transcripts.py");
        }
        persistRealignedTimeline(projDir, log);
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
        const mapEpoch = Number(config.timeline_map_epoch || 0);
        const mapped = buildTimelineFromStoryboard(projDir, {
          remapping: true,
          rotateOffset: mapEpoch,
        });
        config.timeline_assets = mapped.timelineAssets;
        config.timeline_map_epoch = mapEpoch + 1;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
        persistRealignedTimeline(projDir, log);
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

  function normalizeImportedTranscript(raw) {
    let segments = null;
    if (Array.isArray(raw)) segments = raw;
    else if (raw && typeof raw === "object" && Array.isArray(raw.segments)) segments = raw.segments;
    else return null;

    if (
      segments.length > 0
      && Array.isArray(segments[0]?.words)
      && (segments[0].start_time !== undefined || segments[0].filename)
    ) {
      return segments;
    }

    return segments.map((seg, idx) => {
      const segStart = Number(seg.start ?? seg.start_time ?? 0);
      const segEnd = Number(seg.end ?? seg.end_time ?? segStart + Number(seg.duration || 0));
      const rawWords = Array.isArray(seg.words) ? seg.words : [];
      const wordsFormatted = rawWords.map((w, k) => {
        let wStart = Number(w.start ?? 0);
        let wEnd = Number(w.end ?? wStart);
        if (wStart >= segStart - 0.01) {
          wStart -= segStart;
          wEnd -= segStart;
        }
        let wText = String(w.word ?? w.text ?? "").trim();
        if (k > 0 && wText && !wText.startsWith(" ") && !wText.startsWith("-")) {
          wText = ` ${wText}`;
        }
        return {
          word: wText,
          start: Math.max(0, wStart),
          end: Math.max(0, wEnd),
        };
      });

      return {
        index: idx + 1,
        block: Number(seg.block) || 1,
        filename: seg.filename || `segment_${String(idx + 1).padStart(3, "0")}.mp3`,
        start_time: segStart,
        duration: Math.max(0.1, segEnd - segStart),
        end_time: segEnd,
        words: wordsFormatted,
        text: String(seg.text ?? "").trim(),
      };
    });
  }

  const sceneGapsCache = new Map();

  app.post("/api/workflow/import-transcript", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { transcript } = req.body || {};
      const normalized = normalizeImportedTranscript(transcript);
      if (!normalized?.length) {
        return res.status(400).json({
          error: "Formato JSON inválido. Envie um array de segmentos ou { segments: [...] }.",
        });
      }
      const wordsPath = path.join(projDir, "word_transcripts.json");
      fs.writeFileSync(wordsPath, JSON.stringify(normalized, null, 2), "utf8");
      const wordCount = flattenWordTranscripts(normalized).length;
      res.json({ ok: true, wordCount, segmentCount: normalized.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/workflow/scene-gaps", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const cacheKey = projDir;
      const cached = sceneGapsCache.get(cacheKey);
      if (cached && Date.now() - cached.at < 10000) {
        return res.json(cached.data);
      }
      const config = readJsonFile(path.join(projDir, "config_qanat.json")) || {};
      const storyboard = readJsonFile(path.join(projDir, "storyboard.json")) || {};
      const data = analyzeSceneGaps(projDir, { config, storyboard });
      sceneGapsCache.set(cacheKey, { at: Date.now(), data });
      res.json(data);
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

  app.get("/api/tts/voices", async (_req, res) => {
    try {
      const fishConfig = loadFishSpeechConfig({ workspaceDir: WORKSPACE_DIR });
      const fishProbe = await probeFishSpeechServer(fishConfig);
      const fishVoices = buildFishSpeechVoiceList(fishProbe);
      const chatterboxProbe = await probeChatterbox();
      const voiceboxConfig = loadVoiceboxConfig({ workspaceDir: WORKSPACE_DIR });
      const voiceboxProbe = await probeVoiceboxServer(voiceboxConfig);
      const voiceboxVoices = buildVoiceboxVoiceList(voiceboxProbe);

      res.json({
        engines: [
          {
            id: "kokoro",
            label: "Kokoro (local, grátis)",
            defaultVoice: KOKORO_DEFAULT_VOICE,
            defaultSpeed: KOKORO_DEFAULT_SPEED,
            voices: KOKORO_VOICES,
          },
          {
            id: "chatterbox",
            label: "Chatterbox (local, GPU)",
            defaultVoice: CHATTERBOX_DEFAULT_VOICE,
            voices: CHATTERBOX_VOICES,
            available: chatterboxProbe.ok,
            hint: chatterboxProbe.ok
              ? `Pacote OK — device: ${chatterboxProbe.device || "auto"}. Clone opcional via reference_audio no config.`
              : `Indisponível: ${chatterboxProbe.error || "pip install chatterbox-tts"}`,
          },
          {
            id: "voicebox",
            label: "Voicebox (clone local)",
            defaultVoice: voiceboxProbe.defaultProfileId || voiceboxVoices[0]?.id || "",
            voices: voiceboxVoices,
            available: voiceboxProbe.ok,
            serverUrl: voiceboxProbe.baseUrl,
            hint: voiceboxProbe.ok
              ? `7 engines (Qwen, Chatterbox, Kokoro…) · GPU: ${voiceboxProbe.gpuAvailable ? "sim" : "CPU"} · perfil=${voiceboxVoices[0]?.label || "—"}`
              : (voiceboxProbe.error || "Offline: instale Voicebox (MSI) ou .\\scripts\\start-voicebox.ps1"),
          },
          {
            id: "fish",
            label: "Fish Speech S2",
            defaultVoice: fishProbe.defaultReferenceId || FISH_SPEECH_DEFAULT_VOICE,
            voices: fishVoices,
            available: fishProbe.ok,
            mode: fishProbe.mode || "local",
            serverUrl: fishProbe.baseUrl,
            cloudModel: fishConfig.fish_speech?.cloud_model || fishConfig.fish_speech?.cloudModel || "s2.1-pro-free",
            hint: fishProbe.ok
              ? (fishProbe.mode === "cloud"
                ? `Fish Audio API (cloud) · ${fishConfig.fish_speech?.cloud_model || fishConfig.fish_speech?.cloudModel || "s2.1-pro-free"} · ${fishProbe.modelCount || fishProbe.references?.length || 0} voz(es) — tags [pausa], [ênfase]`
                : "Servidor local ativo — tags inline [pausa], [ênfase]")
              : (fishProbe.error || "Offline: .\\scripts\\start-fish-speech.ps1 ou fish_speech.api_key no config"),
          },
          {
            id: "edge",
            label: "Edge TTS (Microsoft)",
            defaultVoice: "pt-BR-AntonioNeural",
            voices: [
              { id: "pt-BR-AntonioNeural", label: "Antonio — PT-BR masculino", group: "pt" },
              { id: "pt-BR-FranciscaNeural", label: "Francisca — PT-BR feminino", group: "pt" },
              { id: "en-US-RogerNeural", label: "Roger — EN grave", group: "en" },
              { id: "en-US-ChristopherNeural", label: "Christopher — EN maduro", group: "en" },
              { id: "en-US-GuyNeural", label: "Guy — EN seco", group: "en" },
            ],
          },
        ],
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tts/fish-preview", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { voice, sampleText, narrativeScript, fish } = req.body || {};
      const fishConfig = loadFishSpeechConfig({ workspaceDir: WORKSPACE_DIR, projectDir: projDir });
      const result = await previewFishSpeechVoice({
        voice,
        sampleText,
        narrativeScript,
        config: fishConfig,
        fishOptions: fish && typeof fish === "object" ? fish : {},
      });
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("X-Fish-Sample-Text", encodeURIComponent(result.sampleText || ""));
      res.setHeader("X-Fish-Voice-Id", String(result.referenceId || voice || FISH_SPEECH_DEFAULT_VOICE));
      res.send(result.buffer);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tts/generate-narration", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { voice, rate, pitch, speed, engine, ttsOptions } = req.body || {};
      const result = await generateNarrationTts(projDir, {
        voice,
        rate: rate || "+0%",
        pitch: pitch || "+0Hz",
        speed,
        platform: engine || "kokoro",
        workspaceDir: WORKSPACE_DIR,
        ttsOptions: ttsOptions && typeof ttsOptions === "object" ? ttsOptions : {},
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
        generateMetadata: (dir) => generateYoutubeMetadataForProject(dir, { req, res }),
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
      if (err?.geminiBrowserPending) return;
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

  app.get("/api/workflow/capability-menu", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const menu = await buildCapabilityMenu({
        workspaceDir: WORKSPACE_DIR,
        projDir,
        getApiKeys,
        getAiProvider,
        getXaiApiKey,
        getOpenRouterApiKey,
        getNvidiaApiKey,
        getEpidemicSoundKey,
      });
      res.json({ ok: true, ...menu });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/workflow/analyze-reference", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const {
        url = "",
        format: formatRaw = "SHORTS",
        niche = "",
        topic = "",
        useAi = true,
      } = req.body || {};

      const format = String(formatRaw || "SHORTS").toUpperCase() === "LONGO" ||
        String(formatRaw || "").toUpperCase() === "LONG"
        ? "LONGO"
        : "SHORTS";

      const browserText = extractBrowserResponse(req.body);
      let llmFn = null;

      if (browserText) {
        llmFn = async () => browserText;
      } else if (useAi && callGeminiLlm) {
        let browserPending = false;
        llmFn = async (prompt) => {
          const text = await callGeminiLlm(req, res, projDir, {
            title: "OpenMontage · Análise de referência",
            prompt,
            temperature: 0.45,
          });
          if (text == null) {
            browserPending = true;
            return "";
          }
          return text;
        };
      }

      const result = await analyzeReferenceVideo({
        url,
        format,
        niche,
        topic,
        llmFn,
      });

      if (llmFn && !res.headersSent && result.ok) {
        /* browser pending handled inside callGeminiLlm */
      }

      if (!result.ok) {
        return res.status(400).json({ error: result.error || "Falha na análise" });
      }

      if (!res.headersSent) {
        res.json(result);
      }
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  app.post("/api/workflow/clip-factory", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { enqueue = true } = req.body || {};
      const result = runClipFactory(WORKSPACE_DIR, projDir, { enqueue: enqueue !== false });
      if (!result.ok) {
        return res.status(400).json({ error: result.error || "Clip Factory falhou" });
      }
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/workflow/archive-search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) return res.status(400).json({ error: "Informe q=termo de busca" });
      const preferVideo = req.query.video === "1";
      const hits = await searchArchiveOrg(q, { rows: 10, preferVideo });
      res.json({ ok: true, query: q, hits });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/comfyui/status", async (req, res) => {
    try {
      const status = await getComfyuiStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/comfyui/install", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const send = (type, payload) => res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    try {
      send("log", { text: "Iniciando instalação ComfyUI + LTX..." });
      await runComfyuiInstall((text) => send("log", { text: text.trim() }));
      send("complete", { message: "ComfyUI instalado. Baixe os modelos LTX em seguida." });
    } catch (err) {
      send("error", { message: err.message });
    }
    res.end();
  });

  app.post("/api/comfyui/download-models", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const send = (type, payload) => res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    try {
      send("log", { text: "Baixando modelos LTX (~18 GB). Pode demorar..." });
      const result = await runComfyuiModelDownload((text) => send("log", { text: text.trim() }));
      send("complete", { message: "Modelos prontos.", models: result.models });
    } catch (err) {
      send("error", { message: err.message });
    }
    res.end();
  });

  app.post("/api/comfyui/start", async (req, res) => {
    try {
      const result = await startComfyui();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/comfyui/stop", (req, res) => {
    res.json(stopComfyui());
  });

  app.post("/api/comfyui/generate", async (req, res) => {
    try {
      const {
        prompt,
        width,
        height,
        frames,
        duration_seconds,
        fps,
        mode,
        format,
        codec,
        filename_prefix,
        aspect_ratio,
        model_gguf,
        lora,
        lora_strength,
        upscale,
      } = req.body || {};
      if (!prompt || !String(prompt).trim()) {
        return res.status(400).json({ error: "Prompt obrigatório." });
      }
      const result = await queueLtxGeneration({
        prompt: String(prompt).trim(),
        width,
        height,
        frames,
        duration_seconds,
        fps,
        mode: mode === "i2v" ? "i2v" : "t2v",
        format,
        codec,
        filename_prefix,
        aspect_ratio,
        model_gguf,
        lora,
        lora_strength,
        upscale,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/comfyui/output", (req, res) => {
    try {
      const filename = String(req.query.filename || "");
      const subfolder = String(req.query.subfolder || "");
      const filePath = resolveComfyuiOutputFile({ filename, subfolder });
      if (!filePath) return res.status(404).json({ error: "Arquivo não encontrado." });
      res.sendFile(filePath);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/comfyui/progress/:promptId", (req, res) => {
    try {
      res.json(getComfyuiProgress(req.params.promptId));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/comfyui/history/:promptId", async (req, res) => {
    try {
      const data = await getComfyuiHistory(req.params.promptId);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/comfy-mcp/status", async (req, res) => {
    try {
      let localStatus = null;
      try {
        localStatus = await getComfyuiStatus();
      } catch {
        /* non-blocking */
      }
      res.json(await getComfyMcpDashboard(WORKSPACE_DIR, { localStatus }));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/comfy-mcp/config", (req, res) => {
    try {
      const config = saveComfyCloudConfig(WORKSPACE_DIR, req.body || {});
      res.json({ ok: true, config });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/comfy-mcp/test", async (req, res) => {
    try {
      const bodyKey = String(req.body?.api_key || "").trim();
      const cfg = loadComfyCloudConfig(WORKSPACE_DIR);
      const apiKey = bodyKey || cfg.api_key;
      const result = await testComfyCloudConnection(apiKey);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(err.status === 401 ? 401 : 500).json({ error: err.message, details: err.data });
    }
  });

  app.get("/api/comfy-mcp/queue", async (req, res) => {
    try {
      const cfg = loadComfyCloudConfig(WORKSPACE_DIR);
      if (!cfg.api_key) return res.status(400).json({ error: "API key não configurada" });
      const queue = await getComfyCloudQueue(cfg.api_key);
      res.json(queue);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/comfy-mcp/cursor-config", (req, res) => {
    try {
      const cfg = loadComfyCloudConfig(WORKSPACE_DIR);
      res.json(buildCursorMcpConfig(cfg, WORKSPACE_DIR));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return { generateYoutubeMetadataForProject, buildCreatorPipelineHandlers };
}