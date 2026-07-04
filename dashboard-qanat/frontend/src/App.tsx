import toast, { Toaster } from 'react-hot-toast';

import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';

import { buildTaggedNarration, taggedNarrationMeta, type TaggedNarrationPlatform } from './taggedNarration';

import { useGeminiBrowserBridge } from './GeminiBrowserBridge';
import { fetchCreatorScriptAi, fetchGeminiAi } from './geminiAiFetch';
import { AiJobProgressBar } from './AiJobProgressBar';
import { createProgressJobId, startAiJobProgress, stopAiJobProgress } from './aiJobProgressClient';
import { useGeminiBrowserResolver } from './useGeminiBrowserResolver';
import { captureGeminiNarrationNow, diagnoseGeminiExtension, isGeminiExtensionAvailable, resetGeminiExtensionCache } from './geminiExtensionBridge';
import type { SettingsSection } from './SettingsSectionNav';
import { SettingHelpTip } from './SettingHelpTip';
import { SECTION_HELP } from './sectionHelpContent';
import { applyVisualPatchToConfig, pickVisualConfig, visualDraftToApiPatch } from './visualConfig';
import {
  loadWizardSession,
  saveWizardSession,
  clearWizardSession,
  shouldRestoreWizardTab,
  resolveWizardActiveProject,
  isServerSessionNewer,
  formatWizardSavedAt,
  type WizardSessionPatch,
} from './wizardSession';
import {
  PreRenderAdviceModal,
  type PreRenderAdvice,
} from './PreRenderAdvice';
import {
  applyProductionPatchToConfig,
  pickProductionConfig,
  productionDraftToApiPatch,
  stripConfigApiMetadata,
  type BgmProductionHints,
} from './productionConfig';
import type { YoutubeChannelAlerts } from './YoutubeStudioPanel';
import { useResurrectorScheduler } from './useResurrectorScheduler';


import type { ProjectListItem } from './ProjectsLibraryPanel';
import { AppShell } from './AppShell';
import { resolveStockSearchQuery } from './stockSearchQuery';
import type { AppTab } from './appTabs';
import { isGlobalViewTab, RESTORABLE_APP_TABS } from './appTabs';


import { clipKey, parseClipKey } from './opencutTimeline';
import {
  getYoutubeNotificationsEnabled,
  getYoutubePollIntervalMs,
  getYoutubeViewsThreshold,
} from './youtubeStudioPrefs';

import {
  applySplitNarrationToBlockAssets,
  findBoundedNarrationMatch,
  getAssetNarrationText as resolveAssetNarrationText,
  getBlockNarrationText as resolveBlockNarrationText,
  getBlockTimeBounds as resolveBlockTimeBounds,
  buildBlockNarrationWordsCache,
  buildNarrationMatchesCache,
  lookupNarrationTimestamps,
  swapBlockVisualPromptsInStoryboard,
  type NarrationSyncContext,
} from './timelineNarrationSync';
import {
  createBlockAssetDurationResolver,
  recalculateBlockAudioStarts as recalculateBlockAudioStartsCore,
  enrichTimelineAudioStarts as enrichTimelineAudioStartsCore,
} from './timelineBlockAudioStarts';
import { getDynamicAssetWords as getDynamicAssetWordsCore } from './timelineDynamicAssetWords';
import { alignBlockAssetsToTranscript } from './timelineSpeechAlign';
import { resolveBgmMode } from '@lumiera/shared/bgmMode.js';

import { flattenWordTranscripts } from '@lumiera/shared/wordTranscripts.js';
import { repairMojibake, repairMojibakeDeep } from './textEncoding';
import {
  type CreatorApplyIdeaOptions,
  type EditorialIdeaImport,
  buildEditorialImportOutline,
  buildOpenMontageCreatorOutline,
  resolveEditorialImportOutline,
  coerceCreatorTextField,
  isClipFactorySource,
  isPioneerStrategyText,
  parseEditorialSourceProject,
  resolveOpenMontageConcept,
  resolvePioneerCreatorSeed,
} from './creatorEditorialImport';
import { sanitizeTimelineAssets } from './timelineAssetSanitize';
import type { ListicleIdeasResponse } from './ListicleRankingIdeas';
import type {
  BgmEmotionMapping,
  ConfigData,
  HeaderWeather,
  MusicFile,
  OutputVideo,
  PendingRenderJob,
  StudioBundlePreview,
  VideoQualityReport,
  WorkspaceStatus,
} from './appTypes';
import { PROJECT_WORKSPACE_TABS, RECENT_PROJECTS_KEY, RENDER_MODE_LABELS } from './appConstants';
import { parseCreatorBlockNumber, countCreatorUniqueBlocks, getBlockTimingSummary } from './creatorTimingUtils';
import { getSceneDurationSeconds, isWhisperTimelineReady } from './sceneSpeechDuration';
import { FACELESS_NICHE_PRESETS, canRunFacelessPipeline90 } from './facelessChannel';
import { buildThumbnailBrief, normalizeYoutubeMetadataDisplay } from './youtubeMetadataDisplay';
import { buildAppTabPropBundles } from './appTabPropBundles';
import { AppOverlays } from './AppOverlays';
const RichTimelineEditor = lazy(() =>
  import('./RichTimelineEditor').then((m) => ({ default: m.RichTimelineEditor })),
);
const AppTabPanels = lazy(() => import('./AppTabPanels').then((m) => ({ default: m.AppTabPanels })));
import { TabPanelFallback } from './appLazyPanels';

const initialWizardSession = loadWizardSession();

export default function App() {

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (shouldRestoreWizardTab(initialWizardSession)) return 'creator';
    const saved = initialWizardSession?.activeTab;
    return saved && RESTORABLE_APP_TABS.includes(saved as AppTab) ? (saved as AppTab) : 'home';
  });

  const [status, setStatus] = useState<WorkspaceStatus | null>(null);

  const [config, setConfig] = useState<ConfigData | null>(null);
  const [projectDataLoading, setProjectDataLoading] = useState(false);

  const [outputs, setOutputs] = useState<OutputVideo[]>([]);
  const [selectedUploadVideo, setSelectedUploadVideo] = useState<string | null>(null);

  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);

  const [logs, setLogs] = useState<string[]>([]);

  const [rendering, setRendering] = useState<boolean>(false);

  const [mixing, setMixing] = useState<boolean>(false);

  const [playingMusic, setPlayingMusic] = useState<string | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Project Management states

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [newProjectNiche, setNewProjectNiche] = useState<string>('Geral');

  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<{ youtube: any; canva?: any; instagram: any; tiktok: any; kwai: any }>({
    youtube: { connected: false, has_secrets: false, client_id: null },
    canva: { connected: false, hasSecrets: false, clientId: null },
    instagram: { connected: false, account_id: null },
    tiktok: { connected: false },
    kwai: { connected: false }
  });
  const [youtubeChannelAlerts, setYoutubeChannelAlerts] = useState<YoutubeChannelAlerts | null>(null);
  const youtubeBadgePrevRef = useRef(0);
  const [ytClientId, setYtClientId] = useState<string>('');
  const [ytClientSecret, setYtClientSecret] = useState<string>('');
  const [canvaClientId, setCanvaClientId] = useState<string>('');
  const [canvaClientSecret, setCanvaClientSecret] = useState<string>('');
  const [igAccountId, setIgAccountId] = useState<string>('');
  const [igAccessToken, setIgAccessToken] = useState<string>('');
  const [ytTitle, setYtTitle] = useState<string>('');
  const [ytDescription, setYtDescription] = useState<string>('');
  const [ytPrivacy, setYtPrivacy] = useState<string>('private');
  const [ytTags, setYtTags] = useState<string>('');
  const [ytChapters, setYtChapters] = useState<string>('');
  const [ytPinnedComment, setYtPinnedComment] = useState<string>('');
  const [ytPublishAt, setYtPublishAt] = useState<string>('');
  const [ytCategoryId, setYtCategoryId] = useState<string>('27');
  const [ytThumbnailPath, setYtThumbnailPath] = useState<string>('');
  const [ytThumbnailVariant, setYtThumbnailVariant] = useState<string>('');
  const [titleRetention, setTitleRetention] = useState<{ velocity?: { views48h?: number }; retention?: { points?: unknown[] } } | null>(null);
  const [thumbnailExperiment, setThumbnailExperiment] = useState<{ videoId?: string; activeVariantId?: string } | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState<boolean>(false);
  const [igAppId, setIgAppId] = useState<string>('');
  const [igAppSecret, setIgAppSecret] = useState<string>('');
  const [igCaption, setIgCaption] = useState<string>('');
  const [ttCaption, setTtCaption] = useState<string>('');
  const [kwCaption, setKwCaption] = useState<string>('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, boolean>>({ youtube: true, instagram: false, tiktok: false, kwai: false });
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadLogs, setUploadLogs] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const [newProjectFormat, setNewProjectFormat] = useState<'LONGO' | 'SHORTS'>('LONGO');

  const [videoFileDurations, setVideoFileDurations] = useState<Record<string, number>>({});

  const [activeProject, setActiveProject] = useState<string>(
    resolveWizardActiveProject(initialWizardSession)
    || localStorage.getItem('qanat_active_project')
    || 'Buracos no Deserto',
  );

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const [newProjectName, setNewProjectName] = useState<string>('');

  // AI Agent states

  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  const [apiKeyInput, setApiKeyInput] = useState<string>('');

  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

    const [aiProvider, setAiProvider] = useState<'gemini' | 'xai' | 'openrouter' | 'nvidia'>('gemini');
  const [nvidiaKeyInput, setNvidiaKeyInput] = useState<string>('');
  const [hasNvidiaKey, setHasNvidiaKey] = useState<boolean>(false);

  const [geminiKeysInput, setGeminiKeysInput] = useState<string>('');

  const [xaiKeyInput, setXaiKeyInput] = useState<string>('');

  const [openrouterKeyInput, setOpenRouterKeyInput] = useState<string>('');

  const [geminiKeyCount, setGeminiKeyCount] = useState<number>(0);

  const [geminiModel, setGeminiModel] = useState<string>('gemini-2.5-flash');

  const [geminiModelOptions, setGeminiModelOptions] = useState<Array<{ id: string; label: string; hint?: string }>>([
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', hint: 'Rápido, gratuito no AI Studio, contexto 1M' },
  ]);

  const [hasXaiKey, setHasXaiKey] = useState<boolean>(false);

  const [hasOpenRouterKey, setHasOpenRouterKey] = useState<boolean>(false);

  const [savingAiSettings, setSavingAiSettings] = useState<boolean>(false);

  const [geminiBrowserMode, setGeminiBrowserMode] = useState<boolean>(false);

  const { setAutomation } = useGeminiBrowserBridge();
  const resolveBrowserResponse = useGeminiBrowserResolver(setAutomation);
  const [geminiExtensionReady, setGeminiExtensionReady] = useState<boolean | null>(null);
  const [geminiExtensionDiag, setGeminiExtensionDiag] = useState<string>('');
  const [geminiExtensionTesting, setGeminiExtensionTesting] = useState(false);

  const [logoStatus, setLogoStatus] = useState<{

    hasProjectLogo: boolean;

    projectLogoUrl: string | null;

    globalLogoUrl: string;

    currentLogoUrl: string;

  } | null>(null);

  const [logoTimestamp, setLogoTimestamp] = useState<number>(Date.now());

  interface BrandLogoItem {
    id: string;
    name: string;
    file: string;
    url: string;
    exists?: boolean;
  }

  interface YoutubeChannelItem {
    id: string;
    label: string;
    channelUrl: string;
    channelName?: string;
    subscriberCount?: string;
  }

  const [brandLogos, setBrandLogos] = useState<BrandLogoItem[]>([]);
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);
  const [projectSelectedLogoId, setProjectSelectedLogoId] = useState<string | null>(null);
  const [newLogoName, setNewLogoName] = useState<string>('');

  const [youtubeChannels, setYoutubeChannels] = useState<YoutubeChannelItem[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [projectSelectedChannelId, setProjectSelectedChannelId] = useState<string | null>(null);
  const [newChannelLabel, setNewChannelLabel] = useState<string>('');
  const [newChannelUrl, setNewChannelUrl] = useState<string>('');
  const [logoCatalogScope, setLogoCatalogScope] = useState<'global' | 'project'>('global');

  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);

  const [uploadScope, setUploadScope] = useState<'project' | 'global'>('project');

  const [chatInput, setChatInput] = useState<string>('');

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([

    { role: 'assistant', content: 'Olá! Sou o Assistente de IA do Lumiera Cinematic Studio. Como posso te ajudar na criação do vídeo hoje? Você pode me pedir para criar metadados para o YouTube, sugerir palavras-chave para destacar, reescrever textos de impacto ou alterar o mapeamento das músicas!' }

  ]);

  const [chatLoading, setChatLoading] = useState<boolean>(false);

  const [epidemicKeyInput, setEpidemicKeyInput] = useState<string>('');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('ia');
  const [pexelsKeyInput, setPexelsKeyInput] = useState<string>('');
  const [pixabayKeyInput, setPixabayKeyInput] = useState<string>('');
  const [hasPexelsKey, setHasPexelsKey] = useState<boolean>(false);
  const [hasPixabayKey, setHasPixabayKey] = useState<boolean>(false);
  const [savingApiKeys, setSavingApiKeys] = useState<boolean>(false);
  const [supermemoryKeyInput, setSupermemoryKeyInput] = useState<string>('');
  const [supermemoryBaseUrlInput, setSupermemoryBaseUrlInput] = useState<string>('');
  const [hasSupermemoryKey, setHasSupermemoryKey] = useState<boolean>(false);
  const [supermemoryEnabled, setSupermemoryEnabled] = useState<boolean>(true);
  const [testingSupermemory, setTestingSupermemory] = useState<boolean>(false);

  const [hasEpidemicKey, setHasEpidemicKey] = useState<boolean>(false);

  const [epidemicSearchQuery, setEpidemicSearchQuery] = useState<string>('');

  const [epidemicSearchResults, setEpidemicSearchResults] = useState<any[]>([]);

  const [searchingEpidemic, setSearchingEpidemic] = useState<boolean>(false);

  const [downloadingEpidemicId, setDownloadingEpidemicId] = useState<string | null>(null);

  const [autoSoundtracking, setAutoSoundtracking] = useState<boolean>(false);

  const [epidemicSearchType, setEpidemicSearchType] = useState<'bgm' | 'sfx'>('bgm');

  // YouTube states

  const [youtubeMetadata, setYoutubeMetadata] = useState<string>('');
  const [youtubeMetadataFormat, setYoutubeMetadataFormat] = useState<'SHORT' | 'LONG' | ''>('');
  const [youtubeMetadataParsed, setYoutubeMetadataParsed] = useState<{
    titles?: { text: string; chars: number; score?: number; angle?: string | null }[];
    description?: string;
    tags?: string;
    hashtags?: string;
    chapters?: string;
    pinnedComment?: string;
    recommendedTitle?: string;
    thumbnails?: {
      id: string;
      label: string;
      pairedTitle?: string;
      overlayText?: string;
      composition?: string;
      colors?: string[];
      focalElement?: string;
    }[];
  } | null>(null);
  const [youtubeMetadataStrategy, setYoutubeMetadataStrategy] = useState<{
    profileLabel?: string;
    rpm?: string;
    palette?: string[];
  } | null>(null);

  const [youtubeLoading, setYoutubeLoading] = useState<boolean>(false);
  const [youtubeThumbnailsLoading, setYoutubeThumbnailsLoading] = useState<boolean>(false);
  const [canvaThumbnailsLoading, setCanvaThumbnailsLoading] = useState<boolean>(false);
  const [youtubeThumbnailsGenerated, setYoutubeThumbnailsGenerated] = useState<{
    id: string;
    label?: string;
    overlayText?: string;
    fileName?: string;
    url: string;
    source?: string;
    editUrl?: string | null;
  }[]>([]);
  const [titleExperiment, setTitleExperiment] = useState<{
    videoId?: string;
    activeVariantId?: string;
    status?: string;
    variants?: { id: string; text: string; chars?: number; isActive?: boolean }[];
  } | null>(null);
  const [titleExperimentAnalytics, setTitleExperimentAnalytics] = useState<{
    metrics?: {
      views?: number;
      estimatedMinutesWatched?: number;
      averageViewDuration?: number;
      likes?: number;
      comments?: number;
      shares?: number;
      subscribersGained?: number;
    };
    available?: boolean;
    error?: string;
    reachNote?: string;
  } | null>(null);
  const [titleExperimentRankings, setTitleExperimentRankings] = useState<{
    id: string;
    text: string;
    periodViews?: number | null;
    periodAvgDuration?: number | null;
    isActive?: boolean;
  }[]>([]);
  const [titleExperimentWinner, setTitleExperimentWinner] = useState<{
    variantId?: string;
    title?: string;
    views?: number;
  } | null>(null);
  const [titleExperimentLoading, setTitleExperimentLoading] = useState<boolean>(false);
  const [titleAbSelected, setTitleAbSelected] = useState<Record<string, boolean>>({});
  const [titleExperimentVideoId, setTitleExperimentVideoId] = useState<string>('');

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const [taggedNarrations, setTaggedNarrations] = useState<Record<TaggedNarrationPlatform, string>>({

    fish: '',

    eleven: '',

    minimax: ''

  });

  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);



  const [pendingOutputDelete, setPendingOutputDelete] = useState<OutputVideo | null>(null);

  const [deletingOutput, setDeletingOutput] = useState<boolean>(false);

  const [pendingMusicDelete, setPendingMusicDelete] = useState<MusicFile | { name: "__all__"; sizeBytes: number } | null>(null);

  const [deletingMusic, setDeletingMusic] = useState<boolean>(false);

  const [renderProgress, setRenderProgress] = useState<{percent: number, phase: string} | null>(null);

  const [videoQuality, setVideoQuality] = useState<VideoQualityReport | null>(null);

  const [preRenderModalOpen, setPreRenderModalOpen] = useState(false);
  const [pendingRender, setPendingRender] = useState<PendingRenderJob | null>(null);
  const [preRenderFixingId, setPreRenderFixingId] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState<boolean>(false);

  const [headerDate, setHeaderDate] = useState<Date>(new Date());

  const [headerWeather, setHeaderWeather] = useState<HeaderWeather>({ temperature: null });

  // Creator states

  const savedCreatorState = initialWizardSession || {};

  const [creatorStep, setCreatorStep] = useState<number>(savedCreatorState.creatorStep || 1);

  const [creatorPrompt, setCreatorPrompt] = useState<string>('');

  const [creatorScript, setCreatorScript] = useState<string>(savedCreatorState.creatorScript || '');

  const [creatorLoading, setCreatorLoading] = useState<boolean>(false);
  const [creatorLoadingMode, setCreatorLoadingMode] = useState<'idle' | 'narration' | 'full' | 'directing' | 'directing-scene' | 'seedance-t2v'>('idle');
  const [directingSceneIndex, setDirectingSceneIndex] = useState<number | null>(null);
  const [seedanceT2vJobs, setSeedanceT2vJobs] = useState<Record<number, {
    prompt_id: string;
    scene_index: number;
    status: 'queued' | 'running' | 'completed' | 'error' | 'attaching';
    percent?: number;
    message?: string;
    asset?: string;
    error?: string;
  }>>({});
  const seedanceT2vPollers = useRef<Record<number, ReturnType<typeof setInterval>>>({});
  const [showNarrationReview, setShowNarrationReview] = useState<boolean>(savedCreatorState.showNarrationReview || false);
  const [narrationDraft, setNarrationDraft] = useState<string>(savedCreatorState.narrationDraft || '');
  const [narrationTaggedDraft, setNarrationTaggedDraft] = useState<string>(savedCreatorState.narrationTaggedDraft || '');
  const [narrationStrategy, setNarrationStrategy] = useState<any | null>(savedCreatorState.narrationStrategy || null);
  const [narrationBlockPhrases, setNarrationBlockPhrases] = useState<{ block: number; phrase: string }[]>(
    savedCreatorState.narrationBlockPhrases || [],
  );
  const [narrationBlockScript, setNarrationBlockScript] = useState<string>(savedCreatorState.narrationBlockScript || '');
  const [narrationNotebooklmEnriched, setNarrationNotebooklmEnriched] = useState<boolean>(
    savedCreatorState.narrationNotebooklmEnriched || false,
  );
  const [narrationProjectName, setNarrationProjectName] = useState<string>(savedCreatorState.narrationProjectName || '');
  const [useNotebooklm, setUseNotebooklm] = useState<boolean>(savedCreatorState.useNotebooklm !== false);
  const [facelessPresetId, setFacelessPresetId] = useState<string | null>(null);
  const [facelessPipelineBusy, setFacelessPipelineBusy] = useState(false);
  const [facelessPipelineLog, setFacelessPipelineLog] = useState<string[]>([]);
  const [notebooklmStatus, setNotebooklmStatus] = useState<{
    available: boolean;
    authenticated: boolean;
    notebookCount?: number;
    message?: string;
    needsLogin?: boolean;
  } | null>(null);
  const [creatorIdeasBundle, setCreatorIdeasBundle] = useState<StudioBundlePreview | null>(null);
  const [notebooklmImproving, setNotebooklmImproving] = useState<boolean>(false);
  const [notebooklmSuggestions, setNotebooklmSuggestions] = useState<string | null>(null);

  const [creatorAssets, setCreatorAssets] = useState<{ name: string; sizeBytes: number; type: string }[]>([]);

  const [timelineAssets, setTimelineAssets] = useState<any>(null);

  const [syncingTimings, setSyncingTimings] = useState<boolean>(false);
  const [shouldAutoAlign, setShouldAutoAlign] = useState<boolean>(false);
  const [timelinePreviewZoom, setTimelinePreviewZoom] = useState(100);
  const [timelineSelectedClips, setTimelineSelectedClips] = useState<Set<string>>(() => new Set());

  const [uploadingNarration, setUploadingNarration] = useState<boolean>(false);

  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const [dragActive, setDragActive] = useState<boolean>(false);

  // Script Master states

  const [nicheInput, setNicheInput] = useState<string>(savedCreatorState.nicheInput || '');

  const [formatSelector, setFormatSelector] = useState<'LONGO' | 'SHORTS'>(savedCreatorState.formatSelector || 'LONGO');

  const [ideasData, setIdeasData] = useState<{

    diagnostic: any;

    ideas: any[];

    best_idea_index: number;

    best_idea_reason: string;

  } | null>(
    savedCreatorState.ideasSearchNiche && savedCreatorState.nicheInput?.trim() === savedCreatorState.ideasSearchNiche
      ? savedCreatorState.ideasData || null
      : null,
  );

  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number>(savedCreatorState.selectedIdeaIndex !== undefined ? savedCreatorState.selectedIdeaIndex : -1);

  const [customIdeaTitle, setCustomIdeaTitle] = useState(savedCreatorState.customIdeaTitle || '');
  const [customIdeaPromise, setCustomIdeaPromise] = useState(savedCreatorState.customIdeaPromise || '');
  const [customIdeaHook, setCustomIdeaHook] = useState(savedCreatorState.customIdeaHook || '');
  const [customIdeaEmotion, setCustomIdeaEmotion] = useState(savedCreatorState.customIdeaEmotion || '');
  const [customIdeaBlocks, setCustomIdeaBlocks] = useState(savedCreatorState.customIdeaBlocks || '');

  const [ideationTab, setIdeationTab] = useState<'ai' | 'custom' | 'listicle'>(savedCreatorState.ideationTab || 'ai');
  const [listNiche, setListNiche] = useState<string>(savedCreatorState.listNiche || '');
  const [listicleSearchNiche, setListicleSearchNiche] = useState<string>(savedCreatorState.listicleSearchNiche || '');
  const [ideasSearchNiche, setIdeasSearchNiche] = useState<string>(savedCreatorState.ideasSearchNiche || '');
  const [listTopic, setListTopic] = useState<string>(savedCreatorState.listTopic || '');
  const [rankCount, setRankCount] = useState<number>(savedCreatorState.rankCount || 20);
  const [rankOrder, setRankOrder] = useState<'desc' | 'asc'>(savedCreatorState.rankOrder || 'desc');
  const [listicleHudStyle, setListicleHudStyle] = useState<'full' | 'compact' | 'auto'>(
    savedCreatorState.listicleHudStyle || 'auto',
  );
  const [listicleIdeasData, setListicleIdeasData] = useState<ListicleIdeasResponse | null>(
    savedCreatorState.listicleSearchNiche && savedCreatorState.listNiche?.trim() === savedCreatorState.listicleSearchNiche
      ? savedCreatorState.listicleIdeasData || null
      : null,
  );
  const [selectedListicleIdeaIndex, setSelectedListicleIdeaIndex] = useState<number>(savedCreatorState.selectedListicleIdeaIndex ?? -1);
  const [customTitle, setCustomTitle] = useState<string>(savedCreatorState.customTitle || '');
  const [customHooks, setCustomHooks] = useState<string>(savedCreatorState.customHooks || '');
  const [customOutline, setCustomOutline] = useState<string>(savedCreatorState.customOutline || '');
  const [customBlocks, setCustomBlocks] = useState<{block: number, content: string}[]>(
    savedCreatorState.customBlocks || [
      { block: 1, content: '' }
    ]
  );

  const [generatedScriptData, setGeneratedScriptData] = useState<any | null>(savedCreatorState.generatedScriptData || null);

  // Accordion blocks and autosave states for Wizard Step 5

  const [expandedBlocks, setExpandedBlocks] = useState<Record<number, boolean>>(
    savedCreatorState.expandedBlocks || { 1: true },
  );
  const [wizardSavedAtLabel, setWizardSavedAtLabel] = useState(
    formatWizardSavedAt(savedCreatorState.savedAt),
  );

  const saveStoryboardTimeoutRef = useRef<any | null>(null);
  const storyboardDirtyRef = useRef(false);
  const storyboardFetchGenRef = useRef(0);
  const wizardRestoreCompleteRef = useRef(false);

  // Global render configuration states

  const [globalFps, setGlobalFps] = useState<number>(30);

  const [globalBlockGap, setGlobalBlockGap] = useState<number>(1.0);

  const [globalMusicVolume, setGlobalMusicVolume] = useState<number>(0.15);

  const [globalUseRemotion, setGlobalUseRemotion] = useState<boolean>(true);

  const [globalDebugOverlay, setGlobalDebugOverlay] = useState<boolean>(false);
  const [globalRenderResolution, setGlobalRenderResolution] = useState<'1080p' | '2k'>('1080p');
  const [resolutionConfigScope, setResolutionConfigScope] = useState<'global' | 'project'>('global');
  const [projectRenderResolution, setProjectRenderResolution] = useState<'1080p' | '2k'>('1080p');
  const [savingProjectResolution, setSavingProjectResolution] = useState<boolean>(false);

  const [globalYoutubeChannelUrl, setGlobalYoutubeChannelUrl] = useState<string>("");
  const [globalYoutubeChannelName, setGlobalYoutubeChannelName] = useState<string>("");
  const [globalYoutubeSubscriberCount, setGlobalYoutubeSubscriberCount] = useState<string>("");
  const [channelConfigScope, setChannelConfigScope] = useState<'project' | 'global'>('global');
  const [savingChannelConfig, setSavingChannelConfig] = useState<boolean>(false);

  const [savingGlobalConfig, setSavingGlobalConfig] = useState<boolean>(false);
  const [savingVisualConfig, setSavingVisualConfig] = useState<boolean>(false);
  const [savingBlockProgressBar, setSavingBlockProgressBar] = useState<boolean>(false);
  const [savingProductionConfig, setSavingProductionConfig] = useState<boolean>(false);

  const fetchGlobalRenderConfig = async () => {

    try {

      const res = await fetch('/api/render/config');

      if (res.ok) {

        const data = await res.json();

        setGlobalFps(data.fps || 30);

        setGlobalBlockGap(data.blockGapSeconds !== undefined ? data.blockGapSeconds : 1.0);

        setGlobalMusicVolume(data.musicVolume || 0.15);

        setGlobalUseRemotion(data.useRemotionByDefault !== false);

        setGlobalDebugOverlay(!!data.debugOverlay);
        setGlobalRenderResolution(data.renderResolution === '2k' ? '2k' : '1080p');

        setGlobalYoutubeChannelUrl(data.youtubeChannel?.channelUrl || "");
        setGlobalYoutubeChannelName(data.youtubeChannel?.channelName || "");
        setGlobalYoutubeSubscriberCount(data.youtubeChannel?.subscriberCount || "");
        setBrandLogos(Array.isArray(data.brandLogos) ? data.brandLogos.map((l: BrandLogoItem) => ({
          ...l,
          url: l.url || `/api/projects-media/ASSETS/logos/${encodeURIComponent(l.file)}`,
        })) : []);
        setSelectedLogoId(data.selectedLogoId || null);
        setYoutubeChannels(Array.isArray(data.youtubeChannels) ? data.youtubeChannels : []);
        setSelectedChannelId(data.selectedYoutubeChannelId || null);

      }

    } catch (err) {

      console.error('Error fetching global render config:', err);

    }

  };

  const handleSaveGlobalRenderConfig = async () => {

    setSavingGlobalConfig(true);

    try {

      const res = await fetch('/api/render/config', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          fps: globalFps,

          blockGapSeconds: globalBlockGap,

          musicVolume: globalMusicVolume,

          useRemotionByDefault: globalUseRemotion,

          debugOverlay: globalDebugOverlay,
          renderResolution: globalRenderResolution,

          youtubeChannel: {
            channelUrl: globalYoutubeChannelUrl,
            channelName: globalYoutubeChannelName,
            subscriberCount: globalYoutubeSubscriberCount,
          },

        })

      });

      if (res.ok) {

        toast.success('Configurações globais salvas com sucesso!');

      } else {

        toast.error('Falha ao salvar configurações globais.');

      }

    } catch (err) {

      console.error('Error saving global config:', err);

      toast.error('Erro ao conectar com o servidor.');

    } finally {

      setSavingGlobalConfig(false);

    }

  };

  const handleSaveChannelConfig = async () => {
    setSavingChannelConfig(true);
    try {
      if (channelConfigScope === 'global') {
        const res = await fetch('/api/render/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fps: globalFps,
            blockGapSeconds: globalBlockGap,
            musicVolume: globalMusicVolume,
            useRemotionByDefault: globalUseRemotion,
            debugOverlay: globalDebugOverlay,
            youtubeChannel: {
              channelUrl: globalYoutubeChannelUrl,
              channelName: globalYoutubeChannelName,
              subscriberCount: globalYoutubeSubscriberCount,
            },
          }),
        });
        if (res.ok) {
          toast.success('Canal do YouTube (global) salvo com sucesso!');
        } else {
          toast.error('Falha ao salvar canal global.');
        }
      } else {
        if (!config) {
          toast.error('Carregue um projeto antes de salvar o canal.');
          return;
        }
        await saveConfig({
          ...config,
          youtube_channel: {
            channel_url: globalYoutubeChannelUrl,
            channel_name: globalYoutubeChannelName,
            subscriber_count: globalYoutubeSubscriberCount,
          },
        });
        toast.success('Canal do YouTube (projeto) salvo com sucesso!');
      }
    } catch (err) {
      console.error('Error saving channel config:', err);
      toast.error('Erro ao salvar configurações do canal.');
    } finally {
      setSavingChannelConfig(false);
    }
  };

  useEffect(() => {
    if (channelConfigScope !== 'project' || !config?.youtube_channel) return;
    setGlobalYoutubeChannelUrl(config.youtube_channel.channel_url || '');
    setGlobalYoutubeChannelName(config.youtube_channel.channel_name || '');
    setGlobalYoutubeSubscriberCount(config.youtube_channel.subscriber_count || '');
  }, [channelConfigScope, config?.youtube_channel]);

  const clearPendingStoryboardSave = () => {
    if (saveStoryboardTimeoutRef.current) {
      clearTimeout(saveStoryboardTimeoutRef.current);
      saveStoryboardTimeoutRef.current = null;
    }
  };

  const debounceSaveStoryboard = (scriptData: any) => {
    storyboardDirtyRef.current = true;
    clearPendingStoryboardSave();
    saveStoryboardTimeoutRef.current = setTimeout(() => {
      saveCreatorStoryboard(scriptData);
    }, 600);
  };

  const syncCreatorStoryboard = (next: any) => {
    if (!next) return;
    setGeneratedScriptData(next);
    setStoryboardData(next);
    debounceSaveStoryboard(next);
  };

  const applyStoryboardToCreatorState = (data: any) => {
    if (!data) return;
    clearPendingStoryboardSave();
    storyboardDirtyRef.current = false;
    setGeneratedScriptData(data);
    setStoryboardData(data);
    if (data.narrative_script) setCreatorScript(data.narrative_script);
  };

  const saveCreatorStoryboard = async (scriptData: any) => {

    if (!scriptData) return;

    try {

      const res = await fetch(getProjectUrl('/api/projects/storyboard'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(scriptData)

      });

      if (res.ok) {
        storyboardDirtyRef.current = false;
        console.log('Storyboard autosaved successfully');
      } else {
        console.error('Failed to autosave storyboard');
      }

    } catch (err) {

      console.error('Error autosaving storyboard:', err);

    }

  };

  const handleUpdateCreatorScene = (index: number, field: string, value: any) => {

    if (!generatedScriptData) return;

    const nextPrompts = [...(generatedScriptData.visual_prompts || [])];

    if (field === 'duration') {
      return;
    } else if (field === 'narration_text') {
      const nextText = value;
      nextPrompts[index] = {
        ...nextPrompts[index],
        narration_text: nextText,
      };
      if (!nextPrompts[index].duration_from_whisper) {
        delete nextPrompts[index].duration;
        delete nextPrompts[index].duration_seconds;
      }
    } else {

      nextPrompts[index] = { 

        ...nextPrompts[index], 

        [field]: value 

      };

    }

    const nextScriptData = { ...generatedScriptData, visual_prompts: nextPrompts };
    syncCreatorStoryboard(nextScriptData);
  };

  const handleUpdateCreatorDirectingBrief = (index: number, field: string, value: string) => {
    if (!generatedScriptData) return;
    const nextPrompts = [...(generatedScriptData.visual_prompts || [])];
    const prev = nextPrompts[index]?.directing_brief || {};
    nextPrompts[index] = {
      ...nextPrompts[index],
      directing_brief: { ...prev, [field]: value },
    };
    syncCreatorStoryboard({ ...generatedScriptData, visual_prompts: nextPrompts });
  };

  const handleUpdateCreatorSeedanceRef = (index: number, slot: string, value: string) => {
    if (!generatedScriptData) return;
    const nextPrompts = [...(generatedScriptData.visual_prompts || [])];
    const prev = nextPrompts[index]?.seedance_refs || {};
    nextPrompts[index] = {
      ...nextPrompts[index],
      seedance_refs: { ...prev, [slot]: value },
    };
    syncCreatorStoryboard({ ...generatedScriptData, visual_prompts: nextPrompts });
  };

  const handleCompileDirectingBriefs = async (sceneIndices?: number[]) => {
    const projectName = narrationProjectName || creatorProjectName || activeProject;
    if (!projectName?.trim()) {
      toast.error('Projeto não identificado.');
      return;
    }
    const isSingle = Array.isArray(sceneIndices) && sceneIndices.length === 1;
    setCreatorLoading(true);
    setCreatorLoadingMode(isSingle ? 'directing-scene' : 'directing');
    if (isSingle) setDirectingSceneIndex(sceneIndices![0]);
    try {
      const body: Record<string, unknown> = {
        project: projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_'),
      };
      if (sceneIndices?.length) body.scene_indices = sceneIndices;

      const { ok, data } = await postAi('/api/ai/creator/compile-directing-briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (ok && !data.needs_browser) {
        applyStoryboardToCreatorState(data);
        await saveCreatorStoryboard(data);
        const count = sceneIndices?.length || data.visual_prompts?.length || 0;
        toast.success(`🎬 Directing compilado — ${count} cena${count === 1 ? '' : 's'}`);
      } else {
        toast.error(data.error || data.details || 'Erro ao compilar directing.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao compilar directing.');
    } finally {
      setCreatorLoading(false);
      setCreatorLoadingMode('idle');
      setDirectingSceneIndex(null);
    }
  };

  const stopSeedanceT2vPoller = (sceneIndex: number) => {
    const poller = seedanceT2vPollers.current[sceneIndex];
    if (poller) {
      clearInterval(poller);
      delete seedanceT2vPollers.current[sceneIndex];
    }
  };

  const attachSeedanceT2vWhenReady = async (projectName: string, sceneIndex: number, promptId: string) => {
    setSeedanceT2vJobs((prev) => ({
      ...prev,
      [sceneIndex]: {
        ...(prev[sceneIndex] || { prompt_id: promptId, scene_index: sceneIndex, status: 'attaching' }),
        status: 'attaching',
        message: 'Vinculando vídeo ao projeto…',
      },
    }));
    try {
      const { ok, data } = await postAi('/api/ai/creator/attach-seedance-t2v', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_'),
          prompt_id: promptId,
          scene_index: sceneIndex,
        }),
      });
      if (ok && data.ready && data.storyboard) {
        applyStoryboardToCreatorState(data.storyboard);
        await saveCreatorStoryboard(data.storyboard);
        if (data.config) setConfig(data.config);
        fetchData();
        setSeedanceT2vJobs((prev) => ({
          ...prev,
          [sceneIndex]: {
            prompt_id: promptId,
            scene_index: sceneIndex,
            status: 'completed',
            percent: 100,
            asset: data.asset,
            message: 'Vídeo vinculado',
          },
        }));
        toast.success(`🎥 Vídeo LTX vinculado — cena ${sceneIndex + 1}`);
        return true;
      }
      return false;
    } catch (err: any) {
      setSeedanceT2vJobs((prev) => ({
        ...prev,
        [sceneIndex]: {
          ...(prev[sceneIndex] || { prompt_id: promptId, scene_index: sceneIndex, status: 'error' }),
          status: 'error',
          error: err.message || 'Falha ao vincular vídeo',
        },
      }));
      toast.error(err.message || 'Falha ao vincular vídeo LTX.');
      return false;
    }
  };

  const startSeedanceT2vPolling = (projectName: string, sceneIndex: number, promptId: string) => {
    stopSeedanceT2vPoller(sceneIndex);
    const poll = async () => {
      try {
        const res = await fetch(getProjectUrl(`/api/comfyui/progress/${promptId}`));
        if (!res.ok) return;
        const data = await res.json();
        const status = data.status === 'completed'
          ? 'completed'
          : data.status === 'error'
            ? 'error'
            : data.status === 'queued'
              ? 'queued'
              : 'running';
        setSeedanceT2vJobs((prev) => ({
          ...prev,
          [sceneIndex]: {
            prompt_id: promptId,
            scene_index: sceneIndex,
            status,
            percent: data.percent ?? prev[sceneIndex]?.percent ?? 0,
            message: data.message || prev[sceneIndex]?.message,
            error: data.error || undefined,
          },
        }));
        if (status === 'completed') {
          stopSeedanceT2vPoller(sceneIndex);
          await attachSeedanceT2vWhenReady(projectName, sceneIndex, promptId);
        }
        if (status === 'error') {
          stopSeedanceT2vPoller(sceneIndex);
          toast.error(data.error || data.message || 'Erro na geração LTX.');
        }
      } catch { /* ignore poll errors */ }
    };
    poll();
    seedanceT2vPollers.current[sceneIndex] = setInterval(poll, 2000);
  };

  const handleGenerateSeedanceT2v = async (sceneIndices?: number[], provider: 'ltx' | 'seedance' = 'ltx') => {
    const projectName = narrationProjectName || creatorProjectName || activeProject;
    if (!projectName?.trim()) {
      toast.error('Projeto não identificado.');
      return;
    }
    const normalizedProject = projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const isBatch = !sceneIndices || sceneIndices.length !== 1;
    setCreatorLoading(true);
    setCreatorLoadingMode('seedance-t2v');
    try {
      const body: Record<string, unknown> = { project: normalizedProject, provider };
      if (sceneIndices?.length) body.scene_indices = sceneIndices;

      const { ok, data } = await postAi('/api/ai/creator/generate-seedance-t2v', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!ok || data.needs_browser) {
        toast.error(data.error || data.details || 'Erro ao enfileirar T2V.');
        return;
      }

      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      if (!jobs.length) {
        toast.error('Nenhum job T2V criado.');
        return;
      }

      for (const job of jobs) {
        const sceneIndex = Number(job.scene_index);
        const promptId = String(job.prompt_id || '');
        if (!Number.isFinite(sceneIndex) || !promptId) continue;
        setSeedanceT2vJobs((prev) => ({
          ...prev,
          [sceneIndex]: {
            prompt_id: promptId,
            scene_index: sceneIndex,
            status: 'queued',
            percent: 2,
            message: 'Na fila LTX…',
          },
        }));
        if (provider === 'ltx') {
          startSeedanceT2vPolling(normalizedProject, sceneIndex, promptId);
        }
      }

      if (data.waited && data.storyboard) {
        applyStoryboardToCreatorState(data.storyboard);
        await saveCreatorStoryboard(data.storyboard);
      }

      toast.success(`🎥 ${jobs.length} vídeo(s) enfileirado(s) via ${provider.toUpperCase()}`);
      if (isBatch) {
        toast('Cenas processadas em sequência — aguarde cada LTX concluir.', { icon: '⏳' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao gerar T2V.');
    } finally {
      setCreatorLoading(false);
      setCreatorLoadingMode('idle');
    }
  };

  const [creatorProjectName, setCreatorProjectName] = useState<string>(savedCreatorState.creatorProjectName || '');
  const [editorialIdeaImport, setEditorialIdeaImport] = useState<EditorialIdeaImport | null>(null);

  const [selectedProject, setSelectedProject] = useState<string>(activeProject);

  const [uploadedScenes, setUploadedScenes] = useState<Record<string, boolean>>(
    savedCreatorState.uploadedScenes || {},
  );
  const wizardServerSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creatorGenTokenRef = useRef(0);
  const wizardRestoredRef = useRef(false);

  const [storyboardData, setStoryboardData] = useState<any | null>(null);

  const [loadingStoryboard, setLoadingStoryboard] = useState<boolean>(false);
  const [generatingOverlays, setGeneratingOverlays] = useState<boolean>(false);

  const [editorSubTab, setEditorSubTab] = useState<'script' | 'assets' | 'json' | 'narration' | 'dub'>('script');
  const [timelineOpenBlocks, setTimelineOpenBlocks] = useState<Record<number, boolean>>({ 1: true });

  // Form fields

  const [newKeyword, setNewKeyword] = useState<string>('');

  const [editingImpact, setEditingImpact] = useState<{ index: number; text: string } | null>(null);

  const [searchMusic, setSearchMusic] = useState<string>('');

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Narration playback states

  const [playingNarration, setPlayingNarration] = useState<number | string | 'full' | null>(null);

  const [narrationTime, setNarrationTime] = useState<number>(0);

  const [narrationDuration, setNarrationDuration] = useState<number>(0);

  const [wordTranscripts, setWordTranscripts] = useState<any[]>([]);

  const [flatTranscriptWords, setFlatTranscriptWords] = useState<any[]>([]);

  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeNarrationStateRef = useRef<{ target: number | string; endTime: number; startTimeRelative?: number; startTimeAbsolute?: number; endTimeRelative?: number } | null>(null);

  // Helper: Append active project context dynamically to backend URL queries

  const getProjectUrl = useCallback((endpoint: string, projectOverride?: string) => {
    const p = projectOverride || activeProject;

    const separator = endpoint.includes('?') ? '&' : '?';

    return `${endpoint}${separator}project=${encodeURIComponent(p)}`;
  }, [activeProject]);

  const postAi = useCallback(async (
    path: string,
    init: RequestInit = { method: 'POST' },
    progress?: { jobId?: string },
  ) => fetchGeminiAi(
    getProjectUrl(path),
    init,
    {
      geminiBrowserMode,
      aiProvider,
      resolveBrowserResponse,
      progressJobId: progress?.jobId,
    },
  ), [getProjectUrl, geminiBrowserMode, aiProvider, resolveBrowserResponse]);

  const suggestBlockProgressIcons = useCallback(async () => {
    const effectiveGeminiChrome = config?.use_gemini_chrome === true || geminiBrowserMode;
    const { ok, data } = await postAi('/api/ai/suggest-block-progress-icons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ require_browser: effectiveGeminiChrome }),
    });
    if (!ok || (data as { needs_browser?: boolean })?.needs_browser) {
      toast.error('Sugestão cancelada ou pendente no Gemini Chrome.');
      return null;
    }
    const blocks = (data as { blocks?: unknown[] })?.blocks;
    if (!Array.isArray(blocks) || blocks.length < 1) {
      toast.error((data as { error?: string })?.error || 'IA não retornou ícones válidos.');
      return null;
    }
    toast.success(`Ícones sugeridos para ${blocks.length} bloco(s).`);
    setConfig((prev) => ({
      ...(prev || {}),
      block_progress_bar: {
        ...((prev as Record<string, unknown>)?.block_progress_bar as object || {}),
        blocks,
      },
    }));
    return blocks as import('./BlockProgressBarEditor').BlockProgressMarkerDraft[];
  }, [postAi, config?.use_gemini_chrome, geminiBrowserMode]);

  const syncBlockProgressTitles = useCallback(async () => {
    const { ok, data } = await postAi('/api/ai/suggest-block-progress-titles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!ok) {
      toast.error((data as { error?: string })?.error || 'Falha ao sincronizar títulos dos capítulos.');
      return null;
    }
    const blocks = (data as { blocks?: unknown[] })?.blocks;
    if (!Array.isArray(blocks) || blocks.length < 1) {
      toast.error((data as { error?: string })?.error || 'Nenhum capítulo encontrado para sincronizar.');
      return null;
    }
    const updatedCount = Number((data as { updatedCount?: number })?.updatedCount)
      || blocks.filter((b) => String((b as { title?: string }).title || '').trim()).length;
    if (updatedCount > 0) {
      toast.success(`${updatedCount} título(s) sincronizado(s) dos capítulos.`);
    } else {
      toast.success('Títulos já estavam sincronizados com os capítulos.');
    }
    setConfig((prev) => ({
      ...(prev || {}),
      block_progress_bar: {
        ...((prev as Record<string, unknown>)?.block_progress_bar as object || {}),
        blocks,
        titles_synced_at: new Date().toISOString(),
      },
    }));
    return {
      blocks: blocks as import('./BlockProgressBarEditor').BlockProgressMarkerDraft[],
      updatedCount,
    };
  }, [postAi]);

  const visualBlockTimings = useMemo(() => {
    const bt = status?.block_timings || config?.block_timings;
    if (!bt) return undefined;
    return {
      starts: bt.starts || [],
      durations: bt.durations || [],
    };
  }, [
    status?.block_timings?.starts?.join(','),
    status?.block_timings?.durations?.join(','),
    config?.block_timings?.starts?.join(','),
    config?.block_timings?.durations?.join(','),
  ]);

  const postCreatorScriptAi = useCallback(async (
    init: RequestInit = { method: 'POST' },
    progress?: { jobId?: string },
  ) => fetchCreatorScriptAi(
    getProjectUrl('/api/ai/creator/script'),
    init,
    {
      geminiBrowserMode,
      aiProvider,
      resolveBrowserResponse,
      progressJobId: progress?.jobId,
    },
  ), [getProjectUrl, geminiBrowserMode, aiProvider, resolveBrowserResponse]);

  const aiProviderBadge = useMemo(() => {
    if (!hasApiKey) {
      return {
        short: 'Sem API',
        detail: 'Configure um provedor em Configurações → IA.',
      };
    }
    if (aiProvider === 'openrouter') {
      return {
        short: 'OpenRouter',
        detail: 'Chamadas de IA via API OpenRouter.',
      };
    }
    if (geminiBrowserMode) {
      const via = aiProvider !== 'gemini' ? ` (prioridade sobre ${aiProvider})` : '';
      return {
        short: 'Gemini Chrome',
        detail: `IA via gemini.google.com (extensão Lumiera)${via}. Metadados, overlays, roteiro e agent usam o navegador.`,
      };
    }
    if (aiProvider === 'nvidia') {
      return {
        short: 'NVIDIA API',
        detail: 'Chamadas de IA via NVIDIA API (Qwen, Kimi, etc.). Ative Gemini no Chrome para usar o navegador.',
      };
    }
    if (aiProvider === 'xai') {
      return {
        short: 'Grok API',
        detail: 'Chat e IA via API xAI (Grok). Ative Gemini no Chrome para usar o navegador.',
      };
    }
    return {
      short: 'Gemini API',
      detail: 'IA via Google AI Studio (chave API). Sem automação no Chrome.',
    };
  }, [hasApiKey, aiProvider, geminiBrowserMode]);

  const readApiError = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      return data?.error || data?.message || fallback;
    } catch {
      return res.status === 404
        ? 'Rota não encontrada. Reinicie o backend (porta 3005).'
        : `${fallback} (HTTP ${res.status})`;
    }

  };

  const effectiveRenderResolution = useMemo<'1080p' | '2k'>(() => {
    if (config?.render_resolution === '2k' || config?.render_resolution === '1080p') {
      return config.render_resolution;
    }
    return globalRenderResolution;
  }, [config?.render_resolution, globalRenderResolution]);

  const renderResolutionLabel = useMemo(() => {
    const ratio = config?.aspect_ratio || (formatSelector === 'SHORTS' ? '9:16' : '16:9');
    if (effectiveRenderResolution === '2k') {
      return ratio === '9:16' ? '2K · 1440×2560' : '2K · 2560×1440';
    }
    return ratio === '9:16' ? '1080p · 1080×1920' : '1080p · 1920×1080';
  }, [effectiveRenderResolution, config?.aspect_ratio, formatSelector]);

  const formattedHeaderDate = useMemo(() => {

    return new Intl.DateTimeFormat('pt-BR', {

      day: '2-digit',

      month: '2-digit',

      year: 'numeric',

      hour: '2-digit',

      minute: '2-digit',

      timeZone: 'America/Sao_Paulo',

    }).format(headerDate);

  }, [headerDate]);

  const headerTemperatureLabel = headerWeather.temperature === null

    ? '--'

    : `${Math.round(headerWeather.temperature)}\u00b0C`;

  useEffect(() => {

    const cleanNarration = generatedScriptData?.narrative_script || '';
    const taggedScript = generatedScriptData?.narrative_script_tagged || '';

    if (!cleanNarration && !taggedScript) return;

    setTaggedNarrations({
      fish: buildTaggedNarration(cleanNarration, 'fish', { taggedScript }),
      eleven: buildTaggedNarration(cleanNarration, 'eleven', { taggedScript }),
      minimax: buildTaggedNarration(cleanNarration, 'minimax', { taggedScript }),
    });
  }, [generatedScriptData?.narrative_script, generatedScriptData?.narrative_script_tagged]);

  // Logo utilities and API handlers

  const fetchLogoStatus = async () => {

    try {

      const res = await fetch(getProjectUrl('/api/logo/status'));

      if (res.ok) {

        const data = await res.json();
        setLogoStatus(data);
        if (data.catalog) {
          setBrandLogos(Array.isArray(data.catalog.logos) ? data.catalog.logos : []);
          setSelectedLogoId(data.catalog.selectedLogoId || null);
        }
        if (data.projectSelectedLogoId !== undefined) {
          setProjectSelectedLogoId(data.projectSelectedLogoId);
        }

      }

    } catch (err) {

      console.error("Error fetching logo status:", err);

    }

  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.png')) {

      toast.error("O logotipo precisa ser um arquivo PNG (.png).");

      return;

    }

    setUploadingLogo(true);

    const logoName = newLogoName.trim() || file.name.replace(/\.png$/i, '') || 'Novo Logo';

    try {

      const res = await fetch(getProjectUrl(`/api/brand/logos/upload?name=${encodeURIComponent(logoName)}`), {

        method: 'POST',

        body: file,

        headers: {

          'Content-Type': 'image/png'

        }

      });

      if (res.ok) {

        toast.success('Logo adicionado ao catálogo!');
        setNewLogoName('');
        e.target.value = '';
        await fetchBrandCatalog();

        setLogoTimestamp(Date.now());

        fetchLogoStatus();

      } else {

        const data = await res.json();

        toast.error(await readApiError(res, "Falha ao enviar logotipo."));

      }

    } catch (err) {

      console.error("Error uploading logo:", err);

      toast.error(err instanceof Error ? err.message : "Erro de conexão ao enviar o logotipo.");

    } finally {

      setUploadingLogo(false);

    }

  };

  const handleResetLogo = async () => {

    try {

      const res = await fetch(getProjectUrl('/api/logo/reset'), {

        method: 'POST'

      });

      if (res.ok) {

        toast.success("Logotipo redefinido para o padrão global!");
        setProjectSelectedLogoId(null);
        await fetchBrandCatalog();

        setLogoTimestamp(Date.now());

        fetchLogoStatus();

      } else {

        const data = await res.json();

        toast.error(data.error || "Falha ao redefinir logotipo.");

      }

    } catch (err) {

      console.error("Error resetting logo:", err);

      toast.error("Erro de conexão ao redefinir o logotipo.");

    }

  };

  const fetchBrandCatalog = async () => {
    try {
      const res = await fetch(getProjectUrl('/api/brand/catalog'));
      if (!res.ok) return;
      const data = await res.json();
      const logosData = data.logos || {};
      setBrandLogos(Array.isArray(logosData.logos) ? logosData.logos : []);
      setSelectedLogoId(logosData.selectedLogoId || null);
      setProjectSelectedLogoId(data.projectSelectedLogoId || null);
      const channelsData = data.channels || {};
      setYoutubeChannels(Array.isArray(channelsData.channels) ? channelsData.channels : []);
      setSelectedChannelId(channelsData.selectedYoutubeChannelId || null);
      setProjectSelectedChannelId(data.projectSelectedChannelId || null);
    } catch (err) {
      console.error('Error fetching brand catalog:', err);
    }
  };

  const handleSelectBrandLogo = async (id: string) => {
    try {
      const res = await fetch(getProjectUrl('/api/brand/logos/select'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, scope: logoCatalogScope }),
      });
      if (res.ok) {
        if (logoCatalogScope === 'global') {
          try {
            await fetch(getProjectUrl('/api/logo/reset'), { method: 'POST' });
          } catch { /* ignore */ }
        }
        toast.success(`Logo ${logoCatalogScope === 'global' ? 'global' : 'do projeto'} selecionado!`);
        setLogoTimestamp(Date.now());
        await fetchBrandCatalog();
        fetchLogoStatus();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Falha ao selecionar logo.');
      }
    } catch {
      toast.error('Erro ao selecionar logo.');
    }
  };

  const handleRenameBrandLogo = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/brand/logos/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        await fetchBrandCatalog();
      } else {
        toast.error(await readApiError(res, 'Falha ao renomear logo.'));
        await fetchBrandCatalog();
      }
    } catch {
      toast.error('Erro ao renomear logo.');
    }
  };

  const handleSaveProjectRenderResolution = async () => {
    if (!config) {
      toast.error('Carregue um projeto antes de salvar a resolução.');
      return;
    }
    setSavingProjectResolution(true);
    try {
      await saveConfig({ ...config, render_resolution: projectRenderResolution });
      toast.success('Resolução do projeto salva!');
    } catch {
      toast.error('Erro ao salvar resolução do projeto.');
    } finally {
      setSavingProjectResolution(false);
    }
  };

  const handleClearProjectRenderResolution = async () => {
    if (!config) return;
    setSavingProjectResolution(true);
    try {
      const updated = { ...config };
      delete updated.render_resolution;
      await saveConfig(updated);
      setResolutionConfigScope('global');
      toast.success('Projeto usando resolução global.');
    } catch {
      toast.error('Erro ao remover resolução do projeto.');
    } finally {
      setSavingProjectResolution(false);
    }
  };

  const handleDeleteBrandLogo = async (id: string) => {
    if (!window.confirm('Remover este logo do catálogo?')) return;
    try {
      const res = await fetch(`/api/brand/logos/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Logo removido.');
        setLogoTimestamp(Date.now());
        await fetchBrandCatalog();
        fetchLogoStatus();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Falha ao remover logo.');
      }
    } catch {
      toast.error('Erro ao remover logo.');
    }
  };

  const handleAddYoutubeChannel = async () => {
    if (!newChannelUrl.trim()) {
      toast.error('Informe a URL do canal.');
      return;
    }
    try {
      const res = await fetch('/api/brand/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newChannelLabel.trim() || 'Novo Canal',
          channelUrl: newChannelUrl.trim(),
          channelName: globalYoutubeChannelName.trim(),
          subscriberCount: globalYoutubeSubscriberCount.trim(),
        }),
      });
      if (res.ok) {
        toast.success('Canal adicionado ao catálogo!');
        setNewChannelLabel('');
        setNewChannelUrl('');
        const data = await res.json();
        if (data.channels) {
          setYoutubeChannels(data.channels.channels || []);
          setSelectedChannelId(data.channels.selectedYoutubeChannelId || null);
        } else {
          await fetchBrandCatalog();
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Falha ao adicionar canal.');
      }
    } catch {
      toast.error('Erro ao adicionar canal.');
    }
  };

  const handleSelectYoutubeChannel = async (id: string) => {
    try {
      const res = await fetch(getProjectUrl('/api/brand/channels/select'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, scope: channelConfigScope }),
      });
      if (res.ok) {
        if (channelConfigScope === 'global') {
          try {
            await fetch(getProjectUrl('/api/brand/channels/reset-project'), { method: 'POST' });
          } catch { /* ignore */ }
        }
        toast.success(`Canal ${channelConfigScope === 'global' ? 'global' : 'do projeto'} selecionado!`);
        await fetchBrandCatalog();
        if (channelConfigScope === 'global') fetchGlobalRenderConfig();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Falha ao selecionar canal.');
      }
    } catch {
      toast.error('Erro ao selecionar canal.');
    }
  };

  const handleDeleteYoutubeChannel = async (id: string) => {
    if (!window.confirm('Remover este canal do catálogo?')) return;
    try {
      const res = await fetch(`/api/brand/channels/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Canal removido.');
        const data = await res.json();
        if (data.channels) {
          setYoutubeChannels(data.channels.channels || []);
          setSelectedChannelId(data.channels.selectedYoutubeChannelId || null);
        } else {
          await fetchBrandCatalog();
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Falha ao remover canal.');
      }
    } catch {
      toast.error('Erro ao remover canal.');
    }
  };

  const handleUpdateYoutubeChannelField = async (channelId: string, field: keyof YoutubeChannelItem, value: string) => {
    const channel = youtubeChannels.find((c) => c.id === channelId);
    if (!channel) return;
    const updated = { ...channel, [field]: value };
    setYoutubeChannels((prev) => prev.map((c) => (c.id === channelId ? updated : c)));
    try {
      const res = await fetch(`/api/brand/channels/${encodeURIComponent(channelId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: updated.label,
          channelUrl: updated.channelUrl,
          channelName: updated.channelName || '',
          subscriberCount: updated.subscriberCount || '',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Falha ao atualizar canal.');
        await fetchBrandCatalog();
      }
    } catch {
      toast.error('Erro ao atualizar canal.');
      await fetchBrandCatalog();
    }
  };

  const brandPanelProps = useMemo(() => ({
    logoCatalogScope,
    setLogoCatalogScope,
    logoStatus,
    logoTimestamp,
    brandLogos,
    setBrandLogos,
    selectedLogoId,
    projectSelectedLogoId,
    newLogoName,
    setNewLogoName,
    uploadingLogo,
    onResetLogo: handleResetLogo,
    onSelectLogo: handleSelectBrandLogo,
    onRenameLogo: handleRenameBrandLogo,
    onDeleteLogo: handleDeleteBrandLogo,
    onLogoUpload: handleLogoUpload,
    channelConfigScope,
    setChannelConfigScope,
    onChannelScopeGlobal: () => { setChannelConfigScope('global'); fetchGlobalRenderConfig(); },
    youtubeChannels,
    selectedChannelId,
    projectSelectedChannelId,
    newChannelLabel,
    setNewChannelLabel,
    newChannelUrl,
    setNewChannelUrl,
    globalYoutubeChannelName,
    setGlobalYoutubeChannelName,
    globalYoutubeSubscriberCount,
    setGlobalYoutubeSubscriberCount,
    onSelectChannel: handleSelectYoutubeChannel,
    onUpdateChannelField: handleUpdateYoutubeChannelField,
    onDeleteChannel: handleDeleteYoutubeChannel,
    onAddChannel: handleAddYoutubeChannel,
  }), [
    logoCatalogScope, logoStatus, logoTimestamp, brandLogos, selectedLogoId, projectSelectedLogoId,
    newLogoName, uploadingLogo, channelConfigScope, youtubeChannels, selectedChannelId,
    projectSelectedChannelId, newChannelLabel, newChannelUrl, globalYoutubeChannelName,
    globalYoutubeSubscriberCount,
  ]);

  useEffect(() => {
    if (activeTab === 'settings' || activeTab === 'status') {
      fetchBrandCatalog();
      fetchLogoStatus();
    }
    if (activeTab === 'settings') {
      fetchUploadStatus();
      fetchWorkflowKeysStatus();
    }
  }, [activeTab, activeProject]);

  useEffect(() => {

    setUploadScope(activeProject === 'Buracos no Deserto' ? 'global' : 'project');

  }, [activeProject]);

  useEffect(() => {
    if (shouldAutoAlign && wordTranscripts.length > 0 && config && config.timeline_assets && status?.block_timings) {
      setShouldAutoAlign(false);
      setTimeout(() => {
        alignAllBlocksToSpeech();
      }, 200);
    }
  }, [wordTranscripts, shouldAutoAlign, config, status]);

  useEffect(() => {
    if (activeTab === 'creator' && creatorStep >= 2) return;
    if (!isWhisperTimelineReady(wordTranscripts, status)) return;
    const sbPrompts = storyboardData?.visual_prompts;
    if (!Array.isArray(sbPrompts) || sbPrompts.length === 0) return;
    setGeneratedScriptData((prev) => {
      if (!prev) return storyboardData;
      if (!Array.isArray(prev.visual_prompts) || prev.visual_prompts.length === 0) {
        return { ...prev, visual_prompts: sbPrompts };
      }
      const sbByScene = new Map(
        sbPrompts.map((sb: any) => [String(sb?.scene ?? sb?.cena ?? ''), sb]),
      );
      const mergedPrompts = prev.visual_prompts.map((vp: any, idx: number) => {
        const sceneKey = String(vp?.scene ?? vp?.cena ?? '');
        const sb = (sceneKey && sbByScene.get(sceneKey)) || sbPrompts[idx];
        if (!sb) return vp;
        return {
          ...vp,
          duration: sb.duration ?? vp.duration,
          duration_seconds: sb.duration_seconds ?? vp.duration_seconds,
          duration_from_whisper: sb.duration_from_whisper ?? vp.duration_from_whisper,
          narration_text: sb.narration_text ?? vp.narration_text,
          narration_excerpt: sb.narration_excerpt ?? vp.narration_excerpt,
        };
      });
      return { ...prev, visual_prompts: mergedPrompts };
    });
  }, [wordTranscripts, status?.block_timings?.starts, storyboardData?.visual_prompts, activeTab, creatorStep]);

  // Fetch valid projects list

  const fetchUploadStatus = async () => {
    try {
      const res = await fetch('/api/upload/status');
      if (res.ok) {
        const data = await res.json();
        setUploadStatus(data);
        if (data.youtube?.client_id) setYtClientId(data.youtube.client_id);
        if (data.canva?.clientId) setCanvaClientId(data.canva.clientId);
        if (data.instagram?.account_id) setIgAccountId(data.instagram.account_id);
      }
    } catch (e) {
      console.error("Erro ao carregar status de upload:", e);
    }
  };

  const fetchYoutubeChannelAlerts = useCallback(async () => {
    try {
      const res = await fetch(`/api/youtube/channel/alerts?viewsThreshold=${getYoutubeViewsThreshold()}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok || res.status === 403) {
        setYoutubeChannelAlerts({
          badgeCount: Number(data.badgeCount || 0),
          unansweredComments: Number(data.unansweredComments || 0),
          hotVideos: data.hotVideos || [],
          lumieraVideoById: data.lumieraVideoById || {},
          alerts: data.alerts || [],
          pollIntervalMinutes: data.pollIntervalMinutes,
          views48hThreshold: data.views48hThreshold,
          fetchedAt: data.fetchedAt,
        });
      }
    } catch (e) {
      console.error('Erro ao carregar alertas YouTube:', e);
    }
  }, []);

  useEffect(() => {
    fetchYoutubeChannelAlerts();
    let timer = window.setInterval(fetchYoutubeChannelAlerts, getYoutubePollIntervalMs());
    const onPollChange = () => {
      window.clearInterval(timer);
      timer = window.setInterval(fetchYoutubeChannelAlerts, getYoutubePollIntervalMs());
    };
    window.addEventListener('lumiera-youtube-poll-change', onPollChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('lumiera-youtube-poll-change', onPollChange);
    };
  }, [fetchYoutubeChannelAlerts]);

  useEffect(() => {
    if (!getYoutubeNotificationsEnabled() || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    const badge = youtubeChannelAlerts?.badgeCount ?? 0;
    const prev = youtubeBadgePrevRef.current;
    if (badge > prev && badge > 0) {
      const unanswered = youtubeChannelAlerts?.unansweredComments ?? 0;
      const hot = youtubeChannelAlerts?.hotVideos?.length ?? 0;
      const parts = [];
      if (unanswered > 0) parts.push(`${unanswered} comentário(s) sem resposta`);
      if (hot > 0) parts.push(`${hot} vídeo(s) em alta`);
      const viewsDrop = youtubeChannelAlerts?.alerts?.find((a) => a.type === 'views_drop');
      if (viewsDrop?.label) parts.push(viewsDrop.label);
      const deadVideos = youtubeChannelAlerts?.alerts?.find((a) => a.type === 'dead_videos');
      if (deadVideos?.label) parts.push(deadVideos.label);
      new Notification('Canal YouTube — Lumiera', {
        body: parts.join(' · ') || `${badge} alerta(s)`,
        tag: 'lumiera-youtube-alerts',
      });
    }
    youtubeBadgePrevRef.current = badge;
  }, [youtubeChannelAlerts]);

  useEffect(() => {
    if (activeTab === 'youtube-studio') {
      fetchYoutubeChannelAlerts();
    }
  }, [activeTab, fetchYoutubeChannelAlerts]);

  const resurrectorScheduler = useResurrectorScheduler((message) => {
    toast.success(message, { duration: 6000 });
  });

  const fetchProjects = async () => {

    try {

      const res = await fetch('/api/projects');

      if (res.ok) {

        setProjects(await res.json());

      }

    } catch (err) {

      console.error("Error fetching projects:", err);

    }

  };

  const fetchStoryboard = async (projName = activeProject, opts?: { force?: boolean }) => {
    const gen = ++storyboardFetchGenRef.current;
    setLoadingStoryboard(true);
    try {
      const res = await fetch(getProjectUrl('/api/projects/storyboard', projName));
      if (res.ok) {
        if (gen !== storyboardFetchGenRef.current) return;
        if (!opts?.force && storyboardDirtyRef.current) return;
        applyStoryboardToCreatorState(repairMojibakeDeep(await res.json()));
      }
    } catch (err) {
      console.error("Error fetching storyboard:", err);
    } finally {
      if (gen === storyboardFetchGenRef.current) {
        setLoadingStoryboard(false);
      }
    }
  };

  const handleGenerateAiOverlays = async () => {
    if (!activeProject) {
      toast.error('Carregue um projeto antes de gerar overlays.');
      return;
    }
    setGeneratingOverlays(true);
    const toastId = toast.loading('Pesquisando assuntos do roteiro e planejando overlays...');
    try {
      const effectiveGeminiChrome = config?.use_gemini_chrome === true;
      const useHyperframes = config?.use_hyperframes !== false;

      const { ok, data } = await postAi('/api/render/plan-overlays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hyperframes: useHyperframes,
          require_browser: effectiveGeminiChrome,
          force: true,
        }),
      });

      if (!ok || (data as any)?.needs_browser) {
        toast.error('Geração cancelada ou pendente de resposta do Gemini no Chrome.', { id: toastId });
        return;
      }

      if (!(data as any).overlayCount || (data as any).overlayCount < 1) {
        toast.error((data as any).error || 'Gemini não gerou overlays válidos.', { id: toastId });
        return;
      }

      toast.success(`Overlays planejados com sucesso: ${(data as any).overlayCount} overlays gerados!`, { id: toastId });
      await fetchStoryboard(activeProject, { force: true });
      await fetchVideoQuality(activeProject);
    } catch (err) {
      console.error('Error generating overlays:', err);
      toast.error('Erro ao planejar overlays via AI.', { id: toastId });
    } finally {
      setGeneratingOverlays(false);
    }
  };

  const fetchVideoQuality = async (projName = activeProject) => {
    try {
      const res = await fetch(getProjectUrl('/api/projects/video-quality', projName));
      if (res.ok) {
        setVideoQuality(await res.json());
      }
    } catch (err) {
      console.error('Error fetching video quality:', err);
    }
  };

  const handlePreRenderAutoFix = async (fixId: string) => {
    setPreRenderFixingId(fixId);
    try {
      const res = await fetch(getProjectUrl('/api/projects/pre-render/auto-fix'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixId }),
      });
      const data = await res.json();
      if (res.ok && data.preRenderAdvice) {
        setVideoQuality((prev) => (prev ? { ...prev, ...data, preRenderAdvice: data.preRenderAdvice } : data));
        toast.success(data.message || 'Correção aplicada.');
        fetchData();
      } else {
        toast.error(data.error || 'Não foi possível corrigir automaticamente.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha na correção automática.');
    } finally {
      setPreRenderFixingId(null);
    }
  };

  // Fetch initial project-specific data (run on project change, does not poll periodically to avoid overwriting user inputs)

  const fetchInitialProjectData = async () => {
    setProjectDataLoading(true);
    try {

      const configRes = await fetch(getProjectUrl('/api/config'));

      if (configRes.ok) {

        const loadedConfig = await configRes.json();
        if (!Array.isArray(loadedConfig.highlight_keywords)) loadedConfig.highlight_keywords = [];
        if (!Array.isArray(loadedConfig.impact_texts)) loadedConfig.impact_texts = [];
        if (!Array.isArray(loadedConfig.bgm_mappings)) loadedConfig.bgm_mappings = [];
        if (!Array.isArray(loadedConfig.bgm_emotion_mappings)) loadedConfig.bgm_emotion_mappings = [];

        // Auto-set aspect_ratio if not defined, based on format

        if (!loadedConfig.aspect_ratio) {

          loadedConfig.aspect_ratio = formatSelector === 'SHORTS' ? '9:16' : '16:9';

        }

        const isShortProject = loadedConfig.aspect_ratio === '9:16' || formatSelector === 'SHORTS';
        if (!loadedConfig.use_single_bgm && !loadedConfig.bgm_mode && !isShortProject) {
          loadedConfig.bgm_mode = 'emotion';
        }

        setConfig(loadedConfig);
        if (loadedConfig.render_resolution === '2k' || loadedConfig.render_resolution === '1080p') {
          setProjectRenderResolution(loadedConfig.render_resolution);
          setResolutionConfigScope('project');
        } else {
          setResolutionConfigScope('global');
        }
        const meta = loadedConfig.upload_metadata || {};
        setYtTitle(meta.youtube?.title || '');
        setYtDescription(meta.youtube?.description || '');
        setYtPrivacy(meta.youtube?.privacy || 'private');
        setYtTags(Array.isArray(meta.youtube?.tags) ? meta.youtube.tags.join(', ') : (meta.youtube?.tags || ''));
        setYtChapters(meta.youtube?.chapters || '');
        setYtPinnedComment(meta.youtube?.pinned_comment || meta.youtube?.pinnedComment || '');
        setYtPublishAt(meta.youtube?.publish_at || meta.youtube?.publishAt || '');
        setYtCategoryId(meta.youtube?.category_id || meta.youtube?.categoryId || '27');
        setYtThumbnailPath(meta.youtube?.thumbnail || '');
        setYtThumbnailVariant(meta.youtube?.thumbnail_variant || '');
        if (meta.youtube?.post_id) setTitleExperimentVideoId(meta.youtube.post_id);
        setIgCaption(meta.instagram?.title || '');
        setTtCaption(meta.tiktok?.title || '');
        setKwCaption(meta.kwai?.title || '');
        fetchUploadStatus();
        fetchYoutubeMetadataCache();
        fetchYoutubeThumbnailImages();
        fetchTitleExperiment();

      }

      const musicRes = await fetch(getProjectUrl('/api/music'));

      if (musicRes.ok) {
        const musicData = await musicRes.json();
        setMusicFiles(Array.isArray(musicData) ? musicData.filter((f) => f && typeof f.name === 'string') : []);
      }

      const aiKeyStatusRes = await fetch(getProjectUrl('/api/ai/key-status'));

      if (aiKeyStatusRes.ok) {

        const keyData = await aiKeyStatusRes.json();

        setHasApiKey(keyData.has_key);

        if (typeof keyData.key_count === 'number') setGeminiKeyCount(keyData.key_count);

      }

            const aiSettingsRes = await fetch(getProjectUrl('/api/ai/settings'));

      if (aiSettingsRes.ok) {

        const settingsData = await aiSettingsRes.json();

        setAiProvider(settingsData.provider || 'gemini');

        setGeminiModel(settingsData.gemini_model || 'gemini-2.5-flash');

        if (Array.isArray(settingsData.gemini_model_options) && settingsData.gemini_model_options.length > 0) {
          setGeminiModelOptions(settingsData.gemini_model_options);
        }

        setGeminiKeyCount(settingsData.gemini_key_count || 0);

        setHasXaiKey(!!settingsData.has_xai_key);

        setHasOpenRouterKey(!!settingsData.has_openrouter_key);
        setHasNvidiaKey(!!settingsData.has_nvidia_key);

        setHasEpidemicKey(!!settingsData.has_epidemic_key);

        setGeminiBrowserMode(!!settingsData.gemini_browser_mode);

        setHasApiKey(
          !!settingsData.gemini_browser_mode
          || (settingsData.gemini_key_count || 0) > 0
          || !!settingsData.has_xai_key
          || settingsData.provider === 'openrouter'
          || !!settingsData.has_openrouter_key
          || settingsData.provider === 'nvidia'
          || !!settingsData.has_nvidia_key,
        );

      }

      // Fetch word transcripts

      try {

        const transUrl = getMusicUrl('word_transcripts.json');

        const transRes = await fetch(transUrl);

        if (transRes.ok) {

          setWordTranscripts(await transRes.json());

        } else {

          setWordTranscripts([]);

        }

      } catch (e) {

        console.error("Failed to load transcripts:", e);

        setWordTranscripts([]);

      }

      fetchStoryboard(activeProject);

      fetchCreatorAssets();

    } catch (err) {
      console.error("Error loading initial project data:", err);
    } finally {
      setProjectDataLoading(false);
    }

  };

  // Fetch status and outputs (runs periodically in background)

  const fetchStatusAndOutputs = async () => {

    try {

      const statusRes = await fetch(getProjectUrl('/api/status'));

      if (statusRes.ok) setStatus(await statusRes.json());

      const outputsRes = await fetch(getProjectUrl('/api/outputs'));

      if (outputsRes.ok) setOutputs(await outputsRes.json());

    } catch (err) {

      console.error("Error loading status and outputs:", err);

    }

  };

  useEffect(() => {
    if (!outputs.length) {
      setSelectedUploadVideo(null);
      return;
    }
    setSelectedUploadVideo((prev) => {
      if (prev && outputs.some((o) => o.name === prev)) return prev;
      const sorted = [...outputs].sort(
        (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
      );
      return sorted[0]?.name ?? null;
    });
  }, [outputs, activeProject]);

  const fetchHeaderWeather = async () => {

    try {

      const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-30.0346&longitude=-51.2177&current=temperature_2m&timezone=America%2FSao_Paulo&forecast_days=1');

      if (!weatherRes.ok) return;

      const weatherData = await weatherRes.json();

      const temperature = Number(weatherData?.current?.temperature_2m);

      setHeaderWeather({ temperature: Number.isFinite(temperature) ? temperature : null });

    } catch (err) {

      console.error("Error loading Porto Alegre weather:", err);

    }

  };

  // Keep a combined fetchData for manual triggers and lifecycle events

  const fetchData = async (opts?: { includeVideoQuality?: boolean }) => {
    const tasks = [
      fetchInitialProjectData(),
      fetchStatusAndOutputs(),
      fetchHeaderWeather(),
      fetchLogoStatus(),
      fetchGlobalRenderConfig(),
    ];
    if (opts?.includeVideoQuality) tasks.push(fetchVideoQuality());
    await Promise.all(tasks);
  };

  const buildWizardSessionPatch = useCallback((): WizardSessionPatch => ({
    wasInWizard: activeTab === 'creator' || creatorStep > 1 || showNarrationReview || !!generatedScriptData,
    activeTab,
    activeProject,
    creatorStep,
    nicheInput,
    formatSelector,
    ideasData,
    selectedIdeaIndex,
    generatedScriptData,
    creatorProjectName,
    creatorScript,
    ideationTab,
    customTitle,
    customHooks,
    customOutline,
    customBlocks,
    customIdeaTitle,
    customIdeaPromise,
    customIdeaHook,
    customIdeaEmotion,
    customIdeaBlocks,
    listNiche,
    listTopic,
    rankCount,
    rankOrder,
    listicleHudStyle,
    listicleIdeasData,
    listicleSearchNiche,
    ideasSearchNiche,
    selectedListicleIdeaIndex,
    showNarrationReview,
    narrationDraft,
    narrationTaggedDraft,
    narrationStrategy,
    narrationBlockPhrases,
    narrationBlockScript,
    narrationNotebooklmEnriched,
    narrationProjectName,
    useNotebooklm,
    uploadedScenes,
    expandedBlocks,
    editorialIdeaImport,
  }), [
    activeTab, activeProject, creatorStep, nicheInput, formatSelector, ideasData, selectedIdeaIndex,
    generatedScriptData, creatorProjectName, creatorScript, ideationTab, customTitle, customHooks,
    customOutline, customBlocks, customIdeaTitle, customIdeaPromise, customIdeaHook, customIdeaEmotion,
    customIdeaBlocks, listNiche, listTopic, rankCount, rankOrder, listicleHudStyle, listicleIdeasData,
    listicleSearchNiche, ideasSearchNiche, selectedListicleIdeaIndex, showNarrationReview, narrationDraft,
    narrationTaggedDraft, narrationStrategy, narrationBlockPhrases, narrationBlockScript,
    narrationNotebooklmEnriched, narrationProjectName, useNotebooklm, uploadedScenes, expandedBlocks,
    editorialIdeaImport,
  ]);

  const applyWizardSessionPatch = useCallback((patch: WizardSessionPatch) => {
    if (patch.creatorStep !== undefined) setCreatorStep(patch.creatorStep);
    if (patch.nicheInput !== undefined) setNicheInput(patch.nicheInput);
    if (patch.formatSelector) setFormatSelector(patch.formatSelector);
    if (patch.ideasData !== undefined) setIdeasData(patch.ideasData as typeof ideasData);
    if (patch.selectedIdeaIndex !== undefined) setSelectedIdeaIndex(patch.selectedIdeaIndex);
    if (patch.generatedScriptData !== undefined) {
      if (patch.generatedScriptData) {
        applyStoryboardToCreatorState(patch.generatedScriptData);
      } else {
        setGeneratedScriptData(null);
        setStoryboardData(null);
      }
    }
    if (patch.creatorProjectName !== undefined) setCreatorProjectName(patch.creatorProjectName);
    if (patch.creatorScript !== undefined) setCreatorScript(patch.creatorScript);
    if (patch.ideationTab) setIdeationTab(patch.ideationTab);
    if (patch.customTitle !== undefined) setCustomTitle(patch.customTitle);
    if (patch.customHooks !== undefined) setCustomHooks(patch.customHooks);
    if (patch.customOutline !== undefined) setCustomOutline(patch.customOutline);
    if (patch.customBlocks) setCustomBlocks(patch.customBlocks);
    if (patch.customIdeaTitle !== undefined) setCustomIdeaTitle(patch.customIdeaTitle);
    if (patch.customIdeaPromise !== undefined) setCustomIdeaPromise(patch.customIdeaPromise);
    if (patch.customIdeaHook !== undefined) setCustomIdeaHook(patch.customIdeaHook);
    if (patch.customIdeaEmotion !== undefined) setCustomIdeaEmotion(patch.customIdeaEmotion);
    if (patch.customIdeaBlocks !== undefined) setCustomIdeaBlocks(patch.customIdeaBlocks);
    if (patch.listNiche !== undefined) setListNiche(patch.listNiche);
    if (patch.listTopic !== undefined) setListTopic(patch.listTopic);
    if (patch.rankCount !== undefined) setRankCount(patch.rankCount);
    if (patch.rankOrder) setRankOrder(patch.rankOrder);
    if (patch.listicleHudStyle) setListicleHudStyle(patch.listicleHudStyle);
    if (patch.listicleIdeasData !== undefined) setListicleIdeasData(patch.listicleIdeasData as typeof listicleIdeasData);
    if (patch.listicleSearchNiche !== undefined) setListicleSearchNiche(patch.listicleSearchNiche);
    if (patch.ideasSearchNiche !== undefined) setIdeasSearchNiche(patch.ideasSearchNiche);
    if (patch.selectedListicleIdeaIndex !== undefined) setSelectedListicleIdeaIndex(patch.selectedListicleIdeaIndex);
    if (patch.showNarrationReview !== undefined) setShowNarrationReview(patch.showNarrationReview);
    if (patch.narrationDraft !== undefined) setNarrationDraft(patch.narrationDraft);
    if (patch.narrationTaggedDraft !== undefined) setNarrationTaggedDraft(patch.narrationTaggedDraft);
    if (patch.narrationStrategy !== undefined) setNarrationStrategy(patch.narrationStrategy);
    if (patch.narrationBlockPhrases) setNarrationBlockPhrases(patch.narrationBlockPhrases);
    if (patch.narrationBlockScript !== undefined) setNarrationBlockScript(patch.narrationBlockScript);
    if (patch.narrationNotebooklmEnriched !== undefined) setNarrationNotebooklmEnriched(patch.narrationNotebooklmEnriched);
    if (patch.narrationProjectName !== undefined) setNarrationProjectName(patch.narrationProjectName);
    if (patch.useNotebooklm !== undefined) setUseNotebooklm(patch.useNotebooklm);
    if (patch.uploadedScenes) setUploadedScenes(patch.uploadedScenes);
    if (patch.expandedBlocks) setExpandedBlocks(patch.expandedBlocks);
    if (patch.editorialIdeaImport !== undefined) {
      setEditorialIdeaImport(patch.editorialIdeaImport);
      if (patch.editorialIdeaImport.mechanic === 'openmontage-reference') {
        const restoredOutline = resolveEditorialImportOutline(patch.editorialIdeaImport);
        if (restoredOutline.trim()) {
          const patchOutline = String(patch.customOutline || '').trim();
          if (!patchOutline) setCustomOutline(restoredOutline);
        }
      }
    }
    if (patch.activeProject) setActiveProject(patch.activeProject);
    if (patch.activeTab === 'creator' || shouldRestoreWizardTab(patch)) {
      setActiveTab('creator');
    }
    if (patch.savedAt) setWizardSavedAtLabel(formatWizardSavedAt(patch.savedAt));
  }, []);

  useEffect(() => {
    if (!wizardRestoreCompleteRef.current) return;

    const saved = saveWizardSession(buildWizardSessionPatch());
    setWizardSavedAtLabel(formatWizardSavedAt(saved.savedAt));

    const project = creatorProjectName.trim() || narrationProjectName.trim() || activeProject;
    if (!project || activeTab !== 'creator') return;

    if (wizardServerSaveTimer.current) clearTimeout(wizardServerSaveTimer.current);
    wizardServerSaveTimer.current = setTimeout(() => {
      const separator = '/api/projects/wizard-session'.includes('?') ? '&' : '?';
      fetch(`/api/projects/wizard-session${separator}project=${encodeURIComponent(project)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saved),
      }).then(async (res) => {
        if (res.status === 409) {
          const data = await res.json().catch(() => null);
          if (data?.session) applyWizardSessionPatch(data.session);
        }
      }).catch(() => {});
    }, 1500);

    return () => {
      if (wizardServerSaveTimer.current) clearTimeout(wizardServerSaveTimer.current);
    };
  }, [buildWizardSessionPatch, activeTab, creatorProjectName, narrationProjectName, activeProject]);

  useEffect(() => {
    if (wizardRestoredRef.current) return;
    wizardRestoredRef.current = true;
    const local = loadWizardSession();
    const project = resolveWizardActiveProject(local);

    (async () => {
      try {
        if (!project) return;
        const res = await fetch(`/api/projects/wizard-session?project=${encodeURIComponent(project)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.session) return;
        if (!isServerSessionNewer(local, data.session.savedAt)) return;
        applyWizardSessionPatch(data.session);
        toast.success(
          `Wizard restaurado — passo ${data.session.creatorStep || 1}${
            data.session.creatorProjectName ? ` · ${data.session.creatorProjectName}` : ''
          }`,
        );
      } catch {
        /* ignore */
      } finally {
        wizardRestoreCompleteRef.current = true;
      }
    })();
  }, [applyWizardSessionPatch]);

  useEffect(() => {
    if (!editorialIdeaImport || editorialIdeaImport.mechanic !== 'openmontage-reference') return;
    if (customOutline.trim()) return;
    const restored = resolveEditorialImportOutline(editorialIdeaImport);
    if (restored.trim()) setCustomOutline(restored);
  }, [editorialIdeaImport, customOutline]);

  useEffect(() => {
    if (!shouldRestoreWizardTab(initialWizardSession)) return;
    const step = Number(initialWizardSession?.creatorStep || 1);
    if (step <= 1 && !initialWizardSession?.showNarrationReview) return;
    toast.success(`Wizard restaurado — passo ${step} de 7`, { duration: 4500 });
  }, []);

  useEffect(() => {
    if (listicleIdeasData && listicleSearchNiche && listNiche.trim() !== listicleSearchNiche) {
      setListicleIdeasData(null);
      setSelectedListicleIdeaIndex(-1);
    }
  }, [listNiche, listicleIdeasData, listicleSearchNiche]);

  useEffect(() => {
    if (ideasData && ideasSearchNiche && nicheInput.trim() !== ideasSearchNiche) {
      setIdeasData(null);
      setSelectedIdeaIndex(-1);
    }
  }, [nicheInput, ideasData, ideasSearchNiche]);

  const refreshGeminiExtensionStatus = async () => {
    resetGeminiExtensionCache();
    const diag = await diagnoseGeminiExtension();
    setGeminiExtensionReady(diag.pingOk);
    if (diag.pingOk) {
      setGeminiExtensionDiag(diag.version ? `v${diag.version} conectada` : 'conectada');
    } else {
      setGeminiExtensionDiag(diag.error || 'Extensão não respondeu');
    }
    return diag;
  };

  useEffect(() => {
    if (!geminiBrowserMode) {
      setGeminiExtensionReady(null);
      setGeminiExtensionDiag('');
      return;
    }
    refreshGeminiExtensionStatus().catch(() => {
      setGeminiExtensionReady(false);
      setGeminiExtensionDiag('Falha ao verificar extensão');
    });
    const onBridgeReady = () => {
      void refreshGeminiExtensionStatus();
    };
    window.addEventListener('lumiera-gemini-bridge-ready', onBridgeReady);
    return () => window.removeEventListener('lumiera-gemini-bridge-ready', onBridgeReady);
  }, [geminiBrowserMode]);

  useEffect(() => {

    localStorage.setItem('qanat_active_project', activeProject);

  }, [activeProject]);

  useEffect(() => {
    if (activeTab === 'creator' || activeTab === 'editor') {
      fetchNotebooklmStatus();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'creator') return;
    const fmt = formatSelector === 'SHORTS' ? 'SHORT' : 'LONG';
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/studio-agents/resolve-bundle?task=ideas&format=${fmt}`);
        if (!res.ok || cancelled) return;
        const data: StudioBundlePreview = await res.json();
        if (!cancelled) setCreatorIdeasBundle(data);
      } catch {
        if (!cancelled) setCreatorIdeasBundle(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, formatSelector]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]');
      if (Array.isArray(stored)) {
        setRecentProjects(stored.filter((item) => typeof item === 'string'));
      }
    } catch {
      setRecentProjects([]);
    }
  }, []);

  useEffect(() => {
    if (!activeProject) return;
    setRecentProjects((prev) => {
      const next = [activeProject, ...prev.filter((name) => name !== activeProject)].slice(0, 5);
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(next));
      return next;
    });
  }, [activeProject]);

  useEffect(() => {

    fetchProjects();

  }, []);

  useEffect(() => {
    const inCreatorFlow = activeTab === 'creator' && creatorStep > 1;
    if (!inCreatorFlow) {
      setUploadSuccess(false);
      setUploadedScenes({});
    }
    setUploadingNarration(false);
    setSyncingTimings(false);
    setDragActive(false);
    fetchData({ includeVideoQuality: true });
  }, [activeProject]);

  useEffect(() => {

    const clockInterval = setInterval(() => setHeaderDate(new Date()), 60000);

    const weatherInterval = setInterval(fetchHeaderWeather, 600000);

    return () => {

      clearInterval(clockInterval);

      clearInterval(weatherInterval);

    };

  }, []);

  useEffect(() => {

    // Only poll status and outputs to prevent config overwrites while user is typing

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchStatusAndOutputs();
    };
    const interval = setInterval(tick, 20000);

    return () => clearInterval(interval);

  }, [activeProject]);

  useEffect(() => {

    if (terminalEndRef.current) {

      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });

    }

  }, [logs]);

  useEffect(() => {

    if (chatEndRef.current) {

      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });

    }

  }, [chatMessages]);

  useEffect(() => {

    if (activeProject) {

      setSelectedProject(activeProject);

    }

  }, [activeProject]);

  useEffect(() => {
    if (!wordTranscripts || wordTranscripts.length === 0) {
      setFlatTranscriptWords([]);
      return;
    }
    setFlatTranscriptWords(
      flattenWordTranscripts(wordTranscripts, { synthesizeFromText: true }),
    );
  }, [wordTranscripts]);

  const loadEditorProject = () => {

    if (selectedProject) {

      setActiveProject(selectedProject);

    }

  };

  const updateSceneField = (index: number, field: string, value: any) => {

    if (!storyboardData) return;
    if (field === 'duration') return;

    const newPrompts = [...storyboardData.visual_prompts];

    newPrompts[index] = { ...newPrompts[index], [field]: value };

    setStoryboardData({ ...storyboardData, visual_prompts: newPrompts });

  };

  const moveScene = (index: number, direction: 'up' | 'down') => {

    if (!storyboardData) return;

    const newPrompts = [...storyboardData.visual_prompts];

    const targetIdx = direction === 'up' ? index - 1 : index + 1;

    if (targetIdx < 0 || targetIdx >= newPrompts.length) return;

    // Swap

    const temp = newPrompts[index];

    newPrompts[index] = newPrompts[targetIdx];

    newPrompts[targetIdx] = temp;

    setStoryboardData({ ...storyboardData, visual_prompts: newPrompts });

  };

  const deleteScene = (index: number) => {

    if (!storyboardData) return;

    const newPrompts = storyboardData.visual_prompts.filter((_, idx) => idx !== index);

    setStoryboardData({ ...storyboardData, visual_prompts: newPrompts });

    toast.success("Cena excluída do roteiro!");

  };

  const insertSceneAfter = (index: number) => {

    if (!storyboardData) return;

    const newPrompts = [...storyboardData.visual_prompts];

    const referenceScene = newPrompts[index];

    const newScene = {

      scene: `${referenceScene.block}.${(newPrompts.filter((p: any) => p.block === referenceScene.block).length + 1)}`,

      block: referenceScene.block,

      narration_text: "",

      type: "imagem IA 2k",

      prompt: "Cinematic photorealistic image, 2k resolution",

      editor_notes: "",

      stock_query: ""

    };

    newPrompts.splice(index + 1, 0, newScene);

    setStoryboardData({ ...storyboardData, visual_prompts: newPrompts });

  };

  const addSceneAtEnd = () => {

    if (!storyboardData) return;

    const newPrompts = [...storyboardData.visual_prompts];

    const lastBlock = newPrompts.length > 0 ? newPrompts[newPrompts.length - 1].block : 1;

    const newScene = {

      scene: `${lastBlock}.${(newPrompts.filter((p: any) => p.block === lastBlock).length + 1)}`,

      block: lastBlock,

      narration_text: "",

      type: "imagem IA 2k",

      prompt: "Cinematic photorealistic image, 2k resolution",

      editor_notes: "",

      stock_query: ""

    };

    newPrompts.push(newScene);

    setStoryboardData({ ...storyboardData, visual_prompts: newPrompts });

  };

  const handleSaveStoryboard = async () => {

    if (!storyboardData) return;

    try {

      const res = await fetch(getProjectUrl('/api/projects/storyboard'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(storyboardData)

      });

      if (res.ok) {

        toast.success("Roteiro e Storyboard salvos com sucesso!");

        fetchData();

      } else {

        const data = await res.json();

        toast.error(data.error || "Erro ao salvar roteiro.");

      }

    } catch (err) {

      toast.error("Falha de conexão ao salvar roteiro.");

    }

  };

  // Create project subfolder template

  const handleCreateProject = async () => {

    if (!newProjectName.trim()) return;

    try {

      const res = await fetch('/api/projects/create', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ name: newProjectName.trim(), format: newProjectFormat, niche: newProjectNiche.trim() })

      });

      const data = await res.json();

      if (res.ok) {

        toast.success(data.message);

        const safeName = newProjectName.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
        setNewProjectName('');
        setShowCreateModal(false);
        await fetchProjects();
        setActiveProject(safeName);

        setActiveTab('creator'); // Direct to wizard

      } else {

        toast.error('Erro ao criar projeto: ' + (data.error || 'Erro desconhecido'));

      }

    } catch (err) {

      console.error(err);

      toast.error('Falha na conexão ao criar projeto.');

    }

  };

  const handleDeleteProject = async (name: string) => {

    try {

      const res = await fetch('/api/projects/delete', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ name })

      });

      const data = await res.json();

      if (res.ok) {

        try { toast.success(data.message); } catch (e) {}



        const deleted = name.trim();
        const touchesWizard = deleted === creatorProjectName.trim()
          || deleted === narrationProjectName.trim()
          || deleted === activeProject;
        if (touchesWizard) {
          resetCreatorWizard({ deleteServerSessionFor: deleted });
        }

        const deletedWasActive = deleted === activeProject.trim();
        let nextList: ProjectListItem[] = projects;
        try {
          const listRes = await fetch('/api/projects');
          if (listRes.ok) {
            nextList = await listRes.json();
            setProjects(nextList);
          } else {
            await fetchProjects();
          }
        } catch {
          await fetchProjects();
        }

        if (deletedWasActive) {
          const nextActive = nextList.find((p) => p.name.trim() !== deleted)?.name
            || 'Buracos no Deserto';
          setActiveProject(nextActive);
        }

      } else {

        try { toast.error('Erro ao excluir projeto: ' + (data.error || 'Erro desconhecido')); } catch (e) {}

      }

    } catch (err) {

      console.error(err);

      try { toast.error('Falha na conexão ao excluir projeto.'); } catch (e) {}

    }

  };

  type ProjectWorkspaceTabId = (typeof PROJECT_WORKSPACE_TABS)[number]['id'];

  const leaveGlobalViewForProject = (tab: ProjectWorkspaceTabId = 'status') => {
    if (isGlobalViewTab(activeTab)) {
      setActiveTab(tab);
    }
  };

  const handleSelectProject = (name: string) => {
    setActiveProject(name);
    leaveGlobalViewForProject('status');
  };

  const handleDeleteOutputVideo = async () => {

    if (!pendingOutputDelete) return;

    setDeletingOutput(true);

    try {

      const res = await fetch(getProjectUrl('/api/outputs/delete'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ filename: pendingOutputDelete.name })

      });

      if (res.ok) {

        toast.success(`Vídeo "${pendingOutputDelete.name}" excluído com sucesso!`);

        setOutputs(prev => prev.filter(v => v.name !== pendingOutputDelete.name));

        setPendingOutputDelete(null);

      } else {

        const err = await res.json();

        toast.error(err.error || 'Erro ao excluir o vídeo.');

      }

    } catch (err) {

      toast.error('Falha de conexão ao excluir.');

    } finally {

      setDeletingOutput(false);

    }

  };

  const handleUploadSceneAsset = async (sceneNum: number, type: 'video' | 'image', file: File, assetIdx?: number, projectOverride?: string) => {

    try {

      const idxParam = assetIdx !== undefined ? `&idx=${assetIdx}` : '';

      const res = await fetch(getProjectUrl(`/api/upload-scene-asset?scene=${sceneNum}&type=${type}&filename=${encodeURIComponent(file.name)}${idxParam}`), {

        method: 'POST',

        headers: { 'Content-Type': file.type || 'application/octet-stream' },

        body: file

      });

      const data = await res.json();

      if (res.ok) {

        toast.success(data.message);

        setUploadedScenes(prev => ({...prev, [`${sceneNum}:${assetIdx ?? 'new'}`]: true}));

        // Update asset in storyboard state directly to ensure binding!

        if (activeTab === 'creator' && generatedScriptData) {

          let targetSceneIndex = -1;

          let currentAssetIdx = 0;

          const nextPrompts = [...generatedScriptData.visual_prompts];

          for (let j = 0; j < nextPrompts.length; j++) {

            if ((nextPrompts[j].block || 1) === sceneNum) {

              if (currentAssetIdx === assetIdx) {

                targetSceneIndex = j;

                break;

              }

              currentAssetIdx++;

            }

          }

          if (targetSceneIndex !== -1) {

            nextPrompts[targetSceneIndex] = {

              ...nextPrompts[targetSceneIndex],

              asset: {

                asset: data.asset,

                type,

                ...(type === 'video' ? { fixed: 8.00 } : {})

              }

            };

            const nextScriptData = { ...generatedScriptData, visual_prompts: nextPrompts };

            syncCreatorStoryboard(nextScriptData);

          }

        } else if (activeTab === 'editor' && storyboardData) {

          let targetSceneIndex = -1;

          let currentAssetIdx = 0;

          const nextPrompts = [...storyboardData.visual_prompts];

          for (let j = 0; j < nextPrompts.length; j++) {

            if ((nextPrompts[j].block || 1) === sceneNum) {

              if (currentAssetIdx === assetIdx) {

                targetSceneIndex = j;

                break;

              }

              currentAssetIdx++;

            }

          }

          if (targetSceneIndex !== -1) {

            nextPrompts[targetSceneIndex] = {

              ...nextPrompts[targetSceneIndex],

              asset: {

                asset: data.asset,

                type,

                ...(type === 'video' ? { fixed: 8.00 } : {})

              }

            };

            const nextStoryboard = { ...storyboardData, visual_prompts: nextPrompts };

            setStoryboardData(nextStoryboard);

            fetch(getProjectUrl('/api/projects/storyboard'), {

              method: 'POST',

              headers: { 'Content-Type': 'application/json' },

              body: JSON.stringify(nextStoryboard)

            });

          }

        }

        if (data.asset && config && (!projectOverride || projectOverride === activeProject)) {

          const blockKey = assetIdx !== undefined ? String(sceneNum) : String(Math.floor(sceneNum));

          const nextTimelineAssets = { ...(config.timeline_assets || {}) };

          const blockAssets = [...(nextTimelineAssets[blockKey] || [])];

          const prevSlot = assetIdx !== undefined ? blockAssets[assetIdx] : undefined;
          const nextAsset = {
            ...(prevSlot || {}),
            asset: data.asset,
            type,
            user_locked: true,
            manual_asset: true,
            ...(type === 'video' ? { fixed: prevSlot?.fixed ?? 8.00 } : {}),
          };

          if (assetIdx !== undefined) {

            blockAssets[assetIdx] = nextAsset;

          } else {

            blockAssets.push(nextAsset);

          }

          nextTimelineAssets[blockKey] = blockAssets;

          setConfig({ ...config, timeline_assets: nextTimelineAssets });

        }

        fetchData();

      } else {

        toast.error('Falha ao enviar mídia: ' + (data.error || 'Erro desconhecido'));

      }

    } catch (err) {

      console.error(err);

      toast.error('Erro na conexão ao enviar mídia da cena.');

    }

  };

  const handleRemoveSceneAsset = async (blockKey: string, assetIdx: number) => {

    if (!config) return;

    const nextTimelineAssets = { ...(config.timeline_assets || {}) };

    const blockAssets = [...(nextTimelineAssets[blockKey] || [])];

    if (!blockAssets[assetIdx]) return;

    blockAssets.splice(assetIdx, 1);

    nextTimelineAssets[blockKey] = blockAssets;

    const updatedConfig = { ...config, timeline_assets: nextTimelineAssets };

    setConfig(updatedConfig);

    await saveConfig(updatedConfig);

    // Also remove from storyboard state to keep sync

    const blockNum = parseInt(blockKey);

    if (activeTab === 'creator' && generatedScriptData) {

      let targetSceneIndex = -1;

      let currentAssetIdx = 0;

      const nextPrompts = [...generatedScriptData.visual_prompts];

      for (let j = 0; j < nextPrompts.length; j++) {

        if ((nextPrompts[j].block || 1) === blockNum) {

          if (currentAssetIdx === assetIdx) {

            targetSceneIndex = j;

            break;

          }

          currentAssetIdx++;

        }

      }

      if (targetSceneIndex !== -1) {

        delete nextPrompts[targetSceneIndex].asset;

        const nextScriptData = { ...generatedScriptData, visual_prompts: nextPrompts };

        syncCreatorStoryboard(nextScriptData);

      }

    } else if (activeTab === 'editor' && storyboardData) {

      let targetSceneIndex = -1;

      let currentAssetIdx = 0;

      const nextPrompts = [...storyboardData.visual_prompts];

      for (let j = 0; j < nextPrompts.length; j++) {

        if ((nextPrompts[j].block || 1) === blockNum) {

          if (currentAssetIdx === assetIdx) {

            targetSceneIndex = j;

            break;

          }

          currentAssetIdx++;

        }

      }

      if (targetSceneIndex !== -1) {

        delete nextPrompts[targetSceneIndex].asset;

        const nextStoryboard = { ...storyboardData, visual_prompts: nextPrompts };

        setStoryboardData(nextStoryboard);

        fetch(getProjectUrl('/api/projects/storyboard'), {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify(nextStoryboard)

        });

      }

    }

    toast.success('Asset removido da cena.');

  };;

  // Save config

  const saveConfigPatch = async (
    patch: Record<string, unknown>,
    opts?: { skipRefresh?: boolean },
  ): Promise<ConfigData | null> => {
    if (Object.keys(patch).length === 0) return null;
    try {
      const res = await fetch(getProjectUrl('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stripConfigApiMetadata(patch)),
      });
      if (!res.ok) {
        toast.error('Erro ao salvar configuração.');
        return null;
      }
      const data = await res.json().catch(() => ({}));
      const serverConfig = data?.config;
      if (!opts?.skipRefresh) {
        fetchData();
      }
      if (serverConfig && typeof serverConfig === 'object' && Object.keys(serverConfig).length > 0) {
        return serverConfig as ConfigData;
      }
      return null;
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configuração.');
      return null;
    }
  };

  const preserveUploadMetadataChapters = (cfg: ConfigData): ConfigData => {
    const chapters = ytChapters.trim()
      || youtubeMetadataParsed?.chapters?.trim()
      || String(cfg.upload_metadata?.youtube?.chapters || '').trim();
    if (!chapters) return cfg;
    return {
      ...cfg,
      upload_metadata: {
        ...cfg.upload_metadata,
        youtube: {
          ...(cfg.upload_metadata?.youtube || {}),
          chapters,
        },
      },
    };
  };

  const saveTimelinePatch = async (
    cfg: ConfigData,
    opts?: { skipRefresh?: boolean },
  ): Promise<ConfigData | null> => {
    const enriched = enrichTimelineAudioStarts(cfg);
    const saved = await saveConfigPatch(
      {
        timeline_assets: enriched.timeline_assets,
        aspect_ratio: enriched.aspect_ratio,
        canvas_background: enriched.canvas_background,
      },
      opts,
    );
    if (saved) {
      setConfig((prev) => (prev ? { ...prev, ...saved } : saved));
    }
    return saved;
  };

  const saveConfig = async (
    updatedConfig: ConfigData,
    opts?: { skipRefresh?: boolean },
  ) => {
    const { timeline: sanitizedTimeline, removed: dupesRemoved } = sanitizeTimelineAssets(updatedConfig.timeline_assets);
    const baseConfig = dupesRemoved > 0
      ? { ...updatedConfig, timeline_assets: sanitizedTimeline }
      : updatedConfig;
    if (dupesRemoved > 0) {
      toast.info(`Removidos ${dupesRemoved} asset(s) repetido(s) consecutivos na timeline.`);
      setConfig(baseConfig);
    }
    const configToSave = stripConfigApiMetadata(
      preserveUploadMetadataChapters(enrichTimelineAudioStarts(baseConfig)),
    );

    try {

      const res = await fetch(getProjectUrl('/api/config'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(configToSave)

      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const serverConfig = data?.config;
        const savedConfig = (serverConfig && typeof serverConfig === 'object' && Object.keys(serverConfig).length > 0)
          ? serverConfig as ConfigData
          : configToSave;

        setConfig(savedConfig);

        if (!opts?.skipRefresh) {
          fetchData();
        }

      } else {

        toast.error("Erro ao salvar configuração.");

      }

    } catch (err) {

      console.error(err);

    }

  };

  // Debounce ref for auto-saving timeline changes

  const timelineSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateTimelineAssetField = (blockKey: string, index: number, field: string, value: any) => {

    if (!config) return;

    const timelineAssets = config.timeline_assets || {};

    const newTimelineAssets = { ...timelineAssets };

    let blockAssets = [...(newTimelineAssets[blockKey] || [])];

    if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {

      const updatedAsset = { ...blockAssets[index] };

      delete updatedAsset[field];

      blockAssets[index] = updatedAsset;

    } else {

      blockAssets[index] = {
        ...blockAssets[index],
        [field]: value,
        ...(field === 'fixed' ? { fixed_locked: true } : {}),
        ...(field === 'asset' ? { user_locked: true, manual_asset: true } : {}),
      };

    }

    if (field === 'fixed') {
      blockAssets = recalculateBlockAudioStarts(blockKey, blockAssets, index);
    }

    newTimelineAssets[blockKey] = blockAssets;

    const updatedConfig = { ...config, timeline_assets: newTimelineAssets };

    setConfig(updatedConfig);

    // Auto-save to server with debounce (800ms)

    if (timelineSaveTimer.current) {

      clearTimeout(timelineSaveTimer.current);

    }

    timelineSaveTimer.current = setTimeout(() => {

      void saveTimelinePatch(updatedConfig, { skipRefresh: true });

    }, 800);

  };

  const moveTimelineAsset = (blockKey: string, index: number, direction: 'up' | 'down') => {

    if (!config) return;

    const timelineAssets = config.timeline_assets || {};

    const newTimelineAssets = { ...timelineAssets };

    const blockAssets = [...(newTimelineAssets[blockKey] || [])];

    const targetIdx = direction === 'up' ? index - 1 : index + 1;

    if (targetIdx < 0 || targetIdx >= blockAssets.length) return;

    // Swap

    const temp = blockAssets[index];

    blockAssets[index] = blockAssets[targetIdx];

    blockAssets[targetIdx] = temp;

    const speechSynced = blockAssets.some((a: any) => a.synced_to_speech);
    newTimelineAssets[blockKey] = speechSynced
      ? blockAssets
      : recalculateBlockAudioStarts(blockKey, blockAssets);

    let nextStoryboard = storyboardData;
    if (storyboardData?.visual_prompts?.length) {
      nextStoryboard = swapBlockVisualPromptsInStoryboard(
        storyboardData,
        parseInt(blockKey, 10),
        index,
        targetIdx,
      );
      setStoryboardData(nextStoryboard);
      fetch(getProjectUrl('/api/storyboard'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextStoryboard),
      }).catch(() => {});
    }

    const updatedConfig = { ...config, timeline_assets: newTimelineAssets };
    setConfig(updatedConfig);
    void saveTimelinePatch(updatedConfig, { skipRefresh: true });

  };

  const deleteTimelineAsset = (blockKey: string, index: number) => {

    if (!config) return;

    const timelineAssets = config.timeline_assets || {};

    const newTimelineAssets = { ...timelineAssets };

    const blockAssets = (newTimelineAssets[blockKey] || []).filter((_, idx) => idx !== index);

    newTimelineAssets[blockKey] = blockAssets;

    const updatedConfig = { ...config, timeline_assets: newTimelineAssets };

    setConfig(updatedConfig);

    void saveTimelinePatch(updatedConfig, { skipRefresh: true });

    toast.success("Asset removido da linha do tempo!");

  };

  const toggleTimelineClipSelection = (blockKey: string, index: number, additive: boolean) => {
    const key = clipKey(blockKey, index);
    setTimelineSelectedClips((prev) => {
      const next = additive ? new Set(prev) : new Set<string>();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const bulkDeleteTimelineClips = () => {
    if (!config || timelineSelectedClips.size === 0) return;
    const byBlock: Record<string, number[]> = {};
    timelineSelectedClips.forEach((key) => {
      const parsed = parseClipKey(key);
      if (!parsed) return;
      if (!byBlock[parsed.blockKey]) byBlock[parsed.blockKey] = [];
      byBlock[parsed.blockKey].push(parsed.index);
    });
    const timelineAssets = { ...(config.timeline_assets || {}) };
    Object.entries(byBlock).forEach(([blockKey, indices]) => {
      const sorted = [...indices].sort((a, b) => b - a);
      const blockAssets = [...(timelineAssets[blockKey] || [])];
      sorted.forEach((idx) => blockAssets.splice(idx, 1));
      timelineAssets[blockKey] = blockAssets;
    });
    const updatedConfig = { ...config, timeline_assets: timelineAssets };
    setConfig(updatedConfig);
    void saveTimelinePatch(updatedConfig, { skipRefresh: true });
    setTimelineSelectedClips(new Set());
    toast.success(`${timelineSelectedClips.size} clip(s) removido(s)`);
  };

  const addTimelineAsset = (blockKey: string) => {

    if (!config) return;

    const timelineAssets = config.timeline_assets || {};

    const newTimelineAssets = { ...timelineAssets };

    const blockAssets = [...(newTimelineAssets[blockKey] || [])];

    blockAssets.push({

      asset: "cena_nova.png",

      type: "image"

    });

    newTimelineAssets[blockKey] = blockAssets;

    const updatedConfig = { ...config, timeline_assets: newTimelineAssets };

    setConfig(updatedConfig);

    void saveTimelinePatch(updatedConfig, { skipRefresh: true });

  };

  const handleSaveConfig = async () => {

    if (config) {

      const saved = await saveTimelinePatch(config, { skipRefresh: true });
      if (saved) {
        void fetchStatusAndOutputs();
        toast.success("Linha do tempo salva com sucesso!");
      }

    }

  };

  const resolveAssetDuration = useMemo(
    () => (config?.timeline_assets
      ? createBlockAssetDurationResolver(config.timeline_assets, status?.block_timings?.durations)
      : (_blockKey: string, _index: number) => 0),
    [config?.timeline_assets, status?.block_timings?.durations],
  );

  const getAssetDuration = (blockKey: string, index: number) => resolveAssetDuration(blockKey, index);

  const getTotalVideoDuration = () => {

    if (!config) return 0;

    const timelineAssets = config.timeline_assets || {};

    const maxBlocks = config.block_phrases ? config.block_phrases.length : (status?.block_timings?.durations?.length || 12);

    let total = 0;

    for (let blockNum = 1; blockNum <= maxBlocks; blockNum++) {

      const blockKey = String(blockNum);

      const assets = timelineAssets[blockKey] || [];

      assets.forEach((_, idx) => {

        total += getAssetDuration(blockKey, idx);

      });

    }

    return total;

  };

  const buildNarrationSyncContext = (): NarrationSyncContext => ({
    config,
    storyboard: storyboardData || undefined,
    status,
    getAssetDuration,
  });

  const getAssetNarration = (blockKey: string, assetIdx: number) => {
    return resolveAssetNarrationText(buildNarrationSyncContext(), blockKey, assetIdx);
  };

  const formatTime = (sec: number): string => {

    if (sec === undefined || isNaN(sec)) return "0:00";

    const mins = Math.floor(sec / 60);

    const secs = Math.floor(sec % 60);

    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  };

  const bgmBlockRows = useMemo(() => {

    if (!config) return [];

    const blockSet = new Set<number>();

    (config.block_phrases || []).forEach((item: any) => {

      const block = Number(item.block);

      if (Number.isFinite(block) && block > 0) blockSet.add(block);

    });

    Object.keys(config.timeline_assets || {}).forEach((key) => {

      const block = Number(key);

      if (Number.isFinite(block) && block > 0) blockSet.add(block);

    });

    (storyboardData?.bgm_recommendations || []).forEach((item: any) => {

      const block = Number(item.block);

      if (Number.isFinite(block) && block > 0) blockSet.add(block);

    });

    (storyboardData?.visual_prompts || []).forEach((item: any) => {

      const block = Number(item.block);

      if (Number.isFinite(block) && block > 0) blockSet.add(block);

    });

    (config.bgm_mappings || []).forEach((item: any) => {

      const block = Number(item.block);

      if (Number.isFinite(block) && block > 0) blockSet.add(block);

    });

    if (blockSet.size === 0) {

      const fallbackCount = status?.block_timings?.durations?.length || 12;

      for (let block = 1; block <= fallbackCount; block++) blockSet.add(block);

    }

    const mappings = config.bgm_mappings || [];

    return Array.from(blockSet)

      .sort((a, b) => a - b)

      .map((block) => ({

        block,

        file: mappings.find((mapping: any) => Number(mapping.block) === block)?.file || ""

      }));

  }, [

    config?.block_phrases,

    config?.timeline_assets,

    config?.bgm_mappings,

    storyboardData?.bgm_recommendations,

    storyboardData?.visual_prompts,

    status?.block_timings?.durations

  ]);

  const isShortVideo = config?.aspect_ratio === '9:16' || formatSelector === 'SHORTS';

  const activeBgmMode = resolveBgmMode(
    config || {},
    storyboardData || {},
    isShortVideo ? 'SHORT' : 'LONG',
  );

  const bgmEmotionRows = useMemo(() => {

    const segments = storyboardData?.bgm_emotion_plan?.segments || [];

    const mappings = config?.bgm_emotion_mappings || [];

    return segments.map((seg: any) => ({

      ...seg,

      file: mappings.find((mapping: BgmEmotionMapping) => mapping.segment_id === seg.id)?.file || '',

    }));

  }, [storyboardData?.bgm_emotion_plan?.segments, config?.bgm_emotion_mappings]);

  const isBgmMusicFileName = (name: string) => {
    const base = String(name || '').trim();
    if (!/\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(base)) return false;
    if (/^narracao_mestra_premium\.mp3$/i.test(base)) return false;
    if (/^trilha_documentario\.mp3$/i.test(base)) return false;
    if (/^\d+\.mp3$/i.test(base)) return false;
    return true;
  };

  const safeMusicFiles = useMemo(
    () => (Array.isArray(musicFiles)
      ? musicFiles.filter((f) => f && typeof f.name === 'string' && isBgmMusicFileName(f.name))
      : []),
    [musicFiles],
  );
  const safeEpidemicResults = useMemo(
    () => (Array.isArray(epidemicSearchResults) ? epidemicSearchResults : []),
    [epidemicSearchResults],
  );

  // Memoized cache for narration timestamp matching

  const narrationTextsListString = useMemo(() => {

    if (!config) return "";

    const timelineAssets = config.timeline_assets || {};

    const texts: string[] = [];

    Object.keys(timelineAssets).forEach(blockKey => {

      const assets = timelineAssets[blockKey] || [];

      assets.forEach((_, idx) => {

        texts.push(getAssetNarration(blockKey, idx));

      });

    });

    return JSON.stringify(texts);

  }, [config?.timeline_assets, config?.block_phrases, storyboardData?.visual_prompts]);

  const narrationMatchesCache = useMemo(() => {
    if (!flatTranscriptWords?.length || !config?.timeline_assets) return {};
    const ctx = buildNarrationSyncContext();
    return buildNarrationMatchesCache({
      timelineAssets: config.timeline_assets,
      flatTranscriptWords,
      status,
      getAssetText: (blockKey, idx) => resolveAssetNarrationText(ctx, blockKey, idx),
      getBlockText: (blockNum) => resolveBlockNarrationText(ctx, blockNum),
    });
  }, [flatTranscriptWords, narrationTextsListString, config, status, storyboardData?.visual_prompts]);

  const findNarrationTimestamps = (narrationText: string, blockNum?: number) => {
    if (blockNum === undefined) return null;
    return lookupNarrationTimestamps(
      narrationText,
      blockNum,
      narrationMatchesCache,
      flatTranscriptWords,
      status,
    );
  };

  const blockNarrationWordsCache = useMemo(() => {
    if (!config?.timeline_assets || !flatTranscriptWords?.length) return {};
    return buildBlockNarrationWordsCache({
      timelineAssets: config.timeline_assets,
      flatTranscriptWords,
      wordTranscripts,
      ctx: buildNarrationSyncContext(),
    });
  }, [config?.timeline_assets, config?.block_phrases, storyboardData?.visual_prompts, flatTranscriptWords, wordTranscripts, status]);

  const getDynamicAssetWords = (blockKey: string, assetIdx: number) =>
    getDynamicAssetWordsCore({
      blockKey,
      assetIdx,
      blockNarrationWordsCache,
      timelineAssets: config?.timeline_assets || {},
      getAssetDuration,
    });


  const recalculateBlockAudioStarts = (blockKey: string, assets: any[], preserveUntilIndex = -1): any[] => {
    const blockNum = parseInt(blockKey, 10);
    return recalculateBlockAudioStartsCore({
      blockKey,
      assets,
      blockDuration: status?.block_timings?.durations?.[blockNum - 1] ?? 10.0,
      ctx: buildNarrationSyncContext(),
      flatTranscriptWords,
      blockNarrationWordsCache,
      blockTimingStart: status?.block_timings?.starts?.[blockNum - 1] ?? 0,
      preserveUntilIndex,
    });
  };

  const enrichTimelineAudioStarts = (cfg: ConfigData, options?: { force?: boolean }): ConfigData =>
    enrichTimelineAudioStartsCore(cfg, (blockKey, assets) => recalculateBlockAudioStarts(blockKey, assets), options);

  const alignBlockAssetsToSpeech = (blockKey: string, cfgOverride?: ConfigData) => {
    const cfg = cfgOverride ?? config;

    if (!cfg || !cfg.timeline_assets || !cfg.timeline_assets[blockKey]) return;

    if (!wordTranscripts || wordTranscripts.length === 0) {

      toast.error("Transcrições da voz não carregadas ou indisponíveis para este projeto.");

      return;

    }

    const blockNum = Number(blockKey);
    const starts = status?.block_timings?.starts;

    if (!starts || starts[blockNum - 1] === undefined) {

      toast.error("Timings do bloco não encontrados.");

      return;

    }

    const { assets: updatedAssets, alignedCount } = alignBlockAssetsToTranscript(
      cfg.timeline_assets[blockKey],
      blockNum,
      (idx) => getAssetNarration(blockKey, idx),
      (text, bn) => findNarrationTimestamps(text, bn),
      { setSpeechEnd: true, lastAssetMode: "perSpeech" },
    );

    if (alignedCount === 0) {

      toast.error("Nenhuma cena pôde ser alinhada com a transcrição da voz.");

      return;

    }

    const newConfig = {

      ...cfg,

      timeline_assets: {

        ...cfg.timeline_assets,

        [blockKey]: updatedAssets

      }

    };

    // Recalcular audio_start sequencial para assets que nao matcharam
    const finalAssets = recalculateBlockAudioStarts(blockKey, newConfig.timeline_assets[blockKey]);
    newConfig.timeline_assets[blockKey] = finalAssets;

    saveConfig(newConfig);

    toast.success(`${alignedCount} cenas sincronizadas com o tempo da voz com sucesso!`);

  };

  const splitBlockNarrationAmongAssets = (blockKey: string) => {
    if (!config?.timeline_assets?.[blockKey]?.length) return;
    const assets = config.timeline_assets[blockKey];
    if (assets.length <= 1) {
      toast.info('Bloco com 1 asset — narração já é única.');
      return;
    }
    const ctx = buildNarrationSyncContext();
    const full = resolveBlockNarrationText(ctx, parseInt(blockKey, 10));
    if (!full.trim()) {
      toast.error('Sem texto de narração neste bloco.');
      return;
    }
    const nextAssets = applySplitNarrationToBlockAssets(ctx, blockKey);
    const updatedConfig = {
      ...config,
      timeline_assets: { ...config.timeline_assets, [blockKey]: nextAssets },
    };
    setConfig(updatedConfig);
    saveConfig(updatedConfig);
    toast.success(`Narração dividida entre ${nextAssets.length} assets do bloco ${blockKey}.`);
  };

  const distributeAllBlockNarrations = () => {
    if (!config?.timeline_assets) return;
    const ctx = buildNarrationSyncContext();
    const newTimelineAssets = { ...config.timeline_assets };
    let blockCount = 0;
    Object.keys(newTimelineAssets).forEach((blockKey) => {
      const assets = newTimelineAssets[blockKey];
      if (!assets?.length || assets.length <= 1) return;
      const full = resolveBlockNarrationText(ctx, parseInt(blockKey, 10));
      if (!full.trim()) return;
      newTimelineAssets[blockKey] = applySplitNarrationToBlockAssets(ctx, blockKey);
      blockCount += 1;
    });
    if (blockCount === 0) {
      toast.error('Nenhum bloco com múltiplos assets e texto de narração para dividir.');
      return;
    }
    const updatedConfig = { ...config, timeline_assets: newTimelineAssets };
    setConfig(updatedConfig);
    saveConfig(updatedConfig);
    toast.success(`Narração dividida em ${blockCount} bloco(s).`);
  };

  const handleRepairProjectVisualPrompts = async () => {
    if (!activeProject?.trim()) {
      toast.error('Selecione um projeto.');
      return;
    }
    setCreatorLoading(true);
    setCreatorLoadingMode('full');
    try {
      const { ok, data } = await postAi('/api/ai/creator/repair-visual-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: activeProject.trim().replace(/[^a-zA-Z0-9_-]/g, '_') }),
      });
      if (ok && !data.needs_browser) {
        setStoryboardData(data);
        await saveCreatorStoryboard(data);
        if (data.technical_config?.block_phrases && config) {
          const patched = {
            ...config,
            block_phrases: data.technical_config.block_phrases,
            impact_texts: data.technical_config.impact_texts || config.impact_texts,
            highlight_keywords: data.technical_config.highlight_keywords || config.highlight_keywords,
          };
          setConfig(patched);
          await saveConfig(patched);
        }
        fetchData();
        toast.success(`Cenas reparadas — ${data.visual_prompts?.length || 0} com narração e prompt.`);
      } else {
        toast.error(data.error || data.details || 'Erro ao reparar cenas.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao reparar cenas.');
    } finally {
      setCreatorLoading(false);
      setCreatorLoadingMode('idle');
    }
  };

  const timelineNeedsWhisperSync = Boolean(
    status?.has_narration && (!wordTranscripts?.length || !status?.block_timings?.starts?.length),
  );

  const timelineScenesNeedRepair = useMemo(() => {
    const vps = storyboardData?.visual_prompts || [];
    if (!vps.length) return Boolean(storyboardData?.narrative_script?.trim());
    return vps.some((vp: any) => !String(vp?.narration_text || vp?.narration_excerpt || '').trim());
  }, [storyboardData?.visual_prompts, storyboardData?.narrative_script]);

  const alignAllBlocksToSpeech = () => {

    if (!config || !config.timeline_assets) return;

    if (!wordTranscripts || wordTranscripts.length === 0) {

      toast.error("Transcrições da voz não carregadas ou indisponíveis para este projeto.");

      return;

    }

    const maxBlocks = config.block_phrases ? config.block_phrases.length : (status?.block_timings?.durations?.length || 12);

    const newTimelineAssets = { ...config.timeline_assets };

    let totalAligned = 0;

    for (let blockNum = 1; blockNum <= maxBlocks; blockNum++) {

      const blockKey = String(blockNum);

      if (!newTimelineAssets[blockKey]) continue;

      const starts = status?.block_timings?.starts;
      if (!starts || starts[blockNum - 1] === undefined) continue;

      const blockDuration = status?.block_timings?.durations?.[blockNum - 1] || 10.0;
      const blockEnd = starts[blockNum - 1] + blockDuration;

      const { assets: updatedAssets, alignedCount } = alignBlockAssetsToTranscript(
        newTimelineAssets[blockKey],
        blockNum,
        (idx) => getAssetNarration(blockKey, idx),
        (text, bn) => findNarrationTimestamps(text, bn),
        { blockEnd, lastAssetMode: "toBlockEnd" },
      );

      totalAligned += alignedCount;
      newTimelineAssets[blockKey] = updatedAssets;

    }

    if (totalAligned === 0) {

      toast.error("Nenhuma cena pôde ser alinhada com a transcrição da voz.");

      return;

    }

    const newConfig = {

      ...config,

      timeline_assets: newTimelineAssets

    };

    saveConfig(newConfig);

    toast.success(`✅ ${totalAligned} cenas de TODOS os blocos sincronizadas com a voz!`);
  };

  const getNarrationAudio = (blockNum?: number) => {
    const fileName = blockNum ? `${blockNum}.mp3` : "narracao_mestra_premium.mp3";
    const url = getMusicUrl(fileName);

    if (!narrationAudioRef.current) {
      const audio = new Audio(url);
      
      audio.ontimeupdate = () => {
        const state = activeNarrationStateRef.current;
        if (state) {
          if (state.startTimeRelative !== undefined && state.startTimeAbsolute !== undefined) {
            const elapsed = audio.currentTime - state.startTimeRelative;
            const absoluteTime = state.startTimeAbsolute + elapsed;
            setNarrationTime(absoluteTime);

            const targetEndTime = state.endTimeRelative !== undefined ? state.endTimeRelative : state.endTime;
            if (audio.currentTime >= targetEndTime - 0.05) {
              audio.pause();
              setPlayingNarration(null);
              activeNarrationStateRef.current = null;
            }
          } else {
            setNarrationTime(audio.currentTime);
            if (audio.currentTime >= state.endTime - 0.05) {
              audio.pause();
              setPlayingNarration(null);
              activeNarrationStateRef.current = null;
            }
          }
        } else {
          setNarrationTime(audio.currentTime);
        }
      };

      audio.onended = () => {
        setPlayingNarration(null);
        activeNarrationStateRef.current = null;
      };

      audio.onerror = () => {
        const state = activeNarrationStateRef.current;
        const currentSrc = audio.src;
        if (currentSrc && !currentSrc.includes("narracao_mestra_premium.mp3") && state) {
          console.warn("Audio segment not found, falling back to master narration");
          const masterUrl = getMusicUrl("narracao_mestra_premium.mp3");
          audio.pause();
          audio.src = masterUrl;
          audio.load();

          // Switch state to absolute mode by clearing relative markers
          state.startTimeRelative = undefined;
          state.endTimeRelative = undefined;

          const startAbs = state.startTimeAbsolute || 0;
          audio.oncanplay = () => {
            audio.currentTime = startAbs;
            audio.play().catch(err => {
              console.error("Fallback play failed:", err);
              setPlayingNarration(null);
              activeNarrationStateRef.current = null;
            });
            audio.oncanplay = null;
          };
        }
      };

      narrationAudioRef.current = audio;
    } else {
      const audio = narrationAudioRef.current;
      const fullUrl = new URL(url, window.location.href).href;
      if (audio.src !== fullUrl) {
        audio.pause();
        audio.src = url;
        audio.load();
      }
    }
    return narrationAudioRef.current;
  };

  const togglePlaySceneNarration = (blockKey: string, sceneIdx: number) => {
    if (playingMusic) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingMusic(null);
    }

    const blockNum = Number(blockKey);
    const targetStr = `scene-${blockKey}-${sceneIdx}`;

    if (playingNarration === targetStr) {
      const audio = narrationAudioRef.current;
      audio?.pause();
      setPlayingNarration(null);
      activeNarrationStateRef.current = null;
      return;
    }

    const dynamic = getDynamicAssetWords(blockKey, sceneIdx);
    const blockAssets = config?.timeline_assets?.[blockKey] || [];
    const isLastAssetInBlock = sceneIdx === blockAssets.length - 1;
    const duration = getAssetDuration(blockKey, sceneIdx);
    const starts = status?.block_timings?.starts;
    const blockStart = starts?.[blockNum - 1];
    const narrationText = getAssetNarration(blockKey, sceneIdx);
    const matched = findNarrationTimestamps(narrationText, blockNum);

    let startTimeRelative = 0;
    for (let i = 0; i < sceneIdx; i++) {
      startTimeRelative += getAssetDuration(blockKey, i);
    }

    let startTimeAbsolute = startTimeRelative;
    let endTimeAbsolute = startTimeRelative + duration;
    if (blockStart !== undefined) {
      startTimeAbsolute = blockStart + startTimeRelative;
      endTimeAbsolute = startTimeAbsolute + duration;
    } else if (matched) {
      startTimeAbsolute = matched.start;
      endTimeAbsolute = matched.start + (matched.duration || duration);
    }

    if (dynamic) {
      startTimeAbsolute = dynamic.assetAudioStart;
      const lastWord = dynamic.words[dynamic.words.length - 1];
      endTimeAbsolute = lastWord
        ? lastWord.end + 0.3
        : dynamic.assetAudioEnd;
      if (isLastAssetInBlock) {
        endTimeAbsolute = Math.max(endTimeAbsolute, dynamic.blockAudioEnd + 0.3);
      }
      endTimeAbsolute = Math.max(endTimeAbsolute, startTimeAbsolute + 0.35);
    } else if (matched?.end) {
      endTimeAbsolute = Math.max(endTimeAbsolute, matched.end + 0.2);
    }

    const useMasterTimeline = Boolean(
      status?.has_narration && blockStart !== undefined && Number.isFinite(blockStart),
    );
    const audio = getNarrationAudio(useMasterTimeline ? undefined : blockNum);
    audio.pause();

    const beginPlayback = () => {
      if (useMasterTimeline) {
        activeNarrationStateRef.current = {
          target: targetStr,
          startTimeAbsolute,
          endTime: endTimeAbsolute,
        };
        audio.currentTime = startTimeAbsolute;
      } else {
        const relStart = Number.isFinite(blockStart)
          ? Math.max(0, startTimeAbsolute - Number(blockStart))
          : startTimeRelative;
        const relEnd = Number.isFinite(blockStart)
          ? Math.max(relStart + 0.35, endTimeAbsolute - Number(blockStart))
          : relStart + duration;
        activeNarrationStateRef.current = {
          target: targetStr,
          startTimeRelative: relStart,
          startTimeAbsolute,
          endTimeRelative: relEnd,
          endTime: endTimeAbsolute,
        };
        audio.currentTime = relStart;
      }

      setPlayingNarration(targetStr);
      audio.play().catch((err) => {
        console.error("Failed to play scene narration:", err);
        if (!audio.src.includes("narracao_mestra_premium.mp3")) {
          console.warn("Play failed for segment. Forcing fallback to master narration.");
          const masterUrl = getMusicUrl("narracao_mestra_premium.mp3");
          audio.pause();
          audio.src = masterUrl;
          audio.load();
          activeNarrationStateRef.current = {
            target: targetStr,
            startTimeAbsolute,
            endTime: endTimeAbsolute,
          };
          audio.oncanplay = () => {
            audio.currentTime = startTimeAbsolute;
            audio.play().catch((e) => {
              console.error("Fallback play trigger failed:", e);
              setPlayingNarration(null);
              activeNarrationStateRef.current = null;
            });
            audio.oncanplay = null;
          };
        } else {
          setPlayingNarration(null);
          activeNarrationStateRef.current = null;
        }
      });
    };

    if (useMasterTimeline) {
      const masterUrl = getMusicUrl("narracao_mestra_premium.mp3");
      if (!audio.src.includes("narracao_mestra_premium.mp3")) {
        audio.src = masterUrl;
        audio.load();
        audio.oncanplay = () => {
          beginPlayback();
          audio.oncanplay = null;
        };
        return;
      }
    }

    beginPlayback();
  };

  const getAssetUrl = (fileName: string) => {

    return `/api/projects-media/${encodeURIComponent(activeProject)}/ASSETS/${encodeURIComponent(fileName)}`;

  };

  const getMusicUrl = useCallback((fileName: string, projectOverride?: string) => {
    const projKey = (projectOverride || activeProject).replace(/ /g, "_");
    return `/api/projects-media/${encodeURIComponent(projKey)}/${encodeURIComponent(fileName)}`;
  }, [activeProject]);

  const togglePlayMusic = (fileName: string) => {

    if (playingNarration) {

      const audio = getNarrationAudio();

      audio.pause();

      setPlayingNarration(null);

      activeNarrationStateRef.current = null;

    }

    if (playingMusic === fileName) {

      if (audioPlayerRef.current) {

        audioPlayerRef.current.pause();

      }

      setPlayingMusic(null);

    } else {

      if (audioPlayerRef.current) {

        audioPlayerRef.current.pause();

      }

      const url = fileName.startsWith("http") ? fileName : getMusicUrl(fileName);

      const audio = new Audio(url);

      audio.onended = () => setPlayingMusic(null);

      audioPlayerRef.current = audio;

      audio.play().catch(err => {

        console.error("Failed to play audio:", err);

        toast.error("Erro ao reproduzir áudio.");

      });

      setPlayingMusic(fileName);

    }

  };

  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (narrationAudioRef.current) {
      narrationAudioRef.current.pause();
      narrationAudioRef.current = null;
    }
    setPlayingMusic(null);
    setPlayingNarration(null);
    activeNarrationStateRef.current = null;
  }, [activeProject, activeTab]);

  // Save API Key

  const handleSaveApiKey = async () => {

    if (!apiKeyInput.trim()) return;

    try {

      const res = await fetch(getProjectUrl('/api/ai/save-key'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ key: apiKeyInput.trim() })

      });

      if (res.ok) {

        setHasApiKey(true);

        setApiKeyInput('');

        setShowKeyInput(false);

        toast.success('Chave de API do Google AI Studio salva com sucesso!');

        fetchData();

      } else {

        toast.error('Erro ao salvar a chave de API.');

      }

    } catch (err) {

      console.error(err);

    }

  };

    const handleSearchEpidemic = async () => {

    if (!epidemicSearchQuery.trim()) {

      toast.error('Digite um termo para pesquisar.');

      return;

    }

    setSearchingEpidemic(true);

    try {

      const res = await fetch(getProjectUrl(`/api/epidemic/search?query=${encodeURIComponent(epidemicSearchQuery)}&type=${epidemicSearchType}`));

      const data = await res.json();

      if (res.ok) {

        setEpidemicSearchResults(Array.isArray(data) ? data : []);

        if (data.length === 0) {

          toast(`Nenhum item encontrado no Epidemic Sound (${epidemicSearchType.toUpperCase()}).`);

        } else {

          toast.success(`${data.length} itens encontrados (${epidemicSearchType.toUpperCase()})!`);

        }

      } else {

        toast.error(data.error || 'Erro ao pesquisar.');

      }

    } catch (err) {

      toast.error('Falha de conexão ao pesquisar.');

    } finally {

      setSearchingEpidemic(false);

    }

  };

  const handleDownloadEpidemic = async (track: any, blockNumber?: number) => {

    setDownloadingEpidemicId(track.id);

    try {

      const res = await fetch(getProjectUrl('/api/epidemic/download'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          id: track.id,

          type: epidemicSearchType,

          title: track.title,

          block: blockNumber,

          previewUrl: track.previewUrl

        })

      });

      const data = await res.json();

      if (res.ok) {

        toast.success(data.message || 'Arquivo baixado com sucesso!');

        fetchData(); // Refresh local list and BGM config

      } else {

        toast.error(data.error || 'Erro ao baixar.');

      }

    } catch (err) {

      toast.error('Falha de conexão ao baixar.');

    } finally {

      setDownloadingEpidemicId(null);

    }

  };

  const handleAutoSoundtrack = async () => {

    setAutoSoundtracking(true);

    try {

      const res = await fetch(getProjectUrl('/api/epidemic/auto-soundtrack'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          mode: formatSelector,

          force: true,

        })

      });

      const data = await res.json();

      if (res.ok) {

        const logs = Array.isArray(data.logs) ? data.logs : [];
        const highlights = logs.filter((line: string) =>
          /Baixando|Sucesso|Mapeada|Sonoplastia concluída|segmento\(s\) com trilha/i.test(String(line)),
        );
        const summary = highlights.length > 0
          ? highlights.slice(-2).map((line: string) => String(line).replace(/^\[[^\]]+\]\s*/, '')).join(' · ')
          : 'Trilhas atualizadas.';
        toast.success(`Sonoplastia concluída — ${summary}`, { duration: 7000 });

        fetchData();

      } else {

        toast.error((data.error && data.details) ? `${data.error}: ${data.details}` : (data.error || 'Erro na trilha sonora automática.'));

      }

    } catch (err) {

      toast.error('Falha de conexão ao processar sonoplastia automática.');

    } finally {

      setAutoSoundtracking(false);

    }

  };

  const fetchWorkflowKeysStatus = async () => {
    try {
      const res = await fetch('/api/settings/global-api-keys');
      if (res.ok) {
        const data = await res.json();
        setHasPexelsKey(!!data.has_pexels_key);
        setHasPixabayKey(!!data.has_pixabay_key);
        setHasEpidemicKey(!!data.has_epidemic_key);
        setHasSupermemoryKey(!!data.has_supermemory_key);
        setSupermemoryEnabled(data.supermemory_enabled !== false);
        if (data.supermemory_base_url) {
          setSupermemoryBaseUrlInput(data.supermemory_base_url);
        }
      }
    } catch { /* ignore */ }
  };

  const handleTestSupermemory = async () => {
    setTestingSupermemory(true);
    try {
      if (supermemoryKeyInput.trim()) {
        await fetch('/api/settings/global-api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supermemory_api_key: supermemoryKeyInput.trim(),
            supermemory_base_url: supermemoryBaseUrlInput.trim() || undefined,
            supermemory_enabled: supermemoryEnabled,
          }),
        });
      }
      const res = await fetch('/api/supermemory/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no teste');
      toast.success('Supermemory conectado — memória entre sessões pronta.');
      setHasSupermemoryKey(true);
      setSupermemoryKeyInput('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao testar Supermemory');
    } finally {
      setTestingSupermemory(false);
    }
  };

  const handleSaveApiKeys = async () => {
    const hasInput = epidemicKeyInput.trim()
      || pexelsKeyInput.trim()
      || pixabayKeyInput.trim()
      || supermemoryKeyInput.trim()
      || supermemoryBaseUrlInput.trim();
    if (!hasInput && !hasSupermemoryKey && !hasEpidemicKey && !hasPexelsKey && !hasPixabayKey) {
      toast.error('Digite pelo menos uma chave para salvar.');
      return;
    }
    setSavingApiKeys(true);
    try {
      const res = await fetch('/api/settings/global-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epidemic_sound_key: epidemicKeyInput.trim() || undefined,
          pexels_api_key: pexelsKeyInput.trim() || undefined,
          pixabay_api_key: pixabayKeyInput.trim() || undefined,
          supermemory_api_key: supermemoryKeyInput.trim() || undefined,
          supermemory_base_url: supermemoryBaseUrlInput.trim() || undefined,
          supermemory_enabled: supermemoryEnabled,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Falha ao salvar chaves de API'));
      const data = await res.json();
      setHasEpidemicKey(!!data.has_epidemic_key);
      setHasPexelsKey(!!data.has_pexels_key);
      setHasPixabayKey(!!data.has_pixabay_key);
      setHasSupermemoryKey(!!data.has_supermemory_key);
      setSupermemoryEnabled(data.supermemory_enabled !== false);
      setEpidemicKeyInput('');
      setPexelsKeyInput('');
      setPixabayKeyInput('');
      setSupermemoryKeyInput('');
      toast.success('Chaves de API salvas globalmente.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar chaves');
    } finally {
      setSavingApiKeys(false);
    }
  };

    const handleSaveAiSettings = async () => {

    setSavingAiSettings(true);

    try {

      const res = await fetch(getProjectUrl('/api/ai/settings'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          provider: aiProvider,

          gemini_model: geminiModel,

          gemini_keys: geminiKeysInput,

          xai_key: xaiKeyInput,

          openrouter_key: openrouterKeyInput,
          nvidia_key: nvidiaKeyInput,

          gemini_browser_mode: geminiBrowserMode,
})

      });

      const data = await res.json();

      if (res.ok) {

        setGeminiKeyCount(data.gemini_key_count || 0);

        if (data.gemini_model) setGeminiModel(data.gemini_model);

        if (Array.isArray(data.gemini_model_options) && data.gemini_model_options.length > 0) {
          setGeminiModelOptions(data.gemini_model_options);
        }

        setHasXaiKey(!!data.has_xai_key);

        setHasOpenRouterKey(!!data.has_openrouter_key);
        setHasNvidiaKey(!!data.has_nvidia_key);

        setHasEpidemicKey(!!data.has_epidemic_key);

        setGeminiBrowserMode(!!data.gemini_browser_mode);

        setHasApiKey(
          !!data.gemini_browser_mode
          || (data.gemini_key_count || 0) > 0
          || !!data.has_xai_key
          || data.provider === 'openrouter'
          || !!data.has_openrouter_key
          || data.provider === 'nvidia'
          || !!data.has_nvidia_key,
        );

        setGeminiKeysInput('');

        setXaiKeyInput('');

        setOpenRouterKeyInput('');
        setNvidiaKeyInput('');

        setEpidemicKeyInput('');

        toast.success('Configurações de IA salvas com sucesso!');

      } else {

        const detail = data.details ? ` (${data.details})` : '';
        toast.error((data.error || 'Erro ao salvar configurações.') + detail);

      }

    } catch (err) {

      toast.error(err instanceof Error ? err.message : 'Falha de conexão ao salvar configurações.');

    } finally {

      setSavingAiSettings(false);

    }

  };

  // Parse and execute lumiera-action blocks from AI responses

  const executeAgentActions = async (text: string) => {

    const actionMatch = text.match(/```lumiera-action\s*\n([\s\S]*?)\n```/);

    if (!actionMatch) return;

    try {

      const parsed = JSON.parse(actionMatch[1]);

      if (!parsed.actions || !Array.isArray(parsed.actions)) return;

      // Execute on backend

      const { ok, data } = await postAi('/api/ai/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: parsed.actions }),
      });

      if (ok && !data.needs_browser) {

        // Handle frontend-only actions

        for (const action of parsed.actions) {

          if (action.type === 'navigate_tab' && action.tab) {

            setActiveTab(action.tab as any);

          }

          if (action.type === 'trigger_render') {

            setActiveTab('terminal');

            triggerRender(action.render_type || 'standard');

          }

          if (action.type === 'trigger_mix') {

            mixBGM();

          }

          if (action.type === 'update_config') {

            fetchData(); // Refresh config from server

          }

          if (
            action.type === 'trigger_sync' ||
            action.type === 'trigger_auto_map' ||
            action.type === 'trigger_stock_fetch' ||
            action.type === 'trigger_tts' ||
            action.type === 'trigger_publish_prep' ||
            action.type === 'trigger_apply_bgm' ||
            action.type === 'run_pipeline_step'
          ) {
            fetchData();
            if (action.type === 'trigger_tts') setUploadSuccess(true);
            if (action.type === 'trigger_publish_prep') {
              fetchYoutubeMetadataCache();
              fetchYoutubeThumbnailImages();
            }
          }

        }

      }

    } catch (e) {

      console.error('Failed to parse/execute agent actions:', e);

    }

  };

  // Send Chat message

  const handleSendChatMessage = async (textToSend?: string) => {

    const text = textToSend || chatInput;

    if (!text.trim() || chatLoading) return;

    if (!textToSend) setChatInput('');

    if (!chatOpen) setChatOpen(true);

    const updatedMessages = [...chatMessages, { role: 'user' as const, content: text.trim() }];

    setChatMessages(updatedMessages);

    setChatLoading(true);

    try {

      const { ok, data } = await postAi('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (ok && data.text) {

        const aiText = data.text;

        const displayText = aiText.replace(/```lumiera-action[\s\S]*?```/g, '').trim();

        setChatMessages(prev => [...prev, { role: 'assistant', content: displayText || aiText }]);

        executeAgentActions(aiText);

      } else if (ok) {

        setChatMessages(prev => [...prev, { role: 'assistant', content: '[Erro] Resposta vazia do Gemini.' }]);

      } else {

        setChatMessages(prev => [...prev, { role: 'assistant', content: `[Erro] ${data.error || 'Falha ao obter resposta da IA.'}` }]);

      }

    } catch (err) {

      const msg = err instanceof Error && err.message.includes('cancelado')
        ? '[Cancelado] Gemini no navegador.'
        : '[Erro] Conexão com o servidor falhou.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: msg }]);

    } finally {

      setChatLoading(false);

    }

  };

  // Generate YouTube Metadata

  const generateYoutubeMetadata = async (options?: { silent?: boolean; keepExistingOnError?: boolean }) => {
    if (youtubeLoading) return false;

    setYoutubeLoading(true);
    if (!options?.keepExistingOnError) {
      setYoutubeMetadata('');
      setYoutubeMetadataFormat('');
      setYoutubeMetadataParsed(null);
      setYoutubeMetadataStrategy(null);
    }

    try {
      const useGeminiChrome = geminiBrowserMode;
      const { ok, data } = await postAi('/api/ai/optimize-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ require_browser: useGeminiChrome }),
      });

      if (ok && !data.needs_browser && data.text) {
        const provider = (data as { provider?: string }).provider;
        const parsedMeta = data.parsed as {
          description?: string;
          tags?: string;
          hashtags?: string;
          pinnedComment?: string;
          titles?: { text: string }[];
        } | null;
        const hasCompleteSections = (parsedMeta?.description?.length ?? 0) >= 50
          && ((parsedMeta?.tags?.length ?? 0) >= 8 || (parsedMeta?.hashtags?.length ?? 0) >= 3);
        const hasPartialMetadata = /Variante\s+[ABC]/i.test(data.text)
          && (
            ((parsedMeta?.titles?.length ?? 0) >= 1 && (parsedMeta?.description?.length ?? 0) >= 40)
            || ((parsedMeta?.description?.length ?? 0) >= 40 && data.text.length >= 600)
            || (data.text.length >= 700 && /T[íi]tulo\s+pareado/i.test(data.text))
          );
        const hasRealMetadata = hasCompleteSections || hasPartialMetadata
          || (!useGeminiChrome && (
            /\d+\.\s+.{12,}/m.test(data.text)
            || /Variante\s+[ABC]\s*[—–\-]/i.test(data.text)
            || ((parsedMeta?.titles?.length ?? 0) >= 1 && !/máx 5 palavras/i.test(data.text))
          ));
        if (/LUMIERA_TASK:|PRIORIDADE ABSOLUTA|--- INÍCIO DO ROTEIRO ---/i.test(data.text)) {
          const errMsg = 'Capturou o prompt em vez da resposta do Gemini. Tente de novo.';
          if (!options?.keepExistingOnError) setYoutubeMetadata(`[Erro] ${errMsg}`);
          if (!options?.silent) toast.error(errMsg);
          return false;
        }
        if (useGeminiChrome && ((data as { fallback?: boolean }).fallback || !hasRealMetadata)) {
          const errMsg = 'Gemini no Chrome não concluiu — resposta genérica ou incompleta ignorada. Tente de novo.';
          if (!options?.keepExistingOnError) {
            setYoutubeMetadata(`[Erro] ${errMsg}`);
          }
          if (!options?.silent) toast.error(errMsg);
          return false;
        }
        if (useGeminiChrome && provider && provider !== 'gemini_browser') {
          const errMsg = 'Metadados não vieram do Gemini no Chrome. Tente de novo.';
          if (!options?.keepExistingOnError) setYoutubeMetadata(`[Erro] ${errMsg}`);
          if (!options?.silent) toast.error(errMsg);
          return false;
        }

        setYoutubeMetadata(data.text);
        setYoutubeMetadataFormat(data.format === 'SHORT' ? 'SHORT' : data.format === 'LONG' ? 'LONG' : '');
        setYoutubeMetadataParsed(data.parsed || null);
        setYoutubeMetadataStrategy({
          profileLabel: data.profile?.label,
          rpm: data.rpm,
          palette: data.palette,
        });
        fetchYoutubeThumbnailImages();

        if (data.warning) toast(data.warning);
        if (!options?.silent) toast.success('Metadados do vídeo gerados pela IA.');
        return true;
      }

      const details = data.details ? `\n\n${data.details}` : '';
      const stale = (data as { staleResponse?: boolean }).staleResponse;
      const errMsg = data.error
        || (stale
          ? 'Gemini ainda está gerando metadados — aguarde na aba gemini.google.com e tente de novo.'
          : useGeminiChrome
            ? 'Gemini no Chrome não respondeu. Deixe gemini.google.com aberto e tente de novo.'
            : 'Falha ao gerar metadados do YouTube.');
      if (!options?.keepExistingOnError) {
        setYoutubeMetadata(`[Erro] ${errMsg}${details}`);
      }
      if (!options?.silent) toast.error(errMsg);
      return false;
    } catch {
      if (!options?.keepExistingOnError) {
        setYoutubeMetadata('[Erro] Falha na conexão com o servidor.');
      }
      if (!options?.silent) toast.error('Falha na conexão ao gerar metadados.');
      return false;
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleGenerateYoutubeMetadata = () => { void generateYoutubeMetadata(); };

  const fetchYoutubeThumbnailImages = async () => {
    try {
      const res = await fetch(getProjectUrl('/api/ai/youtube-thumbnails'));
      if (res.ok) {
        const data = await res.json();
        setYoutubeThumbnailsGenerated(data.thumbnails || []);
      }
    } catch {
      setYoutubeThumbnailsGenerated([]);
    }
  };

  const fetchTitleExperiment = async () => {
    try {
      const res = await fetch(getProjectUrl('/api/youtube/title-experiment'));
      if (res.ok) {
        const data = await res.json();
        setTitleExperiment(data.experiment || null);
        if (data.videoId) setTitleExperimentVideoId(data.videoId);
      }
    } catch {
      setTitleExperiment(null);
    }
  };

  const fetchTitleExperimentAnalytics = async () => {
    setTitleExperimentLoading(true);
    try {
      const res = await fetch(getProjectUrl('/api/youtube/title-experiment/analytics'));
      if (res.ok) {
        const data = await res.json();
        setTitleExperiment(data.experiment || null);
        setTitleExperimentAnalytics(data.analytics || null);
        setTitleExperimentRankings(data.rankings || []);
        setTitleExperimentWinner(data.winner || null);
        if (data.experiment?.videoId) setTitleExperimentVideoId(data.experiment.videoId);
      } else {
        const err = await res.json();
        toast(err.hint || err.details || err.error || 'Falha ao buscar analytics.');
        if (err.needsReauth) fetchUploadStatus();
      }
      const retRes = await fetch(getProjectUrl('/api/youtube/title-experiment/retention'));
      if (retRes.ok) setTitleRetention(await retRes.json());
      const thumbRes = await fetch(getProjectUrl('/api/youtube/thumbnail-experiment/analytics'));
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        setThumbnailExperiment(thumbData.experiment || null);
      }
    } catch {
      toast('Erro de conexão ao buscar analytics do YouTube.');
    } finally {
      setTitleExperimentLoading(false);
    }
  };

  const loadYoutubeMetadataFromCache = async () => {
    try {
      const res = await fetch(getProjectUrl('/api/ai/youtube-metadata-cache'));
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.cached) return null;
      if (data.text && /LUMIERA_TASK:|PRIORIDADE ABSOLUTA|--- INÍCIO DO ROTEIRO ---/i.test(data.text)) return null;
      if (data.text) setYoutubeMetadata(normalizeYoutubeMetadataDisplay(data.text));
      const fmt: 'SHORT' | 'LONG' | '' = data.format === 'SHORT' ? 'SHORT' : data.format === 'LONG' ? 'LONG' : '';
      setYoutubeMetadataFormat(fmt);
      setYoutubeMetadataParsed(data.parsed || null);
      const cachedChapters = String(data.parsed?.chapters || '').trim();
      if (cachedChapters) {
        setYtChapters((prev) => prev.trim() || cachedChapters);
      }
      setYoutubeMetadataStrategy({
        profileLabel: data.profile?.label,
        rpm: data.rpm,
        palette: data.palette,
      });
      return { parsed: data.parsed || null, format: fmt };
    } catch {
      return null;
    }
  };

  const fetchYoutubeMetadataCache = async () => {
    await loadYoutubeMetadataFromCache();
  };

  type UploadMetadataPayload = {
    youtube: Record<string, unknown>;
    instagram: { title: string };
    tiktok: { title: string };
    kwai: { title: string };
  };

  const buildUploadMetadataPayload = (overrides?: Partial<UploadMetadataPayload>): UploadMetadataPayload => {
    const prev = config?.upload_metadata || {};
    const prevYt = (prev.youtube && typeof prev.youtube === 'object') ? prev.youtube : {};
    const prevIg = (prev.instagram && typeof prev.instagram === 'object') ? prev.instagram : {};
    const prevTt = (prev.tiktok && typeof prev.tiktok === 'object') ? prev.tiktok : {};
    const prevKw = (prev.kwai && typeof prev.kwai === 'object') ? prev.kwai : {};
    const ytOverride = overrides?.youtube || {};

    return {
      youtube: {
        ...prevYt,
        ...ytOverride,
        title: String(ytOverride.title ?? ytTitle).trim(),
        description: String(ytOverride.description ?? ytDescription).trim(),
        privacy: (ytOverride.privacy as string | undefined) ?? ytPrivacy,
        tags: String(ytOverride.tags ?? ytTags).trim(),
        chapters: String(ytOverride.chapters ?? ytChapters).trim(),
        pinned_comment: String(ytOverride.pinned_comment ?? ytPinnedComment).trim(),
        category_id: String(ytOverride.category_id ?? ytCategoryId).trim() || '27',
        publish_at: (ytOverride.publish_at as string | undefined) ?? (ytPublishAt.trim() || undefined),
        thumbnail: (ytOverride.thumbnail as string | undefined) ?? (ytThumbnailPath || undefined),
        thumbnail_variant: (ytOverride.thumbnail_variant as string | undefined) ?? (ytThumbnailVariant || undefined),
      },
      instagram: {
        ...prevIg,
        title: String(overrides?.instagram?.title ?? igCaption).trim(),
      },
      tiktok: {
        ...prevTt,
        title: String(overrides?.tiktok?.title ?? ttCaption).trim(),
      },
      kwai: {
        ...prevKw,
        title: String(overrides?.kwai?.title ?? kwCaption).trim(),
      },
    };
  };

  const applyMetadataToUpload = async (opts?: { silent?: boolean }): Promise<{ ok: true; payload: UploadMetadataPayload } | { ok: false }> => {
    let parsed = youtubeMetadataParsed;
    let format = youtubeMetadataFormat;

    const hasParsedContent = Boolean(
      parsed?.description
      || parsed?.titles?.length
      || parsed?.tags
      || parsed?.pinnedComment,
    );
    if (!hasParsedContent) {
      const cached = await loadYoutubeMetadataFromCache();
      if (cached?.parsed) {
        parsed = cached.parsed;
        format = cached.format || format;
      }
    }

    if (!parsed || (!parsed.description && !parsed.titles?.length)) {
      if (!opts?.silent) {
        toast.error('Gere os metadados na aba IA · Metadados primeiro.');
        setActiveTab('ai');
      }
      return { ok: false };
    }

    try {
      const adaptRes = await fetch(getProjectUrl('/api/ai/adapt-platform-metadata'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed, format: format || 'LONG' }),
      });
      const adapted = adaptRes.ok ? (await adaptRes.json()).adapted : null;
      const yt = adapted?.youtube || {};
      const title = (yt.title || parsed.recommendedTitle || parsed.titles?.[0]?.text || '').slice(0, 100);
      const description = yt.description || parsed.description || '';
      const tags = Array.isArray(yt.tags) ? yt.tags.join(', ') : (parsed.tags || '');
      const chapters = yt.chapters || parsed.chapters || '';
      const pinnedComment = yt.pinned_comment || parsed.pinnedComment || '';
      const categoryId = yt.category_id || (format === 'SHORT' ? '22' : '27');
      const igTitle = adapted?.instagram?.title || '';
      const ttTitle = adapted?.tiktok?.title || '';
      const kwTitle = adapted?.kwai?.title || '';

      const thumb = youtubeThumbnailsGenerated.find((t) => t.id === 'A') || youtubeThumbnailsGenerated[0];
      const thumbnailPath = thumb?.fileName ? `ASSETS/${thumb.fileName}` : ytThumbnailPath;
      const thumbnailVariant = thumb?.id || ytThumbnailVariant;

      setYtTitle(title);
      setYtDescription(description);
      setYtTags(tags);
      setYtChapters(chapters);
      setYtPinnedComment(pinnedComment);
      setYtCategoryId(categoryId);
      if (igTitle) setIgCaption(igTitle);
      if (ttTitle) setTtCaption(ttTitle);
      if (kwTitle) setKwCaption(kwTitle);
      if (thumbnailPath) setYtThumbnailPath(thumbnailPath);
      if (thumbnailVariant) setYtThumbnailVariant(thumbnailVariant);

      const payload = buildUploadMetadataPayload({
        youtube: {
          title,
          description,
          tags,
          chapters,
          pinned_comment: pinnedComment,
          category_id: categoryId,
          thumbnail: thumbnailPath || undefined,
          thumbnail_variant: thumbnailVariant || undefined,
        },
        instagram: igTitle ? { title: igTitle } : undefined,
        tiktok: ttTitle ? { title: ttTitle } : undefined,
        kwai: kwTitle ? { title: kwTitle } : undefined,
      });

      if (!opts?.silent) {
        toast.success('Campos preenchidos com os metadados da aba IA · Metadados.');
      }
      return { ok: true, payload };
    } catch {
      if (!opts?.silent) toast.error('Erro ao aplicar metadados ao upload.');
      return { ok: false };
    }
  };

  const saveUploadMetadataToProject = async (payload?: UploadMetadataPayload) => {
    try {
      const res = await fetch(getProjectUrl('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_metadata: payload ?? buildUploadMetadataPayload() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.config) setConfig(data.config);
      }
      return res.ok;
    } catch {
      return false;
    }
  };

  const prepareUploadForPublish = async (): Promise<{ ok: true; payload: UploadMetadataPayload } | { ok: false }> => {
    let payload = buildUploadMetadataPayload();
    if (!payload.youtube.title) {
      const applied = await applyMetadataToUpload({ silent: true });
      if (!applied.ok) {
        toast.error('Defina um título (use Preencher com metadados IA) antes de publicar.');
        return { ok: false };
      }
      payload = applied.payload;
    }
    if (!payload.youtube.title) {
      toast.error('Defina um título (use Preencher com metadados IA) antes de publicar.');
      return { ok: false };
    }
    return { ok: true, payload };
  };

  const handleFixYoutubeMetadata = async () => {
    const videoId = titleExperimentVideoId || config?.upload_metadata?.youtube?.post_id;
    if (!videoId) {
      toast.error('Nenhum vídeo publicado vinculado a este projeto.');
      return;
    }
    const prepared = await prepareUploadForPublish();
    if (!prepared.ok) {
      toast.error('Preencha o título antes de corrigir no YouTube.');
      return;
    }
    const saved = await saveUploadMetadataToProject(prepared.payload);
    if (!saved) {
      toast.error('Erro ao salvar metadados no projeto.');
      return;
    }
    try {
      const res = await fetch(getProjectUrl('/api/upload/youtube/apply-metadata'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Metadados corrigidos no YouTube!');
      } else {
        toast.error(data.error || 'Falha ao corrigir metadados no YouTube.');
      }
    } catch {
      toast.error('Erro de conexão ao corrigir metadados.');
    }
  };

  const handlePostUploadComplete = async (
    videoId?: string,
    sseResult?: { titleTestStarted?: boolean; pinnedComment?: { success?: boolean } },
  ) => {
    if (!videoId) return;
    setTitleExperimentVideoId(videoId);
    if (sseResult?.titleTestStarted) toast('Teste A/B de títulos iniciado automaticamente.');
    if (sseResult?.pinnedComment?.success) toast('Comentário fixo publicado.');
    toast('Vídeo no ar! Acompanhe métricas em Canal YouTube na sidebar.');
    fetchTitleExperiment();
    fetchTitleExperimentAnalytics();
    fetchYoutubeChannelAlerts();
  };

  const handleGenerateCanvaThumbnails = async () => {
    let thumbnails = youtubeMetadataParsed?.thumbnails || [];
    let format = youtubeMetadataFormat || undefined;
    let palette = youtubeMetadataStrategy?.palette || [];
    let metadataText = youtubeMetadata || '';

    if (!thumbnails.length && metadataText && !metadataText.startsWith('[Erro]')) {
      try {
        const cacheRes = await fetch(getProjectUrl('/api/ai/youtube-metadata-cache'));
        if (cacheRes.ok) {
          const cache = await cacheRes.json();
          thumbnails = cache?.parsed?.thumbnails || thumbnails;
          format = format || cache?.format;
          palette = palette.length ? palette : (cache?.palette || []);
          metadataText = cache?.text || metadataText;
        }
      } catch { /* ignore */ }
    }

    if (!thumbnails.length && !youtubeMetadataParsed?.titles?.length) {
      toast('Passo 1: gere os metadados antes de usar o Canva.');
      return;
    }

    if (!uploadStatus.canva?.connected) {
      toast('Conecte o Canva em Configurações → Integrações.');
      return;
    }

    setCanvaThumbnailsLoading(true);
    try {
      const res = await fetch(getProjectUrl('/api/ai/generate-canva-thumbnails'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thumbnails,
          format,
          palette,
          metadataText: metadataText && !metadataText.startsWith('[Erro]') ? metadataText : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setYoutubeThumbnailsGenerated(data.thumbnails || []);
        toast(`${data.thumbnails?.length || 0} capas geradas no Canva e salvas no projeto.`);
      } else {
        toast(data.details ? `${data.error}: ${data.details}` : (data.error || 'Falha ao gerar no Canva.'));
      }
    } catch {
      toast('Erro de conexão ao gerar capas no Canva.');
    } finally {
      setCanvaThumbnailsLoading(false);
    }
  };

  const handleStartTitleExperiment = async () => {
    const selectedTitles = (youtubeMetadataParsed?.titles || [])
      .filter((_, idx) => titleAbSelected[String(idx)] !== false)
      .slice(0, 5);
    const fallbackTitles = youtubeMetadataParsed?.titles?.slice(0, 3) || [];
    const titles = selectedTitles.length >= 2 ? selectedTitles : fallbackTitles;

    if (titles.length < 2) {
      toast('Marque pelo menos 2 títulos para o teste A/B.');
      return;
    }

    const videoId = titleExperimentVideoId.trim();
    if (!videoId) {
      toast('Informe o videoId do YouTube (aparece após publicar).');
      return;
    }

    setTitleExperimentLoading(true);
    try {
      const res = await fetch(getProjectUrl('/api/youtube/title-experiment/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, titles }),
      });
      const data = await res.json();
      if (res.ok) {
        setTitleExperiment(data.experiment || null);
        toast('Teste A/B de títulos iniciado.');
        fetchTitleExperimentAnalytics();
      } else {
        toast(data.error || 'Falha ao iniciar teste A/B.');
      }
    } catch {
      toast('Erro ao iniciar teste A/B de títulos.');
    } finally {
      setTitleExperimentLoading(false);
    }
  };

  const handleRelinkYoutube = async () => {
    await fetch('/api/upload/youtube/reset-auth', { method: 'POST' });
    const res = await fetch('/api/upload/youtube/auth-url');
    if (res.ok) {
      const data = await res.json();
      window.open(data.url, '_blank');
      toast('Autorize TODAS as permissões (upload + editar vídeos + analytics).');
      fetchUploadStatus();
    } else {
      toast('Falha ao abrir autorização do YouTube.');
    }
  };

  const handleApplyTitleVariant = async (variantId: string) => {
    setTitleExperimentLoading(true);
    try {
      const res = await fetch(getProjectUrl('/api/youtube/title-experiment/apply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId }),
      });
      const data = await res.json();
      if (res.ok) {
        setTitleExperiment(data.experiment || null);
        if (data.appliedTitle) setYtTitle(data.appliedTitle.slice(0, 100));
        toast(`Título variante ${variantId} aplicado no YouTube.`);
        fetchTitleExperimentAnalytics();
      } else {
        toast(data.hint || data.details || data.error || 'Falha ao aplicar título.');
        if (data.needsReauth) fetchUploadStatus();
      }
    } catch {
      toast('Erro ao aplicar título no YouTube.');
    } finally {
      setTitleExperimentLoading(false);
    }
  };



  const resolveCanvaCreateUrl = (format: 'SHORT' | 'LONG' | '' = '') => {
    if (format === 'SHORT') {
      return 'https://www.canva.com/create/instagram-stories/';
    }
    return 'https://www.canva.com/create/youtube-thumbnails/';
  };

  const openCanvaThumbnailDesigner = async (thumb?: {
    id: string;
    label?: string;
    overlayText?: string;
    pairedTitle?: string;
    composition?: string;
    focalElement?: string;
    colors?: string[];
  }) => {
    const brief = thumb
      ? buildThumbnailBrief(thumb, {
          profileLabel: youtubeMetadataStrategy?.profileLabel,
          format: youtubeMetadataFormat,
        })
      : 'YouTube thumbnail — alto CTR, texto curto na capa, contraste forte';
    await copyToClipboard(brief, thumb ? `canva-${thumb.id}` : 'canva-thumb');
    const isShort = youtubeMetadataFormat === 'SHORT';
    const canvaUrl = resolveCanvaCreateUrl(youtubeMetadataFormat);
    window.open(canvaUrl, '_blank', 'noopener,noreferrer');
    toast(
      isShort
        ? 'Briefing copiado. Abrindo Canva (Stories 9:16 — ideal para Shorts).'
        : 'Briefing copiado. Abrindo Canva (Thumbnail YouTube 16:9).'
    );
  };

  const selectThumbnailForUpload = async (generated: { id: string; fileName?: string; url: string }) => {
    const thumbnailPath = generated.fileName ? `ASSETS/${generated.fileName}` : '';
    if (!thumbnailPath) {
      toast('Caminho da thumbnail inválido.');
      return;
    }
    setYtThumbnailPath(thumbnailPath);
    setYtThumbnailVariant(generated.id);
    try {
      const res = await fetch(getProjectUrl('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_metadata: {
            youtube: {
              title: ytTitle.trim(),
              description: ytDescription.trim(),
              privacy: ytPrivacy,
              thumbnail: thumbnailPath,
              thumbnail_variant: generated.id,
            },
            instagram: { title: igCaption.trim() },
            tiktok: { title: ttCaption.trim() },
            kwai: { title: kwCaption.trim() },
          },
        }),
      });
      if (res.ok) toast(`Thumbnail variante ${generated.id} selecionada para o upload do YouTube.`);
      else toast('Falha ao salvar thumbnail no projeto.');
    } catch {
      toast('Erro ao salvar thumbnail.');
    }
  };

  const handleGenerateYoutubeThumbnailImages = async () => {
    let thumbnails = youtubeMetadataParsed?.thumbnails || [];
    let format = youtubeMetadataFormat || undefined;
    let palette = youtubeMetadataStrategy?.palette || [];
    let metadataText = youtubeMetadata || '';

    if (!thumbnails.length && metadataText && !metadataText.startsWith('[Erro]')) {
      try {
        const cacheRes = await fetch(getProjectUrl('/api/ai/youtube-metadata-cache'));
        if (cacheRes.ok) {
          const cache = await cacheRes.json();
          thumbnails = cache?.parsed?.thumbnails || thumbnails;
          format = format || cache?.format;
          palette = palette.length ? palette : (cache?.palette || []);
          metadataText = cache?.text || metadataText;
          if (cache?.parsed) setYoutubeMetadataParsed(cache.parsed);
        }
      } catch { /* ignore */ }
    }

    if (!thumbnails.length && !youtubeMetadataParsed?.titles?.length) {
      toast('Passo 1: clique em "Gerar Metadados" antes de gerar as thumbnails.');
      return;
    }

    setYoutubeThumbnailsLoading(true);
    try {
      const res = await fetch(getProjectUrl('/api/ai/generate-youtube-thumbnails'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thumbnails,
          format,
          palette,
          metadataText: metadataText && !metadataText.startsWith('[Erro]') ? metadataText : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setYoutubeThumbnailsGenerated(data.thumbnails || []);
        if (data.parsed?.thumbnails?.length) {
          setYoutubeMetadataParsed((prev) => ({ ...(prev || {}), thumbnails: data.parsed.thumbnails }));
        }
        toast(`${data.thumbnails?.length || 0} thumbnails geradas com sucesso.`);
      } else {
        toast(data.details ? `${data.error}: ${data.details}` : (data.error || 'Falha ao gerar thumbnails.'));
      }
    } catch {
      toast('Erro de conexão ao gerar thumbnails. Reinicie o servidor do dashboard se acabou de atualizar.');
    } finally {
      setYoutubeThumbnailsLoading(false);
    }
  };

  // AI BGM Suggestion

  const [suggestingBGM, setSuggestingBGM] = useState<boolean>(false);

  const [planningBgmEmotions, setPlanningBgmEmotions] = useState<boolean>(false);

  const [bgmSuggestions, setBgmSuggestions] = useState<{ mode?: string; recommendation?: string; search_theme?: string; suggestions?: { block: number; recommendation: string; reason?: string; search_theme?: string }[]; manual_note?: string } | null>(null);

  const handlePlanBgmEmotions = async () => {

    if (!hasApiKey || !config) return;

    setPlanningBgmEmotions(true);

    try {

      const { ok, data } = await postAi('/api/ai/plan-bgm-emotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (ok && !data.needs_browser) {

        if (data.plan) {

          setStoryboardData((prev: any) => ({ ...(prev || {}), bgm_emotion_plan: data.plan }));

        }

        saveConfig({ ...config, bgm_mode: 'emotion', use_single_bgm: false, single_bgm: '' });

        const count = data.plan?.segment_count || data.plan?.segments?.length || 0;

        toast.success(`Plano emocional gerado: ${count} segmento(s).`);

        fetchData();

      } else {

        toast.error(data.error || 'Erro ao planejar trilhas por emoção.');

      }

    } catch {

      toast.error('Falha na conexão ao planejar trilhas por emoção.');

    } finally {

      setPlanningBgmEmotions(false);

    }

  };

  const handleSuggestBGM = async () => {

    if (!hasApiKey || !config) return;

    setSuggestingBGM(true);

    try {

      const { ok, data } = await postAi('/api/ai/suggest-bgm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: formatSelector }),
      });

      if (ok && !data.needs_browser) {

        setBgmSuggestions(data);

        toast.success('✨ Sugestões de BGM geradas! Veja abaixo de cada bloco.', { duration: 3000 });

      } else {

        toast.error(data.error || 'Erro ao sugerir BGM.');

      }

    } catch (err) {

      toast.error('Falha na conexão ao sugerir BGM.');

    } finally {

      setSuggestingBGM(false);

    }

  };

  // Generate Script & Alignment config using Gemini

  const handleGenerateCreatorScript = async () => {

    if (!creatorPrompt.trim()) return;

    setCreatorLoading(true);

    setCreatorScript('');

    try {

      const { ok, data } = await postAi('/api/ai/generate-creator-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: creatorPrompt, useNotebooklm }),
      });

      if (ok && data.script) {

        setCreatorScript(data.script);

        setCreatorStep(2);

        fetchData();

      } else {

        toast.error('Erro ao gerar roteiro: ' + (data.error || 'Erro desconhecido'));

      }

    } catch (err) {

      console.error(err);

      toast.error('Conexão falhou ao gerar roteiro.');

    } finally {

      setCreatorLoading(false);

    }

  };

  // SCRIPT MASTER: Generate 10 ideas

  const fetchNotebooklmStatus = async () => {
    try {
      const res = await fetch('/api/notebooklm/status');
      if (res.ok) {
        setNotebooklmStatus(await res.json());
      }
    } catch {
      setNotebooklmStatus({
        available: false,
        authenticated: false,
        message: 'NotebookLM indisponível',
        needsLogin: true,
      });
    }
  };

  const handleNotebooklmImprove = async () => {
    if (!activeProject || !storyboardData) {
      toast.error('Selecione um projeto com roteiro primeiro.');
      return;
    }
    const narrative = String(storyboardData.narrative_script || '').trim();
    if (narrative.length < 80) {
      toast.error('O roteiro precisa ter narração antes de enriquecer.');
      return;
    }
    setNotebooklmImproving(true);
    try {
      const { ok, data } = await postAi('/api/notebooklm/improve-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useNotebooklm }),
      });
      if (ok && data.storyboard) {
        setStoryboardData(data.storyboard);
        if (data.suggestions) setNotebooklmSuggestions(data.suggestions);
        toast.success(
          notebooklmStatus?.authenticated
            ? 'Roteiro enriquecido com pesquisa NotebookLM!'
            : 'Roteiro melhorado — execute `nlm login` no terminal para pesquisa real.',
        );
      } else {
        toast.error(data.error || 'Falha ao enriquecer roteiro.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Conexão falhou ao enriquecer roteiro.');
    } finally {
      setNotebooklmImproving(false);
    }
  };

  const handleNotebooklmImproveNarrationDraft = async () => {
    const draft = narrationDraft.trim();
    if (draft.length < 40) {
      toast.error('A narração precisa ter ao menos 40 caracteres para melhorar.');
      return;
    }
    setNotebooklmImproving(true);
    try {
      const selectedIdea = ideationTab === 'listicle'
        ? listicleIdeasData?.ranking_ideas?.[selectedListicleIdeaIndex]
        : ideationTab === 'custom'
          ? { title: customTitle.trim() }
          : selectedIdeaIndex === 999
            ? { title: customIdeaTitle }
            : (ideasData?.ideas || [])[selectedIdeaIndex];

      const niche = ideationTab === 'listicle'
        ? (listNiche.trim() || listTopic.trim())
        : ideationTab === 'custom'
          ? 'Customized'
          : nicheInput.trim();

      const blockCount = narrationBlockPhrases.length || (formatSelector === 'SHORTS' ? 5 : 12);

      const { ok, data } = await postAi('/api/notebooklm/improve-narration-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrativeScript: draft,
          narrativeScriptTagged: narrationTaggedDraft.trim() || undefined,
          niche,
          format: formatSelector,
          blockCount,
          useNotebooklm,
          ideaTitle: selectedIdea?.title || niche,
          isListicle: ideationTab === 'listicle',
          listicleRank: ideationTab === 'listicle' ? rankCount : undefined,
        }),
      });

      if (ok && !data.needs_browser) {
        if (data.narrative_script) setNarrationDraft(data.narrative_script);
        if (data.narrative_script_tagged) setNarrationTaggedDraft(data.narrative_script_tagged);
        if (data.strategy) setNarrationStrategy(data.strategy);
        if (data.technical_config?.block_phrases) {
          setNarrationBlockPhrases(data.technical_config.block_phrases);
        }
        if (data.technical_config?.script) {
          const scriptBlocks = data.technical_config.script;
          setNarrationBlockScript(
            typeof scriptBlocks === 'string' ? scriptBlocks : Array.isArray(scriptBlocks) ? scriptBlocks.join('\n\n') : '',
          );
        }
        setNarrationNotebooklmEnriched(Boolean(data.notebooklm_enriched));
        const nlmReason = data.notebooklm_reason as string | undefined;
        const nlmFallbackMsg =
          nlmReason === 'disabled'
            ? 'Checkbox "Usar NotebookLM" está desmarcado — só clareza/retenção via IA.'
            : nlmReason === 'needs_login'
              ? 'NotebookLM desconectado — rode .\\nlm-login.ps1 na pasta Lumiera.'
              : nlmReason === 'fallback'
                ? 'NotebookLM falhou — melhorias só de clareza/retenção via IA.'
                : 'NotebookLM sem fontes no notebook deste nicho — melhorias via IA.';
        toast.success(
          data.notebooklm_enriched
            ? 'Narração melhorada com pesquisa NotebookLM!'
            : `Narração melhorada (sem pesquisa NotebookLM). ${nlmFallbackMsg}`,
        );
      } else {
        toast.error(data.error || 'Erro ao melhorar narração.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Conexão falhou ao melhorar narração.');
    } finally {
      setNotebooklmImproving(false);
    }
  };

  const handleGenerateIdeas = async () => {

    if (!nicheInput.trim()) return;

    setCreatorLoading(true);

    setIdeasData(null);

    setSelectedIdeaIndex(-1);

    try {

      if (geminiBrowserMode) {
        toast.loading('Gerando ideias via Gemini no navegador…', { id: 'gemini-ideas' });
      }

      const body = JSON.stringify({
        niche: nicheInput.trim(),
        format: formatSelector,
        useNotebooklm,
        ...(ideationTab === 'listicle' ? {
          contentMode: 'LISTICLE',
          rankCount,
          rankOrder,
          listTopic: listTopic.trim() || nicheInput.trim(),
        } : {}),
      });

      const { ok, data } = await postAi('/api/ai/creator/ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      });

      toast.dismiss('gemini-ideas');

      if (ok && data.ideas) {

        setIdeasData(data);
        setIdeasSearchNiche(nicheInput.trim());

        setSelectedIdeaIndex(data.best_idea_index);

        // Auto-fill project name from best idea title (short 3-word summary)

        const bestTitle = data.ideas[data.best_idea_index]?.title || '';

        const stopWords = ['o','a','os','as','um','uma','uns','umas','de','do','da','dos','das','no','na','nos','nas','em','por','para','com','e','que','se','ou','ao','à','pelo','pela','pelos','pelas','entre','sobre','sob','até','como','mais','menos','muito','tudo','isso','este','esta','esse','essa','qual','quais'];

        const shortName = bestTitle

          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

          .replace(/[^a-zA-Z0-9\s]/g, '')

          .split(/\s+/)

          .filter(w => w.length > 1 && !stopWords.includes(w.toLowerCase()))

          .slice(0, 3)

          .join('_');

        setCreatorProjectName(shortName);

      } else {
        const errMsg = data.error || 'Erro desconhecido';
        toast.error(
          errMsg.includes('extensão') || errMsg.includes('Extensão') || errMsg.includes('Gemini')
            ? `${errMsg} Abra gemini.google.com, recarregue o dashboard (F5) e tente de novo.`
            : `Erro ao analisar o nicho: ${errMsg}`,
          { duration: 7000 },
        );
      }

    } catch (err: any) {

      console.error(err);

      const msg = err?.message || 'Conexão falhou ao analisar o nicho.';
      toast.error(
        msg.includes('Extensão') || msg.includes('extensão') || msg.includes('Gemini')
          ? `${msg} Verifique gemini.google.com e recarregue o dashboard (F5).`
          : msg,
        { duration: 7000 },
      );

    } finally {

      setCreatorLoading(false);

    }

  };

  // SCRIPT MASTER: Generate Strategy and full narrative script

  const handleSuggestListicleRankings = async () => {
    if (!listNiche.trim()) {
      toast.error('Informe o nicho primeiro (ex: história militar, tecnologia).');
      return;
    }
    setCreatorLoading(true);
    setListicleIdeasData(null);
    setSelectedListicleIdeaIndex(-1);
    setNicheInput(listNiche.trim());

    try {
      if (geminiBrowserMode) {
        toast.loading('Sugerindo rankings via Gemini no navegador…', { id: 'gemini-listicle' });
        const diag = await refreshGeminiExtensionStatus();
        if (!diag.pingOk) {
          toast.dismiss('gemini-listicle');
          const err = diag.error || 'Extensão não respondeu. Recarregue extensão + F5.';
          toast.error(
            `${err} Execute tools/lumiera-gemini-bridge/install.bat e abra o dashboard em http://127.0.0.1:5176`,
            { duration: 10000 },
          );
          return;
        }
      }

      const body = JSON.stringify({ niche: listNiche.trim(), format: formatSelector, useNotebooklm });
      const { ok, data } = await postAi('/api/ai/creator/listicle-ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      });

      toast.dismiss('gemini-listicle');

      const ideas = data.ranking_ideas || data.rankings || data.ideas || [];
      if (ok && Array.isArray(ideas) && ideas.length > 0) {
        const normalized = {
          ...data,
          ranking_ideas: ideas,
          best_index: data.best_index ?? 0,
        };
        setListicleIdeasData(normalized);
        setListicleSearchNiche(listNiche.trim());
        const best = normalized.best_index ?? 0;
        setSelectedListicleIdeaIndex(best);
        const pick = ideas[best];
        if (pick) {
          if (pick.list_topic) setListTopic(pick.list_topic);
          const resolvedFormat = (pick.best_format === 'SHORTS' || pick.best_format === 'LONGO')
            ? pick.best_format
            : formatSelector;
          if (pick.best_format === 'SHORTS' || pick.best_format === 'LONGO') setFormatSelector(pick.best_format);
          if (pick.suggested_rank_count) {
            setRankCount(resolvedFormat === 'SHORTS'
              ? (pick.suggested_rank_count === 5 ? 5 : 3)
              : pick.suggested_rank_count);
          }
          if (pick.title) {
            const shortName = pick.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter((w: string) => w.length > 1).slice(0, 4).join('_');
            setCreatorProjectName(shortName || creatorProjectName);
          }
        }
        toast.success(`${ideas.length} rankings sugeridos para "${listNiche.trim()}".`);
      } else {
        const hint = data.details ? ` (${data.details})` : '';
        const preview = data.raw_preview ? ` — ${String(data.raw_preview).slice(0, 120)}` : '';
        toast.error((data.error || 'Nenhum ranking retornado') + hint + preview, { duration: 6000 });
      }
    } catch (err: any) {
      const msg = err?.message || 'Falha ao sugerir rankings.';
      toast.error(
        msg.includes('Extensão') || msg.includes('extensão')
          ? `${msg} Execute tools/lumiera-gemini-bridge/install.bat e recarregue o dashboard.`
          : msg,
        { duration: 7000 },
      );
    } finally {
      setCreatorLoading(false);
    }
  };

  const buildCreatorScriptPayload = (
    phase: 'narration' | 'full',
    options?: { approvedNarration?: string; approvedNarrationTagged?: string },
  ) => {
    const fullExtras = phase === 'full'
      ? {
          approvedNarration: options?.approvedNarration,
          approvedNarrationTagged: options?.approvedNarrationTagged,
          existingStrategy: narrationStrategy || undefined,
        }
      : {};
    const isCustom = ideationTab === 'custom';
    const isListicle = ideationTab === 'listicle';
    const safeProjectName = creatorProjectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

    if (isListicle) {
      const selectedRanking = listicleIdeasData?.ranking_ideas?.[selectedListicleIdeaIndex];
      const title = selectedRanking?.title || `Top ${rankCount} ${listTopic.trim()}`;
      const nicheForScript = listNiche.trim() || listTopic.trim();
      return {
        niche: nicheForScript,
        format: formatSelector,
        contentMode: 'LISTICLE',
        rankCount,
        rankOrder,
        listTopic: listTopic.trim(),
        listicleHudStyle,
        idea: {
          title,
          promise: selectedRanking?.promise || `Ranking dos ${rankCount} itens mais importantes sobre ${listTopic.trim()}, com fatos surpreendentes e impacto no mundo moderno.`,
          emotion: selectedRanking?.emotion || 'Curiosidade / Surpresa',
          sample_items: selectedRanking?.sample_items,
          listicle_angle: selectedRanking?.listicle_angle,
        },
        project: safeProjectName,
        useNotebooklm,
        phase,
        ...fullExtras,
      };
    }

    return {
      niche: isCustom ? 'Customized' : nicheInput.trim(),
      format: formatSelector,
      idea: isCustom ? {
        title: customTitle.trim(),
        promise: customOutline.trim(),
        emotion: 'Curiosity / Action',
        isCustom: true,
        pioneerNiche: editorialIdeaImport?.mechanic === 'pioneer-niche'
          || Boolean(editorialIdeaImport?.pioneerMeta)
          || isPioneerStrategyText(customTitle.trim())
          || isPioneerStrategyText(customHooks.trim())
          || /TEMA DO VÍDEO/i.test(customOutline.trim()),
        hook: customHooks.trim(),
        hooks: customHooks.trim(),
        blocks: customBlocks.filter((b) => b.content.trim() !== ''),
      } : (selectedIdeaIndex === 999 ? {
        title: customIdeaTitle,
        promise: customIdeaPromise,
        emotion: customIdeaEmotion,
        hook: customIdeaHook,
        blocks: customIdeaBlocks,
      } : (ideasData?.ideas || [])[selectedIdeaIndex]),
      project: safeProjectName,
      useNotebooklm,
      phase,
      ...fullExtras,
    };
  };

  const validateCreatorScriptInputs = () => {
    if (ideationTab === 'listicle') {
      if (!listTopic.trim()) {
        toast.error('Escolha ou informe um ranking (tema da lista).');
        return false;
      }
    } else if (ideationTab === 'custom') {
      if (!customTitle.trim()) {
        toast.error('Por favor, preencha o título da sua ideia.');
        return false;
      }
      if (
        isPioneerStrategyText(customTitle.trim())
        && isPioneerStrategyText(customHooks.trim())
        && !customOutline.trim()
      ) {
        toast.error(
          'Título/gancho são texto de estratégia (saturação/gap), não o tema do vídeo. Reabra a ideia pelo Radar → Abrir no Creator.',
        );
        return false;
      }
      if (isPioneerStrategyText(customTitle.trim()) && !customOutline.trim()) {
        toast.error(
          'Preencha o outline com o TEMA real do vídeo (ângulo/assunto), não só a análise de saturação.',
        );
        return false;
      }
    } else if (!ideasData || selectedIdeaIndex === -1) {
      return false;
    }

    if (!creatorProjectName.trim()) {
      toast.error('Por favor, digite o nome do projeto/pasta.');
      return false;
    }
    return true;
  };

  const slugCreatorProjectFromTitle = (title: string) => {
    const slug = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 4)
      .join('_');
    return slug || 'projeto_novo';
  };

  const cleanYoutubeStudioIdeaSeed = (title: string, hookPt?: string) => {
    const seed = String(hookPt || title || '').trim();
    return seed
      .replace(/^Ideia\s+\d+\s*[—-]\s*mec[aâ]nica de\s*"?/i, '')
      .replace(/"?\.\.\."?$/g, '')
      .replace(/"$/g, '')
      .trim() || seed;
  };

  const ensureCreatorProjectFolder = async (
    baseTitle: string,
    format: 'LONGO' | 'SHORTS',
    niche: string,
  ): Promise<{ ok: boolean; safeName: string; created: boolean; error?: string }> => {
    const base = slugCreatorProjectFromTitle(baseTitle);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}_${attempt + 1}`;
      const safeName = candidate.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      try {
        const res = await fetch('/api/projects/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: safeName, format, niche: niche.trim() || 'Geral' }),
        });
        const data = await res.json();
        if (res.ok) return { ok: true, safeName, created: true };
        if (res.status === 400 && String(data.error || '').includes('Já existe')) continue;
        return { ok: false, safeName, created: false, error: data.error || 'Erro ao criar projeto' };
      } catch {
        return { ok: false, safeName, created: false, error: 'Falha na conexão ao criar projeto.' };
      }
    }
    return { ok: false, safeName: base, created: false, error: 'Não foi possível criar uma pasta única para o projeto.' };
  };

  const handleScheduleFromHeatmap = (slot: { iso: string; local: string; label?: string }) => {
    setYtPublishAt(slot.iso);
    setYtPrivacy('private');
    setActiveTab('upload');
    toast.success(`Publicação agendada: ${slot.local}${slot.label ? ` (${slot.label})` : ''}. Revise na aba Upload.`);
  };

  const bumpCreatorGenToken = () => {
    creatorGenTokenRef.current += 1;
    return creatorGenTokenRef.current;
  };

  /** Cancela geração em voo e evita botão preso em "Gerando narração…". */
  const cancelCreatorGeneration = () => {
    bumpCreatorGenToken();
    setCreatorLoading(false);
    setCreatorLoadingMode('idle');
  };

  const resetCreatorWizard = useCallback((opts?: { deleteServerSessionFor?: string }) => {
    cancelCreatorGeneration();
    setAutomation({ active: false });
    clearWizardSession();

    setCreatorStep(1);
    setCreatorLoading(false);
    setCreatorLoadingMode('idle');
    setNicheInput('');
    setIdeasData(null);
    setSelectedIdeaIndex(-1);
    setGeneratedScriptData(null);
    setCreatorScript('');
    setFormatSelector('LONGO');
    setCreatorProjectName('');
    setEditorialIdeaImport(null);
    setShowNarrationReview(false);
    setNarrationDraft('');
    setNarrationTaggedDraft('');
    setNarrationStrategy(null);
    setNarrationBlockPhrases([]);
    setNarrationBlockScript('');
    setNarrationNotebooklmEnriched(false);
    setNarrationProjectName('');
    setCustomTitle('');
    setCustomHooks('');
    setCustomOutline('');
    setCustomBlocks([{ block: 1, content: '' }]);
    setIdeationTab('ai');
    setCustomIdeaTitle('');
    setCustomIdeaPromise('');
    setCustomIdeaEmotion('');
    setCustomIdeaHook('');
    setCustomIdeaBlocks('');
    setListicleIdeasData(null);
    setSelectedListicleIdeaIndex(-1);

    const project = opts?.deleteServerSessionFor?.trim();
    if (project) {
      fetch(`/api/projects/wizard-session?project=${encodeURIComponent(project)}`, { method: 'DELETE' }).catch(() => {});
    }
  }, [setAutomation]);

  const applyNarrationGenerationResult = (
    data: Record<string, unknown>,
    projectName: string,
    token: number,
    successMessage: string,
    toastId?: string,
  ) => {
    if (token !== creatorGenTokenRef.current) return false;
    setNarrationDraft(String(data.narrative_script || ''));
    setNarrationTaggedDraft(String(data.narrative_script_tagged || ''));
    setNarrationStrategy((data.strategy as object) || null);
    setNarrationBlockPhrases((data.technical_config as { block_phrases?: { block: number; phrase: string }[] })?.block_phrases || []);
    const scriptBlocks = (data.technical_config as { script?: string | string[] })?.script;
    setNarrationBlockScript(
      typeof scriptBlocks === 'string' ? scriptBlocks : Array.isArray(scriptBlocks) ? scriptBlocks.join('\n\n') : '',
    );
    setNarrationNotebooklmEnriched(Boolean(data.notebooklm_enriched));
    setNarrationProjectName(projectName);
    setShowNarrationReview(true);
    if (toastId) toast.success(successMessage, { id: toastId });
    else toast.success(successMessage);
    return true;
  };

  const creatorNarrationPayloadRef = useRef<Record<string, unknown> | null>(null);
  const creatorNarrationProjectRef = useRef<string>('');

  const applyCapturedNarrationToCreator = async (
    browserText: string,
    projectName: string,
    payload: Record<string, unknown>,
    toastId = 'creator-narration-capture',
  ) => {
    const token = bumpCreatorGenToken();
    setCreatorLoading(true);
    setCreatorLoadingMode('narration');
    toast.loading('Aplicando narração capturada…', { id: toastId });
    try {
      const { ok, data } = await postAi('/api/ai/creator/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, browser_response: browserText }),
      });
      if (token !== creatorGenTokenRef.current) return;
      if (ok && !data.needs_browser) {
        const scriptLen = String(data.narrative_script || '').trim().length;
        if (scriptLen < 40) {
          toast.error('JSON capturado sem narração válida. Copie a resposta completa do Gemini.', { id: toastId });
        } else {
          applyNarrationGenerationResult(data, projectName, token, 'Narração capturada — revise antes do roteiro.', toastId);
          await fetchProjects();
          setActiveProject(projectName);
        }
      } else if (token === creatorGenTokenRef.current) {
        const errMsg = [data.error, data.details].filter(Boolean).join(' — ') || 'Erro ao aplicar narração.';
        toast.error(errMsg, { id: toastId, duration: 10000 });
      }
    } catch (err: unknown) {
      if (token === creatorGenTokenRef.current) {
        toast.error(err instanceof Error ? err.message : 'Falha ao aplicar narração.', { id: toastId });
      }
    } finally {
      if (token === creatorGenTokenRef.current) {
        setCreatorLoading(false);
        setCreatorLoadingMode('idle');
        setAutomation({ active: false });
      }
    }
  };

  const handleCaptureGeminiNarration = async () => {
    const payload = creatorNarrationPayloadRef.current;
    const projectName = creatorNarrationProjectRef.current || creatorProjectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!payload || !projectName) {
      toast.error('Gere narração uma vez antes de capturar, ou preencha o projeto.');
      return;
    }
    const toastId = 'creator-narration-capture';
    toast.loading('Capturando resposta do Gemini…', { id: toastId });
    try {
      const text = await captureGeminiNarrationNow();
      if (!text) {
        toast.error('Nada capturado. Abra gemini.google.com com a resposta JSON visível.', { id: toastId });
        return;
      }
      await applyCapturedNarrationToCreator(text, projectName, payload, toastId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Falha ao capturar do Gemini.', { id: toastId });
      setAutomation({ active: false });
    }
  };

  const runCreatorNarrationGeneration = async (
    projectName: string,
    payload: Record<string, unknown>,
    opts?: { createProjectFirst?: boolean; baseTitle?: string; format?: 'LONGO' | 'SHORTS'; niche?: string; toastId?: string },
  ) => {
    const token = bumpCreatorGenToken();
    const toastId = opts?.toastId || 'creator-narration-gen';
    const niche = (opts?.niche || config?.niche || nicheInput || 'Geral').trim() || 'Geral';
    const format = opts?.format || formatSelector;

    if (opts?.createProjectFirst) {
      toast.loading('Criando projeto…', { id: toastId });
      const proj = await ensureCreatorProjectFolder(opts.baseTitle || projectName, format, niche);
      if (token !== creatorGenTokenRef.current) return;
      if (!proj.ok) {
        toast.error(proj.error || 'Erro ao criar projeto', { id: toastId });
        return;
      }
      projectName = proj.safeName;
      setCreatorProjectName(proj.safeName);
      await fetchProjects();
      if (token !== creatorGenTokenRef.current) return;
      setActiveProject(proj.safeName);
      payload.project = proj.safeName;
    }

    creatorNarrationPayloadRef.current = { ...payload };
    creatorNarrationProjectRef.current = projectName;

    setCreatorLoading(true);
    setCreatorLoadingMode('narration');
    setGeneratedScriptData(null);
    setShowNarrationReview(false);
    const progressJobId = createProgressJobId();
    const progressTitle = ideationTab === 'listicle'
      ? `Narração Top ${rankCount}`
      : 'Gerar narração';
    startAiJobProgress(progressJobId, progressTitle);

    try {
      const { ok, data } = await postCreatorScriptAi({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, { jobId: progressJobId });
      if (token !== creatorGenTokenRef.current) return;
      if (ok && !data.needs_browser) {
        const scriptLen = String(data.narrative_script || '').trim().length;
        if (scriptLen < 80) {
          stopAiJobProgress(false, 'Resposta incompleta — tente de novo.');
          toast.error(
            'Resposta do Gemini incompleta — o chat não terminou. Veja gemini.google.com, espere o JSON completo e clique em Gerar Narração de novo.',
            { duration: 10000 },
          );
        } else {
          stopAiJobProgress(true);
          applyNarrationGenerationResult(
            data,
            projectName,
            token,
            data.notebooklm_enriched
              ? 'Narração pronta (NotebookLM) — revise antes do roteiro.'
              : 'Narração gerada — revise antes do roteiro.',
          );
          await fetchProjects();
          setActiveProject(projectName);
        }
      } else if (token === creatorGenTokenRef.current) {
        const errMsg = [data.error, data.details].filter(Boolean).join(' — ') || 'Erro ao gerar narração.';
        stopAiJobProgress(false, String(errMsg));
      }
    } catch (err: unknown) {
      if (token === creatorGenTokenRef.current) {
        const msg = err instanceof Error ? err.message : 'Falha na geração da narração.';
        stopAiJobProgress(false, msg);
      }
    } finally {
      if (token === creatorGenTokenRef.current) {
        setCreatorLoading(false);
        setCreatorLoadingMode('idle');
      }
    }
  };

  const handleApplyYoutubeStudioIdea = async (
    title: string,
    hookPt?: string,
    options?: CreatorApplyIdeaOptions,
  ) => {
    const autoRun = options?.autoRun === true;
    const om = options?.openMontage;
    const omConcept = om?.brief ? resolveOpenMontageConcept(om.brief, om.conceptId) : undefined;
    const safeTitle = coerceCreatorTextField(
      omConcept?.title || title,
      om?.brief?.creator_title || '',
    );
    const safeHook = coerceCreatorTextField(
      hookPt,
      om?.brief?.creator_hook || omConcept?.title || safeTitle,
    );
    const isPioneer = options?.mechanic === 'pioneer-niche' || Boolean(options?.pioneerMeta);
    const pioneerSeed = isPioneer
      ? resolvePioneerCreatorSeed(safeTitle, safeHook, options?.pioneerMeta, options?.whyWorks)
      : null;
    const cleaned = pioneerSeed?.title || cleanYoutubeStudioIdeaSeed(safeTitle, safeHook);
    const hook = pioneerSeed?.hook
      || (isPioneerStrategyText(safeHook) ? cleaned : (safeHook || cleaned));
    const openMontagePayload = om?.brief
      ? {
          brief: om.brief,
          conceptId: om.conceptId,
          referenceUrl: om.referenceUrl,
          referenceTitle: om.referenceTitle,
        }
      : undefined;
    const openMontageOutline = openMontagePayload
      ? buildOpenMontageCreatorOutline(openMontagePayload)
      : (options?.whyWorks?.trim() || undefined);
    const niche = (config?.niche || nicheInput || 'Geral').trim() || 'Geral';
    const format = options?.format || 'SHORTS';
    const projectSlug = slugCreatorProjectFromTitle(hook || cleaned);
    const sourceProject = parseEditorialSourceProject(options?.source);
    const mechanicBlock = options?.mechanic?.match(/clip-factory-bloco-(\d+)/);
    const importData: EditorialIdeaImport = {
      title: cleaned,
      hookPt: hook,
      format,
      editorialItemId: options?.editorialItemId,
      mechanic: options?.mechanic || (om?.brief ? 'openmontage-reference' : undefined),
      source: options?.source || (om?.referenceUrl ? `openmontage:${om.referenceUrl}` : undefined),
      sourceProject,
      sourceBlock: options?.sourceBlock ?? (mechanicBlock ? Number(mechanicBlock[1]) : undefined),
      pioneerMeta: options?.pioneerMeta,
      openMontageOutline,
      openMontage: openMontagePayload,
      whyWorks: openMontageOutline ? undefined : options?.whyWorks,
    };

    cancelCreatorGeneration();
    setAutomation({ active: false });
    setShowNarrationReview(false);
    setNarrationDraft('');
    setNarrationTaggedDraft('');
    setNarrationStrategy(null);
    setNarrationBlockPhrases([]);
    setNarrationBlockScript('');
    setNarrationProjectName('');
    setGeneratedScriptData(null);

    setActiveTab('creator');
    setCreatorStep(1);
    setIdeationTab('custom');
    setCustomTitle(hook || cleaned);
    setCustomHooks(hook);
    setCustomOutline(resolveEditorialImportOutline(importData));
    setNicheInput((prev) => prev || niche);
    setFormatSelector(format);
    setCreatorProjectName(projectSlug);
    setEditorialIdeaImport(importData);

    if (options?.editorialItemId) {
      fetch(`/api/youtube/channel/editorial-queue/${options.editorialItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'script' }),
      }).catch(() => {});
    }

    const originLabel = om?.brief
      ? `OpenMontage · ${omConcept?.id || 'ref'}`
      : isClipFactorySource(options?.source)
        ? `Clip Factory · ${sourceProject || 'longo'}`
        : options?.source
          ? options.source
          : 'Fila editorial';
    toast.success(`Creator preparado (${originLabel}). Revise os campos e gere a narração.`);

    if (!autoRun) return;

    await runCreatorNarrationGeneration(projectSlug, {
      niche: 'Customized',
      format,
      idea: {
        title: hook || cleaned,
        promise: buildEditorialImportOutline(importData),
        emotion: 'Curiosity / Action',
        isCustom: true,
        hook,
        hooks: hook,
        blocks: customBlocks.filter((b) => b.content.trim() !== ''),
      },
      useNotebooklm,
      phase: 'narration',
    }, {
      createProjectFirst: true,
      baseTitle: hook || cleaned,
      format,
      niche,
      toastId: 'yt-studio-idea-auto',
    });
  };

  const handleGenerateNarrationFromImport = async () => {
    if (!editorialIdeaImport) return;
    if (!validateCreatorScriptInputs()) return;
    const safeProjectName = creatorProjectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    await runCreatorNarrationGeneration(safeProjectName, buildCreatorScriptPayload('narration'), {
      createProjectFirst: true,
      baseTitle: customTitle.trim() || editorialIdeaImport.hookPt,
      format: editorialIdeaImport.format,
      niche: nicheInput.trim() || config?.niche || 'Geral',
      toastId: 'creator-import-narration',
    });
  };

  const handleGenerateNarration = async () => {
    if (!validateCreatorScriptInputs()) return;

    const safeProjectName = creatorProjectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const niche = ideationTab === 'listicle'
      ? (listNiche.trim() || listTopic.trim())
      : ideationTab === 'custom'
        ? (nicheInput.trim() || config?.niche || 'Geral')
        : nicheInput.trim() || config?.niche || 'Geral';

    await runCreatorNarrationGeneration(safeProjectName, buildCreatorScriptPayload('narration'), {
      baseTitle: customTitle.trim() || safeProjectName,
      format: formatSelector,
      niche,
      toastId: 'creator-narration-direct',
    });
  };

  const handleApproveNarrationAndGenerateScript = async () => {
    const approved = narrationDraft.trim();
    if (!approved) {
      toast.error('A narração não pode estar vazia.');
      return;
    }
    if (!narrationProjectName.trim()) {
      toast.error('Projeto não definido — gere a narração novamente.');
      return;
    }

    const token = bumpCreatorGenToken();
    setCreatorLoading(true);
    setCreatorLoadingMode('full');
    const progressJobId = createProgressJobId();
    const progressTitle = ideationTab === 'listicle'
      ? `Roteiro Top ${rankCount}`
      : 'Roteiro completo';
    startAiJobProgress(progressJobId, progressTitle);

    try {
      const { ok, data } = await postCreatorScriptAi({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCreatorScriptPayload('full', {
          approvedNarration: approved,
          approvedNarrationTagged: narrationTaggedDraft.trim() || undefined,
        })),
      }, { jobId: progressJobId });
      if (token !== creatorGenTokenRef.current) return;
      if (ok && !data.needs_browser) {
        stopAiJobProgress(true);
        applyStoryboardToCreatorState(data);
        const blockNums = [...new Set(
          (data.visual_prompts || []).map((vp: any) => parseCreatorBlockNumber(vp?.block ?? vp?.bloco, vp?.scene ?? vp?.cena)),
        )].sort((a, b) => a - b);
        setExpandedBlocks(Object.fromEntries(blockNums.map((b) => [b, true])));
        setShowNarrationReview(false);
        setCreatorStep(2);
        await fetchProjects();
        setActiveProject(narrationProjectName);
        fetchData();
        const listicleMsg = ideationTab === 'listicle'
          ? ` com ${data.list_items?.length || rankCount} itens`
          : '';
        toast.success(`Roteiro completo gerado${listicleMsg}.`);
      } else if (token === creatorGenTokenRef.current) {
        const detail = data.details ? `: ${data.details}` : '';
        const hint = data.hint ? ` ${data.hint}` : '';
        stopAiJobProgress(false, `${data.error || 'Erro ao gerar roteiro completo'}${detail}${hint}`);
      }
    } catch (err: unknown) {
      if (token === creatorGenTokenRef.current) {
        stopAiJobProgress(false, err instanceof Error ? err.message : 'Falha ao gerar roteiro.');
        console.error(err);
        toast.error(err instanceof Error ? err.message : 'Conexão falhou ao gerar roteiro.');
      }
    } finally {
      if (token === creatorGenTokenRef.current) {
        setCreatorLoading(false);
        setCreatorLoadingMode('idle');
      }
    }
  };

  const handleGenerateListicleScript = handleGenerateNarration;

  const handleGenerateFullScript = handleGenerateNarration;

  const creatorScenesNeedRepair = useMemo(() => {
    const vps = generatedScriptData?.visual_prompts || [];
    if (!vps.length) return true;
    const missingFields = vps.some((vp: any) => !String(vp?.narration_text || vp?.narration_excerpt || '').trim()
      || !String(vp?.prompt || '').trim());
    if (missingFields) return true;
    const blockPhrases = generatedScriptData?.technical_config?.block_phrases || [];
    const expectedBlocks = blockPhrases.length > 0
      ? blockPhrases.length
      : (formatSelector === 'SHORTS' ? 5 : 12);
    if (countCreatorUniqueBlocks(vps) < expectedBlocks) return true;
    const minScenes = formatSelector === 'SHORTS'
      ? Math.max(5, expectedBlocks)
      : Math.max(8, expectedBlocks);
    return vps.length < Math.min(minScenes, expectedBlocks * 2);
  }, [generatedScriptData?.visual_prompts, generatedScriptData?.technical_config?.block_phrases, formatSelector]);

  const handleEvaluateScriptChecklist = async () => {
    const projectName = narrationProjectName || creatorProjectName || activeProject;
    if (!projectName?.trim()) {
      toast.error('Projeto não identificado.');
      return;
    }
    setCreatorLoading(true);
    setCreatorLoadingMode('full');
    try {
      const { ok, data } = await postAi('/api/ai/creator/evaluate-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') }),
      });
      if (ok && !data.needs_browser) {
        applyStoryboardToCreatorState(data);
        await saveCreatorStoryboard(data);
        toast.success('Checklist de qualidade atualizado.');
      } else {
        toast.error(data.error || data.details || 'Erro ao avaliar checklist.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao avaliar checklist.');
    } finally {
      setCreatorLoading(false);
      setCreatorLoadingMode('idle');
    }
  };


  const handleEnhanceVisualPrompts = async () => {
    const projectName = narrationProjectName || creatorProjectName || activeProject;
    if (!projectName?.trim()) {
      toast.error('Projeto não identificado.');
      return;
    }
    setCreatorLoading(true);
    setCreatorLoadingMode('full');
    try {
      const { ok, data } = await postAi('/api/ai/creator/enhance-visual-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') }),
      });
      if (ok && !data.needs_browser) {
        applyStoryboardToCreatorState(data);
        await saveCreatorStoryboard(data);
        const score = data._vpe_checklist?.quality_score;
        const niche = data._vpe_checklist?.nicho_detectado || '';
        toast.success(`✨ Engenharia Visual PRO concluída — ${data.visual_prompts?.length || 0} cenas${score ? ` · Score: ${score}` : ''}${niche ? ` · Nicho: ${niche}` : ''}`);
      } else {
        toast.error(data.error || data.details || 'Erro ao aprimorar prompts visuais.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao aprimorar prompts visuais.');
    } finally {
      setCreatorLoading(false);
      setCreatorLoadingMode('idle');
    }
  };

  // Upload narration file binary stream

  const uploadNarrationFile = async (file: File) => {

    setUploadingNarration(true);

    setUploadSuccess(false);

    try {

      const res = await fetch(getProjectUrl('/api/upload-narration'), {

        method: 'POST',

        headers: { 'Content-Type': 'audio/mpeg' },

        body: file

      });

      const data = await res.json();

      if (res.ok) {

        setUploadSuccess(true);

        toast.success('Narração master enviada com sucesso!');

        fetchData();

      } else {

        toast.error('Falha ao salvar áudio: ' + (data.error || 'Erro desconhecido'));

      }

    } catch (err) {

      console.error(err);

      toast.error('Erro na conexão ao fazer upload.');

    } finally {

      setUploadingNarration(false);

    }

  };

  const handleDrag = (e: React.DragEvent) => {

    e.preventDefault();

    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {

      setDragActive(true);

    } else if (e.type === "dragleave") {

      setDragActive(false);

    }

  };

  const handleDrop = (e: React.DragEvent) => {

    e.preventDefault();

    e.stopPropagation();

    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {

      uploadNarrationFile(e.dataTransfer.files[0]);

    }

  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {

    if (e.target.files && e.target.files[0]) {

      uploadNarrationFile(e.target.files[0]);

    }

  };

  // Run dynamic transcription synchronization

  const handleSyncTimings = (fromWizard = false) => {

    if (syncingTimings) return;

    setSyncingTimings(true);

    if (!fromWizard) setActiveTab('terminal');

    setLogs([]);

    const eventSource = new EventSource(getProjectUrl('/api/sync-timings'));

    eventSource.onmessage = (event) => {

      const data = JSON.parse(event.data);

      if (data.type === 'log') {

        setLogs(prev => [...prev, data.text]);

      } else if (data.type === 'complete') {

        setLogs(prev => [...prev, '\n=== SINCRONIZAÇÃO COMPLETA ===']);

        eventSource.close();

        setSyncingTimings(false);

        setShouldAutoAlign(true);
        setCreatorStep(4);
        toast.success(
          'Whisper concluído. Cada cena já tem os segundos da voz. No passo 4, coloque os assets manualmente e clique em Salvar Linha do Tempo.',
          { duration: 7000 },
        );

        fetchData();

      } else if (data.type === 'failed') {

        setLogs(prev => [...prev, `\n=== FALHA NA SINCRONIZAÇÃO (Código ${data.code}) ===`]);

        eventSource.close();

        setSyncingTimings(false);

        fetchData();

      }

    };

    eventSource.onerror = (err) => {

      setLogs(prev => [...prev, '[Erro Conexão] Sincronização interrompida. Verifique o servidor.']);

      eventSource.close();

      setSyncingTimings(false);

    };

  };

  // Fetch lists of available media assets in folder

  const fetchCreatorAssets = async () => {

    try {

      const res = await fetch(getProjectUrl('/api/assets/list'));

      if (res.ok) {

        setCreatorAssets(await res.json());

      }

    } catch (err) {

      console.error(err);

    }

  };

  // Run Gemini mapping of assets to blocks

  const applyFacelessPreset = useCallback((presetId: string) => {
    const preset = FACELESS_NICHE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setFacelessPresetId(presetId);
    setNicheInput(preset.niche);
    setFormatSelector(preset.format);
    setIdeationTab('ai');
    void saveConfigPatch({ narration_mode: 'master' }, { skipRefresh: true });
    toast.success(`Preset "${preset.label}" — canal sem rosto configurado.`);
  }, [saveConfigPatch]);

  const handleRunFacelessPipeline90 = useCallback(async () => {
    if (!canRunFacelessPipeline90(wordTranscripts, status)) {
      toast.error('Conclua a sincronização Whisper (passo 3) antes do Pipeline 90%.');
      return;
    }
    setFacelessPipelineBusy(true);
    setFacelessPipelineLog([]);
    try {
      await new Promise<void>((resolve, reject) => {
        const steps = 'stock,automap,bgm';
        const es = new EventSource(
          getProjectUrl(`/api/creator/run-pipeline?steps=${encodeURIComponent(steps)}`),
        );
        es.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data.type === 'log') {
              setFacelessPipelineLog((prev) => [...prev.slice(-30), String(data.text || '')]);
            }
            if (data.type === 'complete') {
              es.close();
              resolve();
            }
            if (data.type === 'error') {
              es.close();
              reject(new Error(data.message || 'Pipeline falhou'));
            }
          } catch {
            /* ignore malformed SSE */
          }
        };
        es.onerror = () => {
          es.close();
          reject(new Error('Conexão com o pipeline foi interrompida.'));
        };
      });
      await fetchData();
      setCreatorStep(5);
      toast.success('Pipeline 90% concluído — revise a timeline e avance para o render.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Pipeline 90% falhou.');
    } finally {
      setFacelessPipelineBusy(false);
    }
  }, [wordTranscripts, status, getProjectUrl, fetchData]);

  const handleAutoMapAssets = async () => {

    setCreatorLoading(true);

    try {

      const res = await fetch(getProjectUrl('/api/ai/auto-map-assets'), { method: 'POST' });

      const data = await res.json();

      if (res.ok) {

        setTimelineAssets(data.timeline_assets);
        setConfig((prev) => {
          if (!prev) return prev;
          return enrichTimelineAudioStarts(
            { ...prev, timeline_assets: data.timeline_assets },
            { force: true },
          );
        });

        if (data.warnings && data.warnings.length > 0) {

          toast.success(`Linha do tempo sincronizada com ${data.warnings.length} aviso(s).`);

          console.warn('Avisos da sincronização de assets:', data.warnings);

        } else {

          toast.success('Linha do tempo sincronizada com o roteiro!');

        }

        setCreatorStep(5);
        leaveGlobalViewForProject('status');
        fetchData();

      } else {

        toast.error('Erro ao mapear assets: ' + (data.error || 'Erro desconhecido'));

      }

    } catch (err) {

      console.error(err);

      toast.error('Conexão falhou ao mapear assets.');

    } finally {

      setCreatorLoading(false);

    }

  };

  useEffect(() => {

    if (creatorStep === 4) {

      fetchCreatorAssets();

    }

    if (creatorStep === 5 || creatorStep === 6) {
      fetchYoutubeMetadataCache();
    }

  }, [creatorStep, activeProject]);

  useEffect(() => {
    if ((activeTab !== 'upload' && activeTab !== 'editor') || !activeProject) return;
    void loadYoutubeMetadataFromCache();
    if (activeTab === 'upload') void fetchYoutubeThumbnailImages();
  }, [activeTab, activeProject]);

  useEffect(() => {
    setTimelineOpenBlocks({ 1: true });
  }, [activeProject]);

  const uploadMetadataReady = Boolean(
    youtubeMetadataParsed?.titles?.length
    || youtubeMetadataParsed?.description
    || youtubeMetadataParsed?.tags,
  );

  const progressBarChaptersText = useMemo(() => (
    ytChapters.trim()
    || youtubeMetadataParsed?.chapters?.trim()
    || String(config?.upload_metadata?.youtube?.chapters || '').trim()
    || ''
  ), [ytChapters, youtubeMetadataParsed?.chapters, config?.upload_metadata?.youtube?.chapters]);

  const progressBarMetadataReady = Boolean(
    uploadMetadataReady && (
      progressBarChaptersText.length > 0
      || (
        (config?.content_mode === 'LISTICLE' || Number(config?.rank_count) >= 3
          || (storyboardData?.list_items?.length ?? 0) >= 3)
        && (storyboardData?.list_items?.length ?? 0) >= 3
      )
    ),
  );

  const applyAiConfig = (parsedConfig: any) => {

    if (!config) return;

    const updated = {

      ...config,

      highlight_keywords: parsedConfig.highlight_keywords || config.highlight_keywords,

      bgm_mappings: parsedConfig.bgm_mappings || config.bgm_mappings,

      impact_texts: parsedConfig.impact_texts || config.impact_texts

    };

    saveConfig(updated);

    toast.success('Configuração recomendada pela IA aplicada com sucesso!');

  };

  const copyToClipboard = (text: string, section: string) => {

    navigator.clipboard.writeText(text);

    setCopiedSection(section);

    setTimeout(() => setCopiedSection(null), 2000);

  };

  // Keywords management

  const addKeyword = () => {

    if (!config || !newKeyword.trim()) return;

    const cleanKw = newKeyword.trim().toLowerCase();

    if ((config.highlight_keywords || []).includes(cleanKw)) return;

    const updated = {

      ...config,

      highlight_keywords: [...(config.highlight_keywords || []), cleanKw]

    };

    saveConfig(updated);

    setNewKeyword('');

  };

  const removeKeyword = (kw: string) => {

    if (!config) return;

    const updated = {

      ...config,

      highlight_keywords: (config.highlight_keywords || []).filter(k => k !== kw)

    };

    saveConfig(updated);

  };

  // Impact text update

  const handleSaveImpactText = (index: number) => {

    if (!config || !editingImpact) return;

    const updatedImpacts = [...(config.impact_texts || [])];

    updatedImpacts[index] = {

      ...updatedImpacts[index],

      text: editingImpact.text.toUpperCase()

    };

    const updated = { ...config, impact_texts: updatedImpacts };

    saveConfig(updated);

    setEditingImpact(null);

  };

  // Block music mapping change

  const handleMusicChange = (blockNum: number, fileName: string) => {

    if (!config) return;

    const withoutBlock = (config.bgm_mappings || []).filter(mapping => mapping.block !== blockNum);

    const updatedBgm = fileName

      ? [...withoutBlock, { block: blockNum, file: fileName }].sort((a, b) => a.block - b.block)

      : withoutBlock;

    const updated = { ...config, bgm_mappings: updatedBgm, bgm_mode: 'block', use_single_bgm: false };

    saveConfig(updated);

  };

  const handleEmotionMusicChange = async (segmentId: string, fileName: string, segMeta: any) => {

    if (!config) return;

    const withoutSegment = (config.bgm_emotion_mappings || []).filter(mapping => mapping.segment_id !== segmentId);

    const updatedMappings = fileName

      ? [...withoutSegment, {
          segment_id: segmentId,
          file: fileName,
          start: Number(segMeta.start) || 0,
          duration: Math.max(0.5, Number(segMeta.duration ?? (segMeta.end - segMeta.start)) || 0.5),
          emotion: segMeta.emotion,
          climax_mode: segMeta.climax_mode,
          duck_strength: segMeta.duck_strength,
          search_theme: segMeta.search_theme,
        }].sort((a, b) => a.start - b.start)

      : withoutSegment;

    await saveConfig({
      ...config,
      bgm_emotion_mappings: updatedMappings,
      bgm_mode: 'emotion',
      use_single_bgm: false,
      single_bgm: '',
    }, { skipRefresh: true });

    if (fileName) {
      toast.success(`${segmentId}: ${fileName} mapeada. Regenerar trilha antes do render.`, { duration: 2500 });
    }

  };

  const handleDeleteMusic = async (fileName: string) => {

    const file = musicFiles.find(item => item.name === fileName);

    setPendingMusicDelete(file || { name: fileName, sizeBytes: 0 });

  };

  const handleDeleteAllMusic = async () => {

    if (!musicFiles.length) return;

    setPendingMusicDelete({

      name: "__all__",

      sizeBytes: musicFiles.reduce((sum, file) => sum + file.sizeBytes, 0)

    });

  };

  const handleConfirmDeleteMusic = async () => {

    if (!pendingMusicDelete) return;

    const deletingAll = pendingMusicDelete.name === "__all__";

    if (audioPlayerRef.current) {

      audioPlayerRef.current.pause();

      audioPlayerRef.current.src = "";

      audioPlayerRef.current.load();

    }

    setPlayingMusic(null);

    setDeletingMusic(true);

    try {

      const res = await fetch(getProjectUrl(deletingAll ? '/api/music/delete-all' : '/api/music/delete'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: deletingAll ? JSON.stringify({}) : JSON.stringify({ filename: pendingMusicDelete.name })

      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {

        toast.success(deletingAll ? `${data.deleted?.length || 0} trilhas excluídas.` : `Trilha ${pendingMusicDelete.name} excluída.`);

        setPendingMusicDelete(null);

        fetchData();

      } else {

        toast.error(data.error || 'Erro ao excluir trilha.');

      }

    } catch (err) {

      toast.error('Falha de conexão ao excluir trilha.');

    } finally {

      setDeletingMusic(false);

    }

  };

  // Mix background music

  const mixBGM = async (fromWizard = false) => {

    setMixing(true);

    const toastId = toast.loading('Regenerando trilha sonora...');

    setLogs(prev => [...prev, "[Mixer] Iniciando mixagem das trilhas sonoras..."]);

    try {

      const res = await fetch(getProjectUrl('/api/music/mix'), { method: 'POST' });

      const data = await res.json().catch(() => ({}));

      if (Array.isArray(data.prepLogs)) {
        for (const line of data.prepLogs) {
          setLogs(prev => [...prev, `[Mixer] ${line}`]);
        }
      }

      if (res.ok) {

        setLogs(prev => [...prev, data.log || '', "[Mixer] Sucesso! trilha_documentario.mp3 gerada."]);

        if (!fromWizard) setActiveTab('terminal');

        const emotionCount = config?.bgm_emotion_mappings?.filter((m) => m.file)?.length || 0;
        toast.success(
          activeBgmMode === 'emotion' && emotionCount > 0
            ? `Trilha regenerada com ${emotionCount} segmento(s): ${config?.bgm_emotion_mappings?.map((m) => m.file).join(', ')}`
            : 'Trilha sonora regenerada com sucesso!',
          { id: toastId, duration: 5000 },
        );

        fetchData();

      } else {

        const detail = data.details || data.log || '';

        setLogs(prev => [...prev, `[ERRO Mixer] ${data.error || 'Falha na mixagem'}`, detail]);

        toast.error(
          data.error
            ? `${data.error}${detail ? ` — veja o Terminal para detalhes.` : ''}`
            : 'Erro ao regenerar trilha sonora.',
          { id: toastId, duration: 6000 },
        );

      }

    } catch (err) {

      setLogs(prev => [...prev, `[ERRO Mixer] Conexão falhou: ${err}`]);

      toast.error('Falha de conexão ao regenerar trilha sonora.', { id: toastId });

    } finally {

      setMixing(false);

    }

  };

  const confirmPendingRender = () => {
    if (!pendingRender) return;
    const job = pendingRender;
    setPreRenderModalOpen(false);
    setPendingRender(null);
    void triggerRender(
      job.mode,
      job.fromWizard,
      job.withoutImpactTitles,
      job.useHyperframes,
      job.isProres,
      job.previewSeconds,
      job.resolution,
      true,
      job.sampleMode,
    );
  };

  // SSE video rendering

  const triggerRender = async (
    mode: 'standard' | 'highlighted' | 'remotion' | 'remotion-pro',
    fromWizard = false,
    withoutImpactTitles = false,
    useHyperframes = false,
    isProres = false,
    previewSeconds = 0,
    resolution: '1080p' | '2k' = effectiveRenderResolution,
    skipAdviceCheck = false,
    sampleMode = false,
  ) => {
    if (rendering) return;

    if (!skipAdviceCheck && !sampleMode) {
      try {
        const res = await fetch(getProjectUrl('/api/projects/video-quality'));
        if (res.ok) {
          const report: VideoQualityReport = await res.json();
          setVideoQuality(report);
          if (report.workshop?.staged) {
            toast(
              `Workshop: proposta para skill "${report.workshop.record?.skill || 'estúdio'}" — revise em Studio Agents`,
              { duration: 6000 },
            );
          }
          if (report.preRenderAdvice) {
            setPendingRender({
              mode,
              fromWizard,
              withoutImpactTitles,
              useHyperframes,
              isProres,
              previewSeconds,
              resolution,
              sampleMode,
            });
            setPreRenderModalOpen(true);
            return;
          }
        }
      } catch {
        /* proceed if quality check unavailable */
      }
    }

    const needsOverlayPlan = mode === 'remotion' || mode === 'remotion-pro';
    let effectiveGeminiChrome = geminiBrowserMode;
    let overlayPlanSucceeded = !needsOverlayPlan;
    let overlayPlanToken = '';

    setRendering(true);
    setRenderProgress({ percent: 0, phase: 'Inicializando...' });
    if (!fromWizard) setActiveTab('terminal');
    setLogs([]);

    if (needsOverlayPlan) {
      try {
        const settingsRes = await fetch(getProjectUrl('/api/ai/settings'));
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          effectiveGeminiChrome = !!settings.gemini_browser_mode;
        }
      } catch {
        /* usa estado local */
      }

      const overlayPlanLabel = useHyperframes ? 'HyperFrames AI' : 'Remotion PRO';
      setRenderProgress({ percent: 0, phase: `Gemini: planejando overlays ${overlayPlanLabel}…` });
      setLogs([
        `[Dashboard] Planejamento obrigatório antes do render (${overlayPlanLabel}).`,
        effectiveGeminiChrome
          ? '[Dashboard] Aguardando resposta do Gemini no Chrome…'
          : '[Dashboard] Consultando IA para overlays (API)…',
      ]);
      let overlayWaitSec = 0;
      const overlayProgressTimer = window.setInterval(() => {
        overlayWaitSec += 5;
        setRenderProgress({ percent: 0, phase: `Gemini: planejando overlays (${overlayWaitSec}s)…` });
        setLogs((prev) => [...prev, `[Dashboard] Aguardando overlays (${overlayWaitSec}s) — render bloqueado até concluir.`]);
      }, 5000);
      try {
        const { ok, data } = await postAi('/api/render/plan-overlays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hyperframes: useHyperframes === true,
            require_browser: effectiveGeminiChrome,
          }),
        });
        if (!ok || data.needs_browser) {
          setRendering(false);
          setRenderProgress(null);
          const stale = (data as { staleResponse?: boolean }).staleResponse;
          toast.error(
            data.error
            || (stale
              ? 'Gemini ainda está gerando — resposta antiga ignorada. Aguarde na aba gemini.google.com e clique Render de novo.'
              : effectiveGeminiChrome
                ? 'Gemini no Chrome não respondeu. Deixe gemini.google.com aberto e tente de novo.'
                : 'Falha ao planejar overlays. Ative Gemini no Chrome ou configure a API.'),
          );
          return;
        }
        if (!data.overlayCount || data.overlayCount < 1) {
          setRendering(false);
          setRenderProgress(null);
          toast.error(data.error || 'Gemini não gerou overlays válidos. Reabra o Chrome e tente o render novamente.');
          return;
        }
        overlayPlanToken = String((data as { planToken?: string }).planToken || '').trim();
        if (!overlayPlanToken) {
          setRendering(false);
          setRenderProgress(null);
          toast.error('Planejamento sem token de sessão — Gemini não concluiu. Tente novamente.');
          return;
        }
        overlayPlanSucceeded = true;
        setLogs((prev) => [
          ...prev,
          `[Dashboard] ${data.overlayCount} overlays via ${(data as { source?: string }).source || 'IA'} — token OK, iniciando render.`,
        ]);
      } catch (err: any) {
        setRendering(false);
        setRenderProgress(null);
        toast.error(err?.message || 'Conexão falhou ao planejar overlays.');
        return;
      } finally {
        window.clearInterval(overlayProgressTimer);
      }
    }

    if (needsOverlayPlan && !overlayPlanSucceeded) {
      setRendering(false);
      setRenderProgress(null);
      toast.error('Render cancelado: planejamento de overlays não concluído.');
      return;
    }

    if (fromWizard) {
      if (effectiveGeminiChrome) {
        setRenderProgress({ percent: 0, phase: 'Gemini: metadados do vídeo…' });
        setLogs((prev) => [...prev, '[Dashboard] Consultando Gemini no Chrome para metadados…']);
        const metaOk = await generateYoutubeMetadata({ silent: true, keepExistingOnError: true });
        if (metaOk) {
          setLogs((prev) => [...prev, '[Dashboard] Metadados YouTube gerados via Gemini no Chrome.']);
        } else {
          setLogs((prev) => [...prev, '[Dashboard] Metadados não concluídos — render segue; gere metadados manualmente depois.']);
        }
      } else {
        void generateYoutubeMetadata({ silent: true, keepExistingOnError: true }).then((ok) => {
          if (ok) toast.success('Metadados (título, descrição, tags) gerados em paralelo ao render.');
        });
      }
    }

    setRenderProgress({ percent: 0, phase: 'Inicializando render…' });

    let queryParams = [];
    if (withoutImpactTitles) queryParams.push("withoutImpactTitles=1");
    queryParams.push(useHyperframes ? "hyperframes=1" : "hyperframes=0");
    if (needsOverlayPlan) {
      queryParams.push('require_overlay_plan=1');
      if (overlayPlanToken) queryParams.push(`overlay_plan_token=${encodeURIComponent(overlayPlanToken)}`);
    }
    if (isProres) queryParams.push("prores=1");
    if (sampleMode) queryParams.push('sample=1');
    else if (previewSeconds > 0) queryParams.push(`preview=${previewSeconds}`);
    if (resolution === '2k') queryParams.push('resolution=2k');
    const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

    // Salvar config com audio_start atualizado ANTES do render
    if (config) {
      await saveTimelinePatch(config, { skipRefresh: true });
    }

    const eventSource = new EventSource(getProjectUrl(`/api/render/${mode}${queryString}`));

    eventSource.onmessage = (event) => {

      const data = JSON.parse(event.data);

      if (data.type === 'log') {

        setLogs(prev => [...prev, data.text]);

        if (data.text.startsWith('[PROGRESSO]')) {

          const matchPhase = data.text.match(/\[PROGRESSO\] (FASE \d+\/\d+ - .+)/);

          const matchPct = data.text.match(/\[PROGRESSO\] (\d+)%/);

          setRenderProgress(prev => {

            const current = prev || { percent: 0, phase: 'Processando...' };

            if (matchPhase) return { ...current, phase: matchPhase[1] };

            if (matchPct) return { ...current, percent: parseInt(matchPct[1], 10) };

            return current;

          });

        }

      } else if (data.type === 'complete') {

        setLogs(prev => [...prev, `\n=== RENDERIZAÇÃO CONCLUÍDA COM SUCESSO (Código ${data.code}) ===`]);

        eventSource.close();

        setRendering(false);

        setRenderProgress(prev => prev ? { ...prev, percent: 100, phase: 'Concluído!' } : null);

        setTimeout(() => setRenderProgress(null), 4000);

        fetchData();

        if (fromWizard) {
          void fetchYoutubeMetadataCache();
          toast.success('Render concluído! Revise títulos e descrição no passo 6.');
        }

      } else if (data.type === 'failed') {

        setLogs(prev => [...prev, `\n=== ERRO NA RENDERIZAÇÃO (Código ${data.code}) ===`]);

        eventSource.close();

        setRendering(false);

        setRenderProgress(prev => prev ? { ...prev, phase: 'Erro na renderização!' } : null);

        setTimeout(() => setRenderProgress(null), 5000);

        fetchData();

      }

    };

    eventSource.onerror = () => {

      setLogs((prev) => {
        const last = prev[prev.length - 1] || '';
        if (last.includes('Planejamento de overlays') || last.includes('Token de planejamento')) {
          return [...prev, '[Dashboard] Render bloqueado — veja as linhas acima (overlays/Gemini).'];
        }
        return [...prev, '[Erro Conexão] SSE encerrado inesperadamente.'];
      });

      eventSource.close();

      setRendering(false);

      setRenderProgress((prev) => (prev ? { ...prev, phase: 'Render interrompido' } : null));

      setTimeout(() => setRenderProgress(null), 5000);

    };

  };

  const getFormatBytes = (bytes: number) => {

    if (bytes === 0) return '0 Bytes';

    const k = 1024;

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];

  };

  const renderRichTimelineEditor = (options?: { hideAutoMap?: boolean; wizardManualMode?: boolean }) => {
    if (!config) return null;
    return (
      <Suspense fallback={<TabPanelFallback label="Carregando timeline..." />}>
        <RichTimelineEditor
      hideAutoMap={options?.hideAutoMap === true}
      wizardManualMode={options?.wizardManualMode === true}
      config={config}
      status={status}
      activeProject={activeProject}
      selectedProject={selectedProject}
      storyboardData={storyboardData}
      wordTranscripts={wordTranscripts}
      timelineNeedsWhisperSync={timelineNeedsWhisperSync}
      timelineScenesNeedRepair={timelineScenesNeedRepair}
      timelineOpenBlocks={timelineOpenBlocks}
      timelinePreviewZoom={timelinePreviewZoom}
      timelineSelectedClips={timelineSelectedClips}
      videoFileDurations={videoFileDurations}
      visualBlockTimings={visualBlockTimings}
      progressBarChaptersText={progressBarChaptersText}
      progressBarMetadataReady={progressBarMetadataReady}
      savingBlockProgressBar={savingBlockProgressBar}
      logoStatus={logoStatus}
      creatorLoading={creatorLoading}
      syncingTimings={syncingTimings}
      generatingOverlays={generatingOverlays}
      playingMusic={playingMusic}
      playingNarration={playingNarration}
      setConfig={setConfig}
      setTimelineOpenBlocks={setTimelineOpenBlocks}
      setTimelinePreviewZoom={setTimelinePreviewZoom}
      setTimelineSelectedClips={setTimelineSelectedClips}
      setVideoFileDurations={setVideoFileDurations}
      setWordTranscripts={setWordTranscripts}
      setActiveTab={setActiveTab}
      setSavingBlockProgressBar={setSavingBlockProgressBar}
      getAssetDuration={getAssetDuration}
      getAssetNarration={getAssetNarration}
      getDynamicAssetWords={getDynamicAssetWords}
      getAssetUrl={getAssetUrl}
      getMusicUrl={getMusicUrl}
      getProjectUrl={getProjectUrl}
      handleAutoMapAssets={handleAutoMapAssets}
      handleGenerateAiOverlays={handleGenerateAiOverlays}
      handleRepairProjectVisualPrompts={handleRepairProjectVisualPrompts}
      handleSaveConfig={handleSaveConfig}
      handleSyncTimings={handleSyncTimings}
      handleUploadSceneAsset={handleUploadSceneAsset}
      alignAllBlocksToSpeech={alignAllBlocksToSpeech}
      alignBlockAssetsToSpeech={alignBlockAssetsToSpeech}
      addTimelineAsset={addTimelineAsset}
      deleteTimelineAsset={deleteTimelineAsset}
      moveTimelineAsset={moveTimelineAsset}
      updateTimelineAssetField={updateTimelineAssetField}
      bulkDeleteTimelineClips={bulkDeleteTimelineClips}
      toggleTimelineClipSelection={toggleTimelineClipSelection}
      togglePlayMusic={togglePlayMusic}
      togglePlaySceneNarration={togglePlaySceneNarration}
      saveConfigPatch={saveConfigPatch}
      syncCreatorStoryboard={syncCreatorStoryboard}
      fetchData={fetchData}
      fetchStatus={fetchStatusAndOutputs}
      suggestBlockProgressIcons={suggestBlockProgressIcons}
      syncBlockProgressTitles={syncBlockProgressTitles}
        />
      </Suspense>
    );
  };


  const openCreatorTab = () => {
    setActiveTab('creator');
    const session = loadWizardSession();
    if (session?.creatorStep && session.creatorStep > 1) {
      setCreatorStep(session.creatorStep);
    }
  };

  const projectWorkspaceBar =
    !isGlobalViewTab(activeTab) ? (
      <div className="lumiera-project-bar">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between min-w-0">
          <div className="min-w-0 flex-1">
            <p className="lumiera-section-label">Projeto ativo</p>
            <p className="text-sm font-bold text-white text-balance-safe break-words">{activeProject}</p>
          </div>
          <nav className="lumiera-tab-nav">
            {PROJECT_WORKSPACE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const help = tab.helpId ? SECTION_HELP[tab.helpId] : null;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`lumiera-tab-btn ${isActive ? 'dash-tab-active' : ''}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-snug">{tab.label}</span>
                  {help && (
                    <span
                      className="inline-flex"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <SettingHelpTip title={help.title} align="start">
                        {help.body}
                      </SettingHelpTip>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    ) : null;

  const {
    creatorTabProps,
    aiTabProps,
    uploadTabProps,
    editorTabProps,
    settingsTabProps,
    statusTabProps,
    timelineTabProps,
    musicTabPanelProps,
    homeTabProps,
    workflowTabProps,
    sceneTimingTabProps,
    terminalTabProps,
  } = buildAppTabPropBundles({
    activeBgmMode,
    activeProject,
    activeTab,
    addKeyword,
    addSceneAtEnd,
    aiProvider,
    aiProviderBadge,
    applyAiConfig,
    applyFacelessPreset,
    applyMetadataToUpload,
    applyProductionPatchToConfig,
    applyVisualPatchToConfig,
    applyWizardSessionPatch,
    autoSoundtracking,
    bgmBlockRows,
    bgmEmotionRows,
    bgmSuggestions,
    brandPanelProps,
    canvaClientId,
    canvaClientSecret,
    canvaThumbnailsLoading,
    chatEndRef,
    chatInput,
    chatLoading,
    chatMessages,
    config,
    copiedSection,
    copyToClipboard,
    creatorIdeasBundle,
    creatorLoading,
    creatorLoadingMode,
    creatorProjectName,
    creatorScenesNeedRepair,
    creatorStep,
    customBlocks,
    customHooks,
    customIdeaBlocks,
    customIdeaEmotion,
    customIdeaHook,
    customIdeaPromise,
    customIdeaTitle,
    customOutline,
    customTitle,
    debounceSaveStoryboard,
    deleteScene,
    downloadingEpidemicId,
    dragActive,
    editingImpact,
    editorSubTab,
    editorialIdeaImport,
    facelessPipelineBusy,
    facelessPipelineLog,
    facelessPresetId,
    effectiveRenderResolution,
    epidemicKeyInput,
    epidemicSearchQuery,
    epidemicSearchType,
    expandedBlocks,
    fetchData,
    fetchTitleExperiment,
    fetchTitleExperimentAnalytics,
    fetchUploadStatus,
    fetchVideoQuality,
    formatSelector,
    geminiBrowserMode,
    geminiExtensionDiag,
    geminiExtensionReady,
    geminiExtensionTesting,
    geminiKeyCount,
    geminiKeysInput,
    geminiModel,
    geminiModelOptions,
    generateYoutubeMetadata,
    generatedScriptData,
    generatingOverlays,
    getAssetDuration,
    getAssetUrl,
    getFormatBytes,
    getMusicUrl,
    getProjectUrl,
    getTotalVideoDuration,
    globalBlockGap,
    globalDebugOverlay,
    globalFps,
    globalMusicVolume,
    globalRenderResolution,
    globalUseRemotion,
    handleApplyTitleVariant,
    handleApproveNarrationAndGenerateScript,
    handleAutoSoundtrack,
    handleCaptureGeminiNarration,
    handleClearProjectRenderResolution,
    handleDeleteAllMusic,
    handleDeleteMusic,
    handleDownloadEpidemic,
    handleDrag,
    handleDrop,
    handleEmotionMusicChange,
    handleEnhanceVisualPrompts,
    handleCompileDirectingBriefs,
    handleGenerateSeedanceT2v,
    handleUpdateCreatorDirectingBrief,
    handleUpdateCreatorSeedanceRef,
    directingSceneIndex,
    seedanceT2vJobs,
    handleEvaluateScriptChecklist,
    handleFileInput,
    handleFixYoutubeMetadata,
    handleGenerateAiOverlays,
    handleGenerateCanvaThumbnails,
    handleGenerateFullScript,
    handleGenerateIdeas,
    handleRunFacelessPipeline90,
    handleGenerateListicleScript,
    handleGenerateNarration,
    handleGenerateNarrationFromImport,
    handleGenerateYoutubeMetadata,
    handleGenerateYoutubeThumbnailImages,
    handleMusicChange,
    handleNotebooklmImprove,
    handleNotebooklmImproveNarrationDraft,
    handlePlanBgmEmotions,
    handlePostUploadComplete,
    handlePreRenderAutoFix,
    handleRelinkYoutube,
    handleRemoveSceneAsset,
    handleSaveAiSettings,
    handleSaveApiKeys,
    handleSaveConfig,
    handleSaveGlobalRenderConfig,
    handleSaveImpactText,
    handleSaveProjectRenderResolution,
    handleSaveStoryboard,
    handleSearchEpidemic,
    handleSendChatMessage,
    handleStartTitleExperiment,
    handleSuggestBGM,
    handleSuggestListicleRankings,
    handleSyncTimings,
    handleTestSupermemory,
    handleUpdateCreatorScene,
    handleUploadSceneAsset,
    hasApiKey,
    hasEpidemicKey,
    hasNvidiaKey,
    hasOpenRouterKey,
    hasPexelsKey,
    hasPixabayKey,
    hasSupermemoryKey,
    hasXaiKey,
    ideasData,
    ideationTab,
    igAccessToken,
    igAccountId,
    igAppId,
    igAppSecret,
    igCaption,
    insertSceneAfter,
    isShortVideo,
    kwCaption,
    leaveGlobalViewForProject,
    listNiche,
    listTopic,
    listicleHudStyle,
    listicleIdeasData,
    loadEditorProject,
    loadingStoryboard,
    logs,
    mixBGM,
    mixing,
    moveScene,
    narrationBlockPhrases,
    narrationBlockScript,
    narrationDraft,
    narrationNotebooklmEnriched,
    narrationProjectName,
    narrationStrategy,
    narrationTaggedDraft,
    newKeyword,
    nicheInput,
    notebooklmImproving,
    notebooklmStatus,
    notebooklmSuggestions,
    nvidiaKeyInput,
    openCanvaThumbnailDesigner,
    openCreatorTab,
    openrouterKeyInput,
    outputs,
    pexelsKeyInput,
    pickProductionConfig,
    pickVisualConfig,
    pipelineRunning,
    pixabayKeyInput,
    planningBgmEmotions,
    playingMusic,
    postAi,
    preRenderFixingId,
    prepareUploadForPublish,
    productionDraftToApiPatch,
    projectDataLoading,
    projectRenderResolution,
    projects,
    rankCount,
    rankOrder,
    recentProjects,
    refreshGeminiExtensionStatus,
    removeKeyword,
    renderProgress,
    renderResolutionLabel,
    renderRichTimelineEditor,
    rendering,
    resetCreatorWizard,
    resolutionConfigScope,
    safeEpidemicResults,
    safeMusicFiles,
    saveConfig,
    saveConfigPatch,
    saveCreatorStoryboard,
    saveTimelinePatch,
    saveUploadMetadataToProject,
    saveWizardSession,
    savingAiSettings,
    savingApiKeys,
    savingGlobalConfig,
    savingProductionConfig,
    savingProjectResolution,
    savingVisualConfig,
    searchMusic,
    searchingEpidemic,
    selectThumbnailForUpload,
    selectedIdeaIndex,
    selectedListicleIdeaIndex,
    selectedPlatforms,
    selectedProject,
    selectedUploadVideo,
    setActiveTab,
    setAiProvider,
    setCanvaClientId,
    setCanvaClientSecret,
    setChatInput,
    setConfig,
    setCreatorProjectName,
    setCreatorStep,
    setCustomBlocks,
    setCustomHooks,
    setCustomIdeaBlocks,
    setCustomIdeaEmotion,
    setCustomIdeaHook,
    setCustomIdeaPromise,
    setCustomIdeaTitle,
    setCustomOutline,
    setCustomTitle,
    setEditingImpact,
    setEditorSubTab,
    setEditorialIdeaImport,
    setEpidemicKeyInput,
    setEpidemicSearchQuery,
    setEpidemicSearchResults,
    setEpidemicSearchType,
    setExpandedBlocks,
    setFormatSelector,
    setGeminiBrowserMode,
    setGeminiExtensionTesting,
    setGeminiKeysInput,
    setGeminiModel,
    setGlobalBlockGap,
    setGlobalDebugOverlay,
    setGlobalFps,
    setGlobalMusicVolume,
    setGlobalRenderResolution,
    setGlobalUseRemotion,
    setIdeasData,
    setIdeationTab,
    setIgAccessToken,
    setIgAccountId,
    setIgAppId,
    setIgAppSecret,
    setIgCaption,
    setKwCaption,
    setListNiche,
    setListTopic,
    setListicleHudStyle,
    setLogs,
    setNarrationDraft,
    setNarrationTaggedDraft,
    setNewKeyword,
    setNicheInput,
    setNvidiaKeyInput,
    setOpenRouterKeyInput,
    setPendingOutputDelete,
    setPexelsKeyInput,
    setPipelineRunning,
    setPixabayKeyInput,
    setPreviewVideoUrl,
    setProjectRenderResolution,
    setRankCount,
    setRankOrder,
    setResolutionConfigScope,
    setSavingProductionConfig,
    setSavingVisualConfig,
    setSearchMusic,
    setSelectedIdeaIndex,
    setSelectedListicleIdeaIndex,
    setSelectedPlatforms,
    setSelectedProject,
    setSelectedUploadVideo,
    setSettingsSection,
    setStoryboardData,
    setSupermemoryBaseUrlInput,
    setSupermemoryEnabled,
    setSupermemoryKeyInput,
    setTaggedNarrations,
    setThumbnailExperiment,
    setTitleAbSelected,
    setTitleExperimentLoading,
    setTitleExperimentVideoId,
    setTtCaption,
    setUploadLogs,
    setUploadProgress,
    setUploadSuccess,
    setUploading,
    setUseNotebooklm,
    setVideoFileDurations,
    setXaiKeyInput,
    setYtCategoryId,
    setYtChapters,
    setYtClientId,
    setYtClientSecret,
    setYtDescription,
    setYtPinnedComment,
    setYtPrivacy,
    setYtPublishAt,
    setYtTags,
    setYtTitle,
    settingsSection,
    showNarrationReview,
    status,
    storyboardData,
    suggestingBGM,
    supermemoryBaseUrlInput,
    supermemoryEnabled,
    supermemoryKeyInput,
    syncCreatorStoryboard,
    syncingTimings,
    taggedNarrations,
    terminalEndRef,
    testingSupermemory,
    timelineAssets,
    titleAbSelected,
    titleExperiment,
    titleExperimentAnalytics,
    titleExperimentLoading,
    titleExperimentRankings,
    titleExperimentVideoId,
    titleExperimentWinner,
    titleRetention,
    togglePlayMusic,
    triggerRender,
    ttCaption,
    updateSceneField,
    uploadLogs,
    uploadMetadataReady,
    uploadProgress,
    uploadStatus,
    uploadSuccess,
    uploadedScenes,
    uploading,
    uploadingNarration,
    useNotebooklm,
    videoFileDurations,
    videoQuality,
    visualDraftToApiPatch,
    wizardSavedAtLabel,
    wordTranscripts,
    xaiKeyInput,
    youtubeChannelAlerts,
    youtubeLoading,
    youtubeMetadata,
    youtubeMetadataFormat,
    youtubeMetadataParsed,
    youtubeMetadataStrategy,
    youtubeThumbnailsGenerated,
    youtubeThumbnailsLoading,
    ytCategoryId,
    ytChapters,
    ytClientId,
    ytClientSecret,
    ytDescription,
    ytPinnedComment,
    ytPrivacy,
    ytPublishAt,
    ytTags,
    ytThumbnailVariant,
    ytTitle,
  });

  return (

    <>
      <AiJobProgressBar />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'dash-toast dash-toast-primary',
          style: { background: '#0c1018', color: '#fff', border: '1px solid #1a2230', borderLeft: '3px solid #8280fd' },
        }}
      />

      {preRenderModalOpen && videoQuality?.preRenderAdvice && pendingRender && (
        <PreRenderAdviceModal
          advice={videoQuality.preRenderAdvice}
          renderLabel={RENDER_MODE_LABELS[pendingRender.mode]}
          onConfirm={confirmPendingRender}
          onCancel={() => {
            setPreRenderModalOpen(false);
            setPendingRender(null);
          }}
          onGoToTab={(tab) => {
            setPreRenderModalOpen(false);
            setActiveTab(tab);
          }}
          onAutoFix={handlePreRenderAutoFix}
          fixingFixId={preRenderFixingId}
        />
      )}

      <AppShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeProject={activeProject}
        projects={projects}
        recentProjects={recentProjects}
        onSelectProject={handleSelectProject}
        onOpenCreator={openCreatorTab}
        formattedHeaderDate={formattedHeaderDate}
        headerTemperatureLabel={headerTemperatureLabel}
        youtubeAlertCount={youtubeChannelAlerts?.badgeCount ?? 0}
        resurrectorAlertCount={resurrectorScheduler.badgeCount}
        onRefresh={fetchData}
        projectBar={projectWorkspaceBar}
      >
        <Suspense fallback={<TabPanelFallback label="Carregando painel..." />}>
          <AppTabPanels
            activeTab={activeTab}
            activeProject={activeProject}
            config={config}
            projects={projects}
            recentProjects={recentProjects}
            nicheInput={nicheInput}
            geminiBrowserMode={geminiBrowserMode}
            aiProvider={aiProvider}
            youtubeChannelAlerts={youtubeChannelAlerts}
            resurrectorAlerts={resurrectorScheduler.alerts}
            getProjectUrl={getProjectUrl}
            postAi={postAi}
            setActiveTab={setActiveTab}
            setSettingsSection={setSettingsSection}
            handleSelectProject={handleSelectProject}
            handleDeleteProject={handleDeleteProject}
            handleApplyYoutubeStudioIdea={handleApplyYoutubeStudioIdea}
            handleRelinkYoutube={handleRelinkYoutube}
            handleScheduleFromHeatmap={handleScheduleFromHeatmap}
            resolveBrowserResponse={resolveBrowserResponse}
            setYoutubeChannelAlerts={setYoutubeChannelAlerts}
            setNewProjectFormat={setNewProjectFormat}
            setNewProjectNiche={setNewProjectNiche}
            setShowCreateModal={setShowCreateModal}
            creatorTabProps={creatorTabProps}
            aiTabProps={aiTabProps}
            uploadTabProps={uploadTabProps}
            editorTabProps={editorTabProps}
            settingsTabProps={settingsTabProps}
            statusTabProps={statusTabProps}
            timelineTabProps={timelineTabProps}
            musicTabPanelProps={musicTabPanelProps}
            homeTabProps={homeTabProps}
            workflowTabProps={workflowTabProps}
            sceneTimingTabProps={sceneTimingTabProps}
            terminalTabProps={terminalTabProps}
          />
        </Suspense>
      </AppShell>

      <AppOverlays
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        chatMessages={chatMessages}
        chatLoading={chatLoading}
        chatInput={chatInput}
        setChatInput={setChatInput}
        handleSendChatMessage={handleSendChatMessage}
        hasApiKey={hasApiKey}
        chatEndRef={chatEndRef}
        aiProviderBadge={aiProviderBadge}
        setActiveTab={setActiveTab}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        newProjectFormat={newProjectFormat}
        setNewProjectFormat={setNewProjectFormat}
        newProjectNiche={newProjectNiche}
        setNewProjectNiche={setNewProjectNiche}
        handleCreateProject={handleCreateProject}
        pendingMusicDelete={pendingMusicDelete}
        setPendingMusicDelete={setPendingMusicDelete}
        deletingMusic={deletingMusic}
        handleConfirmDeleteMusic={handleConfirmDeleteMusic}
        musicFiles={musicFiles}
        getFormatBytes={getFormatBytes}
        pendingOutputDelete={pendingOutputDelete}
        setPendingOutputDelete={setPendingOutputDelete}
        deletingOutput={deletingOutput}
        handleDeleteOutputVideo={handleDeleteOutputVideo}
        previewVideoUrl={previewVideoUrl}
        setPreviewVideoUrl={setPreviewVideoUrl}
        renderProgress={renderProgress}
        setRenderProgress={setRenderProgress}
      />

    </>

  );

}