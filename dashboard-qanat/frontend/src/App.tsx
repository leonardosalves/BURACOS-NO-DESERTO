import toast, { Toaster } from 'react-hot-toast';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { 

  Video, 

  Image,

  Music, 

  Settings, 

  Terminal, 

  Download, 

  RefreshCw, 

  Play, 

  CheckCircle, 

  AlertTriangle, 

  Save, 

  FileText,

  Volume2,

  Tv,

  Layers,

  Sparkles,

  Search,

  ExternalLink,

  Copy,

  Check,

  Send,

  Lock,

  Chrome,

  MessageSquare,

  Plus,

  Folder,
  Smartphone,
  Share2,

  ChevronDown,

  ChevronUp,

  ChevronRight,

  Trash2,

  Upload,

  X,

  Bot,

  Pause,

  CalendarDays,

  Thermometer,

  Wand2,

} from 'lucide-react';

import { buildTaggedNarration, taggedNarrationMeta, type TaggedNarrationPlatform } from './taggedNarration';
import { ListicleCreatorStep } from './ListicleCreatorStep';
import { WorkflowToolkit } from './WorkflowToolkit';
import { useGeminiBrowserBridge } from './GeminiBrowserBridge';
import { fetchGeminiAi } from './geminiAiFetch';
import { useGeminiBrowserResolver } from './useGeminiBrowserResolver';
import { diagnoseGeminiExtension, isGeminiExtensionAvailable, resetGeminiExtensionCache } from './geminiExtensionBridge';
import { TabErrorBoundary } from './TabErrorBoundary';
import { SettingsSectionNav, type SettingsSection } from './SettingsSectionNav';
import { SettingsApiKeys } from './SettingsApiKeys';
import { IntegrationSettings } from './IntegrationSettings';
import { warnLongListicleTitles } from './ListicleHudPreview';
import {
  applySplitNarrationToBlockAssets,
  findBoundedNarrationMatch,
  getAssetNarrationText as resolveAssetNarrationText,
  getBlockNarrationText as resolveBlockNarrationText,
  getBlockTimeBounds as resolveBlockTimeBounds,
  narrationCacheKey,
  swapBlockVisualPromptsInStoryboard,
  type NarrationSyncContext,
} from './timelineNarrationSync';
import { sanitizeTimelineAssets } from './timelineAssetSanitize';
import { NarrationReviewPanel } from './NarrationReviewPanel';
import type { ListicleIdeasResponse } from './ListicleRankingIdeas';

interface BGM {

  block: number;

  file: string;

}

interface ImpactText {

  block: number;

  start_offset: number;

  end_offset: number;

  text: string;

}

interface ConfigData {

  highlight_keywords: string[];

  bgm_mappings: BGM[];

  impact_texts: ImpactText[];

  timeline_assets?: Record<string, any[]>;

  block_phrases?: { block: number; phrase: string }[];

  aspect_ratio?: '16:9' | '9:16';
  render_resolution?: '1080p' | '2k';

  use_single_bgm?: boolean;

  single_bgm?: string;
  upload_metadata?: any;
  youtube_channel?: {
    channel_url?: string;
    channel_name?: string;
    subscriber_count?: string;
  };

}

interface WorkspaceStatus {

  workspace: string;

  assets_count: number;

  has_narration: boolean;

  has_soundtrack: boolean;

  has_highlight_clip: boolean;

  has_config: boolean;

  block_timings?: { starts: number[]; durations: number[]; total_duration: number } | null;

}

interface OutputVideo {

  name: string;

  sizeBytes: number;

  modifiedAt: string;

  renderEngine?: 'remotion' | 'standard';

  renderEngineLabel?: string;

}

interface MusicFile {

  name: string;

  sizeBytes: number;

}

interface HeaderWeather {

  temperature: number | null;

}

interface VideoQualityIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

interface VideoQualityReport {
  ok: boolean;
  score: number;
  issues: VideoQualityIssue[];
  plan?: { format: string; maxOverlays: number; profile: string };
  preset?: string | null;
  epidemicMood?: string | null;
}

type ProjectListItem = { name: string; path: string; format?: 'LONGO' | 'SHORTS'; title?: string; niche?: string };

const RECENT_PROJECTS_KEY = 'qanat_recent_projects';

const PROJECT_WORKSPACE_TABS = [
  { id: 'status' as const, label: 'Render', icon: Tv },
  { id: 'workflow' as const, label: 'Workflow e Tarefas', icon: Wand2 },
  { id: 'timeline' as const, label: 'Roteiro e Tags', icon: Layers },
  { id: 'music' as const, label: 'Trilha BGM', icon: Music },
  { id: 'ai' as const, label: 'IA · Metadados', icon: Sparkles },
  { id: 'upload' as const, label: 'Upload', icon: Share2 },
  { id: 'editor' as const, label: 'Editor', icon: Settings },
  { id: 'terminal' as const, label: 'Terminal', icon: Terminal },
];

const parseDurationSeconds = (duration: unknown) => {

  if (typeof duration === 'number' && Number.isFinite(duration)) return duration;

  if (typeof duration !== 'string') return null;

  const normalized = duration.replace(',', '.');

  const match = normalized.match(/(\d+(?:\.\d+)?)/);

  if (!match) return null;

  const parsed = Number(match[1]);

  return Number.isFinite(parsed) ? parsed : null;

};

const estimateNarrationDurationSeconds = (text: string) => {

  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;

  return Math.max(3, Math.ceil(words / 2.8));

};

const getSceneDurationSeconds = (scene: any) => {

  return parseDurationSeconds(scene?.duration ?? scene?.duracaoSegundos ?? scene?.duration_seconds)

    ?? estimateNarrationDurationSeconds(scene?.narration_text || scene?.narration_excerpt || scene?.narracao || '');

};

const getBlockTimingSummary = (visualPrompts: any[], blockNum: number, gapSeconds = 2) => {

  const scenes = (visualPrompts || []).filter((scene: any) => (scene?.block || 1) === blockNum);

  const sceneSeconds = scenes.reduce((total: number, scene: any) => total + getSceneDurationSeconds(scene), 0);

  return {

    sceneCount: scenes.length,

    sceneSeconds,

    gapSeconds,

    totalSeconds: sceneSeconds + gapSeconds

  };

};

// Premium custom collapsible JSON Tree View

const JsonTreeNode: React.FC<{ label?: string; value: any; depth?: number }> = ({ label, value, depth = 0 }) => {

  const [isExpanded, setIsExpanded] = useState(depth < 2);

  if (value === null) {

    return (

      <div style={{ paddingLeft: `${depth * 12}px` }} className="font-mono text-[11px] py-0.5 select-text">

        {label && <span className="text-gold-500 mr-1.5">{label}:</span>}

        <span className="text-zinc-500">null</span>

      </div>

    );

  }

  if (typeof value === 'object') {

    const isArray = Array.isArray(value);

    const keys = Object.keys(value);

    const isEmpty = keys.length === 0;

    return (

      <div style={{ paddingLeft: `${depth * 12}px` }} className="font-mono text-[11px] py-0.5">

        <div 

          onClick={() => !isEmpty && setIsExpanded(!isExpanded)}

          className={`flex items-center gap-1.5 ${isEmpty ? '' : 'cursor-pointer hover:text-white'} transition select-none`}

        >

          {!isEmpty && (

            <span className="text-zinc-500 text-[9px] shrink-0 font-bold">

              {isExpanded ? '▼' : '▶'}

            </span>

          )}

          {label && <span className="text-gold-500 mr-1.5">{label}:</span>}

          <span className="text-zinc-400">

            {isArray ? `Array[${keys.length}]` : `Object{${keys.length}}`}

          </span>

        </div>

        {isExpanded && !isEmpty && (

          <div className="border-l border-zinc-850 ml-2 pl-2 mt-1 space-y-0.5">

            {keys.map((key) => (

              <JsonTreeNode key={key} label={key} value={value[key]} depth={0} />

            ))}

          </div>

        )}

      </div>

    );

  }

  let valColor = "text-emerald-400";

  let valStr = JSON.stringify(value);

  if (typeof value === 'number') {

    valColor = "text-blue-400";

  } else if (typeof value === 'boolean') {

    valColor = "text-purple-400";

  }

  return (

    <div style={{ paddingLeft: `${depth * 12}px` }} className="font-mono text-[11px] py-0.5 select-text">

      {label && <span className="text-gold-500 mr-1.5">{label}:</span>}

      <span className={valColor}>{valStr}</span>

    </div>

  );

};

const JsonTreeView: React.FC<{ value: any }> = ({ value }) => {

  return (

    <div className="space-y-1 font-sans">

      <JsonTreeNode value={value} depth={0} />

    </div>

  );

};

export default function App() {

  const [activeTab, setActiveTab] = useState<'status' | 'workflow' | 'timeline' | 'music' | 'terminal' | 'ai' | 'creator' | 'editor' | 'settings' | 'upload'>('status');

  const [status, setStatus] = useState<WorkspaceStatus | null>(null);

  const [config, setConfig] = useState<ConfigData | null>(null);
  const [projectDataLoading, setProjectDataLoading] = useState(false);

  const [outputs, setOutputs] = useState<OutputVideo[]>([]);

  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);

  const [logs, setLogs] = useState<string[]>([]);

  const [rendering, setRendering] = useState<boolean>(false);

  const [mixing, setMixing] = useState<boolean>(false);

  const [playingMusic, setPlayingMusic] = useState<string | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Project Management states

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [newProjectNiche, setNewProjectNiche] = useState<string>('Geral');
  const [collapsedNiches, setCollapsedNiches] = useState<Record<string, boolean>>({});
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<{ youtube: any; canva?: any; instagram: any; tiktok: any; kwai: any }>({
    youtube: { connected: false, has_secrets: false, client_id: null },
    canva: { connected: false, hasSecrets: false, clientId: null },
    instagram: { connected: false, account_id: null },
    tiktok: { connected: false },
    kwai: { connected: false }
  });
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

  const [activeProject, setActiveProject] = useState<string>(localStorage.getItem('qanat_active_project') || 'Buracos no Deserto');

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const [newProjectName, setNewProjectName] = useState<string>('');

  // AI Agent states

  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  const [apiKeyInput, setApiKeyInput] = useState<string>('');

  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

    const [aiProvider, setAiProvider] = useState<'gemini' | 'xai' | 'openrouter'>('gemini');

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

  const [deletingProjectName, setDeletingProjectName] = useState<string | null>(null);

  const [pendingOutputDelete, setPendingOutputDelete] = useState<OutputVideo | null>(null);

  const [deletingOutput, setDeletingOutput] = useState<boolean>(false);

  const [pendingMusicDelete, setPendingMusicDelete] = useState<MusicFile | { name: "__all__"; sizeBytes: number } | null>(null);

  const [deletingMusic, setDeletingMusic] = useState<boolean>(false);

  const [renderProgress, setRenderProgress] = useState<{percent: number, phase: string} | null>(null);

  const [videoQuality, setVideoQuality] = useState<VideoQualityReport | null>(null);

  const [chatOpen, setChatOpen] = useState<boolean>(false);

  const [headerDate, setHeaderDate] = useState<Date>(new Date());

  const [headerWeather, setHeaderWeather] = useState<HeaderWeather>({ temperature: null });

  // Creator states

    const savedCreatorState = (() => {

    try {

      const saved = localStorage.getItem('qanat_creator_state');

      if (saved) return JSON.parse(saved);

    } catch(e) {}

    return {};

  })();

  const [creatorStep, setCreatorStep] = useState<number>(savedCreatorState.creatorStep || 1);

  const [creatorPrompt, setCreatorPrompt] = useState<string>('');

  const [creatorScript, setCreatorScript] = useState<string>('');

  const [creatorLoading, setCreatorLoading] = useState<boolean>(false);
  const [creatorLoadingMode, setCreatorLoadingMode] = useState<'idle' | 'narration' | 'full'>('idle');
  const [showNarrationReview, setShowNarrationReview] = useState<boolean>(savedCreatorState.showNarrationReview || false);
  const [narrationDraft, setNarrationDraft] = useState<string>(savedCreatorState.narrationDraft || '');
  const [narrationTaggedDraft, setNarrationTaggedDraft] = useState<string>(savedCreatorState.narrationTaggedDraft || '');
  const [narrationStrategy, setNarrationStrategy] = useState<any | null>(savedCreatorState.narrationStrategy || null);
  const [narrationProjectName, setNarrationProjectName] = useState<string>(savedCreatorState.narrationProjectName || '');
  const [useNotebooklm, setUseNotebooklm] = useState<boolean>(true);
  const [notebooklmStatus, setNotebooklmStatus] = useState<{
    available: boolean;
    authenticated: boolean;
    notebookCount?: number;
    message?: string;
    needsLogin?: boolean;
  } | null>(null);
  const [notebooklmImproving, setNotebooklmImproving] = useState<boolean>(false);
  const [notebooklmSuggestions, setNotebooklmSuggestions] = useState<string | null>(null);

  const [creatorAssets, setCreatorAssets] = useState<{ name: string; sizeBytes: number; type: string }[]>([]);

  const [timelineAssets, setTimelineAssets] = useState<any>(null);

  const [syncingTimings, setSyncingTimings] = useState<boolean>(false);
  const [shouldAutoAlign, setShouldAutoAlign] = useState<boolean>(false);

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

  const [customIdeaTitle, setCustomIdeaTitle] = useState("");
  const [customIdeaPromise, setCustomIdeaPromise] = useState("");
  const [customIdeaHook, setCustomIdeaHook] = useState("");
  const [customIdeaEmotion, setCustomIdeaEmotion] = useState("");
  const [customIdeaBlocks, setCustomIdeaBlocks] = useState("");

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

  const [expandedBlocks, setExpandedBlocks] = useState<Record<number, boolean>>({ 1: true });

  const saveStoryboardTimeoutRef = useRef<any | null>(null);

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

  const debounceSaveStoryboard = (scriptData: any) => {

    if (saveStoryboardTimeoutRef.current) {

      clearTimeout(saveStoryboardTimeoutRef.current);

    }

    saveStoryboardTimeoutRef.current = setTimeout(() => {

      saveCreatorStoryboard(scriptData);

    }, 600);

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

      nextPrompts[index] = { 

        ...nextPrompts[index], 

        duration: `${value} segundos`,

        duration_seconds: value

      };

    } else if (field === 'narration_text') {

      const wasEstimated = parseDurationSeconds(nextPrompts[index].duration) === null || nextPrompts[index].duration_seconds === undefined;

      const nextText = value;

      nextPrompts[index] = { 

        ...nextPrompts[index], 

        narration_text: nextText 

      };

      if (wasEstimated) {

        const est = estimateNarrationDurationSeconds(nextText);

        nextPrompts[index].duration = `${est} segundos`;

      }

    } else {

      nextPrompts[index] = { 

        ...nextPrompts[index], 

        [field]: value 

      };

    }

    const nextScriptData = { ...generatedScriptData, visual_prompts: nextPrompts };

    setGeneratedScriptData(nextScriptData);

    debounceSaveStoryboard(nextScriptData);

  };

  const [creatorProjectName, setCreatorProjectName] = useState<string>(savedCreatorState.creatorProjectName || '');

  const [selectedProject, setSelectedProject] = useState<string>(activeProject);

  const [uploadedScenes, setUploadedScenes] = useState<Record<string, boolean>>({});

  const [storyboardData, setStoryboardData] = useState<any | null>(null);

  const [loadingStoryboard, setLoadingStoryboard] = useState<boolean>(false);

  const [editorSubTab, setEditorSubTab] = useState<'script' | 'assets' | 'json'>('script');

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
  ) => fetchGeminiAi(
    getProjectUrl(path),
    init,
    { geminiBrowserMode, aiProvider, resolveBrowserResponse },
  ), [getProjectUrl, geminiBrowserMode, aiProvider, resolveBrowserResponse]);

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

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchBrandCatalog();
      fetchLogoStatus();
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

  const fetchStoryboard = async (projName = activeProject) => {

    setLoadingStoryboard(true);

    try {

      const res = await fetch(getProjectUrl('/api/projects/storyboard', projName));

      if (res.ok) {

        setStoryboardData(await res.json());

      }

    } catch (err) {

      console.error("Error fetching storyboard:", err);

    } finally {

      setLoadingStoryboard(false);

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

        // Auto-set aspect_ratio if not defined, based on format

        if (!loadedConfig.aspect_ratio) {

          loadedConfig.aspect_ratio = formatSelector === 'SHORTS' ? '9:16' : '16:9';

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
        setYtTags(meta.youtube?.tags || '');
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

        setHasEpidemicKey(!!settingsData.has_epidemic_key);

        setGeminiBrowserMode(!!settingsData.gemini_browser_mode);

        setHasApiKey(
          !!settingsData.gemini_browser_mode
          || (settingsData.gemini_key_count || 0) > 0
          || !!settingsData.has_xai_key
          || settingsData.provider === 'openrouter'
          || !!settingsData.has_openrouter_key,
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

    useEffect(() => {
    localStorage.setItem('qanat_creator_state', JSON.stringify({ 
      creatorStep, 
      nicheInput, 
      formatSelector, 
      ideasData, 
      selectedIdeaIndex, 
      generatedScriptData,
      creatorProjectName,
      ideationTab,
      customTitle,
      customHooks,
      customOutline,
      customBlocks,
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
      narrationProjectName,
    }));
  }, [creatorStep, nicheInput, formatSelector, ideasData, selectedIdeaIndex, generatedScriptData, creatorProjectName, ideationTab, customTitle, customHooks, customOutline, customBlocks, listNiche, listTopic, rankCount, rankOrder, listicleHudStyle, listicleIdeasData, listicleSearchNiche, ideasSearchNiche, selectedListicleIdeaIndex, showNarrationReview, narrationDraft, narrationTaggedDraft, narrationStrategy, narrationProjectName]);

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
    setUploadSuccess(false);
    setUploadingNarration(false);
    setSyncingTimings(false);
    setDragActive(false);
    setUploadedScenes({});
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

    const flatList: any[] = [];

    wordTranscripts.forEach((segment: any, segIdx: number) => {

      const segStart = segment.start_time || 0;

      const segDuration = segment.duration || 0;

      const segText = segment.text || "";

      if (segment.words && Array.isArray(segment.words) && segment.words.length > 0) {

        segment.words.forEach((w: any) => {

          let wStart = w.start;

          let wEnd = w.end;

          if (wStart < segStart) {

            wStart += segStart;

            wEnd += segStart;

          }

          const cleanArr = cleanText(w.word);

          flatList.push({

            word: w.word,

            clean: cleanArr[0] || "",

            start: wStart,

            end: wEnd,

            segmentIndex: segIdx

          });

        });

      } else if (segText) {

        const rawWords = segText.split(/\s+/).filter(Boolean);

        if (rawWords.length > 0) {

          const wordDuration = segDuration / rawWords.length;

          rawWords.forEach((word: string, wIdx: number) => {

            const cleanArr = cleanText(word);

            flatList.push({

              word: word,

              clean: cleanArr[0] || "",

              start: segStart + wIdx * wordDuration,

              end: segStart + (wIdx + 1) * wordDuration,

              segmentIndex: segIdx

            });

          });

        }

      }

    });

    setFlatTranscriptWords(flatList);

  }, [wordTranscripts]);

  const loadEditorProject = () => {

    if (selectedProject) {

      setActiveProject(selectedProject);

    }

  };

  const updateSceneField = (index: number, field: string, value: any) => {

    if (!storyboardData) return;

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

      duration: "5 segundos",

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

      duration: "5 segundos",

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

        setDeletingProjectName(null);

        await fetchProjects();

        setActiveProject('Buracos no Deserto');

        setActiveTab('status');

      } else {

        try { toast.error('Erro ao excluir projeto: ' + (data.error || 'Erro desconhecido')); } catch (e) {}

      }

    } catch (err) {

      console.error(err);

      try { toast.error('Falha na conexão ao excluir projeto.'); } catch (e) {}

    }

  };

  const matchesProjectSearch = (proj: ProjectListItem, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [proj.name, proj.title, proj.niche, proj.format].some(
      (field) => String(field || '').toLowerCase().includes(q),
    );
  };

  const getNicheCollapsed = (collapseKey: string, projList: ProjectListItem[]) => {
    if (collapsedNiches[collapseKey] !== undefined) return collapsedNiches[collapseKey];
    return !projList.some((p) => p.name === activeProject);
  };

  type ProjectWorkspaceTabId = (typeof PROJECT_WORKSPACE_TABS)[number]['id'];

  const leaveGlobalViewForProject = (tab: ProjectWorkspaceTabId = 'status') => {
    if (activeTab === 'settings' || activeTab === 'creator') {
      setActiveTab(tab);
    }
  };

  const handleSelectProject = (name: string) => {
    setActiveProject(name);
    leaveGlobalViewForProject('status');
  };

  const renderSidebarProjectItem = (proj: ProjectListItem) => {
    const isSelected = activeProject === proj.name;
    const isShort = proj.format === 'SHORTS';
    return (
      <div key={proj.name} className="flex items-center gap-1 group animate-fade-in">
        <button
          type="button"
          onClick={() => handleSelectProject(proj.name)}
          className={`flex-1 text-left px-2.5 py-2 rounded-lg text-[11px] font-semibold transition flex items-center gap-2 cursor-pointer min-w-0 ${
            isSelected
              ? 'bg-gold-500/10 border border-gold-500/25 text-gold-300'
              : 'text-gray-400 border border-transparent hover:bg-zinc-900/40 hover:text-gray-200'
          }`}
        >
          {isShort ? (
            <Smartphone className={`w-3 h-3 shrink-0 ${isSelected ? 'text-amber-500' : 'text-zinc-600'}`} />
          ) : (
            <Tv className={`w-3 h-3 shrink-0 ${isSelected ? 'text-gold-500' : 'text-zinc-600'}`} />
          )}
          <span className="truncate font-sans" title={proj.title || proj.name}>
            {proj.title || proj.name}
          </span>
        </button>
        {deletingProjectName === proj.name ? (
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 animate-fade-in shrink-0">
            <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.name); }} className="text-[9px] bg-red-500 hover:bg-red-600 text-white font-bold px-1.5 py-0.5 rounded transition cursor-pointer">Sim</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setDeletingProjectName(null); }} className="text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded transition cursor-pointer ml-0.5">Não</button>
          </div>
        ) : (
          <button type="button" onClick={(e) => { e.stopPropagation(); setDeletingProjectName(proj.name); }} className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-zinc-900/50 rounded-lg transition cursor-pointer shrink-0 opacity-0 group-hover:opacity-100" title="Excluir Projeto">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const renderProjectNicheGroups = (formatFilter: 'LONGO' | 'SHORTS') => {
    const filtered = projects.filter((p) => (formatFilter === 'SHORTS' ? p.format === 'SHORTS' : p.format !== 'SHORTS'));
    if (filtered.length === 0) {
      return <p className="text-[10px] text-zinc-650 italic px-2 py-1 font-sans">{formatFilter === 'SHORTS' ? 'Nenhum projeto short' : 'Nenhum projeto longo'}</p>;
    }
    const grouped = filtered.reduce<Record<string, ProjectListItem[]>>((acc, proj) => {
      const nicheName = proj.niche || 'Geral';
      if (!acc[nicheName]) acc[nicheName] = [];
      acc[nicheName].push(proj);
      return acc;
    }, {});
    return Object.entries(grouped).map(([nicheName, projList]) => {
      const collapseKey = `${formatFilter === 'SHORTS' ? 'short' : 'long'}-${nicheName}`;
      const isCollapsed = getNicheCollapsed(collapseKey, projList);
      return (
        <div key={collapseKey} className="space-y-1 border border-zinc-900/40 bg-zinc-950/10 rounded-xl p-1.5">
          <button type="button" onClick={() => setCollapsedNiches((prev) => ({ ...prev, [collapseKey]: !isCollapsed }))} className="w-full flex items-center justify-between text-left px-1.5 py-1 text-gray-500 hover:text-gray-300 transition text-[9px] font-bold uppercase tracking-widest cursor-pointer select-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <Folder className="w-3 h-3 text-gold-500/60 shrink-0" />
              <span className="truncate">{nicheName} ({projList.length})</span>
            </div>
            {isCollapsed ? <ChevronRight className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
          </button>
          {!isCollapsed && <div className="space-y-0.5 pt-0.5">{projList.map((proj) => renderSidebarProjectItem(proj))}</div>}
        </div>
      );
    });
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

            setGeneratedScriptData(nextScriptData);

            saveCreatorStoryboard(nextScriptData);

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

          const nextAsset = {

            asset: data.asset,

            type,

            ...(type === 'video' ? { fixed: 8.00 } : {})

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

        setGeneratedScriptData(nextScriptData);

        saveCreatorStoryboard(nextScriptData);

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

  const saveConfig = async (updatedConfig: ConfigData) => {
    const { timeline: sanitizedTimeline, removed: dupesRemoved } = sanitizeTimelineAssets(updatedConfig.timeline_assets);
    const baseConfig = dupesRemoved > 0
      ? { ...updatedConfig, timeline_assets: sanitizedTimeline }
      : updatedConfig;
    if (dupesRemoved > 0) {
      toast.info(`Removidos ${dupesRemoved} asset(s) repetido(s) consecutivos na timeline.`);
      setConfig(baseConfig);
    }
    const configToSave = enrichTimelineAudioStarts(baseConfig);

    try {

      const res = await fetch(getProjectUrl('/api/config'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(configToSave)

      });

      if (res.ok) {

        setConfig(configToSave);

        fetchData();

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

      blockAssets[index] = { ...blockAssets[index], [field]: value };

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

      saveConfig(updatedConfig);

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

    newTimelineAssets[blockKey] = blockAssets;

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
    saveConfig(updatedConfig);

  };

  const deleteTimelineAsset = (blockKey: string, index: number) => {

    if (!config) return;

    const timelineAssets = config.timeline_assets || {};

    const newTimelineAssets = { ...timelineAssets };

    const blockAssets = (newTimelineAssets[blockKey] || []).filter((_, idx) => idx !== index);

    newTimelineAssets[blockKey] = blockAssets;

    const updatedConfig = { ...config, timeline_assets: newTimelineAssets };

    setConfig(updatedConfig);

    saveConfig(updatedConfig);

    toast.success("Asset removido da linha do tempo!");

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

    saveConfig(updatedConfig);

  };

  const handleSaveConfig = async () => {

    if (config) {

      await saveConfig(config);

      toast.success("Linha do tempo salva com sucesso!");

    }

  };

  const getAssetDuration = (blockKey: string, index: number) => {

    if (!config || !config.timeline_assets || !config.timeline_assets[blockKey]) return 0;

    const blockNum = parseInt(blockKey, 10);

    const blockDuration = (status?.block_timings?.durations && status.block_timings.durations[blockNum - 1]) || 10.0;

    const configs = config.timeline_assets[blockKey];

    if (!configs || configs[index] === undefined) return 0;

    const current = configs[index];

    // Se o asset tem duração fixa definida pelo usuário, SEMPRE respeitar exatamente

    if (current.fixed !== undefined && current.fixed !== null) {

      return current.fixed;

    }

    // Para assets sem duração fixa, distribuir o tempo restante do bloco

    const sumFixed = configs.reduce((acc: number, c: any) => acc + (c.fixed ? c.fixed : 0), 0);

    const flexibleClips = configs.filter((c: any) => c.fixed === undefined || c.fixed === null);

    const nFlex = flexibleClips.length;

    if (nFlex > 0) {

      const remaining = Math.max(0.5 * nFlex, blockDuration - sumFixed);

      return remaining / nFlex;

    }

    return 0.5; // fallback mínimo

  };

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

  const cleanText = (text: string): string[] => {

    return text

      .toLowerCase()

      .normalize("NFD")

      .replace(/[\u0300-\u036f]/g, "")

      .replace(/[^a-z0-9\s]/g, "")

      .split(/\s+/)

      .filter(Boolean);

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

  const safeMusicFiles = useMemo(
    () => (Array.isArray(musicFiles) ? musicFiles.filter((f) => f && typeof f.name === 'string') : []),
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
    const cache: Record<string, {
      start: number;
      end: number;
      duration: number;
      matchedWords: number;
      totalWords: number;
      bestFirstMatchIdx: number;
      bestLastMatchIdx: number;
    }> = {};

    if (!flatTranscriptWords || flatTranscriptWords.length === 0 || !config) {
      return cache;
    }

    const timelineAssets = config.timeline_assets || {};
    Object.keys(timelineAssets).forEach((blockKey) => {
      const blockNum = parseInt(blockKey, 10);
      if (!Number.isFinite(blockNum)) return;
      const bounds = resolveBlockTimeBounds(status, blockNum);
      const assets = timelineAssets[blockKey] || [];
      assets.forEach((_, idx) => {
        const narrationText = getAssetNarration(blockKey, idx);
        if (!narrationText) return;
        const key = narrationCacheKey(blockNum, narrationText);
        if (cache[key]) return;
        const hit = findBoundedNarrationMatch(narrationText, flatTranscriptWords, bounds);
        if (hit) cache[key] = hit;
      });
      const blockText = resolveBlockNarrationText(buildNarrationSyncContext(), blockNum);
      if (blockText) {
        const key = narrationCacheKey(blockNum, blockText);
        if (!cache[key]) {
          const hit = findBoundedNarrationMatch(blockText, flatTranscriptWords, bounds);
          if (hit) cache[key] = hit;
        }
      }
    });

    return cache;
  }, [flatTranscriptWords, narrationTextsListString, config, status, storyboardData?.visual_prompts]);

  const findNarrationTimestamps = (narrationText: string, blockNum?: number) => {
    if (!narrationText || blockNum === undefined) return null;
    const cacheKey = narrationCacheKey(blockNum, narrationText);
    if (narrationMatchesCache[cacheKey]) return narrationMatchesCache[cacheKey];
    const bounds = resolveBlockTimeBounds(status, blockNum);
    return findBoundedNarrationMatch(narrationText, flatTranscriptWords, bounds);
  };

  const getStoryboardWordsWithTiming = (

    narrationText: string,

    bestFirstMatchIdx: number,

    bestLastMatchIdx: number

  ) => {

    const rawWords = narrationText.split(/\s+/).filter(Boolean);

    if (bestFirstMatchIdx === -1 || bestLastMatchIdx === -1 || !flatTranscriptWords || flatTranscriptWords.length === 0) {

      return rawWords.map(w => ({ word: w, start: 0, end: 999999 }));

    }

    let transcriptIdx = bestFirstMatchIdx;

    const result: Array<{ word: string, start: number, end: number }> = [];

    const matchWords = (w1: string, w2: string): boolean => {

      if (w1 === w2) return true;

      const s1 = w1.endsWith('s') ? w1.slice(0, -1) : w1;

      const s2 = w2.endsWith('s') ? w2.slice(0, -1) : w2;

      if (s1 === s2 && s1.length > 3) return true;

      return false;

    };

    for (let i = 0; i < rawWords.length; i++) {

      const part = rawWords[i];

      const cleanedParts = cleanText(part);

      const cleanedPart = cleanedParts[0] || "";

      let matched = false;

      const searchLimit = Math.min(transcriptIdx + 12, flatTranscriptWords.length);

      for (let tIdx = transcriptIdx; tIdx < searchLimit; tIdx++) {

        const tw = flatTranscriptWords[tIdx];

        if (cleanedPart === tw.clean || matchWords(cleanedPart, tw.clean)) {

          result.push({

            word: part,

            start: tw.start,

            end: tw.end

          });

          transcriptIdx = tIdx + 1;

          matched = true;

          break;

        }

      }

      if (!matched) {

        const prevWord = result[result.length - 1];

        const fallbackStart = prevWord ? prevWord.end : (flatTranscriptWords[Math.min(transcriptIdx, flatTranscriptWords.length - 1)]?.start || 0);

        result.push({

          word: part,

          start: fallbackStart,

          end: fallbackStart + 0.3

        });

      }

    }

    return result;

  };

  // === DYNAMIC NARRATION: collect all words per block with audio timestamps ===

  const blockNarrationWordsCache = useMemo(() => {

    const cache: Record<string, Array<{ word: string; start: number; end: number }>> = {};

    if (!config || !config.timeline_assets || !flatTranscriptWords || flatTranscriptWords.length === 0) return cache;

    const timelineAssets = config.timeline_assets;

    Object.keys(timelineAssets).forEach(blockKey => {

      const assets = timelineAssets[blockKey] || [];

      const allWords: Array<{ word: string; start: number; end: number }> = [];

      const seenPositions = new Set<string>();

      const blockNum = parseInt(blockKey, 10);
      const blockText = resolveBlockNarrationText(buildNarrationSyncContext(), blockNum);
      if (blockText) {
        const bounds = resolveBlockTimeBounds(status, blockNum);
        const matched = findBoundedNarrationMatch(blockText, flatTranscriptWords, bounds);
        if (matched) {
          const words = getStoryboardWordsWithTiming(blockText, matched.bestFirstMatchIdx, matched.bestLastMatchIdx);
          words.forEach((w) => {
            if (w.start < bounds.searchAfter - 0.2 || w.start > bounds.searchBefore + 0.15) return;
            const key = `${w.start.toFixed(3)}-${w.word}`;
            if (!seenPositions.has(key)) {
              allWords.push(w);
              seenPositions.add(key);
            }
          });
        }
      }

      allWords.sort((a, b) => a.start - b.start);

      cache[blockKey] = allWords;

    });

    return cache;

  }, [config?.timeline_assets, config?.block_phrases, storyboardData?.visual_prompts, narrationMatchesCache, flatTranscriptWords]);

  // Get dynamically distributed words for a specific asset based on its time window

  const getDynamicAssetWords = (blockKey: string, assetIdx: number): {

    words: Array<{ word: string; start: number; end: number }>;

    text: string;

    assetAudioStart: number;

    assetAudioEnd: number;

    blockAudioStart: number;

    blockAudioEnd: number;

    totalBlockWords: number;

    coveredWords: number;

  } | null => {

    const blockNum = parseInt(blockKey, 10);

    const allBlockWords = blockNarrationWordsCache[blockKey] || [];

    if (allBlockWords.length === 0) return null;

    // Usar o timestamp da PRIMEIRA PALAVRA real como ponto de partida

    // Isso garante que o asset 1 sempre começa onde a narração realmente está no áudio

    const narrationStart = allBlockWords[0].start;

    const narrationLastEnd = allBlockWords[allBlockWords.length - 1].end;

    // Calculate this asset's time window starting from the first narration word

    const currentAsset = config?.timeline_assets?.[blockKey]?.[assetIdx];
    let assetAudioStart: number;

    if (currentAsset?.audio_start !== undefined && currentAsset?.audio_start !== null) {
      assetAudioStart = Number(currentAsset.audio_start);
    } else {
      assetAudioStart = narrationStart;

      for (let i = 0; i < assetIdx; i++) {

        assetAudioStart += getAssetDuration(blockKey, i);
      }
    }

    const assetDuration = getAssetDuration(blockKey, assetIdx);

    const assetAudioEnd = assetAudioStart + assetDuration;

    // Filter words that fall within this asset's time window

    // Words are bounded by the block's actual narration words (never leaks to next block)

    const assetWords = allBlockWords.filter(w =>

      w.start >= assetAudioStart - 0.15 && w.start < assetAudioEnd - 0.05

    );

    // Count total words covered by ALL assets in the block

    const totalAssets = config?.timeline_assets?.[blockKey]?.length || 0;

    let totalEndTime = narrationStart;

    for (let i = 0; i < totalAssets; i++) {

      totalEndTime += getAssetDuration(blockKey, i);

    }

    // Coverage: how many of the block's narration words are within the total asset time span

    const coveredWords = allBlockWords.filter(w => w.start < totalEndTime - 0.05).length;

    return {

      words: assetWords,

      text: assetWords.map(w => w.word).join(' '),

      assetAudioStart,

      assetAudioEnd,

      blockAudioStart: narrationStart,

      blockAudioEnd: narrationLastEnd,

      totalBlockWords: allBlockWords.length,

      coveredWords

    };

  };

  const recalculateBlockAudioStarts = (blockKey: string, assets: any[], preserveUntilIndex = -1): any[] => {
    const updated = assets.map((a) => ({ ...a }));
    const allBlockWords = blockNarrationWordsCache[blockKey] || [];
    const blockNum = parseInt(blockKey, 10);
    const fallbackStart = status?.block_timings?.starts?.[blockNum - 1] ?? 0;
    const narrationStart = allBlockWords.length > 0 ? allBlockWords[0].start : fallbackStart;

    let cursor = narrationStart;
    for (let i = 0; i < updated.length; i++) {
      if (i <= preserveUntilIndex && updated[i]?.audio_start !== undefined && updated[i]?.audio_start !== null) {
        cursor = Number(updated[i].audio_start) + getAssetDuration(blockKey, i);
        continue;
      }
      if (i === 0) {
        updated[i].audio_start = parseFloat(narrationStart.toFixed(3));
      } else {
        updated[i].audio_start = parseFloat(cursor.toFixed(3));
      }
      cursor = Number(updated[i].audio_start) + getAssetDuration(blockKey, i);
    }
    return updated;
  };

  const enrichTimelineAudioStarts = (cfg: ConfigData): ConfigData => {
    const timelineAssets = { ...(cfg.timeline_assets || {}) };
    Object.keys(timelineAssets).forEach((blockKey) => {
      const assets = timelineAssets[blockKey];
      if (!assets?.length) return;
      const hasAny = assets.some((a: any) => a.audio_start !== undefined && a.audio_start !== null);
      if (!hasAny) {
        timelineAssets[blockKey] = recalculateBlockAudioStarts(blockKey, assets);
      }
    });
    return { ...cfg, timeline_assets: timelineAssets };
  };

  const alignBlockAssetsToSpeech = (blockKey: string, cfgOverride?: ConfigData) => {
    const cfg = cfgOverride ?? config;

    if (!cfg || !cfg.timeline_assets || !cfg.timeline_assets[blockKey]) return;

    if (!wordTranscripts || wordTranscripts.length === 0) {

      toast.error("Transcrições da voz não carregadas ou indisponíveis para este projeto.");

      return;

    }

    const updatedAssets = [...cfg.timeline_assets[blockKey]];

    const blockNum = Number(blockKey);

    const blockDuration = (status?.block_timings?.durations && status.block_timings.durations[blockNum - 1]) || 10.0;

    const starts = status?.block_timings?.starts;

    if (!starts || starts[blockNum - 1] === undefined) {

      toast.error("Timings do bloco não encontrados.");

      return;

    }

    const blockStart = starts[blockNum - 1];

    const blockEnd = blockStart + blockDuration;

    const getNextMatchedStart = (startIdx: number): number | null => {

      for (let i = startIdx; i < updatedAssets.length; i++) {

        const text = getAssetNarration(blockKey, i);

        const match = findNarrationTimestamps(text, blockNum);

        if (match) return match.start;

      }

      return null;

    };

    let alignedCount = 0;

    updatedAssets.forEach((asset, idx) => {

      const narrationText = getAssetNarration(blockKey, idx);

      const matched = findNarrationTimestamps(narrationText, blockNum);

      if (matched) {

        if (idx === updatedAssets.length - 1) {

          asset.fixed = parseFloat(Math.max(0.5, blockEnd - matched.start).toFixed(1));

        } else {

          const nextStart = getNextMatchedStart(idx + 1);

          if (nextStart !== null) {

            asset.fixed = parseFloat(Math.max(0.5, nextStart - matched.start).toFixed(1));

          } else {

            asset.fixed = parseFloat(matched.duration.toFixed(1));

          }

        }

        asset.audio_start = parseFloat(matched.start.toFixed(3));

        alignedCount++;

      }

    });

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

      const updatedAssets = [...newTimelineAssets[blockKey]];

      const blockDuration = (status?.block_timings?.durations && status.block_timings.durations[blockNum - 1]) || 10.0;

      const starts = status?.block_timings?.starts;

      if (!starts || starts[blockNum - 1] === undefined) continue;

      const blockStart = starts[blockNum - 1];

      const blockEnd = blockStart + blockDuration;

      const getNextMatchedStartLocal = (startIdx: number): number | null => {

        for (let i = startIdx; i < updatedAssets.length; i++) {

          const text = getAssetNarration(blockKey, i);

          const match = findNarrationTimestamps(text, blockNum);

          if (match) return match.start;

        }

        return null;

      };

      updatedAssets.forEach((asset, idx) => {

        const narrationText = getAssetNarration(blockKey, idx);

        const matched = findNarrationTimestamps(narrationText, blockNum);

        if (matched) {

          if (idx === updatedAssets.length - 1) {

            asset.fixed = parseFloat(Math.max(0.5, blockEnd - matched.start).toFixed(1));

          } else {

            const nextStart = getNextMatchedStartLocal(idx + 1);

            if (nextStart !== null) {

              asset.fixed = parseFloat(Math.max(0.5, nextStart - matched.start).toFixed(1));

            } else {

              asset.fixed = parseFloat(matched.duration.toFixed(1));

            }

          }

          asset.audio_start = parseFloat(matched.start.toFixed(3));

          totalAligned++;

        }

      });

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
    const audio = getNarrationAudio(blockNum);
    const targetStr = `scene-${blockKey}-${sceneIdx}`;

    if (playingNarration === targetStr) {
      audio.pause();
      setPlayingNarration(null);
      activeNarrationStateRef.current = null;
      return;
    }

    audio.pause();
    const narrationText = getAssetNarration(blockKey, sceneIdx);
    const matched = findNarrationTimestamps(narrationText, blockNum);
    const duration = getAssetDuration(blockKey, sceneIdx);

    let startTimeRelative = 0;
    for (let i = 0; i < sceneIdx; i++) {
      startTimeRelative += getAssetDuration(blockKey, i);
    }
    const endTimeRelative = startTimeRelative + duration;

    let startTimeAbsolute = startTimeRelative;
    let endTimeAbsolute = endTimeRelative;
    const starts = status?.block_timings?.starts;
    if (starts && starts[blockNum - 1] !== undefined) {
      startTimeAbsolute = starts[blockNum - 1] + startTimeRelative;
      endTimeAbsolute = startTimeAbsolute + duration;
    } else if (matched) {
      startTimeAbsolute = matched.start;
      endTimeAbsolute = matched.start + duration;
    } else {
      startTimeAbsolute = 0;
      endTimeAbsolute = duration;
    }

    activeNarrationStateRef.current = {
      target: targetStr,
      startTimeRelative,
      startTimeAbsolute,
      endTimeRelative,
      endTime: endTimeAbsolute
    };

    audio.currentTime = startTimeRelative;
    setPlayingNarration(targetStr);

    audio.play().catch(err => {
      console.error("Failed to play scene narration:", err);
      if (audio.src && !audio.src.includes("narracao_mestra_premium.mp3")) {
        console.warn("Play failed for segment. Forcing fallback to master narration.");
        const masterUrl = getMusicUrl("narracao_mestra_premium.mp3");
        audio.pause();
        audio.src = masterUrl;
        audio.load();

        if (activeNarrationStateRef.current) {
          activeNarrationStateRef.current.startTimeRelative = undefined;
          activeNarrationStateRef.current.endTimeRelative = undefined;
        }

        audio.oncanplay = () => {
          audio.currentTime = startTimeAbsolute;
          audio.play().catch(e => {
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

  const getAssetUrl = (fileName: string) => {

    return `/api/projects-media/${encodeURIComponent(activeProject)}/ASSETS/${encodeURIComponent(fileName)}`;

  };

  const getMusicUrl = (fileName: string) => {
    const projKey = activeProject.replace(/ /g, "_");
    return `/api/projects-media/${encodeURIComponent(projKey)}/${encodeURIComponent(fileName)}`;
  };

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

          mode: formatSelector

        })

      });

      const data = await res.json();

      if (res.ok) {

        toast.success('Sonoplastia automática concluída com sucesso!');

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
      }
    } catch { /* ignore */ }
  };

  const handleSaveApiKeys = async () => {
    const hasInput = epidemicKeyInput.trim() || pexelsKeyInput.trim() || pixabayKeyInput.trim();
    if (!hasInput) {
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
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Falha ao salvar chaves de API'));
      const data = await res.json();
      setHasEpidemicKey(!!data.has_epidemic_key);
      setHasPexelsKey(!!data.has_pexels_key);
      setHasPixabayKey(!!data.has_pixabay_key);
      setEpidemicKeyInput('');
      setPexelsKeyInput('');
      setPixabayKeyInput('');
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

        setHasEpidemicKey(!!data.has_epidemic_key);

        setGeminiBrowserMode(!!data.gemini_browser_mode);

        setHasApiKey(
          !!data.gemini_browser_mode
          || (data.gemini_key_count || 0) > 0
          || !!data.has_xai_key
          || data.provider === 'openrouter'
          || !!data.has_openrouter_key,
        );

        setGeminiKeysInput('');

        setXaiKeyInput('');

        setOpenRouterKeyInput('');

        setEpidemicKeyInput('');

        toast.success('Configurações de IA salvas com sucesso!');

      } else {

        toast.error(data.error || 'Erro ao salvar configurações.');

      }

    } catch (err) {

      toast.error('Falha de conexão ao salvar configurações.');

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
      const { ok, data } = await postAi('/api/ai/optimize-youtube', { method: 'POST' });

      if (ok && !data.needs_browser && data.text) {
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
      const errMsg = data.error || 'Falha ao gerar metadados do YouTube.';
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

  const applyMetadataToUpload = async () => {
    const parsed = youtubeMetadataParsed;
    if (!parsed) {
      toast('Gere os metadados antes de aplicar.');
      return;
    }
    try {
      const adaptRes = await fetch(getProjectUrl('/api/ai/adapt-platform-metadata'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed, format: youtubeMetadataFormat || 'LONG' }),
      });
      const adapted = adaptRes.ok ? (await adaptRes.json()).adapted : null;
      const yt = adapted?.youtube || {};
      const title = yt.title || parsed.recommendedTitle || parsed.titles?.[0]?.text || '';
      setYtTitle(title.slice(0, 100));
      setYtDescription(yt.description || parsed.description || '');
      setYtTags(Array.isArray(yt.tags) ? yt.tags.join(', ') : (parsed.tags || ''));
      setYtChapters(yt.chapters || parsed.chapters || '');
      setYtPinnedComment(yt.pinned_comment || parsed.pinnedComment || '');
      setYtCategoryId(yt.category_id || (youtubeMetadataFormat === 'SHORT' ? '22' : '27'));
      if (adapted?.instagram?.title) setIgCaption(adapted.instagram.title);
      if (adapted?.tiktok?.title) setTtCaption(adapted.tiktok.title);
      if (adapted?.kwai?.title) setKwCaption(adapted.kwai.title);
      toast('Metadados completos aplicados (YouTube + redes).');
    } catch {
      toast('Erro ao adaptar metadados.');
    }
  };

  const handlePostUploadComplete = async (videoId?: string) => {
    if (!videoId) return;
    setTitleExperimentVideoId(videoId);
    try {
      const res = await fetch(getProjectUrl('/api/upload/post-upload'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, autoStartTitleTest: true, postPinned: true }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.titleTestStarted) toast('Teste A/B de títulos iniciado automaticamente.');
        if (data.pinnedComment?.success) toast('Comentário fixo publicado.');
        fetchTitleExperiment();
        fetchTitleExperimentAnalytics();
      }
    } catch {
      // optional hook
    }
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

  const fetchYoutubeMetadataCache = async () => {
    try {
      const res = await fetch(getProjectUrl('/api/ai/youtube-metadata-cache'));
      if (!res.ok) return;
      const data = await res.json();
      if (!data.cached) return;
      if (data.text) setYoutubeMetadata(data.text);
      setYoutubeMetadataFormat(data.format === 'SHORT' ? 'SHORT' : data.format === 'LONG' ? 'LONG' : '');
      setYoutubeMetadataParsed(data.parsed || null);
      setYoutubeMetadataStrategy({
        profileLabel: data.profile?.label,
        rpm: data.rpm,
        palette: data.palette,
      });
    } catch {
      // ignore cache load errors
    }
  };

  const buildThumbnailBrief = (thumb: {
    id: string;
    label?: string;
    overlayText?: string;
    pairedTitle?: string;
    composition?: string;
    focalElement?: string;
    colors?: string[];
  }) => [
    `Variante ${thumb.id} — ${thumb.label || 'Thumbnail YouTube'}`,
    thumb.overlayText ? `Texto na capa: ${thumb.overlayText}` : '',
    thumb.pairedTitle ? `Título pareado: ${thumb.pairedTitle}` : '',
    thumb.composition ? `Composição: ${thumb.composition}` : '',
    thumb.focalElement ? `Foco visual: ${thumb.focalElement}` : '',
    thumb.colors?.length ? `Paleta: ${thumb.colors.join(', ')}` : '',
    youtubeMetadataStrategy?.profileLabel ? `Perfil: ${youtubeMetadataStrategy.profileLabel}` : '',
    youtubeMetadataFormat ? `Formato: ${youtubeMetadataFormat === 'SHORT' ? '9:16 Shorts' : '16:9 Longo'}` : '',
  ].filter(Boolean).join('\n');

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
      ? buildThumbnailBrief(thumb)
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

  const [bgmSuggestions, setBgmSuggestions] = useState<{ mode?: string; recommendation?: string; search_theme?: string; suggestions?: { block: number; recommendation: string; reason?: string; search_theme?: string }[]; manual_note?: string } | null>(null);

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

  const handleGenerateIdeas = async () => {

    if (!nicheInput.trim()) return;

    setCreatorLoading(true);

    setIdeasData(null);

    setSelectedIdeaIndex(-1);

    try {

      if (geminiBrowserMode && aiProvider === 'gemini') {
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

        toast.error('Erro ao analisar o nicho: ' + (data.error || 'Erro desconhecido'));

      }

    } catch (err) {

      console.error(err);

      toast.error('Conexão falhou ao analisar o nicho.');

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
      if (geminiBrowserMode && aiProvider === 'gemini') {
        toast.loading('Sugerindo rankings via Gemini no navegador…', { id: 'gemini-listicle' });
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
        ...(phase === 'full' ? {
          approvedNarration: options?.approvedNarration,
          approvedNarrationTagged: options?.approvedNarrationTagged,
        } : {}),
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
      ...(phase === 'full' ? {
        approvedNarration: options?.approvedNarration,
        approvedNarrationTagged: options?.approvedNarrationTagged,
      } : {}),
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
    } else if (!ideasData || selectedIdeaIndex === -1) {
      return false;
    }

    if (!creatorProjectName.trim()) {
      toast.error('Por favor, digite o nome do projeto/pasta.');
      return false;
    }
    return true;
  };

  const handleGenerateNarration = async () => {
    if (!validateCreatorScriptInputs()) return;

    const safeProjectName = creatorProjectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    setCreatorLoading(true);
    setCreatorLoadingMode('narration');
    setGeneratedScriptData(null);
    setShowNarrationReview(false);

    try {
      const { ok, data } = await postAi('/api/ai/creator/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCreatorScriptPayload('narration')),
      });
      if (ok && !data.needs_browser) {
        setNarrationDraft(data.narrative_script || '');
        setNarrationTaggedDraft(data.narrative_script_tagged || '');
        setNarrationStrategy(data.strategy || null);
        setNarrationProjectName(safeProjectName);
        setShowNarrationReview(true);
        await fetchProjects();
        setActiveProject(safeProjectName);
        toast.success('Narração gerada — revise e edite antes de montar o roteiro.');
      } else {
        toast.error(data.error || data.details || 'Erro ao gerar narração.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha na geração da narração.');
    } finally {
      setCreatorLoading(false);
      setCreatorLoadingMode('idle');
    }
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

    setCreatorLoading(true);
    setCreatorLoadingMode('full');

    try {
      const { ok, data } = await postAi('/api/ai/creator/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCreatorScriptPayload('full', {
          approvedNarration: approved,
          approvedNarrationTagged: narrationTaggedDraft.trim() || undefined,
        })),
      });
      if (ok && !data.needs_browser) {
        setGeneratedScriptData(data);
        setCreatorScript(data.narrative_script || approved);
        setShowNarrationReview(false);
        setCreatorStep(2);
        await fetchProjects();
        setActiveProject(narrationProjectName);
        fetchData();
        const listicleMsg = ideationTab === 'listicle'
          ? ` com ${data.list_items?.length || rankCount} itens`
          : '';
        toast.success(`Roteiro completo gerado${listicleMsg}.`);
      } else {
        toast.error(data.error || data.details || 'Erro ao gerar roteiro completo.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Conexão falhou ao gerar roteiro.');
    } finally {
      setCreatorLoading(false);
      setCreatorLoadingMode('idle');
    }
  };

  const handleGenerateListicleScript = handleGenerateNarration;

  const handleGenerateFullScript = handleGenerateNarration;

  const creatorScenesNeedRepair = useMemo(() => {
    const vps = generatedScriptData?.visual_prompts || [];
    if (!vps.length) return false;
    return vps.some((vp: any) => !String(vp?.narration_text || vp?.narration_excerpt || '').trim()
      || !String(vp?.prompt || '').trim());
  }, [generatedScriptData?.visual_prompts]);

  const handleRepairCreatorVisualPrompts = async () => {
    const projectName = narrationProjectName || creatorProjectName || activeProject;
    if (!projectName?.trim()) {
      toast.error('Projeto não identificado.');
      return;
    }
    setCreatorLoading(true);
    setCreatorLoadingMode('full');
    try {
      const { ok, data } = await postAi('/api/ai/creator/repair-visual-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') }),
      });
      if (ok && !data.needs_browser) {
        setGeneratedScriptData(data);
        setCreatorScript(data.narrative_script || creatorScript);
        await saveCreatorStoryboard(data);
        toast.success(`Cenas reparadas — ${data.visual_prompts?.length || 0} prompts com narração e imagem.`);
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

  const handleAutoMapAssets = async () => {

    setCreatorLoading(true);

    try {

      const res = await fetch(getProjectUrl('/api/ai/auto-map-assets'), { method: 'POST' });

      const data = await res.json();

      if (res.ok) {

        setTimelineAssets(data.timeline_assets);
        setConfig((prev) => (prev ? { ...prev, timeline_assets: data.timeline_assets } : prev));

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

  // Parse suggested config block from AI content

  const detectJsonConfig = (text: string) => {

    const match = text.match(/```json\s*([\s\S]*?)\s*```/);

    if (!match) return null;

    try {

      const parsed = JSON.parse(match[1]);

      if (parsed.highlight_keywords || parsed.bgm_mappings || parsed.impact_texts) {

        return parsed;

      }

    } catch (e) {}

    return null;

  };

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

  const renderFormattedText = (text: string) => {

    const lines = text.split('\n');

    return lines.map((line, idx) => {

      if (line.startsWith('### ')) {

        return <h4 key={idx} className="text-white font-bold text-sm mt-4 mb-2 tracking-wide font-cinzel">{line.slice(4)}</h4>;

      }

      if (line.startsWith('## ')) {

        return <h3 key={idx} className="text-gold-500 font-bold text-base mt-5 mb-2.5 tracking-wide font-cinzel">{line.slice(3)}</h3>;

      }

      if (line.startsWith('# ')) {

        return <h2 key={idx} className="text-white font-black text-lg mt-6 mb-3 tracking-wide font-cinzel border-b border-zinc-800 pb-1">{line.slice(2)}</h2>;

      }

      if (line.startsWith('- ') || line.startsWith('* ')) {

        return <li key={idx} className="text-xs text-gray-300 ml-4 list-disc my-1 leading-relaxed">{line.slice(2)}</li>;

      }

      const parts = line.split('**');

      if (parts.length > 1) {

        return (

          <p key={idx} className="text-xs text-gray-350 my-1.5 leading-relaxed">

            {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-white font-bold">{part}</strong> : part)}

          </p>

        );

      }

      return <p key={idx} className="text-xs text-gray-350 my-1.5 leading-relaxed min-h-[1em]">{line}</p>;

    });

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

    const updated = { ...config, bgm_mappings: updatedBgm };

    saveConfig(updated);

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

    if (!fromWizard) setActiveTab('terminal');

    setLogs(prev => [...prev, "[Mixer] Iniciando mixagem das trilhas sonoras..."]);

    try {

      const res = await fetch(getProjectUrl('/api/music/mix'), { method: 'POST' });

      const data = await res.json();

      if (res.ok) {

        setLogs(prev => [...prev, data.log, "[Mixer] Sucesso! Trilha trilha_documentario.mp3 gerada."]);

        fetchData();

      } else {

        setLogs(prev => [...prev, `[ERRO Mixer] Falha: ${data.error}`, data.log]);

      }

    } catch (err) {

      setLogs(prev => [...prev, `[ERRO Mixer] Conexão falhou: ${err}`]);

    } finally {

      setMixing(false);

    }

  };

  // SSE video rendering

  const triggerRender = async (
    mode: 'standard' | 'highlighted' | 'remotion' | 'remotion-pro',
    fromWizard = false,
    withoutImpactTitles = false,
    useHyperframes = false,
    isProres = false,
    previewSeconds = 0,
    resolution: '1080p' | '2k' = effectiveRenderResolution
  ) => {
    if (rendering) return;

    if (mode === 'remotion' || mode === 'remotion-pro') {
      try {
        const res = await fetch(getProjectUrl('/api/projects/video-quality'));
        if (res.ok) {
          const report: VideoQualityReport = await res.json();
          setVideoQuality(report);
          const errors = report.issues?.filter((i) => i.severity === 'error') || [];
          if (errors.length > 0) {
            const msg = `Qualidade ${report.score}/100 — ${errors.length} erro(s):\n\n${errors.map((e) => `• ${e.message}`).join('\n')}\n\nRenderizar mesmo assim?`;
            if (!window.confirm(msg)) return;
          }
        }
      } catch {
        /* proceed if quality check unavailable */
      }
    }

    const useGeminiChrome = geminiBrowserMode && aiProvider === 'gemini';
    const needsOverlayPlan = mode === 'remotion' || mode === 'remotion-pro';

    setRendering(true);
    setRenderProgress({ percent: 0, phase: 'Inicializando...' });
    if (!fromWizard) setActiveTab('terminal');
    setLogs([]);

    if (needsOverlayPlan && useGeminiChrome) {
      setRenderProgress({ percent: 0, phase: 'Gemini: planejando overlays…' });
      setLogs(['[Dashboard] Consultando Gemini no Chrome para overlays do vídeo…']);
      let overlayWaitSec = 0;
      const overlayProgressTimer = window.setInterval(() => {
        overlayWaitSec += 5;
        setRenderProgress({ percent: 0, phase: `Gemini: planejando overlays (${overlayWaitSec}s)…` });
        setLogs((prev) => [...prev, `[Dashboard] Gemini no Chrome: aguardando JSON de overlays (${overlayWaitSec}s)…`]);
      }, 5000);
      try {
        const { ok, data } = await postAi('/api/render/plan-overlays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hyperframes: useHyperframes !== false }),
        });
        if (!ok || data.needs_browser) {
          setRendering(false);
          setRenderProgress(null);
          toast.error(data.error || 'Falha ao planejar overlays via Gemini no Chrome.');
          return;
        }
        if (!data.overlayCount || data.overlayCount < 1) {
          setRendering(false);
          setRenderProgress(null);
          toast.error(data.error || 'Gemini não gerou overlays válidos. Reabra o Chrome e tente o render novamente.');
          return;
        }
        setLogs((prev) => [...prev, `[Dashboard] ${data.overlayCount} overlays enriquecidos planejados (sem repetir narração).`]);
      } catch (err: any) {
        setRendering(false);
        setRenderProgress(null);
        toast.error(err?.message || 'Conexão falhou ao planejar overlays.');
        return;
      } finally {
        window.clearInterval(overlayProgressTimer);
      }
    }

    if (fromWizard) {
      if (useGeminiChrome) {
        setRenderProgress({ percent: 0, phase: 'Gemini: metadados do vídeo…' });
        setLogs((prev) => [...prev, '[Dashboard] Consultando Gemini no Chrome para metadados…']);
        const metaOk = await generateYoutubeMetadata({ silent: true, keepExistingOnError: true });
        if (metaOk) {
          setLogs((prev) => [...prev, '[Dashboard] Metadados YouTube gerados.']);
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
    if (useHyperframes) queryParams.push("hyperframes=1");
    if (isProres) queryParams.push("prores=1");
    if (previewSeconds > 0) queryParams.push(`preview=${previewSeconds}`);
    if (resolution === '2k') queryParams.push('resolution=2k');
    const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

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

    eventSource.onerror = (err) => {

      setLogs(prev => [...prev, `[Erro Conexão] SSE encerrado inesperadamente.`]);

      eventSource.close();

      setRendering(false);

    };

  };

  const getFormatBytes = (bytes: number) => {

    if (bytes === 0) return '0 Bytes';

    const k = 1024;

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];

  };

  const renderRichTimelineEditor = () => {
    if (!config) return null;
    return (
      <div className="space-y-6">

                  {/* Action buttons row at the top */}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl gap-4">

                    <div>

                      <h4 className="font-cinzel text-xs font-bold text-white tracking-wider uppercase">Arquivos de Mídia por Bloco</h4>

                      <p className="text-[10px] text-gray-400 mt-0.5">Adicione, ordene, exclua e configure mídias que constituem o vídeo em cada bloco.</p>

                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">

                      <div className="flex items-center gap-2">

                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Formato:</span>

                        <select

                          value={config.aspect_ratio || '16:9'}

                          onChange={(e) => {

                            const newRatio = e.target.value as '16:9' | '9:16';

                            setConfig({ ...config, aspect_ratio: newRatio });

                          }}

                          className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-gold-500 cursor-pointer"

                        >

                          <option value="16:9">16:9 (Horizontal)</option>

                          <option value="9:16">9:16 (Vertical)</option>

                        </select>

                      </div>

                                            <button
                        disabled={creatorLoading}
                        onClick={handleAutoMapAssets}
                        className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-gold-500 text-[10px] font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                        title="Mapear arquivos locais na pasta ASSETS para as cenas automaticamente com Inteligência Artificial"
                      >
                        {creatorLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-gold-500" />}
                        <span>Associar Mídias com IA</span>
                      </button>

<button

                        onClick={() => handleSaveConfig()}

                        className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-[10px] font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"

                      >

                        <Save className="w-3.5 h-3.5" /> Salvar Linha do Tempo

                      </button>

                      {status?.has_narration && (

                        <button

                          onClick={() => alignAllBlocksToSpeech()}

                          className="bg-emerald-950 border border-emerald-900/50 hover:bg-emerald-900 hover:border-emerald-800 text-emerald-400 text-[10px] font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"

                          title="Sincronizar TODOS os blocos automaticamente com o tempo da voz da narração"

                        >

                          <Sparkles className="w-3.5 h-3.5" /> Sincronizar Todos com a Voz

                        </button>

                      )}

                    </div>

                  </div>

                  {(() => {

                    const maxBlocks = config.block_phrases ? config.block_phrases.length : (status?.block_timings?.durations?.length || 12);

                    const blockNums = Array.from({ length: maxBlocks }, (_, i) => i + 1);

                    return blockNums.map((blockNum) => {

                        const blockKey = String(blockNum);

                        const blockNarrationDur = (status?.block_timings?.durations && status.block_timings.durations[blockNum - 1]) || 10.0;

                        // Calculate actual total from asset durations

                        const blockAssets = config.timeline_assets?.[blockKey] || [];

                        const actualBlockTotal = blockAssets.reduce((_sum: number, _: any, i: number) => _sum + getAssetDuration(blockKey, i), 0);

                        return (

                          <div key={blockKey} className="glass-panel p-6 rounded-3xl space-y-4">

                            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">

                              <div>

                                <h4 className="font-cinzel text-md font-bold text-gold-500">Bloco {blockKey}</h4>

                                <span className="text-[10px] text-zinc-500 font-mono">

                                  Duração Total: {actualBlockTotal.toFixed(1)}s

                                  <span className={`ml-2 ${Math.abs(actualBlockTotal - blockNarrationDur) < 0.3 ? 'text-emerald-500' : 'text-amber-500'}`}>

                                    (Narração: {blockNarrationDur.toFixed(1)}s)

                                  </span>

                                </span>

                              </div>

                              <div className="flex items-center gap-4">

                                {/* Audio Upload for this block */}

                                <div className="flex items-center gap-2">

                                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">BGM:</span>

                                  {(() => {

                                    const mappedFile = config?.bgm_mappings?.find((m: any) => m.block === blockNum)?.file;

                                    return mappedFile ? (

                                      <div className="flex items-center gap-1.5 min-w-0">

                                        <span className="text-[10px] text-gold-400 font-mono max-w-[100px] truncate" title={mappedFile}>

                                          🎵 {mappedFile}

                                        </span>

                                        <button

                                          onClick={() => togglePlayMusic(mappedFile)}

                                          className="text-gold-500 hover:text-gold-400 hover:bg-zinc-900 p-0.5 rounded cursor-pointer shrink-0 transition"

                                          title="Ouvir trilha"

                                        >

                                          {playingMusic === mappedFile ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-gold-500" />}

                                        </button>

                                      </div>

                                    ) : (

                                      <span className="text-[10px] text-zinc-650 italic">Padrão</span>

                                    );

                                  })()}

                                  <input type="file" accept="audio/mpeg,audio/mp3,audio/wav" className="hidden" id={`bgm-upload-${blockKey}`}

                                         onChange={async (e) => {

                                           if (e.target.files && e.target.files[0]) {

                                              const file = e.target.files[0];

                                              try {

                                                const res = await fetch(getProjectUrl(`/api/upload-bgm?block=${blockKey}&filename=${encodeURIComponent(file.name)}`), {

                                                  method: 'POST', 

                                                  headers: { 'Content-Type': file.type || 'audio/mpeg' },

                                                  body: file

                                                });

                                                if (res.ok) {

                                                  toast.success(`Trilha do Bloco ${blockKey} atualizada!`);

                                                  fetchData();

                                                } else {

                                                  toast.error('Erro ao enviar trilha sonora.');

                                                }

                                              } catch(err) {

                                                toast.error('Falha de conexão.');

                                              }

                                           }

                                         }} />

                                  <label htmlFor={`bgm-upload-${blockKey}`} className="bg-zinc-900 border border-zinc-800 text-white text-[10px] px-3 py-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer flex items-center gap-1.5 transition">

                                    <Upload className="w-3 h-3" /> Upload Trilha

                                  </label>

                                </div>

                                {/* Speech sync button */}

                                {status?.has_narration && (
                                  <button
                                    onClick={() => splitBlockNarrationAmongAssets(blockKey)}
                                    className="bg-violet-950 border border-violet-900/50 hover:bg-violet-900 hover:border-violet-800 text-violet-300 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                                    title="Divide o texto do bloco proporcionalmente entre os assets (não altera arquivos nem ordem)"
                                  >
                                    <Layers className="w-3.5 h-3.5" /> Dividir narração
                                  </button>
                                )}
                                {status?.has_narration && (
                                  <button
                                    onClick={() => alignBlockAssetsToSpeech(blockKey)}

                                    className="bg-emerald-950 border border-emerald-900/50 hover:bg-emerald-900 hover:border-emerald-800 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"

                                    title="Sincronizar a duração das imagens com a fala da narração"

                                  >

                                    <Sparkles className="w-3.5 h-3.5" /> Sincronizar com a Voz

                                  </button>

                                )}

                                {/* Add asset button */}

                                <button

                                  onClick={() => addTimelineAsset(blockKey)}

                                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"

                                >

                                  <Plus className="w-3.5 h-3.5" /> Add Asset

                                </button>

                              </div>

                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                              {(config.timeline_assets?.[blockKey] || []).map((asset: any, idx: number) => (

                                <div key={idx} className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex flex-col justify-between space-y-3 hover:border-zinc-855 transition">

                                  {/* Visual Preview */}

                                  <div 

                                    className={`bg-zinc-950 rounded-lg overflow-hidden relative flex items-center justify-center border border-zinc-900 group/preview mx-auto ${

                                      config.aspect_ratio === '9:16' ? 'h-64' : 'w-full'

                                    }`}

                                    style={{ aspectRatio: config.aspect_ratio === '9:16' ? '9/16' : '16/9' }}

                                  >

                                    {asset.type === 'video' ? (

                                      <video 

                                        key={asset.asset}

                                        src={getAssetUrl(asset.asset)} 

                                        className="w-full h-full object-cover" 

                                        controls={false} 

                                        muted 

                                        loop 

                                        autoPlay 

                                        playsInline 

                                        onLoadedMetadata={(e) => {

                                          const dur = e.currentTarget.duration;

                                          if (dur && !isNaN(dur)) {

                                            setVideoFileDurations(prev => {

                                              if (prev[asset.asset] === dur) return prev;

                                              return { ...prev, [asset.asset]: dur };

                                            });

                                          }

                                        }}

                                        onLoadedData={(e) => {

                                          e.currentTarget.style.display = 'block';

                                        }}

                                        onError={(e) => {

                                          e.currentTarget.style.display = 'none';

                                        }}

                                      />

                                    ) : (

                                      <img 

                                        key={asset.asset}

                                        src={getAssetUrl(asset.asset)} 

                                        className="w-full h-full object-cover" 

                                        alt="Preview" 

                                        onLoad={(e) => {

                                          e.currentTarget.style.display = 'block';

                                        }}

                                        onError={(e) => {

                                          e.currentTarget.style.display = 'none';

                                        }}

                                      />

                                    )}

                                    {/* Overlay duration */}

                                    <div className="absolute bottom-2 right-2 bg-black/70 text-white font-mono text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">

                                      ⏱️ {getAssetDuration(blockKey, idx).toFixed(1)}s

                                      {asset.type === 'video' && videoFileDurations[asset.asset] !== undefined && (

                                        <span className="text-zinc-400 font-normal ml-0.5 border-l border-zinc-700 pl-1">

                                          / {videoFileDurations[asset.asset].toFixed(1)}s

                                        </span>

                                      )}

                                    </div>

                                  </div>

                                  {/* Dynamic narration - words redistribute based on asset duration */}

                                  {(() => {

                                    const dynamicResult = getDynamicAssetWords(blockKey, idx);

                                    const staticNarration = getAssetNarration(blockKey, idx);

                                    if (!dynamicResult && !staticNarration) return null;

                                    const actualDuration = getAssetDuration(blockKey, idx);

                                    const scenePlayKey = `scene-${blockKey}-${idx}`;

                                    const isPlaying = playingNarration === scenePlayKey;

                                    // Use dynamic words if available

                                    const displayWords = dynamicResult ? dynamicResult.words : [];

                                    const hasDynamic = dynamicResult !== null && dynamicResult.totalBlockWords > 0;

                                    // Coverage info for the whole block (show only on last asset)

                                    const totalAssets = config?.timeline_assets?.[blockKey]?.length || 0;

                                    const isLastAsset = idx === totalAssets - 1;

                                    const coveragePercent = dynamicResult ? Math.round((dynamicResult.coveredWords / dynamicResult.totalBlockWords) * 100) : 0;

                                    const allWordsCovered = dynamicResult ? dynamicResult.coveredWords >= dynamicResult.totalBlockWords : false;

                                    return (

                                      <div className={`bg-zinc-900/50 p-2.5 rounded-lg border ${

                                        hasDynamic && displayWords.length > 0

                                          ? 'border-emerald-900/30'

                                          : hasDynamic && displayWords.length === 0

                                            ? 'border-zinc-900/30'

                                            : 'border-zinc-850/50'

                                      } flex flex-col gap-1.5 select-text`}>

                                        <div className="flex items-start gap-2.5">

                                          <Bot className="w-3.5 h-3.5 text-gold-500 shrink-0 mt-0.5" />

                                          <div className="flex-1 min-w-0">

                                            <div className="flex justify-between items-center mb-1">

                                              <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">

                                                {hasDynamic ? 'Narração Dinâmica' : 'Narração Recomendada'}

                                              </span>

                                              {status?.has_narration && dynamicResult && (

                                                <div className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-400">

                                                  <span className="text-emerald-400 font-bold" title="Janela de tempo deste asset na narração">

                                                    🟢 {formatTime(dynamicResult.assetAudioStart)} - {formatTime(dynamicResult.assetAudioEnd)} ({actualDuration.toFixed(1)}s)

                                                  </span>

                                                  <span className="text-zinc-600 text-[8px]">

                                                    {displayWords.length} palavras

                                                  </span>

                                                  <button

                                                    onClick={() => togglePlaySceneNarration(blockKey, idx)}

                                                    className={`p-0.5 rounded cursor-pointer transition shrink-0 ${

                                                      isPlaying

                                                        ? 'bg-gold-500 text-zinc-950 hover:bg-gold-600 animate-pulse'

                                                        : 'bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-gold-500'

                                                    }`}

                                                    title={isPlaying ? "Pausar" : "Ouvir este trecho"}

                                                  >

                                                    {isPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 text-gold-500" />}

                                                  </button>

                                                </div>

                                              )}

                                            </div>

                                            <p className="text-[10px] italic leading-relaxed select-text flex flex-wrap" title={displayWords.length > 0 ? dynamicResult?.text : staticNarration}>

                                              <span className="text-zinc-500 mr-1">"</span>

                                              {hasDynamic && displayWords.length > 0 ? (

                                                displayWords.map((part: any, pIdx: number) => (

                                                  <span

                                                    key={pIdx}

                                                    className="text-zinc-100 font-medium mr-1"

                                                    title={`Fala em ${formatTime(part.start)}`}

                                                  >

                                                    {part.word}

                                                  </span>

                                                ))

                                              ) : hasDynamic && displayWords.length === 0 ? (

                                                <span className="text-zinc-600 italic text-[9px]">

                                                  (sem palavras nesta janela de tempo — ajuste a duração dos assets anteriores)

                                                </span>

                                              ) : (

                                                <span className="text-zinc-300">{staticNarration}</span>

                                              )}

                                              <span className="text-zinc-500">"</span>

                                            </p>

                                          </div>

                                        </div>

                                        {/* Coverage indicator on last asset of block */}

                                        {isLastAsset && hasDynamic && (

                                          <div className="flex items-center gap-2 mt-1 pl-6">

                                            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">

                                              <div

                                                className={`h-full rounded-full transition-all duration-300 ${

                                                  allWordsCovered ? 'bg-emerald-500' : coveragePercent >= 80 ? 'bg-amber-500' : 'bg-red-500'

                                                }`}

                                                style={{ width: `${Math.min(coveragePercent, 100)}%` }}

                                              />

                                            </div>

                                            <span className={`text-[8px] font-mono font-bold ${

                                              allWordsCovered ? 'text-emerald-400' : coveragePercent >= 80 ? 'text-amber-400' : 'text-red-400'

                                            }`}>

                                              {allWordsCovered

                                                ? `✅ ${dynamicResult!.totalBlockWords} palavras cobertas`

                                                : `⚠️ ${dynamicResult!.coveredWords}/${dynamicResult!.totalBlockWords} palavras (${coveragePercent}%) — aumente a duração dos assets`

                                              }

                                            </span>

                                          </div>

                                        )}

                                      </div>

                                    );

                                  })()}

                                  {/* Asset info */}

                                  <div className="space-y-1">

                                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">

                                      <span>Asset #{idx + 1}</span>

                                      <div className="flex items-center gap-1">

                                        <button

                                          disabled={idx === 0}

                                          onClick={() => moveTimelineAsset(blockKey, idx, 'up')}

                                          className="hover:text-white disabled:opacity-30 p-0.5 rounded cursor-pointer"

                                          title="Subir"

                                        >

                                          <ChevronUp className="w-3.5 h-3.5" />

                                        </button>

                                        <button

                                          disabled={idx === (config.timeline_assets?.[blockKey] || []).length - 1}

                                          onClick={() => moveTimelineAsset(blockKey, idx, 'down')}

                                          className="hover:text-white disabled:opacity-30 p-0.5 rounded cursor-pointer"

                                          title="Descer"

                                        >

                                          <ChevronDown className="w-3.5 h-3.5" />

                                        </button>

                                      </div>

                                    </div>

                                    <input

                                      type="text"

                                      value={asset.asset}

                                      onChange={(e) => updateTimelineAssetField(blockKey, idx, 'asset', e.target.value)}

                                      placeholder="Nome do arquivo..."

                                      className="w-full bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-lg px-2.5 py-1 text-xs text-white"

                                    />

                                  </div>

                                  {/* Type and fixed duration */}

                                  <div className="flex justify-between items-center gap-2">

                                    <div className="space-y-0.5 flex-1">

                                      <span className="text-[9px] text-zinc-500 uppercase">Tipo</span>

                                      <select

                                        value={asset.type}

                                        onChange={(e) => updateTimelineAssetField(blockKey, idx, 'type', e.target.value)}

                                        className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-1.5 py-1 w-full focus:outline-none"

                                      >

                                        <option value="image">Imagem</option>

                                        <option value="video">Vídeo</option>

                                        <option value="svg">SVG</option>

                                      </select>

                                    </div>

                                    <div className="space-y-0.5 w-20">

                                      <span className="text-[9px] text-zinc-500 uppercase">Duração (s)</span>

                                      <input

                                        type="number"

                                        step="0.5"

                                        min="0.5"

                                        value={asset.fixed !== undefined && asset.fixed !== null ? asset.fixed : ''}

                                        placeholder={`Auto (${getAssetDuration(blockKey, idx).toFixed(1)}s)`}

                                        onChange={(e) => {

                                          const val = e.target.value === '' ? undefined : parseFloat(e.target.value);

                                          updateTimelineAssetField(blockKey, idx, 'fixed', val);

                                        }}

                                        className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-1.5 py-1 w-full text-center focus:outline-none"

                                      />

                                    </div>

                                  </div>

                                  {/* Actions row: Replace/Substituir and Delete */}

                                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900">

                                    <button

                                      onClick={() => deleteTimelineAsset(blockKey, idx)}

                                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"

                                    >

                                      <Trash2 className="w-3.5 h-3.5" /> Excluir

                                    </button>

                                    <input type="file" accept={asset.type === 'video' ? "video/mp4" : "image/png,image/jpeg"} className="hidden" id={`asset-upload-${blockKey}-${idx}`}

                                       onChange={(e) => {

                                         if (e.target.files && e.target.files[0]) {

                                            handleUploadSceneAsset(parseInt(blockKey), asset.type === 'video' ? 'video' : 'image', e.target.files[0], idx, selectedProject);

                                         }

                                       }} />

                                    <label htmlFor={`asset-upload-${blockKey}-${idx}`} className="text-gold-500 hover:text-gold-400 text-[10px] cursor-pointer hover:underline flex items-center gap-1.5 transition">

                                      <Upload className="w-3.5 h-3.5" /> Substituir

                                    </label>

                                  </div>

                                </div>

                              ))}

                            </div>

                          </div>

                        );

                      });

                  })()}

                  {/* Save button at bottom too */}

                  <div className="flex justify-end pt-4">

                    <button

                      onClick={() => handleSaveConfig()}

                      className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"

                    >

                      <Save className="w-4 h-4" /> Salvar Linha do Tempo e Configuração

                    </button>

                  </div>

                </div>
    );
  };

  return (

    <div className="min-h-screen flex flex-col bg-[#070708] text-gray-200">

      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1c1c24', color: '#fff', border: '1px solid #2d2d3d' } }} />

      {/* Header */}

      <header className="border-b border-gray-800 bg-[#0c0c0e] py-4 px-8 flex justify-between items-center shrink-0">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">

            <Sparkles className="w-5 h-5 text-gold-500 animate-pulse" />

          </div>

          <div>

            <h1 className="font-cinzel font-bold text-lg text-white tracking-wide">LUMIERA CINEMATIC STUDIO</h1>

            <p className="text-xs text-gray-500 font-sans">Painel de Controle e Renderização Automatizada • {activeProject}</p>

          </div>

        </div>

        <div className="flex items-center gap-4">

          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs">

            <div className="flex items-center gap-2">

              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>

              <span className="text-gray-300 font-medium whitespace-nowrap">Servidor Ativo</span>

            </div>

            <span className="h-4 w-px bg-zinc-700"></span>

            <div className="flex items-center gap-1.5 text-gray-400 whitespace-nowrap">

              <CalendarDays className="w-3.5 h-3.5 text-gold-500" />

              <span>{formattedHeaderDate}</span>

            </div>

            <div className="flex items-center gap-1.5 text-gray-400 whitespace-nowrap">

              <Thermometer className="w-3.5 h-3.5 text-amber-400" />

              <span>{headerTemperatureLabel}</span>

            </div>

          </div>

          <button 

            onClick={() => setActiveTab('settings')}

            className={`p-2 border rounded-lg transition duration-150 cursor-pointer ${

              activeTab === 'settings'

                ? 'bg-gold-500/10 border-gold-500/30 text-gold-500'

                : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white'

            }`}

            title="Configurações"

          >

            <Settings className="w-4 h-4" />

          </button>

          <button 

            onClick={fetchData} 

            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-white transition duration-150 cursor-pointer"

            title="Atualizar dados"

          >

            <RefreshCw className="w-4 h-4" />

          </button>

        </div>

      </header>

      {/* Main Workspace */}

      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar Tabs */}

        <aside className="w-56 border-r border-gray-850 bg-[#0a0a0c] flex flex-col shrink-0 select-none h-full overflow-hidden">

          <div className="shrink-0 p-4 space-y-3 border-b border-zinc-900/60">

            {/* Global AI Project Creator Button */}

            <div className="space-y-2">

              <button 

                onClick={() => {

                  setActiveTab('creator');

                  setCreatorStep(1);

                  setIdeasData(null);

                  setSelectedIdeaIndex(-1);

                  setGeneratedScriptData(null);

                  setCreatorProjectName('');

                }}

                className={`w-full py-3 px-4 rounded-xl text-xs font-bold font-sans tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-[1.02] ${

                  activeTab === 'creator'

                    ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-zinc-950 shadow-gold-500/10'

                    : 'bg-zinc-900 border border-zinc-800 text-gold-500 hover:text-white hover:bg-zinc-850 hover:border-zinc-700'

                }`}

              >

                <Sparkles className="w-4 h-4 animate-pulse" />

                <span>Novo Projeto com IA</span>

              </button>

            </div>

          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 font-sans min-h-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
              <input
                type="search"
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                placeholder="Buscar projeto..."
                className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold-500/40 font-sans"
              />
            </div>

            {projectSearchQuery.trim() ? (
              <div className="space-y-0.5">
                {projects.filter((p) => matchesProjectSearch(p, projectSearchQuery)).length === 0 ? (
                  <p className="text-[10px] text-zinc-600 italic px-1">Nenhum projeto encontrado</p>
                ) : (
                  projects
                    .filter((p) => matchesProjectSearch(p, projectSearchQuery))
                    .map((proj) => renderSidebarProjectItem(proj))
                )}
              </div>
            ) : (
              <>
                {recentProjects.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Recentes</span>
                    {recentProjects
                      .map((name) => projects.find((p) => p.name === name))
                      .filter((proj): proj is ProjectListItem => Boolean(proj))
                      .map((proj) => renderSidebarProjectItem(proj))}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Longos (16:9)</span>
                    <button
                      type="button"
                      onClick={() => { setNewProjectFormat('LONGO'); setNewProjectNiche('Geral'); setShowCreateModal(true); }}
                      className="p-1 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-gold-500 transition cursor-pointer"
                      title="Criar Novo Projeto Longo"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1">{renderProjectNicheGroups('LONGO')}</div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-900/60">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Shorts (9:16)</span>
                    <button
                      type="button"
                      onClick={() => { setNewProjectFormat('SHORTS'); setNewProjectNiche('Geral'); setShowCreateModal(true); }}
                      className="p-1 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-gold-500 transition cursor-pointer"
                      title="Criar Novo Projeto Curto"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1">{renderProjectNicheGroups('SHORTS')}</div>
                </div>
              </>
            )}
          </div>

          <div className="shrink-0 px-4 py-3 text-[9px] text-gray-500 leading-normal border-t border-gray-850 font-sans">

            Desenvolvido por Antigravity Studio. Versão 1.2.0 • Remotion e Hyperframe Engine.

          </div>

        </aside>

        {/* Tab Content Panel */}

        <main className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
          {activeTab !== 'creator' && activeTab !== 'settings' && (
            <div className="shrink-0 border-b border-zinc-800/80 bg-[#0a0a0c]/95 backdrop-blur-sm px-6 py-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-sans">Projeto ativo</p>
                  <p className="text-sm font-bold text-white truncate font-cinzel">{activeProject}</p>
                </div>
                <nav className="flex gap-1 overflow-x-auto pb-0.5">
                  {PROJECT_WORKSPACE_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                          isActive
                            ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="whitespace-nowrap">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-8">

          {/* TAB: RENDER */}

          {activeTab === 'status' && (

            <div className="space-y-8 animate-fade-in">

              {videoQuality && (
                <div className="glass-panel p-5 rounded-2xl font-sans">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 ${videoQuality.ok ? 'text-emerald-400' : 'text-amber-400'}`} />
                      Qualidade Pré-Render
                    </h3>
                    <div className="flex items-center gap-3">
                      {videoQuality.preset && (
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Preset: {videoQuality.preset}</span>
                      )}
                      {videoQuality.epidemicMood && (
                        <span className="text-[10px] text-zinc-500">BGM: {videoQuality.epidemicMood}</span>
                      )}
                      <span className={`text-lg font-bold tabular-nums ${videoQuality.score >= 80 ? 'text-emerald-400' : videoQuality.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                        {videoQuality.score}/100
                      </span>
                      <button
                        type="button"
                        onClick={() => fetchVideoQuality()}
                        className="text-[10px] text-zinc-400 hover:text-gold-400 transition flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Atualizar
                      </button>
                    </div>
                  </div>
                  {videoQuality.issues.length > 0 ? (
                    <ul className="mt-3 space-y-1.5 max-h-28 overflow-y-auto">
                      {videoQuality.issues.slice(0, 6).map((issue, idx) => (
                        <li
                          key={`${issue.code}-${idx}`}
                          className={`text-[11px] leading-snug flex gap-2 ${
                            issue.severity === 'error' ? 'text-red-300' : issue.severity === 'warning' ? 'text-amber-300/90' : 'text-zinc-500'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 opacity-70" />
                          <span>{issue.message}</span>
                        </li>
                      ))}
                      {videoQuality.issues.length > 6 && (
                        <li className="text-[10px] text-zinc-500 pl-5">+{videoQuality.issues.length - 6} observação(ões)</li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-zinc-500 mt-2">Sem observações — overlays, gancho e orçamento dentro do esperado.</p>
                  )}
                </div>
              )}

              {config && !status?.has_narration && (
                <div className="glass-panel px-4 py-3 rounded-xl border border-amber-500/25 bg-amber-500/5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] text-amber-200/90">
                    Projeto ainda sem narração ou preparação completa. Use Workflow e Tarefas antes de renderizar.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('workflow')}
                    className="text-[10px] font-bold text-amber-300 hover:text-amber-100 border border-amber-500/40 px-3 py-1.5 rounded-lg transition"
                  >
                    Ir para Workflow →
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 glass-panel px-4 py-2.5 rounded-xl border border-zinc-800/80">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Tv className="w-3.5 h-3.5 text-gold-500" />
                  <span>Resolução ativa: <strong className="text-gold-400">{renderResolutionLabel}</strong></span>
                  {config?.render_resolution ? (
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">· projeto</span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">· global</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="text-[10px] text-zinc-500 hover:text-gold-400 transition"
                >
                  Alterar em Configurações →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                
                {/* Compiler Card */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-72 font-sans">
                  <div>
                    <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">
                      <Tv className="w-4 h-4 text-gold-500" /> RENDERIZADOR PADRÃO
                    </h3>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      Gera o documentário cinematográfico padrão com as legendas animadas em Gold/Water Blue e efeitos de zoom Ken Burns anti-jitter.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <button 
                      disabled={rendering || !status?.has_narration}
                      onClick={() => triggerRender('standard')}
                      className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-gold-500/10 cursor-pointer w-full"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Iniciar Compilação Padrão</span>
                    </button>
                    <button
                      disabled={rendering || !status?.has_narration}
                      onClick={() => triggerRender('standard', false, true)}
                      className="bg-zinc-900 border border-zinc-800 hover:border-gold-500/40 disabled:opacity-50 disabled:cursor-not-allowed text-gold-500 font-bold py-2 rounded-xl transition flex items-center justify-center gap-2 text-[11px] cursor-pointer w-full"
                      title="Renderiza mantendo as legendas normais, mas removendo os textos grandes de impacto no centro da tela."
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Render sem Titulos Grandes</span>
                    </button>
                  </div>
                </div>

                {/* Remotion Quick info */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-72 font-sans">
                  <div>
                    <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-water-300" /> REMOTION ENGINE
                    </h3>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      Monta o vídeo pela linha do tempo mapeada, narração sincronizada e legendas geradas a partir da transcrição.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      disabled={rendering || !status?.has_narration}
                      onClick={() => triggerRender('remotion')}
                      className="bg-water-500/15 border border-water-400/30 hover:bg-water-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-water-200 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs cursor-pointer w-full"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Renderizar via Remotion</span>
                    </button>
                  </div>
                </div>

                {/* Remotion PRO Card */}
                <div className="glass-panel-glow border border-amber-500/30 p-6 rounded-2xl flex flex-col justify-between h-72 font-sans">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" /> REMOTION PRO
                      </h3>
                      <span className="bg-amber-500/15 text-amber-500 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Premium</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      Gera a versão premium contendo infográficos animados automáticos (Lower Thirds, textos cinéticos de impacto e contadores numéricos).
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      disabled={rendering || !status?.has_narration}
                      onClick={() => triggerRender('remotion-pro')}
                      className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-amber-500/10 cursor-pointer w-full"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Renderizar via Remotion PRO</span>
                    </button>
                    <button
                      disabled={rendering || !status?.has_narration}
                      onClick={() => triggerRender('remotion-pro', false, false, false, false, 30)}
                      className="bg-zinc-900 border border-amber-500/30 hover:border-amber-400/50 disabled:opacity-50 disabled:cursor-not-allowed text-amber-300 font-bold py-2 rounded-xl transition flex items-center justify-center gap-2 text-[11px] cursor-pointer w-full"
                      title="Renderiza só os primeiros 30 segundos para validar gancho e ritmo"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Preview 30s (PRO)</span>
                    </button>
                  </div>
                </div>

                {/* Remotion PRO + HyperFrames AI Card */}
                <div className="glass-panel-glow border border-emerald-500/30 p-6 rounded-2xl flex flex-col justify-between h-72 font-sans">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" /> HYPERFRAMES AI
                      </h3>
                      <span className="bg-emerald-500/15 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Orquestrado</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 leading-normal">
                      Orquestração visual por IA baseada no catálogo HyperFrames. Suporta transparência (ProRes) e mola física.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="flex items-center gap-1.5 text-[9px] text-zinc-400 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        id="prores-alpha-checkbox" 
                        className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer w-3 h-3" 
                      />
                      <span>Fundo Transparente (ProRes Alpha)</span>
                    </label>
                    <button
                      disabled={rendering || !status?.has_narration}
                      onClick={() => {
                        const proresCheck = document.getElementById('prores-alpha-checkbox') as HTMLInputElement;
                        triggerRender('remotion-pro', false, false, true, proresCheck?.checked);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-500/10 cursor-pointer w-full"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Render HyperFrames AI</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Rendered Videos List */}

              <div className="glass-panel p-6 rounded-3xl space-y-4">

                <h3 className="font-cinzel text-sm font-bold text-white tracking-wide">VÍDEOS RENDERIZADOS NA SAÍDA (OUTPUT)</h3>

                {outputs.length === 0 ? (

                  <div className="text-center py-10 bg-zinc-950/20 border border-zinc-900 rounded-2xl text-gray-500 text-xs font-sans">

                    Nenhum arquivo final encontrado na pasta OUTPUT. Inicie uma compilação acima.

                  </div>

                ) : (

                  <div className="divide-y divide-zinc-900 border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/20 font-sans">

                    {outputs.map((video) => (

                      <div key={video.name} className="flex justify-between items-center p-4 hover:bg-zinc-900/10 transition">

                        <div className="flex items-center gap-3">

                          <Video className="w-4.5 h-4.5 text-gold-500" />

                          <div>

                            <div className="flex items-center gap-2">

                              <span className="text-xs font-semibold text-white block">{video.name}</span>

                              <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${

                                video.renderEngine === 'remotion'

                                  ? 'text-water-300 bg-water-500/10 border-water-400/20'

                                  : 'text-gold-500 bg-gold-500/10 border-gold-500/20'

                              }`}>

                                {video.renderEngineLabel || (video.name.toLowerCase().startsWith('remotion_') ? 'Remotion' : 'Renderizador Padrão')}

                              </span>

                            </div>

                            <span className="text-[10px] text-gray-500">Modificado em {new Date(video.modifiedAt).toLocaleString('pt-BR')}</span>

                          </div>

                        </div>

                        <div className="flex items-center gap-3 font-sans">

                          <span className="text-xs font-mono text-zinc-400 mr-2">{getFormatBytes(video.sizeBytes)}</span>

                          <button 

                            onClick={() => {

                              const videoPath = activeProject === "Buracos no Deserto" 

                                ? `/OUTPUT/qanat_persa_video_final/${video.name}`

                                : `/${activeProject}/OUTPUT/qanat_persa_video_final/${video.name}`;

                              setPreviewVideoUrl(`/api/projects-media${videoPath}`);

                            }}

                            className="bg-gold-500 hover:bg-gold-600 text-zinc-950 px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-gold-500/10"

                          >

                            <Play className="w-3.5 h-3.5 fill-current" />

                            <span>Visualizar</span>

                          </button>

                          <a 

                            href={`/api/projects-media${activeProject === "Buracos no Deserto" ? "/OUTPUT/qanat_persa_video_final/" + video.name : "/" + activeProject + "/OUTPUT/qanat_persa_video_final/" + video.name}?download=true`} 

                            download 

                            className="bg-zinc-900 border border-zinc-800 text-gray-300 hover:text-white hover:bg-zinc-800 px-3.5 py-1.5 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5"

                          >

                            <Download className="w-3.5 h-3.5" />

                            <span>Download</span>

                          </a>

                          <button

                            onClick={() => setPendingOutputDelete(video)}

                            className="bg-red-950 border border-red-900/50 text-red-400 hover:bg-red-900 hover:text-red-300 px-3 py-1.5 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer"

                            title={`Excluir ${video.name}`}

                          >

                            <Trash2 className="w-3.5 h-3.5" />

                          </button>

                        </div>

                      </div>

                    ))}

                  </div>

                )}

              </div>

            </div>

          )}

          {activeTab === 'workflow' && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass-panel p-5 rounded-2xl font-sans">
                <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-gold-400" />
                  Workflow e Tarefas
                </h3>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed max-w-2xl">
                  Narração TTS, ComfyUI + LTX, B-roll, auto-map, trilha, metadados e pipelines automáticos.
                  Prepare o projeto aqui; a aba Render fica só para compilar o vídeo final.
                </p>
              </div>

              {config ? (
                <WorkflowToolkit
                  getProjectUrl={getProjectUrl}
                  postAi={postAi}
                  toast={(msg) => toast(msg)}
                  enabled={activeTab === 'workflow'}
                  onTimelineRefresh={() => fetchData()}
                  onMetadataReady={() => fetchData({ includeVideoQuality: true })}
                  onNavigateTab={(tab) => setActiveTab(tab as typeof activeTab)}
                />
              ) : (
                <div className="glass-panel p-8 rounded-2xl text-center text-zinc-500 text-sm">
                  Selecione um projeto para ver as ferramentas de workflow.
                </div>
              )}
            </div>
          )}

          {/* TAB: TIMELINE & BLOCKS */}

          {activeTab === 'timeline' && (
            <TabErrorBoundary label="Roteiro e Tags">
              {!config ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-zinc-400 font-sans">
                  <RefreshCw className={`w-8 h-8 text-gold-500 ${projectDataLoading ? 'animate-spin' : ''}`} />
                  <p className="text-sm">
                    {projectDataLoading ? 'Carregando roteiro e tags do projeto...' : 'Não foi possível carregar a configuração do projeto.'}
                  </p>
                  {!projectDataLoading && (
                    <button
                      type="button"
                      onClick={() => fetchData()}
                      className="text-xs text-gold-400 hover:text-gold-300 border border-gold-500/30 px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Tentar novamente
                    </button>
                  )}
                </div>
              ) : (

            <div className="space-y-8 animate-fade-in">

              {/* Keywords panel */}

              <div className="glass-panel p-6 rounded-3xl space-y-4">

                <div>

                  <h3 className="font-cinzel text-sm font-bold text-white tracking-wide">PALAVRAS-CHAVE EM DESTAQUE (HIGHLIGHT)</h3>

                  <p className="text-xs text-gray-400 mt-1 font-sans">Palavras nesta lista serão destacadas na cor Ouro/Amarelo no vídeo final.</p>

                </div>

                <div className="flex flex-wrap gap-2 p-4 bg-zinc-950 border border-zinc-900 rounded-2xl min-h-[80px] font-sans">

                  {(config.highlight_keywords || []).map(kw => (

                    <span key={kw} className="bg-gold-500/10 border border-gold-500/20 text-gold-500 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">

                      <span>{kw}</span>

                      <button 

                        onClick={() => removeKeyword(kw)} 

                        className="hover:text-red-400 text-gold-500/60 font-bold transition font-mono leading-none cursor-pointer"

                      >

                        ×

                      </button>

                    </span>

                  ))}

                </div>

                <div className="flex gap-3 max-w-md font-sans">

                  <input 

                    type="text" 

                    placeholder="Adicionar nova palavra..." 

                    value={newKeyword}

                    onChange={(e) => setNewKeyword(e.target.value)}

                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}

                    className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white flex-1"

                  />

                  <button 

                    onClick={addKeyword}

                    className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"

                  >

                    Adicionar

                  </button>

                </div>

              </div>

              {/* Block timings list */}

              <div className="glass-panel p-6 rounded-3xl space-y-4">

                <h3 className="font-cinzel text-sm font-bold text-white tracking-wide">TEXTOS DE IMPACTO DA LINHA DO TEMPO (12 BLOCOS)</h3>

                <div className="divide-y divide-zinc-900 border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/20 font-sans">

                  {(config.impact_texts || []).map((impact, idx) => (

                    <div key={idx} className="p-4 hover:bg-zinc-900/10 transition grid grid-cols-1 md:grid-cols-4 gap-4 items-center">

                      <div className="flex items-center gap-2.5">

                        <span className="font-mono text-zinc-500 text-xs font-bold bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-lg">Bloco {impact.block}</span>

                        <span className="text-xs text-gray-400 font-mono">Offset: {impact.start_offset}s → {impact.end_offset}s</span>

                      </div>

                      <div className="col-span-2">

                        {editingImpact?.index === idx ? (

                          <input 

                            type="text"

                            value={editingImpact.text}

                            onChange={(e) => setEditingImpact({ ...editingImpact, text: e.target.value })}

                            onKeyDown={(e) => e.key === 'Enter' && handleSaveImpactText(idx)}

                            className="bg-zinc-950 border border-gold-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-gold-500 font-bold uppercase w-full"

                          />

                        ) : (

                          <span className="text-xs font-bold text-gold-500 tracking-wide uppercase font-cinzel">{impact.text}</span>

                        )}

                      </div>

                      <div className="flex justify-end gap-2">

                        {editingImpact?.index === idx ? (

                          <>

                            <button 

                              onClick={() => handleSaveImpactText(idx)} 

                              className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"

                            >

                              <Save className="w-3.5 h-3.5" /> Salvar

                            </button>

                            <button 

                              onClick={() => setEditingImpact(null)} 

                              className="text-[11px] font-bold text-gray-500 hover:text-gray-400 cursor-pointer"

                            >

                              Cancelar

                            </button>

                          </>

                        ) : (

                          <button 

                            onClick={() => setEditingImpact({ index: idx, text: impact.text })} 

                            className="text-[11px] font-semibold text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"

                          >

                            <FileText className="w-3.5 h-3.5" /> Editar Texto

                          </button>

                        )}

                      </div>

                    </div>

                  ))}

                </div>

              </div>

              {renderRichTimelineEditor()}
            </div>

              )}
            </TabErrorBoundary>
          )}

          {/* TAB 3: SOUNDTRACK STUDIO */}

          {activeTab === 'music' && (
            <TabErrorBoundary label="Trilha BGM">
              {!config ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-zinc-400 font-sans">
                  <RefreshCw className={`w-8 h-8 text-gold-500 ${projectDataLoading ? 'animate-spin' : ''}`} />
                  <p className="text-sm">
                    {projectDataLoading ? 'Carregando trilhas do projeto...' : 'Não foi possível carregar a configuração do projeto.'}
                  </p>
                  {!projectDataLoading && (
                    <button
                      type="button"
                      onClick={() => fetchData()}
                      className="text-xs text-gold-400 hover:text-gold-300 border border-gold-500/30 px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Tentar novamente
                    </button>
                  )}
                </div>
              ) : (

            <div className="space-y-8 animate-fade-in font-sans">

              {/* Mixer Header */}

              <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                <div>

                  <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">

                    <Volume2 className="w-5 h-5 text-gold-500" /> ESTÚDIO DE MIXAGEM DA TRILHA DE FUNDO

                  </h3>

                  <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-2xl">

                    Selecione qual das músicas baixadas deve tocar de fundo em cada bloco. As transições com crossfade de 2.0s serão geradas dinamicamente.

                  </p>

                </div>

                <button 

                  disabled={mixing}

                  onClick={() => mixBGM(true)}

                  className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3.5 rounded-xl transition flex items-center gap-2 shrink-0 shadow-lg shadow-gold-500/10 cursor-pointer"

                >

                  <RefreshCw className={`w-4 h-4 ${mixing ? 'animate-spin' : ''}`} />

                  <span>{mixing ? 'Misturando Trilhas...' : 'Regenerar Trilha Sonora'}</span>

                </button>

              </div>

              {/* Music mappings grid */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Mappings */}

                <div className="glass-panel p-6 rounded-3xl space-y-4">

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900 pb-3 gap-2">

                    <h4 className="font-cinzel text-xs font-bold text-white tracking-widest uppercase">

                      Configuração de Trilha

                    </h4>

                    <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-900 gap-1">

                      <button

                        onClick={() => saveConfig({ ...config, use_single_bgm: false })}

                        className={`text-[9px] font-bold px-2 py-1 rounded transition cursor-pointer ${

                          !config.use_single_bgm

                            ? 'bg-gold-500 text-zinc-950 font-bold'

                            : 'text-zinc-400 hover:text-white'

                        }`}

                      >

                        Por Bloco

                      </button>

                      <button

                        onClick={() => saveConfig({ ...config, use_single_bgm: true })}

                        className={`text-[9px] font-bold px-2 py-1 rounded transition cursor-pointer ${

                          config.use_single_bgm

                            ? 'bg-gold-500 text-zinc-950 font-bold'

                            : 'text-zinc-400 hover:text-white'

                        }`}

                      >

                        Trilha Única

                      </button>

                    </div>

                  </div>

                  {config.use_single_bgm ? (

                    <div className="space-y-4 py-2 animate-fade-in">

                      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-2">

                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">

                          Trilha Sonora Única (Vídeo Inteiro)

                        </span>

                        <p className="text-[11px] text-gray-500 leading-normal">

                          Esta música tocará do início ao fim do vídeo, repetindo se for menor do que a duração total. Recomendado para Shorts e vídeos curtos.

                        </p>

                      </div>

                      {bgmSuggestions?.recommendation && (

                        <div className="bg-zinc-950 border border-gold-500/30 rounded-xl p-4 space-y-2 animate-fade-in relative group">

                          <div className="flex items-center justify-between">

                            <span className="text-[9px] text-gold-500 font-bold uppercase tracking-wider flex items-center gap-1">✨ Sugestão da IA</span>

                            <div className="flex items-center gap-1.5">

                              <button

                                onClick={() => {

                                  navigator.clipboard.writeText(bgmSuggestions.recommendation || '');

                                  toast.success('Ideia copiada!');

                                }}

                                className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded transition flex items-center gap-1 font-sans cursor-pointer"

                                title="Copiar sugestão"

                              >

                                <Copy className="w-3 h-3" /> Copiar Ideia

                              </button>

                              {(bgmSuggestions as any).search_theme && (

                                <button

                                  onClick={() => {

                                    navigator.clipboard.writeText((bgmSuggestions as any).search_theme || '');

                                    toast.success('Termo de busca copiado!');

                                  }}

                                  className="text-[10px] text-gold-500 hover:text-gold-400 px-2 py-0.5 bg-gold-950/20 border border-gold-500/30 hover:border-gold-500/50 rounded transition flex items-center gap-1 font-sans cursor-pointer"

                                  title="Copiar termo de busca"

                                >

                                  <Search className="w-3 h-3" /> Copiar Busca

                                </button>

                              )}

                            </div>

                          </div>

                          <p className="text-[11px] text-zinc-300 leading-relaxed italic">{bgmSuggestions.recommendation}</p>

                          {(bgmSuggestions as any).search_theme && (

                            <div className="text-[10px] text-zinc-400 font-sans border-t border-zinc-900 pt-2 flex items-center gap-1.5">

                              <span className="font-bold text-gold-500">🔍 Buscar por:</span>

                              <code className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-zinc-300 select-all">{(bgmSuggestions as any).search_theme}</code>

                            </div>

                          )}

                        </div>

                      )}

                      <div className="space-y-1.5">

                        <label className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">

                          Selecione a Trilha:

                        </label>

                        <div className="flex gap-2">

                          <select 

                            value={config.single_bgm || ''}

                            onChange={(e) => saveConfig({ ...config, single_bgm: e.target.value })}

                            className="flex-1 bg-zinc-900 border border-zinc-800 text-gray-300 hover:border-zinc-700 focus:outline-none rounded-xl px-3 py-2 text-xs cursor-pointer"

                          >

                            <option value="">-- Nenhuma Selecionada --</option>

                            {safeMusicFiles.map(file => (

                              <option key={file.name} value={file.name}>{file.name}</option>

                            ))}

                          </select>

                          {config.single_bgm && (

                            <button

                              onClick={() => togglePlayMusic(config.single_bgm!)}

                              className="text-gold-500 hover:text-gold-400 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 cursor-pointer transition flex items-center justify-center shrink-0 w-9 h-9"

                              title="Ouvir trilha"

                            >

                              {playingMusic === config.single_bgm ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-gold-500" />}

                            </button>

                          )}

                        </div>

                      </div>

                    </div>

                  ) : (

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 animate-fade-in">

                      {bgmBlockRows.map(bgm => (

                        <div key={bgm.block} className="space-y-1">

                          <div className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-900 rounded-xl gap-4">

                            <span className="text-xs font-bold text-white font-mono shrink-0">Bloco {bgm.block}</span>

                            <div className="flex gap-2 items-center flex-1 justify-end min-w-0">

                              <select 

                                value={bgm.file}

                                onChange={(e) => handleMusicChange(bgm.block, e.target.value)}

                                className="bg-zinc-900 border border-zinc-800 text-gray-300 hover:border-zinc-700 focus:outline-none rounded-lg px-2 py-1.5 text-xs cursor-pointer max-w-[200px] truncate"

                              >

                                <option value="">-- Nenhuma --</option>

                                {safeMusicFiles.map(file => (

                                  <option key={file.name} value={file.name}>{file.name}</option>

                                ))}

                              </select>

                              {bgm.file && (

                                <button

                                  onClick={() => togglePlayMusic(bgm.file)}

                                  className="text-gold-500 hover:text-gold-400 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 cursor-pointer shrink-0 transition"

                                  title="Ouvir trilha"

                                >

                                  {playingMusic === bgm.file ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-gold-500" />}

                                </button>

                              )}

                            </div>

                          </div>

                          {(() => {

                            const suggestion = bgmSuggestions?.suggestions?.find((s: any) => s.block === bgm.block);

                            if (!suggestion) return null;

                            return (

                              <div className="ml-2 px-3 py-2 border-l-2 border-gold-500/40 bg-zinc-950/40 rounded-r space-y-1.5 animate-fade-in">

                                <div className="flex items-center justify-between gap-2">

                                  <span className="text-[9px] text-gold-500 font-bold uppercase tracking-wider">✨ Sugestão da IA (Bloco {bgm.block})</span>

                                  <div className="flex items-center gap-1.5">

                                    <button

                                      onClick={() => {

                                        navigator.clipboard.writeText(suggestion.recommendation || '');

                                        toast.success('Ideia do bloco copiada!');

                                      }}

                                      className="text-[9px] text-zinc-400 hover:text-white px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded transition flex items-center gap-1 font-sans cursor-pointer"

                                      title="Copiar sugestão"

                                    >

                                      <Copy className="w-2.5 h-2.5" /> Copiar Ideia

                                    </button>

                                    {suggestion.search_theme && (

                                      <button

                                        onClick={() => {

                                          navigator.clipboard.writeText(suggestion.search_theme || '');

                                          toast.success('Busca do bloco copiada!');

                                        }}

                                        className="text-[9px] text-gold-500 hover:text-gold-400 px-1.5 py-0.5 bg-gold-950/20 border border-gold-500/30 rounded transition flex items-center gap-1 font-sans cursor-pointer"

                                        title="Copiar busca"

                                      >

                                        <Search className="w-2.5 h-2.5" /> Copiar Busca

                                      </button>

                                    )}

                                  </div>

                                </div>

                                <p className="text-[10px] text-zinc-300 leading-relaxed italic">

                                  {suggestion.recommendation}

                                </p>

                                {suggestion.search_theme && (

                                  <div className="text-[9px] text-zinc-400 font-sans pt-1.5 border-t border-zinc-900 flex items-center gap-1.5">

                                    <span className="font-bold text-gold-500">🔍 Buscar:</span>

                                    <code className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-zinc-300 select-all">{suggestion.search_theme}</code>

                                  </div>

                                )}

                              </div>

                            );

                          })()}

                        </div>

                      ))}

                    </div>

                  )}

                </div>

                {/* Available songs list */}

                <div className="glass-panel p-6 rounded-3xl space-y-4">

                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2">

                    <h4 className="font-cinzel text-xs font-bold text-white tracking-widest uppercase">Músicas Disponíveis</h4>

                    <div className="flex items-center gap-3">

                      <span className="text-[10px] text-zinc-500 font-mono">{safeMusicFiles.length} arquivos</span>

                      <button

                        disabled={!safeMusicFiles.length}

                        onClick={handleDeleteAllMusic}

                        title="Excluir todas as trilhas deste projeto mantendo a narração"

                        className="bg-red-950/40 border border-red-900/60 hover:border-red-500/70 text-red-300 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"

                      >

                        <Trash2 className="w-3.5 h-3.5" /> Limpar Trilhas

                      </button>

                      <input 

                        type="file" 

                        accept="audio/mpeg,audio/mp3,audio/wav" 

                        className="hidden" 

                        id="general-bgm-upload" 

                        onChange={async (e) => {

                          if (e.target.files && e.target.files[0]) {

                            const file = e.target.files[0];

                            try {

                              const res = await fetch(getProjectUrl(`/api/upload-bgm?filename=${encodeURIComponent(file.name)}`), {

                                method: 'POST',

                                headers: { 'Content-Type': file.type || 'audio/mpeg' },

                                body: file

                              });

                              if (res.ok) {

                                toast.success(`Música ${file.name} enviada com sucesso!`);

                                fetchData();

                              } else {

                                toast.error('Erro ao enviar música.');

                              }

                            } catch (err) {

                              toast.error('Falha de conexão ao enviar música.');

                            }

                          }

                        }}

                      />

                      <label 

                        htmlFor="general-bgm-upload" 

                        className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"

                      >

                        <Upload className="w-3.5 h-3.5" /> Add Música

                      </label>

                      <button

                        disabled={suggestingBGM || !hasApiKey}

                        onClick={handleSuggestBGM}

                        title="Gera apenas ideias de trilha. A escolha do arquivo continua manual em Por Bloco ou Trilha Única."

                        className="bg-zinc-900 border border-zinc-800 hover:border-gold-500/50 text-gold-500 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50"

                      >

                        {suggestingBGM ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}

                        <span>{suggestingBGM ? 'Analisando...' : 'Ideias de BGM com IA'}</span>

                      </button>

                    </div>

                  </div>

                  <div className="relative">

                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />

                    <input 

                      type="text"

                      placeholder="Pesquisar música..."

                      value={searchMusic}

                      onChange={(e) => setSearchMusic(e.target.value)}

                      className="w-full bg-zinc-950 border border-zinc-855 focus:outline-none focus:border-gold-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white"

                    />

                  </div>

                    {safeMusicFiles

                      .filter(m => m.name.toLowerCase().includes(searchMusic.toLowerCase()))

                      .map(file => (

                        <div key={file.name} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl flex justify-between items-center gap-4">

                          <div className="flex items-center gap-2.5 min-w-0 flex-1">

                            <button

                              onClick={() => togglePlayMusic(file.name)}

                              className="text-gold-500 hover:text-gold-400 p-1.5 rounded-lg bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 cursor-pointer shrink-0 transition"

                              title="Ouvir música"

                            >

                              {playingMusic === file.name ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-gold-500" />}

                            </button>

                            <span className="text-xs text-gray-300 truncate font-medium" title={file.name}>{file.name}</span>

                          </div>

                          <div className="flex items-center gap-2 shrink-0">

                            <span className="text-[10px] font-mono text-zinc-500">{getFormatBytes(file.sizeBytes)}</span>

                            <button

                              onClick={() => handleDeleteMusic(file.name)}

                              className="text-red-400 hover:text-red-300 p-1.5 rounded-lg bg-red-950/25 border border-red-900/40 hover:bg-red-950/50 cursor-pointer transition"

                              title="Excluir trilha"

                            >

                              <Trash2 className="w-3.5 h-3.5" />

                            </button>

                          </div>

                        </div>

                    ))}

                </div>

              </div>

              {/* Integração Epidemic Sound */}

              <div className="glass-panel p-6 rounded-3xl space-y-6 mt-6 animate-fade-in">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">

                  <div>

                    <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">

                      <Music className="w-5 h-5 text-gold-500" /> API EPIDEMIC SOUND (MCP SSE)

                    </h3>

                    <p className="text-xs text-gray-400 mt-1">Busque faixas e efeitos sonoros livres de copyright diretamente do catálogo da Epidemic Sound ou gere uma trilha sonora inteligente automática baseada no seu roteiro.</p>

                  </div>

                  {hasEpidemicKey ? (

                    <button

                      disabled={autoSoundtracking}

                      onClick={handleAutoSoundtrack}

                      className="bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 disabled:opacity-50 text-zinc-950 text-xs font-extrabold px-5 py-2.5 rounded-xl transition shadow-lg shadow-gold-500/10 cursor-pointer flex items-center gap-2"

                    >

                      {autoSoundtracking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}

                      <span>{autoSoundtracking ? 'Processando Sonoplastia...' : 'Sonoplastia IA Inteligente (Autodetect & Download)'}</span>

                    </button>

                  ) : (

                    <span className="text-xs bg-red-950/40 border border-red-800 text-red-400 px-3 py-1.5 rounded-xl font-bold font-sans">

                      ⚠️ Configure a Chave da API nas Configurações para habilitar a busca e automação

                    </span>

                  )}

                </div>

                {hasEpidemicKey && (

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Search and Filters Column */}

                    <div className="lg:col-span-1 space-y-4">

                      <div className="space-y-2">

                        <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">Tipo de Busca</label>

                        <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-900">

                          <button

                            onClick={() => { setEpidemicSearchType('bgm'); setEpidemicSearchResults([]); }}

                            className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${epidemicSearchType === 'bgm' ? 'bg-gold-500 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}

                          >

                            Músicas (BGM)

                          </button>

                          <button

                            onClick={() => { setEpidemicSearchType('sfx'); setEpidemicSearchResults([]); }}

                            className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${epidemicSearchType === 'sfx' ? 'bg-gold-500 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}

                          >

                            Efeitos (SFX)

                          </button>

                        </div>

                      </div>

                      <div className="space-y-2">

                        <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">Buscar por Termo</label>

                        <div className="flex gap-2">

                          <input

                            type="text"

                            value={epidemicSearchQuery}

                            onChange={(e) => setEpidemicSearchQuery(e.target.value)}

                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchEpidemic(); }}

                            placeholder={epidemicSearchType === 'bgm' ? 'Ex: cinematic ancient tension...' : 'Ex: whoosh, desert wind...'}

                            className="flex-1 bg-zinc-950 border border-zinc-850 focus:outline-none focus:border-gold-500 rounded-xl px-4 py-2.5 text-xs text-white"

                          />

                          <button

                            onClick={handleSearchEpidemic}

                            disabled={searchingEpidemic}

                            className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center"

                          >

                            {searchingEpidemic ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}

                          </button>

                        </div>

                      </div>

                      <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-4 space-y-3">

                        <h5 className="text-xs font-bold text-white tracking-wide">Como Funciona?</h5>

                        <ul className="text-[10px] text-zinc-400 space-y-2 leading-relaxed list-disc list-inside font-sans">

                          <li><strong>Músicas (BGM)</strong>: Quando baixadas, são salvas no projeto e associadas ao bloco desejado ou como trilha sonora única.</li>

                          <li><strong>Efeitos (SFX)</strong>: São salvos diretamente na pasta <code>ASSETS/</code> como <code>sfx_*.mp3</code> para uso em cortes de vídeo.</li>

                          <li><strong>Sonoplastia IA Inteligente</strong>: Analisa o roteiro do vídeo e temas recomendados para baixar e mapear automaticamente todas as faixas.</li>

                        </ul>

                      </div>

                    </div>

                    {/* Results Column */}

                    <div className="lg:col-span-2 space-y-3">

                      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">

                        <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">Resultados da Busca</label>

                        <span className="text-[10px] text-zinc-500 font-mono">{safeEpidemicResults.length} encontrados</span>

                      </div>

                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2">

                        {safeEpidemicResults.length === 0 ? (

                          <div className="h-[200px] border border-dashed border-zinc-850 rounded-2xl flex flex-col items-center justify-center text-center p-4">

                            <Music className="w-8 h-8 text-zinc-700 mb-2" />

                            <p className="text-xs text-zinc-500">Nenhum resultado para exibir. Faça uma busca no painel ao lado.</p>

                          </div>

                        ) : (

                          safeEpidemicResults.map((track) => (

                            <div key={track.id} className="p-3 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-xl flex items-center justify-between gap-4 transition group">

                              <div className="flex items-center gap-3 min-w-0 flex-1">

                                {track.previewUrl && (

                                  <button

                                    onClick={() => togglePlayMusic(track.previewUrl)}

                                    className="text-gold-500 hover:text-gold-400 p-2 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 cursor-pointer shrink-0 transition"

                                    title="Ouvir demonstração"

                                  >

                                    {playingMusic === track.previewUrl ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-gold-500" />}

                                  </button>

                                )}

                                <div className="min-w-0">

                                  <p className="text-xs font-semibold text-white truncate">{track.title}</p>

                                  <p className="text-[10px] text-zinc-400 font-sans mt-0.5 truncate">

                                    {track.artist && <span>{track.artist}</span>}

                                    {track.bpm && <span className="ml-2 px-1 py-0.5 bg-zinc-900 rounded text-zinc-500 text-[9px] font-mono">{track.bpm} BPM</span>}

                                    {track.duration && <span className="ml-2 font-mono text-[9px] text-zinc-500">{Math.round(track.duration / 1000)}s</span>}

                                  </p>

                                </div>

                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">

                                {epidemicSearchType === 'bgm' ? (

                                  <>

                                    {/* Mapear para bloco específico */}

                                    <div className="hidden group-hover:flex items-center gap-1 animate-fade-in">

                                      <select

                                        onChange={(e) => {

                                          const block = Number(e.target.value);

                                          if (block > 0) {

                                            handleDownloadEpidemic(track, block);

                                            e.target.value = ""; // reset dropdown

                                          }

                                        }}

                                        disabled={downloadingEpidemicId !== null}

                                        className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 hover:border-zinc-700 rounded px-1.5 py-1 cursor-pointer focus:outline-none"

                                      >

                                        <option value="">Map Bloco...</option>

                                        {Array.from({ length: Math.max(1, (config.bgm_mappings || []).length || (storyboardData?.bgm_recommendations || []).length || 10) }, (_, i) => i + 1).map(num => (

                                          <option key={num} value={num}>Bloco {num}</option>

                                        ))}

                                      </select>

                                    </div>

                                    <button

                                      disabled={downloadingEpidemicId !== null}

                                      onClick={() => handleDownloadEpidemic(track)}

                                      className="bg-zinc-900 border border-zinc-800 hover:border-gold-500/50 hover:bg-gold-500/10 text-gold-500 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"

                                    >

                                      {downloadingEpidemicId === track.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}

                                      <span>Trilha Única</span>

                                    </button>

                                  </>

                                ) : (

                                  <button

                                    disabled={downloadingEpidemicId !== null}

                                    onClick={() => handleDownloadEpidemic(track)}

                                    className="bg-zinc-900 border border-zinc-800 hover:border-gold-500/50 hover:bg-gold-500/10 text-gold-500 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"

                                  >

                                    {downloadingEpidemicId === track.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}

                                    <span>Baixar SFX</span>

                                  </button>

                                )}

                              </div>

                            </div>

                          ))

                        )}

                      </div>

                    </div>

                  </div>

                )}

              </div>

            </div>

              )}
            </TabErrorBoundary>
          )}

          {/* TAB 4: COMPILATION TERMINAL */}

          {activeTab === 'terminal' && (

            <div className="space-y-4 h-[calc(100vh-180px)] flex flex-col animate-fade-in font-sans">

              <div className="flex justify-between items-center border-b border-zinc-900 pb-2 shrink-0">

                <div>

                  <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">

                    <Terminal className="w-5 h-5 text-gold-500" /> CONSOLE DE COMPILAÇÃO E LOGS

                  </h3>

                  <p className="text-xs text-gray-400 mt-1">Logs em tempo real de execução do compilador Python/FFmpeg.</p>

                </div>

                <button 

                  onClick={() => setLogs([])}

                  className="text-xs text-gray-400 hover:text-white font-semibold cursor-pointer border border-zinc-850 px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition"

                >

                  Limpar Console

                </button>

              </div>

              <div className="flex-1 bg-[#040405] border border-zinc-900 rounded-2xl p-5 font-mono text-xs text-emerald-400 overflow-y-auto space-y-1.5 select-text shadow-inner">

                {logs.length === 0 ? (

                  <div className="text-zinc-600 italic">Console ocioso. Inicie uma compilação ou mixagem para exibir os logs em tempo real...</div>

                ) : (

                  logs.map((log, i) => (

                    <div key={i} className={log.startsWith('[ERRO]') ? 'text-red-400' : log.startsWith('[Dashboard]') ? 'text-blue-400 font-bold' : ''}>

                      {log}

                    </div>

                  ))

                )}

                <div ref={terminalEndRef} />

              </div>

            </div>

          )}

          {/* TAB 5: AI AGENT */}

          {activeTab === 'ai' && (

            <div className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-120px)] overflow-hidden font-sans">

              <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">

                <div className="flex items-center gap-3">

                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasApiKey ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>

                    {hasApiKey ? <CheckCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}

                  </div>

                  <div>

                    <h4 className="text-xs font-bold text-white tracking-wide font-cinzel">PROVEDOR DE IA</h4>

                    <p className="text-[10px] text-gray-400 mt-0.5">

                      {hasApiKey
                        ? `Conectado via ${aiProvider === 'openrouter' ? 'OpenRouter' : aiProvider === 'xai' ? 'Grok / xAI' : geminiBrowserMode ? 'Gemini no Chrome' : 'Gemini API'}.`
                        : 'Configure um provedor para habilitar a IA.'}

                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">

                  <button 

                    onClick={() => setActiveTab('settings')}

                    className="border border-zinc-850 hover:bg-zinc-900 text-gray-300 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"

                  >

                    <Settings className="w-3.5 h-3.5" />

                    Configurações

                  </button>

                </div>

              </div>

              {/* Two Column Layout: YouTube Metadata & AI Chat */}

              <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">

                {/* Column 1: YouTube Metadata */}

                <div className="flex-1 glass-panel p-6 rounded-3xl flex flex-col min-h-0 overflow-hidden">

                  <div className="flex justify-between items-start border-b border-zinc-900 pb-3 shrink-0">

                    <div>

                      <h3 className="font-cinzel text-xs font-bold text-white tracking-widest uppercase flex items-center gap-2">

                        <Video className="w-4 h-4 text-gold-500" /> Otimizador de Metadados do YouTube

                      </h3>

                      <p className="text-[10px] text-gray-400 mt-1">
                        Passo 1: <strong className="text-zinc-300">Gerar Metadados</strong> → Passo 2: <strong className="text-zinc-300">Gerar Thumbnails</strong> (botão verde). Títulos, descrição, tags e 3 capas A/B para upload no YouTube.
                      </p>
                      {(youtubeMetadataFormat || youtubeMetadataStrategy?.profileLabel) && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {youtubeMetadataFormat && (
                            <span className={`inline-flex text-[9px] font-bold px-2 py-0.5 rounded ${youtubeMetadataFormat === 'SHORT' ? 'bg-fuchsia-500/10 text-fuchsia-400' : 'bg-sky-500/10 text-sky-400'}`}>
                              {youtubeMetadataFormat === 'SHORT' ? 'Shorts · feed + rewatch' : 'Longo · CTR + retenção'}
                            </span>
                          )}
                          {youtubeMetadataStrategy?.profileLabel && (
                            <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                              Perfil: {youtubeMetadataStrategy.profileLabel}
                            </span>
                          )}
                          {youtubeMetadataStrategy?.rpm && (
                            <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                              RPM {youtubeMetadataStrategy.rpm}
                            </span>
                          )}
                        </div>
                      )}

                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <button
                      disabled={canvaThumbnailsLoading || !uploadStatus.canva?.connected}
                      onClick={handleGenerateCanvaThumbnails}
                      title={uploadStatus.canva?.connected ? 'Gera capas A/B/C automaticamente via Canva Connect' : 'Conecte o Canva em Upload → Integrações'}
                      className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10"
                    >
                      {canvaThumbnailsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{canvaThumbnailsLoading ? 'Canva...' : 'Gerar no Canva'}</span>
                    </button>
                    <button
                      disabled={youtubeThumbnailsLoading}
                      onClick={handleGenerateYoutubeThumbnailImages}
                      title={youtubeMetadataParsed?.thumbnails?.length ? 'Gera 3 imagens de capa A/B/C' : 'Gere os metadados primeiro (passo 1)'}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
                    >
                      {youtubeThumbnailsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
                      <span>{youtubeThumbnailsLoading ? 'Gerando...' : 'Gerar Thumbnails'}</span>
                    </button>
                    <button 

                      disabled={youtubeLoading || !hasApiKey}

                      onClick={handleGenerateYoutubeMetadata}

                      className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-[11px] font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-gold-500/10"

                    >

                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />

                      <span>{youtubeLoading ? 'Gerando...' : 'Gerar Metadados'}</span>

                    </button>
                    </div>

                  </div>

                  <div className="flex-1 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 overflow-y-auto mt-4 min-h-0 select-text font-sans relative">

                    {youtubeLoading ? (

                      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 text-xs">

                        <RefreshCw className="w-6 h-6 animate-spin text-gold-500" />

                        <span>A IA está analisando o roteiro e gerando metadados ideais...</span>

                      </div>

                    ) : youtubeMetadata ? (

                      <div className="space-y-3">

                        {/* Aplicar ao Upload + Copiar Tudo */}

                        <div className="flex justify-between items-center gap-2 flex-wrap">
                          {youtubeMetadataParsed?.description && (
                            <button
                              onClick={applyMetadataToUpload}
                              className="bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Aplicar ao Upload (completo)
                            </button>
                          )}
                          <div className="flex-1" />

                          <button 

                            onClick={() => copyToClipboard(youtubeMetadata, 'youtube')}

                            className="bg-zinc-900 border border-zinc-800 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"

                          >

                            {copiedSection === 'youtube' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}

                            <span>{copiedSection === 'youtube' ? 'Copiado!' : 'Copiar Tudo'}</span>

                          </button>

                        </div>

                        {(youtubeMetadataParsed?.thumbnails?.length || youtubeMetadataParsed?.titles?.length) && (
                          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div>
                                <h3 className="text-gold-500 font-bold text-xs tracking-wide font-cinzel uppercase">Thumbnails A/B</h3>
                                <span className="text-[9px] text-zinc-500">
                                  {uploadStatus.canva?.connected ? 'Canva automático ou local sharp' : 'Conecte o Canva para gerar capas sem abrir o navegador'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  disabled={canvaThumbnailsLoading || !uploadStatus.canva?.connected}
                                  onClick={handleGenerateCanvaThumbnails}
                                  className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                  {canvaThumbnailsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                  {canvaThumbnailsLoading ? 'Canva...' : 'Gerar no Canva'}
                                </button>
                                <button
                                  disabled={youtubeThumbnailsLoading}
                                  onClick={handleGenerateYoutubeThumbnailImages}
                                  className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                  {youtubeThumbnailsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
                                  {youtubeThumbnailsLoading ? 'Gerando...' : 'Local'}
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {(youtubeMetadataParsed.thumbnails?.length
                                ? youtubeMetadataParsed.thumbnails
                                : (youtubeMetadataParsed.titles || []).slice(0, 3).map((t, i) => ({
                                    id: String.fromCharCode(65 + i),
                                    label: ['Curiosidade', 'Contraste', 'Prova Visual'][i] || 'Variante',
                                    overlayText: t.text?.split(' ').slice(0, 4).join(' '),
                                    pairedTitle: `${i + 1}. ${t.text}`,
                                  }))
                              ).map((thumb) => {
                                const generated = youtubeThumbnailsGenerated.find((g) => g.id === thumb.id);
                                return (
                                <div key={thumb.id} className={`bg-zinc-900/50 border rounded-lg p-3 space-y-2 ${ytThumbnailVariant === thumb.id ? 'border-gold-500/60 ring-1 ring-gold-500/20' : 'border-zinc-800'}`}>
                                  {generated?.url && (
                                    <a href={generated.url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-zinc-800 hover:border-gold-500/40 transition">
                                      <img
                                        src={`${generated.url}?t=${Date.now()}`}
                                        alt={`Thumbnail variante ${thumb.id}`}
                                        className={`w-full object-cover ${youtubeMetadataFormat === 'SHORT' ? 'aspect-[9/16] max-h-64' : 'aspect-video'}`}
                                      />
                                    </a>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-white">Variante {thumb.id}</span>
                                    <span className="text-[9px] text-zinc-500">{thumb.label}</span>
                                  </div>
                                  {thumb.overlayText && (
                                    <div className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5">
                                      <span className="text-[8px] text-zinc-500 uppercase block">Texto na capa</span>
                                      <span className="text-sm font-black text-gold-400 tracking-wide">{thumb.overlayText}</span>
                                    </div>
                                  )}
                                  {thumb.pairedTitle && (
                                    <p className="text-[10px] text-zinc-400"><span className="text-zinc-600">Título:</span> {thumb.pairedTitle}</p>
                                  )}
                                  {thumb.composition && (
                                    <p className="text-[10px] text-zinc-400 leading-relaxed">{thumb.composition}</p>
                                  )}
                                  {thumb.focalElement && (
                                    <p className="text-[10px] text-zinc-500"><span className="text-zinc-600">Foco:</span> {thumb.focalElement}</p>
                                  )}
                                  {thumb.colors && thumb.colors.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {thumb.colors.map((color, cIdx) => (
                                        <span
                                          key={cIdx}
                                          className="w-4 h-4 rounded-full border border-zinc-700"
                                          style={{ backgroundColor: color }}
                                          title={color}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {generated?.url && (
                                      <button
                                        onClick={() => selectThumbnailForUpload(generated)}
                                        className={`text-[9px] font-bold py-1.5 rounded border transition cursor-pointer ${ytThumbnailVariant === thumb.id ? 'bg-gold-500/20 border-gold-500/40 text-gold-300' : 'border-zinc-800 text-zinc-300 hover:border-gold-500/30'}`}
                                      >
                                        {ytThumbnailVariant === thumb.id ? '✓ No Upload' : 'Usar no Upload'}
                                      </button>
                                    )}
                                    {generated?.editUrl && (
                                      <a
                                        href={generated.editUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-center text-[9px] font-bold text-cyan-400 hover:text-cyan-300 py-1.5 rounded border border-cyan-500/20 hover:border-cyan-500/40 transition"
                                      >
                                        Editar no Canva
                                      </a>
                                    )}
                                    <button
                                      onClick={() => openCanvaThumbnailDesigner(thumb)}
                                      className="text-[9px] font-bold text-sky-400 hover:text-sky-300 py-1.5 rounded border border-sky-500/20 hover:border-sky-500/40 transition cursor-pointer"
                                    >
                                      {copiedSection === `canva-${thumb.id}` ? 'Brief copiado!' : 'Abrir Canva'}
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(buildThumbnailBrief(thumb), `thumb-${thumb.id}`)}
                                      className="text-[9px] font-bold text-zinc-400 hover:text-white py-1.5 rounded border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
                                    >
                                      {copiedSection === `thumb-${thumb.id}` ? 'Copiado!' : 'Copiar briefing'}
                                    </button>
                                    {generated?.url ? (
                                      <a
                                        href={generated.url}
                                        download
                                        className="text-center text-[9px] font-bold text-gold-500 hover:text-gold-400 py-1.5 rounded border border-gold-500/20 hover:border-gold-500/40 transition"
                                      >
                                        Baixar
                                      </a>
                                    ) : (
                                      <span className="text-[9px] text-zinc-600 text-center py-1.5">Gere imagens</span>
                                    )}
                                  </div>
                                </div>
                              );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Render sections with individual copy buttons */}

                        {(() => {

                          const sections = youtubeMetadata.split(/^## /m).filter(Boolean).filter((section) => {
                            const sectionTitle = section.split('\n')[0]?.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                            if (sectionTitle === 'THUMBNAILS A/B' && youtubeMetadataParsed?.thumbnails?.length) return false;
                            return true;
                          });

                          return sections.map((section, sIdx) => {

                            const lines = section.split('\n');

                            const title = lines[0]?.trim() || `Seção ${sIdx + 1}`;

                            const content = lines.slice(1).join('\n').trim();

                            const sectionKey = `meta-${sIdx}`;

                            return (

                              <div key={sIdx} className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 relative group">

                                <div className="flex items-center justify-between mb-2">

                                  <h3 className="text-gold-500 font-bold text-xs tracking-wide font-cinzel uppercase">{title}</h3>

                                  <button

                                    onClick={() => copyToClipboard(content, sectionKey)}

                                    className="bg-zinc-900 border border-zinc-800 text-gray-500 hover:text-white px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 transition cursor-pointer opacity-60 group-hover:opacity-100"

                                  >

                                    {copiedSection === sectionKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}

                                    <span>{copiedSection === sectionKey ? 'Copiado!' : 'Copiar'}</span>

                                  </button>

                                </div>

                                <div className="prose prose-invert max-w-none">
                                  {/^T[ÍI]TULOS$/i.test(title) && youtubeMetadataParsed?.titles?.length ? (
                                    <div className="space-y-3 not-prose">
                                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <div>
                                            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wide">Teste A/B de Títulos</span>
                                            <p className="text-[9px] text-zinc-500">Publique o vídeo, cole o videoId e alterne títulos com analytics do YouTube.</p>
                                          </div>
                                          <button
                                            disabled={titleExperimentLoading}
                                            onClick={fetchTitleExperimentAnalytics}
                                            className="text-[9px] font-bold text-violet-400 hover:text-violet-300 px-2 py-1 rounded border border-violet-500/30 hover:border-violet-500/50 transition cursor-pointer"
                                          >
                                            {titleExperimentLoading ? 'Atualizando...' : 'Atualizar Analytics'}
                                          </button>
                                        </div>
                                        <input
                                          type="text"
                                          placeholder="videoId do YouTube (ex: dQw4w9WgXcQ)"
                                          value={titleExperimentVideoId}
                                          onChange={(e) => setTitleExperimentVideoId(e.target.value)}
                                          className="w-full bg-black border border-zinc-800 focus:border-violet-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-white"
                                        />
                                        {titleExperimentAnalytics?.available && (
                                          <div className="space-y-2">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                                              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                                                <span className="text-zinc-500 block">Views (28d)</span>
                                                <span className="text-white font-bold">{titleExperimentAnalytics.metrics?.views ?? 0}</span>
                                              </div>
                                              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                                                <span className="text-zinc-500 block">Min. assistidos</span>
                                                <span className="text-white font-bold">{Math.round(titleExperimentAnalytics.metrics?.estimatedMinutesWatched || 0)}</span>
                                              </div>
                                              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                                                <span className="text-zinc-500 block">Retenção média</span>
                                                <span className="text-white font-bold">{Math.round(titleExperimentAnalytics.metrics?.averageViewDuration || 0)}s</span>
                                              </div>
                                              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                                                <span className="text-zinc-500 block">Likes / Coment.</span>
                                                <span className="text-white font-bold">
                                                  {titleExperimentAnalytics.metrics?.likes ?? 0} / {titleExperimentAnalytics.metrics?.comments ?? 0}
                                                </span>
                                              </div>
                                            </div>
                                            {titleExperimentAnalytics.reachNote && (
                                              <p className="text-[8px] text-zinc-500">{titleExperimentAnalytics.reachNote}</p>
                                            )}
                                            {titleExperimentWinner?.variantId && (
                                              <p className="text-[9px] text-emerald-400 font-bold">
                                                Líder por views no período: variante {titleExperimentWinner.variantId} ({titleExperimentWinner.views} views)
                                              </p>
                                            )}
                                            {titleRetention?.velocity?.views48h != null && (
                                              <p className="text-[9px] text-cyan-400">
                                                Views 48h: {titleRetention.velocity.views48h}
                                              </p>
                                            )}
                                            <div className="flex gap-2 flex-wrap">
                                              <button
                                                type="button"
                                                disabled={titleExperimentLoading || !titleExperimentWinner}
                                                onClick={async () => {
                                                  setTitleExperimentLoading(true);
                                                  try {
                                                    const res = await fetch(getProjectUrl('/api/youtube/title-experiment/apply-winner'), { method: 'POST' });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                      toast(`Vencedor ${data.winner?.variantId} aplicado permanentemente.`);
                                                      fetchTitleExperimentAnalytics();
                                                    } else toast(data.error || 'Falha ao aplicar vencedor.');
                                                  } finally { setTitleExperimentLoading(false); }
                                                }}
                                                className="text-[8px] font-bold text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded disabled:opacity-50"
                                              >
                                                Aplicar vencedor
                                              </button>
                                              <button
                                                type="button"
                                                disabled={titleExperimentLoading}
                                                onClick={async () => {
                                                  await fetch(getProjectUrl('/api/youtube/title-experiment/stop'), { method: 'POST' });
                                                  toast('Experimento de títulos encerrado.');
                                                  fetchTitleExperiment();
                                                }}
                                                className="text-[8px] font-bold text-zinc-400 border border-zinc-700 px-2 py-1 rounded"
                                              >
                                                Parar teste
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        {uploadStatus.youtube?.connected && uploadStatus.youtube?.titleTestReady === false && (
                                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-2 space-y-1.5">
                                            <p className="text-[9px] text-amber-400 font-bold">Permissões antigas (só upload)</p>
                                            <p className="text-[9px] text-amber-500/90">
                                              Faltam: {(uploadStatus.youtube?.missingScopes || []).join(', ') || 'editar títulos e analytics'}.
                                            </p>
                                            <button
                                              type="button"
                                              onClick={handleRelinkYoutube}
                                              className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 text-[9px] font-bold py-1.5 rounded-lg transition cursor-pointer"
                                            >
                                              Revincular YouTube (obrigatório)
                                            </button>
                                          </div>
                                        )}
                                        {titleExperimentAnalytics && !titleExperimentAnalytics.available && titleExperimentAnalytics.error && (
                                          <p className="text-[9px] text-amber-500">{titleExperimentAnalytics.error}</p>
                                        )}
                                        <button
                                          disabled={titleExperimentLoading || !uploadStatus.youtube?.connected}
                                          onClick={handleStartTitleExperiment}
                                          className="w-full bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 disabled:opacity-50 text-[10px] font-bold py-1.5 rounded-lg transition cursor-pointer"
                                        >
                                          {titleExperimentLoading ? 'Processando...' : 'Iniciar teste A/B (títulos marcados)'}
                                        </button>
                                      </div>
                                      {youtubeMetadataParsed.titles.map((t, tIdx) => {
                                        const hasHashtag = /#[\wÀ-ÿ]+/i.test(t.text);
                                        const hasEmoji = /\p{Extended_Pictographic}/u.test(t.text);
                                        const maxChars = youtubeMetadataFormat === 'SHORT'
                                          ? (hasHashtag || hasEmoji ? 55 : 40)
                                          : 50;
                                        const ok = t.chars <= maxChars;
                                        const isRecommended = tIdx === 0 || t.text === youtubeMetadataParsed.recommendedTitle;
                                        const variantId = String.fromCharCode(65 + tIdx);
                                        const isAbSelected = titleAbSelected[String(tIdx)] !== false;
                                        const isActiveVariant = titleExperiment?.activeVariantId === variantId;
                                        const ranking = titleExperimentRankings.find((r) => r.id === variantId);
                                        return (
                                          <div key={tIdx} className={`flex items-start justify-between gap-2 bg-zinc-900/50 border rounded-lg px-3 py-2 ${isRecommended ? 'border-gold-500/40 ring-1 ring-gold-500/15' : isActiveVariant ? 'border-violet-500/50 ring-1 ring-violet-500/20' : 'border-zinc-800'}`}>
                                            <div className="min-w-0 flex items-start gap-2">
                                              <input
                                                type="checkbox"
                                                checked={isAbSelected}
                                                onChange={(e) => setTitleAbSelected((prev) => ({ ...prev, [String(tIdx)]: e.target.checked }))}
                                                className="mt-1 accent-violet-500"
                                                title="Incluir no teste A/B"
                                              />
                                              <div>
                                                <span className="text-[10px] text-zinc-500 mr-2">{tIdx + 1}.</span>
                                                {isRecommended && (
                                                  <span className="text-[8px] font-bold text-gold-400 bg-gold-500/10 border border-gold-500/30 px-1.5 py-0.5 rounded mr-1.5 uppercase tracking-wide">
                                                    Recomendado
                                                  </span>
                                                )}
                                                <span className="text-xs text-zinc-200 break-words whitespace-normal leading-snug">{t.text}</span>
                                                <span className={`ml-2 text-[9px] font-mono ${ok ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                  {t.chars}/{maxChars}
                                                </span>
                                                {typeof t.score === 'number' && (
                                                  <span className="ml-1 text-[8px] text-zinc-600 font-mono" title="Score de qualidade">
                                                    · {t.score}pts
                                                  </span>
                                                )}
                                                {isActiveVariant && <span className="ml-2 text-[8px] text-violet-400 font-bold">ATIVO NO YT</span>}
                                                {typeof ranking?.periodViews === 'number' && (
                                                  <span className="block text-[8px] text-emerald-500 mt-0.5">
                                                    {ranking.periodViews} views no período deste título
                                                    {ranking.periodAvgDuration ? ` · ${ranking.periodAvgDuration}s retenção` : ''}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex flex-col gap-1 shrink-0">
                                              <button
                                                onClick={() => {
                                                  setYtTitle(t.text.slice(0, 100));
                                                  toast(`Título #${tIdx + 1} aplicado na aba Upload.`);
                                                }}
                                                className="text-[9px] font-bold text-gold-500 hover:text-gold-400 px-2 py-1 rounded border border-gold-500/20 hover:border-gold-500/40 transition cursor-pointer"
                                              >
                                                Usar
                                              </button>
                                              {titleExperiment?.videoId && uploadStatus.youtube?.connected && tIdx < 5 && (
                                                <button
                                                  disabled={titleExperimentLoading}
                                                  onClick={() => handleApplyTitleVariant(variantId)}
                                                  className="text-[9px] font-bold text-violet-400 hover:text-violet-300 px-2 py-1 rounded border border-violet-500/20 hover:border-violet-500/40 transition cursor-pointer disabled:opacity-50"
                                                >
                                                  Aplicar {variantId}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    renderFormattedText(content)
                                  )}

                                </div>

                              </div>

                            );

                          });

                        })()}

                      </div>

                    ) : (

                      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500 text-xs gap-2">

                        <MessageSquare className="w-8 h-8 text-zinc-700" />

                        <span>Clique em "Gerar Metadados" para criar títulos magnéticos, descrição otimizada, tags e capítulos com carimbo de data/hora reais baseados no roteiro sincronizado.</span>

                      </div>

                    )}

                  </div>

                </div>

                {/* Column 2: AI Chat Assistant */}

                <div className="flex-1 glass-panel p-6 rounded-3xl flex flex-col min-h-0 overflow-hidden font-sans">

                  <div className="border-b border-zinc-900 pb-3 shrink-0">

                    <h3 className="font-cinzel text-xs font-bold text-white tracking-widest uppercase flex items-center gap-2">

                      <Sparkles className="w-4 h-4 text-gold-500" /> Chat de Engenharia e Criação IA

                    </h3>

                    <p className="text-[10px] text-gray-400 mt-1">Peça alterações de BGM, sugestões de palavras-chave ou reescrita de textos de impacto.</p>

                  </div>

                  {/* Message History */}

                  <div className="flex-1 bg-zinc-950/20 border border-zinc-900/50 rounded-2xl p-4 overflow-y-auto mt-4 mb-3 space-y-4 min-h-0 select-text font-sans">

                    {chatMessages.map((msg, i) => {

                      const parsedConfig = detectJsonConfig(msg.content);

                      return (

                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                          <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${msg.role === 'user' ? 'text-gold-500' : 'text-zinc-500'}`}>

                            {msg.role === 'user' ? 'Você' : 'Agente IA'}

                          </div>

                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${

                            msg.role === 'user' 

                              ? 'bg-gold-500/10 border border-gold-500/20 text-gold-200' 

                              : 'bg-zinc-900/80 border border-zinc-800 text-gray-300'

                          }`}>

                            <div className="whitespace-pre-wrap">{msg.content}</div>

                            {/* Auto apply config suggestions button */}

                            {parsedConfig && (

                              <button

                                onClick={() => applyAiConfig(parsedConfig)}

                                className="mt-3 bg-gold-500 hover:bg-gold-600 text-zinc-950 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer font-sans"

                              >

                                <CheckCircle className="w-3.5 h-3.5" />

                                <span>Aplicar Configuração Sugerida</span>

                              </button>

                            )}

                          </div>

                        </div>

                      );

                    })}

                    {chatLoading && (

                      <div className="flex flex-col items-start">

                        <div className="text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500">Agente IA</div>

                        <div className="bg-zinc-900/80 border border-zinc-800 text-gray-400 rounded-2xl px-4 py-3 text-xs flex items-center gap-2">

                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-gold-500" />

                          <span>Escrevendo resposta...</span>

                        </div>

                      </div>

                    )}

                    <div ref={chatEndRef} />

                  </div>

                  {/* Suggestion Chips */}

                  <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">

                    <button 

                      disabled={chatLoading || !hasApiKey}

                      onClick={() => handleSendChatMessage("Sugerir palavras-chave extras para destacar baseadas no roteiro.")}

                      className="border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-850 text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer"

                    >

                      💡 Sugerir Destaques

                    </button>

                    <button 

                      disabled={chatLoading || !hasApiKey}

                      onClick={() => handleSendChatMessage("Melhorar frases de impacto para deixá-las mais dramáticas e épicas.")}

                      className="border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-850 text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer"

                    >

                      🔥 Impactos Épicos

                    </button>

                    <button 

                      disabled={chatLoading || !hasApiKey}

                      onClick={() => handleSendChatMessage("Me sugira faixas de trilha sonora ideais para os blocos da metade do vídeo.")}

                      className="border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-850 text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer"

                    >

                      🎵 Análise Musical

                    </button>

                  </div>

                  {/* Input form */}

                  <div className="flex gap-2 shrink-0 font-sans">

                    <input 

                      disabled={chatLoading || !hasApiKey}

                      type="text"

                      placeholder={hasApiKey ? "Faça uma pergunta sobre o vídeo..." : "Configure a chave de API acima para usar o chat..."}

                      value={chatInput}

                      onChange={(e) => setChatInput(e.target.value)}

                      onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}

                      className="flex-1 bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white disabled:opacity-50"

                    />

                    <button 

                      disabled={chatLoading || !chatInput.trim() || !hasApiKey}

                      onClick={() => handleSendChatMessage()}

                      className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 p-2.5 rounded-xl transition flex items-center justify-center cursor-pointer shadow-lg shadow-gold-500/10"

                    >

                      <Send className="w-4 h-4" />

                    </button>

                  </div>

                </div>

              </div>

            </div>

          )}

          {/* TAB: PROJECT EDITOR */}

          {/* TAB: UPLOAD MULTI & DISTRIBUICAO */}
          {activeTab === 'upload' && (
            <div className="space-y-6 animate-fade-in font-sans">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                <div>
                  <h2 className="text-sm font-cinzel font-bold text-white tracking-wide">Upload & Distribuição Multi-Plataforma</h2>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Prepare os metadados e publique seus vídeos nas redes sociais de forma automatizada.</p>
                </div>
              </div>

              {/* Step 1: Select platforms & Edit metadata */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Metadados por Plataforma */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* YouTube Section */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-900/40">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="select-yt"
                          checked={selectedPlatforms.youtube}
                          onChange={(e) => setSelectedPlatforms(prev => ({ ...prev, youtube: e.target.checked }))}
                          className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                        />
                        <label htmlFor="select-yt" className="text-xs font-bold text-zinc-200 cursor-pointer flex items-center gap-1.5">
                          <span>YouTube (Videos / Shorts)</span>
                        </label>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.youtube?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {uploadStatus.youtube?.connected ? 'Conectado' : 'Não Conectado'}
                      </span>
                    </div>

                    {selectedPlatforms.youtube && (
                      <div className="space-y-4 text-xs font-sans">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Título no YouTube</label>
                          <input
                            type="text"
                            maxLength={100}
                            value={ytTitle}
                            onChange={(e) => setYtTitle(e.target.value)}
                            placeholder="Insira o título do vídeo para o YouTube"
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs"
                          />
                          <span className="text-[9px] text-zinc-600 block text-right">{ytTitle.length}/100</span>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Descrição do YouTube</label>
                          <textarea
                            rows={3}
                            value={ytDescription}
                            onChange={(e) => setYtDescription(e.target.value)}
                            placeholder="Descrição completa para SEO, links e hashtags"
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Privacidade</label>
                          <select
                            value={ytPrivacy}
                            onChange={(e) => setYtPrivacy(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white font-sans text-xs"
                          >
                            <option value="private">Privado (Recomendado)</option>
                            <option value="public">Público</option>
                            <option value="unlisted">Não listado</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Tags (vírgula)</label>
                          <input
                            type="text"
                            value={ytTags}
                            onChange={(e) => setYtTags(e.target.value)}
                            placeholder="tag1, tag2, tag3..."
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Capítulos (marcadores)</label>
                          <textarea
                            rows={2}
                            value={ytChapters}
                            onChange={(e) => setYtChapters(e.target.value)}
                            placeholder="0:00 Intro&#10;1:30 Tema principal"
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white text-xs resize-none font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Comentário fixo (pós-upload)</label>
                          <textarea
                            rows={2}
                            value={ytPinnedComment}
                            onChange={(e) => setYtPinnedComment(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white text-xs resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Agendar (ISO)</label>
                            <input
                              type="datetime-local"
                              value={ytPublishAt ? ytPublishAt.slice(0, 16) : ''}
                              onChange={(e) => setYtPublishAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Categoria ID</label>
                            <input
                              type="text"
                              value={ytCategoryId}
                              onChange={(e) => setYtCategoryId(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-zinc-900/60">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Thumbnail do YouTube (A/B/C)</label>
                              <p className="text-[9px] text-zinc-600 mt-0.5">Gera 3 capas com texto overlay a partir dos assets do projeto.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveTab('ai')}
                                className="text-[9px] font-bold text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded border border-zinc-800 transition cursor-pointer"
                              >
                                Agente IA
                              </button>
                              <button
                                type="button"
                                disabled={youtubeThumbnailsLoading}
                                onClick={handleGenerateYoutubeThumbnailImages}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                              >
                                {youtubeThumbnailsLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />}
                                {youtubeThumbnailsLoading ? 'Gerando...' : 'Gerar Thumbnails'}
                              </button>
                            </div>
                          </div>
                          {ytThumbnailVariant && (
                            <p className="text-[9px] text-gold-500/80">
                              Selecionada para upload: <strong>Variante {ytThumbnailVariant}</strong>
                            </p>
                          )}
                          {youtubeThumbnailsGenerated.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {youtubeThumbnailsGenerated.map((thumb) => (
                                <div
                                  key={thumb.id}
                                  className={`rounded-lg overflow-hidden border transition ${ytThumbnailVariant === thumb.id ? 'border-gold-500/60 ring-1 ring-gold-500/20' : 'border-zinc-800'}`}
                                >
                                  <a href={thumb.url} target="_blank" rel="noreferrer" className="block">
                                    <img
                                      src={`${thumb.url}?t=${Date.now()}`}
                                      alt={`Thumbnail ${thumb.id}`}
                                      className={`w-full object-cover ${youtubeMetadataFormat === 'SHORT' ? 'aspect-[9/16]' : 'aspect-video'}`}
                                    />
                                  </a>
                                  <div className="flex gap-1 p-1 bg-zinc-950/80">
                                    <button
                                      type="button"
                                      onClick={() => selectThumbnailForUpload(thumb)}
                                      className={`flex-1 text-[8px] font-bold py-1 rounded ${ytThumbnailVariant === thumb.id ? 'bg-gold-500/20 text-gold-300' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                      {ytThumbnailVariant === thumb.id ? '✓' : 'Usar'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openCanvaThumbnailDesigner({ id: thumb.id, label: thumb.label, overlayText: thumb.overlayText })}
                                      className="flex-1 text-[8px] font-bold py-1 rounded text-sky-400 hover:text-sky-300"
                                    >
                                      Canva
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[9px] text-zinc-600 italic">
                              Nenhuma thumbnail gerada ainda. Use &quot;Gerar Metadados&quot; na aba Agente IA, depois clique em &quot;Gerar Thumbnails&quot;.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instagram Reels Section */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-900/40">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="select-ig"
                          checked={selectedPlatforms.instagram}
                          onChange={(e) => setSelectedPlatforms(prev => ({ ...prev, instagram: e.target.checked }))}
                          className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                        />
                        <label htmlFor="select-ig" className="text-xs font-bold text-zinc-200 cursor-pointer">
                          Instagram Reels
                        </label>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.instagram?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {uploadStatus.instagram?.connected ? 'Conectado' : 'Não Conectado'}
                      </span>
                    </div>

                    {selectedPlatforms.instagram && (
                      <div className="space-y-3 text-xs font-sans">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Legenda do Reels (Caption)</label>
                          <textarea
                            rows={3}
                            value={igCaption}
                            onChange={(e) => setIgCaption(e.target.value)}
                            placeholder="Legenda para o Reels com hashtags"
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TikTok Section */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-900/40">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="select-tt"
                          checked={selectedPlatforms.tiktok}
                          onChange={(e) => setSelectedPlatforms(prev => ({ ...prev, tiktok: e.target.checked }))}
                          className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                        />
                        <label htmlFor="select-tt" className="text-xs font-bold text-zinc-200 cursor-pointer">
                          TikTok (Playwright Automação)
                        </label>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.tiktok?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {uploadStatus.tiktok?.connected ? 'Sessão Ativa' : 'Desconectado'}
                      </span>
                    </div>

                    {selectedPlatforms.tiktok && (
                      <div className="space-y-3 text-xs font-sans">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Legenda do TikTok</label>
                          <textarea
                            rows={3}
                            value={ttCaption}
                            onChange={(e) => setTtCaption(e.target.value)}
                            placeholder="Legenda curta e tags virais"
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Kwai Section */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-900/40">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="select-kw"
                          checked={selectedPlatforms.kwai}
                          onChange={(e) => setSelectedPlatforms(prev => ({ ...prev, kwai: e.target.checked }))}
                          className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                        />
                        <label htmlFor="select-kw" className="text-xs font-bold text-zinc-200 cursor-pointer">
                          Kwai (Playwright Automação)
                        </label>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.kwai?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {uploadStatus.kwai?.connected ? 'Sessão Ativa' : 'Desconectado'}
                      </span>
                    </div>

                    {selectedPlatforms.kwai && (
                      <div className="space-y-3 text-xs font-sans">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Legenda do Kwai</label>
                          <textarea
                            rows={3}
                            value={kwCaption}
                            onChange={(e) => setKwCaption(e.target.value)}
                            placeholder="Legenda para o Kwai"
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Account Auth Connection Panel */}
                <div className="space-y-6">
                  
                  {/* Salvar Metadados GLOBAIS */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Ações Globais</span>
                    <button
                      onClick={async () => {
                        try {
                          const upload_metadata = {
                            youtube: {
                              title: ytTitle.trim(),
                              description: ytDescription.trim(),
                              privacy: ytPrivacy,
                              tags: ytTags.trim(),
                              chapters: ytChapters.trim(),
                              pinned_comment: ytPinnedComment.trim(),
                              category_id: ytCategoryId.trim() || '27',
                              publish_at: ytPublishAt.trim() || undefined,
                              thumbnail: ytThumbnailPath || undefined,
                              thumbnail_variant: ytThumbnailVariant || undefined,
                            },
                            instagram: { title: igCaption.trim() },
                            tiktok: { title: ttCaption.trim() },
                            kwai: { title: kwCaption.trim() }
                          };
                          const res = await fetch(getProjectUrl('/api/config'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ upload_metadata })
                          });
                          if (res.ok) {
                            toast("Metadados salvos com sucesso!");
                          }
                        } catch (e) {
                          toast("Erro ao salvar metadados.");
                        }
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 hover:border-gold-500/20 text-gold-500 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      Salvar Metadados do Projeto
                    </button>
                    <button
                      onClick={async () => {
                        // Generate pipeline execution
                        setUploading(true);
                        setUploadLogs([]);
                        setUploadProgress(0);
                        const platformList = Object.entries(selectedPlatforms)
                          .filter(([_, active]) => active)
                          .map(([key]) => key)
                          .join(",");
                        
                        const eventSource = new EventSource(getProjectUrl(`/api/projects/upload-pipeline?platforms=${platformList}`));
                        eventSource.onmessage = (event) => {
                          const data = JSON.parse(event.data);
                          if (data.type === "log") {
                            setUploadLogs(prev => [...prev, data.text]);
                            const progressMatch = data.text.match(/\[PROGRESSO\] (\d+)%/);
                            if (progressMatch) {
                              setUploadProgress(parseInt(progressMatch[1]));
                            }
                          } else if (data.type === "post_upload") {
                            if (data.videoId) handlePostUploadComplete(data.videoId);
                          } else if (data.type === "complete") {
                            eventSource.close();
                            setUploading(false);
                            setUploadProgress(100);
                            toast("Upload concluído com sucesso!");
                            if (data.videoId) handlePostUploadComplete(data.videoId);
                          } else if (data.type === "error") {
                            eventSource.close();
                            setUploading(false);
                            toast("Erro ao executar pipeline: " + data.message);
                          }
                        };
                        eventSource.onerror = () => {
                          eventSource.close();
                          setUploading(false);
                          toast("Falha na conexão SSE.");
                        };
                      }}
                      disabled={uploading}
                      className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 font-bold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-gold-500/10"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{uploading ? "Publicando..." : "Publicar nas Selecionadas"}</span>
                    </button>
                    <button
                      onClick={() => {
                        setPipelineRunning(true);
                        setUploadLogs([]);
                        const es = new EventSource(getProjectUrl('/api/pipeline/run?steps=mix,thumbnails,upload'));
                        es.onmessage = (event) => {
                          const data = JSON.parse(event.data);
                          if (data.type === 'log') setUploadLogs((prev) => [...prev, data.text]);
                          if (data.type === 'complete' || data.type === 'error') {
                            es.close();
                            setPipelineRunning(false);
                            toast(data.type === 'complete' ? 'Pipeline concluído!' : data.message);
                          }
                        };
                        es.onerror = () => { es.close(); setPipelineRunning(false); };
                      }}
                      disabled={pipelineRunning || uploading}
                      className="w-full bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 disabled:opacity-50 text-violet-200 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      {pipelineRunning ? 'Pipeline rodando...' : 'Pipeline rápido (mix → thumbs → upload)'}
                    </button>
                    {titleExperimentVideoId && youtubeThumbnailsGenerated.length >= 2 && (
                      <button
                        onClick={async () => {
                          const res = await fetch(getProjectUrl('/api/youtube/thumbnail-experiment/start'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              videoId: titleExperimentVideoId,
                              thumbnails: youtubeThumbnailsGenerated.map((t) => ({ id: t.id, fileName: t.fileName })),
                            }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setThumbnailExperiment(data.experiment);
                            toast('Teste A/B de thumbnails iniciado.');
                          } else toast(data.error || 'Falha ao iniciar teste de capas.');
                        }}
                        className="w-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold py-2 rounded-xl text-[10px]"
                      >
                        Iniciar A/B de Thumbnails
                      </button>
                    )}
                  </div>

                  {/* Auth Configuration */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-3">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Integrações</span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Chaves de API, OAuth e sessões ficam em Configurações → Integrações.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSettingsSection('integracoes'); setActiveTab('settings'); }}
                      className="w-full bg-gold-500/10 border border-gold-500/30 text-gold-400 font-bold py-2.5 rounded-xl text-xs hover:bg-gold-500/20 transition"
                    >
                      Abrir Configurações → Integrações
                    </button>
                  </div>

                </div>
              </div>

              {/* Progress and Live Terminal log view */}
              {(uploading || uploadLogs.length > 0) && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Progresso do Envio</span>
                    <span className="text-xs font-mono font-bold text-gold-500">{uploadProgress}%</span>
                  </div>

                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                    <div
                      className="bg-gold-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>

                  <div className="bg-black/60 border border-zinc-950 rounded-xl p-4 h-64 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1">
                    {uploadLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

                    {activeTab === 'editor' && (

            <div className="space-y-6 animate-fade-in font-sans">

              <div className="glass-panel p-6 rounded-3xl">

                <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">

                  <Settings className="w-6 h-6 text-gold-500" /> EDITOR DE PROJETOS

                </h3>

                <p className="text-sm text-gray-400 mt-2">

                  Selecione um projeto existente para substituir imagens, vídeos ou trilhas sonoras por bloco.

                </p>

                <div className="mt-6 flex gap-4">

                  <select 

                    value={selectedProject}

                    onChange={(e) => setSelectedProject(e.target.value)}

                    className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-gold-500 w-64"

                  >

                    <option value="">Selecione um projeto...</option>

                    {projects.map(p => (

                      <option key={p.name} value={p.name}>{p.name}</option>

                    ))}

                  </select>

                  <button 

                    onClick={loadEditorProject}

                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl cursor-pointer"

                  >

                    Carregar Projeto

                  </button>

                </div>

              </div>

              {/* Sub-tabs selection */}

              <div className="flex justify-between items-center border-b border-zinc-900 pb-2">

                <div className="flex gap-4">

                  <button

                    onClick={() => setEditorSubTab('script')}

                    className={`text-xs font-bold font-cinzel pb-2 px-1 border-b-2 transition cursor-pointer ${

                      editorSubTab === 'script'

                        ? 'border-gold-500 text-gold-500'

                        : 'border-transparent text-gray-400 hover:text-white'

                    }`}

                  >

                    Roteiro e Storyboard (JSON)

                  </button>

                  <button

                    onClick={() => setEditorSubTab('json')}

                    className={`font-bold font-cinzel pb-2 px-1 border-b-2 transition cursor-pointer ${

                      editorSubTab === 'json'

                        ? 'border-gold-500 text-gold-500'

                        : 'border-transparent text-gray-400 hover:text-white'

                    }`}

                  >

                    Estrutura JSON

                  </button>

                  <button

                    onClick={() => setEditorSubTab('assets')}

                    className={`text-xs font-bold font-cinzel pb-2 px-1 border-b-2 transition cursor-pointer ${

                      editorSubTab === 'assets'

                        ? 'border-gold-500 text-gold-500'

                        : 'border-transparent text-gray-400 hover:text-white'

                    }`}

                  >

                    Linha do Tempo (Arquivos Mapeados)

                  </button>

                </div>

                {config && (

                  <div className="text-xs text-zinc-400 font-mono flex items-center gap-1.5 bg-zinc-950/40 px-3 py-1.5 rounded-lg border border-zinc-900">

                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Duração Total do Vídeo:</span>

                    <span className="text-gold-500 font-bold text-sm">

                      {getTotalVideoDuration().toFixed(1)}s

                    </span>

                  </div>

                )}

              </div>

              {editorSubTab === 'assets' && config && (
                renderRichTimelineEditor()
              )}

              {editorSubTab === 'script' && (

                <div className="space-y-6">

                  {/* Action buttons row at the top */}

                  <div className="flex justify-between items-center bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl">

                    <div>

                      <h4 className="font-cinzel text-xs font-bold text-white tracking-wider uppercase">Visualizador e Editor de Roteiro</h4>

                      <p className="text-[10px] text-gray-400 mt-0.5">Altere falas de narração, prompts visuais, reordene cenas ou adicione novas.</p>
                      {notebooklmSuggestions && (
                        <p className="text-[9px] text-indigo-300/80 mt-1 max-w-md line-clamp-2" title={notebooklmSuggestions}>
                          Última pesquisa NotebookLM aplicada ao roteiro.
                        </p>
                      )}

                    </div>

                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={handleNotebooklmImprove}
                        disabled={notebooklmImproving || !storyboardData?.narrative_script}
                        title={notebooklmStatus?.message || 'Enriquecer roteiro com pesquisa NotebookLM'}
                        className="bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 disabled:opacity-40 text-indigo-200 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {notebooklmImproving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Enriquecer com NotebookLM
                      </button>

                      <button

                        onClick={addSceneAtEnd}

                        className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"

                      >

                        <Plus className="w-3.5 h-3.5" /> Add Cena no Fim

                      </button>

                      <button

                        onClick={handleSaveStoryboard}

                        className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-[10px] font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"

                      >

                        <Save className="w-3.5 h-3.5" /> Salvar Roteiro

                      </button>

                    </div>

                  </div>

                  {loadingStoryboard ? (

                    <div className="text-center py-12 text-zinc-500 italic">Carregando roteiro do projeto...</div>

                  ) : !storyboardData || !storyboardData.visual_prompts || storyboardData.visual_prompts.length === 0 ? (

                    <div className="glass-panel p-8 text-center text-zinc-500 italic rounded-3xl">

                      Nenhum storyboard ou roteiro estruturado (storyboard.json) encontrado para este projeto.

                      <div className="mt-4">

                        <button

                          onClick={() => {

                            setStoryboardData({

                              strategy: { title_main: "", title_variations: [], hook: "", target_audience: "", tone: "", pinned_comment: "", cta: "" },

                              narrative_script: "",

                              narrative_script_tagged: "",

                              visual_prompts: [

                                {

                                  scene: "1.1",

                                  block: 1,

                                  narration_text: "Inicie o roteiro aqui...",

                                  type: "imagem IA 2k",

                                  duration: "5 segundos",

                                  prompt: "Cinematic photorealistic image, 2k resolution",

                                  editor_notes: "",

                                  stock_query: ""

                                }

                              ],

                              checklist: { click_potential: 0, retention_potential: 0, comments_potential: 0, feedback: "" }

                            });

                          }}

                          className="bg-zinc-900 border border-zinc-800 text-[10px] px-3 py-1.5 rounded hover:bg-zinc-800 text-white transition"

                        >

                          Inicializar Rascunho de Roteiro

                        </button>

                      </div>

                    </div>

                  ) : (

                    <div className="space-y-4">

                      {storyboardData.visual_prompts.map((vp: any, idx: number) => (

                        <div key={idx} className="glass-panel p-5 rounded-2xl border border-zinc-900 hover:border-zinc-850 transition space-y-4">

                          <div className="flex justify-between items-center border-b border-zinc-900 pb-2">

                            <div className="flex items-center gap-2">

                              <span className="font-mono text-[10px] font-bold bg-zinc-950 border border-zinc-900 px-2 py-1 rounded text-zinc-500">Cena {idx + 1}</span>

                              <span className="text-[10px] text-zinc-400 font-mono">ID: {vp.scene}</span>

                            </div>

                            <div className="flex items-center gap-3">

                              <span className="text-[10px] text-zinc-500 font-mono">Bloco:</span>

                              <input

                                type="number"

                                min="1"

                                max="12"

                                value={vp.block || 1}

                                onChange={(e) => updateSceneField(idx, 'block', parseInt(e.target.value) || 1)}

                                className="bg-zinc-950 border border-zinc-900 text-center w-12 py-0.5 rounded text-[10px] text-white"

                              />

                            </div>

                          </div>

                          {(() => {

                            const blockNum = vp.block || 1;

                            const blockKey = String(blockNum);

                            // Find the corresponding asset index in this block

                            let assetIdx = 0;

                            if (storyboardData && storyboardData.visual_prompts) {

                              for (let i = 0; i < idx; i++) {

                                if ((storyboardData.visual_prompts[i].block || 1) === blockNum) {

                                  assetIdx++;

                                }

                              }

                            }

                            const correspondingAsset = config?.timeline_assets?.[blockKey]?.[assetIdx];

                            return (

                              <div className="flex flex-col lg:flex-row gap-4">

                                {/* Left Column: Visual Asset Preview & Upload */}

                                <div className="w-full lg:w-48 shrink-0 space-y-1.5">

                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Visual da Cena</label>

                                  <div 

                                    className="bg-zinc-950 rounded-xl overflow-hidden relative flex items-center justify-center border border-zinc-900 group/preview w-full h-24"

                                  >

                                    {correspondingAsset && correspondingAsset.asset ? (

                                      <>

                                        {correspondingAsset.type === 'video' ? (

                                          <video 

                                            key={correspondingAsset.asset}

                                            src={getAssetUrl(correspondingAsset.asset)} 

                                            className="w-full h-full object-cover" 

                                            controls={false} 

                                            muted 

                                            loop 

                                            autoPlay 

                                            playsInline 

                                            onLoadedMetadata={(e) => {

                                              const dur = e.currentTarget.duration;

                                              if (dur && !isNaN(dur)) {

                                                setVideoFileDurations(prev => {

                                                  if (prev[correspondingAsset.asset] === dur) return prev;

                                                  return { ...prev, [correspondingAsset.asset]: dur };

                                                });

                                              }

                                            }}

                                            onLoadedData={(e) => {

                                              e.currentTarget.style.display = 'block';

                                            }}

                                            onError={(e) => {

                                              e.currentTarget.style.display = 'none';

                                            }}

                                          />

                                        ) : (

                                          <img 

                                            key={correspondingAsset.asset}

                                            src={getAssetUrl(correspondingAsset.asset)} 

                                            className="w-full h-full object-cover" 

                                            alt="Preview" 

                                            onLoad={(e) => {

                                              e.currentTarget.style.display = 'block';

                                            }}

                                            onError={(e) => {

                                              e.currentTarget.style.display = 'none';

                                            }}

                                          />

                                        )}

                                        {/* Small badge overlay showing duration */}

                                        <div className="absolute bottom-1 right-1 bg-black/70 text-white font-mono text-[8px] px-1 py-0.2 rounded font-bold">

                                          ⏱️ {getAssetDuration(blockKey, assetIdx).toFixed(1)}s

                                          {correspondingAsset.type === 'video' && videoFileDurations[correspondingAsset.asset] !== undefined && (

                                            <span className="text-zinc-400 font-normal ml-0.5 border-l border-zinc-700 pl-1">

                                              / {videoFileDurations[correspondingAsset.asset].toFixed(1)}s

                                            </span>

                                          )}

                                        </div>

                                        {/* Hover overlay to replace */}

                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition flex items-center justify-center gap-2">

                                          <input 

                                            type="file" 

                                            accept={correspondingAsset.type === 'video' ? "video/mp4" : "image/png,image/jpeg"} 

                                            className="hidden" 

                                            id={`storyboard-upload-${idx}`}

                                            onChange={(e) => {

                                              if (e.target.files && e.target.files[0]) {

                                                handleUploadSceneAsset(blockNum, correspondingAsset.type === 'video' ? 'video' : 'image', e.target.files[0], assetIdx, selectedProject);

                                              }

                                            }} 

                                          />

                                          <label 

                                            htmlFor={`storyboard-upload-${idx}`} 

                                            className="text-gold-500 hover:text-gold-400 text-[10px] cursor-pointer font-bold bg-zinc-900 border border-zinc-800 rounded px-2 py-1 transition flex items-center gap-1"

                                          >

                                            <Upload className="w-3 h-3" /> Substituir

                                          </label>

                                        </div>

                                      </>

                                    ) : (

                                      <div className="text-[9px] text-zinc-500 text-center px-2 flex flex-col items-center gap-1.5">

                                        <span>Nenhum visual</span>

                                        <input 

                                          type="file" 

                                          accept="image/png,image/jpeg,video/mp4" 

                                          className="hidden" 

                                          id={`storyboard-upload-new-${idx}`}

                                          onChange={(e) => {

                                            if (e.target.files && e.target.files[0]) {

                                              const file = e.target.files[0];

                                              const isVideo = file.name.endsWith('.mp4') || file.type.startsWith('video/');

                                              const type = isVideo ? 'video' : 'image';

                                              handleUploadSceneAsset(blockNum, type, file, assetIdx, selectedProject);

                                            }

                                          }} 

                                        />

                                        <label 

                                          htmlFor={`storyboard-upload-new-${idx}`} 

                                          className="text-zinc-400 hover:text-white text-[9px] font-bold bg-zinc-900 border border-zinc-800 rounded px-2 py-1 cursor-pointer transition flex items-center gap-1"

                                        >

                                          <Upload className="w-3 h-3" /> Upload

                                        </label>

                                      </div>

                                    )}

                                  </div>

                                </div>

                                {/* Right Column: Narration & Visual Prompt textareas */}

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">

                                  {/* Left Column: Narration Text */}

                                  <div className="space-y-1">

                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Narração (Texto Falado)</label>

                                    <textarea

                                      value={vp.narration_text || ''}

                                      onChange={(e) => updateSceneField(idx, 'narration_text', e.target.value)}

                                      placeholder="Insira o trecho de narração da fala do vídeo..."

                                      className="w-full bg-zinc-950 border border-zinc-855 focus:outline-none focus:border-gold-500 rounded-xl p-3 text-xs text-white h-24 resize-none leading-relaxed"

                                    />

                                  </div>

                                  {/* Right Column: Visual Prompt */}

                                  <div className="space-y-1">

                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Prompt Visual (Instrução de Geração)</label>

                                    <textarea

                                      value={vp.prompt || ''}

                                      onChange={(e) => updateSceneField(idx, 'prompt', e.target.value)}

                                      placeholder="Prompt detalhado em inglês para geração de vídeo ou imagem por IA..."

                                      className="w-full bg-zinc-950 border border-zinc-855 focus:outline-none focus:border-gold-500 rounded-xl p-3 text-xs text-gray-300 h-24 resize-none leading-relaxed italic"

                                    />

                                  </div>

                                </div>

                              </div>

                            );

                          })()}

                          {/* Scene parameters row */}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-950/40 p-3 border border-zinc-900 rounded-xl items-center">

                            <div className="space-y-0.5">

                              <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">Tipo de Cena</span>

                              <select

                                value={vp.type || "imagem IA 2k"}

                                onChange={(e) => updateSceneField(idx, 'type', e.target.value)}

                                className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-2 py-1 w-full focus:outline-none"

                              >

                                <option value="imagem IA 2k">Imagem IA 2k</option>

                                <option value="vídeo IA (max 10s)">Vídeo IA (max 10s)</option>

                              </select>

                            </div>

                            <div className="space-y-0.5">

                              <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">Duração Estimada</span>

                              <input

                                type="text"

                                value={vp.duration || "5 segundos"}

                                onChange={(e) => updateSceneField(idx, 'duration', e.target.value)}

                                placeholder="Duração (ex: 5 segundos)"

                                className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-2 py-1 w-full focus:outline-none"

                              />

                            </div>

                            <div className="space-y-0.5">

                              <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">Notas de Edição</span>

                              <input

                                type="text"

                                value={vp.editor_notes || ""}

                                onChange={(e) => updateSceneField(idx, 'editor_notes', e.target.value)}

                                placeholder="Efeitos: Ken Burns zoom, corte, etc."

                                className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-2 py-1 w-full focus:outline-none"

                              />

                            </div>

                            <div className="space-y-0.5">

                              <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">Busca Stock (Pexels)</span>

                              <input

                                type="text"

                                value={vp.stock_query || ""}

                                onChange={(e) => updateSceneField(idx, 'stock_query', e.target.value)}

                                placeholder="Termo de busca curto em inglês"

                                className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-2 py-1 w-full focus:outline-none"

                              />

                            </div>

                          </div>

                          {/* Action Controls for this Scene card */}

                          <div className="flex items-center justify-between pt-1">

                            <div className="flex items-center gap-1.5">

                              <button

                                disabled={idx === 0}

                                onClick={() => moveScene(idx, 'up')}

                                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-white p-1.5 rounded transition cursor-pointer"

                                title="Subir Cena"

                              >

                                <ChevronUp className="w-3.5 h-3.5" />

                              </button>

                              <button

                                disabled={idx === storyboardData.visual_prompts.length - 1}

                                onClick={() => moveScene(idx, 'down')}

                                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-white p-1.5 rounded transition cursor-pointer"

                                title="Descer Cena"

                              >

                                <ChevronDown className="w-3.5 h-3.5" />

                              </button>

                            </div>

                            <div className="flex items-center gap-2">

                              <button

                                onClick={() => deleteScene(idx)}

                                className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-[9px] px-2.5 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"

                              >

                                <Trash2 className="w-3 h-3" /> Excluir Cena

                              </button>

                              <button

                                onClick={() => insertSceneAfter(idx)}

                                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[9px] px-2.5 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"

                              >

                                <Plus className="w-3 h-3" /> Inserir Cena Abaixo

                              </button>

                            </div>

                          </div>

                        </div>

                      ))}

                      {/* Bottom actions */}

                      <div className="flex justify-between items-center pt-4">

                        <button

                          onClick={addSceneAtEnd}

                          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[10px] font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"

                        >

                          <Plus className="w-4 h-4" /> Adicionar Nova Cena no Fim

                        </button>

                        <button

                          onClick={handleSaveStoryboard}

                          className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"

                        >

                          <Save className="w-4 h-4" /> Salvar Alterações de Roteiro

                        </button>

                      </div>

                    </div>

                  )}

                </div>

              )}

              {editorSubTab === 'json' && storyboardData && (

                <div className="space-y-6">

                  <div className="flex justify-between items-center bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl">

                    <div>

                      <h4 className="font-cinzel text-xs font-bold text-white tracking-wider uppercase">JSON do Roteiro e Storyboard</h4>

                      <p className="text-[10px] text-gray-400 mt-0.5">Explore a estrutura de dados completa do storyboard.json de forma colapsável.</p>

                    </div>

                    <button

                      onClick={() => copyToClipboard(JSON.stringify(storyboardData, null, 2), 'storyboard-json')}

                      className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"

                    >

                      <span>{copiedSection === 'storyboard-json' ? 'Copiado!' : 'Copiar JSON'}</span>

                    </button>

                  </div>

                  <div className="glass-panel p-6 rounded-3xl bg-zinc-950/60 max-h-[600px] overflow-y-auto">

                    <JsonTreeView value={storyboardData} />

                  </div>

                </div>

              )}

            </div>

          )}

          {activeTab === 'settings' && (

            <div className="space-y-6 animate-fade-in font-sans">
              <SettingsSectionNav active={settingsSection} onChange={setSettingsSection} />

              {settingsSection === 'ia' && (
              <div className="glass-panel p-6 rounded-3xl space-y-5">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">

                  <div>

                    <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">

                      <Settings className="w-4 h-4 text-gold-500" /> CONFIGURAÇÕES DE IA

                    </h3>

                    <p className="text-xs text-gray-400 mt-1">Provedor e chaves de modelos de IA (Gemini, Grok, OpenRouter). Salvas no projeto ativo.</p>

                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-400">

                    <span className="px-2.5 py-1 rounded-lg border border-zinc-850 bg-zinc-950">Gemini: {geminiKeyCount} chave(s)</span>

                    <span className="px-2.5 py-1 rounded-lg border border-zinc-850 bg-zinc-950">xAI: {hasXaiKey ? 'configurado' : 'vazio'}</span>

                  </div>

                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <button onClick={() => setAiProvider('gemini')} className={`text-left border rounded-2xl p-4 transition cursor-pointer ${aiProvider === 'gemini' ? 'border-gold-500/60 bg-gold-500/10' : 'border-zinc-850 bg-zinc-950/40 hover:border-zinc-700'}`}>

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold text-white font-cinzel">Gemini</span>

                      {aiProvider === 'gemini' && <CheckCircle className="w-4 h-4 text-gold-500" />}

                    </div>

                    <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">Google AI Studio gratuito (ex.: Gemini 2.5 Flash). Chaves em rotação; xAI/Grok como fallback.</p>

                  </button>

                  <button onClick={() => setAiProvider('xai')} className={`text-left border rounded-2xl p-4 transition cursor-pointer ${aiProvider === 'xai' ? 'border-gold-500/60 bg-gold-500/10' : 'border-zinc-850 bg-zinc-950/40 hover:border-zinc-700'}`}>

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold text-white font-cinzel">Grok / xAI</span>

                      {aiProvider === 'xai' && <CheckCircle className="w-4 h-4 text-gold-500" />}

                    </div>

                    <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">Usa a API da xAI como provedor principal para metadados quando selecionado.</p>

                  </button>

                  <button onClick={() => setAiProvider('openrouter')} className={`text-left border rounded-2xl p-4 transition cursor-pointer ${aiProvider === 'openrouter' ? 'border-gold-500/60 bg-gold-500/10' : 'border-zinc-850 bg-zinc-950/40 hover:border-zinc-700'}`}>

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold text-white font-cinzel">OpenRouter</span>

                      {aiProvider === 'openrouter' && <CheckCircle className="w-4 h-4 text-gold-500" />}

                    </div>

                    <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">Usa a API do OpenRouter com rotação de modelos free do Gemini, Llama e Qwen.</p>

                  </button>

                </div>

                {aiProvider === 'gemini' && (
                  <div className={`rounded-2xl border p-4 transition ${geminiBrowserMode ? 'border-violet-500/40 bg-violet-500/10' : 'border-zinc-850 bg-zinc-950/40'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white font-cinzel flex items-center gap-2">
                          <Chrome className="w-4 h-4 text-violet-400" />
                          Gemini no Chrome (extensão)
                        </p>
                        <p className="text-[10px] text-zinc-400 leading-relaxed max-w-xl">
                          Ativa todas as chamadas de IA via Gemini no Chrome, de forma autônoma (sem copiar/colar).
                          Requer a extensão Lumiera em tools/lumiera-gemini-bridge — ela controla gemini.google.com na sua sessão Google.
                          Desligado, volta a usar a API do AI Studio normalmente.
                        </p>
                        {geminiBrowserMode && (
                          <div className="space-y-1.5">
                            <p className={`text-[9px] ${geminiExtensionReady ? 'text-emerald-300/90' : 'text-amber-300/90'}`}>
                              Extensão: {geminiExtensionReady === null ? 'verificando…' : geminiExtensionReady
                                ? `ativa — ${geminiExtensionDiag || 'automação OK'}`
                                : 'não conectada'}
                            </p>
                            {geminiExtensionDiag && !geminiExtensionReady && (
                              <p className="text-[9px] text-amber-200/80 leading-relaxed max-w-xl">{geminiExtensionDiag}</p>
                            )}
                            <button
                              type="button"
                              disabled={geminiExtensionTesting}
                              onClick={async () => {
                                setGeminiExtensionTesting(true);
                                try {
                                  const d = await refreshGeminiExtensionStatus();
                                  if (d.pingOk) toast.success(`Extensão OK ${d.version ? `(v${d.version})` : ''}`);
                                  else toast.error(d.error || 'Extensão não conectada', { duration: 8000 });
                                } finally {
                                  setGeminiExtensionTesting(false);
                                }
                              }}
                              className="text-[9px] text-violet-300 hover:text-violet-100 border border-violet-500/30 px-2 py-1 rounded-lg transition disabled:opacity-50"
                            >
                              {geminiExtensionTesting ? 'Testando…' : 'Testar extensão'}
                            </button>
                          </div>
                        )}
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <span className="text-[10px] text-zinc-400">{geminiBrowserMode ? 'Ativo' : 'Desligado'}</span>
                        <input
                          type="checkbox"
                          checked={geminiBrowserMode}
                          onChange={(e) => setGeminiBrowserMode(e.target.checked)}
                          className="accent-violet-500 w-4 h-4"
                        />
                      </label>
                    </div>
                  </div>
                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  <div className="space-y-4">

                    <div className="space-y-2">

                      <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Modelo Gemini</label>

                      <select
                        value={geminiModel}
                        onChange={(e) => setGeminiModel(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white"
                      >
                        {geminiModelOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>

                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        {geminiModelOptions.find((option) => option.id === geminiModel)?.hint || 'Gratuito no Google AI Studio com chave de API.'}
                        {' '}Recomendado: <span className="text-zinc-300">Gemini 2.5 Flash</span> (rápido, contexto 1M).
                      </p>

                    </div>

                    <div className="space-y-2">

                      <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Chaves Gemini</label>

                      <textarea value={geminiKeysInput} onChange={(e) => setGeminiKeysInput(e.target.value)} placeholder="Cole uma ou várias chaves Gemini, uma por linha. Deixe vazio para manter as atuais." className="w-full h-32 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white resize-none" />

                    </div>

                  </div>

                  <div className="space-y-4">

                    <div className="space-y-2">

                      <div className="flex items-center justify-between">

                        <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Chave OpenRouter</label>

                        {hasOpenRouterKey ? (

                          <span className="text-[9px] bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Ativa (Personalizada)</span>

                        ) : (

                          <span className="text-[9px] bg-amber-950/80 border border-amber-800 text-amber-400 px-2 py-0.5 rounded-full font-bold">Ativa (Padrão do Sistema)</span>

                        )}

                      </div>

                      <input type="password" value={openrouterKeyInput} onChange={(e) => setOpenRouterKeyInput(e.target.value)} placeholder="Deixe vazio para usar a padrão ou cole uma chave personalizada." className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white" />

                      <p className="text-[10px] text-zinc-500 leading-relaxed">Opcional. Se não fornecida, o sistema usará a chave privada pré-configurada.</p>

                    </div>

                    <div className="space-y-2">

                      <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Chave xAI / Grok</label>

                      <input type="password" value={xaiKeyInput} onChange={(e) => setXaiKeyInput(e.target.value)} placeholder="Cole a chave xAI. Deixe vazio para manter a atual." className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white" />

                      <p className="text-[10px] text-zinc-500 leading-relaxed">A xAI será usada como fallback quando o Gemini esgotar todas as chaves ou como principal se você selecionar Grok / xAI.</p>

                    </div>

                  </div>

                </div>

                <div className="flex justify-end">

                  <button onClick={handleSaveAiSettings} disabled={savingAiSettings} className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2">

                    {savingAiSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}

                    <span>{savingAiSettings ? 'Salvando...' : 'Salvar Configurações'}</span>

                  </button>

                </div>

              </div>

              )}

              {/* SEÇÃO LOGOTIPO DO VÍDEO */}

              {settingsSection === 'apis' && (
                <SettingsApiKeys
                  epidemicKeyInput={epidemicKeyInput}
                  setEpidemicKeyInput={setEpidemicKeyInput}
                  hasEpidemicKey={hasEpidemicKey}
                  pexelsKeyInput={pexelsKeyInput}
                  setPexelsKeyInput={setPexelsKeyInput}
                  pixabayKeyInput={pixabayKeyInput}
                  setPixabayKeyInput={setPixabayKeyInput}
                  hasPexelsKey={hasPexelsKey}
                  hasPixabayKey={hasPixabayKey}
                  saving={savingApiKeys}
                  onSave={handleSaveApiKeys}
                />
              )}

              {/* CONFIGURAÇÕES GLOBAIS DE RENDERIZAÇÃO */}

              {settingsSection === 'render' && (
              <div className="glass-panel p-6 rounded-3xl space-y-5">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">

                  <div>

                    <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">

                      <Settings className="w-4 h-4 text-gold-500" /> CONFIGURAÇÕES GLOBAIS DE RENDERIZAÇÃO

                    </h3>

                    <p className="text-xs text-gray-400 mt-1">Configure parâmetros globais de compilação de vídeo e mixagem de trilha sonora.</p>

                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  <div className="space-y-4">

                    {/* Volume da Música */}

                    <div className="space-y-2">

                      <div className="flex justify-between items-center">

                        <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Volume da Trilha Sonora (BGM)</label>

                        <span className="text-xs text-white font-mono font-bold">{(globalMusicVolume * 100).toFixed(0)}%</span>

                      </div>

                      <input 

                        type="range" 

                        min="0.01" 

                        max="0.5" 

                        step="0.01" 

                        value={globalMusicVolume} 

                        onChange={(e) => setGlobalMusicVolume(parseFloat(e.target.value))} 

                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gold-500" 

                      />

                      <p className="text-[9px] text-zinc-500">Volume atenuado padrão (15% recomendado) para evitar que a música encubra a narração.</p>

                    </div>

                    {/* Espaçamento entre Blocos (Gap) */}

                    <div className="space-y-2">

                      <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Espaçamento entre Blocos (Gap)</label>

                      <div className="flex items-center bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-2">

                        <input 

                          type="number" 

                          step="0.5" 

                          min="0"

                          value={globalBlockGap} 

                          onChange={(e) => setGlobalBlockGap(parseFloat(e.target.value) || 0)} 

                          className="bg-transparent text-white text-xs font-mono w-full focus:outline-none" 

                        />

                        <span className="text-xs text-zinc-500 font-mono ml-2">segundos</span>

                      </div>

                      <p className="text-[9px] text-zinc-500">Segundos extras adicionados ao final de cada bloco de cenas (2.0s padrão) para respiro da locução.</p>

                    </div>

                  </div>

                  <div className="space-y-4">

                    {/* Taxa de Quadros (FPS) */}

                    <div className="space-y-2">

                      <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Taxa de Quadros (FPS)</label>

                      <select 

                        value={globalFps} 

                        onChange={(e) => setGlobalFps(parseInt(e.target.value) || 30)} 

                        className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white cursor-pointer"

                      >

                        <option value={24}>24 FPS (Cinematográfico)</option>

                        <option value={30}>30 FPS (Padrão Web)</option>

                        <option value={60}>60 FPS (Super Fluido)</option>

                      </select>

                      <p className="text-[9px] text-zinc-500">Taxa de quadros para renderização Remotion.</p>

                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Resolução de Saída</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setResolutionConfigScope('global')} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${resolutionConfigScope === 'global' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'}`}>Padrão Global</button>
                        <button type="button" onClick={() => setResolutionConfigScope('project')} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${resolutionConfigScope === 'project' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'}`}>Personalizado do Projeto</button>
                      </div>
                      {resolutionConfigScope === 'global' ? (
                        <>
                          <select
                            value={globalRenderResolution}
                            onChange={(e) => setGlobalRenderResolution(e.target.value === '2k' ? '2k' : '1080p')}
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white cursor-pointer"
                          >
                            <option value="1080p">1080p — 1920×1080 (16:9) / 1080×1920 (9:16)</option>
                            <option value="2k">2K — 2560×1440 (16:9) / 1440×2560 (9:16)</option>
                          </select>
                          <p className="text-[9px] text-zinc-500">Salve com o botão abaixo. Vale para todos os projetos sem override.</p>
                        </>
                      ) : (
                        <>
                          <select
                            value={projectRenderResolution}
                            onChange={(e) => setProjectRenderResolution(e.target.value === '2k' ? '2k' : '1080p')}
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white cursor-pointer"
                          >
                            <option value="1080p">1080p — 1920×1080 (16:9) / 1080×1920 (9:16)</option>
                            <option value="2k">2K — 2560×1440 (16:9) / 1440×2560 (9:16)</option>
                          </select>
                          <div className="flex gap-2">
                            <button type="button" onClick={handleSaveProjectRenderResolution} disabled={savingProjectResolution} className="flex-1 py-2 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 text-gold-300 text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-50">
                              {savingProjectResolution ? 'Salvando...' : 'Salvar do Projeto'}
                            </button>
                            {config?.render_resolution && (
                              <button type="button" onClick={handleClearProjectRenderResolution} disabled={savingProjectResolution} className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider hover:border-zinc-700 transition disabled:opacity-50">
                                Usar Global
                              </button>
                            )}
                          </div>
                          <p className="text-[9px] text-zinc-500">Sobrescreve a resolução global só neste projeto.</p>
                        </>
                      )}
                    </div>

                    {/* Checkboxes for Remotion & Debug */}

                    <div className="grid grid-cols-2 gap-4 pt-2">

                      <div className="flex items-center gap-2">

                        <input 

                          type="checkbox" 

                          id="use-remotion-chk"

                          checked={globalUseRemotion}

                          onChange={(e) => setGlobalUseRemotion(e.target.checked)}

                          className="rounded bg-zinc-950 border-zinc-800 text-gold-500 focus:ring-gold-500 cursor-pointer w-4 h-4"

                        />

                        <label htmlFor="use-remotion-chk" className="text-xs text-zinc-300 font-medium cursor-pointer select-none">Remotion por Padrão</label>

                      </div>

                      <div className="flex items-center gap-2">

                        <input 

                          type="checkbox" 

                          id="debug-overlay-chk"

                          checked={globalDebugOverlay}

                          onChange={(e) => setGlobalDebugOverlay(e.target.checked)}

                          className="rounded bg-zinc-950 border-zinc-800 text-gold-500 focus:ring-gold-500 cursor-pointer w-4 h-4"

                        />

                        <label htmlFor="debug-overlay-chk" className="text-xs text-zinc-300 font-medium cursor-pointer select-none">Debug Overlay</label>

                      </div>

                    </div>

                  </div>

                </div>

                <div className="flex justify-end border-t border-zinc-900 pt-4">

                  <button 

                    onClick={handleSaveGlobalRenderConfig} 

                    disabled={savingGlobalConfig}

                    className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"

                  >

                    <span>{savingGlobalConfig ? 'Salvando...' : 'Salvar Configurações de Renderização'}</span>

                  </button>

                </div>

              </div>

              )}

              {settingsSection === 'marca' && (
                            <div className="glass-panel p-6 rounded-3xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                  <div>
                    <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">
                      <Image className="w-4 h-4 text-gold-500" /> LOGOTIPO DO FINAL DO VÍDEO
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Adicione vários logotipos ao catálogo e escolha qual exibir no encerramento. Alterne entre escopo global ou por projeto.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setLogoCatalogScope('global')} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${logoCatalogScope === 'global' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'}`}>Padrão Global</button>
                  <button type="button" onClick={() => setLogoCatalogScope('project')} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${logoCatalogScope === 'project' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'}`}>Personalizado do Projeto</button>
                </div>

                <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
                  {(() => {
                    const activeId = logoCatalogScope === 'project' ? (projectSelectedLogoId || selectedLogoId) : selectedLogoId;
                    const activeLogo = brandLogos.find((l) => l.id === activeId) || brandLogos[0];
                    const previewUrl = logoStatus?.currentLogoUrl || activeLogo?.url;
                    return previewUrl ? (
                      <img src={`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}t=${logoTimestamp}`} alt="Logo ativo" className="max-h-24 max-w-full object-contain drop-shadow-lg" />
                    ) : (
                      <div className="text-zinc-600 text-xs font-mono">Nenhum logo no catálogo</div>
                    );
                  })()}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-center text-[9px] text-zinc-500 bg-zinc-950/80 px-2.5 py-1 rounded-lg">
                    <span>Escopo: {logoCatalogScope === 'project' ? 'Personalizado do Projeto' : 'Padrão Global'}</span>
                    {logoCatalogScope === 'project' && (projectSelectedLogoId || logoStatus?.hasProjectLogo) && (
                      <button type="button" onClick={handleResetLogo} className="text-red-400 hover:text-red-300 font-semibold cursor-pointer transition">Usar logo global</button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">Catálogo de Logos</span>
                  {brandLogos.length === 0 ? (
                    <p className="text-xs text-zinc-500">Nenhum logo cadastrado. Envie o primeiro abaixo.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {brandLogos.map((logo) => {
                        const activeId = logoCatalogScope === 'project' ? (projectSelectedLogoId || selectedLogoId) : selectedLogoId;
                        const isActive = logo.id === activeId;
                        return (
                          <div key={logo.id} className={`relative rounded-2xl border p-3 bg-zinc-950/40 transition ${isActive ? 'border-gold-500/60 ring-1 ring-gold-500/30' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <div className="h-20 flex items-center justify-center mb-2 bg-zinc-950 rounded-xl overflow-hidden">
                              <img src={`${logo.url}${logo.url.includes('?') ? '&' : '?'}t=${logoTimestamp}`} alt={logo.name} className="max-h-16 max-w-full object-contain" />
                            </div>
                            <input
                              type="text"
                              value={logo.name}
                              onChange={(e) => setBrandLogos((prev) => prev.map((l) => (l.id === logo.id ? { ...l, name: e.target.value } : l)))}
                              onBlur={(e) => handleRenameBrandLogo(logo.id, e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-white mb-2 focus:border-gold-500/50 outline-none"
                              title="Renomear logo"
                            />
                            <div className="flex gap-1.5">
                              <button type="button" onClick={() => handleSelectBrandLogo(logo.id)} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition ${isActive ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-gold-500/30 hover:text-gold-400'}`}>
                                {isActive ? <span className="flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Ativo</span> : 'Usar'}
                              </button>
                              <button type="button" onClick={() => handleDeleteBrandLogo(logo.id)} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition" title="Remover">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-zinc-900 pt-5">
                  <span className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">Adicionar Logo ao Catálogo</span>
                  <input type="text" value={newLogoName} onChange={(e) => setNewLogoName(e.target.value)} placeholder="Nome do logo" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-gold-500/50 outline-none" />
                  <label className="border-2 border-dashed border-zinc-800 hover:border-gold-500/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition min-h-[96px] bg-zinc-950/20 hover:bg-zinc-950/40">
                    <Upload className="w-6 h-6 text-zinc-500 mb-2" />
                    <span className="text-xs text-gray-400 font-semibold">{uploadingLogo ? 'Enviando imagem...' : 'Escolher imagem PNG'}</span>
                    <span className="text-[9px] text-zinc-500 mt-1">Recomendado: fundo transparente</span>
                    <input type="file" accept="image/png" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </label>
                </div>

                <div className="border-t border-zinc-900 pt-5 space-y-4">
                  <div>
                    <h4 className="font-cinzel text-xs font-bold text-white tracking-wide flex items-center gap-2">
                      <Video className="w-4 h-4 text-red-500" /> CANAL DO YOUTUBE (BOTÃO INSCREVER-SE)
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Cadastre vários canais e selecione qual usar no encerramento. Escopo global ou por projeto.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setChannelConfigScope('global'); fetchGlobalRenderConfig(); }} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${channelConfigScope === 'global' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'}`}>Padrão Global</button>
                    <button type="button" onClick={() => setChannelConfigScope('project')} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${channelConfigScope === 'project' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'}`}>Personalizado do Projeto</button>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">Catálogo de Canais</span>
                    {youtubeChannels.length === 0 ? (
                      <p className="text-xs text-zinc-500">Nenhum canal cadastrado. Adicione o primeiro abaixo.</p>
                    ) : (
                      <div className="space-y-2">
                        {youtubeChannels.map((channel) => {
                          const activeId = channelConfigScope === 'project' ? (projectSelectedChannelId || selectedChannelId) : selectedChannelId;
                          const isActive = channel.id === activeId;
                          return (
                            <div key={channel.id} className={`rounded-2xl border p-4 space-y-3 transition ${isActive ? 'border-red-500/40 bg-red-500/5' : 'border-zinc-800 bg-zinc-950/30'}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0 space-y-2">
                                  <input type="text" value={channel.label} onChange={(e) => handleUpdateYoutubeChannelField(channel.id, 'label', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-gold-500/50 outline-none" placeholder="Rótulo" />
                                  <input type="text" value={channel.channelUrl} onChange={(e) => handleUpdateYoutubeChannelField(channel.id, 'channelUrl', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-gold-500/50 outline-none" placeholder="URL do canal" />
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <input type="text" value={channel.channelName || ''} onChange={(e) => handleUpdateYoutubeChannelField(channel.id, 'channelName', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-gold-500/50 outline-none" placeholder="Nome (opcional)" />
                                    <input type="text" value={channel.subscriberCount || ''} onChange={(e) => handleUpdateYoutubeChannelField(channel.id, 'subscriberCount', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-gold-500/50 outline-none" placeholder="Inscritos (opcional)" />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1.5 shrink-0">
                                  <button type="button" onClick={() => handleSelectYoutubeChannel(channel.id)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition ${isActive ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-red-500/30 hover:text-red-300'}`}>
                                    {isActive ? 'Ativo' : 'Usar'}
                                  </button>
                                  <button type="button" onClick={() => handleDeleteYoutubeChannel(channel.id)} disabled={youtubeChannels.length <= 1} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition disabled:opacity-30 disabled:cursor-not-allowed" title="Remover">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 border-t border-zinc-900 pt-4">
                    <span className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">Adicionar Canal ao Catálogo</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input type="text" value={newChannelLabel} onChange={(e) => setNewChannelLabel(e.target.value)} placeholder="Rótulo do canal" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-gold-500/50 outline-none" />
                      <input type="text" value={newChannelUrl} onChange={(e) => setNewChannelUrl(e.target.value)} placeholder="https://www.youtube.com/@seucanal" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-gold-500/50 outline-none" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input type="text" value={globalYoutubeChannelName} onChange={(e) => setGlobalYoutubeChannelName(e.target.value)} placeholder="Nome do canal (opcional)" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-gold-500/50 outline-none" />
                      <input type="text" value={globalYoutubeSubscriberCount} onChange={(e) => setGlobalYoutubeSubscriberCount(e.target.value)} placeholder="Inscritos (opcional)" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-gold-500/50 outline-none" />
                    </div>
                    <button type="button" onClick={handleAddYoutubeChannel} className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider transition">Adicionar Canal</button>
                  </div>
                </div>
              </div>

              )}

              {settingsSection === 'integracoes' && (
                <IntegrationSettings
                  uploadStatus={uploadStatus}
                  toast={(msg) => toast(msg)}
                  fetchUploadStatus={fetchUploadStatus}
                  onRelinkYoutube={handleRelinkYoutube}
                  canvaClientId={canvaClientId}
                  setCanvaClientId={setCanvaClientId}
                  canvaClientSecret={canvaClientSecret}
                  setCanvaClientSecret={setCanvaClientSecret}
                  ytClientId={ytClientId}
                  setYtClientId={setYtClientId}
                  ytClientSecret={ytClientSecret}
                  setYtClientSecret={setYtClientSecret}
                  igAppId={igAppId}
                  setIgAppId={setIgAppId}
                  igAppSecret={igAppSecret}
                  setIgAppSecret={setIgAppSecret}
                  igAccountId={igAccountId}
                  setIgAccountId={setIgAccountId}
                  igAccessToken={igAccessToken}
                  setIgAccessToken={setIgAccessToken}
                />
              )}

            </div>

          )}

                    {/* TAB 6: AI VIDEO CREATOR */}

          {activeTab === 'creator' && (

            <div className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-120px)] overflow-hidden font-sans">

              {/* Steps Progress Header */}

              <div className="glass-panel p-5 rounded-2xl shrink-0">

                <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2 mb-4">

                  <Sparkles className="w-5 h-5 text-gold-500 animate-pulse" /> CRIADOR DE VÍDEOS AUTOMATIZADO COM IA

                </h3>

                <button 

                  onClick={() => {

                    localStorage.removeItem('qanat_creator_state');
                    setCreatorStep(1);
                    setNicheInput('');
                    setIdeasData(null);
                    setSelectedIdeaIndex(-1);
                    setGeneratedScriptData(null);
                    setFormatSelector('LONGO');
                    setCreatorProjectName('');
                    
                    // Reset custom ideas states
                    setCustomTitle('');
                    setCustomHooks('');
                    setCustomOutline('');
                    setCustomBlocks([
                      { block: 1, content: '' }
                    ]);
                    setIdeationTab('ai');
                    
                    // Reset custom strategy fields (generated ideas & manual ideas from zero)
                    setCustomIdeaTitle("");
                    setCustomIdeaPromise("");
                    setCustomIdeaEmotion("");
                    setCustomIdeaHook("");
                    setCustomIdeaBlocks("");
                    
                    toast.success("Progresso limpo! Novo rascunho iniciado.");

                  }}

                  className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-[10px] px-3 py-1.5 rounded uppercase font-bold transition flex items-center gap-1 ml-auto cursor-pointer"

                >

                  <Trash2 className="w-3 h-3" /> Limpar Progresso e Novo

                </button>

                <div className="flex justify-between items-center relative">

                  <div className="absolute left-4 right-4 h-0.5 bg-zinc-800 top-1/2 -translate-y-1/2 -z-10"></div>

                  <div 

                    className="absolute left-4 h-0.5 bg-gold-500 top-1/2 -translate-y-1/2 -z-10 transition-all duration-300"

                    style={{ width: `${((creatorStep - 1) / 6) * 100}%` }}

                  ></div>

                  {[1, 2, 3, 4, 5, 6, 7].map((step) => (

                    <button 

                      key={step}

                      onClick={() => creatorStep > step && setCreatorStep(step)}

                      className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-150 cursor-pointer ${

                        creatorStep === step 

                          ? 'bg-gold-500 text-zinc-950 shadow-lg shadow-gold-500/25 scale-110' 

                          : creatorStep > step 

                            ? 'bg-emerald-500 text-white' 

                            : 'bg-zinc-900 border border-zinc-800 text-zinc-500'

                      }`}

                    >

                      {creatorStep > step ? '✓' : step}

                    </button>

                  ))}

                </div>

                <div className="flex justify-between text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-2.5 px-1 font-sans">

                  <span>1. Roteiro IA</span>

                  <span>2. Narração Master</span>

                  <span>3. Sincronizar</span>

                  <span>4. Associar B-roll</span>

                  <span>5. Render</span>
                  <span>6. Metadados</span>
                  <span>7. Publicar</span>

                </div>

              </div>

              {/* Steps Content Area */}

              <div className="flex-1 bg-[#09090b] border border-zinc-900 rounded-3xl p-6 min-h-0 overflow-y-auto">

                {/* STEP 1: SCRIPT MASTER Research & Selection */}

                {creatorStep === 1 && (

                  <div className="space-y-8 max-w-4xl mx-auto font-sans">

                    {/* Step 1 Header & Tabs Selector */}
                    <div className="bg-zinc-950/60 border border-zinc-900/85 rounded-2xl p-5 space-y-4">
                      <div>
                        <h4 className="text-white font-bold text-sm tracking-wide font-cinzel">Passo 1: Pesquisa e Ideias (Script Master)</h4>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          Defina o assunto e a estrutura do seu vídeo. Primeiro a IA gera a narração para você revisar e editar; depois de aprovar, ela monta blocos, prompts visuais e estratégia completa.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-900/60 pt-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={useNotebooklm}
                            onChange={(e) => setUseNotebooklm(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-gold-500 focus:ring-gold-500/30"
                          />
                          <span className="text-xs text-zinc-300 font-semibold">Usar NotebookLM na pesquisa de roteiro</span>
                        </label>
                        {notebooklmStatus && (
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                              notebooklmStatus.authenticated
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                            }`}
                            title={notebooklmStatus.message}
                          >
                            {notebooklmStatus.authenticated ? 'NotebookLM conectado' : 'Execute nlm login'}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2 border-t border-zinc-900/60 pt-3">
                        <button
                          type="button"
                          onClick={() => setIdeationTab('ai')}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            ideationTab === 'ai'
                              ? 'bg-gold-500 text-zinc-950 shadow-lg shadow-gold-500/10'
                              : 'bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-900'
                          }`}
                        >
                          <span>💡 Gerar com IA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIdeationTab('custom')}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            ideationTab === 'custom'
                              ? 'bg-gold-500 text-zinc-950 shadow-lg shadow-gold-500/10'
                              : 'bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-900'
                          }`}
                        >
                          <span>✏️ Ideia Personalizada</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIdeationTab('listicle')}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            ideationTab === 'listicle'
                              ? 'bg-gold-500 text-zinc-950 shadow-lg shadow-gold-500/10'
                              : 'bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-900'
                          }`}
                        >
                          <span>📊 Top N / Listicle</span>
                        </button>
                      </div>
                    </div>

                    {ideationTab === 'custom' ? (
                      <div className="space-y-6 max-w-2xl mx-auto">
                        <div className="space-y-4">
                          {/* Title input */}
                          <div className="space-y-2 font-sans">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Título do Vídeo (em Inglês)</label>
                            <input 
                              type="text"
                              placeholder="Ex: The Secrets Behind the Great Wall of China"
                              value={customTitle}
                              onChange={(e) => setCustomTitle(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                            />
                          </div>

                          {/* Hooks input */}
                          <div className="space-y-2 font-sans">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Ganchos / Hooks de Retenção (em Inglês)</label>
                            <textarea 
                              rows={2}
                              placeholder="Ex: What if the Great Wall wasn't built to keep humans out, but to lock something else inside?"
                              value={customHooks}
                              onChange={(e) => setCustomHooks(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                            />
                          </div>

                          {/* Outline / Promise input */}
                          <div className="space-y-2 font-sans">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Roteiro Base / Promessa Geral (em Inglês)</label>
                            <textarea 
                              rows={3}
                              placeholder="Ex: A historical documentary uncovering unknown architectural elements and defense strategies of the ancient Great Wall..."
                              value={customOutline}
                              onChange={(e) => setCustomOutline(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                            />
                          </div>

                          {/* Format dropdown */}
                          <div className="space-y-2 font-sans">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Formato do Vídeo</label>
                            <select
                              value={formatSelector}
                              onChange={(e) => setFormatSelector(e.target.value as 'LONGO' | 'SHORTS')}
                              className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white cursor-pointer font-sans"
                            >
                              <option value="LONGO">Vídeo Longo (6 a 12 minutos - Documentário)</option>
                              <option value="SHORTS">Shorts (30 a 50 segundos - Rápido e Viral)</option>
                            </select>
                          </div>

                          {/* Dynamic Blocks */}
                          <div className="space-y-4 pt-2 font-sans">
                            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Estrutura de Blocos (em Inglês)</label>
                              <span className="text-[9px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 font-mono font-bold">
                                {customBlocks.length} {customBlocks.length === 1 ? 'bloco' : 'blocos'}
                              </span>
                            </div>

                            <div className="space-y-3">
                              {customBlocks.map((b, idx) => (
                                <div key={idx} className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-2 relative">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Bloco {idx + 1}</span>
                                    {customBlocks.length > 1 && (
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const newBlocks = customBlocks.filter((_, i) => i !== idx)
                                            .map((block, i) => ({ ...block, block: i + 1 }));
                                          setCustomBlocks(newBlocks);
                                        }}
                                        className="text-red-500/70 hover:text-red-400 text-[10px] font-bold cursor-pointer transition"
                                      >
                                        Remover
                                      </button>
                                    )}
                                  </div>
                                  <textarea
                                    rows={3}
                                    placeholder={`Descreva o conteúdo do bloco ${idx + 1} em inglês (ex: Explain how the foundation was built...)`}
                                    value={b.content}
                                    onChange={(e) => {
                                      const newBlocks = [...customBlocks];
                                      newBlocks[idx].content = e.target.value;
                                      setCustomBlocks(newBlocks);
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-900/60 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-white"
                                  />
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setCustomBlocks([...customBlocks, { block: customBlocks.length + 1, content: "" }]);
                              }}
                              className="w-full bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>+ Adicionar Bloco</span>
                            </button>
                          </div>

                          {/* Folder input */}
                          <div className="bg-zinc-950/40 border border-zinc-900/60 p-5 rounded-2xl space-y-2 mt-4 font-sans">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                              Nome do Novo Projeto (Nome da Pasta)
                            </label>
                            <input 
                              disabled={creatorLoading}
                              type="text"
                              placeholder="Ex: Secrets_Roman_Concrete, Great_Wall_Secrets, etc."
                              value={creatorProjectName}
                              onChange={(e) => setCreatorProjectName(e.target.value)}
                              className="w-full bg-white border border-zinc-300 hover:border-zinc-400 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-zinc-900 font-semibold placeholder:text-zinc-400"
                            />
                            <span className="text-[9px] text-zinc-500 block leading-normal mt-1">
                              * A IA traduzirá a narração para Português BR e gerará os ganchos, prompts e assets baseados no seu roteiro personalizado em inglês.
                            </span>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                          <button
                            disabled={creatorLoading || !customTitle.trim() || !creatorProjectName.trim()}
                            onClick={handleGenerateFullScript}
                            className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10 w-full justify-center sm:w-auto font-sans"
                          >
                            {creatorLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            <span>{creatorLoading && creatorLoadingMode === 'narration' ? 'Gerando narração...' : 'Gerar Narração'}</span>
                          </button>
                        </div>
                      </div>
                    ) : ideationTab === 'listicle' ? (
                        <ListicleCreatorStep
                          listNiche={listNiche}
                          setListNiche={setListNiche}
                          listTopic={listTopic}
                          setListTopic={setListTopic}
                          rankCount={rankCount}
                          setRankCount={setRankCount}
                          rankOrder={rankOrder}
                          setRankOrder={setRankOrder}
                          formatSelector={formatSelector}
                          setFormatSelector={setFormatSelector}
                          creatorProjectName={creatorProjectName}
                          setCreatorProjectName={setCreatorProjectName}
                          setNicheInput={setNicheInput}
                          creatorLoading={creatorLoading}
                          hasApiKey={hasApiKey}
                          listicleIdeasData={listicleIdeasData}
                          selectedListicleIdeaIndex={selectedListicleIdeaIndex}
                          listicleHudStyle={listicleHudStyle}
                          setListicleHudStyle={setListicleHudStyle}
                          listItems={generatedScriptData?.list_items || storyboardData?.list_items}
                          onSuggestRankings={handleSuggestListicleRankings}
                          onSelectRankingIdea={(idx) => setSelectedListicleIdeaIndex(idx)}
                          onGenerateScript={handleGenerateListicleScript}
                        />
                    ) : !ideasData ? (

                      <div className="space-y-6 max-w-2xl mx-auto">

                        <div>

                          <h4 className="text-white font-bold text-sm tracking-wide font-cinzel">Passo 1: Pesquisa e Ideias (Script Master)</h4>

                          <p className="text-xs text-gray-400 mt-1 leading-relaxed">

                            Insira seu nicho de atuação e o formato desejado. O gerador irá analisar as dores, medos e ganchos de retenção antes de propor 10 ideias de alto impacto.

                          </p>

                        </div>

                        <div className="space-y-4">

                          <div className="space-y-2">

                            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Nicho do Vídeo</label>

                            <input 

                              disabled={creatorLoading || !hasApiKey}

                              type="text"

                              placeholder={hasApiKey ? "Ex: curiosidades e fatos surpreendentes, finanças, culinária, natureza..." : "Configure um provedor na aba Configurações primeiro..."}

                              value={nicheInput}

                              onChange={(e) => setNicheInput(e.target.value)}

                              className="w-full bg-zinc-950 border border-zinc-855 hover:border-zinc-805 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"

                            />

                          </div>

                          <div className="space-y-2">

                            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Formato</label>

                            <select

                              disabled={creatorLoading || !hasApiKey}

                              value={formatSelector}

                              onChange={(e) => setFormatSelector(e.target.value as 'LONGO' | 'SHORTS')}

                              className="w-full bg-zinc-950 border border-zinc-855 hover:border-zinc-805 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white cursor-pointer"

                            >

                              <option value="LONGO">Vídeo Longo (6 a 12 minutos - Documentário)</option>

                              <option value="SHORTS">Shorts (30 a 50 segundos - Rápido e Viral)</option>

                            </select>

                          </div>

                        </div>

                        <div className="flex justify-end gap-3 pt-2 w-full flex-wrap sm:flex-nowrap">
                          <button
                            type="button"
                            disabled={creatorLoading}
                            onClick={() => {
                              setIdeasData({
                                diagnostic: null,
                                ideas: [],
                                best_idea_index: -1,
                                best_idea_reason: ""
                              });
                              setSelectedIdeaIndex(999);
                              setCustomIdeaTitle("");
                              setCustomIdeaPromise("");
                              setCustomIdeaEmotion("");
                              setCustomIdeaHook("");
                              setCustomIdeaBlocks("");
                            }}
                            className="bg-zinc-900 hover:bg-zinc-800 text-gold-500 hover:text-white border border-zinc-800 text-xs font-bold px-6 py-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg w-full justify-center sm:w-auto"
                          >
                            ✍️ Escrever Minha Própria Ideia
                          </button>
                          <button 

                            disabled={creatorLoading || !nicheInput.trim() || !hasApiKey}

                            onClick={handleGenerateIdeas}

                            className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10 w-full justify-center sm:w-auto"

                          >

                            {creatorLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}

                            <span>Analisar Nicho e Gerar 10 Ideias</span>

                          </button>

                        </div>

                      </div>
                    ) : (

                      <div className="space-y-8 animate-fade-in">

                        {/* Diagnostic info banner */}
                        {ideasData?.diagnostic && (
                          <div className="p-5 bg-zinc-950/60 border border-zinc-900 rounded-2xl space-y-4">
                            <h5 className="text-[10px] font-bold text-gold-500 uppercase tracking-widest block font-cinzel">DIAGNÓSTICO E PESQUISA DO NICHO</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                              <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-900/60">
                                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">O que procuram</span>
                                <p className="text-gray-300 mt-1 font-medium leading-relaxed">{ideasData?.diagnostic?.looking_for}</p>
                              </div>
                              <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-900/60">
                                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">Dores do público</span>
                                <p className="text-gray-300 mt-1 font-medium leading-relaxed">{ideasData?.diagnostic?.pain_points}</p>
                              </div>
                              <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-900/60">
                                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">Ângulo de Retenção</span>
                                <p className="text-gray-300 mt-1 font-medium leading-relaxed">{ideasData?.diagnostic?.strong_angle}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* List of 10 ideas */}

                        <div className="space-y-4">

                          <div className="flex justify-between items-center px-1">
                            <h4 className="text-white font-bold text-sm tracking-wide font-cinzel">Selecione uma das 10 Ideias</h4>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setSelectedIdeaIndex(999);
                                  setCustomIdeaTitle("");
                                  setCustomIdeaPromise("");
                                  setCustomIdeaEmotion("");
                                  setCustomIdeaHook("");
                                  setCustomIdeaBlocks("");
                                }}
                                className="bg-zinc-900 border border-zinc-800 hover:border-gold-500/50 text-gold-500 text-[10px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                              >
                                ✍️ Criar do Zero (Manual)
                              </button>
                              <span className="text-[10px] bg-gold-500/10 border border-gold-500/20 text-gold-500 px-2 py-0.5 rounded uppercase tracking-wider font-bold">10 Ideias Geradas</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {(ideasData?.ideas || []).map((idea, index) => {

                              const isSelected = selectedIdeaIndex === index;

                              const isBest = ideasData?.best_idea_index === index;

                              return (

                                <div 

                                  key={index}

                                  onClick={() => {

                                    setSelectedIdeaIndex(index);
                                    setCustomIdeaTitle(idea.title || "");
                                    setCustomIdeaPromise(idea.promise || "");
                                    setCustomIdeaEmotion(idea.emotion || "");
                                    setCustomIdeaHook("");
                                    setCustomIdeaBlocks("");

                                    // Auto-fill project name (short 3-word summary)

                                    const stopWords = ['o','a','os','as','um','uma','uns','umas','de','do','da','dos','das','no','na','nos','nas','em','por','para','com','e','que','se','ou','ao','à','pelo','pela','pelos','pelas','entre','sobre','sob','até','como','mais','menos','muito','tudo','isso','este','esta','esse','essa','qual','quais'];

                                    const shortName = idea.title

                                      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

                                      .replace(/[^a-zA-Z0-9\s]/g, '')

                                      .split(/\s+/)

                                      .filter((w: string) => w.length > 1 && !stopWords.includes(w.toLowerCase()))

                                      .slice(0, 3)

                                      .join('_');

                                    setCreatorProjectName(shortName);

                                  }}

                                  className={`p-5 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between hover:border-zinc-800 ${

                                    isSelected 

                                      ? 'bg-gold-500/5 border-gold-500 shadow-lg shadow-gold-500/5' 

                                      : 'bg-zinc-950/20 border-zinc-900'

                                  }`}

                                >

                                  <div>

                                    <div className="flex justify-between items-start mb-2">

                                      <span className="font-mono text-zinc-500 text-[10px] font-bold">Ideia {index + 1}</span>

                                      {isBest && (

                                        <span className="bg-gold-500 text-zinc-950 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-sans">

                                          Recomendado

                                        </span>

                                      )}

                                    </div>

                                    <h5 className={`text-xs font-bold font-cinzel tracking-wide ${isSelected ? 'text-gold-500' : 'text-white'}`}>{idea.title}</h5>

                                    <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{idea.promise}</p>

                                  </div>

                                  <div className="flex justify-between items-center mt-4 border-t border-zinc-900/60 pt-3 text-[9px] uppercase tracking-wider font-bold">

                                    <span className="text-zinc-500">Formato: {idea.best_format}</span>

                                    <span className="text-gold-500/70">{idea.emotion}</span>

                                  </div>

                                </div>

                              );

                            })}

                          </div>

                        </div>

                        {/* Best idea explanation */}

                        {selectedIdeaIndex === ideasData?.best_idea_index && (

                          <div className="p-4 bg-gold-500/5 border border-gold-500/20 rounded-2xl text-xs text-gray-300 leading-relaxed">

                            <strong className="text-gold-500 font-cinzel block text-[10px] uppercase tracking-wider mb-1">Por que esta é a melhor ideia:</strong>

                            {ideasData?.best_idea_reason}

                          </div>

                        )}

                        {selectedIdeaIndex !== -1 && (
                          <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-2xl space-y-4 mt-6 text-left">
                            <h5 className="text-[10px] font-bold text-gold-500 uppercase tracking-widest block font-cinzel">
                              {selectedIdeaIndex === 999 ? "CRIAR IDEIA MANUAL" : "PERSONALIZAR ESTRATÉGIA DA IDEIA"}
                            </h5>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Título Principal</label>
                                <input 
                                  type="text"
                                  value={customIdeaTitle}
                                  onChange={(e) => {
                                    setCustomIdeaTitle(e.target.value);
                                    if (selectedIdeaIndex === 999) {
                                      const stopWords = ['o','a','os','as','um','uma','uns','umas','de','do','da','dos','das','no','na','nos','nas','em','por','para','com','e','que','se','ou','ao','à','pelo','pela','pelos','pelas','entre','sobre','sob','até','como','mais','menos','muito','tudo','isso','este','esta','esse','essa','qual','quais'];
                                      const shortName = e.target.value
                                        .toLowerCase()
                                        .replace(/[^a-z0-9\s]/g, "")
                                        .split(/\s+/)
                                        .filter((w: string) => w.length > 1 && !stopWords.includes(w.toLowerCase()))
                                        .slice(0, 3)
                                        .join('_');
                                      setCreatorProjectName(shortName);
                                    }
                                  }}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 font-semibold"
                                  placeholder="Ex: A bizarra verdade sobre as escadas dos castelos"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Emoção Dominante</label>
                                <input 
                                  type="text"
                                  value={customIdeaEmotion}
                                  onChange={(e) => setCustomIdeaEmotion(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 font-semibold"
                                  placeholder="Ex: Curiosidade, Choque, Fascínio"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Promessa do Vídeo</label>
                              <input 
                                type="text"
                                value={customIdeaPromise}
                                onChange={(e) => setCustomIdeaPromise(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 font-semibold"
                                placeholder="Ex: Revelar o detalhe sádico das escadas medievais"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Gancho de Retenção (Hook)</label>
                              <input 
                                type="text"
                                value={customIdeaHook}
                                onChange={(e) => setCustomIdeaHook(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 font-semibold"
                                placeholder="Ex: Você sabia que as escadas dos castelos eram armas mortais?"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Estrutura / Temas dos Blocos (Ganchos / Roteiro)</label>
                              <textarea 
                                value={customIdeaBlocks}
                                onChange={(e) => setCustomIdeaBlocks(e.target.value)}
                                className="w-full min-h-[90px] bg-zinc-900 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl p-3.5 text-xs text-white leading-relaxed resize-y placeholder:text-zinc-600 font-medium"
                                placeholder="Ex: Bloco 1: O mistério do sentido das escadas; Bloco 2: A vantagem tática dos defensores destros; Bloco 3: O tropeço mortal..."
                              />
                            </div>
                          </div>
                        )}

                        {/* New Project Name Input */}
                        <div className="bg-zinc-950/40 border border-zinc-900/60 p-5 rounded-2xl space-y-2 mt-4 font-sans">

                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">

                            Nome do Novo Projeto (Nome da Pasta)

                          </label>

                          <input 

                            disabled={creatorLoading}

                            type="text"

                            placeholder="Ex: Historia_Persa, Timelapse_Obra, etc."

                            value={creatorProjectName}

                            onChange={(e) => setCreatorProjectName(e.target.value)}

                            className="w-full bg-white border border-zinc-300 hover:border-zinc-400 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-zinc-900 font-semibold placeholder:text-zinc-400"

                          />

                          <span className="text-[9px] text-zinc-500 block leading-normal mt-1">

                            * O assistente criará automaticamente uma pasta separada no workspace com todas as mídias e scripts dedicados para este projeto.

                          </span>

                        </div>

                        {/* Script generation trigger */}

                        <div className="flex justify-between items-center pt-4 border-t border-zinc-900 font-sans">

                          <button 

                            onClick={() => {

                              setIdeasData(null);

                              setSelectedIdeaIndex(-1);

                            }}

                            className="text-xs text-zinc-500 hover:text-white font-semibold transition cursor-pointer"

                          >

                            ← Alterar Nicho e Formato

                          </button>

                          <button 

                            disabled={creatorLoading || selectedIdeaIndex === -1}

                            onClick={handleGenerateFullScript}

                            className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10 font-sans"

                          >

                            {creatorLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}

                            <span>{creatorLoading && creatorLoadingMode === 'narration' ? 'Gerando narração...' : 'Gerar Narração'}</span>

                          </button>

                        </div>

                      </div>

                    )}
                    {showNarrationReview && (
                      <NarrationReviewPanel
                        narrativeScript={narrationDraft}
                        narrativeScriptTagged={narrationTaggedDraft}
                        strategyHook={narrationStrategy?.hook}
                        strategyTitle={narrationStrategy?.title_main}
                        loading={creatorLoading}
                        loadingMode={creatorLoadingMode === 'idle' ? 'idle' : creatorLoadingMode}
                        onNarrativeChange={(value) => {
                          setNarrationDraft(value);
                          if (narrationTaggedDraft) setNarrationTaggedDraft('');
                        }}
                        onRegenerate={handleGenerateNarration}
                        onApprove={handleApproveNarrationAndGenerateScript}
                      />
                    )}

                  </div>

                )}

                {/* STEP 2: Narration Audio Upload */}

                {creatorStep === 2 && (

                  <div className="space-y-6 max-w-xl mx-auto text-center py-10">

                    <div>

                      <h4 className="text-white font-bold text-sm tracking-wide font-cinzel">Passo 2: Upload do Áudio de Narração</h4>

                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">

                        Arraste ou selecione o arquivo de voz gravado para a narração. Ele deve corresponder ao roteiro gerado para que a IA faça o alinhamento de forma sincronizada.

                      </p>

                    </div>

                    {/* Drag and drop zone */}

                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-all duration-150 font-sans ${
                        dragActive 
                          ? 'border-gold-500 bg-gold-500/5' 
                          : (uploadSuccess || status?.has_narration)
                            ? 'border-emerald-500 bg-emerald-500/5' 
                            : 'border-zinc-800 bg-zinc-950/20 hover:border-zinc-700'
                      }`}
                    >
                      {uploadingNarration ? (
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="w-8 h-8 text-gold-500 animate-spin" />
                          <span className="text-xs text-gray-300">Enviando e salvando áudio...</span>
                        </div>
                      ) : uploadSuccess ? (
                        <div className="flex flex-col items-center gap-3">
                          <CheckCircle className="w-10 h-10 text-emerald-500" />
                          <span className="text-xs font-bold text-white">Narração Salva com Sucesso!</span>
                          <span className="text-[10px] text-gray-500">narracao_mestra_premium.mp3 atualizado no workspace.</span>
                        </div>
                      ) : status?.has_narration ? (
                        <div className="flex flex-col items-center gap-3">
                          <CheckCircle className="w-10 h-10 text-emerald-500/80 animate-pulse" />
                          <span className="text-xs font-bold text-white">Narração Existente no Workspace</span>
                          <span className="text-[10px] text-gray-400">narracao_mestra_premium.mp3 já está salvo no workspace.</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <Volume2 className="w-10 h-10 text-zinc-600 animate-pulse" />
                          <div>
                            <span className="text-xs text-gray-300 block font-bold">Arraste seu arquivo MP3 de narração aqui</span>
                            <span className="text-[10px] text-zinc-500 block mt-1">ou clique para selecionar do computador</span>
                          </div>
                        </div>
                      )}
                      
                      <input 
                        type="file" 
                        accept="audio/mp3,audio/mpeg" 
                        onChange={handleFileInput}
                        className="hidden" 
                        id="file-upload" 
                      />

                      {!uploadSuccess && (
                        <label 
                          htmlFor="file-upload" 
                          className="mt-2 bg-zinc-900 border border-zinc-800 text-gray-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer hover:bg-zinc-850 transition"
                        >
                          {status?.has_narration ? 'Substituir Narração' : 'Selecionar Arquivo'}
                        </label>
                      )}
                    </div>

<div className="flex justify-between items-center pt-4 font-sans">

                      <button 

                        onClick={() => setCreatorStep(1)}

                        className="text-xs text-zinc-500 hover:text-white font-semibold transition"

                      >

                        ← Voltar para o Roteiro

                      </button>

                      <button 

                        disabled={!uploadSuccess && !status?.has_narration}

                        onClick={() => setCreatorStep(3)}

                        className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg"

                      >

                        <span>Prosseguir para Sincronização</span>

                        <span>→</span>

                      </button>

                    </div>

                  </div>

                )}

                {/* STEP 3: Sync Whisper Timing */}

                {creatorStep === 3 && (

                  <div className="space-y-6 max-w-xl mx-auto text-center py-10">

                    <div>

                      <h4 className="text-white font-bold text-sm tracking-wide font-cinzel">Passo 3: Sincronização por Transcrição Inteligente</h4>

                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">

                        A IA vai transcrever o arquivo de áudio utilizando o modelo Whisper local e correlacionar os tempos exatos com cada bloco de texto. Isso criará o banco de dados de palavras (`word_transcripts.json`) e tempos (`block_timings.json`).

                      </p>

                    </div>

                    <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 flex flex-col items-center gap-4 font-sans">

                      <Sparkles className="w-10 h-10 text-gold-500 animate-pulse" />

                      <div className="text-xs text-gray-300 font-medium">Sincronizador Pronto</div>

                      <p className="text-[10px] text-gray-500 max-w-md">

                        Esta etapa executa scripts Python em segundo plano. Os logs detalhados serão transmitidos ao console do terminal de compilação.

                      </p>

                      <button 

                        disabled={syncingTimings}

                        onClick={() => handleSyncTimings(true)}

                        className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10"

                      >

                        {syncingTimings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}

                        <span>{syncingTimings ? 'Sincronizando áudio...' : 'Iniciar Sincronização de Voz'}</span>

                      </button>

                    </div>

                    <div className="flex justify-between items-center pt-4 font-sans">

                      <button 

                        onClick={() => setCreatorStep(2)}

                        className="text-xs text-zinc-500 hover:text-white font-semibold transition cursor-pointer"

                      >

                        ← Voltar para Narração

                      </button>

                      <button 

                        disabled={syncingTimings}

                        onClick={() => setCreatorStep(4)}

                        className="text-xs text-zinc-500 hover:text-white font-semibold transition flex items-center gap-1 cursor-pointer"

                      >

                        <span>Avançar para B-roll</span>

                        <span>→</span>

                      </button>

                    </div>

                  </div>

                )}

                {/* STEP 4: Automap assets */}

                {creatorStep === 4 && config && (
                  <div className="space-y-6 max-w-4xl mx-auto font-sans">
                    {renderRichTimelineEditor()}
                    
                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-6 border-t border-zinc-900 font-sans">
                      <button 
                        onClick={() => setCreatorStep(3)}
                        className="text-xs text-zinc-500 hover:text-white font-semibold transition cursor-pointer"
                      >
                        ← Voltar para Sincronização
                      </button>
                      <button 
                        disabled={!timelineAssets}
                        onClick={() => setCreatorStep(5)}
                        className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg"
                      >
                        <span>Avançar para Renderização</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: Final Render shortcuts */}

                {creatorStep === 5 && (

                  <div className="space-y-6 max-w-2xl mx-auto py-6 font-sans">

                    <div className="text-center font-sans">

                      <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />

                      <h4 className="text-white font-bold text-sm tracking-wide font-cinzel">Tudo Pronto! O Vídeo está configurado para Render</h4>

                      <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-lg mx-auto font-sans">

                        Roteiro, narração e sincronização prontos. Com Gemini no Chrome, overlays e metadados são consultados antes do render.

                      </p>

                    </div>

                    {(youtubeLoading || youtubeMetadataParsed?.titles?.length) && (
                      <div className={`rounded-2xl border px-4 py-3 text-left text-xs ${
                        youtubeLoading
                          ? 'border-gold-500/30 bg-gold-500/5 text-gold-200'
                          : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
                      }`}>
                        {youtubeLoading ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                            IA gerando metadados do vídeo (títulos, descrição, tags, capítulos)…
                          </span>
                        ) : (
                          <span>
                            Metadados prontos — título sugerido:{' '}
                            <strong className="text-white">
                              {youtubeMetadataParsed?.titles?.[0]?.text || 'ver passo 6'}
                            </strong>
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 pt-4 font-sans">

                      {/* Mix audio card */}

                      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between h-48 hover:border-zinc-800 transition">

                        <div>

                          <h5 className="text-xs font-bold text-white tracking-wider font-cinzel">1. MIXAR ÁUDIO</h5>

                          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Regenera a trilha sonora de fundo e crossfades baseados nas indicações da IA.</p>

                        </div>

                        <button 

                          disabled={mixing}

                          onClick={() => mixBGM(true)}

                          className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-gold-500 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer w-full"

                        >

                          <RefreshCw className={`w-3.5 h-3.5 ${mixing ? 'animate-spin' : ''}`} />

                          <span>Mixar Trilhas</span>

                        </button>

                      </div>

                      {/* Render standard card */}

                      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between h-48 hover:border-zinc-800 transition">

                        <div>

                          <h5 className="text-xs font-bold text-white tracking-wider font-cinzel">2. RENDER PADRÃO</h5>

                          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Compila o vídeo final padrão usando as mídias da linha do tempo e legendas animadas.</p>

                        </div>

                        <button 

                          disabled={rendering}

                          onClick={() => triggerRender('standard', true)}

                          className="bg-gold-500 hover:bg-gold-600 text-zinc-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-lg shadow-gold-500/10 w-full"

                        >

                          <Play className="w-3.5 h-3.5 fill-current" />

                          <span>Compilar Padrão</span>

                        </button>

                      </div>

                      {/* Render Remotion card */}
                      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between h-48 hover:border-zinc-800 transition">
                        <div>
                          <h5 className="text-xs font-bold text-white tracking-wider font-cinzel">3. RENDER REMOTION</h5>
                          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Gera o vídeo com o motor moderno do Remotion, ideal para Shorts com transições fluidas.</p>
                        </div>
                        <button 
                          disabled={rendering}
                          onClick={() => triggerRender('remotion', true)}
                          className="bg-water-500/10 border border-water-500/20 hover:bg-water-500/20 text-water-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer w-full"
                        >
                          <span>Compilar Remotion</span>
                        </button>
                      </div>

                      {/* Render Remotion PRO card */}
                      <div className="bg-zinc-950 border border-amber-500/20 rounded-2xl p-5 flex flex-col justify-between h-48 hover:border-amber-500/30 transition">
                        <div>
                          <div className="flex justify-between items-start">
                            <h5 className="text-xs font-bold text-white tracking-wider font-cinzel">4. REMOTION PRO</h5>
                            <span className="bg-amber-500/15 text-amber-500 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">PRO</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Gera a versão premium contendo infográficos animados automáticos (Lower Thirds, kinetic text e contadores).</p>
                        </div>
                        <button 
                          disabled={rendering}
                          onClick={() => triggerRender('remotion-pro', true)}
                          className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer w-full"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Compilar Remotion PRO</span>
                        </button>
                      </div>

                      {/* Render Remotion PRO + HyperFrames AI card */}
                      <div className="bg-zinc-950 border border-emerald-500/20 rounded-2xl p-5 flex flex-col justify-between h-48 hover:border-emerald-500/30 transition">
                        <div>
                          <div className="flex justify-between items-start">
                            <h5 className="text-xs font-bold text-white tracking-wider font-cinzel">5. HYPERFRAMES AI</h5>
                            <span className="bg-emerald-500/15 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">AI</span>
                          </div>
                          <p className="text-[9px] text-gray-400 mt-1 leading-normal">Orquestração dinâmica via IA do catálogo HyperFrames com suporte a transparência ProRes.</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1 text-[8px] text-zinc-400 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              id="wizard-prores-checkbox" 
                              className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer w-2.5 h-2.5" 
                            />
                            <span>Fundo Transparente (ProRes)</span>
                          </label>
                          <button 
                            disabled={rendering}
                            onClick={() => {
                              const proresCheck = document.getElementById('wizard-prores-checkbox') as HTMLInputElement;
                              triggerRender('remotion-pro', true, false, true, proresCheck?.checked);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer w-full"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Compilar HyperFrames AI</span>
                          </button>
                        </div>
                      </div>

                    </div>

                    <div className="flex justify-between pt-6 border-t border-zinc-900 font-sans">
                      <button
                        onClick={() => setCreatorStep(4)}
                        className="text-xs text-zinc-500 hover:text-white font-semibold transition cursor-pointer"
                      >
                        ← Voltar para B-roll
                      </button>
                      <button
                        onClick={() => setCreatorStep(6)}
                        className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-bold px-6 py-2.5 rounded-xl transition"
                      >
                        Avançar para Metadados →
                      </button>
                    </div>
                  </div>
                )}

                {creatorStep === 6 && (
                  <div className="space-y-6 max-w-2xl mx-auto py-6 font-sans">
                    <div>
                      <h4 className="text-white font-bold text-sm font-cinzel">Passo 6: Metadados e Thumbnails</h4>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Gerados automaticamente ao renderizar no passo 5 — ou regenere com IA abaixo.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Informações do vídeo (IA)
                        </span>
                        <button
                          type="button"
                          disabled={youtubeLoading}
                          onClick={() => void generateYoutubeMetadata()}
                          className="text-[10px] font-bold text-gold-400 border border-gold-500/30 hover:border-gold-500/50 px-3 py-1.5 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {youtubeLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {youtubeLoading ? 'Gerando…' : 'Regenerar com IA'}
                        </button>
                      </div>

                      {youtubeMetadataParsed?.titles?.length ? (
                        <ul className="space-y-1.5 text-xs text-zinc-300">
                          {youtubeMetadataParsed.titles.slice(0, 5).map((t, i) => (
                            <li key={`wiz-title-${i}`} className="flex gap-2">
                              <span className="text-gold-500 font-bold shrink-0">{i + 1}.</span>
                              <span>{t.text}</span>
                            </li>
                          ))}
                        </ul>
                      ) : youtubeMetadata && !youtubeMetadata.startsWith('[Erro]') ? (
                        <p className="text-[10px] text-zinc-400 whitespace-pre-wrap max-h-32 overflow-y-auto">{youtubeMetadata.slice(0, 600)}…</p>
                      ) : (
                        <p className="text-[10px] text-zinc-500 italic">
                          Nenhum metadado ainda — renderize no passo 5 ou clique em Regenerar com IA.
                        </p>
                      )}

                      {youtubeMetadataParsed?.description && (
                        <p className="text-[10px] text-zinc-500 line-clamp-3 border-t border-zinc-800 pt-2">
                          {youtubeMetadataParsed.description}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={() => leaveGlobalViewForProject('ai')} className="bg-gold-500/10 border border-gold-500/30 text-gold-400 py-3 rounded-xl text-xs font-bold">Abrir Metadados</button>
                      <button onClick={handleGenerateYoutubeThumbnailImages} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-3 rounded-xl text-xs font-bold">Gerar Thumbnails</button>
                      <button
                        onClick={applyMetadataToUpload}
                        disabled={!youtubeMetadataParsed}
                        className="sm:col-span-2 bg-violet-500/10 border border-violet-500/30 text-violet-300 py-3 rounded-xl text-xs font-bold disabled:opacity-40"
                      >
                        Aplicar ao Upload
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <button onClick={() => setCreatorStep(5)} className="text-xs text-zinc-500">← Render</button>
                      <button onClick={() => setCreatorStep(7)} className="bg-gold-500 text-zinc-950 text-xs font-bold px-5 py-2 rounded-xl">Publicar →</button>
                    </div>
                  </div>
                )}

                {creatorStep === 7 && (
                  <div className="space-y-6 max-w-2xl mx-auto py-6 font-sans">
                    <h4 className="text-white font-bold text-sm font-cinzel">Passo 7: Publicar</h4>
                    <button onClick={() => leaveGlobalViewForProject('upload')} className="w-full bg-gold-500 text-zinc-950 font-bold py-3 rounded-xl text-xs">Abrir Upload</button>
                    <button onClick={() => setCreatorStep(6)} className="text-xs text-zinc-500">← Metadados</button>
                  </div>
                )}

              {/* Optional: Script Master Strategy Details Panel */}

              {generatedScriptData && (

                <div className="glass-panel p-6 rounded-3xl mt-8 space-y-6 font-sans">

                  {(() => {
                    const longTitles = warnLongListicleTitles(
                      (generatedScriptData.list_items || []).map((it: { title?: string; name?: string }) => String(it.title || it.name || '')),
                    );
                    if (!longTitles.length) return null;
                    return (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-4">
                        <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wide">
                          Títulos longos para o HUD
                        </p>
                        <ul className="mt-2 space-y-1">
                          {longTitles.map((entry) => (
                            <li key={`long-title-${entry.index}`} className="text-[10px] text-amber-200/90 leading-relaxed">
                              Item {entry.index + 1}: {entry.title.length} caracteres — encurte antes do render
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                  <h3 className="font-cinzel text-sm font-bold text-white tracking-wide border-b border-zinc-900 pb-2">

                    ESTRATÉGIA DO ROTEIRO (SCRIPT MASTER OUTPUT)

                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-300">

                    <div className="space-y-4">

                      <div>

                        <span className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">Título Principal</span>
                        <p className="text-white font-bold text-sm mt-1">{generatedScriptData.strategy?.title_main || ''}</p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Ancorado no roteiro — específico, sem clickbait genérico</p>

                      </div>

                      <div>

                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Variações de Título</span>

                        <ul className="list-disc pl-4 space-y-1 mt-1">

                          {(generatedScriptData.strategy?.title_variations || []).map((v: string, i: number) => <li key={i}>{v}</li>)}

                        </ul>

                      </div>

                      <div>

                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Gancho de Retenção (Hook)</span>

                        <p className="italic text-gray-300 mt-1">"{generatedScriptData.strategy?.hook || ''}"</p>

                      </div>

                    </div>

                    <div className="space-y-4">

                      <div>

                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Checklist de Qualidade</span>

                        <div className="grid grid-cols-3 gap-2 mt-1.5 text-center font-mono">

                          <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-900">

                            <span className="text-[8px] text-zinc-500 block">CLIQUE</span>

                            <span className="text-gold-500 font-bold text-xs">{generatedScriptData.checklist?.click_potential || 0}/10</span>

                          </div>

                          <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-900">

                            <span className="text-[8px] text-zinc-500 block">RETENÇÃO</span>

                            <span className="text-gold-500 font-bold text-xs">{generatedScriptData.checklist?.retention_potential || 0}/10</span>

                          </div>

                          <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-900">

                            <span className="text-[8px] text-zinc-500 block">COMENTÁRIOS</span>

                            <span className="text-gold-500 font-bold text-xs">{generatedScriptData.checklist?.comments_potential || 0}/10</span>

                          </div>

                        </div>

                      </div>

                      <div>

                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Recomendações IA</span>

                        <p className="mt-1 leading-relaxed text-gray-400">{generatedScriptData.checklist?.feedback || ''}</p>

                      </div>

                    </div>

                  </div>

                  {generatedScriptData.visual_prompts && (generatedScriptData?.visual_prompts || []).length > 0 && (

                    <div className="border-t border-zinc-900 pt-6 space-y-5">

                      <div className="flex justify-between items-center">

                        <div>

                          <h4 className="text-sm text-white font-bold tracking-wide font-cinzel">ROTEIRO COMPLETO POR BLOCOS</h4>

                          <p className="text-[10px] text-zinc-400 mt-1 font-sans">Cada cena possui narração, duração e prompt visual editáveis. O roteiro é salvo automaticamente.</p>

                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {creatorScenesNeedRepair && (
                            <button
                              type="button"
                              disabled={creatorLoading}
                              onClick={handleRepairCreatorVisualPrompts}
                              className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 disabled:opacity-50 text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer"
                            >
                              {creatorLoading && creatorLoadingMode === 'full' ? 'Reparando...' : 'Distribuir narração nas cenas'}
                            </button>
                          )}
                          <span className="bg-gold-500/10 border border-gold-500/20 text-gold-500 text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider font-mono">
                            {(generatedScriptData?.visual_prompts || []).length} cenas
                          </span>
                        </div>

                      </div>

                      <div className="space-y-4 font-sans">

                        {(() => {

                          const promptsByBlock: Record<number, any[]> = {};

                          (generatedScriptData?.visual_prompts || []).forEach((vp: any) => {

                            const b = vp.block || 1;

                            if (!promptsByBlock[b]) promptsByBlock[b] = [];

                            promptsByBlock[b].push(vp);

                          });

                          const sortedBlocks = Object.keys(promptsByBlock).map(Number).sort((a, b) => a - b);

                          return sortedBlocks.map((blockNum) => {

                            const blockPrompts = promptsByBlock[blockNum];

                            const blockTiming = getBlockTimingSummary(generatedScriptData?.visual_prompts || [], blockNum);

                            const blockKey = String(blockNum);

                            const isExpanded = !!expandedBlocks[blockNum];

                            return (

                              <div key={blockNum} className="glass-panel rounded-2xl border border-zinc-900/60 overflow-hidden transition-all duration-300">

                                <div 

                                  onClick={() => setExpandedBlocks(prev => ({ ...prev, [blockNum]: !prev[blockNum] }))}

                                  className="flex justify-between items-center p-4 bg-zinc-950/40 hover:bg-zinc-900/20 cursor-pointer transition select-none border-b border-zinc-900/40"

                                >

                                  <div className="flex items-center gap-3">

                                    <span className="bg-gold-500 text-zinc-950 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-md">

                                      BLOCO {String(blockNum).padStart(2, '0')}

                                    </span>

                                    <div className="flex items-center gap-2 text-[10px] text-zinc-400">

                                      <span className="font-semibold">{blockPrompts.length} cenas</span>

                                      <span>•</span>

                                      <span className="text-gold-400">{blockTiming.sceneSeconds}s (+{blockTiming.gapSeconds}s gap)</span>

                                      <span>=</span>

                                      <span className="text-emerald-400 font-bold">{blockTiming.totalSeconds}s total</span>

                                    </div>

                                  </div>

                                  <span className="text-zinc-500 text-xs font-mono transition-transform duration-300">

                                    {isExpanded ? '▲ Recolher' : '▼ Expandir'}

                                  </span>

                                </div>

                                {isExpanded && (

                                  <div className="p-4 space-y-5 bg-zinc-950/20 divide-y divide-zinc-900/60">

                                    {blockPrompts.map((vp: any, localIdx: number) => {

                                      const absoluteIndex = (generatedScriptData?.visual_prompts || []).indexOf(vp);

                                      const sceneNum = vp?.scene || (absoluteIndex + 1);

                                      const isVideo = vp?.type?.toLowerCase()?.includes("vídeo") || vp?.type?.toLowerCase()?.includes("video") || false;

                                      const searchQuery = vp?.stock_query || 'cinematic';

                                      const sceneDurationSeconds = getSceneDurationSeconds(vp);

                                      const durationWasEstimated = parseDurationSeconds(vp?.duration ?? vp?.duracaoSegundos ?? vp?.duration_seconds) === null;

                                      const assetIdx = localIdx;

                                      const isUploaded = uploadedScenes[`${blockKey}:${assetIdx}`] || (

                                        config && 

                                        config.timeline_assets && 

                                        config.timeline_assets[blockKey] && 

                                        config.timeline_assets[blockKey][assetIdx] &&

                                        config.timeline_assets[blockKey][assetIdx].asset

                                      ) || vp.asset?.asset;

                                      const currentAsset = vp.asset || config?.timeline_assets?.[blockKey]?.[assetIdx];

                                                                            const assetUsedIn = currentAsset?.asset

                                        ? (generatedScriptData?.visual_prompts || []).reduce((usedIn: string[], item: any, itemIndex: number) => {

                                            const itemBlock = item?.block || 1;

                                            const itemBlockKey = String(itemBlock);

                                            let itemAssetIdx = 0;

                                            for (let prevIdx = 0; prevIdx < itemIndex; prevIdx++) {

                                              if (((generatedScriptData?.visual_prompts || [])[prevIdx]?.block || 1) === itemBlock) {

                                                itemAssetIdx++;

                                              }

                                            }

                                            const itemAsset = item.asset || config?.timeline_assets?.[itemBlockKey]?.[itemAssetIdx];

                                            if (itemAsset?.asset === currentAsset.asset) {

                                              usedIn.push(String(item?.scene || itemIndex + 1));

                                            }

                                            return usedIn;

                                          }, [])

                                        : [];

                                      return (

                                        <div key={absoluteIndex} className={`pt-4 first:pt-0 flex flex-col lg:flex-row gap-4 ${localIdx > 0 ? 'mt-4' : ''}`}>

                                          <div className="flex-1 space-y-3">

                                            <div className="flex items-center justify-between">

                                              <div className="flex items-center gap-2">

                                                <span className={`font-mono text-xs font-bold ${isUploaded ? 'text-green-400' : 'text-zinc-500'}`}>

                                                  Cena {sceneNum}

                                                </span>

                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${

                                                  isVideo ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'bg-gold-500/10 border border-gold-500/20 text-gold-500'

                                                }`}>

                                                  {vp?.type || "imagem IA 2k"}

                                                </span>

                                              </div>

                                              <div className="flex items-center gap-1.5">

                                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${

                                                  durationWasEstimated ? 'text-zinc-400 border-zinc-850 bg-zinc-900/60' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'

                                                }`}>

                                                  {durationWasEstimated ? 'Estimada' : 'Manual'}

                                                </span>

                                                <div className="flex items-center bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-0.5">

                                                  <input 

                                                    type="number" 

                                                    step="0.1" 

                                                    min="0.5"

                                                    value={sceneDurationSeconds}

                                                    onChange={(e) => handleUpdateCreatorScene(absoluteIndex, 'duration', parseFloat(e.target.value) || 0)}

                                                    className="bg-transparent text-white text-xs font-mono w-12 text-right focus:outline-none"

                                                  />

                                                  <span className="text-[10px] text-zinc-500 ml-1 font-mono">s</span>

                                                </div>

                                              </div>

                                            </div>

                                            <div className="space-y-1">

                                              <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">NARRACAO DA CENA</label>

                                              <textarea

                                                rows={2}

                                                value={vp?.narration_text || vp?.narration_excerpt || ''}

                                                onChange={(e) => handleUpdateCreatorScene(absoluteIndex, 'narration_text', e.target.value)}

                                                className="bg-zinc-950/80 border border-zinc-850 rounded-xl text-xs text-white p-2.5 w-full focus:border-gold-500/50 focus:outline-none transition leading-relaxed font-sans"

                                                placeholder="Digite a narração da cena..."

                                              />

                                            </div>

                                          </div>

                                          <div className="w-full lg:w-[420px] shrink-0 space-y-3">

                                            <div className="space-y-1">

                                              <div className="flex justify-between items-center">

                                                <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">PROMPT VISUAL IA</label>

                                                <button 

                                                  onClick={() => copyToClipboard(vp?.prompt || '', `prompt-${absoluteIndex}`)}

                                                  className="text-[9px] text-zinc-400 hover:text-white flex items-center gap-1 transition"

                                                >

                                                  {copiedSection === `prompt-${absoluteIndex}` ? <span className="text-emerald-500 font-bold">OK</span> : <span>Copiar</span>}

                                                </button>

                                              </div>

                                              <textarea

                                                rows={2}

                                                value={vp?.prompt || ''}

                                                onChange={(e) => handleUpdateCreatorScene(absoluteIndex, 'prompt', e.target.value)}

                                                className="bg-zinc-950/80 border border-zinc-850 rounded-xl text-[11px] text-zinc-300 italic p-2.5 w-full focus:border-gold-500/50 focus:outline-none transition leading-normal font-sans"

                                                placeholder="Descreva o prompt visual..."

                                              />

                                            </div>

                                            {currentAsset?.asset && (

                                              <div className="flex items-center gap-3 rounded-xl border border-zinc-850 bg-zinc-950/80 p-2.5">

                                                <div className="w-20 h-14 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-850 shrink-0 flex items-center justify-center">

                                                  {currentAsset.type === 'video' ? (

                                                    <video

                                                      src={getAssetUrl(currentAsset.asset)}

                                                      className="w-full h-full object-cover"

                                                      muted

                                                      playsInline

                                                      preload="metadata"

                                                    />

                                                  ) : (

                                                    <img

                                                      src={getAssetUrl(currentAsset.asset)}

                                                      className="w-full h-full object-cover"

                                                      alt=""

                                                      loading="lazy"

                                                    />

                                                  )}

                                                </div>

                                                <div className="min-w-0 flex-1 space-y-1">

                                                  <div className="flex items-center gap-1.5 min-w-0">

                                                    <span className="text-[10px] text-white font-semibold truncate" title={currentAsset.asset}>{currentAsset.asset}</span>

                                                  </div>

                                                  <div className="flex items-center gap-2 flex-wrap">

                                                    <span className="text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">

                                                      Cenas: {assetUsedIn.join(', ') || sceneNum}

                                                    </span>

                                                    <button

                                                      type="button"

                                                      onClick={() => handleRemoveSceneAsset(blockKey, assetIdx)}

                                                      className="text-[9px] text-red-400 hover:text-red-300 font-bold transition"

                                                    >

                                                      Excluir

                                                    </button>

                                                  </div>

                                                </div>

                                              </div>

                                            )}

                                            <div className="flex items-center gap-1.5 pt-1">

                                              <a href={`https://www.pexels.com/search/${isVideo ? "videos/" : ""}${encodeURIComponent(searchQuery)}`} target="_blank" rel="noopener noreferrer"

                                                className="bg-zinc-900 border border-zinc-850 text-[9px] text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer">

                                                <span>Pexels</span>

                                              </a>

                                              <a href={isVideo ? `https://pixabay.com/videos/search/${encodeURIComponent(searchQuery)}/` : `https://pixabay.com/images/search/${encodeURIComponent(searchQuery)}/`} target="_blank" rel="noopener noreferrer"

                                                className="bg-zinc-900 border border-zinc-850 text-[9px] text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer">

                                                <span>Pixabay</span>

                                              </a>

                                              <a href={`https://www.canva.com/search?q=${encodeURIComponent(searchQuery)}`} target="_blank" rel="noopener noreferrer"

                                                className="bg-zinc-900 border border-zinc-850 text-[9px] text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer">

                                                <span>Canva</span>

                                              </a>

                                              <input 

                                                type="file" 

                                                accept={isVideo ? "video/mp4" : "image/png,image/jpeg,image/jpg"}

                                                onChange={(e) => { if (e.target.files && e.target.files[0]) { handleUploadSceneAsset(blockNum, isVideo ? "video" : "image", e.target.files[0], assetIdx); }}}

                                                className="hidden" 

                                                id={`scene-upload-${absoluteIndex}`}

                                              />

                                              <label 

                                                htmlFor={`scene-upload-${absoluteIndex}`}

                                                className={`border px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer ml-auto ${

                                                  isUploaded ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:text-green-300' : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'

                                                }`}

                                              >

                                                <span>{currentAsset?.asset ? 'Trocar' : isUploaded ? 'Enviado' : 'Upload'}</span>

                                              </label>

                                            </div>

                                          </div>

                                        </div>

                                      );

                                    })}

                                  </div>

                                )}

                              </div>

                            );

                          });

                        })()}

                      </div>

                    </div>

                  )}

            <div className="border-t border-zinc-900 pt-4 space-y-4">

                    <div className="flex justify-between items-center">

                      <span className="text-[10px] text-gold-500 font-bold uppercase tracking-wider font-cinzel">ROTEIRO COMPLETO (NARRAÇÃO LIMPA)</span>

                      <button 

                        onClick={() => copyToClipboard(generatedScriptData.narrative_script || '', 'narrative_script')}

                        className="bg-zinc-900 border border-zinc-800 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"

                      >

                        {copiedSection === 'narrative_script' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}

                        <span>{copiedSection === 'narrative_script' ? 'Copiado!' : 'Copiar Narração Limpa'}</span>

                      </button>

                    </div>

                    <pre className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl text-[10px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap select-text leading-relaxed">

                      {generatedScriptData.narrative_script || ''}

                    </pre>

                  </div>

                  {(generatedScriptData.narrative_script || '').trim() && (

                    <div className="border-t border-zinc-900 pt-4 space-y-4">

                      <div className="flex items-center justify-between gap-4">

                        <div>

                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider font-cinzel flex items-center gap-2">

                            NARRACAO COM TAGS PARA TTS

                          </span>

                          <p className="text-[10px] text-zinc-500 mt-1">Tags por frase com pausas em viradas, numeros e gancho — usa a narracao taggeada do roteiro quando disponivel.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const cleanNarration = generatedScriptData?.narrative_script || '';
                            const taggedScript = generatedScriptData?.narrative_script_tagged || '';
                            if (!cleanNarration && !taggedScript) {
                              toast('Gere o roteiro primeiro.');
                              return;
                            }
                            setTaggedNarrations({
                              fish: buildTaggedNarration(cleanNarration, 'fish', { taggedScript }),
                              eleven: buildTaggedNarration(cleanNarration, 'eleven', { taggedScript }),
                              minimax: buildTaggedNarration(cleanNarration, 'minimax', { taggedScript }),
                            });
                            toast('Tags TTS regeneradas.');
                          }}
                          className="text-[9px] font-bold text-purple-300 border border-purple-500/30 hover:border-purple-500/50 px-2.5 py-1.5 rounded-lg transition cursor-pointer shrink-0"
                        >
                          Regenerar tags
                        </button>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">

                        {(['fish', 'eleven', 'minimax'] as TaggedNarrationPlatform[]).map((platform) => {

                          const meta = taggedNarrationMeta[platform];

                          return (

                            <div key={platform} className={`rounded-xl border p-3 space-y-3 ${meta.borderClass}`}>

                              <div className="flex items-start justify-between gap-3">

                                <div className="min-w-0">

                                  <h5 className={`text-[10px] font-bold uppercase tracking-wider font-cinzel ${meta.accentClass}`}>{meta.title}</h5>

                                  <span className="text-[9px] text-zinc-500">{meta.subtitle}</span>

                                </div>

                                <button

                                  onClick={() => copyToClipboard(taggedNarrations[platform], `tagged-${platform}`)}

                                  className="bg-zinc-950 border border-zinc-800 text-gray-400 hover:text-white px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 transition cursor-pointer shrink-0"

                                >

                                  {copiedSection === `tagged-${platform}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}

                                  <span>{copiedSection === `tagged-${platform}` ? 'Copiado!' : 'Copiar'}</span>

                                </button>

                              </div>

                              <textarea

                                value={taggedNarrations[platform]}

                                onChange={(e) => setTaggedNarrations(prev => ({ ...prev, [platform]: e.target.value }))}

                                className="w-full min-h-[220px] bg-zinc-950/80 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-lg p-3 text-[10px] font-mono text-gray-300 leading-relaxed resize-y"

                              />

                            </div>

                          );

                        })}

                      </div>

                    </div>

                  )}

                </div>

              )}

              </div>

            </div>

          )}

          </div>
        </main>

      </div>

      {/* Global Floating Chat Button */}

      {!chatOpen && (

        <button

          onClick={() => setChatOpen(true)}

          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gold-500 hover:bg-gold-600 text-zinc-950 rounded-full flex items-center justify-center shadow-2xl shadow-gold-500/30 transition-all duration-200 hover:scale-110 cursor-pointer"

          title="Abrir Assistente IA"

        >

          <Bot className="w-6 h-6" />

        </button>

      )}

      {/* Global Sliding Chat Panel */}

      {chatOpen && (

        <div className="fixed bottom-0 right-0 z-40 w-[420px] max-w-[95vw] h-[85vh] max-h-[700px] bg-[#0a0a0c] border-l border-t border-zinc-800 rounded-tl-3xl shadow-2xl flex flex-col animate-fade-in font-sans">

          {/* Chat Header */}

          <div className="flex justify-between items-center p-4 border-b border-zinc-900 shrink-0">

            <div className="flex items-center gap-2">

              <div className="w-8 h-8 bg-gold-500/10 rounded-lg flex items-center justify-center">

                <Bot className="w-4 h-4 text-gold-500" />

              </div>

              <div>

                <h4 className="text-xs font-bold text-white font-cinzel tracking-wide">LUMIERA AGENT</h4>

                <p className="text-[9px] text-zinc-500">Autonomia total sobre o projeto</p>

              </div>

            </div>

            <div className="flex items-center gap-2">

                <div className="flex items-center gap-1">

                  <span className={`text-[9px] flex items-center gap-1 ${hasApiKey ? 'text-emerald-500' : 'text-amber-500'}`}>

                    {hasApiKey ? <CheckCircle className="w-3 h-3" /> : <Lock className="w-3 h-3" />}

                    {hasApiKey ? (aiProvider === 'openrouter' ? 'OpenRouter' : aiProvider === 'xai' ? 'xAI' : 'Gemini') : 'API'}

                  </span>

                  <button

                    onClick={() => {

                      setChatOpen(false);

                      setActiveTab('settings');

                    }}

                    className="text-zinc-500 hover:text-gold-500 p-1 rounded hover:bg-zinc-900 transition cursor-pointer"

                    title="Trocar chave API"

                  >

                    <Settings className="w-3.5 h-3.5" />

                  </button>

                </div>

              <button onClick={() => setChatOpen(false)} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-900 transition cursor-pointer">

                <X className="w-4 h-4" />

              </button>

            </div>

          </div>

          {/* Messages */}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">

            {chatMessages.map((msg, i) => (

              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                <div className={`text-[8px] font-bold uppercase tracking-wider mb-0.5 ${msg.role === 'user' ? 'text-gold-500' : 'text-zinc-500'}`}>

                  {msg.role === 'user' ? 'Você' : 'Lumiera Agent'}

                </div>

                <div className={`max-w-[90%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${

                  msg.role === 'user'

                    ? 'bg-gold-500/10 border border-gold-500/20 text-gold-200'

                    : 'bg-zinc-900/80 border border-zinc-800 text-gray-300'

                }`}>

                  <div className="whitespace-pre-wrap">{msg.content}</div>

                </div>

              </div>

            ))}

            {chatLoading && (

              <div className="flex items-start">

                <div className="bg-zinc-900/80 border border-zinc-800 text-gray-400 rounded-xl px-3 py-2 text-[11px] flex items-center gap-2">

                  <RefreshCw className="w-3 h-3 animate-spin text-gold-500" />

                  <span>Processando...</span>

                </div>

              </div>

            )}

            <div ref={chatEndRef} />

          </div>

          {/* Quick Actions */}

          <div className="flex flex-wrap gap-1 px-4 pb-2 shrink-0">

            <button disabled={chatLoading || !hasApiKey} onClick={() => handleSendChatMessage("Mostre o status atual do projeto.")}

              className="border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white px-2 py-1 rounded text-[9px] font-semibold transition cursor-pointer">

              📊 Status

            </button>

            <button disabled={chatLoading || !hasApiKey} onClick={() => handleSendChatMessage("Sugira palavras-chave para destacar baseadas no roteiro.")}

              className="border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white px-2 py-1 rounded text-[9px] font-semibold transition cursor-pointer">

              💡 Keywords

            </button>

            <button disabled={chatLoading || !hasApiKey} onClick={() => handleSendChatMessage("Melhore os textos de impacto do vídeo.")}

              className="border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white px-2 py-1 rounded text-[9px] font-semibold transition cursor-pointer">

              🔥 Impactos

            </button>

            <button disabled={chatLoading || !hasApiKey} onClick={() => handleSendChatMessage("Analise e otimize o mapeamento de trilhas sonoras.")}

              className="border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white px-2 py-1 rounded text-[9px] font-semibold transition cursor-pointer">

              🎵 BGM

            </button>

          </div>

          {/* Input */}

          <div className="flex gap-2 p-3 border-t border-zinc-900 shrink-0">

            <input

              disabled={chatLoading || !hasApiKey}

              type="text"

              placeholder={hasApiKey ? "Peça qualquer coisa ao agente..." : "Configure um provedor em Configurações primeiro..."}

              value={chatInput}

              onChange={(e) => setChatInput(e.target.value)}

              onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}

              className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-white disabled:opacity-50"

            />

            <button

              disabled={chatLoading || !chatInput.trim() || !hasApiKey}

              onClick={() => handleSendChatMessage()}

              className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 p-2 rounded-lg transition cursor-pointer shadow-lg shadow-gold-500/10"

            >

              <Send className="w-4 h-4" />

            </button>

          </div>

        </div>

      )}

      {/* Create Project Modal */}

      {showCreateModal && (

        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in font-sans">

          <div className="bg-[#0c0c0e] border border-zinc-850 rounded-3xl p-6 w-96 max-w-[90%] space-y-4 shadow-2xl">

            <h3 className="font-cinzel font-bold text-white text-sm tracking-wide">Criar Novo Projeto</h3>

            <p className="text-xs text-gray-400 leading-relaxed font-sans">

              Digite o nome do projeto. Será criada uma pasta correspondente no workspace e inicializados todos os arquivos template necessários.

            </p>

            <div className="space-y-2">

              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block px-1">Nome do Projeto</label>

              <input

                type="text"

                placeholder="Ex: Notre_Dame, Concreto_Romano, etc."

                value={newProjectName}

                onChange={(e) => setNewProjectName(e.target.value)}

                className="w-full bg-zinc-950 border border-zinc-855 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white font-sans"

                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}

                autoFocus

              />

            </div>

            <div className="space-y-2 pt-2">

              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block px-1">Formato / Aspect Ratio</label>

              <div className="grid grid-cols-2 gap-2 font-sans text-xs">

                <button

                  type="button"

                  onClick={() => setNewProjectFormat('LONGO')}

                  className={`py-2 rounded-xl border text-center transition cursor-pointer font-semibold ${

                    newProjectFormat === 'LONGO'

                      ? 'bg-gold-500/10 border-gold-500 text-gold-500'

                      : 'bg-zinc-950 border-zinc-850 text-gray-400 hover:text-white'

                  }`}

                >

                  Longo (16:9)

                </button>

                <button

                  type="button"

                  onClick={() => setNewProjectFormat('SHORTS')}

                  className={`py-2 rounded-xl border text-center transition cursor-pointer font-semibold ${

                    newProjectFormat === 'SHORTS'

                      ? 'bg-gold-500/10 border-gold-500 text-gold-500'

                      : 'bg-zinc-950 border-zinc-850 text-gray-400 hover:text-white'

                  }`}

                >

                  Shorts (9:16)

                </button>

              </div>

            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block px-1">Nicho do Projeto</label>
              <input
                type="text"
                placeholder="Ex: História, Tecnologia, Geografia, Finanças"
                value={newProjectNiche}
                onChange={(e) => setNewProjectNiche(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-855 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white font-sans"
              />
            </div>

            <div className="flex justify-end gap-3 text-xs font-semibold pt-2 font-sans">

              <button

                onClick={() => {

                  setShowCreateModal(false);

                  setNewProjectName('');

                }}

                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-gray-400 hover:text-white rounded-xl transition cursor-pointer"

              >

                Cancelar

              </button>

              <button

                onClick={handleCreateProject}

                disabled={!newProjectName.trim()}

                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 rounded-xl transition shadow-lg shadow-gold-500/10 cursor-pointer"

              >

                Criar Projeto

              </button>

            </div>

          </div>

        </div>

      )}

      {/* Music Delete Confirmation Modal */}

      {pendingMusicDelete && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in font-sans">

          <div className="bg-[#0c0c0e] border border-red-900/40 rounded-3xl p-6 w-[440px] max-w-[92%] space-y-5 shadow-2xl shadow-red-950/30">

            <div className="flex items-start gap-4">

              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">

                <Trash2 className="w-5 h-5 text-red-400" />

              </div>

              <div className="min-w-0">

                <h3 className="font-cinzel font-bold text-white text-sm tracking-wide">

                  {pendingMusicDelete.name === "__all__" ? "Limpar trilhas sonoras?" : "Excluir trilha sonora?"}

                </h3>

                <p className="text-xs text-gray-400 leading-relaxed mt-2">

                  {pendingMusicDelete.name === "__all__"

                    ? "Todas as trilhas e efeitos listados serão removidos deste projeto. A narração será preservada."

                    : "O arquivo será removido deste projeto e também sairá do mapeamento de BGM/SFX. Esta ação não pode ser desfeita."}

                </p>

              </div>

            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-3 flex items-center gap-3">

              <Music className="w-4 h-4 text-gold-500 shrink-0" />

              <div className="min-w-0">

                <p className="text-xs text-white font-semibold truncate">

                  {pendingMusicDelete.name === "__all__" ? `${musicFiles.length} arquivos de áudio` : pendingMusicDelete.name}

                </p>

                <p className="text-[10px] text-zinc-500 font-mono">{getFormatBytes(pendingMusicDelete.sizeBytes)}</p>

              </div>

            </div>

            <div className="flex justify-end gap-3 text-xs font-semibold pt-1">

              <button

                onClick={() => setPendingMusicDelete(null)}

                disabled={deletingMusic}

                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-gray-400 hover:text-white rounded-xl transition cursor-pointer disabled:opacity-50"

              >

                Cancelar

              </button>

              <button

                onClick={handleConfirmDeleteMusic}

                disabled={deletingMusic}

                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl transition shadow-lg shadow-red-950/30 cursor-pointer flex items-center gap-2"

              >

                {deletingMusic ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}

                <span>{deletingMusic ? 'Excluindo...' : pendingMusicDelete.name === "__all__" ? 'Limpar trilhas' : 'Excluir trilha'}</span>

              </button>

            </div>

          </div>

        </div>

      )}

      {/* Output Delete Confirmation Modal */}

      {pendingOutputDelete && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in font-sans">

          <div className="bg-[#0c0c0e] border border-red-900/40 rounded-3xl p-6 w-[440px] max-w-[92%] space-y-5 shadow-2xl shadow-red-950/30">

            <div className="flex items-start gap-4">

              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">

                <Trash2 className="w-5 h-5 text-red-400" />

              </div>

              <div className="min-w-0">

                <h3 className="font-cinzel font-bold text-white text-sm tracking-wide">Excluir vídeo renderizado?</h3>

                <p className="text-xs text-gray-400 leading-relaxed mt-2">

                  O arquivo será removido da pasta OUTPUT. Esta ação não pode ser desfeita.

                </p>

              </div>

            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-3 flex items-center gap-3">

              <Video className="w-4 h-4 text-gold-500 shrink-0" />

              <div className="min-w-0">

                <p className="text-xs text-white font-semibold truncate">{pendingOutputDelete.name}</p>

                <p className="text-[10px] text-zinc-500 font-mono">{getFormatBytes(pendingOutputDelete.sizeBytes)}</p>

              </div>

            </div>

            <div className="flex justify-end gap-3 text-xs font-semibold pt-1">

              <button

                onClick={() => setPendingOutputDelete(null)}

                disabled={deletingOutput}

                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-gray-400 hover:text-white rounded-xl transition cursor-pointer disabled:opacity-50"

              >

                Cancelar

              </button>

              <button

                onClick={handleDeleteOutputVideo}

                disabled={deletingOutput}

                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl transition shadow-lg shadow-red-950/30 cursor-pointer flex items-center gap-2"

              >

                {deletingOutput ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}

                <span>{deletingOutput ? 'Excluindo...' : 'Excluir vídeo'}</span>

              </button>

            </div>

          </div>

        </div>

      )}

      {/* Video Preview Modal */}

      {previewVideoUrl && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in font-sans">

          <div className="bg-[#0c0c0e] border border-zinc-850 rounded-3xl p-6 w-[720px] max-w-[95%] space-y-4 shadow-2xl relative animate-fade-in">

            <div className="flex justify-between items-center pb-2 border-b border-zinc-850">

              <h3 className="font-cinzel font-bold text-white text-xs tracking-wider">PREVIEW DE VÍDEO COMPILADO</h3>

              <button

                onClick={() => setPreviewVideoUrl(null)}

                className="text-zinc-500 hover:text-white transition cursor-pointer text-xs font-semibold px-2 py-1 rounded hover:bg-zinc-900 border border-zinc-800"

              >

                Fechar

              </button>

            </div>

            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-900 flex items-center justify-center shadow-inner">

              <video 

                src={previewVideoUrl} 

                controls 

                autoPlay 

                className="w-full h-full object-contain"

              />

            </div>

            <div className="text-[10px] text-zinc-500 text-center font-sans">

              Reproduzindo a partir do workspace local via proxy. Caso o player não carregue, certifique-se de que o vídeo foi totalmente renderizado.

            </div>

          </div>

        </div>

      )}

      {/* WIDGET COMPACTO DE PROGRESSO DA RENDERIZAÇÃO */}

      {renderProgress && (

        <div className="fixed bottom-6 right-6 z-[100] w-[340px] font-sans" style={{ animation: 'slideInRight 0.4s ease-out' }}>

          <div className="bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

            {/* Header */}

            <div className="flex items-center justify-between px-4 pt-3 pb-1">

              <div className="flex items-center gap-2.5">

                <div className="relative">

                  {renderProgress.percent >= 100 ? (

                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">

                      <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />

                    </div>

                  ) : (

                    <div className="w-8 h-8 bg-gold-500/15 rounded-full flex items-center justify-center">

                      <svg className="w-4 h-4 text-gold-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />

                      </svg>

                    </div>

                  )}

                </div>

                <div>

                  <span className="text-[11px] font-bold text-white tracking-wide block leading-tight">

                    {renderProgress.percent >= 100 ? 'Renderização Concluída' : 'Renderizando Vídeo'}

                  </span>

                  <span className="text-[9px] text-zinc-500 leading-tight block mt-0.5">{renderProgress.phase}</span>

                </div>

              </div>

              <button

                onClick={() => setRenderProgress(null)}

                className="text-zinc-600 hover:text-zinc-400 transition cursor-pointer p-1"

              >

                <X className="w-3.5 h-3.5" />

              </button>

            </div>

            {/* Progress bar */}

            <div className="px-4 pb-3 pt-1.5">

              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">

                <div

                  className={`h-full rounded-full transition-all duration-500 ease-out ${

                    renderProgress.percent >= 100

                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'

                      : 'bg-gradient-to-r from-gold-600 via-gold-400 to-yellow-300'

                  }`}

                  style={{ width: `${Math.min(renderProgress.percent, 100)}%` }}

                />

              </div>

              <div className="flex justify-between mt-1.5">

                <span className="text-[9px] text-zinc-600 font-mono">PROCESSANDO</span>

                <span className={`text-[11px] font-mono font-bold ${

                  renderProgress.percent >= 100 ? 'text-emerald-400' : 'text-gold-400'

                }`}>{renderProgress.percent}%</span>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

