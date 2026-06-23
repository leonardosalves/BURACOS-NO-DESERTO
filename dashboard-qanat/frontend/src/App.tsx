import toast, { Toaster } from 'react-hot-toast';

import React, { useState, useEffect, useRef, useMemo } from 'react';

import { 

  Video, 

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

  MessageSquare,

  Plus,

  Folder,

  ChevronDown,

  ChevronUp,

  ChevronRight,

  Trash2,

  Upload,

  X,

  Bot,

  Pause,

  CalendarDays,

  Thermometer

} from 'lucide-react';

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

  use_single_bgm?: boolean;

  single_bgm?: string;

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

export default function App() {

  const [activeTab, setActiveTab] = useState<'status' | 'timeline' | 'music' | 'terminal' | 'ai' | 'creator' | 'editor' | 'settings'>('status');

  const [status, setStatus] = useState<WorkspaceStatus | null>(null);

  const [config, setConfig] = useState<ConfigData | null>(null);

  const [outputs, setOutputs] = useState<OutputVideo[]>([]);

  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);

  const [logs, setLogs] = useState<string[]>([]);

  const [rendering, setRendering] = useState<boolean>(false);

  const [mixing, setMixing] = useState<boolean>(false);

  const [playingMusic, setPlayingMusic] = useState<string | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  

  // Project Management states

  const [projects, setProjects] = useState<{ name: string; path: string }[]>([]);

  const [videoFileDurations, setVideoFileDurations] = useState<Record<string, number>>({});

  const [activeProject, setActiveProject] = useState<string>('Buracos no Deserto');

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const [newProjectName, setNewProjectName] = useState<string>('');

  // AI Agent states

  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  const [apiKeyInput, setApiKeyInput] = useState<string>('');

  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

  const [aiProvider, setAiProvider] = useState<'gemini' | 'xai'>('gemini');

  const [geminiKeysInput, setGeminiKeysInput] = useState<string>('');

  const [xaiKeyInput, setXaiKeyInput] = useState<string>('');

  const [geminiKeyCount, setGeminiKeyCount] = useState<number>(0);

  const [hasXaiKey, setHasXaiKey] = useState<boolean>(false);

  const [savingAiSettings, setSavingAiSettings] = useState<boolean>(false);

  const [chatInput, setChatInput] = useState<string>('');

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([

    { role: 'assistant', content: 'Olá! Sou o Assistente de IA do Lumiera Cinematic Studio. Como posso te ajudar na criação do vídeo hoje? Você pode me pedir para criar metadados para o YouTube, sugerir palavras-chave para destacar, reescrever textos de impacto ou alterar o mapeamento das músicas!' }

  ]);

  const [chatLoading, setChatLoading] = useState<boolean>(false);

  

  // YouTube states

  const [youtubeMetadata, setYoutubeMetadata] = useState<string>('');

  const [youtubeLoading, setYoutubeLoading] = useState<boolean>(false);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const [deletingProjectName, setDeletingProjectName] = useState<string | null>(null);

  const [pendingOutputDelete, setPendingOutputDelete] = useState<OutputVideo | null>(null);

  const [deletingOutput, setDeletingOutput] = useState<boolean>(false);

  const [renderProgress, setRenderProgress] = useState<{percent: number, phase: string} | null>(null);

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

  const [creatorAssets, setCreatorAssets] = useState<{ name: string; sizeBytes: number; type: string }[]>([]);

  const [timelineAssets, setTimelineAssets] = useState<any>(null);

  const [syncingTimings, setSyncingTimings] = useState<boolean>(false);

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

  } | null>(null);

  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number>(savedCreatorState.selectedIdeaIndex !== undefined ? savedCreatorState.selectedIdeaIndex : -1);

  const [generatedScriptData, setGeneratedScriptData] = useState<any | null>(savedCreatorState.generatedScriptData || null);

  const [creatorProjectName, setCreatorProjectName] = useState<string>('');

  const [selectedProject, setSelectedProject] = useState<string>(activeProject);

  const [uploadedScenes, setUploadedScenes] = useState<Record<number, boolean>>({});

  const [storyboardData, setStoryboardData] = useState<any | null>(null);

  const [loadingStoryboard, setLoadingStoryboard] = useState<boolean>(false);

  const [editorSubTab, setEditorSubTab] = useState<'script' | 'assets'>('script');

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

  const activeNarrationStateRef = useRef<{ target: number | string; endTime: number } | null>(null);

  // Helper: Append active project context dynamically to backend URL queries

  const getProjectUrl = (endpoint: string, projectOverride?: string) => {

    const p = projectOverride || activeProject;

    const separator = endpoint.includes('?') ? '&' : '?';

    return `${endpoint}${separator}project=${encodeURIComponent(p)}`;

  };

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

  // Fetch valid projects list

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

  // Fetch initial project-specific data (run on project change, does not poll periodically to avoid overwriting user inputs)

  const fetchInitialProjectData = async () => {

    try {

      const configRes = await fetch(getProjectUrl('/api/config'));
      if (configRes.ok) {
        const loadedConfig = await configRes.json();
        // Auto-set aspect_ratio if not defined, based on format
        if (!loadedConfig.aspect_ratio) {
          loadedConfig.aspect_ratio = formatSelector === 'SHORTS' ? '9:16' : '16:9';
        }
        setConfig(loadedConfig);
      }

      const musicRes = await fetch(getProjectUrl('/api/music'));

      if (musicRes.ok) setMusicFiles(await musicRes.json());

      const aiKeyStatusRes = await fetch(getProjectUrl('/api/ai/key-status'));

      if (aiKeyStatusRes.ok) {

        const keyData = await aiKeyStatusRes.json();

        setHasApiKey(keyData.has_key);

        if (typeof keyData.key_count === 'number') setGeminiKeyCount(keyData.key_count);

      }

      const aiSettingsRes = await fetch(getProjectUrl('/api/ai/settings'));

      if (aiSettingsRes.ok) {

        const settingsData = await aiSettingsRes.json();

        setAiProvider(settingsData.provider === 'xai' ? 'xai' : 'gemini');

        setGeminiKeyCount(settingsData.gemini_key_count || 0);

        setHasXaiKey(!!settingsData.has_xai_key);

        setHasApiKey((settingsData.gemini_key_count || 0) > 0 || !!settingsData.has_xai_key);

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

  const fetchData = async () => {

    await Promise.all([fetchInitialProjectData(), fetchStatusAndOutputs(), fetchHeaderWeather()]);

  };

  

  useEffect(() => {

    localStorage.setItem('qanat_creator_state', JSON.stringify({ creatorStep, nicheInput, formatSelector, ideasData, selectedIdeaIndex, generatedScriptData }));

  }, [creatorStep, nicheInput, formatSelector, ideasData, selectedIdeaIndex, generatedScriptData]);

  useEffect(() => {

    fetchProjects();

  }, []);

  useEffect(() => {

    fetchData();

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

    const interval = setInterval(fetchStatusAndOutputs, 8000);

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

        body: JSON.stringify({ name: newProjectName.trim() })

      });

      const data = await res.json();

      if (res.ok) {

        toast.success(data.message);

        setNewProjectName('');

        setShowCreateModal(false);

        await fetchProjects();

        const safeName = newProjectName.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

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

        setUploadedScenes(prev => ({...prev, [sceneNum]: true}));

        fetchData();

      } else {

        toast.error('Falha ao enviar mídia: ' + (data.error || 'Erro desconhecido'));

      }

    } catch (err) {

      console.error(err);

      toast.error('Erro na conexão ao enviar mídia da cena.');

    }

  };

  // Save config

  const saveConfig = async (updatedConfig: ConfigData) => {

    try {

      const res = await fetch(getProjectUrl('/api/config'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(updatedConfig)

      });

      if (res.ok) {

        setConfig(updatedConfig);

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

    const blockAssets = [...(newTimelineAssets[blockKey] || [])];

    

    if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {

      const updatedAsset = { ...blockAssets[index] };

      delete updatedAsset[field];

      blockAssets[index] = updatedAsset;

    } else {

      blockAssets[index] = { ...blockAssets[index], [field]: value };

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

  const getAssetNarration = (blockKey: string, assetIdx: number) => {

    const blockNum = parseInt(blockKey, 10);

    if (storyboardData && storyboardData.visual_prompts) {

      const blockScenes = storyboardData.visual_prompts.filter((vp: any) => vp.block === blockNum);

      if (blockScenes.length > 0) {

        const correspondingScene = blockScenes[assetIdx];

        if (correspondingScene && correspondingScene.narration_text) {

          return correspondingScene.narration_text;

        }

      }

    }

    // Fallback to config block phrase if available

    if (config && config.block_phrases) {

      const bp = config.block_phrases.find((x: any) => x.block === blockNum);

      if (bp) return bp.phrase;

    }

    return '';

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

    const PORTUGUESE_STOP_WORDS = new Set([

      'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',

      'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',

      'para', 'com', 'por', 'sob', 'sobre', 'sem',

      'que', 'se', 'e', 'ou', 'mas', 'porem', 'todavia', 'contudo', 'entretanto',

      'aqui', 'ali', 'la', 'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',

      'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo',

      'eu', 'tu', 'ele', 'ela', 'nos', 'vos', 'eles', 'elas', 'me', 'te', 'se', 'lhe',

      'ao', 'aos', 'pelo', 'pela', 'pelos', 'pelas', 'num', 'numa', 'nuns', 'numas',

      'como', 'mais', 'muito', 'seus', 'suas', 'seu', 'sua', 'dele', 'dela', 'deles', 'delas'

    ]);

    const matchWords = (w1: string, w2: string): boolean => {

      if (w1 === w2) return true;

      const s1 = w1.endsWith('s') ? w1.slice(0, -1) : w1;

      const s2 = w2.endsWith('s') ? w2.slice(0, -1) : w2;

      if (s1 === s2 && s1.length > 3) return true;

      return false;

    };

    const uniqueTexts = new Set<string>();

    Object.keys(timelineAssets).forEach(blockKey => {

      const assets = timelineAssets[blockKey] || [];

      assets.forEach((asset, idx) => {

        const narrationText = getAssetNarration(blockKey, idx);

        if (narrationText) {

          uniqueTexts.add(narrationText);

        }

      });

    });

    uniqueTexts.forEach(narrationText => {

      const targetWords = cleanText(narrationText);

      if (targetWords.length === 0) return;

      const targetWeights = targetWords.map(w => PORTUGUESE_STOP_WORDS.has(w) ? 1 : 10);

      const maxPossibleScore = targetWeights.reduce((acc, val) => acc + val, 0);

      const N = targetWords.length;

      const W = N + 8;

      let bestScore = 0;

      let bestFirstMatchIdx = -1;

      let bestLastMatchIdx = -1;

      for (let i = 0; i <= flatTranscriptWords.length - Math.min(N, flatTranscriptWords.length); i++) {

        let score = 0;

        let firstMatchIdxInWindow = -1;

        let lastMatchIdxInWindow = -1;

        const matchedTargetIndices = new Set<number>();

        const windowWords = flatTranscriptWords.slice(i, i + W);

        windowWords.forEach((w, twIdx) => {

          const cleanTw = w.clean;

          for (let tIdx = 0; tIdx < targetWords.length; tIdx++) {

            if (!matchedTargetIndices.has(tIdx) && matchWords(targetWords[tIdx], cleanTw)) {

              score += targetWeights[tIdx];

              matchedTargetIndices.add(tIdx);

              if (firstMatchIdxInWindow === -1) {

                firstMatchIdxInWindow = twIdx;

              }

              lastMatchIdxInWindow = twIdx;

              break;

            }

          }

        });

        const currentFirstAbs = i + firstMatchIdxInWindow;

        const currentLastAbs = i + lastMatchIdxInWindow;

        const currentSpan = currentLastAbs - currentFirstAbs;

        const bestSpan = bestLastMatchIdx - bestFirstMatchIdx;

        if (score > bestScore || (score === bestScore && score > 0 && firstMatchIdxInWindow !== -1 && (bestFirstMatchIdx === -1 || currentSpan < bestSpan))) {

          bestScore = score;

          bestFirstMatchIdx = currentFirstAbs;

          bestLastMatchIdx = currentLastAbs;

        }

      }

      const threshold = Math.max(2, Math.min(11, Math.floor(maxPossibleScore * 0.5)));

      

      if (bestScore >= threshold && bestFirstMatchIdx !== -1 && bestLastMatchIdx !== -1) {

        const start = flatTranscriptWords[bestFirstMatchIdx].start;

        const end = flatTranscriptWords[bestLastMatchIdx].end;

        cache[narrationText] = {

          start: start,

          end: end,

          duration: end - start,

          matchedWords: bestScore,

          totalWords: maxPossibleScore,

          bestFirstMatchIdx: bestFirstMatchIdx,

          bestLastMatchIdx: bestLastMatchIdx

        };

      }

    });

    return cache;

  }, [flatTranscriptWords, narrationTextsListString]);

  const findNarrationTimestamps = (narrationText: string) => {

    if (!narrationText) return null;

    return narrationMatchesCache[narrationText] || null;

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

      assets.forEach((_, idx) => {
        const narrationText = getAssetNarration(blockKey, idx);
        if (!narrationText) return;
        const matched = narrationMatchesCache[narrationText];
        if (!matched) return;
        const words = getStoryboardWordsWithTiming(narrationText, matched.bestFirstMatchIdx, matched.bestLastMatchIdx);
        words.forEach(w => {
          const key = `${w.start.toFixed(3)}-${w.word}`;
          if (!seenPositions.has(key)) {
            allWords.push(w);
            seenPositions.add(key);
          }
        });
      });

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
    let assetAudioStart = narrationStart;
    for (let i = 0; i < assetIdx; i++) {
      assetAudioStart += getAssetDuration(blockKey, i);
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

  const alignBlockAssetsToSpeech = (blockKey: string) => {

    if (!config || !config.timeline_assets || !config.timeline_assets[blockKey]) return;

    if (!wordTranscripts || wordTranscripts.length === 0) {

      toast.error("Transcrições da voz não carregadas ou indisponíveis para este projeto.");

      return;

    }

    const updatedAssets = [...config.timeline_assets[blockKey]];

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

        const match = findNarrationTimestamps(text);

        if (match) return match.start;

      }

      return null;

    };

    let alignedCount = 0;

    updatedAssets.forEach((asset, idx) => {

      const narrationText = getAssetNarration(blockKey, idx);

      const matched = findNarrationTimestamps(narrationText);

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

        alignedCount++;

      }

    });

    if (alignedCount === 0) {

      toast.error("Nenhuma cena pôde ser alinhada com a transcrição da voz.");

      return;

    }

    const newConfig = {

      ...config,

      timeline_assets: {

        ...config.timeline_assets,

        [blockKey]: updatedAssets

      }

    };

    

    saveConfig(newConfig);

    toast.success(`${alignedCount} cenas sincronizadas com o tempo da voz com sucesso!`);

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
          const match = findNarrationTimestamps(text);
          if (match) return match.start;
        }
        return null;
      };

      updatedAssets.forEach((asset, idx) => {
        const narrationText = getAssetNarration(blockKey, idx);
        const matched = findNarrationTimestamps(narrationText);
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

  const getNarrationAudio = () => {

    if (!narrationAudioRef.current) {

      const url = getMusicUrl("narracao_mestra_premium.mp3");

      const audio = new Audio(url);

      

      audio.ontimeupdate = () => {

        setNarrationTime(audio.currentTime);

        const state = activeNarrationStateRef.current;

        if (state) {

          if (audio.currentTime >= state.endTime - 0.05) {

            audio.pause();

            setPlayingNarration(null);

            activeNarrationStateRef.current = null;

          }

        }

      };

      audio.onended = () => {

        setPlayingNarration(null);

        activeNarrationStateRef.current = null;

      };

      narrationAudioRef.current = audio;

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

    const audio = getNarrationAudio();

    const targetStr = `scene-${blockKey}-${sceneIdx}`;

    if (playingNarration === targetStr) {

      audio.pause();

      setPlayingNarration(null);

      activeNarrationStateRef.current = null;

      return;

    }

    audio.pause();

    const blockNum = Number(blockKey);

    const narrationText = getAssetNarration(blockKey, sceneIdx);

    const matched = findNarrationTimestamps(narrationText);

    const duration = getAssetDuration(blockKey, sceneIdx);

    let startTime = 0;

    let endTime = 0;

    const starts = status?.block_timings?.starts;

    let timelineFound = false;

    if (starts && starts[blockNum - 1] !== undefined) {

      let currentStart = starts[blockNum - 1];

      for (let i = 0; i < sceneIdx; i++) {

        currentStart += getAssetDuration(blockKey, i);

      }

      startTime = currentStart;

      endTime = currentStart + duration;

      timelineFound = true;

    }

    if (!timelineFound) {

      if (matched) {

        startTime = matched.start;

        endTime = matched.start + duration;

      } else {

        startTime = 0;

        endTime = duration;

      }

    }

    audio.currentTime = startTime;

    activeNarrationStateRef.current = { target: targetStr, endTime: endTime };

    setPlayingNarration(targetStr);

    audio.play().catch(err => {

      console.error("Failed to play scene narration:", err);

      setPlayingNarration(null);

      activeNarrationStateRef.current = null;

    });

  };

  const getAssetUrl = (fileName: string) => {

    return `/api/projects-media/${encodeURIComponent(activeProject)}/ASSETS/${encodeURIComponent(fileName)}`;

  };

  const getMusicUrl = (fileName: string) => {

    if (activeProject === 'Buracos no Deserto') {

      return `/api/projects-media/${encodeURIComponent(fileName)}`;

    }

    return `/api/projects-media/${encodeURIComponent(activeProject)}/${encodeURIComponent(fileName)}`;

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

      const url = getMusicUrl(fileName);

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

    return () => {

      if (audioPlayerRef.current) {

        audioPlayerRef.current.pause();

      }

    };

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

  const handleSaveAiSettings = async () => {

    setSavingAiSettings(true);

    try {

      const res = await fetch(getProjectUrl('/api/ai/settings'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          provider: aiProvider,

          gemini_keys: geminiKeysInput,

          xai_key: xaiKeyInput

        })

      });

      const data = await res.json();

      if (res.ok) {

        setGeminiKeyCount(data.gemini_key_count || 0);

        setHasXaiKey(!!data.has_xai_key);

        setHasApiKey((data.gemini_key_count || 0) > 0 || !!data.has_xai_key);

        setGeminiKeysInput('');

        setXaiKeyInput('');

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

      const res = await fetch(getProjectUrl('/api/ai/execute-action'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ actions: parsed.actions })

      });

      if (res.ok) {

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

      const res = await fetch(getProjectUrl('/api/ai/chat'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ messages: updatedMessages })

      });

      const data = await res.json();

      if (res.ok) {

        const aiText = data.text;

        // Strip action block from displayed text

        const displayText = aiText.replace(/```lumiera-action[\s\S]*?```/g, '').trim();

        setChatMessages(prev => [...prev, { role: 'assistant', content: displayText || aiText }]);

        // Execute any actions

        executeAgentActions(aiText);

      } else {

        setChatMessages(prev => [...prev, { role: 'assistant', content: `[Erro] ${data.error || 'Falha ao obter resposta da IA.'}` }]);

      }

    } catch (err) {

      setChatMessages(prev => [...prev, { role: 'assistant', content: `[Erro] Conexão com o servidor falhou.` }]);

    } finally {

      setChatLoading(false);

    }

  };

  // Generate YouTube Metadata

  const handleGenerateYoutubeMetadata = async () => {

    setYoutubeLoading(true);

    setYoutubeMetadata('');

    try {

      const res = await fetch(getProjectUrl('/api/ai/optimize-youtube'), { method: 'POST' });

      const data = await res.json();

      if (res.ok) {

        setYoutubeMetadata(data.text);

        if (data.warning) {

          toast(data.warning);

        }

      } else {

        const details = data.details ? `\n\n${data.details}` : '';

        setYoutubeMetadata(`[Erro] ${data.error || 'Falha ao gerar metadados do YouTube.'}${details}`);

      }

    } catch (err) {

      setYoutubeMetadata(`[Erro] Falha na conexão com o servidor.`);

    } finally {

      setYoutubeLoading(false);

    }

  };

  // AI BGM Suggestion
  const [suggestingBGM, setSuggestingBGM] = useState<boolean>(false);

  const handleSuggestBGM = async () => {
    if (!hasApiKey || !config) return;
    setSuggestingBGM(true);
    try {
      const res = await fetch(getProjectUrl('/api/ai/suggest-bgm'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: formatSelector })
      });
      const data = await res.json();
      if (res.ok) {
        if (formatSelector === 'SHORTS' && data.recommendation) {
          toast.success(`Ideia de BGM para o vídeo inteiro:\n${data.recommendation}\n\nEscolha a faixa manualmente em Trilha Única.`, { duration: 9000 });
          return;
        }

        if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.some((s: any) => s.recommendation)) {
          const summary = data.suggestions
            .slice(0, 6)
            .map((s: any) => `Bloco ${s.block}: ${s.recommendation || s.reason || ''}`)
            .join('\n');
          const extra = data.suggestions.length > 6 ? `\n...+${data.suggestions.length - 6} bloco(s)` : '';
          toast.success(`Ideias de BGM por bloco:\n${summary}${extra}\n\nEscolha as faixas manualmente em Por Bloco.`, { duration: 12000 });
          return;
        }

        if (false && formatSelector === 'SHORTS' && data.file) {
          // Single BGM for entire video
          const updatedConfig = {
            ...config,
            use_single_bgm: true,
            single_bgm: data.file,
            bgm_mappings: [{ block: 1, file: data.file }]
          };
          await saveConfig(updatedConfig);
          toast.success(`🎵 IA sugeriu: ${data.file}\n${data.reason || ''}`);
        } else if (false && data.suggestions && Array.isArray(data.suggestions)) {
          // Per-block BGM
          const newMappings = data.suggestions.map((s: any) => ({
            block: s.block,
            file: s.file
          }));
          const updatedConfig = { ...config, bgm_mappings: newMappings };
          await saveConfig(updatedConfig);
          toast.success(`🎵 IA mapeou trilhas para ${newMappings.length} blocos!`);
        } else {
          toast.error('Resposta da IA não contém sugestões válidas.');
        }
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

      const res = await fetch(getProjectUrl('/api/ai/generate-creator-script'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ prompt: creatorPrompt })

      });

      const data = await res.json();

      if (res.ok) {

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

  const handleGenerateIdeas = async () => {

    if (!nicheInput.trim()) return;

    setCreatorLoading(true);

    setIdeasData(null);

    setSelectedIdeaIndex(-1);

    try {

      const res = await fetch(getProjectUrl('/api/ai/creator/ideas'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ niche: nicheInput.trim(), format: formatSelector })

      });

      const data = await res.json();

      if (res.ok) {

        setIdeasData(data);

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

  const handleGenerateFullScript = async () => {

    if (!ideasData || selectedIdeaIndex === -1) return;

    if (!creatorProjectName.trim()) {

      toast.error("Por favor, digite o nome do projeto/pasta.");

      return;

    }

    const safeProjectName = creatorProjectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

    setCreatorLoading(true);

    setGeneratedScriptData(null);

    try {

      const res = await fetch('/api/ai/creator/script', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          niche: nicheInput.trim(),

          format: formatSelector,

          idea: (ideasData?.ideas || [])[selectedIdeaIndex],

          project: safeProjectName

        })

      });

      const data = await res.json();

      if (res.ok) {

        setGeneratedScriptData(data);

        setCreatorScript(data.narrative_script);

        setCreatorStep(2);

        

        // Refresh project list and select the new project context

        await fetchProjects();

        setActiveProject(safeProjectName);

        fetchData();

      } else {

        toast.error('Erro na IA: ' + (data.details || data.error || 'Erro desconhecido'));

      }

    } catch (err) {

      console.error(err);

      toast.error('Conexão falhou ao gerar roteiro.');

    } finally {

      setCreatorLoading(false);

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

        if (data.warnings && data.warnings.length > 0) {

          toast.success(`Linha do tempo sincronizada com ${data.warnings.length} aviso(s).`);

          console.warn('Avisos da sincronização de assets:', data.warnings);

        } else {

          toast.success('Linha do tempo sincronizada com o roteiro!');

        }

        setCreatorStep(5);

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

  }, [creatorStep]);

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

    if (config.highlight_keywords.includes(cleanKw)) return;

    const updated = {

      ...config,

      highlight_keywords: [...config.highlight_keywords, cleanKw]

    };

    saveConfig(updated);

    setNewKeyword('');

  };

  const removeKeyword = (kw: string) => {

    if (!config) return;

    const updated = {

      ...config,

      highlight_keywords: config.highlight_keywords.filter(k => k !== kw)

    };

    saveConfig(updated);

  };

  // Impact text update

  const handleSaveImpactText = (index: number) => {

    if (!config || !editingImpact) return;

    const updatedImpacts = [...config.impact_texts];

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

    const updatedBgm = config.bgm_mappings.map(mapping => {

      if (mapping.block === blockNum) {

        return { ...mapping, file: fileName };

      }

      return mapping;

    });

    const updated = { ...config, bgm_mappings: updatedBgm };

    saveConfig(updated);

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

  const triggerRender = (mode: 'standard' | 'highlighted' | 'remotion', fromWizard = false) => {

    if (rendering) return;

    setRendering(true);

    setRenderProgress({ percent: 0, phase: 'Inicializando...' });

    if (!fromWizard) setActiveTab('terminal');

    setLogs([]);

    

    const eventSource = new EventSource(getProjectUrl(`/api/render/${mode}`));

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

        <aside className="w-64 border-r border-gray-850 bg-[#0a0a0c] p-6 flex flex-col justify-between shrink-0 select-none">

          <div className="space-y-6">

            

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

            {/* Project List */}

            <div className="space-y-3">

              <div className="flex justify-between items-center px-1">

                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Projetos</span>

                <button 

                  onClick={() => setShowCreateModal(true)} 

                  className="p-1 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 text-gold-500 transition cursor-pointer"

                  title="Criar Novo Projeto"

                >

                  <Plus className="w-3.5 h-3.5" />

                </button>

              </div>

              <div className="space-y-2">

                {projects.map((proj) => {

                  const isSelected = activeProject === proj.name;

                  return (

                    <div key={proj.name} className="space-y-1 group">

                      {/* Project Header Button Container */}

                      <div className="flex items-center justify-between gap-1">

                        <button

                          onClick={() => {

                            setActiveProject(proj.name);

                            if (activeTab === 'creator') {

                              setActiveTab('status');

                            }

                          }}

                          className={`flex-1 text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${

                            isSelected 

                              ? 'bg-zinc-900 border border-zinc-800 text-white font-bold' 

                              : 'text-gray-400 border border-transparent hover:bg-zinc-900/30 hover:text-gray-200'

                          }`}

                        >

                          <div className="flex items-center gap-2">

                            <Folder className={`w-4 h-4 ${isSelected ? 'text-gold-500' : 'text-zinc-500'}`} />

                            <span className="truncate max-w-[120px]">{proj.name}</span>

                          </div>

                          {isSelected ? (

                            <ChevronDown className="w-3.5 h-3.5 text-gold-500 shrink-0" />

                          ) : (

                            <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />

                          )}

                        </button>

                        {/* Delete project button */}

                        {proj.name !== "Buracos no Deserto" && (

                          <div className="flex items-center gap-1 shrink-0">

                            {deletingProjectName === proj.name ? (

                              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 animate-fade-in shrink-0">

                                <button

                                  onClick={(e) => {

                                    e.stopPropagation();

                                    handleDeleteProject(proj.name);

                                  }}

                                  className="text-[9px] bg-red-500 hover:bg-red-600 text-white font-bold px-2 py-1 rounded transition cursor-pointer"

                                  title="Confirmar exclusão"

                                >

                                  Sim

                                </button>

                                <button

                                  onClick={(e) => {

                                    e.stopPropagation();

                                    setDeletingProjectName(null);

                                  }}

                                  className="text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-2 py-1 rounded transition cursor-pointer ml-1"

                                >

                                  Não

                                </button>

                              </div>

                            ) : (

                              <button

                                onClick={(e) => {

                                  e.stopPropagation();

                                  setDeletingProjectName(proj.name);

                                }}

                                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-900/50 rounded-lg transition cursor-pointer shrink-0"

                                title="Excluir Projeto"

                              >

                                <Trash2 className="w-3.5 h-3.5" />

                              </button>

                            )}

                          </div>

                        )}

                      </div>

                      {/* Submenu for active project */}

                      {isSelected && (

                        <div className="pl-3 ml-2 border-l border-zinc-800 space-y-1 mt-1 font-sans">

                          <button 

                            onClick={() => setActiveTab('status')}

                            className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${

                              activeTab === 'status' 

                                ? 'text-gold-500 bg-gold-500/5 font-bold' 

                                : 'text-gray-400 hover:bg-zinc-900/40 hover:text-gray-200'

                            }`}

                          >

                            <Tv className="w-3.5 h-3.5 shrink-0" />

                            <span>Geral e Render</span>

                          </button>

                          <button 

                            onClick={() => setActiveTab('timeline')}

                            className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${

                              activeTab === 'timeline' 

                                ? 'text-gold-500 bg-gold-500/5 font-bold' 

                                : 'text-gray-400 hover:bg-zinc-900/40 hover:text-gray-200'

                            }`}

                          >

                            <Layers className="w-3.5 h-3.5 shrink-0" />

                            <span>Roteiro e Tags</span>

                          </button>

                          <button 

                            onClick={() => setActiveTab('music')}

                            className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${

                              activeTab === 'music' 

                                ? 'text-gold-500 bg-gold-500/5 font-bold' 

                                : 'text-gray-400 hover:bg-zinc-900/40 hover:text-gray-200'

                            }`}

                          >

                            <Music className="w-3.5 h-3.5 shrink-0" />

                            <span>Trilha BGM</span>

                          </button>

                           <button 

                            onClick={() => setActiveTab('ai')}

                            className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${

                              activeTab === 'ai' 

                                ? 'text-gold-500 bg-gold-500/5 font-bold' 

                                : 'text-gray-400 hover:bg-zinc-900/40 hover:text-gray-200'

                            }`}

                          >

                            <Sparkles className="w-3.5 h-3.5 shrink-0" />

                            <span>Agente IA & Metadados</span>

                          </button>

                          <button 

                            onClick={() => setActiveTab('editor')}

                            className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${

                              activeTab === 'editor' 

                                ? 'text-gold-500 bg-gold-500/5 font-bold' 

                                : 'text-gray-400 hover:bg-zinc-900/40 hover:text-gray-200'

                            }`}

                          >

                            <Settings className="w-3.5 h-3.5 shrink-0" />

                            <span>Editor de Projeto</span>

                          </button>

                          <button 

                            onClick={() => setActiveTab('settings')}

                            className={`hidden w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium transition items-center gap-2 cursor-pointer ${

                              activeTab === 'settings' 

                                ? 'text-gold-500 bg-gold-500/5 font-bold' 

                                : 'text-gray-400 hover:bg-zinc-900/40 hover:text-gray-200'

                            }`}

                          >

                            <Settings className="w-3.5 h-3.5 shrink-0" />

                            <span>Configurações</span>

                          </button>

                          <button 

                            onClick={() => setActiveTab('terminal')}

                            className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${

                              activeTab === 'terminal' 

                                ? 'text-gold-500 bg-gold-500/5 font-bold' 

                                : 'text-gray-400 hover:bg-zinc-900/40 hover:text-gray-200'

                            }`}

                          >

                            <Terminal className="w-3.5 h-3.5 shrink-0" />

                            <span>Terminal</span>

                          </button>

                          {status && (

                            <div className="mt-4 p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-3.5">

                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">VerificaÃ§Ãµes Ativas</span>

                              <div className="space-y-2 text-xs">

                                <div className="flex justify-between items-center">

                                  <span className="text-gray-400 font-sans">NarraÃ§Ã£o Master</span>

                                  {status.has_narration ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}

                                </div>

                                <div className="flex justify-between items-center">

                                  <span className="text-gray-400 font-sans">Trilha Sonora BGM</span>

                                  {status.has_soundtrack ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}

                                </div>

                                <div className="flex justify-between items-center">

                                  <span className="text-gray-400 font-sans">Clipe InfogrÃ¡fico</span>

                                  {status.has_highlight_clip ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}

                                </div>

                                <div className="flex justify-between items-center">

                                  <span className="text-gray-400 font-sans">Assets de B-roll</span>

                                  <span className="font-mono text-white text-[11px] bg-zinc-900 px-1.5 py-0.5 rounded">{status.assets_count} arquivos</span>

                                </div>

                              </div>

                            </div>

                          )}

                        </div>

                      )}

                    </div>

                  );

                })}

              </div>

            </div>

            

            {/* Status Panel Quick view */}

            {false && status && (

              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-3.5">

                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Verificações Ativas</span>

                

                <div className="space-y-2 text-xs">

                  <div className="flex justify-between items-center">

                    <span className="text-gray-400 font-sans">Narração Master</span>

                    {status.has_narration ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}

                  </div>

                  <div className="flex justify-between items-center">

                    <span className="text-gray-400 font-sans">Trilha Sonora BGM</span>

                    {status.has_soundtrack ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}

                  </div>

                  <div className="flex justify-between items-center">

                    <span className="text-gray-400 font-sans">Clipe Infográfico</span>

                    {status.has_highlight_clip ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}

                  </div>

                  <div className="flex justify-between items-center">

                    <span className="text-gray-400 font-sans">Assets de B-roll</span>

                    <span className="font-mono text-white text-[11px] bg-zinc-900 px-1.5 py-0.5 rounded">{status.assets_count} arquivos</span>

                  </div>

                </div>

              </div>

            )}

          </div>

          <div className="text-[10px] text-gray-500 leading-normal border-t border-gray-850 pt-4 font-sans">

            Desenvolvido por Antigravity Studio. Versão 1.2.0 • Remotion e Hyperframe Engine.

          </div>

        </aside>

        {/* Tab Content Panel */}

        <main className="flex-1 overflow-y-auto p-8 bg-[#09090b]">

          

          {/* TAB 1: STATUS & RENDER */}

          {activeTab === 'status' && (

            <div className="space-y-8 animate-fade-in">

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                

                {/* Compiler Card */}

                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-56 font-sans">

                  <div>

                    <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">

                      <Tv className="w-4 h-4 text-gold-500" /> RENDERIZADOR PADRÃO

                    </h3>

                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">

                      Gera o documentário cinematográfico padrão com as legendas animadas em Gold/Water Blue e efeitos de zoom Ken Burns anti-jitter.

                    </p>

                  </div>

                  

                  <button 

                    disabled={rendering || !status?.has_narration}

                    onClick={() => triggerRender('standard')}

                    className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-gold-500/10 cursor-pointer w-full"

                  >

                    <Play className="w-4 h-4 fill-current" />

                    <span>Iniciar Compilação Padrão</span>

                  </button>

                </div>

                {/* Highlight Compiler Card */}

                <div className="glass-panel-glow p-6 rounded-2xl flex flex-col justify-between h-56 font-sans">

                  <div>

                    <div className="flex justify-between items-start">

                      <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">

                        <Sparkles className="w-4 h-4 text-gold-500" /> VERSÃO DESTACADA

                      </h3>

                      <span className="bg-gold-500/15 text-gold-500 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Premium</span>

                    </div>

                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">

                      Substitui o B-roll de imagem 32 pelo clipe infográfico dinâmico com overlay de scanner green-radar e fluxo hidráulico animado.

                    </p>

                  </div>

                  <button 

                    disabled={rendering || !status?.has_narration || !status?.has_highlight_clip}

                    onClick={() => triggerRender('highlighted')}

                    className="bg-zinc-100 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-xl cursor-pointer w-full"

                  >

                    <Video className="w-4 h-4" />

                    <span>Renderizar Versão Destacada</span>

                  </button>

                </div>

                {/* Remotion Quick info */}

                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-56 font-sans">

                  <div>

                    <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">

                      <ExternalLink className="w-4 h-4 text-water-300" /> REMOTION ENGINE

                    </h3>

                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">

                      Monta o vÃ­deo pela linha do tempo mapeada, narraÃ§Ã£o sincronizada e legendas geradas a partir da transcriÃ§Ã£o.

                    </p>

                  </div>

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

                            href={`/api/projects-media${activeProject === "Buracos no Deserto" ? "/OUTPUT/qanat_persa_video_final/" + video.name : "/" + activeProject + "/OUTPUT/qanat_persa_video_final/" + video.name}`} 

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

          {/* TAB 2: TIMELINE & BLOCKS */}

          {activeTab === 'timeline' && config && (

            <div className="space-y-8 animate-fade-in">

              

              {/* Keywords panel */}

              <div className="glass-panel p-6 rounded-3xl space-y-4">

                <div>

                  <h3 className="font-cinzel text-sm font-bold text-white tracking-wide">PALAVRAS-CHAVE EM DESTAQUE (HIGHLIGHT)</h3>

                  <p className="text-xs text-gray-400 mt-1 font-sans">Palavras nesta lista serão destacadas na cor Ouro/Amarelo no vídeo final.</p>

                </div>

                <div className="flex flex-wrap gap-2 p-4 bg-zinc-950 border border-zinc-900 rounded-2xl min-h-[80px] font-sans">

                  {config.highlight_keywords.map(kw => (

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

                  {config.impact_texts.map((impact, idx) => (

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

            </div>

          )}

          {/* TAB 3: SOUNDTRACK STUDIO */}

          {activeTab === 'music' && config && (

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

                            {musicFiles.map(file => (

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

                      {(config.bgm_mappings || []).map(bgm => (

                        <div key={bgm.block} className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-900 rounded-xl gap-4">

                          <span className="text-xs font-bold text-white font-mono shrink-0">Bloco {bgm.block}</span>

                          

                          <div className="flex gap-2 items-center flex-1 justify-end min-w-0">

                            <select 

                              value={bgm.file}

                              onChange={(e) => handleMusicChange(bgm.block, e.target.value)}

                              className="bg-zinc-900 border border-zinc-800 text-gray-300 hover:border-zinc-700 focus:outline-none rounded-lg px-2 py-1.5 text-xs cursor-pointer max-w-[200px] truncate"

                            >

                              {musicFiles.map(file => (

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

                      ))}

                    </div>

                  )}

                </div>

                {/* Available songs list */}

                <div className="glass-panel p-6 rounded-3xl space-y-4">

                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2">

                    <h4 className="font-cinzel text-xs font-bold text-white tracking-widest uppercase">Músicas Disponíveis</h4>

                    <div className="flex items-center gap-3">

                      <span className="text-[10px] text-zinc-500 font-mono">{musicFiles.length} arquivos</span>

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

                    {musicFiles

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

                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">{getFormatBytes(file.sizeBytes)}</span>

                        </div>

                    ))}

                </div>

              </div>

            </div>

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

                      {hasApiKey ? `Conectado via ${aiProvider === 'xai' ? 'Grok / xAI' : 'Gemini'}.` : 'Configure um provedor para habilitar a IA.'}

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

                      <p className="text-[10px] text-gray-400 mt-1">Gere títulos A/B, descrição SEO, tags e capítulos baseados no roteiro.</p>

                    </div>

                    

                    <button 

                      disabled={youtubeLoading || !hasApiKey}

                      onClick={handleGenerateYoutubeMetadata}

                      className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-[11px] font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-gold-500/10"

                    >

                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />

                      <span>{youtubeLoading ? 'Gerando...' : 'Gerar Metadados'}</span>

                    </button>

                  </div>

                  <div className="flex-1 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 overflow-y-auto mt-4 min-h-0 select-text font-sans relative">

                    {youtubeLoading ? (

                      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 text-xs">

                        <RefreshCw className="w-6 h-6 animate-spin text-gold-500" />

                        <span>A IA está analisando o roteiro e gerando metadados ideais...</span>

                      </div>

                    ) : youtubeMetadata ? (

                      <div className="space-y-3">

                        {/* Copiar Tudo */}

                        <div className="flex justify-end">

                          <button 

                            onClick={() => copyToClipboard(youtubeMetadata, 'youtube')}

                            className="bg-zinc-900 border border-zinc-800 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"

                          >

                            {copiedSection === 'youtube' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}

                            <span>{copiedSection === 'youtube' ? 'Copiado!' : 'Copiar Tudo'}</span>

                          </button>

                        </div>

                        {/* Render sections with individual copy buttons */}

                        {(() => {

                          const sections = youtubeMetadata.split(/^## /m).filter(Boolean);

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

                                  {renderFormattedText(content)}

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

              )}

              {editorSubTab === 'script' && (

                <div className="space-y-6">

                  {/* Action buttons row at the top */}

                  <div className="flex justify-between items-center bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl">

                    <div>

                      <h4 className="font-cinzel text-xs font-bold text-white tracking-wider uppercase">Visualizador e Editor de Roteiro</h4>

                      <p className="text-[10px] text-gray-400 mt-0.5">Altere falas de narração, prompts visuais, reordene cenas ou adicione novas.</p>

                    </div>

                    <div className="flex items-center gap-3">

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

            </div>

          )}

          {activeTab === 'settings' && (

            <div className="space-y-6 animate-fade-in font-sans">

              <div className="glass-panel p-6 rounded-3xl space-y-5">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">

                  <div>

                    <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">

                      <Settings className="w-4 h-4 text-gold-500" /> CONFIGURAÇÕES DE IA

                    </h3>

                    <p className="text-xs text-gray-400 mt-1">Escolha o provedor usado para metadados e agente. As chaves ficam salvas no config local do projeto.</p>

                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-400">

                    <span className="px-2.5 py-1 rounded-lg border border-zinc-850 bg-zinc-950">Gemini: {geminiKeyCount} chave(s)</span>

                    <span className="px-2.5 py-1 rounded-lg border border-zinc-850 bg-zinc-950">xAI: {hasXaiKey ? 'configurado' : 'vazio'}</span>

                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <button onClick={() => setAiProvider('gemini')} className={`text-left border rounded-2xl p-4 transition cursor-pointer ${aiProvider === 'gemini' ? 'border-gold-500/60 bg-gold-500/10' : 'border-zinc-850 bg-zinc-950/40 hover:border-zinc-700'}`}>

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold text-white font-cinzel">Gemini</span>

                      {aiProvider === 'gemini' && <CheckCircle className="w-4 h-4 text-gold-500" />}

                    </div>

                    <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">Usa as chaves Google AI Studio em rotação. Se todas falharem, usa xAI/Grok como fallback.</p>

                  </button>

                  <button onClick={() => setAiProvider('xai')} className={`text-left border rounded-2xl p-4 transition cursor-pointer ${aiProvider === 'xai' ? 'border-gold-500/60 bg-gold-500/10' : 'border-zinc-850 bg-zinc-950/40 hover:border-zinc-700'}`}>

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold text-white font-cinzel">Grok / xAI</span>

                      {aiProvider === 'xai' && <CheckCircle className="w-4 h-4 text-gold-500" />}

                    </div>

                    <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">Usa a API da xAI como provedor principal para metadados quando selecionado.</p>

                  </button>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  <div className="space-y-2">

                    <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Chaves Gemini</label>

                    <textarea value={geminiKeysInput} onChange={(e) => setGeminiKeysInput(e.target.value)} placeholder="Cole uma ou várias chaves Gemini, uma por linha. Deixe vazio para manter as atuais." className="w-full h-32 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white resize-none" />

                  </div>

                  <div className="space-y-2">

                    <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Chave xAI / Grok</label>

                    <input type="password" value={xaiKeyInput} onChange={(e) => setXaiKeyInput(e.target.value)} placeholder="Cole a chave xAI. Deixe vazio para manter a atual." className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-2xl px-4 py-3 text-xs text-white" />

                    <p className="text-[10px] text-zinc-500 leading-relaxed">A xAI será usada como fallback quando o Gemini esgotar todas as chaves ou como principal se você selecionar Grok / xAI.</p>

                  </div>

                </div>

                <div className="flex justify-end">

                  <button onClick={handleSaveAiSettings} disabled={savingAiSettings} className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2">

                    {savingAiSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}

                    <span>{savingAiSettings ? 'Salvando...' : 'Salvar Configurações'}</span>

                  </button>

                </div>

              </div>

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

                    style={{ width: `${((creatorStep - 1) / 4) * 100}%` }}

                  ></div>

                  {[1, 2, 3, 4, 5].map((step) => (

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

                  <span>5. Renderizar</span>

                </div>

              </div>

              {/* Steps Content Area */}

              <div className="flex-1 bg-[#09090b] border border-zinc-900 rounded-3xl p-6 min-h-0 overflow-y-auto">

                

                {/* STEP 1: SCRIPT MASTER Research & Selection */}

                {creatorStep === 1 && (

                  <div className="space-y-8 max-w-4xl mx-auto font-sans">

                    {!ideasData ? (

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

                              placeholder={hasApiKey ? "Ex: construções históricas, engenharia antiga e curiosidades..." : "Configure um provedor na aba Configurações primeiro..."}

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

                        <div className="flex justify-end gap-3 pt-2">

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

                        {/* List of 10 ideas */}

                        <div className="space-y-4">

                          <div className="flex justify-between items-center px-1">

                            <h4 className="text-white font-bold text-sm tracking-wide font-cinzel">Selecione uma das 10 Ideias</h4>

                            <span className="text-[10px] bg-gold-500/10 border border-gold-500/20 text-gold-500 px-2 py-0.5 rounded uppercase tracking-wider font-bold">10 Ideias Geradas</span>

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

                            <span>Gerar Roteiro e Estratégia</span>

                          </button>

                        </div>

                      </div>

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

                          : uploadSuccess 

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

                      ) : (

                        <div className="flex flex-col items-center gap-3">

                          <Volume2 className="w-10 h-10 text-zinc-600 animate-pulse" />

                          <div>

                            <span className="text-xs text-gray-300 block font-bold">Arraste seu arquivo MP3 de narração aqui</span>

                            <span className="text-[10px] text-zinc-500 block mt-1">ou clique para selecionar do computador</span>

                          </div>

                          <input 

                            type="file" 

                            accept="audio/mp3,audio/mpeg" 

                            onChange={handleFileInput}

                            className="hidden" 

                            id="file-upload" 

                          />

                          <label 

                            htmlFor="file-upload" 

                            className="mt-2 bg-zinc-900 border border-zinc-800 text-gray-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer hover:bg-zinc-850 transition"

                          >

                            Selecionar Arquivo

                          </label>

                        </div>

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

                {creatorStep === 4 && (

                  <div className="space-y-6 max-w-4xl mx-auto">

                    <div className="flex justify-between items-start border-b border-zinc-900 pb-4">

                      <div>

                        <h4 className="text-white font-bold text-sm tracking-wide font-cinzel">Passo 4: Associação Inteligente de B-roll (ASSETS)</h4>

                        <p className="text-xs text-gray-400 mt-1 leading-relaxed font-sans">

                          Abaixo estão listados os arquivos de vídeo e imagem encontrados na sua pasta local `ASSETS/`. Clique no botão para a IA mapear estes arquivos para cada bloco do vídeo com base no roteiro gerado.

                        </p>

                      </div>

                      <button 

                        disabled={creatorLoading || creatorAssets.length === 0}

                        onClick={handleAutoMapAssets}

                        className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-5 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10 font-sans"

                      >

                        {creatorLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}

                        <span>Associar Mídias com IA</span>

                      </button>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">

                      

                      {/* Left: Available Assets */}

                      <div className="md:col-span-1 bg-zinc-950/40 border border-zinc-900 p-5 rounded-2xl flex flex-col h-[350px]">

                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Mídias Disponíveis</span>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">

                          {creatorAssets.length === 0 ? (

                            <div className="text-zinc-600 italic text-[11px] py-4">Nenhum arquivo de mídia encontrado na pasta ASSETS.</div>

                          ) : (

                            creatorAssets.map((asset, idx) => (

                              <div key={idx} className="p-2 bg-zinc-950 border border-zinc-900 rounded-lg flex justify-between items-center text-[10px]">

                                <span className="text-gray-300 truncate max-w-[150px]" title={asset.name}>{asset.name}</span>

                                <span className="bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">{asset.type}</span>

                              </div>

                            ))

                          )}

                        </div>

                      </div>

                      {/* Right: Layout Output Preview */}

                      <div className="md:col-span-2 bg-zinc-950/40 border border-zinc-900 p-5 rounded-2xl flex flex-col h-[350px]">

                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Layout da Linha do Tempo</span>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">

                          {timelineAssets ? (

                            Object.keys(timelineAssets).map((blockNum) => (

                              <div key={blockNum} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2">

                                <div className="text-[10px] font-bold text-gold-500 uppercase tracking-wider font-mono">Bloco {blockNum}</div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                                  {timelineAssets[blockNum].map((clip: any, idx: number) => (

                                    <div key={idx} className="p-1.5 bg-zinc-900 rounded border border-zinc-800 flex items-center gap-2 text-[9px]">

                                      {/* Thumbnail preview */}
                                      <div className="w-10 h-7 rounded overflow-hidden bg-zinc-950 border border-zinc-800 flex-shrink-0">
                                        {clip.type === 'video' ? (
                                          <video
                                            src={getAssetUrl(clip.asset)}
                                            className="w-full h-full object-cover"
                                            muted
                                            loop
                                            autoPlay
                                            playsInline
                                          />
                                        ) : (
                                          <img
                                            src={getAssetUrl(clip.asset)}
                                            className="w-full h-full object-cover"
                                            alt=""
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                          />
                                        )}
                                      </div>

                                      <span className="text-zinc-300 truncate max-w-[120px] flex-1">{clip.asset}</span>

                                      <span className="text-zinc-500 font-mono flex-shrink-0">{clip.type} {clip.fixed ? `(${clip.fixed}s)` : '(flex)'}</span>

                                    </div>

                                  ))}

                                </div>

                              </div>

                            ))

                          ) : (

                            <div className="flex flex-col items-center justify-center h-full text-zinc-600 italic text-xs gap-1.5 py-10">

                              <Sparkles className="w-5 h-5 text-zinc-800" />

                              <span>Clique em "Associar Mídias com IA" para preencher a linha do tempo.</span>

                            </div>

                          )}

                        </div>

                      </div>

                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-zinc-900 font-sans">

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

                        O roteiro, a narração, os tempos de blocos e a trilha sonora foram configurados pela IA. Agora você pode gerar a trilha de áudio e compilar o vídeo final.

                      </p>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 font-sans">

                      

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

                      {/* Render highlighted card */}

                      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between h-48 hover:border-zinc-800 transition">

                        <div>

                          <h5 className="text-xs font-bold text-white tracking-wider font-cinzel">3. RENDER DESTACADO</h5>

                          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Gera a versão premium destacada contendo infográficos animados adicionais.</p>

                        </div>

                        <button 

                          disabled={rendering}

                          onClick={() => triggerRender('highlighted', true)}

                          className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer w-full"

                        >

                          <Video className="w-3.5 h-3.5" />

                          <span>Compilar Destacado</span>

                        </button>

                      </div>

                    </div>

                    <div className="flex justify-start pt-6 border-t border-zinc-900 font-sans">

                      <button 

                        onClick={() => setCreatorStep(4)}

                        className="text-xs text-zinc-500 hover:text-white font-semibold transition cursor-pointer"

                      >

                        ← Voltar para B-roll

                      </button>

                    </div>

                  </div>

                )}

              {/* Optional: Script Master Strategy Details Panel */}

              {generatedScriptData && (

                <div className="glass-panel p-6 rounded-3xl mt-8 space-y-6 font-sans">

                  <h3 className="font-cinzel text-sm font-bold text-white tracking-wide border-b border-zinc-900 pb-2">

                    ESTRATÉGIA DO ROTEIRO (SCRIPT MASTER OUTPUT)

                  </h3>

                  

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-300">

                    <div className="space-y-4">

                      <div>

                        <span className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">Título Principal</span>

                        <p className="text-white font-bold text-sm mt-1">{generatedScriptData.strategy?.title_main || ''}</p>

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

                      {/* Header with count */}

                      <div className="flex justify-between items-center">

                        <div>

                          <h4 className="text-sm text-white font-bold tracking-wide font-cinzel">ROTEIRO COMPLETO + PROMPTS VISUAIS</h4>

                          <p className="text-[10px] text-zinc-400 mt-1 font-sans">Toda a narração em sequência. Cada trecho tem seu prompt de imagem 2K ou vídeo IA correspondente.</p>

                        </div>

                        <span className="bg-gold-500/10 border border-gold-500/20 text-gold-500 text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider font-mono shrink-0">

                          {(generatedScriptData?.visual_prompts || []).length} cenas

                        </span>

                      </div>

                      {/* Sequential narration timeline */}

                      <div className="space-y-1">

                        {(() => {

                          let lastBlock = -1;

                          return (generatedScriptData.visual_prompts || []).map((vp: any, i: number) => {

                            const isNewBlock = vp?.block !== lastBlock;

                            lastBlock = vp?.block;

                            const isVideo = vp?.type?.toLowerCase()?.includes("vídeo") || vp?.type?.toLowerCase()?.includes("video") || false;

                            const searchQuery = vp?.stock_query || 'cinematic';

                            const sceneNum = i + 1;
                            const blockNum = vp?.block || 1;
                            const blockKey = String(blockNum);
                            let assetIdx = 0;
                            if (generatedScriptData && generatedScriptData.visual_prompts) {
                              for (let j = 0; j < i; j++) {
                                if ((generatedScriptData.visual_prompts[j].block || 1) === blockNum) {
                                  assetIdx++;
                                }
                              }
                            }

                            const isUploaded = uploadedScenes[sceneNum] || (
                              config && 
                              config.timeline_assets && 
                              config.timeline_assets[blockKey] && 
                              config.timeline_assets[blockKey][assetIdx] &&
                              config.timeline_assets[blockKey][assetIdx].asset
                            );

                            

                            return (

                              <div key={i}>

                                {/* Block separator header */}

                                {isNewBlock && (

                                  <div className="flex items-center gap-3 mt-6 mb-3 first:mt-0">

                                    <div className="bg-gold-500 text-zinc-950 text-[10px] font-bold font-mono px-3 py-1 rounded-lg shrink-0">

                                      BLOCO {vp?.block || '?'}

                                    </div>

                                    <div className="flex-1 h-px bg-zinc-800"></div>

                                  </div>

                                )}

                                {/* Scene row: Narration + Prompt side by side */}

                                <div className={`flex gap-0 rounded-xl overflow-hidden border transition group ${isUploaded ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-zinc-900 hover:border-zinc-800'}`}>

                                  

                                  {/* LEFT: Scene number + Narration text */}

                                  <div className="flex-1 bg-zinc-950/60 p-4 flex gap-3 min-w-0">

                                    <div className="shrink-0 flex flex-col items-center gap-1">

                                      <span className={`font-mono text-[9px] font-bold ${isUploaded ? 'text-green-400' : 'text-zinc-500'}`}>{vp?.scene || sceneNum}</span>

                                      <div className={`w-2 h-2 rounded-full shrink-0 ${isUploaded ? 'bg-green-500' : isVideo ? 'bg-blue-500' : 'bg-gold-500'}`}></div>

                                      <div className="w-px flex-1 bg-zinc-800 group-last:hidden"></div>

                                    </div>

                                    <div className="min-w-0 flex-1 space-y-2">

                                      {/* Narration text - the main focus */}

                                      <p className="text-white text-xs leading-relaxed select-text font-sans">

                                        {vp?.narration_text || vp?.narration_excerpt || ''}

                                      </p>

                                      {/* Duration + Type badge */}

                                      <div className="flex items-center gap-2 flex-wrap">

                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${

                                          isVideo

                                            ? 'bg-blue-500/15 border border-blue-500/25 text-blue-400'

                                            : 'bg-gold-500/10 border border-gold-500/20 text-gold-500'

                                        }`}>

                                          {vp?.type || "imagem IA 2k"}

                                        </span>

                                        <span className="text-[9px] text-zinc-500 font-mono">{vp?.duration || ''}</span>

                                      </div>

                                    </div>

                                  </div>

                                  {/* RIGHT: Prompt + Actions */}

                                  <div className="w-[420px] shrink-0 bg-zinc-900/30 border-l border-zinc-900 p-4 flex flex-col gap-2">

                                    {/* Prompt text */}

                                    <p className="text-[10px] text-gray-400 leading-relaxed italic select-text line-clamp-3 font-sans" title={vp?.prompt || ''}>

                                      {vp?.prompt || ''}

                                    </p>

                                    

                                    {vp?.editor_notes && (

                                      <p className="text-[9px] text-zinc-500 leading-normal font-sans">{vp?.editor_notes}</p>

                                    )}

                                    {/* Action buttons row */}

                                    <div className="flex items-center gap-1.5 mt-auto pt-1">

                                      <button 

                                        onClick={() => copyToClipboard(vp?.prompt || '', `prompt-${i}`)}

                                        className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white px-2 py-1 rounded text-[8px] flex items-center gap-1 transition cursor-pointer"

                                      >

                                        {copiedSection === `prompt-${i}` ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}

                                        <span>{copiedSection === `prompt-${i}` ? 'OK' : 'Copiar'}</span>

                                      </button>

                                      <a href={`https://www.pexels.com/search/${isVideo ? "videos/" : ""}${encodeURIComponent(searchQuery)}`} target="_blank" rel="noopener noreferrer"

                                        className="bg-zinc-900 border border-zinc-800 text-[8px] text-zinc-400 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition cursor-pointer">

                                        <Search className="w-2.5 h-2.5 text-teal-400" /><span>Pexels</span>

                                      </a>

                                      <a href={isVideo ? `https://pixabay.com/videos/search/${encodeURIComponent(searchQuery)}/` : `https://pixabay.com/images/search/${encodeURIComponent(searchQuery)}/`} target="_blank" rel="noopener noreferrer"

                                        className="bg-zinc-900 border border-zinc-800 text-[8px] text-zinc-400 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition cursor-pointer">

                                        <Search className="w-2.5 h-2.5 text-green-400" /><span>Pixabay</span>

                                      </a>

                                      <a href={`https://www.canva.com/search?q=${encodeURIComponent(searchQuery)}`} target="_blank" rel="noopener noreferrer"

                                        className="bg-zinc-900 border border-zinc-800 text-[8px] text-zinc-400 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition cursor-pointer">

                                        <Search className="w-2.5 h-2.5 text-purple-400" /><span>Canva</span>

                                      </a>

                                      {/* Upload button */}

                                      <input type="file" accept={isVideo ? "video/mp4" : "image/png,image/jpeg,image/jpg"}
                                        onChange={(e) => { if (e.target.files && e.target.files[0]) { handleUploadSceneAsset(blockNum, isVideo ? "video" : "image", e.target.files[0], assetIdx); }}}
                                        className="hidden" id={`scene-upload-${i}`}

                                      />

                                      <label htmlFor={`scene-upload-${i}`}

                                        className={`border px-2 py-1 rounded text-[8px] flex items-center gap-1 transition cursor-pointer ml-auto ${isUploaded ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:text-green-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>

                                        {isUploaded ? <Check className="w-2.5 h-2.5 text-green-400" /> : <Upload className="w-2.5 h-2.5 text-gold-500" />}

                                        <span>{isUploaded ? 'Enviado' : 'Upload'}</span>

                                      </label>

                                    </div>

                                  </div>

                                </div>

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

                  {generatedScriptData.narrative_script_tagged && (

                    <div className="border-t border-zinc-900 pt-4 space-y-4">

                      <div className="flex justify-between items-center">

                        <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider font-cinzel flex items-center gap-2">

                          ROTEIRO COM TAGS VOCAIS (ElevenLabs / Minimax)

                        </span>

                        <button 

                          onClick={() => copyToClipboard(generatedScriptData.narrative_script_tagged || '', 'narrative_script_tagged')}

                          className="bg-zinc-900 border border-zinc-800 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"

                        >

                          {copiedSection === 'narrative_script_tagged' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}

                          <span>{copiedSection === 'narrative_script_tagged' ? 'Copiado!' : 'Copiar Versão com Tags'}</span>

                        </button>

                      </div>

                      <p className="text-[10px] text-zinc-500 leading-relaxed">

                        Esta versão contém tags de respiração, pausas e vocalizações geradas de acordo com o peso emocional de cada bloco do vídeo.

                      </p>

                      <pre className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl text-[10px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap select-text leading-relaxed">

                        {generatedScriptData.narrative_script_tagged}

                      </pre>

                    </div>

                  )}

                </div>

              )}

              </div>

            </div>

          )}

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

                    {hasApiKey ? (aiProvider === 'xai' ? 'xAI' : 'Gemini') : 'API'}

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

              <input

                type="text"

                placeholder="Ex: Financas, Notre_Dame, etc."

                value={newProjectName}

                onChange={(e) => setNewProjectName(e.target.value)}

                className="w-full bg-zinc-950 border border-zinc-855 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white"

                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}

                autoFocus

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
