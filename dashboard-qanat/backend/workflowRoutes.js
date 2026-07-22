/**
 * Rotas de workflow: stock, TTS, gaps, publish-prep, creator pipeline, presets, BGM.
 */

import fs from "fs";
import { writeJsonAtomicSync } from "./shared/atomicJson.js";
import {
  applyTtsDefaultsToEngines,
  readTtsDefaultVoices,
  saveTtsDefaultVoice,
} from "./ttsPreferences.js";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { applyNarrationSyncToProject } from "./timelineStudioMigration.js";
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
  KOKORO_VOICES,
  KOKORO_DEFAULT_VOICE,
  KOKORO_DEFAULT_SPEED,
} from "./kokoroTts.js";
import {
  loadFishSpeechConfig,
  probeFishSpeechServer,
  buildFishSpeechVoiceList,
  previewFishSpeechVoice,
  buildFishSpeechRequestBody,
  resolveFishSpeechConfig,
  FISH_SPEECH_DEFAULT_VOICE,
} from "./fishSpeechTts.js";
import {
  probeChatterbox,
  CHATTERBOX_VOICES,
  CHATTERBOX_DEFAULT_VOICE,
} from "./chatterboxTts.js";
import {
  probeQwen3Tts,
  prepareQwen3ExpressiveNarration,
  QWEN3_TTS_VOICES,
  QWEN3_TTS_DEFAULT_VOICE,
} from "./qwen3Tts.js";
import {
  loadVoiceboxConfig,
  probeVoiceboxServer,
  buildVoiceboxVoiceList,
  buildVoiceboxStatusHint,
  prepareVoiceboxExpressiveText,
  synthesizeVoiceboxNarration,
} from "./voiceboxTts.js";
import {
  buildHumorIdeasPrompt,
  buildHumorNarrationPrompt,
  buildHumorProductionPrompt,
  filterNovelHumorIdeas,
  parseHumorIdeasResponse,
  parseHumorNarrationResponse,
  parseHumorProductionResponse,
} from "./humorFacts.js";
import {
  splitCollageLines,
  buildCollageMetaphorPrompt,
  parseCollageMetaphorResponse,
  buildVisualSpec,
  buildImagegenPrompt,
  buildOmniPrompt,
  buildOmniJob,
  buildDualFrameSpec,
  buildEndFrameImagePrompt,
  buildStartFrameImagePrompt,
  buildMotionPrompt,
  canRunGate3,
  buildGoogleFlowExport,
  COLLAGE_PALETTE,
  GEO_COLLAGE_PALETTE,
  normalizeCollageMode,
  normalizeEditorialCardSpec,
} from "./collageBroll.js";
import {
  buildSemanticDirectorPrompt,
  parseSemanticDirectorResponse,
  analyzeScriptLocally,
  analyzeLineLocally,
  FIDELITY_LEVELS,
  GEO_SUBDOMAIN_PRESETS,
  QUICK_FIXES,
  REJECTION_REASONS,
  EDIT_SCOPES,
  buildCardRegenerationPrompt,
  parseCardRegenerationResponse,
  listPreservableElements,
  snapshotCardVersion,
  summarizeCardChanges,
  validateVisualProposal,
} from "./collageSemanticDirector.js";
import {
  loadCollageSession,
  saveCollageSession,
  rejectCollageCard,
} from "./collageBrollSession.js";
import { getProjectsDirs } from "./projectsRoot.js";
import {
  produceCollageStill,
  produceEndFrame,
  produceStartFrame,
  produceCollageVideo,
  resolveCollageMediaFile,
  exportGoogleFlowPackage,
  cardOutputDir,
  ensureCardDir,
  mediaUrl,
} from "./collageBrollMedia.js";
import {
  appendIdeasHistory,
  buildIdeasExclusionAddendum,
  buildIdeasFreshnessInstruction,
  collectProjectTopics,
  loadIdeasHistory,
  makeIdeasGenerationSeed,
  mergeExclusionTopics,
} from "./ideasVariety.js";
import {
  loadGptSovitsConfig,
  probeGptSovitsServer,
  buildGptSovitsVoiceList,
  buildGptSovitsStatusHint,
  previewGptSovitsVoice,
  GPT_SOVITS_DEFAULT_VOICE,
} from "./gptSovitsTts.js";
import {
  createProgressReporter,
  normalizeJobId,
  finishJobProgress,
  finishJobProgressWithResult,
  failJobProgress,
  setJobProgress,
} from "./aiJobProgress.js";
import {
  flattenWordTranscripts,
  syncProjectTimelineAfterWhisper,
  applyWhisperDurationsToStoryboard,
} from "./timelineSceneSync.js";
import {
  assertNarrationPlanMatchesSource,
  generateNarrationChunksTts,
  assembleNarrationChunksToMaster,
  isFullNarrationChunkBatch,
  allNarrationChunksHaveAudio,
  persistChunkPlanToProject,
  writeTimingsFromChunkPlan,
  formatNarrationChunkPlanLog,
  applyChunkedNarrationSyncToProject,
  applyChunkedTimelineAfterWhisper,
  isChunkedNarrationProject,
  NARRATION_MODE_CHUNKED,
} from "./narrationChunks.js";
import {
  appendNarrationAuditEvent,
  assertNarrationChunksApproved,
  readNarrationAudit,
} from "./narrationAudit.js";
import {
  appendProjectEventLog,
  summarizeTimelineAssets,
} from "./projectEventLog.js";
import {
  convertCinematicMarkersForTts,
  sanitizeNarrationChunkTaggedText,
} from "./videoProEnhancements.js";
import {
  buildYoutubeMetadataPrompt,
  buildFallbackYoutubeMetadata,
  resolveYoutubeMetadataContext,
  YOUTUBE_METADATA_PIPELINE_VERSION,
} from "./youtubeMetadataOptimizer.js";
import { injectStudioAgentsContext } from "./studioAgents.js";
import {
  getExternalJobProgress,
  resolveExternalJobOutput,
} from "./externalJobRegistry.js";
import { queueMobileWanGeneration } from "./mobilewanService.js";
import { buildCapabilityMenu } from "./openmontageCapability.js";
import { analyzeReferenceVideo } from "./openmontageReference.js";
import { extractBrowserResponse } from "./geminiBrowser.js";
import { runClipFactory } from "./clipFactory.js";
import { searchArchiveOrg } from "./archiveOrgStock.js";
import { searchBingImages, searchBingVideos } from "./bingImageStock.js";
import {
  listDubSourceVideos,
  analyzeDubProject,
  runLumieraDub,
  DUB_TARGET_LANGUAGES,
} from "./lumieraDub.js";

export function registerWorkflowRoutes(app, deps) {
  const {
    getProjectDir,
    WORKSPACE_DIR,
    PROJECTS_ROOT,
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
    let transcript = fs.existsSync(transcriptPath)
      ? fs.readFileSync(transcriptPath, "utf8")
      : "";
    let storyboard = readJsonFile(storyboardPath) || {};

    transcript = buildProjectTranscript({ transcript, config, storyboard });
    if (!transcript)
      throw new Error("Roteiro não encontrado para gerar metadados.");

    const projectName = path.basename(projDir);
    const metadataCtx = resolveYoutubeMetadataContext({
      config,
      timings,
      storyboard,
      projectName,
    });
    const {
      format,
      niche,
      totalDuration,
      chaptersText,
      category,
      profile,
      rpmHint,
    } = metadataCtx;

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
        text = await callGeminiWithRetry(apiKeys[0], prompt, {
          temperature: 0.55,
        });
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

    writeJsonAtomicSync(path.join(projDir, "youtube_metadata_cache.json"), {
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
    });

    return payload;
  }

  function persistRealignedTimeline(projDir, log = () => {}) {
    const configPath = path.join(projDir, "config_qanat.json");
    const storyboardPath = path.join(projDir, "storyboard.json");
    const timingsPath = path.join(projDir, "block_timings.json");
    const wordsPath = path.join(projDir, "word_transcripts.json");

    if (
      !fs.existsSync(configPath) ||
      !fs.existsSync(timingsPath) ||
      !fs.existsSync(wordsPath)
    )
      return;

    const config = readJsonFile(configPath) || {};
    if (!config.timeline_assets || !Object.keys(config.timeline_assets).length)
      return;

    const storyboard = readJsonFile(storyboardPath) || {};
    const timings = readJsonFile(timingsPath) || { starts: [], durations: [] };
    const wordTranscripts = readJsonFile(wordsPath) || [];
    const flatTranscriptWords = flattenWordTranscripts(wordTranscripts);
    if (!flatTranscriptWords.length) return;

    const chunkedApplied = applyChunkedTimelineAfterWhisper(projDir, {
      config,
      storyboard,
      wordTranscripts,
      flatWords: flatTranscriptWords,
    });
    if (chunkedApplied) {
      log(
        "[Pipeline] Narração por trechos: block_timings e timeline pelo plano de chunks (Whisper só para palavras)."
      );
      return;
    }

    const synced = syncProjectTimelineAfterWhisper({
      timelineAssets: config.timeline_assets || {},
      blockTimings: timings,
      wordTranscripts,
      flatTranscriptWords,
      visualPrompts: Array.isArray(storyboard.visual_prompts)
        ? storyboard.visual_prompts
        : [],
      blockPhrases: Array.isArray(config.block_phrases)
        ? config.block_phrases
        : [],
      preserveExplicitFixed: false,
    });
    config.timeline_assets = synced.timelineAssets;
    writeJsonAtomicSync(configPath, config);
    writeJsonAtomicSync(timingsPath, synced.blockTimings);
    if (fs.existsSync(storyboardPath)) {
      const storyboardNext = applyWhisperDurationsToStoryboard(
        storyboard,
        wordTranscripts,
        {
          flatTranscriptWords,
          blockTimings: synced.blockTimings,
        }
      );
      writeJsonAtomicSync(storyboardPath, storyboardNext);
    }
    log(
      "[Pipeline] Timeline com segundos da voz (Whisper). Mídia: manual ou auto-map no Workflow."
    );
  }

  function buildCreatorPipelineHandlers() {
    return {
      sync: async (projDir, log) => {
        const narrationPath = path.join(projDir, "narracao_mestra_premium.mp3");
        if (!fs.existsSync(narrationPath)) {
          throw new Error(
            "narracao_mestra_premium.mp3 não encontrado. Gere a narração (TTS) antes de sincronizar com Whisper."
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
        writeJsonAtomicSync(configPath, config);
        persistRealignedTimeline(projDir, log);
        log(
          `[Pipeline] Timeline mapeada (${mapped.assetCount} assets no pool).`
        );
      },
      bgm: async (projDir, log) => {
        const config =
          readJsonFile(path.join(projDir, "config_qanat.json")) || {};
        const mode =
          config.aspect_ratio === "9:16" || config.video_format === "SHORTS"
            ? "SHORTS"
            : "LONGO";
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
    else if (raw && typeof raw === "object" && Array.isArray(raw.segments))
      segments = raw.segments;
    else return null;

    if (
      segments.length > 0 &&
      Array.isArray(segments[0]?.words) &&
      (segments[0].start_time !== undefined || segments[0].filename)
    ) {
      return segments;
    }

    return segments.map((seg, idx) => {
      const segStart = Number(seg.start ?? seg.start_time ?? 0);
      const segEnd = Number(
        seg.end ?? seg.end_time ?? segStart + Number(seg.duration || 0)
      );
      const rawWords = Array.isArray(seg.words) ? seg.words : [];
      const wordsFormatted = rawWords.map((w, k) => {
        let wStart = Number(w.start ?? 0);
        let wEnd = Number(w.end ?? wStart);
        if (wStart >= segStart - 0.01) {
          wStart -= segStart;
          wEnd -= segStart;
        }
        let wText = String(w.word ?? w.text ?? "").trim();
        if (
          k > 0 &&
          wText &&
          !wText.startsWith(" ") &&
          !wText.startsWith("-")
        ) {
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
        filename:
          seg.filename || `segment_${String(idx + 1).padStart(3, "0")}.mp3`,
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
          error:
            "Formato JSON inválido. Envie um array de segmentos ou { segments: [...] }.",
        });
      }
      const wordsPath = path.join(projDir, "word_transcripts.json");
      writeJsonAtomicSync(wordsPath, normalized);
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
      const config =
        readJsonFile(path.join(projDir, "config_qanat.json")) || {};
      const storyboard =
        readJsonFile(path.join(projDir, "storyboard.json")) || {};
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

  app.get("/api/collage-broll/meta", (_req, res) => {
    res.json({
      repo: "https://github.com/pyang5166/gbro-collage-broll",
      skill: "gbro-collage-broll",
      default_model: "gemini-omni-flash-preview",
      delivery: {
        aspect_ratio: "9:16",
        duration_s: 5,
        resolution: "720x1280",
        fps: 24,
        audio: false,
      },
      modes: [
        {
          id: "editorial",
          label: "Editorial",
          hint: "Metáforas abstratas (relógio, espelho, arquivo…)",
        },
        {
          id: "geo",
          label: "Geo / Mapas",
          hint: "Territórios, rotas, contornos, cartografia em papel · Semantic Visual Director",
        },
      ],
      fidelity_levels: FIDELITY_LEVELS,
      subdomain_presets: GEO_SUBDOMAIN_PRESETS,
      quick_fixes: QUICK_FIXES,
      rejection_reasons: REJECTION_REASONS,
      edit_scopes: EDIT_SCOPES,
      palette: COLLAGE_PALETTE,
      geo_palette: GEO_COLLAGE_PALETTE,
      gates: [
        { id: 1, name: "Proposta visual", cost: "LLM + validação semântica" },
        { id: 2, name: "Still", cost: "imagegen" },
        { id: 3, name: "Vídeo", cost: "Omni Flash" },
      ],
      semantic_director: true,
      card_regeneration: true,
    });
  });

  app.post("/api/collage-broll/metaphors", async (req, res) => {
    try {
      const provider = getAiProvider(WORKSPACE_DIR);
      const apiKey = getApiKeys(WORKSPACE_DIR)[0] || "";
      if (provider === "gemini" && !apiKey) {
        throw new Error(
          "Configure uma chave Gemini ou outro provedor em Configurações → IA."
        );
      }
      if (
        provider === "openrouter" &&
        getOpenRouterApiKey &&
        !getOpenRouterApiKey(WORKSPACE_DIR)
      ) {
        throw new Error("Configure OpenRouter em Configurações → IA.");
      }
      if (
        provider === "nvidia" &&
        getNvidiaApiKey &&
        !getNvidiaApiKey(WORKSPACE_DIR)
      ) {
        throw new Error("Configure NVIDIA em Configurações → IA.");
      }

      const lines = splitCollageLines(req.body?.text || req.body?.lines || "");
      if (!lines.length) {
        throw new Error("Informe ao menos uma linha de narração (~5s).");
      }
      if (lines.length > 12) {
        throw new Error("Máximo 12 linhas por lote no Gate 1.");
      }

      const mode = normalizeCollageMode(req.body?.mode || "editorial");
      const placeHint = String(
        req.body?.place || req.body?.location || req.body?.place_hint || ""
      ).trim();
      const countryHint = String(
        req.body?.country || req.body?.country_hint || ""
      ).trim();
      const eraHint = String(req.body?.era || req.body?.era_hint || "").trim();
      const fidelityRaw = String(req.body?.fidelity || "balanced")
        .trim()
        .toLowerCase();
      const fidelity = FIDELITY_LEVELS.includes(fidelityRaw)
        ? fidelityRaw
        : "balanced";
      const subdomainPreset = String(
        req.body?.subdomain || req.body?.subdomain_preset || "auto"
      )
        .trim()
        .toLowerCase();

      // Geo (e fidelity explícita) usam Semantic Visual Director
      const useDirector =
        mode === "geo" ||
        req.body?.semantic_director === true ||
        req.body?.use_semantic_director === true;

      let raw;
      let parsed;

      if (useDirector) {
        const prompt = buildSemanticDirectorPrompt(lines, {
          language: req.body?.language || "pt",
          fidelity,
          subdomainPreset: GEO_SUBDOMAIN_PRESETS.includes(subdomainPreset)
            ? subdomainPreset
            : "auto",
          placeHint,
          countryHint,
          eraHint,
        });
        const llmOpts = {
          projectDir: WORKSPACE_DIR,
          temperature: 0.55,
          maxTokens: 8192,
          activityLabel: "Collage B-roll · Semantic Visual Director",
          activityDetail: `${lines.length} linha(s) · ${mode} · ${fidelity}`,
        };
        if (provider === "gemini") {
          llmOpts.models = [
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
          ];
        }
        raw = await callGeminiWithRetry(apiKey, prompt, llmOpts);
        parsed = parseSemanticDirectorResponse(raw, lines, {
          mode: "geo",
          fidelity,
        });
      } else {
        const prompt = buildCollageMetaphorPrompt(lines, {
          language: req.body?.language || "pt",
          mode,
          placeHint,
          countryHint,
          eraHint,
        });
        const llmOpts = {
          projectDir: WORKSPACE_DIR,
          temperature: 0.75,
          activityLabel: "Collage B-roll · Gate 1 metáforas",
          activityDetail: `${lines.length} linha(s) · ${mode}`,
        };
        if (provider === "gemini") {
          llmOpts.models = [
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
          ];
        }
        raw = await callGeminiWithRetry(apiKey, prompt, llmOpts);
        parsed = parseCollageMetaphorResponse(raw, lines, { mode });
        // Envelope mínimo compatível
        parsed = {
          scriptAnalysis: analyzeScriptLocally(lines),
          lineAnalysis: lines.map((l, i) => analyzeLineLocally(l, i)),
          items: parsed.items,
          visualMemory: null,
          fidelity,
          mode,
        };
      }

      const runId = req.body?.generationRunId || `run_${Date.now()}`;
      const inputHash = req.body?.inputHash || "";

      const mappedItems = parsed.items.map((item, index) => {
        const spec = normalizeEditorialCardSpec(
          item,
          index,
          lines[index] || item.line || "",
          mode
        );
        return {
          ...item,
          ...spec,
          generationRunId: runId,
          inputHash: inputHash,
          sourceLineIndex: index,
          visual_spec: spec,
        };
      });

      res.json({
        ok: true,
        provider,
        mode: parsed.mode || mode,
        fidelity,
        count: mappedItems.length,
        generationRunId: runId,
        inputHash: inputHash,
        items: mappedItems,
        scriptAnalysis: parsed.scriptAnalysis || null,
        lineAnalysis: parsed.lineAnalysis || null,
        visualMemory: parsed.visualMemory || null,
        semantic_director: useDirector,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Cache curto de idempotência para regeneração de card (evita double-click)
  const regenIdempotency = new Map();
  const REGEN_TTL_MS = 90_000;

  /**
   * Regenera UM card do Gate 1 sem reexecutar o lote.
   * POST body (ou :cardId na rota): cardId, currentItem, fullScript, ...
   * Não persiste no servidor — devolve candidateVersion para o cliente comparar.
   */
  const handleCollageCardRegenerate = async (req, res) => {
    try {
      const provider = getAiProvider(WORKSPACE_DIR);
      const apiKey = getApiKeys(WORKSPACE_DIR)[0] || "";
      if (provider === "gemini" && !apiKey) {
        throw new Error(
          "Configure uma chave Gemini ou outro provedor em Configurações → IA."
        );
      }

      const cardId = String(
        req.params?.cardId || req.body?.cardId || req.body?.id || ""
      ).trim();
      const currentItem =
        req.body?.currentItem ||
        req.body?.currentVersion ||
        req.body?.item ||
        null;
      if (!currentItem || typeof currentItem !== "object") {
        throw new Error(
          "Envie currentItem com a proposta atual do card a regenerar."
        );
      }
      const resolvedId = cardId || String(currentItem.id || "").trim();
      if (!resolvedId) {
        throw new Error("cardId obrigatório.");
      }

      const idempotencyKey = String(
        req.body?.idempotencyKey || req.headers["x-idempotency-key"] || ""
      ).trim();
      if (idempotencyKey) {
        const hit = regenIdempotency.get(idempotencyKey);
        if (hit && Date.now() - hit.ts < REGEN_TTL_MS) {
          return res.json({ ...hit.payload, idempotentReplay: true });
        }
      }

      const fullScript = Array.isArray(req.body?.fullScript)
        ? req.body.fullScript.map(String)
        : splitCollageLines(req.body?.text || req.body?.lines || "");
      const currentLine = String(
        req.body?.currentLine || currentItem.line || ""
      ).trim();
      if (!currentLine) {
        throw new Error("currentLine / currentItem.line obrigatório.");
      }

      const mode = normalizeCollageMode(
        req.body?.mode || currentItem.mode || "editorial"
      );
      const fidelityRaw = String(req.body?.fidelity || "balanced")
        .trim()
        .toLowerCase();
      const fidelity = FIDELITY_LEVELS.includes(fidelityRaw)
        ? fidelityRaw
        : "balanced";
      const editScopeRaw = String(req.body?.editScope || "all").trim();
      const editScope = EDIT_SCOPES.includes(editScopeRaw)
        ? editScopeRaw
        : "all";

      const quickFixes = Array.isArray(req.body?.quickFixes)
        ? req.body.quickFixes.map(String)
        : [];
      const rejectionReasons = Array.isArray(req.body?.rejectionReasons)
        ? req.body.rejectionReasons.map(String)
        : [];
      const preserveElements = Array.isArray(req.body?.preserveElements)
        ? req.body.preserveElements.map(String)
        : listPreservableElements(currentItem).slice(0, 8);
      const replaceElements = Array.isArray(req.body?.replaceElements)
        ? req.body.replaceElements.map(String)
        : [];
      const customInstruction = String(
        req.body?.instruction || req.body?.customInstruction || ""
      ).trim();

      const scriptLines = fullScript.length > 0 ? fullScript : [currentLine];
      const idx = scriptLines.findIndex((l) => l.trim() === currentLine.trim());
      const previousLine =
        String(req.body?.previousLine || "").trim() ||
        (idx > 0 ? scriptLines[idx - 1] : "");
      const nextLine =
        String(req.body?.nextLine || "").trim() ||
        (idx >= 0 && idx < scriptLines.length - 1 ? scriptLines[idx + 1] : "");

      const globalContext =
        req.body?.scriptAnalysis ||
        req.body?.globalContext ||
        analyzeScriptLocally(scriptLines);

      const prompt = buildCardRegenerationPrompt({
        fullScript: scriptLines,
        previousLine,
        currentLine,
        nextLine,
        globalContext,
        currentProposal: { ...currentItem, id: resolvedId, line: currentLine },
        currentValidation: currentItem.validation || {},
        selectedQuickFixes: quickFixes,
        customInstruction,
        rejectionReasons,
        preserveElements,
        replaceElements,
        editScope,
        mode,
        fidelity,
        placeHint: String(req.body?.place || req.body?.place_hint || "").trim(),
        countryHint: String(
          req.body?.country || req.body?.country_hint || ""
        ).trim(),
        eraHint: String(req.body?.era || req.body?.era_hint || "").trim(),
        language: req.body?.language || "pt",
      });

      const llmOpts = {
        projectDir: WORKSPACE_DIR,
        temperature: 0.5,
        maxTokens: 4096,
        activityLabel: "Collage B-roll · regenerar card",
        activityDetail: `${resolvedId} · ${mode} · ${editScope}`,
      };
      if (provider === "gemini") {
        llmOpts.models = [
          "gemini-3.5-flash",
          "gemini-2.5-flash",
          "gemini-2.0-flash",
        ];
      }
      const raw = await callGeminiWithRetry(apiKey, prompt, llmOpts);
      const parsed = parseCardRegenerationResponse(raw, {
        currentItem: { ...currentItem, id: resolvedId },
        currentLine,
        mode,
        fidelity,
        preserveElements,
      });

      const payload = {
        ok: true,
        provider,
        cardId: resolvedId,
        previousVersion: parsed.previousVersion,
        candidateVersion: {
          ...parsed.candidateVersion,
          ...normalizeEditorialCardSpec(
            parsed.candidateVersion,
            Number(currentItem.sourceLineIndex) || 0,
            currentLine,
            mode
          ),
          id: resolvedId,
          status: "pending",
          generationRunId: currentItem.generationRunId,
          inputHash: currentItem.inputHash,
          sourceLineIndex: currentItem.sourceLineIndex,
          visual_spec: normalizeEditorialCardSpec(
            parsed.candidateVersion,
            Number(currentItem.sourceLineIndex) || 0,
            currentLine,
            mode
          ),
        },
        validation: parsed.validation,
        changes: parsed.changes,
        scoreDiffs: parsed.scoreDiffs,
        warnings: parsed.warnings,
        costNote: "Esta ação gerou uma nova proposta para apenas 1 card.",
      };

      if (idempotencyKey) {
        regenIdempotency.set(idempotencyKey, {
          ts: Date.now(),
          payload,
        });
        // limpa entradas antigas
        if (regenIdempotency.size > 40) {
          const now = Date.now();
          for (const [k, v] of regenIdempotency) {
            if (now - v.ts > REGEN_TTL_MS) regenIdempotency.delete(k);
          }
        }
      }

      res.json(payload);
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  };

  app.post(
    "/api/collage-broll/metaphors/regenerate",
    handleCollageCardRegenerate
  );
  app.post(
    "/api/collage-broll/metaphors/:cardId/regenerate",
    handleCollageCardRegenerate
  );

  /**
   * Rejeita UM card (sem regenerar o lote).
   * POST /api/collage-broll/metaphors/reject
   * POST /api/collage-broll/metaphors/:cardId/reject
   */
  const handleCollageCardReject = (req, res) => {
    try {
      const cardId = String(
        req.params?.cardId || req.body?.cardId || req.body?.id || ""
      ).trim();
      if (!cardId) throw new Error("cardId obrigatório.");

      const regenerate = Boolean(
        req.body?.regenerate === true || req.body?.andRegen === true
      );
      const reason = String(
        req.body?.reason || req.body?.rejectionReason || ""
      ).trim();
      const note = String(
        req.body?.note || req.body?.rejectionNote || ""
      ).trim();
      const reasons = Array.isArray(req.body?.reasons)
        ? req.body.reasons.map(String)
        : Array.isArray(req.body?.rejectionReasons)
          ? req.body.rejectionReasons.map(String)
          : [];

      const sessionId = String(
        req.body?.sessionId || req.body?.session_id || ""
      ).trim();
      const currentItem = req.body?.currentItem || req.body?.item || null;

      // Se não há sessão mas há item, cria/atualiza sessão padrão
      let sid = sessionId;
      if (!sid && currentItem) {
        sid =
          String(req.body?.fallbackSessionId || "default").trim() || "default";
        const existing = loadCollageSession(sid);
        const items = Array.isArray(existing?.items) ? [...existing.items] : [];
        const ix = items.findIndex((i) => String(i.id) === cardId);
        if (ix >= 0) items[ix] = { ...items[ix], ...currentItem, id: cardId };
        else items.push({ ...currentItem, id: cardId });
        saveCollageSession(sid, {
          ...(existing || {}),
          mode: req.body?.mode || existing?.mode || currentItem.mode,
          items,
        });
      }

      const result = rejectCollageCard({
        sessionId: sid || null,
        cardId,
        reason,
        note,
        reasons,
        regenerate,
        currentItem,
      });

      res.json({
        ...result,
        // compat
        message: `Card ${cardId} rejeitado.`,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  };

  app.post("/api/collage-broll/metaphors/reject", handleCollageCardReject);
  app.post(
    "/api/collage-broll/metaphors/:cardId/reject",
    handleCollageCardReject
  );

  app.post("/api/collage-broll/generate-narration", async (req, res) => {
    try {
      const { idea = "", niche = "", format = "SHORTS" } = req.body || {};
      const apiKey = getApiKeys(WORKSPACE_DIR)[0] || "";

      const prompt = `Você é um diretor de criação e roteirista profissional para vídeos virais e conceituais do YouTube.
Gere um roteiro narrativo de narração com ganchos fortes, ritmo dinâmico e excelente encadeamento de ideias.
O roteiro deve ser projetado especificamente para ser ilustrado com metáforas visuais conceituais e poéticas no estilo de colagem de papel stop-motion (paper-collage table-top).

Tema/Premissa: "${idea}"
Nicho/Contexto: "${niche}"
Formato sugerido: ${format}

Instruções críticas:
- Escreva a narração em Português BR.
- Sem marcas de cena, sem cabeçalhos, sem indicações do tipo "[Narração]" ou "[Visual]".
- Retorne APENAS o texto corrido da narração dividida em parágrafos ou frases curtas separadas por quebra de linha.
- Mantenha o texto focado, poético e cativante.`;

      const raw = await callGeminiWithRetry(apiKey, prompt, {
        maxRetries: 3,
        projectDir: WORKSPACE_DIR,
        activityLabel: "Narração Collage B-roll",
      });
      res.json({ ok: true, text: raw.trim() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Salva sessão completa do Gate 1 (para sobreviver a reload). */
  app.post("/api/collage-broll/session", (req, res) => {
    try {
      const sessionId = String(
        req.body?.sessionId || req.body?.id || `sess_${Date.now()}`
      ).trim();
      const saved = saveCollageSession(sessionId, {
        mode: req.body?.mode,
        fidelity: req.body?.fidelity,
        rawLines: req.body?.rawLines,
        placeHint: req.body?.placeHint,
        countryHint: req.body?.countryHint,
        eraHint: req.body?.eraHint,
        scriptAnalysis: req.body?.scriptAnalysis || null,
        items: Array.isArray(req.body?.items) ? req.body.items : [],
      });
      res.json({
        ok: true,
        sessionId: saved.sessionId,
        updatedAt: saved.updatedAt,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  app.get("/api/collage-broll/session/:sessionId", (req, res) => {
    try {
      const session = loadCollageSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Sessão não encontrada." });
      }
      res.json({ ok: true, session });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  /** Revalida proposta sem LLM (edição manual / após restore). */
  app.post("/api/collage-broll/metaphors/validate-card", (req, res) => {
    try {
      const item = req.body?.item || req.body?.currentItem || {};
      const line = String(item.line || req.body?.currentLine || "").trim();
      const lineAnalysis = item.lineAnalysis || analyzeLineLocally(line, 0);
      const visualProposal = item.visualProposal || {
        composition: item.visual_proposition,
        objects: item.key_objects || [],
        primarySubject: item.visual_proposition,
        semanticAnchors: lineAnalysis.requiredVisualAnchors || [],
      };
      const validation = validateVisualProposal({
        lineAnalysis,
        visualProposal,
        scriptAnalysis: req.body?.scriptAnalysis || {},
      });
      res.json({
        ok: true,
        cardId: item.id || null,
        validation,
        lineAnalysis,
        preservable: listPreservableElements({
          ...item,
          lineAnalysis,
          visualProposal,
        }),
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  /** Snapshot helpers para o cliente (sem persistência server-side). */
  app.post("/api/collage-broll/metaphors/snapshot", (req, res) => {
    try {
      const item = req.body?.item || {};
      const version = Number(req.body?.version) || 1;
      res.json({
        ok: true,
        snapshot: snapshotCardVersion(item, {
          version,
          regenerationInstruction: req.body?.instruction || "",
          quickFixes: req.body?.quickFixes || [],
          rejectionReasons: req.body?.rejectionReasons || [],
        }),
        preservable: listPreservableElements(item),
        changes: summarizeCardChanges(req.body?.previous || {}, item),
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  app.post("/api/collage-broll/specs", (req, res) => {
    try {
      const itemsIn = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!itemsIn.length) {
        throw new Error("Envie items aprovados do Gate 1.");
      }
      const items = itemsIn.map((item) => {
        const visual_spec = buildVisualSpec(item);
        const imagegen_prompt = buildImagegenPrompt(item);
        return {
          ...item,
          visual_spec,
          imagegen_prompt,
          gate: 2,
        };
      });
      res.json({ ok: true, items });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  const requireGeminiKeys = () => {
    const keys = getApiKeys(WORKSPACE_DIR) || [];
    const preferred = keys[0] || "";
    if (!preferred) {
      throw new Error(
        "Configure uma chave Gemini em Configurações → IA para gerar frames."
      );
    }
    return { keys, preferred };
  };

  /**
   * Prévia dos prompts dual-frame (sem gerar imagem).
   */
  app.post("/api/collage-broll/frames/spec", (req, res) => {
    try {
      const item = req.body?.item || req.body || {};
      const dual = buildDualFrameSpec(item);
      res.json({ ok: true, dual, item: { ...item, ...dual } });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  /**
   * Gate 2A — END FRAME (fonte de verdade).
   * Body: { item | items, sessionId }
   * Legado: /stills chama o mesmo fluxo de end frame.
   */
  const handleEndFrame = async (req, res) => {
    try {
      const sessionId = String(
        req.body?.sessionId || req.body?.session_id || `sess_${Date.now()}`
      ).trim();
      const itemsIn = Array.isArray(req.body?.items)
        ? req.body.items
        : req.body?.item
          ? [req.body.item]
          : [];
      if (!itemsIn.length) {
        throw new Error("Envie item ou items aprovados do Gate 1.");
      }

      const { keys, preferred } = requireGeminiKeys();
      const results = [];
      for (const raw of itemsIn) {
        const dual = buildDualFrameSpec(raw);
        const item = {
          ...raw,
          ...dual,
          visual_spec: raw.visual_spec || buildVisualSpec(raw),
          imagegen_prompt: raw.imagegen_prompt || buildEndFrameImagePrompt(raw),
        };
        const produced = await produceEndFrame({
          item,
          sessionId,
          apiKeys: keys,
          preferredKey: preferred,
        });
        results.push({
          ...item,
          ...produced,
          still_approved: false,
          still_note:
            "End Frame gerado — aprove (Gate 2A) antes do Start Frame",
          gate: 2,
        });
      }

      res.json({
        ok: true,
        sessionId,
        count: results.length,
        items: results,
        item: results.length === 1 ? results[0] : undefined,
        frame: "end",
      });
    } catch (err) {
      console.error("[collage-broll/end-frame]", err);
      res.status(500).json({ error: err.message || String(err) });
    }
  };

  app.post("/api/collage-broll/frames/end", handleEndFrame);
  app.post("/api/collage-broll/stills", handleEndFrame); // legado = end frame

  /**
   * Gate 2B — START FRAME a partir do End Frame aprovado.
   */
  app.post("/api/collage-broll/frames/start", async (req, res) => {
    try {
      const sessionId = String(
        req.body?.sessionId || req.body?.session_id || `sess_${Date.now()}`
      ).trim();
      const itemsIn = Array.isArray(req.body?.items)
        ? req.body.items
        : req.body?.item
          ? [req.body.item]
          : [];
      if (!itemsIn.length) throw new Error("Envie item com End Frame.");

      const { keys, preferred } = requireGeminiKeys();
      const results = [];
      for (const raw of itemsIn) {
        if (!(raw.endFrame?.approved || raw.still_approved)) {
          throw new Error(
            `Card ${raw.id || "?"}: aprove o End Frame (Gate 2A) antes do Start Frame.`
          );
        }
        if (!(
          raw.endFrame?.imageUrl ||
          raw.endFrame?.imagePath ||
          raw.still_url ||
          raw.still_path
        )) {
          throw new Error(
            `Card ${raw.id || "?"}: End Frame sem imagem. Gere o End Frame primeiro.`
          );
        }
        const produced = await produceStartFrame({
          item: raw,
          sessionId,
          apiKeys: keys,
          preferredKey: preferred,
        });
        results.push({
          ...raw,
          ...produced,
          gate: 2,
        });
      }

      res.json({
        ok: true,
        sessionId,
        count: results.length,
        items: results,
        item: results.length === 1 ? results[0] : undefined,
        frame: "start",
      });
    } catch (err) {
      console.error("[collage-broll/start-frame]", err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  /** Aprova End Frame e/ou Start Frame. */
  app.post("/api/collage-broll/frames/approve", (req, res) => {
    try {
      const cardId = String(req.body?.cardId || req.body?.id || "").trim();
      const sessionId = String(req.body?.sessionId || "").trim();
      const which = String(req.body?.frame || req.body?.which || "end")
        .trim()
        .toLowerCase();
      if (!cardId) throw new Error("cardId obrigatório.");
      const item = req.body?.item || {};

      let updated = { ...item, id: cardId };
      if (which === "start" || which === "startframe" || which === "2b") {
        updated = {
          ...updated,
          startFrame: {
            ...(updated.startFrame || {}),
            approved: true,
            status: "approved",
          },
        };
      } else {
        // end frame (+ legado still_approved)
        updated = {
          ...updated,
          endFrame: {
            ...(updated.endFrame || {}),
            approved: true,
            status: "approved",
          },
          still_approved: true,
          still_status: "approved",
          still_note: "End Frame aprovado",
          gate: Math.max(Number(item.gate) || 2, 2),
        };
      }

      // motion prompt ready when both approved
      if (updated.endFrame?.approved && updated.startFrame?.approved) {
        const dual = buildDualFrameSpec(updated);
        updated.motion = {
          ...(updated.motion || dual.motion),
          videoPrompt:
            updated.motion?.videoPrompt ||
            dual.motion.videoPrompt ||
            buildMotionPrompt(updated),
        };
        updated.omni_prompt = updated.motion.videoPrompt;
      }

      if (sessionId) {
        try {
          const session = loadCollageSession(sessionId);
          if (session?.items) {
            const items = session.items.map((i) =>
              String(i.id) === cardId ? { ...i, ...updated } : i
            );
            saveCollageSession(sessionId, { ...session, items });
          }
        } catch {
          /* best-effort */
        }
      }

      const gate3 = canRunGate3(updated);
      res.json({
        ok: true,
        cardId,
        frame:
          which === "start" || which === "startframe" || which === "2b"
            ? "start"
            : "end",
        item: updated,
        canRunGate3: gate3.ok,
        gate3Reason: gate3.reason,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  /** Legado: /stills/approve = aprova end frame */
  app.post("/api/collage-broll/stills/approve", (req, res) => {
    req.body = { ...req.body, frame: "end" };
    // reutilizar handler via fetch interno — chamar lógica duplicada mínima
    try {
      const cardId = String(req.body?.cardId || req.body?.id || "").trim();
      const sessionId = String(req.body?.sessionId || "").trim();
      if (!cardId) throw new Error("cardId obrigatório.");
      const item = req.body?.item || {};
      const updated = {
        ...item,
        id: cardId,
        endFrame: {
          ...(item.endFrame || {}),
          approved: true,
          status: "approved",
          imageUrl: item.endFrame?.imageUrl || item.still_url,
          imagePath: item.endFrame?.imagePath || item.still_path,
        },
        still_approved: true,
        still_status: "approved",
        still_note: "End Frame aprovado",
        gate: Math.max(Number(item.gate) || 2, 2),
      };
      if (sessionId) {
        try {
          const session = loadCollageSession(sessionId);
          if (session?.items) {
            const items = session.items.map((i) =>
              String(i.id) === cardId ? { ...i, ...updated } : i
            );
            saveCollageSession(sessionId, { ...session, items });
          }
        } catch {
          /* best-effort */
        }
      }
      res.json({
        ok: true,
        cardId,
        item: updated,
        canRunGate3: canRunGate3(updated).ok,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  /** Export Google Flow (start/end/motion files). */
  app.post("/api/collage-broll/export-flow", (req, res) => {
    try {
      const sessionId = String(req.body?.sessionId || "export").trim();
      const itemsIn = Array.isArray(req.body?.items)
        ? req.body.items
        : req.body?.item
          ? [req.body.item]
          : [];
      if (!itemsIn.length) throw new Error("Envie items para exportar.");
      const packs = itemsIn.map((it) => exportGoogleFlowPackage(it, sessionId));
      res.json({ ok: true, sessionId, packages: packs });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  app.post("/api/collage-broll/omni-jobs", (req, res) => {
    try {
      const itemsIn = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!itemsIn.length) {
        throw new Error("Envie items com still aprovado (Gate 2).");
      }
      const jobs = [];
      const items = itemsIn.map((item, idx) => {
        const omni_prompt = buildOmniPrompt(item);
        const job = buildOmniJob(item, {
          firstFrame: `${item.id || `c${idx + 1}`}/frames/first-frame.png`,
          lastFrame: `${item.id || `c${idx + 1}`}/frames/last-frame.png`,
          output: `${item.id || `c${idx + 1}`}/omni/run-v01/final-5s.mp4`,
        });
        jobs.push(job);
        return {
          ...item,
          omni_prompt,
          omni_job: job,
          gate: 3,
        };
      });
      res.json({
        ok: true,
        model: "gemini-omni-flash-preview",
        jobs,
        items,
        script_hint:
          "python scripts/generate_video.py --batch omni-jobs.json --concurrency 3",
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  /**
   * Gate 3: vídeo com Start Frame + End Frame aprovados.
   * Body: { item | items, sessionId }
   */
  app.post("/api/collage-broll/videos", async (req, res) => {
    try {
      const sessionId = String(
        req.body?.sessionId || req.body?.session_id || `sess_${Date.now()}`
      ).trim();
      const itemsIn = Array.isArray(req.body?.items)
        ? req.body.items
        : req.body?.item
          ? [req.body.item]
          : [];
      if (!itemsIn.length) {
        throw new Error("Envie item com Start + End frames aprovados.");
      }

      const results = [];
      for (const raw of itemsIn) {
        const check = canRunGate3(raw);
        if (!check.ok) {
          throw new Error(`Card ${raw.id || "?"}: ${check.reason}`);
        }
        const produced = await produceCollageVideo({
          item: raw,
          sessionId,
        });
        results.push({
          ...raw,
          ...produced,
          gate: 3,
        });
      }

      res.json({
        ok: true,
        sessionId,
        count: results.length,
        items: results,
        item: results.length === 1 ? results[0] : undefined,
      });
    } catch (err) {
      console.error("[collage-broll/videos]", err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  /** Serve stills/vídeos gerados (path-safe). */
  app.get("/api/collage-broll/media/:sessionId/:cardId/:file", (req, res) => {
    try {
      const filePath = resolveCollageMediaFile(
        req.params.sessionId,
        req.params.cardId,
        req.params.file
      );
      if (!filePath) {
        return res.status(404).json({ error: "Arquivo não encontrado." });
      }
      const ext = path.extname(filePath).toLowerCase();
      const types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".mp4": "video/mp4",
      };
      res.setHeader("Content-Type", types[ext] || "application/octet-stream");
      res.setHeader("Cache-Control", "private, max-age=3600");
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  /** Upload manual de imagem/vídeo para o card (Fase 1: end, start, video). */
  app.post("/api/collage-broll/media/upload", (req, res) => {
    try {
      const sessionId = String(req.body?.sessionId || "").trim();
      const cardId = String(req.body?.cardId || req.body?.id || "").trim();
      const frame = String(req.body?.frame || "")
        .trim()
        .toLowerCase(); // 'end', 'start', 'video'
      const fileBase64 = String(req.body?.fileBase64 || "").trim();

      if (!sessionId || !cardId || !frame || !fileBase64) {
        throw new Error(
          "Parâmetros obrigatórios: sessionId, cardId, frame, fileBase64."
        );
      }

      const dir = ensureCardDir(sessionId, cardId);
      const buf = Buffer.from(fileBase64, "base64");
      let updated = {};

      if (frame === "end" || frame === "endframe" || frame === "2a") {
        const endPath = path.join(dir, "frames", "end-frame.png");
        const lastPath = path.join(dir, "frames", "last-frame.png");
        const stillPath = path.join(dir, "still.png");
        const exportEnd = path.join(dir, "end_frame.png");

        fs.writeFileSync(endPath, buf);
        fs.writeFileSync(lastPath, buf);
        fs.writeFileSync(stillPath, buf);
        fs.writeFileSync(exportEnd, buf);

        updated = {
          still_path: stillPath,
          still_url: mediaUrl(sessionId, cardId, "still.png"),
          last_frame_path: lastPath,
          last_frame_url: mediaUrl(sessionId, cardId, "last-frame.png"),
          still_status: "generated",
          still_approved: false,
          still_note: "End Frame manual (upload)",
          endFrame: {
            description: "End Frame manual (upload)",
            imageUrl: mediaUrl(sessionId, cardId, "end-frame.png"),
            imagePath: endPath,
            status: "generated",
            approved: false,
            model: "manual_upload",
          },
          gate: 2,
        };
      } else if (
        frame === "start" ||
        frame === "startframe" ||
        frame === "2b"
      ) {
        const startPath = path.join(dir, "frames", "start-frame.png");
        const firstPath = path.join(dir, "frames", "first-frame.png");
        const exportStart = path.join(dir, "start_frame.png");

        fs.writeFileSync(startPath, buf);
        fs.writeFileSync(firstPath, buf);
        fs.writeFileSync(exportStart, buf);

        updated = {
          first_frame_path: firstPath,
          first_frame_url: mediaUrl(sessionId, cardId, "first-frame.png"),
          startFrame: {
            description: "Start Frame manual (upload)",
            imageUrl: mediaUrl(sessionId, cardId, "start-frame.png"),
            imagePath: startPath,
            status: "generated",
            approved: false,
            fromEndFrame: true,
            model: "manual_upload",
          },
          gate: 2,
        };
      } else if (frame === "video" || frame === "g3" || frame === "gate3") {
        const outPath = path.join(dir, "final-5s.mp4");
        fs.writeFileSync(outPath, buf);

        updated = {
          video_path: outPath,
          video_url: mediaUrl(sessionId, cardId, "final-5s.mp4"),
          video_status: "generated",
          video_note: "Vídeo manual (upload)",
          video_mode: "manual_upload",
          gate: 3,
        };
      } else {
        throw new Error(`Frame inválido: ${frame}`);
      }

      if (sessionId) {
        try {
          const session = loadCollageSession(sessionId);
          if (session?.items) {
            const items = session.items.map((i) =>
              String(i.id) === cardId ? { ...i, ...updated } : i
            );
            saveCollageSession(sessionId, { ...session, items });
          }
        } catch (err) {
          console.warn("[collage-broll/upload] falha ao atualizar sessao", err);
        }
      }

      res.json({
        ok: true,
        cardId,
        frame,
        item: updated,
      });
    } catch (err) {
      console.error("[collage-broll/upload]", err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  app.post("/api/humor-facts/ideas", async (req, res) => {
    try {
      // Qualquer provedor das configs (Gemini, OpenRouter, xAI, NVIDIA, Inference, Local)
      const humorProvider = getAiProvider(WORKSPACE_DIR);
      const apiKey = getApiKeys(WORKSPACE_DIR)[0] || "";
      if (humorProvider === "gemini" && !apiKey) {
        throw new Error(
          "Configure uma chave Gemini ou escolha outro provedor em Configurações → IA."
        );
      }
      if (
        humorProvider === "openrouter" &&
        getOpenRouterApiKey &&
        !getOpenRouterApiKey(WORKSPACE_DIR)
      ) {
        throw new Error("Configure a chave OpenRouter em Configurações → IA.");
      }
      if (
        humorProvider === "nvidia" &&
        getNvidiaApiKey &&
        !getNvidiaApiKey(WORKSPACE_DIR)
      ) {
        throw new Error("Configure a chave NVIDIA em Configurações → IA.");
      }
      const input = req.body || {};
      const niche = String(input.niche || "").trim();
      const requestedCount = Math.min(
        10,
        Math.max(3, Number(input.count) || 6)
      );
      const previousIdeas = Array.isArray(input.excludeIdeas)
        ? input.excludeIdeas
            .map((idea) => String(idea?.title || idea || "").trim())
            .filter(Boolean)
        : [];
      const defaultBlocklist = [
        "concreto romano autorreparavel",
        "mecanismo de Anticitera ou computador grego antigo",
        "estradas incas e Qhapaq Nan",
        "badgir ou ar-condicionado persa",
        "bateria de Bagda",
        "caimento dos aquedutos romanos",
      ];
      const historyTopics = loadIdeasHistory(WORKSPACE_DIR, niche);
      const humorHistoryTopics = loadIdeasHistory(
        WORKSPACE_DIR,
        `fatos-com-graca-${niche}`
      );
      const projectTopics = collectProjectTopics(PROJECTS_ROOT);
      const allExcludedTopics = [
        ...defaultBlocklist,
        ...previousIdeas,
        ...historyTopics,
        ...humorHistoryTopics,
        ...projectTopics,
      ];
      const baseExcludedTopics = mergeExclusionTopics({
        projectTopics,
        historyTopics: [...historyTopics, ...humorHistoryTopics],
        previousIdeas: [...defaultBlocklist, ...previousIdeas],
      });
      const accepted = [];
      const rejected = [];
      let attempts = 0;

      while (accepted.length < requestedCount && attempts < 3) {
        attempts += 1;
        const generationSeed = makeIdeasGenerationSeed();
        const retryExcluded = mergeExclusionTopics({
          previousIdeas: [
            ...baseExcludedTopics,
            ...accepted.map((idea) => idea.title),
            ...rejected.map((item) => item.title),
          ],
        });
        const prompt = buildHumorIdeasPrompt({
          ...input,
          count: 10,
          generationSeed,
          freshnessInstruction: buildIdeasFreshnessInstruction(),
          exclusionAddendum: buildIdeasExclusionAddendum(retryExcluded),
        });
        // Respeita o provedor das configs. Google Search grounding só na API Gemini.
        const humorLlmOpts = {
          maxRetries: 3,
          projectDir: WORKSPACE_DIR,
          temperature: 0.82,
          activityLabel: "Ideias Fatos com Graça",
        };
        if (humorProvider === "gemini") {
          humorLlmOpts.models = [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
          ];
          humorLlmOpts.bodyOverride = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.82 },
          };
        }
        const raw = await callGeminiWithRetry(apiKey, prompt, humorLlmOpts);
        const parsed = parseHumorIdeasResponse(raw);
        const filtered = filterNovelHumorIdeas(
          parsed,
          [
            ...allExcludedTopics,
            ...accepted.map((idea) => idea.title),
            ...rejected.map((item) => item.title),
          ],
          accepted,
          { niche }
        );
        accepted.push(
          ...filtered.ideas.slice(0, requestedCount - accepted.length)
        );
        rejected.push(...filtered.rejected);
        console.log(
          `[HUMOR FACTS IDEAS] attempt=${attempts} niche="${niche}" parsed=${parsed.length} accepted=${accepted.length} rejected=${rejected.length} excluded=${retryExcluded.length}`
        );
      }

      if (accepted.length < requestedCount) {
        throw new Error(
          `A pesquisa nao encontrou ${requestedCount} pautas realmente novas. ${rejected.length} repeticoes foram bloqueadas; tente um nicho mais especifico.`
        );
      }

      appendIdeasHistory(WORKSPACE_DIR, niche, accepted);
      appendIdeasHistory(WORKSPACE_DIR, `fatos-com-graca-${niche}`, accepted);
      res.json({
        ok: true,
        ideas: accepted,
        meta: {
          attempts,
          excludedCount: baseExcludedTopics.length,
          rejectedCount: rejected.length,
        },
      });
    } catch (err) {
      console.error("[HUMOR FACTS IDEAS ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/humor-facts/narration", async (req, res) => {
    try {
      const apiKey = getApiKeys(WORKSPACE_DIR)[0] || "";
      const prompt = buildHumorNarrationPrompt(req.body || {});
      const raw = await callGeminiWithRetry(apiKey, prompt, {
        maxRetries: 3,
        projectDir: WORKSPACE_DIR,
        activityLabel: "Narração Fatos com Graça",
      });
      res.json({ ok: true, result: parseHumorNarrationResponse(raw) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/humor-facts/production-plan", async (req, res) => {
    try {
      const apiKey = getApiKeys(WORKSPACE_DIR)[0] || "";
      const narration = String(req.body?.narration || "").trim();
      const prompt = buildHumorProductionPrompt(req.body || {});
      const raw = await callGeminiWithRetry(apiKey, prompt, {
        maxRetries: 3,
        projectDir: WORKSPACE_DIR,
        temperature: 0.35,
        activityLabel: "Plano de produção Fatos com Graça",
      });
      let result = parseHumorProductionResponse(raw, narration);
      // Shotcraft: taggeia cenas do plano de produção (humor → impacto)
      try {
        if (result && Array.isArray(result.scenes)) {
          const { tagHumorStoryboard } = await import(
            "./creatorSceneTagger.js"
          );
          const asBoard = {
            visual_prompts: result.scenes.map((s, i) => ({
              scene: s.id || s.order || i + 1,
              narration_text: s.narration || s.visualBeat || "",
              ...s,
            })),
          };
          const tagged = tagHumorStoryboard(asBoard, {
            format: "9:16",
            niche: String(req.body?.niche || "humor"),
          });
          result = {
            ...result,
            scenes: tagged.visual_prompts,
            motion_tagged: true,
          };
        }
      } catch (tagErr) {
        console.warn(
          "[humor-facts/production-plan] motion tag:",
          tagErr?.message || tagErr
        );
      }
      res.json({
        ok: true,
        result,
      });
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
      const qwen3Probe = await probeQwen3Tts();
      const voiceboxConfig = loadVoiceboxConfig({
        workspaceDir: WORKSPACE_DIR,
      });
      const voiceboxProbe = await probeVoiceboxServer(voiceboxConfig);
      const voiceboxVoices = buildVoiceboxVoiceList(voiceboxProbe);
      const gptSovitsConfig = loadGptSovitsConfig({
        workspaceDir: WORKSPACE_DIR,
      });
      const gptSovitsProbe = await probeGptSovitsServer(gptSovitsConfig);
      const gptSovitsVoices = buildGptSovitsVoiceList(
        gptSovitsProbe,
        gptSovitsConfig
      );

      const engines = [
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
          id: "qwen3",
          label: "Qwen3-TTS CustomVoice (local, PT/EN)",
          defaultVoice: QWEN3_TTS_DEFAULT_VOICE,
          voices: QWEN3_TTS_VOICES,
          available: qwen3Probe.ok,
          hint: qwen3Probe.ok
            ? `Pacote OK — ${qwen3Probe.model || "CustomVoice 1.7B"} · device: ${qwen3Probe.device || "auto"}${qwen3Probe.cuda ? " (CUDA)" : ""}. Idiomas: Portuguese + English.`
            : `Indisponível: ${qwen3Probe.error || "pip install -U qwen-tts no .venv-qwen3-tts"}`,
        },
        {
          id: "voicebox",
          label: "Voicebox (clone local)",
          defaultVoice:
            voiceboxProbe.defaultProfileId || voiceboxVoices[0]?.id || "",
          voices: voiceboxVoices,
          available: voiceboxProbe.ok,
          serverUrl: voiceboxProbe.baseUrl,
          gpuAvailable: Boolean(voiceboxProbe.gpuAvailable),
          backendType: voiceboxProbe.backendType || null,
          profileCount: (voiceboxProbe.profiles || []).length,
          hint: buildVoiceboxStatusHint(voiceboxProbe, voiceboxVoices),
        },
        {
          id: "gptsovits",
          label: "GPT-SoVITS (clone few-shot)",
          defaultVoice: gptSovitsProbe.ok
            ? gptSovitsVoices.find((v) => v.id !== GPT_SOVITS_DEFAULT_VOICE)
                ?.id || GPT_SOVITS_DEFAULT_VOICE
            : GPT_SOVITS_DEFAULT_VOICE,
          voices: gptSovitsVoices,
          available:
            gptSovitsProbe.ok &&
            gptSovitsVoices.some((v) => v.id !== GPT_SOVITS_DEFAULT_VOICE),
          serverUrl: gptSovitsProbe.baseUrl,
          hint: buildGptSovitsStatusHint(gptSovitsProbe, gptSovitsVoices),
        },
        {
          id: "fish",
          label: "Fish Speech S2",
          defaultVoice:
            fishProbe.defaultReferenceId || FISH_SPEECH_DEFAULT_VOICE,
          voices: fishVoices,
          available: fishProbe.ok,
          mode: fishProbe.mode || "local",
          serverUrl: fishProbe.baseUrl,
          cloudModel:
            fishConfig.fish_speech?.cloud_model ||
            fishConfig.fish_speech?.cloudModel ||
            "s2.1-pro-free",
          hint: fishProbe.ok
            ? fishProbe.mode === "cloud"
              ? `Fish Audio API (cloud) · ${fishConfig.fish_speech?.cloud_model || fishConfig.fish_speech?.cloudModel || "s2.1-pro-free"} · ${fishProbe.modelCount || fishProbe.references?.length || 0} voz(es) — tags [pausa], [ênfase]`
              : "Servidor local ativo — tags inline [pausa], [ênfase]"
            : fishProbe.error ||
              "Offline: .\\scripts\\start-fish-speech.ps1 ou fish_speech.api_key no config",
        },
        {
          id: "edge",
          label: "Edge TTS (Microsoft)",
          defaultVoice: "pt-BR-AntonioNeural",
          voices: [
            {
              id: "pt-BR-AntonioNeural",
              label: "Antonio — PT-BR masculino",
              group: "pt",
            },
            {
              id: "pt-BR-FranciscaNeural",
              label: "Francisca — PT-BR feminino",
              group: "pt",
            },
            {
              id: "en-US-RogerNeural",
              label: "Roger — EN grave",
              group: "en",
            },
            {
              id: "en-US-ChristopherNeural",
              label: "Christopher — EN maduro",
              group: "en",
            },
            { id: "en-US-GuyNeural", label: "Guy — EN seco", group: "en" },
          ],
        },
      ];
      const savedDefaults = readTtsDefaultVoices({
        workspaceDir: WORKSPACE_DIR,
      });
      res.json({
        engines: applyTtsDefaultsToEngines(engines, savedDefaults),
        defaults: savedDefaults,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tts/default-voice", (req, res) => {
    try {
      const saved = saveTtsDefaultVoice({
        workspaceDir: WORKSPACE_DIR,
        engine: req.body?.engine,
        voice: req.body?.voice,
      });
      res.json({ ok: true, ...saved });
    } catch (err) {
      const status = /invalido|nao informado/i.test(err.message) ? 400 : 500;
      res.status(status).json({ error: err.message });
    }
  });

  app.post("/api/tts/voicebox-preview", async (req, res) => {
    const outputPath = path.join(
      os.tmpdir(),
      `lumiera-voicebox-preview-${process.pid}-${Date.now()}.mp3`
    );
    try {
      const projDir = getProjectDir(req);
      const sampleText = String(req.body?.sampleText || "")
        .trim()
        .slice(0, 240);
      const voice = String(req.body?.voice || "").trim();
      const voicebox =
        req.body?.voicebox && typeof req.body.voicebox === "object"
          ? req.body.voicebox
          : {};
      if (sampleText.length < 20)
        throw new Error("Digite ao menos 20 caracteres para a amostra.");
      const config = loadVoiceboxConfig({
        workspaceDir: WORKSPACE_DIR,
        projectDir: projDir,
      });
      config.voicebox = { ...config.voicebox, ...voicebox };
      const result = await synthesizeVoiceboxNarration(sampleText, {
        outputPath,
        voice,
        config,
      });
      const buffer = fs.readFileSync(outputPath);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("X-Voicebox-Sample-Text", encodeURIComponent(sampleText));
      res.setHeader("X-Voicebox-Profile-Id", String(result.profileId || voice));
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch {}
    }
  });

  app.post("/api/tts/gpt-sovits-preview", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { voice, sampleText, narrativeScript, gptSovits } = req.body || {};
      const gsConfig = loadGptSovitsConfig({
        workspaceDir: WORKSPACE_DIR,
        projectDir: projDir,
      });
      const result = await previewGptSovitsVoice({
        voice,
        sampleText,
        narrativeScript,
        config: gsConfig,
        options: gptSovits && typeof gptSovits === "object" ? gptSovits : {},
      });
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader(
        "X-Gpt-Sovits-Sample-Text",
        encodeURIComponent(result.sampleText || "")
      );
      res.setHeader(
        "X-Gpt-Sovits-Voice-Id",
        String(result.voiceId || voice || "")
      );
      res.send(result.buffer);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tts/fish-preview", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const { voice, sampleText, narrativeScript, fish } = req.body || {};
      const fishConfig = loadFishSpeechConfig({
        workspaceDir: WORKSPACE_DIR,
        projectDir: projDir,
      });
      const result = await previewFishSpeechVoice({
        voice,
        sampleText,
        narrativeScript,
        config: fishConfig,
        fishOptions: fish && typeof fish === "object" ? fish : {},
      });
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader(
        "X-Fish-Sample-Text",
        encodeURIComponent(result.sampleText || "")
      );
      res.setHeader(
        "X-Fish-Voice-Id",
        String(result.referenceId || voice || FISH_SPEECH_DEFAULT_VOICE)
      );
      res.send(result.buffer);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tts/preview-tagged-text", (req, res) => {
    try {
      const {
        text_tagged: taggedText = "",
        engine = "fish",
        voice = "",
      } = req.body || {};
      const normalizedEngine = String(engine).toLowerCase();
      const isFishEngine = normalizedEngine.includes("fish");
      const isVoiceboxEngine = normalizedEngine.includes("voicebox");
      const isQwen3Engine =
        normalizedEngine.includes("qwen3") ||
        normalizedEngine === "qwen" ||
        normalizedEngine.includes("qwen-tts") ||
        normalizedEngine.includes("qwen_tts");
      const platform = normalizedEngine.includes("chatterbox")
        ? "chatterbox"
        : normalizedEngine.includes("eleven")
          ? "eleven"
          : isQwen3Engine
            ? "qwen3"
            : "fish";
      const sanitized = sanitizeNarrationChunkTaggedText(taggedText);
      if (isQwen3Engine) {
        // Mantém tags de estilo ([tom …]) no raw — sanitize só tira [ênfase]
        const prepared = prepareQwen3ExpressiveNarration(
          String(taggedText || sanitized || ""),
          { voiceId: String(voice || "") }
        );
        res.json({
          preview: prepared.preview,
          instruct: prepared.instruct,
          tags: prepared.tags,
          platform: "qwen3",
          language: prepared.language,
          normalization: null,
          independent_chunk: true,
        });
        return;
      }
      const preview = isVoiceboxEngine
        ? prepareVoiceboxExpressiveText(sanitized)
        : convertCinematicMarkersForTts(sanitized, platform, {
            stripEmphasis: true,
          });
      const fishRequest = isFishEngine
        ? buildFishSpeechRequestBody(
            preview,
            resolveFishSpeechConfig(
              loadFishSpeechConfig({
                workspaceDir: WORKSPACE_DIR,
                projectDir: getProjectDir(req),
              })
            ),
            null,
            { independentChunk: true }
          )
        : null;
      const tags = [...sanitized.matchAll(/\[[^\]]+\]|\([^)]+\)/g)]
        .map((m) => m[0])
        .filter((v, i, arr) => arr.indexOf(v) === i);
      res.json({
        preview: fishRequest?.text || preview,
        tags,
        platform: isVoiceboxEngine ? "voicebox" : platform,
        normalization: fishRequest?.normalize ?? null,
        independent_chunk: fishRequest
          ? !fishRequest.condition_on_previous_chunks
          : null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tts/generate-narration-chunks", async (req, res) => {
    const projDir = getProjectDir(req);
    const {
      chunk_ids: chunkIds,
      default_voice: defaultVoice,
      engine,
      voice,
      speed,
      use_tagged: useTagged,
      strip_emphasis: stripEmphasis,
      sync_whisper: syncWhisper,
      assemble_master: assembleMaster,
      progress_job_id: progressJobIdRaw,
    } = req.body || {};
    const progressJobId = normalizeJobId(progressJobIdRaw);
    const report = createProgressReporter(progressJobId);

    const runGeneration = async () => {
      appendProjectEventLog(projDir, {
        component: "narration",
        event: "tts_chunks_started",
        message: "Geração de narração por trechos iniciada.",
        details: { requested_chunk_ids: chunkIds || "all", engine, voice },
      });
      if (progressJobId) {
        setJobProgress(progressJobId, {
          phase: "start",
          label: "Preparando narração por trechos…",
          percent: 2,
        });
      }

      let storyboard = JSON.parse(
        fs.readFileSync(path.join(projDir, "storyboard.json"), "utf8")
      );
      let config = JSON.parse(
        fs.readFileSync(path.join(projDir, "config_qanat.json"), "utf8")
      );
      const plan = storyboard.narration_chunk_plan;
      if (!plan?.chunks?.length) {
        throw new Error(
          "Plano de trechos ausente — use 'Planejar trechos (IA)' antes."
        );
      }
      assertNarrationPlanMatchesSource(plan, storyboard.narrative_script || "");

      report(
        "prepare",
        `Plano com ${plan.chunks.length} trecho(s) — iniciando TTS…`,
        5
      );

      const voiceRef =
        defaultVoice && typeof defaultVoice === "object"
          ? defaultVoice
          : {
              engine: engine || plan.default_voice?.engine || "kokoro",
              voice,
              speed,
            };

      let nextPlan = await generateNarrationChunksTts(projDir, {
        plan,
        chunkIds: Array.isArray(chunkIds) ? chunkIds : null,
        defaultVoice: voiceRef,
        workspaceDir: WORKSPACE_DIR,
        useTagged: useTagged !== false,
        stripEmphasis: true,
        // O gerador de baixo nível não finaliza o projeto. Esta rota monta
        // um master de revisão quando todos os chunks existem; Whisper e o
        // master aprovado continuam bloqueados até a aprovação humana.
        assembleMaster: false,
        onLog: (msg) => console.log(msg),
        onProgress: report,
        onChunkUpdate: (partialPlan, changedChunk) => {
          persistChunkPlanToProject(projDir, partialPlan, {
            ...config,
            narration_mode: NARRATION_MODE_CHUNKED,
          });
          const changed = partialPlan.chunks.find(
            (chunk) => chunk.id === changedChunk?.id
          );
          if (changed) {
            appendProjectEventLog(projDir, {
              component: "narration",
              event: "tts_chunk_updated",
              level: changed.status === "failed" ? "error" : "info",
              message: `${changed.id}: ${changed.status}`,
              details: {
                chunk_id: changed.id,
                block: changed.block,
                scene_ref: changed.scene_ref,
                status: changed.status,
                engine: changed.voice?.engine,
                voice: changed.voice?.voice,
                audio_file: changed.audio_file,
                duration_s: changed.duration_s,
                error: changed.error,
              },
            });
            appendNarrationAuditEvent(projDir, {
              type: "chunk_tts",
              run_id: progressJobId || null,
              status: changed.status,
              chunk_id: changed.id,
              block: changed.block,
              text: changed.text,
              text_tagged: changed.text_tagged,
              voice: changed.voice,
              audio_file: changed.audio_file,
              duration_s: changed.duration_s,
              error: changed.error,
              generation_signature: changed.generation_signature,
            });
          }
        },
      });

      persistChunkPlanToProject(projDir, nextPlan, {
        ...config,
        narration_mode: NARRATION_MODE_CHUNKED,
      });

      const fullBatch = isFullNarrationChunkBatch(chunkIds, plan);
      const shouldSyncWhisper = false;
      let whisperSynced = false;
      let whisperError = null;

      if (shouldSyncWhisper) {
        const masterPath = path.join(projDir, "narracao_mestra_premium.mp3");
        if (!fs.existsSync(masterPath)) {
          whisperError =
            "narracao_mestra_premium.mp3 não encontrado após montagem.";
          console.warn(`[TTS Chunks] Whisper ignorado: ${whisperError}`);
        } else {
          report(
            "whisper",
            "Sincronizando legendas com Whisper (pode levar alguns minutos)…",
            88
          );
          try {
            const handlers = buildCreatorPipelineHandlers();
            await handlers.sync(projDir, (msg) => {
              console.log(msg);
              if (
                String(msg).includes("Whisper") ||
                String(msg).includes("align")
              ) {
                report("whisper", "Whisper em execução…", 92);
              }
            });
            whisperSynced = true;
            report("whisper", "Legendas alinhadas com Whisper.", 97);
          } catch (whisperErr) {
            whisperError = whisperErr?.message || String(whisperErr);
            console.warn(
              "[TTS Chunks] Whisper falhou — restaurando timings por trecho:",
              whisperError
            );
            writeTimingsFromChunkPlan(projDir, nextPlan);
            report("whisper-fallback", `Whisper falhou: ${whisperError}`, 95);
          }
        }
      }

      const masterReady = allNarrationChunksHaveAudio(nextPlan, projDir);
      if (masterReady) {
        report("assemble-draft", "Montando master de revisão…", 90);
        await assembleNarrationChunksToMaster(projDir, nextPlan, {
          onLog: (message) => console.log(`[Narration Draft] ${message}`),
        });
        appendProjectEventLog(projDir, {
          component: "narration",
          event: "narration_master_draft_assembled",
          message: "Master de revisão montado sem executar Whisper.",
          details: { chunk_count: nextPlan.chunks.length, approved: false },
        });
        let whisperTranscripts = null;
        let flatWords = [];
        if (whisperSynced) {
          try {
            whisperTranscripts = JSON.parse(
              fs.readFileSync(
                path.join(projDir, "word_transcripts.json"),
                "utf8"
              )
            );
            flatWords = flattenWordTranscripts(whisperTranscripts);
          } catch {
            whisperTranscripts = null;
          }
        }
        const applied = applyChunkedNarrationSyncToProject(projDir, {
          chunkPlan: nextPlan,
          config,
          storyboard,
          whisperTranscripts: whisperSynced ? whisperTranscripts : null,
          flatWords: whisperSynced ? flatWords : [],
        });
        config = applied.config;
        storyboard = applied.storyboard;
        nextPlan = applied.storyboard.narration_chunk_plan || nextPlan;
        appendProjectEventLog(projDir, {
          component: "timeline",
          event: "chunk_timeline_synchronized",
          message:
            "Timeline sincronizada sem acoplar quantidade de assets à quantidade de chunks.",
          details: summarizeTimelineAssets(
            applied.config.timeline_assets,
            applied.storyboard.visual_prompts
          ),
        });
        console.log(
          whisperSynced
            ? "[TTS Chunks] Timeline reancorada pela fala real do Whisper (1 segmento por cena)."
            : "[TTS Chunks] Timeline sincronizada pelo plano de trechos (1 segmento por cena)."
        );
      } else if (!fullBatch) {
        console.log(
          "[TTS Chunks] Timeline preservada — batch parcial sem master completo."
        );
      }
      storyboard.narration_chunk_plan = nextPlan;
      writeJsonAtomicSync(path.join(projDir, "storyboard.json"), storyboard);

      const logs = formatNarrationChunkPlanLog(nextPlan);
      let message = masterReady
        ? `Narração por trechos: ${nextPlan.chunk_count} áudio(s) gerados; ouça e aprove antes do Whisper.`
        : `Trecho(s) gerado(s) — ${nextPlan.chunk_count} no plano; master aguardando trechos faltantes.`;
      if (whisperSynced) {
        message += " Legendas sincronizadas com Whisper.";
      } else if (shouldSyncWhisper && whisperError) {
        message += ` Whisper não concluiu: ${whisperError}`;
      } else if (!fullBatch) {
        message += " Gere os trechos restantes; depois revise e aprove todos.";
      } else if (!masterReady) {
        message += " Gere os trechos restantes antes da revisão final.";
      }
      if (progressJobId) {
        finishJobProgressWithResult(
          progressJobId,
          {
            message,
            plan: nextPlan,
            whisper_synced: whisperSynced,
            whisper_error: whisperError,
            full_batch: fullBatch,
          },
          message
        );
      }
      return {
        success: true,
        plan: nextPlan,
        logs,
        message,
        whisper_synced: whisperSynced,
        whisper_error: whisperError,
      };
    };

    try {
      if (progressJobId) {
        setJobProgress(progressJobId, {
          phase: "queued",
          label: "Iniciando geração por trechos…",
          percent: 1,
          done: false,
          error: null,
        });
        res.json({ started: true, jobId: progressJobId });
        runGeneration().catch((err) => {
          console.error("[TTS Chunks] Falha:", err);
          appendProjectEventLog(projDir, {
            level: "error",
            component: "narration",
            event: "tts_chunks_failed",
            message: err?.message || String(err),
          });
          failJobProgress(progressJobId, err?.message || String(err));
        });
        return;
      }
      const result = await runGeneration();
      res.json(result);
    } catch (err) {
      appendProjectEventLog(projDir, {
        level: "error",
        component: "narration",
        event: "tts_chunks_failed",
        message: err?.message || String(err),
      });
      if (progressJobId) failJobProgress(progressJobId, err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/narration-chunks/finalize-approved", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const storyboardPath = path.join(projDir, "storyboard.json");
      const configPath = path.join(projDir, "config_qanat.json");
      const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (!isChunkedNarrationProject(config, storyboard)) {
        return res.status(400).json({
          error: "O fluxo oficial exige narração por trechos.",
          code: "CHUNKED_NARRATION_REQUIRED",
        });
      }
      const plan = storyboard.narration_chunk_plan;
      if (
        !plan?.chunks?.length ||
        !allNarrationChunksHaveAudio(plan, projDir)
      ) {
        return res.status(409).json({
          error: "Gere todos os trechos antes de finalizar a narração.",
          code: "NARRATION_AUDIO_INCOMPLETE",
        });
      }
      const audit = readNarrationAudit(projDir);
      const approval = assertNarrationChunksApproved(plan, audit.events);
      await assembleNarrationChunksToMaster(projDir, plan, {
        onLog: (message) => console.log(`[Narration Finalize] ${message}`),
      });
      writeTimingsFromChunkPlan(projDir, plan);
      appendNarrationAuditEvent(projDir, {
        type: "master_assembled",
        status: "approved",
        chunk_count: plan.chunks.length,
        approval_count: approval.approved_count,
      });
      appendProjectEventLog(projDir, {
        component: "narration",
        event: "narration_master_approved",
        message: "Master aprovado remontado; Whisper liberado.",
        details: {
          chunk_count: plan.chunks.length,
          approval_count: approval.approved_count,
        },
      });
      res.json({
        success: true,
        message:
          "Narração aprovada montada. O Whisper pode calcular o plano visual.",
        approval,
      });
    } catch (err) {
      const projDir = getProjectDir(req);
      appendProjectEventLog(projDir, {
        level: "error",
        component: "narration",
        event: "narration_finalize_failed",
        message: err?.message || String(err),
        details: { code: err?.code, approval: err?.approval },
      });
      res.status(err?.code === "NARRATION_REVIEW_REQUIRED" ? 409 : 500).json({
        error: err?.message || String(err),
        code: err?.code || "NARRATION_FINALIZE_FAILED",
        approval: err?.approval,
      });
    }
  });

  app.post("/api/narration-chunks/resync-timeline", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const storyboardPath = path.join(projDir, "storyboard.json");
      const configPath = path.join(projDir, "config_qanat.json");
      const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (!isChunkedNarrationProject(config, storyboard)) {
        return res
          .status(400)
          .json({ error: "Projeto não usa narração por trechos." });
      }
      const plan = storyboard.narration_chunk_plan;
      if (!plan?.chunks?.length) {
        return res.status(400).json({ error: "Plano de trechos ausente." });
      }
      let whisperTranscripts = null;
      let flatWords = [];
      const wtPath = path.join(projDir, "word_transcripts.json");
      if (fs.existsSync(wtPath)) {
        whisperTranscripts = JSON.parse(fs.readFileSync(wtPath, "utf8"));
        flatWords = flattenWordTranscripts(whisperTranscripts);
      }
      const applied = applyChunkedNarrationSyncToProject(projDir, {
        chunkPlan: plan,
        config,
        storyboard,
        whisperTranscripts,
        flatWords,
      });
      res.json({
        success: true,
        message: "Timeline re-sincronizada pelos trechos de narração.",
        timings: applied.timings,
      });
    } catch (err) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  app.post("/api/narration-chunks/restore-version", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const storyboardPath = path.join(projDir, "storyboard.json");
      const configPath = path.join(projDir, "config_qanat.json");
      const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const plan = storyboard.narration_chunk_plan;
      const chunk = plan?.chunks?.find(
        (item) => item.id === req.body?.chunk_id
      );
      if (!chunk)
        return res.status(404).json({ error: "Trecho não encontrado." });
      const version = (chunk.versions || []).find(
        (item) => item.file === req.body?.file
      );
      if (!version)
        return res.status(404).json({ error: "Versão não encontrada." });
      const source = path.resolve(projDir, version.file);
      const destination = path.resolve(projDir, chunk.audio_file);
      const projectRoot = path.resolve(projDir) + path.sep;
      if (
        !source.startsWith(projectRoot) ||
        !destination.startsWith(projectRoot) ||
        !fs.existsSync(source)
      ) {
        return res.status(400).json({ error: "Arquivo da versão é inválido." });
      }
      fs.copyFileSync(source, destination);
      chunk.duration_s = version.duration_s || chunk.duration_s;
      chunk.voice = version.voice || chunk.voice;
      chunk.generation_signature =
        version.generation_signature || chunk.generation_signature;
      chunk.status = "generated";
      persistChunkPlanToProject(projDir, plan, config);
      appendNarrationAuditEvent(projDir, {
        type: "version_restore",
        status: "restored",
        chunk_id: chunk.id,
        audio_file: version.file,
      });
      res.json({ success: true, plan });
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Falha ao restaurar versão." });
    }
  });

  app.post("/api/tts/generate-narration", async (req, res) => {
    const projDir = getProjectDir(req);
    const {
      voice,
      rate,
      pitch,
      speed,
      engine,
      ttsOptions,
      progress_job_id: progressJobIdRaw,
    } = req.body || {};
    const progressJobId = normalizeJobId(progressJobIdRaw);
    const report = createProgressReporter(progressJobId);
    const ttsParams = {
      voice,
      rate: rate || "+0%",
      pitch: pitch || "+0Hz",
      speed,
      platform: engine || "kokoro",
      workspaceDir: WORKSPACE_DIR,
      ttsOptions:
        ttsOptions && typeof ttsOptions === "object" ? ttsOptions : {},
      onLog: (msg) => console.log(msg),
      onProgress: report,
    };

    const runGeneration = async () => {
      const result = await generateNarrationTts(projDir, ttsParams);
      try {
        applyNarrationSyncToProject(projDir);
      } catch (syncErr) {
        console.warn(
          "[TTS] Falha ao sincronizar narração no Timeline Studio:",
          syncErr?.message || syncErr
        );
      }
      if (progressJobId) {
        finishJobProgress(
          progressJobId,
          result.message || "Narração TTS gerada"
        );
      }
      return result;
    };

    try {
      if (progressJobId) {
        res.json({ started: true, jobId: progressJobId });
        runGeneration().catch((err) => {
          console.error("[TTS] Falha na geração assíncrona:", err);
          failJobProgress(progressJobId, err.message);
        });
        return;
      }
      const result = await runGeneration();
      res.json(result);
    } catch (err) {
      if (progressJobId) failJobProgress(progressJobId, err.message);
      res.status(500).json({ error: err.message });
    }
  });

  async function dubCallGemini(projDir, prompt, opts = {}) {
    const apiKeys = getApiKeys(projDir);
    if (!apiKeys?.[0])
      throw new Error("Chave Gemini não configurada para tradução.");
    return callGeminiWithRetry(apiKeys[0], prompt, {
      ...opts,
      projectDir: projDir,
    });
  }

  app.get("/api/dub/sources", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      res.json({
        sources: listDubSourceVideos(projDir),
        languages: DUB_TARGET_LANGUAGES,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/dub/analyze", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const logs = [];
      const { sourceId, language } = req.body || {};
      const result = await analyzeDubProject(projDir, {
        sourceId,
        pythonPath: PYTHON_PATH,
        language: language || "auto",
        onLog: (msg) => logs.push(msg),
      });
      res.json({ ...result, logs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/dub/generate", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const logs = [];
      const body = req.body || {};
      const result = await runLumieraDub(
        projDir,
        {
          sourceId: body.sourceId,
          targetLanguage: body.targetLanguage || "en",
          sourceLanguage: body.sourceLanguage || "auto",
          engine: body.engine || "fish",
          voice: body.voice,
          skipTranslate: Boolean(body.skipTranslate),
          bgmVolume: body.bgmVolume ?? 0.35,
          forceRetranscribe: Boolean(body.forceRetranscribe),
          fishOptions:
            body.fish && typeof body.fish === "object" ? body.fish : {},
        },
        {
          pythonPath: PYTHON_PATH,
          workspaceDir: WORKSPACE_DIR,
          callGemini: (prompt, opts) => dubCallGemini(projDir, prompt, opts),
        }
      );
      res.json({ ...result, logs });
    } catch (err) {
      if (err?.geminiBrowserPending) return;
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/publish-prep", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const logs = [];
      const result = await runPublishPrep(projDir, {
        generateMetadata: (dir) =>
          generateYoutubeMetadataForProject(dir, { req, res }),
        generateThumbnails: async (dir, metadata) =>
          generateYoutubeThumbnailImages({
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
    res.json({
      presets:
        LISTICLE_WORKFLOW_PRESETS[format] || LISTICLE_WORKFLOW_PRESETS.SHORTS,
    });
  });

  app.post("/api/creator/apply-preset", (req, res) => {
    try {
      const { presetId, format = "SHORTS" } = req.body || {};
      const list =
        LISTICLE_WORKFLOW_PRESETS[format] || LISTICLE_WORKFLOW_PRESETS.SHORTS;
      const preset = list.find((p) => p.id === presetId);
      if (!preset)
        return res.status(404).json({ error: "Preset não encontrado." });
      res.json({ applied: applyListiclePreset(preset, { format }) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/creator/run-pipeline", async (req, res) => {
    const projDir = getProjectDir(req);
    const stepsParam =
      req.query?.steps || "sync,stock,automap,bgm,mix,metadata,thumbnails";
    const steps = String(stepsParam)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

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
      res.write(
        `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`
      );
    }
    res.end();
  });

  app.post("/api/ai/apply-bgm", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const config =
        readJsonFile(path.join(projDir, "config_qanat.json")) || {};
      const mode =
        config.aspect_ratio === "9:16" || config.video_format === "SHORTS"
          ? "SHORTS"
          : "LONGO";
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
        const globalPath = path.join(
          WORKSPACE_DIR,
          "dashboard-qanat",
          "backend",
          "render_config_global.json"
        );
        let globalCfg = readJsonFile(globalPath) || {};
        if (typeof pexels_api_key === "string")
          globalCfg.pexels_api_key = pexels_api_key.trim();
        if (typeof pixabay_api_key === "string")
          globalCfg.pixabay_api_key = pixabay_api_key.trim();
        writeJsonAtomicSync(globalPath, globalCfg);
      } else {
        const configPath = path.join(projDir, "config_qanat.json");
        let config = readJsonFile(configPath) || {};
        if (typeof pexels_api_key === "string")
          config.pexels_api_key = pexels_api_key.trim();
        if (typeof pixabay_api_key === "string")
          config.pixabay_api_key = pixabay_api_key.trim();
        writeJsonAtomicSync(configPath, config);
      }

      res.json({
        success: true,
        keys: getWorkflowApiKeys(WORKSPACE_DIR, projDir),
      });
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

      const format =
        String(formatRaw || "SHORTS").toUpperCase() === "LONGO" ||
        String(formatRaw || "").toUpperCase() === "LONG"
          ? "LONGO"
          : "SHORTS";

      const browserText = extractBrowserResponse(req.body);
      let llmFn = null;

      if (browserText) {
        llmFn = async () => browserText;
      } else if (useAi && callGeminiLlm) {
        llmFn = async (prompt) => {
          const text = await callGeminiLlm(req, res, projDir, {
            title: "OpenMontage · Análise de referência",
            prompt,
            temperature: 0.45,
          });
          if (text == null) {
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

      if (!result.ok) {
        return res
          .status(400)
          .json({ error: result.error || "Falha na análise" });
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
      const result = runClipFactory(WORKSPACE_DIR, projDir, {
        enqueue: enqueue !== false,
      });
      if (!result.ok) {
        return res
          .status(400)
          .json({ error: result.error || "Clip Factory falhou" });
      }
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/workflow/archive-search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q)
        return res.status(400).json({ error: "Informe q=termo de busca" });
      const preferVideo = req.query.video === "1";
      const hits = await searchArchiveOrg(q, { rows: 10, preferVideo });
      res.json({ ok: true, query: q, hits });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/workflow/bing-image-search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q)
        return res.status(400).json({ error: "Informe q=termo de busca" });
      const hits = await searchBingImages(q, { count: 12 });
      res.json({ ok: true, query: q, hits });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/workflow/bing-video-search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q)
        return res.status(400).json({ error: "Informe q=termo de busca" });
      const hits = await searchBingVideos(q, { count: 18 });
      res.json({ ok: true, query: q, hits });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/mobilewan/generate", async (req, res) => {
    try {
      const { prompt, aspect_ratio, steps, high_quality } = req.body || {};
      if (!prompt || !String(prompt).trim()) {
        return res.status(400).json({ error: "Prompt obrigatório." });
      }
      const result = await queueMobileWanGeneration({
        prompt: String(prompt).trim(),
        aspect_ratio: aspect_ratio || "9:16",
        steps: steps ? parseInt(steps, 10) : 3,
        high_quality: Boolean(high_quality),
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/generation-jobs/:promptId", (req, res) => {
    res.json(getExternalJobProgress(req.params.promptId));
  });

  app.get("/api/generation-jobs/:promptId/output", (req, res) => {
    const filePath = resolveExternalJobOutput(req.params.promptId);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Arquivo não encontrado." });
    }
    res.sendFile(path.resolve(filePath));
  });

  app.post("/api/collage-broll/send-to-project", (req, res) => {
    try {
      const sessionId = String(req.body?.sessionId || "").trim();
      const projectName = String(req.body?.projectName || sessionId).trim();
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId é obrigatório" });
      }

      const session = loadCollageSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      const { longsDir, shortsDir } = getProjectsDirs();
      let targetDir = path.join(longsDir, projectName);
      let isShorts = false;
      if (!fs.existsSync(targetDir)) {
        const testShorts = path.join(shortsDir, projectName);
        if (fs.existsSync(testShorts)) {
          targetDir = testShorts;
          isShorts = true;
        } else {
          const format = session.format || "SHORTS";
          if (format === "SHORTS") {
            targetDir = testShorts;
            isShorts = true;
          }
        }
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const assetsDir = path.join(targetDir, "ASSETS");
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      const items = Array.isArray(session.items) ? session.items : [];
      const copiedFiles = [];
      const visualPrompts = [];

      items.forEach((item, idx) => {
        const cardId = item.id || `c${idx + 1}`;
        const outputCardDir = cardOutputDir(sessionId, cardId);

        const possibleVideoPaths = [
          item.video_path,
          path.join(outputCardDir, "final-5s.mp4"),
          path.join(outputCardDir, "omni", "final-5s.mp4"),
        ].filter(Boolean);

        let copiedVideoName = null;
        for (const vPath of possibleVideoPaths) {
          if (fs.existsSync(vPath)) {
            const destName = `${cardId}_video.mp4`;
            const destPath = path.join(assetsDir, destName);
            fs.copyFileSync(vPath, destPath);
            copiedVideoName = destName;
            copiedFiles.push(destName);
            break;
          }
        }

        const possibleEndPaths = [
          item.endFrame?.imagePath,
          item.still_path,
          path.join(outputCardDir, "frames", "end-frame.png"),
          path.join(outputCardDir, "still.png"),
        ].filter(Boolean);

        let copiedEndName = null;
        for (const ePath of possibleEndPaths) {
          if (fs.existsSync(ePath)) {
            const destName = `${cardId}_end.png`;
            fs.copyFileSync(ePath, path.join(assetsDir, destName));
            copiedEndName = destName;
            copiedFiles.push(destName);
            break;
          }
        }

        const possibleStartPaths = [
          item.startFrame?.imagePath,
          path.join(outputCardDir, "frames", "start-frame.png"),
        ].filter(Boolean);
        for (const sPath of possibleStartPaths) {
          if (fs.existsSync(sPath)) {
            const destName = `${cardId}_start.png`;
            fs.copyFileSync(sPath, path.join(assetsDir, destName));
            copiedFiles.push(destName);
            break;
          }
        }

        visualPrompts.push({
          scene: `${idx + 1}.1`,
          block: idx + 1,
          narration_text: item.line || "",
          duration: 5.0,
          type: copiedVideoName ? "video" : "image",
          prompt:
            item.motion?.videoPrompt ||
            item.omni_prompt ||
            buildMotionPrompt(item) ||
            "",
          aspect_ratio: isShorts ? "9:16" : "16:9",
          editor_notes: "Collage b-roll step",
          asset: copiedVideoName
            ? {
                asset: copiedVideoName,
                type: "video",
              }
            : {
                asset: copiedEndName || `${cardId}_end.png`,
                type: "image",
              },
        });
      });

      const plainScript = items.map((i) => i.line || "").join("\n");
      fs.writeFileSync(
        path.join(targetDir, "transcripts_readable.txt"),
        plainScript,
        "utf8"
      );

      // Copy default config_qanat.json if it doesn't exist
      const configPath = path.join(targetDir, "config_qanat.json");
      if (!fs.existsSync(configPath)) {
        const defaultConfigSrc = path.join(WORKSPACE_DIR, "config_qanat.json");
        if (fs.existsSync(defaultConfigSrc)) {
          fs.copyFileSync(defaultConfigSrc, configPath);
          try {
            const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
            cfg.video_format = isShorts ? "SHORTS" : "LONGO";
            cfg.aspect_ratio = isShorts ? "9:16" : "16:9";
            cfg.niche = session.niche || "Geral";
            fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf8");
          } catch (e) {}
        }
      }

      // Initialize block_timings.json
      const blockTimingsPath = path.join(targetDir, "block_timings.json");
      if (!fs.existsSync(blockTimingsPath)) {
        const starts = [];
        const durations = [];
        let total = 0;
        items.forEach((item, idx) => {
          starts.push(total);
          durations.push(5.0);
          total += 5.0;
        });
        const blockTimings = {
          starts,
          durations,
          total_duration: total,
        };
        fs.writeFileSync(
          blockTimingsPath,
          JSON.stringify(blockTimings, null, 4),
          "utf8"
        );
      }

      // Copy script templates
      const ensureFileExists = (fileName) => {
        const src = path.join(WORKSPACE_DIR, fileName);
        const dest = path.join(targetDir, fileName);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      };
      ensureFileExists("build_video.py");
      ensureFileExists("build_video_destacado.py");
      ensureFileExists("mix_bgm.py");
      ensureFileExists("find_block_timings.py");
      ensureFileExists("align_transcripts.py");
      ensureFileExists("upload_pipeline.py");
      ensureFileExists("upload_youtube.py");
      ensureFileExists("upload_instagram.py");
      ensureFileExists("upload_tiktok_playwright.py");
      ensureFileExists("upload_kwai_playwright.py");

      // Initialize wizard_session.json directly in the project folder
      const wizardSessionPath = path.join(targetDir, "wizard_session.json");
      const wizardSessionPayload = {
        version: 1,
        savedAt: new Date().toISOString(),
        wasInWizard: true,
        activeTab: "creator",
        activeProject: projectName,
        creatorStep: 4,
        ideationTab: "collage-broll",
        creatorProjectName: projectName,
        narrationDraft: plainScript,
        nicheInput: session.niche || "Geral",
        formatSelector: isShorts ? "SHORTS" : "LONGO",
      };
      fs.writeFileSync(
        wizardSessionPath,
        JSON.stringify(wizardSessionPayload, null, 2),
        "utf8"
      );

      const storyboardPath = path.join(targetDir, "storyboard.json");
      let existingStoryboard = {};
      if (fs.existsSync(storyboardPath)) {
        try {
          existingStoryboard = JSON.parse(
            fs.readFileSync(storyboardPath, "utf8")
          );
          fs.writeFileSync(
            path.join(targetDir, "storyboard_backup.json"),
            JSON.stringify(existingStoryboard, null, 2),
            "utf8"
          );
        } catch (e) {}
      }

      const newStoryboard = {
        ...existingStoryboard,
        strategy: {
          ...(existingStoryboard.strategy || {}),
          title_main: projectName,
          niche: session.niche || "Geral",
        },
        narrative_script: plainScript,
        narrative_script_tagged: plainScript,
        visual_prompts: visualPrompts,
        design_preset: session.mode === "geo" ? "geographic" : "documentary",
      };
      fs.writeFileSync(
        storyboardPath,
        JSON.stringify(newStoryboard, null, 2),
        "utf8"
      );

      res.json({
        ok: true,
        projectName,
        targetDir,
        copiedFilesCount: copiedFiles.length,
        copiedFiles,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  return { generateYoutubeMetadataForProject, buildCreatorPipelineHandlers };
}
