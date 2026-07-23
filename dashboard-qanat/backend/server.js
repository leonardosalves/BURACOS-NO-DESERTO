import express from "express";
import https from "https";
import channelRouter from "./channelRoutes.js";
import toolsRouter from "./channelTools.js";
import oauthRouter from "./youtubeOAuth.js";
import memoryRouter from "./memoryEngine.js";
import abRouter from "./titleABTest.js";
import calendarRouter from "./editorialCalendar.js";
import searchRouter from "./channelAwareSearch.js";
import healthRouter from "./systemHealth.js";
import agentsRouter from "./studioAgents.js";
import templatesRouter from "./templatesManager.js";
import flowRouter from "./flowLab.js";
import { getFfmpegStatus } from "./pythonEnv.js";
import { ensureMp4Faststart } from "./mp4Faststart.js";
import { normalizeReverseEngineeredStoryboard } from "../shared/reverseEngineeringMedia.js";
import { applyExclusiveIntroEndToRemotionProps } from "../shared/exclusiveIntroEndLayout.js";
import { alignExclusiveAudioTimeline } from "../shared/exclusiveAudioTimeline.js";
import {
  resolvePovPlacement,
  applyPovToStoryboard,
  enforcePovNoChannelNarrationPolicy,
} from "../shared/povBlock.js";

import {
  getLumieraServiceOpsStatus,
  scheduleLumieraServiceRestart,
} from "./lumieraServiceOps.js";
import { registerProjectHealthRoutes } from "./projectHealthRoutes.js";
import { registerAssetCleanupRoutes } from "./assetCleanupRoutes.js";
import { registerSpecializedStoryboardImportRoute } from "./specializedStoryboardImport.js";
import { registerYoutubeQualityGateRoutes } from "./youtubeQualityGateRoutes.js";
import { runYoutubeQualityGate } from "./youtubeQualityGate.js";
import {
  appendProjectEventLog,
  summarizeTimelineAssets,
} from "./projectEventLog.js";
import {
  buildGeminiKeyPool,
  shouldRotateGeminiKey,
  isGeminiModelOverloadStatus,
  isGeminiQuotaStatus,
  geminiMaxKeysBeforeModelSwitch,
} from "./geminiApiKeys.js";
import {
  searchMusic,
  downloadMusicTrack,
  searchSoundEffects,
  downloadSoundEffect,
} from "./epidemicService.js";
import {
  buildOverlayOrchestrationPlan,
  buildOrchestrationPrompt,
  enforceOverlayOrchestration,
  VARIETY_PROFILES,
} from "./overlayOrchestration.js";
import {
  buildOverlayResearchPromptBlock,
  resolveOverlayResearchForPlanning,
} from "./overlayResearchService.js";
import {
  buildBlockProgressIconAiPrompt,
  buildBlockProgressTitleAiPrompt,
  buildDefaultBlockProgressMarkers,
  collectBlockNarrationsByBlock,
  mergeAiBlockProgressIcons,
  mergeAiBlockProgressTitles,
  normalizeBlockProgressDesign,
  resolveBlockProgressBarForRender,
  resolveChaptersTextForProject,
} from "./blockProgressBarConfig.js";
import {
  buildYoutubeMetadataPrompt,
  buildFallbackYoutubeMetadata,
  normalizeMetadataMarkdown,
  parseYoutubeMetadataMarkdown,
  assessMetadataFidelity,
  buildPlatformMetadataPackages,
  resolveYoutubeMetadataContext,
  ensureThumbnailVariants,
  YOUTUBE_METADATA_PIPELINE_VERSION,
} from "./youtubeMetadataOptimizer.js";
import { generateYoutubeThumbnailImages } from "./youtubeThumbnailGenerator.js";
import {
  buildCanvaAuthUrl,
  exchangeCanvaAuthCode,
  getCanvaConnectionStatus,
  saveCanvaCredentials,
} from "./canvaClient.js";
import { generateCanvaThumbnailImages } from "./canvaThumbnailService.js";
import {
  applyTitleVariant,
  applyWinnerTitle,
  fetchRetentionCurve,
  fetchVideoVelocity,
  getTitleExperimentReport,
  getYoutubeScopeString,
  getYoutubeTokenScopes,
  loadTitleExperiment,
  resetYoutubeAuth,
  startTitleExperiment,
  stopTitleExperiment,
  syncExperimentVideoId,
} from "./youtubeTitleAnalytics.js";
import {
  fetchChannelAlerts,
  fetchChannelComments,
  fetchChannelOverview,
  fetchChannelVideosWithAnalytics,
  fetchChannelSummary,
  fetchLumieraVideosReport,
  fetchVideoStudioDetail,
  purgeYoutubeChannelCacheForProject,
  replyToChannelComment,
} from "./youtubeChannelAnalytics.js";
import {
  LUMIERA_BACKEND_BASE,
  LUMIERA_YOUTUBE_CALLBACK,
} from "./lumieraUrls.js";
import { LUMIERA_CODE_MAP, getCompactCodeMapText } from "./lumieraCodeMap.js";
import { adaptMetadataForPlatforms } from "./platformMetadataAdapter.js";
import { runPostUploadHooks } from "./postUploadService.js";
import { startTitleRotationScheduler } from "./titleRotationScheduler.js";
import {
  loadStudioSettings,
  markCommentHandled,
  saveStudioSettings,
  updateReplyTemplates,
} from "./youtubeStudioSettings.js";
import {
  fetchChannelPeriodComparison,
  fetchChannelReachMetrics,
  fetchProjectYoutubeSnapshot,
  generateWeeklyReport,
  sendWeeklyReportEmail,
  suggestCommentReply,
  startYoutubeWeeklyReportScheduler,
} from "./youtubeStudioExtras.js";
import {
  bulkReplyComments,
  commentsToCsv,
  computeChannelResponseStats,
  fetchChannelTitleExperiments,
  generateCommentIdeas,
  generateDailyReport,
  getExtendedStudioSettings,
  getPostPublishChecklist,
  listManagedChannels,
  pinVideoComment,
  saveExtendedStudioSettings,
  savePostPublishChecklistItem,
  sendWebhookNotification,
  startYoutubeDailyReportScheduler,
  translateCommentText,
  videosToCsv,
} from "./youtubeStudioAdvanced.js";
import { runCompetitorResearch } from "./competitorResearch.js";
import {
  appendPlanToObsidian,
  LUMIERA_AGENT_REGISTRY,
  LUMIERA_INTENT_MAP,
  extractVideoTitleFromRequirement,
  planVideoAgentLocally,
  planVideoAgentWithLlm,
} from "./videoAgentPlanner.js";
import {
  addChannelNote,
  appendReplyHistory,
  buildApprovalQueueFromComments,
  deleteChannelNote,
  fetchAudienceHeatmap,
  fetchProDashboard,
  fetchRetentionCliffReport,
  fetchYppMilestones,
  getPreUploadChecklistState,
  getProSettings,
  mineSeoKeywords,
  saveProSettings,
  sendQueueItem,
  togglePreUploadItem,
  updateQueueItem,
} from "./youtubeStudioPro.js";
import {
  applyThumbnailVariant,
  getThumbnailExperimentReport,
  loadThumbnailExperiment,
  startThumbnailExperiment,
} from "./thumbnailExperiment.js";
import { runFullPipeline } from "./pipelineOrchestrator.js";
import { registerWorkflowRoutes } from "./workflowRoutes.js";
import { registerTimelineStudioRoutes } from "./timelineStudioRoutes.js";
import { createLumieraRenderSnapshot } from "./lumieraEditorStorage.js";
import { registerMotionSceneRoutes } from "./motionSceneRoutes.js";
import { registerMotionRoutes } from "./motionRoutes.js";
import {
  tagStoryboardWithMotion,
  tagHistoricalStoryboard,
  calcularPotencialMotion,
} from "./creatorSceneTagger.js";
import { registerMotionFlyoverUploadRoute } from "./motionFlyoverUpload.js";
import { registerRemotionTemplateStudioRoutes } from "./remotionTemplateStudioRoutes.js";
import templateRoutes from "./templateRoutes.js";
import {
  orchestrateProduction,
  resolveCreatorOrchestrationOptions,
  applyOrchestrationToStoryboard,
} from "./productionOrchestrator.js";
import {
  isAiOverlaysEnabled,
  stripAiOverlaysFromStoryboard,
} from "../shared/productionConfig.js";
import {
  backfillVisualPromptNarration,
  motionScenesToMotionClips,
} from "./motionScenePlanner.js";
import {
  buildNarrationArtifacts,
  isVisualPromptNarration,
} from "./narrationIntegrity.js";
import { getCatalogForNiche } from "./remotionTemplateCatalogService.js";
import {
  loadStudioForRender,
  shouldUseStudioForRender,
  buildScenesFromStudio,
  buildOverlaysFromStudio,
  collectRelativeMediaPaths,
  mirrorRelativeAssetsToRemotionPublic,
  buildCaptionsFromStudio,
  resolveStudioTotalDuration,
  resolveScenesTimelineEnd,
  resolveStudioFormat,
  resolveMotionPlanForRender,
  enrichRemotionScenesWithMotionPlan,
} from "./timelineStudioRenderSync.js";

const LOGO_OUTRO_DURATION_SEC = 4.5;
import {
  applyNarrationSyncToProject,
  syncStudioTimingToStoryboard,
  syncStudioBrollToTimelineAssets,
} from "./timelineStudioMigration.js";
import {
  registerVideoResurrectorRoutes,
  startVideoResurrectorScheduler,
} from "./videoResurrectorRoutes.js";
import { registerSocialPublishRoutes } from "./socialPublishRoutes.js";
import {
  markSocialPublishPosted,
  markSocialPublishFailed,
} from "./socialPublishQueue.js";
import { startSocialPublishScheduler } from "./socialPublishRunner.js";

import { registerResearchRoutes } from "./researchRoutes.js";
import { registerTimesfmRoutes } from "./timesfmRoutes.js";
import { registerWhiteboardRoutes } from "./whiteboardRoutes.js";
import { isPioneerStrategyText } from "./pioneerNicheDiscovery.js";
import { registerAgentReachRoutes } from "./agentReachRoutes.js";
import { registerVideoMonitorRoutes } from "./videoMonitorRoutes.js";
import { registerGeminiWatermarkRoutes } from "./geminiWatermarkRoutes.js";
import creatorHistoryRoutes from "./creatorHistoryRoutes.js";
import { ensureCreatorHistoryDatabase } from "./creatorHistoryService.js";
import {
  fetchMemoryContext,
  getSupermemoryStatus,
  isSupermemoryEnabled,
  persistConversation,
  testSupermemoryConnection,
} from "./supermemoryClient.js";
import { buildCompetitorLlmFns } from "./researchLlmHelpers.js";
import {
  runDeepResearch,
  formatDeepResearchForIdeasPrompt,
} from "./deerFlowResearch.js";
import {
  getGeminiBrowserMode,
  buildBrowserChatPrompt,
  buildBrowserTaskPrompt,
  resolveBrowserPromptOpts,
  buildPromptFromBodyOverride,
  extractBrowserResponse,
  createMetadataSessionId,
  extractMetadataSessionFromPrompt,
  isMetadataBrowserResponseReady,
  looksLikeFallbackMetadata,
  looksLikeLumieraPrompt,
  looksLikeOverlayJsonResponse,
  extractOverlayJsonPayload,
  offerGeminiBrowserPayload,
  GEMINI_BROWSER_INSTRUCTIONS,
  GEMINI_BROWSER_PENDING,
} from "./geminiBrowser.js";
import {
  analyzeSceneGaps,
  fetchStockForScenes,
  generateNarrationTts,
  runPublishPrep,
} from "./workflowTools.js";
import { buildPythonSpawnEnv } from "./pythonEnv.js";
import {
  fetchNotebooklmResearch,
  fetchNotebooklmScriptContext,
  fetchNotebooklmScriptImprovements,
  formatNotebooklmPromptBlock,
  getNotebooklmStatus,
  startNotebooklmLogin,
  clearNotebooklmLoginState,
  buildNotebooklmImproveApplyPrompt,
  buildNotebooklmNarrationEnrichPrompt,
  handleNotebooklmSessionReply,
  loadNotebooklmSession,
  closeNotebooklmSession,
  persistNotebooklmResearchSession,
  loadNotebooklmBrief,
  formatNotebooklmBriefPromptBlock,
  shouldSkipWebResearchForBrief,
  mergeBriefIntoStoryboard,
  shouldPauseNotebooklmNarration,
  resolveNeedsNlmDiscovery,
  wantsNotebooklmInteractiveNarration,
  clearNotebooklmProjectArtifacts,
  shouldClearNotebooklmArtifacts,
  hasNotebooklmProgress,
  parsePipelineChecklist,
  NOTEBOOKLM_BRIEF_FILENAME,
  NOTEBOOKLM_PIPELINE_STEPS,
} from "./notebooklmService.js";
import {
  fetchWebResearchForTopic,
  formatWebResearchPromptBlock,
} from "./webResearchService.js";
import {
  appendIdeasHistory,
  buildIdeasExclusionAddendum,
  buildIdeasExplorationAxes,
  buildIdeasFreshnessInstruction,
  collectProjectTopics,
  loadIdeasHistory,
  makeIdeasGenerationSeed,
  mergeExclusionTopics,
} from "./ideasVariety.js";
import {
  CreatorIdeasContractError,
  generateCreatorIdeasWithSingleRetry,
  validateCreatorExpressInput,
  validateCreatorExpressPayload,
} from "./creatorIdeasContract.js";
import {
  ensureProjectsDirs,
  listLegacySystemProjects,
  recoverLegacyProject,
  resolveProjectsRoot,
} from "./projectsRoot.js";
import {
  buildInstagramAuthUrl,
  exchangeInstagramCode,
  getInstagramConnectionStatus,
  saveInstagramAppCredentials,
} from "./instagramOAuth.js";
import {
  SCRIPT_CREATIVE_REINFORCEMENT,
  buildFormatScriptRules,
  buildIdeasQualityAddendum,
  buildIdeaOpportunityAddendum,
  buildCustomIdeaEvaluationPrompt,
  normalizeIdeaOpportunity,
  buildViralIdeasAddendum,
  buildListicleIdeasAddendum,
  buildListicleRankingIdeasPrompt,
  buildNicheIsolationAddendum,
  buildNicheVarietyInstruction,
  normalizeListicleIdeasResponse,
  buildListicleScriptRules,
  resolveListicleBlockCount,
  clampListicleRankCount,
  buildHumanizeRepairPrompt,
  buildFactPreservingRepairPrompt,
  buildNarrationAuditRepairPrompt,
  extractScriptSliceForRepair,
  mergeHumanizedScript,
  applyScriptTextQuality,
  assessAutomaticScriptQuality,
  runAutomaticScriptRepair,
  applyAutomaticScriptRepairToStoryboard,
  runNarrationAuditRepairLoop,
  assessEditorialContract,
  assessNarrationReadiness,
  assessNarracaoProIntegrity,
  assessVisualStoryboardReadiness,
  buildNarrationOnlyPrompt,
  buildCreatorFullScriptPrompt,
  buildCreatorPhase2Prompt,
  salvageScriptJson,
  enrichBrowserNarrationParsed,
  enrichBrowserVisualPromptsParsed,
  browserVisualPromptsUsable,
  extractNarrativeScriptFromRaw,
  buildDeterministicVisualPromptsFromNarration,
  buildNarrationHumanizeRepairPrompt,
  mergeHumanizedNarration,
  mergeEnrichedNarration,
  normalizeNarrationBlocks,
  needsVisualPromptsRepair,
  normalizeVisualPromptBlocks,
  parseBlockNumber,
  buildVisualPromptsFromNarrationPrompt,
  mergeVisualPromptsRepair,
  buildBatchScenePromptsAiRequest,
  applyBatchScenePromptsAiResponse,
  buildHistoricalWitnessContractBlock,
  normalizeScriptChecklist,
  isChecklistEmpty,
  buildScriptChecklistEvaluationPrompt,
  buildChecklistSchemaBlock,
  VISUAL_PROMPT_SPECIFICITY_RULES,
  buildVisualPromptEngineerRequest,
  buildCinematicVideoPromptRepairPrompt,
  assessCinematicVideoPromptDetail,
  applyProjectVisualAssetStyleToPrompts,
  enforceNarrativeMaterialFidelity,
  enforceVisualLocalizedTextRule,
  sanitizeVisualPromptDurations,
  enforceShortsVideoSceneMix,
  loadNarracaoProGuidelines,
  ensureNarrationCoverage,
  dedupeNearDuplicateVisualPromptsInBlocks,
  finalizeGeneratedVisualPromptMedia,
} from "./scriptQuality.js";
import {
  buildSeedanceDirectingRequest,
  applySeedanceDirectingResponse,
} from "./seedanceDirecting.js";
import {
  generateSeedanceScenes,
  attachSeedanceT2vOutput,
  buildSeedanceT2vPrompt,
  isVideoIaScene,
  listVideoIaSceneIndices,
} from "./seedanceT2v.js";
import { loadSeedanceApiConfig } from "./seedanceApiProvider.js";
import {
  isMobileWanAvailable,
  downloadMobileWanWeights,
} from "./mobilewanService.js";
import {
  applyDocumentaryHistoryPreset,
  injectListicleRankOverlays,
  avoidListicleHudCollisions,
  pruneListicleOverlayDensity,
  validateVideoQuality,
  augmentSfxTimelineForOverlays,
  runVideoQualityCheck,
  buildCinematicNarrationRules,
  buildEpidemicMoodPrompt,
  ensureProjectSfxPack,
  buildBgmDuckPoints,
  truncatePropsForPreview,
  resolveThumbnailPalette,
  getEpidemicMoodForNiche,
  stabilizeOverlayTimings,
  injectProLayoutOverlays,
  filterOverlaysByVisualConfig,
} from "./videoProEnhancements.js";
import {
  buildProfessionalSfxScenes,
  buildSfxPlaybackSegments,
  isImageMediaForSfx,
  normalizeProfessionalSfxEvents,
  rankProfessionalSfxCandidates,
  shouldIncludeAutomaticSfx,
} from "./professionalSfxTiming.js";
import {
  analyzeProfessionalSfxForRender,
  calculateNormalizedProfessionalSfxVolume,
  normalizeProfessionalSfxAsset,
} from "./professionalSfxRenderMix.js";
import { buildProfessionalSfxMultimodalRequest } from "./professionalSfxMultimodal.js";
import {
  buildBlockSonoplastiaPlan,
  buildProjectBlockRanges,
  blocksNeedingBgmDownload,
  collectProjectBlockNumbers,
  formatSonoplastiaLog,
  resolveBlockSearchTheme,
} from "./bgmSonoplastia.js";
import {
  buildBgmEmotionPlan,
  buildBgmEmotionPlanPrompt,
  buildEmotionMappingsFromLocalFiles,
  buildHeuristicEmotionSegments,
  formatEmotionPlanLog,
  normalizeEmotionSegments,
  parseAiEmotionPlanResponse,
  resolveBgmMode,
  segmentsNeedingBgmDownload,
  stitchEmotionSegmentsContinuous,
  syncEmotionMappingsToPlan,
} from "./bgmEmotionPlan.js";
import {
  applyBgmProductionDefaults,
  getBgmProductionHints,
  harmonizeEmotionSegments,
  resolveMusicVolumeForRender,
} from "./bgmProductionDefaults.js";
import {
  bindStoryboardAssetsFromTimeline,
  bootstrapNewProjectConfig,
  mergeTimelineSlotFromStoryboard,
  reconcileTimelineAssetsToStoryboard,
  sanitizeTimelineAssetsForProject,
} from "./projectConfigBootstrap.js";
import {
  isBgmMusicCandidate,
  listBgmMusicCandidates,
  findProjectFileLocal,
  projectBgmFileExists,
} from "./bgmMusicFiles.js";
import {
  buildHeuristicNarrationChunks,
  buildNarrationChunkPlan,
  buildNarrationChunkPlanPrompt,
  formatNarrationChunkPlanLog,
  hashNarrationIntegrityText,
  normalizeNarrationChunkPlan,
  parseAiNarrationChunkResponse,
  persistChunkPlanToProject,
  applyChunkedNarrationSyncToProject,
  promoteNarrationChunkPlanAsApprovedSource,
  syncTimelineFromChunkPlan,
  computeChunkTimeline,
  applyChunkedTimelineAfterWhisper,
  isChunkedNarrationProject,
  NARRATION_MODE_CHUNKED,
  NARRATION_MODE_MASTER,
  probeAudioDuration,
} from "./narrationChunks.js";
import { normalizeTtsEngine, resolveTtsVoice } from "./ttsPreferences.js";
import {
  installNarrationAtomically,
  MAX_NARRATION_UPLOAD_BYTES,
  removeTemporaryNarration,
} from "./narrationUpload.js";
import {
  appendNarrationAuditEvent,
  assertApprovedNarrationMasterReady,
  latestNarrationReviews,
  narrationChunkApprovalState,
  readNarrationAudit,
} from "./narrationAudit.js";
import { compareNarrationChunksWithWhisper } from "./narrationComparison.js";
import { resolveCaptionRenderSettings } from "./captionConfig.js";
import {
  computeOverlayDisplayDuration,
  extractBlockIndex,
  getBlockTiming,
  isInformativeOverlay,
  isHudOverlay,
  hasAiPlannedOverlays,
  isPlaceholderInformativeOverlay,
  isManualOverlayTiming,
  redistributeInformativeOverlayStarts,
  verifyAndRepairAiOverlayTiming,
  overlayTimingIssuesFromReport,
  resolveOverlaysForTimingCheck,
  applyOverlayTimingRepair,
} from "./overlayTiming.js";
import {
  buildLearningsPromptAddendum,
  buildStudioAgentsPromptAddendum,
  injectStudioAgentsContext,
  captureQualityRun,
  getDashboard,
  getNicheLearnings,
  getSkillsRegistryStatus,
  listSkills,
  listSkillBundles,
  viewSkill,
  listSkillWorkshopProposals,
  applyWorkshopProposalById,
  rejectWorkshopProposal,
  ensureDefaultSkillBundles,
  resolveBundlePreview,
  loadStudioAgentsConfig,
  previewConsolidation,
  reflectProject,
  runConsolidation,
  saveStudioAgentsConfig,
  shouldSkipAutoCapture,
} from "./studioAgents.js";
import {
  detectVideoFormat,
  getDefaultBlockTimings,
  VIDEO_FORMAT,
} from "./formatResolver.js";
import { buildPreRenderAdvice } from "./preRenderAdvice.js";
import { resolveObsidianNotesForNiche } from "./obsidianMemoryContext.js";
import {
  createProgressJobResponse,
  createProgressReporter,
  finishJobProgress,
  finishJobProgressWithResult,
  failJobProgress,
  getJobProgress,
  listAiJobs,
  normalizeJobId,
  setJobProgress,
} from "./aiJobProgress.js";
import {
  appendRenderJobLog,
  countActiveRenderJobs,
  createRenderJob,
  createRenderJobId,
  failRenderJob,
  finishRenderJob,
  getActiveRenderJobForProject,
  getRenderJob,
  listRenderJobs,
  updateRenderJob,
} from "./renderJobProgress.js";
import {
  listRecentAiCalls,
  listRecentRequests,
  processActivityMiddleware,
  readProjectEventsTail,
  recordAiCall,
  updateAiCall,
  cancelRequestOrJob,
} from "./processActivityHub.js";
import {
  getObsidianVaultStatus,
  openInObsidian,
  ensureObsidianVault,
  repairVaultGraphLinks,
  auditVaultGraph,
} from "./obsidianVault.js";
import {
  flattenWordTranscripts,
  buildBlockSceneTimings,
  blockHasExplicitSync,
  blockHasLockedDurations,
  blockUsesSequentialFixedLayout,
  isAssetDurationLocked,
  assetHasExplicitDuration,
  buildTimelineAssetMap,
  sanitizeFullTimelineAssets,
  realignTimelineAssetsToSpeech,
  recalculateSequentialAudioStarts,
  bootstrapTimelineSlotsFromWhisper,
  syncProjectTimelineAfterWhisper,
  tightenTimelineRetentionDurations,
  applyWhisperDurationsToStoryboard,
  fillSceneTimelineGaps,
} from "./timelineSceneSync.js";
import { sanitizeTranscriptSegmentWords } from "../shared/wordTranscripts.js";
import {
  hasMojibakeDeep,
  repairOverlayPropsEncoding,
  repairOverlaysEncoding,
  repairStoryboardEncoding,
} from "./textEncoding.js";
import { loadStockUsageRegistry } from "./mediaUsageRegistry.js";
import {
  needsListItemsRepair,
  repairListItemsWithAI,
  ensureListItemsInProject,
} from "./listicleRepair.js";
import {
  applyStudioDefaultsPatch,
  getStudioDefaultsFromRenderConfig,
  isStudioConfigKey,
  mergeGlobalStudioIntoProjectConfig,
  isSfxEnabled,
} from "./globalStudioDefaults.js";
import {
  ensureBrandCatalogMigrated,
  loadRenderConfig,
  saveRenderConfig,
  listBrandLogos,
  addBrandLogo,
  updateBrandLogo,
  selectBrandLogo,
  deleteBrandLogo,
  listYoutubeChannelsFromConfig,
  addYoutubeChannel,
  updateYoutubeChannel,
  selectYoutubeChannel,
  deleteYoutubeChannel,
  resolveLogoFilePath,
  readYoutubeChannelFromCatalog,
  getLogosDir,
  youtubeAvatarCacheKey,
  clearYoutubeAvatarCaches,
} from "./brandAssets.js";
import {
  extractTitleFacts,
  buildTitleCraftRules,
  buildTitleRepairPrompt,
  titlesLackRelevance,
  buildStrategyTitleRepairPrompt,
  applyTitleQualityToParsed,
  mergeRepairedTitles,
  mergeRepairedStrategyTitles,
  enhanceStrategyTitles,
  titlesNeedRepair,
} from "./titleGenerator.js";

import cors from "cors";

import fs from "fs";

import path from "path";

import { spawn, execSync, spawnSync } from "child_process";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// Workspace is the parent of dashboard-qanat

const WORKSPACE_DIR = path.resolve(__dirname, "../..");

const REMOTION_DIR = path.resolve(__dirname, "../remotion-renderer");

const REMOTION_PUBLIC_DIR = path.join(REMOTION_DIR, "public");

const LOTTIE_ASSETS_DIR = path.join(REMOTION_DIR, "src/overlays/lottie_assets");

const activeRenderProcesses = new Map();

const PYTHON_PATH = "C:\\Users\\Leo\\AppData\\Local\\Python\\bin\\python.exe";

// Desktop projects — servico Windows usa perfil SYSTEM; resolver pasta real do Leo
const {
  projectsRoot: PROJECTS_ROOT,
  longsDir: LONGS_DIR,
  shortsDir: SHORTS_DIR,
} = ensureProjectsDirs();
console.log(`[Projects] ROOT=${PROJECTS_ROOT}`);

// OpenRouter Settings
// Chave de fallback embutida (sempre disponível se o usuário não colar a própria).
const OPENROUTER_DEFAULT_KEY =
  "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";

// Ordem: melhores para programação/JSON primeiro; depois gerais free.
// Fonte: openrouter.ai/api/v1/models (cota free, jul/2026). Ling free saiu de linha.
const OPENROUTER_MODEL_OPTIONS = [
  {
    id: "qwen/qwen3-coder:free",
    label: "Qwen3 Coder 480B (free)",
    hint: "Melhor free para código e JSON estruturado",
  },
  {
    id: "cohere/north-mini-code:free",
    label: "Cohere North Mini Code (free)",
    hint: "Focado em código — contexto 256k",
  },
  {
    id: "openai/gpt-oss-20b:free",
    label: "OpenAI gpt-oss-20b (free)",
    hint: "Raciocínio/código compacto",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    label: "Qwen3 Next 80B Instruct (free)",
    hint: "Instruções longas e estrutura",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "Nemotron 3 Super 120B (free)",
    hint: "Agentes, coding e tool-calling",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron 3 Ultra 550B (free)",
    hint: "Maior Nemotron free — raciocínio forte",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    label: "Nemotron 3 Nano 30B (free)",
    hint: "Rápido para coding/instruções",
  },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    label: "Nemotron 3 Nano Omni (free)",
    hint: "Multimodal + reasoning",
  },
  {
    id: "google/gemma-4-31b-it:free",
    label: "Gemma 4 31B IT (free)",
    hint: "Bom equilíbrio qualidade/velocidade",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    label: "Gemma 4 26B A4B (free)",
    hint: "Gemma 4 MoE — rápido e estável",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B Instruct (free)",
    hint: "Forte em instruções gerais",
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    label: "Hermes 3 405B (free)",
    hint: "Alto raciocínio (pode estar instável)",
  },
  {
    id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    label: "Dolphin Mistral 24B Venice (free)",
    hint: "Chat geral free",
  },
  {
    id: "poolside/laguna-m.1:free",
    label: "Poolside Laguna M.1 (free)",
    hint: "Agentes/coding local-style",
  },
  {
    id: "poolside/laguna-xs-2.1:free",
    label: "Poolside Laguna XS 2.1 (free)",
    hint: "Leve para tarefas longas",
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    label: "Nemotron Nano 9B V2 (free)",
    hint: "SLM rápido",
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    label: "Llama 3.2 3B Instruct (free)",
    hint: "Muito leve — fallback final",
  },
  {
    id: "tencent/hy3:free",
    label: "Tencent Hy3 (free)",
    hint: "Cota free Tencent",
  },
  {
    id: "openrouter/free",
    label: "OpenRouter Free Router",
    hint: "Auto-escolhe um free disponível (bom fallback)",
  },
];

const OPENROUTER_FREE_MODELS = OPENROUTER_MODEL_OPTIONS.map(
  (option) => option.id
);

const DEFAULT_OPENROUTER_MODEL = OPENROUTER_FREE_MODELS[0];

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "50mb", strict: true }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/channels", channelRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/youtube", oauthRouter);
app.use("/api/memory", memoryRouter);
app.use("/api/ab", abRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/search", searchRouter);
app.use("/api/health", healthRouter);
app.use("/api/agents", agentsRouter);
// Channel title templates (legado) — path dedicado para não colidir com Template Store
app.use("/api/channel-templates", templatesRouter);
app.use("/api/flows", flowRouter);

function resolveProjectPath(projParam) {
  if (!projParam) return WORKSPACE_DIR;
  if (path.isAbsolute(projParam) && fs.existsSync(projParam)) return projParam;
  const candidates = [
    path.resolve(WORKSPACE_DIR, projParam),
    path.resolve(LONGS_DIR, projParam),
    path.resolve(SHORTS_DIR, projParam),
    path.resolve(PROJECTS_ROOT, projParam),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(WORKSPACE_DIR, projParam);
}

registerGeminiWatermarkRoutes(app, resolveProjectPath);

// Catch malformed JSON syntax errors to prevent crashing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.warn("[Body Parser Error] Malformed JSON received:", err.message);
    return res
      .status(400)
      .json({ error: "Malformed JSON payload: " + err.message });
  }
  next(err);
});

// --- Crash log persistente (sobrevive a restarts) ---
const CRASH_LOG_PATH = path.join(
  WORKSPACE_DIR,
  ".lumiera-logs",
  "backend-crashes.log"
);
const CRASH_LOG_MAX_BYTES = 5 * 1024 * 1024;
const CRASH_LOG_THROTTLE_MS = 30000;
const LOG_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
const JOB_LOG_RETENTION_MS = 24 * 60 * 60 * 1000;
const TEXT_LOG_EXTENSIONS = new Set([".log", ".txt"]);
const crashLogLastSeen = new Map();

function crashLogKey(kind, err) {
  const code = err?.code ? `:${err.code}` : "";
  const message =
    err instanceof Error ? err.message : String(err ?? "(unknown)");
  return `${kind}${code}:${message.slice(0, 180)}`;
}

function shouldWriteCrashLog(kind, err) {
  const key = crashLogKey(kind, err);
  const now = Date.now();
  const last = crashLogLastSeen.get(key) || 0;
  if (now - last < CRASH_LOG_THROTTLE_MS) return false;
  crashLogLastSeen.set(key, now);
  return true;
}

function appendCrashLog(kind, err) {
  try {
    if (!shouldWriteCrashLog(kind, err)) return;
    fs.mkdirSync(path.dirname(CRASH_LOG_PATH), { recursive: true });
    try {
      const stat = fs.existsSync(CRASH_LOG_PATH)
        ? fs.statSync(CRASH_LOG_PATH)
        : null;
      if (stat && stat.size > CRASH_LOG_MAX_BYTES) {
        fs.writeFileSync(
          CRASH_LOG_PATH,
          `[${new Date().toISOString()}] [log-rotated] backend-crashes.log excedeu ${CRASH_LOG_MAX_BYTES} bytes e foi reiniciado.\n`,
          "utf8"
        );
      }
    } catch (_) {
      /* se a rotacao falhar, ainda tentamos registrar o erro atual */
    }
    const ts = new Date().toISOString();
    const stack = err instanceof Error ? err.stack : String(err ?? "(unknown)");
    const line = `[${ts}] [${kind}] ${stack}\n`;
    fs.appendFileSync(CRASH_LOG_PATH, line, "utf8");
  } catch (_) {
    /* melhor não crashar o crash handler */
  }
}

function safeConsoleError(...args) {
  try {
    console.error(...args);
  } catch (err) {
    appendCrashLog("consoleError", err);
  }
}

function cleanupLumieraLogs() {
  try {
    fs.mkdirSync(path.dirname(CRASH_LOG_PATH), { recursive: true });
    const logDir = path.dirname(CRASH_LOG_PATH);
    const now = Date.now();
    for (const entry of fs.readdirSync(logDir, { withFileTypes: true })) {
      const full = path.join(logDir, entry.name);
      try {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!TEXT_LOG_EXTENSIONS.has(ext)) continue;
          const stat = fs.statSync(full);
          const tooOld = now - stat.mtimeMs > LOG_RETENTION_MS;
          const tooBig = stat.size > CRASH_LOG_MAX_BYTES;
          if (tooOld) {
            fs.unlinkSync(full);
          } else if (tooBig) {
            fs.writeFileSync(
              full,
              `[${new Date().toISOString()}] [log-rotated] arquivo excedeu ${CRASH_LOG_MAX_BYTES} bytes e foi reiniciado.\n`,
              "utf8"
            );
          }
          continue;
        }
        if (!entry.isDirectory()) continue;
        if (entry.name !== "ai-jobs" && entry.name !== "render-jobs") continue;
        const cutoff = now - JOB_LOG_RETENTION_MS;
        for (const jobFile of fs.readdirSync(full, { withFileTypes: true })) {
          if (!jobFile.isFile() || !jobFile.name.endsWith(".json")) continue;
          const jobPath = path.join(full, jobFile.name);
          const stat = fs.statSync(jobPath);
          if (stat.mtimeMs < cutoff) fs.unlinkSync(jobPath);
        }
      } catch (_) {
        /* limpeza oportunista: se arquivo estiver em uso, fica para a proxima */
      }
    }
  } catch (_) {
    /* limpeza nunca pode impedir o backend de subir */
  }
}

cleanupLumieraLogs();
setInterval(cleanupLumieraLogs, 60 * 60 * 1000).unref?.();

process.on("uncaughtException", (err) => {
  if (err?.code !== "EPIPE") {
    safeConsoleError("[Lumiera] uncaughtException (processo mantido):", err);
  }
  appendCrashLog("uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  safeConsoleError("[Lumiera] unhandledRejection (processo mantido):", reason);
  appendCrashLog("unhandledRejection", reason);
});

/**
 * Wrapper para rotas async — captura rejeições e envia 500 em vez de
 * deixar a promise escapar como unhandledRejection.
 * Uso: app.get("/rota", asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      safeConsoleError(
        `[asyncHandler] Erro em ${req.method} ${req.originalUrl}:`,
        err
      );
      appendCrashLog(
        "asyncHandler",
        err instanceof Error
          ? err
          : new Error(`${req.method} ${req.originalUrl}: ${err}`)
      );
      if (!res.headersSent) {
        res.status(500).json({
          error: err instanceof Error ? err.message : String(err),
          route: `${req.method} ${req.originalUrl}`,
        });
      }
    });
  };
}

// Health ultra-leve — registrado ANTES de middlewares pesados (watchdog nao mata processo ocupado)
app.get("/api/cesium/config", (_req, res) => {
  res.json({
    map_engine: String(process.env.LUMIERA_MAP_ENGINE || "blender"),
    ionAccessToken: String(process.env.CESIUM_ION_ACCESS_TOKEN || "").trim(),
    googleMapsApiKey: String(process.env.GOOGLE_MAPS_API_KEY || "").trim(),
  });
});

app.get("/api/map/engine", async (_req, res) => {
  const { isBlenderAvailable, resolveBlenderExecutable } =
    await import("./blenderMapService.js");
  res.json({
    map_engine: String(process.env.LUMIERA_MAP_ENGINE || "blender"),
    blender_available: isBlenderAvailable(),
    blender_path: resolveBlenderExecutable() || null,
  });
});

app.get("/api/health", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Connection", "close");
  const renderActive = countActiveRenderJobs();
  res.status(200).send(
    JSON.stringify({
      ok: true,
      service: "lumiera-backend",
      notebooklm_flow: "interactive-first-v2",
      ts: Date.now(),
      uptime_sec: Math.floor(process.uptime()),
      pid: process.pid,
      render_active: renderActive,
      busy: renderActive > 0,
      projects_root: PROJECTS_ROOT,
    })
  );
});

app.get("/api/ops/service", (_req, res) => {
  try {
    res.json({ ok: true, ...getLumieraServiceOpsStatus(__dirname) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Cache curto da cota do provedor ativo (evita martelar APIs a cada poll 2,5s). */
let aiQuotaCache = { at: 0, data: null, provider: null, projectDir: null };

/**
 * Snapshot de cota/uso do provedor de IA ativo (OpenRouter key, Gemini keys, NVIDIA…).
 */
async function fetchAiQuotaSnapshot(projectDir = WORKSPACE_DIR) {
  const now = Date.now();
  const provider = getAiProvider(projectDir);
  const model = getActiveAiModel(projectDir);
  // Invalida cache se trocou provedor ou projeto (senão fica "COTA OPENROUTER" com Gemini ativo)
  if (
    aiQuotaCache.data &&
    now - aiQuotaCache.at < 25_000 &&
    aiQuotaCache.provider === provider &&
    aiQuotaCache.projectDir === String(projectDir || "")
  ) {
    return { ...aiQuotaCache.data, cached: true };
  }
  const snapshot = {
    ok: true,
    provider,
    model,
    label: "",
    detail: "",
    note: "",
    free_tier: null,
    is_free_model: Boolean(
      model && (String(model).includes(":free") || model === "openrouter/free")
    ),
    usage: null,
    usage_daily: null,
    usage_weekly: null,
    usage_monthly: null,
    limit: null,
    remaining: null,
    unit: "",
    free_rpm: null,
    free_rpd: null,
    gemini_key_count: null,
    updatedAt: now,
    cached: false,
  };

  try {
    if (provider === "openrouter") {
      const apiKey = getOpenRouterApiKey(projectDir);
      if (!apiKey) {
        snapshot.ok = false;
        snapshot.label = "OpenRouter sem chave";
        snapshot.detail = "Configure a chave em Configurações → IA.";
      } else {
        const res = await fetch("https://openrouter.ai/api/v1/key", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          snapshot.ok = false;
          snapshot.label = `OpenRouter HTTP ${res.status}`;
          snapshot.detail = "Não foi possível ler a cota da chave.";
        } else {
          const json = await res.json().catch(() => ({}));
          const d = json?.data || {};
          snapshot.free_tier = Boolean(d.is_free_tier);
          snapshot.usage = d.usage ?? null;
          snapshot.usage_daily = d.usage_daily ?? 0;
          snapshot.usage_weekly = d.usage_weekly ?? 0;
          snapshot.usage_monthly = d.usage_monthly ?? 0;
          snapshot.limit = d.limit ?? null;
          snapshot.remaining = d.limit_remaining ?? null;
          snapshot.unit = "USD";
          // Cota publicadas de modelos :free no OpenRouter
          snapshot.free_rpm = 20;
          snapshot.free_rpd = snapshot.free_tier ? 50 : 1000;
          if (snapshot.limit != null && snapshot.remaining != null) {
            snapshot.label = `Crédito key · ${Number(snapshot.remaining).toFixed(4)} restante`;
            snapshot.detail = `Limite key $${Number(snapshot.limit).toFixed(2)} · uso $${Number(snapshot.usage || 0).toFixed(4)}`;
          } else if (snapshot.free_tier || snapshot.is_free_model) {
            snapshot.label = snapshot.free_tier
              ? `Free tier · ~${snapshot.free_rpd} req/dia (:free)`
              : `Modelos :free · ~${snapshot.free_rpd} req/dia`;
            snapshot.detail = `Uso key (USD): dia $${snapshot.usage_daily} · sem $${snapshot.usage_weekly} · mês $${snapshot.usage_monthly}`;
          } else {
            snapshot.label = `Uso $${Number(snapshot.usage || 0).toFixed(4)}`;
            snapshot.detail = `Dia $${snapshot.usage_daily} · sem $${snapshot.usage_weekly} · mês $${snapshot.usage_monthly}`;
          }
          snapshot.note = snapshot.is_free_model
            ? `Modelo free · ~${snapshot.free_rpm} RPM · ~${snapshot.free_rpd} req/dia (OpenRouter).`
            : "Cota da chave OpenRouter (GET /api/v1/key).";
        }
      }
    } else if (provider === "nvidia") {
      const hasKey = Boolean(getNvidiaApiKey(projectDir));
      snapshot.ok = hasKey;
      snapshot.free_tier = true;
      snapshot.label = hasKey
        ? "NVIDIA NIM · cota da conta"
        : "NVIDIA sem chave";
      snapshot.detail = hasKey
        ? `Modelo ${model || "—"}. Limites diários no build.nvidia.com (sem API pública de saldo).`
        : "Configure a chave nvapi em Configurações → IA.";
      snapshot.note =
        "Cota free NIM: ver dashboard NVIDIA (rate limit por modelo/conta).";
    } else if (provider === "gemini") {
      const keys = getApiKeys(projectDir);
      snapshot.gemini_key_count = keys.length;
      snapshot.ok = keys.length > 0;
      snapshot.label =
        keys.length > 0
          ? `Gemini · ${keys.length} chave(s) em rotação`
          : "Gemini sem chave";
      snapshot.detail =
        keys.length > 0
          ? `Modelo ${model || "—"}. Cota por chave no AI Studio / Google Cloud.`
          : "Adicione chaves Gemini em Configurações → IA.";
      snapshot.note = "Cotas exatas no Google AI Studio (por projeto/chave).";
    } else if (provider === "xai") {
      const hasKey = Boolean(getXaiApiKey(projectDir));
      snapshot.ok = hasKey;
      snapshot.label = hasKey ? "xAI / Grok · conta ativa" : "xAI sem chave";
      snapshot.detail = hasKey
        ? `Modelo ${model || "grok"}. Cota em console.x.ai.`
        : "Configure a chave xAI em Configurações → IA.";
    } else if (provider === "alibaba") {
      const hasKey = Boolean(getAlibabaApiKey(projectDir));
      const base = getAlibabaBaseUrl(projectDir);
      snapshot.ok = hasKey;
      snapshot.label = hasKey
        ? "Alibaba Model Studio · DashScope"
        : "Alibaba sem chave";
      snapshot.detail = hasKey
        ? `Modelo ${model || getAlibabaModel(projectDir)}. Host: ${base.replace(/^https?:\/\//, "").slice(0, 48)}…`
        : "Cole a chave sk-ws-… em Configurações → IA → Alibaba.";
      snapshot.note =
        "Ative o modelo (Qwen-Plus/Turbo) no console Model Studio se aparecer AccessDenied.Unpurchased.";
    } else if (provider === "tokenrouter") {
      const hasKey = Boolean(getTokenRouterApiKey(projectDir));
      const base = getTokenRouterBaseUrl(projectDir);
      snapshot.ok = hasKey;
      snapshot.label = hasKey
        ? "TokenRouter · OpenAI-compatible"
        : "TokenRouter sem chave";
      snapshot.detail = hasKey
        ? `Modelo ${model || getTokenRouterModel(projectDir)}. Host: ${base.replace(/^https?:\/\//, "").slice(0, 48)}…`
        : "Cole a chave sk-… em Configurações → IA → TokenRouter.";
      snapshot.note =
        "Gateway unificado (300+ modelos). base_url = https://api.tokenrouter.com/v1";
    } else if (provider === "opencode") {
      const hasKey = Boolean(getOpenCodeApiKey(projectDir));
      const base = getOpenCodeBaseUrl(projectDir);
      snapshot.ok = true; // chave padrão embutida
      snapshot.label = "OpenCode · Forge Gateway API";
      snapshot.detail = `Modelo ${model || getOpenCodeModel(projectDir)}. Host: ${base.replace(/^https?:\/\//, "").slice(0, 48)}…`;
      snapshot.note = `32 modelos (DeepSeek, GPT, Claude, Grok, Kimi, Gemini). base_url = ${OPENCODE_DEFAULT_BASE_URL}`;
    } else if (provider === "local") {
      snapshot.ok = true;
      snapshot.label = "LLM local · sem cota cloud";
      snapshot.detail = `Modelo ${model || getLocalLlmModel(projectDir) || "—"}.`;
      snapshot.note = "Uso limitado só pelo hardware local.";
    } else {
      snapshot.label = `Provedor ${provider}`;
      snapshot.detail = `Modelo ${model || "—"}`;
    }
  } catch (err) {
    snapshot.ok = false;
    snapshot.label = "Erro ao ler cota";
    snapshot.detail = err?.message || String(err);
  }

  aiQuotaCache = {
    at: now,
    data: snapshot,
    provider,
    projectDir: String(projectDir || ""),
  };
  return { ...snapshot, cached: false };
}

/** Painel lateral: chamadas HTTP recentes + jobs de IA/render + eventos do projeto. */
app.get("/api/ops/activity", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 60));
    const renderActive = countActiveRenderJobs();
    let projectEvents = [];
    let projectName = "";
    let projDirForQuota = WORKSPACE_DIR;
    try {
      const ctx = getRequestProjectContext(req);
      projectName = ctx.resolvedName || ctx.requestedName || "";
      if (ctx.resolved && ctx.projDir && !ctx.fallbackWorkspace) {
        projectEvents = readProjectEventsTail(ctx.projDir, {
          limit: Math.min(40, limit),
        });
        projDirForQuota = ctx.projDir;
      }
    } catch {
      /* optional */
    }

    const aiJobs = listAiJobs({ limit: 30 }).map((j) => ({
      jobId: j.jobId,
      phase: j.phase,
      label: j.label,
      percent: j.percent,
      detail: j.detail || "",
      done: Boolean(j.done),
      error: j.error || null,
      awaitingBrowser: Boolean(j.awaitingBrowser),
      provider: j.provider || null,
      model: j.model || null,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
      kind: "job",
    }));

    const aiCalls = listRecentAiCalls({ limit: 40 }).map((c) => ({
      ...c,
      kind: "call",
    }));

    // Unifica jobs de progresso + chamadas LLM recentes (modelo/provider)
    const aiFeed = [
      ...aiJobs.map((j) => ({
        id: j.jobId,
        kind: "job",
        label: j.label || j.phase || "Job IA",
        phase: j.phase,
        percent: j.percent,
        provider: j.provider,
        model: j.model,
        detail: j.detail,
        status: j.error ? "error" : j.done ? "ok" : "running",
        error: j.error,
        awaitingBrowser: j.awaitingBrowser,
        startedAt: j.createdAt,
        updatedAt: j.updatedAt,
        durationMs: null,
      })),
      ...aiCalls.map((c) => ({
        id: `call-${c.id}`,
        kind: "call",
        label: c.label,
        phase: c.status,
        percent: c.status === "running" ? 40 : c.status === "ok" ? 100 : 100,
        provider: c.provider,
        model: c.model,
        modelsTried: c.modelsTried,
        detail: c.detail,
        status: c.status,
        error: c.error,
        path: c.path,
        project: c.project,
        startedAt: c.startedAt,
        updatedAt: c.updatedAt,
        durationMs: c.durationMs,
      })),
    ].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const renderJobs = listRenderJobs({ limit: 20 })
      .slice(0, 20)
      .map((j) => ({
        jobId: j.jobId,
        projectName: j.projectName,
        status: j.status,
        phase: j.phase,
        percent: j.percent,
        done: Boolean(j.done),
        error: j.error || null,
        childPid: j.childPid || null,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        logTail: Array.isArray(j.logs) ? j.logs.slice(-8) : [],
      }));

    const requests = listRecentRequests({ limit });
    const aiHttp = requests.filter((r) => r.kind === "ai");

    const activeDir = projDirForQuota || WORKSPACE_DIR;
    let aiQuota = null;
    try {
      aiQuota = await fetchAiQuotaSnapshot(activeDir);
    } catch {
      aiQuota = {
        ok: false,
        label: "Cota indisponível",
        detail: "",
        provider: getAiProvider(activeDir),
        model: getActiveAiModel(activeDir),
      };
    }

    res.json({
      ok: true,
      ts: Date.now(),
      health: {
        service: "lumiera-backend",
        uptime_sec: Math.floor(process.uptime()),
        pid: process.pid,
        render_active: renderActive,
        busy:
          renderActive > 0 ||
          aiFeed.some((j) => j.status === "running" || j.status === "browser"),
        memory_mb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        projects_root: PROJECTS_ROOT,
        // Provedor do PROJETO ativo (não só workspace) — jobs LLM usam o config do projeto
        ai_provider: getAiProvider(activeDir),
        ai_model: getActiveAiModel(activeDir),
        gemini_model: getGeminiModel(activeDir),
        openrouter_model: getOpenRouterModel(activeDir),
        nvidia_model: getNvidiaModel(activeDir),
      },
      ai_quota: aiQuota,
      project: projectName || null,
      requests,
      ai_jobs: aiJobs,
      ai_calls: aiCalls,
      ai_feed: aiFeed.slice(0, 50),
      ai_http: aiHttp.slice(0, 40),
      render_jobs: renderJobs,
      project_events: projectEvents,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/ops/activity/cancel", async (req, res) => {
  try {
    const { id } = req.body;
    if (id == null) {
      return res.status(400).json({ ok: false, error: "ID é obrigatório." });
    }
    await cancelRequestOrJob(id);
    res.json({ ok: true, message: `Cancelado: ${id}` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/ops/restart-service", (req, res) => {
  try {
    const renderActive = countActiveRenderJobs();
    if (renderActive > 0 && req.body?.force !== true) {
      return res.status(409).json({
        ok: false,
        error: "Render em andamento — aguarde ou envie force: true.",
        render_active: renderActive,
      });
    }
    const result = scheduleLumieraServiceRestart(__dirname);
    if (!result.scheduled) {
      return res.status(500).json({ ok: false, ...result });
    }
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/render/progress/:jobId", (req, res) => {
  const job = getRenderJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Job de render não encontrado." });
  }
  res.json(job);
});

app.get("/api/render/active", (req, res) => {
  const projectName = String(req.query.project || "").trim();
  const job = projectName ? getActiveRenderJobForProject(projectName) : null;
  res.json({ job: job || null });
});

app.post("/api/render/cancel", (req, res) => {
  const jobId = req.body.jobId;
  const projectName = req.body.project;

  let cancelled = false;

  if (jobId) {
    const child = activeRenderProcesses.get(jobId);
    if (child) {
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /pid ${child.pid} /t /f`);
        } else {
          child.kill("SIGKILL");
        }
      } catch (e) {
        console.warn(`Error killing process for job ${jobId}:`, e.message);
      }
      activeRenderProcesses.delete(jobId);
      cancelled = true;
    }
    failRenderJob(jobId, "Cancelado pelo usuário");
  }

  if (projectName) {
    const pyKey = `python_${projectName}`;
    const child = activeRenderProcesses.get(pyKey);
    if (child) {
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /pid ${child.pid} /t /f`);
        } else {
          child.kill("SIGKILL");
        }
      } catch (e) {
        console.warn(
          `Error killing python process for project ${projectName}:`,
          e.message
        );
      }
      activeRenderProcesses.delete(pyKey);
      cancelled = true;
    }

    // Also cancel any active remotion job for this project
    const activeJob = getActiveRenderJobForProject(projectName);
    if (activeJob) {
      const child = activeRenderProcesses.get(activeJob.jobId);
      if (child) {
        try {
          if (process.platform === "win32") {
            execSync(`taskkill /pid ${child.pid} /t /f`);
          } else {
            child.kill("SIGKILL");
          }
        } catch (e) {
          console.warn(
            `Error killing remotion process for job ${activeJob.jobId}:`,
            e.message
          );
        }
        activeRenderProcesses.delete(activeJob.jobId);
        cancelled = true;
      }
      failRenderJob(activeJob.jobId, "Cancelado pelo usuário");
    }
  }

  res.json({ ok: true, cancelled });
});

app.use(cors({ origin: true, credentials: true }));
app.use(processActivityMiddleware);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Mídia de projeto pode ser cacheada pelo browser (áudio, imagens, vídeo)
  const isMediaRoute = req.path.startsWith("/api/projects-media");
  res.setHeader(
    "Cache-Control",
    isMediaRoute
      ? "public, max-age=3600"
      : req.path.startsWith("/api/")
        ? "no-store"
        : "public"
  );
  next();
});

if (fs.existsSync(LOTTIE_ASSETS_DIR)) {
  app.use(
    "/lottie_assets",
    express.static(LOTTIE_ASSETS_DIR, { maxAge: "7d", fallthrough: true })
  );
}

// Serve Remotion public projects directory (for dashboard preview player and static assets)
app.use(
  "/projects",
  (req, res, next) => {
    const remotionPublicProjectsDir = path.join(
      REMOTION_PUBLIC_DIR,
      "projects"
    );
    if (!fs.existsSync(remotionPublicProjectsDir)) {
      fs.mkdirSync(remotionPublicProjectsDir, { recursive: true });
    }
    next();
  },
  express.static(path.join(REMOTION_PUBLIC_DIR, "projects"), {
    maxAge: "1d",
    acceptRanges: true,
    fallthrough: true,
  })
);

// Body parsers moved to top of file to allow early routes to access req.body

app.use("/api/channels", channelRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/oauth", oauthRouter);
app.use("/api/memory", memoryRouter);
app.use("/api/title-ab", abRouter);
app.use("/api/editorial-calendar", calendarRouter);
app.use("/api/search", searchRouter);
app.use("/api/health", healthRouter);
app.use("/api/agents", agentsRouter);
// Channel title templates (legado) — path dedicado para não colidir com Template Store
app.use("/api/channel-templates", templatesRouter);
app.use("/api/flows", flowRouter);

// Cache de resolução de projetos — evita readdirSync em cada request de mídia
const _projectDirCache = new Map();
const _PROJECT_DIR_CACHE_TTL = 60_000; // 60s

function resolveProjectDirFromName(rawProjName) {
  if (!rawProjName) return null;

  const projName = Array.isArray(rawProjName) ? rawProjName[0] : rawProjName;
  if (!projName) return null;

  // Checar cache primeiro
  const cacheKey = String(projName).trim();
  const cached = _projectDirCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < _PROJECT_DIR_CACHE_TTL) {
    return cached.dir;
  }

  const decoded = decodeURIComponent(String(projName));
  const candidates = [
    projName,
    decoded,
    String(projName).replace(/ /g, "_"),
    decoded.replace(/ /g, "_"),
  ];
  const unique = [...new Set(candidates.filter(Boolean))];

  const tryDir = (name) => {
    for (const parent of [LONGS_DIR, SHORTS_DIR, WORKSPACE_DIR]) {
      const dir = path.join(parent, name);
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
    }
    return null;
  };

  for (const name of unique) {
    const hit = tryDir(name);
    if (hit) {
      _projectDirCache.set(cacheKey, { dir: hit, ts: Date.now() });
      return hit;
    }
  }

  const prefix = unique.sort((a, b) => b.length - a.length)[0];
  if (prefix && prefix.length >= 10) {
    const matches = [];
    for (const parent of [LONGS_DIR, SHORTS_DIR]) {
      if (!fs.existsSync(parent)) continue;
      for (const item of fs.readdirSync(parent)) {
        const full = path.join(parent, item);
        try {
          if (fs.statSync(full).isDirectory() && item.startsWith(prefix))
            matches.push(full);
        } catch {
          /* skip */
        }
      }
    }
    if (matches.length === 1) {
      _projectDirCache.set(cacheKey, { dir: matches[0], ts: Date.now() });
      return matches[0];
    }
  }

  const slugParts = String(prefix || unique[0] || "")
    .split("_")
    .filter(Boolean);
  if (slugParts.length >= 2) {
    const head = slugParts.slice(0, 2).join("_");
    const headMatches = [];
    for (const parent of [LONGS_DIR, SHORTS_DIR]) {
      if (!fs.existsSync(parent)) continue;
      for (const item of fs.readdirSync(parent)) {
        const full = path.join(parent, item);
        try {
          if (
            fs.statSync(full).isDirectory() &&
            (item === head || item.startsWith(`${head}_`))
          ) {
            headMatches.push(full);
          }
        } catch {
          /* skip */
        }
      }
    }
    if (headMatches.length === 1) {
      _projectDirCache.set(cacheKey, { dir: headMatches[0], ts: Date.now() });
      return headMatches[0];
    }
  }

  _projectDirCache.set(cacheKey, { dir: null, ts: Date.now() });
  return null;
}

function streamMediaWithRanges(req, res, filePath, mimeType) {
  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const wantsDownload =
      String(req.query?.download || "").trim() === "true" ||
      String(req.query?.download || "").trim() === "1";
    const baseName = path.basename(filePath);
    const commonHeaders = {
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    };
    if (wantsDownload) {
      commonHeaders["Content-Disposition"] =
        `attachment; filename*=UTF-8''${encodeURIComponent(baseName)}`;
    } else if (mimeType.startsWith("video/") || mimeType.startsWith("audio/")) {
      commonHeaders["Content-Disposition"] =
        `inline; filename*=UTF-8''${encodeURIComponent(baseName)}`;
    }

    // HEAD: metadados para o player (sem corpo)
    if (req.method === "HEAD") {
      res.writeHead(200, {
        ...commonHeaders,
        "Content-Length": fileSize,
      });
      return res.end();
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (!Number.isFinite(start) || start < 0) {
        res.status(416).end();
        return;
      }
      if (!Number.isFinite(end) || end >= fileSize) end = fileSize - 1;
      // Limita chunk para não travar proxy com ranges enormes
      const maxChunk = 8 * 1024 * 1024;
      if (end - start + 1 > maxChunk) {
        end = Math.min(fileSize - 1, start + maxChunk - 1);
      }

      if (start >= fileSize) {
        res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).end();
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      file.on("error", (err) => {
        console.error("[Media] stream error:", err.message);
        if (!res.headersSent) res.status(500).end();
        else res.destroy(err);
      });
      res.writeHead(206, {
        ...commonHeaders,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": chunksize,
      });
      file.pipe(res);
    } else {
      const file = fs.createReadStream(filePath);
      file.on("error", (err) => {
        console.error("[Media] stream error:", err.message);
        if (!res.headersSent) res.status(500).end();
        else res.destroy(err);
      });
      res.writeHead(200, {
        ...commonHeaders,
        "Content-Length": fileSize,
      });
      file.pipe(res);
    }
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).send("Streaming error: " + e.message);
    }
  }
}

app.use("/api/projects-media", (req, res, next) => {
  const startTime = Date.now();
  // Express já decodifica req.path; decode duplo quebra nomes com %
  let decodedUrl = req.path || "";
  try {
    decodedUrl = decodeURIComponent(req.path);
  } catch {
    decodedUrl = req.path || "";
  }
  const parts = decodedUrl.split("/").filter(Boolean);

  console.log(
    `[Media Req] ${req.method} ${decodedUrl} - Iniciando processamento em ${new Date().toISOString()}`
  );

  if (parts.length === 0) {
    console.log(
      `[Media Req] ${decodedUrl} - Caminho vazio. 404 retornado em ${Date.now() - startTime}ms`
    );
    return res.status(404).end();
  }

  const sendFileOpts = {
    maxAge: "1h",
    acceptRanges: true,
    lastModified: true,
    dotfiles: "deny",
  };

  if (parts[0] === "ASSETS") {
    const allowedGlobalAsset =
      parts[1] === "logos" ||
      /^logo\.(png|jpe?g|webp|svg)$/i.test(parts[1] || "");
    if (!allowedGlobalAsset) {
      console.log(
        `[Media Req] ${decodedUrl} - Bloqueado asset global. 404 retornado em ${Date.now() - startTime}ms`
      );
      return res.status(404).json({
        error:
          "Assets globais desativados para midia de projeto. Informe /api/projects-media/:project/ASSETS/arquivo.",
      });
    }

    const fullFilePath = path.join(WORKSPACE_DIR, parts.join("/"));

    if (fs.existsSync(fullFilePath)) {
      const ext = path.extname(fullFilePath).toLowerCase();
      const mediaTypes = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".m4v": "video/mp4",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
      };
      const mime = mediaTypes[ext];
      if (mime) {
        if (mime.startsWith("video/") || mime.startsWith("audio/")) {
          console.log(
            `[Media Req] ${decodedUrl} - Streaming com Ranges (asset global): ${fullFilePath} em ${Date.now() - startTime}ms`
          );
          return streamMediaWithRanges(req, res, fullFilePath, mime);
        }
        res.type(mime);
      }
      console.log(
        `[Media Req] ${decodedUrl} - Servindo asset global: ${fullFilePath} em ${Date.now() - startTime}ms`
      );
      return res.sendFile(path.resolve(fullFilePath), sendFileOpts);
    }

    console.log(
      `[Media Req] ${decodedUrl} - Asset global não existe: ${fullFilePath}. 404 em ${Date.now() - startTime}ms`
    );
    return res.status(404).json({ error: "Arquivo não encontrado." });
  }

  const projName = parts[0].replace(/ /g, "_");
  const resolveStart = Date.now();
  const projDir = resolveProjectDirFromName(projName);
  const resolveTime = Date.now() - resolveStart;

  if (!projDir) {
    console.log(
      `[Media Req] ${decodedUrl} - Projeto não encontrado: ${projName} (busca levou ${resolveTime}ms). 404 em ${Date.now() - startTime}ms`
    );
    return res
      .status(404)
      .json({ error: `Projeto não encontrado: ${projName}` });
  }

  const fileSubpath = parts.slice(1).join("/");
  const fullFilePath = path.join(projDir, fileSubpath);

  const fileCheckStart = Date.now();
  const resolvedPath =
    fs.existsSync(fullFilePath) && fs.statSync(fullFilePath).isFile()
      ? fullFilePath
      : findProjectFileLocal(projDir, path.basename(fileSubpath));
  const fileCheckTime = Date.now() - fileCheckStart;

  if (resolvedPath && fs.existsSync(resolvedPath)) {
    const ext = path.extname(resolvedPath).toLowerCase();
    const mediaTypes = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".m4v": "video/mp4",
      ".mkv": "video/x-matroska",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".m4a": "audio/mp4",
      ".aac": "audio/aac",
      ".flac": "audio/flac",
      ".ogg": "audio/ogg",
    };
    const mime = mediaTypes[ext];
    if (mime) {
      if (mime.startsWith("video/") || mime.startsWith("audio/")) {
        console.log(
          `[Media Req] ${decodedUrl} - Streaming com Ranges (mídia de projeto): ${resolvedPath} em ${Date.now() - startTime}ms`
        );
        return streamMediaWithRanges(req, res, resolvedPath, mime);
      }
      res.type(mime);
    }
    console.log(
      `[Media Req] ${decodedUrl} - Servindo mídia: ${resolvedPath} (resolução do projeto levou ${resolveTime}ms, check de arquivo levou ${fileCheckTime}ms, enviando arquivo em ${Date.now() - startTime}ms total)`
    );
    return res.sendFile(path.resolve(resolvedPath), sendFileOpts);
  }

  console.log(
    `[Media Req] ${decodedUrl} - Mídia não encontrada: ${fullFilePath} (resolução do projeto levou ${resolveTime}ms, check de arquivo levou ${fileCheckTime}ms, falhou em ${Date.now() - startTime}ms total)`
  );
  return res.status(404).json({ error: "Arquivo de mídia não encontrado." });
});

// Helper: Resolve active project directory dynamically based on request parameters

function getRequestProjectContext(req) {
  let rawProjName = req.query?.project || req.body?.project;
  if (Array.isArray(rawProjName)) rawProjName = rawProjName[0];
  const requestedName = String(rawProjName || "").trim();
  if (!requestedName) {
    return {
      requestedName: "",
      projDir: WORKSPACE_DIR,
      resolved: true,
      resolvedName: path.basename(WORKSPACE_DIR),
      fallbackWorkspace: false,
    };
  }

  const resolved = resolveProjectDirFromName(requestedName);
  if (resolved) {
    global.lastActiveProjectDir = resolved;
    return {
      requestedName,
      projDir: resolved,
      resolved: true,
      resolvedName: path.basename(resolved),
      fallbackWorkspace: false,
    };
  }

  global.lastActiveProjectDir = WORKSPACE_DIR;
  return {
    requestedName,
    projDir: WORKSPACE_DIR,
    resolved: false,
    resolvedName: null,
    fallbackWorkspace: true,
  };
}

function getProjectDir(req) {
  return getRequestProjectContext(req).projDir;
}

function saveNarracaoProTraceReport(projDir, parsedData) {
  if (!parsedData || !parsedData.narracao_pro_trace) return;
  const trace = parsedData.narracao_pro_trace;
  const reportPath = path.join(projDir, "ASSETS", "narracao_pro_report.md");

  let md = `# Relatório de Planejamento NARRACAOPRO\n\n`;
  md += `> [!NOTE]\n`;
  md += `> Este relatório mostra as etapas de pesquisa, tese e auditoria factual executadas sob as diretrizes de \`NARRACAOPRO.md\` e \`COMOUSARANARRACAOPRO.md\`.\n\n`;

  md += `## 🎯 1. Pergunta Central do Vídeo\n`;
  md += `> **${trace.pergunta_central || "Não especificada"}**\n\n`;

  md += `## 📚 2. Pesquisa de Fatos e Fontes Verificadas\n`;
  if (Array.isArray(trace.pesquisa_fatos)) {
    trace.pesquisa_fatos.forEach((f) => {
      md += `* ${f}\n`;
    });
  } else {
    md += `${trace.pesquisa_fatos || "Nenhum fato extraído"}\n`;
  }
  md += `\n`;

  md += `## 🔗 3. Cadeia Lógica (Fato → Causa → Consequência)\n`;
  if (Array.isArray(trace.cadeia_logica)) {
    trace.cadeia_logica.forEach((c) => {
      md += `* ${c}\n`;
    });
  } else {
    md += `${trace.cadeia_logica || "Nenhuma cadeia lógica detalhada"}\n`;
  }
  md += `\n`;

  md += `## 🔍 4. Auditoria Factual e de Coerência\n`;
  md += `${trace.auditoria_factual || "Nenhum relatório de auditoria disponível"}\n\n`;

  md += `## 📊 5. Notas de Auditoria Final (Mínimo de 9/10)\n`;
  if (trace.notas_auditoria) {
    md += `| Métrica | Nota |\n| :--- | :---: |\n`;
    Object.entries(trace.notas_auditoria).forEach(([metric, val]) => {
      const metricLabel = metric.replace(/_/g, " ").toUpperCase();
      const statusIcon = Number(val) >= 9 ? "🟢" : "🔴";
      md += `| ${statusIcon} **${metricLabel}** | \`${val}/10\` |\n`;
    });
  } else {
    md += `*Nenhuma nota avaliada.*\n`;
  }

  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, md, "utf8");
    console.log(`[NARRACAOPRO] Relatório salvo com sucesso em: ${reportPath}`);

    // Also save to Antigravity IDE Artifacts directory to show directly to the user in the UI!
    const antigravityDir =
      "C:/Users/Leo/.gemini/antigravity-ide/brain/96790f47-42a8-4d70-baab-6f90f150d699";
    if (fs.existsSync(antigravityDir)) {
      const antPath = path.join(antigravityDir, "narracao_pro_report.md");
      fs.writeFileSync(antPath, md, "utf8");
      console.log(
        `[NARRACAOPRO] Relatório espelhado nos artefatos Antigravity: ${antPath}`
      );
    }
  } catch (e) {
    console.warn(
      "[NARRACAOPRO] Erro ao gravar arquivo de relatório:",
      e.message
    );
  }
}

// Helper: Auto-copy missing or outdated timing and render template files to project folder on-demand

function ensureFileExists(fileName, targetDir) {
  const targetPath = path.join(targetDir, fileName);

  const srcPath = path.join(WORKSPACE_DIR, fileName);

  if (!fs.existsSync(srcPath)) return;

  if (!fs.existsSync(targetPath)) {
    // File missing in project - copy from root

    fs.mkdirSync(targetDir, { recursive: true });

    fs.copyFileSync(srcPath, targetPath);

    console.log(`Copied template ${fileName} from root to ${targetDir}`);
  } else {
    // File exists - update if root version is newer

    const srcMtime = fs.statSync(srcPath).mtimeMs;

    const targetMtime = fs.statSync(targetPath).mtimeMs;

    if (srcMtime > targetMtime) {
      fs.copyFileSync(srcPath, targetPath);

      console.log(
        `Updated ${fileName} in ${targetDir} (root version is newer)`
      );
    }
  }
}

const UPLOAD_SCRIPT_NAMES = [
  "lumiera_workspace.py",
  "upload_pipeline.py",
  "upload_youtube.py",
  "upload_instagram.py",
  "upload_tiktok_playwright.py",
  "upload_kwai_playwright.py",
];

function syncUploadScripts(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const scriptName of UPLOAD_SCRIPT_NAMES) {
    const srcPath = path.join(WORKSPACE_DIR, scriptName);
    const targetPath = path.join(targetDir, scriptName);
    if (!fs.existsSync(srcPath)) continue;
    fs.copyFileSync(srcPath, targetPath);
  }
}

// API: List valid projects in workspace

app.get("/api/projects", (req, res) => {
  try {
    const projects = [];

    const inferNiche = (itemName) => {
      const name = itemName.toLowerCase();
      if (
        name.includes("romano") ||
        name.includes("castelo") ||
        name.includes("viking") ||
        name.includes("inca") ||
        name.includes("asteca") ||
        name.includes("muralha") ||
        name.includes("medieval") ||
        name.includes("giram") ||
        name.includes("fortes")
      ) {
        return "História";
      }
      if (
        name.includes("computador") ||
        name.includes("antikythera") ||
        name.includes("tecnologia")
      ) {
        return "Tecnologia";
      }
      if (
        name.includes("deserto") ||
        name.includes("amazonia") ||
        name.includes("ilhas") ||
        name.includes("flutuantes")
      ) {
        return "Geografia";
      }
      if (
        name.includes("financas") ||
        name.includes("dinheiro") ||
        name.includes("invest")
      ) {
        return "Finanças";
      }
      return "Curiosidades";
    };

    const scanDir = (dir, format) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (
          fs.statSync(fullPath).isDirectory() &&
          ![
            "ASSETS",
            "OUTPUT",
            "node_modules",
            "temp_clips",
            "temp_clips_destacado",
            ".git",
          ].includes(item)
        ) {
          const hasBuild = fs.existsSync(path.join(fullPath, "build_video.py"));
          const hasStoryboard = fs.existsSync(
            path.join(fullPath, "storyboard.json")
          );
          const hasConfig = fs.existsSync(
            path.join(fullPath, "config_qanat.json")
          );
          if (hasBuild || hasStoryboard || hasConfig || item === "FINANCAS") {
            let title = item;
            let niche = "Curiosidades";

            // Check config_qanat.json first
            const configPath = path.join(fullPath, "config_qanat.json");
            if (fs.existsSync(configPath)) {
              try {
                const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
                if (cfg.niche) {
                  niche = cfg.niche;
                } else {
                  niche = inferNiche(item);
                  cfg.niche = niche;
                  fs.writeFileSync(
                    configPath,
                    JSON.stringify(cfg, null, 2),
                    "utf8"
                  );
                }
              } catch (e) {}
            } else {
              niche = inferNiche(item);
            }

            const storyboardPath = path.join(fullPath, "storyboard.json");
            if (fs.existsSync(storyboardPath)) {
              try {
                const sb = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
                if (sb.strategy?.title_main) title = sb.strategy.title_main;
              } catch (e) {}
            }

            let modifiedAtMs = fs.statSync(fullPath).mtimeMs;
            for (const trackFile of [
              "storyboard.json",
              "config_qanat.json",
              "narracao_mestra_premium.mp3",
            ]) {
              const trackPath = path.join(fullPath, trackFile);
              if (fs.existsSync(trackPath)) {
                modifiedAtMs = Math.max(
                  modifiedAtMs,
                  fs.statSync(trackPath).mtimeMs
                );
              }
            }
            projects.push({
              name: item,
              path: fullPath,
              format,
              title,
              niche,
              modifiedAtMs,
              modifiedAt: new Date(modifiedAtMs).toISOString(),
            });
          }
        }
      }
    };

    scanDir(LONGS_DIR, "LONGO");
    scanDir(SHORTS_DIR, "SHORTS");

    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/projects/legacy-system", (_req, res) => {
  try {
    const payload = listLegacySystemProjects();
    res.json({
      success: true,
      projects_root: resolveProjectsRoot(),
      ...payload,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/api/projects/recover-legacy", (req, res) => {
  try {
    const folder = String(req.body?.folder || req.body?.project || "").trim();
    const overwrite = Boolean(req.body?.overwrite);
    const result = recoverLegacyProject(folder, { overwrite });
    if (!result.ok) {
      return res.status(404).json({ success: false, ...result });
    }
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API: Create and template new project subfolder

app.post("/api/projects/create", (req, res) => {
  const { name, format, niche } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nome do projeto é obrigatório" });
  }

  const isShort = format === "SHORTS";

  const targetParentDir = isShort ? SHORTS_DIR : LONGS_DIR;

  const safeName = name.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

  const projDir = path.join(targetParentDir, safeName);

  try {
    if (fs.existsSync(projDir)) {
      return res
        .status(400)
        .json({ error: "Já existe um projeto ou pasta com este nome" });
    }

    // Create directories

    fs.mkdirSync(projDir, { recursive: true });

    fs.mkdirSync(path.join(projDir, "ASSETS"), { recursive: true });

    fs.mkdirSync(path.join(projDir, "OUTPUT"), { recursive: true });

    ensureProjectSfxPack(projDir);

    // Copy templates

    ensureFileExists("build_video.py", projDir);

    ensureFileExists("build_video_destacado.py", projDir);

    ensureFileExists("mix_bgm.py", projDir);

    ensureFileExists("find_block_timings.py", projDir);

    ensureFileExists("align_transcripts.py", projDir);

    ensureFileExists("upload_pipeline.py", projDir);

    ensureFileExists("upload_youtube.py", projDir);

    ensureFileExists("upload_instagram.py", projDir);

    ensureFileExists("upload_tiktok_playwright.py", projDir);

    ensureFileExists("upload_kwai_playwright.py", projDir);

    // Copy logo.png if it exists in root ASSETS folder

    const rootLogoPath = path.join(WORKSPACE_DIR, "ASSETS", "logo.png");

    const destLogoPath = path.join(projDir, "ASSETS", "logo.png");

    if (fs.existsSync(rootLogoPath)) {
      fs.copyFileSync(rootLogoPath, destLogoPath);

      console.log(`Copied logo.png to new project ${safeName}`);
    }

    // Copy config

    const defaultConfigSrc = path.join(WORKSPACE_DIR, "config_qanat.json");

    const defaultConfigDest = path.join(projDir, "config_qanat.json");

    if (fs.existsSync(defaultConfigSrc)) {
      fs.copyFileSync(defaultConfigSrc, defaultConfigDest);

      try {
        const cfg = JSON.parse(fs.readFileSync(defaultConfigDest, "utf8"));
        const defaultDuration = isShort ? 40 : 120;
        const cfgWithDefaults = bootstrapNewProjectConfig(cfg, {
          isShort,
          niche: niche || "Geral",
          defaultDuration,
        });
        fs.writeFileSync(
          defaultConfigDest,
          JSON.stringify(cfgWithDefaults, null, 2),
          "utf8"
        );
      } catch (e) {}
    } else {
      const defaultDuration = isShort ? 40 : 120;
      const cfg = bootstrapNewProjectConfig(
        {},
        {
          isShort,
          niche: niche || "Geral",
          defaultDuration,
        }
      );

      fs.writeFileSync(defaultConfigDest, JSON.stringify(cfg, null, 2), "utf8");
    }

    // Initialize timing files

    const blockTimings = getDefaultBlockTimings(
      isShort ? VIDEO_FORMAT.SHORT : VIDEO_FORMAT.LONG
    );
    fs.writeFileSync(
      path.join(projDir, "block_timings.json"),
      JSON.stringify(blockTimings, null, 4),
      "utf8"
    );

    fs.writeFileSync(
      path.join(projDir, "transcripts_readable.txt"),
      "Bloco 1...\n",
      "utf8"
    );

    appendProjectEventLog(projDir, {
      component: "project",
      event: "project_created",
      message: `Projeto ${safeName} criado.`,
      details: {
        project: safeName,
        format: isShort ? "SHORTS" : "LONGO",
        niche: niche || "Geral",
      },
    });

    res.json({
      success: true,
      message: `Projeto ${safeName} criado e estruturado com sucesso!`,
    });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Erro ao criar projeto", details: e.message });
  }
});

// API: Delete project recursively

app.post("/api/projects/delete", (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nome do projeto é obrigatório" });
  }

  const safeName = name.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

  let projDir = path.join(WORKSPACE_DIR, safeName);

  const candidateLong = path.join(LONGS_DIR, safeName);

  const candidateShort = path.join(SHORTS_DIR, safeName);

  if (fs.existsSync(candidateLong)) {
    projDir = candidateLong;
  } else if (fs.existsSync(candidateShort)) {
    projDir = candidateShort;
  }

  try {
    if (!fs.existsSync(projDir)) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const deletedPath = projDir;
    fs.rmSync(projDir, { recursive: true, force: true });

    try {
      purgeYoutubeChannelCacheForProject(WORKSPACE_DIR, {
        projectName: safeName,
        projectPath: deletedPath,
      });
    } catch (cacheErr) {
      console.warn(
        "[projects/delete] Falha ao limpar cache YouTube:",
        cacheErr.message
      );
    }

    res.json({
      success: true,
      message: `Projeto ${safeName} excluído com sucesso!`,
    });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Erro ao excluir o projeto", details: e.message });
  }
});

const projectStatusCache = new Map();
const PROJECT_STATUS_CACHE_MS = 30_000;

function getDirMtimeMs(dirPath) {
  try {
    return fs.existsSync(dirPath) ? fs.statSync(dirPath).mtimeMs : 0;
  } catch {
    return 0;
  }
}

function countProjectAssets(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const scan = (d) => {
    const items = fs.readdirSync(d);
    for (const item of items) {
      const p = path.join(d, item);
      if (fs.statSync(p).isDirectory()) {
        scan(p);
      } else {
        count++;
      }
    }
  };
  scan(dir);
  return count;
}

function buildProjectStatusPayload(projDir) {
  const assetsDir = path.join(projDir, "ASSETS");
  const assetsMtime = getDirMtimeMs(assetsDir);
  const cacheKey = projDir;
  const cached = projectStatusCache.get(cacheKey);
  if (
    cached &&
    cached.assetsMtime === assetsMtime &&
    Date.now() - cached.at < PROJECT_STATUS_CACHE_MS
  ) {
    return cached.payload;
  }

  let blockTimings = null;
  const timingsPath = path.join(projDir, "block_timings.json");
  if (fs.existsSync(timingsPath)) {
    try {
      blockTimings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
    } catch {
      /* ignore */
    }
  }

  const payload = {
    workspace: projDir,
    assets_count: countProjectAssets(assetsDir),
    has_narration: fs.existsSync(
      path.join(projDir, "narracao_mestra_premium.mp3")
    ),
    has_soundtrack: fs.existsSync(
      path.join(projDir, "trilha_documentario.mp3")
    ),
    has_highlight_clip: fs.existsSync(path.join(projDir, "clip_highlight.mp4")),
    has_config: fs.existsSync(path.join(projDir, "config_qanat.json")),
    block_timings: blockTimings,
  };
  projectStatusCache.set(cacheKey, {
    payload,
    assetsMtime,
    at: Date.now(),
  });
  return payload;
}

// API: Check status of workspace files

app.get("/api/status", (req, res) => {
  try {
    const projDir = getProjectDir(req);

    // Auto-sync template scripts when project is accessed (nao no poll de 20s do mesmo projeto)
    if (projDir !== WORKSPACE_DIR) {
      const syncKey = `${projDir}:sync`;
      const lastSync = projectStatusCache.get(syncKey)?.at || 0;
      if (Date.now() - lastSync > PROJECT_STATUS_CACHE_MS) {
        ensureFileExists("build_video.py", projDir);
        ensureFileExists("build_video_destacado.py", projDir);
        ensureFileExists("mix_bgm.py", projDir);
        ensureFileExists("find_block_timings.py", projDir);
        ensureFileExists("align_transcripts.py", projDir);
        projectStatusCache.set(syncKey, { at: Date.now() });
      }
    }

    res.json(buildProjectStatusPayload(projDir));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get central config

app.get("/api/config", (req, res) => {
  const projDir = getProjectDir(req);

  const configPath = path.join(projDir, "config_qanat.json");

  if (!fs.existsSync(configPath)) {
    return res.status(404).json({ error: "config_qanat.json não encontrado" });
  }

  try {
    const data = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const timings = readProjectJson(projDir, "block_timings.json", {
      total_duration: 0,
    });
    let responseConfig = { ...data };
    const assetFiles = listProjectMediaAssets(projDir);
    const { timeline, stripped, dedupeRemoved } =
      sanitizeTimelineAssetsForProject(responseConfig.timeline_assets, {
        assetFiles,
      });
    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    const reconciled = reconcileTimelineAssetsToStoryboard(
      timeline,
      storyboard.visual_prompts || []
    );
    if (stripped > 0 || dedupeRemoved > 0 || reconciled.removed > 0) {
      responseConfig = {
        ...responseConfig,
        timeline_assets: reconciled.timeline,
      };
      try {
        fs.writeFileSync(
          configPath,
          JSON.stringify(responseConfig, null, 2),
          "utf8"
        );
        if (reconciled.removed > 0) {
          appendProjectEventLog(projDir, {
            component: "timeline",
            event: "surplus_empty_slots_blocked",
            message:
              "Slots vazios excedentes foram removidos sem alterar mídias ou timings.",
            details: {
              source: "config_get",
              removed: reconciled.removed,
              blocks: reconciled.blocks,
            },
          });
        }
      } catch {
        /* leitura segue com timeline saneada */
      }
    }
    const studioPath = path.join(projDir, "timeline_studio.json");
    if (fs.existsSync(studioPath)) {
      try {
        const studio = JSON.parse(fs.readFileSync(studioPath, "utf8"));
        const brollSync = syncStudioBrollToTimelineAssets(projDir, studio);
        if (brollSync.changed && brollSync.timeline_assets) {
          responseConfig = {
            ...responseConfig,
            timeline_assets: brollSync.timeline_assets,
          };
        }
      } catch (brollErr) {
        console.warn(
          "[config] broll timing sync:",
          brollErr?.message || brollErr
        );
      }
    }

    const format = detectVideoFormat(
      responseConfig,
      Number(timings.total_duration) || 0
    );
    const globalRender = loadRenderConfig(__dirname);
    const hintsSource = applyBgmProductionDefaults(
      responseConfig,
      Number(timings.total_duration) || 0
    );
    const mergedResponse = mergeGlobalStudioIntoProjectConfig(
      responseConfig,
      globalRender
    );

    res.json({
      ...mergedResponse,
      _bgm_production_hints: getBgmProductionHints(
        format,
        hintsSource,
        Number(globalRender?.musicVolume) || 0.15
      ),
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao ler config", details: err.message });
  }
});

// API: Update central config

app.post("/api/config", (req, res) => {
  const rawProjName = req.query?.project || req.body?.project;
  if (!rawProjName) {
    return res.status(400).json({
      error:
        "Projeto não informado. Selecione um projeto na barra lateral antes de salvar.",
    });
  }
  const projDir = resolveProjectDirFromName(rawProjName);
  if (!projDir) {
    return res
      .status(404)
      .json({ error: `Projeto não encontrado: ${rawProjName}` });
  }

  const configPath = path.join(projDir, "config_qanat.json");

  try {
    let existingConfig = {};

    if (fs.existsSync(configPath)) {
      try {
        existingConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      } catch (e) {}
    }

    const mergedConfig = { ...existingConfig };
    const deletedKeys = new Set();
    for (const [key, value] of Object.entries(req.body || {})) {
      if (key.startsWith("_")) continue;
      if (isStudioConfigKey(key)) continue;
      if (value === null) {
        deletedKeys.add(key);
        delete mergedConfig[key];
      } else if (
        key === "upload_metadata" &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        const prevMeta =
          existingConfig.upload_metadata &&
          typeof existingConfig.upload_metadata === "object"
            ? existingConfig.upload_metadata
            : {};
        const nextYoutube = {
          ...(prevMeta.youtube || {}),
          ...(value.youtube || {}),
        };
        if (
          !String(nextYoutube.chapters || "").trim() &&
          String(prevMeta.youtube?.chapters || "").trim()
        ) {
          nextYoutube.chapters = prevMeta.youtube.chapters;
        }
        mergedConfig.upload_metadata = {
          ...prevMeta,
          ...value,
          youtube: nextYoutube,
          instagram: {
            ...(prevMeta.instagram || {}),
            ...(value.instagram || {}),
          },
          tiktok: { ...(prevMeta.tiktok || {}), ...(value.tiktok || {}) },
          kwai: { ...(prevMeta.kwai || {}), ...(value.kwai || {}) },
        };
      } else {
        mergedConfig[key] = value;
      }
    }

    const timings = readProjectJson(projDir, "block_timings.json", {
      total_duration: 0,
    });
    const configured = applyBgmProductionDefaults(
      mergedConfig,
      Number(timings.total_duration) || 0,
      {
        deletedKeys,
      }
    );

    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    const reconciled = reconcileTimelineAssetsToStoryboard(
      configured.timeline_assets || {},
      storyboard.visual_prompts || []
    );
    const finalConfig = {
      ...configured,
      timeline_assets: reconciled.timeline,
    };

    fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2), "utf8");

    if (reconciled.removed > 0) {
      appendProjectEventLog(projDir, {
        component: "timeline",
        event: "stale_timeline_save_blocked",
        message:
          "Uma configuração antiga tentou reintroduzir slots vazios excedentes e foi bloqueada.",
        details: {
          removed: reconciled.removed,
          blocks: reconciled.blocks,
          timeline: summarizeTimelineAssets(
            finalConfig.timeline_assets,
            storyboard.visual_prompts || []
          ),
        },
      });
    }

    res.json({
      success: true,
      message: "config_qanat.json salvo com sucesso",
      config: finalConfig,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao salvar config", details: err.message });
  }
});

// POST /api/upload/youtube/save-credentials
app.post("/api/upload/youtube/save-credentials", (req, res) => {
  const { client_id, client_secret } = req.body;
  if (!client_id || !client_secret) {
    return res
      .status(400)
      .json({ error: "Client ID e Client Secret são obrigatórios" });
  }
  const secretsPath = path.join(WORKSPACE_DIR, "youtube_client_secrets.json");
  try {
    fs.writeFileSync(
      secretsPath,
      JSON.stringify({ client_id, client_secret }, null, 2),
      "utf8"
    );
    res.json({
      success: true,
      message: "Credenciais de API do YouTube salvas com sucesso!",
    });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao salvar credenciais do YouTube",
      details: err.message,
    });
  }
});

// POST /api/upload/instagram/save-credentials
app.post("/api/upload/instagram/save-credentials", (req, res) => {
  const { instagram_business_account_id, access_token } = req.body;
  if (!instagram_business_account_id || !access_token) {
    return res.status(400).json({
      error: "ID da conta Business e Token de Acesso são obrigatórios",
    });
  }
  const secretsPath = path.join(WORKSPACE_DIR, "instagram_secrets.json");
  try {
    fs.writeFileSync(
      secretsPath,
      JSON.stringify({ instagram_business_account_id, access_token }, null, 2),
      "utf8"
    );
    res.json({
      success: true,
      message: "Credenciais de API do Instagram salvas com sucesso!",
    });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao salvar credenciais do Instagram",
      details: err.message,
    });
  }
});

function youtubeApiErrorPayload(err, fallback = "Erro na API do YouTube") {
  const needsReauth = Boolean(
    err?.needsReauth || err?.code === "INSUFFICIENT_SCOPES"
  );
  return {
    error: needsReauth ? "Permissões do YouTube insuficientes" : fallback,
    details: err?.message || String(err),
    needsReauth,
    hint: needsReauth
      ? "Vá em Upload → Integrações → Revincular YouTube e autorize todas as permissões (editar vídeos + analytics)."
      : undefined,
  };
}

// GET /api/upload/status
app.get(
  "/api/upload/status",
  asyncHandler(async (req, res) => {
    const ytSecrets = path.join(WORKSPACE_DIR, "youtube_client_secrets.json");
    const ytToken = path.join(WORKSPACE_DIR, "youtube_token.json");
    const igSecrets = path.join(WORKSPACE_DIR, "instagram_secrets.json");
    const ttCookies = path.join(WORKSPACE_DIR, "tiktok_cookies.json");
    const kwCookies = path.join(WORKSPACE_DIR, "kwai_cookies.json");

    let yt_client_id = null;
    if (fs.existsSync(ytSecrets)) {
      try {
        const data = JSON.parse(fs.readFileSync(ytSecrets, "utf8"));
        yt_client_id = data.client_id;
      } catch (e) {}
    }

    let ig_account_id = null;
    if (fs.existsSync(igSecrets)) {
      try {
        const data = JSON.parse(fs.readFileSync(igSecrets, "utf8"));
        ig_account_id = data.instagram_business_account_id;
      } catch (e) {}
    }

    const canvaStatus = getCanvaConnectionStatus(WORKSPACE_DIR);
    let youtubeScopes = { ready: false, missingLabels: [] };
    if (fs.existsSync(ytSecrets) && fs.existsSync(ytToken)) {
      try {
        youtubeScopes = await getYoutubeTokenScopes(WORKSPACE_DIR);
      } catch (e) {
        youtubeScopes = { ready: false, error: e.message, missingLabels: [] };
      }
    }

    res.json({
      youtube: {
        connected: fs.existsSync(ytSecrets) && fs.existsSync(ytToken),
        has_secrets: fs.existsSync(ytSecrets),
        client_id: yt_client_id,
        titleTestReady: youtubeScopes.ready === true,
        missingScopes: youtubeScopes.missingLabels || [],
      },
      canva: canvaStatus,
      instagram: {
        connected:
          fs.existsSync(igSecrets) ||
          getInstagramConnectionStatus(WORKSPACE_DIR).connected,
        account_id: ig_account_id,
        oauthReady: getInstagramConnectionStatus(WORKSPACE_DIR).oauthReady,
      },
      tiktok: {
        connected: fs.existsSync(ttCookies),
      },
      kwai: {
        connected: fs.existsSync(kwCookies),
      },
    });
  })
);

// POST /api/canva/save-credentials
app.post("/api/canva/save-credentials", (req, res) => {
  const { client_id, client_secret, redirect_uri } = req.body || {};
  if (!client_id || !client_secret) {
    return res
      .status(400)
      .json({ error: "Client ID e Client Secret do Canva são obrigatórios." });
  }
  try {
    saveCanvaCredentials(WORKSPACE_DIR, {
      client_id,
      client_secret,
      redirect_uri,
    });
    res.json({ success: true, message: "Credenciais do Canva salvas." });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao salvar credenciais do Canva",
      details: err.message,
    });
  }
});

// GET /api/canva/status
app.get("/api/canva/status", (req, res) => {
  res.json(getCanvaConnectionStatus(WORKSPACE_DIR));
});

// GET /api/canva/auth-url
app.get("/api/canva/auth-url", (req, res) => {
  try {
    const url = buildCanvaAuthUrl(WORKSPACE_DIR);
    res.json({ url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/canva/callback
app.get(
  "/api/canva/callback",
  asyncHandler(async (req, res) => {
    const {
      code,
      state,
      error,
      error_description: errorDescription,
    } = req.query;
    if (error) {
      return res.status(400).send(`Erro Canva: ${errorDescription || error}`);
    }
    if (!code || !state) {
      return res.status(400).send("Código ou state ausente.");
    }
    try {
      await exchangeCanvaAuthCode(WORKSPACE_DIR, { code, state });
      res.send(`
      <html>
        <body style="background:#09090b; color:#fff; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
          <div style="text-align:center; border: 1px solid #27272a; padding: 2rem; border-radius: 1.5rem; background: #0c0c0e;">
            <h1 style="color:#00c4cc;">Canva Conectado!</h1>
            <p style="color:#a1a1aa;">Conta vinculada. Você já pode gerar capas automaticamente no Lumiera.</p>
            <button onclick="window.close()" style="background:#00c4cc; border:none; padding:0.5rem 1.5rem; border-radius:0.5rem; font-weight:bold; cursor:pointer;">Fechar</button>
          </div>
        </body>
      </html>
    `);
    } catch (err) {
      res.status(500).send(`Erro: ${err.message}`);
    }
  })
);

// GET /api/upload/youtube/scopes-status
app.get("/api/upload/youtube/scopes-status", async (req, res) => {
  try {
    const status = await getYoutubeTokenScopes(WORKSPACE_DIR);
    res.json(status);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao verificar escopos", details: err.message });
  }
});

// POST /api/upload/youtube/reset-auth — apaga token antigo para forçar novos escopos
app.post("/api/upload/youtube/reset-auth", (req, res) => {
  try {
    resetYoutubeAuth(WORKSPACE_DIR);
    res.json({
      success: true,
      message:
        "Sessão do YouTube removida. Clique em Vincular Conta Google e autorize todas as permissões.",
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao resetar autenticação", details: err.message });
  }
});

// GET /api/upload/youtube/auth-url
app.get("/api/upload/youtube/auth-url", (req, res) => {
  const secretsPath = path.join(WORKSPACE_DIR, "youtube_client_secrets.json");
  if (!fs.existsSync(secretsPath)) {
    return res
      .status(400)
      .json({ error: "Credenciais do YouTube ausentes no servidor." });
  }
  try {
    const secrets = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
    const redirectUri = LUMIERA_YOUTUBE_CALLBACK;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${secrets.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(getYoutubeScopeString())}&access_type=offline&prompt=consent`;
    res.json({ url: authUrl });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao gerar URL do YouTube", details: err.message });
  }
});

// GET /api/upload/youtube/callback
app.get(
  "/api/upload/youtube/callback",
  asyncHandler(async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Código não fornecido.");
    }
    const secretsPath = path.join(WORKSPACE_DIR, "youtube_client_secrets.json");
    if (!fs.existsSync(secretsPath)) {
      return res.status(400).send("Credenciais do YouTube ausentes.");
    }
    try {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
      const redirectUri = LUMIERA_YOUTUBE_CALLBACK;
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: secrets.client_id,
          client_secret: secrets.client_secret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await response.json();
      if (tokens.error) {
        return res
          .status(400)
          .send(
            `Erro ao obter tokens: ${tokens.error_description || tokens.error}`
          );
      }
      const tokenPath = path.join(WORKSPACE_DIR, "youtube_token.json");
      const tokenPayload = {
        ...tokens,
        linked_at: new Date().toISOString(),
        scopes_requested: getYoutubeScopeString(),
      };
      fs.writeFileSync(
        tokenPath,
        JSON.stringify(tokenPayload, null, 2),
        "utf8"
      );
      res.send(`
      <html>
        <body style="background:#09090b; color:#fff; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
          <div style="text-align:center; border: 1px solid #27272a; padding: 2rem; border-radius: 1.5rem; background: #0c0c0e;">
            <h1 style="color:#d4af37;">YouTube Conectado!</h1>
            <p style="color:#a1a1aa;">Upload + edição de títulos + analytics autorizados. Feche esta aba e volte ao Lumiera.</p>
            <button onclick="window.close()" style="background:#d4af37; border:none; padding:0.5rem 1.5rem; border-radius:0.5rem; font-weight:bold; cursor:pointer;">Fechar</button>
          </div>
        </body>
      </html>
    `);
    } catch (err) {
      res.status(500).send(`Erro: ${err.message}`);
    }
  })
);

// POST /api/upload/launch-login
app.post("/api/upload/launch-login", (req, res) => {
  const { platform } = req.body;
  if (!platform || !["tiktok", "kwai"].includes(platform.toLowerCase())) {
    return res.status(400).json({ error: "Plataforma inválida." });
  }

  // Start capture_cookies.py in headful mode in background
  const cpScript = path.join(WORKSPACE_DIR, "capture_cookies.py");
  if (!fs.existsSync(cpScript)) {
    return res
      .status(404)
      .json({ error: "Script capture_cookies.py não encontrado." });
  }

  const child = spawn(
    PYTHON_PATH,
    ["capture_cookies.py", platform.toLowerCase()],
    {
      cwd: WORKSPACE_DIR,
      shell: true,
      detached: true,
      stdio: "ignore",
    }
  );
  child.unref();

  res.json({
    success: true,
    message: `Navegador aberto na sua área de trabalho para login do ${platform.toUpperCase()}. Realize o login e feche-o para concluir.`,
  });
});

// GET /api/upload/youtube/playlists — playlists do canal para seleção no upload
app.get("/api/upload/youtube/playlists", async (req, res) => {
  try {
    const { getYoutubeAccessToken } =
      await import("./youtubeTitleAnalytics.js");
    const accessToken = await getYoutubeAccessToken(WORKSPACE_DIR);
    const playlists = [];
    let pageToken = "";
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
      url.searchParams.set("part", "snippet,contentDetails");
      url.searchParams.set("mine", "true");
      url.searchParams.set("maxResults", "50");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const apiRes = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await apiRes.json();
      if (!apiRes.ok) {
        return res.status(apiRes.status).json({
          error:
            data?.error?.message || "Falha ao listar playlists do YouTube.",
        });
      }
      for (const item of data.items || []) {
        playlists.push({
          id: item.id,
          title: item.snippet?.title || item.id,
          itemCount: Number(item.contentDetails?.itemCount || 0),
        });
      }
      pageToken = data.nextPageToken || "";
    } while (pageToken && playlists.length < 200);
    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao listar playlists." });
  }
});

// POST /api/upload/youtube/apply-metadata — corrige título/descrição/tags de vídeo já enviado
app.post("/api/upload/youtube/apply-metadata", (req, res) => {
  const projDir = getProjectDir(req);
  const configPath = path.join(projDir, "config_qanat.json");
  let videoId = String(req.body?.videoId || "").trim();
  if (!videoId && fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
      videoId = cfg?.upload_metadata?.youtube?.post_id || "";
    } catch (e) {
      /* ignore */
    }
  }
  if (!videoId) {
    return res
      .status(400)
      .json({ error: "videoId ausente. Informe o ID do vídeo no YouTube." });
  }

  syncUploadScripts(projDir);
  const scriptPath = path.join(projDir, "upload_youtube.py");
  const args = [scriptPath, projDir, "--fix-metadata", videoId];

  const child = spawn(PYTHON_PATH, args, {
    cwd: projDir,
    shell: false,
    env: {
      ...process.env,
      LUMIERA_WORKSPACE: WORKSPACE_DIR,
      LUMIERA_PROJECT_DIR: projDir,
      LUMIERA_FIX_VIDEO_ID: videoId,
    },
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d) => {
    stdout += d.toString();
  });
  child.stderr.on("data", (d) => {
    stderr += d.toString();
  });
  child.on("close", (code) => {
    const log = `${stdout}\n${stderr}`.trim();
    if (code === 0) {
      return res.json({ success: true, videoId, log });
    }
    const errLine =
      log.split("\n").find((l) => /\[ERROR\]/i.test(l)) ||
      log.split("\n").pop();
    res.status(500).json({
      error: errLine || `Falha ao aplicar metadados (código ${code})`,
      log,
    });
  });
});

// GET /api/projects/upload-pipeline
app.get("/api/projects/upload-pipeline", async (req, res) => {
  const projDir = getProjectDir(req);
  const platforms = req.query.platforms || "";
  const uploadVideo = String(req.query.video || "").trim();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let lastPipelineError = "";

  const sendLog = (text) => {
    if (/\[ERROR\]|\[PIPELINE_ERROR\]/i.test(text)) {
      lastPipelineError = String(text)
        .replace(/^\[Error\]\s*/i, "")
        .trim();
    }
    res.write(`data: ${JSON.stringify({ type: "log", text })}\n\n`);
  };

  sendLog(
    `[Pipeline] Iniciando Upload Automatizado com plataformas: ${platforms}...`
  );
  sendLog(`[Pipeline] Projeto: ${projDir}`);
  if (uploadVideo) sendLog(`[Pipeline] Vídeo selecionado: ${uploadVideo}`);

  if (
    String(platforms)
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .includes("youtube")
  ) {
    try {
      sendLog("[Quality Gate] Auditando o video antes do upload...");
      const report = await runYoutubeQualityGate({
        workspaceDir: WORKSPACE_DIR,
        projectsRoot: PROJECTS_ROOT,
        projectDir: projDir,
        videoName: uploadVideo,
      });
      sendLog(
        `[Quality Gate] Nota ${report.score}/100; ${report.blockingCount} bloqueio(s), ${report.warningCount} aviso(s).`
      );
      if (!report.ready) {
        const detail = report.checks
          .filter((item) => item.status === "error")
          .slice(0, 5)
          .map((item) => item.message)
          .join(" | ");
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            message: "Upload bloqueado pelo Quality Gate.",
            detail,
            qualityGate: report,
          })}\n\n`
        );
        res.end();
        return;
      }
      sendLog(
        "[Quality Gate] Aprovado. O primeiro envio ao YouTube sera privado."
      );
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message: "Falha ao executar o Quality Gate.",
          detail: error.message,
        })}\n\n`
      );
      res.end();
      return;
    }
  }

  syncUploadScripts(projDir);

  const pipelineArgs = [
    path.join(projDir, "upload_pipeline.py"),
    projDir,
    platforms,
  ];
  if (uploadVideo) pipelineArgs.push(uploadVideo);

  const child = spawn(PYTHON_PATH, pipelineArgs, {
    cwd: projDir,
    shell: false,
    env: {
      ...process.env,
      LUMIERA_WORKSPACE: WORKSPACE_DIR,
      LUMIERA_PROJECT_DIR: projDir,
      ...(uploadVideo ? { LUMIERA_UPLOAD_VIDEO: uploadVideo } : {}),
    },
  });

  child.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.strip ? line.strip() : line.trim()) {
        sendLog(line.strip ? line.strip() : line.trim());
      }
    }
  });

  child.stderr.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.strip ? line.strip() : line.trim()) {
        sendLog(`[Error] ${line.strip() ? line.strip() : line.trim()}`);
      }
    }
  });

  child.on("close", async (code) => {
    if (code === 0) {
      let videoId = null;
      try {
        const configPath = path.join(projDir, "config_qanat.json");
        if (fs.existsSync(configPath)) {
          const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
          videoId = cfg?.upload_metadata?.youtube?.post_id || null;
        }
      } catch (e) {
        /* ignore */
      }

      let postUpload = null;
      if (videoId) {
        try {
          postUpload = await runPostUploadHooks(WORKSPACE_DIR, projDir, {
            videoId,
            autoStartTitleTest: true,
            postPinned: true,
          });
        } catch (err) {
          sendLog(`[PostUpload] ${err.message}`);
        }
      }

      try {
        markSocialPublishPosted(WORKSPACE_DIR, {
          projectSlug: path.basename(projDir),
          videoFile: uploadVideo || undefined,
        });
      } catch (e) {
        /* non-blocking */
      }

      res.write(
        `data: ${JSON.stringify({
          type: "complete",
          message: "Processo de upload concluído!",
          videoId,
          postUpload,
        })}\n\n`
      );
    } else {
      const hint =
        lastPipelineError ||
        (code === 1
          ? "Verifique: vídeo renderizado em OUTPUT/, OAuth YouTube em Configurações e metadados salvos."
          : "");
      const message = hint
        ? `Upload falhou: ${hint}`
        : `O processo encerrou com código ${code}`;
      try {
        markSocialPublishFailed(WORKSPACE_DIR, {
          projectSlug: path.basename(projDir),
          videoFile: uploadVideo || undefined,
          error: message,
        });
      } catch (e) {
        /* non-blocking */
      }
      res.write(
        `data: ${JSON.stringify({ type: "error", message, code, detail: lastPipelineError || undefined })}\n\n`
      );
    }
    res.end();
  });
});

// API: List output videos

app.get("/api/outputs", (req, res) => {
  const projDir = getProjectDir(req);

  const outputDir = path.join(projDir, "OUTPUT", "qanat_persa_video_final");

  if (!fs.existsSync(outputDir)) {
    return res.json([]);
  }

  try {
    const files = fs
      .readdirSync(outputDir)

      .filter(
        (f) => f.endsWith(".mp4") || f.endsWith(".mov") || f.endsWith(".webm")
      )

      .map((f) => {
        const stats = fs.statSync(path.join(outputDir, f));

        return {
          name: f,

          sizeBytes: stats.size,

          modifiedAt: stats.mtime,

          renderEngine: f.toLowerCase().startsWith("remotion_")
            ? "remotion"
            : "standard",

          renderEngineLabel: f.toLowerCase().startsWith("remotion_")
            ? "Remotion"
            : "Renderizador Padrão",
        };
      });

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Delete rendered video file

app.post("/api/outputs/delete", (req, res) => {
  const projDir = getProjectDir(req);

  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: "Nome do arquivo é obrigatório" });
  }

  const safeFilename = path.basename(filename);

  const outputDir = path.join(projDir, "OUTPUT", "qanat_persa_video_final");

  const filePath = path.join(outputDir, safeFilename);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Vídeo ${safeFilename} excluído com sucesso!`,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao excluir o arquivo", details: err.message });
  }
});

// API: Get storyboard data

app.get("/api/projects/storyboard", (req, res) => {
  const projDir = getProjectDir(req);

  const storyboardPath = path.join(projDir, "storyboard.json");

  if (!fs.existsSync(storyboardPath)) {
    const configPath = path.join(projDir, "config_qanat.json");

    let fallbackPrompts = [];

    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

        if (config.block_phrases && Array.isArray(config.block_phrases)) {
          fallbackPrompts = config.block_phrases.map((bp, idx) => ({
            scene: `${bp.block}.1`,

            block: bp.block,

            narration_text: bp.phrase,

            type: "imagem IA 2k",

            prompt: `Cinematic photorealistic image, 2k resolution, high detail, cinematic lighting, portraying: ${bp.phrase}`,

            editor_notes: "Ken Burns zoom in",

            stock_query: "cinematic",
          }));
        }
      } catch (e) {}
    }

    return res.json({
      strategy: {
        title_main: "",
        title_variations: [],
        hook: "",
        target_audience: "",
        tone: "",
        pinned_comment: "",
        cta: "",
      },

      narrative_script: "",

      narrative_script_tagged: "",

      visual_prompts: fallbackPrompts,

      checklist: {
        click_potential: 0,
        retention_potential: 0,
        comments_potential: 0,
        feedback: "",
      },
    });
  }

  try {
    let data = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
    const reverseNormalized = normalizeReverseEngineeredStoryboard(data);
    if (reverseNormalized !== data) {
      data = reverseNormalized;
      fs.writeFileSync(storyboardPath, JSON.stringify(data, null, 2), "utf8");
      const mediaMix = (data.visual_prompts || []).reduce(
        (acc, vp) => {
          const isVideo =
            String(
              vp.media_mode || vp.production?.broll_type || ""
            ).toLowerCase() === "video" ||
            String(vp.type || "")
              .toLowerCase()
              .includes("vídeo") ||
            String(vp.type || "")
              .toLowerCase()
              .includes("video");
          if (isVideo) acc.video += 1;
          else acc.image += 1;
          return acc;
        },
        { image: 0, video: 0 }
      );
      console.log(
        `[Engenharia Reversa] Cenas normalizadas em ${path.basename(projDir)} (image=${mediaMix.image}, video=${mediaMix.video})`
      );
    }

    // Política GLOBAL POV: sem VO de canal nas cenas is_pov (qualquer projeto)
    try {
      const beforePov = JSON.stringify(
        (data.visual_prompts || []).map((vp) => ({
          s: vp.scene,
          n: vp.narration_text || "",
          pov: !!vp.is_pov,
        }))
      );
      data = enforcePovNoChannelNarrationPolicy(data);
      const afterPov = JSON.stringify(
        (data.visual_prompts || []).map((vp) => ({
          s: vp.scene,
          n: vp.narration_text || "",
          pov: !!vp.is_pov,
        }))
      );
      if (beforePov !== afterPov) {
        fs.writeFileSync(storyboardPath, JSON.stringify(data, null, 2), "utf8");
        console.log(
          `[POV] Política global aplicada em ${path.basename(projDir)} (sem VO de canal nas cenas POV)`
        );
      }
    } catch (povPolErr) {
      console.warn(
        "[POV] Falha ao aplicar política global no GET storyboard:",
        povPolErr.message
      );
    }

    // Auto-migrate: Bind assets from config.timeline_assets to storyboard scenes if not already bound

    const configPath = path.join(projDir, "config_qanat.json");

    if (
      fs.existsSync(configPath) &&
      data.visual_prompts &&
      Array.isArray(data.visual_prompts)
    ) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

        if (config.timeline_assets) {
          const bound = bindStoryboardAssetsFromTimeline(
            data.visual_prompts,
            config.timeline_assets
          );
          if (bound.updated) {
            data.visual_prompts = bound.visualPrompts;
            try {
              fs.writeFileSync(
                storyboardPath,
                JSON.stringify(data, null, 2),
                "utf8"
              );
              console.log(
                `[storyboard] Assets da timeline vinculados em ${path.basename(projDir)}`
              );
            } catch (writeErr) {
              console.warn(
                "[storyboard] Falha ao persistir vínculo de assets:",
                writeErr.message
              );
            }
          }
        }
      } catch (e) {
        console.error("Migration error:", e);
      }
    }

    data.checklist = normalizeScriptChecklist(data.checklist);

    const studioPath = path.join(projDir, "timeline_studio.json");
    if (fs.existsSync(studioPath)) {
      try {
        const studio = JSON.parse(fs.readFileSync(studioPath, "utf8"));
        const timingSync = syncStudioTimingToStoryboard(projDir, studio);
        if (timingSync.motion_scenes?.length) {
          data.motion_scenes = timingSync.motion_scenes;
        }
      } catch (timingErr) {
        console.warn(
          "[storyboard] timing sync:",
          timingErr?.message || timingErr
        );
      }
    }

    if (hasMojibakeDeep(data)) {
      const repaired = repairStoryboardEncoding(data);
      try {
        fs.writeFileSync(
          storyboardPath,
          JSON.stringify(repaired, null, 2),
          "utf8"
        );
        console.log(
          `[storyboard] Mojibake reparado em ${path.basename(projDir)}`
        );
      } catch (writeErr) {
        console.warn(
          "[storyboard] Falha ao persistir reparo de encoding:",
          writeErr.message
        );
      }
      res.json(repaired);
      return;
    }

    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao carregar o storyboard", details: err.message });
  }
});

function repairProjectOverlayTiming(projDir, { persist = true } = {}) {
  const config = readProjectJson(projDir, "config_qanat.json", {});
  const storyboard = readProjectJson(projDir, "storyboard.json", {});
  const timings = readProjectJson(projDir, "block_timings.json", {
    starts: [],
    durations: [],
  });
  const wordTranscripts = readProjectJson(projDir, "word_transcripts.json", []);

  const totalDuration =
    Number(timings.total_duration) ||
    (timings.starts?.length && timings.durations?.length
      ? Number(timings.starts[timings.starts.length - 1]) +
        Number(timings.durations[timings.durations.length - 1])
      : 60);

  const orchestrationPlan = buildOverlayOrchestrationPlan({
    config,
    niche: config.niche || "Geral",
    totalDuration,
    projectName: path.basename(projDir),
    blockCount: Array.isArray(timings.starts) ? timings.starts.length : 0,
  });

  const sceneMaps = buildSceneTimingMaps(
    null,
    storyboard,
    timings.starts || [],
    timings.durations || []
  );
  const {
    storyboard: nextStoryboard,
    report,
    repairedCount,
  } = applyOverlayTimingRepair({
    storyboard,
    timings,
    wordTranscripts,
    plan: orchestrationPlan,
    sceneStarts: sceneMaps.sceneStarts,
    sceneDurations: sceneMaps.sceneDurations,
  });

  if (persist) {
    fs.writeFileSync(
      path.join(projDir, "storyboard.json"),
      JSON.stringify(nextStoryboard, null, 2),
      "utf8"
    );
  }

  return { storyboard: nextStoryboard, report, repairedCount };
}

// API: Verificar timing dos overlays da IA (cena, bloco, palavra-chave na narração)
app.get("/api/projects/overlay-timing-verify", async (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const repair = req.query.repair === "1";
    const { report, repairedCount } = repairProjectOverlayTiming(projDir, {
      persist: repair,
    });

    res.json({
      ok: report.ok,
      repairApplied: repair,
      repairedCount,
      report,
      issues: overlayTimingIssuesFromReport(report),
    });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao verificar timing dos overlays",
      details: err.message,
    });
  }
});

// API: Read-only production guard. It makes automatic checks and human gates explicit.
app.get("/api/projects/production-readiness", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const config = readJsonFile(path.join(projDir, "config_qanat.json")) || {};
    const storyboard =
      readJsonFile(path.join(projDir, "storyboard.json")) || {};
    const quality = runVideoQualityCheck(projDir, readProjectJson);
    const workflow = analyzeSceneGaps(projDir, { config, storyboard });
    const hasNarration = Boolean(
      String(
        storyboard.narrative_script || storyboard.narration || ""
      ).trim() ||
      (Array.isArray(config.block_phrases) && config.block_phrases.length)
    );
    const blockingIssues = (quality.issues || []).filter((issue) =>
      ["error", "critical"].includes(String(issue.severity || "").toLowerCase())
    );
    const gates = [
      {
        id: "narration",
        label: "Roteiro ou narração disponível",
        status: hasNarration ? "passed" : "blocked",
        automatic: true,
      },
      {
        id: "quality",
        label: "Qualidade pré-render",
        status: blockingIssues.length ? "blocked" : "passed",
        automatic: true,
        score: quality.score,
        issues: blockingIssues.length,
      },
      {
        id: "sample_approval",
        label: "Aprovação humana da amostra",
        status: storyboard.sample_approved_at ? "approved" : "required",
        automatic: false,
        approvedAt: storyboard.sample_approved_at || null,
      },
    ];
    const blocked = gates.filter((gate) => gate.status === "blocked");
    const suggestedAction = !hasNarration
      ? "Gere ou importe a narração antes do render."
      : blockingIssues.length
        ? "Resolva os bloqueios da qualidade pré-render."
        : !storyboard.sample_approved_at
          ? "Revise e aprove a amostra antes do render completo."
          : "Projeto pronto para iniciar o render completo.";

    res.json({
      ok: true,
      readyForRender:
        blocked.length === 0 && Boolean(storyboard.sample_approved_at),
      gates,
      suggestedAction,
      quality,
      workflow,
      preRenderAdvice: buildPreRenderAdvice(quality, workflow),
    });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao verificar prontidão de produção",
      details: err.message,
    });
  }
});

// API: Correção automática de problemas pré-render (gancho, timing de overlays)
app.post("/api/projects/pre-render/auto-fix", async (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const fixId = String(req.body?.fixId || "repair_overlay_timing").trim();
    const autoFixIds = new Set([
      "shift_hook_overlays",
      "repair_overlay_timing",
    ]);

    if (!autoFixIds.has(fixId)) {
      return res.status(400).json({
        ok: false,
        error: "Esta correção precisa ser feita manualmente.",
        fixId,
        manualOnly: true,
      });
    }

    const { repairedCount, report } = repairProjectOverlayTiming(projDir, {
      persist: true,
    });

    await ensureListItemsInProject(projDir, {
      getApiKey,
      callGemini: (prompt, opts) =>
        callGeminiWithRetry(getApiKey(projDir), prompt, opts),
      parseJson: (text, label) =>
        parseAiJsonResponse(text, getApiKey(projDir), label),
      readProjectJson,
    });
    const qualityReport = runVideoQualityCheck(projDir, readProjectJson);
    const config = readJsonFile(path.join(projDir, "config_qanat.json")) || {};
    const storyboard =
      readJsonFile(path.join(projDir, "storyboard.json")) || {};
    const workflow = analyzeSceneGaps(projDir, { config, storyboard });
    const preRenderAdvice = buildPreRenderAdvice(qualityReport, workflow);

    res.json({
      ok: true,
      fixId,
      repairedCount,
      timingReport: report,
      ...qualityReport,
      workflow,
      preRenderAdvice,
      message:
        repairedCount > 0
          ? `${repairedCount} overlay(s) ajustado(s) automaticamente.`
          : "Nenhum overlay precisou ser movido — atualize a análise.",
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro na correção automática", details: err.message });
  }
});

// API: Aprovar amostra sample-first (OpenMontage) — libera render completo sem aviso
app.post("/api/projects/sample-approve", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const storyboardPath = path.join(projDir, "storyboard.json");
    const storyboard = readJsonFile(storyboardPath) || {};
    storyboard.sample_approved_at = new Date().toISOString();
    fs.writeFileSync(
      storyboardPath,
      JSON.stringify(storyboard, null, 2),
      "utf8"
    );
    res.json({ ok: true, sample_approved_at: storyboard.sample_approved_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Pre-render video quality check (overlays, listicle ranks, hook pollution)
app.get("/api/projects/video-quality", async (req, res) => {
  try {
    const projDir = getProjectDir(req);
    await ensureListItemsInProject(projDir, {
      getApiKey,
      callGemini: (prompt, opts) =>
        callGeminiWithRetry(getApiKey(projDir), prompt, opts),
      parseJson: (text, label) =>
        parseAiJsonResponse(text, getApiKey(projDir), label),
      readProjectJson,
    });
    const report = runVideoQualityCheck(projDir, readProjectJson);
    const agentConfig = loadStudioAgentsConfig(WORKSPACE_DIR);
    let workshop = null;
    if (agentConfig.autoCaptureOnQualityCheck) {
      try {
        if (!shouldSkipAutoCapture(WORKSPACE_DIR, projDir, report)) {
          const captureResult = captureQualityRun(
            WORKSPACE_DIR,
            projDir,
            report,
            "auto_quality"
          );
          workshop = captureResult?.workshop || null;
        }
      } catch (captureErr) {
        console.warn(
          "[Studio Agents] Captura automática falhou:",
          captureErr.message
        );
      }
    }
    const config = readJsonFile(path.join(projDir, "config_qanat.json")) || {};
    const storyboard =
      readJsonFile(path.join(projDir, "storyboard.json")) || {};
    const workflow = analyzeSceneGaps(projDir, { config, storyboard });
    const preRenderAdvice = buildPreRenderAdvice(report, workflow);
    res.json({ ...report, workflow, preRenderAdvice, workshop });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao verificar qualidade do vídeo",
      details: err.message,
    });
  }
});

// ─── Studio Agents (área separada — não altera o fluxo normal de geração) ───

app.get("/api/studio-agents/status", (req, res) => {
  try {
    ensureDefaultSkillBundles(WORKSPACE_DIR);
    res.json({
      ...getDashboard(WORKSPACE_DIR),
      obsidian: getObsidianVaultStatus(WORKSPACE_DIR),
      skills: getSkillsRegistryStatus(WORKSPACE_DIR),
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao carregar Studio Agents", details: err.message });
  }
});

app.get("/api/studio-agents/obsidian/status", (req, res) => {
  try {
    res.json(getObsidianVaultStatus(WORKSPACE_DIR));
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao carregar vault Obsidian", details: err.message });
  }
});

app.post("/api/studio-agents/obsidian/open", async (req, res) => {
  try {
    ensureObsidianVault(WORKSPACE_DIR);
    const file = String(req.body?.file || "MEMORIA-LUMIERA.md");
    const result = await openInObsidian(WORKSPACE_DIR, file);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao abrir Obsidian", details: err.message });
  }
});

app.get("/api/studio-agents/obsidian/graph", (req, res) => {
  try {
    res.json(auditVaultGraph(WORKSPACE_DIR));
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao auditar grafo", details: err.message });
  }
});

app.post("/api/studio-agents/obsidian/repair-graph", (req, res) => {
  try {
    const result = repairVaultGraphLinks(WORKSPACE_DIR);
    res.json({ ok: true, ...result });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao reparar grafo", details: err.message });
  }
});

app.get("/api/studio-agents/skills", (req, res) => {
  try {
    ensureDefaultSkillBundles(WORKSPACE_DIR);
    const task = String(req.query.task || "");
    const format = String(req.query.format || "").toUpperCase() || null;
    res.json({
      skills: listSkills(WORKSPACE_DIR, {
        task: task || null,
        format:
          format === "SHORTS" ? "SHORT" : format === "LONGO" ? "LONG" : format,
      }),
      bundles: listSkillBundles(WORKSPACE_DIR),
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao listar skills", details: err.message });
  }
});

app.get("/api/studio-agents/skills/:slug", (req, res) => {
  try {
    const ref = req.query.ref ? String(req.query.ref) : null;
    res.json(viewSkill(WORKSPACE_DIR, req.params.slug, ref));
  } catch (err) {
    res
      .status(404)
      .json({ error: "Skill não encontrada", details: err.message });
  }
});

app.get("/api/studio-agents/resolve-bundle", (req, res) => {
  try {
    const task = String(req.query.task || "ideas");
    const format = String(req.query.format || "SHORT");
    res.json(resolveBundlePreview(WORKSPACE_DIR, { task, format }));
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao resolver bundle", details: err.message });
  }
});

app.get("/api/studio-agents/skill-workshop", (req, res) => {
  try {
    res.json({ proposals: listSkillWorkshopProposals(WORKSPACE_DIR) });
  } catch (err) {
    res.status(500).json({ error: "Erro no workshop", details: err.message });
  }
});

app.post("/api/studio-agents/skill-workshop/:id/apply", (req, res) => {
  try {
    const result = applyWorkshopProposalById(WORKSPACE_DIR, req.params.id);
    res.json({ ok: true, ...result });
  } catch (err) {
    res
      .status(400)
      .json({ error: "Falha ao aplicar proposta", details: err.message });
  }
});

app.post("/api/studio-agents/skill-workshop/:id/reject", (req, res) => {
  try {
    const result = rejectWorkshopProposal(WORKSPACE_DIR, req.params.id);
    res.json({ ok: true, ...result });
  } catch (err) {
    res
      .status(400)
      .json({ error: "Falha ao rejeitar proposta", details: err.message });
  }
});

app.get("/api/studio-agents/learnings", (req, res) => {
  try {
    const niche = String(req.query.niche || "Geral");
    const task = String(req.query.task || "overlay");
    const format = String(req.query.format || "").toUpperCase() || null;
    const resolvedFormat =
      format === "LONG" || format === "LONGO"
        ? "LONG"
        : format === "SHORT" || format === "SHORTS"
          ? "SHORT"
          : null;
    const obsidian = resolveObsidianNotesForNiche(WORKSPACE_DIR, niche, {
      task,
      format: resolvedFormat || "SHORT",
    });
    res.json({
      niche,
      task,
      format: resolvedFormat,
      learnings: getNicheLearnings(WORKSPACE_DIR, niche, task, resolvedFormat),
      obsidian_notes: {
        files: obsidian.filesUsed,
        global_rules: obsidian.globalBullets,
        snippets: obsidian.snippets,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao carregar aprendizados", details: err.message });
  }
});

app.get("/api/studio-agents/code-map", (req, res) => {
  try {
    const compact = String(req.query.compact || "").toLowerCase();
    if (compact === "1" || compact === "true" || compact === "text") {
      res.type("text/plain; charset=utf-8").send(getCompactCodeMapText());
      return;
    }
    res.json(LUMIERA_CODE_MAP);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao carregar code map", details: err.message });
  }
});

const STUDIO_DOCUMENTATION = [
  { id: "home", label: "Hub de Memória", filename: "MEMORIA-LUMIERA.md" },
  {
    id: "architecture",
    label: "Arquitetura Geral",
    filename: "memory/lumiera-architecture-overview.md",
  },
  {
    id: "backend",
    label: "Mapa do Backend",
    filename: "memory/lumiera-backend-map.md",
  },
  {
    id: "frontend",
    label: "Mapa do Frontend",
    filename: "memory/lumiera-frontend-map.md",
  },
  {
    id: "remotion",
    label: "Mapa do Remotion",
    filename: "memory/lumiera-remotion-map.md",
  },
  {
    id: "videoagent",
    label: "VideoAgent e automação",
    filename: "memory/videoagent-lumiera.md",
  },
  { id: "agents", label: "Regras dos agentes", filename: "AGENTS.md" },
  { id: "skills", label: "Índice de skills", filename: "SKILLS.md" },
  {
    id: "bundles",
    label: "Bundles de skills",
    filename: "skill-bundles/BUNDLES.md",
  },
];

function availableStudioDocumentation() {
  return STUDIO_DOCUMENTATION.filter((doc) =>
    fs.existsSync(path.join(WORKSPACE_DIR, ".agents", doc.filename))
  );
}

function searchStudioDocumentation(query) {
  const needle = String(query || "")
    .trim()
    .toLocaleLowerCase("pt-BR");
  if (!needle) return [];
  return availableStudioDocumentation().flatMap((doc) => {
    const content = fs.readFileSync(
      path.join(WORKSPACE_DIR, ".agents", doc.filename),
      "utf8"
    );
    const line = content
      .split(/\r?\n/)
      .find((value) => value.toLocaleLowerCase("pt-BR").includes(needle));
    return line ? [{ ...doc, excerpt: line.trim().slice(0, 240) }] : [];
  });
}

app.get("/api/studio-agents/docs", (req, res) => {
  try {
    const docFiles = availableStudioDocumentation();
    const query = String(req.query.q || "").trim();
    if (query) {
      return res.json({
        files: docFiles,
        results: searchStudioDocumentation(query),
      });
    }

    const fileId = req.query.file;
    if (fileId) {
      const selected = docFiles.find((d) => d.id === fileId);
      if (!selected) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      const filePath = path.join(WORKSPACE_DIR, ".agents", selected.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          error: `Arquivo não encontrado no disco: ${selected.filename}`,
        });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return res.json({
        id: selected.id,
        label: selected.label,
        filename: selected.filename,
        content,
      });
    }

    res.json({ files: docFiles });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao carregar documentos", details: err.message });
  }
});

app.post("/api/studio-agents/config", (req, res) => {
  try {
    const config = saveStudioAgentsConfig(WORKSPACE_DIR, req.body || {});
    res.json({ ok: true, config });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao salvar configuração", details: err.message });
  }
});

app.post("/api/studio-agents/capture", async (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const report = runVideoQualityCheck(projDir, readProjectJson);
    const result = captureQualityRun(WORKSPACE_DIR, projDir, report, "capture");
    res.json({ ok: true, report, ...result });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao capturar execução", details: err.message });
  }
});

app.post("/api/studio-agents/reflect", async (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const report = runVideoQualityCheck(projDir, readProjectJson);
    const result = reflectProject(WORKSPACE_DIR, projDir, report);
    res.json({ ok: true, report, ...result });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao refletir projeto", details: err.message });
  }
});

app.get("/api/studio-agents/consolidate/preview", (req, res) => {
  try {
    const preview = previewConsolidation(WORKSPACE_DIR);
    res.json(preview);
  } catch (err) {
    res.status(500).json({
      error: "Erro ao pré-visualizar consolidação",
      details: err.message,
    });
  }
});

app.post("/api/studio-agents/consolidate", (req, res) => {
  try {
    const result = runConsolidation(WORKSPACE_DIR);
    res.json({ ok: true, ...result });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao consolidar memória", details: err.message });
  }
});

app.get("/api/ai/video-agent/registry", (_req, res) => {
  res.json({
    intents: LUMIERA_INTENT_MAP,
    agents: LUMIERA_AGENT_REGISTRY,
    source: "HKUDS/VideoAgent (adaptado Lumiera)",
  });
});

app.post("/api/ai/video-agent/plan", async (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const {
      requirement = "",
      format: formatRaw = "SHORTS",
      niche = "",
      useAi = true,
      enqueueQueue = false,
    } = req.body || {};

    const requirementText = String(requirement || "").trim();
    if (!requirementText) {
      return res
        .status(400)
        .json({ error: "Descreva o que você quer produzir (requirement)." });
    }

    const format =
      String(formatRaw || "SHORTS").toUpperCase() === "LONGO" ||
      String(formatRaw || "").toUpperCase() === "LONG"
        ? "LONGO"
        : "SHORTS";

    const browserText = extractBrowserResponse(req.body);
    const localPlan = planVideoAgentLocally(requirementText, { format, niche });
    let plan = localPlan;
    let aiEnhanced = false;

    try {
      if (browserText) {
        const llmFn = async () => browserText;
        plan = await planVideoAgentWithLlm(requirementText, {
          format,
          niche,
          llmFn,
        });
        plan.aiEnhanced = true;
        plan.source = "videoagent-lumiera-browser";
        aiEnhanced = true;
      } else if (useAi) {
        let browserPending = false;
        const llmFn = async (prompt) => {
          const text = await callGeminiLlm(req, res, projDir, {
            title: "VideoAgent · Plano Lumiera",
            prompt,
            temperature: 0.55,
          });
          if (text == null) {
            browserPending = true;
            return "";
          }
          return text;
        };
        const enhanced = await planVideoAgentWithLlm(requirementText, {
          format,
          niche,
          llmFn,
        });
        if (browserPending) return;
        if (enhanced?.lumieraActions?.length) {
          plan = enhanced;
          aiEnhanced = Boolean(enhanced.aiEnhanced);
        }
      }
    } catch (llmErr) {
      console.warn(
        "[VideoAgentPlanner] IA falhou — plano local:",
        llmErr.message
      );
      plan = { ...localPlan, aiEnhanced: false, llmError: llmErr.message };
    }

    if (!plan?.lumieraActions?.length) {
      plan = localPlan;
    }

    let obsidian = null;
    try {
      obsidian = appendPlanToObsidian(WORKSPACE_DIR, plan);
    } catch (obsErr) {
      console.warn("[VideoAgentPlanner] Obsidian log falhou:", obsErr.message);
    }

    let editorialQueue = null;
    if (
      enqueueQueue ||
      /fila|editorial|concorrente|replicar/i.test(requirementText)
    ) {
      try {
        const { enqueueEditorialIdeas } =
          await import("./youtubeEditorialQueue.js");
        const title = requirementText.slice(0, 200);
        const enqueued = enqueueEditorialIdeas(
          WORKSPACE_DIR,
          [
            {
              title,
              hookPt: plan.reasoning?.slice(0, 300) || "",
              mechanic: "videoagent-plan",
            },
          ],
          {
            source: "videoagent-plan",
            format: format === "LONGO" ? "LONG" : "SHORTS",
          }
        );
        editorialQueue = { enqueued: 1, total: enqueued.items.length };
      } catch (err) {
        console.warn("[VideoAgentPlanner] Fila editorial:", err.message);
      }
    }

    const suggestedTitle = extractVideoTitleFromRequirement(requirementText);
    if (!res.headersSent) {
      res.json({
        ok: true,
        plan,
        obsidian,
        editorialQueue,
        suggestedTitle,
        aiEnhanced,
      });
    }
  } catch (err) {
    console.error("[VideoAgentPlanner]", err.message);
    if (res.headersSent) return;
    try {
      const requirementText = String(req.body?.requirement || "").trim();
      if (requirementText) {
        const formatRaw = req.body?.format || "SHORTS";
        const format =
          String(formatRaw).toUpperCase() === "LONGO" ||
          String(formatRaw).toUpperCase() === "LONG"
            ? "LONGO"
            : "SHORTS";
        const niche = String(req.body?.niche || "");
        const plan = planVideoAgentLocally(requirementText, { format, niche });
        return res.json({
          ok: true,
          plan,
          aiEnhanced: false,
          fallback: true,
          warning: err.message,
          suggestedTitle: extractVideoTitleFromRequirement(requirementText),
        });
      }
    } catch (fallbackErr) {
      console.error(
        "[VideoAgentPlanner] fallback local falhou:",
        fallbackErr.message
      );
    }
    res
      .status(500)
      .json({ error: "Falha ao planejar vídeo", details: err.message });
  }
});

app.get("/api/projects/asset-file", (req, res) => {
  try {
    const filePath = req.query.file;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
    }
    return res.sendFile(path.resolve(filePath));
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.get("/api/video-agent/storyboard", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const storyboardPath = path.join(projDir, "storyboard.json");
    if (!fs.existsSync(storyboardPath)) {
      return res.json({ ok: true, storyboard: [] });
    }

    const sbData = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
    const vps = sbData.visual_prompts || [];

    const frames = vps.map((vp, index) => {
      const sceneId = vp.scene || vp.scene_ref || `1.${index + 1}`;
      const blockNum = vp.block || Math.floor(index / 2) + 1;
      const desc = (
        vp.narration_text ||
        vp.visual_prompt ||
        vp.generate_from_prompt ||
        ""
      ).trim();
      const dur = vp.duration ? `${vp.duration}s` : "3s";

      const assetObj = vp.asset || {};
      const assetFilename =
        typeof assetObj === "string"
          ? assetObj
          : assetObj.asset || assetObj.file || null;
      let assetUrl = null;
      let mediaType = "image";
      if (assetFilename) {
        const assetPath = path.join(projDir, "ASSETS", assetFilename);
        if (fs.existsSync(assetPath)) {
          assetUrl = `/api/projects/asset-file?file=${encodeURIComponent(assetPath)}`;
          if (assetFilename.match(/\.(mp4|webm|mov)$/i)) {
            mediaType = "video";
          }
        }
      }

      return {
        id: String(sceneId),
        scene_key: String(sceneId),
        block: blockNum,
        time: dur,
        title: `Cena ${sceneId} · Bloco ${blockNum}`,
        description: desc,
        narration_text: vp.narration_text || "",
        type: vp.motion_template_id ? "graphics" : "broll",
        motion_template_id: vp.motion_template_id || null,
        asset_url: assetUrl,
        media_type: mediaType,
        status: "approved",
      };
    });

    return res.json({
      ok: true,
      project: path.basename(projDir),
      storyboard: frames,
    });
  } catch (err) {
    console.error("[VideoAgent] Erro ao carregar storyboard:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/video-agent/chat", async (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const {
      message = "",
      storyboard = [],
      graphics_ideas = [],
      selected_scene = null,
    } = req.body || {};

    const text = String(message || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Mensagem vazia." });
    }

    const HF_CMD_RE = /npx\s+hyperframes\s+(\w+)(.*)/i;
    const hfMatch = text.match(HF_CMD_RE);

    if (hfMatch) {
      const subcommand = hfMatch[1].toLowerCase();
      const extraArgs = (hfMatch[2] || "").trim();
      const allowedCmds = [
        "init",
        "lint",
        "inspect",
        "preview",
        "render",
        "doctor",
        "info",
        "compositions",
        "benchmark",
        "layout",
      ];

      if (!allowedCmds.includes(subcommand)) {
        return res.json({
          reply: `Comando "${subcommand}" não reconhecido. Comandos disponíveis: ${allowedCmds.join(", ")}.`,
          hf_status: "error",
        });
      }

      const hfDir = path.join(projDir, "hyperframes");
      if (
        !fs.existsSync(hfDir) &&
        subcommand !== "init" &&
        subcommand !== "doctor" &&
        subcommand !== "info"
      ) {
        return res.json({
          reply: `Nenhuma composição HyperFrames encontrada em ${hfDir}.\n\nRode "npx hyperframes init" primeiro para criar a estrutura.`,
          hf_status: "error",
          suggestions: [
            "npx hyperframes init --non-interactive",
            "npx hyperframes doctor",
          ],
        });
      }

      // Remove comentários descritivos em português (ex: "— criar composição")
      let cleanExtraArgs = (hfMatch[2] || "")
        .replace(/\s*[—–-]\s*[A-Za-zÀ-ÿ].*/i, "")
        .trim();

      const workDir = fs.existsSync(hfDir) ? hfDir : projDir;
      const args = ["--yes", "hyperframes@latest", subcommand];
      if (cleanExtraArgs) {
        args.push(...cleanExtraArgs.split(/\s+/).filter(Boolean));
      }

      if (subcommand === "init") {
        if (fs.existsSync(path.join(hfDir, "index.html"))) {
          return res.json({
            reply: `✓ Composição HyperFrames já está pronta em ${hfDir}.\n\nVocê já pode validar (lint), visualizar (preview) ou renderizar (render).`,
            command: "npx --yes hyperframes@latest init hyperframes",
            output: `HyperFrames composition active at: ${hfDir}`,
            hf_status: "init",
            suggestions: [
              "npx hyperframes lint",
              "npx hyperframes preview",
              "npx hyperframes render",
            ],
          });
        }
        if (!args.includes("hyperframes") && !args.includes(".")) {
          args.splice(3, 0, "hyperframes");
        }
        if (!args.includes("--non-interactive")) {
          args.push("--non-interactive");
        }
        if (
          !args.some((a) => ["--example", "--video", "--audio"].includes(a))
        ) {
          args.push("--example", "blank");
        }
      }

      const command = `npx ${args.join(" ")}`;
      console.log(`[VideoAgent] Executando: ${command} (cwd: ${workDir})`);

      const result = await new Promise((resolve) => {
        const child = spawn("npx", args, {
          cwd: workDir,
          shell: true,
          env: {
            ...process.env,
            NODE_OPTIONS: "",
            PATH: `C:\\Program Files\\nodejs;${process.env.PATH || ""}`,
          },
        });
        let stdout = "";
        let stderr = "";
        let resolved = false;

        const checkPreviewReady = () => {
          if (subcommand === "preview" && !resolved) {
            const combined = stdout + stderr;
            if (
              combined.includes("Studio running") ||
              combined.includes("http://localhost") ||
              combined.includes("http://127.0.0.1")
            ) {
              resolved = true;
              clearTimeout(timer);
              resolve({ stdout, stderr, status: 0 });
            }
          }
        };

        const timer = setTimeout(
          () => {
            if (resolved) return;
            resolved = true;
            if (
              subcommand === "preview" &&
              (stdout + stderr).includes("Studio")
            ) {
              resolve({ stdout, stderr, status: 0 });
            } else {
              child.kill("SIGTERM");
              resolve({
                stdout,
                stderr: stderr + "\n[timeout]",
                status: subcommand === "preview" ? 0 : 1,
              });
            }
          },
          subcommand === "preview"
            ? 5000
            : subcommand === "render"
              ? 300000
              : 90000
        );

        child.stdout.on("data", (d) => {
          stdout += d.toString();
          checkPreviewReady();
        });
        child.stderr.on("data", (d) => {
          stderr += d.toString();
          checkPreviewReady();
        });
        child.on("close", (code) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          resolve({
            stdout,
            stderr,
            status: code ?? (subcommand === "preview" ? 0 : 1),
          });
        });
        child.on("error", (err) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          resolve({ stdout, stderr: String(err.message), status: 1 });
        });
      });

      const stdout = (result.stdout || "").trim();
      const stderr = (result.stderr || "").replace(/^npm warn.*$/gm, "").trim();
      const output = [stdout, stderr].filter(Boolean).join("\n\n");
      let exitCode = result.status ?? 1;
      if (
        subcommand === "preview" &&
        (output.includes("Studio") || output.includes("http://localhost"))
      ) {
        exitCode = 0;
      }

      let previewUrl = null;
      if (subcommand === "preview") {
        const portMatch = output.match(/localhost:(\d+)/);
        if (portMatch) {
          previewUrl = `http://localhost:${portMatch[1]}`;
        } else {
          previewUrl = "http://localhost:3002";
        }
      }

      const hfStatusMap = {
        init: "init",
        lint: "lint",
        inspect: "lint",
        preview: "preview",
        render: "render",
        doctor: "idle",
        info: "idle",
      };

      return res.json({
        reply:
          exitCode === 0
            ? `✓ \`hyperframes ${subcommand}\` executado com sucesso.`
            : `✗ \`hyperframes ${subcommand}\` falhou (exit ${exitCode}).`,
        command,
        output: output.slice(0, 8000),
        hf_status: exitCode === 0 ? hfStatusMap[subcommand] || "idle" : "error",
        preview_url: previewUrl,
        suggestions:
          subcommand === "init" && exitCode === 0
            ? [
                "npx hyperframes lint",
                "npx hyperframes preview",
                "Editar index.html",
              ]
            : subcommand === "lint" && exitCode === 0
              ? [
                  "npx hyperframes preview",
                  "npx hyperframes render --quality standard",
                ]
              : subcommand === "render" && exitCode === 0
                ? [
                    "Ver arquivo renderizado",
                    "npx hyperframes render --quality high",
                  ]
                : [],
      });
    }

    const isCompanionRequest =
      /companion|dirigir|passo a passo|acompanhar/i.test(text);
    const isAnalyzeRequest =
      /analis|storyboard|gráficos|overlays|sugerir/i.test(text);
    const isBuildRequest =
      /construir|build|aprovar|renderizar|gerar vídeo/i.test(text);
    const isFromScratch = /do zero|criar vídeo|novo vídeo|prompt/i.test(text);

    let reply = "";
    let suggestions = [];
    let storyboardOut = null;
    let graphicsOut = null;
    let hfStatus = "idle";

    if (isCompanionRequest) {
      reply = `Modo Companion ativado. Vou usar o HyperFrames CLI real para cada etapa:\n\n1. **Pitch** — proponho ângulos\n2. **Storyboard** — estrutura de cenas\n3. **Sketch** — \`npx hyperframes init\` + HTML\n4. **Review** — \`npx hyperframes lint\` + \`inspect\`\n5. **Build** — \`npx hyperframes render\`\n\nMe diga o tema, formato e tom do vídeo.`;
      suggestions = [
        "Engenharia civil, Shorts, documental",
        "Curiosidades científicas, Shorts, energético",
        "Mistérios históricos, Longo, misterioso",
      ];
    } else if (isAnalyzeRequest) {
      const prompt = `Você é um diretor de motion graphics analisando um storyboard de vídeo para YouTube.

STORYBOARD ATUAL:
${JSON.stringify(storyboard.slice(0, 10), null, 2)}

INSTRUÇÃO DO USUÁRIO: ${text}

Analise cada cena e identifique onde gráficos, charts, counters, lower thirds ou text overlays podem ser adicionados como composições HyperFrames (HTML + CSS animations).

Responda APENAS JSON:
{
  "reply": "explicação curta",
  "graphics_ideas": [
    {"id": "g1", "sceneTitle": "título", "type": "chart|lower_third|text_overlay|counter|comparison|timeline", "description": "o que mostrar", "data_hint": "dados necessários"}
  ]
}`;
      try {
        const llmText = await callGeminiLlm(req, res, projDir, {
          title: "Video Agent · Análise HyperFrames",
          prompt,
          temperature: 0.5,
          maxTokens: 4000,
        });
        if (llmText != null) {
          const parsed = parseJsonLocally(llmText);
          if (parsed?.graphics_ideas?.length) {
            graphicsOut = parsed.graphics_ideas.map((g, i) => ({
              ...g,
              id: g.id || `g${i + 1}`,
              status: "suggested",
            }));
            reply =
              parsed.reply ||
              `Encontrei ${graphicsOut.length} oportunidades para composições HyperFrames.`;
          } else {
            reply =
              "Não encontrei pontos claros para gráficos. Seja mais específico.";
          }
        }
      } catch (llmErr) {
        reply = `Erro na análise: ${llmErr.message}`;
      }
      suggestions = [
        "npx hyperframes init --non-interactive",
        "Aprovar todos",
        "npx hyperframes doctor",
      ];
    } else if (isBuildRequest) {
      const hfDir = path.join(projDir, "hyperframes");
      if (!fs.existsSync(path.join(hfDir, "index.html"))) {
        reply =
          "Nenhuma composição HyperFrames encontrada. Rode init primeiro.";
        suggestions = ["npx hyperframes init --non-interactive"];
      } else {
        reply = "Renderizando composição HyperFrames...";
        hfStatus = "render";
        const result = await new Promise((resolve) => {
          const child = spawn(
            "npx",
            ["hyperframes", "render", "--quality", "standard"],
            {
              cwd: hfDir,
              shell: true,
              env: {
                ...process.env,
                NODE_OPTIONS: "",
                PATH: `C:\\Program Files\\nodejs;${process.env.PATH || ""}`,
              },
            }
          );
          let stdout = "";
          let stderr = "";
          const timer = setTimeout(() => {
            child.kill("SIGTERM");
            resolve({ stdout, stderr: stderr + "\n[timeout]", status: 1 });
          }, 300000);
          child.stdout.on("data", (d) => {
            stdout += d.toString();
          });
          child.stderr.on("data", (d) => {
            stderr += d.toString();
          });
          child.on("close", (code) => {
            clearTimeout(timer);
            resolve({ stdout, stderr, status: code ?? 1 });
          });
          child.on("error", (err) => {
            clearTimeout(timer);
            resolve({ stdout, stderr: String(err.message), status: 1 });
          });
        });
        const output = [result.stdout || "", result.stderr || ""]
          .filter(Boolean)
          .join("\n");
        reply =
          result.status === 0
            ? "✓ Render concluído! Vídeo gerado em renders/."
            : `✗ Render falhou (exit ${result.status}).`;
        suggestions =
          result.status === 0
            ? [
                "npx hyperframes render --quality high",
                "npx hyperframes preview",
              ]
            : ["npx hyperframes lint", "npx hyperframes doctor"];
        return res.json({
          reply,
          command: "npx hyperframes render --quality standard",
          output: output.slice(0, 8000),
          hf_status: result.status === 0 ? "render" : "error",
          suggestions,
        });
      }
    } else if (isFromScratch) {
      const prompt = `Você é o Video Agent do Lumiera. O usuário quer criar um vídeo com HyperFrames.

PEDIDO: ${text}

Crie um storyboard com 5-8 frames. Cada frame será uma cena HTML na composição HyperFrames.

Responda APENAS JSON:
{
  "reply": "explicação da estrutura",
  "storyboard": [{"id": "f1", "time": "0:00-0:05", "title": "...", "description": "...", "type": "broll|graphics|caption|chart|transition", "status": "proposed"}],
  "suggestions": ["sugestão 1", "sugestão 2"]
}`;
      try {
        const llmText = await callGeminiLlm(req, res, projDir, {
          title: "Video Agent · Storyboard HyperFrames",
          prompt,
          temperature: 0.7,
          maxTokens: 6000,
        });
        if (llmText != null) {
          const parsed = parseJsonLocally(llmText);
          if (parsed?.storyboard?.length) {
            storyboardOut = parsed.storyboard.map((f, i) => ({
              ...f,
              id: f.id || `f${i + 1}`,
              status: "proposed",
            }));
            reply =
              parsed.reply ||
              `Propus ${storyboardOut.length} frames. Aprove no painel e depois rode init.`;
            suggestions = parsed.suggestions || [
              "npx hyperframes init --non-interactive",
              "Aprovar todos",
            ];
          } else {
            reply = "Não consegui gerar o storyboard. Reformule o pedido.";
          }
        }
      } catch (llmErr) {
        reply = `Erro: ${llmErr.message}`;
      }
    } else {
      const prompt = `Você é o Video Agent do Lumiera. Responda concisamente. O usuário está trabalhando com HyperFrames CLI.

MENSAGEM: ${text}

Responda APENAS JSON: {"reply": "sua resposta", "suggestions": ["s1", "s2"]}`;
      try {
        const llmText = await callGeminiLlm(req, res, projDir, {
          title: "Video Agent · Chat",
          prompt,
          temperature: 0.6,
          maxTokens: 2000,
        });
        if (llmText != null) {
          const parsed = parseJsonLocally(llmText);
          reply = parsed?.reply || llmText.slice(0, 500);
          suggestions = parsed?.suggestions || [];
        } else {
          reply = "Não consegui processar.";
        }
      } catch (llmErr) {
        reply = `Erro: ${llmErr.message}`;
      }
    }

    if (!res.headersSent) {
      res.json({
        reply,
        suggestions,
        storyboard: storyboardOut,
        graphics_ideas: graphicsOut,
        hf_status: hfStatus,
      });
    }
  } catch (err) {
    console.error("[VideoAgentChat]", err.message);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Erro no Video Agent", details: err.message });
    }
  }
});

app.post("/api/ai/video-agent/execute", async (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const {
      requirement = "",
      format: formatRaw = "SHORTS",
      niche = "",
      useAi = false,
      plan: planIn = null,
      steps = null,
    } = req.body || {};

    const requirementText = String(requirement || "").trim();
    if (!requirementText && !planIn?.lumieraActions?.length) {
      return res
        .status(400)
        .json({ error: "Descreva o pedido ou envie um plano." });
    }

    const format =
      String(formatRaw || planIn?.format || "SHORTS").toUpperCase() ===
        "LONGO" || String(formatRaw || "").toUpperCase() === "LONG"
        ? "LONGO"
        : "SHORTS";

    let plan = planIn;
    if (!plan?.lumieraActions?.length) {
      plan = planVideoAgentLocally(requirementText, { format, niche });
      if (useAi) {
        const browserText = extractBrowserResponse(req.body);
        if (browserText) {
          const llmFn = async () => browserText;
          plan = await planVideoAgentWithLlm(requirementText, {
            format,
            niche,
            llmFn,
          });
        } else {
          let browserPending = false;
          const llmFn = async (prompt) => {
            const text = await callGeminiLlm(req, res, projDir, {
              title: "VideoAgent · Executar plano",
              prompt,
              temperature: 0.55,
            });
            if (text == null) {
              browserPending = true;
              return "";
            }
            return text;
          };
          const enhanced = await planVideoAgentWithLlm(requirementText, {
            format,
            niche,
            llmFn,
          });
          if (browserPending) return;
          plan = enhanced;
        }
      }
      appendPlanToObsidian(WORKSPACE_DIR, plan);
    }

    const wanted =
      Array.isArray(steps) && steps.length
        ? steps
        : (plan.lumieraActions || []).map((a) => a.action);

    const results = [];
    const suggestedTitle = extractVideoTitleFromRequirement(
      plan.requirement || requirementText
    );
    const hookHint = plan.storyboardBeats?.[0]?.narrationHint || "";
    const fmtShort = format !== "LONGO";

    const runStep = async (key, fn) => {
      if (!wanted.includes(key)) return;
      try {
        const payload = await fn();
        results.push({ step: key, status: "ok", ...payload });
      } catch (err) {
        console.warn(`[VideoAgentExecute] ${key}:`, err.message);
        results.push({ step: key, status: "error", error: err.message });
      }
    };

    const creatorSteps = [
      "creator_ideas",
      "creator_narration",
      "creator_script",
    ];
    if (creatorSteps.some((k) => wanted.includes(k))) {
      results.push({
        step: "creator_pipeline",
        status: "pending_ui",
        title: suggestedTitle,
        hook: hookHint,
        format,
        niche: niche || plan.niche || "Geral",
        message: "Abrir Creator, criar projeto e gerar narração",
      });
    }

    const { llmFn: competitorLlmFn, repairJsonFn: competitorRepairFn } =
      buildCompetitorLlmFns(
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
        { useAi: req.body?.useAi !== false }
      );

    await runStep("agent_reach", async () => {
      const { fetchAgentReachResearchForTopic } =
        await import("./agentReachService.js");
      const topic = requirementText || plan.requirement || suggestedTitle;
      const research = await fetchAgentReachResearchForTopic({
        topic,
        niche: niche || plan.niche || "Geral",
        workspaceDir: WORKSPACE_DIR,
        numResults: 8,
      });
      if (!research.available)
        throw new Error(research.message || "Agent Reach indisponível");
      let editorialQueue = null;
      if (wanted.includes("editorial_queue")) {
        const { enqueueEditorialIdeas } =
          await import("./youtubeEditorialQueue.js");
        const enqueued = enqueueEditorialIdeas(
          WORKSPACE_DIR,
          [
            {
              title: `Pesquisa: ${String(topic).slice(0, 72)}`,
              hookPt: research.summary.slice(0, 280),
            },
          ],
          { source: "agent-reach", format: fmtShort ? "SHORTS" : "LONGO" }
        );
        editorialQueue = { enqueued: 1, total: enqueued.items.length };
      }
      return {
        sources: research.sources?.length || 0,
        facts: research.facts?.length || 0,
        via: research.via,
        editorialQueue,
      };
    });

    await runStep("deep_research", async () => {
      const topic = requirementText || plan.requirement || suggestedTitle;
      const deep = await runDeepResearch(WORKSPACE_DIR, {
        topic,
        niche: niche || plan.niche || "Geral",
        format,
        llmFn: competitorLlmFn,
        repairJsonFn: competitorRepairFn,
        getApiKeys,
        apiKey: getApiKey(WORKSPACE_DIR),
        backendDir: __dirname,
        notebooklmDeep: req.body?.notebooklmDeep === true,
        enqueueIdeas: wanted.includes("editorial_queue"),
        projDir,
      });
      if (!deep.ok) throw new Error(deep.error || "Pesquisa profunda falhou");
      return {
        derivedIdeas: deep.report?.derivedIdeas?.length || 0,
        editorialQueue: deep.editorialQueue,
        memoryFile: deep.obsidian?.memoryFile,
        factCount: deep.report?.factCount || 0,
      };
    });

    await runStep("competitor_research", async () => {
      const report = await runCompetitorResearch(WORKSPACE_DIR, {
        niche: niche || plan.niche || "Geral",
        format: fmtShort ? "SHORT" : "LONG",
        maxCompetitors: 5,
        projectsRoot: PROJECTS_ROOT,
        llmFn: competitorLlmFn,
        repairJsonFn: competitorRepairFn,
      });
      let editorialQueue = null;
      if (
        wanted.includes("editorial_queue") &&
        report?.analysis?.derivedIdeas?.length
      ) {
        const { enqueueEditorialIdeas } =
          await import("./youtubeEditorialQueue.js");
        const enqueued = enqueueEditorialIdeas(
          WORKSPACE_DIR,
          report.analysis.derivedIdeas,
          {
            source: "videoagent-execute",
            format: fmtShort ? "SHORTS" : "LONGO",
          }
        );
        editorialQueue = {
          enqueued: report.analysis.derivedIdeas.length,
          total: enqueued.items.length,
        };
      }
      return {
        derivedIdeas: report?.analysis?.derivedIdeas?.length || 0,
        outliers: report?.analysis?.outliers?.length || 0,
        editorialQueue,
      };
    });

    if (
      wanted.includes("editorial_queue") &&
      !results.some((r) => r.step === "competitor_research" && r.editorialQueue)
    ) {
      try {
        const { enqueueEditorialIdeas } =
          await import("./youtubeEditorialQueue.js");
        const enqueued = enqueueEditorialIdeas(
          WORKSPACE_DIR,
          [
            {
              title: suggestedTitle,
              hookPt: hookHint,
              mechanic: "videoagent-execute",
            },
          ],
          {
            source: "videoagent-execute",
            format: fmtShort ? "SHORTS" : "LONGO",
          }
        );
        results.push({
          step: "editorial_queue",
          status: "ok",
          total: enqueued.items.length,
        });
      } catch (err) {
        results.push({
          step: "editorial_queue",
          status: "error",
          error: err.message,
        });
      }
    }

    await runStep("top_winners", async () => {
      const { generateTopWinnerIdeas } =
        await import("./youtubeEditorialQueue.js");
      const report = await generateTopWinnerIdeas(
        WORKSPACE_DIR,
        PROJECTS_ROOT,
        {
          niche: niche || plan.niche || "",
          limit: 3,
          llmFn: async (prompt) =>
            callGeminiWithRetry(getApiKey(WORKSPACE_DIR), prompt, {
              maxRetries: 1,
              temperature: 0.4,
              projectDir: WORKSPACE_DIR,
            }),
        }
      );
      if (!report.ok)
        throw new Error(report.error || "Top winners indisponível");
      return {
        variations: report.ideas?.length || 0,
        total: report.queueCount || 0,
      };
    });

    await runStep("retention_cliff", async () => {
      const videoId = String(req.body?.videoId || "").trim();
      if (!videoId) {
        return {
          skipped: true,
          message: "Informe videoId para análise de retenção",
        };
      }
      const report = await fetchRetentionCliffReport(WORKSPACE_DIR, videoId);
      return { cliffs: report?.cliffs?.length || 0 };
    });

    const deferred = [];
    if (wanted.includes("overlay_plan"))
      deferred.push({
        step: "overlay_plan",
        tab: "editor",
        api: "/api/studio-agents/plan-overlays",
      });
    if (wanted.includes("youtube_metadata"))
      deferred.push({ step: "youtube_metadata", tab: "ai" });
    if (wanted.includes("render_short") || wanted.includes("render_long"))
      deferred.push({ step: "render", tab: "status" });
    if (wanted.includes("upload_youtube"))
      deferred.push({ step: "upload_youtube", tab: "upload" });

    res.json({
      ok: true,
      plan,
      suggestedTitle,
      results,
      deferred,
      creatorTrigger:
        results.find(
          (r) => r.step === "creator_pipeline" && r.status === "pending_ui"
        ) || null,
    });
  } catch (err) {
    console.error("[VideoAgentExecute]", err.message);
    res
      .status(500)
      .json({ error: "Falha na execução VideoAgent", details: err.message });
  }
});

app.post("/api/studio-agents/plan-overlays", async (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const gateConfig = readProjectJson(projDir, "config_qanat.json", {});
    if (!isAiOverlaysEnabled(gateConfig)) {
      const storyboard = stripAiOverlaysFromStoryboard(
        readProjectJson(projDir, "storyboard.json", {})
      );
      fs.writeFileSync(
        path.join(projDir, "storyboard.json"),
        JSON.stringify(storyboard, null, 2),
        "utf8"
      );
      return res.json({
        success: true,
        overlayCount: 0,
        skippedAi: true,
        disabled: true,
        source: "templates_only",
        message:
          "Overlays IA desativados — use motion_scenes e Template Studio.",
      });
    }
    const useHyperframes = req.body?.hyperframes === true;
    const browserTextRaw = extractBrowserResponse(req.body);
    const browserText = browserTextRaw
      ? extractOverlayJsonPayload(browserTextRaw) || browserTextRaw
      : null;
    const forceBrowser =
      req.body?.require_browser === true || shouldOfferGeminiBrowser(projDir);
    const expectedPlanSession =
      String(req.body?.plan_session_id || "").trim() || null;

    const config = readProjectJson(projDir, "config_qanat.json", {});
    const timings = readProjectJson(projDir, "block_timings.json", {});
    const projectFormat = detectVideoFormat(
      config,
      Number(timings.total_duration) || 0
    );
    const learningsAddendum = buildStudioAgentsPromptAddendum(WORKSPACE_DIR, {
      niche: config.niche || "Geral",
      task: "overlay",
      format: projectFormat,
    });

    let llmText = browserText;
    if (!llmText) {
      const planSessionId = createOverlayPlanSessionId();
      const orchestrationForResearch = buildOverlayOrchestrationPlan({
        config,
        niche: config.niche || "Geral",
        totalDuration: Number(timings.total_duration) || 0,
        projectName: path.basename(projDir),
        blockCount: Array.isArray(config.block_phrases)
          ? config.block_phrases.length
          : 0,
      });
      const overlayResearch = await resolveOverlayResearchForPlanning(
        projDir,
        WORKSPACE_DIR,
        {
          orchestrationPlan: orchestrationForResearch,
          callGemini: (prompt, opts) =>
            callGeminiWithRetry(getApiKey(projDir), prompt, opts),
        }
      );
      const researchAddendum = buildOverlayResearchPromptBlock(overlayResearch);
      const prompt = buildCompactOverlayPlanningPrompt(
        projDir,
        useHyperframes,
        planSessionId,
        `${learningsAddendum || ""}${researchAddendum}`,
        overlayResearch
      );
      if (!prompt) {
        return res.status(400).json({
          error: "Projeto sem blocos de narração para planejar overlays.",
        });
      }

      if (forceBrowser) {
        const title = "Studio Agents · Planejar overlays (com memória)";
        const promptText = buildBrowserTaskPrompt(title, prompt, "", {
          taskType: "overlay",
          responseFormat: "json",
        });
        console.log(
          `[Studio Agents] Planejamento com memória — sessão ${planSessionId}.`
        );
        return res.json(
          offerGeminiBrowserPayload({
            title,
            prompt: promptText,
            planSessionId,
          })
        );
      }

      const apiKey = getApiKey(projDir);
      if (!apiKey) {
        return res.status(401).json({
          error:
            "Sem chave API. Ative Gemini no Chrome nas configurações ou adicione uma chave.",
        });
      }
      llmText = await callGeminiWithRetry(apiKey, prompt, {
        temperature: 0.35,
        projectDir: projDir,
      });
      if (!llmText) {
        return res.status(500).json({
          error: "Falha ao consultar Gemini API para overlays (Studio Agents).",
        });
      }
    }

    if (
      expectedPlanSession &&
      !overlayPlanSessionMatches(llmText, expectedPlanSession)
    ) {
      return res.status(422).json({
        error:
          "Resposta do Gemini desatualizada. Aguarde a nova resposta na aba gemini.google.com.",
        overlayCount: 0,
        staleResponse: true,
      });
    }

    const overlaysAi = await generateOverlaysWithAI(
      projDir,
      useHyperframes,
      null,
      {},
      {
        llmText,
        skipBrowserCache: true,
        planningOnly: true,
        agentMode: true,
      }
    );

    const blockPhrases = Array.isArray(config.block_phrases)
      ? config.block_phrases
      : [];
    const cleanedAi = filterNarrationEchoOverlays(
      Array.isArray(overlaysAi) ? overlaysAi : [],
      blockPhrases
    );

    if (cleanedAi.length === 0) {
      return res.status(422).json({
        error: "Studio Agents: overlays descartados após validação.",
        overlayCount: 0,
      });
    }

    const planToken = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    storyboard.overlays_ai = repairOverlaysEncoding(
      JSON.parse(JSON.stringify(cleanedAi))
    );
    storyboard.overlays_hyperframes = useHyperframes;
    storyboard.overlays_planned_at = new Date().toISOString();
    storyboard.overlays_plan_token = planToken;
    storyboard.overlays_planned_by = "studio-agents";
    const timingsForPlan = readProjectJson(projDir, "block_timings.json", {
      starts: [],
      durations: [],
    });
    const totalDurPlan =
      Number(timingsForPlan.total_duration) ||
      (timingsForPlan.starts?.length && timingsForPlan.durations?.length
        ? Number(timingsForPlan.starts[timingsForPlan.starts.length - 1]) +
          Number(timingsForPlan.durations[timingsForPlan.durations.length - 1])
        : 48);
    const planForTiming = buildOverlayOrchestrationPlan({
      config,
      niche: config.niche || "Geral",
      totalDuration: totalDurPlan,
      projectName: path.basename(projDir),
      blockCount: Array.isArray(timingsForPlan.starts)
        ? timingsForPlan.starts.length
        : 0,
    });
    const finalized = finalizeProjectOverlays(
      projDir,
      storyboard.overlays_ai,
      config,
      storyboard,
      timingsForPlan.starts || [],
      timingsForPlan.durations || [],
      planForTiming,
      totalDurPlan
    );
    const finalizedInformative = finalized.filter(isInformativeOverlay);
    if (finalizedInformative.length === 0) {
      return res.status(422).json({
        error:
          "Studio Agents: overlays rejeitados porque nao tinham fato das fontes associado a narracao.",
        overlayCount: 0,
      });
    }
    storyboard.overlays = finalized;
    const cleanSb = repairStoryboardEncoding(storyboard);
    fs.writeFileSync(
      path.join(projDir, "storyboard.json"),
      JSON.stringify(cleanSb, null, 2),
      "utf8"
    );
    console.log(
      `[Studio Agents] ${cleanedAi.length} overlays planejados com memória do estúdio.`
    );

    res.json({
      ok: true,
      overlayCount: cleanedAi.length,
      planToken,
      plannedBy: "studio-agents",
      learningsApplied: Boolean(learningsAddendum),
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: err.message || "Falha no planejamento Studio Agents." });
  }
});

// API: Wizard session — persistência do passo a passo do Creator (sobrevive a F5)
app.get("/api/projects/wizard-session", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const sessionPath = path.join(projDir, "wizard_session.json");
    if (!fs.existsSync(sessionPath)) {
      return res.json({ session: null });
    }
    const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
    res.json({ session, project: path.basename(projDir) });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao carregar sessão do wizard",
      details: err.message,
    });
  }
});

app.put("/api/projects/wizard-session", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const session = req.body;
    if (!session || typeof session !== "object") {
      return res.status(400).json({ error: "Corpo da sessão inválido." });
    }
    const sessionPath = path.join(projDir, "wizard_session.json");
    let existing = null;
    if (fs.existsSync(sessionPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
      } catch (e) {
        /* ignore */
      }
    }
    const incomingAt = session.savedAt
      ? new Date(session.savedAt).getTime()
      : 0;
    const existingAt = existing?.savedAt
      ? new Date(existing.savedAt).getTime()
      : 0;
    if (existing && incomingAt > 0 && existingAt > incomingAt) {
      return res.status(409).json({
        error: "Sessão mais recente já está no servidor.",
        session: existing,
        savedAt: existing.savedAt,
      });
    }
    const payload = {
      ...session,
      version: session.version || 1,
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(sessionPath, JSON.stringify(payload, null, 2), "utf8");
    res.json({ ok: true, savedAt: payload.savedAt });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao salvar sessão do wizard", details: err.message });
  }
});

app.delete("/api/projects/wizard-session", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const sessionPath = path.join(projDir, "wizard_session.json");
    if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
    res.json({ ok: true });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao limpar sessão do wizard", details: err.message });
  }
});

// API: Save storyboard data

app.post("/api/projects/storyboard", (req, res) => {
  const projDir = getProjectDir(req);

  const storyboardData = req.body;

  if (!storyboardData || !storyboardData.visual_prompts) {
    return res.status(400).json({ error: "Dados do storyboard inválidos." });
  }

  const storyboardPath = path.join(projDir, "storyboard.json");

  const configPath = path.join(projDir, "config_qanat.json");

  const transcriptPath = path.join(projDir, "transcripts_readable.txt");

  try {
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }

    // Política GLOBAL POV em todo save (qualquer projeto)
    const enforced = enforcePovNoChannelNarrationPolicy(storyboardData);
    const cleanStoryboardData = backfillVisualPromptNarration(
      normalizeReverseEngineeredStoryboard(repairStoryboardEncoding(enforced)),
      config
    );
    const contaminatedScenes = (
      cleanStoryboardData.visual_prompts || []
    ).filter((vp) => isVisualPromptNarration(vp?.narration_text, vp?.prompt));
    if (contaminatedScenes.length) {
      return res.status(422).json({
        error: "Storyboard bloqueado: prompt visual detectado como narração.",
        scenes: contaminatedScenes.map((vp) => vp.scene || vp.scene_ref),
        hint: "Restaure a narração usando o roteiro aprovado antes de salvar.",
      });
    }
    const auditedNarrativeText = String(
      cleanStoryboardData.narrative_script || ""
    ).trim();
    if (auditedNarrativeText) {
      const audit = cleanStoryboardData.narracao_pro_audit;
      const narrativeHash = hashNarrationIntegrityText(auditedNarrativeText);
      const hashMatches =
        audit?.narrative_sha256 && audit.narrative_sha256 === narrativeHash;
      // Soft-aprovação / revisão humana: permite salvar e continuar o fluxo.
      // Só bloqueia se não houver auditoria nenhuma E o texto não for vazio.
      if (
        !audit?.approved &&
        !audit?.soft_approval &&
        !audit?.needs_human_review
      ) {
        return res.status(422).json({
          error:
            "Storyboard bloqueado: a narração não possui auditoria NARRACAOPRO válida.",
          hint: "Gere novamente a fase de narração. Alterações no texto invalidam a aprovação anterior.",
        });
      }
      if (audit?.approved && audit?.narrative_sha256 && !hashMatches) {
        // Texto editado: re-hash e marca revisão humana em vez de descartar.
        cleanStoryboardData.narracao_pro_audit = {
          ...audit,
          narrative_sha256: narrativeHash,
          needs_human_review: true,
          user_edited: true,
          audited_at: new Date().toISOString(),
        };
      }
    }
    fs.writeFileSync(
      storyboardPath,
      JSON.stringify(cleanStoryboardData, null, 2),
      "utf8"
    );

    const visualPrompts = cleanStoryboardData.visual_prompts || [];

    // Narração nunca recebe prompt visual e tomadas repetidas não duplicam a voz.
    const narrationArtifacts = buildNarrationArtifacts(visualPrompts);
    const narrativeText = narrationArtifacts.transcript;

    fs.writeFileSync(transcriptPath, narrativeText, "utf8");

    config.block_phrases = narrationArtifacts.blockPhrases;

    // Merge storyboard assets into timeline_assets — preserve user timing edits (fixed, audio_start)

    const existingTimelineAssets = config.timeline_assets || {};
    const nextTimelineAssets = { ...existingTimelineAssets };
    const blockCounters = {};

    visualPrompts.forEach((vp) => {
      const blockNum = vp.block || 1;
      const blockKey = String(blockNum);
      if (!nextTimelineAssets[blockKey]) nextTimelineAssets[blockKey] = [];
      if (blockCounters[blockKey] === undefined) blockCounters[blockKey] = 0;
      const assetIdx = blockCounters[blockKey]++;
      const existing = (existingTimelineAssets[blockKey] || [])[assetIdx];
      const fromStoryboard = vp.asset && vp.asset.asset ? vp.asset : null;
      nextTimelineAssets[blockKey][assetIdx] = mergeTimelineSlotFromStoryboard(
        existing,
        fromStoryboard
      );
    });

    const reconciled = reconcileTimelineAssetsToStoryboard(
      nextTimelineAssets,
      visualPrompts
    );
    config.timeline_assets = reconciled.timeline;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    if (reconciled.removed > 0) {
      appendProjectEventLog(projDir, {
        component: "timeline",
        event: "storyboard_surplus_slots_blocked",
        message:
          "O save do storyboard descartou placeholders excedentes sem tocar nos timings.",
        details: { removed: reconciled.removed, blocks: reconciled.blocks },
      });
    }

    res.json({
      success: true,
      message: "Roteiro e storyboard salvos com sucesso!",
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao salvar o storyboard", details: err.message });
  }
});

// API: Limpar cache temporário do Remotion (public/projects — cópias de assets para render)
app.post("/api/render/cleanup-public-cache", (req, res) => {
  try {
    const result = purgeRemotionPublicProjectCache();
    res.json({
      ok: true,
      removed: result.removed,
      freedMb: result.freedMb,
      message:
        result.removed > 0
          ? `${result.removed} pasta(s) de cache removida(s), ~${result.freedMb} MB liberados.`
          : "Nenhum cache antigo encontrado em public/projects.",
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Falha ao limpar cache Remotion", details: err.message });
  }
});

// GET /api/render/config

app.get("/api/render/config", (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const data = ensureBrandCatalogMigrated(WORKSPACE_DIR, __dirname);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao ler configurações globais." });
  }
});

// POST /api/render/config

app.post("/api/render/config", (req, res) => {
  const configData = req.body || {};

  try {
    const existing = loadRenderConfig(__dirname);
    const merged = {
      ...existing,
      ...configData,
      studio_visual: configData.studio_visual ?? existing.studio_visual,
      studio_production:
        configData.studio_production ?? existing.studio_production,
      brandLogos: configData.brandLogos ?? existing.brandLogos,
      youtubeChannels: configData.youtubeChannels ?? existing.youtubeChannels,
      selectedLogoId: configData.selectedLogoId ?? existing.selectedLogoId,
      selectedYoutubeChannelId:
        configData.selectedYoutubeChannelId ??
        existing.selectedYoutubeChannelId,
    };
    saveRenderConfig(__dirname, merged);

    res.json({
      success: true,
      message: "Configurações globais salvas com sucesso.",
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar configurações globais." });
  }
});

// GET /api/settings/studio-defaults — Visual + Produção globais (todos os projetos)
app.get("/api/settings/studio-defaults", (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const renderConfig = loadRenderConfig(__dirname);
    const defaults = getStudioDefaultsFromRenderConfig(renderConfig);
    res.json(defaults);
  } catch (err) {
    res
      .status(500)
      .json({ error: err.message || "Erro ao ler defaults do estúdio." });
  }
});

// POST /api/settings/studio-defaults — patch visual/production (null remove chave)
app.post("/api/settings/studio-defaults", (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const { visual, production } = req.body || {};
    const existing = loadRenderConfig(__dirname);
    const merged = applyStudioDefaultsPatch(existing, { visual, production });
    saveRenderConfig(__dirname, merged);
    const saved = getStudioDefaultsFromRenderConfig(merged);
    res.json({
      success: true,
      message: "Configurações globais de Visual/Produção salvas.",
      ...saved,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: err.message || "Erro ao salvar defaults do estúdio." });
  }
});

function getGlobalApiKeysStatus() {
  const cfg = loadRenderConfig(__dirname);
  const epidemic = (
    cfg.epidemic_sound_key ||
    process.env.EPIDEMIC_SOUND_API_KEY ||
    ""
  ).trim();
  return {
    has_epidemic_key: epidemic.length > 100,
    has_pexels_key: !!(cfg.pexels_api_key || "").trim(),
    has_pixabay_key: !!(cfg.pixabay_api_key || "").trim(),
    ...getSupermemoryStatus(__dirname),
  };
}

app.get("/api/settings/global-api-keys", (req, res) => {
  try {
    res.json(getGlobalApiKeysStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/global-api-keys", (req, res) => {
  try {
    const {
      epidemic_sound_key,
      pexels_api_key,
      pixabay_api_key,
      supermemory_api_key,
      supermemory_base_url,
      supermemory_enabled,
    } = req.body || {};
    const cfg = loadRenderConfig(__dirname);
    if (typeof epidemic_sound_key === "string" && epidemic_sound_key.trim()) {
      cfg.epidemic_sound_key = epidemic_sound_key.trim();
    }
    if (typeof pexels_api_key === "string" && pexels_api_key.trim()) {
      cfg.pexels_api_key = pexels_api_key.trim();
    }
    if (typeof pixabay_api_key === "string" && pixabay_api_key.trim()) {
      cfg.pixabay_api_key = pixabay_api_key.trim();
    }
    if (typeof supermemory_api_key === "string" && supermemory_api_key.trim()) {
      cfg.supermemory_api_key = supermemory_api_key.trim();
    }
    if (
      typeof supermemory_base_url === "string" &&
      supermemory_base_url.trim()
    ) {
      cfg.supermemory_base_url = supermemory_base_url.trim().replace(/\/$/, "");
    }
    if (typeof supermemory_enabled === "boolean") {
      cfg.supermemory_enabled = supermemory_enabled;
    }
    saveRenderConfig(__dirname, cfg);
    res.json({ success: true, ...getGlobalApiKeysStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/supermemory/status", (req, res) => {
  try {
    res.json(getSupermemoryStatus(__dirname));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/supermemory/test", async (req, res) => {
  try {
    const result = await testSupermemoryConnection(__dirname);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: List background music tracks

app.get("/api/music", (req, res) => {
  const projDir = getProjectDir(req);

  try {
    const files = listBgmMusicCandidates(projDir)
      .filter((f) => /\.(mp3|wav)$/i.test(f))

      .map((f) => {
        const stats = fs.statSync(path.join(projDir, f));

        return {
          name: f,

          sizeBytes: stats.size,
        };
      });

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sfx/timeline", (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const timeline = readProjectJson(projDir, "sfx_timeline.json", {
      sfx_events: [],
    });
    res.json({
      ...timeline,
      sfx_events: (timeline.sfx_events || []).map((event) => ({
        ...event,
        exists: Boolean(findProjectFile(projDir, event.file)),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const AUDIO_TRACK_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".flac",
  ".ogg",
]);

const PROTECTED_AUDIO_FILES = new Set([
  "narracao_mestra_premium.mp3",

  "narracao_master.mp3",

  "voiceover.mp3",

  "1.mp3",

  "2.mp3",

  "3.mp3",
]);

function isDeletableBgmFile(fileName) {
  const safeName = path.basename(String(fileName || ""));

  return safeName && safeName === fileName && isBgmMusicCandidate(safeName);
}

function clearBgmReferences(projDir, removedNames) {
  const configPath = path.join(projDir, "config_qanat.json");

  const config = readJsonFile(configPath);

  if (!config) return;

  const removed = new Set(
    removedNames.map((name) => String(name).toLowerCase())
  );

  let changed = false;

  if (Array.isArray(config.bgm_mappings)) {
    const nextMappings = config.bgm_mappings.filter(
      (mapping) => !removed.has(String(mapping.file || "").toLowerCase())
    );

    changed = changed || nextMappings.length !== config.bgm_mappings.length;

    config.bgm_mappings = nextMappings;
  }

  if (
    config.single_bgm &&
    removed.has(String(config.single_bgm).toLowerCase())
  ) {
    config.single_bgm = "";

    config.use_single_bgm = false;

    changed = true;
  }

  if (changed) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  }
}

function clearAudioReferences(projDir, removedNames) {
  clearBgmReferences(projDir, removedNames);

  const sfxTimelinePath = path.join(projDir, "sfx_timeline.json");

  const sfxTimeline = readJsonFile(sfxTimelinePath);

  if (!sfxTimeline || !Array.isArray(sfxTimeline.sfx_events)) return;

  const removed = new Set(
    removedNames.map((name) => String(name).toLowerCase())
  );

  const nextEvents = sfxTimeline.sfx_events.filter(
    (event) => !removed.has(String(event.file || "").toLowerCase())
  );

  if (nextEvents.length !== sfxTimeline.sfx_events.length) {
    sfxTimeline.sfx_events = nextEvents;

    fs.writeFileSync(
      sfxTimelinePath,
      JSON.stringify(sfxTimeline, null, 2),
      "utf8"
    );
  }
}

function deleteProjectAudioFile(projDir, fileName) {
  if (!isDeletableBgmFile(fileName)) {
    const err = new Error("Arquivo de audio invalido ou protegido.");

    err.statusCode = 400;

    throw err;
  }

  const root = path.resolve(projDir);

  const targetPath = path.resolve(projDir, fileName);

  if (!targetPath.startsWith(root + path.sep)) {
    const err = new Error("Caminho invalido.");

    err.statusCode = 400;

    throw err;
  }

  if (!fs.existsSync(targetPath)) {
    const err = new Error("Arquivo de audio nao encontrado.");

    err.statusCode = 404;

    throw err;
  }

  fs.unlinkSync(targetPath);

  clearAudioReferences(projDir, [fileName]);

  return fileName;
}

// API: Delete one background music track

app.delete("/api/music/:filename", (req, res) => {
  const projDir = getProjectDir(req);

  try {
    const deleted = deleteProjectAudioFile(projDir, req.params.filename);

    res.json({ success: true, deleted: [deleted] });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post("/api/music/delete", (req, res) => {
  const projDir = getProjectDir(req);

  try {
    const deleted = deleteProjectAudioFile(projDir, req.body?.filename);

    res.json({ success: true, deleted: [deleted] });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// API: Delete all user/downloaded background music tracks from the current project

app.delete("/api/music", (req, res) => {
  const projDir = getProjectDir(req);

  try {
    const deleted = [];

    for (const fileName of fs.readdirSync(projDir)) {
      if (!isDeletableBgmFile(fileName)) continue;

      deleted.push(deleteProjectAudioFile(projDir, fileName));
    }

    res.json({ success: true, deleted });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post("/api/music/delete-all", (req, res) => {
  const projDir = getProjectDir(req);

  try {
    const deleted = [];

    for (const fileName of fs.readdirSync(projDir)) {
      if (!isDeletableBgmFile(fileName)) continue;

      deleted.push(deleteProjectAudioFile(projDir, fileName));
    }

    res.json({ success: true, deleted });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

function listProjectMusicFiles(projDir) {
  try {
    return fs
      .readdirSync(projDir)
      .filter((fileName) => /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(fileName));
  } catch (err) {
    return [];
  }
}

/** Re-costura segmentos emocionais (crossfade contínuo) e sincroniza mappings no config. */
function refreshEmotionPlanTimings(projDir) {
  const logs = [];
  const configPath = path.join(projDir, "config_qanat.json");
  const storyboardPath = path.join(projDir, "storyboard.json");
  let config = readProjectJson(projDir, "config_qanat.json", {});
  const storyboard = readProjectJson(projDir, "storyboard.json", {});
  const plan = storyboard?.bgm_emotion_plan;
  if (!plan?.segments?.length) return { config, storyboard, logs };

  const timings = readProjectJson(projDir, "block_timings.json", {
    total_duration: 0,
  });
  const total =
    Number(timings.total_duration) || Number(plan.total_duration) || 0;
  const stitched = stitchEmotionSegmentsContinuous(plan.segments, total);
  const harmonized = harmonizeEmotionSegments(
    stitched,
    config.niche || "",
    config
  );
  storyboard.bgm_emotion_plan = {
    ...plan,
    segments: harmonized,
    segment_count: harmonized.length,
    total_duration: total || plan.total_duration,
  };
  const synced = syncEmotionMappingsToPlan(
    storyboard.bgm_emotion_plan,
    config.bgm_emotion_mappings || []
  );
  if (synced.length > 0) {
    config.bgm_emotion_mappings = synced;
    config.bgm_mode = "emotion";
  }
  fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2), "utf8");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  logs.push(
    `Trilha emocional costurada: ${harmonized.length} segmento(s) com crossfade contínuo (sem silêncio).`
  );
  for (const seg of harmonized) {
    logs.push(
      `  ${seg.id} ${seg.start.toFixed(1)}–${seg.end.toFixed(1)}s (${seg.emotion}) fade ${seg.fade_in_s}/${seg.fade_out_s}s`
    );
  }
  return { config, storyboard, logs };
}

async function prepareBgmBeforeMix(projDir) {
  const logs = [];
  const configPath = path.join(projDir, "config_qanat.json");
  let config = readProjectJson(projDir, "config_qanat.json", {});
  const storyboard = readProjectJson(projDir, "storyboard.json", {});
  const timings = readProjectJson(projDir, "block_timings.json", {
    total_duration: 0,
  });
  const videoFormat = detectVideoFormat(
    config,
    Number(timings.total_duration) || 0
  );
  const bgmMode = resolveBgmMode(config, storyboard, videoFormat);
  const fileExistsInProject = (fileName) =>
    projectBgmFileExists(projDir, fileName);

  if (bgmMode !== "emotion") return logs;

  const refreshed = refreshEmotionPlanTimings(projDir);
  logs.push(...(refreshed.logs || []));
  config = refreshed.config;
  const storyboardRefreshed = refreshed.storyboard;

  const plan = storyboardRefreshed?.bgm_emotion_plan;
  const segments = plan?.segments || [];
  let mappings = Array.isArray(config.bgm_emotion_mappings)
    ? config.bgm_emotion_mappings
    : [];
  const missing = segmentsNeedingBgmDownload(
    segments,
    mappings,
    fileExistsInProject
  );

  if (segments.length === 0) {
    logs.push(
      "AVISO: Plano emocional ausente — use 'Planejar trilhas por emoção (IA)' antes de regenerar."
    );
    return logs;
  }

  if (missing.length > 0) {
    logs.push(
      `Preparando ${missing.length} segmento(s) emocional(is) sem trilha...`
    );
    try {
      const token = getEpidemicSoundKey(projDir) || "";
      const autoLogs = await runAutoSoundtrackLogic(
        projDir,
        token,
        config.aspect_ratio === "9:16" ? "SHORTS" : "LONGO",
        { force: false }
      );
      for (const line of autoLogs || []) logs.push(line);
      config = readProjectJson(projDir, "config_qanat.json", {});
      mappings = Array.isArray(config.bgm_emotion_mappings)
        ? config.bgm_emotion_mappings
        : [];
    } catch (err) {
      logs.push(`Sonoplastia automática falhou: ${err.message}`);
    }
  }

  const stillMissing = segmentsNeedingBgmDownload(
    segments,
    mappings,
    fileExistsInProject
  );
  if (stillMissing.length > 0) {
    const localMappings = buildEmotionMappingsFromLocalFiles(
      segments,
      listBgmMusicCandidates(projDir)
    );
    if (localMappings.length > 0) {
      config.bgm_emotion_mappings = localMappings;
      config.bgm_mode = "emotion";
      config.use_single_bgm = false;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      logs.push(
        `Mapeadas ${localMappings.length} trilha(s) local(is) aos segmentos emocionais.`
      );
    } else {
      logs.push(
        "AVISO: Nenhum arquivo de trilha encontrado no projeto para os segmentos emocionais."
      );
    }
  }

  return logs;
}

function validateBgmReadyForMix(projDir, config, storyboard) {
  const timings = readProjectJson(projDir, "block_timings.json", {
    total_duration: 0,
  });
  const videoFormat = detectVideoFormat(
    config,
    Number(timings.total_duration) || 0
  );
  const bgmMode = resolveBgmMode(config, storyboard, videoFormat);
  const fileExistsInProject = (fileName) =>
    projectBgmFileExists(projDir, fileName);

  if (bgmMode === "emotion") {
    const segments = storyboard?.bgm_emotion_plan?.segments || [];
    const mappings = Array.isArray(config.bgm_emotion_mappings)
      ? config.bgm_emotion_mappings
      : [];
    const missing = segmentsNeedingBgmDownload(
      segments,
      mappings,
      fileExistsInProject
    );
    if (!segments.length) {
      return "Planeje as trilhas por emoção (IA) antes de regenerar, ou selecione arquivos em cada segmento.";
    }
    if (missing.length === segments.length) {
      return "Nenhuma trilha mapeada para os segmentos emocionais. Use Sonoplastia IA, selecione arquivos manualmente ou adicione músicas ao projeto.";
    }
    return null;
  }

  if (bgmMode === "single") {
    const singleBgm = String(config.single_bgm || "").trim();
    if (!singleBgm || !fileExistsInProject(singleBgm)) {
      const candidates = listBgmMusicCandidates(projDir);
      if (candidates.length === 0) {
        return "Nenhuma música de fundo no projeto. Use Epidemic Sound ou «Add Música» — arquivos 1.mp3, 4.mp3 etc. são narração, não trilha.";
      }
      return `Selecione uma música no dropdown «Selecione a Trilha» (${candidates.length} disponível(is)). Não use arquivos numerados (4.mp3…) — são trechos da voz.`;
    }
    if (!isBgmMusicCandidate(singleBgm)) {
      return `"${singleBgm}" é narração ou áudio interno, não trilha de fundo. Escolha uma música BGM (ex.: ES_…mp3) no dropdown.`;
    }
    return null;
  }

  const blockNumbers = collectProjectBlockNumbers(config, storyboard, timings);
  const missingBlocks = blocksNeedingBgmDownload(
    blockNumbers,
    config.bgm_mappings || [],
    fileExistsInProject
  );
  if (missingBlocks.length === blockNumbers.length) {
    return "Nenhuma trilha mapeada por bloco. Selecione arquivos ou use Sonoplastia IA.";
  }
  return null;
}

// API: Mix soundtrack (runs mix_bgm.py)

app.post(
  "/api/music/mix",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);

    ensureFileExists("mix_bgm.py", projDir);

    const scriptPath = path.join(projDir, "mix_bgm.py");

    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ error: "mix_bgm.py não encontrado" });
    }

    try {
      const prepLogs = await prepareBgmBeforeMix(projDir);
      const config = readProjectJson(projDir, "config_qanat.json", {});
      const storyboard = readProjectJson(projDir, "storyboard.json", {});
      const validationError = validateBgmReadyForMix(
        projDir,
        config,
        storyboard
      );
      if (validationError) {
        return res.status(400).json({
          error: validationError,
          prepLogs,
        });
      }

      const child = spawn(PYTHON_PATH, ["mix_bgm.py"], {
        cwd: projDir,

        shell: true,

        env: buildPythonSpawnEnv(),
      });

      let stdout = "";

      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          res.json({ success: true, log: stdout, prepLogs });
        } else {
          res.status(500).json({
            error: "Erro na mixagem da trilha",
            log: stdout,
            details: stderr,
            prepLogs,
          });
        }
      });
    } catch (err) {
      res.status(500).json({
        error: err.message || "Falha ao preparar mixagem",
        details: err.message,
      });
    }
  })
);

// API: Search music/SFX on Epidemic Sound MCP

app.get(
  "/api/epidemic/search",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);

    const token = getEpidemicSoundKey(projDir) || "";

    const { query, type } = req.query;

    if (!query) {
      return res
        .status(400)
        .json({ error: "O termo de busca (query) é obrigatório." });
    }

    try {
      if (type === "sfx") {
        const results = await searchSoundEffects(token, query);

        res.json(results);
      } else {
        const results = await searchMusic(token, query);

        res.json(results);
      }
    } catch (err) {
      res.status(500).json({
        error: "Erro ao buscar na Epidemic Sound",
        details: err.message,
      });
    }
  })
);

// API: Download track/SFX and auto-map

app.post(
  "/api/epidemic/download",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);

    const token = getEpidemicSoundKey(projDir) || "";

    const { id, type, title, block, previewUrl } = req.body;

    if (!id || !type) {
      return res
        .status(400)
        .json({ error: "Parâmetros 'id' e 'type' são obrigatórios." });
    }

    try {
      const safeTitle = (title || `audio_${id}`).replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

      if (type === "sfx") {
        // Save SFX directly to project ASSETS folder

        const assetsDir = path.join(projDir, "ASSETS");

        fs.mkdirSync(assetsDir, { recursive: true });

        const filename = `sfx_${safeTitle}.mp3`;

        const destPath = path.join(assetsDir, filename);

        await downloadSoundEffect(token, id, destPath, previewUrl);

        res.json({
          success: true,
          filename,
          type: "sfx",
          message: `Efeito sonoro baixado e salvo em ASSETS/${filename}`,
        });
      } else {
        // Save BGM directly to project folder

        const filename = `ES_${safeTitle}.mp3`;

        const destPath = path.join(projDir, filename);

        await downloadMusicTrack(token, id, destPath, previewUrl);

        // Auto-map BGM based on block

        const configPath = path.join(projDir, "config_qanat.json");

        let config = readJsonFile(configPath) || {};

        if (block !== undefined && block > 0) {
          // Map BGM to specific block

          if (!Array.isArray(config.bgm_mappings)) {
            config.bgm_mappings = [];
          }

          // Remove existing mapping for this block if any

          config.bgm_mappings = config.bgm_mappings.filter(
            (item) => Number(item.block) !== Number(block)
          );

          config.bgm_mappings.push({
            block: Number(block),

            file: filename,
          });

          config.bgm_mappings.sort((a, b) => a.block - b.block);

          config.use_single_bgm = false;

          console.log(
            `[Epidemic MCP] Auto-mapped BGM ${filename} to block ${block}`
          );
        } else {
          // Map BGM as single BGM

          config.single_bgm = filename;

          config.use_single_bgm = true;

          console.log(
            `[Epidemic MCP] Auto-mapped BGM ${filename} as single soundtrack`
          );
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

        res.json({
          success: true,

          filename,

          type: "bgm",

          message: `Música baixada e mapeada com sucesso: ${filename}`,
        });
      }
    } catch (err) {
      res.status(500).json({
        error: "Erro ao baixar arquivo da Epidemic Sound",
        details: err.message,
      });
    }
  })
);

// Helper: Translate Portuguese query terms to English and sanitize for Epidemic Sound search

function translateOrCleanQuery(query) {
  if (!query) return "cinematic mystery";

  let q = query.toLowerCase();

  const translations = {
    misterioso: "mysterious",

    misteriosa: "mysterious",

    mistério: "mystery",

    misterio: "mystery",

    tensão: "tension",

    tensao: "tension",

    triste: "sad",

    tristeza: "sadness",

    alegre: "happy",

    feliz: "happy",

    épico: "epic",

    epico: "epic",

    épica: "epic",

    epica: "epic",

    ação: "action",

    acao: "action",

    documentário: "documentary",

    documentario: "documentary",

    sombrio: "dark",

    sombria: "dark",

    escuro: "dark",

    leve: "light",

    suave: "soft",

    rápido: "fast",

    rapido: "fast",

    lento: "slow",

    percussão: "percussion",

    percussao: "percussion",

    bateria: "drums",

    cordas: "strings",

    piano: "piano",

    flauta: "flute",

    suspeito: "suspense",

    suspense: "suspense",

    dramático: "dramatic",

    dramatico: "dramatic",

    dramática: "dramatic",

    dramatica: "dramatic",

    urgente: "urgent",

    urgência: "urgent",

    urgencia: "urgent",

    clímax: "climax",

    climax: "climax",

    final: "ending",

    fechamento: "outro",

    abertura: "intro",

    introdução: "intro",

    introducao: "intro",

    crescente: "building",

    esferas: "spheres",

    bronze: "bronze",

    vento: "wind",

    deserto: "desert",

    areias: "sand",

    antigo: "ancient",

    antiga: "ancient",
  };

  for (const [pt, en] of Object.entries(translations)) {
    const regex = new RegExp(`\\b${pt}\\b`, "g");

    q = q.replace(regex, en);
  }

  q = q.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");

  q = q.replace(/\s+/g, " ").trim();

  return q;
}

function normalizeAudioChoiceKey(value) {
  return String(value || "")
    .toLowerCase()

    .replace(/^es_/, "")

    .replace(/\.(mp3|wav|m4a|aac|flac|ogg)$/i, "")

    .replace(/[^a-z0-9]+/g, " ")

    .trim();
}

function makeEpidemicFilename(title) {
  return `ES_${String(title || "track").replace(/[^a-zA-Z0-9_-]/g, "_")}.mp3`;
}

/** Resolve BGM for Remotion when config.bgm_mappings is empty but audio files exist on disk. */
function resolveBgmMappingsForRender(
  projectDir,
  config,
  blockNumbers,
  storyboard = {}
) {
  if (
    config?.use_single_bgm &&
    config?.single_bgm &&
    findProjectFileLocal(projectDir, config.single_bgm)
  ) {
    return {
      mode: "single",
      single_bgm: config.single_bgm,
      mappings: [],
      source: "config_single",
    };
  }

  const timings = readProjectJson(projectDir, "block_timings.json", {
    total_duration: 0,
  });
  const videoFormat = detectVideoFormat(
    config,
    Number(timings.total_duration) || 0
  );
  const bgmMode = resolveBgmMode(config, storyboard, videoFormat);

  if (bgmMode === "emotion") {
    const fileExistsLocal = (fileName) =>
      projectBgmFileExists(projectDir, fileName);
    let emotionMappings = Array.isArray(config?.bgm_emotion_mappings)
      ? config.bgm_emotion_mappings.filter(
          (m) => m?.file && fileExistsLocal(m.file)
        )
      : [];

    if (emotionMappings.length === 0) {
      const segments = storyboard?.bgm_emotion_plan?.segments || [];
      const built = buildEmotionMappingsFromLocalFiles(
        segments,
        listBgmMusicCandidates(projectDir)
      ).filter((m) => m?.file && fileExistsLocal(m.file));
      if (built.length > 0) {
        emotionMappings = built;
        console.log(
          `[Remotion BGM] Emoção: ${built.length} trilha(s) resolvidas a partir de arquivos locais.`
        );
      }
    }

    if (emotionMappings.length > 0) {
      return {
        mode: "emotion",
        mappings: emotionMappings,
        source: "emotion_mappings",
      };
    }

    console.warn(
      "[Remotion BGM] Modo emoção ativo mas sem trilhas válidas — não usar fallback 1.mp3/trilha_documentario."
    );
    return { mode: "none", mappings: [], source: "emotion_unmapped" };
  }

  if (bgmMode === "block") {
    // fall through to block resolution below
  }

  const configured = Array.isArray(config?.bgm_mappings)
    ? config.bgm_mappings.filter(
        (mapping) =>
          mapping?.file && findProjectFileLocal(projectDir, mapping.file)
      )
    : [];

  if (configured.length > 0) {
    return { mode: "blocks", mappings: configured, source: "config_mappings" };
  }

  const numberedMappings = [];
  for (const block of blockNumbers) {
    const numberedFile = `${block}.mp3`;
    if (findProjectFileLocal(projectDir, numberedFile)) {
      numberedMappings.push({ block, file: numberedFile });
    }
  }
  if (numberedMappings.length > 0) {
    console.log(
      `[Remotion BGM] Auto-mapeadas ${numberedMappings.length} trilhas numeradas (N.mp3) por bloco.`
    );
    return {
      mode: "blocks",
      mappings: numberedMappings,
      source: "numbered_files",
    };
  }

  const esFiles = listBgmMusicCandidates(projectDir)
    .filter((fileName) => /^ES_.*\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(fileName))
    .sort();

  if (esFiles.length > 0 && blockNumbers.length > 0) {
    const distributed = blockNumbers.map((block, index) => ({
      block,
      file: esFiles[Math.min(index, esFiles.length - 1)],
    }));
    console.log(
      `[Remotion BGM] Auto-distribuídas ${esFiles.length} faixas ES_* em ${blockNumbers.length} blocos.`
    );
    return { mode: "blocks", mappings: distributed, source: "es_files" };
  }

  if (findProjectFileLocal(projectDir, "trilha_documentario.mp3")) {
    console.log(
      "[Remotion BGM] Usando trilha_documentario.mp3 como trilha única (mix_bgm.py)."
    );
    return {
      mode: "single",
      single_bgm: "trilha_documentario.mp3",
      mappings: [],
      source: "mixed_master",
    };
  }

  console.warn(
    "[Remotion BGM] Nenhuma trilha encontrada — render sairá sem BGM."
  );
  return { mode: "none", mappings: [], source: "none" };
}

function collectExistingAutoBgmKeys(projDir, config) {
  const keys = new Set();

  try {
    for (const fileName of fs.readdirSync(projDir)) {
      if (/^ES_.*\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(fileName)) {
        keys.add(normalizeAudioChoiceKey(fileName));
      }
    }
  } catch (err) {}

  if (config?.single_bgm) {
    keys.add(normalizeAudioChoiceKey(config.single_bgm));
  }

  if (Array.isArray(config?.bgm_mappings)) {
    for (const mapping of config.bgm_mappings) {
      if (mapping?.file) keys.add(normalizeAudioChoiceKey(mapping.file));
    }
  }

  if (Array.isArray(config?.bgm_emotion_mappings)) {
    for (const mapping of config.bgm_emotion_mappings) {
      if (mapping?.file) keys.add(normalizeAudioChoiceKey(mapping.file));
    }
  }

  return keys;
}

function deleteGeneratedBgmCycleFiles(projDir) {
  const deleted = [];

  try {
    for (const fileName of fs.readdirSync(projDir)) {
      const isGeneratedBgm =
        /^ES_.*\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(fileName) ||
        fileName === "trilha_documentario.mp3";

      if (!isGeneratedBgm) continue;

      const targetPath = path.resolve(projDir, fileName);

      if (!targetPath.startsWith(path.resolve(projDir) + path.sep)) continue;

      fs.unlinkSync(targetPath);

      deleted.push(fileName);
    }
  } catch (err) {}

  return deleted;
}

function pickFreshTrack(tracks, usedKeys, excludedKeys, block) {
  const candidates = (tracks || []).filter((track) => {
    const titleKey = normalizeAudioChoiceKey(track.title);

    const fileKey = normalizeAudioChoiceKey(makeEpidemicFilename(track.title));

    const idKey = String(track.id || "").toLowerCase();

    return (
      titleKey &&
      !usedKeys.has(titleKey) &&
      !usedKeys.has(fileKey) &&
      !usedKeys.has(idKey) &&
      !excludedKeys.has(titleKey) &&
      !excludedKeys.has(fileKey) &&
      !excludedKeys.has(idKey)
    );
  });

  if (candidates.length === 0) return null;

  // Do not always take position 0; the Epidemic API often returns the same safe top results.

  const rotatedIndex = Math.min(
    candidates.length - 1,
    Math.abs(Number(block) || 1) % Math.min(candidates.length, 4)
  );

  return candidates[rotatedIndex];
}

// Helper: Run automated soundtrack selection and download logic

async function runAutoSoundtrackLogic(projDir, token, mode, options = {}) {
  const { force = false } = options;
  const fileExistsInProject = (fileName) =>
    projectBgmFileExists(projDir, fileName);

  const bgmSuggestionsPath = path.join(projDir, "storyboard.json");

  const configPath = path.join(projDir, "config_qanat.json");

  let config = readJsonFile(configPath) || {};

  const logs = [];

  if (force) {
    logs.push(
      "Sonoplastia forçada: ignorando trilhas de outros projetos e baixando novas faixas."
    );
    const removed = deleteGeneratedBgmCycleFiles(projDir);
    if (removed.length > 0) {
      logs.push(
        `Removidas ${removed.length} BGM antiga(s) deste projeto antes do novo ciclo.`
      );
    }
    config.bgm_mappings = [];
    config.bgm_emotion_mappings = [];
    config.use_single_bgm = false;
    config.single_bgm = "";
  } else {
    if (Array.isArray(config.bgm_mappings)) {
      const before = config.bgm_mappings.length;
      config.bgm_mappings = config.bgm_mappings.filter(
        (m) => m?.file && fileExistsInProject(m.file)
      );
      const pruned = before - config.bgm_mappings.length;
      if (pruned > 0) {
        logs.push(
          `Removidos ${pruned} mapeamento(s) de bloco sem arquivo neste projeto.`
        );
      }
    }
    if (Array.isArray(config.bgm_emotion_mappings)) {
      const before = config.bgm_emotion_mappings.length;
      config.bgm_emotion_mappings = config.bgm_emotion_mappings.filter(
        (m) => m?.file && fileExistsInProject(m.file)
      );
      const pruned = before - config.bgm_emotion_mappings.length;
      if (pruned > 0) {
        logs.push(
          `Removidos ${pruned} mapeamento(s) emocionais sem arquivo neste projeto.`
        );
      }
    }
    if (config.single_bgm && !fileExistsInProject(config.single_bgm)) {
      config.single_bgm = "";
      config.use_single_bgm = false;
      logs.push(
        "Trilha única anterior não existe neste projeto — será buscada novamente."
      );
    }
  }

  if (!fs.existsSync(bgmSuggestionsPath)) {
    logs.push(
      "storyboard.json ausente. Download automatico de BGM ignorado para evitar trilha generica fora de contexto."
    );

    return logs;
  }

  const storyboard = JSON.parse(fs.readFileSync(bgmSuggestionsPath, "utf8"));

  const previousAutoBgmKeys = force
    ? new Set()
    : collectExistingAutoBgmKeys(projDir, config);

  const timings = readProjectJson(projDir, "block_timings.json", {
    starts: [],
    durations: [],
  });
  const totalDuration =
    Number(timings.total_duration) ||
    (timings.durations || []).reduce(
      (max, d, i) =>
        Math.max(max, (Number(timings.starts?.[i]) || 0) + Number(d)),
      0
    );
  const videoFormat =
    mode === "SHORTS" ? "SHORT" : detectVideoFormat(config, totalDuration);
  const bgmMode = resolveBgmMode(config, storyboard, videoFormat);

  if (bgmMode === "single") {
    let rawSearchTheme =
      storyboard.strategy?.search_theme ||
      storyboard.strategy?.bgm_search_theme ||
      storyboard.bgm_recommendations?.[0]?.search_theme ||
      "";

    if (!String(rawSearchTheme).trim()) {
      const mood = getEpidemicMoodForNiche(config.niche, config, storyboard);
      rawSearchTheme = mood.bgm;
      logs.push(
        `Tema BGM inferido pelo nicho (${mood.label}): "${rawSearchTheme}"`
      );
    }

    const searchTheme = translateOrCleanQuery(rawSearchTheme);

    logs.push(
      `Buscando trilha única para o tema: "${searchTheme}" (original: "${rawSearchTheme}")...`
    );

    try {
      const removed = deleteGeneratedBgmCycleFiles(projDir);

      if (removed.length > 0) {
        logs.push(
          `Removendo ${removed.length} BGM automáticas antigas antes de escolher uma nova trilha.`
        );
      }

      let tracks = await searchMusic(token, searchTheme);

      const track = pickFreshTrack(tracks, new Set(), previousAutoBgmKeys, 1);

      if (track) {
        const filename = makeEpidemicFilename(track.title);

        const destPath = path.join(projDir, filename);

        logs.push(`Baixando faixa: "${track.title}"...`);

        await downloadMusicTrack(token, track.id, destPath, track.previewUrl);

        config.single_bgm = filename;

        config.use_single_bgm = true;

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

        logs.push(`Sucesso! Trilha única mapeada: ${filename}`);
      } else {
        logs.push(`Nenhuma música encontrada para o tema "${searchTheme}".`);
      }
    } catch (err) {
      logs.push(`Erro ao buscar/baixar trilha única: ${err.message}`);

      throw err;
    }

    return logs;
  }

  const wordTranscripts = readProjectJson(projDir, "word_transcripts.json", []);
  const blockNumbers = collectProjectBlockNumbers(config, storyboard, timings);
  const blockRanges = buildProjectBlockRanges(blockNumbers, timings);
  const nicheMood = getEpidemicMoodForNiche(config.niche, config, storyboard);

  if (bgmMode === "emotion") {
    config.bgm_mode = "emotion";
    config.use_single_bgm = false;
    config.single_bgm = "";
    if (!Array.isArray(config.bgm_emotion_mappings))
      config.bgm_emotion_mappings = [];
    if (force) {
      config.bgm_emotion_mappings = [];
      logs.push(
        "Novo plano emocional: seleção anterior liberada para substituição automática."
      );
    }

    let plan = storyboard.bgm_emotion_plan;
    if (!plan?.segments?.length) {
      const sceneMaps = buildSceneTimingMaps(
        null,
        storyboard,
        timings.starts || [],
        timings.durations || []
      );
      plan = buildBgmEmotionPlan({
        config,
        storyboard,
        blockRanges,
        wordTranscripts,
        totalDuration,
        nicheMood,
      });
      storyboard.bgm_emotion_plan = plan;
      logs.push(
        `Plano emocional heurístico: ${plan.segments.length} segmento(s).`
      );
    }

    const segmentsToFill = segmentsNeedingBgmDownload(
      plan.segments,
      config.bgm_emotion_mappings,
      fileExistsInProject
    );

    if (segmentsToFill.length === 0) {
      logs.push("Todos os segmentos emocionais já possuem trilha no disco.");
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      fs.writeFileSync(
        bgmSuggestionsPath,
        JSON.stringify(storyboard, null, 2),
        "utf8"
      );
      return logs;
    }

    if (segmentsToFill.length === plan.segments.length) {
      const removed = deleteGeneratedBgmCycleFiles(projDir);
      if (removed.length > 0) {
        logs.push(
          `Removendo ${removed.length} BGM antigas antes do plano emocional.`
        );
      }
      config.bgm_emotion_mappings = [];
    }

    for (const line of formatEmotionPlanLog(plan)) logs.push(line);

    const usedTracks = new Set();

    for (const seg of segmentsToFill) {
      const searchTheme = translateOrCleanQuery(
        seg.search_theme || nicheMood?.bgm || "cinematic documentary"
      );
      logs.push(
        `[${seg.id}] ${seg.emotion} ${seg.start.toFixed(1)}–${seg.end.toFixed(1)}s → "${searchTheme}"`
      );

      try {
        const tracks = await searchMusic(token, searchTheme);
        const track = pickFreshTrack(
          tracks,
          usedTracks,
          previousAutoBgmKeys,
          seg.id
        );
        if (track) {
          usedTracks.add(String(track.id || "").toLowerCase());
          usedTracks.add(normalizeAudioChoiceKey(track.title));
          const filename = makeEpidemicFilename(track.title);
          const destPath = path.join(projDir, filename);
          logs.push(`[${seg.id}] Baixando: "${track.title}" → ${filename}`);
          await downloadMusicTrack(token, track.id, destPath, track.previewUrl);

          config.bgm_emotion_mappings = config.bgm_emotion_mappings.filter(
            (m) => m.segment_id !== seg.id
          );
          config.bgm_emotion_mappings.push({
            segment_id: seg.id,
            file: filename,
            start: seg.start,
            duration: seg.end - seg.start,
            emotion: seg.emotion,
            climax_mode: seg.climax_mode,
            duck_strength: seg.duck_strength,
            search_theme: seg.search_theme,
          });
          logs.push(
            `[${seg.id}] Mapeada: ${filename} (entrada ${seg.climax_mode})`
          );
        } else {
          logs.push(`[${seg.id}] Nenhuma música para "${searchTheme}".`);
        }
      } catch (e) {
        logs.push(`[${seg.id}] Erro: ${e.message}`);
      }
    }

    config.bgm_emotion_mappings.sort(
      (a, b) => Number(a.start) - Number(b.start)
    );
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    fs.writeFileSync(
      bgmSuggestionsPath,
      JSON.stringify(storyboard, null, 2),
      "utf8"
    );
    logs.push(
      `Sonoplastia emocional: ${config.bgm_emotion_mappings.length} segmento(s) com trilha.`
    );
    return logs;
  }

  const sonoplastiaPlan = buildBlockSonoplastiaPlan({
    config,
    storyboard,
    blockNumbers,
    blockRanges,
    wordTranscripts,
    nicheMood,
  });

  const suggestions = Array.isArray(storyboard.bgm_recommendations)
    ? storyboard.bgm_recommendations
    : [];
  if (!Array.isArray(config.bgm_mappings)) config.bgm_mappings = [];

  const blocksToFill = blocksNeedingBgmDownload(
    blockNumbers,
    config.bgm_mappings,
    fileExistsInProject
  );

  if (blocksToFill.length === 0) {
    logs.push("Todos os blocos já possuem trilha mapeada no disco.");
    return logs;
  }

  const suggestionByBlock = new Map();
  for (const [sugIndex, sug] of suggestions.entries()) {
    const block = Number(sug.block || sug.bloco || 0) || sugIndex + 1;
    suggestionByBlock.set(block, sug);
  }

  const fullSonoplastiaRun =
    suggestions.length === 0 ||
    suggestions.every(
      (sug) => !String(sug?.search_theme || sug?.searchTheme || "").trim()
    );

  if (fullSonoplastiaRun) {
    logs.push(
      `Sonoplastia IA: baixando ${blocksToFill.length} trilha(s) por mood da narração...`
    );
    for (const line of formatSonoplastiaLog(sonoplastiaPlan)) logs.push(line);
  } else {
    logs.push(
      `Processando ${blocksToFill.length} bloco(s) com tema Epidemic + sonoplastia...`
    );
  }

  if (fullSonoplastiaRun && blocksToFill.length === blockNumbers.length) {
    const removed = deleteGeneratedBgmCycleFiles(projDir);
    if (removed.length > 0) {
      logs.push(
        `Removendo ${removed.length} BGM automáticas antigas antes de escolher novas trilhas.`
      );
    }
    config.bgm_mappings = [];
  }

  config.use_single_bgm = false;
  config.single_bgm = "";

  const usedTracks = new Set();
  if (!Array.isArray(storyboard.bgm_recommendations))
    storyboard.bgm_recommendations = [];

  for (const block of blocksToFill) {
    const sug = suggestionByBlock.get(block) || null;
    const planEntry = sonoplastiaPlan.get(block);
    const rawSearchTheme = resolveBlockSearchTheme(
      block,
      sonoplastiaPlan,
      sug,
      nicheMood
    );
    const searchTheme = translateOrCleanQuery(rawSearchTheme);

    logs.push(
      `[Bloco ${block}] mood=${planEntry?.mood || "neutral"} pace=${planEntry?.pace || "normal"}` +
        ` → busca Epidemic: "${searchTheme}"`
    );

    try {
      const tracks = await searchMusic(token, searchTheme);
      const track = pickFreshTrack(
        tracks,
        usedTracks,
        previousAutoBgmKeys,
        block
      );

      if (track) {
        usedTracks.add(String(track.id || "").toLowerCase());
        usedTracks.add(normalizeAudioChoiceKey(track.title));
        usedTracks.add(
          normalizeAudioChoiceKey(makeEpidemicFilename(track.title))
        );

        const filename = makeEpidemicFilename(track.title);
        const destPath = path.join(projDir, filename);

        logs.push(`[Bloco ${block}] Baixando: "${track.title}" → ${filename}`);

        await downloadMusicTrack(token, track.id, destPath, track.previewUrl);

        config.bgm_mappings = config.bgm_mappings.filter(
          (item) => Number(item.block) !== block
        );
        config.bgm_mappings.push({
          block,
          file: filename,
          mood: planEntry?.mood,
          climaxMode: planEntry?.climaxMode,
          search_theme: rawSearchTheme,
        });

        const recIdx = storyboard.bgm_recommendations.findIndex(
          (r) => Number(r?.block) === block
        );
        const recPayload = {
          block,
          scope: "block",
          recommendation: planEntry?.phrasePreview || sug?.recommendation || "",
          search_theme: rawSearchTheme,
          mood: planEntry?.mood,
          climaxMode: planEntry?.climaxMode,
        };
        if (recIdx >= 0)
          storyboard.bgm_recommendations[recIdx] = {
            ...storyboard.bgm_recommendations[recIdx],
            ...recPayload,
          };
        else storyboard.bgm_recommendations.push(recPayload);

        logs.push(
          `[Bloco ${block}] Mapeada: ${filename} (entrada ${planEntry?.climaxMode || "peak"})`
        );
      } else {
        logs.push(
          `[Bloco ${block}] Nenhuma música encontrada para "${searchTheme}".`
        );
      }
    } catch (e) {
      logs.push(`[Bloco ${block}] Erro: ${e.message}`);
    }
  }

  config.bgm_mappings.sort((a, b) => a.block - b.block);
  storyboard.bgm_recommendations.sort(
    (a, b) => Number(a.block) - Number(b.block)
  );

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  fs.writeFileSync(
    bgmSuggestionsPath,
    JSON.stringify(storyboard, null, 2),
    "utf8"
  );

  logs.push(
    `Sonoplastia concluída: ${config.bgm_mappings.length} bloco(s) com trilha.`
  );

  return logs;
}

// API: Auto-soundtrack project blocks using AI recommendations search themes

app.post(
  "/api/epidemic/auto-soundtrack",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);

    const token = getEpidemicSoundKey(projDir) || "";

    try {
      const { mode, force } = req.body;

      const logs = await runAutoSoundtrackLogic(projDir, token, mode, {
        force: force !== false,
      });

      res.json({ success: true, logs });
    } catch (err) {
      res.status(500).json({
        error: "Erro no processo de automação de trilha",
        details: err.message,
      });
    }
  })
);

// Design profissional de SFX: contexto -> decisão editorial -> busca -> validação -> download.
app.post("/api/ai/plan-sfx", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const config = readProjectJson(projDir, "config_qanat.json", {});
    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    const timings = readProjectJson(projDir, "block_timings.json", {});
    const totalDuration = Number(timings.total_duration) || 60;
    const isShort = config.aspect_ratio === "9:16" || totalDuration <= 90;
    const maxEvents = isShort
      ? Math.min(7, Math.max(3, Math.ceil(totalDuration / 14)))
      : Math.min(16, Math.max(4, Math.ceil(totalDuration / 55)));
    const wordTranscripts = readProjectJson(
      projDir,
      "word_transcripts.json",
      []
    );
    const scenes = buildProfessionalSfxScenes(storyboard.visual_prompts, {
      timelineAssets: config.timeline_assets || {},
      narrationChunkPlan: storyboard.narration_chunk_plan || {},
      wordTranscripts,
      blockTimings: timings,
    });
    const imageScenes = scenes.filter((scene) =>
      isImageMediaForSfx(scene.media_type, scene.asset)
    );
    const videoSceneCount = scenes.length - imageScenes.length;
    const prompt = `Você é um sound designer sênior de documentários e YouTube. Antes de sugerir um som, faça spotting: identifique o gesto visual audível, o frame de sincronismo e se o silêncio é mais forte.
Crie no máximo ${maxEvents} eventos SFX para um vídeo ${isShort ? "Short 9:16" : "longo 16:9"} de ${totalDuration.toFixed(1)}s.
REGRA CRÍTICA DE MÍDIA: a trilha SFX (Epidemic/overlay) só existe para cenas IMAGE (foto/still). NUNCA invente evento SFX para cenas VIDEO — o áudio diegético (ambiente, impacto, textura) já deve vir do próprio vídeo gerado por IA. Há ${imageScenes.length} cena(s) IMAGE elegíveis e ${videoSceneCount} VIDEO (ignorar para SFX).
Use efeitos somente quando reforçarem uma ação realmente visível em IMAGE, uma virada narrativa que tenha espaço sonoro ou um ambiente reconhecível. Não sonorize cada corte, texto, card ou overlay. Não use sons literais se a cena apenas menciona algo sem mostrá-lo. Em cenas com narração densa, prefira silêncio ou ambiente quase subliminar.
Retorne JSON {"events":[{"scene_ref":"1.2","offset":1.4,"anchor_position":0.35,"duration":1.2,"action_duration":2.8,"category":"transition|impact|detail|ambience|riser","sync_mode":"onset|peak|bed","pre_roll":0.18,"repeat_mode":"none|pulse|loop","repeat_interval":1.0,"repeat_count":2,"query_en":"specific physical source + material + movement, in English","intent":"por que este som pertence à cena","sync_anchor":"objeto/gesto visual e quadro exato","visual_evidence":"o que está realmente visível nos quadros anexados e em qual momento","perspective":"close|medium|wide","volume":0.12,"fade_in":0.008,"fade_out":0.35,"confidence":0.82}]}.
Regras: volume linear discreto: ambience 0.035-0.09, detail 0.05-0.13, transition 0.06-0.15, riser 0.05-0.13, impact 0.08-0.18; ambience 2-8s, demais 0.25-3.5s; confidence >=0.68; distância mínima ${isShort ? 2.5 : 5}s; sem sobreposição salvo ambience. A query_en deve descrever a fonte física e o gesto, nunca apenas "cinematic sound".
REGRA DE SINCRONIA PRIORITARIA: offset é medido depois do início da cena e representa o frame-âncora. Hard effects (detail/impact) usam sync_mode=onset e atacam exatamente nesse frame, sem fade que apague o transiente. Transition usa sync_mode=peak, começa 0.08-0.35s antes via pre_roll e atinge o pico quando o elemento se move/aparece. Riser termina na virada visual. Preserve a cauda natural de impactos; não corte o som junto com a cena. Só use repeat_mode=pulse em detalhes de ação realmente contínua, no máximo 3 pulsos com volume decrescente. Impact, riser e transition nunca repetem. Ambience pode usar loop suave.\nCENAS IMAGE (únicas elegíveis para SFX):\n${JSON.stringify(imageScenes)}`;
    const multimodal =
      getAiProvider(projDir) === "gemini"
        ? buildProfessionalSfxMultimodalRequest({
            prompt,
            scenes: imageScenes,
            resolveAsset: (asset) => findProjectFile(projDir, asset),
            ffmpegBinary: getFfmpegStatus().binary || "ffmpeg",
          })
        : { bodyOverride: null, verifiedSceneRefs: new Set() };
    const responseText = await callGeminiLlm(req, res, projDir, {
      title: "Design profissional de SFX",
      prompt,
      bodyOverride: multimodal.bodyOverride,
      temperature: 0.2,
    });
    if (responseText == null) return;
    const parsed = await parseAiJsonResponse(
      responseText,
      extractBrowserResponse(req.body) ? null : getApiKey(projDir),
      "Plano SFX"
    );
    const raw = (Array.isArray(parsed?.events) ? parsed.events : []).map(
      (event) => ({
        ...event,
        visual_asset_verified: multimodal.verifiedSceneRefs.has(
          String(event?.scene_ref || "")
        ),
      })
    );
    const planned = normalizeProfessionalSfxEvents({
      rawEvents: raw,
      scenes,
      totalDuration,
      isShort,
      maxEvents,
    });

    const token = getEpidemicSoundKey(projDir) || "";
    const assetsDir = path.join(projDir, "ASSETS");
    fs.mkdirSync(assetsDir, { recursive: true });
    const events = [];
    const logs = [];
    for (const [index, item] of planned.entries()) {
      try {
        const results = await searchSoundEffects(
          token,
          String(item.query_en || item.category)
        );
        const ranked = rankProfessionalSfxCandidates(results, item);
        const chosen = ranked[0];
        if (!chosen?.id || !chosen?.previewUrl) {
          logs.push(
            `[${item.scene_ref}] busca rejeitada por incompatibilidade sonora: "${item.query_en}"`
          );
          continue;
        }
        const safe = String(chosen.title || item.category)
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .slice(0, 55);
        const filename = `sfx_ai_${String(index + 1).padStart(2, "0")}_${safe}.mp3`;
        const downloadedPath = path.join(assetsDir, filename);
        await downloadSoundEffect(
          token,
          chosen.id,
          downloadedPath,
          chosen.previewUrl
        );
        const sourceDuration = await probeAudioDuration(downloadedPath);
        events.push({
          ...item,
          file: `ASSETS/${filename}`,
          provider_id: chosen.id,
          provider_title: chosen.title,
          provider_match_score: chosen.professional_match_score,
          provider_match: chosen.professional_match,
          source_duration: Number(sourceDuration.toFixed(3)),
          verified_query_match: true,
          source: "epidemic-sound",
        });
        logs.push(
          `[${item.scene_ref}] ${chosen.title} @ ${item.time}s vol=${item.volume}`
        );
      } catch (error) {
        logs.push(`[${item.scene_ref}] erro: ${error.message}`);
      }
    }
    const timeline = {
      version: 2,
      generated_by: "ai-professional-sound-design",
      generated_at: new Date().toISOString(),
      format: isShort ? "SHORT" : "LONG",
      sfx_events: events,
    };
    fs.writeFileSync(
      path.join(projDir, "sfx_timeline.json"),
      JSON.stringify(timeline, null, 2),
      "utf8"
    );
    appendProjectEventLog(projDir, {
      component: "sfx",
      event: "professional_sfx_timeline_created",
      message: `${events.length} evento(s) SFX posicionados pela timeline visual.`,
      details: {
        total_duration: totalDuration,
        scenes: scenes.map((scene) => ({
          scene_ref: scene.scene_ref,
          start: scene.start,
          end: scene.end,
        })),
        events: events.map((event) => ({
          scene_ref: event.scene_ref,
          category: event.category,
          time: event.time,
          duration: event.duration,
        })),
      },
    });
    config.sfx_enabled = true;
    config.overlay_sfx_sync = false;
    fs.writeFileSync(
      path.join(projDir, "sfx_auto_timeline.json"),
      JSON.stringify(
        {
          version: 2,
          source: "disabled-by-professional-sound-design",
          sfx_events: [],
        },
        null,
        2
      ),
      "utf8"
    );
    fs.writeFileSync(
      path.join(projDir, "config_qanat.json"),
      JSON.stringify(config, null, 2),
      "utf8"
    );
    res.json({
      success: true,
      planned_count: planned.length,
      downloaded_count: events.length,
      events,
      logs,
    });
  } catch (error) {
    console.error("[SFX Professional]", error);
    res.status(500).json({
      error: "Falha no design profissional de SFX",
      details: error.message,
    });
  }
});

// Helper: Ensure all mapped BGM files are downloaded from Epidemic Sound before rendering

async function ensureProjectBgmTracks(projDir) {
  const token = getEpidemicSoundKey(projDir) || "";

  const configPath = path.join(projDir, "config_qanat.json");

  if (!fs.existsSync(configPath)) return;

  let config = {};

  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    return;
  }

  const storyboard = readProjectJson(projDir, "storyboard.json", {});
  const timings = readProjectJson(projDir, "block_timings.json", {
    starts: [],
    durations: [],
  });
  const blockNumbers = collectProjectBlockNumbers(config, storyboard, timings);
  const fileExistsInProject = (fileName) =>
    projectBgmFileExists(projDir, fileName);
  const totalDuration = Number(timings.total_duration) || 0;
  const videoFormat = detectVideoFormat(config, totalDuration);
  const bgmMode = resolveBgmMode(config, storyboard, videoFormat);

  let needsAutoFetch = false;
  let autoFetchReason = "";

  if (bgmMode === "emotion") {
    const segments = storyboard?.bgm_emotion_plan?.segments || [];
    const segmentsToFill = segmentsNeedingBgmDownload(
      segments,
      config.bgm_emotion_mappings || [],
      fileExistsInProject
    );
    const hasMappings =
      Array.isArray(config.bgm_emotion_mappings) &&
      config.bgm_emotion_mappings.some(
        (m) => m?.file && fileExistsInProject(m.file)
      );
    needsAutoFetch = !hasMappings || segmentsToFill.length > 0;
    autoFetchReason = !hasMappings
      ? "sem trilhas emocionais mapeadas"
      : `${segmentsToFill.length} segmento(s) sem arquivo`;
  } else {
    const blocksToFill = blocksNeedingBgmDownload(
      blockNumbers,
      config.bgm_mappings,
      fileExistsInProject
    );
    const hasMappings =
      (config.use_single_bgm &&
        config.single_bgm &&
        fileExistsInProject(config.single_bgm)) ||
      (Array.isArray(config.bgm_mappings) &&
        config.bgm_mappings.some(
          (m) => m?.file && fileExistsInProject(m.file)
        ));
    needsAutoFetch = !hasMappings || blocksToFill.length > 0;
    autoFetchReason = !hasMappings
      ? "sem trilhas mapeadas"
      : `${blocksToFill.length} bloco(s) sem arquivo`;
  }

  if (needsAutoFetch) {
    console.log(
      `[BGM Auto-Fetch] Sonoplastia automática (${autoFetchReason})...`
    );

    try {
      const autoLogs = await runAutoSoundtrackLogic(
        projDir,
        token,
        config.aspect_ratio === "9:16" ? "SHORTS" : "LONGO",
        { force: false }
      );
      for (const line of autoLogs || [])
        console.log(`[BGM Auto-Fetch] ${line}`);
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (err) {
      console.error(
        "[BGM Auto-Fetch] Falha na sonoplastia automática pré-render:",
        err.message
      );
    }
  }

  const filesToDownload = [];

  if (config.use_single_bgm && config.single_bgm) {
    filesToDownload.push(config.single_bgm);
  } else if (
    bgmMode === "emotion" &&
    Array.isArray(config.bgm_emotion_mappings)
  ) {
    for (const m of config.bgm_emotion_mappings) {
      if (m.file) filesToDownload.push(m.file);
    }
  } else if (Array.isArray(config.bgm_mappings)) {
    for (const m of config.bgm_mappings) {
      if (m.file) filesToDownload.push(m.file);
    }
  }

  for (const filename of filesToDownload) {
    const destPath = path.join(projDir, filename);

    if (!fs.existsSync(destPath)) {
      console.log(
        `[BGM Auto-Fetch] Arquivo ${filename} ausente. Tentando baixar do Epidemic Sound...`
      );

      let cleanTitle = filename;

      if (cleanTitle.startsWith("ES_")) {
        cleanTitle = cleanTitle.substring(3);
      }

      if (cleanTitle.endsWith(".mp3")) {
        cleanTitle = cleanTitle.substring(0, cleanTitle.length - 4);
      }

      cleanTitle = cleanTitle.replace(/_/g, " ").trim();

      try {
        const tracks = await searchMusic(token, cleanTitle);

        if (tracks.length > 0) {
          const track = tracks[0];

          console.log(
            `[BGM Auto-Fetch] Baixando "${track.title}" para ${filename}...`
          );

          await downloadMusicTrack(token, track.id, destPath, track.previewUrl);
        }
      } catch (err) {
        console.error(
          `[BGM Auto-Fetch] Falha ao baixar ${filename}:`,
          err.message
        );
      }
    }
  }
}

function sanitizeProjectBlockTimings(projDir) {
  const timingsPath = path.join(projDir, "block_timings.json");

  if (!fs.existsSync(timingsPath)) {
    return { changed: false, message: "" };
  }

  let timings;

  try {
    timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
  } catch (err) {
    return {
      changed: false,
      message: `block_timings.json invalido: ${err.message}`,
    };
  }

  const starts = Array.isArray(timings.starts)
    ? timings.starts.map(Number)
    : [];

  const durations = Array.isArray(timings.durations)
    ? timings.durations.map(Number)
    : [];

  const blockCount = Math.max(starts.length, durations.length);

  if (blockCount === 0) {
    return { changed: false, message: "" };
  }

  const totalFromFile = Number(timings.total_duration);

  const finitePositiveDurations = durations.filter(
    (value) => Number.isFinite(value) && value > 0.25
  );

  const fallbackDuration = finitePositiveDurations.length
    ? finitePositiveDurations.reduce((sum, value) => sum + value, 0) /
      finitePositiveDurations.length
    : 8;

  const totalDuration =
    Number.isFinite(totalFromFile) && totalFromFile > 0
      ? totalFromFile
      : Math.max(
          1,
          finitePositiveDurations.reduce((sum, value) => sum + value, 0)
        );

  let maxSeenStart = -Infinity;

  const unreliable = [];

  const sanitizedDurations = [];

  for (let i = 0; i < blockCount; i++) {
    const start = starts[i];

    const duration = durations[i];

    const startIsOutOfOrder =
      Number.isFinite(start) && start + 0.05 < maxSeenStart;

    const durationIsInvalid = !Number.isFinite(duration) || duration <= 0.25;

    const durationIsSuspicious =
      Number.isFinite(duration) &&
      blockCount > 3 &&
      duration > totalDuration * 0.4;

    if (Number.isFinite(start) && start > maxSeenStart) {
      maxSeenStart = start;
    }

    if (startIsOutOfOrder || durationIsInvalid || durationIsSuspicious) {
      unreliable.push(i);

      sanitizedDurations[i] = null;
    } else {
      sanitizedDurations[i] = duration;
    }
  }

  if (unreliable.length === 0) {
    return { changed: false, message: "" };
  }

  const reliableTotal = sanitizedDurations.reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0
  );

  const remaining = Math.max(
    unreliable.length * 1,
    totalDuration - reliableTotal
  );

  const replacementDuration = Math.max(
    1,
    remaining / unreliable.length || fallbackDuration
  );

  for (const index of unreliable) {
    sanitizedDurations[index] = replacementDuration;
  }

  const sanitizedStarts = [];

  let cursor = 0;

  for (let i = 0; i < blockCount; i++) {
    sanitizedStarts.push(Number(cursor.toFixed(3)));

    sanitizedDurations[i] = Number(
      Math.max(0.5, sanitizedDurations[i]).toFixed(3)
    );

    cursor += sanitizedDurations[i];
  }

  const sanitized = {
    ...timings,

    starts: sanitizedStarts,

    durations: sanitizedDurations,

    total_duration: Number(cursor.toFixed(3)),
  };

  fs.writeFileSync(timingsPath, JSON.stringify(sanitized, null, 2), "utf8");

  return {
    changed: true,

    message: `block_timings corrigido: ${unreliable.length} bloco(s) com tempo invalido ou fora de ordem.`,
  };
}

// Helper: Detect, search, download and map sound effects (SFX) based on storyboard keywords

async function ensureProjectSfxTracks(projDir) {
  const projectConfig = readProjectJson(projDir, "config_qanat.json", {});
  const autoSfxTimelinePath = path.join(projDir, "sfx_auto_timeline.json");
  if (!isSfxEnabled(projectConfig)) {
    console.log(
      "[SFX Auto-Fetch] Efeitos sonoros desativados (sfx_enabled=false)."
    );
    fs.writeFileSync(
      autoSfxTimelinePath,
      JSON.stringify({ sfx_events: [] }, null, 2),
      "utf8"
    );
    return;
  }

  if (projectConfig.overlay_sfx_sync === false) {
    fs.writeFileSync(
      autoSfxTimelinePath,
      JSON.stringify(
        { version: 1, source: "automatic-assets", sfx_events: [] },
        null,
        2
      ),
      "utf8"
    );
    console.log(
      "[SFX Auto-Fetch] Transições de assets desativadas; sonoplastia profissional preservada."
    );
    return;
  }

  const token = getEpidemicSoundKey(projDir) || "";

  ensureProjectSfxPack(projDir);

  const packDownloads = [
    { file: "sfx_tick.mp3", term: "ui tick click short" },
    { file: "sfx_impact.mp3", term: "cinematic impact hit short" },
    { file: "sfx_riser.mp3", term: "cinematic riser tension short" },
    { file: "sfx_room_tone.mp3", term: "room tone ambient air" },
  ];

  for (const pack of packDownloads) {
    const packPath = path.join(projDir, pack.file);
    if (fs.existsSync(packPath)) continue;
    try {
      const sfxs = await searchSoundEffects(token, pack.term);
      if (sfxs && sfxs.length > 0) {
        console.log(`[SFX Pack] Baixando ${pack.file} (${sfxs[0].title})...`);
        await downloadSoundEffect(
          token,
          sfxs[0].id,
          packPath,
          sfxs[0].previewUrl
        );
      }
    } catch (err) {
      console.warn(`[SFX Pack] Falha ao baixar ${pack.file}:`, err.message);
    }
  }

  const storyboardPath = path.join(projDir, "storyboard.json");

  const timingsPath = path.join(projDir, "block_timings.json");

  if (!fs.existsSync(storyboardPath) || !fs.existsSync(timingsPath)) {
    console.log(
      "[SFX Auto-Fetch] storyboard.json ou block_timings.json ausente. Pulando SFX."
    );

    return;
  }

  let storyboard = {};

  let timings = {};

  try {
    storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));

    timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
  } catch (e) {
    console.error("[SFX Auto-Fetch] Erro ao ler arquivos:", e.message);

    return;
  }

  const starts = [0.0].concat(timings.starts || []);

  const visualPrompts = storyboard.visual_prompts || [];

  const sfxEvents = [];

  // 1. Download transition whoosh sfx

  const whooshFile = "sfx_whoosh_transition.mp3";

  const whooshPath = path.join(projDir, whooshFile);

  if (!fs.existsSync(whooshPath)) {
    try {
      console.log("[SFX Auto-Fetch] Buscando transição whoosh...");

      const sfxs = await searchSoundEffects(
        token,
        "cinematic whoosh transition"
      );

      if (sfxs && sfxs.length > 0) {
        console.log(
          `[SFX Auto-Fetch] Baixando ${sfxs[0].title} para transições...`
        );

        await downloadSoundEffect(
          token,
          sfxs[0].id,
          whooshPath,
          sfxs[0].previewUrl
        );
      }
    } catch (err) {
      console.error(
        "[SFX Auto-Fetch] Falha ao baixar transição whoosh:",
        err.message
      );
    }
  }

  // Map whoosh transitions (peaks at start of each block transition, starting from block 2)

  if (fs.existsSync(whooshPath)) {
    let lastWhooshTime = -999.0;

    for (let i = 1; i < starts.length; i++) {
      const blockTime = starts[i];

      const targetTime = Math.max(0, blockTime - 1.0);

      // Enforce a minimum cooldown of 6.0 seconds between transitions

      if (targetTime - lastWhooshTime >= 6.0) {
        sfxEvents.push({
          time: targetTime,

          file: whooshFile,

          volume: 0.06, // Highly subtle volume (was 0.18)
        });

        lastWhooshTime = targetTime;
      } else {
        console.log(
          `[SFX Auto-Fetch] Ignorando transição do bloco ${i + 1} devido a proximidade temporal (cooldown de 6.0s)`
        );
      }
    }
  }

  // 2. Thematic SFX mapping rules with optimized low volumes (reduced by half/more)

  const sfxRules = [
    {
      keywords: ["terremoto", "tremor", "sismo", "chão tremer", "earthquake"],
      term: "earthquake rumble",
      file: "sfx_earthquake.mp3",
      volume: 0.08,
    },

    {
      keywords: ["vento", "sopro", "wind", "tempestade", "deserto", "oasis"],
      term: "desert wind loop",
      file: "sfx_wind.mp3",
      volume: 0.04,
    },

    {
      keywords: [
        "metal",
        "bronze",
        "vaso",
        "jarro",
        "dragões de bronze",
        "metal ball",
      ],
      term: "metal resonance drop",
      file: "sfx_metal_drop.mp3",
      volume: 0.06,
    },

    {
      keywords: ["dragão", "dragao", "dragon"],
      term: "creature growl roar",
      file: "sfx_dragon.mp3",
      volume: 0.06,
    },

    {
      keywords: ["sapo", "toad", "frog"],
      term: "frog croak",
      file: "sfx_frog.mp3",
      volume: 0.05,
    },

    {
      keywords: ["cavalo", "horse", "galope", "mensageiro"],
      term: "horse gallop fast",
      file: "sfx_horse.mp3",
      volume: 0.05,
    },

    {
      keywords: ["rir", "riram", "oficiais riram", "laugh", "laughing"],
      term: "man chuckle laugh",
      file: "sfx_laugh.mp3",
      volume: 0.04,
    },

    {
      keywords: [
        "caiu",
        "queda",
        "queda da esfera",
        "impact",
        "fall",
        "impacto",
      ],
      term: "heavy impact hit",
      file: "sfx_impact.mp3",
      volume: 0.07,
    },
  ];

  // Scan visual prompts for keywords

  let lastThematicSfxTime = -999.0;

  for (const vp of visualPrompts) {
    const blockNum = Number(vp.block || 1);

    if (blockNum > starts.length) continue;

    // SFX automático só em IMAGE — vídeo carrega áudio diegético do arquivo.
    if (
      !isImageMediaForSfx(
        vp?.media_mode || vp?.type || "",
        vp?.asset?.asset || vp?.asset || ""
      )
    ) {
      continue;
    }

    const blockStart = starts[blockNum - 1];

    const contextText =
      `${vp.narration_text || ""} ${vp.prompt || ""} ${vp.editor_notes || ""}`.toLowerCase();

    for (const rule of sfxRules) {
      const matches = rule.keywords.some((kw) => contextText.includes(kw));

      if (matches) {
        const destPath = path.join(projDir, rule.file);

        if (!fs.existsSync(destPath)) {
          try {
            console.log(
              `[SFX Auto-Fetch] Bloco ${blockNum} combina com "${rule.term}". Buscando SFX...`
            );

            const sfxs = await searchSoundEffects(token, rule.term);

            if (sfxs && sfxs.length > 0) {
              console.log(
                `[SFX Auto-Fetch] Baixando ${sfxs[0].title} para ${rule.file}...`
              );

              await downloadSoundEffect(
                token,
                sfxs[0].id,
                destPath,
                sfxs[0].previewUrl
              );
            }
          } catch (err) {
            console.error(
              `[SFX Auto-Fetch] Falha ao baixar SFX para ${rule.term}:`,
              err.message
            );
          }
        }

        if (fs.existsSync(destPath)) {
          // Prevent overlapping: 8s cooldown with other thematic, and 3s distance from any whoosh

          const tooCloseToOtherThematic =
            Math.abs(blockStart - lastThematicSfxTime) < 8.0;

          const tooCloseToWhoosh = sfxEvents.some(
            (evt) =>
              evt.file === whooshFile && Math.abs(evt.time - blockStart) < 3.0
          );

          if (!tooCloseToOtherThematic && !tooCloseToWhoosh) {
            sfxEvents.push({
              time: blockStart,

              file: rule.file,

              volume: rule.volume,
            });

            lastThematicSfxTime = blockStart;

            console.log(
              `[SFX Auto-Fetch] Bloco ${blockNum} sonoplastia mapeada: ${rule.file} em ${blockStart}s (vol=${rule.volume})`
            );
          } else {
            console.log(
              `[SFX Auto-Fetch] Ignorando SFX temático ${rule.file} no bloco ${blockNum} para evitar sobreposição ou alta frequência (cooldown)`
            );
          }
        }

        break; // Max 1 thematic SFX per block
      }
    }
  } // Write automatic asset map without touching professional sound design.

  fs.writeFileSync(
    autoSfxTimelinePath,
    JSON.stringify(
      { version: 1, source: "automatic-assets", sfx_events: sfxEvents },
      null,
      2
    ),
    "utf8"
  );

  console.log(
    `[SFX Auto-Fetch] Timeline automática salva em ${autoSfxTimelinePath} com ${sfxEvents.length} eventos.`
  );
}

// Planeja overlays via Gemini no Chrome (obrigatório quando gemini_browser_mode) ou API
function countProjectPlannedOverlays(storyboard = {}) {
  if (
    Array.isArray(storyboard.overlays_ai) &&
    storyboard.overlays_ai.length > 0
  ) {
    return storyboard.overlays_ai.length;
  }
  if (Array.isArray(storyboard.overlays) && storyboard.overlays.length > 0) {
    return storyboard.overlays.filter(
      (o) => o && o.id && !String(o.id).startsWith("sys-")
    ).length;
  }
  return 0;
}

function createOverlayPlanSessionId() {
  return `lum-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function overlayPlanSessionMatches(llmText, expectedSessionId) {
  if (!expectedSessionId) return true;
  const text = String(llmText || "");
  if (text.includes(expectedSessionId)) return true;
  // Gemini frequentemente omite plan_session — aceita JSON novo com overlays válidos.
  if (/"overlays"\s*:\s*\[[\s\S]*?\{/.test(text) && text.length > 400) {
    console.warn(
      "[Plan Overlays] plan_session ausente na resposta — aceitando JSON com overlays."
    );
    return true;
  }
  return false;
}

app.post("/api/render/plan-overlays", async (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const gateConfig = readProjectJson(projDir, "config_qanat.json", {});
    if (!isAiOverlaysEnabled(gateConfig)) {
      const storyboard = stripAiOverlaysFromStoryboard(
        readProjectJson(projDir, "storyboard.json", {})
      );
      fs.writeFileSync(
        path.join(projDir, "storyboard.json"),
        JSON.stringify(storyboard, null, 2),
        "utf8"
      );
      return res.json({
        success: true,
        overlayCount: 0,
        skippedAi: true,
        disabled: true,
        planToken: null,
        source: "templates_only",
        message:
          "Overlays IA desativados — use motion_scenes e Template Studio.",
      });
    }
    const useHyperframes = req.body?.hyperframes === true;
    const forceRegenerate = req.body?.force === true;

    // Reuse only when explicitly allowed. Default must regenerate, because stale
    // overlay metadata can leak facts/entities from another project.
    const allowCachedOverlays = req.body?.allow_cached === true;
    if (allowCachedOverlays && !forceRegenerate) {
      const existingSb = readProjectJson(projDir, "storyboard.json", {});
      const existingOverlays =
        Array.isArray(existingSb.overlays_ai) &&
        existingSb.overlays_ai.length > 0
          ? existingSb.overlays_ai
          : Array.isArray(existingSb.overlays) && existingSb.overlays.length > 0
            ? existingSb.overlays.filter(
                (o) => o && o.id && !String(o.id).startsWith("sys-")
              )
            : [];

      if (existingOverlays.length > 0) {
        const planToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const plannedAt = new Date().toISOString();
        existingSb.overlays_ai = JSON.parse(JSON.stringify(existingOverlays));
        existingSb.overlays_plan_token = planToken;
        existingSb.overlays_planned_at = plannedAt;
        fs.writeFileSync(
          path.join(projDir, "storyboard.json"),
          JSON.stringify(existingSb, null, 2),
          "utf8"
        );
        console.log(
          `[Plan Overlays] Overlays já existem (${existingOverlays.length} itens, token=${planToken}) — pulando chamada à IA.`
        );
        return res.json({
          success: true,
          overlayCount: existingOverlays.length,
          plannedAt,
          hyperframes: existingSb.overlays_hyperframes || false,
          planToken,
          source: "cached",
          skippedAi: true,
          overlayResearch: existingSb.overlays_research || null,
        });
      }
    }

    const browserTextRaw = extractBrowserResponse(req.body);
    const browserText = browserTextRaw
      ? extractOverlayJsonPayload(browserTextRaw) || browserTextRaw
      : null;
    const forceBrowser =
      req.body?.require_browser === true || shouldOfferGeminiBrowser(projDir);
    const expectedPlanSession =
      String(req.body?.plan_session_id || "").trim() || null;

    let llmText = browserText;
    if (!llmText) {
      const planSessionId = createOverlayPlanSessionId();
      const configForResearch = readProjectJson(
        projDir,
        "config_qanat.json",
        {}
      );
      const timingsForResearch = readProjectJson(
        projDir,
        "block_timings.json",
        { total_duration: 0 }
      );
      const orchestrationForResearch = buildOverlayOrchestrationPlan({
        config: configForResearch,
        niche: configForResearch.niche || "Geral",
        totalDuration: Number(timingsForResearch.total_duration) || 0,
        projectName: path.basename(projDir),
        blockCount: Array.isArray(configForResearch.block_phrases)
          ? configForResearch.block_phrases.length
          : 0,
      });
      const overlayResearch = await resolveOverlayResearchForPlanning(
        projDir,
        WORKSPACE_DIR,
        {
          forceRefresh: forceRegenerate || !allowCachedOverlays,
          orchestrationPlan: orchestrationForResearch,
          scriptResearch: {
            hasSourcesField: req.body?.has_research_sources === true,
            hasFactsField: req.body?.has_research_facts === true,
            sources: Array.isArray(req.body?.research_sources)
              ? req.body.research_sources
              : [],
            facts: Array.isArray(req.body?.research_facts)
              ? req.body.research_facts
              : [],
          },
          callGemini: (prompt, opts) =>
            callGeminiWithRetry(getApiKey(projDir), prompt, opts),
        }
      );
      const researchAddendum = buildOverlayResearchPromptBlock(overlayResearch);
      const prompt = buildCompactOverlayPlanningPrompt(
        projDir,
        useHyperframes,
        planSessionId,
        researchAddendum,
        overlayResearch
      );
      if (!prompt) {
        return res.status(400).json({
          error: "Projeto sem blocos de narração para planejar overlays.",
        });
      }

      if (forceBrowser) {
        const title = useHyperframes
          ? "Planejar overlays HyperFrames AI"
          : "Planejar overlays do vídeo";
        const promptText = buildBrowserTaskPrompt(title, prompt, "", {
          taskType: "overlay",
          responseFormat: "json",
        });
        console.log(
          `[Plan Overlays] Aguardando resposta do Gemini no Chrome (sessão ${planSessionId}).`
        );
        return res.json(
          offerGeminiBrowserPayload({
            title,
            prompt: promptText,
            planSessionId,
          })
        );
      }

      const apiKey = getApiKey(projDir);
      if (!apiKey) {
        return res.status(401).json({
          error:
            "Sem chave API. Ative Gemini no Chrome nas configurações ou adicione uma chave.",
        });
      }
      llmText = await callGeminiWithRetry(apiKey, prompt, {
        temperature: 0.35,
        projectDir: projDir,
      });
      if (!llmText) {
        return res
          .status(500)
          .json({ error: "Falha ao consultar Gemini API para overlays." });
      }
    }

    if (
      expectedPlanSession &&
      !overlayPlanSessionMatches(llmText, expectedPlanSession)
    ) {
      console.warn(
        `[Plan Overlays] Sessão inválida — esperado ${expectedPlanSession}, resposta rejeitada (provável JSON antigo do Chrome).`
      );
      return res.status(422).json({
        error:
          "Resposta do Gemini desatualizada. Aguarde a nova resposta na aba gemini.google.com e tente o render de novo.",
        overlayCount: 0,
        staleResponse: true,
      });
    }

    const overlaysAi = await generateOverlaysWithAI(
      projDir,
      useHyperframes,
      null,
      {},
      {
        llmText,
        skipBrowserCache: true,
        planningOnly: true,
      }
    );

    const config = readProjectJson(projDir, "config_qanat.json", {});
    const blockPhrases = Array.isArray(config.block_phrases)
      ? config.block_phrases
      : [];
    const cleanedAi = filterNarrationEchoOverlays(
      Array.isArray(overlaysAi) ? overlaysAi : [],
      blockPhrases
    );

    const rawCount = Array.isArray(overlaysAi) ? overlaysAi.length : 0;
    console.log(
      `[Plan Overlays] Gemini retornou ${rawCount} overlay(s); após validação: ${cleanedAi.length}.`
    );

    if (cleanedAi.length === 0) {
      return res.status(422).json({
        error:
          rawCount > 0
            ? "Gemini respondeu, mas os overlays foram descartados (formato inválido ou texto igual à narração). Tente novamente no Chrome."
            : "Gemini não retornou JSON de overlays. Confira a aba gemini.google.com e tente de novo.",
        overlayCount: 0,
        rawCount,
      });
    }

    const planToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    storyboard.overlays_ai = repairOverlaysEncoding(
      JSON.parse(JSON.stringify(cleanedAi))
    );
    storyboard.overlays_hyperframes = useHyperframes;
    storyboard.overlays_planned_at = new Date().toISOString();
    storyboard.overlays_plan_token = planToken;
    const overlayResearchMeta = storyboard.overlays_research || null;

    const timingsForPlan = readProjectJson(projDir, "block_timings.json", {
      starts: [],
      durations: [],
    });
    const configForPlan = readProjectJson(projDir, "config_qanat.json", {});
    const wordTranscriptsPlan = readProjectJson(
      projDir,
      "word_transcripts.json",
      []
    );
    const totalDurPlan =
      Number(timingsForPlan.total_duration) ||
      (timingsForPlan.starts?.length && timingsForPlan.durations?.length
        ? Number(timingsForPlan.starts[timingsForPlan.starts.length - 1]) +
          Number(timingsForPlan.durations[timingsForPlan.durations.length - 1])
        : 48);
    const planForTiming = buildOverlayOrchestrationPlan({
      config: configForPlan,
      niche: configForPlan.niche || "Geral",
      totalDuration: totalDurPlan,
      projectName: path.basename(projDir),
      blockCount: Array.isArray(timingsForPlan.starts)
        ? timingsForPlan.starts.length
        : 0,
    });

    // Align and finalize planned overlays immediately
    const realigned = repairOverlaysEncoding(
      normalizeGeminiOverlayPayload(
        realignPlannedOverlays(
          cleanedAi,
          null,
          storyboard,
          timingsForPlan.starts || [],
          timingsForPlan.durations || [],
          wordTranscriptsPlan,
          configForPlan
        )
      )
    );

    const finalized = finalizeProjectOverlays(
      projDir,
      realigned,
      configForPlan,
      storyboard,
      timingsForPlan.starts || [],
      timingsForPlan.durations || [],
      planForTiming,
      totalDurPlan
    );

    const finalizedInformative = finalized.filter(isInformativeOverlay);
    if (finalizedInformative.length === 0) {
      return res.status(422).json({
        error:
          "Os overlays foram rejeitados pela validação de assunto do projeto. Gere novamente; nenhum dado fora do roteiro foi salvo.",
        overlayCount: 0,
        rawCount,
      });
    }

    storyboard.overlays = finalized;

    const sceneMapsPlan = buildSceneTimingMaps(
      null,
      storyboard,
      timingsForPlan.starts || [],
      timingsForPlan.durations || []
    );
    const preparedForTiming = resolveOverlaysForTimingCheck(
      storyboard,
      timingsForPlan
    );
    const { report: planTimingReport } = verifyAndRepairAiOverlayTiming(
      preparedForTiming,
      {
        starts: timingsForPlan.starts || [],
        durations: timingsForPlan.durations || [],
        sceneStarts: sceneMapsPlan.sceneStarts,
        sceneDurations: sceneMapsPlan.sceneDurations,
        wordTranscripts: wordTranscriptsPlan,
        totalDuration: totalDurPlan,
        plan: planForTiming,
        repair: false,
      }
    );
    storyboard.overlay_timing_report = {
      ...planTimingReport,
      source: "planned",
    };

    const cleanSbPlan = repairStoryboardEncoding(storyboard);
    fs.writeFileSync(
      path.join(projDir, "storyboard.json"),
      JSON.stringify(cleanSbPlan, null, 2),
      "utf8"
    );

    console.log(
      `[Plan Overlays] Concluído: ${cleanedAi.length} overlays, token=${planToken}`
    );

    res.json({
      success: true,
      overlayCount: finalizedInformative.length,
      plannedAt: storyboard.overlays_planned_at,
      hyperframes: useHyperframes,
      planToken,
      source: forceBrowser ? "gemini_chrome" : "gemini_api",
      overlayResearch: overlayResearchMeta
        ? {
            sufficient: overlayResearchMeta.sufficient,
            facts: overlayResearchMeta.facts?.length || 0,
            sources: overlayResearchMeta.sources?.length || 0,
            topic: overlayResearchMeta.topic,
            selectedBlocks: overlayResearchMeta.selectedBlocks || [],
            budget: overlayResearchMeta.budget,
            via: overlayResearchMeta.via,
          }
        : null,
    });
  } catch (err) {
    console.error("[Plan Overlays]", err);
    res
      .status(500)
      .json({ error: err.message || "Falha ao planejar overlays." });
  }
});

// API: Render videos streaming logs via Server-Sent Events (SSE)

app.get(
  "/api/render/:mode",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const renderProjectName = path.basename(projDir);

    const mode = req.params.mode; // 'standard' or 'highlighted'

    const withoutImpactTitles = req.query.withoutImpactTitles === "1";

    res.setHeader("Content-Type", "text/event-stream");

    res.setHeader("Cache-Control", "no-cache");

    res.setHeader("Connection", "keep-alive");

    res.setHeader("X-Accel-Buffering", "no");

    res.flushHeaders();

    // Heartbeat to keep connection alive during long renders/downloads

    const heartbeat = setInterval(() => {
      res.write(":\n\n");
    }, 15000);

    const cleanup = () => {
      clearInterval(heartbeat);
    };

    req.on("close", cleanup);

    const sendLog = (text) => {
      res.write(`data: ${JSON.stringify({ type: "log", text })}\n\n`);
    };

    const timingSanitization = sanitizeProjectBlockTimings(projDir);

    if (timingSanitization.message) {
      sendLog(`[Dashboard] ${timingSanitization.message}`);
    }

    // Pre-download missing BGM files from Epidemic Sound

    try {
      sendLog("[Dashboard] Verificando trilhas sonoras de fundo (BGM)...");

      await ensureProjectBgmTracks(projDir);
    } catch (err) {
      sendLog(`[BGM Auto-Fetch] Erro: ${err.message}`);
    }

    // Pre-download and map SFX

    try {
      const renderCfg = readProjectJson(projDir, "config_qanat.json", {});
      if (!isSfxEnabled(renderCfg)) {
        sendLog(
          "[Dashboard] Efeitos sonoros (SFX) desativados — render sem SFX."
        );
      } else {
        sendLog(
          "[Dashboard] Analisando roteiro para download de efeitos sonoros (SFX)..."
        );
        await ensureProjectSfxTracks(projDir);
      }
    } catch (err) {
      sendLog(`[SFX Auto-Fetch] Erro: ${err.message}`);
    }

    // Mix soundtrack

    try {
      const mixPrepLogs = await prepareBgmBeforeMix(projDir);
      for (const line of mixPrepLogs || []) sendLog(`[BGM Prep] ${line}`);

      sendLog("[Dashboard] Iniciando mixagem da trilha sonora (mix_bgm.py)...");

      ensureFileExists("mix_bgm.py", projDir);

      await new Promise((resolve) => {
        const mixProcess = spawn(PYTHON_PATH, ["mix_bgm.py"], {
          cwd: projDir,

          shell: true,
          env: buildPythonSpawnEnv(),
        });

        mixProcess.stdout.on("data", (data) => {
          const lines = data.toString().split("\n");

          for (const line of lines) {
            const cleanLine = line.trim();

            if (cleanLine) sendLog(`[BGM Mixer] ${cleanLine}`);
          }
        });

        mixProcess.on("close", (code) => {
          if (code === 0) {
            sendLog("[BGM Mixer] Trilha final trilha_documentario.mp3 gerada!");
          } else {
            sendLog(
              "[BGM Mixer] Aviso: O mixador de BGM retornou código não-zero."
            );
          }

          resolve();
        });
      });
    } catch (err) {
      sendLog(`[BGM Mixer] Erro: ${err.message}`);
    }

    if (mode === "remotion" || mode === "remotion-pro") {
      let child = null;
      const renderJobId = createRenderJobId(renderProjectName);
      createRenderJob({
        jobId: renderJobId,
        projectName: renderProjectName,
        projDir,
        mode,
      });
      res.write(
        `data: ${JSON.stringify({ type: "job", jobId: renderJobId })}\n\n`
      );

      const trackRenderProgress = (text) => {
        appendRenderJobLog(renderJobId, text);
        const pctMatch = String(text).match(/\[PROGRESSO\] (\d+)%/);
        if (pctMatch) {
          updateRenderJob(renderJobId, {
            status: "rendering",
            percent: parseInt(pctMatch[1], 10),
            phase: "Renderizando…",
          });
        }
      };

      try {
        const gateConfig = readProjectJson(projDir, "config_qanat.json", {});
        if (
          req.query.require_overlay_plan === "1" &&
          isAiOverlaysEnabled(gateConfig)
        ) {
          const storyboardGate = readProjectJson(
            projDir,
            "storyboard.json",
            {}
          );
          const plannedAt = storyboardGate.overlays_planned_at
            ? new Date(storyboardGate.overlays_planned_at).getTime()
            : 0;
          const planAgeMs =
            plannedAt > 0 ? Date.now() - plannedAt : Number.POSITIVE_INFINITY;
          const overlayCount = countProjectPlannedOverlays(storyboardGate);
          const reqToken = String(req.query.overlay_plan_token || "").trim();
          const savedToken = String(
            storyboardGate.overlays_plan_token || ""
          ).trim();
          let tokenOk = reqToken && savedToken && reqToken === savedToken;
          const planMaxAgeMs = 30 * 60 * 1000;

          if (!tokenOk && reqToken && overlayCount >= 1) {
            storyboardGate.overlays_plan_token = reqToken;
            storyboardGate.overlays_planned_at = new Date().toISOString();
            if (
              !Array.isArray(storyboardGate.overlays_ai) ||
              !storyboardGate.overlays_ai.length
            ) {
              const fallback = countProjectPlannedOverlays(storyboardGate);
              if (fallback > 0 && Array.isArray(storyboardGate.overlays)) {
                storyboardGate.overlays_ai = JSON.parse(
                  JSON.stringify(
                    storyboardGate.overlays.filter(
                      (o) => o && o.id && !String(o.id).startsWith("sys-")
                    )
                  )
                );
              }
            }
            fs.writeFileSync(
              path.join(projDir, "storyboard.json"),
              JSON.stringify(storyboardGate, null, 2),
              "utf8"
            );
            tokenOk = true;
            sendLog(
              "[Remotion] Token de overlays sincronizado com o storyboard."
            );
          }

          if (overlayCount < 1 || planAgeMs > planMaxAgeMs || !tokenOk) {
            sendLog(
              "=== ERRO: Planejamento de overlays obrigatório não concluído nesta sessão. ==="
            );
            if (overlayCount < 1) {
              sendLog(
                "[Remotion] Nenhum overlay no storyboard. Clique em «Gerar overlays IA» ou aguarde o Gemini no Chrome."
              );
            } else if (!tokenOk) {
              sendLog(
                "[Remotion] Token de planejamento inválido — clique Render de novo após o Gemini concluir."
              );
            } else {
              sendLog(
                "[Remotion] Planejamento expirou (>30 min). Gere overlays novamente antes do render."
              );
            }
            res.write(
              `data: ${JSON.stringify({ type: "failed", code: 2, reason: "overlay_plan_gate" })}\n\n`
            );
            res.end();
            cleanup();
            return;
          }
          sendLog(
            `[Remotion] Overlays planejados validados (${overlayCount} itens, token OK, ${Math.round(planAgeMs / 1000)}s atrás).`
          );
        }

        sendLog(
          "[Remotion] Preparando linha do tempo, assets, narração e legendas..."
        );

        const isProres =
          req.query.prores === "1" || req.query.transparent === "1";
        const useHyperframes = req.query.hyperframes === "1";
        const isSample = req.query.sample === "1";
        const fps = Number(req.query.fps) === 60 ? 60 : 30;
        const previewSecs = isSample
          ? Math.min(15, Math.max(10, Number(req.query.sampleSeconds) || 12))
          : Math.min(60, Math.max(0, Number(req.query.preview) || 0));
        const resolution = resolveRenderResolution(req);
        if (isSample) {
          sendLog(
            `[Remotion] Modo amostra OpenMontage: ${previewSecs}s (gancho + 1 cena).`
          );
        }
        if (useHyperframes) {
          sendLog("[Remotion] Modo orquestrado ativo (motion templates).");
        }
        updateRenderJob(renderJobId, {
          status: "preparing",
          phase: "Preparando timeline e assets…",
          percent: 3,
        });

        const renderSnapshot = createLumieraRenderSnapshot(projDir, { fps });
        sendLog(
          `[Remotion] Snapshot imutavel criado: ${path.basename(renderSnapshot.snapshotPath)} (${renderSnapshot.hash.slice(0, 12)}).`
        );
        appendRenderJobLog(
          renderJobId,
          `[snapshot] ${renderSnapshot.snapshotPath} sha256=${renderSnapshot.hash}`
        );

        const renderPlan = await prepareRemotionRender(
          projDir,
          isProres,
          useHyperframes,
          {
            previewDuration: previewSecs > 0 ? previewSecs : undefined,
            resolution,
            sampleRender: isSample,
            fps,
            renderSnapshot: renderSnapshot.snapshot,
          }
        );
        if (resolution === "2k") {
          sendLog("[Remotion] Resolução 2K ativada (2560×1440 ou 1440×2560).");
        }

        sendLog(`[PROGRESSO] 10%`);
        trackRenderProgress("[PROGRESSO] 10%");
        updateRenderJob(renderJobId, {
          status: "rendering",
          outputPath: renderPlan.outputPath,
          phase: "Iniciando Remotion…",
          percent: 10,
        });

        sendLog(
          `[Remotion] ${renderPlan.sceneCount} cenas e ${renderPlan.captionCount} legendas prontas.`
        );

        const infoCount =
          renderPlan.informativeOverlayCount ?? renderPlan.overlayCount ?? 0;
        const totalOv = renderPlan.overlayCount ?? 0;
        sendLog(
          `[Remotion] ${infoCount} overlays informativos na timeline${totalOv !== infoCount ? ` (${totalOv} no total com HUD/sistema)` : ""}.`
        );
        const timingReport = renderPlan.overlayTimingReport;
        if (timingReport?.entries?.length) {
          for (const entry of timingReport.entries) {
            const icon =
              entry.status === "ok"
                ? "✓"
                : entry.status === "repaired"
                  ? "↻"
                  : "!";
            sendLog(
              `[Overlays Timing] ${icon} ${entry.id} @ ${entry.startSec?.toFixed(1)}s` +
                `${entry.plannedScene ? ` (cena ${entry.plannedScene})` : ""}` +
                ` — ${entry.message || entry.status}`
            );
          }
        }

        sendLog(
          `[Remotion] ${renderPlan.sfxCount || 0} efeitos sonoros mapeados.`
        );

        sendLog(
          `[Remotion] ${renderPlan.bgmTrackCount || 0} faixas BGM — modo ${renderPlan.bgmMode || "none"} (${renderPlan.bgmSource || "none"}).`
        );
        if (Array.isArray(renderPlan.bgmTrackSummary)) {
          for (const line of renderPlan.bgmTrackSummary) {
            sendLog(`[Remotion BGM] ${line}`);
          }
        }
        if (
          renderPlan.bgmMode === "emotion" &&
          (renderPlan.bgmTrackCount || 0) === 0
        ) {
          sendLog(
            "[Remotion BGM] AVISO: modo emoção sem faixas no render — verifique mapeamentos na aba Trilha BGM."
          );
        }
        if (Array.isArray(renderPlan.sonoplastiaLog)) {
          for (const line of renderPlan.sonoplastiaLog) {
            sendLog(line);
          }
        }

        sendLog(
          `[Remotion] Duração estimada: ${renderPlan.totalDuration.toFixed(1)}s`
        );

        const remotionTimeoutMs = 180000;
        const heavyRender =
          resolution === "2k" || (renderPlan.totalDuration || 0) > 60;

        const remotionArgs = [
          "remotion",
          "render",
          "src/index.ts",
          "LumieraTimeline",
          `"${renderPlan.outputPath}"`,
          "--props",
          `"${renderPlan.propsPath}"`,
          "--codec",
          isProres ? "prores" : "h264",
          "--timeout",
          String(remotionTimeoutMs),
        ];

        if (heavyRender) {
          remotionArgs.push("--concurrency", "4");
          sendLog(
            `[Remotion] Timeout ${remotionTimeoutMs / 1000}s, concurrency=4 (render pesado).`
          );
        } else {
          sendLog(`[Remotion] Timeout ${remotionTimeoutMs / 1000}s.`);
        }

        if (previewSecs > 0) {
          const frameCount = Math.ceil(previewSecs * fps);
          remotionArgs.push("--frames", `0-${frameCount - 1}`);
          sendLog(
            `[Remotion] Preview de ${previewSecs}s (0-${frameCount - 1} frames, total ${frameCount} frames a ${fps}fps)`
          );
        }

        sendLog(
          `[Remotion Debug] Spawning npx with args: ${JSON.stringify(remotionArgs)}`
        );
        trackRenderProgress(
          `[Remotion Debug] Args: ${JSON.stringify(remotionArgs)}`
        );
        child = spawn("npx", remotionArgs, {
          cwd: REMOTION_DIR,

          shell: true,

          env: buildPythonSpawnEnv(),
        });

        activeRenderProcesses.set(renderJobId, child);

        if (child?.pid) {
          updateRenderJob(renderJobId, {
            childPid: child.pid,
            status: "rendering",
            phase: "Renderizando frames…",
          });
        }

        const emitRemotionLine = (line) => {
          sendLog(`[Remotion] ${line}`);
          trackRenderProgress(`[Remotion] ${line}`);

          const progressMatch = line.match(/(\d+(?:\.\d+)?)%/);
          if (progressMatch) {
            const pct = Math.min(
              99,
              Math.max(10, Math.round(Number(progressMatch[1])))
            );
            const progressLine = `[PROGRESSO] ${pct}%`;
            sendLog(progressLine);
            trackRenderProgress(progressLine);
          }

          const remotionMatch = line.match(/Rendered\s+(\d+)\/(\d+)/i);
          if (remotionMatch) {
            const renderedFrames = parseInt(remotionMatch[1], 10);
            const totalFrames = parseInt(remotionMatch[2], 10);
            if (totalFrames > 0) {
              const pct = Math.min(
                99,
                Math.max(10, Math.round((renderedFrames / totalFrames) * 100))
              );
              const progressLine = `[PROGRESSO] ${pct}%`;
              sendLog(progressLine);
              trackRenderProgress(progressLine);
            }
          }
        };

        child.stdout.on("data", (data) => {
          const text = data.toString().trim();

          if (text) {
            const lines = text.split(/\r?\n/);

            for (const line of lines) {
              emitRemotionLine(line);
            }
          }
        });

        child.stderr.on("data", (data) => {
          const text = data.toString().trim();

          if (text) {
            const lines = text.split(/\r?\n/);

            for (const line of lines) {
              emitRemotionLine(line);
            }
          }
        });

        child.on("close", (code) => {
          activeRenderProcesses.delete(renderJobId);
          if (code === 0) {
            sendLog("[PROGRESSO] 100%");
            trackRenderProgress("[PROGRESSO] 100%");

            // Faststart: moov no início → preview no browser não fica “carregando”
            try {
              const fsResult = ensureMp4Faststart(renderPlan.outputPath, {
                log: (msg) => sendLog(msg),
              });
              if (fsResult.ok && !fsResult.skipped) {
                sendLog("[Remotion] MP4 otimizado para streaming (faststart).");
              }
            } catch (fsErr) {
              sendLog(`[Remotion] Aviso faststart: ${fsErr.message || fsErr}`);
            }

            if (renderPlan.sampleMeta) {
              try {
                const finalOutputDir = path.join(
                  projDir,
                  "OUTPUT",
                  "qanat_persa_video_final"
                );
                fs.mkdirSync(finalOutputDir, { recursive: true });
                const fileExt = path.extname(renderPlan.outputPath);
                const sampleName = `remotion_sample_v${renderPlan.sampleMeta.version}${fileExt}`;
                const destPath = path.join(finalOutputDir, sampleName);
                fs.copyFileSync(renderPlan.outputPath, destPath);
                ensureMp4Faststart(destPath, { log: (msg) => sendLog(msg) });
                sendLog(
                  `[Remotion] Amostra copiada para OUTPUT: ${sampleName}`
                );
              } catch (copyErr) {
                console.error(
                  "[Remotion] Falha ao copiar amostra para OUTPUT:",
                  copyErr
                );
                sendLog(
                  `[Remotion] Aviso: Não foi possível disponibilizar a amostra no painel: ${copyErr.message}`
                );
              }
            } else if (
              renderPlan.outputPath &&
              String(renderPlan.outputPath).includes("qanat_persa_video_final")
            ) {
              // Output já na pasta final — faststart já rodou no outputPath
            } else if (renderPlan.outputPath) {
              // Garante cópia em OUTPUT com faststart quando o path final é a pasta OUTPUT
              try {
                const finalOutputDir = path.join(
                  projDir,
                  "OUTPUT",
                  "qanat_persa_video_final"
                );
                if (
                  path.dirname(renderPlan.outputPath) === finalOutputDir ||
                  path
                    .normalize(renderPlan.outputPath)
                    .includes(`OUTPUT${path.sep}qanat_persa_video_final`)
                ) {
                  ensureMp4Faststart(renderPlan.outputPath, {
                    log: (msg) => sendLog(msg),
                  });
                }
              } catch {
                /* ignore */
              }
            }

            finishRenderJob(renderJobId, {
              outputPath: renderPlan.outputPath,
              phase: "Concluído!",
            });

            sendLog(`[Remotion] Arquivo final: ${renderPlan.outputPath}`);

            const postClean = purgeRemotionPublicProjectCache();
            if (postClean.freedMb > 0) {
              sendLog(
                `[Remotion] Cache temporário removido (~${postClean.freedMb} MB liberados).`
              );
            }

            if (!res.writableEnded) {
              res.write(
                `data: ${JSON.stringify({ type: "complete", code })}\n\n`
              );
              cleanup();
              res.end();
            }
          } else {
            failRenderJob(renderJobId, `Remotion exit ${code}`);
            if (!res.writableEnded) {
              res.write(
                `data: ${JSON.stringify({ type: "failed", code })}\n\n`
              );
              cleanup();
              res.end();
            }
          }
        });
      } catch (err) {
        sendLog(`[ERRO] ${err.message}`);
        failRenderJob(renderJobId, err.message);
        activeRenderProcesses.delete(renderJobId);

        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: "failed", code: 1 })}\n\n`);
          cleanup();
          res.end();
        }
      }

      req.on("close", () => {
        cleanup();
        if (child) {
          appendRenderJobLog(
            renderJobId,
            "[Dashboard] Cliente desconectou — render segue ativo em segundo plano."
          );
        }
      });

      return;
    }

    const scriptName =
      mode === "highlighted" ? "build_video_destacado.py" : "build_video.py";

    ensureFileExists(scriptName, projDir);

    const scriptPath = path.join(projDir, scriptName);

    if (!fs.existsSync(scriptPath)) {
      sendLog(`[ERRO] ${scriptName} não encontrado no workspace`);

      res.write(`data: ${JSON.stringify({ type: "failed", code: 1 })}\n\n`);
      cleanup();
      res.end();

      return;
    }

    let runScriptName = scriptName;

    let tempScriptPath = null;

    if (withoutImpactTitles) {
      const sourceCode = fs.readFileSync(scriptPath, "utf8");

      const patchedCode = sourceCode.replace(
        /_raw_impacts\s*=\s*_config\.get\(['"]impact_texts['"],\s*\[\]\)/,

        "_raw_impacts = []"
      );

      runScriptName = `.render_sem_titulos_${scriptName}`;

      tempScriptPath = path.join(projDir, runScriptName);

      fs.writeFileSync(tempScriptPath, patchedCode, "utf8");
    }

    const resolution = resolveRenderResolution(req);
    sendLog(
      `[Dashboard] Iniciando script de renderização: ${scriptName}${withoutImpactTitles ? " (sem títulos grandes)" : ""}${resolution === "2k" ? " [2K]" : ""}...`
    );

    const child = spawn(PYTHON_PATH, [runScriptName], {
      cwd: projDir,

      shell: true,

      env: buildPythonSpawnEnv({
        LUMIERA_RENDER_RESOLUTION: resolution,
      }),
    });

    const pyKey = `python_${renderProjectName}`;
    activeRenderProcesses.set(pyKey, child);

    child.stdout.on("data", (data) => {
      const text = data.toString().trim();

      if (text) {
        const lines = text.split(/\r?\n/);

        for (const line of lines) {
          sendLog(line);
        }
      }
    });

    child.stderr.on("data", (data) => {
      const text = data.toString().trim();

      if (text) {
        const lines = text.split(/\r?\n/);

        for (const line of lines) {
          sendLog(`[ERRO] ${line}`);
        }
      }
    });

    child.on("close", (code) => {
      activeRenderProcesses.delete(pyKey);
      if (tempScriptPath && fs.existsSync(tempScriptPath)) {
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (e) {}
      }

      if (code === 0) {
        res.write(`data: ${JSON.stringify({ type: "complete", code })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: "failed", code })}\n\n`);
      }
      cleanup();
      res.end();
    });

    req.on("close", () => {
      cleanup();
    });
  })
);

// Helper: Get configured API key

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    return null;
  }
}

function safeProjectSlug(projectDir) {
  return path.basename(projectDir).replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
}

function remotionPublicProjectsRoot() {
  return path.join(REMOTION_PUBLIC_DIR, "projects");
}

function remotionDirSizeBytes(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) total += remotionDirSizeBytes(entryPath);
    else if (entry.isFile()) {
      try {
        total += fs.statSync(entryPath).size;
      } catch {
        /* ignore */
      }
    }
  }
  return total;
}

/** Remove past render asset caches from remotion-renderer/public/projects (not the real project folders). */
function purgeRemotionPublicProjectCache(keepSlug = null) {
  const projectsRoot = remotionPublicProjectsRoot();
  if (!fs.existsSync(projectsRoot)) {
    fs.mkdirSync(projectsRoot, { recursive: true });
    return { removed: 0, freedMb: 0 };
  }

  let removed = 0;
  let freedBytes = 0;
  for (const name of fs.readdirSync(projectsRoot)) {
    if (keepSlug && name === keepSlug) continue;
    const dir = path.join(projectsRoot, name);
    try {
      if (!fs.statSync(dir).isDirectory()) continue;
      freedBytes += remotionDirSizeBytes(dir);
      fs.rmSync(dir, { recursive: true, force: true });
      removed++;
    } catch (e) {
      console.warn(`[Remotion Cache] Falha ao remover ${name}:`, e.message);
    }
  }

  return { removed, freedMb: Math.round(freedBytes / (1024 * 1024)) };
}

function readProjectJson(projectDir, fileName, fallback = {}) {
  const filePath = path.join(projectDir, fileName);

  if (!fs.existsSync(filePath)) return fallback;

  try {
    const data = JSON.parse(
      fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
    );

    if (fileName === "storyboard.json") {
      return repairStoryboardEncoding(data);
    }

    if (fileName === "config_qanat.json") {
      return mergeGlobalStudioIntoProjectConfig(
        data,
        loadRenderConfig(__dirname)
      );
    }

    return data;
  } catch (e) {
    return fallback;
  }
}

function findProjectFile(projectDir, fileName) {
  if (!fileName) return null;

  const safeName = path.basename(fileName);

  const candidates = [
    path.join(projectDir, safeName),

    path.join(projectDir, "ASSETS", safeName),

    path.join(projectDir, "ASSETS", "satellite", safeName),

    path.join(projectDir, "ASSETS", "images", safeName),

    path.join(projectDir, "ASSETS", "videos", safeName),

    path.join(projectDir, "ASSETS", "audio", safeName),

    path.join(projectDir, "MUSICAS", safeName),
  ];

  const rel = String(fileName || "")
    .replace(/\\/g, "/")
    .replace(/^ASSETS\//i, "");
  if (rel.includes("/")) {
    candidates.unshift(path.join(projectDir, "ASSETS", rel));
  }

  // Fallback to workspace root directory if not found in project folder

  if (projectDir !== WORKSPACE_DIR) {
    candidates.push(
      path.join(WORKSPACE_DIR, safeName),

      path.join(WORKSPACE_DIR, "ASSETS", safeName),

      path.join(WORKSPACE_DIR, "ASSETS", "satellite", safeName),

      path.join(WORKSPACE_DIR, "ASSETS", "images", safeName),

      path.join(WORKSPACE_DIR, "ASSETS", "videos", safeName),

      path.join(WORKSPACE_DIR, "ASSETS", "audio", safeName)
    );
    if (rel.includes("/")) {
      candidates.push(path.join(WORKSPACE_DIR, "ASSETS", rel));
    }
  }

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function transcodeVideoForRemotion(source, dest, fps = 30) {
  const ffmpegInfo = getFfmpegStatus();
  const ffmpegBin = ffmpegInfo.binary || "ffmpeg";
  const tempDest = dest + ".tmp.mp4";
  const cmd = `"${ffmpegBin}" -y -i "${source}" -filter:v "framerate=fps=${fps}" -c:v libx264 -pix_fmt yuv420p -profile:v high -level:v 4.0 -g 1 -bf 0 -crf 20 -c:a aac -b:a 128k -movflags +faststart "${tempDest}"`;

  try {
    execSync(cmd, { stdio: "ignore", env: buildPythonSpawnEnv() });
    if (fs.existsSync(tempDest)) {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      fs.renameSync(tempDest, dest);
      console.log(`[Remotion Transcode] Transcodificado com sucesso: ${dest}`);
    } else {
      throw new Error("Temporário não criado");
    }
  } catch (err) {
    if (fs.existsSync(tempDest)) {
      try {
        fs.unlinkSync(tempDest);
      } catch {}
    }
    throw err;
  }
}

function copyRemotionAsset(sourcePath, targetDir, prefix = "", fps = 30) {
  if (!sourcePath || !fs.existsSync(sourcePath)) return null;

  fs.mkdirSync(targetDir, { recursive: true });

  const parsed = path.parse(sourcePath);
  const safeBase = `${prefix}${parsed.name}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const destName = `${safeBase}${parsed.ext.toLowerCase()}`;
  const destPath = path.join(targetDir, destName);

  const ext = parsed.ext.toLowerCase();
  if (ext === ".mp4" || ext === ".mov" || ext === ".mkv" || ext === ".webm") {
    try {
      let needTranscode = true;
      if (fs.existsSync(destPath)) {
        const mtimeSource = fs.statSync(sourcePath).mtimeMs;
        const mtimeDest = fs.statSync(destPath).mtimeMs;
        if (mtimeDest >= mtimeSource) {
          needTranscode = false;
        }
      }
      if (needTranscode) {
        console.log(
          `[Remotion Transcode] Preparando codec compatível para ${destName}...`
        );
        transcodeVideoForRemotion(sourcePath, destPath, fps);
      }
    } catch (err) {
      console.warn(
        `[Remotion Transcode] Falha ao transcodificar ${destName}, copiando original:`,
        err.message
      );
      fs.copyFileSync(sourcePath, destPath);
    }
  } else {
    fs.copyFileSync(sourcePath, destPath);
  }

  return destName;
}

function resolveProjectAssetPath(projectDir, relPath) {
  const rel = String(relPath || "")
    .trim()
    .replace(/\\/g, "/");
  if (!rel || /^https?:\/\//i.test(rel) || rel.startsWith("projects/")) {
    return null;
  }
  const direct = path.join(projectDir, rel);
  if (fs.existsSync(direct)) return direct;
  return (
    findProjectFile(projectDir, rel) ||
    findProjectFile(projectDir, path.basename(rel))
  );
}

function copyOverlayMediaPropsForRemotion(
  overlay,
  { projectDir, publicProjectDir, projectSlug, fps = 30 }
) {
  if (!overlay?.props) return overlay;
  const p = overlay.props;
  const overlayKey = String(overlay.id || overlay.type || "ov").replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );
  const mediaKeys = [
    "backgroundImage",
    "backgroundImageWide",
    "flyover_video",
    "pipMediaUrl",
    "mainMediaUrl",
  ];
  for (const key of mediaKeys) {
    const rel = String(p[key] || "").trim();
    if (!rel || /^https?:\/\//i.test(rel) || rel.startsWith("projects/")) {
      continue;
    }
    const source = resolveProjectAssetPath(projectDir, rel);
    const copied = copyRemotionAsset(
      source,
      publicProjectDir,
      `${overlayKey}_${key}_`,
      fps
    );
    if (copied) p[key] = `projects/${projectSlug}/${copied}`;
  }
  if (p.studio_props && typeof p.studio_props === "object") {
    const studioProps = { ...p.studio_props };
    let studioChanged = false;
    for (const key of ["pipMediaUrl", "mainMediaUrl", "flyover_video"]) {
      const rel = String(studioProps[key] || "").trim();
      if (!rel || /^https?:\/\//i.test(rel) || rel.startsWith("projects/")) {
        continue;
      }
      const source = resolveProjectAssetPath(projectDir, rel);
      const copied = copyRemotionAsset(
        source,
        publicProjectDir,
        `${overlayKey}_sp_${key}_`,
        fps
      );
      if (copied) {
        studioProps[key] = `projects/${projectSlug}/${copied}`;
        studioChanged = true;
      }
    }
    if (studioChanged) p.studio_props = studioProps;
  }
  return overlay;
}

function getAudioDuration(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return 0;

    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;

    const output = execSync(cmd, {
      encoding: "utf8",
      env: buildPythonSpawnEnv(),
    }).trim();

    const dur = parseFloat(output);

    return Number.isFinite(dur) ? dur : 0;
  } catch (e) {
    console.error("Error getting audio duration:", e.message);

    return 0;
  }
}

function parseDurationSeconds(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const match = value.replace(",", ".").match(/[\d.]+/);

    if (match) return Number(match[0]);
  }

  return fallback;
}

function normalizeWordTranscriptEnds(wordTranscripts) {
  if (!Array.isArray(wordTranscripts)) return [];
  return wordTranscripts.map((segment) => {
    const segmentStart = Number(segment?.start_time || 0);
    const words = sanitizeTranscriptSegmentWords(segment).map((w) => ({
      ...w,
    }));
    for (let i = 0; i < words.length; i++) {
      const relStart = Number(words[i]?.start || 0);
      let relEnd = Number(words[i]?.end || relStart + 0.4);
      if (relEnd <= relStart) relEnd = relStart + 0.15;
      if (i < words.length - 1) {
        const nextStart = Number(words[i + 1]?.start || relEnd);
        relEnd = Math.min(relEnd, Math.max(relStart + 0.08, nextStart - 0.02));
      } else {
        relEnd = Math.min(relEnd, relStart + 1.5);
      }
      words[i].start = relStart;
      words[i].end = relEnd;
    }
    const segEnd = words.length
      ? segmentStart + Number(words[words.length - 1].end || 0)
      : Number(segment?.end_time || segmentStart);
    return { ...segment, words, end_time: segEnd };
  });
}

function captionsFromWordTranscripts(wordTranscripts) {
  const captions = [];

  const normalized = normalizeWordTranscriptEnds(wordTranscripts);

  for (const segment of normalized) {
    const segmentStart = Number(segment?.start_time || 0);

    if (!Array.isArray(segment?.words)) continue;

    for (let i = 0; i < segment.words.length; i++) {
      const word = segment.words[i];

      const start = segmentStart + Number(word?.start || 0);

      let end = segmentStart + Number(word?.end || word?.start || 0.4);

      if (i < segment.words.length - 1) {
        end =
          segmentStart + Number(segment.words[i + 1]?.start || word?.end || 0);
      }

      end = Math.min(end, start + 1.5);

      captions.push({
        text: String(word?.word || "").trimStart(),

        startMs: Math.max(0, Math.round(start * 1000)),

        endMs: Math.max(0, Math.round(end * 1000)),

        timestampMs: Math.max(0, Math.round(start * 1000)),

        confidence: null,
      });
    }
  }

  return captions.filter((caption) => caption.text.trim());
}

function sanitizeCaptionsForRemotion(captions, maxDurationSeconds) {
  const maxMs = Math.max(
    1000,
    Math.round((Number(maxDurationSeconds) || 0) * 1000)
  );

  const sorted = (Array.isArray(captions) ? captions : [])

    .map((caption) => ({
      ...caption,

      text: String(caption?.text || "").trimStart(),

      startMs: Math.max(0, Number(caption?.startMs || 0)),

      endMs: Math.max(0, Number(caption?.endMs || 0)),
    }))

    .filter(
      (caption) =>
        caption.text.trim() &&
        Number.isFinite(caption.startMs) &&
        // Não crie uma legenda residual de 120 ms encostada no fim do áudio.
        caption.startMs < maxMs - 80
    )

    .sort((a, b) => a.startMs - b.startMs);

  const deduped = sorted.filter((caption, index) => {
    const previous = sorted[index - 1];
    if (!previous) return true;
    const sameText =
      previous.text.trim().toLocaleLowerCase("pt-BR") ===
      caption.text.trim().toLocaleLowerCase("pt-BR");
    return !(sameText && Math.abs(caption.startMs - previous.startMs) < 90);
  });

  return deduped.map((caption, index) => {
    const nextStart = deduped[index + 1]?.startMs;

    const naturalEnd =
      caption.endMs > caption.startMs ? caption.endMs : caption.startMs + 420;

    const maxWordEnd = caption.startMs + 900;

    const nextLimitedEnd = Number.isFinite(nextStart)
      ? Math.max(caption.startMs + 120, nextStart - 40)
      : maxMs;

    const endMs = Math.min(naturalEnd, maxWordEnd, nextLimitedEnd, maxMs);

    return {
      ...caption,

      startMs: Math.round(caption.startMs),

      endMs: Math.round(
        Math.min(maxMs, Math.max(caption.startMs + 120, endMs))
      ),

      timestampMs: Math.round(caption.startMs),
    };
  });
}

function fallbackCaptionsFromScenes(scenes) {
  const captions = [];

  for (const scene of scenes) {
    const words = String(scene.narrationText || "")
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) continue;

    const step = Math.max(180, (scene.duration * 1000) / words.length);

    words.forEach((word, index) => {
      const startMs = Math.round(scene.start * 1000 + index * step);

      captions.push({
        text: index === 0 ? word : ` ${word}`,

        startMs,

        endMs: Math.round(startMs + step),

        timestampMs: startMs,

        confidence: null,
      });
    });
  }

  return captions;
}

function collectRemotionSfxTracks(
  projectDir,
  publicProjectDir,
  projectSlug,
  totalDuration
) {
  const projectConfig = readProjectJson(projectDir, "config_qanat.json", {});
  if (!isSfxEnabled(projectConfig)) {
    return [];
  }

  const professionalTimeline = readProjectJson(
    projectDir,
    "sfx_timeline.json",
    {
      sfx_events: [],
    }
  );
  const overlaySfxEnabled = projectConfig.overlay_sfx_sync !== false;
  const automaticTimeline = overlaySfxEnabled
    ? readProjectJson(projectDir, "sfx_auto_timeline.json", { sfx_events: [] })
    : { sfx_events: [] };
  const includeAutomaticSfx = shouldIncludeAutomaticSfx({
    professionalTimeline,
    overlaySfxEnabled,
  });
  const rawProfessionalEvents = Array.isArray(professionalTimeline.sfx_events)
    ? professionalTimeline.sfx_events.filter((event) => {
        if (
          event?.category ||
          /^sfx_ai_/i.test(path.basename(String(event?.file || "")))
        ) {
          return true;
        }
        return overlaySfxEnabled;
      })
    : [];
  const renderStoryboard = readProjectJson(projectDir, "storyboard.json", {});
  const renderTimings = readProjectJson(projectDir, "block_timings.json", {});
  const renderWordTranscripts = readProjectJson(
    projectDir,
    "word_transcripts.json",
    []
  );
  const renderScenes = buildProfessionalSfxScenes(
    renderStoryboard.visual_prompts,
    {
      timelineAssets: projectConfig.timeline_assets || {},
      narrationChunkPlan: renderStoryboard.narration_chunk_plan || {},
      wordTranscripts: renderWordTranscripts,
      blockTimings: renderTimings,
    }
  );
  const professionalEvents = normalizeProfessionalSfxEvents({
    rawEvents: rawProfessionalEvents,
    scenes: renderScenes,
    totalDuration,
    isShort: projectConfig.aspect_ratio === "9:16" || totalDuration <= 90,
    maxEvents: Math.max(1, rawProfessionalEvents.length),
  });
  if (professionalEvents.length !== rawProfessionalEvents.length) {
    console.warn(
      `[Remotion SFX] ${rawProfessionalEvents.length - professionalEvents.length} evento(s) rejeitado(s) na revalidação visual do render.`
    );
  }
  const automaticEvents =
    includeAutomaticSfx && Array.isArray(automaticTimeline.sfx_events)
      ? automaticTimeline.sfx_events
      : [];
  const events = [...professionalEvents, ...automaticEvents];

  const tracks = [];

  for (const [index, event] of events.entries()) {
    const start = Math.max(0, Number(event?.time || 0));

    if (!Number.isFinite(start) || start >= totalDuration) continue;

    const source = findProjectFile(projectDir, event?.file);

    if (!source) {
      console.warn(
        `[Remotion SFX] Arquivo ausente; evento ignorado: ${event?.file || "sem arquivo"}`
      );
      continue;
    }

    const isProfessional =
      Boolean(event?.category) ||
      /^sfx_ai_/i.test(path.basename(String(event?.file || "")));
    const rawVolume = Number(event?.volume);
    const volume = isProfessional
      ? Math.max(
          0.02,
          Math.min(0.24, Number.isFinite(rawVolume) ? rawVolume : 0.1)
        )
      : Math.max(
          0.012,
          Math.min(0.12, Number.isFinite(rawVolume) ? rawVolume : 0.035)
        );
    const probedSourceDuration = getAudioDuration(source);
    const sourceDuration =
      probedSourceDuration || Number(event?.source_duration) || 0;
    const sfxFfmpegBinary = getFfmpegStatus().binary || "ffmpeg";
    const renderMix = isProfessional
      ? analyzeProfessionalSfxForRender({
          filePath: source,
          category: event?.category || "detail",
          requestedDuration: Number(event?.duration) || 0.8,
          requestedVolume: volume,
          sourceDuration,
          ffmpegBinary: sfxFfmpegBinary,
        })
      : null;
    let copied = null;
    let playbackSourceDuration = sourceDuration;
    let playbackVolume = renderMix?.volume || volume;
    let playbackSourceStart = renderMix?.sourceStart || 0;
    if (renderMix) {
      const safeBase = path.parse(source).name.replace(/[^a-zA-Z0-9_-]/g, "_");
      const normalizedName = `sfx_${index + 1}_${safeBase}_normalized.wav`;
      const normalizedPath = path.join(publicProjectDir, normalizedName);
      const normalized = normalizeProfessionalSfxAsset({
        sourcePath: source,
        destinationPath: normalizedPath,
        sourceStart: renderMix.sourceStart,
        duration: renderMix.sampleDuration,
        ffmpegBinary: sfxFfmpegBinary,
      });
      if (normalized) {
        copied = normalizedName;
        playbackSourceDuration = renderMix.sampleDuration;
        playbackSourceStart = 0;
        playbackVolume = calculateNormalizedProfessionalSfxVolume({
          category: event?.category || "detail",
          requestedVolume: volume,
        });
      }
    }
    copied ||= copyRemotionAsset(source, publicProjectDir, `sfx_${index + 1}_`);
    if (!copied) continue;
    if (renderMix) {
      console.log(
        `[Remotion SFX] ${event?.provider_title || event?.file}: ` +
          `volume ${volume.toFixed(3)} -> ${playbackVolume.toFixed(3)}, ` +
          `fonte @ ${renderMix.sourceStart.toFixed(3)}s, ` +
          `média ${renderMix.meanDb ?? "n/a"} dB, pico ${renderMix.maxDb ?? "n/a"} dB`
      );
    }
    const playbackSegments = buildSfxPlaybackSegments({
      event: {
        ...event,
        category: isProfessional
          ? String(event?.category || "detail")
          : "utility",
        repeat_mode: isProfessional ? event?.repeat_mode : "none",
        volume: playbackVolume,
        source_start: playbackSourceStart,
        source_mean_db: renderMix?.meanDb ?? null,
        source_max_db: renderMix?.maxDb ?? null,
      },
      sourceDuration: playbackSourceDuration,
      totalDuration,
    });

    for (const segment of playbackSegments) {
      tracks.push({
        ...segment,
        file: `projects/${projectSlug}/${copied}`,
        fadeInS: Number(segment.fadeInS ?? event?.fade_in) || 0.06,
        fadeOutS: Number(segment.fadeOutS ?? event?.fade_out) || 0.22,
      });
    }
  }

  return tracks;
}

function normalizeYoutubeChannelUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  if (trimmed.startsWith("@")) return `https://www.youtube.com/${trimmed}`;
  if (trimmed.includes("youtube.com"))
    return `https://${trimmed.replace(/^https?:\/\//, "")}`;
  return trimmed;
}

function readYoutubeChannelSettings(projectDir, globalConfig = {}) {
  const projectConfig = readProjectJson(projectDir, "config_qanat.json", {});
  const resolved = readYoutubeChannelFromCatalog(projectConfig, globalConfig);

  return {
    channelUrl: normalizeYoutubeChannelUrl(resolved.channelUrl || ""),
    channelName: String(resolved.channelName || "").trim(),
    subscriberCount: String(resolved.subscriberCount || "").trim(),
    scope: resolved.scope || "global",
    channelId: resolved.channelId || null,
  };
}

async function scrapeYoutubeChannelFromUrl(channelUrl) {
  const url = normalizeYoutubeChannelUrl(channelUrl);
  if (!url) return null;

  const html = await new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    };
    https
      .get(url, options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(data));
      })
      .on("error", (err) => reject(err));
  });

  let channelName = "";
  const titleMatch = html.match(/property="og:title"[^>]*content="([^"]+)"/);
  if (titleMatch) channelName = titleMatch[1];

  let avatarUrl = "";
  const avatarMatch = html.match(/property="og:image"[^>]*content="([^"]+)"/);
  if (avatarMatch) avatarUrl = avatarMatch[1];

  let subCount = "";
  const subMatch1 = html.match(
    /"accessibilityLabel"\s*:\s*"([^"]+ (?:inscritos|subscribers|seguidores))"/i
  );
  if (subMatch1) {
    subCount = subMatch1[1];
  } else {
    const subMatch2 = html.match(
      /"metadataParts"\s*:\s*\[\s*\{\s*"text"\s*:\s*\{\s*"content"\s*:\s*"([^"]+)"/
    );
    if (subMatch2) subCount = subMatch2[1];
  }

  return { channelName, subscriberCount: subCount, avatarUrl };
}

async function downloadChannelAvatar(
  avatarUrl,
  publicProjectDir,
  projectSlug,
  cacheKey
) {
  if (!avatarUrl) return null;
  const avatarFileName = `youtube_avatar_${cacheKey}.jpg`;
  const destPath = path.join(publicProjectDir, avatarFileName);
  await new Promise((resolve, reject) => {
    https
      .get(avatarUrl, (res) => {
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          resolve();
        });
        fileStream.on("error", reject);
      })
      .on("error", reject);
  });
  return `projects/${projectSlug}/${avatarFileName}`;
}

function findCachedYoutubeAvatar(projectDir, workspaceDir, cacheKey) {
  const fileName = `youtube_avatar_${cacheKey}.jpg`;
  const candidates = [
    path.join(projectDir, "ASSETS", fileName),
    path.join(workspaceDir, "ASSETS", fileName),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function resolveYoutubeChannelInfo(
  projectDir,
  publicProjectDir,
  projectSlug,
  globalConfig = {}
) {
  const settings = readYoutubeChannelSettings(projectDir, globalConfig);
  const fallbackUrl =
    "https://www.youtube.com/channel/UCYYcyky9A8fob3t6TlIENYA";
  const channelUrl = settings.channelUrl || fallbackUrl;
  const cacheKey = youtubeAvatarCacheKey(settings.channelId, channelUrl);

  let scraped = null;
  try {
    scraped = await scrapeYoutubeChannelFromUrl(channelUrl);
  } catch (e) {
    console.error("[YouTube Channel] Erro ao buscar dados do canal:", e);
  }

  const channelName =
    settings.channelName || scraped?.channelName || "Canal do YouTube";
  const subscriberCount =
    settings.subscriberCount || scraped?.subscriberCount || "";

  const cachedAvatar = findCachedYoutubeAvatar(
    projectDir,
    WORKSPACE_DIR,
    cacheKey
  );
  if (cachedAvatar) {
    const copied = copyRemotionAsset(
      cachedAvatar,
      publicProjectDir,
      "yt_avatar_"
    );
    if (copied) {
      return {
        channelName,
        subscriberCount,
        avatarUrl: `projects/${projectSlug}/${copied}`,
      };
    }
  }

  try {
    if (scraped?.avatarUrl) {
      const workspaceAssets = path.join(WORKSPACE_DIR, "ASSETS");
      fs.mkdirSync(workspaceAssets, { recursive: true });
      const workspaceCachePath = path.join(
        workspaceAssets,
        `youtube_avatar_${cacheKey}.jpg`
      );
      await new Promise((resolve, reject) => {
        https
          .get(scraped.avatarUrl, (res) => {
            const fileStream = fs.createWriteStream(workspaceCachePath);
            res.pipe(fileStream);
            fileStream.on("finish", () => {
              fileStream.close();
              resolve();
            });
            fileStream.on("error", reject);
          })
          .on("error", reject);
      });

      const localAvatarPath = await downloadChannelAvatar(
        scraped.avatarUrl,
        publicProjectDir,
        projectSlug,
        cacheKey
      );
      return {
        channelName,
        subscriberCount,
        avatarUrl: localAvatarPath || scraped.avatarUrl,
      };
    }
  } catch (e) {
    console.error("[YouTube Channel] Erro ao baixar avatar:", e);
  }

  return {
    channelName,
    subscriberCount,
    avatarUrl: scraped?.avatarUrl || null,
  };
}

function resolveRenderResolution(req) {
  if (req.query.resolution === "2k") return "2k";
  if (req.query.resolution === "1080p") return "1080p";

  try {
    const projDir = getProjectDir(req);
    const projectConfig = readProjectJson(projDir, "config_qanat.json", {});
    if (
      projectConfig.render_resolution === "2k" ||
      projectConfig.render_resolution === "1080p"
    ) {
      return projectConfig.render_resolution;
    }
  } catch {
    /* fall through to global */
  }

  const globalConfig = loadRenderConfig(__dirname);
  return globalConfig.renderResolution === "2k" ? "2k" : "1080p";
}

function logOverlayTimingAndConflicts(overlays, starts, durations) {
  if (!Array.isArray(overlays) || overlays.length === 0) {
    console.log("[Overlays Map] Nenhum overlay ativo na timeline.");
    return;
  }

  console.log("\n========================================================");
  console.log("   🗺️ MAPA DE EXIBIÇÃO DOS OVERLAYS (PRÉ-RENDER)");
  console.log("========================================================");

  const sorted = [...overlays]
    .filter((o) => o && typeof o.start === "number" && Number.isFinite(o.start))
    .sort((a, b) => a.start - b.start);

  const activeIntervals = [];

  for (const overlay of sorted) {
    const start = Number(overlay.start);
    const duration = Number(overlay.duration) || 4;
    const end = start + duration;
    const isSystem =
      ["hud", "retention-hook", "mid-video-cta", "youtube-sub"].includes(
        overlay.type
      ) || String(overlay.id).includes("hud");

    const label = `[${overlay.type.toUpperCase()}] "${overlay.props?.title || overlay.props?.text || overlay.id}"`;
    const timeRangeStr = `${start.toFixed(2)}s - ${end.toFixed(2)}s (dur: ${duration.toFixed(1)}s)`;

    console.log(`- Overlay: ${label.padEnd(45)} | ${timeRangeStr}`);

    if (!isSystem) {
      activeIntervals.push({
        id: overlay.id,
        label,
        start,
        end,
        overlay,
      });
    }
  }

  let collisionCount = 0;
  console.log("--------------------------------------------------------");
  console.log("   🔍 ANÁLISE DE CONFLITOS DE EXIBIÇÃO SIMULTÂNEA");
  console.log("--------------------------------------------------------");

  for (let i = 0; i < activeIntervals.length; i++) {
    for (let j = i + 1; j < activeIntervals.length; j++) {
      const a = activeIntervals[i];
      const b = activeIntervals[j];

      const overlap = Math.max(
        0,
        Math.min(a.end, b.end) - Math.max(a.start, b.start)
      );
      if (overlap > 0.05) {
        collisionCount++;
        console.warn(`[WARNING] CONFLITO DETECTADO!`);
        console.warn(
          `  - Overlay A: ${a.label} (${a.start.toFixed(2)}s - ${a.end.toFixed(2)}s)`
        );
        console.warn(
          `  - Overlay B: ${b.label} (${b.start.toFixed(2)}s - ${b.end.toFixed(2)}s)`
        );
        console.warn(
          `  - Sobreposição: ${overlap.toFixed(2)} segundos concorrentes na tela.`
        );
      }
    }
  }

  if (collisionCount === 0) {
    console.log(
      "✅ Excelente: Nenhum conflito de exibição simultânea detectado!"
    );
  } else {
    console.warn(
      `⚠️ Atenção: Detectados ${collisionCount} conflitos de sobreposição temporal entre overlays informativos.`
    );
  }
  console.log("========================================================\n");
}

async function prepareRemotionRender(
  projectDir,
  isProres = false,
  useHyperframes = false,
  options = {}
) {
  const targetFps = options.fps === 60 ? 60 : 30;
  const snapshotFiles = options.renderSnapshot?.files || null;
  // Load global render config

  const globalConfigPath = path.join(__dirname, "render_config_global.json");

  let globalConfig = {
    fps: 30,
    blockGapSeconds: 1.0,
    musicVolume: 0.15,
    useRemotionByDefault: true,
    debugOverlay: false,
  };

  if (fs.existsSync(globalConfigPath)) {
    try {
      globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, "utf8"));
    } catch (e) {}
  }

  let config =
    snapshotFiles?.["config_qanat.json"] ||
    readProjectJson(projectDir, "config_qanat.json", {});

  let storyboard =
    snapshotFiles?.["storyboard.json"] ||
    readProjectJson(projectDir, "storyboard.json", {});

  try {
    const refreshed = refreshEmotionPlanTimings(projectDir);
    for (const line of refreshed.logs || [])
      console.log(`[Remotion BGM Prep] ${line}`);
    config = snapshotFiles?.["config_qanat.json"] || refreshed.config;
    storyboard = snapshotFiles?.["storyboard.json"] || refreshed.storyboard;
    const prepLogs = await prepareBgmBeforeMix(projectDir);
    for (const line of prepLogs || [])
      console.log(`[Remotion BGM Prep] ${line}`);
    config =
      snapshotFiles?.["config_qanat.json"] ||
      readProjectJson(projectDir, "config_qanat.json", {});
    storyboard =
      snapshotFiles?.["storyboard.json"] ||
      readProjectJson(projectDir, "storyboard.json", {});
  } catch (prepErr) {
    console.warn(
      "[Remotion BGM Prep] Falha ao preparar trilhas emocionais:",
      prepErr.message
    );
  }

  const presetResult = applyDocumentaryHistoryPreset(
    config,
    storyboard,
    config.niche
  );
  if (presetResult.applied) {
    config = presetResult.config;
    storyboard = presetResult.storyboard;
    try {
      fs.writeFileSync(
        path.join(projectDir, "config_qanat.json"),
        JSON.stringify(config, null, 2),
        "utf8"
      );
      console.log(
        "[Remotion] Preset Documentário História aplicado ao projeto."
      );
    } catch (e) {
      console.warn("[Remotion] Falha ao salvar preset no config:", e.message);
    }
  }

  const timings =
    snapshotFiles?.["block_timings.json"] ||
    readProjectJson(projectDir, "block_timings.json", {
      starts: [],
      durations: [],
    });

  const wordTranscripts =
    snapshotFiles?.["word_transcripts.json"] ||
    readProjectJson(projectDir, "word_transcripts.json", []);
  const flatTranscriptWords = flattenWordTranscripts(wordTranscripts);

  const timelineStudio =
    snapshotFiles?.["timeline_studio.json"] || loadStudioForRender(projectDir);
  const useStudioRender = shouldUseStudioForRender(timelineStudio);
  if (useStudioRender) {
    console.log(
      `[Remotion] Timeline Studio: ${timelineStudio.clips.length} clips → render`
    );
  }

  const isChunkedNarration =
    config.narration_mode === NARRATION_MODE_CHUNKED ||
    timings.source === "narration_chunks" ||
    (Array.isArray(wordTranscripts) && wordTranscripts.some((s) => s.chunk_id));

  if (
    !useStudioRender &&
    flatTranscriptWords.length > 0 &&
    config.timeline_assets
  ) {
    // Verificar se o usuario ja sincronizou assets — se sim, respeitar os valores salvos
    const anyBlockSynced = Object.values(config.timeline_assets).some(
      (assets) =>
        Array.isArray(assets) && assets.some((a) => a.synced_to_speech)
    );

    if (!anyBlockSynced) {
      let nextTimelineAssets;
      const chunkPlan = storyboard?.narration_chunk_plan;
      const hasChunkPlan = isChunkedNarration && chunkPlan?.chunks?.length > 0;

      if (hasChunkPlan) {
        const timedPlan = {
          ...chunkPlan,
          chunks: computeChunkTimeline(chunkPlan.chunks),
        };
        const synced = syncTimelineFromChunkPlan({
          timelineAssets: config.timeline_assets,
          chunkPlan: timedPlan,
          visualPrompts: Array.isArray(storyboard.visual_prompts)
            ? storyboard.visual_prompts
            : [],
        });
        nextTimelineAssets = realignTimelineAssetsToSpeech({
          timelineAssets: synced.timelineAssets,
          blockTimings: timings,
          flatTranscriptWords,
          wordTranscripts,
          visualPrompts:
            synced.visualPrompts || storyboard.visual_prompts || [],
          blockPhrases: Array.isArray(config.block_phrases)
            ? config.block_phrases
            : [],
          preserveExplicitFixed: false,
        });
        console.log(
          "[Remotion] timeline_assets sincronizados pelo plano de trechos (1 cena = 1 trecho)."
        );
      } else if (isChunkedNarration) {
        nextTimelineAssets = bootstrapTimelineSlotsFromWhisper({
          timelineAssets: config.timeline_assets,
          wordTranscripts,
          visualPrompts: Array.isArray(storyboard.visual_prompts)
            ? storyboard.visual_prompts
            : [],
          blockPhrases: Array.isArray(config.block_phrases)
            ? config.block_phrases
            : [],
          flatTranscriptWords,
        });
        nextTimelineAssets = realignTimelineAssetsToSpeech({
          timelineAssets: nextTimelineAssets,
          blockTimings: timings,
          flatTranscriptWords,
          wordTranscripts,
          visualPrompts: Array.isArray(storyboard.visual_prompts)
            ? storyboard.visual_prompts
            : [],
          blockPhrases: Array.isArray(config.block_phrases)
            ? config.block_phrases
            : [],
          preserveExplicitFixed: false,
        });
        console.log(
          "[Remotion] timeline_assets ancorados aos segmentos de narração por trechos."
        );
      } else {
        nextTimelineAssets = realignTimelineAssetsToSpeech({
          timelineAssets: config.timeline_assets,
          blockTimings: timings,
          flatTranscriptWords,
          wordTranscripts,
          visualPrompts: Array.isArray(storyboard.visual_prompts)
            ? storyboard.visual_prompts
            : [],
          blockPhrases: Array.isArray(config.block_phrases)
            ? config.block_phrases
            : [],
          preserveExplicitFixed: false,
        });
        console.log(
          "[Remotion] timeline_assets realinhados aos block_timings antes do render."
        );
      }
      config.timeline_assets = tightenTimelineRetentionDurations(
        nextTimelineAssets,
        timings
      );
      try {
        fs.writeFileSync(
          path.join(projectDir, "config_qanat.json"),
          JSON.stringify(config, null, 2),
          "utf8"
        );
      } catch (e) {
        console.warn(
          "[Remotion] Falha ao salvar timeline realinhada:",
          e.message
        );
      }
    } else {
      console.log(
        "[Remotion] timeline_assets ja sincronizados pelo usuario — preservando valores salvos."
      );
    }
  }

  const projectSlug = safeProjectSlug(projectDir);

  const publicProjectDir = path.join(
    REMOTION_PUBLIC_DIR,
    "projects",
    projectSlug
  );

  if (!publicProjectDir.startsWith(remotionPublicProjectsRoot())) {
    throw new Error("Caminho Remotion inválido.");
  }

  const cacheClean = purgeRemotionPublicProjectCache();
  if (cacheClean.removed > 0) {
    console.log(
      `[Remotion Cache] ${cacheClean.removed} cache(s) antigo(s) removido(s) — ~${cacheClean.freedMb} MB liberados`
    );
  }

  fs.rmSync(publicProjectDir, { recursive: true, force: true });

  fs.mkdirSync(publicProjectDir, { recursive: true });

  const timelineAssets = config.timeline_assets || {};

  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  const syncContext = {
    visualPrompts,
    blockPhrases: Array.isArray(config.block_phrases)
      ? config.block_phrases
      : [],
    timelineAssets,
  };

  const promptByBlock = new Map();

  for (const prompt of visualPrompts) {
    const block = Number(prompt?.block || 1);

    if (!promptByBlock.has(block)) promptByBlock.set(block, []);

    promptByBlock.get(block).push(prompt);
  }

  const blockNumbers = [
    ...new Set([
      ...Object.keys(timelineAssets).map(Number).filter(Boolean),

      ...visualPrompts
        .map((prompt) => Number(prompt?.block || 0))
        .filter(Boolean),

      ...(Array.isArray(config.block_phrases)
        ? config.block_phrases
            .map((item) => Number(item?.block || 0))
            .filter(Boolean)
        : []),
    ]),
  ].sort((a, b) => a - b);

  let scenes = [];

  let runningStart = 0;

  if (useStudioRender) {
    scenes = buildScenesFromStudio(timelineStudio, {
      projectDir,
      publicProjectDir,
      projectSlug,
      copyRemotionAsset,
      findProjectFile,
      fillSceneTimelineGaps,
    });
    console.log(
      `[Remotion] Timeline Studio: ${scenes.length} cena(s) montada(s) a partir da linha do tempo.`
    );
  }

  for (const block of useStudioRender ? [] : blockNumbers) {
    const blockIndex = Math.max(0, block - 1);

    const blockStart = Number(timings.starts?.[blockIndex]);

    const blockDuration = Number(timings.durations?.[blockIndex]);

    const start = Number.isFinite(blockStart) ? blockStart : runningStart;

    const duration =
      Number.isFinite(blockDuration) && blockDuration > 0 ? blockDuration : 8;

    const mappedAssets = Array.isArray(timelineAssets[String(block)])
      ? timelineAssets[String(block)]
      : [];

    const prompts = promptByBlock.get(block) || [];

    let nextBlockStartForSync = null;
    const currentBlockIdxInList = blockNumbers.indexOf(block);
    if (
      currentBlockIdxInList !== -1 &&
      currentBlockIdxInList < blockNumbers.length - 1
    ) {
      const nextBlock = blockNumbers[currentBlockIdxInList + 1];
      const nextBlockIndex = Math.max(0, nextBlock - 1);
      const nextBlockStartVal = Number(timings.starts?.[nextBlockIndex]);
      if (Number.isFinite(nextBlockStartVal))
        nextBlockStartForSync = nextBlockStartVal;
    }
    const blockEndForSync = nextBlockStartForSync ?? start + duration;

    const blockSceneTimings = buildBlockSceneTimings(
      block,
      mappedAssets,
      duration,
      flatTranscriptWords,
      { ...syncContext, blockStart: start, blockEnd: blockEndForSync }
    );

    const hasExplicitSync = blockHasExplicitSync(mappedAssets, {
      blockStart: start,
      blockEnd: blockEndForSync,
    });

    const blockSceneStartIdx = scenes.length;

    if (mappedAssets.length > 0) {
      blockSceneTimings.forEach((timing, index) => {
        const item = timing.asset;

        const sourcePath = findProjectFile(projectDir, item?.asset);

        const copiedName = copyRemotionAsset(
          sourcePath,
          publicProjectDir,
          `b${block}_${index + 1}_`
        );

        if (!copiedName) return;

        const sceneDuration = timing.duration;

        const prompt = prompts[index] || prompts[0] || {};
        const sceneId = prompt?.scene
          ? String(prompt.scene).trim()
          : `${block}.${index + 1}`;

        // Extensão do arquivo vence type do timeline (evita .mp4 como <Img>)
        const assetIsVideo =
          /\.(mp4|webm|mov|m4v|mkv)(\?|$)/i.test(String(copiedName || "")) ||
          /\.(mp4|webm|mov|m4v|mkv)(\?|$)/i.test(String(item?.asset || "")) ||
          String(item?.type || "").toLowerCase() === "video" ||
          String(item?.type || "")
            .toLowerCase()
            .includes("vídeo");

        // Vídeo: áudio diegético do arquivo (baixo sob a narração) + fades naturais.
        // Imagem: mudo — SFX vai na trilha sfxTracks quando houver.
        const defaultVideoBed = 0.28;
        const clipVolume = Number.isFinite(Number(item?.volume))
          ? Math.min(1, Math.max(0, Number(item.volume)))
          : assetIsVideo
            ? defaultVideoBed
            : 0;
        const clipRate = Number.isFinite(Number(item?.playback_rate))
          ? Math.min(2, Math.max(0.25, Number(item.playback_rate)))
          : 1;
        const fadeInS = assetIsVideo
          ? Number.isFinite(Number(item?.fade_in_s ?? item?.fadeInS))
            ? Math.max(0.05, Number(item.fade_in_s ?? item.fadeInS))
            : 0.32
          : 0;
        const fadeOutS = assetIsVideo
          ? Number.isFinite(Number(item?.fade_out_s ?? item?.fadeOutS))
            ? Math.max(0.05, Number(item.fade_out_s ?? item.fadeOutS))
            : 0.42
          : 0;

        scenes.push({
          block,

          scene_id: sceneId,

          asset: `projects/${projectSlug}/${copiedName}`,

          type: assetIsVideo ? "video" : "image",

          start: timing.start,

          duration: sceneDuration,

          durationLocked: isAssetDurationLocked(item),

          narrationText: prompt?.narration_text || "",

          editorNotes: prompt?.editor_notes || storyboard.editing_map || "",

          volume: clipVolume,

          playback_rate: clipRate,

          fadeInS,

          fadeOutS,

          motion_shot: prompt?.motion_shot || null,
          camera_move: prompt?.camera_move || undefined,
          transicao_entrada: prompt?.transicao_entrada || undefined,
        });
      });
    } else {
      let localStart = start;

      prompts.forEach((prompt, index) => {
        const sceneDuration = parseDurationSeconds(
          prompt?.duration,
          Math.max(2, duration / Math.max(1, prompts.length))
        );
        const sceneId = prompt?.scene
          ? String(prompt.scene).trim()
          : `${block}.${index + 1}`;

        scenes.push({
          block,

          scene_id: sceneId,

          asset: "",

          type: "image",

          start: localStart,

          duration: sceneDuration,

          narrationText: prompt?.narration_text || "",

          editorNotes: prompt?.editor_notes || storyboard.editing_map || "",

          motion_shot: prompt?.motion_shot || null,
          camera_move: prompt?.camera_move || undefined,
          transicao_entrada: prompt?.transicao_entrada || undefined,
        });

        localStart += sceneDuration;
      });
    }

    // Extend the last scene of this block if there is a gap before the next block

    const blockSceneEndIdx = scenes.length;

    const nextBlockStart = nextBlockStartForSync;

    if (
      !blockUsesSequentialFixedLayout(mappedAssets) &&
      !hasExplicitSync &&
      nextBlockStart !== null &&
      blockSceneEndIdx > blockSceneStartIdx
    ) {
      const lastSceneOfBlock = scenes[blockSceneEndIdx - 1];

      if (!lastSceneOfBlock.durationLocked) {
        const sceneEndTime = lastSceneOfBlock.start + lastSceneOfBlock.duration;

        if (nextBlockStart > sceneEndTime) {
          const gap = nextBlockStart - sceneEndTime;

          lastSceneOfBlock.duration += gap;
        }
      }
    }

    runningStart = Math.max(runningStart, start + duration);
  }

  let validScenes = useStudioRender
    ? scenes
    : scenes.filter(
        (scene) =>
          scene.asset || scene.type === "remotion" || scene.narrationText
      );

  // Shotcraft: injeta motion_shot / camera_move / transições do motion plan
  let motionPlanForRender = storyboard?.motion_plan || null;
  try {
    const resolved = resolveMotionPlanForRender(storyboard, config);
    if (resolved.storyboard) storyboard = resolved.storyboard;
    motionPlanForRender = resolved.motionPlan || motionPlanForRender;
    validScenes = enrichRemotionScenesWithMotionPlan(
      validScenes,
      motionPlanForRender
    );
    const shotN = validScenes.filter((s) => s.motion_shot).length;
    if (shotN > 0) {
      console.log(
        `[Remotion] Shotcraft: ${shotN}/${validScenes.length} cena(s) com motion_shot`
      );
    }
  } catch (motionErr) {
    console.warn(
      "[Remotion] Shotcraft motion plan (não bloqueante):",
      motionErr?.message || motionErr
    );
  }

  if (validScenes.length === 0) {
    throw new Error(
      "Nenhum asset mapeado encontrado na linha do tempo para renderizar via Remotion."
    );
  }

  const renderBlockNumbers = useStudioRender
    ? [
        ...new Set(validScenes.map((scene) => scene.block).filter(Boolean)),
      ].sort((a, b) => a - b)
    : blockNumbers;
  const effectiveBlockNumbers =
    renderBlockNumbers.length > 0 ? renderBlockNumbers : [1];

  const narrationSource = findProjectFile(
    projectDir,
    "narracao_mestra_premium.mp3"
  );

  const narration = copyRemotionAsset(
    narrationSource,
    publicProjectDir,
    "narration_"
  );

  const narrationDuration = narrationSource
    ? getAudioDuration(narrationSource)
    : 0;

  const coverageEnd = useStudioRender
    ? resolveStudioTotalDuration(timelineStudio, validScenes, narrationDuration)
    : Math.max(
        Number(timings.total_duration || 0),
        narrationDuration,
        ...validScenes.map((scene) => scene.start + scene.duration),
        1
      );
  if (!useStudioRender) {
    validScenes = fillSceneTimelineGaps(validScenes, coverageEnd);
  }

  const totalDurationBeforeLogo = useStudioRender
    ? resolveStudioTotalDuration(timelineStudio, validScenes, narrationDuration)
    : Math.max(
        Number(timings.total_duration || 0),

        ...validScenes.map((scene) => scene.start + scene.duration),

        narrationDuration,

        1
      );

  const globalConfigForLogo = loadRenderConfig(__dirname);
  const projectConfigForLogo = readProjectJson(
    projectDir,
    "config_qanat.json",
    {}
  );
  const renderTemplatePolicy =
    projectConfigForLogo.render_template_policy ||
    globalConfigForLogo.render_template_policy ||
    {};
  const endCardReplacesLogo =
    renderTemplatePolicy?.mode !== "legacy" &&
    renderTemplatePolicy?.end_card?.enabled === true &&
    renderTemplatePolicy?.end_card?.replace_brand_outro !== false;

  const logoSource = endCardReplacesLogo
    ? null
    : resolveLogoFilePath(
        WORKSPACE_DIR,
        projectDir,
        globalConfigForLogo,
        projectConfigForLogo
      ) || findProjectFile(projectDir, "logo.png");

  if (logoSource) {
    const copiedLogo = copyRemotionAsset(
      logoSource,
      publicProjectDir,
      "logo_final_"
    );

    if (copiedLogo) {
      validScenes.push({
        block: effectiveBlockNumbers.length + 1,

        asset: `projects/${projectSlug}/${copiedLogo}`,

        type: "image",

        start: totalDurationBeforeLogo,

        duration: LOGO_OUTRO_DURATION_SEC,

        narrationText: "",

        editorNotes: "zoom in, logo final da marca",
      });
    }
  }

  const totalDuration = useStudioRender
    ? resolveStudioTotalDuration(
        timelineStudio,
        validScenes,
        narrationDuration,
        0.25
      )
    : Math.max(
        Number(timings.total_duration || 0),

        resolveScenesTimelineEnd(validScenes),

        narrationDuration,

        1
      );

  const blockRanges = effectiveBlockNumbers.map((block) => {
    const blockIndex = Math.max(0, block - 1);

    const blockStart = Number(timings.starts?.[blockIndex]);

    const blockDuration = Number(timings.durations?.[blockIndex]);

    const scenesForBlock = validScenes.filter((scene) => scene.block === block);

    const start = Number.isFinite(blockStart)
      ? blockStart
      : Math.min(...scenesForBlock.map((scene) => scene.start));

    const duration = Number.isFinite(blockDuration)
      ? blockDuration
      : Math.max(
          ...scenesForBlock.map((scene) => scene.start + scene.duration)
        ) - start;

    return {
      block,
      start: Number.isFinite(start) ? start : 0,
      duration: Number.isFinite(duration) ? duration : totalDuration,
    };
  });

  const nicheMood = getEpidemicMoodForNiche(config.niche, config, storyboard);
  const sonoplastiaPlan = buildBlockSonoplastiaPlan({
    config,
    storyboard,
    blockNumbers: effectiveBlockNumbers,
    blockRanges,
    wordTranscripts,
    nicheMood,
  });
  for (const line of formatSonoplastiaLog(sonoplastiaPlan)) {
    console.log(line);
  }

  const bgmPlan = resolveBgmMappingsForRender(
    projectDir,
    config,
    effectiveBlockNumbers,
    storyboard
  );
  const bgmTracks = [];

  if (bgmPlan.mode === "single" && bgmPlan.single_bgm) {
    const source = findProjectFile(projectDir, bgmPlan.single_bgm);

    const copied = copyRemotionAsset(source, publicProjectDir, "bgm_single_");

    if (copied) {
      let startFrom = 0;

      try {
        const pythonPath = PYTHON_PATH || "python";

        const scriptPath = path.join(WORKSPACE_DIR, "mix_bgm.py");

        const singleClimaxMode =
          sonoplastiaPlan.get(effectiveBlockNumbers[0])?.climaxMode || "rise";
        const detectCmd = `"${pythonPath}" "${scriptPath}" --detect-climax "${source}" ${totalDuration} ${singleClimaxMode}`;

        const output = execSync(detectCmd, {
          encoding: "utf8",
          env: buildPythonSpawnEnv(),
        }).trim();

        const lines = output.split(/\r?\n/);

        const lastLine = lines[lines.length - 1].trim();

        const parsed = parseFloat(lastLine);

        if (Number.isFinite(parsed)) {
          startFrom = parsed;

          console.log(
            `[Remotion] BGM única: offset ${startFrom}s (modo ${singleClimaxMode})`
          );
        }
      } catch (e) {
        console.error("Error detecting BGM climax for Remotion:", e);
      }

      bgmTracks.push({
        block: 0,
        file: `projects/${projectSlug}/${copied}`,
        start: 0,
        duration: totalDuration,
        startFrom,
      });
    }
  } else if (bgmPlan.mode === "blocks" && Array.isArray(bgmPlan.mappings)) {
    for (const mapping of bgmPlan.mappings) {
      const block = Number(mapping?.block || 0);

      const range = blockRanges.find((item) => item.block === block);

      const source = findProjectFile(projectDir, mapping?.file);

      const copied = copyRemotionAsset(
        source,
        publicProjectDir,
        `bgm_b${block}_`
      );

      if (copied && range) {
        const blockSonoplastia = sonoplastiaPlan.get(block);
        let startFrom = 0;

        try {
          const pythonPath = PYTHON_PATH || "python";

          const scriptPath = path.join(WORKSPACE_DIR, "mix_bgm.py");

          const climaxMode = blockSonoplastia?.climaxMode || "peak";
          const detectCmd = `"${pythonPath}" "${scriptPath}" --detect-climax "${source}" ${range.duration} ${climaxMode}`;

          const output = execSync(detectCmd, {
            encoding: "utf8",
            env: buildPythonSpawnEnv(),
          }).trim();

          const lines = output.split(/\r?\n/);

          const lastLine = lines[lines.length - 1].trim();

          const parsed = parseFloat(lastLine);

          if (Number.isFinite(parsed)) {
            startFrom = parsed;

            console.log(
              `[Remotion] BGM bloco ${block}: offset ${startFrom}s (modo ${climaxMode}, mood ${blockSonoplastia?.mood || "neutral"})`
            );
          }
        } catch (e) {
          console.error(`Error detecting climax for block ${block}:`, e);
        }

        bgmTracks.push({
          block,
          file: `projects/${projectSlug}/${copied}`,
          start: range.start,
          duration: range.duration,
          startFrom,
          duckStrength: blockSonoplastia?.duckStrength || "normal",
          mood: blockSonoplastia?.mood || "neutral",
          climaxMode: blockSonoplastia?.climaxMode || "peak",
        });
      }
    }
  } else if (bgmPlan.mode === "emotion" && Array.isArray(bgmPlan.mappings)) {
    const emotionSegments = storyboard?.bgm_emotion_plan?.segments || [];
    const segmentById = new Map(
      emotionSegments.map((seg) => [String(seg.id), seg])
    );

    for (const mapping of bgmPlan.mappings) {
      const segmentId = String(mapping?.segment_id || mapping?.id || "");
      const segMeta = segmentById.get(segmentId) || {};
      const start = Number(mapping?.start ?? segMeta.start ?? 0);
      const duration = Number(
        mapping?.duration ??
          (Number.isFinite(segMeta.end) && Number.isFinite(segMeta.start)
            ? segMeta.end - segMeta.start
            : 0) ??
          Math.max(0, totalDuration - start)
      );
      const source = findProjectFile(projectDir, mapping?.file);
      const copied = copyRemotionAsset(
        source,
        publicProjectDir,
        `bgm_${segmentId || "seg"}_`
      );
      if (!copied || duration <= 0) continue;

      const climaxMode = mapping?.climax_mode || segMeta.climax_mode || "rise";
      const duckStrength =
        mapping?.duck_strength || segMeta.duck_strength || "normal";
      const emotion = mapping?.emotion || segMeta.emotion || "neutral";
      let startFrom = 0;

      try {
        const pythonPath = PYTHON_PATH || "python";
        const scriptPath = path.join(WORKSPACE_DIR, "mix_bgm.py");
        const detectCmd = `"${pythonPath}" "${scriptPath}" --detect-climax "${source}" ${duration} ${climaxMode}`;
        const output = execSync(detectCmd, {
          encoding: "utf8",
          env: buildPythonSpawnEnv(),
        }).trim();
        const lines = output.split(/\r?\n/);
        const lastLine = lines[lines.length - 1].trim();
        const parsed = parseFloat(lastLine);
        if (Number.isFinite(parsed)) {
          startFrom = parsed;
          console.log(
            `[Remotion] BGM emoção ${segmentId}: offset ${startFrom}s (modo ${climaxMode}, ${emotion})`
          );
        }
      } catch (e) {
        console.error(
          `Error detecting climax for emotion segment ${segmentId}:`,
          e
        );
      }

      bgmTracks.push({
        block: 0,
        segmentId,
        file: `projects/${projectSlug}/${copied}`,
        start,
        duration,
        startFrom,
        duckStrength: duckStrength === "strong" ? "normal" : duckStrength,
        mood: emotion,
        climaxMode,
        fadeInS: Number(mapping?.fade_in_s ?? segMeta.fade_in_s) || 2.5,
        fadeOutS: Number(mapping?.fade_out_s ?? segMeta.fade_out_s) || 4,
      });
    }
  }

  // Keep the last BGM from running past its own block into unrelated narration.

  if (bgmTracks.length > 0) {
    const lastBgm = bgmTracks[bgmTracks.length - 1];

    lastBgm.duration = Math.max(
      0.5,
      Math.min(lastBgm.duration, totalDuration - lastBgm.start)
    );
  }

  const sfxTracks = collectRemotionSfxTracks(
    projectDir,
    publicProjectDir,
    projectSlug,
    totalDuration
  );
  const bgmDuckPoints = buildBgmDuckPoints([], wordTranscripts);

  let youtubeChannelInfo = null;
  try {
    youtubeChannelInfo = await resolveYoutubeChannelInfo(
      projectDir,
      publicProjectDir,
      projectSlug,
      globalConfig
    );
  } catch (e) {
    console.warn(
      "[Remotion] Falha ao resolver YouTube channel info:",
      e.message
    );
  }

  let rawCaptions;
  if (useStudioRender) {
    // O Whisper é a fonte de verdade. A trilha de captions do Studio pode ter
    // sido criada por uma sincronização antiga e conter sobras corrompidas.
    rawCaptions = captionsFromWordTranscripts(wordTranscripts);
    if (rawCaptions.length === 0) {
      rawCaptions = buildCaptionsFromStudio(timelineStudio);
    }
    if (rawCaptions.length === 0) {
      rawCaptions = fallbackCaptionsFromScenes(validScenes);
    }
  } else {
    const captions = captionsFromWordTranscripts(wordTranscripts);
    rawCaptions =
      captions.length > 0 ? captions : fallbackCaptionsFromScenes(validScenes);
  }

  // Legendas pertencem à narração, não à duração visual da timeline/outro.
  // Usar totalDuration aqui fazia palavras residuais reaparecerem rapidamente
  // depois que o MP3 já havia terminado.
  const captionMaxDuration =
    Number(narrationDuration) > 0
      ? Number(narrationDuration)
      : Number(totalDuration) || 0;
  const finalCaptions = sanitizeCaptionsForRemotion(
    rawCaptions,
    captionMaxDuration
  );

  const format = useStudioRender
    ? resolveStudioFormat(timelineStudio, config)
    : config.aspect_ratio === "16:9"
      ? "16:9"
      : "9:16";

  const aiOverlaysOn = isAiOverlaysEnabled(config);
  const freshSb = aiOverlaysOn
    ? readProjectJson(projectDir, "storyboard.json", {})
    : stripAiOverlaysFromStoryboard(
        readProjectJson(projectDir, "storyboard.json", {})
      );
  const plannedRaw =
    aiOverlaysOn &&
    Array.isArray(freshSb.overlays_ai) &&
    freshSb.overlays_ai.length > 0
      ? freshSb.overlays_ai
      : aiOverlaysOn &&
          Array.isArray(freshSb.overlays) &&
          freshSb.overlays.length > 0
        ? stripSystemInjectedOverlays(freshSb.overlays)
        : [];

  const overlayMediaCtx = {
    projectDir,
    publicProjectDir,
    projectSlug,
    fps: targetFps,
  };

  let overlays = [];
  if (useStudioRender) {
    overlays = buildOverlaysFromStudio(timelineStudio, {
      projectDir,
      publicProjectDir,
      projectSlug,
      copyRemotionAsset,
      findProjectFile,
    })
      .map((overlay) =>
        copyOverlayMediaPropsForRemotion(overlay, overlayMediaCtx)
      )
      .map((overlay) => repairOverlayPropsForRemotion(overlay))
      .filter(Boolean);
    const legacyMediaPaths = new Set();
    for (const overlay of overlays) {
      collectRelativeMediaPaths(overlay?.props, legacyMediaPaths);
    }
    if (legacyMediaPaths.size > 0) {
      const mirrored = mirrorRelativeAssetsToRemotionPublic(
        [...legacyMediaPaths],
        projectDir,
        REMOTION_PUBLIC_DIR,
        targetFps
      );
      if (mirrored.length > 0) {
        console.log(
          `[Remotion Render] ${mirrored.length} asset(s) legado(s) espelhado(s) em public/ (${mirrored.join(", ")})`
        );
      } else {
        console.warn(
          `[Remotion Render] ${legacyMediaPaths.size} path(s) ASSETS/ sem cópia em public/projects — verifique arquivos no disco.`
        );
      }
    }
    console.log(
      `[Remotion Render] ${overlays.length} overlay(s) do Timeline Studio (timing manual).`
    );
  } else if (
    Array.isArray(freshSb.motion_scenes) &&
    freshSb.motion_scenes.length > 0
  ) {
    overlays = buildOverlaysFromStudio(
      { clips: motionScenesToMotionClips(freshSb.motion_scenes) },
      overlayMediaCtx
    )
      .map((overlay) =>
        copyOverlayMediaPropsForRemotion(overlay, overlayMediaCtx)
      )
      .map((overlay) => repairOverlayPropsForRemotion(overlay))
      .filter(Boolean);
    console.log(
      `[Remotion Render] ${overlays.length} template(s) Remotion a partir de motion_scenes.`
    );
  } else if (plannedRaw.length > 0) {
    console.log(
      `[Remotion Render] Alinhando ${plannedRaw.length} overlays informativos com a linha do tempo física.`
    );
    const starts = Array.isArray(timings.starts) ? timings.starts : [];
    const durations = Array.isArray(timings.durations) ? timings.durations : [];

    // Alinha os overlays com os tempos físicos das cenas
    const realigned = repairOverlaysEncoding(
      normalizeGeminiOverlayPayload(
        realignPlannedOverlays(
          plannedRaw,
          validScenes,
          freshSb,
          starts,
          durations,
          wordTranscripts,
          config
        )
      )
    );

    const orchestrationPlanEarly = buildOverlayOrchestrationPlan({
      config,
      niche: config.niche || "Geral",
      totalDuration,
      projectName: path.basename(projectDir),
      sceneCount: validScenes.length,
      blockCount: Array.isArray(config.block_phrases)
        ? config.block_phrases.length
        : 0,
    });

    overlays = finalizeProjectOverlays(
      projectDir,
      realigned,
      config,
      freshSb,
      starts,
      durations,
      orchestrationPlanEarly,
      totalDuration
    );
  } else {
    console.log(
      "[Remotion Render] Nenhum overlay planejado encontrado no storyboard.json."
    );
  }

  overlays = overlays.map((overlay) =>
    copyOverlayMediaPropsForRemotion(overlay, overlayMediaCtx)
  );

  if (!useStudioRender) {
    // Update storyboard overlays with aligned rendering overlays
    storyboard.overlays = overlays;
    storyboard.quality_report =
      freshSb.quality_report || storyboard.quality_report;
    try {
      fs.writeFileSync(
        path.join(projectDir, "storyboard.json"),
        JSON.stringify(storyboard, null, 2),
        "utf8"
      );
    } catch (e) {
      console.error("Error writing storyboard overlays:", e);
    }
  }

  // Analyze and log overlay exhibition times and detect any concurrent conflict
  logOverlayTimingAndConflicts(
    overlays,
    timings.starts || [],
    timings.durations || []
  );

  const resolution = options.resolution === "2k" ? "2k" : "1080p";
  const captionSettings = resolveCaptionRenderSettings(config, format);

  const props = {
    projectName: path.basename(projectDir),
    format,
    resolution,
    fps: targetFps,
    totalDuration,
    scenes: validScenes,
    captions: finalCaptions,
    narration: narration ? `projects/${projectSlug}/${narration}` : null,
    narrationDuration: narrationDuration || 0,
    bgmTracks,
    sfxTracks,
    // Shotcraft motion plan (abertura/cenas/encerramento + palette)
    motionPlan: motionPlanForRender || null,
    editingMap: storyboard.editing_map || storyboard.hyperframe_prompt || "",
    musicVolume: resolveMusicVolumeForRender(
      config,
      format,
      globalConfig.musicVolume
    ),
    debugOverlay: globalConfig.debugOverlay,
    overlays,
    youtubeChannelInfo,
    transparent: isProres,
    captionStyle: captionSettings.captionStyle,
    captionMode: captionSettings.captionMode,
    captionEffect: captionSettings.captionEffect,
    captionMaxWordsPerChunk: captionSettings.captionMaxWordsPerChunk,
    captionMaxLines: captionSettings.captionMaxLines,
    captionRespectSentences: captionSettings.captionRespectSentences,
    designPreset: config.design_preset || null,
    grainOverlay:
      config.grain_overlay === true ||
      (config.grain_overlay !== false && format === "9:16"),
    vignette: config.vignette !== false,
    showProgressBar: format === "16:9" && config.progress_bar !== false,
    blockProgressBar: (() => {
      const bar = resolveBlockProgressBarForRender(projectDir, readProjectJson);
      if (!bar || bar.showChannelLogo !== true) return bar;
      const logoSource =
        resolveLogoFilePath(
          WORKSPACE_DIR,
          projectDir,
          globalConfigForLogo,
          projectConfigForLogo
        ) || findProjectFile(projectDir, "logo.png");
      if (!logoSource) return bar;
      const copied = copyRemotionAsset(
        logoSource,
        publicProjectDir,
        "bar_logo_"
      );
      if (!copied) return bar;
      return { ...bar, channelLogoSrc: `projects/${projectSlug}/${copied}` };
    })(),
    accentColor: config.accent_color || "#C5A880",
    shortsZoomIntensity: config.shorts_zoom_intensity || "normal",
    longZoomIntensity: config.long_zoom_intensity || "normal",
    bgmDuckStrength: ["light", "strong"].includes(config.bgm_duck_strength)
      ? config.bgm_duck_strength
      : "normal",
    shortsHookFlash: config.shorts_hook_flash !== false,
    shortsEdgeGlow: config.shorts_edge_glow === true,
    shortsCaptionBgmPulse: captionSettings.shortsCaptionBgmPulse,
    shortsPortalTransition: config.shorts_portal_transition !== false,
    shortsPortalEvery: Math.max(
      3,
      Math.min(5, Number(config.shorts_portal_every) || 4)
    ),
    bgmDuckPoints,
    canvasBackground: config.canvas_background || "#050506",
  };

  // Intro / end card: segmentos exclusivos (não cobrem B-roll; intro sem áudio; end só música)
  let finalProps = alignExclusiveAudioTimeline(
    props,
    applyExclusiveIntroEndToRemotionProps(props)
  );
  if (finalProps.exclusiveLayout) {
    console.log(
      `[Remotion] Layout exclusivo: intro ${finalProps.exclusiveLayout.introDur}s · conteúdo até ${Number(finalProps.exclusiveLayout.contentEnd).toFixed(1)}s · end card ${finalProps.exclusiveLayout.endDur}s · total ${Number(finalProps.totalDuration).toFixed(1)}s`
    );
  }
  if (options.previewDuration) {
    finalProps = truncatePropsForPreview(finalProps, options.previewDuration);
    console.log(`[Remotion] Modo preview: ${options.previewDuration}s`);
  }

  const propsPath = path.join(publicProjectDir, "props.json");

  fs.writeFileSync(propsPath, JSON.stringify(finalProps, null, 2), "utf8");

  const outputDir = path.join(projectDir, "OUTPUT", "qanat_persa_video_final");

  fs.mkdirSync(outputDir, { recursive: true });

  const fileExt = isProres ? "mov" : "mp4";
  let outputPath = path.join(outputDir, `remotion_${Date.now()}.${fileExt}`);
  let sampleMeta = null;

  if (options.sampleRender) {
    const sampleDir = path.join(projectDir, "ASSETS", "sample");
    fs.mkdirSync(sampleDir, { recursive: true });
    const sbPath = path.join(projectDir, "storyboard.json");
    let sb = readProjectJson(projectDir, "storyboard.json", {});
    const version = (Number(sb.sample_version) || 0) + 1;
    outputPath = path.join(sampleDir, `sample_v${version}.${fileExt}`);
    const at = new Date().toISOString();
    sb.sample_version = version;
    sb.sample_last_render_at = at;
    sb.sample_renders = Array.isArray(sb.sample_renders)
      ? sb.sample_renders
      : [];
    sb.sample_renders.push({
      version,
      file: `ASSETS/sample/sample_v${version}.${fileExt}`,
      seconds: options.previewDuration || 12,
      at,
    });
    try {
      fs.writeFileSync(sbPath, JSON.stringify(sb, null, 2), "utf8");
    } catch (e) {
      console.warn("[Remotion] Falha ao salvar sample metadata:", e.message);
    }
    sampleMeta = { version, seconds: options.previewDuration || 12 };
  }

  return {
    propsPath,
    outputPath,
    sampleMeta,
    totalDuration: Number(finalProps.totalDuration) || totalDuration,
    exclusiveLayout: finalProps.exclusiveLayout || null,
    sceneCount: Array.isArray(finalProps.scenes)
      ? finalProps.scenes.length
      : validScenes.length,
    captionCount: finalCaptions.length,
    sfxCount: sfxTracks.length,
    overlayCount: Array.isArray(overlays) ? overlays.length : 0,
    informativeOverlayCount: Array.isArray(overlays)
      ? overlays.filter(isInformativeOverlay).length
      : 0,
    overlayTimingReport:
      freshSb.overlay_timing_report || storyboard.overlay_timing_report || null,
    bgmTrackCount: bgmTracks.length,
    bgmSource: bgmPlan.source,
    bgmMode: bgmPlan.mode,
    bgmTrackSummary: bgmTracks.map(
      (track) =>
        `${track.segmentId || `bloco-${track.block}`}: ${path.basename(track.file)} @${Number(track.start).toFixed(1)}s (${Number(track.duration).toFixed(1)}s)`
    ),
    sonoplastiaLog: formatSonoplastiaLog(sonoplastiaPlan),
  };
}

function getMediaTypeFromName(fileName) {
  const ext = path.extname(fileName).toLowerCase();

  if ([".mp4", ".mov", ".webm", ".mkv"].includes(ext)) return "video";

  if (ext === ".svg") return "svg";

  return "image";
}

function listProjectMediaAssets(projectDir) {
  const assetsDir = path.join(projectDir, "ASSETS");

  const assetFiles = [];

  if (!fs.existsSync(assetsDir)) return assetFiles;

  const scan = (dir) => {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      if (fs.statSync(fullPath).isDirectory()) {
        scan(fullPath);
      } else {
        const rel = path.relative(assetsDir, fullPath).replace(/\\/g, "/");

        const ext = path.extname(rel).toLowerCase();

        if (
          rel.toLowerCase() === "logo.png" ||
          path.basename(rel).toLowerCase() === "logo.png"
        ) {
          continue;
        }

        if (
          [
            ".mp4",
            ".mov",
            ".webm",
            ".mkv",
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            ".svg",
          ].includes(ext)
        ) {
          assetFiles.push({
            rel,

            mtime: fs.statSync(fullPath).mtimeMs,
          });
        }
      }
    }
  };

  scan(assetsDir);

  const getAssetSortKey = (filename, mtime) => {
    const baseName = path.basename(filename);

    // Matches 12 to 14 digit timestamps e.g. 202606231437

    const match = baseName.match(/_?(\d{12,14})(?=\.[a-zA-Z0-9]+$)/);

    if (match) {
      return { timestamp: Number(match[1]), mtime };
    }

    const fallbackMatch = baseName.match(/(\d{8,14})/);

    if (fallbackMatch) {
      return { timestamp: Number(fallbackMatch[1]), mtime };
    }

    return { timestamp: 0, mtime };
  };

  return assetFiles

    .sort((a, b) => {
      const keyA = getAssetSortKey(a.rel, a.mtime);

      const keyB = getAssetSortKey(b.rel, b.mtime);

      if (keyA.timestamp > 0 && keyB.timestamp > 0) {
        if (keyA.timestamp !== keyB.timestamp) {
          return keyA.timestamp - keyB.timestamp;
        }
      }

      return keyA.mtime - keyB.mtime;
    })

    .map((x) => x.rel);
}

function syncStoryboardAssetsFromTimeline(projDir) {
  const configPath = path.join(projDir, "config_qanat.json");
  const storyboardPath = path.join(projDir, "storyboard.json");
  if (!fs.existsSync(configPath) || !fs.existsSync(storyboardPath))
    return false;

  const config = readProjectJson(projDir, "config_qanat.json", {});
  const storyboard = readProjectJson(projDir, "storyboard.json", {});
  if (!Array.isArray(storyboard.visual_prompts)) return false;

  const bound = bindStoryboardAssetsFromTimeline(
    storyboard.visual_prompts,
    config.timeline_assets || {}
  );
  if (!bound.updated) return false;

  storyboard.visual_prompts = bound.visualPrompts;
  fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2), "utf8");
  console.log("[Timeline] Storyboard atualizado a partir da timeline_assets.");
  return true;
}

function buildTimelineFromStoryboard(
  projectDir,
  { remapping = false, rotateOffset = null } = {}
) {
  const config = readProjectJson(projectDir, "config_qanat.json", {});
  const storyboard = readProjectJson(projectDir, "storyboard.json", {});
  const timings = readProjectJson(projectDir, "block_timings.json", {
    durations: [],
  });
  const assetFiles = listProjectMediaAssets(projectDir);
  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];

  if (assetFiles.length === 0) {
    console.log(
      "[Timeline] Nenhum arquivo de mídia encontrado em ASSETS. Mapeando apenas os prompts visuais como placeholders."
    );
  }

  const promptsByBlock = new Map();
  for (const prompt of visualPrompts) {
    // Keyframes POV (A_START / ponte / B_END) = só prompt para gerar vídeo, não slot de upload
    if (
      prompt?.prompt_only === true ||
      prompt?.exclude_from_timeline === true ||
      prompt?.pov_keyframe === true ||
      prompt?.is_pov_keyframe === true ||
      String(prompt?.scene_kind || "").toLowerCase() === "pov_keyframe"
    ) {
      continue;
    }
    const block = Number(prompt?.block || 1);
    if (!promptsByBlock.has(block)) promptsByBlock.set(block, []);
    promptsByBlock.get(block).push(prompt);
  }

  let blocks = [...promptsByBlock.keys()].sort((a, b) => a - b);
  if (blocks.length === 0) {
    const totalBlocks =
      Array.isArray(config.block_phrases) && config.block_phrases.length > 0
        ? config.block_phrases.length
        : 12;
    blocks = Array.from({ length: totalBlocks }, (_, index) => index + 1);
  }

  const offset =
    rotateOffset !== null
      ? Number(rotateOffset) || 0
      : remapping
        ? Number(config.timeline_map_epoch || 0)
        : 0;
  const mapped = buildTimelineAssetMap({
    blocks,
    promptsByBlock,
    existingTimeline: config.timeline_assets || {},
    assetFiles,
    timings,
    remapping,
    rotateOffset: offset,
    stockRegistry: loadStockUsageRegistry(WORKSPACE_DIR),
    currentProject: path.basename(projectDir),
  });

  return {
    timelineAssets: mapped.timelineAssets,
    assetCount: assetFiles.length,
    warnings: mapped.warnings,
  };
}

function getOpenRouterApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.OPENROUTER_API_KEY) {
    return String(process.env.OPENROUTER_API_KEY).trim() || null;
  }

  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    const k = config?.openrouter_api_key;
    return typeof k === "string" && k.trim() ? k.trim() : null;
  };

  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));
  if (projectKey) return projectKey;

  if (projectDir !== WORKSPACE_DIR) {
    const rootKey = readConfigKey(
      path.join(WORKSPACE_DIR, "config_qanat.json")
    );
    if (rootKey) return rootKey;
  }

  // Fallback: chave embutida (NÃO remover) — usada se o usuário não colar a própria
  return OPENROUTER_DEFAULT_KEY || null;
}

/** true se existe chave do usuário no config/env (não conta só a embutida). */
function hasUserOpenRouterApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.OPENROUTER_API_KEY) return true;
  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    const k = config?.openrouter_api_key;
    return typeof k === "string" && k.trim().length > 0;
  };
  if (readConfigKey(path.join(projectDir, "config_qanat.json"))) return true;
  if (
    projectDir !== WORKSPACE_DIR &&
    readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json"))
  )
    return true;
  return false;
}

function convertGeminiToOpenRouterMessages(promptOrBody, bodyOverride) {
  const messages = [];

  const partsToText = (parts) =>
    (Array.isArray(parts) ? parts : [])
      .map((p) => (p && typeof p.text === "string" ? p.text : ""))
      .filter(Boolean)
      .join("\n");

  if (bodyOverride?.systemInstruction?.parts) {
    const sys = partsToText(bodyOverride.systemInstruction.parts);
    if (sys) messages.push({ role: "system", content: sys });
  } else if (bodyOverride?.system_instruction?.parts) {
    const sys = partsToText(bodyOverride.system_instruction.parts);
    if (sys) messages.push({ role: "system", content: sys });
  }

  if (bodyOverride?.contents && Array.isArray(bodyOverride.contents)) {
    for (const item of bodyOverride.contents) {
      const role = item.role === "model" ? "assistant" : "user";
      // Junta TODAS as parts de texto (antes só pegava a 1ª — truncava prompts longos)
      const content = partsToText(item.parts);
      if (content) messages.push({ role, content });
    }
  } else if (promptOrBody) {
    messages.push({
      role: "user",
      content: String(promptOrBody),
    });
  }

  return messages;
}

async function callOpenRouterWithRetry(
  promptOrBody,
  {
    maxRetries = 2,
    bodyOverride = null,
    projectDir = WORKSPACE_DIR,
    temperature = null,
    models = null,
    maxTokens = null,
  } = {}
) {
  const apiKey = getOpenRouterApiKey(projectDir);

  const messages = convertGeminiToOpenRouterMessages(
    promptOrBody,
    bodyOverride
  );

  let lastError = null;
  const modelList =
    Array.isArray(models) && models.length
      ? models
      : getOpenRouterModelChain(projectDir);
  const tokenLimit = Math.max(256, Math.min(32000, Number(maxTokens) || 8192));

  for (const model of modelList) {
    console.log("\n==================================================");

    console.log(`[OpenRouter] ATIVO - TENTANDO MODELO: ${model}`);

    console.log("==================================================");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",

              Authorization: `Bearer ${apiKey}`,

              "HTTP-Referer":
                "https://github.com/leonardosalves/BURACOS-NO-DESERTO",

              "X-Title": "Lumiera Cinematic Studio",
            },

            body: JSON.stringify({
              model: model,
              messages: messages,
              max_tokens: tokenLimit,
              ...(temperature !== null ? { temperature } : {}),
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();

          const msg = result.choices?.[0]?.message || {};
          // Alguns modelos devolvem content como array de parts
          let responseText = "";
          if (typeof msg.content === "string") {
            responseText = msg.content;
          } else if (Array.isArray(msg.content)) {
            responseText = msg.content
              .map((p) => (typeof p === "string" ? p : p?.text || ""))
              .join("");
          } else {
            responseText = msg.content || msg.reasoning || "";
          }

          responseText = String(responseText || "")
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

          // Resposta vazia NÃO é sucesso (causava "uncertain" / contingência)
          if (!responseText || responseText.length < 8) {
            lastError = new Error(
              `OpenRouter [${model}]: resposta vazia ou truncada`
            );
            console.warn(
              `[OpenRouter] ${model} retornou vazio (tentativa ${attempt}/${maxRetries})`
            );
            break;
          }

          console.log("\n==================================================");

          console.log(`[OpenRouter] SUCESSO - MODELO EM USO: ${model}`);

          console.log(
            `[OpenRouter] Sucesso na tentativa ${attempt} do modelo ${model} (${responseText.length} chars)`
          );

          console.log("==================================================");

          return responseText;
        }

        const errData = await response.json().catch(() => ({}));

        const errRaw =
          errData.error?.metadata?.raw ||
          errData.error?.message ||
          response.statusText;
        const errMsg = String(errRaw || response.statusText);
        const status =
          Number(errData.error?.code || response.status) || response.status;

        console.warn(
          `[OpenRouter] Erro ${status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg}`
        );

        lastError = new Error(`OpenRouter [${model}]: ${errMsg}`);

        const lower = errMsg.toLowerCase();
        const isQuotaOrRateLimit =
          status === 429 ||
          status === 403 ||
          status === 402 ||
          lower.includes("quota") ||
          lower.includes("credit") ||
          lower.includes("rate-limited") ||
          lower.includes("rate limit") ||
          lower.includes("provider returned error");

        const isUnavailableOrNotFound =
          status === 404 ||
          status === 400 ||
          status === 401 ||
          status === 410 ||
          lower.includes("unavailable") ||
          lower.includes("no endpoints found") ||
          lower.includes("no longer available") ||
          lower.includes("not a free model");

        if (isQuotaOrRateLimit || isUnavailableOrNotFound) {
          console.warn(
            `[OpenRouter] Erro crítico/limite/indisponibilidade detectado para ${model} (${status}: ${errMsg}). Rotacionando imediatamente...`
          );

          // Respeita Retry-After em 429 (free tier)
          const retryAfter =
            Number(errData.error?.metadata?.retry_after_seconds) || 0;
          if (retryAfter > 0 && retryAfter < 15) {
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
          }

          break;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);

        await new Promise((r) => setTimeout(r, delay));
      } catch (err) {
        console.error(
          `[OpenRouter] Exceção na tentativa ${attempt} para ${model}:`,
          err.message
        );

        lastError = err;
      }
    }

    console.warn(
      `[OpenRouter] Todas as tentativas falharam para o modelo ${model}. Tentando o proximo...`
    );
  }

  throw (
    lastError ||
    new Error(
      "Todos os modelos OpenRouter livres falharam após múltiplas tentativas."
    )
  );
}

// Ordem: melhor qualidade → mais simples (NIM free em build.nvidia.com).
// IDs testados com integrate.api.nvidia.com — modelos EOL/404 removidos.
const NVIDIA_MODEL_OPTIONS = [
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    label: "Nemotron 3 Super 120B",
    hint: "Maior Nemotron — agentes, planning e coding pesado",
  },
  {
    id: "minimaxai/minimax-m2.7",
    label: "MiniMax M2.7",
    hint: "Excelente em coding, raciocínio e tarefas de escritório",
  },
  {
    id: "minimaxai/minimax-m3",
    label: "MiniMax M3",
    hint: "Multimodal MoE — coding + tool-calling (estável)",
  },
  {
    id: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    label: "Nemotron Super 49B v1.5",
    hint: "NVIDIA — precisão alta em chat e function calling",
  },
  {
    id: "nvidia/llama-3.3-nemotron-super-49b-v1",
    label: "Nemotron Super 49B v1",
    hint: "NVIDIA — reasoning, tool calling e instruções",
  },
  {
    id: "openai/gpt-oss-120b",
    label: "gpt-oss-120b",
    hint: "MoE reasoning (texto)",
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B Instruct",
    hint: "Instruções gerais e function calling",
  },
  {
    id: "nvidia/mistral-nemotron",
    label: "Mistral Nemotron",
    hint: "Coding, instruction following e function calling",
  },
  {
    id: "google/gemma-4-31b-it",
    label: "Gemma 4 31B IT",
    hint: "Coding e workflows agentic",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b",
    label: "Nemotron 3 Nano 30B",
    hint: "Coding, tool calling, contexto longo",
  },
  {
    id: "meta/llama-4-maverick-17b-128e-instruct",
    label: "Llama 4 Maverick 17B",
    hint: "Multimodal MoE — uso geral",
  },
  {
    id: "openai/gpt-oss-20b",
    label: "gpt-oss-20b",
    hint: "Reasoning compacto",
  },
  {
    id: "poolside/laguna-xs-2.1",
    label: "Laguna XS 2.1",
    hint: "Coding agentic / terminal tasks",
  },
  {
    id: "nvidia/nemotron-mini-4b-instruct",
    label: "Nemotron Mini 4B",
    hint: "Leve — RAG e function calling",
  },
];

const NVIDIA_MODELS = NVIDIA_MODEL_OPTIONS.map((option) => option.id);

const DEFAULT_NVIDIA_MODEL = NVIDIA_MODELS[0];

const INFERENCE_API_BASE = "https://api.inference.net/v1";

const DEFAULT_INFERENCE_MODEL = "meta-llama/llama-3.3-70b-instruct";

const INFERENCE_MODEL_OPTIONS = [
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B Instruct",
    hint: "Maior modelo — alto desempenho em instruções",
  },
  {
    id: "deepseek/deepseek-v3",
    label: "DeepSeek V3",
    hint: "Modelo avançado de raciocínio",
  },
  {
    id: "qwen/qwen3-32b",
    label: "Qwen3 32B",
    hint: "Forte em raciocínio, código e instruções longas",
  },
  {
    id: "google/gemma-3-27b-instruct/bf-16",
    label: "Gemma 3 27B Instruct",
    hint: "Bom equilíbrio velocidade/qualidade",
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct-2503",
    label: "Mistral Small 3.1 24B",
    hint: "Compacto e rápido para alto volume",
  },
];

const INFERENCE_MODEL_FALLBACKS = INFERENCE_MODEL_OPTIONS.map(
  (option) => option.id
);

async function callNvidiaWithRetry(
  promptOrBody,
  {
    maxRetries = 3,
    bodyOverride = null,
    projectDir = WORKSPACE_DIR,
    temperature = null,
    models = null,
    maxTokens = null,
  } = {}
) {
  const apiKey = getNvidiaApiKey(projectDir);
  if (!apiKey) {
    throw new Error("Chave de API da NVIDIA não configurada.");
  }

  const messages = convertGeminiToOpenRouterMessages(
    promptOrBody,
    bodyOverride
  );
  const tokenLimit = Math.max(256, Math.min(32000, Number(maxTokens) || 8192));
  let lastError = null;
  const modelList =
    Array.isArray(models) && models.length
      ? models
      : getNvidiaModelChain(projectDir);

  for (const model of modelList) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[NVIDIA API] Tentando modelo: ${model} (Tentativa ${attempt}/${maxRetries})`
        );
        const response = await fetch(
          "https://integrate.api.nvidia.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: model,
              messages: messages,
              max_tokens: tokenLimit,
              ...(temperature !== null ? { temperature } : {}),
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const msg = result.choices?.[0]?.message || {};
          let responseText = typeof msg.content === "string" ? msg.content : "";
          if (!responseText && Array.isArray(msg.content)) {
            responseText = msg.content
              .map((part) => part?.text || part?.content || "")
              .join("\n");
          }
          if (!responseText) {
            responseText = msg.reasoning_content || msg.reasoning || "";
          }
          responseText = responseText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          if (responseText) {
            console.log(
              `[NVIDIA API] Sucesso com modelo=${model} na tentativa ${attempt} (${responseText.length} chars)`
            );
            return responseText;
          }
          console.warn(
            `[NVIDIA API] ${model} retornou vazio na tentativa ${attempt}/${maxRetries}`
          );
        }

        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || response.statusText;
        lastError = new Error(`${model}: ${errMsg}`);
        console.warn(
          `[NVIDIA API] ${response.status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg}`
        );

        if (response.status === 503 || response.status === 429) {
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        break; // Don't retry if it's a 400/401/403/etc. error
      } catch (err) {
        lastError = err;
        console.warn(
          `[NVIDIA API] Erro na tentativa ${attempt} para ${model}: ${err.message}`
        );
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw (
    lastError ||
    new Error("Falha ao chamar NVIDIA API após múltiplas tentativas.")
  );
}

async function callInferenceWithRetry(
  promptOrBody,
  {
    maxRetries = 3,
    bodyOverride = null,
    projectDir = WORKSPACE_DIR,
    temperature = null,
    models = null,
  } = {}
) {
  const apiKey = getInferenceApiKey(projectDir);
  if (!apiKey) {
    throw new Error("Chave de API da Inference.net não configurada.");
  }

  const messages = convertGeminiToOpenRouterMessages(
    promptOrBody,
    bodyOverride
  );
  let lastError = null;
  const modelList = getInferenceModelChain(projectDir, models);

  for (const model of modelList) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[Inference.net] Tentando modelo: ${model} (Tentativa ${attempt}/${maxRetries})`
        );
        const response = await fetch(`${INFERENCE_API_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            ...(temperature !== null ? { temperature } : {}),
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const msg = result.choices?.[0]?.message || {};
          let responseText = typeof msg.content === "string" ? msg.content : "";
          if (!responseText && Array.isArray(msg.content)) {
            responseText = msg.content
              .map((part) => part?.text || part?.content || "")
              .join("\n");
          }
          responseText = responseText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          if (responseText) {
            console.log(
              `[Inference.net] Sucesso com modelo=${model} na tentativa ${attempt} (${responseText.length} chars)`
            );
            return responseText;
          }
          console.warn(
            `[Inference.net] ${model} retornou vazio na tentativa ${attempt}/${maxRetries}`
          );
        }

        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || response.statusText;
        lastError = new Error(`${model}: ${errMsg}`);
        console.warn(
          `[Inference.net] ${response.status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg}`
        );

        if (response.status === 503 || response.status === 429) {
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `[Inference.net] Erro na tentativa ${attempt} para ${model}: ${err.message}`
        );
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw (
    lastError ||
    new Error("Falha ao chamar Inference.net após múltiplas tentativas.")
  );
}

const XAI_MODELS = [
  "grok-4.3",
  "grok-2-latest",
  "grok-2-1212",
  "grok-2",
  "grok-beta",
];

/** Alibaba Cloud Model Studio / DashScope (Qwen) — OpenAI-compatible. */
const ALIBABA_DEFAULT_BASE_URL =
  "https://ws-7pwlysxpwyxkd7j2.cn-beijing.maas.aliyuncs.com/compatible-mode/v1";

const ALIBABA_MODEL_OPTIONS = [
  {
    id: "qwen3-max",
    label: "Qwen3-Max",
    hint: "Máxima qualidade — geração Qwen3",
  },
  {
    id: "qwen-max",
    label: "Qwen-Max",
    hint: "Máxima qualidade Alibaba (estável)",
  },
  {
    id: "qwen3-coder-plus",
    label: "Qwen3-Coder-Plus",
    hint: "Código / JSON estruturado",
  },
  {
    id: "qwen-plus-latest",
    label: "Qwen-Plus Latest",
    hint: "Sempre a revisão mais recente do Plus",
  },
  {
    id: "qwen-plus",
    label: "Qwen-Plus",
    hint: "Equilíbrio custo/qualidade — padrão Model Studio",
  },
  {
    id: "qwen-long",
    label: "Qwen-Long",
    hint: "Contexto longo (roteiros extensos)",
  },
  {
    id: "qwen-turbo-latest",
    label: "Qwen-Turbo Latest",
    hint: "Revisão mais recente do Turbo",
  },
  {
    id: "qwen-turbo",
    label: "Qwen-Turbo",
    hint: "Mais rápido e barato para volume",
  },
];

const ALIBABA_MODELS = ALIBABA_MODEL_OPTIONS.map((o) => o.id);
const DEFAULT_ALIBABA_MODEL = ALIBABA_MODELS[0];

/** OpenCode — Forge Gateway API (https://forge-gateway-api.fly.dev/v1) */
const OPENCODE_DEFAULT_BASE_URL = "https://forge-gateway-api.fly.dev/v1";
const DEFAULT_OPENCODE_API_KEY = "fg-05a25d51fb71453b9dbd04a8c59837f3";
const DEFAULT_OPENCODE_MODEL = "deepseek-v3";

const OPENCODE_MODEL_OPTIONS = [
  {
    id: "claude-opus-4-5-20251101",
    label: "Claude Opus 4.5",
    hint: "Máxima qualidade Anthropic",
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    hint: "Anthropic Sonnet 5",
  },
  {
    id: "claude-sonnet-4-6-thinking",
    label: "Claude Sonnet 4.6 Thinking",
    hint: "Anthropic Sonnet 4.6 Thinking",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    hint: "Anthropic Sonnet 4.6",
  },
  {
    id: "claude-sonnet-4-5-20250929",
    label: "Claude Sonnet 4.5",
    hint: "Anthropic Sonnet 4.5",
  },
  {
    id: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    hint: "Anthropic Haiku 4.5 — rápido",
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    hint: "OpenAI Luna",
  },
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    hint: "OpenAI Sol",
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    hint: "OpenAI Terra",
  },
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    hint: "OpenAI GPT-5.5",
  },
  {
    id: "gpt-5.3-codex",
    label: "GPT-5.3 Codex",
    hint: "OpenAI Codex",
  },
  {
    id: "grok-4.5",
    label: "Grok 4.5",
    hint: "xAI Grok 4.5",
  },
  {
    id: "grok-4.3",
    label: "Grok 4.3",
    hint: "xAI Grok 4.3",
  },
  {
    id: "grok-build-0.1",
    label: "Grok Build 0.1",
    hint: "xAI Grok Build",
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    hint: "Máxima qualidade DeepSeek",
  },
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    hint: "Rápido",
  },
  {
    id: "deepseek-v3",
    label: "DeepSeek V3",
    hint: "Equilíbrio custo/qualidade",
  },
  { id: "deepseek-v3.2", label: "DeepSeek V3.2", hint: "Variante V3.2" },
  { id: "deepseek-v3.1", label: "DeepSeek V3.1", hint: "Variante V3.1" },
  { id: "deepseek-r1", label: "DeepSeek R1", hint: "Raciocínio avançado" },
  { id: "kimi-k3", label: "Kimi K3", hint: "Moonshot Kimi K3" },
  { id: "kimi-k2.7-code", label: "Kimi K2.7 Code", hint: "Moonshot Kimi code" },
  { id: "kimi-k2.6", label: "Kimi K2.6", hint: "Moonshot Kimi K2.6" },
  { id: "kimi-k2.5", label: "Kimi K2.5", hint: "Moonshot Kimi K2.5" },
  {
    id: "gemini-3-pro-preview",
    label: "Gemini 3 Pro Preview",
    hint: "Google Gemini 3 Pro",
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    hint: "Google Gemini 3.5 Flash",
  },
  { id: "tencent/hy3", label: "Hunyuan 3", hint: "Tencent Hunyuan" },
  { id: "mimo-v2.5-pro", label: "MiMo V2.5 Pro", hint: "XiaoMi MiMo Pro" },
  { id: "mimo-v2.5", label: "MiMo V2.5", hint: "XiaoMi MiMo" },
  { id: "MiniMax-M3", label: "MiniMax M3", hint: "MiniMax M3" },
  { id: "MiniMax-M2.5", label: "MiniMax M2.5", hint: "MiniMax M2.5" },
  { id: "glm-5.2", label: "GLM-5.2", hint: "Zhipu GLM-5.2" },
];

const OPENCODE_MODELS = OPENCODE_MODEL_OPTIONS.map((o) => o.id);

function getOpenCodeApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.OPENCODE_API_KEY) return process.env.OPENCODE_API_KEY;
  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    return config?.opencode_api_key || null;
  };
  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));
  if (projectKey) return projectKey;
  if (projectDir !== WORKSPACE_DIR) {
    return (
      readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json")) ||
      DEFAULT_OPENCODE_API_KEY
    );
  }
  return DEFAULT_OPENCODE_API_KEY;
}

function getOpenCodeBaseUrl(projectDir = WORKSPACE_DIR) {
  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    return config?.opencode_base_url || null;
  };
  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));
  if (projectKey) return projectKey;
  if (projectDir !== WORKSPACE_DIR) {
    return (
      readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json")) ||
      OPENCODE_DEFAULT_BASE_URL
    );
  }
  return OPENCODE_DEFAULT_BASE_URL;
}

function getOpenCodeModel(projectDir = WORKSPACE_DIR) {
  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    return config?.opencode_model || null;
  };
  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));
  if (projectKey) return projectKey;
  if (projectDir !== WORKSPACE_DIR) {
    return (
      readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json")) ||
      DEFAULT_OPENCODE_MODEL
    );
  }
  return DEFAULT_OPENCODE_MODEL;
}

function getOpenCodeModelChain(
  projectDir = WORKSPACE_DIR,
  overrideModels = null
) {
  if (Array.isArray(overrideModels) && overrideModels.length > 0) {
    return [...new Set(overrideModels.filter(Boolean))];
  }
  const primary = getOpenCodeModel(projectDir);
  const fallbacks = [
    "claude-opus-4-5-20251101",
    "deepseek-v4-pro",
    "gpt-5.6-luna",
    "kimi-k3",
  ];
  return [...new Set([primary, ...fallbacks])];
}

async function callOpenCodeWithRetry(
  promptOrBody,
  {
    maxRetries = 3,
    bodyOverride = null,
    projectDir = WORKSPACE_DIR,
    temperature = null,
    models = null,
    maxTokens = null,
  } = {}
) {
  const apiKey = getOpenCodeApiKey(projectDir);
  if (!apiKey) {
    throw new Error("Chave de API OpenCode não configurada.");
  }
  const baseUrl = getOpenCodeBaseUrl(projectDir).replace(/\/+$/, "");
  const messages = convertGeminiToOpenRouterMessages(
    promptOrBody,
    bodyOverride
  );
  const tokenLimit = Math.max(256, Math.min(32000, Number(maxTokens) || 8192));
  let lastError = null;
  const modelList =
    Array.isArray(models) && models.length
      ? models
      : getOpenCodeModelChain(projectDir);

  for (const model of modelList) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const t0 = Date.now();
      try {
        console.log(
          `[OpenCode] Tentando modelo: ${model} (Tentativa ${attempt}/${maxRetries}) @ ${baseUrl}`
        );
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: tokenLimit,
            ...(temperature !== null ? { temperature } : {}),
          }),
        });
        const ms = Date.now() - t0;

        if (response.ok) {
          const result = await response.json();
          const msg = result.choices?.[0]?.message || {};
          let responseText = typeof msg.content === "string" ? msg.content : "";
          if (!responseText && Array.isArray(msg.content)) {
            responseText = msg.content
              .map((part) =>
                typeof part === "string"
                  ? part
                  : part?.text || part?.content || ""
              )
              .join("\n");
          }
          const reasoning = String(
            msg.reasoning_content || msg.reasoning || ""
          ).trim();
          if (!responseText && reasoning) {
            responseText = reasoning;
          } else if (
            responseText &&
            reasoning &&
            responseText.length < 20 &&
            reasoning.length > responseText.length * 2
          ) {
            responseText = reasoning;
          }
          responseText = String(responseText || "")
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          if (responseText) {
            console.log(
              `[OpenCode] Sucesso model=${model} tentativa ${attempt} (${responseText.length} chars · ${ms}ms)`
            );
            return responseText;
          }
          console.warn(
            `[OpenCode] ${model} retornou vazio na tentativa ${attempt}/${maxRetries} · ${ms}ms`
          );
        }

        const errData = await response.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          errData.message ||
          response.statusText ||
          `HTTP ${response.status}`;
        lastError = new Error(`${model}: ${errMsg}`);
        console.warn(
          `[OpenCode] ${response.status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg} · ${ms}ms`
        );

        if (response.status === 401) {
          throw new Error(
            `OpenCode: chave inválida ou sem permissão (${errMsg})`
          );
        }
        if (response.status === 404 || response.status === 400) {
          break;
        }
        if (response.status === 503 || response.status === 429) {
          const delay = Math.min(1500 * Math.pow(2, attempt - 1), 10000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `[OpenCode] Erro na tentativa ${attempt} para ${model}: ${err.message}`
        );
        if (/chave inválida/i.test(err.message || "")) throw err;
        await new Promise((r) => setTimeout(r, Math.min(400 * attempt, 1200)));
      }
    }
  }
  throw (
    lastError ||
    new Error(
      "Falha ao chamar OpenCode. Confira a chave e https://forge-gateway-api.fly.dev/v1"
    )
  );
}

// ─── AirForce (api.airforce/v1 · 209 modelos) ───────────────────────────────
const AIRFORCE_DEFAULT_BASE_URL = "https://api.airforce/v1";
const DEFAULT_AIRFORCE_API_KEY =
  "sk-air-EoAkMxmWz6PVjVdLO7GIKBriUeid4VbGpwaw8byH6T7iDVPg";
const DEFAULT_AIRFORCE_MODEL = "deepseek-v3";

const AIRFORCE_MODEL_OPTIONS = [
  {
    id: "claude-opus-4.6-rp",
    label: "Claude Opus 4.6",
    hint: "Máxima qualidade Anthropic · 200k",
  },
  {
    id: "claude-opus-4.5-rp",
    label: "Claude Opus 4.5",
    hint: "Anthropic Opus 4.5 · 200k",
  },
  {
    id: "claude-opus-4-1",
    label: "Claude Opus 4.1",
    hint: "Anthropic Opus 4.1",
  },
  {
    id: "o3",
    label: "O3",
    hint: "OpenAI O3 · topo raciocínio",
  },
  {
    id: "claude-sonnet-4.6-rp",
    label: "Claude Sonnet 4.6",
    hint: "Anthropic · 200k ctx",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    hint: "Google · 2M ctx · multimodal",
  },
  {
    id: "gpt-oss-120b",
    label: "GPT-OSS 120B",
    hint: "OpenAI OSS 120B",
  },
  {
    id: "grok-4.1-fast-reasoning",
    label: "Grok 4.1 Thinking",
    hint: "xAI raciocínio · 2M ctx",
  },
  {
    id: "grok-4.1-fast-non-reasoning",
    label: "Grok 4.1 Fast",
    hint: "xAI · 2M ctx",
  },
  {
    id: "qwen3-coder-480b-a35b",
    label: "Qwen3 Coder 480B",
    hint: "Alibaba coder gigante",
  },
  {
    id: "deepseek-reasoner",
    label: "DeepSeek Reasoner (R1)",
    hint: "Raciocínio avançado",
  },
  {
    id: "deepseek-v3",
    label: "DeepSeek V3",
    hint: "Custo/qualidade",
  },
  {
    id: "deepseek-v3-0324",
    label: "DeepSeek V3 (Mar 24)",
    hint: "Variante estável 0324",
  },
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    hint: "Rápido e barato",
  },
  {
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4 (May25)",
    hint: "Anthropic Sonnet 4",
  },
  {
    id: "claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    hint: "Rápido Anthropic · 200k",
  },
  {
    id: "qwen3-coder",
    label: "Qwen3 Coder",
    hint: "Alibaba coder",
  },
  {
    id: "qwen3-vl-30b-a3b",
    label: "Qwen3 VL 30B",
    hint: "Alibaba multimodal 30B",
  },
  { id: "gpt-oss-20b", label: "GPT-OSS 20B", hint: "OpenAI OSS · raciocínio" },
  { id: "gpt-4-0125", label: "GPT-4 (0125)", hint: "GPT-4 Turbo Preview" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", hint: "OpenAI rápido e barato" },
  {
    id: "seed-rp",
    label: "Seed RP (ByteDance)",
    hint: "ByteDance Seed · 524k ctx",
  },
  {
    id: "moonshot-v1-128k-vision",
    label: "Moonshot V1 128K",
    hint: "Moonshot 128K context",
  },
  { id: "minimax-m2.5", label: "MiniMax M2.5", hint: "MiniMax 245k ctx" },
  { id: "glm-4.7-flash", label: "GLM-4.7 Flash", hint: "Z.AI GLM rápido" },
  { id: "qwen3", label: "Qwen3 4B", hint: "Alibaba Qwen3" },
  {
    id: "gemma3-270m:free",
    label: "Gemma 3 270M (free)",
    hint: "Google open-weight grátis",
  },
  { id: "rnj-1", label: "RNJ-1 (Essential AI)", hint: "Essential AI" },
  { id: "unmoderated-gpt", label: "GPT Unmoderated", hint: "Sem moderação" },
  {
    id: "plutotext-r3-emotional",
    label: "PlutoText R3 Emotional",
    hint: "AirForce custom",
  },
];

const AIRFORCE_MODELS = AIRFORCE_MODEL_OPTIONS.map((o) => o.id);

function getAirForceApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.AIRFORCE_API_KEY) return process.env.AIRFORCE_API_KEY;
  const readKey = (p) => readJsonFile(p)?.airforce_api_key || null;
  return (
    readKey(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readKey(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    DEFAULT_AIRFORCE_API_KEY
  );
}

function getAirForceBaseUrl(projectDir = WORKSPACE_DIR) {
  const readUrl = (p) => readJsonFile(p)?.airforce_base_url || null;
  return (
    readUrl(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readUrl(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    AIRFORCE_DEFAULT_BASE_URL
  );
}

function getAirForceModel(projectDir = WORKSPACE_DIR) {
  const readModel = (p) => readJsonFile(p)?.airforce_model || null;
  return (
    readModel(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readModel(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    DEFAULT_AIRFORCE_MODEL
  );
}

function getAirForceModelChain(projectDir = WORKSPACE_DIR) {
  const primary = getAirForceModel(projectDir);
  const fallbacks = AIRFORCE_MODELS.filter((m) => m !== primary).slice(0, 3);
  return [primary, ...fallbacks];
}

async function callAirForceWithRetry(
  promptOrBody,
  {
    maxRetries = 3,
    bodyOverride = null,
    projectDir = WORKSPACE_DIR,
    temperature = null,
    models = null,
    maxTokens = null,
  } = {}
) {
  const apiKey = getAirForceApiKey(projectDir);
  if (!apiKey) throw new Error("Chave de API AirForce não configurada.");
  const baseUrl = getAirForceBaseUrl(projectDir).replace(/\/+$/, "");
  const messages = convertGeminiToOpenRouterMessages(
    promptOrBody,
    bodyOverride
  );
  const tokenLimit = Math.max(256, Math.min(32000, Number(maxTokens) || 8192));
  let lastError = null;
  const modelList =
    Array.isArray(models) && models.length
      ? models
      : getAirForceModelChain(projectDir);

  for (const model of modelList) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const t0 = Date.now();
      try {
        console.log(
          `[AirForce] Tentando modelo: ${model} (Tentativa ${attempt}/${maxRetries}) @ ${baseUrl}`
        );
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: tokenLimit,
            ...(temperature !== null ? { temperature } : {}),
          }),
        });
        const ms = Date.now() - t0;
        if (response.ok) {
          const result = await response.json();
          const msg = result.choices?.[0]?.message || {};
          let text =
            typeof msg.content === "string"
              ? msg.content
              : Array.isArray(msg.content)
                ? msg.content.map((p) => p?.text || p?.content || "").join("\n")
                : "";
          const reasoning = String(
            msg.reasoning_content || msg.reasoning || ""
          ).trim();
          if (!text && reasoning) text = reasoning;
          text = String(text || "")
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          if (text) {
            console.log(
              `[AirForce] Sucesso model=${model} tentativa ${attempt} (${text.length} chars · ${ms}ms)`
            );
            return text;
          }
          console.warn(
            `[AirForce] ${model} retornou vazio na tentativa ${attempt}/${maxRetries} · ${ms}ms`
          );
        }
        const errData = await response.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          errData.message ||
          response.statusText ||
          `HTTP ${response.status}`;
        lastError = new Error(`${model}: ${errMsg}`);
        console.warn(
          `[AirForce] ${response.status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg} · ${ms}ms`
        );
        if (response.status === 401)
          throw new Error(`AirForce: chave inválida (${errMsg})`);
        if (response.status === 404 || response.status === 400) break;
        if (response.status === 503 || response.status === 429) {
          await new Promise((r) =>
            setTimeout(r, Math.min(1500 * Math.pow(2, attempt - 1), 10000))
          );
          continue;
        }
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `[AirForce] Erro na tentativa ${attempt} para ${model}: ${err.message}`
        );
        if (/chave inválida/i.test(err.message || "")) throw err;
        await new Promise((r) => setTimeout(r, Math.min(400 * attempt, 1200)));
      }
    }
  }
  throw (
    lastError ||
    new Error(
      "Falha ao chamar AirForce. Confira a chave e https://api.airforce/v1"
    )
  );
}

// ─── OmniRoute (Local AI Gateway) ──────────────────────────────────────────
const OMNIROUTE_DEFAULT_BASE_URL = "http://localhost:20128/v1";
const DEFAULT_OMNIROUTE_MODEL = "auto";
const OMNIROUTE_MODEL_OPTIONS = [
  { id: "auto", label: "Auto (Recomendado)", hint: "Escolha dinâmica padrão" },
  { id: "auto/coding", label: "Auto Coding", hint: "Otimizado para código" },
  {
    id: "auto/smart",
    label: "Auto Smart",
    hint: "Modelos mais inteligentes (Grok/Sonnet)",
  },
  { id: "auto/fast", label: "Auto Fast", hint: "Mais rápido (Flash/Haiku)" },
  { id: "auto/cheap", label: "Auto Cheap", hint: "Menor custo / offline" },
];
const OMNIROUTE_MODELS = OMNIROUTE_MODEL_OPTIONS.map((o) => o.id);

function getOmniRouteApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.OMNIROUTE_API_KEY) return process.env.OMNIROUTE_API_KEY;
  const readKey = (p) => readJsonFile(p)?.omniroute_api_key || null;
  return (
    readKey(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readKey(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    ""
  );
}

function getOmniRouteBaseUrl(projectDir = WORKSPACE_DIR) {
  const readUrl = (p) => readJsonFile(p)?.omniroute_base_url || null;
  return (
    readUrl(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readUrl(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    OMNIROUTE_DEFAULT_BASE_URL
  );
}

function getOmniRouteModel(projectDir = WORKSPACE_DIR) {
  const readModel = (p) => readJsonFile(p)?.omniroute_model || null;
  return (
    readModel(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readModel(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    DEFAULT_OMNIROUTE_MODEL
  );
}

function getOmniRouteModelChain(
  projectDir = WORKSPACE_DIR,
  modelsOverride = null
) {
  const primary = getOmniRouteModel(projectDir);
  if (Array.isArray(modelsOverride) && modelsOverride.length)
    return [...new Set([primary, ...modelsOverride.map(String)])];
  let fallbacks = [];
  const cleanPrimary = String(primary || "").replace(/^gemini\//i, "");
  if (/^gemini/i.test(primary) || /^gemini/i.test(cleanPrimary)) {
    // Máximo 3 fallbacks para não multiplicar tempo de espera (priorizando 3.6-flash)
    fallbacks = [
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ]
      .filter((m) => m !== cleanPrimary)
      .slice(0, 3);
  } else {
    fallbacks = OMNIROUTE_MODELS.filter(
      (m) => m !== primary && !m.startsWith("auto/")
    ).slice(0, 2);
  }
  const prefixed = [primary, ...fallbacks].map((m) => {
    if (/^gemini-/i.test(m) && !m.includes("/")) return `gemini/${m}`;
    return m;
  });
  return [...new Set(prefixed)];
}

async function callOmniRouteWithRetry(promptOrBody, options = {}) {
  const {
    maxRetries = 3,
    bodyOverride = null,
    projectDir = WORKSPACE_DIR,
    temperature = null,
    models = null,
    maxTokens = null,
    timeoutMs = null,
  } = options || {};
  const apiKey = getOmniRouteApiKey(projectDir);
  const baseUrl = getOmniRouteBaseUrl(projectDir).replace(/\/+$/, "");
  const messages = convertGeminiToOpenRouterMessages(
    promptOrBody,
    bodyOverride
  );
  let lastError = null;
  const modelList =
    Array.isArray(models) && models.length
      ? models
      : getOmniRouteModelChain(projectDir);

  for (const model of modelList) {
    const isGeminiModel = /gemini/i.test(model);
    const maxAllowedTokens = isGeminiModel ? 65536 : 32000;
    const tokenLimit = Math.max(
      256,
      Math.min(maxAllowedTokens, Number(maxTokens) || 8192)
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const t0 = Date.now();
      try {
        console.log(
          `[OmniRoute] Tentando modelo: ${model} (Tentativa ${attempt}/${maxRetries}) @ ${baseUrl}`
        );
        const headers = {
          "Content-Type": "application/json",
        };
        if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
        const requestTimeoutMs =
          Number(options?.timeoutMs) || Number(options?.timeout_ms) || 180000;
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          requestTimeoutMs
        );
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            max_tokens: tokenLimit,
            ...(temperature !== null ? { temperature } : {}),
          }),
        });
        clearTimeout(timeoutId);
        const ms = Date.now() - t0;
        if (response.ok) {
          const result = await response.json();
          const msg = result.choices?.[0]?.message || {};
          let text =
            typeof msg.content === "string"
              ? msg.content
              : Array.isArray(msg.content)
                ? msg.content.map((p) => p?.text || p?.content || "").join("\n")
                : "";
          text = String(text || "")
            .replace(/<think[\s\S]*?<\/think>/gi, "")
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          if (text) {
            console.log(
              `[OmniRoute] Sucesso model=${model} tentativa ${attempt} (${text.length} chars · ${ms}ms)`
            );
            return text;
          }
          console.warn(
            `[OmniRoute] ${model} retornou vazio na tentativa ${attempt}/${maxRetries} · ${ms}ms`
          );
        }
        const errData = await response.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          errData.message ||
          response.statusText ||
          `HTTP ${response.status}`;
        lastError = new Error(`${model}: ${errMsg}`);
        console.warn(
          `[OmniRoute] ${response.status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg} · ${ms}ms`
        );
        if (response.status === 404 || response.status === 400) break;
        if (response.status === 503 || response.status === 429) {
          await new Promise((r) =>
            setTimeout(r, Math.min(800 * Math.pow(2, attempt - 1), 4000))
          );
          continue;
        }
        break;
      } catch (err) {
        lastError = err;
        const isTimeout = err?.name === "AbortError";
        console.warn(
          `[OmniRoute] ${isTimeout ? "Timeout (45s)" : "Erro"} na tentativa ${attempt} para ${model}: ${err.message}`
        );
        // Timeout = gateway lento, pula direto para o próximo modelo
        if (isTimeout) break;
        await new Promise((r) => setTimeout(r, Math.min(400 * attempt, 1200)));
      }
    }
  }
  throw (
    lastError ||
    new Error(
      `Falha ao chamar OmniRoute. Verifique se o gateway local está ativo em: ${baseUrl}`
    )
  );
}

// ─── Moon-AI (moon-ai.pl/api · 30+ modelos) ─────────────────────────────────
const MOONAI_DEFAULT_BASE_URL = "https://www.moon-ai.pl/api";
const DEFAULT_MOONAI_API_KEY = "moon-ai-vrmc2tb733k9m1z5vlccwpb2";
const DEFAULT_MOONAI_MODEL = "gpt-5-4";

const MOONAI_MODEL_OPTIONS = [
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    hint: "Máxima qualidade — Anthropic Sonnet 5",
  },
  { id: "gpt-5-6-luna", label: "GPT-5.6 Luna", hint: "OpenAI Luna" },
  { id: "gpt-5-6-terra", label: "GPT-5.6 Terra", hint: "OpenAI Terra" },
  { id: "gpt-5-6-sol", label: "GPT-5.6 Sol", hint: "OpenAI Sol" },
  { id: "gpt-5-5", label: "GPT-5.5", hint: "OpenAI GPT-5.5" },
  { id: "gpt-5-4", label: "GPT-5.4", hint: "Padrão Moon-AI" },
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    hint: "Rápido e eficiente",
  },
  {
    id: "deepseek-v3-2",
    label: "DeepSeek V3.2",
    hint: "DeepSeek V3 variante 2",
  },
  { id: "gpt-oss-120b", label: "GPT-OSS 120B", hint: "OpenAI OSS 120B" },
  { id: "qwen-3-6-plus", label: "Qwen 3.6 Plus", hint: "Alibaba Qwen 3.6+" },
  { id: "kimi-k2-5", label: "Kimi K2.5", hint: "Moonshot Kimi K2.5" },
  {
    id: "llama-3-3-70b-instruct",
    label: "Llama 3.3 70B",
    hint: "Meta Llama 70B instruct",
  },
  { id: "grok-3", label: "Grok 3", hint: "xAI Grok 3" },
  { id: "glm-5-1", label: "GLM-5.1", hint: "Z.AI GLM-5.1" },
  { id: "glm-4-7", label: "GLM-4.7", hint: "Z.AI GLM-4.7" },
  { id: "glm-4-7-flash", label: "GLM-4.7 Flash", hint: "Z.AI rápido" },
];

const MOONAI_MODELS = MOONAI_MODEL_OPTIONS.map((o) => o.id);

function getMoonAiApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.MOONAI_API_KEY) return process.env.MOONAI_API_KEY;
  const readKey = (p) => readJsonFile(p)?.moonai_api_key || null;
  return (
    readKey(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readKey(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    DEFAULT_MOONAI_API_KEY
  );
}

function getMoonAiBaseUrl(projectDir = WORKSPACE_DIR) {
  const readUrl = (p) => readJsonFile(p)?.moonai_base_url || null;
  return (
    readUrl(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readUrl(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    MOONAI_DEFAULT_BASE_URL
  );
}

function getMoonAiModel(projectDir = WORKSPACE_DIR) {
  const readModel = (p) => readJsonFile(p)?.moonai_model || null;
  return (
    readModel(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readModel(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    DEFAULT_MOONAI_MODEL
  );
}

function getMoonAiModelChain(projectDir = WORKSPACE_DIR) {
  const primary = getMoonAiModel(projectDir);
  const fallbacks = MOONAI_MODELS.filter((m) => m !== primary).slice(0, 3);
  return [primary, ...fallbacks];
}

async function callMoonAiWithRetry(
  promptOrBody,
  {
    maxRetries = 3,
    bodyOverride = null,
    projectDir = WORKSPACE_DIR,
    temperature = null,
    models = null,
    maxTokens = null,
  } = {}
) {
  const apiKey = getMoonAiApiKey(projectDir);
  if (!apiKey) throw new Error("Chave de API Moon-AI não configurada.");
  const baseUrl = getMoonAiBaseUrl(projectDir).replace(/\/+$/, "");
  const messages = convertGeminiToOpenRouterMessages(
    promptOrBody,
    bodyOverride
  );
  const tokenLimit = Math.max(256, Math.min(32000, Number(maxTokens) || 8192));
  let lastError = null;
  const modelList =
    Array.isArray(models) && models.length
      ? models
      : getMoonAiModelChain(projectDir);

  for (const model of modelList) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const t0 = Date.now();
      try {
        console.log(
          `[MoonAI] Tentando modelo: ${model} (Tentativa ${attempt}/${maxRetries}) @ ${baseUrl}`
        );
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: tokenLimit,
            ...(temperature !== null ? { temperature } : {}),
          }),
        });
        const ms = Date.now() - t0;
        if (response.ok) {
          const result = await response.json();
          const msg = result.choices?.[0]?.message || {};
          let text =
            typeof msg.content === "string"
              ? msg.content
              : Array.isArray(msg.content)
                ? msg.content.map((p) => p?.text || p?.content || "").join("\n")
                : "";
          const reasoning = String(
            msg.reasoning_content || msg.reasoning || ""
          ).trim();
          if (!text && reasoning) text = reasoning;
          text = String(text || "")
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          if (text) {
            console.log(
              `[MoonAI] Sucesso model=${model} tentativa ${attempt} (${text.length} chars · ${ms}ms)`
            );
            return text;
          }
          console.warn(
            `[MoonAI] ${model} retornou vazio na tentativa ${attempt}/${maxRetries} · ${ms}ms`
          );
        }
        const errData = await response.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          errData.message ||
          response.statusText ||
          `HTTP ${response.status}`;
        lastError = new Error(`${model}: ${errMsg}`);
        console.warn(
          `[MoonAI] ${response.status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg} · ${ms}ms`
        );
        if (response.status === 401)
          throw new Error(`MoonAI: chave inválida (${errMsg})`);
        if (response.status === 404 || response.status === 400) break;
        if (response.status === 503 || response.status === 429) {
          await new Promise((r) =>
            setTimeout(r, Math.min(1500 * Math.pow(2, attempt - 1), 10000))
          );
          continue;
        }
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `[MoonAI] Erro na tentativa ${attempt} para ${model}: ${err.message}`
        );
        if (/chave inválida/i.test(err.message || "")) throw err;
        await new Promise((r) => setTimeout(r, Math.min(400 * attempt, 1200)));
      }
    }
  }
  throw (
    lastError ||
    new Error(
      "Falha ao chamar Moon-AI. Confira a chave e https://www.moon-ai.pl/api"
    )
  );
}

/** TokenRouter — gateway OpenAI-compatible (https://api.tokenrouter.com/v1) */
const TOKENROUTER_DEFAULT_BASE_URL = "https://api.tokenrouter.com/v1";

const TOKENROUTER_MODEL_OPTIONS = [
  {
    id: "anthropic/claude-fable-5",
    label: "Claude Fable 5",
    hint: "Máxima qualidade — Claude via TokenRouter",
  },
  {
    id: "x-ai/grok-4.20-beta",
    label: "Grok 4.20 Beta",
    hint: "xAI Grok via TokenRouter",
  },
  {
    id: "openai/gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    hint: "Qualidade OpenAI via TokenRouter",
  },
  {
    id: "deepseek/deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    hint: "Forte em raciocínio / código",
  },
  {
    id: "qwen/qwen3.7-max",
    label: "Qwen 3.7 Max",
    hint: "Máxima qualidade Qwen",
  },
  {
    id: "openai/gpt-5.4-nano",
    label: "GPT-5.4 Nano",
    hint: "Rápido e barato",
  },
  {
    id: "qwen/qwen3.5-plus-02-15",
    label: "Qwen 3.5 Plus",
    hint: "Bom equilíbrio para roteiros PT",
  },
  {
    id: "MiniMax-M3",
    label: "MiniMax M3",
    hint: "Modelo MiniMax via TokenRouter",
  },
  {
    id: "qwen/qwen3.5-9b",
    label: "Qwen 3.5 9B",
    hint: "Leve e rápido",
  },
  {
    id: "z-ai/glm-5.2-free",
    label: "GLM-5.2 Free (Z.AI)",
    hint: "Free TokenRouter — bom para volume",
  },
];

const TOKENROUTER_MODELS = TOKENROUTER_MODEL_OPTIONS.map((o) => o.id);
const DEFAULT_TOKENROUTER_MODEL = "z-ai/glm-5.2-free";

async function callXaiWithRetry(
  promptOrBody,
  {
    maxRetries = 3,
    bodyOverride = null,
    projectDir = WORKSPACE_DIR,
    temperature = null,
  } = {}
) {
  const apiKey = getXaiApiKey(projectDir);
  if (!apiKey) {
    throw new Error("Chave de API da xAI/Grok não configurada.");
  }

  const messages = convertGeminiToOpenRouterMessages(
    promptOrBody,
    bodyOverride
  );
  let lastError = null;

  for (const model of XAI_MODELS) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[xAI/Grok] Tentando modelo: ${model} (Tentativa ${attempt}/${maxRetries})`
        );
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            ...(temperature !== null ? { temperature } : {}),
          }),
        });

        if (response.ok) {
          const result = await response.json();
          let responseText = result.choices?.[0]?.message?.content || "";
          responseText = responseText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          console.log(
            `[xAI/Grok] Sucesso com modelo=${model} na tentativa ${attempt}`
          );
          return responseText;
        }

        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || response.statusText;
        lastError = new Error(`${model}: ${errMsg}`);
        console.warn(
          `[xAI/Grok] ${response.status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg}`
        );

        if (response.status === 503 || response.status === 429) {
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        break; // Don't retry if it's a 400/401/403/etc. error
      } catch (err) {
        lastError = err;
        console.warn(
          `[xAI/Grok] Erro na tentativa ${attempt} para ${model}: ${err.message}`
        );
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw (
    lastError ||
    new Error("Falha ao chamar xAI/Grok após múltiplas tentativas.")
  );
}

// Gemini API call with automatic retry and model fallback for 503/429 errors
// Default = Flash mais recente; FALLBACKS em ordem de qualidade (melhor → mais simples).
// Fonte: ai.google.dev/gemini-api/docs/models (jul/2026).
// Removidos: gemini-2.0-flash (shut down), gemini-3.1-flash-lite (shut down).

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

const GEMINI_MODEL_OPTIONS = [
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    hint: "Máxima qualidade · raciocínio profundo e coding complexo",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    hint: "Mais recente · equilíbrio velocidade/inteligência (agentic + multimodal)",
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    hint: "Fronteira sustentada · agentic e coding",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro (Preview)",
    hint: "Inteligência avançada · resolução complexa (preview)",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    hint: "Rápido, estável, contexto 1M",
  },
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3 Flash (Preview)",
    hint: "Fronteira a fração do custo (preview)",
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    hint: "Mais rápido e econômico da família 3.5",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    hint: "Alto volume / fallback barato",
  },
  {
    id: "gemini-flash-latest",
    label: "Gemini Flash Latest",
    hint: "Alias — sempre o Flash mais recente",
  },
  {
    id: "gemini-pro-latest",
    label: "Gemini Pro Latest",
    hint: "Alias — sempre o Pro mais recente",
  },
];

/** Cadeia de rotação: melhor qualidade → mais simples se 503/429/indisponível. */
const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.5-pro",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-pro-preview",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
  "gemini-pro-latest",
];

const GEMINI_MODELS = GEMINI_MODEL_FALLBACKS;

function getGeminiModel(projectDir = WORKSPACE_DIR) {
  const readModel = (configPath) => {
    const config = readJsonFile(configPath);
    const model = String(config?.gemini_model || "").trim();
    return GEMINI_MODEL_FALLBACKS.includes(model) ? model : null;
  };
  return (
    readModel(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readModel(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    process.env.GEMINI_MODEL ||
    DEFAULT_GEMINI_MODEL
  );
}

function getGeminiModelChain(
  projectDir = WORKSPACE_DIR,
  overrideModels = null
) {
  const primary = getGeminiModel(projectDir);
  if (Array.isArray(overrideModels) && overrideModels.length > 0) {
    return [
      ...new Set([
        primary,
        ...overrideModels.filter(Boolean),
        ...GEMINI_MODEL_FALLBACKS,
      ]),
    ];
  }
  return [...new Set([primary, ...GEMINI_MODEL_FALLBACKS])];
}

function getInferenceModel(projectDir = WORKSPACE_DIR) {
  const readModel = (configPath) => {
    const config = readJsonFile(configPath);
    const model = String(config?.inference_model || "").trim();
    return INFERENCE_MODEL_FALLBACKS.includes(model) ? model : null;
  };
  return (
    readModel(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readModel(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    process.env.INFERENCE_MODEL ||
    DEFAULT_INFERENCE_MODEL
  );
}

function getInferenceModelChain(
  projectDir = WORKSPACE_DIR,
  overrideModels = null
) {
  if (Array.isArray(overrideModels) && overrideModels.length > 0) {
    return [...new Set(overrideModels.filter(Boolean))];
  }
  const primary = getInferenceModel(projectDir);
  return [...new Set([primary, ...INFERENCE_MODEL_FALLBACKS])];
}

function getOpenRouterModel(projectDir = WORKSPACE_DIR) {
  const readModel = (configPath) => {
    const config = readJsonFile(configPath);
    const model = String(config?.openrouter_model || "").trim();
    return OPENROUTER_FREE_MODELS.includes(model) ? model : null;
  };
  return (
    readModel(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readModel(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    process.env.OPENROUTER_MODEL ||
    DEFAULT_OPENROUTER_MODEL
  );
}

function getOpenRouterModelChain(
  projectDir = WORKSPACE_DIR,
  overrideModels = null
) {
  if (Array.isArray(overrideModels) && overrideModels.length > 0) {
    return [...new Set(overrideModels.filter(Boolean))];
  }
  const primary = getOpenRouterModel(projectDir);
  return [...new Set([primary, ...OPENROUTER_FREE_MODELS])];
}

function getNvidiaModel(projectDir = WORKSPACE_DIR) {
  const readModel = (configPath) => {
    const config = readJsonFile(configPath);
    const model = String(config?.nvidia_model || "").trim();
    return NVIDIA_MODELS.includes(model) ? model : null;
  };
  return (
    readModel(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readModel(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    process.env.NVIDIA_MODEL ||
    DEFAULT_NVIDIA_MODEL
  );
}

function getNvidiaModelChain(
  projectDir = WORKSPACE_DIR,
  overrideModels = null
) {
  if (Array.isArray(overrideModels) && overrideModels.length > 0) {
    return [...new Set(overrideModels.filter(Boolean))];
  }
  const primary = getNvidiaModel(projectDir);
  return [...new Set([primary, ...NVIDIA_MODELS])];
}

function getLocalLlmUrl(projectDir = WORKSPACE_DIR) {
  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    return config?.local_llm_url || null;
  };
  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));
  if (projectKey) return projectKey;
  if (projectDir !== WORKSPACE_DIR) {
    return (
      readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json")) ||
      "http://127.0.0.1:11434/v1/chat/completions"
    );
  }
  return "http://127.0.0.1:11434/v1/chat/completions";
}

function getLocalLlmModel(projectDir = WORKSPACE_DIR) {
  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    return config?.local_llm_model || null;
  };
  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));
  if (projectKey) return projectKey;
  if (projectDir !== WORKSPACE_DIR) {
    return (
      readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json")) ||
      "bonsai-27b"
    );
  }
  return "bonsai-27b";
}

async function callLocalLlmWithRetry(
  promptOrBody,
  {
    maxRetries = 3,
    bodyOverride = null,
    projectDir = WORKSPACE_DIR,
    temperature = null,
  } = {}
) {
  const url = getLocalLlmUrl(projectDir);
  const model = getLocalLlmModel(projectDir);
  const messages = convertGeminiToOpenRouterMessages(
    promptOrBody,
    bodyOverride
  );
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[Local LLM] Tentando url=${url} modelo=${model} (Tentativa ${attempt}/${maxRetries})`
      );
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          ...(temperature !== null ? { temperature } : {}),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        let responseText = result.choices?.[0]?.message?.content || "";
        responseText = responseText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        console.log(
          `[Local LLM] Sucesso com url=${url} na tentativa ${attempt}`
        );
        return responseText;
      }

      const errText = await response.text().catch(() => "");
      lastError = new Error(
        `${response.status}: ${errText || response.statusText}`
      );
      console.warn(
        `[Local LLM] ${response.status} de ${url} (tentativa ${attempt}/${maxRetries}): ${errText || response.statusText}`
      );
    } catch (err) {
      lastError = err;
      console.warn(
        `[Local LLM] Erro ao conectar com local LLM (tentativa ${attempt}/${maxRetries}):`,
        err.message
      );
    }
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  throw lastError || new Error("Falha ao consultar LLM local.");
}

async function callGeminiWithRetry(apiKey, promptOrBody, options = {}) {
  const {
    maxRetries = 4,
    models = null,
    bodyOverride = null,
    temperature = null,
    projectDir = null,
    forceProvider = null,
    activityLabel = null,
    activityDetail = null,
    jobId = null,
    maxTokens = null,
    timeoutMs = null,
  } = options || {};
  const projDir = projectDir || global.lastActiveProjectDir || WORKSPACE_DIR;
  const provider = forceProvider || getAiProvider(projDir);

  // Overrides `models` com IDs Gemini NÃO devem vazar para OpenRouter/NVIDIA/xAI.
  // Só aplicamos a lista quando o provedor ativo é Gemini (ou forceProvider gemini).
  const looksLikeGeminiModelList =
    Array.isArray(models) &&
    models.length > 0 &&
    models.every((m) => {
      const s = String(m || "").toLowerCase();
      return (
        s.startsWith("gemini-") ||
        s.startsWith("models/gemini") ||
        s.includes("gemini")
      );
    });
  const geminiModelsOnly =
    provider === "gemini" ? models : looksLikeGeminiModelList ? null : models;
  const modelChain = getGeminiModelChain(
    projDir,
    provider === "gemini" ? geminiModelsOnly : null
  ).map((m) =>
    provider === "gemini" ? String(m).replace(/^gemini\//i, "") : m
  );

  let modelsTriedPreview = modelChain;
  let primaryModel = modelChain[0] || null;
  // Modelos nativos do provedor (config do usuário), nunca a cadeia Gemini por engano
  let providerModelsOverride = null;
  if (
    provider !== "gemini" &&
    Array.isArray(models) &&
    !looksLikeGeminiModelList
  ) {
    providerModelsOverride = models;
  }
  try {
    if (provider === "nvidia") {
      modelsTriedPreview = getNvidiaModelChain(projDir, providerModelsOverride);
      primaryModel = modelsTriedPreview[0] || getNvidiaModel(projDir);
    } else if (provider === "openrouter") {
      modelsTriedPreview = getOpenRouterModelChain(
        projDir,
        providerModelsOverride
      );
      primaryModel = modelsTriedPreview[0] || getOpenRouterModel(projDir);
    } else if (provider === "xai") {
      modelsTriedPreview =
        typeof XAI_MODELS !== "undefined" && Array.isArray(XAI_MODELS)
          ? [...XAI_MODELS]
          : ["grok"];
      primaryModel = modelsTriedPreview[0] || "grok";
    } else if (provider === "alibaba") {
      modelsTriedPreview = getAlibabaModelChain(
        projDir,
        providerModelsOverride
      );
      primaryModel = modelsTriedPreview[0] || getAlibabaModel(projDir);
    } else if (provider === "tokenrouter") {
      modelsTriedPreview = getTokenRouterModelChain(
        projDir,
        providerModelsOverride
      );
      primaryModel = modelsTriedPreview[0] || getTokenRouterModel(projDir);
    } else if (provider === "opencode") {
      modelsTriedPreview = getOpenCodeModelChain(
        projDir,
        providerModelsOverride
      );
      primaryModel = modelsTriedPreview[0] || getOpenCodeModel(projDir);
    } else if (provider === "local") {
      primaryModel = getLocalLlmModel(projDir);
      modelsTriedPreview = primaryModel ? [primaryModel] : [];
    }
  } catch {
    /* model preview is best-effort */
  }

  let projectLabel = "";
  try {
    projectLabel = path.basename(String(projDir || "")) || "";
  } catch {
    projectLabel = "";
  }

  const callId = recordAiCall({
    source: "llm",
    label: activityLabel || `LLM · ${provider}`,
    provider,
    model: primaryModel,
    modelsTried: modelsTriedPreview,
    status: "running",
    detail: activityDetail || "",
    project: projectLabel,
    jobId: jobId || null,
  });

  const finishOk = (modelUsed) => {
    updateAiCall(callId, {
      status: "ok",
      provider,
      model: modelUsed || primaryModel,
      modelsTried: modelsTriedPreview,
    });
  };
  const finishErr = (err) => {
    updateAiCall(callId, {
      status: "error",
      provider,
      model: primaryModel,
      error: err?.message || String(err || "erro"),
    });
  };

  try {
    if (provider === "nvidia") {
      const text = await callNvidiaWithRetry(promptOrBody, {
        maxRetries,
        bodyOverride,
        projectDir: projDir,
        temperature,
        models: providerModelsOverride,
        maxTokens,
      });
      finishOk(primaryModel);
      return text;
    }
    if (provider === "openrouter") {
      const text = await callOpenRouterWithRetry(promptOrBody, {
        maxRetries,
        bodyOverride,
        projectDir: projDir,
        temperature,
        models: providerModelsOverride,
        maxTokens,
      });
      finishOk(primaryModel);
      return text;
    }
    if (provider === "xai") {
      const text = await callXaiWithRetry(promptOrBody, {
        maxRetries,
        bodyOverride,
        projectDir: projDir,
        temperature,
      });
      finishOk(primaryModel);
      return text;
    }
    if (provider === "alibaba") {
      const text = await callAlibabaWithRetry(promptOrBody, {
        maxRetries,
        bodyOverride,
        projectDir: projDir,
        temperature,
        models: providerModelsOverride,
        maxTokens,
      });
      finishOk(primaryModel);
      return text;
    }
    if (provider === "tokenrouter") {
      const text = await callTokenRouterWithRetry(promptOrBody, {
        maxRetries,
        bodyOverride,
        projectDir: projDir,
        temperature,
        models: providerModelsOverride,
        maxTokens,
      });
      finishOk(primaryModel);
      return text;
    }
    if (provider === "opencode") {
      const text = await callOpenCodeWithRetry(promptOrBody, {
        maxRetries,
        bodyOverride,
        projectDir: projDir,
        temperature,
        models: providerModelsOverride,
        maxTokens,
      });
      finishOk(primaryModel);
      return text;
    }
    if (provider === "airforce") {
      const text = await callAirForceWithRetry(promptOrBody, {
        maxRetries,
        bodyOverride,
        projectDir: projDir,
        temperature,
        models: providerModelsOverride,
        maxTokens,
      });
      finishOk(primaryModel);
      return text;
    }
    if (provider === "moonai") {
      const text = await callMoonAiWithRetry(promptOrBody, {
        maxRetries,
        bodyOverride,
        projectDir: projDir,
        temperature,
        models: providerModelsOverride,
        maxTokens,
      });
      finishOk(primaryModel);
      return text;
    }
    if (provider === "omniroute") {
      try {
        const text = await callOmniRouteWithRetry(promptOrBody, {
          maxRetries,
          bodyOverride,
          projectDir: projDir,
          temperature,
          models: providerModelsOverride,
          maxTokens,
        });
        finishOk(primaryModel);
        return text;
      } catch (omniErr) {
        console.warn(
          `[OmniRoute] Falhou (${omniErr.message}). Executando fallback automático via Gemini API...`
        );
        const geminiKey = getApiKey(projDir);
        if (!geminiKey) {
          throw omniErr;
        }
      }
    }
    if (provider === "local") {
      const text = await callLocalLlmWithRetry(promptOrBody, {
        maxRetries,
        bodyOverride,
        projectDir: projDir,
        temperature,
      });
      finishOk(primaryModel);
      return text;
    }

    const keyPool = buildGeminiKeyPool(apiKey, getApiKeys(projDir));

    if (keyPool.length === 0) {
      const err = new Error("Nenhuma chave de API do Gemini configurada.");
      finishErr(err);
      throw err;
    }

    const callStartedAt = Date.now();
    console.log(
      `[Gemini] Pool: ${keyPool.length} chave(s) | modelos: ${modelChain.join(" → ")}`
    );

    let lastError = null;
    let totalHttpAttempts = 0;

    for (let modelIdx = 0; modelIdx < modelChain.length; modelIdx += 1) {
      const model = modelChain[modelIdx];
      let keysAttempted = 0;
      let overloadKeyHits = 0;
      let quotaKeyHits = 0;
      let skipRemainingKeysForModel = false;
      // Atualiza painel com o modelo em tentativa
      updateAiCall(callId, {
        status: "running",
        model,
        detail:
          activityDetail ||
          `Tentando ${model} (${modelIdx + 1}/${modelChain.length})`,
      });

      for (let keyIdx = 0; keyIdx < keyPool.length; keyIdx += 1) {
        if (skipRemainingKeysForModel) break;

        const currentKey = keyPool[keyIdx];
        const keyLabel = `${keyIdx + 1}/${keyPool.length}`;
        keysAttempted += 1;

        for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
          const attemptStartedAt = Date.now();
          try {
            const requestBody = bodyOverride || {
              contents: [{ role: "user", parts: [{ text: promptOrBody }] }],
              ...(temperature !== null
                ? { generationConfig: { temperature } }
                : {}),
            };
            console.log(
              `[Gemini] modelo=${model} chave=${keyLabel} (${currentKey.substring(0, 10)}...) tentativa ${attempt}/${maxRetries}`
            );
            totalHttpAttempts += 1;
            const requestTimeoutMs =
              Number(options?.timeoutMs) ||
              Number(options?.timeout_ms) ||
              180000;
            const geminiController = new AbortController();
            const geminiTimeoutId = setTimeout(
              () => geminiController.abort(),
              requestTimeoutMs
            );
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: geminiController.signal,
                body: JSON.stringify(requestBody),
              }
            );
            clearTimeout(geminiTimeoutId);
            const attemptMs = Date.now() - attemptStartedAt;

            if (response.ok) {
              const result = await response.json();
              let responseText =
                result.candidates?.[0]?.content?.parts?.[0]?.text || "";
              responseText = responseText
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();
              const totalMs = Date.now() - callStartedAt;
              console.log(
                `[Gemini] Sucesso modelo=${model} chave=${keyLabel} (${currentKey.substring(0, 10)}...) tentativa ${attempt} · ${attemptMs}ms (total ${totalMs}ms · ${totalHttpAttempts} HTTP)`
              );
              finishOk(model);
              return responseText;
            }

            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || response.statusText;
            const status = response.status;

            console.warn(
              `[Gemini] HTTP ${status} modelo=${model} chave=${keyLabel} (${currentKey.substring(0, 10)}...): ${errMsg} · ${attemptMs}ms`
            );
            lastError = new Error(`${model}: ${errMsg}`);

            if (shouldRotateGeminiKey(status)) {
              if (isGeminiModelOverloadStatus(status)) {
                overloadKeyHits += 1;
                const maxKeys = geminiMaxKeysBeforeModelSwitch(status);
                if (overloadKeyHits >= maxKeys) {
                  console.warn(
                    `[Gemini] Fail-fast: ${status} em ${overloadKeyHits} chave(s) no modelo ${model} → próximo modelo (evita varrer ${keyPool.length} chaves)`
                  );
                  skipRemainingKeysForModel = true;
                } else {
                  console.warn(
                    `[Gemini] ${status} na chave ${keyLabel} — próxima chave (${overloadKeyHits}/${maxKeys} antes de trocar modelo)`
                  );
                }
              } else if (isGeminiQuotaStatus(status)) {
                quotaKeyHits += 1;
                const maxKeys = geminiMaxKeysBeforeModelSwitch(status);
                if (quotaKeyHits >= maxKeys) {
                  console.warn(
                    `[Gemini] Fail-fast: 429 em ${quotaKeyHits} chave(s) no modelo ${model} → próximo modelo`
                  );
                  skipRemainingKeysForModel = true;
                } else {
                  console.warn(
                    `[Gemini] 429 na chave ${keyLabel} — próxima chave (${quotaKeyHits}/${maxKeys} antes de trocar modelo)`
                  );
                }
              } else {
                console.warn(
                  `[Gemini] ${status} na chave ${keyLabel} — próxima chave antes de trocar modelo`
                );
              }
              break;
            }
            break;
          } catch (err) {
            const attemptMs = Date.now() - attemptStartedAt;
            lastError = err;
            console.warn(
              `[Gemini] Erro de rede modelo=${model} chave=${keyLabel} tentativa ${attempt}/${maxRetries}: ${err.message} · ${attemptMs}ms`
            );
            if (attempt >= maxRetries) break;
            // Backoff curto (antes era 1s×attempt — em cascata virava dezenas de s)
            await new Promise((r) =>
              setTimeout(r, Math.min(400 * attempt, 1200))
            );
            continue;
          }
        }
      }

      const nextModel = modelChain[modelIdx + 1];
      if (nextModel) {
        console.warn(
          `[Gemini] Modelo ${model}: ${keysAttempted}/${keyPool.length} chave(s) tentadas → ${nextModel}`
        );
      } else {
        console.warn(
          `[Gemini] Modelo ${model}: ${keysAttempted}/${keyPool.length} chave(s) tentadas — sem mais modelos na cadeia (total ${Date.now() - callStartedAt}ms · ${totalHttpAttempts} HTTP)`
        );
      }
    }
    const finalErr =
      lastError ||
      new Error("Todos os modelos Gemini falharam após múltiplas tentativas.");
    console.warn(
      `[Gemini] Falha total após ${Date.now() - callStartedAt}ms · ${totalHttpAttempts} HTTP`
    );
    finishErr(finalErr);
    throw finalErr;
  } catch (err) {
    // Evita double-finish se já gravamos ok/error acima
    const listed = listRecentAiCalls({ limit: 5 }).find((c) => c.id === callId);
    if (listed && listed.status === "running") {
      finishErr(err);
    }
    throw err;
  }
}

function extractJsonCandidate(text) {
  const raw = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstObject = raw.indexOf("{");

  const firstArray = raw.indexOf("[");

  const start =
    firstObject === -1
      ? firstArray
      : firstArray === -1
        ? firstObject
        : Math.min(firstObject, firstArray);

  if (start === -1) return raw;

  const closeForOpen = raw[start] === "{" ? "}" : "]";

  const stack = [closeForOpen];

  let inString = false;

  let escaped = false;

  for (let i = start + 1; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }

      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{" || ch === "[") {
      stack.push(ch === "{" ? "}" : "]");
    } else if (ch === "}" || ch === "]") {
      if (ch !== stack.pop()) break;

      if (stack.length === 0) return raw.slice(start, i + 1);
    }
  }

  const fallback = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

  return fallback ? fallback[0] : raw;
}

function parseJsonCandidate(text) {
  const candidate = extractJsonCandidate(text);

  const variants = [
    candidate,

    candidate.replace(/,\s*([}\]])/g, "$1"),

    candidate
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, "$1"),
  ];

  let lastError;

  for (const variant of variants) {
    try {
      return JSON.parse(variant);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

function repairTruncatedJson(str) {
  if (!str) return str;
  let text = String(str).trim().replace(/,\s*$/, "");
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }
  if (inString) text += '"';
  text = text.replace(/,\s*$/, "");
  while (stack.length > 0) {
    text += stack.pop();
  }
  return text.replace(/,\s*([}\]])/g, "$1");
}

function parseJsonLocally(responseText) {
  const variants = [
    responseText,
    String(responseText || "")
      .replace(/^\uFEFF/, "")
      .trim(),
    extractJsonCandidate(responseText),
  ];
  const seen = new Set();
  let lastError = null;
  for (const base of variants) {
    if (!base || seen.has(base)) continue;
    seen.add(base);
    const candidate = extractJsonCandidate(base);
    const attempts = [
      candidate,
      candidate.replace(/,\s*([}\]])/g, "$1"),
      candidate
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .replace(/,\s*([}\]])/g, "$1"),
      candidate.replace(/'/g, '"').replace(/,\s*([}\]])/g, "$1"),
      // Repara falta de vírgula entre propriedades em linhas separadas: "val"\n"key": -> "val",\n"key":
      candidate
        .replace(
          /(["\d]|true|false|null|\]|\})\s*\r?\n\s*(?="[\w_]+"\s*:)/gi,
          "$1,\n"
        )
        .replace(/,\s*([}\]])/g, "$1"),
      // Repara falta de vírgulas entre objetos e arrays adjacentes
      candidate
        .replace(
          /(["\d]|true|false|null|\]|\})\s*\r?\n\s*(?="[\w_]+"\s*:)/gi,
          "$1,\n"
        )
        .replace(/}\s*{/g, "},{")
        .replace(/]\s*\[/g, "],[")
        .replace(/}\s*\[/g, "},[")
        .replace(/]\s*{/g, "],[")
        .replace(/"\s*"/g, '","')
        .replace(/}\s*"/g, '},"')
        .replace(/"\s*{/g, '",{"')
        .replace(/]\s*"/g, '],"')
        .replace(/"\s*\[/g, '",[')
        .replace(/,\s*([}\]])/g, "$1"),
      repairTruncatedJson(candidate),
      repairTruncatedJson(
        candidate
          .replace(
            /(["\d]|true|false|null|\]|\})\s*\r?\n\s*(?="[\w_]+"\s*:)/gi,
            "$1,\n"
          )
          .replace(/}\s*{/g, "},{")
          .replace(/]\s*\[/g, "],[")
          .replace(/"\s*"/g, '","')
      ),
    ];
    for (const variant of attempts) {
      try {
        return JSON.parse(variant);
      } catch (err) {
        lastError = err;
      }
    }
  }
  throw lastError || new Error("JSON inválido");
}

async function parseAiJsonResponse(
  responseText,
  apiKey,
  contextLabel = "resposta da IA"
) {
  try {
    return parseJsonLocally(responseText);
  } catch (firstError) {
    if (!apiKey) {
      const salvaged = salvageScriptJson(responseText);
      if (salvaged) {
        console.warn(
          `[parseAiJson] ${contextLabel}: JSON recuperado via salvage (modo navegador).`
        );
        return salvaged;
      }
      throw new Error(
        `${contextLabel}: resposta do Gemini não veio em JSON válido. ` +
          "Tente de novo ou desative o modo navegador e use a API."
      );
    }

    const candidate = extractJsonCandidate(responseText);
    const repairPrompt = `Corrija o texto abaixo para JSON 100% valido. Preserve todos os dados e textos originais, apenas corrija sintaxe JSON, aspas internas, virgulas e escapes. Retorne APENAS o JSON corrigido, sem markdown.\n\n${candidate}`;

    try {
      const repairedText = await callGeminiWithRetry(apiKey, repairPrompt, {
        maxRetries: 2,
        models: ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"],
      });
      return parseJsonLocally(repairedText);
    } catch (repairError) {
      repairError.message = `${contextLabel}: ${firstError.message}`;
      throw repairError;
    }
  }
}

function normalizeApiKeys(...values) {
  const keys = [];

  for (const value of values) {
    if (Array.isArray(value)) {
      keys.push(...value);
    } else if (typeof value === "string" && value.includes(",")) {
      keys.push(...value.split(","));
    } else if (value) {
      keys.push(value);
    }
  }

  return [...new Set(keys.map((key) => String(key).trim()).filter(Boolean))];
}

function getApiKeys(projectDir = WORKSPACE_DIR) {
  const keys = normalizeApiKeys(
    process.env.GEMINI_API_KEYS,

    process.env.GOOGLE_API_KEYS,

    process.env.GEMINI_API_KEY,

    process.env.GOOGLE_API_KEY
  );

  const appendConfigKeys = (configPath) => {
    const config = readJsonFile(configPath);

    if (config) {
      keys.push(
        ...normalizeApiKeys(
          config.gemini_api_keys,
          config.google_api_keys,
          config.gemini_api_key,
          config.google_api_key
        )
      );
    }
  };

  appendConfigKeys(path.join(projectDir, "config_qanat.json"));

  if (projectDir !== WORKSPACE_DIR) {
    appendConfigKeys(path.join(WORKSPACE_DIR, "config_qanat.json"));
  }

  return [...new Set(keys)];
}

function getApiKey(projectDir = WORKSPACE_DIR) {
  const provider = getAiProvider(projectDir);

  if (provider === "xai") {
    return getXaiApiKey(projectDir);
  }

  if (provider === "openrouter") {
    return getOpenRouterApiKey(projectDir);
  }

  if (provider === "inference") {
    return getInferenceApiKey(projectDir);
  }

  const keys = getApiKeys(projectDir);

  if (keys.length > 0) return keys[0];

  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;

  // Try current project dir first

  const configPath = path.join(projectDir, "config_qanat.json");

  const projectConfig = readJsonFile(configPath);

  if (projectConfig?.gemini_api_key) {
    return projectConfig.gemini_api_key;
  }

  // Fallback to workspace root

  if (projectDir !== WORKSPACE_DIR) {
    const rootConfigPath = path.join(WORKSPACE_DIR, "config_qanat.json");

    const rootConfig = readJsonFile(rootConfigPath);

    if (rootConfig?.gemini_api_key) {
      return rootConfig.gemini_api_key;
    }
  }

  return null;
}

function getXaiApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.XAI_API_KEY) return process.env.XAI_API_KEY;

  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);

    return config?.xai_api_key || config?.grok_api_key || null;
  };

  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));

  if (projectKey) return projectKey;

  if (projectDir !== WORKSPACE_DIR) {
    return readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json"));
  }

  return null;
}

function getNvidiaApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;

  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    return config?.nvidia_api_key || null;
  };

  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));
  if (projectKey) return projectKey;

  if (projectDir !== WORKSPACE_DIR) {
    return readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json"));
  }
  return null;
}

function getAlibabaApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.ALIBABA_API_KEY || process.env.DASHSCOPE_API_KEY) {
    return (
      String(
        process.env.ALIBABA_API_KEY || process.env.DASHSCOPE_API_KEY
      ).trim() || null
    );
  }
  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    const k =
      config?.alibaba_api_key ||
      config?.dashscope_api_key ||
      config?.aliyun_api_key ||
      null;
    return typeof k === "string" && k.trim() ? k.trim() : null;
  };
  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));
  if (projectKey) return projectKey;
  if (projectDir !== WORKSPACE_DIR) {
    return readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json"));
  }
  return null;
}

function getAlibabaBaseUrl(projectDir = WORKSPACE_DIR) {
  const normalize = (raw) => {
    let u = String(raw || "")
      .trim()
      .replace(/\/+$/, "");
    if (!u) return "";
    // Aceita host puro, /api/v1 (DashScope nativo) ou /compatible-mode/v1
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    if (u.endsWith("/api/v1")) {
      u = u.replace(/\/api\/v1$/, "/compatible-mode/v1");
    } else if (!/\/compatible-mode\/v1$/i.test(u) && !/\/v1$/i.test(u)) {
      u = `${u}/compatible-mode/v1`;
    }
    return u;
  };

  if (process.env.ALIBABA_BASE_URL || process.env.DASHSCOPE_API_BASE) {
    const fromEnv = normalize(
      process.env.ALIBABA_BASE_URL || process.env.DASHSCOPE_API_BASE
    );
    if (fromEnv) return fromEnv;
  }

  const readBase = (configPath) => {
    const config = readJsonFile(configPath);
    return normalize(
      config?.alibaba_base_url ||
        config?.alibaba_api_host ||
        config?.dashscope_base_url ||
        ""
    );
  };

  return (
    readBase(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readBase(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : "") ||
    ALIBABA_DEFAULT_BASE_URL
  );
}

function getAlibabaModel(projectDir = WORKSPACE_DIR) {
  const readModel = (configPath) => {
    const config = readJsonFile(configPath);
    const model = String(
      config?.alibaba_model || config?.dashscope_model || ""
    ).trim();
    return model && ALIBABA_MODELS.includes(model) ? model : null;
  };
  return (
    readModel(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readModel(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    process.env.ALIBABA_MODEL ||
    DEFAULT_ALIBABA_MODEL
  );
}

function getAlibabaModelChain(
  projectDir = WORKSPACE_DIR,
  modelsOverride = null
) {
  if (Array.isArray(modelsOverride) && modelsOverride.length) {
    return [...new Set(modelsOverride.map(String))];
  }
  const primary = getAlibabaModel(projectDir);
  return [...new Set([primary, ...ALIBABA_MODELS])];
}

async function callAlibabaWithRetry(
  promptOrBody,
  {
    maxRetries = 3,
    bodyOverride = null,
    projectDir = WORKSPACE_DIR,
    temperature = null,
    models = null,
    maxTokens = null,
  } = {}
) {
  const apiKey = getAlibabaApiKey(projectDir);
  if (!apiKey) {
    throw new Error("Chave de API da Alibaba (DashScope) não configurada.");
  }
  const baseUrl = getAlibabaBaseUrl(projectDir).replace(/\/+$/, "");
  const messages = convertGeminiToOpenRouterMessages(
    promptOrBody,
    bodyOverride
  );
  const tokenLimit = Math.max(256, Math.min(32000, Number(maxTokens) || 8192));
  let lastError = null;
  const modelList =
    Array.isArray(models) && models.length
      ? models
      : getAlibabaModelChain(projectDir);

  for (const model of modelList) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[Alibaba/DashScope] Tentando modelo: ${model} (Tentativa ${attempt}/${maxRetries}) @ ${baseUrl}`
        );
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: tokenLimit,
            ...(temperature !== null ? { temperature } : {}),
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const msg = result.choices?.[0]?.message || {};
          let responseText = typeof msg.content === "string" ? msg.content : "";
          if (!responseText && Array.isArray(msg.content)) {
            responseText = msg.content
              .map((part) =>
                typeof part === "string"
                  ? part
                  : part?.text || part?.content || ""
              )
              .join("\n");
          }
          if (!responseText) {
            responseText = msg.reasoning_content || msg.reasoning || "";
          }
          responseText = String(responseText || "")
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          if (responseText) {
            console.log(
              `[Alibaba/DashScope] Sucesso model=${model} tentativa ${attempt} (${responseText.length} chars)`
            );
            return responseText;
          }
          console.warn(
            `[Alibaba/DashScope] ${model} retornou vazio na tentativa ${attempt}/${maxRetries}`
          );
        }

        const errData = await response.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          errData.message ||
          response.statusText ||
          `HTTP ${response.status}`;
        lastError = new Error(`${model}: ${errMsg}`);
        console.warn(
          `[Alibaba/DashScope] ${response.status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg}`
        );

        // Modelo não comprado / sem cota — tenta próximo modelo
        if (
          response.status === 403 ||
          /Unpurchased|AccessDenied|access_denied|not eligible/i.test(errMsg)
        ) {
          break;
        }
        if (response.status === 503 || response.status === 429) {
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        if (response.status === 401) {
          throw new Error(
            `Alibaba: chave inválida ou sem permissão (${errMsg})`
          );
        }
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `[Alibaba/DashScope] Erro na tentativa ${attempt} para ${model}: ${err.message}`
        );
        if (/chave inválida/i.test(err.message || "")) throw err;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw (
    lastError ||
    new Error(
      "Falha ao chamar Alibaba DashScope. Ative o modelo no Model Studio (console) e confira a cota free."
    )
  );
}

function getTokenRouterApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.TOKENROUTER_API_KEY) {
    return String(process.env.TOKENROUTER_API_KEY).trim() || null;
  }
  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    const k =
      config?.tokenrouter_api_key || config?.token_router_api_key || null;
    return typeof k === "string" && k.trim() ? k.trim() : null;
  };
  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));
  if (projectKey) return projectKey;
  if (projectDir !== WORKSPACE_DIR) {
    return readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json"));
  }
  return null;
}

function getTokenRouterBaseUrl(projectDir = WORKSPACE_DIR) {
  const normalize = (raw) => {
    let u = String(raw || "")
      .trim()
      .replace(/\/+$/, "");
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    if (!/\/v1$/i.test(u)) u = `${u}/v1`;
    return u;
  };

  if (process.env.TOKENROUTER_BASE_URL) {
    const fromEnv = normalize(process.env.TOKENROUTER_BASE_URL);
    if (fromEnv) return fromEnv;
  }

  const readBase = (configPath) => {
    const config = readJsonFile(configPath);
    return normalize(config?.tokenrouter_base_url || "");
  };

  return (
    readBase(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readBase(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : "") ||
    TOKENROUTER_DEFAULT_BASE_URL
  );
}

function getTokenRouterModel(projectDir = WORKSPACE_DIR) {
  const readModel = (configPath) => {
    const config = readJsonFile(configPath);
    const model = String(config?.tokenrouter_model || "").trim();
    // Aceita modelos da lista ou IDs livres do catálogo TokenRouter
    return model || null;
  };
  return (
    readModel(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readModel(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    process.env.TOKENROUTER_MODEL ||
    DEFAULT_TOKENROUTER_MODEL
  );
}

function getTokenRouterModelChain(
  projectDir = WORKSPACE_DIR,
  modelsOverride = null
) {
  if (Array.isArray(modelsOverride) && modelsOverride.length) {
    return [...new Set(modelsOverride.map(String))];
  }
  const primary = getTokenRouterModel(projectDir);
  return [...new Set([primary, ...TOKENROUTER_MODELS])];
}

function getMinimaxApiKey(projectDir = WORKSPACE_DIR) {
  const config = readJsonFile(path.join(projectDir, "config_qanat.json"));
  return config?.minimax_api_key || process.env.MINIMAX_API_KEY || null;
}
function getMinimaxBaseUrl(projectDir = WORKSPACE_DIR) {
  const config = readJsonFile(path.join(projectDir, "config_qanat.json"));
  let u = String(config?.minimax_base_url || "").trim();
  if (u) {
    u = u.replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    if (!/\/v1$/i.test(u)) u = `${u}/v1`;
    return u;
  }
  return "https://api.minimax.chat/v1";
}
function getMinimaxModel(projectDir = WORKSPACE_DIR) {
  const config = readJsonFile(path.join(projectDir, "config_qanat.json"));
  return String(config?.minimax_model || "").trim() || "minimax-m3";
}
const MINIMAX_MODELS = ["minimax-m3", "minimax-m2.7", "minimax-m2.5"];
function getMinimaxModelChain(
  projectDir = WORKSPACE_DIR,
  modelsOverride = null
) {
  if (Array.isArray(modelsOverride) && modelsOverride.length)
    return [...new Set(modelsOverride.map(String))];
  const primary = getMinimaxModel(projectDir);
  return [...new Set([primary, ...MINIMAX_MODELS])];
}

/**
 * TokenRouter (OpenAI SDK compatible):
 *   from openai import OpenAI
 *   client = OpenAI(base_url="https://api.tokenrouter.com/v1", api_key="sk-…")
 *   client.chat.completions.create(
 *     model="z-ai/glm-5.2-free",
 *     messages=[{"role":"system",...},{"role":"user",...}],
 *   )
 * No Lumiera usamos o endpoint /chat/completions (não-stream) com a mesma API.
 */
async function callTokenRouterWithRetry(
  promptOrBody,
  {
    maxRetries = 3,
    bodyOverride = null,
    projectDir = WORKSPACE_DIR,
    temperature = null,
    models = null,
    maxTokens = null,
  } = {}
) {
  const apiKey = getTokenRouterApiKey(projectDir);
  if (!apiKey) {
    throw new Error("Chave de API TokenRouter não configurada.");
  }
  const baseUrl = getTokenRouterBaseUrl(projectDir).replace(/\/+$/, "");
  const messages = convertGeminiToOpenRouterMessages(
    promptOrBody,
    bodyOverride
  );
  const tokenLimit = Math.max(256, Math.min(32000, Number(maxTokens) || 8192));
  let lastError = null;
  const modelList =
    Array.isArray(models) && models.length
      ? models
      : getTokenRouterModelChain(projectDir);

  for (const model of modelList) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const t0 = Date.now();
      try {
        console.log(
          `[TokenRouter] Tentando modelo: ${model} (Tentativa ${attempt}/${maxRetries}) @ ${baseUrl}`
        );
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: tokenLimit,
            ...(temperature !== null ? { temperature } : {}),
          }),
        });
        const ms = Date.now() - t0;

        if (response.ok) {
          const result = await response.json();
          const msg = result.choices?.[0]?.message || {};
          let responseText = typeof msg.content === "string" ? msg.content : "";
          if (!responseText && Array.isArray(msg.content)) {
            responseText = msg.content
              .map((part) =>
                typeof part === "string"
                  ? part
                  : part?.text || part?.content || ""
              )
              .join("\n");
          }
          // GLM free (z-ai/*) e modelos "reasoning" às vezes só preenchem reasoning_content
          const reasoning = String(
            msg.reasoning_content || msg.reasoning || ""
          ).trim();
          if (!responseText && reasoning) {
            responseText = reasoning;
          } else if (
            responseText &&
            reasoning &&
            responseText.length < 20 &&
            reasoning.length > responseText.length * 2
          ) {
            // content minúsculo + reasoning longo → preferir reasoning
            responseText = reasoning;
          }
          responseText = String(responseText || "")
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          if (responseText) {
            console.log(
              `[TokenRouter] Sucesso model=${model} tentativa ${attempt} (${responseText.length} chars · ${ms}ms)`
            );
            return responseText;
          }
          console.warn(
            `[TokenRouter] ${model} retornou vazio na tentativa ${attempt}/${maxRetries} · ${ms}ms`
          );
        }

        const errData = await response.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          errData.message ||
          response.statusText ||
          `HTTP ${response.status}`;
        lastError = new Error(`${model}: ${errMsg}`);
        console.warn(
          `[TokenRouter] ${response.status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg} · ${ms}ms`
        );

        if (response.status === 401) {
          throw new Error(
            `TokenRouter: chave inválida ou sem permissão (${errMsg})`
          );
        }
        if (response.status === 404 || response.status === 400) {
          // modelo inválido → próximo da cadeia
          break;
        }
        if (response.status === 503 || response.status === 429) {
          const delay = Math.min(1500 * Math.pow(2, attempt - 1), 10000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `[TokenRouter] Erro na tentativa ${attempt} para ${model}: ${err.message}`
        );
        if (/chave inválida/i.test(err.message || "")) throw err;
        await new Promise((r) => setTimeout(r, Math.min(400 * attempt, 1200)));
      }
    }
  }
  throw (
    lastError ||
    new Error(
      "Falha ao chamar TokenRouter. Confira a chave, o modelo e https://api.tokenrouter.com/v1"
    )
  );
}

function getInferenceApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.INFERENCE_API_KEY) return process.env.INFERENCE_API_KEY;

  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    return config?.inference_api_key || null;
  };

  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));
  if (projectKey) return projectKey;

  if (projectDir !== WORKSPACE_DIR) {
    return readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json"));
  }
  return null;
}

/**
 * Provedor de IA ativo — sempre flexível via config_qanat.json.
 * Ordem: projeto ativo → workspace → default "gemini".
 * Nunca trava em OpenRouter/NVIDIA; troca nas Configurações vale na hora.
 */
function getAiProvider(projectDir = WORKSPACE_DIR) {
  const readProvider = (configPath) => {
    const config = readJsonFile(configPath);
    const p = config?.ai_provider || config?.metadata_provider || null;
    if (!p) return null;
    const n = String(p).trim().toLowerCase();
    if (!n) return null;
    // Providers removidos — caem no default
    if (n === "inference") return null;
    // Aliases legados → nome canônico
    if (n === "dashscope" || n === "aliyun" || n === "qwen_cloud")
      return "alibaba";
    if (n === "token_router" || n === "token-router") return "tokenrouter";
    if (n === "minimax-m3") return "minimax";
    // Qualquer outro valor salvo é aceito diretamente (sem allowlist rígida)
    return n;
  };

  return (
    readProvider(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR
      ? readProvider(path.join(WORKSPACE_DIR, "config_qanat.json"))
      : null) ||
    "gemini"
  );
}

/** Modelo primário do provedor ativo (para painel de atividade / health). */
function getActiveAiModel(projectDir = WORKSPACE_DIR) {
  const provider = getAiProvider(projectDir);
  try {
    if (provider === "openrouter") return getOpenRouterModel(projectDir);
    if (provider === "nvidia") return getNvidiaModel(projectDir);
    if (provider === "alibaba") return getAlibabaModel(projectDir);
    if (provider === "tokenrouter") return getTokenRouterModel(projectDir);
    if (provider === "minimax") return getMinimaxModel(projectDir);
    if (provider === "opencode") return getOpenCodeModel(projectDir);
    if (provider === "xai") {
      return Array.isArray(XAI_MODELS) && XAI_MODELS[0]
        ? XAI_MODELS[0]
        : "grok";
    }
    if (provider === "local") return getLocalLlmModel(projectDir);
    if (provider === "omniroute") return getOmniRouteModel(projectDir);
  } catch {
    /* fall through */
  }
  return getGeminiModel(projectDir);
}

function isGeminiBrowserModeEnabled(projectDir = WORKSPACE_DIR) {
  const readMode = (configPath) => {
    const config = readJsonFile(configPath);
    return getGeminiBrowserMode(config);
  };
  const workspaceMode = readMode(path.join(WORKSPACE_DIR, "config_qanat.json"));
  if (workspaceMode === false) return false;
  return readMode(path.join(projectDir, "config_qanat.json")) || workspaceMode;
}

function shouldOfferGeminiBrowser(projectDir = WORKSPACE_DIR) {
  // Gemini Browser is intentionally disabled until it has a dedicated, audited flow.
  // Creator and all production routes must use the configured API provider instead.
  void projectDir;
  return false;
}

/**
 * Ponto único: API Gemini ou modo navegador (extensão / copiar-colar).
 * Retorna texto da IA, ou null se já respondeu com needs_browser.
 */
async function callGeminiLlm(
  req,
  res,
  projDir,
  {
    title = "Consulta IA Lumiera",
    prompt = null,
    bodyOverride = null,
    temperature = null,
    models = null,
    maxTokens = null,
  } = {}
) {
  const browserText = extractBrowserResponse(req.body);
  if (browserText) return browserText;

  if (shouldOfferGeminiBrowser(projDir)) {
    const browserOpts = resolveBrowserPromptOpts(title, String(prompt ?? ""));
    const promptText = bodyOverride
      ? buildPromptFromBodyOverride(bodyOverride)
      : buildBrowserTaskPrompt(title, String(prompt ?? ""), "", browserOpts);
    res.json(offerGeminiBrowserPayload({ title, prompt: promptText }));
    return null;
  }

  const provider = getAiProvider(projDir);
  if (provider === "nvidia") {
    const apiKey = getNvidiaApiKey(projDir);
    if (!apiKey) {
      res.status(401).json({
        error: "Chave de API da NVIDIA não configurada nas configurações.",
      });
      return null;
    }
  }
  if (provider === "alibaba") {
    const apiKey = getAlibabaApiKey(projDir);
    if (!apiKey) {
      res.status(401).json({
        error:
          "Chave de API da Alibaba (DashScope) não configurada nas configurações.",
      });
      return null;
    }
  }
  if (provider === "tokenrouter") {
    const apiKey = getTokenRouterApiKey(projDir);
    if (!apiKey) {
      res.status(401).json({
        error: "Chave de API TokenRouter não configurada nas configurações.",
      });
      return null;
    }
  }
  if (provider === "gemini") {
    const apiKey = getApiKey(projDir);
    if (!apiKey) {
      res.status(401).json({
        error:
          "Chave de API não configurada. Ative Gemini no Chrome nas configurações ou adicione uma chave.",
      });
      return null;
    }
  }

  return callGeminiWithRetry(getApiKey(projDir), prompt, {
    bodyOverride,
    temperature,
    projectDir: projDir,
    models,
    maxTokens,
    activityLabel: title || "Consulta IA Lumiera",
    activityDetail: String(prompt || "").slice(0, 120),
  });
}

/**
 * LLM rápido para Studio (comentários): 1 tentativa no provider ativo,
 * fallback Gemini API, depois modo navegador se habilitado.
 */
async function callStudioQuickLlm(
  req,
  res,
  projDir,
  { title = "Consulta IA Lumiera", prompt, temperature = 0.7 } = {}
) {
  const browserText = extractBrowserResponse(req.body);
  if (browserText) return String(browserText).trim();

  const failures = [];
  const run = async (label, fn) => {
    try {
      const text = String((await fn()) || "").trim();
      if (text) return text;
      failures.push(`${label}: resposta vazia`);
    } catch (err) {
      failures.push(`${label}: ${err.message}`);
      console.warn(`[Studio LLM] ${label} falhou:`, err.message);
    }
    return null;
  };

  const provider = getAiProvider(projDir);
  const quickModels =
    provider === "nvidia"
      ? [getNvidiaModel(projDir)]
      : provider === "inference"
        ? [getInferenceModel(projDir)]
        : provider === "xai"
          ? XAI_MODELS.slice(0, 1)
          : provider === "openrouter"
            ? [getOpenRouterModel(projDir)]
            : [getGeminiModel(projDir), "gemini-3.5-flash", "gemini-2.5-flash"];

  const text = await run(provider, () =>
    callGeminiWithRetry(getApiKey(projDir), prompt, {
      maxRetries: 1,
      models: quickModels,
      temperature,
      projectDir: projDir,
    })
  );

  if (!text && isGeminiBrowserModeEnabled(projDir)) {
    const browserOpts = resolveBrowserPromptOpts(title, String(prompt ?? ""));
    const promptText = buildBrowserTaskPrompt(
      title,
      String(prompt ?? ""),
      "",
      browserOpts
    );
    res.json(offerGeminiBrowserPayload({ title, prompt: promptText }));
    return null;
  }

  if (!text) {
    throw new Error(
      failures[0] ||
        "IA indisponível. Verifique Integrações ou ative Gemini no Chrome."
    );
  }
  return text;
}

function getEpidemicSoundKey(projectDir = WORKSPACE_DIR) {
  const globalCfg = loadRenderConfig(__dirname);

  if (
    globalCfg?.epidemic_sound_key &&
    globalCfg.epidemic_sound_key.trim().length > 100
  ) {
    return globalCfg.epidemic_sound_key.trim();
  }

  const config = readJsonFile(path.join(projectDir, "config_qanat.json"));

  if (
    config?.epidemic_sound_key &&
    config.epidemic_sound_key.trim().length > 100
  ) {
    return config.epidemic_sound_key.trim();
  }

  if (projectDir !== WORKSPACE_DIR) {
    const rootConfig = readJsonFile(
      path.join(WORKSPACE_DIR, "config_qanat.json")
    );

    if (
      rootConfig?.epidemic_sound_key &&
      rootConfig.epidemic_sound_key.trim().length > 100
    ) {
      return rootConfig.epidemic_sound_key.trim();
    }
  }

  if (
    process.env.EPIDEMIC_SOUND_API_KEY &&
    process.env.EPIDEMIC_SOUND_API_KEY.trim().length > 100
  ) {
    return process.env.EPIDEMIC_SOUND_API_KEY.trim();
  }

  return null;
}

async function generateMetadataWithNvidia(prompt, apiKey, format = "LONG") {
  const formatLabel =
    format === "SHORT" ? "YouTube Shorts" : "vídeos longos do YouTube";

  let lastError = null;
  for (const model of NVIDIA_MODELS) {
    try {
      console.log(`[NVIDIA API - Metadata] Tentando modelo: ${model}`);
      const response = await fetch(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content: `Você é um especialista em SEO e CTR para ${formatLabel}. Retorne apenas o markdown solicitado, com headers exatos.`,
              },
              { role: "user", content: prompt },
            ],
          }),
        }
      );

      if (!response.ok) {
        let errData = {};
        try {
          errData = await response.json();
        } catch (e) {}
        const errMsg = errData.error?.message || response.statusText;
        console.warn(
          `[NVIDIA API - Metadata] Erro ${response.status} de ${model}: ${errMsg}`
        );
        lastError = new Error(`Erro da NVIDIA [${model}]: ${errMsg}`);
        continue;
      }

      const result = await response.json();
      const responseText = result.choices?.[0]?.message?.content || "";
      if (responseText) {
        console.log(`[NVIDIA API - Metadata] Sucesso com modelo=${model}`);
        return responseText;
      }
    } catch (err) {
      console.warn(
        `[NVIDIA API - Metadata] Exceção com ${model}: ${err.message}`
      );
      lastError = err;
    }
  }
  throw (
    lastError ||
    new Error(
      "Falha ao gerar metadados com NVIDIA API após tentar todos os modelos."
    )
  );
}

async function generateMetadataWithXai(prompt, apiKey, format = "LONG") {
  const formatLabel =
    format === "SHORT" ? "YouTube Shorts" : "vídeos longos do YouTube";

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      Authorization: `Bearer ${apiKey}`,
    },

    body: JSON.stringify({
      model: "grok-4.3",

      messages: [
        {
          role: "system",
          content: `Você é um especialista em SEO e CTR para ${formatLabel}. Retorne apenas o markdown solicitado, com headers exatos.`,
        },

        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    let errData = {};

    try {
      errData = await response.json();
    } catch (e) {}

    throw new Error(
      errData.error?.message || `Erro da xAI: ${response.statusText}`
    );
  }

  const result = await response.json();

  return (
    result.choices?.[0]?.message?.content || "Erro ao gerar metadados com Grok."
  );
}

// API: Check if Gemini API key exists

app.get("/api/ai/progress/:jobId", (req, res) => {
  const job = getJobProgress(req.params.jobId);
  if (!job) {
    return res.status(404).json({
      error: "Job não encontrado",
      percent: 0,
      label: "Aguardando…",
      phase: "unknown",
    });
  }
  res.json(job);
});

app.post("/api/ai/progress/:jobId", (req, res) => {
  const id = normalizeJobId(req.params.jobId);
  if (!id) return res.status(400).json({ error: "jobId inválido" });
  const { phase, label, percent, detail } = req.body || {};
  setJobProgress(id, {
    phase: phase || "client",
    label: label || "Processando…",
    percent: Number(percent) || 0,
    detail: detail || "",
  });
  res.json({ ok: true });
});

app.get("/api/ai/key-status", (req, res) => {
  const projDir = getProjectDir(req);

  const provider = getAiProvider(projDir);

  if (provider === "omniroute") {
    return res.json({
      has_key: true,
      provider: "omniroute",
      has_custom_key: !!getOmniRouteApiKey(projDir),
    });
  }

  if (provider === "openrouter") {
    return res.json({
      has_key: !!getOpenRouterApiKey(projDir),
      provider: "openrouter",
    });
  }

  if (provider === "xai") {
    return res.json({ has_key: !!getXaiApiKey(projDir), provider: "xai" });
  }

  if (provider === "alibaba") {
    return res.json({
      has_key: !!getAlibabaApiKey(projDir),
      provider: "alibaba",
    });
  }

  if (provider === "tokenrouter") {
    return res.json({
      has_key: !!getTokenRouterApiKey(projDir),
      provider: "tokenrouter",
    });
  }

  if (provider === "minimax") {
    return res.json({
      has_key: !!getMinimaxApiKey(projDir),
      provider: "minimax",
    });
  }

  if (provider === "nvidia") {
    return res.json({
      has_key: !!getNvidiaApiKey(projDir),
      provider: "nvidia",
    });
  }

  if (provider === "gemini" && isGeminiBrowserModeEnabled(projDir)) {
    return res.json({
      has_key: true,
      provider: "gemini",
      browser_mode: true,
      key_count: 0,
    });
  }

  const configuredKeys = getApiKeys(projDir);

  if (configuredKeys.length > 0) {
    return res.json({ has_key: true, key_count: configuredKeys.length });
  }

  const configPath = path.join(projDir, "config_qanat.json");

  let hasKey = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;

  if (!hasKey && fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

      if (config.gemini_api_key) {
        hasKey = true;
      }
    } catch (e) {}
  }

  // Try fallback to root config

  if (!hasKey && projDir !== WORKSPACE_DIR) {
    const rootConfigPath = path.join(WORKSPACE_DIR, "config_qanat.json");

    if (fs.existsSync(rootConfigPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(rootConfigPath, "utf8"));

        if (config.gemini_api_key) {
          hasKey = true;
        }
      } catch (e) {}
    }
  }

  res.json({ has_key: hasKey });
});

// API: Save Gemini API key to config_qanat.json

app.post("/api/ai/save-key", (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ error: "Chave de API não fornecida" });
  }

  const projDir = getProjectDir(req);

  const configPath = path.join(projDir, "config_qanat.json");

  try {
    let config = {};

    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }

    config.gemini_api_key = key;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    res.json({
      success: true,
      message: "Chave de API salva com sucesso no config_qanat.json",
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao salvar a chave", details: err.message });
  }
});

app.get("/api/ai/settings", (req, res) => {
  const projDir = getProjectDir(req);

  const config = readJsonFile(path.join(projDir, "config_qanat.json")) || {};

  res.json({
    provider: getAiProvider(projDir),

    gemini_model: getGeminiModel(projDir),

    gemini_model_options: GEMINI_MODEL_OPTIONS,

    inference_model: getInferenceModel(projDir),

    inference_model_options: INFERENCE_MODEL_OPTIONS,

    openrouter_model: getOpenRouterModel(projDir),

    openrouter_model_options: OPENROUTER_MODEL_OPTIONS,

    nvidia_model: getNvidiaModel(projDir),

    nvidia_model_options: NVIDIA_MODEL_OPTIONS,

    alibaba_model: getAlibabaModel(projDir),
    alibaba_model_options: ALIBABA_MODEL_OPTIONS,
    alibaba_base_url: getAlibabaBaseUrl(projDir),

    tokenrouter_model: getTokenRouterModel(projDir),
    minimax_model: getMinimaxModel(projDir),
    minimax_base_url: getMinimaxBaseUrl(projDir),
    tokenrouter_model_options: TOKENROUTER_MODEL_OPTIONS,
    tokenrouter_base_url: getTokenRouterBaseUrl(projDir),

    opencode_model: getOpenCodeModel(projDir),
    opencode_model_options: OPENCODE_MODEL_OPTIONS,
    opencode_base_url: getOpenCodeBaseUrl(projDir),
    has_opencode_key: !!getOpenCodeApiKey(projDir),

    airforce_model: getAirForceModel(projDir),
    airforce_model_options: AIRFORCE_MODEL_OPTIONS,
    airforce_base_url: getAirForceBaseUrl(projDir),
    has_airforce_key: !!getAirForceApiKey(projDir),

    moonai_model: getMoonAiModel(projDir),
    moonai_model_options: MOONAI_MODEL_OPTIONS,
    moonai_base_url: getMoonAiBaseUrl(projDir),
    has_moonai_key: !!getMoonAiApiKey(projDir),

    omniroute_model: getOmniRouteModel(projDir),
    omniroute_model_options: OMNIROUTE_MODEL_OPTIONS,
    omniroute_base_url: getOmniRouteBaseUrl(projDir),
    has_omniroute_key: !!getOmniRouteApiKey(projDir),

    gemini_key_count: getApiKeys(projDir).length,

    has_xai_key: !!getXaiApiKey(projDir),

    has_openrouter_key: !!getOpenRouterApiKey(projDir),
    has_openrouter_user_key: hasUserOpenRouterApiKey(projDir),
    has_nvidia_key: !!getNvidiaApiKey(projDir),
    has_alibaba_key: !!getAlibabaApiKey(projDir),
    has_tokenrouter_key: !!getTokenRouterApiKey(projDir),
    has_minimax_key: !!getMinimaxApiKey(projDir),
    has_inference_key: !!getInferenceApiKey(projDir),

    has_epidemic_key: true,

    gemini_browser_mode: isGeminiBrowserModeEnabled(projDir),
    local_llm_url: getLocalLlmUrl(projDir),
    local_llm_model: getLocalLlmModel(projDir),
  });
});

app.post("/api/ai/settings", (req, res) => {
  const projDir = getProjectDir(req);

  // Salva no arquivo global do workspace e opcionalmente no projeto ativo
  const configPaths = [path.join(WORKSPACE_DIR, "config_qanat.json")];
  if (projDir !== WORKSPACE_DIR) {
    configPaths.push(path.join(projDir, "config_qanat.json"));
  }

  const {
    provider,
    gemini_model,
    inference_model,
    openrouter_model,
    nvidia_model,
    alibaba_model,
    alibaba_base_url,
    tokenrouter_model,
    minimax_model,
    minimax_base_url,
    tokenrouter_base_url,
    opencode_model,
    opencode_base_url,
    opencode_key,
    airforce_model,
    airforce_base_url,
    airforce_key,
    moonai_model,
    moonai_base_url,
    moonai_key,
    gemini_key,
    gemini_keys,
    xai_key,
    openrouter_key,
    nvidia_key,
    alibaba_key,
    dashscope_key,
    tokenrouter_key,
    minimax_key,
    inference_key,
    epidemic_sound_key,
    gemini_browser_mode,
    local_llm_url,
    local_llm_model,
    omniroute_model,
    omniroute_base_url,
    omniroute_key,
  } = req.body || {};

  try {
    const applyAiSettings = (config = {}) => {
      const next = { ...config };

      if (typeof provider === "string" && provider.trim()) {
        const n = provider.trim().toLowerCase();
        if (n === "inference") {
          next.ai_provider = "gemini";
        } else {
          next.ai_provider =
            n === "dashscope" || n === "aliyun" || n === "qwen_cloud"
              ? "alibaba"
              : n === "token_router" || n === "token-router"
                ? "tokenrouter"
                : n === "minimax-m3"
                  ? "minimax"
                  : n;
        }
      }

      if (typeof gemini_model === "string" && gemini_model.trim()) {
        const normalizedModel = gemini_model.trim();
        if (GEMINI_MODEL_FALLBACKS.includes(normalizedModel)) {
          next.gemini_model = normalizedModel;
        }
      }

      if (typeof inference_model === "string" && inference_model.trim()) {
        const normalizedInferenceModel = inference_model.trim();
        if (INFERENCE_MODEL_FALLBACKS.includes(normalizedInferenceModel)) {
          next.inference_model = normalizedInferenceModel;
        }
      }

      if (typeof openrouter_model === "string" && openrouter_model.trim()) {
        const normalizedOpenRouterModel = openrouter_model.trim();
        if (OPENROUTER_FREE_MODELS.includes(normalizedOpenRouterModel)) {
          next.openrouter_model = normalizedOpenRouterModel;
        }
      }

      if (typeof nvidia_model === "string" && nvidia_model.trim()) {
        const normalizedNvidiaModel = nvidia_model.trim();
        if (NVIDIA_MODELS.includes(normalizedNvidiaModel)) {
          next.nvidia_model = normalizedNvidiaModel;
        }
      }

      if (typeof alibaba_model === "string" && alibaba_model.trim()) {
        const normalizedAlibabaModel = alibaba_model.trim();
        if (ALIBABA_MODELS.includes(normalizedAlibabaModel)) {
          next.alibaba_model = normalizedAlibabaModel;
        }
      }

      if (typeof alibaba_base_url === "string" && alibaba_base_url.trim()) {
        next.alibaba_base_url = alibaba_base_url.trim().replace(/\/+$/, "");
      }

      if (typeof tokenrouter_model === "string" && tokenrouter_model.trim()) {
        next.tokenrouter_model = tokenrouter_model.trim();
      }

      if (
        typeof tokenrouter_base_url === "string" &&
        tokenrouter_base_url.trim()
      ) {
        let u = tokenrouter_base_url.trim().replace(/\/+$/, "");
        if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
        if (!/\/v1$/i.test(u)) u = `${u}/v1`;
        next.tokenrouter_base_url = u;
      }

      const alibabaKeyIn =
        (typeof alibaba_key === "string" && alibaba_key.trim()) ||
        (typeof dashscope_key === "string" && dashscope_key.trim()) ||
        "";
      if (alibabaKeyIn) {
        next.alibaba_api_key = alibabaKeyIn;
        next.dashscope_api_key = alibabaKeyIn;
      }

      if (typeof tokenrouter_key === "string" && tokenrouter_key.trim()) {
        next.tokenrouter_api_key = tokenrouter_key.trim();
      }

      if (typeof minimax_key === "string" && minimax_key.trim()) {
        next.minimax_api_key = minimax_key.trim();
      }

      if (typeof minimax_model === "string" && minimax_model.trim()) {
        next.minimax_model = minimax_model.trim();
      }

      if (typeof minimax_base_url === "string" && minimax_base_url.trim()) {
        let u = minimax_base_url.trim().replace(/\/+$/, "");
        if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
        if (!/\/v1$/i.test(u)) u = `${u}/v1`;
        next.minimax_base_url = u;
      }

      const parsedGeminiKeys = normalizeApiKeys(gemini_keys, gemini_key);
      if (parsedGeminiKeys.length > 0) {
        next.gemini_api_keys = parsedGeminiKeys;
        next.gemini_api_key = parsedGeminiKeys[0];
      }

      if (typeof xai_key === "string" && xai_key.trim()) {
        const trimmedXaiKey = xai_key.trim();
        next.xai_api_key = trimmedXaiKey.startsWith("xai-")
          ? trimmedXaiKey
          : `xai-${trimmedXaiKey}`;
      }

      if (typeof openrouter_key === "string" && openrouter_key.trim()) {
        next.openrouter_api_key = openrouter_key.trim();
      }

      if (typeof nvidia_key === "string" && nvidia_key.trim()) {
        next.nvidia_api_key = nvidia_key.trim();
      }

      if (typeof inference_key === "string" && inference_key.trim()) {
        next.inference_api_key = inference_key.trim();
      }

      if (typeof epidemic_sound_key === "string") {
        next.epidemic_sound_key = epidemic_sound_key.trim();
      }

      if (typeof gemini_browser_mode === "boolean") {
        next.gemini_browser_mode = gemini_browser_mode;
      }

      if (typeof local_llm_url === "string") {
        next.local_llm_url = local_llm_url.trim();
      }

      if (typeof local_llm_model === "string") {
        next.local_llm_model = local_llm_model.trim();
      }

      if (typeof opencode_model === "string" && opencode_model.trim()) {
        next.opencode_model = opencode_model.trim();
      }

      if (typeof opencode_base_url === "string" && opencode_base_url.trim()) {
        let u = opencode_base_url.trim().replace(/\/+$/, "");
        if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
        next.opencode_base_url = u;
      }

      if (typeof opencode_key === "string" && opencode_key.trim()) {
        next.opencode_api_key = opencode_key.trim();
      }

      if (typeof airforce_model === "string" && airforce_model.trim()) {
        next.airforce_model = airforce_model.trim();
      }

      if (typeof airforce_base_url === "string" && airforce_base_url.trim()) {
        let u = airforce_base_url.trim().replace(/\/+$/, "");
        if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
        next.airforce_base_url = u;
      }

      if (typeof airforce_key === "string" && airforce_key.trim()) {
        next.airforce_api_key = airforce_key.trim();
      }

      if (typeof moonai_model === "string" && moonai_model.trim()) {
        next.moonai_model = moonai_model.trim();
      }

      if (typeof moonai_base_url === "string" && moonai_base_url.trim()) {
        let u = moonai_base_url.trim().replace(/\/+$/, "");
        if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
        next.moonai_base_url = u;
      }

      if (typeof moonai_key === "string" && moonai_key.trim()) {
        next.moonai_api_key = moonai_key.trim();
      }

      if (typeof omniroute_model === "string" && omniroute_model.trim()) {
        next.omniroute_model = omniroute_model.trim();
      }

      if (typeof omniroute_base_url === "string" && omniroute_base_url.trim()) {
        let u = omniroute_base_url.trim().replace(/\/+$/, "");
        if (!/^https?:\/\//i.test(u)) u = `http://${u}`; // Local gateway default protocol is http
        next.omniroute_base_url = u;
      }

      if (typeof omniroute_key === "string") {
        next.omniroute_api_key = omniroute_key.trim();
      }

      return next;
    };

    for (const configPath of configPaths) {
      const isWorkspaceConfig =
        configPath === path.join(WORKSPACE_DIR, "config_qanat.json");
      if (!fs.existsSync(configPath) && !isWorkspaceConfig) continue;
      const config = applyAiSettings(readJsonFile(configPath) || {});
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    }

    res.json({
      success: true,
      provider: getAiProvider(projDir),
      gemini_model: getGeminiModel(projDir),
      gemini_model_options: GEMINI_MODEL_OPTIONS,
      inference_model: getInferenceModel(projDir),
      inference_model_options: INFERENCE_MODEL_OPTIONS,
      openrouter_model: getOpenRouterModel(projDir),
      openrouter_model_options: OPENROUTER_MODEL_OPTIONS,
      nvidia_model: getNvidiaModel(projDir),
      nvidia_model_options: NVIDIA_MODEL_OPTIONS,
      alibaba_model: getAlibabaModel(projDir),
      alibaba_model_options: ALIBABA_MODEL_OPTIONS,
      alibaba_base_url: getAlibabaBaseUrl(projDir),
      tokenrouter_model: getTokenRouterModel(projDir),
      minimax_model: getMinimaxModel(projDir),
      minimax_base_url: getMinimaxBaseUrl(projDir),
      tokenrouter_model_options: TOKENROUTER_MODEL_OPTIONS,
      tokenrouter_base_url: getTokenRouterBaseUrl(projDir),
      opencode_model: getOpenCodeModel(projDir),
      opencode_model_options: OPENCODE_MODEL_OPTIONS,
      opencode_base_url: getOpenCodeBaseUrl(projDir),
      has_opencode_key: !!getOpenCodeApiKey(projDir),
      airforce_model: getAirForceModel(projDir),
      airforce_model_options: AIRFORCE_MODEL_OPTIONS,
      airforce_base_url: getAirForceBaseUrl(projDir),
      has_airforce_key: !!getAirForceApiKey(projDir),
      moonai_model: getMoonAiModel(projDir),
      moonai_model_options: MOONAI_MODEL_OPTIONS,
      moonai_base_url: getMoonAiBaseUrl(projDir),
      has_moonai_key: !!getMoonAiApiKey(projDir),
      omniroute_model: getOmniRouteModel(projDir),
      omniroute_model_options: OMNIROUTE_MODEL_OPTIONS,
      omniroute_base_url: getOmniRouteBaseUrl(projDir),
      has_omniroute_key: !!getOmniRouteApiKey(projDir),
      gemini_key_count: getApiKeys(projDir).length,
      has_xai_key: !!getXaiApiKey(projDir),
      has_openrouter_key: !!getOpenRouterApiKey(projDir),
      has_openrouter_user_key: hasUserOpenRouterApiKey(projDir),
      has_nvidia_key: !!getNvidiaApiKey(projDir),
      has_alibaba_key: !!getAlibabaApiKey(projDir),
      has_tokenrouter_key: !!getTokenRouterApiKey(projDir),
      has_minimax_key: !!getMinimaxApiKey(projDir),
      has_inference_key: !!getInferenceApiKey(projDir),
      has_epidemic_key: true,
      gemini_browser_mode: isGeminiBrowserModeEnabled(projDir),
      local_llm_url: getLocalLlmUrl(projDir),
      local_llm_model: getLocalLlmModel(projDir),
    });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao salvar configurações de IA",
      details: err.message,
    });
  }
});

async function callOmniRouteAdmin(projDir, apiPath, options = {}) {
  const baseUrl = getOmniRouteBaseUrl(projDir).replace(/\/+$/, "");
  let adminBaseUrl = baseUrl;
  if (baseUrl.endsWith("/v1")) {
    adminBaseUrl = baseUrl.substring(0, baseUrl.length - 3) + "/api";
  } else {
    adminBaseUrl = baseUrl + "/api";
  }
  const apiKey = getOmniRouteApiKey(projDir);
  const headers = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  const url = `${adminBaseUrl}/${apiPath.replace(/^\/+/, "")}`;
  console.log(`[OmniRoute Admin Proxy] ${options.method || "GET"} ${url}`);
  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OmniRoute error (${response.status}): ${text}`);
  }
  return response.json();
}

app.get("/api/omniroute/status", async (req, res) => {
  const projDir = getProjectDir(req);
  const baseUrl = getOmniRouteBaseUrl(projDir);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(baseUrl, { signal: controller.signal }).catch(
      () => null
    );
    clearTimeout(timeoutId);
    res.json({
      online: resp !== null,
      status: resp ? resp.status : 0,
      url: baseUrl,
    });
  } catch (err) {
    res.json({ online: false, error: err.message, url: baseUrl });
  }
});

app.get("/api/omniroute/providers", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const data = await callOmniRouteAdmin(projDir, "/providers");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/omniroute/providers", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const data = await callOmniRouteAdmin(projDir, "/providers", {
      method: "POST",
      body: req.body,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/omniroute/providers/:id", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const data = await callOmniRouteAdmin(
      projDir,
      `/providers/${req.params.id}`,
      {
        method: "DELETE",
      }
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/omniroute/keys", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const data = await callOmniRouteAdmin(projDir, "/keys");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/omniroute/keys", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const data = await callOmniRouteAdmin(projDir, "/keys", {
      method: "POST",
      body: req.body,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/omniroute/keys/:id", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const data = await callOmniRouteAdmin(projDir, `/keys/${req.params.id}`, {
      method: "DELETE",
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Generate system instructions with workspace script context

function getProjectContext(projectDir) {
  const configPath = path.join(projectDir, "config_qanat.json");

  const timingsPath = path.join(projectDir, "block_timings.json");

  const transcriptPath = path.join(projectDir, "transcripts_readable.txt");

  let config = {};

  let timings = {};

  let transcript = "";

  let bgmRecommendations = [];

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (e) {}
  }

  if (config.gemini_api_key) {
    config = { ...config };
    delete config.gemini_api_key;
  }

  if (fs.existsSync(timingsPath)) {
    try {
      timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
    } catch (e) {}
  }

  if (fs.existsSync(transcriptPath)) {
    try {
      transcript = fs.readFileSync(transcriptPath, "utf8");
    } catch (e) {}
  }

  const storyboardPath = path.join(projectDir, "storyboard.json");

  if (fs.existsSync(storyboardPath)) {
    try {
      const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));

      bgmRecommendations = storyboard.bgm_recommendations || [];
    } catch (e) {}
  }

  const assetsDir = path.join(projectDir, "ASSETS");

  let assetsList = [];

  if (fs.existsSync(assetsDir)) {
    try {
      assetsList = fs.readdirSync(assetsDir).filter((f) => !f.startsWith("."));
    } catch (e) {}
  }

  const musicDir = path.join(projectDir, "MUSICAS");

  let musicList = [];

  if (fs.existsSync(musicDir)) {
    try {
      musicList = fs.readdirSync(musicDir).filter((f) => f.endsWith(".mp3"));
    } catch (e) {}
  }

  const projectName = path.basename(projectDir);

  return `Voce eh o "Lumiera Agent" - assistente autonomo com poderes totais sobre o projeto de video. Pode modificar configs, disparar acoes, e auxiliar em qualquer parte do fluxo.

PROJETO ATUAL: "${projectName}"

DADOS DO PROJETO:

1. Config (config_qanat.json): ${JSON.stringify(config, null, 2)}

2. Timings: ${JSON.stringify(timings, null, 2)}

3. Roteiro: ${transcript || "(vazio)"}

4. Assets: ${assetsList.length > 0 ? assetsList.join(", ") : "(vazio)"}

5. Musicas: ${musicList.length > 0 ? musicList.join(", ") : "(nenhuma)"}

6. Recomendações de Trilha BGM por Bloco da IA: ${JSON.stringify(bgmRecommendations, null, 2)}

ACOES DISPONIVEIS - AUTONOMIA TOTAL:

Quando o usuario pedir para fazer algo no projeto, voce DEVE executar a acao inserindo um bloco JSON de acao no final da sua resposta. Use o formato:

\`\`\`lumiera-action

{"actions":[{"type":"update_config","field":"highlight_keywords","value":["exemplo"]}]}

\`\`\`

TIPOS DE ACAO:

- "update_config": Modifica campo do config. Fields: "highlight_keywords" (array strings), "bgm_mappings" (array {block,file}), "impact_texts" (array {block,start_offset,end_offset,text}), "script" (string).

- "trigger_render": Compila video. Params: {"render_type":"standard"ou"highlighted"}.

- "trigger_mix": Mixa trilha sonora.

- "trigger_sync": Roda find_block_timings.py para sincronizar narração com blocos.

- "trigger_auto_map": Redistribui assets do storyboard na timeline (auto-map).

- "trigger_stock_fetch": Baixa B-roll do Pexels/Pixabay para cenas sem mídia.

- "trigger_tts": Gera narração TTS. Params: {"engine":"kokoro","voice":"pm_alex","speed":0.82}, {"engine":"voicebox","voice":"<profile_id ou nome>"}, {"engine":"chatterbox","voice":"multilingual_pt"}, {"engine":"qwen3","voice":"ryan_pt"}, {"engine":"fish","voice":"__default__"} ou {"engine":"edge","voice":"pt-BR-AntonioNeural","rate":"+0%"}.

- "trigger_apply_bgm": Aplica trilha Epidemic Sound sugerida pela IA.

- "trigger_publish_prep": Gera metadados YouTube, thumbnails e aplica ao upload.

- "run_pipeline_step": Executa um passo do pipeline. Params: {"step":"sync"|"stock"|"automap"|"bgm"|"mix"|"metadata"|"thumbnails"}.

- "navigate_tab": Navega aba. Params: {"tab":"status"|"timeline"|"music"|"terminal"|"ai"|"creator"}.

- "show_message": Notificacao. Params: {"message":"texto","type":"success"|"warning"|"error"}.

REGRAS:

1. Responda em portugues brasileiro, profissional e direto.

2. Quando modificar algo, SEMPRE inclua o bloco lumiera-action.

3. Primeiro explique, depois inclua o bloco de acao.

4. Autonomia total para modificar qualquer parte do projeto.

5. Sem bloco de acao para perguntas sem mudancas.`;
}

// API: Chat assistant

app.post(
  "/api/ai/chat",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);

    const { messages, browser_response } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Mensagens inválidas ou vazias" });
    }

    try {
      let systemInstruction = getProjectContext(projDir);
      let supermemoryMeta = null;

      if (isSupermemoryEnabled(__dirname)) {
        const lastUserMsg =
          [...messages].reverse().find((m) => m.role === "user")?.content || "";
        const mem = await fetchMemoryContext(__dirname, projDir, lastUserMsg);
        if (mem?.contextBlock) {
          systemInstruction += `\n\n${mem.contextBlock}`;
          supermemoryMeta = {
            injected: true,
            containerTags: mem.containerTags,
          };
        } else if (mem?.containerTags) {
          supermemoryMeta = {
            injected: false,
            containerTags: mem.containerTags,
          };
        }
      }

      const formattedContents = messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",

        parts: [{ text: msg.content }],
      }));

      const chatBody = {
        contents: formattedContents,

        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
      };

      const responseText = await callGeminiLlm(req, res, projDir, {
        title: "Assistente Lumiera",
        bodyOverride: chatBody,
      });
      if (responseText == null) return;

      if (isSupermemoryEnabled(__dirname) && responseText) {
        persistConversation(__dirname, projDir, messages, responseText).catch(
          (err) => {
            console.warn("[supermemory] persistConversation:", err.message);
          }
        );
      }

      res.json({
        text: responseText || "Desculpe, não consegui obter uma resposta.",
        supermemory: supermemoryMeta,
      });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Erro ao consultar IA", details: err.message });
    }
  })
);

// API: Execute AI agent actions

app.post(
  "/api/ai/execute-action",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);

    const { actions } = req.body;

    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({ error: "No actions provided" });
    }

    const results = [];

    try {
      for (const action of actions) {
        try {
          switch (action.type) {
            case "update_config": {
              const configPath = path.join(projDir, "config_qanat.json");

              let config = {};

              if (fs.existsSync(configPath)) {
                try {
                  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
                } catch (e) {}
              }

              config[action.field] = action.value;

              fs.writeFileSync(
                configPath,
                JSON.stringify(config, null, 2),
                "utf8"
              );

              results.push({
                type: action.type,
                field: action.field,
                status: "ok",
              });

              break;
            }

            case "trigger_render": {
              const renderMode = action.render_type || "remotion-pro";
              results.push({
                type: action.type,
                status: "ok",
                message: `Render ${renderMode} pronto para iniciar`,
                render_mode: renderMode,
                render_url: `/api/render/${renderMode}?project=${encodeURIComponent(path.basename(projDir))}`,
              });
              break;
            }

            case "trigger_mix": {
              ensureFileExists("mix_bgm.py", projDir);
              const mixScript = path.join(projDir, "mix_bgm.py");
              if (!fs.existsSync(mixScript)) {
                results.push({
                  type: action.type,
                  status: "error",
                  message: "mix_bgm.py não encontrado",
                });
                break;
              }
              await new Promise((resolve, reject) => {
                const child = spawn(PYTHON_PATH, ["mix_bgm.py"], {
                  cwd: projDir,
                  shell: true,
                  env: buildPythonSpawnEnv(),
                });
                let stderr = "";
                child.stderr.on("data", (d) => {
                  stderr += d.toString();
                });
                child.on("close", (code) => {
                  if (code === 0) resolve();
                  else reject(new Error(stderr || `Mix falhou (code ${code})`));
                });
              });
              results.push({
                type: action.type,
                status: "ok",
                message: "Mix BGM concluído",
              });
              break;
            }

            case "navigate_tab": {
              results.push({
                type: action.type,
                tab: action.tab,
                status: "ok",
              });

              break;
            }

            case "trigger_sync": {
              if (!fs.existsSync(path.join(projDir, "find_block_timings.py"))) {
                results.push({
                  type: action.type,
                  status: "error",
                  message: "find_block_timings.py não encontrado",
                });
                break;
              }
              await new Promise((resolve, reject) => {
                const child = spawn(PYTHON_PATH, ["find_block_timings.py"], {
                  cwd: projDir,
                  shell: true,
                  env: buildPythonSpawnEnv(),
                });
                child.on("close", (code) =>
                  code === 0
                    ? resolve()
                    : reject(new Error(`Sync exit ${code}`))
                );
              });
              results.push({
                type: action.type,
                status: "ok",
                message: "Sincronização concluída",
              });
              break;
            }

            case "trigger_auto_map": {
              const configPath = path.join(projDir, "config_qanat.json");
              let cfg = readJsonFile(configPath) || {};
              const mapEpoch = Number(cfg.timeline_map_epoch || 0);
              const mapped = buildTimelineFromStoryboard(projDir, {
                remapping: true,
                rotateOffset: mapEpoch,
              });
              cfg.timeline_assets = mapped.timelineAssets;
              cfg.timeline_map_epoch = mapEpoch + 1;
              fs.writeFileSync(
                configPath,
                JSON.stringify(cfg, null, 2),
                "utf8"
              );
              results.push({
                type: action.type,
                status: "ok",
                asset_count: mapped.assetCount,
              });
              break;
            }

            case "trigger_stock_fetch": {
              const stockResult = await fetchStockForScenes(projDir, {
                workspaceDir: WORKSPACE_DIR,
              });
              results.push({
                type: action.type,
                status: stockResult.success ? "ok" : "error",
                fetched: stockResult.fetched?.length || 0,
                message:
                  stockResult.error ||
                  `${stockResult.fetched?.length || 0} arquivos baixados`,
              });
              break;
            }

            case "trigger_tts": {
              const ttsResult = await generateNarrationTts(projDir, {
                voice: action.voice,
                rate: action.rate,
                pitch: action.pitch,
                speed: action.speed,
                platform: action.engine || action.platform || "kokoro",
                workspaceDir: WORKSPACE_DIR,
              });
              results.push({
                type: action.type,
                status: "ok",
                file: ttsResult.file,
              });
              break;
            }

            case "trigger_publish_prep": {
              if (!workflowApi?.generateYoutubeMetadataForProject) {
                results.push({
                  type: action.type,
                  status: "error",
                  message: "Workflow API não inicializada",
                });
                break;
              }
              const prep = await runPublishPrep(projDir, {
                generateMetadata: (dir) =>
                  workflowApi.generateYoutubeMetadataForProject(dir, {
                    req,
                    res,
                  }),
                generateThumbnails: async (dir, metadata) =>
                  generateYoutubeThumbnailImages({
                    projectDir: dir,
                    projectName: path.basename(dir),
                    thumbnails: metadata?.parsed?.thumbnails || [],
                    format: metadata?.format || "LONG",
                    palette: metadata?.palette || [],
                  }),
              });
              results.push({
                type: action.type,
                status: "ok",
                prepared: true,
                thumbnails: prep.thumbnails?.length || 0,
              });
              break;
            }

            case "trigger_apply_bgm": {
              const token = getEpidemicSoundKey(projDir) || "";
              const cfg =
                readJsonFile(path.join(projDir, "config_qanat.json")) || {};
              const mode =
                cfg.aspect_ratio === "9:16" || cfg.video_format === "SHORTS"
                  ? "SHORTS"
                  : "LONGO";
              const logs = await runAutoSoundtrackLogic(projDir, token, mode);
              results.push({
                type: action.type,
                status: "ok",
                logs: logs.slice(-3),
              });
              break;
            }

            case "run_pipeline_step": {
              if (!workflowApi?.buildCreatorPipelineHandlers) {
                results.push({
                  type: action.type,
                  status: "error",
                  message: "Workflow API não inicializada",
                });
                break;
              }
              const handlers = workflowApi.buildCreatorPipelineHandlers();
              const stepId = action.step || action.stepId;
              if (!handlers[stepId]) {
                results.push({
                  type: action.type,
                  status: "error",
                  message: `Step desconhecido: ${stepId}`,
                });
                break;
              }
              await handlers[stepId](projDir, () => {});
              results.push({ type: action.type, status: "ok", step: stepId });
              break;
            }

            case "show_message": {
              results.push({
                type: action.type,
                message: action.message,
                status: "ok",
              });

              break;
            }

            default:
              results.push({
                type: action.type,
                status: "error",
                message: "Unknown action type",
              });
          }
        } catch (err) {
          if (err?.geminiBrowserPending) throw err;
          results.push({
            type: action.type,
            status: "error",
            message: err.message,
          });
        }
      }

      res.json({ results });
    } catch (err) {
      if (err?.geminiBrowserPending) return;
      res.status(500).json({ error: err.message });
    }
  })
);

// API: Generate YouTube Metadata (SEO Titles, Description, Tags, Chapters)

function buildProjectTranscript({ transcript, config, storyboard }) {
  const candidates = [];

  if (typeof storyboard?.narrative_script === "string") {
    const narrative = storyboard.narrative_script.trim();

    if (narrative.length > 80) {
      candidates.push({ text: narrative, priority: 100 });
    }
  }

  if (Array.isArray(storyboard?.visual_prompts)) {
    const fromPrompts = storyboard.visual_prompts

      .map((item) => item?.narration_text)

      .filter(Boolean)

      .join("\n\n")

      .trim();

    if (fromPrompts.length > 120) {
      candidates.push({ text: fromPrompts, priority: 90 });
    }
  }

  if (typeof transcript === "string") {
    const fileTranscript = transcript.trim();

    if (fileTranscript.length > 120) {
      candidates.push({ text: fileTranscript, priority: 70 });
    }
  }

  if (Array.isArray(config?.block_phrases)) {
    const fromBlocks = config.block_phrases

      .map((item) => item?.phrase)

      .filter(Boolean)

      .join("\n\n")

      .trim();

    if (fromBlocks.length > 120) {
      candidates.push({ text: fromBlocks, priority: 50 });
    }
  }

  candidates.sort(
    (a, b) => b.priority - a.priority || b.text.length - a.text.length
  );

  return candidates[0]?.text || "";
}

function loadProjectMetadataInputs(projDir) {
  const configPath = path.join(projDir, "config_qanat.json");
  const storyboardPath = path.join(projDir, "storyboard.json");
  const transcriptPath = path.join(projDir, "transcripts_readable.txt");
  let config = {};
  let storyboard = {};
  let transcript = "";

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (_) {}
  }
  if (fs.existsSync(storyboardPath)) {
    try {
      storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
    } catch (_) {}
  }
  if (fs.existsSync(transcriptPath)) {
    try {
      transcript = fs.readFileSync(transcriptPath, "utf8");
    } catch (_) {}
  }

  transcript = buildProjectTranscript({ transcript, config, storyboard });
  return { config, storyboard, transcript };
}

function reprocessYoutubeMetadataCache(cache = {}, projDir) {
  const normalizedText = normalizeMetadataMarkdown(cache?.text || "");
  let parsed = parseYoutubeMetadataMarkdown(normalizedText);
  if (!parsed?.titles?.length && cache?.parsed) {
    parsed = { ...cache.parsed, ...parsed };
  }

  const { config, storyboard, transcript } = loadProjectMetadataInputs(projDir);
  const format = cache.format === "SHORT" ? "SHORT" : "LONG";
  const facts = extractTitleFacts({ transcript, storyboard, config });
  parsed = applyTitleQualityToParsed(parsed, { format, facts });
  parsed.fidelity = assessMetadataFidelity({ parsed, transcript });
  parsed.platformPackages = buildPlatformMetadataPackages(parsed);

  return {
    ...cache,
    text: normalizedText || cache.text,
    parsed,
    pipelineVersion: YOUTUBE_METADATA_PIPELINE_VERSION,
    reprocessedAt: new Date().toISOString(),
  };
}

async function enhanceYoutubeTitlesMetadata(
  text,
  { transcript, format, storyboard, config = {}, apiKey }
) {
  const facts = extractTitleFacts({ transcript, storyboard, config });
  let parsed = parseYoutubeMetadataMarkdown(text);
  parsed = applyTitleQualityToParsed(parsed, { format, facts });

  if (facts.listicle?.isListicle) {
    console.log(
      `[YouTube Metadata] Listicle Top ${facts.listicle.rankCount} — título #1: ${parsed.recommendedTitle || "?"}`
    );
  }

  const lacksRelevance = titlesLackRelevance(
    parsed.titles || [],
    transcript,
    facts
  );
  const shouldRepair =
    titlesNeedRepair(parsed.titles || [], format, facts) || lacksRelevance;

  if (apiKey && shouldRepair) {
    try {
      const repairPrompt = buildTitleRepairPrompt({
        titles: parsed.titles,
        transcript,
        format,
        facts,
      });
      const repairText = await callGeminiWithRetry(apiKey, repairPrompt, {
        temperature: 0.4,
        maxRetries: 2,
        models: ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"],
      });
      const repaired = normalizeKeys(
        await parseAiJsonResponse(repairText, apiKey, "Refino titulos")
      );
      parsed = mergeRepairedTitles(parsed, repaired);
      parsed = applyTitleQualityToParsed(parsed, { format, facts });
      console.log(
        `[YouTube Metadata] Refino de títulos aplicado (${lacksRelevance ? "baixa relevância ao roteiro" : "scores baixos"}).`
      );
    } catch (err) {
      console.warn("[YouTube Metadata] Refino de títulos falhou:", err.message);
    }
  } else if (!shouldRepair) {
    console.log(
      "[YouTube Metadata] Títulos com score OK — refino IA ignorado."
    );
  }

  parsed.fidelity = assessMetadataFidelity({ parsed, transcript });
  parsed.platformPackages = buildPlatformMetadataPackages(parsed);

  return parsed;
}

async function ensureScriptChecklist(
  parsedData,
  { format, niche, ideaTitle, apiKey }
) {
  if (!isChecklistEmpty(parsedData?.checklist)) {
    parsedData.checklist = normalizeScriptChecklist(parsedData.checklist);
    return parsedData;
  }
  if (!apiKey) {
    parsedData.checklist = normalizeScriptChecklist(parsedData?.checklist);
    return parsedData;
  }
  const narration = parsedData?.narrative_script || "";
  if (!narration.trim()) return parsedData;

  try {
    const evalPrompt = buildScriptChecklistEvaluationPrompt({
      narrative_script: narration,
      strategy: parsedData.strategy || {},
      format,
      ideaTitle,
      niche,
    });
    const evalText = await callGeminiWithRetry(apiKey, evalPrompt, {
      temperature: 0.35,
      maxRetries: 2,
      models: ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"],
    });
    const evaluated = normalizeKeys(
      await parseAiJsonResponse(evalText, apiKey, "Checklist qualidade")
    );
    if (!isChecklistEmpty(evaluated?.checklist)) {
      parsedData.checklist = normalizeScriptChecklist(evaluated.checklist);
      console.log("[Creator Script] Checklist de qualidade avaliado pela IA.");
    } else {
      parsedData.checklist = normalizeScriptChecklist(parsedData.checklist);
    }
  } catch (err) {
    console.warn("[Creator Script] Falha ao avaliar checklist:", err.message);
    parsedData.checklist = normalizeScriptChecklist(parsedData.checklist);
  }
  return parsedData;
}

async function enhanceCreatorStrategyTitles(
  parsedData,
  { transcript, format, apiKey, ideaTitle }
) {
  const fmt = format === "SHORTS" ? "SHORT" : "LONG";
  const facts = extractTitleFacts({
    transcript: parsedData.narrative_script || transcript,
    storyboard: parsedData,
  });
  if (ideaTitle) facts.coreTopic = ideaTitle;

  let strategy = enhanceStrategyTitles(parsedData.strategy || {}, {
    transcript: parsedData.narrative_script || transcript,
    format: fmt,
    facts,
  });

  const allTitles = [
    { text: strategy.title_main },
    ...(strategy.title_variations || []).map((t) => ({ text: t })),
  ];

  if (apiKey && titlesNeedRepair(allTitles, fmt, facts)) {
    try {
      const repairPrompt = buildStrategyTitleRepairPrompt({
        strategy,
        transcript: parsedData.narrative_script || transcript,
        format: fmt,
        facts,
        ideaTitle,
      });
      const repairText = await callGeminiWithRetry(apiKey, repairPrompt, {
        temperature: 0.4,
        maxRetries: 2,
        models: ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"],
      });
      const repaired = normalizeKeys(
        await parseAiJsonResponse(repairText, apiKey, "Refino titulos strategy")
      );
      strategy = mergeRepairedStrategyTitles(strategy, repaired);
      strategy = enhanceStrategyTitles(strategy, {
        transcript: parsedData.narrative_script || transcript,
        format: fmt,
        facts,
      });
      console.log("[Creator Script] Refino de títulos da estratégia aplicado.");
    } catch (err) {
      console.warn("[Creator Script] Refino de títulos falhou:", err.message);
    }
  }

  return {
    ...parsedData,
    strategy: {
      ...parsedData.strategy,
      title_main: strategy.title_main,
      title_variations: strategy.title_variations,
    },
  };
}

app.post(
  "/api/ai/optimize-youtube",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);

    const apiKeys = getApiKeys(projDir);

    const xaiKey = getXaiApiKey(projDir);

    const aiProvider = getAiProvider(projDir);

    const openrouterKey = getOpenRouterApiKey(projDir);

    const nvidiaKey = getNvidiaApiKey(projDir);
    const inferenceKey = getInferenceApiKey(projDir);
    if (
      apiKeys.length === 0 &&
      !xaiKey &&
      !(aiProvider === "openrouter" && openrouterKey) &&
      !(aiProvider === "nvidia" && nvidiaKey) &&
      !(aiProvider === "inference" && inferenceKey) &&
      !shouldOfferGeminiBrowser(projDir)
    ) {
      return res
        .status(401)
        .json({ error: "Nenhuma chave de IA configurada." });
    }

    try {
      const configPath = path.join(projDir, "config_qanat.json");

      const timingsPath = path.join(projDir, "block_timings.json");

      const transcriptPath = path.join(projDir, "transcripts_readable.txt");

      let config = {};

      let timings = { starts: [] };

      let transcript = "";

      if (fs.existsSync(configPath)) {
        try {
          config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        } catch (e) {}
      }

      if (fs.existsSync(timingsPath)) {
        try {
          timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
        } catch (e) {}
      }

      if (fs.existsSync(transcriptPath)) {
        try {
          transcript = fs.readFileSync(transcriptPath, "utf8");
        } catch (e) {}
      }

      // Load storyboard for extra context

      let storyboard = {};

      const storyboardPath = path.join(projDir, "storyboard.json");

      if (fs.existsSync(storyboardPath)) {
        try {
          storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
        } catch (e) {}
      }

      transcript = buildProjectTranscript({ transcript, config, storyboard });

      if (!transcript) {
        return res.status(400).json({
          error: "Roteiro não encontrado para este projeto.",

          details:
            "Crie ou carregue transcripts_readable.txt, storyboard.json com narrative_script/visual_prompts, ou config_qanat.json com block_phrases.",
        });
      }

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

      const respondWithMetadata = async (text, extra = {}) => {
        const normalizedText = normalizeMetadataMarkdown(text);
        const apiKeyForTitles = apiKeys[0] || null;
        const parsed = await enhanceYoutubeTitlesMetadata(normalizedText, {
          transcript,
          format,
          storyboard,
          config,
          apiKey: extra.fallback ? null : apiKeyForTitles,
        });
        const payload = {
          text: normalizedText,
          format,
          niche,
          totalDuration,
          category,
          profile: { id: profile.id, label: profile.label },
          rpm: rpmHint.rpm,
          palette: rpmHint.palette,
          parsed,
          titleRefined: !extra.fallback,
          ...extra,
        };

        try {
          fs.writeFileSync(
            path.join(projDir, "youtube_metadata_cache.json"),
            JSON.stringify(
              {
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
              },
              null,
              2
            ),
            "utf8"
          );
        } catch (cacheErr) {
          console.warn(
            "[YouTube Metadata] Falha ao salvar cache:",
            cacheErr.message
          );
        }

        return res.json(payload);
      };

      const errors = [];
      const browserTextRaw = extractBrowserResponse(req.body);
      const browserText = browserTextRaw
        ? normalizeMetadataMarkdown(browserTextRaw)
        : "";
      const forceBrowser =
        req.body?.require_browser === true || shouldOfferGeminiBrowser(projDir);

      if (browserText && forceBrowser) {
        if (looksLikeLumieraPrompt(browserText)) {
          console.warn(
            "[YouTube Metadata] browser_response é o prompt — não a resposta do Gemini."
          );
          return res.status(422).json({
            error:
              "Capturou o prompt em vez da resposta. Aguarde o Gemini terminar em gemini.google.com e tente de novo.",
            staleResponse: true,
          });
        }
        if (looksLikeOverlayJsonResponse(browserText)) {
          console.warn(
            "[YouTube Metadata] Resposta de overlays rejeitada no fluxo de metadados."
          );
          return res.status(422).json({
            error:
              "Resposta antiga de overlays detectada. Aguarde os metadados na aba gemini.google.com e tente de novo.",
            staleResponse: true,
          });
        }
        if (!isMetadataBrowserResponseReady(browserText)) {
          console.warn(
            "[YouTube Metadata] browser_response incompleto ou inválido."
          );
          return res.status(422).json({
            error:
              "Resposta do Gemini incompleta. Aguarde ## TÍTULOS na aba gemini.google.com e tente de novo.",
            staleResponse: true,
          });
        }
      }

      if (aiProvider === "nvidia" && nvidiaKey && !forceBrowser) {
        const responseText = await generateMetadataWithNvidia(
          prompt,
          nvidiaKey,
          format
        );

        return await respondWithMetadata(responseText, { provider: "nvidia" });
      }

      if (aiProvider === "xai" && xaiKey && !forceBrowser) {
        const responseText = await generateMetadataWithXai(
          prompt,
          xaiKey,
          format
        );

        return await respondWithMetadata(responseText, { provider: "xai" });
      }

      let responseText = browserText;

      if (!responseText && forceBrowser) {
        const metadataSessionId = createMetadataSessionId();
        const promptWithSession = `${prompt}\n\n[LUMIERA] Na primeira linha da resposta, inclua exatamente: LUMIERA_METADATA_SESSION:${metadataSessionId}`;
        const promptText = buildBrowserTaskPrompt(
          "Metadados YouTube",
          promptWithSession,
          "",
          {
            taskType: "metadata",
            responseFormat: "markdown",
          }
        );
        console.log(
          `[YouTube Metadata] Aguardando Gemini no Chrome (sessão ${metadataSessionId}).`
        );
        return res.json(
          offerGeminiBrowserPayload({
            title: "Metadados YouTube",
            prompt: promptText,
            metadataSessionId,
          })
        );
      }

      if (!responseText) {
        try {
          responseText = await callGeminiLlm(req, res, projDir, {
            title: "Metadados YouTube",
            prompt,
            temperature: 0.55,
          });
          if (responseText == null) return;
        } catch (geminiErr) {
          errors.push({
            status: 503,
            message: geminiErr.message,
            quotaExceeded: true,
          });
        }
      }

      if (responseText) {
        if (
          forceBrowser &&
          browserText &&
          looksLikeFallbackMetadata(responseText)
        ) {
          return res.status(422).json({
            error:
              "Metadados genéricos detectados — Gemini no Chrome não concluiu. Tente de novo.",
            staleResponse: true,
          });
        }
        return await respondWithMetadata(responseText, {
          tried_keys: browserText ? 0 : 1,
          provider: browserText ? "gemini_browser" : undefined,
        });
      }

      if (forceBrowser) {
        return res.status(422).json({
          error:
            "Gemini no Chrome não retornou metadados válidos. Deixe gemini.google.com aberto e tente de novo.",
        });
      }

      if (nvidiaKey) {
        try {
          const responseText = await generateMetadataWithNvidia(
            prompt,
            nvidiaKey,
            format
          );

          return await respondWithMetadata(responseText, {
            provider: "nvidia",

            warning: `As ${apiKeys.length} chaves Gemini falharam. Usei NVIDIA API como fallback.`,
          });
        } catch (err) {
          errors.push({
            status: "nvidia",
            message: err.message,
            quotaExceeded: false,
          });
        }
      }

      if (xaiKey) {
        try {
          const responseText = await generateMetadataWithXai(
            prompt,
            xaiKey,
            format
          );

          return await respondWithMetadata(responseText, {
            provider: "xai",

            warning: `As ${apiKeys.length} chaves Gemini falharam. Usei Grok/xAI como fallback.`,
          });
        } catch (err) {
          errors.push({
            status: "xai",
            message: err.message,
            quotaExceeded: false,
          });
        }
      }

      const fallbackText = buildFallbackYoutubeMetadata({
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

      const quotaErrors = errors.filter((error) => error.quotaExceeded).length;

      return await respondWithMetadata(fallbackText, {
        fallback: true,

        tried_keys: apiKeys.length,

        warning:
          quotaErrors === apiKeys.length
            ? `Todas as ${apiKeys.length} chaves cadastradas atingiram limite temporário. Usei metadados locais por enquanto.`
            : `Não consegui gerar com Gemini usando as ${apiKeys.length} chaves cadastradas. Usei metadados locais por enquanto.`,
      });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Erro ao otimizar metadados", details: err.message });
    }
  })
);

app.get("/api/ai/youtube-metadata-cache", (req, res) => {
  const ctx = getRequestProjectContext(req);
  // Never serve workspace fallback cache for a named project that didn't resolve —
  // that would show another project's metadata under the wrong project name.
  if (ctx.requestedName && !ctx.resolved) {
    return res.json({
      cached: false,
      projectResolved: false,
      project: ctx.requestedName,
    });
  }
  const projDir = ctx.projDir;
  const cachePath = path.join(projDir, "youtube_metadata_cache.json");

  if (!fs.existsSync(cachePath)) {
    return res.json({
      cached: false,
      projectResolved: true,
      project: path.basename(projDir),
    });
  }

  try {
    const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const needsReprocess =
      Number(cache.pipelineVersion) < YOUTUBE_METADATA_PIPELINE_VERSION ||
      !cache.reprocessedAt ||
      (!cache.parsed?.description && /DESCRI[ÇC][ÃA]O/i.test(cache.text || ""));
    const reprocessed = needsReprocess
      ? reprocessYoutubeMetadataCache(cache, projDir)
      : cache;

    if (needsReprocess && reprocessed?.parsed) {
      try {
        fs.writeFileSync(
          cachePath,
          JSON.stringify(reprocessed, null, 2),
          "utf8"
        );
      } catch (writeErr) {
        console.warn(
          "[YouTube Metadata] Falha ao atualizar cache reprocessado:",
          writeErr.message
        );
      }
    }

    res.json({
      cached: true,
      ...reprocessed,
      cacheReprocessed: needsReprocess,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao ler cache de metadados", details: err.message });
  }
});

app.get("/api/ai/youtube-thumbnails", (req, res) => {
  const ctx = getRequestProjectContext(req);
  if (ctx.requestedName && !ctx.resolved) {
    return res.json({ thumbnails: [], projectResolved: false });
  }
  const projDir = ctx.projDir;
  const projectName = path.basename(projDir);
  const manifestPath = path.join(
    projDir,
    "ASSETS",
    "youtube_thumbnails",
    "manifest.json"
  );

  if (!fs.existsSync(manifestPath)) {
    return res.json({ thumbnails: [], projectResolved: true });
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const thumbnails = (manifest.variants || []).map((item) => ({
      ...item,
      url:
        item.url ||
        `/api/projects-media/${encodeURIComponent(projectName)}/ASSETS/${item.fileName}`,
    }));
    res.json({ ...manifest, thumbnails });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao ler thumbnails geradas", details: err.message });
  }
});

app.post("/api/ai/generate-youtube-thumbnails", async (req, res) => {
  const projDir = getProjectDir(req);
  const projectName = path.basename(projDir);

  try {
    let thumbnails = req.body?.thumbnails;
    let format = req.body?.format;
    let palette = req.body?.palette || [];

    const cachePath = path.join(projDir, "youtube_metadata_cache.json");
    let cache = null;
    if (fs.existsSync(cachePath)) {
      try {
        cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      } catch (e) {}
    }

    if ((!thumbnails || thumbnails.length === 0) && cache) {
      thumbnails = cache?.parsed?.thumbnails || [];
      format = format || cache?.format;
      palette = palette.length ? palette : cache?.palette || [];
    }

    if ((!thumbnails || thumbnails.length === 0) && cache?.text) {
      const reparsed = parseYoutubeMetadataMarkdown(cache.text);
      thumbnails = reparsed.thumbnails || [];
      palette = palette.length ? palette : cache?.palette || [];
    }

    if (req.body?.metadataText) {
      const reparsed = parseYoutubeMetadataMarkdown(req.body.metadataText);
      if (reparsed.thumbnails?.length) thumbnails = reparsed.thumbnails;
      else if (reparsed.titles?.length) {
        thumbnails = ensureThumbnailVariants(reparsed, palette);
      }
    }

    if (
      Array.isArray(thumbnails) &&
      thumbnails.length > 0 &&
      thumbnails.length < 3
    ) {
      thumbnails = ensureThumbnailVariants(
        { thumbnails, titles: cache?.parsed?.titles || [] },
        palette
      );
    }

    if (!Array.isArray(thumbnails) || thumbnails.length === 0) {
      return res.status(400).json({
        error: "Nenhuma variante A/B encontrada.",
        details:
          "Gere os metadados do YouTube primeiro. Se já gerou, clique em 'Gerar Metadados' novamente para atualizar o cache.",
      });
    }

    let config = {};
    let storyboard = {};
    const configPath = path.join(projDir, "config_qanat.json");
    const storyboardPath = path.join(projDir, "storyboard.json");
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      } catch (e) {}
    }
    if (fs.existsSync(storyboardPath)) {
      try {
        storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      } catch (e) {}
    }

    if (!palette.length) {
      palette = resolveThumbnailPalette(config, storyboard, config.niche);
    }

    const metadataCtx = resolveYoutubeMetadataContext({
      config,
      timings: {},
      storyboard,
      projectName,
    });
    const resolvedFormat =
      format === "SHORT"
        ? "SHORT"
        : format === "LONG"
          ? "LONG"
          : metadataCtx.format;

    const result = await generateYoutubeThumbnailImages({
      projectDir: projDir,
      projectName,
      thumbnails,
      format: resolvedFormat,
      palette,
      storyboard,
      config,
    });

    const parsed = parseYoutubeMetadataMarkdown(
      cache?.text || req.body?.metadataText || ""
    );
    if (!parsed.thumbnails?.length) {
      parsed.thumbnails = ensureThumbnailVariants(parsed, palette);
    }

    res.json({ ...result, parsed: { thumbnails: parsed.thumbnails } });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao gerar thumbnails", details: err.message });
  }
});

app.post("/api/ai/generate-canva-thumbnails", async (req, res) => {
  const projDir = getProjectDir(req);
  const projectName = path.basename(projDir);

  try {
    let thumbnails = req.body?.thumbnails;
    let format = req.body?.format;
    let palette = req.body?.palette || [];

    const cachePath = path.join(projDir, "youtube_metadata_cache.json");
    let cache = null;
    if (fs.existsSync(cachePath)) {
      try {
        cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      } catch (e) {}
    }

    if ((!thumbnails || thumbnails.length === 0) && cache) {
      thumbnails = cache?.parsed?.thumbnails || [];
      format = format || cache?.format;
      palette = palette.length ? palette : cache?.palette || [];
    }

    if (req.body?.metadataText) {
      const reparsed = parseYoutubeMetadataMarkdown(req.body.metadataText);
      if (reparsed.thumbnails?.length) thumbnails = reparsed.thumbnails;
      else if (reparsed.titles?.length) {
        thumbnails = ensureThumbnailVariants(reparsed, palette);
      }
    }

    if (!Array.isArray(thumbnails) || thumbnails.length === 0) {
      return res.status(400).json({
        error: "Nenhuma variante A/B encontrada.",
        details: "Gere os metadados do YouTube primeiro.",
      });
    }

    let config = {};
    let storyboard = {};
    const configPath = path.join(projDir, "config_qanat.json");
    const storyboardPath = path.join(projDir, "storyboard.json");
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      } catch (e) {}
    }
    if (fs.existsSync(storyboardPath)) {
      try {
        storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      } catch (e) {}
    }

    const metadataCtx = resolveYoutubeMetadataContext({
      config,
      timings: {},
      storyboard,
      projectName,
    });
    const resolvedFormat =
      format === "SHORT"
        ? "SHORT"
        : format === "LONG"
          ? "LONG"
          : metadataCtx.format;

    const result = await generateCanvaThumbnailImages({
      workspaceDir: WORKSPACE_DIR,
      projectDir: projDir,
      projectName,
      thumbnails,
      format: resolvedFormat,
      palette,
      storyboard,
      config,
      strategy: {
        profileLabel: cache?.profile?.label || metadataCtx.profile?.label,
        rpm: cache?.rpm || metadataCtx.rpmHint?.rpm,
      },
    });

    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao gerar capas no Canva", details: err.message });
  }
});

function youtubeChannelForceRefresh(req) {
  return (
    String(req.query?.refresh || "") === "1" ||
    String(req.query?.force || "") === "1"
  );
}

app.get(
  "/api/youtube/channel/summary",
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(Number(req.query?.days) || 28, 1), 90);
    const limit = Math.min(Math.max(Number(req.query?.limit) || 25, 1), 50);
    const views48hThreshold = Math.min(
      Math.max(Number(req.query?.viewsThreshold) || 100, 1),
      100000
    );
    const maxProjects = Math.min(
      Math.max(Number(req.query?.maxProjects) || 12, 1),
      20
    );
    try {
      const summary = await fetchChannelSummary(WORKSPACE_DIR, PROJECTS_ROOT, {
        days,
        limit,
        views48hThreshold,
        maxProjects,
        forceRefresh: youtubeChannelForceRefresh(req),
      });
      res.json(summary);
    } catch (err) {
      const payload = youtubeApiErrorPayload(
        err,
        "Erro ao buscar resumo do canal"
      );
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.get("/api/youtube/channel/overview", async (req, res) => {
  try {
    const overview = await fetchChannelOverview(WORKSPACE_DIR, {
      forceRefresh: youtubeChannelForceRefresh(req),
    });
    res.json(overview);
  } catch (err) {
    const payload = youtubeApiErrorPayload(
      err,
      "Erro ao buscar visão geral do canal"
    );
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get("/api/youtube/channel/videos", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query?.days) || 28, 1), 90);
  const limit = Math.min(Math.max(Number(req.query?.limit) || 25, 1), 50);
  try {
    const report = await fetchChannelVideosWithAnalytics(WORKSPACE_DIR, {
      days,
      limit,
      forceRefresh: youtubeChannelForceRefresh(req),
      projectsRoot: PROJECTS_ROOT,
    });
    res.json(report);
  } catch (err) {
    const payload = youtubeApiErrorPayload(
      err,
      "Erro ao buscar vídeos do canal"
    );
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get(
  "/api/youtube/channel/alerts",
  asyncHandler(async (req, res) => {
    const views48hThreshold = Math.min(
      Math.max(Number(req.query?.viewsThreshold) || 100, 1),
      100000
    );
    const maxProjects = Math.min(
      Math.max(Number(req.query?.maxProjects) || 12, 1),
      20
    );
    try {
      const report = await fetchChannelAlerts(WORKSPACE_DIR, PROJECTS_ROOT, {
        views48hThreshold,
        maxProjects,
        forceRefresh: youtubeChannelForceRefresh(req),
      });
      res.json(report);
    } catch (err) {
      const payload = youtubeApiErrorPayload(
        err,
        "Erro ao buscar alertas do canal"
      );
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.get(
  "/api/youtube/channel/comments",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 1), 50);
    const filter = String(req.query?.filter || "all").toLowerCase();
    const keyword = String(req.query?.keyword || "").trim();
    const pageToken = String(req.query?.pageToken || "").trim();
    const allowedFilters = new Set(["all", "unanswered"]);
    const resolvedFilter = allowedFilters.has(filter) ? filter : "all";
    try {
      const views48hThreshold = Math.min(
        Math.max(Number(req.query?.viewsThreshold) || 100, 1),
        100000
      );
      const report = await fetchChannelComments(WORKSPACE_DIR, {
        limit,
        filter: resolvedFilter,
        keyword,
        pageToken,
        projectsRoot: PROJECTS_ROOT,
        views48hThreshold,
        enrich: true,
      });
      res.json(report);
    } catch (err) {
      const payload = youtubeApiErrorPayload(
        err,
        "Erro ao buscar comentários do canal"
      );
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.get("/api/youtube/channel/settings", (req, res) => {
  try {
    res.json(getExtendedStudioSettings(WORKSPACE_DIR));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/youtube/channel/settings", (req, res) => {
  try {
    const templates = req.body?.replyTemplates;
    if (templates) updateReplyTemplates(WORKSPACE_DIR, templates);
    const patch = {};
    if (req.body?.weeklyReportEmail !== undefined)
      patch.weeklyReportEmail = String(req.body.weeklyReportEmail || "").trim();
    if (req.body?.dailyReportEmail !== undefined)
      patch.dailyReportEmail = String(req.body.dailyReportEmail || "").trim();
    if (req.body?.autoReplyRules)
      patch.autoReplyRules = req.body.autoReplyRules;
    if (req.body?.webhooks) patch.webhooks = req.body.webhooks;
    if (req.body?.projectGoals) patch.projectGoals = req.body.projectGoals;
    if (req.body?.defaultProjectGoalViews48h !== undefined) {
      patch.defaultProjectGoalViews48h =
        Number(req.body.defaultProjectGoalViews48h) || 100;
    }
    if (req.body?.selectedChannelId !== undefined)
      patch.selectedChannelId = String(req.body.selectedChannelId || "").trim();
    if (req.body?.slaHours !== undefined)
      patch.slaHours = Math.min(
        Math.max(Number(req.body.slaHours) || 24, 1),
        168
      );
    if (req.body?.autoQueueEnabled !== undefined)
      patch.autoQueueEnabled = Boolean(req.body.autoQueueEnabled);
    if (req.body?.smtp !== undefined) {
      const smtp = req.body.smtp;
      patch.smtp =
        smtp && typeof smtp === "object"
          ? {
              host: String(smtp.host || "").trim(),
              port: Number(smtp.port) || 587,
              user: String(smtp.user || "").trim(),
              pass: String(smtp.pass || "").trim(),
              from: String(smtp.from || smtp.user || "").trim(),
            }
          : null;
    }
    if (Object.keys(patch).length)
      saveExtendedStudioSettings(WORKSPACE_DIR, patch);
    res.json(getExtendedStudioSettings(WORKSPACE_DIR));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/youtube/channel/comments/handled", (req, res) => {
  try {
    const result = markCommentHandled(WORKSPACE_DIR, req.body?.threadId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/youtube/channel/comments/suggest-reply", async (req, res) => {
  try {
    const commentText = String(req.body?.commentText || "").trim();
    if (!commentText) {
      return res.status(400).json({ error: "Comentário vazio." });
    }
    const prompt = `Você responde comentários de um canal YouTube em português do Brasil.
Nicho do canal: ${String(req.body?.niche || "").trim() || "conteúdo em geral"}
Vídeo: ${String(req.body?.videoTitle || "").trim() || "sem título"}
Autor do comentário: ${String(req.body?.authorName || "").trim() || "espectador"}
Comentário: ${commentText}

Escreva UMA resposta curta (1-3 frases), autêntica, sem tom de IA, sem hashtags, sem pedir like/inscrição de forma agressiva.
Retorne só o texto da resposta, sem aspas nem prefixos.`;

    const suggestion = await callStudioQuickLlm(req, res, WORKSPACE_DIR, {
      title: "Resposta a comentário YouTube",
      prompt,
      temperature: 0.7,
    });
    if (suggestion === null) return;
    res.json({ suggestion: suggestion.slice(0, 10000) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/youtube/channel/period-comparison", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query?.days) || 7, 1), 28);
  try {
    const report = await fetchChannelPeriodComparison(WORKSPACE_DIR, { days });
    res.json(report);
  } catch (err) {
    const payload = youtubeApiErrorPayload(err, "Erro ao comparar períodos");
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get("/api/youtube/channel/reach", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query?.days) || 28, 1), 90);
  try {
    const report = await fetchChannelReachMetrics(WORKSPACE_DIR, { days });
    res.json(report);
  } catch (err) {
    const payload = youtubeApiErrorPayload(err, "Erro ao buscar impressões");
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get(
  "/api/youtube/channel/weekly-report",
  asyncHandler(async (req, res) => {
    const views48hThreshold = Math.min(
      Math.max(Number(req.query?.viewsThreshold) || 100, 1),
      100000
    );
    try {
      const report = await generateWeeklyReport(WORKSPACE_DIR, PROJECTS_ROOT, {
        views48hThreshold,
      });
      res.json(report);
    } catch (err) {
      const payload = youtubeApiErrorPayload(
        err,
        "Erro ao gerar relatório semanal"
      );
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.post(
  "/api/youtube/channel/weekly-report/send",
  asyncHandler(async (req, res) => {
    const views48hThreshold = Math.min(
      Math.max(Number(req.body?.viewsThreshold) || 100, 1),
      100000
    );
    try {
      const result = await sendWeeklyReportEmail(WORKSPACE_DIR, PROJECTS_ROOT, {
        views48hThreshold,
        to: req.body?.to,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })
);

app.get(
  "/api/youtube/channel/project-snapshot",
  asyncHandler(async (req, res) => {
    const projectName = String(req.query?.project || "").trim();
    const views48hThreshold = Math.min(
      Math.max(Number(req.query?.viewsThreshold) || 100, 1),
      100000
    );
    if (!projectName) {
      return res
        .status(400)
        .json({ error: "Parâmetro project é obrigatório." });
    }
    try {
      const snapshot = await fetchProjectYoutubeSnapshot(
        WORKSPACE_DIR,
        PROJECTS_ROOT,
        projectName,
        {
          views48hThreshold,
        }
      );
      res.json(snapshot);
    } catch (err) {
      const payload = youtubeApiErrorPayload(
        err,
        "Erro ao buscar snapshot do projeto"
      );
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.post(
  "/api/youtube/channel/comments/reply",
  asyncHandler(async (req, res) => {
    const parentId = String(
      req.body?.parentId || req.body?.commentId || ""
    ).trim();
    const text = String(req.body?.text || "").trim();
    try {
      const result = await replyToChannelComment(WORKSPACE_DIR, {
        parentId,
        text,
      });
      appendReplyHistory(WORKSPACE_DIR, {
        commentId: parentId,
        threadId: String(req.body?.threadId || "").trim(),
        videoId: String(req.body?.videoId || "").trim(),
        videoTitle: String(req.body?.videoTitle || "").trim(),
        text,
        source: String(req.body?.source || "manual"),
      });
      res.json(result);
    } catch (err) {
      const payload = youtubeApiErrorPayload(
        err,
        "Erro ao responder comentário"
      );
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.get("/api/youtube/channel/video/:videoId/detail", async (req, res) => {
  const videoId = String(req.params?.videoId || "").trim();
  const days = Math.min(Math.max(Number(req.query?.days) || 28, 1), 90);
  try {
    const detail = await fetchVideoStudioDetail(WORKSPACE_DIR, videoId, {
      days,
      forceRefresh: youtubeChannelForceRefresh(req),
    });
    res.json(detail);
  } catch (err) {
    const payload = youtubeApiErrorPayload(
      err,
      "Erro ao buscar detalhe do vídeo"
    );
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get("/api/youtube/channel/lumiera-videos", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query?.days) || 28, 1), 90);
  try {
    const report = await fetchLumieraVideosReport(
      WORKSPACE_DIR,
      PROJECTS_ROOT,
      {
        days,
        forceRefresh: youtubeChannelForceRefresh(req),
      }
    );
    res.json(report);
  } catch (err) {
    const payload = youtubeApiErrorPayload(
      err,
      "Erro ao buscar vídeos Lumiera"
    );
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get("/api/youtube/channel/title-experiments", async (req, res) => {
  try {
    const report = await fetchChannelTitleExperiments(
      WORKSPACE_DIR,
      PROJECTS_ROOT
    );
    res.json(report);
  } catch (err) {
    const payload = youtubeApiErrorPayload(
      err,
      "Erro ao listar testes A/B de título"
    );
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get("/api/youtube/channel/list", async (req, res) => {
  try {
    res.json(await listManagedChannels(WORKSPACE_DIR));
  } catch (err) {
    const payload = youtubeApiErrorPayload(err, "Erro ao listar canais");
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.post("/api/youtube/channel/comments/bulk-reply", async (req, res) => {
  try {
    res.json(
      await bulkReplyComments(WORKSPACE_DIR, {
        replies: req.body?.replies || [],
      })
    );
  } catch (err) {
    const payload = youtubeApiErrorPayload(err, "Erro no envio em lote");
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.post("/api/youtube/channel/comments/pin", async (req, res) => {
  try {
    res.json(
      await pinVideoComment(WORKSPACE_DIR, {
        videoId: String(req.body?.videoId || "").trim(),
        text: String(req.body?.text || "").trim(),
      })
    );
  } catch (err) {
    const payload = youtubeApiErrorPayload(err, "Erro ao fixar comentário");
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.post("/api/youtube/channel/comments/translate", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const targetLang = String(req.body?.targetLang || "pt");
    if (!text) {
      return res.status(400).json({ error: "Texto vazio." });
    }
    const langLabel = targetLang === "pt" ? "português do Brasil" : targetLang;
    const prompt = `Traduza para ${langLabel} mantendo tom natural:
"${text.slice(0, 2000)}"
Retorne só a tradução, sem aspas.`;
    const translation = await callStudioQuickLlm(req, res, WORKSPACE_DIR, {
      title: "Traduzir comentário YouTube",
      prompt,
      temperature: 0.2,
    });
    if (translation === null) return;
    res.json({ translation: translation.slice(0, 5000), targetLang });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/youtube/channel/comments/ideas", async (req, res) => {
  const niche = String(req.query?.niche || "").trim();
  const useAi = String(req.query?.ai || "") === "1";
  try {
    const commentsReport = await fetchChannelComments(WORKSPACE_DIR, {
      limit: 40,
      filter: "unanswered",
      projectsRoot: PROJECTS_ROOT,
      enrich: false,
    });
    const { generateCommentIdeas: genIdeas } =
      await import("./youtubeStudioAdvanced.js");
    res.json(
      await genIdeas(
        commentsReport.comments || [],
        niche,
        useAi
          ? (prompt, opts) =>
              callGeminiWithRetry(getApiKey(WORKSPACE_DIR), prompt, {
                ...opts,
                projectDir: WORKSPACE_DIR,
              })
          : null
      )
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/youtube/channel/competitor-research",
  asyncHandler(async (req, res) => {
    const niche = String(req.body?.niche || "").trim();
    const format =
      String(req.body?.format || "SHORT").toUpperCase() === "LONG"
        ? "LONG"
        : "SHORT";
    const maxCompetitors = Math.min(
      Math.max(Number(req.body?.maxCompetitors) || 5, 1),
      10
    );
    const seedChannels = Array.isArray(req.body?.seedChannels)
      ? req.body.seedChannels
      : [];
    const useAi = req.body?.useAi !== false;

    try {
      const LLM_TIMEOUT_MS = 90000;
      const withTimeout = (promise, label) =>
        Promise.race([
          promise,
          new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error(`${label} timeout ${LLM_TIMEOUT_MS}ms`)),
              LLM_TIMEOUT_MS
            );
          }),
        ]);

      const tryCompetitorLlm = async (label, fn) => {
        try {
          const text = String((await withTimeout(fn(), label)) || "").trim();
          if (text) return text;
          console.warn(`[CompetitorResearch] ${label}: resposta vazia`);
        } catch (err) {
          console.warn(`[CompetitorResearch] ${label} falhou:`, err.message);
        }
        return null;
      };

      const llmFn = useAi
        ? async (prompt) => {
            let text = null;

            if (getAiProvider(WORKSPACE_DIR) === "nvidia") {
              for (const model of NVIDIA_MODELS.slice(0, 4)) {
                text = await tryCompetitorLlm(`nvidia-${model}`, () =>
                  callNvidiaWithRetry(prompt, {
                    maxRetries: 1,
                    models: [model],
                    temperature: 0.2,
                    projectDir: WORKSPACE_DIR,
                  })
                );
                if (text) break;
              }
            } else {
              text = await tryCompetitorLlm("provider", () =>
                callGeminiWithRetry(getApiKey(WORKSPACE_DIR), prompt, {
                  maxRetries: 1,
                  temperature: 0.2,
                  projectDir: WORKSPACE_DIR,
                })
              );
            }

            return text;
          }
        : null;

      const repairJsonFn = useAi
        ? async (candidate) => {
            const repairPrompt = `Corrija o JSON abaixo para sintaxe 100% válida. Preserve todos os textos. Retorne APENAS o JSON, sem markdown.\n\n${candidate}`;
            let text = null;
            for (const model of [
              "qwen/qwen3.5-397b-a17b",
              "moonshotai/kimi-k2.6",
              "deepseek/deepseek-v4-flash",
            ]) {
              text = await tryCompetitorLlm(`json-repair-${model}`, () =>
                callNvidiaWithRetry(repairPrompt, {
                  maxRetries: 1,
                  models: [model],
                  temperature: 0,
                  projectDir: WORKSPACE_DIR,
                })
              );
              if (text) break;
            }
            if (!text) {
              // Provedor ativo das configs — não engessa Gemini
              text = await tryCompetitorLlm("json-repair-provider", () =>
                callGeminiWithRetry(getApiKey(WORKSPACE_DIR), repairPrompt, {
                  maxRetries: 2,
                  temperature: 0,
                  projectDir: WORKSPACE_DIR,
                })
              );
            }
            return text;
          }
        : null;

      const report = await runCompetitorResearch(WORKSPACE_DIR, {
        niche,
        format,
        maxCompetitors,
        seedChannels,
        projectsRoot: PROJECTS_ROOT,
        llmFn,
        repairJsonFn,
      });
      try {
        const { enqueueEditorialIdeas } =
          await import("./youtubeEditorialQueue.js");
        const enqueued = enqueueEditorialIdeas(
          WORKSPACE_DIR,
          report.analysis?.derivedIdeas || [],
          { source: "competitor-research", format }
        );
        report.editorialQueue = {
          enqueued: (report.analysis?.derivedIdeas || []).length,
          total: enqueued.items.length,
        };
      } catch (err) {
        console.warn("[CompetitorResearch] Fila editorial:", err.message);
      }
      res.json(report);
    } catch (err) {
      const payload = youtubeApiErrorPayload(
        err,
        "Erro na pesquisa de concorrentes"
      );
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.get("/api/youtube/channel/editorial-queue", async (_req, res) => {
  try {
    const { repairCorruptedClipFactoryQueue } =
      await import("./youtubeEditorialQueue.js");
    res.json(repairCorruptedClipFactoryQueue(WORKSPACE_DIR, LONGS_DIR));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/youtube/channel/editorial-queue/:id", async (req, res) => {
  try {
    const { updateEditorialItemStatus } =
      await import("./youtubeEditorialQueue.js");
    const status = String(req.body?.status || "").trim();
    const result = updateEditorialItemStatus(
      WORKSPACE_DIR,
      req.params.id,
      status
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/youtube/channel/editorial-queue/:id", async (req, res) => {
  try {
    const { removeEditorialItem } = await import("./youtubeEditorialQueue.js");
    const result = removeEditorialItem(WORKSPACE_DIR, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post(
  "/api/youtube/channel/top-winners",
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(Number(req.body?.days) || 7, 3), 28);
    const limit = Math.min(Math.max(Number(req.body?.limit) || 3, 1), 5);
    const niche = String(req.body?.niche || "").trim();
    const useAi = req.body?.useAi !== false;

    try {
      const { generateTopWinnerIdeas } =
        await import("./youtubeEditorialQueue.js");
      const config =
        readJsonFile(path.join(WORKSPACE_DIR, "config_qanat.json")) || {};
      const llmFn = useAi
        ? async (prompt) =>
            callGeminiWithRetry(getApiKey(WORKSPACE_DIR), prompt, {
              maxRetries: 1,
              temperature: 0.4,
              projectDir: WORKSPACE_DIR,
            })
        : null;

      const result = await generateTopWinnerIdeas(
        WORKSPACE_DIR,
        PROJECTS_ROOT,
        {
          days,
          limit,
          niche: niche || config.niche || "",
          llmFn,
        }
      );
      if (!result.ok) return res.status(404).json(result);
      res.json(result);
    } catch (err) {
      const payload = youtubeApiErrorPayload(
        err,
        "Erro ao gerar ideias dos top vídeos"
      );
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.get(
  "/api/youtube/channel/export.csv",
  asyncHandler(async (req, res) => {
    const type = String(req.query?.type || "comments");
    const views48hThreshold = Math.min(
      Math.max(Number(req.query?.viewsThreshold) || 100, 1),
      100000
    );
    try {
      if (type === "videos") {
        const [videos, lumiera] = await Promise.all([
          fetchChannelVideosWithAnalytics(WORKSPACE_DIR, {
            days: 28,
            limit: 50,
          }),
          fetchLumieraVideosReport(WORKSPACE_DIR, PROJECTS_ROOT, { days: 28 }),
        ]);
        const csv = videosToCsv([
          ...(videos.videos || []),
          ...(lumiera.videos || []).map((v) => ({
            ...v,
            videoFormat: v.format,
          })),
        ]);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="youtube-videos.csv"'
        );
        return res.send(csv);
      }
      const commentsReport = await fetchChannelComments(WORKSPACE_DIR, {
        limit: 50,
        filter: "all",
        projectsRoot: PROJECTS_ROOT,
        views48hThreshold,
        enrich: true,
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="youtube-comments.csv"'
      );
      res.send(commentsToCsv(commentsReport.comments || []));
    } catch (err) {
      const payload = youtubeApiErrorPayload(err, "Erro ao exportar CSV");
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.get("/api/youtube/channel/response-stats", async (req, res) => {
  try {
    const { assertTitleTestScopes, getYoutubeAccessToken } =
      await import("./youtubeTitleAnalytics.js");
    await assertTitleTestScopes(WORKSPACE_DIR);
    const accessToken = await getYoutubeAccessToken(WORKSPACE_DIR);
    const channelData = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    ).then((r) => r.json());
    const ch = channelData?.items?.[0];
    res.json(
      await computeChannelResponseStats(
        accessToken,
        ch?.id,
        ch?.snippet?.title || "",
        ch?.snippet?.customUrl || ""
      )
    );
  } catch (err) {
    const payload = youtubeApiErrorPayload(
      err,
      "Erro nas estatísticas de resposta"
    );
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get(
  "/api/youtube/channel/daily-report",
  asyncHandler(async (req, res) => {
    const views48hThreshold = Math.min(
      Math.max(Number(req.query?.viewsThreshold) || 100, 1),
      100000
    );
    try {
      res.json(
        await generateDailyReport(WORKSPACE_DIR, PROJECTS_ROOT, {
          views48hThreshold,
        })
      );
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })
);

app.post("/api/youtube/channel/webhooks/test", async (req, res) => {
  try {
    const settings = getExtendedStudioSettings(WORKSPACE_DIR);
    const webhooks = { ...settings.webhooks, ...(req.body?.webhooks || {}) };
    res.json({
      results: await sendWebhookNotification(
        webhooks,
        req.body?.message || "Teste Lumiera — Canal YouTube"
      ),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(
  "/api/youtube/channel/post-publish-checklist",
  asyncHandler(async (req, res) => {
    const projectName = String(req.query?.project || "").trim();
    const videoId = String(req.query?.videoId || "").trim();
    if (!projectName)
      return res.status(400).json({ error: "project é obrigatório." });
    try {
      res.json(
        await getPostPublishChecklist(
          WORKSPACE_DIR,
          PROJECTS_ROOT,
          projectName,
          videoId
        )
      );
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })
);

app.post(
  "/api/youtube/channel/post-publish-checklist",
  asyncHandler(async (req, res) => {
    const projectName = String(req.body?.project || "").trim();
    const itemId = String(req.body?.itemId || "").trim();
    if (!projectName || !itemId)
      return res.status(400).json({ error: "project e itemId obrigatórios." });
    try {
      const { collectLumieraPublishedVideos } =
        await import("./youtubeChannelAnalytics.js");
      const entry = collectLumieraPublishedVideos(PROJECTS_ROOT).find(
        (p) => p.projectName === projectName
      );
      res.json(
        savePostPublishChecklistItem(
          entry?.projectPath,
          itemId,
          req.body?.done !== false
        )
      );
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })
);

app.get("/api/youtube/channel/pro/dashboard", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query?.limit) || 40, 5), 50);
  try {
    const commentsReport = await fetchChannelComments(WORKSPACE_DIR, {
      limit,
      filter: "unanswered",
      projectsRoot: PROJECTS_ROOT,
      views48hThreshold: Math.min(
        Math.max(Number(req.query?.viewsThreshold) || 100, 1),
        100000
      ),
    });
    buildApprovalQueueFromComments(
      WORKSPACE_DIR,
      commentsReport.comments || []
    );
    res.json(
      await fetchProDashboard(WORKSPACE_DIR, commentsReport.comments || [])
    );
  } catch (err) {
    const payload = youtubeApiErrorPayload(
      err,
      "Erro ao carregar dashboard Pro"
    );
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.post("/api/youtube/channel/pro/approval-queue/build", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.body?.limit) || 40, 5), 50);
  try {
    const commentsReport = await fetchChannelComments(WORKSPACE_DIR, {
      limit,
      filter: "unanswered",
      projectsRoot: PROJECTS_ROOT,
    });
    res.json(
      buildApprovalQueueFromComments(
        WORKSPACE_DIR,
        commentsReport.comments || []
      )
    );
  } catch (err) {
    const payload = youtubeApiErrorPayload(
      err,
      "Erro ao montar fila de aprovação"
    );
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.post(
  "/api/youtube/channel/pro/approval-queue/:itemId/approve",
  (req, res) => {
    try {
      res.json({
        success: true,
        item: updateQueueItem(WORKSPACE_DIR, req.params.itemId, {
          status: "approved",
        }),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  "/api/youtube/channel/pro/approval-queue/:itemId/reject",
  (req, res) => {
    try {
      res.json({
        success: true,
        item: updateQueueItem(WORKSPACE_DIR, req.params.itemId, {
          status: "rejected",
        }),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  "/api/youtube/channel/pro/approval-queue/:itemId/send",
  async (req, res) => {
    try {
      res.json(
        await sendQueueItem(WORKSPACE_DIR, req.params.itemId, {
          text: String(req.body?.text || "").trim(),
        })
      );
    } catch (err) {
      const payload = youtubeApiErrorPayload(
        err,
        "Erro ao enviar resposta da fila"
      );
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  }
);

app.get("/api/youtube/channel/pro/reply-history", (req, res) => {
  try {
    const settings = getProSettings(WORKSPACE_DIR);
    const limit = Math.min(Math.max(Number(req.query?.limit) || 30, 1), 100);
    res.json({ history: (settings.replyHistory || []).slice(0, limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/youtube/channel/pro/seo-mining", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query?.limit) || 40, 5), 50);
  try {
    const commentsReport = await fetchChannelComments(WORKSPACE_DIR, {
      limit,
      filter: "all",
    });
    res.json({
      opportunities: mineSeoKeywords(commentsReport.comments || [], {
        limit: 16,
      }),
    });
  } catch (err) {
    const payload = youtubeApiErrorPayload(err, "Erro na mineração SEO");
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get(
  "/api/youtube/channel/video/:videoId/retention-cliff",
  async (req, res) => {
    const videoId = String(req.params?.videoId || "").trim();
    const days = Math.min(Math.max(Number(req.query?.days) || 28, 1), 90);
    if (!videoId)
      return res.status(400).json({ error: "videoId obrigatório." });
    try {
      res.json(
        await fetchRetentionCliffReport(WORKSPACE_DIR, videoId, { days })
      );
    } catch (err) {
      const payload = youtubeApiErrorPayload(
        err,
        "Erro ao analisar penhasco de retenção"
      );
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  }
);

app.get("/api/youtube/channel/pro/heatmap", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query?.days) || 28, 7), 90);
  try {
    res.json(await fetchAudienceHeatmap(WORKSPACE_DIR, { days }));
  } catch (err) {
    const payload = youtubeApiErrorPayload(err, "Erro ao carregar heatmap");
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get("/api/youtube/channel/pro/pre-upload-checklist", (req, res) => {
  try {
    res.json(getPreUploadChecklistState(WORKSPACE_DIR));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/youtube/channel/pro/pre-upload-checklist", (req, res) => {
  try {
    res.json(
      togglePreUploadItem(
        WORKSPACE_DIR,
        String(req.body?.itemId || "").trim(),
        req.body?.done !== false
      )
    );
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/youtube/channel/pro/notes", (req, res) => {
  try {
    res.json({ notes: getProSettings(WORKSPACE_DIR).channelNotes || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/youtube/channel/pro/notes", (req, res) => {
  try {
    res.json(addChannelNote(WORKSPACE_DIR, req.body?.text));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/youtube/channel/pro/notes/:noteId", (req, res) => {
  try {
    res.json(deleteChannelNote(WORKSPACE_DIR, req.params.noteId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/youtube/channel/pro/sla", (req, res) => {
  try {
    const patch = {
      slaHours: Math.min(Math.max(Number(req.body?.slaHours) || 24, 1), 168),
    };
    if (req.body?.autoQueueEnabled !== undefined)
      patch.autoQueueEnabled = Boolean(req.body.autoQueueEnabled);
    saveProSettings(WORKSPACE_DIR, patch);
    res.json(getProSettings(WORKSPACE_DIR));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/youtube/channel/pro/ypp-milestones", async (req, res) => {
  try {
    res.json(await fetchYppMilestones(WORKSPACE_DIR));
  } catch (err) {
    const payload = youtubeApiErrorPayload(err, "Erro ao buscar marcos YPP");
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get("/api/youtube/title-experiment", (req, res) => {
  const projDir = getProjectDir(req);
  const experiment = loadTitleExperiment(projDir);
  const configPath = path.join(projDir, "config_qanat.json");
  let videoId = experiment?.videoId || null;
  if (!videoId && fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      videoId = config?.upload_metadata?.youtube?.post_id || null;
    } catch (e) {}
  }
  res.json({ experiment, videoId });
});

app.post("/api/youtube/title-experiment/start", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const experiment = startTitleExperiment(projDir, {
      videoId: req.body?.videoId,
      titles: req.body?.titles || [],
      rotateHours: req.body?.rotateHours || 48,
    });
    let applied = null;
    if (req.body?.applyFirst !== false && experiment.variants?.length) {
      try {
        applied = await applyTitleVariant(
          WORKSPACE_DIR,
          projDir,
          experiment.variants[0].id
        );
      } catch (applyErr) {
        applied = { error: applyErr.message };
      }
    }
    res.json({
      success: true,
      experiment: applied?.experiment || experiment,
      appliedFirst: applied,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post(
  "/api/youtube/title-experiment/apply",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const variantId = String(req.body?.variantId || "").toUpperCase();
    if (!variantId) {
      return res.status(400).json({ error: "variantId é obrigatório." });
    }
    try {
      const result = await applyTitleVariant(WORKSPACE_DIR, projDir, variantId);
      res.json({ success: true, ...result });
    } catch (err) {
      const payload = youtubeApiErrorPayload(err, "Erro ao aplicar título");
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.get("/api/youtube/title-experiment/analytics", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const report = await getTitleExperimentReport(WORKSPACE_DIR, projDir);
    res.json(report);
  } catch (err) {
    const payload = youtubeApiErrorPayload(err, "Erro ao buscar analytics");
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.post("/api/youtube/title-experiment/sync-video", (req, res) => {
  const projDir = getProjectDir(req);
  const videoId = req.body?.videoId;
  if (!videoId) {
    return res.status(400).json({ error: "videoId é obrigatório." });
  }
  try {
    const experiment = syncExperimentVideoId(projDir, videoId);
    res.json({ success: true, experiment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/youtube/title-experiment/stop", (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const experiment = stopTitleExperiment(projDir);
    res.json({ success: true, experiment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/youtube/title-experiment/apply-winner", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const result = await applyWinnerTitle(WORKSPACE_DIR, projDir);
    res.json({ success: true, ...result });
  } catch (err) {
    const payload = youtubeApiErrorPayload(err, "Erro ao aplicar vencedor");
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.post("/api/youtube/title-experiment/apply-first", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const experiment = loadTitleExperiment(projDir);
    if (!experiment?.variants?.length) {
      return res.status(400).json({ error: "Nenhum experimento ativo." });
    }
    const firstId = experiment.variants[0].id;
    const result = await applyTitleVariant(WORKSPACE_DIR, projDir, firstId);
    res.json({ success: true, ...result });
  } catch (err) {
    const payload = youtubeApiErrorPayload(
      err,
      "Erro ao aplicar primeiro título"
    );
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get(
  "/api/youtube/title-experiment/retention",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const experiment = loadTitleExperiment(projDir);
    const videoId = experiment?.videoId || req.query?.videoId;
    if (!videoId) {
      return res.status(400).json({ error: "videoId não encontrado." });
    }
    try {
      const [retention, velocity] = await Promise.all([
        fetchRetentionCurve(WORKSPACE_DIR, videoId),
        fetchVideoVelocity(WORKSPACE_DIR, videoId),
      ]);
      res.json({ retention, velocity });
    } catch (err) {
      const payload = youtubeApiErrorPayload(err, "Erro ao buscar retenção");
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.post("/api/upload/post-upload", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const result = await runPostUploadHooks(WORKSPACE_DIR, projDir, {
      videoId: req.body?.videoId,
      autoStartTitleTest: req.body?.autoStartTitleTest !== false,
      postPinned: req.body?.postPinned !== false,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai/adapt-platform-metadata", (req, res) => {
  const parsed = req.body?.parsed || {};
  const format = req.body?.format === "SHORT" ? "SHORT" : "LONG";
  try {
    const adapted = adaptMetadataForPlatforms(parsed, format);
    res.json({ success: true, adapted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/youtube/thumbnail-experiment", (req, res) => {
  const projDir = getProjectDir(req);
  res.json({ experiment: loadThumbnailExperiment(projDir) });
});

app.post("/api/youtube/thumbnail-experiment/start", (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const experiment = startThumbnailExperiment(projDir, {
      videoId: req.body?.videoId,
      thumbnails: req.body?.thumbnails || [],
      rotateHours: req.body?.rotateHours || 72,
    });
    res.json({ success: true, experiment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post(
  "/api/youtube/thumbnail-experiment/apply",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const variantId = String(req.body?.variantId || "").toUpperCase();
    if (!variantId) {
      return res.status(400).json({ error: "variantId é obrigatório." });
    }
    try {
      const result = await applyThumbnailVariant(
        WORKSPACE_DIR,
        projDir,
        variantId
      );
      res.json({ success: true, ...result });
    } catch (err) {
      const payload = youtubeApiErrorPayload(err, "Erro ao aplicar thumbnail");
      res.status(payload.needsReauth ? 403 : 500).json(payload);
    }
  })
);

app.get("/api/youtube/thumbnail-experiment/analytics", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const report = await getThumbnailExperimentReport(WORKSPACE_DIR, projDir);
    res.json(report);
  } catch (err) {
    const payload = youtubeApiErrorPayload(
      err,
      "Erro ao buscar analytics de thumbnail"
    );
    res.status(payload.needsReauth ? 403 : 500).json(payload);
  }
});

app.get(
  "/api/pipeline/run",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const stepsParam = req.query?.steps || "mix,upload";
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
      if (steps.includes("upload")) {
        sendLog("[Quality Gate] Auditando o video final antes do upload...");
        const report = await runYoutubeQualityGate({
          workspaceDir: WORKSPACE_DIR,
          projectsRoot: PROJECTS_ROOT,
          projectDir: projDir,
        });
        sendLog(
          `[Quality Gate] Nota ${report.score}/100; ${report.blockingCount} bloqueio(s), ${report.warningCount} aviso(s).`
        );
        if (!report.ready) {
          const detail = report.checks
            .filter((item) => item.status === "error")
            .slice(0, 5)
            .map((item) => item.message)
            .join(" | ");
          throw new Error(`Upload bloqueado pelo Quality Gate: ${detail}`);
        }
      }

      const results = await runFullPipeline({
        projDir,
        pythonPath: PYTHON_PATH,
        sendLog,
        steps,
        handlers: {
          metadata: async (dir, log) => {
            if (!workflowApi?.generateYoutubeMetadataForProject) {
              log("[Pipeline] Workflow API indisponível para metadados.");
              return;
            }
            try {
              await workflowApi.generateYoutubeMetadataForProject(dir);
              log("[Pipeline] Metadados YouTube gerados.");
            } catch (err) {
              log(`[Pipeline] Falha ao gerar metadados: ${err.message}`);
              throw err;
            }
          },
          thumbnails: async (dir, log) => {
            const cachePath = path.join(dir, "youtube_metadata_cache.json");
            if (!fs.existsSync(cachePath)) return;
            const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
            const thumbs = cache?.parsed?.thumbnails || [];
            if (!thumbs.length) return;
            const result = await generateYoutubeThumbnailImages({
              projectDir: dir,
              projectName: path.basename(dir),
              thumbnails: thumbs,
              format: cache.format || "LONG",
              palette: cache.palette || [],
            });
            log(
              `[Pipeline] ${result.thumbnails?.length || 0} thumbnails geradas.`
            );
          },
          render: async (dir, log, mode) => {
            ensureFileExists("build_video.py", dir);
            const scriptName =
              mode === "highlighted"
                ? "build_video_destacado.py"
                : "build_video.py";
            if (mode === "remotion" || mode === "remotion-pro") {
              log(
                `[Pipeline] Render ${mode} — use a aba Render para concluir (passo pesado).`
              );
              return;
            }
            await new Promise((resolve, reject) => {
              const child = spawn(PYTHON_PATH, [scriptName], {
                cwd: dir,
                shell: true,
                env: buildPythonSpawnEnv(),
              });
              child.stdout.on("data", (d) => log(d.toString().trim()));
              child.stderr.on("data", (d) =>
                log(`[stderr] ${d.toString().trim()}`)
              );
              child.on("close", (code) =>
                code === 0
                  ? resolve()
                  : reject(new Error(`Render exit ${code}`))
              );
            });
          },
        },
      });
      res.write(`data: ${JSON.stringify({ type: "complete", results })}\n\n`);
    } catch (err) {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`
      );
    }
    res.end();
  })
);

app.post("/api/upload/instagram/save-app", (req, res) => {
  const { app_id, app_secret } = req.body;
  if (!app_id || !app_secret) {
    return res
      .status(400)
      .json({ error: "App ID e App Secret são obrigatórios." });
  }
  try {
    saveInstagramAppCredentials(WORKSPACE_DIR, { app_id, app_secret });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/upload/instagram/oauth-url", (req, res) => {
  const redirectUri = `${LUMIERA_BACKEND_BASE}/api/upload/instagram/callback`;
  try {
    const url = buildInstagramAuthUrl(WORKSPACE_DIR, redirectUri);
    res.json({ url, redirect_uri: redirectUri });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get(
  "/api/upload/instagram/callback",
  asyncHandler(async (req, res) => {
    const code = req.query?.code;
    if (!code) {
      return res.status(400).send("Código OAuth ausente.");
    }
    try {
      const redirectUri = `${LUMIERA_BACKEND_BASE}/api/upload/instagram/callback`;
      await exchangeInstagramCode(WORKSPACE_DIR, code, redirectUri);
      res.send(
        "<html><body><h2>Instagram conectado!</h2><p>Feche esta aba e volte ao Lumiera.</p></body></html>"
      );
    } catch (err) {
      res.status(500).send(`Erro: ${err.message}`);
    }
  })
);

// API: AI-powered BGM suggestion per block

app.post("/api/ai/suggest-block-progress-icons", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const config = readProjectJson(projDir, "config_qanat.json", {});
    const timings = readProjectJson(projDir, "block_timings.json", {
      starts: [],
      durations: [],
    });
    const blockPhrases = Array.isArray(config.block_phrases)
      ? config.block_phrases
      : [];
    if (!blockPhrases.length) {
      return res.status(400).json({ error: "Projeto sem blocos de narração." });
    }

    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    const visualPrompts = Array.isArray(storyboard.visual_prompts)
      ? storyboard.visual_prompts
      : [];
    const chaptersText = resolveChaptersTextForProject(
      projDir,
      readProjectJson
    );
    const raw = config.block_progress_bar || {};
    const markers = buildDefaultBlockProgressMarkers({
      blockPhrases,
      visualPrompts,
      starts: timings.starts || [],
      durations: timings.durations || [],
      niche: config.niche || "Geral",
      existingBlocks: raw.blocks || [],
      chaptersText,
      storyboard,
      config,
    });

    const browserTextRaw = extractBrowserResponse(req.body);
    const browserText = browserTextRaw
      ? extractOverlayJsonPayload(browserTextRaw) || browserTextRaw
      : null;
    const forceBrowser =
      req.body?.require_browser === true || shouldOfferGeminiBrowser(projDir);

    let llmText = browserText;
    if (!llmText) {
      const prompt = buildBlockProgressIconAiPrompt({
        niche: config.niche || "Geral",
        blocks: markers,
      });

      if (forceBrowser) {
        const title = "Sugerir ícones da barra de progresso";
        const promptText = buildBrowserTaskPrompt(title, prompt, "", {
          taskType: "json",
          responseFormat: "json",
        });
        return res.json(
          offerGeminiBrowserPayload({ title, prompt: promptText })
        );
      }

      const apiKey = getApiKey(projDir);
      if (!apiKey) {
        return res.status(401).json({
          error:
            "Sem chave API. Ative Gemini no Chrome ou configure uma chave.",
        });
      }
      llmText = await callGeminiWithRetry(apiKey, prompt, {
        temperature: 0.25,
        projectDir: projDir,
      });
    }

    const parsed = await parseAiJsonResponse(
      llmText,
      getApiKey(projDir),
      "ícones barra de progresso"
    );
    const aiBlocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
    const merged = mergeAiBlockProgressIcons(markers, aiBlocks, {
      niche: config.niche || "Geral",
    });

    const nextConfig = {
      ...raw,
      enabled: raw.enabled === true,
      design: normalizeBlockProgressDesign(raw.design),
      iconSize:
        Number(raw.iconSize) || (config.aspect_ratio === "9:16" ? 16 : 22),
      defaultIconStyle: raw.defaultIconStyle === "svg" ? "svg" : "lottie",
      showBlockTitles: raw.showBlockTitles === true,
      titleFont: raw.titleFont || "inter",
      titleFontSize:
        Number(raw.titleFontSize) || (config.aspect_ratio === "9:16" ? 9 : 10),
      titleColor: String(raw.titleColor || "#FFFFFF"),
      blocks: merged,
      icons_suggested_at: new Date().toISOString(),
      icons_suggested_via: browserText ? "gemini_chrome" : "gemini_api",
    };

    config.block_progress_bar = nextConfig;
    fs.writeFileSync(
      path.join(projDir, "config_qanat.json"),
      JSON.stringify(config, null, 2),
      "utf8"
    );

    console.log(
      `[Block Progress] IA sugeriu ícones para ${merged.length} bloco(s).`
    );
    res.json({
      success: true,
      blocks: merged,
      source: browserText ? "gemini_chrome" : "gemini_api",
    });
  } catch (err) {
    console.error("[Block Progress Icons]", err);
    res.status(500).json({ error: err.message || "Falha ao sugerir ícones." });
  }
});

app.post("/api/ai/suggest-block-progress-titles", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const config = readProjectJson(projDir, "config_qanat.json", {});
    const timings = readProjectJson(projDir, "block_timings.json", {
      starts: [],
      durations: [],
    });
    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    const visualPrompts = Array.isArray(storyboard.visual_prompts)
      ? storyboard.visual_prompts
      : [];
    const blockPhrases = Array.isArray(config.block_phrases)
      ? config.block_phrases
      : [];
    if (!blockPhrases.length) {
      return res.status(400).json({ error: "Projeto sem blocos de narração." });
    }

    const chaptersText = resolveChaptersTextForProject(
      projDir,
      readProjectJson
    );
    const raw = config.block_progress_bar || {};
    const markers = buildDefaultBlockProgressMarkers({
      blockPhrases,
      visualPrompts,
      starts: timings.starts || [],
      durations: timings.durations || [],
      niche: config.niche || "Geral",
      existingBlocks: [],
      chaptersText,
      storyboard,
      config,
    });
    const existingMarkers = buildDefaultBlockProgressMarkers({
      blockPhrases,
      visualPrompts,
      starts: timings.starts || [],
      durations: timings.durations || [],
      niche: config.niche || "Geral",
      existingBlocks: raw.blocks || [],
      chaptersText,
      storyboard,
      config,
    });
    const merged = mergeAiBlockProgressTitles(
      existingMarkers,
      markers.map((m) => ({ block: m.block, title: m.title }))
    );
    const updatedCount = merged.reduce((count, block, idx) => {
      const prev = existingMarkers[idx];
      const prevTitle = String(prev?.title || prev?.label || "").trim();
      const nextTitle = String(block?.title || block?.label || "").trim();
      return count + (nextTitle && nextTitle !== prevTitle ? 1 : 0);
    }, 0);

    const nextConfig = {
      ...raw,
      enabled: raw.enabled === true,
      design: normalizeBlockProgressDesign(raw.design),
      iconSize:
        Number(raw.iconSize) || (config.aspect_ratio === "9:16" ? 16 : 22),
      defaultIconStyle: raw.defaultIconStyle === "svg" ? "svg" : "lottie",
      showBlockTitles: raw.showBlockTitles !== false,
      titleFont: raw.titleFont || "inter",
      titleFontSize:
        Number(raw.titleFontSize) || (config.aspect_ratio === "9:16" ? 9 : 10),
      titleColor: String(raw.titleColor || "#FFFFFF"),
      blocks: merged,
      titles_synced_at: new Date().toISOString(),
      titles_synced_via: "metadata_chapters",
    };

    config.block_progress_bar = nextConfig;
    fs.writeFileSync(
      path.join(projDir, "config_qanat.json"),
      JSON.stringify(config, null, 2),
      "utf8"
    );

    console.log(
      `[Block Progress] Títulos sincronizados dos capítulos: ${updatedCount} atualizado(s), ${merged.length} bloco(s).`
    );
    res.json({
      success: true,
      blocks: merged,
      updatedCount,
      source: "metadata_chapters",
    });
  } catch (err) {
    console.error("[Block Progress Titles]", err);
    res.status(500).json({
      error: err.message || "Falha ao sincronizar títulos dos capítulos.",
    });
  }
});

app.post("/api/ai/suggest-bgm", async (req, res) => {
  const projDir = getProjectDir(req);

  try {
    const { mode } = req.body; // 'LONGO' or 'SHORTS'

    // Get storyboard for context

    let storyboard = {};

    const storyboardPath = path.join(projDir, "storyboard.json");

    if (fs.existsSync(storyboardPath)) {
      try {
        storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      } catch (e) {}
    }

    // Get transcript for context

    let transcript = "";

    const transcriptPath = path.join(projDir, "transcripts_readable.txt");

    if (fs.existsSync(transcriptPath)) {
      try {
        transcript = fs.readFileSync(transcriptPath, "utf8");
      } catch (e) {}
    }

    // Build block summaries from storyboard

    let blockSummaries = "";

    if (storyboard.visual_prompts) {
      const blocks = {};

      storyboard.visual_prompts.forEach((vp) => {
        const b = vp.block;

        if (!blocks[b]) blocks[b] = [];

        blocks[b].push(vp.narration_text || "");
      });

      Object.keys(blocks)
        .sort((a, b) => a - b)
        .forEach((b) => {
          blockSummaries += `Bloco ${b}: ${blocks[b].join(" ").substring(0, 200)}...\n`;
        });
    }

    const musicListStr = "";

    let bgmPrompt;

    if (mode === "SHORTS") {
      bgmPrompt = `Você é um editor de vídeo especialista em trilha sonora. Analise o roteiro do vídeo curto (Shorts) abaixo e escolha A MELHOR trilha sonora entre os arquivos disponíveis.

Arquivos de música disponíveis:

${musicListStr}

Roteiro:

${transcript || blockSummaries}

Responda APENAS com um JSON válido no formato:

{"file": "nome_exato_do_arquivo.mp3", "reason": "explicação breve de por que esta trilha combina"}`;
    } else {
      bgmPrompt = `Você é um editor de vídeo especialista em trilha sonora para documentários. Analise o tom emocional de cada bloco do roteiro e sugira a melhor trilha sonora para CADA bloco.

Arquivos de música disponíveis:

${musicListStr}

Resumo por bloco:

${blockSummaries}

Regras:

- O mesmo arquivo pode ser usado em múltiplos blocos se for adequado

- Priorize transições suaves entre blocos adjacentes

- Escolha trilhas que amplificam a emoção do texto narrado

Responda APENAS com um JSON válido no formato:

{"suggestions": [{"block": 1, "file": "nome_exato.mp3", "reason": "breve"}, ...]}`;
    }

    bgmPrompt =
      mode === "SHORTS"
        ? `Voce e um editor de video especialista em trilha sonora. Analise o roteiro do video curto (Shorts) abaixo e recomende apenas a IDEIA de trilha sonora ideal para o video inteiro.

Roteiro:

${transcript || blockSummaries}

Importante:

- Nao escolha arquivo de musica.

- Nao cite nomes de faixas enviadas.

- A configuracao real continua manual na opcao Trilha Unica.

Responda APENAS com um JSON valido no formato:

{"mode": "SHORTS", "recommendation": "descricao da ideia de trilha para o video inteiro", "search_theme": "3 a 5 palavras-chave em ingles para busca (ex: cinematic mystery dark tension)", "reason": "explicacao breve", "manual_note": "Escolha manualmente uma faixa em Trilha Unica."}`
        : `Voce e um editor de video especialista em trilha sonora para documentarios. Analise o tom emocional de cada bloco do roteiro e recomende apenas a IDEIA de trilha sonora ideal para CADA bloco.

Resumo por bloco:

${blockSummaries || transcript}

Regras:

- Nao escolha arquivos de musica.

- Nao cite nomes de faixas enviadas.

- Descreva estilo, instrumentos, energia, clima emocional e progressao.

- A configuracao real continua manual na opcao Por Bloco.

Responda APENAS com um JSON valido no formato:

{"mode": "LONGO", "suggestions": [{"block": 1, "recommendation": "ideia de trilha para este bloco", "search_theme": "3 a 5 palavras-chave em ingles para busca (ex: epic tribal drums action)", "reason": "breve"}], "manual_note": "Escolha manualmente as faixas em Por Bloco."}`;

    const responseText = await callGeminiLlm(req, res, projDir, {
      title: "Sugestão de trilha BGM",
      prompt: bgmPrompt,
    });
    if (responseText == null) return;

    const parsed = await parseAiJsonResponse(
      responseText,
      extractBrowserResponse(req.body) ? null : getApiKey(projDir),
      "Sugestao de BGM"
    );

    res.json(parsed);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao sugerir BGM", details: err.message });
  }
});

app.post("/api/ai/plan-bgm-emotions", async (req, res) => {
  const projDir = getProjectDir(req);
  const autoDownload = req.body?.auto_download !== false;

  try {
    console.log("[BGM Emotion] planejamento iniciado", {
      project: path.basename(projDir),
      autoDownload,
    });
    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    const config = readProjectJson(projDir, "config_qanat.json", {});
    const timings = readProjectJson(projDir, "block_timings.json", {
      starts: [],
      durations: [],
    });
    const wordTranscripts = readProjectJson(
      projDir,
      "word_transcripts.json",
      []
    );
    const blockNumbers = collectProjectBlockNumbers(
      config,
      storyboard,
      timings
    );
    const blockRanges = buildProjectBlockRanges(blockNumbers, timings);
    const totalDuration =
      Number(timings.total_duration) ||
      blockRanges.reduce(
        (max, range) => Math.max(max, range.start + range.duration),
        0
      ) ||
      120;
    const nicheMood = getEpidemicMoodForNiche(config.niche, config, storyboard);
    const sceneMaps = buildSceneTimingMaps(
      null,
      storyboard,
      timings.starts || [],
      timings.durations || []
    );

    const prompt = buildBgmEmotionPlanPrompt({
      narrativeScript: storyboard.narrative_script || "",
      visualPrompts: storyboard.visual_prompts || [],
      blockRanges,
      totalDuration,
      niche: config.niche || "Geral",
      sceneTiming: sceneMaps,
    });

    const responseText = await callGeminiLlm(req, res, projDir, {
      title: "Plano BGM por emoção",
      prompt,
    });
    if (responseText == null) return;

    const parsed = await parseAiJsonResponse(
      responseText,
      extractBrowserResponse(req.body) ? null : getApiKey(projDir),
      "Plano BGM por emoção"
    );
    const aiSegments = parseAiEmotionPlanResponse(parsed);
    const plan = buildBgmEmotionPlan({
      aiSegments,
      config,
      storyboard,
      blockRanges,
      wordTranscripts,
      totalDuration,
      nicheMood,
    });

    storyboard.bgm_emotion_plan = plan;
    config.bgm_mode = "emotion";
    config.use_single_bgm = false;
    config.single_bgm = "";
    if (!Array.isArray(config.bgm_emotion_mappings))
      config.bgm_emotion_mappings = [];

    fs.writeFileSync(
      path.join(projDir, "storyboard.json"),
      JSON.stringify(storyboard, null, 2),
      "utf8"
    );
    fs.writeFileSync(
      path.join(projDir, "config_qanat.json"),
      JSON.stringify(config, null, 2),
      "utf8"
    );

    let downloadLogs = [];
    let downloadedMappings = [];
    if (autoDownload && plan.segments?.length) {
      const token = getEpidemicSoundKey(projDir) || "";
      downloadLogs = await runAutoSoundtrackLogic(projDir, token, "emotion", {
        force: true,
      });
      const updatedConfig = readProjectJson(projDir, "config_qanat.json", {});
      downloadedMappings = Array.isArray(updatedConfig.bgm_emotion_mappings)
        ? updatedConfig.bgm_emotion_mappings
        : [];
    }

    console.log("[BGM Emotion] fluxo concluído", {
      project: path.basename(projDir),
      segments: plan.segments?.length || 0,
      downloaded: downloadedMappings.length,
    });

    res.json({
      success: true,
      plan,
      logs: formatEmotionPlanLog(plan),
      auto_download: autoDownload,
      download_logs: downloadLogs,
      downloaded_count: downloadedMappings.length,
      mappings: downloadedMappings,
    });
  } catch (err) {
    console.error("[Plan BGM Emotions]", err);
    res
      .status(500)
      .json({ error: err.message || "Falha ao planejar trilhas por emoção." });
  }
});

app.get("/api/narration/chunks", (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    const config = readProjectJson(projDir, "config_qanat.json", {});
    res.json({
      mode: config.narration_mode || NARRATION_MODE_MASTER,
      plan: storyboard.narration_chunk_plan || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/narration/chunks", (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const { plan, mode } = req.body || {};
    if (!plan || !Array.isArray(plan.chunks)) {
      return res
        .status(400)
        .json({ error: "Plano inválido — chunks[] obrigatório." });
    }
    const config = readProjectJson(projDir, "config_qanat.json", {});
    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    const normalized = normalizeNarrationChunkPlan(
      {
        ...plan,
        chunks: plan.chunks,
        default_voice: plan.default_voice,
        planned_at: plan.planned_at || new Date().toISOString(),
        source: plan.source || "manual",
      },
      { storyboard, config }
    );
    const nextMode =
      mode === NARRATION_MODE_MASTER
        ? NARRATION_MODE_MASTER
        : NARRATION_MODE_CHUNKED;
    const promoted =
      nextMode === NARRATION_MODE_CHUNKED
        ? promoteNarrationChunkPlanAsApprovedSource(storyboard, normalized)
        : { storyboard, plan: normalized, changed: false };
    const saved =
      nextMode === NARRATION_MODE_CHUNKED
        ? applyChunkedNarrationSyncToProject(projDir, {
            chunkPlan: promoted.plan,
            config: {
              ...config,
              narration_mode: NARRATION_MODE_CHUNKED,
            },
            storyboard: promoted.storyboard,
          })
        : persistChunkPlanToProject(projDir, normalized, {
            ...config,
            narration_mode: NARRATION_MODE_MASTER,
          });
    if (promoted.changed) {
      appendNarrationAuditEvent(projDir, {
        type: "user_text_edit",
        status: "approved",
        source: "narration-chunks-editor",
        narrative_sha256:
          promoted.storyboard.narration_integrity?.approved_text_sha256,
        note: "A edição manual dos trechos foi promovida à narração oficial e às legendas.",
      });
    }
    res.json({
      success: true,
      plan: saved.storyboard?.narration_chunk_plan || promoted.plan,
      config: saved.config,
      captions_synced: nextMode === NARRATION_MODE_CHUNKED,
      narration_source_updated: promoted.changed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai/plan-narration-chunks", async (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    const config = readProjectJson(projDir, "config_qanat.json", {});
    const { useHeuristic, defaultVoice } = req.body || {};
    const configuredVoice = config.narration_default_voice || {};
    const defaultEngine = normalizeTtsEngine(
      defaultVoice?.engine || configuredVoice.engine || "kokoro",
      "kokoro"
    );
    const effectiveDefaultVoice = {
      ...configuredVoice,
      ...(defaultVoice && typeof defaultVoice === "object" ? defaultVoice : {}),
      engine: defaultEngine,
      voice: resolveTtsVoice({
        workspaceDir: WORKSPACE_DIR,
        projectDir: projDir,
        engine: defaultEngine,
        requestedVoice: defaultVoice?.voice,
        fallback: configuredVoice.voice,
      }),
    };

    const hasReverseDialogue = (storyboard.visual_prompts || []).some(
      (scene) =>
        scene?.provenance === "video-reverse-engineering" &&
        Array.isArray(scene?.speech_segments) &&
        scene.speech_segments.length > 1
    );

    if (useHeuristic || hasReverseDialogue) {
      const plan = buildHeuristicNarrationChunks({
        storyboard,
        config,
        defaultVoice: effectiveDefaultVoice,
      });
      persistChunkPlanToProject(projDir, plan, {
        ...config,
        narration_mode: NARRATION_MODE_CHUNKED,
      });
      return res.json({
        success: true,
        plan,
        logs: formatNarrationChunkPlanLog(plan),
        source: hasReverseDialogue ? "reverse-dialogue" : "heuristic",
      });
    }

    const blockPhrases = Array.isArray(config.block_phrases)
      ? config.block_phrases
      : storyboard.technical_config?.block_phrases || [];

    const prompt = buildNarrationChunkPlanPrompt({
      narrativeScript: storyboard.narrative_script || "",
      narrativeScriptTagged: storyboard.narrative_script_tagged || "",
      visualPrompts: storyboard.visual_prompts || [],
      blockPhrases,
      niche: config.niche || "Geral",
    });

    const responseText = await callGeminiLlm(req, res, projDir, {
      title: "Plano de narração por trechos",
      prompt,
    });
    if (responseText == null) return;

    const parsed = await parseAiJsonResponse(
      responseText,
      extractBrowserResponse(req.body) ? null : getApiKey(projDir),
      "Plano de narração por trechos"
    );
    const aiChunks = parseAiNarrationChunkResponse(parsed);
    const plan = buildNarrationChunkPlan({
      aiChunks,
      storyboard,
      config,
      defaultVoice: effectiveDefaultVoice,
    });
    persistChunkPlanToProject(projDir, plan, {
      ...config,
      narration_mode: NARRATION_MODE_CHUNKED,
    });

    res.json({
      success: true,
      plan,
      logs: formatNarrationChunkPlanLog(plan),
      source: "ai",
    });
  } catch (err) {
    console.error("[Plan Narration Chunks]", err);
    res.status(500).json({
      error: err.message || "Falha ao planejar narração por trechos.",
    });
  }
});

// API: List available assets inside ASSETS/ folder

app.get("/api/assets/list", (req, res) => {
  const rawProject = Array.isArray(req.query?.project)
    ? req.query.project[0]
    : req.query?.project;
  const projectName = String(rawProject || "").trim();
  if (!projectName) {
    return res.json([]);
  }

  const projDir = resolveProjectDirFromName(projectName);
  if (!projDir || projDir === WORKSPACE_DIR) {
    return res.json([]);
  }

  const assetsDir = path.join(projDir, "ASSETS");

  if (!fs.existsSync(assetsDir)) {
    return res.json([]);
  }

  try {
    const scanDir = (dir) => {
      let results = [];

      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);

        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          results = results.concat(scanDir(fullPath));
        } else {
          const relPath = path
            .relative(assetsDir, fullPath)
            .replace(/\\/g, "/");

          // Categorize media types

          let type = "other";

          if (
            relPath.endsWith(".mp4") ||
            relPath.endsWith(".mov") ||
            relPath.endsWith(".webm")
          ) {
            type = "video";
          } else if (
            relPath.endsWith(".png") ||
            relPath.endsWith(".jpeg") ||
            relPath.endsWith(".jpg")
          ) {
            type = "image";
          } else if (relPath.endsWith(".svg")) {
            type = "svg";
          }

          results.push({
            name: relPath,

            sizeBytes: stats.size,

            type: type,
          });
        }
      }

      return results;
    };

    res.json(scanDir(assetsDir));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function normalizeProjectAssetRef(value = "") {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^ASSETS\//i, "");
}

function resolveAssetInsideProject(projectDir, assetRef = "") {
  const rel = normalizeProjectAssetRef(assetRef);
  if (!rel) return null;
  const assetsDir = path.join(projectDir, "ASSETS");
  const direct = path.resolve(assetsDir, rel);
  const assetsRoot = path.resolve(assetsDir);
  if (direct.startsWith(assetsRoot + path.sep) && fs.existsSync(direct)) {
    return direct;
  }
  const byName = findProjectFileLocal(projectDir, rel);
  if (!byName) return null;
  const resolved = path.resolve(byName);
  return resolved.startsWith(path.resolve(projectDir) + path.sep)
    ? resolved
    : null;
}

function collectTimelineAssetRefs(config = {}, storyboard = {}) {
  const refs = [];
  const push = (asset, source) => {
    const ref = normalizeProjectAssetRef(asset);
    if (!ref) return;
    if (/^https?:\/\//i.test(ref) || ref.startsWith("/api/")) return;
    refs.push({ asset: ref, ...source });
  };

  const timelineAssets = config.timeline_assets || {};
  for (const [block, assets] of Object.entries(timelineAssets)) {
    if (!Array.isArray(assets)) continue;
    assets.forEach((item, index) => {
      if (item && typeof item === "object") {
        push(item.asset, { block, index, source: "config.timeline_assets" });
      }
    });
  }

  const prompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  prompts.forEach((prompt, index) => {
    if (!prompt || typeof prompt !== "object") return;
    const block =
      prompt.block ?? prompt.block_number ?? prompt.scene ?? String(index + 1);
    const assetObj = prompt.asset;
    if (typeof assetObj === "string") {
      push(assetObj, { block: String(block), index, source: "storyboard" });
    } else if (assetObj && typeof assetObj === "object") {
      push(assetObj.asset, {
        block: String(block),
        index,
        source: "storyboard.asset",
      });
    }
  });

  const seen = new Set();
  return refs.filter((ref) => {
    const key = `${ref.asset}|${ref.block || ""}|${ref.index ?? ""}|${ref.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

app.get("/api/assets/validate", (req, res) => {
  const rawProject = Array.isArray(req.query?.project)
    ? req.query.project[0]
    : req.query?.project;
  const projectName = String(rawProject || "").trim();
  if (!projectName) {
    return res.status(400).json({ error: "Projeto ativo nao informado." });
  }

  const projDir = resolveProjectDirFromName(projectName);
  if (!projDir || projDir === WORKSPACE_DIR) {
    return res
      .status(404)
      .json({ error: `Projeto nao encontrado: ${projectName}` });
  }

  try {
    const config = readProjectJson(projDir, "config_qanat.json", {});
    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    const refs = collectTimelineAssetRefs(config, storyboard);
    const projectAssets = new Set(listProjectMediaAssets(projDir));
    const issues = [];
    let found = 0;

    for (const ref of refs) {
      const resolved = resolveAssetInsideProject(projDir, ref.asset);
      if (resolved) {
        found++;
        continue;
      }

      const base = path.basename(ref.asset);
      const similar = [...projectAssets].filter(
        (item) => path.basename(item).toLowerCase() === base.toLowerCase()
      );
      issues.push({
        block: ref.block,
        index: ref.index,
        source: ref.source,
        asset: ref.asset,
        reason: "Arquivo nao encontrado dentro do projeto ativo",
        detail: similar.length
          ? `Nome semelhante no projeto: ${similar.slice(0, 3).join(", ")}`
          : "Sem correspondencia em ASSETS/ deste projeto.",
        expectedUrl: `/api/projects-media/${encodeURIComponent(projectName)}/ASSETS/${normalizeProjectAssetRef(
          ref.asset
        )
          .split("/")
          .map((part) => encodeURIComponent(part))
          .join("/")}`,
      });
    }

    res.json({
      ok: issues.length === 0,
      project: path.basename(projDir),
      checked: refs.length,
      found,
      missing: issues.length,
      issues,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Falha ao validar assets." });
  }
});

// API: Binary stream upload for narration audio file

app.post("/api/upload-narration", (req, res) => {
  const projDir = getProjectDir(req);
  const narrationFile = path.join(projDir, "narracao_mestra_premium.mp3");
  const tempFile = path.join(
    projDir,
    `.narration-upload-${Date.now()}-${process.pid}.tmp`
  );
  const writeStream = fs.createWriteStream(tempFile, { flags: "wx" });
  let received = 0;
  let rejected = false;
  req.on("data", (chunk) => {
    received += chunk.length;
    if (received > MAX_NARRATION_UPLOAD_BYTES && !rejected) {
      rejected = true;
      req.unpipe(writeStream);
      writeStream.destroy();
      removeTemporaryNarration(tempFile);
      res.status(413).json({ error: "Narração excede o limite de 250 MB." });
      req.destroy();
    }
  });
  req.pipe(writeStream);
  writeStream.on("finish", async () => {
    if (rejected) return;
    try {
      const validated = await installNarrationAtomically(
        tempFile,
        narrationFile,
        { probeDuration: probeAudioDuration }
      );
      appendNarrationAuditEvent(projDir, {
        type: "master_upload",
        status: "generated",
        engine: "upload",
        audio_file: "narracao_mestra_premium.mp3",
        duration_s: validated.duration,
        bytes: validated.bytes,
      });
      const staleFiles = ["word_transcripts.json", "block_timings.json"];

      for (const fname of staleFiles) {
        const stalePath = path.join(projDir, fname);

        if (fs.existsSync(stalePath)) {
          try {
            fs.unlinkSync(stalePath);
          } catch (_) {}
        }
      }

      res.json({
        success: true,
        needs_resync: true,
        duration_seconds: validated.duration,
        bytes: validated.bytes,
        message:
          "Narração enviada! Rode a sincronização Whisper para atualizar timings e legendas.",
      });
    } catch (err) {
      removeTemporaryNarration(tempFile);
      res
        .status(400)
        .json({ error: err.message || "MP3 de narração inválido." });
    }
  });

  writeStream.on("error", (err) => {
    removeTemporaryNarration(tempFile);
    if (res.headersSent) return;
    res.status(500).json({
      error: "Erro ao escrever arquivo de narração",
      details: err.message,
    });
  });
});

app.get("/api/narration/audit", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const audit = readNarrationAudit(projDir);
    const storyboard = readProjectJson(projDir, "storyboard.json", {});
    const transcripts = readProjectJson(projDir, "word_transcripts.json", []);
    const comparison = compareNarrationChunksWithWhisper(
      storyboard.narration_chunk_plan || {},
      flattenWordTranscripts(transcripts)
    );
    res.json({
      ...audit,
      comparison,
      reviews: latestNarrationReviews(audit.events),
      approval: narrationChunkApprovalState(
        storyboard.narration_chunk_plan || {},
        audit.events
      ),
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: err.message || "Falha ao carregar auditoria." });
  }
});

app.post("/api/narration/audit/review", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const chunkId = String(req.body?.chunk_id || "").trim();
    const decision = String(req.body?.decision || "").trim();
    const note = String(req.body?.note || "").trim();
    if (!chunkId) return res.status(400).json({ error: "Trecho obrigatório." });
    if (!["approved", "rejected", "needs_fix"].includes(decision)) {
      return res.status(400).json({ error: "Decisão de revisão inválida." });
    }
    if (decision !== "approved" && !note) {
      return res
        .status(400)
        .json({ error: "Informe o motivo da rejeição ou correção." });
    }
    const event = appendNarrationAuditEvent(projDir, {
      type: "review",
      chunk_id: chunkId,
      decision,
      status: decision,
      note: note || null,
    });
    res.json({ success: true, review: event });
  } catch (err) {
    res.status(500).json({ error: err.message || "Falha ao salvar revisão." });
  }
});

app.post("/api/narration/audit/review-all", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const chunkIds = Array.isArray(req.body?.chunk_ids)
      ? [
          ...new Set(req.body.chunk_ids.map((id) => String(id || "").trim())),
        ].filter(Boolean)
      : [];
    const decision = String(req.body?.decision || "approved").trim();
    if (!chunkIds.length) {
      return res.status(400).json({ error: "Nenhum trecho selecionado." });
    }
    if (decision !== "approved") {
      return res.status(400).json({
        error: "A revisão em massa permite apenas aprovação.",
      });
    }
    const reviews = chunkIds.map((chunkId) =>
      appendNarrationAuditEvent(projDir, {
        type: "review",
        chunk_id: chunkId,
        decision: "approved",
        status: "approved",
        note: "Aprovação em massa pela auditoria da narração.",
      })
    );
    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({
      error: err.message || "Falha ao aprovar todos os trechos.",
    });
  }
});

// API: Binary stream upload for background music

app.post("/api/upload-bgm", (req, res) => {
  const projDir = getProjectDir(req);

  const { block, filename } = req.query;

  if (!filename) {
    return res
      .status(400)
      .json({ error: "O parâmetro filename é obrigatório." });
  }

  const safeFilename = path.basename(filename);

  const destFilePath = path.join(projDir, safeFilename);

  const writeStream = fs.createWriteStream(destFilePath);

  req.pipe(writeStream);

  writeStream.on("finish", () => {
    try {
      if (block) {
        const configPath = path.join(projDir, "config_qanat.json");

        let config = {};

        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        }

        if (!config.bgm_mappings) {
          config.bgm_mappings = [];
        }

        const blockNum = parseInt(block, 10);

        const existingIdx = config.bgm_mappings.findIndex(
          (m) => m.block === blockNum
        );

        if (existingIdx !== -1) {
          config.bgm_mappings[existingIdx].file = safeFilename;
        } else {
          config.bgm_mappings.push({ block: blockNum, file: safeFilename });
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      }

      res.json({
        success: true,

        message: `Música ${safeFilename} enviada com sucesso!`,

        file: safeFilename,
      });
    } catch (err) {
      res.status(500).json({
        error: "Erro ao atualizar configuração de trilhas",
        details: err.message,
      });
    }
  });

  writeStream.on("error", (err) => {
    res.status(500).json({
      error: "Erro ao escrever arquivo de música",
      details: err.message,
    });
  });
});

// API: Binary stream upload for specific scene asset (saved in ASSETS/cena_scene.ext and updated in config)

app.post("/api/upload-scene-asset", (req, res) => {
  const projDir = getProjectDir(req);

  const { scene, type, filename, idx } = req.query;

  if (!scene || !type || !filename) {
    return res
      .status(400)
      .json({ error: "Parâmetros scene, type e filename são obrigatórios." });
  }

  const ext =
    path.extname(filename).toLowerCase() ||
    (type === "video" ? ".mp4" : ".png");
  const videoExts = new Set([".mp4", ".webm", ".mov", ".m4v", ".mkv"]);
  const resolvedType =
    videoExts.has(ext) || type === "video" ? "video" : "image";

  const assetsDir = path.join(projDir, "ASSETS");

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, "_");

  const timestamp = Date.now();
  const parsed = path.parse(safeFilename);
  const safeBase = parsed.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const destFileName =
    idx !== undefined
      ? `${safeBase}_${timestamp}${parsed.ext.toLowerCase()}`
      : `cena_${scene}_${timestamp}${ext}`;

  const destFilePath = path.join(assetsDir, destFileName);

  const writeStream = fs.createWriteStream(destFilePath);

  req.pipe(writeStream);

  writeStream.on("finish", () => {
    const configPath = path.join(projDir, "config_qanat.json");

    try {
      if (resolvedType === "video") {
        const tempTranscodeDest = destFilePath + ".transcoded.mp4";
        try {
          console.log(
            `[Upload Scene Asset] Transcodificando vídeo enviado ${destFileName} para garantir compatibilidade HTML5...`
          );
          transcodeVideoForRemotion(destFilePath, tempTranscodeDest, 30);
          if (fs.existsSync(tempTranscodeDest)) {
            fs.unlinkSync(destFilePath);
            fs.renameSync(tempTranscodeDest, destFilePath);
            console.log(
              `[Upload Scene Asset] Vídeo transcodificado com sucesso!`
            );
          }
        } catch (transcodeErr) {
          console.error(
            `[Upload Scene Asset] Falha ao transcodificar vídeo:`,
            transcodeErr.message
          );
          if (fs.existsSync(tempTranscodeDest)) {
            try {
              fs.unlinkSync(tempTranscodeDest);
            } catch {}
          }
        }
      }

      let config = {};

      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }

      if (!config.timeline_assets) {
        config.timeline_assets = {};
      }

      const assetItem = {
        asset: destFileName,

        type: resolvedType,
      };

      if (resolvedType === "video") {
        assetItem.fixed = 8.0;
      }

      if (idx !== undefined) {
        const blockKey = String(Math.floor(parseFloat(scene)));

        if (!config.timeline_assets[blockKey]) {
          config.timeline_assets[blockKey] = [];
        }

        const assetIdx = parseInt(idx, 10);
        const prevSlot = config.timeline_assets[blockKey][assetIdx] || {};

        if (prevSlot.asset) {
          const oldFilePath = path.join(assetsDir, prevSlot.asset);
          if (fs.existsSync(oldFilePath)) {
            try {
              fs.unlinkSync(oldFilePath);
            } catch (err) {
              console.warn(
                "[Upload Scene Asset] Falha ao deletar asset antigo:",
                err.message
              );
            }
          }
        }

        config.timeline_assets[blockKey][assetIdx] = {
          ...prevSlot,
          ...assetItem,
          user_locked: true,
          manual_asset: true,
        };

        // Update timeline_studio.json if it exists to keep B-roll sources in sync
        try {
          const studioPath = path.join(projDir, "timeline_studio.json");
          if (fs.existsSync(studioPath)) {
            const studio = JSON.parse(fs.readFileSync(studioPath, "utf8"));
            if (studio && Array.isArray(studio.clips)) {
              let studioChanged = false;
              const targetBlock = String(Math.floor(parseFloat(scene)));
              const targetIdx = parseInt(idx, 10);

              for (const clip of studio.clips) {
                if (clip.trackId === "video") {
                  const bKey = String(
                    clip.props?.blockKey ?? clip.props?.block ?? ""
                  );
                  const aIdx =
                    clip.props?.assetIndex !== undefined
                      ? parseInt(clip.props.assetIndex, 10)
                      : -1;

                  if (bKey === targetBlock && aIdx === targetIdx) {
                    clip.source = destFileName;
                    clip.label = destFileName;
                    if (!clip.props) clip.props = {};
                    clip.props.type = resolvedType;
                    studioChanged = true;
                  }
                }
              }
              if (studioChanged) {
                fs.writeFileSync(
                  studioPath,
                  JSON.stringify(studio, null, 2),
                  "utf8"
                );
                console.log(
                  `[Upload Scene Asset] timeline_studio.json atualizada com o novo asset: ${destFileName}`
                );
              }
            }
          }
        } catch (studioErr) {
          console.warn(
            "[Upload Scene Asset] Falha ao sincronizar com timeline_studio.json:",
            studioErr.message
          );
        }
      } else {
        // Extract block number (integer part) from scene number (e.g. "6" from "6.3")

        const blockKey = String(Math.floor(parseFloat(scene)));

        if (!config.timeline_assets[blockKey]) {
          config.timeline_assets[blockKey] = [];
        }

        const prefixPattern = `cena_${scene}`;
        try {
          const files = fs.readdirSync(assetsDir);
          for (const file of files) {
            if (file.startsWith(prefixPattern) && file !== destFileName) {
              const oldPath = path.join(assetsDir, file);
              if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
              }
            }
          }
        } catch (err) {
          console.warn(
            "[Upload Scene Asset] Falha ao limpar arquivos antigos de cena:",
            err.message
          );
        }

        config.timeline_assets[blockKey].push({
          ...assetItem,
          user_locked: true,
          manual_asset: true,
        });
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      syncStoryboardAssetsFromTimeline(projDir);

      appendProjectEventLog(projDir, {
        component: "timeline",
        event: "scene_asset_uploaded",
        message: `Mídia vinculada ao bloco ${scene}, slot ${idx ?? "novo"}.`,
        details: {
          block: String(scene),
          slot_index: idx !== undefined ? Number(idx) : null,
          asset: destFileName,
          type: resolvedType,
          timeline: summarizeTimelineAssets(config.timeline_assets, []),
        },
      });

      res.json({
        success: true,

        message: `Arquivo ${destFileName} salvo e vinculado ao Bloco/Cena ${scene} com sucesso!`,

        asset: destFileName,

        timeline_assets: config.timeline_assets,
      });
    } catch (err) {
      res.status(500).json({
        error: "Erro ao salvar na configuração",
        details: err.message,
      });
    }
  });

  writeStream.on("error", (err) => {
    res.status(500).json({
      error: "Erro ao escrever arquivo de mídia",
      details: err.message,
    });
  });
});

// API: Logo endpoints (Status, Upload, Reset)

app.get("/api/logo/status", (req, res) => {
  try {
    const projDir = getProjectDir(req);

    const activeProject = req.query.project;

    const catalog = listBrandLogos(WORKSPACE_DIR, __dirname);
    const projectConfig = readProjectJson(projDir, "config_qanat.json", {});
    const globalConfig = loadRenderConfig(__dirname);

    const localLogoAssets = path.join(projDir, "ASSETS", "logo.png");

    const localLogoRoot = path.join(projDir, "logo.png");

    let hasProjectLogo = false;

    let projectLogoPath = null;

    if (activeProject) {
      if (fs.existsSync(localLogoAssets)) {
        hasProjectLogo = true;

        projectLogoPath = `/api/projects-media/${encodeURIComponent(activeProject)}/ASSETS/logo.png`;
      } else if (fs.existsSync(localLogoRoot)) {
        hasProjectLogo = true;

        projectLogoPath = `/api/projects-media/${encodeURIComponent(activeProject)}/logo.png`;
      }
    }

    const resolvedPath = resolveLogoFilePath(
      WORKSPACE_DIR,
      projDir,
      globalConfig,
      projectConfig
    );
    const activeCatalogLogo = catalog.activeLogo;
    const projectLogoId =
      projectConfig.selected_logo_id || projectConfig.selectedLogoId;
    const usesProjectCatalogLogo = Boolean(projectLogoId);
    const usesLegacyProjectLogo =
      hasProjectLogo && !usesProjectCatalogLogo && !globalConfig.selectedLogoId;
    const currentLogoUrl =
      usesLegacyProjectLogo && projectLogoPath
        ? projectLogoPath
        : (projectLogoId
            ? catalog.logos.find((l) => l.id === projectLogoId)?.url ||
              activeCatalogLogo?.url
            : activeCatalogLogo?.url) || `/api/projects-media/ASSETS/logo.png`;

    res.json({
      hasProjectLogo,

      projectLogoUrl: projectLogoPath,

      globalLogoUrl:
        activeCatalogLogo?.url || `/api/projects-media/ASSETS/logo.png`,

      currentLogoUrl,

      catalog,

      projectSelectedLogoId: projectConfig.selected_logo_id || null,
    });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao obter status do logotipo",
      details: err.message,
    });
  }
});

app.post("/api/logo/upload", (req, res) => {
  try {
    const projDir = getProjectDir(req);

    const isGlobal = req.query.global === "true";

    let targetPath;

    if (isGlobal) {
      const globalAssetsDir = path.join(WORKSPACE_DIR, "ASSETS");

      if (!fs.existsSync(globalAssetsDir)) {
        fs.mkdirSync(globalAssetsDir, { recursive: true });
      }

      targetPath = path.join(globalAssetsDir, "logo.png");
    } else {
      const assetsDir = path.join(projDir, "ASSETS");

      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      targetPath = path.join(assetsDir, "logo.png");
    }

    const writeStream = fs.createWriteStream(targetPath);

    req.pipe(writeStream);

    writeStream.on("finish", () => {
      res.json({ success: true, message: "Logo salvo com sucesso!" });
    });

    writeStream.on("error", (err) => {
      res.status(500).json({
        error: "Erro ao salvar arquivo de logo",
        details: err.message,
      });
    });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao inicializar upload do logotipo",
      details: err.message,
    });
  }
});

app.post("/api/brand/channels/reset-project", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const configPath = path.join(projDir, "config_qanat.json");
    const projectConfig = readProjectJson(projDir, "config_qanat.json", {});
    let cleared = false;

    for (const key of [
      "selected_youtube_channel_id",
      "selectedYoutubeChannelId",
      "youtube_channel",
      "youtubeChannel",
    ]) {
      if (projectConfig[key]) {
        delete projectConfig[key];
        cleared = true;
      }
    }

    if (cleared) {
      fs.writeFileSync(
        configPath,
        JSON.stringify(projectConfig, null, 2),
        "utf8"
      );
    }

    clearYoutubeAvatarCaches(WORKSPACE_DIR, projDir);

    res.json({
      success: true,
      message: cleared
        ? "Canal do projeto removido. Usando canal global."
        : "Nenhum canal personalizado do projeto encontrado.",
    });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao redefinir canal do projeto",
      details: err.message,
    });
  }
});

app.post("/api/logo/reset", (req, res) => {
  try {
    const projDir = getProjectDir(req);

    const activeProject = req.query.project;

    if (!activeProject) {
      return res.status(400).json({ error: "Projeto ativo não especificado." });
    }

    const localLogoAssets = path.join(projDir, "ASSETS", "logo.png");

    const localLogoRoot = path.join(projDir, "logo.png");

    let deleted = false;

    if (fs.existsSync(localLogoAssets)) {
      fs.unlinkSync(localLogoAssets);

      deleted = true;
    }

    if (fs.existsSync(localLogoRoot)) {
      fs.unlinkSync(localLogoRoot);

      deleted = true;
    }

    const configPath = path.join(projDir, "config_qanat.json");
    const projectConfig = readProjectJson(projDir, "config_qanat.json", {});
    if (projectConfig.selected_logo_id) {
      delete projectConfig.selected_logo_id;
      fs.writeFileSync(
        configPath,
        JSON.stringify(projectConfig, null, 2),
        "utf8"
      );
      deleted = true;
    }

    res.json({
      success: true,

      message: deleted
        ? "Logo do projeto removido. Usando logo global."
        : "Nenhum logo de projeto personalizado encontrado.",
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao redefinir logotipo", details: err.message });
  }
});

// API: Brand catalog — multiple logos and YouTube channels

app.get("/api/brand/catalog", (req, res) => {
  try {
    const globalConfig = ensureBrandCatalogMigrated(WORKSPACE_DIR, __dirname);
    const projDir = getProjectDir(req);
    const projectConfig = readProjectJson(projDir, "config_qanat.json", {});
    res.json({
      logos: listBrandLogos(WORKSPACE_DIR, __dirname),
      channels: listYoutubeChannelsFromConfig(globalConfig),
      projectSelectedLogoId: projectConfig.selected_logo_id || null,
      projectSelectedChannelId:
        projectConfig.selected_youtube_channel_id || null,
    });
  } catch (err) {
    res.status(500).json({
      error: "Erro ao carregar catálogo de marca",
      details: err.message,
    });
  }
});

app.post("/api/brand/logos/upload", (req, res) => {
  try {
    const name = String(
      req.query.name || req.headers["x-logo-name"] || "Novo Logo"
    ).trim();
    const logosDir = getLogosDir(WORKSPACE_DIR);
    fs.mkdirSync(logosDir, { recursive: true });
    const tempPath = path.join(logosDir, `_upload_${Date.now()}.png`);
    const writeStream = fs.createWriteStream(tempPath);
    req.pipe(writeStream);
    writeStream.on("finish", () => {
      try {
        const result = addBrandLogo(WORKSPACE_DIR, __dirname, {
          name,
          sourcePath: tempPath,
        });
        res.json({
          success: true,
          ...result,
          catalog: listBrandLogos(WORKSPACE_DIR, __dirname),
        });
      } catch (err) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.status(500).json({ error: err.message });
      }
    });
    writeStream.on("error", (err) => {
      res
        .status(500)
        .json({ error: "Erro ao salvar logo", details: err.message });
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro no upload de logo", details: err.message });
  }
});

app.put("/api/brand/logos/:id", (req, res) => {
  try {
    const entry = updateBrandLogo(__dirname, req.params.id, req.body || {});
    res.json({
      success: true,
      entry,
      catalog: listBrandLogos(WORKSPACE_DIR, __dirname),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/brand/logos/select", (req, res) => {
  try {
    const { id, scope = "global" } = req.body || {};
    if (!id) return res.status(400).json({ error: "id do logo é obrigatório" });

    if (scope === "project") {
      const projDir = getProjectDir(req);
      const configPath = path.join(projDir, "config_qanat.json");
      const config = readProjectJson(projDir, "config_qanat.json", {});
      config.selected_logo_id = id;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      return res.json({ success: true, scope: "project", selectedLogoId: id });
    }

    const result = selectBrandLogo(__dirname, id);
    res.json({
      success: true,
      scope: "global",
      ...result,
      catalog: listBrandLogos(WORKSPACE_DIR, __dirname),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/brand/logos/:id", (req, res) => {
  try {
    const result = deleteBrandLogo(WORKSPACE_DIR, __dirname, req.params.id);
    res.json({
      success: true,
      ...result,
      catalog: listBrandLogos(WORKSPACE_DIR, __dirname),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/brand/channels", (req, res) => {
  try {
    const { label, channelUrl, channelName, subscriberCount } = req.body || {};
    const result = addYoutubeChannel(__dirname, {
      label,
      channelUrl,
      channelName,
      subscriberCount,
    });
    const globalConfig = loadRenderConfig(__dirname);
    res.json({
      success: true,
      ...result,
      channels: listYoutubeChannelsFromConfig(globalConfig),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/brand/channels/:id", (req, res) => {
  try {
    const entry = updateYoutubeChannel(
      __dirname,
      req.params.id,
      req.body || {}
    );
    const globalConfig = loadRenderConfig(__dirname);
    res.json({
      success: true,
      entry,
      channels: listYoutubeChannelsFromConfig(globalConfig),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/brand/channels/select", (req, res) => {
  try {
    const { id, scope = "global" } = req.body || {};
    if (!id)
      return res.status(400).json({ error: "id do canal é obrigatório" });

    if (scope === "project") {
      const projDir = getProjectDir(req);
      const configPath = path.join(projDir, "config_qanat.json");
      const config = readProjectJson(projDir, "config_qanat.json", {});
      config.selected_youtube_channel_id = id;
      delete config.youtube_channel;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      return res.json({
        success: true,
        scope: "project",
        selectedYoutubeChannelId: id,
      });
    }

    const result = selectYoutubeChannel(__dirname, id);
    clearYoutubeAvatarCaches(WORKSPACE_DIR);
    const globalConfig = loadRenderConfig(__dirname);
    res.json({
      success: true,
      scope: "global",
      ...result,
      channels: listYoutubeChannelsFromConfig(globalConfig),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/brand/channels/:id", (req, res) => {
  try {
    const result = deleteYoutubeChannel(__dirname, req.params.id);
    const globalConfig = loadRenderConfig(__dirname);
    res.json({
      success: true,
      ...result,
      channels: listYoutubeChannelsFromConfig(globalConfig),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post(
  "/api/ai/generate-creator-script",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);

    const {
      prompt,
      useNotebooklm,
      notebooklmDeep,
      blocksCount = 10,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt/Tema não fornecido" });
    }

    let notebooklmContext = "";
    if (useNotebooklm === true) {
      try {
        const research = await fetchNotebooklmScriptContext({
          backendDir: __dirname,
          niche: prompt,
          format: "LONGO",
          idea: { title: prompt, promise: prompt, emotion: "Curiosidade" },
          projDir,
          researchMode: notebooklmDeep === true ? "deep" : "fast",
        });
        notebooklmContext = formatNotebooklmPromptBlock(
          research,
          "PESQUISA NOTEBOOKLM"
        );
      } catch (e) {
        notebooklmContext = "";
      }
    }

    const promptSystem = `Você é o "AI Video Creator Engine" (Gerador de Roteiros Virais para YouTube + Hyperframe), um roteirista profissional, estrategista de retenção e editor de vídeos para YouTube.

O usuário deseja criar um documentário cinematográfico de  blocos sobre o tema: "${prompt}".
${notebooklmContext}

Sua missão é criar ideias, roteiros e instruções de edição com alto potencial de clique, retenção, comentários, compartilhamentos, inscritos e satisfação real do público.

${SCRIPT_CREATIVE_REINFORCEMENT}

Regras Gerais:

- Esqueça qualquer tema ou vídeo anterior para não ficar repetitivo.

- A narração deve soar como pessoa real contando história — frases curtas, exemplos concretos, zero clichê de IA.

- O espectador precisa entender a mensagem central sem esforço; cada bloco avança essa compreensão.

- O roteiro completo deve durar entre 2 e 5 minutos (cerca de 300 a 600 palavras) e ser dividido em  blocos lógicos.

${buildFormatScriptRules("LONGO")}

- Crie um gancho inicial que prenda a atenção nos primeiros 3 segundos do bloco 1.

- Utilize técnicas de retenção (open loops, curiosidade progressiva, microcliffhangers, payoff final).

- Defina no máximo  prompts visuais de cena (cada cena/vídeo gerado por IA deve ter no máximo 10 segundos). A geração de imagens e destaques estáticos (img ou svg) é ilimitada. Nunca coloque texto dentro dos prompts de imagem ou vídeo (o texto deve entrar separado na edição).

Você deve responder com um objeto JSON válido contendo exatamente as seguintes propriedades:

1. "script": O roteiro de narração completo recomendado para o vídeo (em português brasileiro). Esta narração será dividida em  blocos lógicos.

2. "block_phrases": Um array de  objetos, um para cada bloco. Cada objeto tem as chaves:

   - "block": (int de 1 a )

   - "phrase": A frase inicial do bloco que serve para sincronizar o áudio com o Whisper. Ela deve ter cerca de 4 a 8 palavras e ser o início exato da narração daquele bloco.

3. "impact_texts": Um array contendo sugestões de overlays de frases de impacto. Cada objeto deve ter:

   - "block": (int de 1 a )

   - "start_offset": Tempo em segundos a partir do início do bloco para exibir a frase (ex: 0.00, 2.50)

   - "end_offset": Tempo em segundos a partir do início do bloco para ocultar a frase (ex: 4.50, 7.00)

   - "text": O texto curto de impacto em letras maiúsculas (ex: "A GRANDE CONSTRUÇÃO", "SEM ELETRICIDADE")

   Insira cerca de 2 a 3 frases de impacto por bloco.

4. "highlight_keywords": Um array de strings com as palavras-chave que serão destacadas em Gold nas legendas do vídeo (em letras minúsculas).

5. "bgm_mappings": Um array de  objetos mapeando cada bloco para um arquivo de trilha sonora recomendado. Utilize apenas os seguintes arquivos disponíveis no projeto:

   - "Middle Eastern Ambient Drone.mp3"

   - "Ancient Desert Cinematic .mp3"

   - "Historical Tension Strings.mp3"

   - "Arabian Caravan Cinematic.mp3"

   - "Cinematic Duduk Sadness.mp3"

   - "Persian Mystical Oasis.mp3"

Retorne APENAS o JSON puro. Não insira blocos de código com markdown \`\`\`json ou explicações antes ou depois. Responda apenas com o JSON estruturado.`;

    try {
      const responseText = await callGeminiLlm(req, res, projDir, {
        title: "Roteiro Creator (12 blocos)",
        prompt: promptSystem,
      });
      if (responseText == null) return;

      const parsedData = await parseAiJsonResponse(
        responseText,
        extractBrowserResponse(req.body) ? null : getApiKey(projDir),
        "Roteiro/configuracao"
      );

      // Save script to transcripts_readable.txt

      const transcriptPath = path.join(projDir, "transcripts_readable.txt");

      fs.writeFileSync(transcriptPath, parsedData.script, "utf8");

      // Save configuration

      const configPath = path.join(projDir, "config_qanat.json");

      let currentConfig = {};

      if (fs.existsSync(configPath)) {
        try {
          currentConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
        } catch (e) {}
      }

      const newConfig = {
        gemini_api_key: currentConfig.gemini_api_key,

        highlight_keywords: parsedData.highlight_keywords,

        bgm_mappings: parsedData.bgm_mappings,

        impact_texts: parsedData.impact_texts,

        block_phrases: parsedData.block_phrases,
      };

      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf8");

      res.json({ success: true, script: parsedData.script, config: newConfig });
    } catch (err) {
      res.status(500).json({
        error: "Erro ao gerar roteiro/configuração",
        details: err.message,
      });
    }
  })
);

function getExistingProjectsMetadata() {
  const projects = [];

  try {
    const scanDir = (dir, format) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);

        try {
          if (
            fs.statSync(fullPath).isDirectory() &&
            ![
              "ASSETS",
              "OUTPUT",
              "node_modules",
              "temp_clips",
              "temp_clips_destacado",
              ".git",
            ].includes(item)
          ) {
            if (
              fs.existsSync(path.join(fullPath, "build_video.py")) ||
              item === "FINANCAS"
            ) {
              let title = item;

              const storyboardPath = path.join(fullPath, "storyboard.json");

              if (fs.existsSync(storyboardPath)) {
                try {
                  const sb = JSON.parse(
                    fs.readFileSync(storyboardPath, "utf8")
                  );

                  if (sb.strategy?.title_main) title = sb.strategy.title_main;
                } catch (e) {}
              }

              projects.push({ name: item, title, format });
            }
          }
        } catch (err) {}
      }
    };

    scanDir(LONGS_DIR, "LONGO");

    scanDir(SHORTS_DIR, "SHORTS");
  } catch (e) {
    console.error("Error reading existing projects metadata:", e);
  }

  return projects;
}

// API: SCRIPT MASTER Step 1 - Generate Research & 10 Ideas

app.post(
  "/api/ai/creator/historical-witness-ideas",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const {
      niche = "Historia",
      format = "SHORTS",
      character = "reporter de campo",
    } = req.body || {};
    const isShort = String(format).toUpperCase() !== "LONGO";
    let opportunityResearch = "";
    if (
      !extractBrowserResponse(req.body) &&
      !shouldOfferGeminiBrowser(projDir)
    ) {
      try {
        const research = await fetchWebResearchForTopic({
          topic: String(niche).trim(),
          niche: String(niche).trim(),
          format,
          apiKey: getApiKey(projDir),
          getApiKeys: () => getApiKeys(projDir),
          workspaceDir: WORKSPACE_DIR,
        });
        opportunityResearch = formatWebResearchPromptBlock(
          research,
          "BASE FACTUAL E SINAIS DE OPORTUNIDADE"
        );
      } catch {
        opportunityResearch = "";
      }
    }
    const prompt = `Voce e um pesquisador historico e estrategista de videos do LUMIERA HISTORIA VIVA.

Gere exatamente 10 ideias DIFERENTES para ${isShort ? "Shorts 9:16" : "videos longos 16:9"} no nicho "${String(niche).trim()}".
O narrador-personagem sera: ${String(character).trim()}.

OBJETIVO EDITORIAL
- Fazer o publico descobrir uma verdade historica verificavel que contradiga, complete ou aprofunde a versao popular.
- Escolher acontecimentos com causa, acao, mecanismo, resultado e importancia claramente conectados.
- Dar ao personagem um ponto de vista plausivel DENTRO da epoca: ele fala como se aquilo estivesse acontecendo hoje, sem conhecer o futuro.
- O personagem testemunha, investiga ou explica; nunca executa acoes impossiveis para sua identidade.
- Cada ideia deve pertencer a uma unica entidade, local e periodo. Nunca fundir fatos de casos distintos.
- Priorizar recortes visuais, concretos e surpreendentes, sem sensacionalismo ou misterios inventados.

${opportunityResearch}

${buildIdeaOpportunityAddendum(format)}

Retorne SOMENTE JSON valido:
{
  "ideas": [
    {
      "title": "titulo concreto e clicavel em PT-BR",
      "event": "acontecimento ou processo historico especifico",
      "period": "data ou periodo correto",
      "location": "local correto",
      "hiddenTruth": "verdade que o espectador descobrira",
      "popularBelief": "versao popular que sera corrigida ou aprofundada",
      "characterView": "o que este personagem presencia e por que pode contar isso",
      "hook": "gancho falado como se o acontecimento fosse o presente",
      "certainty": "alto|medio|disputado",
      "whyItMatters": "consequencia que responde ao gancho",
      "reality_status": "documented | current | plausible | disputed",
      "evidence_anchor": "fonte, caso, objeto ou evento verificavel",
      "saturation_level": "low | medium | high | unknown",
      "saturation_evidence": "sinal observado ou nao confirmado",
      "undercovered_reason": "por que o recorte e pouco tratado",
      "format_fit": "SHORTS | LONGO",
      "recommended_duration": "duracao adequada",
      "premium_upgrade": "como elevar o video",
      "validation_needed": "o que validar antes do roteiro"
    }
  ]
}`;

    const responseText = await callGeminiLlm(req, res, projDir, {
      title: "Gerar 10 ideias de Historia Viva",
      prompt,
      temperature: 0.55,
    });
    if (responseText == null) return;
    const parsed = await parseAiJsonResponse(
      responseText,
      getApiKey(projDir),
      "Ideias de Historia Viva"
    );
    const ideas = (Array.isArray(parsed?.ideas) ? parsed.ideas : [])
      .map((idea) => normalizeIdeaOpportunity(idea, { format }))
      .filter((idea) => idea?.title && idea?.event)
      .slice(0, 10);
    if (ideas.length < 10) {
      return res.status(502).json({
        error: `A IA retornou apenas ${ideas.length} ideias validas. Gere novamente.`,
      });
    }
    res.json({ ideas });
  })
);

app.post(
  "/api/ai/creator/historical-witness",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const {
      niche = "História",
      topic,
      period = "",
      location = "",
      characterProfile = "reporter",
      customCharacter = "",
      format = "SHORTS",
      editorialTruth = "",
      characterView = "",
      selectedHook = "",
    } = req.body || {};
    if (!String(topic || "").trim()) {
      return res
        .status(400)
        .json({ error: "Informe o acontecimento histórico." });
    }

    const profiles = {
      reporter:
        "repórter de campo curiosa, didática e direta; roupa civil historicamente plausível",
      archaeologist:
        "arqueóloga especialista, observadora e precisa; roupa de campo discreta adaptada ao período",
      chronicler:
        "cronista militar não combatente, sóbrio e atento à estratégia; nunca executa ações de soldado",
      resident:
        "morador ou moradora local que presencia o acontecimento; linguagem humana sem conhecimento impossível do futuro",
      scholar:
        "pesquisador viajante que explica documentos, objetos e mecanismos; postura analítica e acessível",
      custom: String(
        customCharacter || "personagem testemunha definido pelo usuário"
      ).trim(),
    };
    const character = profiles[characterProfile] || profiles.reporter;
    const isShort = String(format).toUpperCase() !== "LONGO";
    const sceneCount = isShort ? 10 : 18;
    const sceneDuration = isShort ? "5 a 7 segundos" : "7 a 10 segundos";

    const prompt = `Você é o motor LUMIERA HISTÓRIA VIVA. Crie um roteiro explicativo em estilo "testemunha dentro da História": uma pessoa recorrente segura a câmera em selfie e explica o acontecimento enquanto a prova visual ocorre ao fundo.

ENTRADAS
Nicho: ${String(niche).trim()}
Acontecimento: ${String(topic).trim()}
Período: ${String(period).trim() || "determinar pela pesquisa"}
Local: ${String(location).trim() || "determinar pela pesquisa"}
Formato: ${isShort ? "SHORTS 9:16" : "LONGO 16:9"}
Perfil escolhido: ${character}
Verdade editorial escolhida: ${String(editorialTruth).trim() || "descobrir pela pesquisa"}
Ponto de vista plausivel do personagem: ${String(characterView).trim() || "definir pela pesquisa"}
Gancho escolhido: ${String(selectedHook).trim() || "criar a partir da verdade editorial"}
Quantidade alvo: ${sceneCount} cenas de ${sceneDuration}

ESTRUTURA NARRATIVA OBRIGATÓRIA
1. Mito/versão popular em uma frase.
2. Correção: "mas o que quase sempre fica de fora...".
3. Contexto espacial e temporal.
4. Escala com números contextualizados.
5. Mecanismo: mostrar COMO a geografia, tecnologia, decisão ou limitação produziu o resultado.
6. Virada/complicação.
7. Consequência imediata.
8. Importância histórica que responde ao gancho.

VALIDAÇÃO
- Preserve a verdade editorial, o ponto de vista e o gancho escolhidos nas entradas; nao troque o caso por outro.
- O personagem fala no presente daquele periodo, como se o acontecimento estivesse ocorrendo hoje, sem antecipar consequencias futuras que ele nao poderia conhecer.
- Cada cena segue CAUSA → AÇÃO → MECANISMO → RESULTADO → IMPORTÂNCIA.
- Nunca fundir locais, datas, dimensões, funções ou fontes de casos diferentes.
- Não inventar falas, objetos, uniformes, arquitetura ou conhecimentos anacrônicos.
- O personagem observa e explica; não realiza ação biologicamente, historicamente ou tecnicamente impossível.
- Se houver incerteza histórica, declarar o nível de certeza no campo factBasis.

ENGENHARIA DE PROMPT VISUAL
- O visualPrompt deve ser em ENGLISH e autossuficiente.
- Repetir integralmente o characterLock em TODA cena; nunca escrever "same character".
- Câmera handheld selfie, braço estendido, lente grande-angular moderada, microtremor natural, personagem falando para a lente e apontando para evidência ao fundo.
- Continuidade estrita de rosto, idade, cabelo, olhos, roupa, acessórios e proporções.
- Fundo ativo, mas legível: uma única ação histórica principal por cena.
- Incluir negativePrompt contra face drift, age change, costume change, body morph, extra fingers, 360-degree head rotation, duplicate people, modern objects, unreadable text e arquitetura errada.
- Não gerar placas com tradução brasileira em local estrangeiro. Texto diegético usa a língua e escrita do local; tradução PT-BR é adicionada depois como legenda.

Retorne SOMENTE JSON válido:
{
  "title": "título em PT-BR",
  "hook": "gancho falado em PT-BR",
  "promise": "tese central em uma frase",
  "nicheMode": "subnicho histórico escolhido",
  "characterLock": "descrição visual completa em inglês, 70-120 palavras",
  "voiceDirection": "direção de atuação e narração",
  "globalNegativePrompt": "restrições globais em inglês",
  "historicalFrame": {"entity":"", "location":"", "period":"", "certainty":"", "centralThesis":""},
  "blocks": [
    {
      "block": 1,
      "narration": "fala em PT-BR",
      "causalRole": "causa|ação|mecanismo|resultado|importância",
      "factBasis": "o que precisa ser comprovado e nível de certeza",
      "visualEvidence": "o que o fundo comprova",
      "visualPrompt": "prompt completo em inglês, incluindo characterLock",
      "negativePrompt": "restrições específicas em inglês",
      "durationSeconds": 6
    }
  ]
}`;

    const responseText = await callGeminiLlm(req, res, projDir, {
      title: "Criar História Viva",
      prompt,
      temperature: 0.45,
    });
    if (responseText == null) return;
    const parsed = await parseAiJsonResponse(
      responseText,
      getApiKey(projDir),
      "História Viva"
    );
    const characterLock = String(parsed?.characterLock || "").trim();
    const globalNegative = String(parsed?.globalNegativePrompt || "").trim();
    const blocks = (Array.isArray(parsed?.blocks) ? parsed.blocks : [])
      .slice(0, sceneCount)
      .map((block, index) => {
        const scenePrompt = String(block?.visualPrompt || "").trim();
        const hasLiteralLock =
          characterLock &&
          scenePrompt.toLowerCase().includes(characterLock.toLowerCase());
        return {
          ...block,
          block: index + 1,
          durationSeconds: Math.max(
            4,
            Math.min(
              isShort ? 7 : 10,
              Number(block?.durationSeconds) || (isShort ? 6 : 8)
            )
          ),
          visualPrompt: [
            characterLock && !hasLiteralLock
              ? `CHARACTER LOCK: ${characterLock}`
              : "",
            scenePrompt,
            "Handheld selfie camera at arm's length, direct eye contact, natural micro-shake, one historically accurate background action that visibly proves the narration.",
          ]
            .filter(Boolean)
            .join("\n\n"),
          negativePrompt: [
            globalNegative,
            String(block?.negativePrompt || "").trim(),
            "face drift, identity change, age change, hairstyle change, costume change, body morphing, extra fingers, duplicated people, impossible head rotation, modern objects, wrong architecture, unreadable text",
          ]
            .filter(Boolean)
            .join(", "),
        };
      });
    // Shotcraft: se o payload já tiver visual_prompts (histórico → storyboard), taggeia
    let witnessPayload = {
      ...parsed,
      characterLock,
      globalNegativePrompt: globalNegative,
      blocks,
    };
    try {
      if (Array.isArray(witnessPayload.visual_prompts)) {
        witnessPayload = tagHistoricalStoryboard(witnessPayload, {
          format: String(format).toUpperCase() === "LONGO" ? "16:9" : "9:16",
          niche: String(niche || "historia").trim() || "historia",
        });
      }
    } catch (tagErr) {
      console.warn(
        "[historical-witness] motion tag:",
        tagErr?.message || tagErr
      );
    }
    res.json(witnessPayload);
  })
);

app.post(
  "/api/ai/creator/ideas",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const progressJobId = normalizeJobId(req.body?.progress_job_id);
    const browserText = extractBrowserResponse(req.body);

    const {
      niche,
      format,
      useNotebooklm,
      notebooklmDeep,
      contentMode,
      rankCount,
      rankOrder,
      listTopic,
      excludeIdeas = [],
      forceVariety = false,
      useDeepResearch = false,
    } = req.body;

    if (!niche || !format) {
      return res
        .status(400)
        .json({ error: "Nicho e Formato são obrigatórios." });
    }

    if (progressJobId) {
      setJobProgress(progressJobId, {
        phase: "init",
        label: "🔍 [1/3] Mapeando território editorial do nicho...",
        percent: 20,
      });
    }

    const isListicle = contentMode === "LISTICLE";
    const listicleRank = clampListicleRankCount(rankCount, format);
    const listicleTopic = String(listTopic || niche).trim();
    const nicheClean = String(niche).trim();
    const generationSeed = makeIdeasGenerationSeed();

    const previousIdeas = Array.isArray(excludeIdeas)
      ? excludeIdeas
          .map((i) => String(i?.title || i || "").trim())
          .filter(Boolean)
      : [];
    const historyTopics = loadIdeasHistory(WORKSPACE_DIR, nicheClean);
    const projectTopics = collectProjectTopics(PROJECTS_ROOT);
    const excludeTopics = mergeExclusionTopics({
      projectTopics,
      historyTopics,
      previousIdeas,
    });
    const explorationAxes = buildIdeasExplorationAxes(generationSeed);
    const exclusionAddendum = buildIdeasExclusionAddendum(excludeTopics);
    const diversityHint = explorationAxes
      .split("\n")
      .filter((l) => /^\d+\./.test(l))
      .join(" | ");

    const skipResearch = browserText || shouldOfferGeminiBrowser(projDir);
    const researchTopic = isListicle ? listicleTopic : nicheClean;
    const fmtDeep = format === "SHORTS" ? "SHORTS" : "LONGO";

    let deepResearchContext = "";
    let deepResearchMeta = null;

    if (useDeepResearch === true && !skipResearch) {
      try {
        const { llmFn: competitorLlmFn, repairJsonFn: competitorRepairFn } =
          buildCompetitorLlmFns(
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
            { useAi: true }
          );

        const deepLegs =
          useNotebooklm === true
            ? ["web", "exa", "competitors", "notebooklm"]
            : ["web", "exa", "competitors"];

        console.log(
          `[IDEAS] DeerFlow — nicho="${nicheClean}" legs=${deepLegs.join(",")}`
        );
        const deep = await runDeepResearch(WORKSPACE_DIR, {
          topic: researchTopic,
          niche: nicheClean,
          format: fmtDeep,
          legs: deepLegs,
          llmFn: competitorLlmFn,
          repairJsonFn: competitorRepairFn,
          getApiKeys: () => getApiKeys(projDir),
          apiKey: getApiKey(projDir),
          backendDir: __dirname,
          notebooklmDeep: notebooklmDeep === true,
          enqueueIdeas: false,
          diversityHint,
          excludeTopics,
          projDir,
        });

        if (deep.ok) {
          deepResearchContext = formatDeepResearchForIdeasPrompt(
            deep.report,
            deep.plan,
            deep.artifacts
          );
          deepResearchMeta = {
            factCount: deep.report?.factCount || 0,
            derivedIdeas: deep.report?.derivedIdeas?.length || 0,
            outlierCount: deep.artifacts?.competitors?.outlierCount || 0,
            legs: {
              web: Boolean(deep.artifacts?.web?.available),
              exa: Boolean(deep.artifacts?.exa?.available),
              notebooklm: Boolean(deep.artifacts?.notebooklm?.available),
              competitors: Boolean(deep.artifacts?.competitors),
            },
            legErrors: (deep.legErrors || []).length,
          };
        }
      } catch (err) {
        console.warn(
          "[IDEAS] DeerFlow falhou — fallback pesquisa rápida:",
          err.message
        );
      }
    }

    let notebooklmContext = "";
    let webResearchContext = "";

    if (!deepResearchContext && !skipResearch) {
      if (useNotebooklm === true) {
        try {
          const research = await fetchNotebooklmResearch(niche, format, {
            backendDir: __dirname,
            contentMode: isListicle ? "LISTICLE" : undefined,
            rankCount: listicleRank,
            listTopic: listicleTopic,
            rankOrder: rankOrder || "desc",
            projDir,
            researchMode: notebooklmDeep === true ? "deep" : "fast",
          });
          notebooklmContext = formatNotebooklmPromptBlock(
            research,
            "PESQUISA NOTEBOOKLM"
          );
        } catch {
          notebooklmContext = "";
        }
      }

      try {
        if (progressJobId) {
          setJobProgress(progressJobId, {
            phase: "web_search",
            label: "🌐 [1/3] Pesquisando dados recentes da web...",
            percent: 35,
          });
        }
        const webResearch = await fetchWebResearchForTopic({
          topic: researchTopic,
          niche: nicheClean,
          format,
          apiKey: getApiKey(projDir),
          getApiKeys: () => getApiKeys(projDir),
          workspaceDir: WORKSPACE_DIR,
          diversityHint,
          excludeTopics,
        });
        webResearchContext = formatWebResearchPromptBlock(
          webResearch,
          "PESQUISA WEB"
        );
      } catch {
        webResearchContext = "";
      }
    }

    if (progressJobId) {
      setJobProgress(progressJobId, {
        phase: "filtering",
        label:
          "🛡️ [2/3] Filtrando tópicos explorados e estruturando 10 ideias…",
        percent: 55,
      });
    }

    let promptSystem = `Você é o "Lumiera Ideas Engine" (Gerador de Roteiros Virais para YouTube + Hyperframe), um estrategista de retenção e pesquisador de tendências do YouTube.

O usuário fornecerá um Nicho de Vídeo e um Formato (Longo ou Shorts).

Faça uma análise rápida, objetiva e estratégica do nicho e gere exatamente 10 ideias de vídeo virais exclusivas dentro desse nicho.

${buildNicheIsolationAddendum(nicheClean)}

${buildNicheVarietyInstruction(nicheClean)}

${buildIdeasFreshnessInstruction()}

${explorationAxes}

${exclusionAddendum}

${deepResearchContext}
${notebooklmContext}
${webResearchContext}

${SCRIPT_CREATIVE_REINFORCEMENT}

${buildTitleCraftRules(format === "SHORTS" ? "SHORT" : "LONG")}

Diversidade obrigatoria de ideias:

- As 10 ideias devem explorar angulos diferentes entre si; nao entregue variacoes do mesmo titulo.

- Misture pelo menos estes tipos de abordagem quando fizer sentido: misterio, erro historico, detalhe esquecido, revelacao cientifica, comparacao improvavel, historia humana, mito versus realidade, pergunta provocadora, conflito moral e curiosidade visual.

- Evite repetir estruturas como "o segredo de..." em muitas ideias. Varie promessa, emocao e mecanismo de clique.

- Escolha a melhor ideia pelo potencial de retencao e comentario, nao apenas pelo titulo mais chamativo.

${buildIdeasQualityAddendum()}

${buildIdeaOpportunityAddendum(format)}

${buildViralIdeasAddendum(format)}

${isListicle ? buildListicleIdeasAddendum({ rankCount: listicleRank, listTopic: listicleTopic, rankOrder: rankOrder || "desc" }) : ""}

Responda APENAS com um objeto JSON válido, sem explicações extras, sem blocos de código com markdown \`\`\`json ou textos antes/depois. O JSON deve possuir exatamente a seguinte estrutura:

{

  "diagnostic": {

    "looking_for": "O que as pessoas estão procurando nesse nicho agora",

    "pain_points": "Principais dores desse público",

    "desires": "Desejos que movem o público",

    "retention_fears": "Medos ou dúvidas que geram retenção",

    "comment_hooks": "Curiosidades ou polêmicas que geram comentários",

    "title_style": "Que tipo de título teria mais chance de clique",

    "core_emotion": "Emoção principal a ser ativada",

    "retention_topics": "Tópicos com maior potencial de retenção",

    "strong_angle": "Qual o ângulo mais forte para o vídeo",
    "market_gap": "lacuna pouco coberta encontrada no nicho",
    "saturation_warning": "clichês e temas saturados a evitar",
    "format_strategy": "o que cabe em Shorts e o que exige Longo"

  },

  "ideas": [

    {

      "title": "Título provisório instigante",

      "promise": "Promessa clara do vídeo",

      "emotion": "Emoção dominante",

      "why_works": "Por que esse vídeo pode funcionar",

      "best_format": "LONGO, SHORTS ou AMBOS",

      "viral_category": "impactful | practical | provocative | astonishing",

      "hook_angle": "question | shock | problem_solution | before_after | breaking | challenge | secret | personal",

      "hooks": "Gancho principal ≤10 palavras, voz ativa, PT-BR",
      "reality_status": "documented | current | plausible | disputed",
      "evidence_anchor": "Caso real específico: NOME do evento/local + DATA (ano) + LOCALIZAÇÃO (cidade/país) + 1 dado numérico concreto. Ex: 'Ronan Point, Londres, 1968 — explosão de gás no 18º andar causou colapso progressivo de 22 andares em 5 segundos'",
      "saturation_level": "low | medium | high | unknown",
      "saturation_evidence": "sinal observado ou não confirmado",
      "undercovered_reason": "lacuna e diferencial do recorte",
      "format_fit": "LONGO | SHORTS",
      "recommended_duration": "duração adequada",
      "premium_upgrade": "melhoria de tese, narrativa, evidência e visual",
      "validation_needed": "checagens antes do roteiro"${format === "SHORTS" ? ',\n\n      "hook_candidates": ["gancho 1 ≤10 palavras", "gancho 2", "gancho 3"],\n\n      "wow_facts_preview": ["fato central 1 com número", "fato central 2"]' : ""}${isListicle ? ',\n\n      "listicle_angle": "ângulo do ranking (surpresa, impacto diário, mito vs realidade, etc.)"' : ""}

    }

  ],

  "best_idea_index": 0,

  "best_idea_reason": "Explicação detalhada de por que esta é a melhor ideia"${isListicle ? ',\n\n  "listicle_meta": {\n    "rank_count": ' + listicleRank + ',\n    "rank_order": "' + (rankOrder || "desc") + '",\n    "topic": "' + listicleTopic.replace(/"/g, '\\"') + '"\n  }' : ""}

}`;

    promptSystem = injectStudioAgentsContext(promptSystem, WORKSPACE_DIR, {
      niche: nicheClean,
      task: "ideas",
      format: format === "SHORTS" ? "SHORT" : "LONG",
    });

    try {
      const fullPrompt = `${promptSystem}

[ID da Geração: ${generationSeed}]
${forceVariety || previousIdeas.length ? "MODO: NOVA VARREDURA — obrigatório entregar assuntos distintos dos listados em TÓPICOS JÁ EXPLORADOS." : ""}

ENTRADAS:
NICHO: ${nicheClean}
FORMATO: ${format}
${isListicle ? `MODO: LISTICLE / TOP ${listicleRank}\nTEMA DA LISTA: ${listicleTopic}\nORDEM: ${rankOrder || "desc"}` : ""}`;

      if (progressJobId) {
        setJobProgress(progressJobId, {
          phase: "llm",
          label: "⚡ [3/3] Consultando IA para sintetizar 10 ideias virais...",
          percent: 80,
        });
      }

      const generation = await generateCreatorIdeasWithSingleRetry({
        basePrompt: fullPrompt,
        expectedCount: 10,
        maxAttempts: 3,
        niche: nicheClean,
        format,
        generate: ({ prompt }) =>
          callGeminiLlm(req, res, projDir, {
            title: "Gerar 10 ideias virais",
            prompt,
            temperature: 0.9,
            maxTokens: 16000,
          }),
        parse: (responseText) => {
          const debugDir = path.join(WORKSPACE_DIR, ".debug");
          try {
            fs.mkdirSync(debugDir, { recursive: true });
          } catch {}
          try {
            fs.writeFileSync(
              path.join(debugDir, `ideas-raw-${Date.now()}.txt`),
              String(responseText || "").slice(0, 50000),
              "utf8"
            );
          } catch {}
          return parseAiJsonResponse(
            responseText,
            getApiKey(projDir),
            "Ideias e diagnostico"
          );
        },
      });
      if (generation.handledExternally) return;

      const parsedData = generation.data;

      if (Array.isArray(parsedData?.ideas)) {
        parsedData.ideas = parsedData.ideas.map((idea) =>
          calcularPotencialMotion(normalizeIdeaOpportunity(idea, { format }), {
            format,
            niche: nicheClean,
          })
        );
      }

      if (Array.isArray(parsedData?.ideas) && parsedData.ideas.length) {
        appendIdeasHistory(WORKSPACE_DIR, nicheClean, parsedData.ideas);
      }

      res.json({
        ...parsedData,
        _ideas_meta: {
          generationSeed,
          excludedCount: excludeTopics.length,
          usedDeepResearch: Boolean(deepResearchContext),
          deepResearch: deepResearchMeta,
          usedWebResearch: Boolean(webResearchContext),
          usedNotebooklm: Boolean(notebooklmContext),
          generationAttempts: generation.attempts,
          automaticRetry: generation.attempts > 1,
        },
      });
    } catch (err) {
      console.error("[IDEAS ENDPOINT ERROR]", err.message);
      if (err.details)
        console.error("[IDEAS REJECTION REASON]", JSON.stringify(err.details));

      if (err instanceof CreatorIdeasContractError) {
        const repeatedAutomatically = Number(err.details?.attempts) > 1;
        return res.status(502).json({
          error: repeatedAutomatically
            ? "A IA respondeu, mas não entregou as 10 ideias corretamente. A repetição automática também falhou; tente novamente."
            : "A resposta capturada não contém as 10 ideias esperadas. Tente novamente.",
          code: err.code,
          details: err.details,
        });
      }

      res.status(500).json({
        error: "Erro ao gerar ideias/diagnóstico",
        details: err.message,
      });
    }
  })
);

// API: IDEIA PERSONALIZADA — validar oportunidade e propor melhoria premium

app.post(
  "/api/ai/creator/evaluate-custom-idea",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const {
      niche = "",
      format = "LONGO",
      title = "",
      hook = "",
      outline = "",
    } = req.body || {};
    if (!String(title).trim()) {
      return res.status(400).json({ error: "Informe sua ideia ou título." });
    }

    let researchContext = "";
    if (
      !extractBrowserResponse(req.body) &&
      !shouldOfferGeminiBrowser(projDir)
    ) {
      try {
        const research = await fetchWebResearchForTopic({
          topic: String(title).trim(),
          niche: String(niche).trim() || String(title).trim(),
          format,
          apiKey: getApiKey(projDir),
          getApiKeys: () => getApiKeys(projDir),
          workspaceDir: WORKSPACE_DIR,
        });
        researchContext = formatWebResearchPromptBlock(
          research,
          "PESQUISA PARA VALIDAR A IDEIA DO USUARIO"
        );
      } catch {
        researchContext = "";
      }
    }

    const responseText = await callGeminiLlm(req, res, projDir, {
      title: "Analisar e melhorar ideia personalizada",
      prompt: buildCustomIdeaEvaluationPrompt({
        niche,
        format,
        title,
        hook,
        outline,
        researchContext,
      }),
      temperature: 0.4,
    });
    if (responseText == null) return;
    const parsed = await parseAiJsonResponse(
      responseText,
      extractBrowserResponse(req.body) ? null : getApiKey(projDir),
      "Analise de ideia personalizada"
    );
    res.json(normalizeIdeaOpportunity(parsed, { format }));
  })
);

// API: EXPRESS CREATOR — Gerar roteiro de 45s baseado no prompt 5
app.post(
  "/api/ai/creator/generate-express-short",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const inputValidation = validateCreatorExpressInput(req.body || {});
    if (!inputValidation.ok) {
      return res.status(400).json({ error: inputValidation.error });
    }

    const {
      theme,
      niche,
      tone,
      project: safeProjectName,
    } = inputValidation.value;
    const targetProjDir = path.join(SHORTS_DIR, safeProjectName);

    const promptSystem = `Você é o "AI Video Creator Engine" do Lumiera, um roteirista especializado em YouTube Shorts de alta retenção.
Gerencie a criação de um roteiro curto em português do Brasil (PT-BR) para um YouTube Short seguindo as seguintes diretrizes fornecidas pelo usuário:

PROMPT 5 — Guión de Short individual
Escreva um roteiro para um YouTube Short de 45 segundos sobre o tema "${theme.replace(/"/g, '\\"')}" para um canal de nicho "${niche.replace(/"/g, '\\"')}".
O roteiro deve seguir esta estrutura exata:
- GANCHO (primeiros 3 segundos): uma frase que gere curiosidade ou tensão imediata, sem apresentações.
- DESARROLLO (35-40 segundos): informações com ritmo rápido, frases curtas de no mais de 12 palavras, um dado ou fato surpreendente a cada 8-10 segundos.
- CIERRE (5 segundos): uma pergunta que convide a comentar ou uma afirmação que gere debate.
Tom: ${tone}.
Máximo de 120 palavras no total. Escreva apenas o roteiro final (narração falada) em português do Brasil (PT-BR), sem indicações de cena, sem marcadores técnicos ou esclarecimentos.

Importante: A saída DEVE ser um objeto JSON estrito com o seguinte esquema (não inclua marcações markdown adicionais fora do JSON):
{
  "narrative_script": "O roteiro final gerado completo em português do Brasil (PT-BR), apenas a narração falada sem nenhuma anotação de cena.",
  "narrative_script_tagged": "[INTRO] (insira o gancho aqui) \\n\\n [BODY] (insira o desenvolvimento aqui) \\n\\n [OUTRO] (insira o encerramento aqui)",
  "strategy": {
    "target_audience": "${niche.replace(/"/g, '\\"')}",
    "hook_angle": "Gancho sobre ${theme.replace(/"/g, '\\"')}"
  },
  "technical_config": {
    "script": "O roteiro final gerado completo em português do Brasil (PT-BR).",
    "block_phrases": [
      { "block": 1, "phrase": "Gancho inicial de 3s" },
      { "block": 2, "phrase": "Desenvolvimento com fatos" },
      { "block": 3, "phrase": "Encerramento e chamada de engajamento" }
    ],
    "impact_texts": [
      "Frase curta de destaque do Gancho",
      "Fato surpreendente 1",
      "Fato surpreendente 2",
      "Pergunta do encerramento"
    ],
    "highlight_keywords": [
      "lista",
      "de",
      "palavras",
      "chave",
      "importantes"
    ],
    "bgm_mappings": [
      { "block": 1, "music_emotion": "tension" },
      { "block": 2, "music_emotion": "epic" },
      { "block": 3, "music_emotion": "neutral" }
    ]
  }
}`;

    const responseText = await callGeminiLlm(req, res, targetProjDir, {
      title: "Gerar roteiro express",
      prompt: promptSystem,
      temperature: 0.8,
    });
    if (responseText == null) return;

    const parsed = await parseAiJsonResponse(
      responseText,
      getApiKey(targetProjDir) || getApiKey(projDir),
      "Roteiro express"
    );

    const payloadValidation = validateCreatorExpressPayload(parsed);
    if (!payloadValidation.ok) {
      return res.status(502).json({
        error: `Resposta inválida da IA: ${payloadValidation.reason}.`,
      });
    }

    // Persist only after Gemini returned a valid narration. Browser-mode offers and
    // malformed AI responses must not leave empty project directories behind.
    if (!fs.existsSync(targetProjDir)) {
      fs.mkdirSync(targetProjDir, { recursive: true });
      fs.mkdirSync(path.join(targetProjDir, "ASSETS"), { recursive: true });
      fs.mkdirSync(path.join(targetProjDir, "OUTPUT"), { recursive: true });
      ensureProjectSfxPack(targetProjDir);
      ensureFileExists("build_video.py", targetProjDir);
      ensureFileExists("build_video_destacado.py", targetProjDir);
      ensureFileExists("mix_bgm.py", targetProjDir);
      ensureFileExists("find_block_timings.py", targetProjDir);
      ensureFileExists("align_transcripts.py", targetProjDir);
      const rootLogoPath = path.join(WORKSPACE_DIR, "ASSETS", "logo.png");
      const destLogoPath = path.join(targetProjDir, "ASSETS", "logo.png");
      if (fs.existsSync(rootLogoPath)) {
        fs.copyFileSync(rootLogoPath, destLogoPath);
      }
    }

    // Save configuration and initial wizard state inside project config
    const configPath = path.join(targetProjDir, "config_qanat.json");
    let currentConfig = {
      project_name: safeProjectName,
      niche,
      format: "SHORTS",
      theme,
      tone,
      creator_mode: "express",
      narrative_script: parsed.narrative_script || "",
      narrative_script_tagged: parsed.narrative_script_tagged || "",
      strategy: parsed.strategy || {},
      technical_config: parsed.technical_config || {},
    };

    if (fs.existsSync(configPath)) {
      try {
        const fileContent = fs.readFileSync(configPath, "utf8");
        const existing = JSON.parse(fileContent);
        currentConfig = { ...existing, ...currentConfig };
      } catch (err) {
        console.error("Erro ao ler config_qanat.json existente:", err);
      }
    }
    fs.writeFileSync(
      configPath,
      JSON.stringify(currentConfig, null, 2),
      "utf8"
    );

    // Also write narration.txt
    const narrationPath = path.join(targetProjDir, "narration.txt");
    fs.writeFileSync(narrationPath, parsed.narrative_script || "", "utf8");

    // Save wizard session
    const wizardSessionPath = path.join(targetProjDir, "wizard_session.json");
    const sessionData = {
      project: safeProjectName,
      creatorStep: 2,
      lastUpdated: Date.now(),
    };
    fs.writeFileSync(
      wizardSessionPath,
      JSON.stringify(sessionData, null, 2),
      "utf8"
    );

    // Shotcraft: tag motion em SHORT Express
    let expressPayload = parsed;
    try {
      if (parsed?.visual_prompts) {
        expressPayload = tagStoryboardWithMotion(parsed, {
          format: "9:16",
          niche: niche || "",
        });
        const sbPath = path.join(targetProjDir, "storyboard.json");
        if (fs.existsSync(sbPath) || expressPayload.visual_prompts) {
          fs.writeFileSync(
            sbPath,
            JSON.stringify(expressPayload, null, 2),
            "utf8"
          );
        }
      }
    } catch (tagErr) {
      console.warn("[Express] motion tag:", tagErr?.message || tagErr);
    }

    res.json(expressPayload);
  })
);

// API: LISTICLE — Sugerir rankings interessantes para um nicho

app.post(
  "/api/ai/creator/listicle-ideas",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const browserText = extractBrowserResponse(req.body);

    const { niche, format = "LONGO", useNotebooklm, notebooklmDeep } = req.body;

    if (!niche || !String(niche).trim()) {
      return res
        .status(400)
        .json({ error: "Informe o nicho para sugerir rankings." });
    }

    const nicheClean = String(niche).trim();

    let notebooklmContext = "";
    let webOpportunityContext = "";
    const skipNotebooklm = browserText || shouldOfferGeminiBrowser(projDir);
    if (useNotebooklm === true && !skipNotebooklm) {
      try {
        const research = await fetchNotebooklmResearch(nicheClean, format, {
          backendDir: __dirname,
          contentMode: "LISTICLE",
          projDir,
          researchMode: notebooklmDeep === true ? "deep" : "fast",
        });
        notebooklmContext = formatNotebooklmPromptBlock(
          research,
          "PESQUISA DE MERCADO"
        );
      } catch (e) {
        notebooklmContext = "";
      }
    }

    if (!skipNotebooklm) {
      try {
        const research = await fetchWebResearchForTopic({
          topic: nicheClean,
          niche: nicheClean,
          format,
          apiKey: getApiKey(projDir),
          getApiKeys: () => getApiKeys(projDir),
          workspaceDir: WORKSPACE_DIR,
        });
        webOpportunityContext = formatWebResearchPromptBlock(
          research,
          "CASOS REAIS E SINAIS DE OPORTUNIDADE"
        );
      } catch {
        webOpportunityContext = "";
      }
    }

    const useCompactPrompt = skipNotebooklm || !!browserText;
    const prompt = `${buildListicleRankingIdeasPrompt({ niche: nicheClean, format, compact: useCompactPrompt })}

${notebooklmContext}

${webOpportunityContext}

[ID: ${Date.now()}]`;

    try {
      const responseText = await callGeminiLlm(req, res, projDir, {
        title: "Sugerir rankings (listicle)",
        prompt,
        temperature: 0.9,
      });
      if (responseText == null) return;

      const raw = await parseAiJsonResponse(
        responseText,
        extractBrowserResponse(req.body) ? null : getApiKey(projDir),
        "Ranking ideas"
      );
      const parsed = normalizeListicleIdeasResponse(raw, { format });

      if (!parsed.ranking_ideas?.length) {
        console.warn(
          "[LISTICLE IDEAS] Resposta sem ranking_ideas. Chaves recebidas:",
          Object.keys(raw || {})
        );
        return res.status(502).json({
          error:
            "A IA não retornou rankings válidos. Tente novamente ou mude o nicho.",
          details: `Chaves na resposta: ${Object.keys(raw || {}).join(", ") || "nenhuma"}`,
          raw_preview: JSON.stringify(raw).slice(0, 500),
        });
      }

      console.log(
        `[LISTICLE IDEAS] ${parsed.ranking_ideas.length} rankings para nicho "${nicheClean}"`
      );
      res.json(parsed);
    } catch (err) {
      console.error("[LISTICLE IDEAS ERROR]", err.message);
      res
        .status(500)
        .json({ error: "Erro ao sugerir rankings", details: err.message });
    }
  })
);

function normalizeKeys(data, formatHint = null) {
  const defaultAspect =
    formatHint === "SHORTS" || formatHint === "SHORT" || formatHint === "9:16"
      ? "9:16"
      : formatHint === "LONGO" || formatHint === "LONG" || formatHint === "16:9"
        ? "16:9"
        : null;
  if (!data || typeof data !== "object") return data;

  const normalized = {};

  // Strategy

  const strategyKey = Object.keys(data).find(
    (k) => k.toLowerCase() === "strategy" || k.toLowerCase() === "estrategia"
  );

  if (strategyKey && typeof data[strategyKey] === "object") {
    const s = data[strategyKey];

    normalized.strategy = {
      title_main:
        s.title_main || s.titulo_principal || s.tituloMain || s.title || "",

      title_variations:
        s.title_variations ||
        s.variacoes_titulo ||
        s.variacoes ||
        s.variations ||
        [],

      hook: s.hook || s.gancho || "",

      target_audience: s.target_audience || s.publico_alvo || s.publico || "",

      tone: s.tone || s.tom || "",

      pinned_comment: s.pinned_comment || s.comentario_fixado || "",

      cta: s.cta || "",
    };
  } else {
    normalized.strategy = {
      title_main: "",
      title_variations: [],
      hook: "",
      target_audience: "",
      tone: "",
      pinned_comment: "",
      cta: "",
    };
  }

  // Narrative script

  const scriptKey = Object.keys(data).find(
    (k) =>
      k.toLowerCase() === "narrative_script" ||
      k.toLowerCase() === "roteiro_narrativo" ||
      k.toLowerCase() === "roteiro"
  );

  normalized.narrative_script =
    data[scriptKey] || data.script || data.narrativeScript || "";
  normalized.narrative_script_tagged =
    data.narrative_script_tagged ||
    data.narrativeScriptTagged ||
    data.roteiro_narrativo_marcado ||
    "";
  normalized.narracao_pro_trace =
    data.narracao_pro_trace ||
    data.narracaoProTrace ||
    data.trace_narracao_pro ||
    null;

  // Visual prompts

  const promptsKey = Object.keys(data).find(
    (k) =>
      k.toLowerCase() === "visual_prompts" ||
      k.toLowerCase() === "prompts_visuais" ||
      k.toLowerCase() === "prompts"
  );

  const rawPrompts = data[promptsKey] || [];

  normalized.visual_prompts = (Array.isArray(rawPrompts) ? rawPrompts : []).map(
    (vp, index) => ({
      scene: vp.scene || vp.cena || index + 1,

      block:
        parseBlockNumber(vp.block ?? vp.bloco, vp.scene ?? vp.cena) ||
        Math.floor(index / 2) + 1,

      narration_text:
        vp.narration_text ||
        vp.narration_excerpt ||
        vp.trecho_narracao ||
        vp.narracao ||
        vp.texto_narracao ||
        vp.narration ||
        vp.script_segment ||
        "",

      function: vp.function || vp.funcao || "",

      duration: vp.duration_from_whisper
        ? vp.duration ||
          (vp.duration_seconds != null
            ? `${vp.duration_seconds} segundos`
            : undefined)
        : undefined,

      duration_seconds: vp.duration_from_whisper
        ? vp.duration_seconds
        : undefined,

      duration_from_whisper: vp.duration_from_whisper === true,

      type: vp.type || vp.tipo || "imagem IA 2k",

      aspect_ratio:
        vp.aspect_ratio ||
        vp.aspectRatio ||
        vp.formato ||
        vp.proporcao ||
        defaultAspect ||
        "16:9",

      prompt:
        vp.prompt ||
        vp.visual_prompt ||
        vp.image_prompt ||
        vp.prompt_visual ||
        "",

      text_overlay:
        vp.text_overlay ||
        vp.textOverlay ||
        vp.texto_tela ||
        vp.textoTela ||
        vp.texto ||
        "",

      editor_notes:
        vp.editor_notes ||
        vp.editorNotes ||
        vp.observacao_edicao ||
        vp.observacao ||
        "",

      stock_query: vp.stock_query || vp.stockQuery || vp.busca_termo || "",
    })
  );

  // Editing map

  const mapKey = Object.keys(data).find(
    (k) =>
      k.toLowerCase() === "editing_map" ||
      k.toLowerCase() === "mapa_edicao" ||
      k.toLowerCase() === "mapa"
  );

  normalized.editing_map = data[mapKey] || "";

  // Hyperframe prompt

  const hfKey = Object.keys(data).find(
    (k) =>
      k.toLowerCase() === "hyperframe_prompt" ||
      k.toLowerCase() === "prompt_hyperframe" ||
      k.toLowerCase() === "prompt_final"
  );

  normalized.hyperframe_prompt = data[hfKey] || "";

  // BGM recommendations

  const bgmRecKey = Object.keys(data).find(
    (k) =>
      k.toLowerCase() === "bgm_recommendations" ||
      k.toLowerCase() === "bgm_recommendations_list" ||
      k.toLowerCase() === "recomendacoes_trilha" ||
      k.toLowerCase() === "recomendacoes_bgm"
  );

  if (bgmRecKey && Array.isArray(data[bgmRecKey])) {
    normalized.bgm_recommendations = data[bgmRecKey].map((r, index) => {
      const blockNum = Number(r.block || r.bloco || 0) || index + 1;

      return {
        block: blockNum,

        scope: r.scope || r.escopo || "block",

        recommendation:
          r.recommendation || r.recomendacao || r.indicacao || r.sugestao || "",

        search_theme: r.search_theme || r.searchTheme || r.tema_busca || "",
      };
    });
  } else {
    normalized.bgm_recommendations = [];
  }

  // Checklist

  const checkKey = Object.keys(data).find(
    (k) =>
      k.toLowerCase() === "checklist" || k.toLowerCase() === "lista_qualidade"
  );

  if (checkKey && typeof data[checkKey] === "object") {
    normalized.checklist = normalizeScriptChecklist(data[checkKey]);
  } else {
    normalized.checklist = normalizeScriptChecklist(null);
  }

  // Technical config

  const techKey = Object.keys(data).find(
    (k) =>
      k.toLowerCase() === "technical_config" ||
      k.toLowerCase() === "config_tecnica" ||
      k.toLowerCase() === "configuracao_tecnica"
  );

  if (techKey && typeof data[techKey] === "object") {
    const t = data[techKey];

    normalized.technical_config = {
      script: t.script || t.roteiro || "",

      block_phrases: t.block_phrases || t.frases_bloco || t.blockPhrases || [],

      impact_texts: t.impact_texts || t.textos_impacto || t.impactTexts || [],

      highlight_keywords:
        t.highlight_keywords || t.palavras_chave || t.highlightKeywords || [],

      bgm_mappings:
        t.bgm_mappings || t.mapeamento_trilhas || t.bgmMappings || [],
    };
  } else {
    normalized.technical_config = {
      script: "",
      block_phrases: [],
      impact_texts: [],
      highlight_keywords: [],
      bgm_mappings: [],
    };
  }

  return normalized;
}

const AUTOMATIC_SCRIPT_REPAIR_TIMEOUT_MS = 45000;

function withAutomaticRepairTimeout(
  promise,
  timeoutMs = AUTOMATIC_SCRIPT_REPAIR_TIMEOUT_MS
) {
  let timeout;
  return Promise.race([
    promise.finally(() => clearTimeout(timeout)),
    new Promise((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`timeout_after_${timeoutMs}ms`)),
        timeoutMs
      );
    }),
  ]);
}

async function runAutomaticQualityRepairForStoryboard(
  storyboard,
  {
    format,
    idea,
    niche,
    apiKey,
    projectDir,
    researchFacts = [],
    researchSources = [],
  } = {}
) {
  const narrativeScript = String(storyboard?.narrative_script || "").trim();
  const qualityContext = {
    format,
    strategy: storyboard?.strategy || {},
    idea,
    niche,
    trace: storyboard?.narracao_pro_trace,
    researchFacts:
      Array.isArray(storyboard?.research_facts) &&
      storyboard.research_facts.length
        ? storyboard.research_facts
        : researchFacts,
    researchSources:
      Array.isArray(storyboard?.research_sources) &&
      storyboard.research_sources.length
        ? storyboard.research_sources
        : researchSources,
  };

  const result = await runAutomaticScriptRepair({
    script: narrativeScript,
    context: qualityContext,
    evaluate: async (script, context) =>
      assessAutomaticScriptQuality({
        ...context,
        narrativeScript: script,
      }),
    repair: async (script, beforeReport, context) => {
      const repairPrompt = buildFactPreservingRepairPrompt({
        originalScript: script,
        unifiedReport: beforeReport,
        verifiedFacts: context.researchFacts,
        sources: context.researchSources,
        format: context.format,
        strategy: context.strategy,
      });
      const repairText = await withAutomaticRepairTimeout(
        callGeminiWithRetry(apiKey, repairPrompt, {
          temperature: 0.35,
          maxRetries: 1,
          projectDir,
          activityLabel: "Reparo automatico do roteiro",
          activityDetail: "Auditoria unificada de qualidade do roteiro",
          maxTokens: 4000,
        })
      );
      return await parseAiJsonResponse(
        repairText,
        apiKey,
        "Reparo automatico do roteiro"
      );
    },
  });

  return applyAutomaticScriptRepairToStoryboard(storyboard, result);
}

function safeAuditSlice(report, label = "audit") {
  if (report && typeof report === "object") {
    return {
      ...report,
      ok: report.ok === true,
      issues: Array.isArray(report.issues) ? report.issues : [],
      warnings: Array.isArray(report.warnings) ? report.warnings : [],
    };
  }
  return {
    ok: false,
    issues: [`${label} indisponível ou inválido.`],
    warnings: [],
  };
}

function evaluateNarrationFinalAudit(
  storyboard,
  { format, idea, researchFacts = [], researchSources = [] } = {}
) {
  let integrity;
  let editorial;
  try {
    integrity = safeAuditSlice(
      assessNarracaoProIntegrity({
        format,
        narrativeScript: storyboard?.narrative_script,
        idea,
        trace: storyboard?.narracao_pro_trace,
        researchFacts,
        researchSources,
      }),
      "integrity"
    );
  } catch (err) {
    integrity = {
      ok: false,
      issues: [
        `Falha ao avaliar integridade factual: ${err?.message || String(err)}`,
      ],
      warnings: [],
    };
  }
  try {
    editorial = safeAuditSlice(
      assessEditorialContract({
        format,
        narrativeScript: storyboard?.narrative_script,
        strategy: storyboard?.strategy || {},
      }),
      "editorial"
    );
  } catch (err) {
    editorial = {
      ok: false,
      issues: [
        `Falha ao avaliar contrato editorial: ${err?.message || String(err)}`,
      ],
      warnings: [],
    };
  }
  const issues = [
    ...(integrity.issues || []),
    ...(editorial.issues || []),
  ].filter(Boolean);
  return {
    approved: integrity.ok === true && editorial.ok === true,
    issues,
    integrity,
    editorial,
  };
}

/** Conteúdo mínimo para soft-aprovar e não jogar fora 10+ min de geração. */
function narrationHasReviewableContent(storyboard, format = "LONGO") {
  const text = String(storyboard?.narrative_script || "").trim();
  if (!text) return false;
  const words = text.split(/\s+/).filter(Boolean).length;
  const isShort =
    String(format || "").toUpperCase() === "SHORTS" ||
    String(format || "").toUpperCase() === "SHORT";
  return isShort ? words >= 40 : words >= 350;
}

async function repairNarrationThroughFinalAudit(
  storyboard,
  {
    format,
    idea,
    apiKey,
    projectDir,
    report,
    expectedBlocks,
    researchFacts = [],
    researchSources = [],
  } = {}
) {
  const isLong =
    String(format || "LONGO").toUpperCase() !== "SHORTS" &&
    String(format || "").toUpperCase() !== "SHORT";
  // Vídeo longo: mais tentativas de autorreparo antes de soft-aprovar.
  const maxAttempts = isLong ? 4 : 2;
  let result;
  try {
    result = await runNarrationAuditRepairLoop({
      storyboard,
      format,
      maxAttempts,
      evaluate: async (candidate) =>
        evaluateNarrationFinalAudit(candidate, {
          format,
          idea,
          researchFacts,
          researchSources,
        }),
      onProgress: ({ attempt, issues }) => {
        const summary = (issues || []).slice(0, 3).join(" · ");
        if (typeof report === "function") {
          report(
            "auto_repair",
            `A própria IA está corrigindo a narração (${attempt}/${maxAttempts})${summary ? `: ${summary}` : ""}`,
            Math.min(96, 82 + attempt * 3)
          );
        }
      },
      repair: async (current, audit, attempt) => {
        const prompt = buildNarrationAuditRepairPrompt({
          storyboard: current,
          issues: audit?.issues || [],
          format,
          idea,
          researchFacts,
          researchSources,
          attempt,
          maxAttempts,
        });
        const response = await callGeminiWithRetry(apiKey, prompt, {
          temperature: 0.25,
          maxRetries: 2,
          projectDir,
          activityLabel: `Autorreparo NARRACAOPRO ${attempt}/${maxAttempts}`,
          activityDetail: (audit?.issues || []).join(" | "),
          maxTokens: isLong ? 8192 : 5000,
        });
        const repaired = normalizeKeys(
          await parseAiJsonResponse(
            response,
            apiKey,
            `Autorreparo NARRACAOPRO ${attempt}/${maxAttempts}`
          )
        );
        if (!repaired.narrative_script && repaired.repaired_narrative) {
          repaired.narrative_script = repaired.repaired_narrative;
        }
        // Preserva campos do storyboard atual se o reparo só devolveu o texto
        const merged = {
          ...current,
          ...repaired,
          narrative_script:
            repaired.narrative_script || current?.narrative_script || "",
          narracao_pro_trace:
            repaired.narracao_pro_trace || current?.narracao_pro_trace,
          strategy: repaired.strategy || current?.strategy,
        };
        return normalizeNarrationBlocks(merged, expectedBlocks);
      },
    });
  } catch (err) {
    console.error(
      "[NARRACAOPRO] repairNarrationThroughFinalAudit falhou (não aborta):",
      err?.message || err
    );
    const fallbackAudit = evaluateNarrationFinalAudit(storyboard, {
      format,
      idea,
      researchFacts,
      researchSources,
    });
    result = {
      storyboard,
      repaired: false,
      attempts: 0,
      approved: fallbackAudit.approved === true,
      audit: fallbackAudit,
      finalAudit: fallbackAudit,
      failures: [err?.message || String(err)],
    };
  }

  // Contrato rígido: audit.integrity SEMPRE existe (evita TypeError no caller)
  const audit =
    result?.audit ||
    result?.finalAudit ||
    evaluateNarrationFinalAudit(result?.storyboard || storyboard, {
      format,
      idea,
      researchFacts,
      researchSources,
    });
  if (!audit.integrity) {
    audit.integrity = {
      ok: Boolean(audit.approved),
      issues: Array.isArray(audit.issues) ? audit.issues : [],
    };
  }
  if (!audit.editorial) {
    audit.editorial = {
      ok: Boolean(audit.approved),
      issues: [],
    };
  }
  if (!Array.isArray(audit.issues)) {
    audit.issues = [
      ...(audit.integrity?.issues || []),
      ...(audit.editorial?.issues || []),
    ].filter(Boolean);
  }

  const repairedStoryboard = normalizeNarrationBlocks(
    result?.storyboard || storyboard,
    expectedBlocks
  );
  repairedStoryboard.automatic_narration_repair = {
    attempted: (result?.attempts || 0) > 0,
    attempts: result?.attempts || 0,
    approved: result?.approved === true,
    failures: result?.failures || [],
  };
  return {
    ...result,
    approved: result?.approved === true,
    audit,
    finalAudit: audit,
    storyboard: repairedStoryboard,
  };
}

// API: SCRIPT MASTER Step 2 - Generate Strategy, Complete Script, and technical mappings

app.post(
  "/api/ai/creator/script",
  asyncHandler(async (req, res) => {
    const {
      niche,
      format,
      idea,
      project,
      contentMode,
      rankCount,
      rankOrder,
      listTopic,
      listicleHudStyle,
      useNotebooklm: useNotebooklmRaw,
      notebooklmDeep,
      phase = "full",
      approvedNarration: approvedNarrationRaw,
      approvedNarrationTagged: approvedNarrationTaggedRaw,
      existingStrategy: existingStrategyRaw,
      agentReachResearch: agentReachResearchRaw,
      motion_template_pack: motionTemplatePackRaw,
      historicalWitness: historicalWitnessRaw,
      enablePov: enablePovRaw,
      povBlockIndex: povBlockIndexRaw,
    } = req.body;
    const useNotebooklm =
      useNotebooklmRaw === true ||
      useNotebooklmRaw === 1 ||
      String(useNotebooklmRaw || "").toLowerCase() === "true";
    const enablePov =
      enablePovRaw === true ||
      enablePovRaw === 1 ||
      String(enablePovRaw || "").toLowerCase() === "true";
    const scriptPhase = phase === "narration" ? "narration" : "full";
    const approvedNarration = String(approvedNarrationRaw || "").trim();
    const approvedNarrationTagged = String(
      approvedNarrationTaggedRaw || ""
    ).trim();
    const progressJobId = normalizeJobId(req.body?.progress_job_id);
    const report = createProgressReporter(progressJobId);
    const sendLog = (text) => {
      report("running", text);
    };
    const phaseTitle =
      scriptPhase === "narration" ? "Narração" : "Roteiro completo";
    report("prepare", `${phaseTitle}: validando projeto…`, 4);

    if (!niche || !format || !idea || !project) {
      failJobProgress(progressJobId, "Dados obrigatórios ausentes.");
      return res.status(400).json({
        error:
          "Nicho, formato, ideia selecionada e nome do projeto são obrigatórios.",
      });
    }

    const isListicle = contentMode === "LISTICLE";
    const isHistoricalWitness = contentMode === "HISTORICAL_WITNESS";
    const historicalWitness =
      isHistoricalWitness &&
      historicalWitnessRaw &&
      typeof historicalWitnessRaw === "object"
        ? {
            ...historicalWitnessRaw,
            contentMode: "HISTORICAL_WITNESS",
          }
        : null;
    const listicleRank = clampListicleRankCount(rankCount, format);
    const listicleTopic = String(listTopic || idea.title || niche).trim();
    const historicalBlockCount = Math.max(
      2,
      Math.min(
        24,
        Array.isArray(historicalWitness?.blueprint?.blocks)
          ? historicalWitness.blueprint.blocks.length
          : 0
      )
    );
    const listicleBlockCount = isListicle
      ? resolveListicleBlockCount({ rankCount: listicleRank, format })
      : isHistoricalWitness && historicalBlockCount > 2
        ? historicalBlockCount
        : format === "SHORTS"
          ? 5
          : 12;

    const ideaBlockCount = Math.max(
      0,
      Array.isArray(idea?.blocks) ? idea.blocks.length : 0
    );
    const povTotalBlocks =
      ideaBlockCount >= 3
        ? ideaBlockCount
        : Math.max(3, listicleBlockCount || (format === "SHORTS" ? 5 : 8));
    const povPlacement = resolvePovPlacement({
      enablePov,
      totalBlocks: povTotalBlocks,
      povBlockIndex: povBlockIndexRaw,
    });
    if (povPlacement.enabled) {
      sendLog(
        `[POV] Bloco POV sorteado: #${povPlacement.blockIndex}/${povPlacement.totalBlocks} (~20s, 2 cenas) — miolo, nunca intro/outro fixos.`
      );
    }

    const safeProjectName = project.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

    const isShort = format === "SHORTS";

    const targetParentDir = isShort ? SHORTS_DIR : LONGS_DIR;

    const projDir = path.join(targetParentDir, safeProjectName);

    const settingsDir = getProjectDir(req);
    const llmDir = fs.existsSync(path.join(projDir, "config_qanat.json"))
      ? projDir
      : settingsDir;

    if (
      !extractBrowserResponse(req.body) &&
      !shouldOfferGeminiBrowser(settingsDir) &&
      !getApiKey(projDir) &&
      !getApiKey(settingsDir)
    ) {
      failJobProgress(progressJobId, "Chave de API não configurada.");
      return res
        .status(401)
        .json({ error: "Chave de API do Google AI Studio não configurada." });
    }

    let activeRes = res;
    if (progressJobId) {
      res.json({ started: true, jobId: progressJobId });
      activeRes = createProgressJobResponse(progressJobId);
    }

    report("project", "Preparando pasta do projeto…", 10);

    // Automatically create and template project directory on-the-fly if it doesn't exist

    if (!fs.existsSync(projDir)) {
      try {
        fs.mkdirSync(projDir, { recursive: true });

        fs.mkdirSync(path.join(projDir, "ASSETS"), { recursive: true });

        fs.mkdirSync(path.join(projDir, "OUTPUT"), { recursive: true });

        ensureProjectSfxPack(projDir);

        ensureFileExists("build_video.py", projDir);

        ensureFileExists("build_video_destacado.py", projDir);

        ensureFileExists("mix_bgm.py", projDir);

        ensureFileExists("find_block_timings.py", projDir);

        ensureFileExists("align_transcripts.py", projDir);

        // Copy logo.png if it exists in root ASSETS folder

        const rootLogoPath = path.join(WORKSPACE_DIR, "ASSETS", "logo.png");

        const destLogoPath = path.join(projDir, "ASSETS", "logo.png");

        if (fs.existsSync(rootLogoPath)) {
          fs.copyFileSync(rootLogoPath, destLogoPath);

          console.log(`Copied logo.png to new project ${safeProjectName}`);
        }

        const defaultConfigSrc = path.join(WORKSPACE_DIR, "config_qanat.json");

        const defaultConfigDest = path.join(projDir, "config_qanat.json");

        if (fs.existsSync(defaultConfigSrc)) {
          fs.copyFileSync(defaultConfigSrc, defaultConfigDest);

          try {
            const cfg = JSON.parse(fs.readFileSync(defaultConfigDest, "utf8"));
            const boot = bootstrapNewProjectConfig(cfg, {
              isShort: format === "SHORTS" || format === "SHORT",
              niche: niche || "Geral",
              defaultDuration: isListicle
                ? listicleBlockCount * 50
                : format === "SHORTS"
                  ? 40
                  : 120,
            });
            fs.writeFileSync(
              defaultConfigDest,
              JSON.stringify(boot, null, 2),
              "utf8"
            );
          } catch (e) {}
        }

        const blockEstimate = isListicle ? 50 : 10;
        const timingStarts = Array.from(
          { length: listicleBlockCount },
          (_, i) => i * blockEstimate
        );
        const timingDurations = Array.from(
          { length: listicleBlockCount },
          () => blockEstimate
        );
        fs.writeFileSync(
          path.join(projDir, "block_timings.json"),
          JSON.stringify(
            {
              starts: timingStarts,

              durations: timingDurations,

              total_duration:
                timingStarts[timingStarts.length - 1] + blockEstimate,
            },
            null,
            4
          ),
          "utf8"
        );
      } catch (err) {
        return activeRes.status(500).json({
          error: "Erro ao criar pasta do novo projeto",
          details: err.message,
        });
      }
    }

    report(
      "interpretacao",
      "[NARRACAOPRO] Etapa 1: Interpretando o tema e definindo a Pergunta Central...",
      14
    );
    await new Promise((r) => setTimeout(r, 600));

    report(
      "consultas",
      "[NARRACAOPRO] Etapa 2: Planejando consultas direcionadas e busca em camadas...",
      18
    );
    await new Promise((r) => setTimeout(r, 600));

    const browserTextEarly = extractBrowserResponse(req.body);
    const skipNotebooklmScript =
      browserTextEarly || shouldOfferGeminiBrowser(settingsDir);

    const isPioneerFromIdea =
      idea?.pioneerNiche === true || Boolean(idea?.pioneerMeta);
    const nlmNiche =
      isPioneerFromIdea && niche === "Customized"
        ? (idea?.title || idea?.promise || niche).trim().slice(0, 72)
        : niche;
    let notebooklmAccumulated = String(
      req.body?.notebooklmAccumulated || ""
    ).trim();
    const skipNotebooklmPending = req.body?.skipNotebooklmPending === true;
    let notebooklmBriefDisk = projDir ? loadNotebooklmBrief(projDir) : null;
    let nlmSessionEarly = projDir
      ? loadNotebooklmSession({
          projDir,
          backendDir: __dirname,
          niche: nlmNiche,
        })
      : null;
    const nlmSessionPendingEarly =
      nlmSessionEarly &&
      (nlmSessionEarly.awaitingUser ||
        nlmSessionEarly.status === "pending_user");
    const nlmHasProgressEarly = hasNotebooklmProgress(
      nlmSessionEarly,
      notebooklmBriefDisk
    );
    if (nlmHasProgressEarly && !skipNotebooklmPending) {
      console.log(
        "[NotebookLM] Progresso preservado — interação NÃO será reiniciada."
      );
    }
    const nlmUserTurnsEarly = (nlmSessionEarly?.turns || []).filter(
      (t) => t.role === "user"
    ).length;
    const nlmBriefFinalizedEarly =
      notebooklmBriefDisk?.status === "finalized" ||
      (skipNotebooklmPending && notebooklmBriefDisk?.available);

    const wantsNlmInteractiveFirst = wantsNotebooklmInteractiveNarration({
      scriptPhase,
      useNotebooklm,
      skipNotebooklmPending,
    });
    console.log(
      `[NotebookLM] creator/script narration=${scriptPhase === "narration"} useNotebooklm=${useNotebooklm !== false} skipPending=${skipNotebooklmPending} interactiveFirst=${wantsNlmInteractiveFirst}`
    );

    if (wantsNlmInteractiveFirst && nlmSessionPendingEarly && nlmSessionEarly) {
      report("notebooklm_pending", "NotebookLM aguarda sua resposta…", 22);
      return activeRes.json({
        phase: "notebooklm_pending",
        project: safeProjectName,
        notebooklm_session: nlmSessionEarly,
        notebooklm_brief:
          nlmSessionEarly.notebooklm_brief_path || NOTEBOOKLM_BRIEF_FILENAME,
        message:
          [...(nlmSessionEarly.turns || [])]
            .reverse()
            .find((t) => t.role === "assistant")?.content ||
          nlmSessionEarly.accumulatedSummary ||
          "Responda ao NotebookLM para continuar.",
        questions: nlmSessionEarly.questions || [],
      });
    }

    if (
      wantsNlmInteractiveFirst &&
      nlmSessionEarly &&
      nlmUserTurnsEarly > 0 &&
      !nlmSessionPendingEarly
    ) {
      report(
        "notebooklm_ready",
        "Material NotebookLM acumulado — clique Prosseguir para narração.",
        22
      );
      return activeRes.json({
        phase: "notebooklm_pending",
        project: safeProjectName,
        notebooklm_session: nlmSessionEarly,
        notebooklm_brief:
          nlmSessionEarly.notebooklm_brief_path || NOTEBOOKLM_BRIEF_FILENAME,
        message:
          nlmSessionEarly.readiness?.reason ||
          "Material acumulado no brief MD — clique em Prosseguir para gerar a narração.",
        questions: [],
        suggest_proceed: true,
      });
    }

    if (wantsNlmInteractiveFirst && nlmHasProgressEarly) {
      console.log(
        "[NotebookLM] Bloqueando nova descoberta — retomando sessão existente."
      );
      if (nlmSessionEarly) {
        report(
          nlmSessionPendingEarly ? "notebooklm_pending" : "notebooklm_ready",
          nlmSessionPendingEarly
            ? "NotebookLM aguarda sua resposta…"
            : "Material acumulado — clique Prosseguir para narração.",
          22
        );
        return activeRes.json({
          phase: "notebooklm_pending",
          project: safeProjectName,
          notebooklm_session: nlmSessionEarly,
          notebooklm_brief:
            nlmSessionEarly.notebooklm_brief_path || NOTEBOOKLM_BRIEF_FILENAME,
          message:
            [...(nlmSessionEarly.turns || [])]
              .reverse()
              .find((t) => t.role === "assistant")?.content ||
            nlmSessionEarly.accumulatedSummary ||
            "Continue a interação no painel NotebookLM.",
          questions: nlmSessionEarly.questions || [],
          suggest_proceed: !nlmSessionPendingEarly,
        });
      }
    }

    if (wantsNlmInteractiveFirst) {
      report(
        "notebooklm",
        "Alinhamento com NotebookLM (antes da narração)…",
        15
      );
      try {
        console.log(
          "[NotebookLM] Rodada interativa obrigatória — pausando antes de Gemini/web/humanização."
        );
        const discoveryResearch = await fetchNotebooklmScriptContext({
          backendDir: __dirname,
          niche: nlmNiche,
          format,
          idea,
          contentMode: isListicle
            ? "LISTICLE"
            : isHistoricalWitness
              ? "HISTORICAL_WITNESS"
              : undefined,
          rankCount: listicleRank,
          listTopic: listicleTopic,
          rankOrder: rankOrder || "desc",
          interactiveDiscovery: true,
          runResearch: false,
          projDir,
        });
        if (!discoveryResearch?.available) {
          const errMsg = discoveryResearch?.needsLogin
            ? "NotebookLM não autenticado — conecte na aba Criador antes de gerar narração."
            : discoveryResearch?.error ||
              "NotebookLM indisponível neste momento.";
          failJobProgress(progressJobId, errMsg);
          return activeRes.status(503).json({
            error: errMsg,
            needsNotebooklmLogin: Boolean(discoveryResearch?.needsLogin),
          });
        }
        const session = persistNotebooklmResearchSession({
          research: discoveryResearch,
          niche: nlmNiche,
          format,
          purpose: "script",
          projDir,
          backendDir: __dirname,
        });
        report("notebooklm_pending", "NotebookLM aguarda sua resposta…", 22);
        return activeRes.json({
          phase: "notebooklm_pending",
          project: safeProjectName,
          notebooklm_session: session,
          notebooklm_brief:
            session.notebooklm_brief_path || NOTEBOOKLM_BRIEF_FILENAME,
          message: discoveryResearch.summary,
          questions: session.questions || [],
        });
      } catch (err) {
        console.warn("[NotebookLM] Falha na rodada interativa:", err.message);
        failJobProgress(progressJobId, err.message);
        return activeRes.status(500).json({
          error: "Falha ao consultar NotebookLM.",
          details: err.message,
        });
      }
    }

    if (!notebooklmAccumulated && notebooklmBriefDisk?.available) {
      const briefAccum = String(
        notebooklmBriefDisk.parsed?.accumulated || ""
      ).trim();
      if (
        briefAccum &&
        (notebooklmBriefDisk.status === "finalized" || skipNotebooklmPending)
      ) {
        notebooklmAccumulated = briefAccum;
        console.log(
          `[NotebookLM] Brief MD finalizado carregado: ${NOTEBOOKLM_BRIEF_FILENAME}`
        );
      }
    }

    let notebooklmContext = "";
    let notebooklmResearch = null;
    if (notebooklmAccumulated) {
      if (notebooklmBriefDisk?.available) {
        notebooklmContext = formatNotebooklmBriefPromptBlock(
          notebooklmBriefDisk,
          format,
          "BRIEF NOTEBOOKLM PARA ROTEIRO"
        );
      }
      if (!notebooklmContext) {
        notebooklmContext = formatNotebooklmPromptBlock(
          {
            available: true,
            summary: notebooklmAccumulated,
            fallback: false,
          },
          "PESQUISA NOTEBOOKLM PARA ROTEIRO"
        );
      }
      console.log(
        "[NotebookLM] Usando pesquisa acumulada (sessão interativa ou brief MD)."
      );
    } else if (
      notebooklmBriefDisk?.available &&
      nlmBriefFinalizedEarly &&
      String(notebooklmBriefDisk.parsed?.accumulated || "").length >= 200
    ) {
      notebooklmContext = formatNotebooklmBriefPromptBlock(
        notebooklmBriefDisk,
        format,
        "BRIEF NOTEBOOKLM PARA ROTEIRO"
      );
      console.log(
        `[NotebookLM] Usando brief MD finalizado (${NOTEBOOKLM_BRIEF_FILENAME}).`
      );
    } else if (
      useNotebooklm !== false &&
      !skipNotebooklmScript &&
      scriptPhase !== "narration"
    ) {
      report("notebooklm", "Consultando NotebookLM…", 18);
      try {
        console.log("[NotebookLM] Enriquecendo roteiro com pesquisa...");
        notebooklmResearch = await fetchNotebooklmScriptContext({
          backendDir: __dirname,
          niche: nlmNiche,
          format,
          idea,
          contentMode: isListicle
            ? "LISTICLE"
            : isHistoricalWitness
              ? "HISTORICAL_WITNESS"
              : undefined,
          rankCount: listicleRank,
          listTopic: listicleTopic,
          rankOrder: rankOrder || "desc",
          projDir,
          researchMode: notebooklmDeep === true ? "deep" : "fast",
        });
        notebooklmContext = formatNotebooklmPromptBlock(
          notebooklmResearch,
          "PESQUISA NOTEBOOKLM PARA ROTEIRO"
        );
        if (notebooklmResearch.available) {
          console.log("[NotebookLM] Contexto de roteiro obtido com sucesso.");
        } else {
          console.warn(
            "[NotebookLM] Usando fallback de pesquisa:",
            notebooklmResearch.message || "sem login"
          );
        }
      } catch (err) {
        console.warn("[NotebookLM] Falha ao enriquecer roteiro:", err.message);
      }
    }

    let webResearchContext = "";
    let webResearchMeta = null;
    const researchTopic = isListicle
      ? listicleTopic
      : isHistoricalWitness
        ? String(
            historicalWitness?.idea?.event ||
              historicalWitness?.blueprint?.historicalFrame?.entity ||
              idea.title ||
              niche
          ).trim()
        : idea.title || niche;
    const isPioneerNicheIdea =
      idea?.pioneerNiche === true || Boolean(idea?.pioneerMeta);
    const prefetchedReach =
      agentReachResearchRaw && typeof agentReachResearchRaw === "object"
        ? agentReachResearchRaw
        : null;
    const persistedNarrationResearch = approvedNarration
      ? readProjectJson(projDir, "storyboard.json", {})
      : null;
    if (prefetchedReach?.summary || prefetchedReach?.facts?.length) {
      webResearchMeta = {
        available: true,
        summary: String(prefetchedReach.summary || "").slice(0, 12000),
        facts: Array.isArray(prefetchedReach.facts)
          ? prefetchedReach.facts.map(String).filter(Boolean)
          : [],
        sources: Array.isArray(prefetchedReach.sources)
          ? prefetchedReach.sources
          : [],
        via: prefetchedReach.via || "agent-reach-panel",
        fallback: false,
      };
      webResearchContext = formatWebResearchPromptBlock(
        webResearchMeta,
        "PESQUISA WEB (AGENT REACH — SUA BUSCA)"
      );
      console.log(
        `[WebResearch] Usando pesquisa Agent Reach do painel: ${webResearchMeta.sources?.length || 0} fontes.`
      );
    } else if (
      approvedNarration &&
      (persistedNarrationResearch?.research_facts?.length ||
        persistedNarrationResearch?.research_sources?.length)
    ) {
      webResearchMeta = {
        available: true,
        summary:
          "Evidências reutilizadas da narração já auditada pelo NARRACAOPRO.",
        facts: Array.isArray(persistedNarrationResearch.research_facts)
          ? persistedNarrationResearch.research_facts
          : [],
        sources: Array.isArray(persistedNarrationResearch.research_sources)
          ? persistedNarrationResearch.research_sources
          : [],
        via: "narration-phase-audit",
        fallback: false,
      };
      webResearchContext = formatWebResearchPromptBlock(
        webResearchMeta,
        "PESQUISA REUTILIZADA DA NARRAÇÃO AUDITADA"
      );
      console.log(
        `[WebResearch] Fase 2 reutilizando ${webResearchMeta.facts.length} fatos e ${webResearchMeta.sources.length} fontes da narração; nova busca dispensada.`
      );
    } else if (
      !webResearchContext &&
      notebooklmBriefDisk?.available &&
      shouldSkipWebResearchForBrief(notebooklmBriefDisk)
    ) {
      const briefParsed = notebooklmBriefDisk.parsed || {};
      webResearchMeta = {
        available: true,
        summary: String(briefParsed.accumulated || "").slice(0, 12000),
        facts: Array.isArray(briefParsed.facts) ? briefParsed.facts : [],
        sources: [
          {
            title: `NotebookLM Brief (${NOTEBOOKLM_BRIEF_FILENAME})`,
            url: "",
            snippet: String(briefParsed.accumulated || "").slice(0, 500),
          },
        ],
        via: "notebooklm-brief-md",
        fallback: false,
      };
      webResearchContext = formatWebResearchPromptBlock(
        webResearchMeta,
        "PESQUISA NOTEBOOKLM (BRIEF MD — SEM BUSCA WEB)"
      );
      console.log(
        `[WebResearch] Pulando busca web — brief NotebookLM suficiente (${briefParsed.factCount || briefParsed.facts?.length || 0} fatos).`
      );
    } else if (!webResearchContext && !isPioneerNicheIdea) {
      // Para ideias pioneer-niche, os dados já vêm no pioneerMeta do Radar de Tendências.
      // Buscar na web novamente pode contaminar a narração com fatos de tópicos não relacionados.
      report(
        "web_research",
        "[NARRACAOPRO] Etapa 3: Pesquisando fatos na web e selecionando fontes confiáveis...",
        22
      );
      await new Promise((r) => setTimeout(r, 600));

      report(
        "evidencias",
        "[NARRACAOPRO] Etapa 4: Cruzando fontes primárias e extraindo evidências de pauta...",
        26
      );
      await new Promise((r) => setTimeout(r, 600));

      report(
        "matriz",
        "[NARRACAOPRO] Etapa 5: Filtrando matriz de afirmações e eliminando contradições...",
        30
      );
      await new Promise((r) => setTimeout(r, 600));

      try {
        console.log(
          "[WebResearch] Pesquisando fatos com fontes para roteiro..."
        );
        webResearchMeta = await fetchWebResearchForTopic({
          topic: researchTopic,
          niche,
          format,
          apiKey: getApiKey(llmDir),
          getApiKeys: () => getApiKeys(llmDir),
          workspaceDir: WORKSPACE_DIR,
        });
        webResearchContext = formatWebResearchPromptBlock(
          webResearchMeta,
          "PESQUISA WEB (FONTES REAIS)"
        );
        if (webResearchMeta.available) {
          console.log(
            `[WebResearch] ${webResearchMeta.facts?.length || 0} fatos, ${webResearchMeta.sources?.length || 0} fontes.`
          );
        }
      } catch (err) {
        console.warn("[WebResearch] Falha:", err.message);
      }
    } else if (isPioneerNicheIdea) {
      console.log(
        "[WebResearch] Pulando busca web — ideia pioneer-niche já tem dados do Radar de Tendências."
      );
    }

    let phase1Strategy = {};
    const storyboardEarlyPath = path.join(projDir, "storyboard.json");
    if (fs.existsSync(storyboardEarlyPath)) {
      try {
        const partial = JSON.parse(
          fs.readFileSync(storyboardEarlyPath, "utf8")
        );
        if (partial?.strategy && typeof partial.strategy === "object") {
          phase1Strategy = partial.strategy;
        }
      } catch {
        /* ignore */
      }
    }
    const existingStrategy =
      existingStrategyRaw &&
      typeof existingStrategyRaw === "object" &&
      Object.keys(existingStrategyRaw).length
        ? existingStrategyRaw
        : phase1Strategy;

    let remotionTemplateContext = "";
    if (motionTemplatePackRaw?.enabled) {
      const templateNiche = String(
        motionTemplatePackRaw.niche || niche || "Geral"
      ).trim();
      const catalog = getCatalogForNiche(templateNiche);
      const requestedIds = new Set(
        Array.isArray(motionTemplatePackRaw.template_ids)
          ? motionTemplatePackRaw.template_ids.map(String)
          : []
      );
      const available = (catalog.orchestration_ready || [])
        .filter(
          (tpl) => requestedIds.size === 0 || requestedIds.has(String(tpl.id))
        )
        .slice(0, 40)
        .map((tpl) => ({
          id: tpl.id,
          name: tpl.name,
          category: tpl.category,
          subcategory: tpl.subcategory,
          description: tpl.description,
          motion_template_id: tpl.motion_template_id,
          data_slots: tpl.data_slots || tpl.dataSlots || [],
        }));
      if (available.length) {
        remotionTemplateContext = JSON.stringify(
          { niche: catalog.niche || templateNiche, templates: available },
          null,
          2
        );
      }
    }

    const projectConfigForStyle = readProjectJson(
      projDir,
      "config_qanat.json",
      {}
    );
    const visualAssetStyle =
      projectConfigForStyle.visual_asset_style ||
      req.body?.visual_asset_style ||
      "photorealistic";
    const visualMapOnly = Boolean(
      projectConfigForStyle.visual_map_only_prompts ??
      req.body?.visual_map_only_prompts
    );

    const promptContext = {
      niche,
      format,
      idea,
      isListicle,
      isHistoricalWitness,
      historicalWitness,
      enablePov: povPlacement.enabled,
      povPlacement,
      listicleRank,
      listicleTopic,
      rankOrder: rankOrder || "desc",
      listicleBlockCount,
      notebooklmContext,
      webResearchContext,
      cinematicNarrationRules: buildCinematicNarrationRules(),
      titleCraftRules: buildTitleCraftRules(
        format === "SHORTS" ? "SHORT" : "LONG"
      ),
      epidemicMoodPrompt: buildEpidemicMoodPrompt(
        niche,
        {
          niche,
          content_mode: isListicle
            ? "LISTICLE"
            : isHistoricalWitness
              ? "HISTORICAL_WITNESS"
              : undefined,
          list_topic: listicleTopic,
        },
        { listicle: { topic: listicleTopic } }
      ),
      approvedNarration,
      approvedNarrationTagged,
      existingStrategy,
      remotionTemplateContext,
      visualAssetStyle,
      visualMapOnly,
    };

    let promptSystem;
    if (scriptPhase === "narration") {
      promptSystem = buildNarrationOnlyPrompt(promptContext);
    } else if (approvedNarration) {
      promptSystem = buildCreatorPhase2Prompt(promptContext);
    } else {
      promptSystem = buildCreatorFullScriptPrompt(promptContext);
    }

    report(
      "tese",
      "[NARRACAOPRO] Etapa 6: Definindo ângulo do vídeo e tese narrativa...",
      34
    );
    await new Promise((r) => setTimeout(r, 600));

    report(
      "estrutura",
      "[NARRACAOPRO] Etapa 7: Mapeando cadeia lógica (Fato -> Causa -> Consequência)...",
      38
    );
    await new Promise((r) => setTimeout(r, 600));

    report("prompt", "Montando prompt + memória Obsidian…", 42);
    promptSystem = injectStudioAgentsContext(promptSystem, WORKSPACE_DIR, {
      niche,
      task: "script",
      format: isShort ? "SHORT" : "LONG",
    });

    let responseText = "";
    const apiKey = getApiKey(projDir) || getApiKey(settingsDir);

    try {
      report(
        "gemini",
        scriptPhase === "narration"
          ? "[NARRACAOPRO] Etapa 8: Escrevendo narração humanizada sob diretrizes..."
          : "[NARRACAOPRO] Etapa 8: Gerando roteiro técnico completo com IA...",
        shouldOfferGeminiBrowser(settingsDir) ? 48 : 52
      );
      // Narração exige raciocínio avançado — priorizar melhor modelo disponível
      const NARRATION_MODEL_PRIORITY = [
        "gemini-2.5-pro",
        "gemini-3.5-flash",
        "gemini-2.5-flash",
      ];
      responseText = await callGeminiLlm(req, activeRes, llmDir, {
        title:
          scriptPhase === "narration"
            ? "Gerar narração Creator"
            : "Gerar roteiro Creator",
        prompt: promptSystem,
        temperature: isListicle ? 0.75 : isHistoricalWitness ? 0.5 : 0.85,
        models: NARRATION_MODEL_PRIORITY,
      });
      if (responseText == null) {
        report("browser_wait", "Aguardando resposta do Gemini no Chrome…", 58);
        return;
      }
      report(
        "parse",
        "[NARRACAOPRO] Etapa 9: Analisando resposta estruturada e iniciando Auditoria Factual...",
        64
      );

      const isBrowserResponse = !!extractBrowserResponse(req.body);
      let rawData;
      try {
        rawData = await parseAiJsonResponse(
          responseText,
          isBrowserResponse ? null : apiKey,
          "Roteiro e estrategia"
        );
      } catch (parseErr) {
        if (
          (scriptPhase === "narration" && isBrowserResponse) ||
          (scriptPhase === "full" && approvedNarration)
        ) {
          rawData = salvageScriptJson(responseText) || {};
          console.warn(
            "[Creator Script] JSON inválido — salvage/fallback:",
            parseErr.message
          );
          if (!Object.keys(rawData).length) {
            throw parseErr;
          }
        } else {
          throw parseErr;
        }
      }

      let parsedData = applyScriptTextQuality(normalizeKeys(rawData), format);
      if (isHistoricalWitness) {
        parsedData.content_mode = "HISTORICAL_WITNESS";
        parsedData.historical_witness = historicalWitness;
      }
      // POV NÃO é aplicado aqui: repair/fallback de visual_prompts roda depois e apagava as tags.
      // applyPovToStoryboard roda no final, antes do save (fase full).
      if (scriptPhase === "narration" && isBrowserResponse) {
        parsedData = applyScriptTextQuality(
          normalizeKeys(enrichBrowserNarrationParsed(parsedData, responseText)),
          format
        );
      }
      if (scriptPhase === "full" && isBrowserResponse) {
        parsedData = applyScriptTextQuality(
          normalizeKeys(
            enrichBrowserVisualPromptsParsed(parsedData, responseText)
          ),
          format
        );
      }

      const vpRepairOpts = { blockCount: listicleBlockCount, format };
      const preserveBrowserVisualPrompts =
        scriptPhase === "full" &&
        isBrowserResponse &&
        browserVisualPromptsUsable(parsedData.visual_prompts, vpRepairOpts);
      if (preserveBrowserVisualPrompts) {
        console.log(
          "[Creator Script] Modo navegador fase 2 — preservando visual_prompts do Gemini Browser."
        );
      }

      if (
        scriptPhase === "full" &&
        approvedNarration &&
        existingStrategy &&
        Object.keys(existingStrategy).length
      ) {
        parsedData.strategy = {
          ...existingStrategy,
          ...(parsedData.strategy || {}),
        };
      }

      if (isListicle && !parsedData.listicle) {
        parsedData.listicle = {
          content_mode: "LISTICLE",
          rank_count: listicleRank,
          rank_order: rankOrder === "asc" ? "asc" : "desc",
          topic: listicleTopic,
          hud_style: ["compact", "full", "auto"].includes(listicleHudStyle)
            ? listicleHudStyle
            : listicleRank > 8
              ? "compact"
              : "full",
        };
      } else if (isListicle && parsedData.listicle) {
        parsedData.listicle.hud_style = ["compact", "full", "auto"].includes(
          listicleHudStyle
        )
          ? listicleHudStyle
          : parsedData.listicle.hud_style ||
            (listicleRank > 8 ? "compact" : "full");
      }

      if (scriptPhase === "narration") {
        const extracted = extractNarrativeScriptFromRaw(responseText);
        if (
          extracted.length >
          String(parsedData.narrative_script || "").trim().length
        ) {
          parsedData.narrative_script = extracted;
        }
        const narrationLen = String(parsedData.narrative_script || "").trim()
          .length;
        if (
          isBrowserResponse &&
          narrationLen < 40 &&
          responseText.length < 400
        ) {
          failJobProgress(progressJobId, "Resposta do Gemini incompleta.");
          return activeRes.status(422).json({
            error:
              "Resposta do Gemini incompleta — o chat não terminou de responder.",
            details: `Narração capturada com apenas ${narrationLen} caracteres (${responseText.length} chars brutos). Use Capturar do Gemini no Lumiera.`,
            hint: "Recarregue a extensão Lumiera Gemini Bridge (v2.0.0+) com gemini.google.com aberto.",
          });
        }

        const hasNarracaoPro = !!loadNarracaoProGuidelines();
        const skipPostProcess =
          isBrowserResponse ||
          shouldOfferGeminiBrowser(settingsDir) ||
          hasNarracaoPro;
        if (skipPostProcess) {
          console.log(
            hasNarracaoPro
              ? "[NARRACAOPRO] Pulando humanização/enriquecimento extra pós-processo para preservar a narração original premium do Lumiera Script Master."
              : "[Creator Script] Modo navegador — pulando humanização/enriquecimento extra na fase narração."
          );
          if (hasNarracaoPro) {
            sendLog(
              "[NARRACAOPRO] Preservando a narração original premium baseada no NARRACAOPRO.md."
            );
          }
        }
        try {
          if (skipPostProcess) throw new Error("skip_humanize");
          report("humanize", "Humanizando narração…", 72);
          const repairPrompt = buildNarrationHumanizeRepairPrompt({
            format,
            ideaTitle: idea.title,
            narrative_script: parsedData.narrative_script,
            narrative_script_tagged: parsedData.narrative_script_tagged,
            blockCount: listicleBlockCount,
            isListicle,
            listicleRank,
            listTopic: listicleTopic,
          });
          const repairText = await callGeminiWithRetry(apiKey, repairPrompt, {
            temperature: 0.55,
            maxRetries: 2,
            models: [
              "gemini-3.5-flash",
              "gemini-2.5-flash",
              "gemini-2.0-flash",
            ],
          });
          const repaired = normalizeKeys(
            await parseAiJsonResponse(
              repairText,
              apiKey,
              "Humanizacao narracao"
            )
          );
          parsedData = mergeHumanizedNarration(parsedData, repaired, format);
          console.log(
            "[Creator Script] Humanização da narração (fase 1) aplicada."
          );
        } catch (repairErr) {
          if (repairErr.message !== "skip_humanize") {
            console.warn(
              "[Creator Script] Humanização da narração falhou, usando rascunho:",
              repairErr.message
            );
          }
        }

        parsedData = normalizeNarrationBlocks(parsedData, listicleBlockCount);

        let notebooklmEnriched = false;
        let notebooklmEnrichSummary = "";
        if (
          !skipPostProcess &&
          useNotebooklm !== false &&
          notebooklmResearch?.available &&
          !skipNotebooklmPending &&
          !notebooklmBriefDisk?.available &&
          !notebooklmContext &&
          String(parsedData.narrative_script || "").trim().length >= 40
        ) {
          try {
            report(
              "notebooklm_enrich",
              "Enriquecendo narração com NotebookLM…",
              82
            );
            console.log(
              "[NotebookLM] Enriquecendo narração do wizard (pós-rascunho)..."
            );
            const improveResearch = await fetchNotebooklmScriptImprovements({
              backendDir: __dirname,
              niche,
              format,
              narrativeScript: parsedData.narrative_script,
              projDir,
            });
            const enrichBlock = formatNotebooklmPromptBlock(
              improveResearch,
              "ENRIQUECIMENTO NOTEBOOKLM"
            );
            notebooklmEnrichSummary = improveResearch.summary || "";
            const enrichPrompt = buildNotebooklmNarrationEnrichPrompt({
              niche,
              format,
              ideaTitle: idea.title,
              rawScript: extractScriptSliceForRepair(parsedData),
              notebooklmBlock: enrichBlock || notebooklmContext,
              blockCount: listicleBlockCount,
              isListicle,
              listicleRank,
            });
            const enrichText = await callGeminiWithRetry(apiKey, enrichPrompt, {
              temperature: 0.55,
              maxRetries: 2,
              models: [
                "gemini-3.5-flash",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
              ],
            });
            const enriched = normalizeKeys(
              await parseAiJsonResponse(
                enrichText,
                apiKey,
                "Enriquecimento narracao NLM"
              )
            );
            parsedData = mergeEnrichedNarration(parsedData, enriched, format);
            parsedData = normalizeNarrationBlocks(
              parsedData,
              listicleBlockCount
            );
            notebooklmEnriched = true;
            console.log(
              "[Creator Script] Narração enriquecida com NotebookLM na fase 1."
            );
          } catch (enrichErr) {
            console.warn(
              "[Creator Script] Enriquecimento NotebookLM na narração falhou:",
              enrichErr.message
            );
          }
        }

        parsedData = await runAutomaticQualityRepairForStoryboard(parsedData, {
          format,
          idea,
          niche,
          apiKey,
          projectDir: llmDir,
          researchFacts: webResearchMeta?.facts || [],
          researchSources: webResearchMeta?.sources || [],
        });
        // O reparo automático pode substituir technical_config.script pelo texto
        // corrido. Refaça o contrato de blocos a partir da narração final aprovada.
        parsedData = normalizeNarrationBlocks(parsedData, listicleBlockCount);

        report(
          "auditoria",
          "[NARRACAOPRO] Auditando o texto final após todas as alterações…",
          85
        );
        let finalRepair = null;
        try {
          finalRepair = await repairNarrationThroughFinalAudit(parsedData, {
            format,
            idea,
            apiKey,
            projectDir: llmDir,
            report,
            expectedBlocks: listicleBlockCount,
            researchFacts: webResearchMeta?.facts || [],
            researchSources: webResearchMeta?.sources || [],
          });
        } catch (repairFatal) {
          console.error(
            "[NARRACAOPRO] finalRepair crash (continúa com soft-path):",
            repairFatal?.message || repairFatal
          );
          finalRepair = {
            storyboard: parsedData,
            approved: false,
            attempts: 0,
            audit: evaluateNarrationFinalAudit(parsedData, {
              format,
              idea,
              researchFacts: webResearchMeta?.facts || [],
              researchSources: webResearchMeta?.sources || [],
            }),
            failures: [repairFatal?.message || String(repairFatal)],
          };
        }
        parsedData = finalRepair?.storyboard || parsedData;
        // Defensivo: o loop de auditoria DEVE devolver audit; se não, reavalia in-place.
        let integrityAudit = finalRepair?.audit?.integrity;
        let editorialAudit = finalRepair?.audit?.editorial;
        let auditIssues = Array.isArray(finalRepair?.audit?.issues)
          ? finalRepair.audit.issues
          : [];
        let auditApproved =
          finalRepair?.approved === true ||
          finalRepair?.audit?.approved === true;
        if (!integrityAudit || !editorialAudit) {
          try {
            const fallbackAudit = evaluateNarrationFinalAudit(parsedData, {
              format,
              idea,
              researchFacts: webResearchMeta?.facts || [],
              researchSources: webResearchMeta?.sources || [],
            });
            integrityAudit = fallbackAudit?.integrity || integrityAudit;
            editorialAudit = fallbackAudit?.editorial || editorialAudit;
            auditIssues = fallbackAudit?.issues || auditIssues || [];
            if (!auditApproved) {
              auditApproved = fallbackAudit?.approved === true;
            }
          } catch (evalErr) {
            console.warn(
              "[NARRACAOPRO] fallback evaluate falhou:",
              evalErr?.message || evalErr
            );
            integrityAudit = integrityAudit || {
              ok: false,
              issues: [
                evalErr?.message || "Falha na auditoria de integridade.",
              ],
            };
            editorialAudit = editorialAudit || {
              ok: false,
              issues: [],
            };
          }
        }
        integrityAudit = safeAuditSlice(integrityAudit, "integrity");
        editorialAudit = safeAuditSlice(editorialAudit, "editorial");
        auditIssues = (
          auditIssues.length
            ? auditIssues
            : [
                ...(integrityAudit.issues || []),
                ...(editorialAudit.issues || []),
              ]
        ).filter(Boolean);

        // Soft-aprovação: NUNCA descarta narração longa gerada. A IA já tentou
        // reparar; o humano revisa no editor. Pipeline continua.
        let softApproved = false;
        if (
          !auditApproved &&
          narrationHasReviewableContent(parsedData, format)
        ) {
          softApproved = true;
          auditApproved = true;
          console.warn(
            `[NARRACAOPRO] Soft-aprovação para revisão humana após ${finalRepair?.attempts || 0} autorreparo(s). Issues: ${auditIssues.join(" | ") || "—"}`
          );
        }

        parsedData.narracao_pro_audit = {
          integrity: integrityAudit,
          editorial: editorialAudit,
          approved: auditApproved,
          soft_approval: softApproved,
          needs_human_review:
            softApproved || !integrityAudit.ok || !editorialAudit.ok,
          gate_issues: auditIssues,
          narrative_sha256: hashNarrationIntegrityText(
            parsedData.narrative_script
          ),
          audited_at: new Date().toISOString(),
          automatic_repair: parsedData.automatic_narration_repair,
        };
        if (
          auditApproved &&
          (finalRepair?.attempts || 0) > 0 &&
          !softApproved
        ) {
          report(
            "auditoria",
            `Narração corrigida e aprovada após ${finalRepair.attempts} autorreparo(s).`,
            92
          );
        }
        if (softApproved) {
          report(
            "auditoria",
            `Narração salva para sua revisão (${auditIssues.length} ponto(s) ainda abertos). A IA já tentou corrigir ${finalRepair?.attempts || 0} vez(es) — edite o que quiser no texto.`,
            92
          );
          appendProjectEventLog(projDir, {
            component: "narration",
            event: "narracao_pro_soft_approved",
            message:
              "Narração entregue com soft-aprovação para revisão humana (não bloqueou após autorreparo).",
            details: parsedData.narracao_pro_audit,
          });
        }
        // Só bloqueia de verdade se NÃO houver texto utilizável (vazio / lixo).
        if (!parsedData.narracao_pro_audit.approved) {
          const issues = auditIssues;
          const message = `Narração bloqueada pelo NARRACAOPRO: ${issues.join(" | ") || "texto ausente ou inválido"}`;
          console.warn(`[NARRACAOPRO] ${message}`);
          appendProjectEventLog(projDir, {
            component: "narration",
            event: "narracao_pro_blocked",
            message,
            details: parsedData.narracao_pro_audit,
          });
          failJobProgress(progressJobId, message);
          return activeRes.status(422).json({
            error: `Não foi possível gerar um texto de narração utilizável após ${finalRepair?.attempts || 0} autorreparo(s).`,
            details: issues,
            audit: parsedData.narracao_pro_audit,
            automaticRepairExhausted: true,
            automaticRepairAttempts: finalRepair?.attempts || 0,
            hint: "Confira a ideia/tese e a pesquisa; depois gere a narração de novo.",
          });
        }

        const storyboardPath = path.join(projDir, "storyboard.json");
        let existingStoryboard = {};
        if (fs.existsSync(storyboardPath)) {
          try {
            existingStoryboard = JSON.parse(
              fs.readFileSync(storyboardPath, "utf8")
            );
          } catch (e) {
            /* ignore corrupt file */
          }
        }
        const partialStoryboard = {
          ...(isHistoricalWitness
            ? {
                content_mode: "HISTORICAL_WITNESS",
                historical_witness: historicalWitness,
              }
            : {}),
          strategy: parsedData.strategy || {},
          narrative_script: parsedData.narrative_script || "",
          narrative_script_tagged: parsedData.narrative_script_tagged || "",
          technical_config: parsedData.technical_config || undefined,
          research_sources: webResearchMeta?.sources || [],
          research_facts: webResearchMeta?.facts || [],
          automatic_script_quality: parsedData.automatic_script_quality,
          automatic_script_repair: parsedData.automatic_script_repair,
          automatic_narration_repair: parsedData.automatic_narration_repair,
          notebooklm_enriched: notebooklmEnriched,
          notebooklm_enriched_at: notebooklmEnriched
            ? new Date().toISOString()
            : undefined,
          narracao_pro_trace: parsedData.narracao_pro_trace || undefined,
          narracao_pro_audit: parsedData.narracao_pro_audit,
          _creator_phase: "narration_pending",
        };

        report(
          "finalizado",
          "[NARRACAOPRO] Etapa 10: Narração finalizada e aprovada com sucesso!",
          94
        );
        await new Promise((r) => setTimeout(r, 600));

        report("save", "Salvando narração no projeto…", 100);
        try {
          saveNarracaoProTraceReport(projDir, parsedData);
        } catch (reportErr) {
          console.warn(
            "[NARRACAOPRO] Falha ao gravar relatório de trace:",
            reportErr.message
          );
        }
        fs.writeFileSync(
          storyboardPath,
          JSON.stringify(
            { ...existingStoryboard, ...partialStoryboard },
            null,
            2
          ),
          "utf8"
        );
        return activeRes.json({
          phase: "narration",
          project: safeProjectName,
          strategy: partialStoryboard.strategy,
          narrative_script: partialStoryboard.narrative_script,
          narrative_script_tagged: partialStoryboard.narrative_script_tagged,
          technical_config: partialStoryboard.technical_config,
          automatic_narration_repair:
            partialStoryboard.automatic_narration_repair,
          narracao_pro_audit: partialStoryboard.narracao_pro_audit,
          needs_human_review: Boolean(
            partialStoryboard.narracao_pro_audit?.needs_human_review
          ),
          soft_approval: Boolean(
            partialStoryboard.narracao_pro_audit?.soft_approval
          ),
          warnings: partialStoryboard.narracao_pro_audit?.gate_issues || [],
          notebooklm_enriched: notebooklmEnriched,
          notebooklm_summary: notebooklmEnrichSummary
            ? notebooklmEnrichSummary.slice(0, 500)
            : undefined,
        });
      }

      if (approvedNarration) {
        report("visual_prompts", "Montando prompts visuais e list_items…", 70);
        const approvedNarrationHash =
          hashNarrationIntegrityText(approvedNarration);
        const persistedStoryboard = readProjectJson(
          projDir,
          "storyboard.json",
          {}
        );
        let persistedAudit = persistedStoryboard.narracao_pro_audit;
        const persistedTrace = persistedStoryboard.narracao_pro_trace;
        if (!persistedTrace) {
          const message =
            "A narração não possui o relatório NARRACAOPRO necessário para validar o texto.";
          appendProjectEventLog(projDir, {
            component: "narration",
            event: "narracao_pro_legacy_bypass_blocked",
            message,
            details: {
              expected_hash: approvedNarrationHash,
              audited_hash: persistedAudit?.narrative_sha256 || null,
              audit_approved: persistedAudit?.approved === true,
              trace_present: Boolean(persistedTrace),
            },
          });
          failJobProgress(progressJobId, message);
          return activeRes.status(422).json({
            error: message,
            hint: "Gere novamente a fase de narração para criar o relatório de validação.",
          });
        }
        if (
          !persistedAudit?.approved ||
          persistedAudit.narrative_sha256 !== approvedNarrationHash
        ) {
          const editedIntegrityAudit = assessNarracaoProIntegrity({
            format,
            narrativeScript: approvedNarration,
            idea,
            trace: persistedTrace,
            researchFacts: persistedStoryboard.research_facts || [],
            researchSources: persistedStoryboard.research_sources || [],
          });
          const editedEditorialAudit = assessEditorialContract({
            format,
            narrativeScript: approvedNarration,
            strategy: existingStrategy || persistedStoryboard.strategy || {},
          });
          const allowBypass = Boolean(
            req.body?.forceApprove ||
            req.body?.bypassAudit ||
            req.body?.force_approve ||
            req.body?.ignoreAudit ||
            req.body?.allowFactOverflow ||
            req.body?.allow_fact_overflow
          );
          persistedAudit = {
            integrity: editedIntegrityAudit,
            editorial: editedEditorialAudit,
            approved:
              (editedIntegrityAudit.ok && editedEditorialAudit.ok) ||
              allowBypass,
            narrative_sha256: approvedNarrationHash,
            audited_at: new Date().toISOString(),
            user_edited: true,
            bypassed:
              allowBypass &&
              !(editedIntegrityAudit.ok && editedEditorialAudit.ok),
          };
          if (!persistedAudit.approved) {
            const issues = [
              ...editedIntegrityAudit.issues,
              ...editedEditorialAudit.issues,
            ].filter(Boolean);
            const issuesText =
              issues.join(" | ") || "auditoria editorial/factual";
            const message = `O texto editado precisa de ajustes antes de gerar o roteiro completo: ${issuesText}`;
            appendProjectEventLog(projDir, {
              component: "narration",
              event: "narracao_pro_user_edit_blocked",
              message,
              details: persistedAudit,
            });
            failJobProgress(progressJobId, message);
            return activeRes.status(422).json({
              error: message,
              details: issues,
              audit: persistedAudit,
              hint: "Corrija os pontos da auditoria (gancho, nº de frases, payoff, fontes) e aprove de novo. Dica: mantenha o gancho de abertura e pelo menos 4 frases no Short.",
            });
          }
          persistedStoryboard.narrative_script = approvedNarration;
          persistedStoryboard.narrative_script_tagged =
            approvedNarrationTagged || approvedNarration;
          persistedStoryboard.narracao_pro_audit = persistedAudit;
          fs.writeFileSync(
            path.join(projDir, "storyboard.json"),
            JSON.stringify(persistedStoryboard, null, 2),
            "utf8"
          );
          appendProjectEventLog(projDir, {
            component: "narration",
            event: "narracao_pro_user_edit_approved",
            message:
              "Texto editado pelo usuário foi re-auditado e aprovado para o roteiro completo.",
            details: persistedAudit,
          });
          console.log(
            "[NARRACAOPRO] Texto editado pelo usuário re-auditado e aprovado."
          );
        }
        parsedData.narracao_pro_trace = persistedTrace;
        parsedData.narracao_pro_audit = persistedAudit;
        parsedData.research_facts =
          persistedStoryboard.research_facts || parsedData.research_facts || [];
        parsedData.research_sources =
          persistedStoryboard.research_sources ||
          parsedData.research_sources ||
          [];
        parsedData.narrative_script = approvedNarration;
        parsedData.narration_integrity = {
          approved_text_sha256: approvedNarrationHash,
          approved_tagged_sha256: approvedNarrationTagged
            ? hashNarrationIntegrityText(approvedNarrationTagged)
            : null,
          locked: true,
          approved_at: new Date().toISOString(),
        };
        if (approvedNarrationTagged) {
          parsedData.narrative_script_tagged = approvedNarrationTagged;
        } else if (!parsedData.narrative_script_tagged?.trim()) {
          parsedData.narrative_script_tagged = approvedNarration;
        }

        if (
          !preserveBrowserVisualPrompts &&
          needsVisualPromptsRepair(parsedData, vpRepairOpts)
        ) {
          try {
            const vpRepairPrompt = buildVisualPromptsFromNarrationPrompt({
              approvedNarration,
              format,
              blockCount: listicleBlockCount,
              isListicle,
              listicleRank,
              listTopic: listicleTopic,
              rankOrder: rankOrder || "desc",
              ideaTitle: idea.title,
              existingPrompts: parsedData.visual_prompts || [],
              historicalWitness,
              enablePov: povPlacement.enabled,
              povPlacement,
              idea,
              niche,
            });
            const vpRepairText = await callGeminiWithRetry(
              apiKey,
              vpRepairPrompt,
              {
                temperature: 0.6,
                maxRetries: 2,
                models: [
                  "gemini-3.5-flash",
                  "gemini-2.5-flash",
                  "gemini-2.0-flash",
                ],
              }
            );
            const vpRepaired = normalizeKeys(
              await parseAiJsonResponse(
                vpRepairText,
                apiKey,
                "Visual prompts fase 2"
              )
            );
            parsedData = mergeVisualPromptsRepair(parsedData, vpRepaired);
            parsedData.narrative_script = approvedNarration;
            if (approvedNarrationTagged)
              parsedData.narrative_script_tagged = approvedNarrationTagged;
            console.log(
              `[Creator Script] visual_prompts reparados na fase 2 (${parsedData.visual_prompts?.length || 0} cenas).`
            );
          } catch (vpRepairErr) {
            console.warn(
              "[Creator Script] Falha ao reparar visual_prompts na fase 2:",
              vpRepairErr.message
            );
          }
        }

        parsedData = normalizeVisualPromptBlocks(parsedData, {
          blockCount: listicleBlockCount,
          format,
          ideaTitle: idea.title,
          skipPromptEnrichment: preserveBrowserVisualPrompts,
        });

        if (
          !preserveBrowserVisualPrompts &&
          needsVisualPromptsRepair(parsedData, vpRepairOpts)
        ) {
          const deterministic = buildDeterministicVisualPromptsFromNarration(
            approvedNarration,
            {
              blockCount: listicleBlockCount,
              format,
              ideaTitle: idea.title,
            }
          );
          if (deterministic.length) {
            // Try AI-based batch prompt generation before using static glossary fallback
            try {
              const batchPrompt = buildBatchScenePromptsAiRequest(
                deterministic,
                {
                  ideaTitle: idea.title,
                  historicalWitness,
                  visualAssetStyle,
                  visualMapOnly,
                }
              );
              const batchText = await callGeminiWithRetry(apiKey, batchPrompt, {
                temperature: 0.7,
                maxRetries: 2,
                models: [
                  "gemini-3.5-flash",
                  "gemini-2.5-flash",
                  "gemini-2.0-flash",
                ],
              });
              const batchParsed = await parseAiJsonResponse(
                batchText,
                apiKey,
                "Batch scene prompts"
              );
              const aiEnhanced = applyBatchScenePromptsAiResponse(
                deterministic,
                Array.isArray(batchParsed)
                  ? batchParsed
                  : batchParsed?.scenes || []
              );
              parsedData.visual_prompts = aiEnhanced;
              console.log(
                `[Creator Script] visual_prompts fallback IA batch (${aiEnhanced.length} cenas com prompts cinematográficos).`
              );
            } catch (batchErr) {
              console.warn(
                "[Creator Script] Fallback IA batch falhou, usando determinístico:",
                batchErr.message
              );
              parsedData.visual_prompts = deterministic;
            }
            parsedData.narrative_script = approvedNarration;
            if (approvedNarrationTagged)
              parsedData.narrative_script_tagged = approvedNarrationTagged;
            if (!parsedData.technical_config?.script) {
              parsedData.technical_config = {
                ...(parsedData.technical_config || {}),
                script: approvedNarration,
                block_phrases: parsedData.technical_config?.block_phrases || [],
                impact_texts: parsedData.technical_config?.impact_texts || [],
                highlight_keywords:
                  parsedData.technical_config?.highlight_keywords || [],
                bgm_mappings: parsedData.technical_config?.bgm_mappings || [],
              };
            }
            console.log(
              `[Creator Script] visual_prompts fallback final (${parsedData.visual_prompts.length} cenas).`
            );
          }
        }
      } else {
        const hasNarracaoPro = !!loadNarracaoProGuidelines();
        if (hasNarracaoPro) {
          console.log(
            "[NARRACAOPRO] Pulando humanização secundária no roteiro de passo único para preservar a narração original premium do Lumiera Script Master."
          );
        } else {
          try {
            const blockCount = listicleBlockCount;
            const repairPrompt = buildHumanizeRepairPrompt({
              format,
              ideaTitle: idea.title,
              rawScript: extractScriptSliceForRepair(parsedData),
              blockCount,
            });
            const repairText = await callGeminiWithRetry(apiKey, repairPrompt, {
              temperature: 0.55,
              maxRetries: 2,
              models: [
                "gemini-3.5-flash",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
              ],
            });
            const repaired = normalizeKeys(
              await parseAiJsonResponse(
                repairText,
                apiKey,
                "Humanizacao roteiro"
              )
            );
            parsedData = mergeHumanizedScript(parsedData, repaired, format);
            console.log(
              "[Creator Script] Passagem de humanização/clareza aplicada."
            );
          } catch (repairErr) {
            console.warn(
              "[Creator Script] Humanização secundária falhou, usando rascunho:",
              repairErr.message
            );
          }
        }
      }

      parsedData = await runAutomaticQualityRepairForStoryboard(parsedData, {
        format,
        idea,
        niche,
        apiKey,
        projectDir: llmDir,
        researchFacts:
          webResearchMeta?.facts || parsedData.research_facts || [],
        researchSources:
          webResearchMeta?.sources || parsedData.research_sources || [],
      });

      parsedData = await enhanceCreatorStrategyTitles(parsedData, {
        transcript: parsedData.narrative_script || "",
        format,
        apiKey,
        ideaTitle: idea.title,
      });

      parsedData = await ensureScriptChecklist(parsedData, {
        format,
        niche,
        ideaTitle: idea.title,
        apiKey,
      });

      parsedData.editorial_quality = assessEditorialContract({
        format,
        narrativeScript: parsedData.narrative_script,
        strategy: parsedData.strategy,
      });
      const finalIntegrityAudit = assessNarracaoProIntegrity({
        format,
        narrativeScript: parsedData.narrative_script,
        idea,
        trace: parsedData.narracao_pro_trace,
        researchFacts:
          webResearchMeta?.facts || parsedData.research_facts || [],
        researchSources:
          webResearchMeta?.sources || parsedData.research_sources || [],
      });
      const editorialQ = safeAuditSlice(
        parsedData.editorial_quality,
        "editorial"
      );
      const integrityQ = safeAuditSlice(finalIntegrityAudit, "integrity");
      let fullApproved = integrityQ.ok === true && editorialQ.ok === true;
      const fullIssues = [
        ...(integrityQ.issues || []),
        ...(editorialQ.issues || []),
      ].filter(Boolean);
      let fullSoft = false;
      if (!fullApproved && narrationHasReviewableContent(parsedData, format)) {
        fullSoft = true;
        fullApproved = true;
        console.warn(
          `[NARRACAOPRO] Soft-aprovação do roteiro completo para revisão humana. Issues: ${fullIssues.join(" | ") || "—"}`
        );
      }
      parsedData.narracao_pro_audit = {
        integrity: integrityQ,
        editorial: editorialQ,
        approved: fullApproved,
        soft_approval: fullSoft,
        needs_human_review: fullSoft || !integrityQ.ok || !editorialQ.ok,
        gate_issues: fullIssues,
        narrative_sha256: hashNarrationIntegrityText(
          parsedData.narrative_script
        ),
        audited_at: new Date().toISOString(),
      };
      parsedData.editorial_quality = editorialQ;
      try {
        parsedData.narration_readiness = assessNarrationReadiness({
          format,
          narrativeScript: parsedData.narrative_script,
        });
      } catch {
        parsedData.narration_readiness = { ok: true, recommendations: [] };
      }
      if (!parsedData.narracao_pro_audit.approved) {
        const issues = fullIssues;
        const message = `Roteiro completo bloqueado pelo NARRACAOPRO: ${issues.join(" | ") || "texto ausente"}`;
        appendProjectEventLog(projDir, {
          component: "narration",
          event: "narracao_pro_full_script_blocked",
          message,
          details: parsedData.narracao_pro_audit,
        });
        failJobProgress(progressJobId, message);
        return activeRes.status(422).json({
          error:
            "O roteiro completo não produziu texto utilizável e não foi salvo.",
          details: issues,
          audit: parsedData.narracao_pro_audit,
        });
      }
      if (fullSoft) {
        report(
          "auditoria",
          `Roteiro salvo para sua revisão (${fullIssues.length} ponto(s) abertos). Continue e ajuste o texto no editor.`,
          94
        );
        appendProjectEventLog(projDir, {
          component: "narration",
          event: "narracao_pro_full_soft_approved",
          message:
            "Roteiro completo soft-aprovado para revisão humana (não bloqueou).",
          details: parsedData.narracao_pro_audit,
        });
      }

      parsedData = normalizeVisualPromptBlocks(parsedData, {
        blockCount: listicleBlockCount,
        format,
        ideaTitle: idea.title,
        skipPromptEnrichment: preserveBrowserVisualPrompts,
      });
      parsedData.visual_quality = assessVisualStoryboardReadiness({
        format,
        visualPrompts: parsedData.visual_prompts,
      });

      if (isListicle) {
        const repairConfig = {
          content_mode: "LISTICLE",
          rank_count: listicleRank,
          rank_order: rankOrder === "asc" ? "asc" : "desc",
          list_topic: listicleTopic,
          video_format: format,
          block_phrases: parsedData.technical_config?.block_phrases || [],
          niche,
        };
        if (needsListItemsRepair(repairConfig, parsedData)) {
          try {
            const repaired = await repairListItemsWithAI(
              parsedData,
              repairConfig,
              {
                apiKey,
                callGemini: (prompt, opts) =>
                  callGeminiWithRetry(apiKey, prompt, opts),
                parseJson: (text, label) =>
                  parseAiJsonResponse(text, apiKey, label),
                format,
              }
            );
            if (repaired.repaired) {
              parsedData = repaired.storyboard;
              console.log(
                `[Creator Script] list_items reparado pela IA (${repaired.count} itens).`
              );
            }
          } catch (repairListErr) {
            console.warn(
              "[Creator Script] Falha ao reparar list_items:",
              repairListErr.message
            );
          }
        }
      }

      if (webResearchMeta?.sources?.length) {
        parsedData.research_sources = webResearchMeta.sources;
      }
      if (webResearchMeta?.facts?.length) {
        parsedData.research_facts = webResearchMeta.facts;
      }
      if (notebooklmBriefDisk?.available) {
        parsedData = mergeBriefIntoStoryboard(parsedData, notebooklmBriefDisk);
      }

      // POV por último — depois de repair/fallback/normalize (senão tags somem)
      if (povPlacement.enabled) {
        parsedData.niche = parsedData.niche || niche;
        parsedData.idea = parsedData.idea || idea;
        parsedData = applyPovToStoryboard(parsedData, {
          enabled: true,
          blockIndex: povPlacement.blockIndex,
          totalBlocks: povPlacement.totalBlocks,
        });
        const povN = (parsedData.visual_prompts || []).filter(
          (vp) => vp?.is_pov === true
        ).length;
        sendLog(
          `[POV] Aplicado no storyboard final: bloco #${povPlacement.blockIndex}, ${povN} cena(s) VIDEO A/B (~20s).`
        );
        console.log(
          `[POV] Storyboard final: block=${povPlacement.blockIndex} povScenes=${povN} keyframes=${parsedData.pov?.keyframe_prompts?.length || 0}`
        );
      }

      parsedData.visual_prompts = finalizeGeneratedVisualPromptMedia(
        parsedData.visual_prompts,
        { format }
      );

      // Save full storyboard JSON

      const storyboardPath = path.join(projDir, "storyboard.json");

      try {
        saveNarracaoProTraceReport(projDir, parsedData);
      } catch (reportErr) {
        console.warn(
          "[NARRACAOPRO] Falha ao gravar relatório de trace no roteiro completo:",
          reportErr.message
        );
      }

      fs.writeFileSync(
        storyboardPath,
        JSON.stringify(parsedData, null, 2),
        "utf8"
      );

      let timelineAssets = {};
      try {
        if (motionTemplatePackRaw?.enabled) {
          const preConfigPath = path.join(projDir, "config_qanat.json");
          let preConfig = {};
          if (fs.existsSync(preConfigPath)) {
            try {
              preConfig = JSON.parse(fs.readFileSync(preConfigPath, "utf8"));
            } catch {
              /* ignore */
            }
          }
          preConfig.motion_template_pack = {
            enabled: true,
            niche: String(
              motionTemplatePackRaw.niche || niche || "Geral"
            ).trim(),
            template_ids: Array.isArray(motionTemplatePackRaw.template_ids)
              ? motionTemplatePackRaw.template_ids
              : [],
          };
          fs.writeFileSync(
            preConfigPath,
            JSON.stringify(preConfig, null, 2),
            "utf8"
          );
        }

        report("orchestrate", "Orquestrando Remotion + assets…", 88);
        const orchOpts = resolveCreatorOrchestrationOptions(req.body || {});
        const orch = await orchestrateProduction(
          projDir,
          {
            workspaceDir: WORKSPACE_DIR,
            callGemini: (p, prompt, opts) =>
              callGeminiWithRetry(getApiKey(p), prompt, opts),
            getApiKey,
            parseAiJson: parseAiJsonResponse,
          },
          orchOpts
        );
        const merged = applyOrchestrationToStoryboard(
          parsedData,
          orch,
          timelineAssets
        );
        if (merged.orch) {
          parsedData = merged.storyboard;
          parsedData.visual_prompts = finalizeGeneratedVisualPromptMedia(
            parsedData.visual_prompts,
            { format }
          );
          timelineAssets = merged.timelineAssets;
          fs.writeFileSync(
            storyboardPath,
            JSON.stringify(parsedData, null, 2),
            "utf8"
          );
          console.log(
            `[Creator Script] Produção orquestrada: ${merged.orch.motion_count || 0} Remotion · QC ${merged.orch.quality?.score ?? "—"} · satélite ${merged.orch.satellite?.enriched ?? 0} · ok=${merged.orch.orchestration_ok}`
          );
        }
      } catch (orchErr) {
        console.warn(
          "[Creator Script] Orquestração de produção (não bloqueante):",
          orchErr.message
        );
      }

      if (approvedNarration) {
        const approvedHash = hashNarrationIntegrityText(approvedNarration);
        const changedByPipeline =
          hashNarrationIntegrityText(parsedData.narrative_script || "") !==
          approvedHash;
        parsedData.narrative_script = approvedNarration;
        parsedData.narrative_script_tagged =
          approvedNarrationTagged || approvedNarration;
        parsedData.technical_config = {
          ...(parsedData.technical_config || {}),
          script: approvedNarration,
        };
        parsedData.narration_integrity = {
          ...(parsedData.narration_integrity || {}),
          approved_text_sha256: approvedHash,
          approved_tagged_sha256: approvedNarrationTagged
            ? hashNarrationIntegrityText(approvedNarrationTagged)
            : null,
          locked: true,
          pipeline_restored_approved_text: changedByPipeline,
          verified_at: new Date().toISOString(),
        };
        fs.writeFileSync(
          storyboardPath,
          JSON.stringify(parsedData, null, 2),
          "utf8"
        );
        if (changedByPipeline) {
          console.warn(
            "[Narration Integrity] Uma etapa posterior tentou alterar a narração; o texto aprovado foi restaurado."
          );
        }
      }

      // Save technical configurations to active project directory

      const transcriptPath = path.join(projDir, "transcripts_readable.txt");

      let scriptText = parsedData.technical_config?.script;

      if (Array.isArray(scriptText)) {
        scriptText = scriptText.join("\n\n");
      } else if (typeof scriptText !== "string") {
        scriptText = String(scriptText || "");
      }

      fs.writeFileSync(transcriptPath, scriptText, "utf8");

      const configPath = path.join(projDir, "config_qanat.json");

      let currentConfig = {};

      if (fs.existsSync(configPath)) {
        try {
          currentConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
        } catch (e) {}
      }

      let newConfig = {
        ...currentConfig,
        niche: niche || currentConfig.niche || "Geral",
        highlight_keywords:
          parsedData.technical_config?.highlight_keywords ||
          currentConfig.highlight_keywords ||
          [],
        impact_texts:
          parsedData.technical_config?.impact_texts ||
          currentConfig.impact_texts ||
          [],
        block_phrases:
          parsedData.technical_config?.block_phrases ||
          currentConfig.block_phrases ||
          [],
        timeline_assets: timelineAssets,
        aspect_ratio: isShort ? "9:16" : "16:9",
        video_format: format,
        motion_template_pack:
          motionTemplatePackRaw?.enabled === false
            ? { enabled: false }
            : motionTemplatePackRaw?.enabled
              ? {
                  enabled: true,
                  niche: String(
                    motionTemplatePackRaw.niche || niche || "Geral"
                  ).trim(),
                  template_ids: Array.isArray(
                    motionTemplatePackRaw.template_ids
                  )
                    ? motionTemplatePackRaw.template_ids
                    : [],
                }
              : undefined,
        ...(isListicle
          ? {
              content_mode: "LISTICLE",
              rank_count: listicleRank,
              rank_order: rankOrder === "asc" ? "asc" : "desc",
              list_topic: listicleTopic,
              listicle_hud_style: ["compact", "full", "auto"].includes(
                listicleHudStyle
              )
                ? listicleHudStyle
                : listicleRank > 8
                  ? "compact"
                  : "full",
            }
          : {}),
        ...(isHistoricalWitness
          ? {
              content_mode: "HISTORICAL_WITNESS",
              historical_witness: historicalWitness,
            }
          : {}),
      };

      const presetApplied = applyDocumentaryHistoryPreset(
        newConfig,
        parsedData,
        newConfig.niche
      );
      if (presetApplied.applied) {
        newConfig = presetApplied.config;
        console.log(
          "[Creator Script] Preset Documentário História aplicado ao config."
        );
      }

      const estDuration =
        Number(parsedData?.technical_config?.estimated_duration) ||
        Number(currentConfig?.estimated_duration) ||
        0;
      newConfig = applyBgmProductionDefaults(newConfig, estDuration);

      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf8");

      report(
        "auditoria",
        "[NARRACAOPRO] Etapa 9: Executando Auditoria Factual e de Narração Oral final...",
        85
      );
      await new Promise((r) => setTimeout(r, 600));

      report(
        "finalizado",
        "[NARRACAOPRO] Etapa 10: Roteiro e Narração finalizados com sucesso!",
        96
      );
      await new Promise((r) => setTimeout(r, 600));

      report("save", "Salvando roteiro final…", 100);

      // Shotcraft: tag scene_function + suggested_shot (Oficina Autoral / script)
      try {
        const scriptFmt =
          String(format || newConfig?.video_format || "LONGO").toUpperCase() ===
            "SHORTS" || String(format || "").toUpperCase() === "SHORT"
            ? "9:16"
            : "16:9";
        if (parsedData?.visual_prompts) {
          parsedData = tagStoryboardWithMotion(parsedData, {
            format: scriptFmt,
            niche:
              req.body?.niche ||
              newConfig?.niche ||
              parsedData?.strategy?.niche ||
              "",
          });
          const sbPath = path.join(projDir, "storyboard.json");
          if (fs.existsSync(sbPath)) {
            fs.writeFileSync(
              sbPath,
              JSON.stringify(parsedData, null, 2),
              "utf8"
            );
          }
        }
      } catch (tagErr) {
        console.warn("[Creator Script] motion tag:", tagErr?.message || tagErr);
      }

      activeRes.json(parsedData);
    } catch (err) {
      failJobProgress(progressJobId, err.message);
      console.error("Erro no endpoint /api/ai/creator/script:", err);

      if (responseText) {
        console.error(
          "Raw responseText returned from Gemini was:\n",
          responseText
        );
      }

      if (!progressJobId || activeRes === res) {
        activeRes.status(500).json({
          error: "Erro ao gerar roteiro e estratégia",
          details: err.message,
          hint: /json|JSON|válido/i.test(String(err.message || ""))
            ? "A resposta do Gemini pode ter vindo truncada. Tente de novo ou desative o modo navegador."
            : undefined,
        });
      } else {
        setJobProgress(progressJobId, {
          result: {
            error: "Erro ao gerar roteiro e estratégia",
            details: err.message,
          },
          done: true,
          awaitingBrowser: false,
        });
      }
    }
  })
);

app.post(
  "/api/ai/creator/repair-visual-prompts",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const storyboardPath = path.join(projDir, "storyboard.json");
    if (!fs.existsSync(storyboardPath)) {
      return res
        .status(404)
        .json({ error: "Storyboard não encontrado para este projeto." });
    }

    try {
      let storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      const approvedNarration = String(
        storyboard.narrative_script || ""
      ).trim();
      if (!approvedNarration) {
        return res.status(400).json({
          error:
            "Não há narrative_script no storyboard para distribuir nas cenas.",
        });
      }

      const config = readProjectJson(projDir, "config_qanat.json", {});
      const isListicle =
        config.content_mode === "LISTICLE" ||
        storyboard.listicle?.content_mode === "LISTICLE";
      const format = config.video_format || "LONGO";
      const listicleRank =
        config.rank_count || storyboard.listicle?.rank_count || 3;
      const blockCount = isListicle
        ? resolveListicleBlockCount({ rankCount: listicleRank, format })
        : format === "SHORTS"
          ? 5
          : 12;

      const vpRepairPrompt = buildVisualPromptsFromNarrationPrompt({
        approvedNarration,
        format,
        blockCount,
        isListicle,
        listicleRank,
        listTopic: config.list_topic || storyboard.listicle?.topic || "",
        rankOrder:
          config.rank_order || storyboard.listicle?.rank_order || "desc",
        ideaTitle: storyboard.strategy?.title_main || config.niche || "Vídeo",
        existingPrompts: storyboard.visual_prompts || [],
      });
      const vpRepairText = await callGeminiLlm(req, res, projDir, {
        title: "Reparar prompts visuais",
        prompt: vpRepairPrompt,
        temperature: 0.6,
      });
      if (vpRepairText == null) return;

      const vpRepaired = normalizeKeys(
        await parseAiJsonResponse(
          vpRepairText,
          extractBrowserResponse(req.body) ? null : getApiKey(projDir),
          "Repair visual prompts"
        )
      );
      storyboard = mergeVisualPromptsRepair(storyboard, vpRepaired);
      storyboard.narrative_script = approvedNarration;
      storyboard = normalizeVisualPromptBlocks(storyboard, {
        blockCount,
        format,
        ideaTitle: config.niche || storyboard.strategy?.title_main || "Vídeo",
      });

      fs.writeFileSync(
        storyboardPath,
        JSON.stringify(storyboard, null, 2),
        "utf8"
      );

      let scriptText = storyboard.technical_config?.script;
      if (Array.isArray(scriptText)) scriptText = scriptText.join("\n\n");
      if (typeof scriptText === "string" && scriptText.trim()) {
        fs.writeFileSync(
          path.join(projDir, "transcripts_readable.txt"),
          scriptText,
          "utf8"
        );
      }

      if (storyboard.technical_config?.block_phrases?.length) {
        const configPath = path.join(projDir, "config_qanat.json");
        let currentConfig = config;
        currentConfig.block_phrases = storyboard.technical_config.block_phrases;
        if (storyboard.technical_config.impact_texts) {
          currentConfig.impact_texts = storyboard.technical_config.impact_texts;
        }
        if (storyboard.technical_config.highlight_keywords) {
          currentConfig.highlight_keywords =
            storyboard.technical_config.highlight_keywords;
        }
        fs.writeFileSync(
          configPath,
          JSON.stringify(currentConfig, null, 2),
          "utf8"
        );
      }

      console.log(
        `[Creator Repair] visual_prompts reparados (${storyboard.visual_prompts?.length || 0} cenas).`
      );
      res.json(storyboard);
    } catch (err) {
      console.error("Erro em /api/ai/creator/repair-visual-prompts:", err);
      res.status(500).json({
        error: "Erro ao reparar cenas do roteiro",
        details: err.message,
      });
    }
  })
);

// --- Visual Prompt Engineer PRO (premium reprocessing) ---
app.post(
  "/api/ai/creator/enhance-visual-prompts",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const storyboardPath = path.join(projDir, "storyboard.json");
    const progressJobId = normalizeJobId(req.body?.progress_job_id);
    const report = createProgressReporter(progressJobId);

    if (!fs.existsSync(storyboardPath)) {
      if (progressJobId)
        failJobProgress(progressJobId, "Storyboard não encontrado.");
      return res
        .status(404)
        .json({ error: "Storyboard não encontrado para este projeto." });
    }

    let activeRes = res;
    if (progressJobId) {
      res.json({ started: true, jobId: progressJobId });
      activeRes = createProgressJobResponse(progressJobId);
    }

    try {
      report("vpe_prepare", "Engenharia Visual PRO: carregando storyboard…", 6);

      let storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      const prevSnapshot = JSON.parse(JSON.stringify(storyboard));
      const narrative = String(storyboard.narrative_script || "").trim();
      if (!narrative) {
        const msg = "Não há narrative_script no storyboard.";
        if (progressJobId) failJobProgress(progressJobId, msg);
        else if (!res.headersSent) return res.status(400).json({ error: msg });
        return;
      }
      if (
        !Array.isArray(storyboard.visual_prompts) ||
        storyboard.visual_prompts.length === 0
      ) {
        const msg = "Não há visual_prompts no storyboard para reprocessar.";
        if (progressJobId) failJobProgress(progressJobId, msg);
        else if (!res.headersSent) return res.status(400).json({ error: msg });
        return;
      }

      const config = readProjectJson(projDir, "config_qanat.json", {});
      const format = config.video_format || "LONGO";
      const isListicle =
        config.content_mode === "LISTICLE" ||
        storyboard.listicle?.content_mode === "LISTICLE";
      const listicleRank =
        config.rank_count || storyboard.listicle?.rank_count || 0;
      const rankOrder =
        config.rank_order || storyboard.listicle?.rank_order || "desc";
      const visualAssetStyle =
        req.body?.visualAssetStyle ||
        req.body?.visual_asset_style ||
        config.visual_asset_style ||
        storyboard.visual_asset_style ||
        storyboard.technical_config?.visual_asset_style ||
        "photorealistic";
      const visualMapOnly = Boolean(
        config.visual_map_only_prompts ??
        storyboard.visual_map_only_prompts ??
        storyboard.technical_config?.visual_map_only_prompts
      );

      const nicheHint =
        req.body?.niche ||
        config.niche ||
        storyboard.strategy?.niche ||
        storyboard.niche ||
        "";
      const skillsAddendum = buildStudioAgentsPromptAddendum(WORKSPACE_DIR, {
        niche: nicheHint || "Geral",
        task: "visual-prompt",
        format,
        maxSkills: 4,
      });

      let { systemPrompt, userPrompt, detectedNiche, identityBrief } =
        buildVisualPromptEngineerRequest(storyboard, {
          format,
          isListicle,
          listicleRank,
          rankOrder,
          visualAssetStyle,
          mapOnly: visualMapOnly,
          nicheHint,
          skillsAddendum,
        });
      // Garantia: skills do estúdio no system prompt (idempotente se já veio no request)
      if (
        skillsAddendum &&
        !String(systemPrompt).includes("SKILLS DO ESTÚDIO")
      ) {
        systemPrompt = injectStudioAgentsContext(systemPrompt, WORKSPACE_DIR, {
          niche: detectedNiche || nicheHint || "Geral",
          task: "visual-prompt",
          format,
        });
      }

      const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
      const sceneCount = storyboard.visual_prompts.length;
      const geminiKeys = getApiKeys(projDir);
      const apiKey = geminiKeys[0] || getApiKey(projDir);

      report("vpe_llm", `Gemini reprocessando ${sceneCount} cena(s)…`, 22);

      const responseText = await callGeminiLlm(req, activeRes, projDir, {
        title: "✨ Engenharia Visual PRO",
        prompt: fullPrompt,
        temperature: 0.7,
        // Engenharia Visual PRO tenta o modelo Pro primeiro; Flash é fallback de quota.
        models: [
          "gemini-2.5-pro",
          "gemini-3.5-flash",
          "gemini-2.5-flash",
          "gemini-2.0-flash",
        ],
      });
      if (responseText == null) return;

      report("vpe_parse", "Validando JSON e aplicando engenharia visual…", 68);

      const isBrowserResponse = !!extractBrowserResponse(req.body);
      const parsed = normalizeKeys(
        await parseAiJsonResponse(
          responseText,
          isBrowserResponse ? null : apiKey,
          "Visual Prompt Engineer PRO"
        )
      );

      if (
        Array.isArray(parsed.visual_prompts) &&
        parsed.visual_prompts.length > 0
      ) {
        let enhancedVisualPrompts = parsed.visual_prompts;
        const sparseVideoPrompts = enhancedVisualPrompts.filter(
          (vp) =>
            !assessCinematicVideoPromptDetail(
              vp?.prompt || "",
              vp?.type || vp?.media_mode || ""
            ).ok
        );

        if (sparseVideoPrompts.length > 0) {
          report(
            "vpe_detail_repair",
            `Refazendo ${sparseVideoPrompts.length} prompt(s) de vídeo sem detalhe suficiente…`,
            76
          );
          try {
            const repairText = await callGeminiLlm(req, activeRes, projDir, {
              title: "✨ Engenharia Visual PRO — detalhe cinematográfico",
              prompt: buildCinematicVideoPromptRepairPrompt({
                visualPrompts: sparseVideoPrompts,
                format,
                visualAssetStyle,
              }),
              temperature: 0.55,
              models: [
                "gemini-2.5-pro",
                "gemini-3.5-flash",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
              ],
            });
            if (repairText != null) {
              const repairedPayload = normalizeKeys(
                await parseAiJsonResponse(
                  repairText,
                  isBrowserResponse ? null : apiKey,
                  "Visual Prompt Engineer PRO — detalhe cinematográfico"
                )
              );
              const repairedList = Array.isArray(repairedPayload)
                ? repairedPayload
                : repairedPayload?.visual_prompts;
              const repairedByScene = new Map(
                (Array.isArray(repairedList) ? repairedList : [])
                  .filter((vp) => vp?.scene && vp?.prompt)
                  .map((vp) => [String(vp.scene), vp])
              );
              enhancedVisualPrompts = enhancedVisualPrompts.map((vp) => {
                const repaired = repairedByScene.get(String(vp?.scene || ""));
                if (!repaired) return vp;
                const before = assessCinematicVideoPromptDetail(
                  vp?.prompt || "",
                  vp?.type || vp?.media_mode || ""
                );
                const after = assessCinematicVideoPromptDetail(
                  repaired.prompt || "",
                  vp?.type || vp?.media_mode || ""
                );
                if (!after.ok && after.wordCount <= before.wordCount) return vp;
                return { ...vp, ...repaired, type: vp.type || repaired.type };
              });
            }
          } catch (detailRepairErr) {
            console.warn(
              "[VPE PRO] Reparo de detalhe cinematográfico não bloqueante:",
              detailRepairErr.message
            );
          }
        }

        const remainingSparse = enhancedVisualPrompts.filter(
          (vp) =>
            !assessCinematicVideoPromptDetail(
              vp?.prompt || "",
              vp?.type || vp?.media_mode || ""
            ).ok
        );
        parsed.checklist = {
          ...(parsed.checklist || {}),
          cinematic_video_detail_gate: {
            ok: remainingSparse.length === 0,
            repaired_count: sparseVideoPrompts.length - remainingSparse.length,
            remaining_sparse_scenes: remainingSparse
              .map((vp) => String(vp?.scene || ""))
              .filter(Boolean),
          },
        };
        storyboard.visual_prompts = enhancedVisualPrompts;
      } else {
        throw new Error(
          "Gemini não retornou visual_prompts válidos. Tente de novo."
        );
      }
      storyboard.narrative_script = narrative;

      if (parsed.checklist) {
        storyboard._vpe_checklist = parsed.checklist;
      }
      if (parsed.style_adaptation_notes) {
        storyboard._vpe_style_notes = parsed.style_adaptation_notes;
      }
      if (
        parsed.visual_identity &&
        typeof parsed.visual_identity === "object"
      ) {
        storyboard.visual_identity = parsed.visual_identity;
        storyboard._vpe_visual_identity = parsed.visual_identity;
      }

      const vps = storyboard.visual_prompts || [];
      const prevSnapshotVps = prevSnapshot.visual_prompts || [];
      const expectedBlocks = isListicle
        ? resolveListicleBlockCount({ rankCount: listicleRank, format })
        : format === "SHORTS"
          ? 5
          : 12;
      // Preserva a narração original, durações e flags POV
      // Mapear LLM visual_prompts por chave de cena para casar perfeitamente com prevSnapshotVps
      const vpsBySceneKey = new Map();
      for (const vpItem of vps) {
        const k = String(vpItem.scene ?? vpItem.cena ?? "").trim();
        if (k) vpsBySceneKey.set(k, vpItem);
      }
      storyboard.visual_prompts = prevSnapshotVps.map((prev, index) => {
        const prevSceneStr = String(
          prev.scene ?? `${prev.block || 1}.${index + 1}`
        ).trim();
        let vp = vpsBySceneKey.get(prevSceneStr) || vps[index] || {};
        const block =
          prev?.block ??
          parseBlockNumber(vp.block ?? vp.bloco, vp.scene ?? vp.cena) ??
          Math.min(
            expectedBlocks,
            Math.floor((index * expectedBlocks) / Math.max(vps.length, 1)) + 1
          );
        const scene = prev?.scene ?? (prevSceneStr || `${block}.${index + 1}`);
        const identityTags = Array.isArray(vp.identity_tags)
          ? vp.identity_tags
              .map((tag) => String(tag || "").trim())
              .filter(Boolean)
              .slice(0, 8)
          : undefined;
        const narrativeJob = String(vp.narrative_job || "")
          .trim()
          .toLowerCase();
        const visualHook = String(vp.visual_hook || "").trim();
        return {
          ...prev, // Mantém dados originais como narration_text, duration_seconds, etc
          ...vp, // Aplica as novidades geradas pelo Gemini
          ...(prev
            ? {
                // Força restauração de chaves vitais e medições do Whisper
                scene: prev.scene || scene || vp.scene,
                block: prev.block ?? block ?? vp.block,
                narration_text: prev.narration_text || vp.narration_text || "",
                narration_excerpt:
                  prev.narration_excerpt || vp.narration_excerpt || "",
                duration_seconds: prev.duration_seconds ?? vp.duration_seconds,
                word_transcripts: prev.word_transcripts || vp.word_transcripts,
                audio_start: prev.audio_start ?? vp.audio_start,
                audio_end: prev.audio_end ?? vp.audio_end,
                is_pov: prev.is_pov ?? vp.is_pov,
                scene_kind: prev.scene_kind || vp.scene_kind,
                video_role: prev.video_role || vp.video_role,
                pov_pair_id: prev.pov_pair_id || vp.pov_pair_id,
                use_source_audio: prev.use_source_audio,
                no_channel_narration: prev.no_channel_narration,
                volume: prev.volume,
                pov_image_prompts:
                  prev.pov_image_prompts || vp.pov_image_prompts,
                seedance_refs: {
                  ...(prev.seedance_refs || {}),
                  ...(vp.seedance_refs || {}),
                },
              }
            : {}),
          prompt: enforceVisualLocalizedTextRule(
            enforceNarrativeMaterialFidelity(vp.prompt || "", {
              narration: (prev ? prev.narration_text : vp.narration_text) || "",
              narrativeScript: narrative,
            }),
            {
              allowDiegeticText: vp.diegetic_text_required === true,
              mediaType: vp.type || vp.media_mode || "",
              format,
            }
          ),
          aspect_ratio:
            format === "SHORTS" || format === "SHORT" ? "9:16" : "16:9",
          ...(narrativeJob
            ? {
                narrative_job: [
                  "prove",
                  "reveal",
                  "contrast",
                  "explain",
                  "feel",
                ].includes(narrativeJob)
                  ? narrativeJob
                  : narrativeJob.slice(0, 32),
              }
            : {}),
          ...(visualHook ? { visual_hook: visualHook.slice(0, 180) } : {}),
          ...(identityTags?.length ? { identity_tags: identityTags } : {}),
          block,
          scene,
        };
      });
      // Aplica estilo visual + modo mapas do projeto
      storyboard.visual_asset_style = visualAssetStyle;
      storyboard.visual_map_only_prompts = visualMapOnly;
      storyboard.visual_prompts = applyProjectVisualAssetStyleToPrompts(
        storyboard.visual_prompts,
        visualAssetStyle,
        { mapOnly: visualMapOnly }
      );
      if (identityBrief && typeof identityBrief === "object") {
        storyboard.visual_identity = {
          ...(storyboard.visual_identity || {}),
          asset_style: identityBrief.visual_asset_style,
          asset_style_label: identityBrief.visual_asset_style_label,
          map_only_prompts: visualMapOnly,
          look:
            storyboard.visual_identity?.look ||
            identityBrief.look ||
            identityBrief.palette_and_light,
        };
      }
      // Recalcula stock_query a partir do prompt específico da cena (não genérico)
      try {
        const { resolveStockSearchQuery } =
          await import("./stockSearchQuery.js");
        storyboard.visual_prompts = storyboard.visual_prompts.map((vp) => ({
          ...vp,
          stock_query: resolveStockSearchQuery(vp, {
            strategyTitle: storyboard.strategy?.title_main || "",
            projectTitle: storyboard.strategy?.title_main || "",
            niche: detectedNiche || nicheHint || "",
            preferSceneStockQuery: true,
          }),
        }));
      } catch (stockErr) {
        console.warn("[VPE PRO] stock_query refresh:", stockErr.message);
      }
      storyboard.visual_prompts = ensureNarrationCoverage(
        storyboard.visual_prompts,
        {
          narrativeScript: narrative,
          ideaTitle: storyboard.strategy?.title_main || "",
        }
      );
      storyboard.visual_prompts = finalizeGeneratedVisualPromptMedia(
        storyboard.visual_prompts,
        { format }
      );

      // Reaplica POV se o projeto tinha bloco POV (VPE costuma apagar tags)
      const povMeta = storyboard.pov || prevSnapshot.pov;
      if (povMeta?.enabled || povMeta?.block) {
        storyboard = applyPovToStoryboard(storyboard, {
          enabled: true,
          blockIndex: Number(povMeta.block) || 2,
          totalBlocks:
            Number(povMeta.total_blocks) ||
            expectedBlocks ||
            (format === "SHORTS" ? 5 : 12),
        });
        console.log(
          `[VPE PRO] POV reaplicado no bloco #${storyboard.pov?.block} (${(storyboard.visual_prompts || []).filter((v) => v.is_pov).length} cenas).`
        );
      }

      // Shotcraft: motion plan automático pós-VPE
      try {
        const { ensureShotcraftOnStoryboard } =
          await import("./motionDirector.js");
        const shotFmt =
          format === "SHORTS" || format === "SHORT" ? "9:16" : "16:9";
        const shotcraft = ensureShotcraftOnStoryboard(storyboard, {
          niche:
            detectedNiche ||
            nicheHint ||
            config.niche ||
            storyboard.strategy?.niche ||
            "",
          format: shotFmt,
        });
        storyboard = shotcraft.storyboard;
        console.log(
          `[VPE PRO] Shotcraft plan: ${shotcraft.plan?.cenas?.filter((c) => c.motion_shot).length || 0}/${shotcraft.plan?.cenas?.length || 0} cenas com motion_shot`
        );
      } catch (shotErr) {
        console.warn(
          "[VPE PRO] Shotcraft motion plan (não bloqueante):",
          shotErr?.message || shotErr
        );
      }

      report("vpe_save", "Salvando storyboard aprimorado…", 92);

      fs.writeFileSync(
        storyboardPath,
        JSON.stringify(storyboard, null, 2),
        "utf8"
      );

      try {
        report("vpe_orchestrate", "Orquestrando Remotion + mapas…", 94);
        const orchOpts = resolveCreatorOrchestrationOptions(req.body || {});
        const orch = await orchestrateProduction(
          projDir,
          {
            workspaceDir: WORKSPACE_DIR,
            callGemini: (p, prompt, opts) =>
              callGeminiWithRetry(getApiKey(p), prompt, opts),
            getApiKey,
            parseAiJson: parseAiJsonResponse,
          },
          orchOpts
        );
        const merged = applyOrchestrationToStoryboard(storyboard, orch);
        if (merged.orch) {
          storyboard = merged.storyboard;
          storyboard.visual_prompts = finalizeGeneratedVisualPromptMedia(
            storyboard.visual_prompts,
            { format }
          );
          console.log(
            `[VPE PRO] Produção orquestrada: ${merged.orch.motion_count || 0} Remotion · QC ${merged.orch.quality?.score ?? "—"} · ok=${merged.orch.orchestration_ok}`
          );
        }
      } catch (orchErr) {
        console.warn(
          "[VPE PRO] Orquestração de produção (não bloqueante):",
          orchErr.message
        );
      }

      console.log(
        `[VPE PRO] visual_prompts enhanced (${storyboard.visual_prompts?.length || 0} cenas, nicho: ${detectedNiche}, score: ${parsed.checklist?.quality_score || "N/A"}).`
      );

      if (progressJobId) {
        finishJobProgressWithResult(
          progressJobId,
          storyboard,
          `Engenharia Visual PRO — ${storyboard.visual_prompts.length} cenas`
        );
        return;
      }

      if (!res.headersSent) res.json(storyboard);
    } catch (err) {
      console.error("Erro em /api/ai/creator/enhance-visual-prompts:", err);
      if (progressJobId) {
        failJobProgress(progressJobId, err.message);
        return;
      }
      if (!res.headersSent) {
        res.status(500).json({
          error: "Erro ao aprimorar prompts visuais",
          details: err.message,
        });
      }
    }
  })
);

// --- Seedance Directing (Fase 1): directing_brief + refs por papel antes do visual_prompt ---
app.post(
  "/api/ai/creator/compile-directing-briefs",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const storyboardPath = path.join(projDir, "storyboard.json");
    if (!fs.existsSync(storyboardPath)) {
      return res
        .status(404)
        .json({ error: "Storyboard não encontrado para este projeto." });
    }

    try {
      let storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      const narrative = String(storyboard.narrative_script || "").trim();
      if (!narrative) {
        return res
          .status(400)
          .json({ error: "Não há narrative_script no storyboard." });
      }
      if (
        !Array.isArray(storyboard.visual_prompts) ||
        storyboard.visual_prompts.length === 0
      ) {
        return res
          .status(400)
          .json({ error: "Não há visual_prompts no storyboard." });
      }

      const config = readProjectJson(projDir, "config_qanat.json", {});
      const format = config.video_format || "LONGO";
      const rawIndices = req.body?.scene_indices ?? req.body?.sceneIndices;
      const sceneIndices = Array.isArray(rawIndices)
        ? rawIndices.map((n) => Number(n)).filter((n) => Number.isFinite(n))
        : null;

      const { systemPrompt, userPrompt, detectedNiche } =
        buildSeedanceDirectingRequest(storyboard, {
          format,
          sceneIndices,
        });

      const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
      const responseText = await callGeminiLlm(req, res, projDir, {
        title: "🎬 Seedance Directing",
        prompt: fullPrompt,
        temperature: 0.65,
      });
      if (responseText == null) return;

      const isBrowserResponse = !!extractBrowserResponse(req.body);
      const parsed = normalizeKeys(
        await parseAiJsonResponse(
          responseText,
          isBrowserResponse
            ? null
            : getApiKey(projDir) || getApiKey(settingsDir),
          "Seedance Directing"
        )
      );

      storyboard = applySeedanceDirectingResponse(storyboard, parsed);
      storyboard.narrative_script = narrative;

      fs.writeFileSync(
        storyboardPath,
        JSON.stringify(storyboard, null, 2),
        "utf8"
      );

      const count =
        sceneIndices?.length || storyboard.visual_prompts?.length || 0;
      console.log(
        `[Seedance Directing] briefs compilados (${count} cenas, nicho: ${detectedNiche}).`
      );
      res.json(storyboard);
    } catch (err) {
      console.error("Erro em /api/ai/creator/compile-directing-briefs:", err);
      res.status(500).json({
        error: "Erro ao compilar directing briefs",
        details: err.message,
      });
    }
  })
);

// --- Seedance T2V (Fase 2): geração de vídeo IA com directing e referências ---
app.post(
  "/api/ai/creator/generate-seedance-t2v",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const storyboardPath = path.join(projDir, "storyboard.json");
    if (!fs.existsSync(storyboardPath)) {
      return res
        .status(404)
        .json({ error: "Storyboard não encontrado para este projeto." });
    }

    try {
      let storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      const config = readProjectJson(projDir, "config_qanat.json", {});
      const rawIndices = req.body?.scene_indices ?? req.body?.sceneIndices;
      const sceneIndices = Array.isArray(rawIndices)
        ? rawIndices.map((n) => Number(n)).filter((n) => Number.isFinite(n))
        : null;
      const reqProvider = String(
        req.body?.provider || "mobilewan"
      ).toLowerCase();
      const provider = reqProvider === "seedance" ? "seedance" : "mobilewan";
      const wait = Boolean(req.body?.wait);

      if (provider === "seedance") {
        const apiCfg = loadSeedanceApiConfig(projDir);
        if (!apiCfg.enabled) {
          return res.status(400).json({
            error:
              "API Seedance desabilitada. Use provider: 'mobilewan' ou ative seedance_api.enabled em config_qanat.json.",
          });
        }
      }

      const result = await generateSeedanceScenes({
        projDir,
        storyboard,
        config,
        sceneIndices,
        provider,
        wait,
      });

      if (wait) {
        fs.writeFileSync(
          storyboardPath,
          JSON.stringify(result.storyboard, null, 2),
          "utf8"
        );
      }

      const videoSceneCount = listVideoIaSceneIndices(
        storyboard.visual_prompts || []
      ).length;
      console.log(
        `[Seedance T2V] ${result.jobs.length} job(s) enfileirado(s) — provider: ${provider}, vídeo IA total: ${videoSceneCount}`
      );
      res.json({
        provider,
        waited: wait,
        jobs: result.jobs,
        storyboard: wait ? result.storyboard : undefined,
        video_ia_scene_count: videoSceneCount,
      });
    } catch (err) {
      console.error("Erro em /api/ai/creator/generate-seedance-t2v:", err);
      res.status(500).json({
        error: "Erro ao gerar vídeo",
        details: err.message,
      });
    }
  })
);

app.post(
  "/api/ai/creator/attach-seedance-t2v",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const storyboardPath = path.join(projDir, "storyboard.json");
    if (!fs.existsSync(storyboardPath)) {
      return res
        .status(404)
        .json({ error: "Storyboard não encontrado para este projeto." });
    }

    try {
      const promptId = String(
        req.body?.prompt_id || req.body?.promptId || ""
      ).trim();
      const sceneIndex = Number(req.body?.scene_index ?? req.body?.sceneIndex);
      if (!promptId)
        return res.status(400).json({ error: "prompt_id obrigatório." });
      if (!Number.isFinite(sceneIndex) || sceneIndex < 0) {
        return res.status(400).json({ error: "scene_index inválido." });
      }

      let storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      const config = readProjectJson(projDir, "config_qanat.json", {});

      const result = await attachSeedanceT2vOutput(
        projDir,
        storyboard,
        config,
        sceneIndex,
        promptId
      );
      if (!result.ready) {
        return res.json({
          ready: false,
          status: result.status,
          progress: result.progress,
        });
      }

      res.json({
        ready: true,
        asset: result.asset,
        storyboard: result.storyboard,
        config: result.config,
        blockKey: result.blockKey,
        assetIdx: result.assetIdx,
        compiled_prompt: buildSeedanceT2vPrompt(
          result.storyboard.visual_prompts?.[sceneIndex]
        ),
        is_video_ia: isVideoIaScene(
          result.storyboard.visual_prompts?.[sceneIndex]
        ),
      });
    } catch (err) {
      console.error("Erro em /api/ai/creator/attach-seedance-t2v:", err);
      res
        .status(500)
        .json({ error: "Erro ao vincular vídeo gerado", details: err.message });
    }
  })
);

app.get(
  "/api/mobilewan/status",
  asyncHandler(async (req, res) => {
    res.json({
      available: isMobileWanAvailable(),
    });
  })
);

app.post(
  "/api/mobilewan/download",
  asyncHandler(async (req, res) => {
    const token = String(req.body?.token || "").trim();
    if (!token) {
      return res.status(400).json({ error: "Hugging Face token is required." });
    }
    const result = downloadMobileWanWeights(token);
    res.json(result);
  })
);

app.get("/api/ai/creator/seedance-t2v/preview-prompt", (req, res) => {
  const projDir = getProjectDir(req);
  const storyboardPath = path.join(projDir, "storyboard.json");
  if (!fs.existsSync(storyboardPath)) {
    return res.status(404).json({ error: "Storyboard não encontrado." });
  }
  try {
    const sceneIndex = Number(req.query?.scene_index ?? req.query?.sceneIndex);
    const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
    const vp = storyboard.visual_prompts?.[sceneIndex];
    if (!vp) return res.status(404).json({ error: "Cena não encontrada." });
    res.json({
      scene_index: sceneIndex,
      scene: vp.scene,
      is_video_ia: isVideoIaScene(vp),
      compiled_prompt: buildSeedanceT2vPrompt(vp),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/ai/creator/evaluate-checklist",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    const storyboardPath = path.join(projDir, "storyboard.json");
    if (!fs.existsSync(storyboardPath)) {
      return res
        .status(404)
        .json({ error: "Storyboard não encontrado para este projeto." });
    }

    try {
      let storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      const approvedNarration = String(
        storyboard.narrative_script || ""
      ).trim();
      if (!approvedNarration) {
        return res
          .status(400)
          .json({ error: "Não há narração no storyboard para avaliar." });
      }

      const config = readProjectJson(projDir, "config_qanat.json", {});
      const apiKey = getApiKey(projDir);
      const evalPrompt = buildScriptChecklistEvaluationPrompt({
        narrative_script: approvedNarration,
        strategy: storyboard.strategy || {},
        format: config.video_format || "SHORTS",
        ideaTitle: storyboard.strategy?.title_main || "",
        niche: config.niche || "",
      });

      const evalText = await callGeminiLlm(req, res, projDir, {
        title: "Avaliar checklist de qualidade",
        prompt: evalPrompt,
        temperature: 0.35,
      });
      if (evalText == null) return;

      const evaluated = normalizeKeys(
        await parseAiJsonResponse(
          evalText,
          extractBrowserResponse(req.body) ? null : apiKey,
          "Checklist qualidade"
        )
      );
      storyboard.checklist = normalizeScriptChecklist(evaluated?.checklist);

      fs.writeFileSync(
        storyboardPath,
        JSON.stringify(storyboard, null, 2),
        "utf8"
      );
      res.json(storyboard);
    } catch (err) {
      console.error("Erro em /api/ai/creator/evaluate-checklist:", err);
      res.status(500).json({
        error: "Erro ao avaliar checklist de qualidade",
        details: err.message,
      });
    }
  })
);

app.get("/api/notebooklm/status", (_req, res) => {
  try {
    res.json(getNotebooklmStatus(__dirname));
  } catch (err) {
    res.status(500).json({
      available: false,
      authenticated: false,
      notebookCount: 0,
      message: err.message,
      needsLogin: true,
    });
  }
});

app.get("/api/notebooklm/session", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const niche = String(req.query?.niche || "").trim() || "documentário";
    const session = loadNotebooklmSession({
      projDir,
      backendDir: __dirname,
      niche,
    });
    const brief = projDir ? loadNotebooklmBrief(projDir) : null;
    if (!session) {
      return res.json({
        ok: true,
        session: null,
        brief: brief?.available ? brief : null,
      });
    }
    res.json({
      ok: true,
      session,
      brief: brief?.available
        ? {
            path: brief.relativePath,
            status: brief.status,
            skip_web_research: brief.skipWebResearch,
            fact_count:
              brief.parsed?.factCount || brief.parsed?.facts?.length || 0,
            location_count: brief.parsed?.locations?.length || 0,
            evidence_count: brief.parsed?.evidence?.length || 0,
            evidence_readiness: brief.parsed?.evidenceReadiness || null,
            char_count: String(
              brief.parsed?.accumulated || brief.markdown || ""
            ).length,
            markdown_preview: String(brief.markdown || "").slice(0, 2000),
            checklist:
              brief.checklist || parsePipelineChecklist(brief.markdown || ""),
            pipeline_steps: NOTEBOOKLM_PIPELINE_STEPS,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/notebooklm/brief", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    if (!projDir) {
      return res.json({ ok: true, brief: null });
    }
    const brief = loadNotebooklmBrief(projDir);
    if (!brief.available) {
      return res.json({ ok: true, brief: null });
    }
    res.json({
      ok: true,
      brief: {
        path: brief.relativePath,
        status: brief.status,
        skip_web_research: brief.skipWebResearch,
        fact_count: brief.parsed?.factCount || brief.parsed?.facts?.length || 0,
        location_count: brief.parsed?.locations?.length || 0,
        evidence_count: brief.parsed?.evidence?.length || 0,
        evidence_readiness: brief.parsed?.evidenceReadiness || null,
        char_count: String(brief.parsed?.accumulated || brief.markdown || "")
          .length,
        markdown_preview: String(brief.markdown || "").slice(0, 2000),
        template_hints: brief.parsed?.templateHints || null,
        checklist:
          brief.checklist || parsePipelineChecklist(brief.markdown || ""),
        pipeline_steps: NOTEBOOKLM_PIPELINE_STEPS,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post(
  "/api/notebooklm/session/reply",
  asyncHandler(async (req, res) => {
    const progressJobId = normalizeJobId(req.body?.progress_job_id);
    const report = createProgressReporter(progressJobId);
    const projDir = getProjectDir(req);
    const niche = String(req.body?.niche || "documentário").trim();
    const userReply = String(req.body?.reply || "").trim();
    if (!userReply) {
      if (progressJobId) failJobProgress(progressJobId, "Resposta vazia.");
      return res.status(400).json({ error: "Resposta vazia." });
    }

    let activeRes = res;
    if (progressJobId) {
      report("notebooklm_reply", "Enviando resposta ao NotebookLM…", 12);
      res.json({ started: true, jobId: progressJobId });
      activeRes = createProgressJobResponse(progressJobId);
    }

    try {
      const { session, suggestProceed } = await handleNotebooklmSessionReply({
        projDir,
        backendDir: __dirname,
        niche,
        userReply,
        onProgress: report,
      });
      const brief = projDir ? loadNotebooklmBrief(projDir) : null;
      if (progressJobId) {
        report(
          session.awaitingUser ? "notebooklm_pending" : "notebooklm_ready",
          session.awaitingUser
            ? "NotebookLM aguarda sua resposta"
            : suggestProceed
              ? "Pronto — pode gerar a narração"
              : "Material NotebookLM atualizado",
          session.awaitingUser ? 22 : 92
        );
      }
      return activeRes.json({
        ok: true,
        session,
        suggest_proceed: Boolean(suggestProceed),
        brief: brief?.available ? brief : null,
      });
    } catch (err) {
      if (progressJobId) failJobProgress(progressJobId, err.message);
      return activeRes.status(500).json({ error: err.message });
    }
  })
);

app.post("/api/notebooklm/session/reset", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const niche = String(req.body?.niche || "documentário").trim();
    const force = req.body?.force === true;
    if (!shouldClearNotebooklmArtifacts(projDir, __dirname, niche, { force })) {
      const session = loadNotebooklmSession({
        projDir,
        backendDir: __dirname,
        niche,
      });
      const brief = projDir ? loadNotebooklmBrief(projDir) : null;
      return res.json({
        ok: true,
        preserved: true,
        message:
          "Progresso preservado no notebooklm_research_brief.md — use Prosseguir em vez de reiniciar.",
        session,
        brief: brief?.available ? brief : null,
      });
    }
    clearNotebooklmProjectArtifacts(projDir, __dirname, niche);
    res.json({ ok: true, preserved: false });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/notebooklm/session/finalize", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const niche = String(req.body?.niche || "documentário").trim();
    const format = String(req.body?.format || "SHORTS").trim();
    const session = closeNotebooklmSession({
      projDir,
      backendDir: __dirname,
      niche,
      format,
      project: projDir ? path.basename(projDir) : undefined,
    });
    if (!session) {
      return res
        .status(404)
        .json({ error: "Sessão NotebookLM não encontrada." });
    }
    const brief = projDir ? loadNotebooklmBrief(projDir) : null;
    res.json({
      ok: true,
      session,
      brief: brief?.available
        ? {
            path: brief.relativePath,
            status: brief.status,
            skip_web_research: brief.skipWebResearch,
            fact_count:
              brief.parsed?.factCount || brief.parsed?.facts?.length || 0,
            location_count: brief.parsed?.locations?.length || 0,
            evidence_count: brief.parsed?.evidence?.length || 0,
            evidence_readiness: brief.parsed?.evidenceReadiness || null,
            char_count: String(
              brief.parsed?.accumulated || brief.markdown || ""
            ).length,
            markdown_preview: String(brief.markdown || "").slice(0, 2000),
            checklist:
              brief.checklist || parsePipelineChecklist(brief.markdown || ""),
            pipeline_steps: NOTEBOOKLM_PIPELINE_STEPS,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/notebooklm/login/cancel", (_req, res) => {
  try {
    clearNotebooklmLoginState();
    res.json({
      success: true,
      status: getNotebooklmStatus(__dirname),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/notebooklm/login", (_req, res) => {
  try {
    const result = startNotebooklmLogin(__dirname);
    if (result.alreadyAuthenticated) {
      return res.json({
        success: true,
        alreadyAuthenticated: true,
        ...result.status,
      });
    }
    if (result.manualLoginRequired) {
      return res.json({
        success: true,
        manualLoginRequired: true,
        ...result,
        status: getNotebooklmStatus(__dirname),
      });
    }
    if (result.error) {
      return res.status(500).json({
        success: false,
        error: result.error,
        needsLogin: true,
      });
    }
    const status =
      result.started && !result.alreadyAuthenticated
        ? {
            available: false,
            authenticated: false,
            notebookCount: 0,
            loginInProgress: true,
            needsLogin: true,
            message: result.message || "Aguardando login no navegador…",
            dataDir: result.dataDir,
          }
        : getNotebooklmStatus(__dirname);
    res.json({
      success: true,
      ...result,
      status,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Falha ao iniciar login NotebookLM",
      needsLogin: true,
    });
  }
});

app.post(
  "/api/notebooklm/improve-script",
  asyncHandler(async (req, res) => {
    const projDir = getProjectDir(req);
    if (loadNarracaoProGuidelines()) {
      return res.status(409).json({
        error: "Reescrita pós-auditoria desativada pelo NARRACAOPRO.",
        hint: "Regere a narração pelo Lumiera Script Master para que pesquisa, trace e texto final sejam auditados juntos.",
      });
    }

    const {
      niche: nicheBody,
      format: formatBody,
      useNotebooklm,
    } = req.body || {};
    const storyboardPath = path.join(projDir, "storyboard.json");

    if (!fs.existsSync(storyboardPath)) {
      return res
        .status(404)
        .json({ error: "storyboard.json não encontrado neste projeto." });
    }

    let storyboard;
    try {
      storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Erro ao ler storyboard.json", details: err.message });
    }

    const narrativeScript = buildProjectTranscript({ storyboard });
    if (!narrativeScript || narrativeScript.length < 80) {
      return res.status(400).json({
        error:
          "Roteiro muito curto ou ausente. Gere ou edite a narração antes de enriquecer.",
      });
    }

    const configPath = path.join(projDir, "config_qanat.json");
    let projectConfig = {};
    if (fs.existsSync(configPath)) {
      try {
        projectConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      } catch {
        projectConfig = {};
      }
    }

    const niche = String(
      nicheBody ||
        storyboard?.strategy?.title_main ||
        storyboard?.listicle?.topic ||
        projectConfig.niche ||
        "documentário"
    ).trim();
    const format = formatBody === "SHORTS" ? "SHORTS" : "LONGO";
    const blockCount = Array.isArray(
      storyboard?.technical_config?.block_phrases
    )
      ? storyboard.technical_config.block_phrases.length
      : format === "SHORTS"
        ? 5
        : 12;

    let notebooklmResearch = null;
    let notebooklmBlock = "";

    if (useNotebooklm === true) {
      try {
        console.log("[NotebookLM] Analisando roteiro para melhorias...");
        notebooklmResearch = await fetchNotebooklmScriptImprovements({
          backendDir: __dirname,
          niche,
          format,
          narrativeScript,
          projDir,
        });
        notebooklmBlock = formatNotebooklmPromptBlock(
          notebooklmResearch,
          "SUGESTÕES NOTEBOOKLM"
        );
        if (!notebooklmBlock) {
          notebooklmBlock =
            "\n(Sem pesquisa NotebookLM disponível — aplique melhorias de clareza e retenção com base no roteiro.)\n";
        }
      } catch (err) {
        console.warn("[NotebookLM] Melhoria de roteiro falhou:", err.message);
        notebooklmBlock = `\n(Pesquisa NotebookLM indisponível: ${err.message})\n`;
      }
    } else {
      notebooklmBlock =
        "\n(NotebookLM desativado — melhore clareza, ganchos e naturalidade com base no roteiro.)\n";
    }

    try {
      const improvePrompt = buildNotebooklmImproveApplyPrompt({
        niche,
        format,
        rawScript: extractScriptSliceForRepair(storyboard),
        notebooklmBlock,
        blockCount,
      });

      const responseText = await callGeminiLlm(req, res, projDir, {
        title: "Enriquecer roteiro (NotebookLM)",
        prompt: improvePrompt,
        temperature: 0.6,
      });
      if (responseText == null) return;

      const repaired = normalizeKeys(
        await parseAiJsonResponse(
          responseText,
          extractBrowserResponse(req.body) ? null : getApiKey(projDir),
          "Enriquecer roteiro"
        )
      );
      const improved = mergeHumanizedScript(storyboard, repaired, format);

      fs.writeFileSync(
        storyboardPath,
        JSON.stringify(improved, null, 2),
        "utf8"
      );

      const transcriptPath = path.join(projDir, "transcripts_readable.txt");
      let scriptText = improved.technical_config?.script;
      if (Array.isArray(scriptText)) scriptText = scriptText.join("\n\n");
      if (typeof scriptText === "string" && scriptText.trim()) {
        fs.writeFileSync(transcriptPath, scriptText, "utf8");
      }

      return res.json({
        success: true,
        storyboard: improved,
        notebooklm: notebooklmResearch || {
          available: false,
          fallback: true,
          summary: "",
        },
        suggestions: notebooklmResearch?.summary || "",
      });
    } catch (err) {
      console.error("[NotebookLM] Erro ao aplicar melhorias:", err);
      return res
        .status(500)
        .json({ error: "Erro ao enriquecer roteiro", details: err.message });
    }
  })
);

// API: Improve narration draft inline (wizard — before approving and distributing to blocks)
app.post(
  "/api/notebooklm/improve-narration-draft",
  asyncHandler(async (req, res) => {
    const {
      narrativeScript: narrativeScriptRaw,
      narrativeScriptTagged: narrativeScriptTaggedRaw,
      niche: nicheRaw,
      format: formatRaw,
      blockCount: blockCountRaw,
      useNotebooklm,
      ideaTitle,
      isListicle,
      listicleRank,
      contentMode,
      historicalWitness,
    } = req.body || {};

    const narrativeScript = String(narrativeScriptRaw || "").trim();
    if (narrativeScript.length < 40) {
      return res.status(400).json({
        error: "A narração precisa ter ao menos 40 caracteres para melhorar.",
      });
    }

    const niche = String(nicheRaw || "documentário").trim();
    const format = formatRaw === "SHORTS" ? "SHORTS" : "LONGO";
    const blockCount = Number(blockCountRaw) || (format === "SHORTS" ? 5 : 12);

    // Use any available project dir for API key resolution
    const projDir = getProjectDir(req);
    if (loadNarracaoProGuidelines()) {
      return res.status(409).json({
        error: "Melhoria isolada de narração desativada pelo NARRACAOPRO.",
        hint: "Uma reescrita isolada quebraria o vínculo entre fatos, trace e texto auditado. Regere a fase de narração completa.",
      });
    }

    // NotebookLM research
    let notebooklmResearch = null;
    let notebooklmBlock = "";

    let notebooklmAccumulated = String(
      req.body?.notebooklmAccumulated || ""
    ).trim();
    const notebooklmBriefDisk = projDir ? loadNotebooklmBrief(projDir) : null;
    if (!notebooklmAccumulated && notebooklmBriefDisk?.available) {
      const briefAccum = String(
        notebooklmBriefDisk.parsed?.accumulated || ""
      ).trim();
      if (briefAccum) notebooklmAccumulated = briefAccum;
    }

    if (notebooklmAccumulated) {
      if (notebooklmBriefDisk?.available) {
        notebooklmBlock = formatNotebooklmBriefPromptBlock(
          notebooklmBriefDisk,
          format,
          "BRIEF NOTEBOOKLM (MELHORAR NARRAÇÃO)"
        );
      }
      if (!notebooklmBlock) {
        notebooklmBlock = formatNotebooklmPromptBlock(
          {
            available: true,
            summary: notebooklmAccumulated,
            fallback: false,
          },
          "SUGESTÕES NOTEBOOKLM"
        );
      }
    } else if (useNotebooklm !== false) {
      try {
        console.log(
          "[NotebookLM] Analisando draft de narração para melhorias (wizard)..."
        );
        notebooklmResearch = await fetchNotebooklmScriptImprovements({
          backendDir: __dirname,
          niche,
          format,
          narrativeScript,
          projDir,
        });
        if (notebooklmResearch?.awaitingUser) {
          const session = persistNotebooklmResearchSession({
            research: notebooklmResearch,
            niche,
            format,
            purpose: "improve",
            projDir,
            backendDir: __dirname,
          });
          return res.json({
            phase: "notebooklm_pending",
            notebooklm_session: session,
            notebooklm_brief:
              session.notebooklm_brief_path || NOTEBOOKLM_BRIEF_FILENAME,
            message: notebooklmResearch.summary,
            questions: session.questions || [],
          });
        }
        notebooklmBlock = formatNotebooklmPromptBlock(
          notebooklmResearch,
          "SUGESTÕES NOTEBOOKLM"
        );
        if (!notebooklmBlock) {
          notebooklmBlock =
            "\n(Sem pesquisa NotebookLM disponível — aplique melhorias de clareza e retenção com base no roteiro.)\n";
        }
      } catch (err) {
        console.warn("[NotebookLM] Melhoria de draft falhou:", err.message);
        notebooklmBlock = `\n(Pesquisa NotebookLM indisponível: ${err.message})\n`;
      }
    } else if (notebooklmBriefDisk?.available) {
      notebooklmBlock = formatNotebooklmBriefPromptBlock(
        notebooklmBriefDisk,
        format,
        "BRIEF NOTEBOOKLM (MELHORAR NARRAÇÃO)"
      );
    } else {
      notebooklmBlock =
        "\n(NotebookLM desativado — melhore clareza, ganchos e naturalidade com base no roteiro.)\n";
    }

    try {
      const rawScript = {
        narrative_script: narrativeScript,
        narrative_script_tagged:
          String(narrativeScriptTaggedRaw || "").trim() || narrativeScript,
      };

      const improvePromptBase = buildNotebooklmNarrationEnrichPrompt({
        niche,
        format,
        ideaTitle: ideaTitle || niche,
        rawScript,
        notebooklmBlock,
        blockCount,
        isListicle: Boolean(isListicle),
        listicleRank: Number(listicleRank) || 20,
      });
      const improvePrompt = `${improvePromptBase}\n${
        contentMode === "HISTORICAL_WITNESS"
          ? buildHistoricalWitnessContractBlock(historicalWitness)
          : ""
      }`;

      const responseText = await callGeminiLlm(req, res, projDir, {
        title: "Melhorar narração draft (NotebookLM)",
        prompt: improvePrompt,
        temperature: 0.6,
      });
      if (responseText == null) return;

      const isBrowserResponse = !!extractBrowserResponse(req.body);
      let rawData;
      try {
        rawData = await parseAiJsonResponse(
          responseText,
          isBrowserResponse ? null : getApiKey(projDir),
          "Melhorar narração draft"
        );
      } catch (parseErr) {
        rawData = salvageScriptJson(responseText) || {};
        console.warn(
          "[NotebookLM] JSON inválido ao melhorar draft — salvage/fallback:",
          parseErr.message
        );
        if (!Object.keys(rawData).length) {
          throw parseErr;
        }
      }

      const parsed = normalizeKeys(rawData);

      console.log("[NotebookLM] Draft de narração melhorado com sucesso!");

      const notebooklmEnriched = Boolean(
        notebooklmResearch?.available && !notebooklmResearch?.fallback
      );
      let notebooklmReason = "pesquisa_ok";
      if (useNotebooklm === false) {
        notebooklmReason = "disabled";
      } else if (!notebooklmResearch) {
        notebooklmReason = "unavailable";
      } else if (notebooklmResearch.fallback || !notebooklmResearch.available) {
        notebooklmReason = notebooklmResearch.needsLogin
          ? "needs_login"
          : "fallback";
      }

      return res.json({
        success: true,
        ...(contentMode === "HISTORICAL_WITNESS"
          ? {
              content_mode: "HISTORICAL_WITNESS",
              historical_witness: historicalWitness,
            }
          : {}),
        narrative_script: parsed.narrative_script || narrativeScript,
        narrative_script_tagged:
          parsed.narrative_script_tagged || parsed.narrative_script || "",
        strategy: parsed.strategy || null,
        technical_config: parsed.technical_config || null,
        notebooklm_enriched: notebooklmEnriched,
        notebooklm_reason: notebooklmReason,
        suggestions: notebooklmResearch?.summary || "",
      });
    } catch (err) {
      console.error("[NotebookLM] Erro ao melhorar draft de narração:", err);
      return res
        .status(500)
        .json({ error: "Erro ao melhorar narração", details: err.message });
    }
  })
);

// API: Automap available files in ASSETS to script narrative blocks using Gemini

app.post("/api/ai/auto-map-assets", async (req, res) => {
  const projDir = getProjectDir(req);

  try {
    const autoConfigPath = path.join(projDir, "config_qanat.json");
    let autoConfig = {};
    if (fs.existsSync(autoConfigPath)) {
      autoConfig = JSON.parse(fs.readFileSync(autoConfigPath, "utf8"));
    }

    const mapEpoch = Number(autoConfig.timeline_map_epoch || 0);
    // Versões antigas incrementavam epoch antes do map: 1º auto-map rotacionava o pool em +1.
    const rotateOffset =
      mapEpoch === 1 && !autoConfig.timeline_map_epoch_v2 ? 0 : mapEpoch;
    const mapped = buildTimelineFromStoryboard(projDir, {
      remapping: true,
      rotateOffset,
    });

    const existingTimeline = autoConfig.timeline_assets || {};
    const assetFiles = listProjectMediaAssets(projDir);
    const storyboardForAlign = readProjectJson(projDir, "storyboard.json", {});
    const visualPromptsForMap = Array.isArray(storyboardForAlign.visual_prompts)
      ? storyboardForAlign.visual_prompts
      : [];
    const mergedTimeline = { ...mapped.timelineAssets };
    for (const blockKey of Object.keys(mergedTimeline)) {
      const blockNum = Number(blockKey);
      const blockScenes = visualPromptsForMap.filter(
        (vp) => Number(vp?.block) === blockNum
      );
      mergedTimeline[blockKey] = mergedTimeline[blockKey].map((asset, idx) => {
        const prev = (existingTimeline[blockKey] || [])[idx];
        const entry = { ...asset };
        delete entry.audio_start;
        delete entry.speech_end;
        delete entry.synced_to_speech;
        const sceneText = String(
          blockScenes[idx]?.narration_text ||
            blockScenes[idx]?.narration_excerpt ||
            ""
        ).trim();
        if (sceneText) entry.narration_segment = sceneText;
        if (!prev) return entry;
        if (prev.user_locked || prev.manual_asset) {
          if (prev.asset) entry.asset = prev.asset;
          entry.user_locked = true;
          entry.manual_asset = true;
          if (prev.type) entry.type = prev.type;
        }
        if (
          prev.fixed_locked &&
          prev.fixed !== undefined &&
          prev.fixed !== null
        ) {
          entry.fixed = prev.fixed;
          entry.fixed_locked = true;
        } else if (prev.fixed !== undefined && prev.fixed !== null) {
          entry.fixed = prev.fixed;
        }
        return entry;
      });
    }
    const sanitized = sanitizeFullTimelineAssets(mergedTimeline, assetFiles);
    autoConfig.timeline_assets = sanitized.timeline;
    if (sanitized.replaced > 0) {
      mapped.warnings.push(
        `${sanitized.replaced} duplicata(s) removida(s) após merge.`
      );
    }

    const wordTranscripts = readProjectJson(
      projDir,
      "word_transcripts.json",
      []
    );
    const flatWords = flattenWordTranscripts(wordTranscripts);
    const blockTimings = readProjectJson(projDir, "block_timings.json", {
      starts: [],
      durations: [],
    });
    const alignContext = {
      visualPrompts: visualPromptsForMap,
      blockPhrases: Array.isArray(autoConfig.block_phrases)
        ? autoConfig.block_phrases
        : [],
    };

    if (flatWords.length > 0) {
      const synced = syncProjectTimelineAfterWhisper({
        timelineAssets: autoConfig.timeline_assets,
        blockTimings,
        wordTranscripts,
        flatTranscriptWords: flatWords,
        ...alignContext,
        preserveExplicitFixed: false,
      });
      autoConfig.timeline_assets = synced.timelineAssets;
      if (synced.blockTimings?.starts?.length) {
        fs.writeFileSync(
          path.join(projDir, "block_timings.json"),
          JSON.stringify(synced.blockTimings, null, 2),
          "utf8"
        );
      }
    }

    autoConfig.timeline_map_epoch = mapEpoch + 1;
    autoConfig.timeline_map_epoch_v2 = true;

    fs.writeFileSync(
      autoConfigPath,
      JSON.stringify(autoConfig, null, 2),
      "utf8"
    );
    syncStoryboardAssetsFromTimeline(projDir);

    return res.json({
      success: true,

      timeline_assets: autoConfig.timeline_assets,

      asset_count: mapped.assetCount,

      warnings: mapped.warnings,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao mapear assets", details: err.message });
  }
});

// API: Run dynamic whisper transcription sync sequentially

app.get("/api/sync-timings", (req, res) => {
  const projDir = getProjectDir(req);

  res.setHeader("Content-Type", "text/event-stream");

  res.setHeader("Cache-Control", "no-cache");

  res.setHeader("Connection", "keep-alive");

  res.setHeader("X-Accel-Buffering", "no");

  res.flushHeaders();

  // Heartbeat to keep connection alive during long sync runs

  const heartbeat = setInterval(() => {
    res.write(":\n\n");
  }, 15000);

  let activeChild = null;

  const cleanup = () => {
    clearInterval(heartbeat);

    if (activeChild) {
      try {
        activeChild.kill();
      } catch (e) {}
    }
  };

  req.on("close", cleanup);

  const sendLog = (text) => {
    res.write(`data: ${JSON.stringify({ type: "log", text })}\n\n`);
  };

  sendLog(
    "[Dashboard] Iniciando Sincronização e Alinhamento por Transcrição..."
  );

  const narrationMp3 = path.join(projDir, "narracao_mestra_premium.mp3");
  if (!fs.existsSync(narrationMp3)) {
    sendLog(
      "[ERRO] narracao_mestra_premium.mp3 não encontrado. Gere a narração (TTS) antes de sincronizar."
    );
    res.write(`data: ${JSON.stringify({ type: "failed", code: 1 })}\n\n`);
    res.end();
    cleanup();
    return;
  }

  const syncConfig = readProjectJson(projDir, "config_qanat.json", {});
  const syncStoryboard = readProjectJson(projDir, "storyboard.json", {});
  if (isChunkedNarrationProject(syncConfig, syncStoryboard)) {
    try {
      const audit = readNarrationAudit(projDir);
      assertApprovedNarrationMasterReady(
        syncStoryboard.narration_chunk_plan || {},
        audit.events
      );
      sendLog("[Revisão] Todos os trechos aprovados; master atual confirmado.");
    } catch (err) {
      sendLog(`[BLOQUEADO] ${err?.message || String(err)}`);
      res.write(
        `data: ${JSON.stringify({ type: "failed", code: err?.code || "NARRATION_REVIEW_REQUIRED" })}\n\n`
      );
      res.end();
      cleanup();
      return;
    }
  }

  sendLog("[1/2] Executando análise do Whisper (find_block_timings.py)...");

  ensureFileExists("find_block_timings.py", projDir);

  ensureFileExists("align_transcripts.py", projDir);

  const child1 = spawn(PYTHON_PATH, ["find_block_timings.py"], {
    cwd: projDir,

    shell: true,

    env: buildPythonSpawnEnv(),
  });

  activeChild = child1;

  child1.stdout.on("data", (data) => {
    const text = data.toString().trim();

    if (text) {
      text.split(/\r?\n/).forEach((line) => sendLog(line));
    }
  });

  child1.stderr.on("data", (data) => {
    const text = data.toString().trim();

    if (text) {
      text.split(/\r?\n/).forEach((line) => sendLog(`[ERRO Whisper] ${line}`));
    }
  });

  child1.on("close", (code1) => {
    if (code1 !== 0) {
      res.write(`data: ${JSON.stringify({ type: "failed", code: code1 })}\n\n`);

      res.end();

      return;
    }

    sendLog(
      "\n[2/2] Gerando banco de palavras e alinhamento (align_transcripts.py)..."
    );

    const child2 = spawn(PYTHON_PATH, ["align_transcripts.py"], {
      cwd: projDir,

      shell: true,

      env: buildPythonSpawnEnv(),
    });

    activeChild = child2;

    child2.stdout.on("data", (data) => {
      const text = data.toString().trim();

      if (text) {
        text.split(/\r?\n/).forEach((line) => sendLog(line));
      }
    });

    child2.stderr.on("data", (data) => {
      const text = data.toString().trim();

      if (text) {
        text
          .split(/\r?\n/)
          .forEach((line) => sendLog(`[ERRO Alinhador] ${line}`));
      }
    });

    child2.on("close", (code2) => {
      activeChild = null;

      if (code2 === 0) {
        try {
          const configPath = path.join(projDir, "config_qanat.json");
          const storyboardPath = path.join(projDir, "storyboard.json");
          const timingsPath = path.join(projDir, "block_timings.json");
          const wordsPath = path.join(projDir, "word_transcripts.json");
          if (fs.existsSync(configPath) && fs.existsSync(wordsPath)) {
            const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
            const storyboard = fs.existsSync(storyboardPath)
              ? JSON.parse(fs.readFileSync(storyboardPath, "utf8"))
              : {};
            const wordTranscripts = JSON.parse(
              fs.readFileSync(wordsPath, "utf8")
            );
            const flatWords = flattenWordTranscripts(wordTranscripts);
            if (flatWords.length) {
              const chunkedApplied = applyChunkedTimelineAfterWhisper(projDir, {
                config: cfg,
                storyboard,
                wordTranscripts,
                flatWords,
              });
              if (chunkedApplied) {
                sendLog(
                  "[Pipeline] Narração por trechos: timings e timeline restaurados pelo plano de chunks."
                );
              } else {
                const synced = syncProjectTimelineAfterWhisper({
                  timelineAssets: cfg.timeline_assets || {},
                  blockTimings: fs.existsSync(timingsPath)
                    ? JSON.parse(fs.readFileSync(timingsPath, "utf8"))
                    : { starts: [], durations: [] },
                  wordTranscripts,
                  flatTranscriptWords: flatWords,
                  visualPrompts: Array.isArray(storyboard.visual_prompts)
                    ? storyboard.visual_prompts
                    : [],
                  blockPhrases: Array.isArray(cfg.block_phrases)
                    ? cfg.block_phrases
                    : [],
                  preserveExplicitFixed: false,
                });
                cfg.timeline_assets = synced.timelineAssets;
                fs.writeFileSync(
                  configPath,
                  JSON.stringify(cfg, null, 2),
                  "utf8"
                );
                if (synced.blockTimings?.starts?.length) {
                  fs.writeFileSync(
                    timingsPath,
                    JSON.stringify(synced.blockTimings, null, 2),
                    "utf8"
                  );
                }
                if (fs.existsSync(storyboardPath)) {
                  const storyboardNext = applyWhisperDurationsToStoryboard(
                    storyboard,
                    wordTranscripts,
                    {
                      flatTranscriptWords: flatWords,
                      blockTimings: synced.blockTimings,
                    }
                  );
                  fs.writeFileSync(
                    storyboardPath,
                    JSON.stringify(storyboardNext, null, 2),
                    "utf8"
                  );
                }
                sendLog(
                  "[Pipeline] Slots da timeline criados com segundos da voz (Whisper). Coloque os assets manualmente e salve."
                );
              }
            }
          }
        } catch (syncErr) {
          sendLog(
            `[AVISO] Falha ao sincronizar timeline pós-Whisper: ${syncErr.message}`
          );
        }

        try {
          const narrationSync = applyNarrationSyncToProject(projDir);
          if (narrationSync.changed || narrationSync.created) {
            sendLog(
              narrationSync.created
                ? "[Pipeline] timeline_studio.json criado com narração e legendas."
                : "[Pipeline] Narração e legendas sincronizadas com Editor de Timing."
            );
          }
        } catch (studioSyncErr) {
          sendLog(
            `[AVISO] Falha ao sincronizar narração no Timeline Studio: ${studioSyncErr.message}`
          );
        }

        res.write(
          `data: ${JSON.stringify({ type: "complete", code: code2 })}\n\n`
        );
      } else {
        res.write(
          `data: ${JSON.stringify({ type: "failed", code: code2 })}\n\n`
        );
      }

      cleanup();

      res.end();
    });
  });
});

let workflowApi = null;
workflowApi = registerWorkflowRoutes(app, {
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
});

registerProjectHealthRoutes(app, {
  WORKSPACE_DIR,
  getProjectDir,
  countActiveRenderJobs,
});

registerAssetCleanupRoutes(app, { getProjectDir });

registerTimelineStudioRoutes(app, {
  getProjectDir,
  getProjectContext: getRequestProjectContext,
  workspaceDir: WORKSPACE_DIR,
  callGemini: (projDir, prompt, opts) =>
    callGeminiWithRetry(getApiKey(projDir), prompt, opts),
});

registerMotionSceneRoutes(app, {
  getProjectDir,
  workspaceDir: WORKSPACE_DIR,
  callGemini: (projDir, prompt, opts) =>
    callGeminiWithRetry(getApiKey(projDir), prompt, opts),
  getApiKey,
  parseAiJson: parseAiJsonResponse,
});

registerMotionRoutes(app, {
  asyncHandler,
  fs,
  path,
  getProjectDir,
  readProjectJson,
});

registerSpecializedStoryboardImportRoute(app, { getProjectDir });

registerMotionFlyoverUploadRoute(app, { getProjectDir });

registerRemotionTemplateStudioRoutes(app, {
  getProjectDir,
  callGemini: (projDir, prompt, opts) =>
    callGeminiWithRetry(getApiKey(projDir), prompt, opts),
});

// Template Store (PostgreSQL) — Editor do Lumiera
app.use("/api/templates", templateRoutes);
registerYoutubeQualityGateRoutes(app, {
  workspaceDir: WORKSPACE_DIR,
  projectsRoot: PROJECTS_ROOT,
  getProjectDir,
  fixWithAi: async ({ projectDir, prompt }) => {
    const text = await callGeminiWithRetry(getApiKey(projectDir), prompt, {
      projectDir,
      temperature: 0.25,
      maxRetries: 3,
    });
    return parseAiJsonResponse(
      text,
      getApiKey(projectDir),
      "Correção automática do Quality Gate"
    );
  },
});

registerVideoResurrectorRoutes(app, {
  WORKSPACE_DIR,
  PROJECTS_ROOT,
  getApiKey,
  callGeminiWithRetry,
});

registerSocialPublishRoutes(app, {
  WORKSPACE_DIR,
  getProjectDir,
  resolveProjectDir: resolveProjectDirFromName,
  PYTHON_PATH,
  syncUploadScripts,
  runPostUploadHooks,
});

registerResearchRoutes(app, {
  WORKSPACE_DIR,
  BACKEND_DIR: __dirname,
  getApiKey,
  getApiKeys,
  getAiProvider,
  getGeminiModel,
  callGeminiWithRetry,
  callNvidiaWithRetry,
  NVIDIA_MODELS,
  getProjectDir,
});

registerTimesfmRoutes(app, {
  WORKSPACE_DIR,
  PROJECTS_ROOT,
  PYTHON_PATH,
  getApiKey,
  getApiKeys,
  getAiProvider,
  getGeminiModel,
  callGeminiWithRetry,
  callNvidiaWithRetry,
  NVIDIA_MODELS,
});

registerWhiteboardRoutes(app, {
  WORKSPACE_DIR,
  PROJECTS_ROOT,
  PYTHON_PATH,
  getApiKey,
  getApiKeys,
  getAiProvider,
  getGeminiModel,
  callGeminiWithRetry,
});

registerAgentReachRoutes(app, {
  WORKSPACE_DIR,
});

registerVideoMonitorRoutes(app, {
  WORKSPACE_DIR,
});

app.use("/api/creator-history", creatorHistoryRoutes);

// --- Global Express error middleware (última barreira antes de crash) ---
app.use((err, req, res, _next) => {
  safeConsoleError(`[Express Error] ${req.method} ${req.originalUrl}:`, err);
  appendCrashLog(
    "expressMiddleware",
    err instanceof Error
      ? err
      : new Error(`${req.method} ${req.originalUrl}: ${err}`)
  );
  if (!res.headersSent) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      route: `${req.method} ${req.originalUrl}`,
    });
  }
});

// API 404 sempre em JSON (evita HTML em fetch do dashboard)
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Serve frontend build static files in production (must be after API routes)

const frontendDist = path.join(__dirname, "../frontend/dist");

if (fs.existsSync(frontendDist)) {
  const frontendAssetsDir = path.join(frontendDist, "assets");
  if (fs.existsSync(frontendAssetsDir)) {
    app.use(
      "/assets",
      express.static(frontendAssetsDir, {
        fallthrough: false,
        setHeaders(res, filePath) {
          const base = path.basename(filePath);
          if (
            (base.startsWith("index-") && base.endsWith(".js")) ||
            base === "lumiera-deploy-boot.js"
          ) {
            res.setHeader(
              "Cache-Control",
              "no-cache, no-store, must-revalidate"
            );
            return;
          }
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      })
    );
  }

  app.use(
    express.static(frontendDist, {
      setHeaders(res, filePath) {
        if (
          filePath.endsWith("index.html") ||
          filePath.endsWith("sw.js") ||
          filePath.endsWith("lumiera-deploy-boot.js") ||
          filePath.endsWith(".webmanifest")
        ) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    })
  );

  app.get("*", (req, res) => {
    if (req.path.startsWith("/assets/")) {
      return res.status(404).type("text/plain").send("Asset not found");
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

const PORT = Number(process.env.PORT) || 3005;

// Init DB and start server
ensureCreatorHistoryDatabase().catch((err) =>
  console.error("Error initializing creator history DB:", err)
);

const server = app.listen(PORT, () => {
  console.log(`Backend Server running on ${LUMIERA_BACKEND_BASE}`);

  // Auto-start OmniRoute Local gateway asynchronously (Node spawn)
  setImmediate(async () => {
    try {
      let mjsPath = null;
      const usersDir = "C:\\Users";
      if (fs.existsSync(usersDir)) {
        const dirs = fs.readdirSync(usersDir);
        for (const d of dirs) {
          const candidate = path.join(
            usersDir,
            d,
            "AppData",
            "Roaming",
            "npm",
            "node_modules",
            "omniroute",
            "bin",
            "omniroute.mjs"
          );
          if (fs.existsSync(candidate)) {
            mjsPath = candidate;
            break;
          }
        }
      }

      if (!mjsPath) {
        const candidates = [
          "C:\\Program Files\\nodejs\\node_modules\\omniroute\\bin\\omniroute.mjs",
          path.join(
            process.env.APPDATA || "",
            "npm",
            "node_modules",
            "omniroute",
            "bin",
            "omniroute.mjs"
          ),
        ];
        for (const c of candidates) {
          if (c && fs.existsSync(c)) {
            mjsPath = c;
            break;
          }
        }
      }

      if (!mjsPath) {
        console.log(
          "[OmniRoute] Módulo omniroute.mjs não localizado. Auto-start ignorado."
        );
        return;
      }

      console.log(`[OmniRoute] Iniciando local gateway via Node: ${mjsPath}`);

      const logDir = path.join(__dirname, "..", "..", ".lumiera-logs");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Kill stale OmniRoute process from previous run using saved PID
      const pidFile = path.join(logDir, "omniroute.pid");
      try {
        if (fs.existsSync(pidFile)) {
          const oldPid = parseInt(fs.readFileSync(pidFile, "utf8").trim(), 10);
          if (oldPid > 0) {
            try {
              process.kill(oldPid, "SIGTERM");
            } catch {}
            // Give it a moment to release the port
            await new Promise((r) => setTimeout(r, 1500));
            try {
              process.kill(oldPid, "SIGKILL");
            } catch {}
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      } catch {}

      // Check if port 20128 is already listening
      const net = await import("net");
      const checkPort = new Promise((resolve) => {
        const client = new net.Socket();
        client.setTimeout(500);
        client.on("connect", () => {
          client.destroy();
          resolve(true);
        });
        client.on("timeout", () => {
          client.destroy();
          resolve(false);
        });
        client.on("error", () => {
          client.destroy();
          resolve(false);
        });
        client.connect(20128, "127.0.0.1");
      });

      checkPort.then((inUse) => {
        if (inUse) {
          console.log("[OmniRoute] Gateway já ativo na porta 20128.");
          return;
        }

        const outLog = fs.openSync(path.join(logDir, "omniroute.log"), "w");
        const errLog = fs.openSync(
          path.join(logDir, "omniroute-stderr.log"),
          "w"
        );

        const child = spawn(process.execPath, [mjsPath], {
          detached: true,
          stdio: ["ignore", outLog, errLog],
          windowsHide: true,
          cwd: path.dirname(mjsPath),
        });

        fs.writeFileSync(pidFile, String(child.pid), "utf8");
        child.unref();
        console.log(`[OmniRoute] Processo disparado! PID=${child.pid}`);
      });
    } catch (e) {
      console.warn(
        "[OmniRoute] Falha ao tentar disparar auto-start:",
        e.message
      );
    }
  });

  // NotebookLM + schedulers rodam fora do callback — health responde na hora.
  setImmediate(() => {
    try {
      const nlmQuick = getNotebooklmStatus(__dirname, {
        quick: true,
        refresh: true,
      });
      if (nlmQuick.authenticated) {
        console.log(
          `[NotebookLM] ${nlmQuick.message} (${nlmQuick.dataDir || ".notebooklm-data"})`
        );
        setImmediate(() => {
          try {
            const nlmFull = getNotebooklmStatus(__dirname, { refresh: true });
            if (nlmFull.authenticated && nlmFull.notebookCount != null) {
              console.log(`[NotebookLM] ${nlmFull.message}`);
            }
          } catch (e) {
            console.warn(
              "[NotebookLM] listagem em background falhou:",
              e.message
            );
          }
        });
      } else if (nlmQuick.needsLogin) {
        console.warn(`[NotebookLM] ${nlmQuick.message}`);
      } else if (!/ETIMEDOUT/i.test(nlmQuick.message || "")) {
        console.log(`[NotebookLM] ${nlmQuick.message}`);
      }
    } catch (e) {
      console.warn("[NotebookLM] status check failed:", e.message);
    }
    startTitleRotationScheduler({
      workspaceDir: WORKSPACE_DIR,
      projectsRoot: PROJECTS_ROOT,
    });
    startVideoResurrectorScheduler({
      WORKSPACE_DIR,
      PROJECTS_ROOT,
      getApiKey,
      callGeminiWithRetry,
    });
    startSocialPublishScheduler({
      workspaceDir: WORKSPACE_DIR,
      deps: {
        resolveProjectDir: resolveProjectDirFromName,
        pythonPath: PYTHON_PATH,
        workspaceDir: WORKSPACE_DIR,
        syncUploadScripts,
        runPostUploadHooks,
      },
    });
    startYoutubeWeeklyReportScheduler({
      workspaceDir: WORKSPACE_DIR,
      projectsRoot: PROJECTS_ROOT,
    });
    startYoutubeDailyReportScheduler({
      workspaceDir: WORKSPACE_DIR,
      projectsRoot: PROJECTS_ROOT,
    });
  });
});

server.requestTimeout = 15 * 60 * 1000;
server.headersTimeout = 65 * 1000;
server.keepAliveTimeout = 10 * 1000;
server.maxRequestsPerSocket = 500;

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n[ERRO] Porta ${PORT} já está em uso — o backend já está rodando.\n` +
        `       Feche a janela anterior ou execute run_qanat_dashboard.bat (ele libera a porta automaticamente).\n`
    );
    process.exit(1);
  }
  throw err;
});

function shutdownGracefully(signal) {
  console.log(
    `[Lumiera] ${signal} recebido. Encerrando backend com segurança...`
  );
  server.close((err) => {
    if (err) {
      console.error("[Lumiera] Erro ao encerrar servidor:", err);
      process.exit(1);
    }
    process.exit(0);
  });
  setTimeout(() => {
    console.warn("[Lumiera] Shutdown demorou demais; finalizando processo.");
    process.exit(1);
  }, 10_000).unref();
}

process.once("SIGINT", () => shutdownGracefully("SIGINT"));
process.once("SIGTERM", () => shutdownGracefully("SIGTERM"));

function buildSceneTimingMaps(actualScenes, storyboard, starts, durations) {
  const sceneStarts = {};
  const sceneDurations = {};
  const sceneNarration = {};

  if (Array.isArray(actualScenes)) {
    for (const scene of actualScenes) {
      const sceneId = String(scene.scene_id || `${scene.block}.1`).trim();
      if (!sceneId) continue;
      sceneStarts[sceneId] = Number(scene.start) || 0;
      sceneDurations[sceneId] = Number(scene.duration) || 4;
      sceneNarration[sceneId] = scene.narrationText || "";
    }
  }

  if (
    Object.keys(sceneStarts).length === 0 &&
    Array.isArray(storyboard?.visual_prompts)
  ) {
    const blockAccumulator = {};
    let cumulativeTime = 0;
    for (const vp of storyboard.visual_prompts) {
      const sceneId = String(vp.scene || `${vp.block || 1}.1`).trim();
      const blockNum = Number(vp.block || 1);
      const blockIdx = Math.max(0, blockNum - 1);
      const blockStart = Number(starts[blockIdx]);
      const dur =
        Number(vp.duration_seconds) ||
        Number(String(vp.duration || "").replace(/[^\d.]/g, "")) ||
        5;

      let start;
      if (Number.isFinite(blockStart)) {
        if (blockAccumulator[blockNum] === undefined) {
          blockAccumulator[blockNum] = blockStart;
        }
        start = blockAccumulator[blockNum];
        blockAccumulator[blockNum] = start + dur;
      } else {
        start = cumulativeTime;
        cumulativeTime = start + dur;
      }

      sceneStarts[sceneId] = start;
      sceneDurations[sceneId] = dur;
      sceneNarration[sceneId] = vp.narration_text || "";
    }
  }

  return { sceneStarts, sceneDurations, sceneNarration };
}

function extractOverlayKeywords(overlay) {
  const text = [
    overlay?.props?.title,
    overlay?.props?.subtitle,
    overlay?.props?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/gi, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4)
    .slice(0, 6);
}

function findKeywordTimeInRange(
  wordTranscripts,
  keywords,
  rangeStart,
  rangeEnd
) {
  if (!Array.isArray(wordTranscripts) || keywords.length === 0) return null;

  for (const segment of wordTranscripts) {
    const segStart = Number(segment.start_time || 0);
    const words = Array.isArray(segment.words) ? segment.words : [];

    for (const wordEntry of words) {
      const absStart = segStart + Number(wordEntry.start || 0);
      if (absStart < rangeStart || absStart > rangeEnd) continue;

      const cleanWord = String(wordEntry.word || "")
        .toLowerCase()
        .replace(/[^\wáàâãéèêíìîóòôõúùûç]/gi, "");
      if (!cleanWord) continue;

      for (const keyword of keywords) {
        if (cleanWord.includes(keyword) || keyword.includes(cleanWord)) {
          return absStart;
        }
      }
    }
  }

  return null;
}

function isLikelySceneId(rawString) {
  const m = String(rawString ?? "")
    .trim()
    .match(/^(\d+)\.(\d+)$/);
  if (!m) return false;
  const block = Number(m[1]);
  const scene = Number(m[2]);
  return block >= 1 && block <= 40 && scene >= 1 && scene <= 12;
}

function findSceneIdForAbsoluteTime(targetTime, sceneStarts, sceneDurations) {
  if (!Number.isFinite(targetTime)) return null;
  let bestSceneId = null;
  let bestDistance = Infinity;

  for (const [sceneId, sceneStart] of Object.entries(sceneStarts)) {
    const sceneEnd = sceneStart + (Number(sceneDurations[sceneId]) || 4);
    if (targetTime >= sceneStart && targetTime <= sceneEnd) {
      return sceneId;
    }
    const distance = Math.abs(sceneStart - targetTime);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSceneId = sceneId;
    }
  }

  return bestSceneId;
}

function extractExplicitBlockFromOverlayId(overlayId) {
  const match = String(overlayId || "").match(/(?:block|bloco)[_-]?(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function resolveOverlaySceneId(overlay, sceneStarts, sceneDurations) {
  const rawStart =
    overlay.start ?? overlay.scene ?? overlay.scene_ref ?? overlay.block;
  const rawString = String(rawStart ?? "").trim();

  if (overlay.scene_ref && sceneStarts[overlay.scene_ref] !== undefined) {
    return overlay.scene_ref;
  }

  // If scene_ref exists but doesn't match exactly, find any scene in the same block
  if (overlay.scene_ref && isLikelySceneId(overlay.scene_ref)) {
    const refBlock = String(overlay.scene_ref).split(".")[0];
    const blockScene = Object.keys(sceneStarts).find((sceneId) =>
      sceneId.startsWith(`${refBlock}.`)
    );
    if (blockScene) return blockScene;
  }

  if (rawString && sceneStarts[rawString] !== undefined) {
    return rawString;
  }

  if (isLikelySceneId(rawString)) {
    // Check if this scene ID actually exists in sceneStarts
    if (sceneStarts[rawString] !== undefined) {
      return rawString;
    }
    // Find any scene in the same block
    const block = rawString.split(".")[0];
    const blockScene = Object.keys(sceneStarts).find((sceneId) =>
      sceneId.startsWith(`${block}.`)
    );
    if (blockScene) return blockScene;
    return rawString;
  }

  if (Number.isFinite(Number(rawStart))) {
    return findSceneIdForAbsoluteTime(
      Number(rawStart),
      sceneStarts,
      sceneDurations
    );
  }

  const idBlockNum = extractExplicitBlockFromOverlayId(overlay.id);
  if (idBlockNum > 0) {
    const blockScene = Object.keys(sceneStarts).find((sceneId) =>
      sceneId.startsWith(`${idBlockNum}.`)
    );
    if (blockScene) return blockScene;
  }

  const blockFromOverlay = Number(overlay.block || overlay.props?.block || 0);
  if (blockFromOverlay > 0) {
    const blockScene = Object.keys(sceneStarts).find((sceneId) =>
      sceneId.startsWith(`${blockFromOverlay}.`)
    );
    if (blockScene) return blockScene;
  }

  return null;
}

function narrationWordOverlapRatio(overlayText = "", phrase = "") {
  const oWords = String(overlayText)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const pWords = String(phrase)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (!oWords.length || !pWords.length) return 0;
  const matches = oWords.filter((w) => pWords.includes(w)).length;
  return matches / oWords.length;
}

function filterNarrationEchoOverlays(overlays = [], blockPhrases = []) {
  const phrases = Array.isArray(blockPhrases) ? blockPhrases : [];

  return (overlays || []).filter((overlay) => {
    if (!overlay) return false;
    const id = String(overlay.id || "");
    if (/^lt-block-\d+$/.test(id)) {
      console.log(
        `[Overlays] Removido echo de narração (fallback legado): ${id}`
      );
      return false;
    }

    if (overlay.type === "counter" && Number(overlay.props?.value) > 0)
      return true;
    if (
      overlay.type === "bar-chart" &&
      Array.isArray(overlay.props?.items) &&
      overlay.props.items.length
    )
      return true;
    if (
      overlay.type === "timeline" &&
      Array.isArray(overlay.props?.events) &&
      overlay.props.events.length
    )
      return true;

    const overlayText = [
      overlay.props?.title,
      overlay.props?.subtitle,
      overlay.props?.description,
      overlay.props?.text,
      overlay.props?.label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!overlayText) return true;

    for (const bp of phrases) {
      const phrase = String(bp.phrase || "")
        .toLowerCase()
        .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!phrase || phrase.length < 12) continue;

      const phraseHead5 = phrase.split(" ").slice(0, 5).join(" ");
      const overlayHead5 = overlayText.split(" ").slice(0, 5).join(" ");

      if (
        phraseHead5.length >= 12 &&
        overlayHead5.length >= 12 &&
        phraseHead5 === overlayHead5
      ) {
        console.log(
          `[Overlays] Removido overlay com início idêntico à narração: ${id}`
        );
        return false;
      }

      if (
        overlayText.split(/\s+/).length > 3 &&
        overlayText.length >= 20 &&
        narrationWordOverlapRatio(overlayText, phrase) >= 0.9
      ) {
        console.log(
          `[Overlays] Removido overlay com >90% palavras da narração: ${id}`
        );
        return false;
      }
    }

    return true;
  });
}

const GEMINI_OVERLAY_TYPES = new Set([
  "lower-third",
  "counter",
  "bar-chart",
  "timeline",
  "kinetic-text",
  "info-card",
  "source-card",
  "social-post",
  "geo-map",
  "pictogram-chart",
  "location-intro",
]);

function sanitizeCustomStyle(value) {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const merged = {};
    for (const entry of value) {
      Object.assign(merged, sanitizeCustomStyle(entry) || {});
    }
    return Object.keys(merged).length ? merged : undefined;
  }
  if (typeof value !== "object") return undefined;
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    if (/^\d+$/.test(key)) continue;
    if (raw == null || typeof raw === "object") continue;
    if (typeof raw === "number" || typeof raw === "string") out[key] = raw;
  }
  return Object.keys(out).length ? out : undefined;
}

function repairOverlayPropsForRemotion(overlay) {
  if (!overlay || !overlay.type) return null;
  if (!overlay.props || typeof overlay.props !== "object") overlay.props = {};
  const p = overlay.props;

  if (p.customStyle != null) {
    const safeStyle = sanitizeCustomStyle(p.customStyle);
    if (safeStyle) p.customStyle = safeStyle;
    else delete p.customStyle;
  }

  if (overlay.type === "timeline") {
    let events = p.events;
    if (typeof events === "string") {
      try {
        events = JSON.parse(events);
      } catch {
        events = [];
      }
    }
    if (!Array.isArray(events)) events = [];
    events = events
      .map((ev) => ({
        year: String(ev?.year || ev?.date || ev?.label || ev?.time || "—"),
        description: String(
          ev?.description || ev?.desc || ev?.text || ev?.title || ""
        ),
        highlight: Boolean(ev?.highlight),
      }))
      .filter((ev) => ev.year || ev.description);

    if (events.length < 2) {
      const subtitle = events
        .map((ev) => ev.description)
        .filter(Boolean)
        .join(" · ");
      if (p.title || subtitle) {
        console.log(
          `[Overlays] Timeline ${overlay.id} incompleto — convertido para lower-third.`
        );
        overlay.type = "lower-third";
        overlay.props = {
          title: String(p.title || events[0]?.year || "LINHA DO TEMPO"),
          subtitle,
          accentColor: p.accentColor || "#D4AF37",
          position: p.position || "bottom-left",
          variant: p.variant || "glass",
          iconType: p.iconType || "history",
          theme: p.theme || "classic",
          customStyle: p.customStyle,
        };
        return overlay;
      }
      console.log(`[Overlays] Timeline ${overlay.id} sem eventos — removido.`);
      return null;
    }

    p.events = events;
    if (!p.title) p.title = "LINHA DO TEMPO";
  }

  if (overlay.type === "bar-chart") {
    let items = p.items;
    if (!Array.isArray(items)) items = [];
    items = items
      .map((it) => ({
        label: String(it?.label || it?.name || "—"),
        value: Number(it?.value) || 0,
        displayValue:
          it?.displayValue != null ? String(it.displayValue) : undefined,
        color: it?.color,
      }))
      .filter((it) => it.label && it.value > 0);

    if (items.length < 2) {
      if (items.length === 1) {
        console.log(
          `[Overlays] Bar-chart ${overlay.id} com 1 item — convertido para counter.`
        );
        overlay.type = "counter";
        overlay.props = {
          value: items[0].value,
          label: items[0].label,
          suffix: items[0].displayValue || "",
          accentColor: p.accentColor || "#D4AF37",
          position: p.position || "bottom-right",
          theme: p.theme || "classic",
          customStyle: p.customStyle,
        };
        return overlay;
      }
      console.log(`[Overlays] Bar-chart ${overlay.id} sem itens — removido.`);
      return null;
    }
    p.items = items;
    if (!p.title) p.title = "COMPARAÇÃO";
  }

  if (overlay.type === "pictogram-chart") {
    let segments = p.segments;
    if (!Array.isArray(segments)) segments = [];
    segments = segments
      .map((seg, i) => ({
        label: String(seg?.label || seg?.name || `Item ${i + 1}`),
        value: Number(seg?.value) || 0,
        color: seg?.color,
      }))
      .filter((seg) => seg.label && seg.value > 0);

    if (segments.length < 2) {
      if (segments.length === 1) {
        console.log(
          `[Overlays] Pictogram-chart ${overlay.id} com 1 segmento — convertido para counter.`
        );
        overlay.type = "counter";
        overlay.props = {
          value: segments[0].value,
          label: segments[0].label,
          suffix: "%",
          accentColor: p.accentColor || "#111111",
          position: p.position || "center",
          theme: p.theme || "minimal",
          customStyle: p.customStyle,
        };
        return overlay;
      }
      console.log(
        `[Overlays] Pictogram-chart ${overlay.id} sem segmentos — removido.`
      );
      return null;
    }
    p.segments = segments;
    if (!p.title) p.title = "COMPARAÇÃO GLOBAL";
    if (!p.icon) p.icon = "dot";
  }

  if (overlay.type === "location-intro") {
    const location = String(p.location || p.title || "").trim();
    if (!location) {
      console.log(
        `[Overlays] Location-intro ${overlay.id} sem local — removido.`
      );
      return null;
    }
    p.location = location;
    if (!p.region && p.subtitle) p.region = String(p.subtitle);
    if (!p.country && p.region && !p.subtitle) p.country = String(p.region);
    if (!p.variant) p.variant = "satellite";
    if (!p.accentColor) p.accentColor = "#FFFFFF";
  }

  if (overlay.type === "counter") {
    let value = Number(p.value);
    if (!Number.isFinite(value)) {
      value = Number(String(p.value ?? p.text ?? "").replace(/[^\d.]/g, ""));
    }
    if (!Number.isFinite(value)) {
      console.log(`[Overlays] Counter ${overlay.id} sem valor — removido.`);
      return null;
    }
    p.value = value;
    if (!p.label) p.label = String(p.title || p.text || "DADO");
  }

  if (overlay.type === "lower-third") {
    const title = String(p.title || "").trim();
    const subtitle = String(p.subtitle || "").trim();
    const fallback = String(p.text || p.label || "").trim();
    const resolved = title || subtitle || fallback;
    if (
      !resolved ||
      isPlaceholderInformativeOverlay({
        ...overlay,
        props: { ...p, title: resolved },
      })
    ) {
      console.log(
        `[Overlays] Lower-third ${overlay.id} placeholder (${resolved || "vazio"}) — removido.`
      );
      return null;
    }
    p.title = title || resolved;
    if (!p.subtitle && subtitle && title) p.subtitle = subtitle;
    if (!p.position) p.position = "bottom-left";
  }

  if (overlay.type === "kinetic-text") {
    if (!p.text) p.text = String(p.title || p.label || "");
    if (!String(p.text || "").trim()) {
      console.log(`[Overlays] Kinetic-text ${overlay.id} vazio — removido.`);
      return null;
    }
    if (
      Array.isArray(p.style) ||
      (p.style != null && typeof p.style !== "string")
    ) {
      p.style = "slam";
    }
  } else if (
    Array.isArray(p.style) ||
    (p.style != null && typeof p.style === "object")
  ) {
    delete p.style;
  }

  overlay.props = repairOverlayPropsEncoding(p);
  return overlay;
}

function tokenizeOverlayBriefingText(text = "") {
  const words = String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const stemmed = words.map((w) => {
    let s = w;
    if (s.endsWith("oes")) s = s.slice(0, -3) + "a";
    else if (s.endsWith("ao")) s = s.slice(0, -2) + "a";
    else if (s.endsWith("s")) s = s.slice(0, -1);

    if (s.endsWith("os") || s.endsWith("as")) s = s.slice(0, -2);
    else if (s.endsWith("o") || s.endsWith("a") || s.endsWith("e"))
      s = s.slice(0, -1);
    return s;
  });
  return new Set(stemmed);
}

function overlayBriefingTokenOverlap(a, b) {
  if (!a?.size || !b?.size) return 0;
  let hits = 0;
  for (const token of a) {
    if (b.has(token)) hits += 1;
  }
  return hits / Math.min(a.size, b.size);
}

const OVERLAY_STORY_OBJECT_GROUPS = [
  ["ponte", "pontes", "viaduto", "viadutos", "passarela", "passarelas"],
  [
    "predio",
    "predios",
    "edificio",
    "edificios",
    "condominio",
    "apartamento",
    "palace",
    "palacio",
    "palacios",
  ],
  ["barragem", "barragens", "represa", "represas"],
  ["navio", "navios", "barco", "barcos", "submarino", "submarinos"],
  ["aviao", "avioes", "aeronave", "aeronaves", "helicoptero"],
  ["trem", "trens", "metro", "ferrovia", "ferroviaria"],
  ["rodovia", "estrada", "tunel", "tuneis"],
];

function overlayStoryObjectGroupsInText(text = "") {
  const tokens = tokenizeOverlayBriefingText(text);
  return OVERLAY_STORY_OBJECT_GROUPS.filter((group) =>
    group.some((term) => tokens.has(term))
  );
}

function overlayHasStoryObjectContradiction(candidate = "", context = "") {
  const contextGroups = overlayStoryObjectGroupsInText(context);
  if (!contextGroups.length) return false;
  const candidateGroups = overlayStoryObjectGroupsInText(candidate);
  if (!candidateGroups.length) return false;
  return candidateGroups.some(
    (candidateGroup) =>
      !contextGroups.some((contextGroup) => contextGroup === candidateGroup)
  );
}

function overlayResearchContextText(overlayResearch = {}) {
  return [
    overlayResearch.topic,
    overlayResearch.query,
    overlayResearch.blocks?.[0]?.primaryTopic,
    overlayResearch.blocks?.[0]?.narration,
  ]
    .filter(Boolean)
    .join(" ");
}

function overlayProjectStoryContextText({ config = {}, storyboard = {} } = {}) {
  const blockPhrases = Array.isArray(config.block_phrases)
    ? config.block_phrases
    : [];
  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  const researchSources = Array.isArray(storyboard.research_sources)
    ? storyboard.research_sources
    : [];
  return [
    config.niche,
    storyboard.title,
    storyboard.idea_title,
    storyboard.strategy?.title,
    storyboard.strategy?.promise,
    storyboard.narrative_script,
    ...blockPhrases.map((b) => b?.phrase || b?.text || ""),
    ...visualPrompts.flatMap((vp) => [
      vp?.narration_text,
      vp?.visual_description,
      vp?.prompt,
    ]),
    ...researchSources.flatMap((src) => [src?.title, src?.url]),
  ]
    .filter(Boolean)
    .join(" ");
}

function overlayResearchCandidateIsRelevant(
  candidate = "",
  overlayResearch = {}
) {
  const context = overlayResearchContextText(overlayResearch);
  const contextTokens = tokenizeOverlayBriefingText(context);
  if (!contextTokens.size) return true;
  if (overlayHasStoryObjectContradiction(candidate, context)) return false;
  return (
    overlayBriefingTokenOverlap(
      contextTokens,
      tokenizeOverlayBriefingText(candidate)
    ) >= 0.12
  );
}

function matchOverlayResearchFact(overlayText = "", overlayResearch = {}) {
  const facts = (overlayResearch.facts || []).filter((fact) =>
    overlayResearchCandidateIsRelevant(fact, overlayResearch)
  );
  if (!facts.length || !String(overlayText).trim()) return {};
  const overlayTokens = tokenizeOverlayBriefingText(overlayText);
  let bestFact = "";
  let bestScore = 0;
  for (const fact of facts) {
    const score = overlayBriefingTokenOverlap(
      overlayTokens,
      tokenizeOverlayBriefingText(fact)
    );
    if (score > bestScore) {
      bestScore = score;
      bestFact = fact;
    }
  }
  if (!bestFact || bestScore < 0.12) {
    const numeric = String(overlayText).match(/\d[\d.,]*/);
    if (numeric) {
      const byNumber = facts.find((f) => String(f).includes(numeric[0]));
      if (byNumber) bestFact = byNumber;
    }
  }
  if (!bestFact) return {};
  let source;
  const sources = (overlayResearch.sources || []).filter((src) =>
    overlayResearchCandidateIsRelevant(
      [src.title, src.url, src.snippet].filter(Boolean).join(" "),
      overlayResearch
    )
  );
  if (sources.length) {
    const factTokens = tokenizeOverlayBriefingText(bestFact);
    let bestSrc;
    let bestSrcScore = 0;
    for (const src of sources) {
      const sourceText = String(
        [src.title, src.url, src.snippet].filter(Boolean).join(" ")
      );
      const score = overlayBriefingTokenOverlap(
        factTokens,
        tokenizeOverlayBriefingText(sourceText)
      );
      if (score > bestSrcScore) {
        bestSrcScore = score;
        bestSrc = src;
      }
    }
    if (bestSrc && bestSrcScore >= 0.12) source = bestSrc.title || bestSrc.url;
  }
  return { fact: bestFact, source };
}

function getOverlayBlockResearch(overlay = {}, overlayResearch = {}) {
  const block = extractBlockIndex(overlay, overlay.scene_ref) + 1;
  if (!block || !Array.isArray(overlayResearch.blocks)) return overlayResearch;
  const blockResearch = overlayResearch.blocks.find(
    (entry) => Number(entry.block) === block
  );
  if (!blockResearch) return overlayResearch;
  return {
    ...overlayResearch,
    query: blockResearch.query || overlayResearch.query,
    facts: blockResearch.facts || [],
    sources: blockResearch.sources || [],
    selectedBlocks: [block],
    blocks: [blockResearch],
  };
}

function overlayFactMatchesItsBlock(overlay = {}, overlayResearch = {}) {
  const fact = String(overlay?.ai_meta?.research_fact || "").trim();
  const scopedResearch = getOverlayBlockResearch(overlay, overlayResearch);
  if (!fact)
    return !scopedResearch.sourceLocked && !overlayResearch.sourceLocked;
  const blockFacts = scopedResearch.facts || [];
  if (!blockFacts.length) return false;
  const factTokens = tokenizeOverlayBriefingText(fact);
  const factBelongsToBlock = blockFacts.some(
    (blockFact) =>
      overlayBriefingTokenOverlap(
        factTokens,
        tokenizeOverlayBriefingText(blockFact)
      ) >= 0.18 || String(blockFact).includes(fact)
  );
  if (!factBelongsToBlock) return false;
  if (scopedResearch.sourceLocked || overlayResearch.sourceLocked) {
    const overlayTokens = tokenizeOverlayBriefingText(
      overlayTextBlobForBriefing(overlay)
    );
    const overlayFactOverlap = overlayBriefingTokenOverlap(
      overlayTokens,
      factTokens
    );
    if (overlayFactOverlap < 0.12) {
      console.log(
        `[Overlay Story Guard] Removido ${overlay.id} — texto do overlay nao deriva do fato das fontes.`
      );
      return false;
    }
  }
  return true;
}

function overlayTextBlobForBriefing(overlay = {}) {
  const p = overlay.props || {};
  const nestedText = [];
  const collect = (value, depth = 0) => {
    if (depth > 3 || value == null) return;
    if (typeof value === "string" || typeof value === "number") {
      nestedText.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) collect(item, depth + 1);
      return;
    }
    if (typeof value === "object") {
      for (const item of Object.values(value)) collect(item, depth + 1);
    }
  };
  collect(p.events);
  collect(p.items);
  collect(p.segments);
  collect(p.rows);
  return [
    p.title,
    p.subtitle,
    p.description,
    p.label,
    p.value,
    p.text,
    p.source,
    p.location,
    ...nestedText,
  ]
    .filter((v) => v != null && String(v).trim())
    .join(" ");
}

function overlayAuditTextBlob(overlay = {}) {
  const meta = overlay.ai_meta || {};
  return [
    overlayTextBlobForBriefing(overlay),
    meta.scene_rationale,
    meta.content_summary,
    meta.design_rationale,
    meta.research_fact,
    meta.narration_relation,
  ]
    .filter((v) => v != null && String(v).trim())
    .join(" ");
}

const META_ENTITY_ALLOWLIST = new Set([
  "IA",
  "AI",
  "BR",
  "Brasil",
  "Cena",
  "Lottie",
  "Timeline",
  "Lower Third",
  "Contador",
]);

const NAMED_ENTITY_BLACKLIST = new Set([
  "voce",
  "voces",
  "ele",
  "ela",
  "eles",
  "elas",
  "nao",
  "não",
  "sim",
  "esse",
  "este",
  "esses",
  "estes",
  "essa",
  "esta",
  "essas",
  "estas",
  "isso",
  "isto",
  "aquilo",
  "outro",
  "outra",
  "outros",
  "outras",
  "apenas",
  "mesmo",
  "mesma",
  "onde",
  "quando",
  "como",
  "quem",
  "porque",
  "porquê",
  "acredita",
  "acreditamos",
  "falha",
  "falhas",
  "fornece",
  "identifica",
  "apresenta",
  "compara",
  "misterio",
  "misterios",
  "mas",
  "por",
  "para",
  "com",
  "sem",
  "mais",
  "menos",
  "se",
  "caso",
  "embora",
  "contudo",
  "todavia",
  "portanto",
  "assim",
  "entao",
  "então",
  "somente",
  "muito",
  "pouco",
  "quase",
  "todos",
  "todas",
  "nesse",
  "nesta",
  "neste",
  "nestas",
  "nessas",

  // Expanded keywords and nouns
  "verdade",
  "verdades",
  "mito",
  "mitos",
  "historia",
  "histórias",
  "historias",
  "história",
  "ciencia",
  "ciências",
  "ciencias",
  "ciências",
  "causa",
  "causas",
  "problema",
  "problemas",
  "erro",
  "erros",
  "construcao",
  "construção",
  "construcoes",
  "construções",
  "desastre",
  "desastres",
  "fundacao",
  "fundação",
  "fundacoes",
  "fundações",
  "concreto",
  "areia",
  "praia",
  "colapso",
  "estrutura",
  "estrutural",
  "estruturas",
  "laudo",
  "laudos",
  "oficial",
  "oficiais",
  "perito",
  "peritos",
  "derrubou",
  "derrubaram",
  "oceano",
  "natureza",
  "negligencia",
  "negligência",
  "responsabilidade",
  "folclore",
  "urbana",
  "nacional",
  "nacionais",
  "pericia",
  "perícia",
  "pericias",
  "perícias",
  "coluna",
  "colunas",
  "vitima",
  "vítima",
  "vitimas",
  "vítimas",
  "morto",
  "mortos",
  "morte",
  "mortes",
  "pessoa",
  "pessoas",
  "predio",
  "prédio",
  "predios",
  "prédios",
  "edificio",
  "edifício",
  "edificios",
  "edifícios",
  "década",
  "decada",
  "decadas",
  "décadas",
  "lenda",
  "lendas",
  "mentira",
  "mentiras",
]);

function normalizeEntityWord(word = "") {
  return String(word)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]/g, "");
}

function extractNamedEntityHints(text = "") {
  const matches =
    String(text).match(
      /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç-]+(?:\s+(?:de|da|do|dos|das|e)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç-]+|\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç-]+)*/g
    ) || [];
  return [...new Set(matches.map((m) => m.trim()))].filter((m) => {
    if (m.length < 8) return false;
    if (META_ENTITY_ALLOWLIST.has(m)) return false;
    if (/^(Cena|Bloco|Tipo|Tema|Design|Fonte|Fato)\b/i.test(m)) return false;
    const words = m.split(/\s+/);
    for (const word of words) {
      const normalized = normalizeEntityWord(word);
      if (NAMED_ENTITY_BLACKLIST.has(normalized)) return false;
    }
    return true;
  });
}

function overlayMetaMatchesStoryBlock(
  overlay = {},
  overlayResearch = {},
  storyContext = ""
) {
  const scopedResearch = getOverlayBlockResearch(overlay, overlayResearch);
  const blockResearch = scopedResearch.blocks?.[0] || {};
  const auditText = overlayAuditTextBlob(overlay);
  if (!auditText.trim()) return true;

  const allowedContext = [
    overlayResearch.topic,
    blockResearch.primaryTopic,
    blockResearch.narration,
    ...(blockResearch.facts || []),
    storyContext,
  ].join(" ");
  if (overlayHasStoryObjectContradiction(auditText, allowedContext)) {
    console.log(
      `[Overlay Story Guard] Objeto de historia contraditorio detectado em ${overlay.id}.`
    );
    return false;
  }
  const auditTokens = tokenizeOverlayBriefingText(auditText);
  const contextTokens = tokenizeOverlayBriefingText(allowedContext);
  const overlap = overlayBriefingTokenOverlap(auditTokens, contextTokens);
  const entities = extractNamedEntityHints(overlayTextBlobForBriefing(overlay));
  const foreignEntity = entities.find((entity) => {
    const entityTokens = tokenizeOverlayBriefingText(entity);
    return overlayBriefingTokenOverlap(entityTokens, contextTokens) < 0.34;
  });

  if (foreignEntity) {
    console.log(
      `[Overlay Story Guard] Entidade fora do bloco detectada em ${overlay.id}: "${foreignEntity}".`
    );
    return false;
  }

  return overlap >= 0.04 || !contextTokens.size;
}

function ensureOverlayAiMeta(
  overlay,
  overlayResearch = {},
  sceneContext = null
) {
  if (!overlay.ai_meta || typeof overlay.ai_meta !== "object") {
    overlay.ai_meta = {};
  }
  const meta = overlay.ai_meta;
  const props = overlay.props || {};
  const sceneId = String(overlay.scene_ref || overlay.start || "").trim();

  if (!meta.suggested_type) meta.suggested_type = overlay.type;
  if (!meta.suggested_variant && props.variant)
    meta.suggested_variant = props.variant;
  if (!meta.suggested_theme && props.theme) meta.suggested_theme = props.theme;
  if (!meta.suggested_icon && props.iconType)
    meta.suggested_icon = props.iconType;
  if (!meta.suggested_position && props.position)
    meta.suggested_position = props.position;

  const scopedResearch = getOverlayBlockResearch(overlay, overlayResearch);

  if (!meta.research_query && scopedResearch.query) {
    meta.research_query = scopedResearch.query;
  }
  if (!meta.research_fact && scopedResearch.facts?.length) {
    const match = matchOverlayResearchFact(
      overlayTextBlobForBriefing(overlay),
      scopedResearch
    );
    if (match.fact) {
      meta.research_fact = match.fact;
      if (match.source) meta.research_source = match.source;
    }
  }
  if (!meta.scene_rationale && sceneId && isLikelySceneId(sceneId)) {
    const hint = sceneContext?.context_hint || sceneContext?.visual_hint || "";
    meta.scene_rationale = hint
      ? `Informação na cena ${sceneId} — contexto visual: ${String(hint).slice(0, 140)}`
      : `Informação complementar exibida na cena ${sceneId} do roteiro.`;
  }
  if (!meta.content_summary) {
    const parts = [];
    if (props.title) parts.push(`título "${props.title}"`);
    if (props.subtitle) parts.push(`subtítulo "${props.subtitle}"`);
    if (props.label) parts.push(`rótulo "${props.label}"`);
    if (props.value != null)
      parts.push(
        `valor ${props.value}${props.suffix ? ` ${props.suffix}` : ""}`
      );
    if (parts.length) {
      meta.content_summary = `Overlay informativo com ${parts.join(", ")}.`;
    }
  }
  return overlay;
}

function persistOverlayPlanejamento(projectDir, planejamento = []) {
  if (!projectDir || !Array.isArray(planejamento) || !planejamento.length)
    return;
  try {
    const sbPath = path.join(projectDir, "storyboard.json");
    const sb = readProjectJson(projectDir, "storyboard.json", {});
    sb.overlays_planejamento = planejamento;
    fs.writeFileSync(sbPath, JSON.stringify(sb, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[Overlays] Falha ao salvar overlays_planejamento:",
      err.message
    );
  }
}

function normalizeGeminiOverlayPayload(overlays = []) {
  if (!Array.isArray(overlays)) return [];

  return overlays
    .map((raw, index) => {
      const overlay = { ...(raw || {}) };
      if (raw?.ai_meta && typeof raw.ai_meta === "object") {
        overlay.ai_meta = { ...raw.ai_meta };
      }
      if (!overlay.id) overlay.id = `ai-overlay-${index + 1}`;
      if (!overlay.type && overlay.overlay_type)
        overlay.type = overlay.overlay_type;
      if (!overlay.props || typeof overlay.props !== "object")
        overlay.props = {};

      const flatText =
        overlay.text || overlay.label || overlay.title || overlay.caption;
      if (flatText) {
        if (overlay.type === "kinetic-text" && !overlay.props.text)
          overlay.props.text = String(flatText);
        else if (overlay.type === "counter") {
          if (!overlay.props.label) overlay.props.label = String(flatText);
        } else if (!overlay.props.title) {
          overlay.props.title = String(flatText);
        }
      }

      for (const key of [
        "position",
        "iconType",
        "variant",
        "accentColor",
        "theme",
        "customStyle",
        "value",
        "suffix",
        "items",
        "events",
      ]) {
        if (overlay[key] != null && overlay.props[key] == null)
          overlay.props[key] = overlay[key];
      }

      if (overlay.end != null && overlay.duration == null) {
        const startNum = Number(overlay.start);
        const endNum = Number(overlay.end);
        if (
          Number.isFinite(startNum) &&
          Number.isFinite(endNum) &&
          endNum > startNum
        ) {
          overlay.duration = endNum - startNum;
        }
      }
      if (
        !Number.isFinite(Number(overlay.duration)) ||
        Number(overlay.duration) <= 0
      ) {
        overlay.duration = 4;
      }

      if (!GEMINI_OVERLAY_TYPES.has(overlay.type)) {
        if (overlay.props?.events?.length) overlay.type = "timeline";
        else if (overlay.props?.items?.length) overlay.type = "bar-chart";
        else if (overlay.props?.value != null) overlay.type = "counter";
        else if (overlay.props?.text) overlay.type = "kinetic-text";
        else overlay.type = "lower-third";
      }

      return overlay;
    })
    .map((overlay) => repairOverlayPropsForRemotion(overlay))
    .filter(
      (o) =>
        o &&
        GEMINI_OVERLAY_TYPES.has(o.type) &&
        !isPlaceholderInformativeOverlay(o)
    );
}

function stripSystemInjectedOverlays(overlays = []) {
  return (overlays || []).filter((overlay) => {
    if (!overlay) return false;
    const id = String(overlay.id || "");
    if (/^listicle-rank-\d+$/.test(id)) return false;
    if (
      id === "listicle-recap" ||
      id === "listicle-intro-topn" ||
      id === "listicle-open-loop"
    )
      return false;
    if (
      overlay.type === "rank-progress" ||
      overlay.type === "listicle-stinger" ||
      overlay.type === "listicle-recap"
    ) {
      return false;
    }
    return true;
  });
}

function resolveOverlayDurationForBlock(
  overlay,
  overlayStart,
  blockIdx,
  starts,
  durations,
  config = {},
  storyboard = {}
) {
  if (isManualOverlayTiming(overlay)) {
    return Math.max(1, Number(overlay.duration) || 4);
  }
  const { blockStart, blockEnd } = getBlockTiming(blockIdx, starts, durations);
  const isListicle =
    config?.content_mode === "LISTICLE" ||
    storyboard?.listicle?.content_mode === "LISTICLE";
  const totalDuration = durations.reduce((a, b) => a + (Number(b) || 0), 0);
  if (blockEnd > blockStart) {
    return computeOverlayDisplayDuration(overlay, {
      overlayStart,
      blockStart,
      blockEnd,
      plan: {},
      isListicle,
      totalDuration,
    });
  }
  return Math.max(3.5, Number(overlay.duration) || 4);
}

function ensureNumericOverlayStarts(
  parsedOverlays,
  sceneStarts = {},
  starts = [],
  durations = [],
  config = {},
  storyboard = {}
) {
  for (let i = 0; i < parsedOverlays.length; i++) {
    const overlay = parsedOverlays[i];
    if (isManualOverlayTiming(overlay)) {
      if (Number.isFinite(Number(overlay.start)))
        overlay.start = Number(overlay.start);
      if (
        !Number.isFinite(Number(overlay.duration)) ||
        Number(overlay.duration) <= 0
      ) {
        overlay.duration = 4;
      }
      continue;
    }
    const raw = overlay.start ?? overlay.scene;
    const rawStr = String(raw ?? "").trim();

    if (Number.isFinite(Number(raw)) && !isLikelySceneId(rawStr)) {
      overlay.start = Number(raw);
      const blockIdx = extractBlockIndex(overlay, overlay.scene_ref);
      overlay.duration = resolveOverlayDurationForBlock(
        overlay,
        overlay.start,
        blockIdx,
        starts,
        durations,
        config,
        storyboard
      );
      continue;
    }

    if (isLikelySceneId(rawStr)) {
      if (sceneStarts[rawStr] !== undefined) {
        const blockIdx = Math.max(0, Number(rawStr.split(".")[0]) - 1);
        overlay.start = Number(sceneStarts[rawStr]) + 0.5;
        overlay.scene_ref = rawStr;
        overlay.duration = resolveOverlayDurationForBlock(
          overlay,
          overlay.start,
          blockIdx,
          starts,
          durations,
          config,
          storyboard
        );
        continue;
      }
      const blockIdx = Math.max(0, Number(rawStr.split(".")[0]) - 1);
      const blockStart = Number(starts[blockIdx]);
      if (Number.isFinite(blockStart)) {
        overlay.start = blockStart + 0.5;
        overlay.scene_ref = rawStr;
        overlay.duration = resolveOverlayDurationForBlock(
          overlay,
          overlay.start,
          blockIdx,
          starts,
          durations,
          config,
          storyboard
        );
        continue;
      }
    }

    const explicitBlock = extractExplicitBlockFromOverlayId(overlay.id);
    const blockIdx =
      explicitBlock > 0
        ? Math.max(0, explicitBlock - 1)
        : Math.min(i, Math.max(0, starts.length - 1));
    const blockStart = Number(starts[blockIdx]);
    overlay.start = Number.isFinite(blockStart)
      ? blockStart + 0.5
      : Math.max(0, i * 5);
    overlay.duration = resolveOverlayDurationForBlock(
      overlay,
      overlay.start,
      blockIdx,
      starts,
      durations,
      config,
      storyboard
    );
    console.log(
      `[Overlays] Fallback numérico para ${overlay.id}: start=${overlay.start}s`
    );
  }

  return parsedOverlays;
}

function realignPlannedOverlays(
  plannedRaw,
  actualScenes,
  storyboard,
  starts,
  durations,
  wordTranscripts = [],
  config = {}
) {
  const cloned = JSON.parse(JSON.stringify(plannedRaw));
  alignOverlayTimings(
    cloned,
    actualScenes,
    storyboard,
    starts,
    durations,
    wordTranscripts,
    config
  );
  return cloned;
}

function alignOverlayTimings(
  parsedOverlays,
  actualScenes,
  storyboard,
  starts,
  durations,
  wordTranscripts = [],
  config = {}
) {
  const { sceneStarts, sceneDurations, sceneNarration } = buildSceneTimingMaps(
    actualScenes,
    storyboard,
    starts,
    durations
  );
  const isListicle =
    config?.content_mode === "LISTICLE" ||
    storyboard?.listicle?.content_mode === "LISTICLE";

  for (let i = 0; i < parsedOverlays.length; i++) {
    const overlay = parsedOverlays[i];
    if (isManualOverlayTiming(overlay)) {
      const rawNum = Number(overlay.start);
      if (Number.isFinite(rawNum) && rawNum >= 0) overlay.start = rawNum;
      if (
        !Number.isFinite(Number(overlay.duration)) ||
        Number(overlay.duration) <= 0
      ) {
        overlay.duration = 4;
      }
      console.log(
        `[Overlays Post-Process] Overlay ${overlay.id} timing manual: start=${overlay.start}s, duration=${overlay.duration}s`
      );
      continue;
    }
    const rawSceneRef = String(overlay.start ?? overlay.scene ?? "").trim();
    const resolvedSceneId = resolveOverlaySceneId(
      overlay,
      sceneStarts,
      sceneDurations
    );

    if (!resolvedSceneId || sceneStarts[resolvedSceneId] === undefined) {
      const rawNum = Number(overlay.start);
      if (
        Number.isFinite(rawNum) &&
        rawNum >= 0 &&
        !isLikelySceneId(rawSceneRef)
      ) {
        overlay.start = rawNum;
        const sceneFromTime = findSceneIdForAbsoluteTime(
          rawNum,
          sceneStarts,
          sceneDurations
        );
        if (sceneFromTime) overlay.scene_ref = sceneFromTime;
        console.log(
          `[Overlays Post-Process] Overlay ${overlay.id} mantém tempo absoluto: start=${overlay.start}s`
        );
        continue;
      }

      if (isLikelySceneId(rawSceneRef)) {
        const blockNum = Number(rawSceneRef.split(".")[0]);
        const blockIdx = Math.max(0, blockNum - 1);
        const blockStart = Number(starts[blockIdx]);
        if (Number.isFinite(blockStart)) {
          overlay.start = blockStart + 0.5;
          overlay.scene_ref = rawSceneRef;
          overlay.duration = resolveOverlayDurationForBlock(
            overlay,
            overlay.start,
            blockIdx,
            starts,
            durations,
            config,
            storyboard
          );
          console.log(
            `[Overlays Post-Process] Fallback por scene_id ${rawSceneRef}: start=${overlay.start}s`
          );
          continue;
        }
      }

      const blockNum = extractExplicitBlockFromOverlayId(overlay.id);
      if (blockNum > 0) {
        const blockIdx = Math.max(0, blockNum - 1);
        const blockStart = Number(starts[blockIdx]);
        if (Number.isFinite(blockStart)) {
          overlay.start = blockStart + 0.5;
          overlay.duration = resolveOverlayDurationForBlock(
            overlay,
            overlay.start,
            blockIdx,
            starts,
            durations,
            config,
            storyboard
          );
          console.log(
            `[Overlays Post-Process] Fallback por bloco ${blockNum}: start=${overlay.start}s`
          );
        }
      }
      continue;
    }

    const sceneStartSec = sceneStarts[resolvedSceneId];
    const sceneDur = sceneDurations[resolvedSceneId] || 4;
    const blockIdx = Math.max(
      0,
      Number(String(resolvedSceneId).split(".")[0]) - 1
    );
    const { blockStart, blockEnd } = getBlockTiming(
      blockIdx,
      starts,
      durations
    );
    const siblingCount = parsedOverlays.slice(0, i).filter((ov) => {
      const ovScene = String(ov.start ?? ov.scene ?? "").trim();
      return ovScene === rawSceneRef || ovScene === resolvedSceneId;
    }).length;

    const minSiblingGap = isListicle ? 8 : 5;
    let start = sceneStartSec + 0.5 + siblingCount * minSiblingGap;

    const keywords = extractOverlayKeywords(overlay);
    const narrationKeywords = String(sceneNarration[resolvedSceneId] || "")
      .toLowerCase()
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 5)
      .slice(0, 4);

    const keywordTime = findKeywordTimeInRange(
      wordTranscripts,
      [...keywords, ...narrationKeywords],
      sceneStartSec,
      sceneStartSec + sceneDur
    );

    if (keywordTime !== null) {
      const blockLimit =
        blockEnd > blockStart ? blockEnd - 1.5 : sceneStartSec + sceneDur - 1;
      start = Math.min(keywordTime + 0.15, blockLimit);
    }

    const plannedAbs = Number(overlay.start);
    const blockLimitEnd =
      blockEnd > blockStart ? blockEnd : sceneStartSec + sceneDur;
    if (
      Number.isFinite(plannedAbs) &&
      plannedAbs >= blockStart &&
      plannedAbs <= blockLimitEnd &&
      !isLikelySceneId(rawSceneRef)
    ) {
      overlay.start = plannedAbs;
    } else {
      overlay.start = Math.max(
        blockStart > 0 ? blockStart + 0.35 : sceneStartSec,
        start
      );
    }
    overlay.scene_ref = resolvedSceneId;
    overlay.duration = computeOverlayDisplayDuration(overlay, {
      overlayStart: overlay.start,
      blockStart: blockStart || sceneStartSec,
      blockEnd: blockEnd || sceneStartSec + sceneDur,
      plan: {},
      isListicle,
    });

    console.log(
      `[Overlays Post-Process] Overlay ${overlay.id} → cena ${resolvedSceneId}: start=${overlay.start}s, duration=${overlay.duration}s (bloco ${blockIdx + 1})`
    );
  }

  ensureNumericOverlayStarts(
    parsedOverlays,
    sceneStarts,
    starts,
    durations,
    config,
    storyboard
  );

  const totalDur =
    durations.reduce((a, b) => a + (Number(b) || 0), 0) ||
    (starts.length && durations.length
      ? Number(starts[starts.length - 1]) +
        Number(durations[durations.length - 1])
      : 0);
  const plan = buildOverlayOrchestrationPlan({
    config,
    niche: config?.niche || "Geral",
    totalDuration: totalDur,
    projectName: "align",
    blockCount: starts.length,
  });
  const verified = verifyAndRepairAiOverlayTiming(parsedOverlays, {
    starts,
    durations,
    sceneStarts,
    sceneDurations,
    wordTranscripts,
    totalDuration: totalDur,
    plan,
    repair: true,
  });
  return verified.overlays;
}

function resolveLastMileOverlayCollisions(overlays, config = {}) {
  if (!Array.isArray(overlays) || overlays.length === 0) return overlays;

  // Resolve minimum gap from production config (overlay_min_gap setting)
  const isShort = config.aspect_ratio !== "16:9";
  const isListicle = config.content_mode === "LISTICLE";
  const gapSetting = config.overlay_min_gap || "normal";
  let minGap;
  if (gapSetting === "tight") {
    minGap = isShort ? (isListicle ? 8 : 4) : isListicle ? 9 : 12;
  } else if (gapSetting === "relaxed") {
    minGap = isShort ? (isListicle ? 14 : 8) : isListicle ? 16 : 26;
  } else {
    // "normal" default
    minGap = isShort ? 4 : 5;
  }
  console.log(
    `[Last-Mile Resolver] Gap mínimo entre overlays: ${minGap}s (config: ${gapSetting})`
  );

  // Filter informative overlays and system ones (e.g. HUD, retention, etc.)
  const informative = overlays.filter(isInformativeOverlay);
  const system = overlays.filter((o) => !isInformativeOverlay(o));

  // Sort them chronologically by start time
  informative.sort((a, b) => a.start - b.start);

  const resolved = [];
  let lastEnd = -Infinity;
  let lastSceneRef = null;

  for (const overlay of informative) {
    let start = Number(overlay.start);
    let duration = Number(overlay.duration) || 4;
    const currentSceneRef = overlay.scene_ref
      ? String(overlay.scene_ref).trim()
      : null;

    if (isManualOverlayTiming(overlay)) {
      resolved.push(overlay);
      lastEnd = start + duration;
      lastSceneRef = currentSceneRef;
      continue;
    }

    // Rule: NEVER show two overlays on the same scene (scene_ref match check)
    if (currentSceneRef && lastSceneRef === currentSceneRef) {
      console.log(
        `[Last-Mile Resolver] Removido overlay ${overlay.id} porque compartilha a mesma cena (${currentSceneRef}) com o anterior.`
      );
      continue;
    }

    // Check overlap with the last accepted informative overlay using config gap
    if (start < lastEnd + minGap) {
      console.log(
        `[Last-Mile Resolver] Conflito detectado para overlay ${overlay.id} (start: ${start.toFixed(2)}s) com o fim do anterior em ${lastEnd.toFixed(2)}s. Gap necessário: ${minGap}s.`
      );

      // Try pushing start time of this overlay forward, if it leaves a readable chunk
      const pushedStart = lastEnd + minGap;
      if (pushedStart + 2.5 <= start + duration) {
        console.log(
          `  -> Empurrando início de ${overlay.id} de ${start.toFixed(2)}s para ${pushedStart.toFixed(2)}s`
        );
        start = pushedStart;
        duration = Math.max(2.5, start + duration - pushedStart);
      } else {
        // Enforce sequence logic: try reducing the duration of the previous overlay instead
        const prev = resolved[resolved.length - 1];
        if (prev) {
          const maxPrevEnd = start - 0.5;
          const newPrevDur = maxPrevEnd - prev.start;
          if (newPrevDur >= 2.5) {
            console.log(
              `  -> Encurtando overlay anterior ${prev.id} de ${prev.duration.toFixed(2)}s para ${newPrevDur.toFixed(2)}s (acabando em ${maxPrevEnd.toFixed(2)}s)`
            );
            prev.duration = newPrevDur;
            lastEnd = prev.start + prev.duration;
          } else {
            // Remove the current overlay to prevent double overlays / screen cluttering
            console.log(
              `  -> Ignorando overlay ${overlay.id} totalmente para evitar colisão na tela.`
            );
            continue;
          }
        } else {
          continue;
        }
      }
    }

    overlay.start = start;
    overlay.duration = duration;
    resolved.push(overlay);
    lastEnd = start + duration;
    lastSceneRef = currentSceneRef;
  }

  return [...resolved, ...system];
}

function pruneAiOverlaysToStoryBlocks(
  overlays = [],
  { storyboard = {}, plan = {}, config = {}, totalDuration = 0 } = {}
) {
  if (!Array.isArray(overlays) || overlays.length === 0) return overlays;

  const researchBlocks = Array.isArray(
    storyboard?.overlays_research?.selectedBlocks
  )
    ? storyboard.overlays_research.selectedBlocks
        .map(Number)
        .filter((n) => n > 0)
    : [];
  const selectedBlockSet = new Set(researchBlocks);
  const overlayResearch = storyboard?.overlays_research || {};
  const storyContext = overlayProjectStoryContextText({ config, storyboard });
  const isShortVideo =
    plan?.format === "SHORT" ||
    config.aspect_ratio !== "16:9" ||
    Number(totalDuration) < 120;
  const maxInformative = isShortVideo
    ? 2
    : Number(plan?.limits?.maxTotal) || Infinity;

  const informative = [];
  const system = [];
  for (const overlay of overlays) {
    if (isInformativeOverlay(overlay)) informative.push(overlay);
    else system.push(overlay);
  }

  const kept = [];
  for (const overlay of informative) {
    const block = extractBlockIndex(overlay, overlay.scene_ref) + 1;
    if (selectedBlockSet.size && !selectedBlockSet.has(block)) {
      console.log(
        `[Overlay Story Guard] Removido ${overlay.id} — bloco ${block || "?"} nao foi selecionado pela pesquisa da historia.`
      );
      continue;
    }
    if (!overlayFactMatchesItsBlock(overlay, overlayResearch)) {
      console.log(
        `[Overlay Story Guard] Removido ${overlay.id} — fato/pesquisa nao corresponde ao bloco ${block || "?"}.`
      );
      continue;
    }
    if (!overlayMetaMatchesStoryBlock(overlay, overlayResearch, storyContext)) {
      console.log(
        `[Overlay Story Guard] Removido ${overlay.id} — briefing/metadados nao correspondem ao bloco ${block || "?"}.`
      );
      continue;
    }
    kept.push(overlay);
  }

  kept.sort((a, b) => (Number(a.start) || 0) - (Number(b.start) || 0));
  if (kept.length > maxInformative) {
    const removed = kept.splice(maxInformative);
    for (const overlay of removed) {
      console.log(
        `[Overlay Story Guard] Removido ${overlay.id} — limite absoluto de ${maxInformative} overlay(s) informativo(s).`
      );
    }
  }

  return [...kept, ...system];
}

function finalizeProjectOverlays(
  projectDir,
  overlays,
  config,
  storyboard,
  starts,
  durations,
  orchestrationPlan,
  totalDuration
) {
  let result = filterOverlaysByVisualConfig(overlays, config);
  result = pruneAiOverlaysToStoryBlocks(result, {
    storyboard,
    plan: orchestrationPlan,
    config,
    totalDuration,
  });
  const aiOverlayMode = hasAiPlannedOverlays(storyboard);
  if (!aiOverlayMode) {
    result = injectProLayoutOverlays(
      result,
      config,
      storyboard,
      starts,
      durations,
      orchestrationPlan
    );
  }
  result = injectListicleRankOverlays(
    result,
    storyboard,
    config,
    starts,
    durations,
    projectDir
  );
  if (!aiOverlayMode) {
    result = injectRetentionOverlays(
      projectDir,
      result,
      starts,
      durations,
      config,
      storyboard
    );
  }
  if (aiOverlayMode) {
    result = result.filter(
      (o) => !isHudOverlay(o) && !isPlaceholderInformativeOverlay(o)
    );
  }
  result = avoidListicleHudCollisions(result, config, storyboard);
  result = pruneListicleOverlayDensity(
    result,
    config,
    storyboard,
    orchestrationPlan
  );
  result = pruneAiOverlaysToStoryBlocks(result, {
    storyboard,
    plan: orchestrationPlan,
    config,
    totalDuration,
  });
  result = stabilizeOverlayTimings(result, {
    starts,
    durations,
    plan: orchestrationPlan,
    config,
    storyboard,
    totalDuration,
  });

  const informativeOnly = result.filter(isInformativeOverlay);
  const systemOnly = result.filter((o) => !isInformativeOverlay(o));
  const enforcedInformative = enforceOverlayOrchestration(
    informativeOnly,
    orchestrationPlan,
    {
      starts,
      durations,
    }
  );
  result = [...enforcedInformative, ...systemOnly];
  result = stabilizeOverlayTimings(result, {
    starts,
    durations,
    plan: orchestrationPlan,
    config,
    storyboard,
    totalDuration,
  });

  const wordTranscripts = readProjectJson(
    projectDir,
    "word_transcripts.json",
    []
  );
  const sceneMaps = buildSceneTimingMaps(null, storyboard, starts, durations);
  const timingVerified = verifyAndRepairAiOverlayTiming(result, {
    starts,
    durations,
    sceneStarts: sceneMaps.sceneStarts,
    sceneDurations: sceneMaps.sceneDurations,
    wordTranscripts,
    totalDuration,
    plan: orchestrationPlan,
    repair: true,
  });
  result = timingVerified.overlays;
  result = resolveLastMileOverlayCollisions(result, config);
  result = pruneAiOverlaysToStoryBlocks(result, {
    storyboard,
    plan: orchestrationPlan,
    config,
    totalDuration,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REGRA ABSOLUTA DE QUANTIDADE DE OVERLAYS (não pode ser ultrapassada)
  // Shorts: MAX 2 overlays informativos
  // Longos: MAX 1 por minuto (ex: vídeo de 5min = 5 overlays), max 2/min
  // ═══════════════════════════════════════════════════════════════════════
  {
    const isShortVideo = config.aspect_ratio !== "16:9" || totalDuration < 120;
    const informative = result.filter(isInformativeOverlay);
    const system = result.filter((o) => !isInformativeOverlay(o));

    let maxAllowed;
    if (isShortVideo) {
      maxAllowed = 2;
    } else {
      const minutes = Math.max(1, Math.floor(totalDuration / 60));
      maxAllowed = Math.min(minutes * 2, Math.max(3, minutes));
    }

    if (informative.length > maxAllowed) {
      // Keep the best-distributed overlays, sorted by start time
      informative.sort((a, b) => a.start - b.start);
      const kept = informative.slice(0, maxAllowed);
      const removed = informative.slice(maxAllowed);
      removed.forEach((o) =>
        console.log(
          `[Overlay Cap] Removido overlay ${o.id} — limite absoluto: ${maxAllowed} (${isShortVideo ? "SHORT" : "LONG"})`
        )
      );
      console.log(
        `[Overlay Cap] ${informative.length} → ${kept.length} overlays (limite: ${maxAllowed} para ${isShortVideo ? "Shorts" : `vídeo de ${Math.floor(totalDuration / 60)}min`})`
      );
      result = [...kept, ...system];
    }
  }

  storyboard.overlay_timing_report = timingVerified.report;
  result = repairOverlaysEncoding(result);

  const quality = validateVideoQuality({
    overlays: result,
    config,
    storyboard,
    totalDuration,
    starts,
    durations,
    orchestrationPlan,
  });

  const timingIssues = overlayTimingIssuesFromReport(timingVerified.report);
  storyboard.quality_report = {
    ...quality,
    issues: [...(quality.issues || []), ...timingIssues],
    overlay_timing: timingVerified.report,
  };
  try {
    fs.writeFileSync(
      path.join(projectDir, "storyboard.json"),
      JSON.stringify(storyboard, null, 2),
      "utf8"
    );
  } catch (e) {
    console.warn("[Quality] Falha ao salvar quality_report:", e.message);
  }

  if (quality.issues.length) {
    console.log(
      `[Quality] Score ${quality.score}/100 — ${quality.issues.length} observação(ões):`
    );
    quality.issues.forEach((i) =>
      console.log(`  [${i.severity}] ${i.message}`)
    );
  } else {
    console.log(`[Quality] Score ${quality.score}/100 — sem observações.`);
  }

  return result;
}

function readHyperframesSkillExcerpt(maxChars = 2800) {
  const skillPath = path.join(
    WORKSPACE_DIR,
    ".agents",
    "skills",
    "hyperframes",
    "SKILL.md"
  );
  if (!fs.existsSync(skillPath)) return "";
  try {
    let raw = fs.readFileSync(skillPath, "utf8");
    if (raw.startsWith("---")) {
      const parts = raw.split("---");
      raw = parts.length >= 3 ? parts.slice(2).join("---").trim() : raw;
    }
    return raw.slice(0, maxChars);
  } catch {
    return "";
  }
}

/** Prompt compacto para planejar overlays via Gemini no Chrome (extensão). */
function buildCompactOverlayPlanningPrompt(
  projectDir,
  useHyperframes = true,
  planSessionId = null,
  agentLearningsAddendum = "",
  overlayResearch = null
) {
  const config = readProjectJson(projectDir, "config_qanat.json", {});
  const storyboard = readProjectJson(projectDir, "storyboard.json", {});
  const timings = readProjectJson(projectDir, "block_timings.json", {
    total_duration: 0,
  });
  const blockPhrases = Array.isArray(config.block_phrases)
    ? config.block_phrases
    : [];
  if (!blockPhrases.length) return null;

  const niche = config.niche || "Geral";
  const isListicle =
    config.content_mode === "LISTICLE" ||
    storyboard?.listicle?.content_mode === "LISTICLE";
  const isShort =
    config.aspect_ratio === "9:16" || config.video_format === "SHORTS";
  const scenes = (storyboard.visual_prompts || []).slice(0, 36).map((vp) => ({
    scene_id: String(vp.scene || `${vp.block || 1}.1`),
    block: vp.block,
    context_hint: String(vp.prompt || vp.visual_description || "").slice(
      0,
      100
    ),
  }));

  const orchestrationPlan = buildOverlayOrchestrationPlan({
    config,
    niche,
    totalDuration: Number(timings.total_duration) || 0,
    projectName: path.basename(projectDir),
    sceneCount: (storyboard.visual_prompts || []).length,
    blockCount: blockPhrases.length,
  });
  const orchestrationPrompt = buildOrchestrationPrompt(orchestrationPlan);
  const hfGuide = useHyperframes ? readHyperframesSkillExcerpt(7500) : "";
  const hfRefs =
    useHyperframes && Array.isArray(orchestrationPlan.hyperframesRefs)
      ? orchestrationPlan.hyperframesRefs.map((r) => `- ${r}`).join("\n")
      : "";

  const maxOverlays =
    orchestrationPlan.limits?.maxTotal ||
    (isListicle && isShort ? 2 : isShort ? 2 : 10);
  const minGap = orchestrationPlan.limits?.minGapSeconds || (isShort ? 12 : 55);
  const selectedBlockNums = overlayResearch?.selectedBlocks?.length
    ? overlayResearch.selectedBlocks
    : (overlayResearch?.blocks || []).map((b) => b.block).filter(Boolean);
  const sourceLockedRules = overlayResearch?.sourceLocked
    ? [
        "MODO FONTE TRAVADA:",
        "- Use SOMENTE os fatos listados nas fontes do JSON do roteiro.",
        "- PROIBIDO criar overlay para bloco sem fatos listados.",
        "- Cada overlay deve copiar em ai_meta.research_fact um fato listado exatamente para o mesmo bloco.",
        "- props.title/subtitle/text/events/items devem ser derivados desse mesmo research_fact.",
        "- PROIBIDO usar conhecimento geral, nicho, inferencia ou busca externa.",
      ].join("\n")
    : "";
  const blockTopicLines = overlayResearch
    ? buildOverlayResearchPromptBlock(overlayResearch)
    : blockPhrases
        .map((bp) => {
          const selected = selectedBlockNums.includes(bp.block);
          return `- Bloco ${bp.block}${selected ? " [SELECIONADO PARA OVERLAY]" : ""}: assunto="${String(bp.phrase || "").slice(0, 80)}" | tipo sugerido=lower-third | score=0`;
        })
        .join("\n");
  const listicleRules =
    isListicle && isShort
      ? "LISTICLE SHORT: só counters (máx 2), posição bottom-left/right. Sem lower-third/kinetic-text."
      : "";

  const hyperframesSchema = useHyperframes
    ? `
SCHEMA OBRIGATÓRIO (HyperFrames → Remotion):
Cada overlay DEVE ter: id, type, start (scene_id), duration, props.
- timeline: props.events = array com MÍNIMO 2 itens {year, description}
- bar-chart: props.items = array com MÍNIMO 2 itens {label, value, displayValue?, color?}
- pictogram-chart: props.title, props.segments = array com MÍNIMO 2 {label, value (%), color?}, props.icon ("ship"|"building"|"factory"|"person"|"dot"), props.source e scaleLabel opcionais
- location-intro: props.location, props.region, props.country, props.variant ("satellite"|"map"|"minimal"), props.backgroundImage opcional
- counter: props.value (número), props.label, props.suffix opcional
- lower-third: props.title, props.subtitle, props.variant, props.iconType, props.position
Exemplo timeline:
{"id":"tl-1","type":"timeline","start":"2.1","duration":6,"props":{"title":"CRONOLOGIA","events":[{"year":"221 a.C.","description":"Unificação da China"},{"year":"206 a.C.","description":"Grande Muralha"}],"accentColor":"#D4AF37","orientation":"horizontal","iconType":"history"}}
`
    : "";

  return [
    `Você é diretor de overlays cinematográficos para vídeo YouTube (nicho: "${niche}").`,
    useHyperframes
      ? "MODO HYPERFRAMES AI ORQUESTRADO — siga o catálogo e o plano de orquestração abaixo."
      : "",
    "OBJETIVO: enriquecer o vídeo com dados visuais NOVOS — NUNCA repetir, resumir ou parafrasear a narração falada.",
    sourceLockedRules,
    listicleRules,
    useHyperframes
      ? "HyperFrames: variantes glass/bild/accent-underline/clean-bar, iconType temático, customStyle com gradiente e glow. Inspire-se nas refs do catálogo."
      : "",
    planSessionId
      ? `SESSÃO OBRIGATÓRIA: inclua "plan_session":"${planSessionId}" na raiz do JSON (campo obrigatório para validar esta requisição).`
      : "",
    `Retorne APENAS JSON válido: {"plan_session":"...","planejamento":["3 observações"],"overlays":[...]}`,
    'Cada overlay DEVE ter "ai_meta": {scene_rationale, content_summary, design_rationale, research_fact, narration_relation}.',
    `Máximo ${maxOverlays} overlays. Gap mínimo ${minGap}s entre cada overlay.`,
    isShort
      ? `PROIBIDO overlay no começo: nao use cenas/blocos que comecem antes de ${orchestrationPlan.rhythm?.hookCleanSeconds || 6}s. O primeiro overlay deve aparecer so depois do gancho e no trecho correto da historia.`
      : "",
    selectedBlockNums.length
      ? `Gere 1 overlay para CADA bloco selecionado: [${selectedBlockNums.join(", ")}]. Use os fatos da pesquisa web.`
      : "Escolha os blocos com maior potencial de dado visual (números, comparações, datas).",
    'Campo "start" = scene_id do bloco (ex: bloco 3 → "3.1") — NUNCA segundos.',
    "Tipos obrigatórios a variar: counter, bar-chart, timeline, lower-third, kinetic-text.",
    "PROIBIDO: copiar frases dos blocos de narração; 1 overlay por bloco não selecionado; texto >12 palavras; código/terminal.",
    hyperframesSchema,
    hfRefs ? `CATÁLOGO HYPERFRAMES (refs para este nicho):\n${hfRefs}` : "",
    "",
    orchestrationPrompt,
    hfGuide ? `\nGUIA HYPERFRAMES (trecho):\n${hfGuide}` : "",
    "",
    "CENAS (use scene_id no campo start):",
    JSON.stringify(scenes, null, 2),
    "",
    "ASSUNTOS POR BLOCO (extraídos do roteiro — pesquisa web já feita nos [SELECIONADO]):",
    blockTopicLines || "(sem blocos)",
    "",
    "BLOCOS (contexto apenas — NÃO copie estas frases nos overlays):",
    JSON.stringify(
      blockPhrases.slice(0, 14).map((bp) => ({
        block: bp.block,
        hint: String(bp.phrase || "").slice(0, 40) + "…",
      })),
      null,
      2
    ),
    agentLearningsAddendum || "",
  ]
    .filter(Boolean)
    .join("\n");
}

// AI-driven overlay planning for Remotion PRO using Gemini API
async function generateOverlaysWithAI(
  projectDir,
  useHyperframes = false,
  actualScenes = null,
  renderContext = {},
  options = {}
) {
  const {
    llmText: injectedLlmText = null,
    skipBrowserCache = false,
    planningOnly = false,
    agentMode = false,
  } = options;
  await ensureListItemsInProject(projectDir, {
    getApiKey,
    callGemini: (prompt, opts) =>
      callGeminiWithRetry(getApiKey(projectDir), prompt, opts),
    parseJson: (text, label) =>
      parseAiJsonResponse(text, getApiKey(projectDir), label),
    readProjectJson,
  });

  const config = readProjectJson(projectDir, "config_qanat.json", {});
  let storyboard = readProjectJson(projectDir, "storyboard.json", {});
  const timings = readProjectJson(projectDir, "block_timings.json", {
    starts: [],
    durations: [],
  });
  const wordTranscripts = readProjectJson(
    projectDir,
    "word_transcripts.json",
    []
  );

  const blockPhrases = Array.isArray(config.block_phrases)
    ? config.block_phrases
    : [];
  const starts = Array.isArray(timings.starts) ? timings.starts : [];
  const durations = Array.isArray(timings.durations) ? timings.durations : [];
  const apiKey = getApiKey(projectDir);

  const orchestrationPlanEarly = buildOverlayOrchestrationPlan({
    config,
    niche: config.niche || "Geral",
    totalDuration:
      Number(renderContext.totalDuration) ||
      Number(timings.total_duration) ||
      0,
    projectName: renderContext.projectName || path.basename(projectDir),
    sceneCount: Array.isArray(actualScenes) ? actualScenes.length : 0,
    blockCount: blockPhrases.length,
  });

  if (blockPhrases.length === 0) {
    console.log("[Overlays] Sem blocos de narração — nenhum overlay gerado.");
    if (planningOnly) return [];
    return finalizeProjectOverlays(
      projectDir,
      [],
      config,
      storyboard,
      starts,
      durations,
      orchestrationPlanEarly,
      Number(renderContext.totalDuration) || Number(timings.total_duration) || 0
    );
  }

  const plannedRaw =
    Array.isArray(storyboard.overlays_ai) && storyboard.overlays_ai.length > 0
      ? storyboard.overlays_ai
      : storyboard.overlays_planned_at &&
          Array.isArray(storyboard.overlays) &&
          storyboard.overlays.length > 0
        ? stripSystemInjectedOverlays(storyboard.overlays)
        : null;
  const plannedSource = plannedRaw
    ? filterNarrationEchoOverlays(plannedRaw, blockPhrases)
    : null;

  const plannedHyperframes = storyboard.overlays_hyperframes === true;
  if (useHyperframes !== plannedHyperframes && plannedSource?.length) {
    console.log(
      `[Overlays] Modo HyperFrames (${useHyperframes}) difere do planejamento (${plannedHyperframes}) — reutilizando com reparo.`
    );
  }

  if (
    !skipBrowserCache &&
    !injectedLlmText &&
    plannedSource &&
    plannedSource.length > 0
  ) {
    console.log(
      `[Overlays] Reutilizando ${plannedSource.length} overlays planejados${useHyperframes ? " [HyperFrames]" : ""} (re-alinhando com timeline de render).`
    );
    let realigned = repairOverlaysEncoding(
      normalizeGeminiOverlayPayload(
        realignPlannedOverlays(
          plannedSource,
          actualScenes,
          storyboard,
          starts,
          durations,
          wordTranscripts,
          config
        )
      )
    );
    const plannedSceneMaps = buildSceneTimingMaps(
      actualScenes,
      storyboard,
      starts,
      durations
    );
    const plannedTotalDur =
      Number(renderContext.totalDuration) ||
      Number(timings.total_duration) ||
      0;
    realigned = redistributeInformativeOverlayStarts(
      realigned,
      orchestrationPlanEarly,
      plannedTotalDur,
      { starts, durations, sceneStarts: plannedSceneMaps.sceneStarts }
    );
    realigned = enforceOverlayOrchestration(realigned, orchestrationPlanEarly, {
      starts,
      durations,
    });
    realigned = stabilizeOverlayTimings(realigned, {
      starts,
      durations,
      plan: orchestrationPlanEarly,
      config,
      storyboard,
      totalDuration: plannedTotalDur,
    });
    return finalizeProjectOverlays(
      projectDir,
      realigned,
      config,
      storyboard,
      starts,
      durations,
      orchestrationPlanEarly,
      Number(renderContext.totalDuration) || Number(timings.total_duration) || 0
    );
  }

  if (!injectedLlmText && !apiKey && !shouldOfferGeminiBrowser(projectDir)) {
    console.log(
      "[Overlays] Sem chave API — overlays de IA indisponíveis (narração não será repetida)."
    );
    if (planningOnly) return [];
    return finalizeProjectOverlays(
      projectDir,
      [],
      config,
      storyboard,
      starts,
      durations,
      orchestrationPlanEarly,
      Number(renderContext.totalDuration) || Number(timings.total_duration) || 0
    );
  }

  if (
    !injectedLlmText &&
    shouldOfferGeminiBrowser(projectDir) &&
    !(plannedSource && plannedSource.length > 0)
  ) {
    console.log(
      "[Overlays] Gemini Chrome sem planejamento prévio — render sem overlays de narração."
    );
    if (planningOnly) return [];
    return finalizeProjectOverlays(
      projectDir,
      [],
      config,
      storyboard,
      starts,
      durations,
      orchestrationPlanEarly,
      Number(renderContext.totalDuration) || Number(timings.total_duration) || 0
    );
  }

  const blockContexts = blockPhrases.map((bp) => {
    const idx = Number(bp.block || 1) - 1;
    return {
      block: bp.block,
      start: starts[idx] || idx * 15,
      duration: durations[idx] || 15,
      narration: bp.phrase || "",
    };
  });

  const highlightKeywords = Array.isArray(config.highlight_keywords)
    ? config.highlight_keywords
    : [];
  const niche = config.niche || "Geral";
  const totalDuration =
    Number(renderContext.totalDuration) || Number(timings.total_duration) || 0;
  const projectName = renderContext.projectName || path.basename(projectDir);

  const orchestrationPlan = buildOverlayOrchestrationPlan({
    config,
    niche,
    totalDuration,
    projectName,
    sceneCount: Array.isArray(actualScenes) ? actualScenes.length : 0,
    blockCount: blockPhrases.length,
  });
  const orchestrationPrompt = buildOrchestrationPrompt(orchestrationPlan);
  const isListicleOverlay =
    config.content_mode === "LISTICLE" ||
    storyboard?.listicle?.content_mode === "LISTICLE";
  const listicleShortsOverlayRules =
    isListicleOverlay && orchestrationPlan.format === "SHORT"
      ? `
MODO LISTICLE SHORTS (CRÍTICO — leia antes de gerar overlays):
- O sistema JÁ injeta automaticamente: badge #N persistente no topo durante cada item e recap no final. PROIBIDO kinetic-text central "TOP N" ou "#N — título".
- Você deve gerar NO MÁXIMO ${orchestrationPlan.limits.maxTotal} overlays do tipo "counter" APENAS.
- PROIBIDO: lower-third, kinetic-text, bar-chart, timeline, info-card.
- PROIBIDO: 1 overlay por bloco/item do ranking — máximo 1 counter a cada 20 segundos.
- Cada counter = 1 número impactante que NÃO está na narração (ex: alcance em metros, toneladas).
- Posição obrigatória: "bottom-left" ou "bottom-right".
`
      : "";
  console.log(
    `[Orchestration] Formato: ${orchestrationPlan.format} | Perfil: ${orchestrationPlan.varietyLabel} | Máx overlays: ${orchestrationPlan.limits.maxTotal}${isListicleOverlay ? " | LISTICLE" : ""}`
  );

  const scenesContext =
    Array.isArray(actualScenes) && actualScenes.length > 0
      ? actualScenes.map((scene) => ({
          scene_id: String(scene.scene_id || `${scene.block}.1`).trim(),
          block: scene.block,
          start_seconds: Number(scene.start) || 0,
          duration_seconds: Number(scene.duration) || 4,
          narration_text: scene.narrationText || "",
        }))
      : (storyboard.visual_prompts || []).map((vp) => ({
          scene_id: String(vp.scene || `${vp.block || 1}.1`).trim(),
          block: vp.block,
          duration_seconds: vp.duration_seconds || 5,
          visual_description: vp.prompt || "",
          narration_text: vp.narration_text || "",
        }));

  let skillPrompt = "";
  if (useHyperframes) {
    const skillPath = path.join(
      WORKSPACE_DIR,
      ".agents",
      "skills",
      "hyperframes",
      "SKILL.md"
    );
    if (fs.existsSync(skillPath)) {
      try {
        const rawContent = fs.readFileSync(skillPath, "utf8");
        if (rawContent.startsWith("---")) {
          const parts = rawContent.split("---");
          if (parts.length >= 3) {
            skillPrompt = parts.slice(2).join("---").trim();
          } else {
            skillPrompt = rawContent;
          }
        } else {
          skillPrompt = rawContent;
        }
      } catch (e) {
        console.error("[Overlays] Erro ao ler SKILL.md do HyperFrames:", e);
      }
    }
  }

  let systemPrompt = `Você é um diretor cinematográfico e especialista em design de overlays para vídeos de alta retenção (estilo Shorts/TikTok/Reels e Documentários Longos).
Sua tarefa é analisar o roteiro (blocos de narração) de um vídeo e planejar minuciosamente uma lista de overlays informativos complementares de acordo com o assunto específico do vídeo.
O NICHO DO VÍDEO ATUAL É: "${niche}".

IMPORTANTE — SINCRONIZAÇÃO DE TEMPO:
Cada card informativo ou lower-third DEVE aparecer exatamente quando a cena visual correspondente está na tela.
Você é terminantemente PROIBIDO de adivinhar ou inventar segundos absolutos para o campo "start".
O campo "start" na sua resposta JSON deve ser OBRIGATORIAMENTE a string do "scene_id" da cena correta (ex: "1.1", "1.2", "2.1", "3.2").
Para Shorts, NUNCA coloque overlay informativo no começo/gancho. Use apenas cenas depois da zona limpa do plano e somente quando o assunto daquele overlay estiver sendo contado/mostrado.
O overlay deve nascer da história específica do vídeo, não de curiosidades gerais do nicho "${niche}".

Você DEVE realizar um planejamento sistemático e explícito de design e posicionamento das informações antes de gerar cada overlay.
Retorne um objeto JSON contendo exatamente esta estrutura:
{
  "planejamento": [
    "Sua primeira observação de planejamento aqui (ex: como dividiu as informações ao longo do vídeo de forma balanceada)",
    "Sua segunda observação (ex: como escolheu variar entre cards no topo e pílulas embaixo para não poluir visualmente)",
    "Sua terceira observação (ex: como sintetizou os dados do roteiro em textos explicativos curtos e complementares)"
  ],
  "overlays": [
    // Array contendo os objetos de overlay estruturados
  ]
}

${orchestrationPrompt}
${listicleShortsOverlayRules}

${
  useHyperframes
    ? `ATENÇÃO - MODO ORQUESTRADOR HYPERFRAMES AI ATIVADO:
Você deve projetar os overlays usando as regras, templates e o catálogo de alta conversão do HyperFrames.
Utilize as especificações, formatos e exemplos descritos no manual de design a seguir para estruturar as "props" e os objetos de "customStyle" (incluindo cores, raios de borda, glows de sombra e fontes):

${
  skillPrompt ||
  `1. Para "customStyle", você deve configurar as cores de fundo, bordas e sombras neon livremente de acordo com a variante e tema.
2. Diversifique ao máximo os 17 ícones animados ("iconType") conforme o contexto! Não repita os mesmos em sequência.
3. VOCÊ PODE E DEVE CRIAR DIVERSOS FORMATOS DO CATÁLOGO HYPERFRAMES:
   - "tiktok-comment", "reddit-post", "instagram-comment" (use o tipo "info-card" com variante "glass" ou "minimal", avatar e títulos de autor como "r/HojeEuAprendi • p/u/User" ou "@username").
   - "lt-soft-pill" (use o tipo "lower-third" com variante "glass" e cantos muito arredondados "40px", gradientes suaves, e o iconType do Lottie correspondente!).
   - "lt-accent-underline" (use o tipo "lower-third" com variante "accent-underline" para o título ser sublinhado por uma linha colorida neon grossa).
   - "step-by-step-sequence" (use o tipo "timeline" em modo horizontal ou vertical para ilustrar sequências de processos com realces).
   - "key-facts-highlights" (use o tipo "info-card" formatado com quebras de linha e bullets no texto).`
}
`
    : ""
}

REGRAS CRÍTICAS DE MODERAÇÃO E DESIGN:
1. SIGA O PLANO DE ORQUESTRAÇÃO ACIMA — ele define o orçamento exato de overlays para este vídeo. Não exceda os limites.${isListicleOverlay && orchestrationPlan.format === "SHORT" ? " Em LISTICLE SHORTS, gere poucos counters — o HUD de ranking já cobre a identidade visual." : " Use os componentes disponíveis dentro do orçamento."}
   - REGRA ABSOLUTA: em Shorts, gere no máximo 2 overlays informativos no vídeo inteiro e nenhum deles pode aparecer no começo/gancho.
2. LIMITES POR FORMATO (definidos pelo orquestrador — respeite o orçamento):
   - Para vídeos curtos (SHORTS/REELS/TIKTOK)${isListicleOverlay ? " em modo LISTICLE: apenas counters (máx. 2), gap 10s+" : ": Use kinetic-text, counter, bar-chart, timeline e lower-third distribuídos nos atos do plano. Varie tipos e posições. Gap mínimo de 5s entre overlays."}
   - Para vídeos LONGOS: Intervalo de pelo menos 18 segundos "limpo" entre overlays. Priorize dados visuais sobre texto.
3. COMPONENTES DISPONÍVEIS NO REMOTION (use todos conforme o contexto):
   - "kinetic-text": frases de impacto com animação slam/reveal/glitch (ideal para viradas narrativas em Shorts)
   - "lower-third": nomes, definições, contexto (variantes: glass, bild, accent-underline, bold-block, clean-bar, soft-pill, color-block, dark-card, kicker-name, mask-reveal, side-rule, stack-bars, youtube-bar, news-ticker)
   - "counter": números, estatísticas, datas (com suffix e formatNumber)
   - "bar-chart": comparações visuais (2-4 itens)
   - "pictogram-chart": infográfico full-screen com grid de ícones coloridos por % (estilo jornalismo de dados / shipbuilding chart)
   - "location-intro": intro full-screen estilo satélite ao citar cidade/país (zoom + nome do local)
   - "geo-map": card compacto com pin para menções rápidas de local
   - "timeline": sequências, processos, linha do tempo (horizontal em longos, vertical em shorts)
4. RELEVÂNCIA E RESTRIÇÃO DE NICHO ESTREITA:
   - Se o nicho do vídeo atual for diferente de "Tecnologia" ou "Programação" (como é o caso de "História", "Geografia", "Finanças", "Curiosidades", etc. e o atual é "${niche}"), VOCÊ É TERMINANTEMENTE PROIBIDO de gerar qualquer overlay que contenha códigos de programação, código fonte, terminais de comando, imports de bibliotecas (como 'geo-eng' ou '.js'), mockups do VS Code, syntax highlighting ou o tipo "macos-bash-terminal", "vscode-code-highlight", "git-diff-showcase", "hacker-matrix-terminal", "code-highlight-sweep". Esses layouts de código e programação irritam o usuário e quebram a imersão em vídeos comuns! Use apenas layouts de postagens comuns (Reddit, TikTok bubble, Instagram comment), pílulas, infográficos, fatos-chave, etc.
5. TEXTOS CURTOS E NÃO REPETITIVOS (SÍNTESE INTELIGENTE):
    - Os overlays NÃO devem transcrever a narração falada longa. Eles devem exibir dados complementares novos, definições curtas ou curiosidades de leitura ultra-rápida.
    - Se for um Short (9:16): O TEXTO DEVE TER NO MÁXIMO 3 A 5 PALAVRAS. O espaço vertical é extremamente estreito; textos longos poluem e arruínam a retenção!
    - Se for um vídeo Longo (16:9): No máximo 5 a 10 palavras. Nunca cole parágrafos inteiros.
    - Proibido gerar múltiplos overlays na mesma cena ou para o mesmo bloco de narração. Deve haver estrita ordem cronológica crescente de "start" baseada no scene_id (ex: cena 1.1 depois 1.2 depois 2.1).
 6. DIVERSIFICAÇÃO E PLANEJAMENTO DE POSIÇÕES:
    - ${isListicleOverlay ? "Em LISTICLE: topo reservado para badge #N — counters e outros overlays só em bottom-left ou bottom-right." : "Busque equilíbrio alternando posições superiores e inferiores. Não repita o mesmo canto em sequência."}
7. INTEGRAÇÃO RICA DE LOTTIE FILES NOS CARDS E LOWER THIRDS:
   - Certifique-se de associar animações Lottie variadas e temáticas a cada card moderno E a cada lower-third usando a propriedade "iconType". Use ícones adequados de forma diversificada (ex: "warning" para alertas, "compass" para geografia/localização, "history" para datas históricas, "earth" para assuntos mundiais, "shield" para proteção/guerras, "sparkles" para curiosidades, "money" para finanças/riqueza). Não repita o mesmo ícone!
8. METADADOS OBRIGATÓRIOS POR OVERLAY ("ai_meta"):
   - Cada overlay DEVE incluir "ai_meta" com: scene_rationale, content_summary, design_rationale, research_fact (fato da pesquisa usado ou null), narration_relation.
   - scene_rationale: explique POR QUE na cena X (scene_id) e não em outra.
   - content_summary: o que o overlay comunica de forma independente da narração.
   - design_rationale: justifique type, variant, theme, iconType e position escolhidos.
   - research_fact: cite o fato/número da seção "DADOS REAIS DA INTERNET" que originou o conteúdo; se não houver, null.
   - narration_relation: como complementa (não repete) o trecho falado da cena.
9. VARIANTES DE LOWER-THIRD DO CATÁLOGO HYPERFRAMES:
   - Para o tipo "lower-third", você DEVE definir a propriedade "variant" escolhendo o estilo visual mais adequado ao trecho do vídeo:
     - "bild": Estilo jornalístico clássico com blocos de fundo sólidos e sombras coloridas projetadas.
     - "bold-block": Estilo podcast retangular sólido com título grosso e subtítulo em caixa menor em amarelo/accent.
     - "accent-underline": Estilo minimalista com título sublinhado por linha neon grossa e sem painel de fundo.
     - "clean-bar": Estilo corporativo limpo com barra lateral neon grossa e fundo de vidro translúcido.
     - "glass": Estilo padrão translúcido elegante e arredondado.

Estrutura JSON Exigida:
{
  "planejamento": [
    "Resumo da estratégia de planejamento visual"
  ],
  "overlays": [
    {
      "id": "lt-block-1",
      "type": "lower-third",
      "start": "1.1",
      "duration": 3.5,
      "ai_meta": {
        "scene_rationale": "Por que este overlay aparece nesta cena específica",
        "content_summary": "O que o espectador aprende de novo ao ler o overlay",
        "design_rationale": "Por que lower-third/glass/tema classic e ícone sparkles",
        "research_fact": "Fato da pesquisa web usado (ou null se veio só do roteiro)",
        "narration_relation": "Complementa a narração com X sem repetir o que foi dito"
      },
      "props": {
        "title": "TECNOLOGIA PREMIUM",
        "subtitle": "Concreto romano com autocura inteligente.",
        "accentColor": "#00FF9D",
        "theme": "classic",
        "variant": "glass",
        "iconType": "sparkles",
        "position": "bottom-left",
        "customStyle": {
          "background": "linear-gradient(135deg, rgba(10, 15, 12, 0.85) 0%, rgba(20, 30, 25, 0.8) 100%)",
          "border": "1.5px solid rgba(0, 255, 157, 0.25)",
          "borderRadius": "40px",
          "boxShadow": "0 12px 36px rgba(0, 255, 157, 0.15)",
          "colorTitle": "#00FF9D",
          "colorSubtitle": "#E2E8F0"
        }
      }
    },
    {
      "id": "info-1",
      "type": "info-card",
      "start": "1.2",
      "duration": 5.0,
      "props": {
        "title": "AUTOCURA TÉRMICA",
        "description": "Cinza vulcânica reage com a água selando fissuras ativamente.",
        "iconType": "flame",
        "position": "top-right",
        "accentColor": "#FF3D00",
        "variant": "glass",
        "theme": "classic",
        "customStyle": {
          "background": "linear-gradient(135deg, rgba(15, 10, 10, 0.85) 0%, rgba(30, 15, 15, 0.8) 100%)",
          "border": "1.5px solid rgba(255, 61, 0, 0.25)",
          "borderRadius": "16px",
          "boxShadow": "0 12px 36px rgba(255, 61, 0, 0.15)"
        }
      }
    },
    {
      "id": "counter-1",
      "type": "counter",
      "start": "2.1",
      "duration": 4.5,
      "props": {
        "value": 2000,
        "label": "Resistência Estrutural",
        "suffix": "Anos",
        "formatNumber": true,
        "accentColor": "#00E5FF",
        "position": "bottom-right",
        "theme": "classic",
        "customStyle": {
          "background": "linear-gradient(135deg, rgba(8, 12, 16, 0.85) 0%, rgba(14, 20, 28, 0.8) 100%)",
          "border": "1.5px solid rgba(0, 229, 255, 0.25)",
          "borderRadius": "16px",
          "boxShadow": "0 12px 36px rgba(0, 229, 255, 0.15)",
          "colorValue": "#00E5FF"
        }
      }
    },
    {
      "id": "bar-1",
      "type": "bar-chart",
      "start": "2.2",
      "duration": 6.0,
      "props": {
        "title": "COMPARAÇÃO DE ALTURA",
        "items": [
          { "label": "Gizé", "value": 146, "displayValue": "146m", "color": "#D4AF37" },
          { "label": "Burj Khalifa", "value": 828, "displayValue": "828m", "color": "#00E5FF" }
        ],
        "accentColor": "#D4AF37",
        "position": "bottom-center",
        "theme": "classic",
        "customStyle": {
          "background": "linear-gradient(135deg, rgba(15, 12, 10, 0.85) 0%, rgba(25, 20, 15, 0.8) 100%)",
          "border": "1.5px solid rgba(212, 175, 55, 0.25)",
          "borderRadius": "16px"
        }
      }
    },
    {
      "id": "timeline-1",
      "type": "timeline",
      "start": "3.1",
      "duration": 7.0,
      "props": {
        "title": "LINHA DO TEMPO ROMANA",
        "events": [
          { "year": "753 a.C.", "description": "Fundação de Roma", "highlight": false },
          { "year": "27 a.C.", "description": "Início do Império", "highlight": false },
          { "year": "476 d.C.", "description": "Queda do Império", "highlight": true }
        ],
        "accentColor": "#FF3D00",
        "orientation": "horizontal",
        "theme": "classic",
        "customStyle": {
          "background": "linear-gradient(135deg, rgba(10, 10, 15, 0.85) 0%, rgba(18, 18, 25, 0.8) 100%)",
          "border": "1.5px solid rgba(255, 61, 0, 0.2)",
          "borderRadius": "16px",
          "colorTitle": "#FFD700"
        }
      }
    }
  ]
}
`;

  if (agentMode) {
    const studioAddendum = buildStudioAgentsPromptAddendum(WORKSPACE_DIR, {
      niche,
      task: "overlay",
      format: detectVideoFormat(config, totalDuration),
    });
    if (studioAddendum) {
      systemPrompt += studioAddendum;
      console.log(
        "[Studio Agents] Memória + skills bundle injetados no prompt de overlays."
      );
    }
  }

  const overlayResearch = await resolveOverlayResearchForPlanning(
    projectDir,
    WORKSPACE_DIR,
    {
      orchestrationPlan,
      callGemini: (prompt, opts) =>
        callGeminiWithRetry(getApiKey(projectDir), prompt, opts),
    }
  );
  storyboard.overlays_research = overlayResearch;
  const overlayResearchBlock = buildOverlayResearchPromptBlock(overlayResearch);
  if (overlayResearchBlock) {
    systemPrompt += overlayResearchBlock;
  }

  const userPrompt = `Aqui está a lista de CENAS do vídeo com tempos reais, narração e IDs de cena:
${JSON.stringify(scenesContext, null, 2)}

Contexto adicional por blocos de narração:
${JSON.stringify(blockContexts, null, 2)}

Gere o plano de planejamento e overlays seguindo rigorosamente as regras. Associe cada overlay ao "scene_id" da cena onde a informação é realmente ilustrada visualmente. Use APENAS scene_id no campo "start", nunca segundos absolutos.`;

  try {
    let rawResponse = injectedLlmText;
    if (!rawResponse) {
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      };
      rawResponse = await callGeminiWithRetry(apiKey, null, {
        bodyOverride: requestBody,
      });
    }

    let cleaned =
      extractOverlayJsonPayload(rawResponse) ||
      String(rawResponse || "").trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/g, "")
        .trim();
    }
    if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
      cleaned = extractOverlayJsonPayload(cleaned) || cleaned;
    }

    let parsedOverlays = [];
    let overlayPlanejamento = [];
    try {
      const resultObj = JSON.parse(cleaned);
      if (Array.isArray(resultObj)) {
        parsedOverlays = resultObj;
      } else if (resultObj && Array.isArray(resultObj.overlays)) {
        parsedOverlays = resultObj.overlays;
        if (resultObj.planejamento) {
          overlayPlanejamento = resultObj.planejamento;
          console.log(
            "[Overlays Planning] Plano detalhado executado pela IA para este vídeo:"
          );
          resultObj.planejamento.forEach((p) => console.log(`  - ${p}`));
          persistOverlayPlanejamento(projectDir, overlayPlanejamento);
        }
      } else if (resultObj?.data && Array.isArray(resultObj.data.overlays)) {
        parsedOverlays = resultObj.data.overlays;
      } else if (resultObj && typeof resultObj === "object") {
        const arrayKey = Object.keys(resultObj).find((key) => {
          const val = resultObj[key];
          return (
            Array.isArray(val) &&
            val.length > 0 &&
            val[0] &&
            (val[0].type || val[0].text || val[0].props)
          );
        });
        if (arrayKey) {
          parsedOverlays = resultObj[arrayKey];
          console.log(`[Overlays] JSON extraído do campo "${arrayKey}".`);
        } else {
          console.warn(
            "[Overlays] Formato inesperado do Gemini — sem array de overlays."
          );
          parsedOverlays = [];
        }
      } else {
        parsedOverlays = [];
      }
    } catch (parseErr) {
      console.error(
        "[Overlays] Erro ao parsear JSON principal, tentando extração balanceada:",
        parseErr
      );
      const recovered =
        extractOverlayJsonPayload(cleaned) ||
        extractOverlayJsonPayload(rawResponse);
      if (!recovered) throw parseErr;
      const resultObj = JSON.parse(recovered);
      if (Array.isArray(resultObj)) {
        parsedOverlays = resultObj;
      } else if (Array.isArray(resultObj?.overlays)) {
        parsedOverlays = resultObj.overlays;
        if (resultObj.planejamento) {
          overlayPlanejamento = resultObj.planejamento;
          persistOverlayPlanejamento(projectDir, overlayPlanejamento);
        }
      } else {
        throw parseErr;
      }
    }
    if (Array.isArray(parsedOverlays)) {
      parsedOverlays = repairStoryboardEncoding(
        normalizeGeminiOverlayPayload(parsedOverlays)
      );
      console.log(
        `[Overlays] IA gerou com sucesso ${parsedOverlays.length} overlays complementares (mojibake reparado).`
      );

      alignOverlayTimings(
        parsedOverlays,
        actualScenes,
        storyboard,
        starts,
        durations,
        wordTranscripts,
        config
      );

      const isTech =
        niche.toLowerCase().includes("tecnologia") ||
        niche.toLowerCase().includes("programacao") ||
        niche.toLowerCase().includes("computador") ||
        niche.toLowerCase().includes("ciber") ||
        niche.toLowerCase().includes("software");
      const orchProfile =
        VARIETY_PROFILES.find(
          (p) => p.id === orchestrationPlan.varietyProfile
        ) || VARIETY_PROFILES[0];
      const variants = ["glass", "minimal", "accent", "floating"];
      const positions = orchProfile.positions;
      const lotties = orchProfile.lotties;
      const ltVariants = orchProfile.lowerThirdVariants;

      let variantIdx = 0;
      let posIdx = 0;
      let lottieIdx = 0;

      for (let i = 0; i < parsedOverlays.length; i++) {
        const overlay = parsedOverlays[i];
        if (!overlay.props) overlay.props = {};
        const sceneId = String(overlay.scene_ref || overlay.start || "").trim();
        const sceneCtx =
          scenesContext.find(
            (s) => String(s.scene_id || s.scene) === sceneId
          ) || null;
        ensureOverlayAiMeta(overlay, overlayResearch, sceneCtx);

        // 0. Converte info-cards temáticos para lower-thirds (Tirar cards temáticos e colocar lower thirds)
        if (overlay.type === "info-card") {
          console.log(
            `[Overlays Post-Process] Convertendo info-card temático (${overlay.props.title}) para lower-third.`
          );
          overlay.type = "lower-third";
          overlay.props.subtitle = overlay.props.description || "";
          delete overlay.props.description;

          // Ajusta a posição para ser compatível com lower-third
          const pos = overlay.props.position || "bottom-left";
          if (pos.includes("right")) {
            overlay.props.position = "bottom-center";
          } else if (pos.includes("top")) {
            overlay.props.position = "top-left";
          } else {
            overlay.props.position = "bottom-left";
          }
        }

        // 1. Corrigir vazamento de código de programação em vídeos que não são de tecnologia
        if (!isTech) {
          let hasCodeContent = false;
          const codeKeywords = [
            "import",
            "const ",
            "let ",
            "var ",
            "console.log",
            "npm run",
            ".js",
            ".ts",
            ".py",
            ".json",
            ".cpp",
            ".h",
            ".cs",
            ".sh",
            "function ",
            "void ",
            "class ",
            "public ",
            "private ",
            "struct ",
            "def ",
            "return ",
            "import {",
            "<pre",
            "<code>",
          ];

          const textToCheck = (
            (overlay.props.title || "") +
            " " +
            (overlay.props.description || "") +
            " " +
            (overlay.props.subtitle || "")
          ).toLowerCase();
          for (const kw of codeKeywords) {
            if (textToCheck.includes(kw)) {
              hasCodeContent = true;
              break;
            }
          }

          if (hasCodeContent || overlay.props.theme === "tech") {
            console.log(
              `[Overlays Post-Process] Convertendo card de código detectado incorretamente para o nicho ${niche}`
            );
            overlay.props.theme = "classic";
            overlay.props.variant = "glass";

            let title = overlay.props.title || "";
            title = title.replace(/\.(js|ts|py|sh|json|cpp|h|cs)$/i, "");
            title = title.replace(/[📄⚡⚙️📡🔴🟡🟢~#$]+/g, "");
            title = title.trim();
            if (
              !title ||
              title.toLowerCase().includes("bash") ||
              title.toLowerCase().includes("git") ||
              title.toLowerCase().includes("terminal") ||
              title.toLowerCase().includes("code") ||
              title.toLowerCase().includes("sweep")
            ) {
              title = "INFORMAÇÃO";
            }
            overlay.props.title = title.toUpperCase();

            // Recupera e limpa a descrição original ou subtítulo
            let desc =
              overlay.props.description || overlay.props.subtitle || "";
            desc = desc.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "$1");
            desc = desc.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, "$1");
            desc = desc.replace(/const\s+\w+\s*=[\s\S]*?;/g, "");
            desc = desc.replace(/import\s+[\s\S]*?;/g, "");
            desc = desc.replace(/console\.log\([\s\S]*?\);?/g, "");
            desc = desc.replace(/\s+/g, " ").trim();

            if (!desc || desc.length < 5) {
              // Usa uma descrição complementar limpa de alta conversão sem nenhuma relação com o roteiro falado
              if (overlay.props.theme === "ancient") {
                desc =
                  "Detalhes e engenharia antiga com curiosidades importantes.";
              } else if (overlay.props.theme === "nature") {
                desc = "Aspectos geográficos e dados sobre a região analisada.";
              } else if (overlay.props.theme === "industrial") {
                desc =
                  "Propriedades físicas dos materiais e técnicas estruturais.";
              } else if (overlay.props.theme === "mysterious") {
                desc = "Teorias, enigmas e hipóteses do período histórico.";
              } else {
                desc = "Informações técnicas adicionais sobre este segmento.";
              }
            } else {
              // Trunca a própria descrição para no máximo 12 palavras
              const words = desc.split(/\s+/);
              if (words.length > 12) {
                desc = words.slice(0, 12).join(" ") + "...";
              }
            }

            if (overlay.type === "lower-third") {
              overlay.props.subtitle = desc;
            } else {
              overlay.props.description = desc;
            }

            if (overlay.props.customStyle) {
              delete overlay.props.customStyle.fontFamilyTitle;
              delete overlay.props.customStyle.fontFamilyDesc;
              delete overlay.props.customStyle.fontFamilyValue;
            }
          }
        }

        // 2. Randomização e Diversificação obrigatória de layouts, variantes e posições por vídeo
        if (overlay.type === "lower-third") {
          overlay.props.variant = ltVariants[variantIdx % ltVariants.length];
          variantIdx++;
        } else if (overlay.type === "info-card") {
          const cardVariants = ["glass", "minimal", "accent", "floating"];
          overlay.props.variant =
            cardVariants[variantIdx % cardVariants.length];
          variantIdx++;
        } else {
          overlay.props.variant = variants[variantIdx % variants.length];
          variantIdx++;
        }

        overlay.props.position = positions[posIdx % positions.length];
        posIdx++;

        if (
          overlay.type === "info-card" ||
          overlay.type === "counter" ||
          overlay.type === "bar-chart" ||
          overlay.type === "lower-third"
        ) {
          overlay.props.iconType = lotties[lottieIdx % lotties.length];
          lottieIdx++;
        }

        // Mapeia temas baseados no nicho
        const cleanNiche = niche.toLowerCase();
        if (
          !overlay.props.theme ||
          (overlay.props.theme === "tech" && !isTech)
        ) {
          if (
            cleanNiche.includes("historia") ||
            cleanNiche.includes("arqueologia") ||
            cleanNiche.includes("inca") ||
            cleanNiche.includes("egito") ||
            cleanNiche.includes("antigo") ||
            cleanNiche.includes("castelo")
          ) {
            overlay.props.theme = "ancient";
          } else if (
            cleanNiche.includes("deserto") ||
            cleanNiche.includes("natureza") ||
            cleanNiche.includes("geografia") ||
            cleanNiche.includes("amazonia")
          ) {
            overlay.props.theme = "nature";
          } else if (
            cleanNiche.includes("militar") ||
            cleanNiche.includes("guerra") ||
            cleanNiche.includes("industrial")
          ) {
            overlay.props.theme = "industrial";
          } else {
            overlay.props.theme = "classic";
          }
        }

        // Injeta customStyle decorativo e vibrante correspondente ao tema
        if (!overlay.props.customStyle) overlay.props.customStyle = {};
        const accent = overlay.props.accentColor || "#D4AF37";

        if (overlay.props.theme === "ancient") {
          overlay.props.customStyle = {
            ...overlay.props.customStyle,
            background:
              "linear-gradient(135deg, rgba(22, 14, 8, 0.97) 0%, rgba(42, 28, 16, 0.94) 100%)",
            border: `2px double ${accent}`,
            borderRadius: "16px 2px",
            boxShadow: `0 10px 40px ${accent}30`,
            fontFamilyTitle: "Cinzel",
            fontFamilyDesc: "Inter",
          };
        } else if (overlay.props.theme === "nature") {
          overlay.props.customStyle = {
            ...overlay.props.customStyle,
            background:
              "linear-gradient(135deg, rgba(8, 20, 12, 0.96) 0%, rgba(16, 40, 24, 0.92) 100%)",
            border: `1.5px solid ${accent}60`,
            borderRadius: "24px 4px",
            boxShadow: `0 10px 30px ${accent}25`,
            fontFamilyTitle: "Montserrat",
            fontFamilyDesc: "Inter",
          };
        } else if (overlay.props.theme === "industrial") {
          overlay.props.customStyle = {
            ...overlay.props.customStyle,
            background:
              "linear-gradient(135deg, rgba(12, 12, 14, 0.98) 0%, rgba(26, 26, 30, 0.95) 100%)",
            borderLeft: `5px solid ${accent}`,
            borderRadius: "0px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.8)",
            fontFamilyTitle: "Oswald",
            fontFamilyDesc: "Inter",
          };
        } else if (overlay.props.theme === "mysterious") {
          overlay.props.customStyle = {
            ...overlay.props.customStyle,
            background:
              "linear-gradient(135deg, rgba(10, 5, 18, 0.97) 0%, rgba(24, 12, 40, 0.94) 100%)",
            border: `1px solid ${accent}40`,
            borderRadius: "14px",
            boxShadow: `0 12px 36px ${accent}35, inset 0 0 15px rgba(255,255,255,0.02)`,
            fontFamilyTitle: "Cinzel",
            fontFamilyDesc: "Inter",
          };
        } else {
          // Classic / default
          overlay.props.customStyle = {
            ...overlay.props.customStyle,
            background: "rgba(18, 18, 20, 0.92)",
            border: `1.5px solid rgba(255, 255, 255, 0.15)`,
            borderRadius: "20px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            fontFamilyTitle: "Inter",
            fontFamilyDesc: "Inter",
          };
        }

        // Detect if the AI duplicated the narration script inside the overlay text, and rewrite/remove it
        const currentBlockNum =
          Number(overlay.id.replace(/[^\d]/g, "")) || i + 1;
        const currentBlockCtx =
          blockContexts.find((bc) => Number(bc.block) === currentBlockNum) ||
          blockContexts[i] ||
          blockContexts[0];
        if (currentBlockCtx && currentBlockCtx.narration) {
          const cleanNarr = currentBlockCtx.narration
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .trim();

          if (overlay.props.description) {
            const cleanDesc = overlay.props.description
              .toLowerCase()
              .replace(/[^\w\s]/g, "")
              .trim();
            if (
              cleanNarr.includes(cleanDesc) ||
              cleanDesc.includes(cleanNarr) ||
              (cleanDesc.length > 30 &&
                cleanNarr.substring(0, 30) === cleanDesc.substring(0, 30))
            ) {
              console.log(
                `[Overlays Post-Process] Duplicação de narração detectada na descrição do overlay ${overlay.id}. Substituindo por curiosidade complementar.`
              );
              if (overlay.props.theme === "ancient") {
                overlay.props.description =
                  "Aspectos históricos e engenharia clássica do período.";
              } else if (overlay.props.theme === "nature") {
                overlay.props.description =
                  "Fatores ambientais e especificações da geografia local.";
              } else if (overlay.props.theme === "industrial") {
                overlay.props.description =
                  "Propriedades físicas dos materiais e técnicas estruturais.";
              } else if (overlay.props.theme === "mysterious") {
                overlay.props.description =
                  "Mistérios intrigantes, segredos e teorias propostas.";
              } else {
                overlay.props.description =
                  "Dados de engenharia e informações técnicas adicionais.";
              }
            }
          }

          if (overlay.props.subtitle) {
            const cleanSub = overlay.props.subtitle
              .toLowerCase()
              .replace(/[^\w\s]/g, "")
              .trim();
            if (
              cleanSub.split(/\s+/).length > 2 &&
              (cleanNarr.includes(cleanSub) || cleanSub.includes(cleanNarr))
            ) {
              console.log(
                `[Overlays Post-Process] Duplicação de narração detectada no subtítulo do overlay ${overlay.id}. Removendo subtítulo.`
              );
              overlay.props.subtitle = "";
            }
          }
        }

        // Enforce maximum length of 12 words on descriptions and subtitles to prevent raw script leaking
        if (overlay.props.description) {
          const words = overlay.props.description.trim().split(/\s+/);
          if (words.length > 12) {
            overlay.props.description = words.slice(0, 12).join(" ") + "...";
          }
        }
        if (overlay.props.subtitle) {
          const words = overlay.props.subtitle.trim().split(/\s+/);
          if (words.length > 12) {
            overlay.props.subtitle = words.slice(0, 12).join(" ") + "...";
          }
        }
      }

      parsedOverlays = filterNarrationEchoOverlays(
        parsedOverlays,
        blockPhrases
      );
      const genSceneMaps = buildSceneTimingMaps(
        actualScenes,
        storyboard,
        starts,
        durations
      );
      parsedOverlays = redistributeInformativeOverlayStarts(
        parsedOverlays,
        orchestrationPlan,
        totalDuration,
        { starts, durations, sceneStarts: genSceneMaps.sceneStarts }
      );
      parsedOverlays = enforceOverlayOrchestration(
        parsedOverlays,
        orchestrationPlan,
        { starts, durations }
      );
      parsedOverlays = stabilizeOverlayTimings(parsedOverlays, {
        starts,
        durations,
        plan: orchestrationPlan,
        config,
        storyboard,
        totalDuration,
      });

      if (planningOnly) {
        return parsedOverlays;
      }

      return finalizeProjectOverlays(
        projectDir,
        parsedOverlays,
        config,
        storyboard,
        starts,
        durations,
        orchestrationPlan,
        totalDuration
      );
    }
  } catch (err) {
    console.error("[Overlays] Erro ao chamar IA para overlays:", err);
    if (planningOnly) return [];
  }

  if (planningOnly) return [];

  console.log("[Overlays] IA indisponível — sem fallback de narração.");
  return finalizeProjectOverlays(
    projectDir,
    [],
    config,
    storyboard,
    starts,
    durations,
    orchestrationPlan,
    totalDuration
  );
}

function injectRetentionOverlays(
  projectDir,
  overlays,
  starts,
  durations,
  config = {},
  storyboard = {}
) {
  const cachePath = path.join(projectDir, "youtube_metadata_cache.json");
  if (!fs.existsSync(cachePath)) return overlays;
  let cache;
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  } catch {
    return overlays;
  }

  const hook = cache?.parsed?.retentionHook || cache?.parsed?.hook;
  const cta = cache?.parsed?.midVideoCta;
  const result = Array.isArray(overlays) ? [...overlays] : [];
  const isListicle =
    config?.content_mode === "LISTICLE" ||
    storyboard?.listicle?.content_mode === "LISTICLE";
  const hookPosition = isListicle ? "bottom-left" : "center";

  if (hook) {
    result.unshift({
      id: "retention-hook",
      type: "lower-third",
      start: 0.5,
      duration: 4,
      props: {
        title: String(hook).slice(0, 60).toUpperCase(),
        subtitle: "",
        accentColor: "#FF4444",
        position: hookPosition,
      },
    });
  }

  if (cta && Array.isArray(durations) && durations.length) {
    const midIdx = Math.floor(durations.length / 2);
    const midStart = Number(starts?.[midIdx]) || 30;
    result.push({
      id: "mid-video-cta",
      type: "lower-third",
      start: midStart,
      duration: 3.5,
      props: {
        title: String(cta).slice(0, 50),
        subtitle: "",
        accentColor: "#D4AF37",
        position: "bottom-center",
      },
    });
  }

  return result;
}

/** @deprecated Fallback que repetia narração — mantido vazio por compatibilidade. */
function generateOverlaysRuleBased() {
  console.log("[Overlays] Fallback local de narração desativado.");
  return [];
}
