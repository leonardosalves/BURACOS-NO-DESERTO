import { useState, useEffect, useRef } from "react";
import { 
  Folder, Plus, Play, CheckCircle, Video, Copy, Check, 
  Loader2, Terminal, FileText, Sparkles, RefreshCw, 
  FileVideo, ChevronRight, Info, AlertTriangle,
  MessageSquare, Send, X, Key, Trash2, Palette,
  Volume2, Music, Globe, Settings, Eye, Code, Image as ImageIcon,
  Sliders, UploadCloud, Radio, ExternalLink
} from "lucide-react";
import { ARCHITECTURES } from "./cinematicPrompt";
import CinematicGeneratorPage, { parseCinematicPrompts } from "./CinematicGeneratorPage";

interface RenderedVideo {
  filename: string;
  sizeBytes: number;
  modifiedAt: string;
}

interface Project {
  id: string;
  name: string;
  path: string;
  projectType: "remotion" | "hyperframe";
  hasConfig: boolean;
  stagesCount: number;
  videosCount: number;
  imagesCount: number;
  hasLogo: boolean;
  hasMusic: boolean;
  isReadyToRender: boolean;
  renderedVideo: RenderedVideo | null;
}

interface Stage {
  id: string;
  src: string;
  title: string;
  year?: string;
  durationInSeconds: number;
  startInSeconds: number;
  narrationText?: string;
  audioSrc?: string;
  subtitlesSrc?: string;
}

// Para projetos Hyperframe
interface HyperframeDetails {
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  config: any[]; // transcript.json
  images: string[];
}

interface ProjectDetails extends Project, Partial<HyperframeDetails> {
  config: Stage[];
  prompt: string;
  videos: string[];
  theme?: string;
  hasNarration?: boolean;
  hasCompare?: boolean;
  hasMusicSetting?: boolean;
  hasVideoSound?: boolean;
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  
  // Abas dinâmicas
  const [activeTabRemotion, setActiveTabRemotion] = useState<"timeline" | "upload" | "narration" | "seo" | "render">("timeline");
  const [activeTabHyperframe, setActiveTabHyperframe] = useState<"storyboard" | "upload" | "editor" | "narration" | "render">("storyboard");

  // Editores de Código Hyperframe
  const [editorHtml, setEditorHtml] = useState("");
  const [editorCss, setEditorCss] = useState("");
  const [editorJs, setEditorJs] = useState("");
  const [isSavingCode, setIsSavingCode] = useState(false);

  // Modais
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectType, setNewProjectType] = useState<"remotion" | "hyperframe">("remotion");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Uploads
  const [uploadStatus, setUploadStatus] = useState<{[key: string]: "idle" | "uploading" | "success" | "error"}>({});

  // Análise Python (Remotion)
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Renderização SSE
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState({ percent: 0 });
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [renderResult, setRenderResult] = useState<{ success: boolean; message: string } | null>(null);

  // Agente IA & Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3.5-flash");
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "Olá! Sou o assistente premium do Timelapse Studio. Posso gerar prompts Vimax, configurar TTS, analisar vídeos ou renderizar Hyperframe. O que gostaria de fazer?"
    }
  ]);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isCinematicActive, setIsCinematicActive] = useState(false);

  // Narração TTS
  const [voiceId, setVoiceId] = useState("pt-BR-AntonioNeural");
  const [voiceRate, setVoiceRate] = useState(0);
  const [stageNarrations, setStageNarrations] = useState<string[]>(["", "", "", "", ""]);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [isDraftingNarration, setIsDraftingNarration] = useState(false);
  const [audioTimestamp, setAudioTimestamp] = useState<number>(Date.now());

  // YouTube & SEO
  const [ytStatus, setYtStatus] = useState<{ authenticated: boolean; hasCredentials: boolean; channel: string | null }>({
    authenticated: false,
    hasCredentials: false,
    channel: null
  });
  const [isYtModalOpen, setIsYtModalOpen] = useState(false);
  const [ytClientId, setYtClientId] = useState("");
  const [ytClientSecret, setYtClientSecret] = useState("");
  const [ytRedirectUri, setYtRedirectUri] = useState("http://localhost:3002/api/youtube/callback");
  const [isSavingYtCreds, setIsSavingYtCreds] = useState(false);
  const [ytTitle, setYtTitle] = useState("");
  const [ytDescription, setYtDescription] = useState("");
  const [ytTags, setYtTags] = useState("");
  const [ytPrivacy, setYtPrivacy] = useState("private");
  const [isPublishingYt, setIsPublishingYt] = useState(false);
  const [aiSeoData, setAiSeoData] = useState<{ titles: string[]; description: string; tags: string } | null>(null);
  const [isOptimizingSeo, setIsOptimizingSeo] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const BACKEND_URL = "http://localhost:3002";

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        setIsBackendOnline(true);
      } else {
        setIsBackendOnline(false);
      }
    } catch (e) {
      setIsBackendOnline(false);
    }
  };

  const fetchYtStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/youtube/status`);
      if (res.ok) {
        setYtStatus(await res.json());
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchProjects();
    fetchYtStatus();
    const timer = setInterval(fetchProjects, 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) {
      setGeminiApiKey(savedKey);
    } else {
      setIsEditingApiKey(true);
    }
    const savedModel = localStorage.getItem("gemini_model");
    if (savedModel) {
      setGeminiModel(savedModel);
    }
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [renderLogs]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Carregar detalhes ao selecionar
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/projects/${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          setProjectDetails(data);
          
          if (data.projectType === "hyperframe") {
            setEditorHtml(data.htmlContent || "");
            setEditorCss(data.cssContent || "");
            setEditorJs(data.jsContent || "");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedProjectId]);

  useEffect(() => {
    if (projectDetails) {
      const savedNarrations = projectDetails.config.map(stage => stage.narrationText || stage.text || "");
      setStageNarrations(savedNarrations);
      setYtTitle(projectDetails.name + " Timelapse");
    } else {
      setStageNarrations(["", "", "", "", ""]);
      setYtTitle("");
    }
  }, [projectDetails]);

  // Criar Projeto via Modal
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreatingProject(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim(), projectType: newProjectType })
      });

      if (res.ok) {
        const data = await res.json();
        await fetchProjects();
        setSelectedProjectId(data.id);
        setIsNewProjectModalOpen(false);
        setNewProjectName("");
      } else {
        alert("Erro ao criar projeto.");
      }
    } catch (e) {
      alert("Erro ao conectar.");
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Excluir Projeto
  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const proj = projects.find(p => p.id === id);
    if (!proj) return;
    if (window.confirm(`Excluir permanentemente o projeto "${proj.name}"?`)) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/projects/${id}`, { method: "DELETE" });
        if (res.ok) {
          await fetchProjects();
          if (selectedProjectId === id) setSelectedProjectId("");
        }
      } catch (e) {
        alert("Erro ao excluir.");
      }
    }
  };

  // Salvar Configurações Remotion
  const handleSaveConfig = async (updatedConfig: Stage[]) => {
    if (!projectDetails) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectDetails.id}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
      if (res.ok) {
        setProjectDetails({ ...projectDetails, config: updatedConfig });
        alert("Configuração salva!");
      }
    } catch (err) {
      alert("Erro ao salvar.");
    }
  };

  // Salvar código Hyperframe
  const handleSaveHyperframeCode = async () => {
    if (!projectDetails) return;
    setIsSavingCode(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectDetails.id}/hyperframe/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlContent: editorHtml,
          cssContent: editorCss,
          jsContent: editorJs
        })
      });
      if (res.ok) {
        alert("Código salvo com sucesso!");
      }
    } catch (e) {
      alert("Erro ao salvar.");
    } finally {
      setIsSavingCode(false);
    }
  };

  // Rodar Análise Python
  const handleRunAnalysis = async () => {
    if (!projectDetails) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectDetails.id}/analyze`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setProjectDetails({ ...projectDetails, config: data.config });
        await fetchProjects();
        alert("Vídeos analisados com sucesso!");
      }
    } catch (e) {
      alert("Erro ao analisar.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Geração de Narração TTS
  const handleGenerateTTS = async () => {
    if (!projectDetails) return;
    setIsGeneratingNarration(true);
    try {
      const updatedConfig = projectDetails.config.map((stage, idx) => ({
        ...stage,
        narrationText: stageNarrations[idx],
        text: stageNarrations[idx]
      }));

      await fetch(`${BACKEND_URL}/api/projects/${projectDetails.id}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });

      const res = await fetch(`${BACKEND_URL}/api/projects/${projectDetails.id}/narration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice: voiceId,
          rate: `${voiceRate >= 0 ? "+" : ""}${voiceRate}%`,
          narrations: stageNarrations,
          engine: "edge"
        })
      });

      if (res.ok) {
        setAudioTimestamp(Date.now());
        alert("Narração gerada!");
      }
    } catch (e) {
      alert("Erro ao gerar áudio.");
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  // Rascunho com IA (Gemini)
  const handleDraftNarrationsWithAI = async () => {
    if (!projectDetails) return;
    if (!geminiApiKey) {
      alert("Chave Gemini API necessária.");
      return;
    }
    setIsDraftingNarration(true);
    try {
      const prompt = `Escreva 5 roteiros curtos de narração em português para o monumento "${projectDetails.name}". Cada parágrafo deve ser curto (1-2 frases). Retorne apenas os parágrafos sem cabeçalhos.`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
        }
      );
      if (res.ok) {
        const data = await res.json();
        const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const paragraphs = output.split(/\n\n+/).map((p: string) => p.trim()).filter((p: string) => p);
        if (paragraphs.length >= 5) {
          setStageNarrations(paragraphs.slice(0, 5));
        } else {
          alert("A IA gerou menos de 5 parágrafos. Copie manualmente do histórico.");
        }
      }
    } catch (e) {
      alert("Erro ao gerar roteiro.");
    } finally {
      setIsDraftingNarration(false);
    }
  };

  // Otimização SEO
  const handleOptimizeSeo = async () => {
    if (!projectDetails) return;
    setIsOptimizingSeo(true);
    try {
      const prompt = `Gere metadados de SEO para YouTube Shorts sobre "${projectDetails.name}". Retorne em formato JSON válido contendo exatamente as chaves: "titles" (array de 3 títulos curtos), "description" (texto descritivo com tags) e "tags" (string única com tags separadas por vírgula).`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );
      if (res.ok) {
        const data = await res.json();
        const output = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
        setAiSeoData(output);
        setYtTitle(output.titles?.[0] || "");
        setYtDescription(output.description || "");
        setYtTags(output.tags || "");
      }
    } catch (e) {
      alert("Erro no SEO.");
    } finally {
      setIsOptimizingSeo(false);
    }
  };

  // Upload genérico
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, targetFilename: string) => {
    const file = e.target.files?.[0];
    if (!file || !projectDetails) return;

    setUploadStatus(prev => ({ ...prev, [targetFilename]: "uploading" }));
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectDetails.id}/upload/${targetFilename}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: arrayBuffer
      });
      if (res.ok) {
        setUploadStatus(prev => ({ ...prev, [targetFilename]: "success" }));
        // Recarregar detalhes
        const detailsRes = await fetch(`${BACKEND_URL}/api/projects/${projectDetails.id}`);
        if (detailsRes.ok) setProjectDetails(await detailsRes.json());
      } else {
        setUploadStatus(prev => ({ ...prev, [targetFilename]: "error" }));
      }
    } catch (err) {
      setUploadStatus(prev => ({ ...prev, [targetFilename]: "error" }));
    }
  };

  // Disparar Renderização SSE
  const handleRenderVideo = () => {
    if (!projectDetails) return;

    setIsRendering(true);
    setRenderProgress({ percent: 0 });
    setRenderLogs([]);
    setRenderResult(null);

    const eventSource = new EventSource(`${BACKEND_URL}/api/projects/${projectDetails.id}/render`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "log") {
        setRenderLogs(prev => [...prev, data.text]);
      } else if (data.type === "progress") {
        setRenderProgress({ percent: data.percent });
      } else if (data.type === "done") {
        eventSource.close();
        setIsRendering(false);
        setRenderResult({ success: data.success, message: data.message });
        fetchProjects();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setIsRendering(false);
      setRenderResult({ success: false, message: "Conexão interrompida com o servidor de renderização." });
    };
  };

  // YouTube OAuth
  const handleYtAuth = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/youtube/auth-url`);
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, "Autenticação YouTube", "width=600,height=600");
      }
    } catch (e) {}
  };

  // Enviar para YouTube
  const handlePublishYt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectDetails) return;
    setIsPublishingYt(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectDetails.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ytTitle,
          description: ytDescription,
          tags: ytTags.split(",").map(t => t.trim()),
          privacyStatus: ytPrivacy
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Publicado com sucesso! Link: ${data.url}`);
      }
    } catch (e) {
      alert("Erro ao publicar.");
    } finally {
      setIsPublishingYt(false);
    }
  };

  // Chat com Assistente
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGeneratingResponse || !geminiApiKey) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsGeneratingResponse(true);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              ...chatMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
              { role: "user", parts: [{ text: userMsg }] }
            ]
          })
        }
      );
      if (res.ok) {
        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";
        setChatMessages(prev => [...prev, { role: "model", text: reply }]);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "model", text: "Erro ao consultar a API do Gemini." }]);
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#070709] overflow-hidden text-slate-100 font-outfit select-none">
      
      {/* SIDEBAR */}
      <div className="w-80 h-full bg-[#0a0a0f]/80 border-r border-white/5 flex flex-col min-w-[20rem]">
        <div className="p-6 border-b border-white/5 flex flex-col gap-1.5 shrink-0">
          <h1 className="font-cinzel text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 flex items-center gap-2">
            🏛️ STUDIO PREMIUM
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
              isBackendOnline ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? "bg-emerald-500" : "bg-red-500"}`} />
              Porta 3002
            </div>
            
            <button 
              onClick={() => {
                const key = window.prompt("Configure sua Gemini API Key:", geminiApiKey);
                if (key !== null) {
                  setGeminiApiKey(key);
                  localStorage.setItem("gemini_api_key", key);
                }
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                geminiApiKey ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              <Key className="w-3 h-3" />
              Gemini {geminiApiKey ? "OK" : "🔑"}
            </button>
          </div>
        </div>

        {/* LISTA DE PROJETOS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex justify-between items-center px-2 py-1 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Projetos no Workspace</span>
            <button 
              onClick={() => setIsNewProjectModalOpen(true)}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition cursor-pointer text-amber-500"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            {projects.map((proj) => {
              const isSelected = selectedProjectId === proj.id;
              const isHF = proj.projectType === "hyperframe";
              const badgeClass = isHF 
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
              const badgeText = isHF ? "Hyperframe" : "Remotion";

              return (
                <div 
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between gap-3 group cursor-pointer transition ${
                    isSelected 
                      ? "bg-slate-900 border-amber-500/30 text-white" 
                      : "bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-xs font-bold truncate pr-2 font-cinzel leading-relaxed">{proj.name}</span>
                    <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase border self-start ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteProject(proj.id, e)}
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RODAPÉ DO SIDEBAR */}
        <div className="p-4 border-t border-white/5 flex gap-2 shrink-0">
          <button 
            onClick={() => setIsCinematicActive(true)}
            className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-amber-500/10 transition cursor-pointer text-xs flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            Gerador Vimax
          </button>
          
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition cursor-pointer flex items-center justify-center text-slate-300"
            title="Chat Assistente"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PAINEL PRINCIPAL */}
      <div className="flex-1 h-full flex flex-col min-w-0">
        {projectDetails ? (
          <div className="flex-1 flex flex-col min-h-0">
            
            {/* CABEÇALHO DO PROJETO */}
            <div className="bg-[#0a0a0f]/40 border-b border-white/5 px-8 py-5 flex items-center justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-cinzel tracking-wide text-white truncate">{projectDetails.name}</h2>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${
                    projectDetails.projectType === "hyperframe" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  }`}>
                    {projectDetails.projectType.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{projectDetails.path}</p>
              </div>

              {/* TABS DE PROJETO */}
              <div className="flex bg-slate-950 border border-white/5 rounded-xl p-1 shrink-0">
                {projectDetails.projectType === "hyperframe" ? (
                  <>
                    <button 
                      onClick={() => setActiveTabHyperframe("storyboard")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTabHyperframe === "storyboard" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      Storyboard
                    </button>
                    <button 
                      onClick={() => setActiveTabHyperframe("upload")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTabHyperframe === "upload" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      Upload
                    </button>
                    <button 
                      onClick={() => setActiveTabHyperframe("editor")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTabHyperframe === "editor" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      Código
                    </button>
                    <button 
                      onClick={() => setActiveTabHyperframe("narration")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTabHyperframe === "narration" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      Narração
                    </button>
                    <button 
                      onClick={() => setActiveTabHyperframe("render")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTabHyperframe === "render" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      Render
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setActiveTabRemotion("timeline")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTabRemotion === "timeline" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      Timeline
                    </button>
                    <button 
                      onClick={() => setActiveTabRemotion("upload")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTabRemotion === "upload" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      Upload
                    </button>
                    <button 
                      onClick={() => setActiveTabRemotion("narration")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTabRemotion === "narration" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      Narração
                    </button>
                    <button 
                      onClick={() => setActiveTabRemotion("seo")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTabRemotion === "seo" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      SEO/YouTube
                    </button>
                    <button 
                      onClick={() => setActiveTabRemotion("render")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTabRemotion === "render" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      Render
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* CONTEÚDO PRINCIPAL ABAS - REMOTION */}
            {projectDetails.projectType === "remotion" && (
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                
                {/* ABA REMOTION: TIMELINE */}
                {activeTabRemotion === "timeline" && (
                  <div className="space-y-6 animate-scale-up">
                    <div className="flex justify-between items-center">
                      <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-indigo-500" />
                        Linha do Tempo das Etapas
                      </h3>
                      <button 
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
                      >
                        {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Analisar Clipes (Python)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {projectDetails.config.map((stage, idx) => (
                        <div key={idx} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3 glass-card">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[10px] font-bold text-indigo-400 font-mono">ETAPA {idx + 1}</span>
                            <span className="text-[10px] text-slate-500 font-mono font-bold">
                              {stage.durationInSeconds > 0 ? `${stage.durationInSeconds}s` : "Análise Pendente"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Título</label>
                            <input 
                              type="text"
                              value={stage.title}
                              onChange={(e) => {
                                const newConfig = [...projectDetails.config];
                                newConfig[idx].title = e.target.value;
                                setProjectDetails({ ...projectDetails, config: newConfig });
                              }}
                              className="w-full bg-slate-950 border border-white/5 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />

                            <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Ano de Época</label>
                            <input 
                              type="text"
                              placeholder="Ex: 1540"
                              value={stage.year || ""}
                              onChange={(e) => {
                                const newConfig = [...projectDetails.config];
                                newConfig[idx].year = e.target.value;
                                setProjectDetails({ ...projectDetails, config: newConfig });
                              }}
                              className="w-full bg-slate-950 border border-white/5 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-650"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => handleSaveConfig(projectDetails.config)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-5 py-3 rounded-xl transition cursor-pointer"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                )}

                {/* ABA REMOTION: UPLOAD */}
                {activeTabRemotion === "upload" && (
                  <div className="space-y-6 animate-scale-up">
                    <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-indigo-500" />
                      Importação de Clipes e Artefatos
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Upload de vídeos */}
                      <div className="col-span-2 space-y-4">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Carregar clipes de vídeo (1.mp4 a 5.mp4)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[1, 2, 3, 4, 5].map((num) => {
                            const filename = `${num}.mp4`;
                            const status = uploadStatus[filename];
                            const exists = projectDetails.videos.includes(filename);

                            return (
                              <div key={num} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <span className="text-xs font-bold font-mono text-white block">{filename}</span>
                                  <span className="text-[10px] text-slate-500">{exists ? "Arquivo no servidor ✓" : "Pendente de upload"}</span>
                                </div>
                                <label className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/25 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1 shrink-0">
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  <span>{status === "uploading" ? "Enviando..." : "Selecionar"}</span>
                                  <input 
                                    type="file" 
                                    accept="video/mp4" 
                                    onChange={(e) => handleUploadFile(e, filename)} 
                                    className="hidden" 
                                  />
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Outros assets */}
                      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-4">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Artefatos do Projeto</h4>
                        
                        {/* Logo */}
                        <div className="space-y-2 border-b border-white/5 pb-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold">Logotipo (logo.png)</span>
                            <span className="text-[9px] text-slate-500">{projectDetails.hasLogo ? "Encontrado ✓" : "Não encontrado"}</span>
                          </div>
                          <label className="w-full bg-slate-950 hover:bg-slate-900 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-slate-400 text-xs transition">
                            <UploadCloud className="w-5 h-5 text-indigo-500" />
                            <span>Carregar logo.png</span>
                            <input 
                              type="file" 
                              accept="image/png" 
                              onChange={(e) => handleUploadFile(e, "logo.png")} 
                              className="hidden" 
                            />
                          </label>
                        </div>

                        {/* Música */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold">Música (ambient.mp3)</span>
                            <span className="text-[9px] text-slate-500">{projectDetails.hasMusic ? "Encontrado ✓" : "Não encontrado"}</span>
                          </div>
                          <label className="w-full bg-slate-950 hover:bg-slate-900 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-slate-400 text-xs transition">
                            <UploadCloud className="w-5 h-5 text-indigo-500" />
                            <span>Carregar ambient.mp3</span>
                            <input 
                              type="file" 
                              accept="audio/mpeg" 
                              onChange={(e) => handleUploadFile(e, "ambient.mp3")} 
                              className="hidden" 
                            />
                          </label>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* ABA REMOTION: NARRAÇÃO */}
                {activeTabRemotion === "narration" && (
                  <div className="space-y-6 animate-scale-up">
                    <div className="flex justify-between items-center">
                      <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-indigo-500" />
                        Geração de Narração Neural (TTS)
                      </h3>
                      <button 
                        onClick={handleDraftNarrationsWithAI}
                        disabled={isDraftingNarration}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                      >
                        {isDraftingNarration ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Sugerir Roteiro com Gemini
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {[0, 1, 2, 3, 4].map((idx) => (
                          <div key={idx} className="space-y-1.5">
                            <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Roteiro Etapa {idx + 1}</label>
                            <textarea 
                              rows={2}
                              value={stageNarrations[idx]}
                              onChange={(e) => {
                                const newNarrations = [...stageNarrations];
                                newNarrations[idx] = e.target.value;
                                setStageNarrations(newNarrations);
                              }}
                              className="w-full bg-slate-900/60 border border-white/5 focus:border-indigo-500 focus:outline-none rounded-xl p-3 text-xs text-white placeholder-slate-600"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 space-y-6">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Parâmetros de Síntese</h4>
                        
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Voz (Neural Edge)</label>
                            <select 
                              value={voiceId}
                              onChange={(e) => setVoiceId(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-350"
                            >
                              <option value="pt-BR-AntonioNeural">pt-BR - Antônio (Masculino)</option>
                              <option value="pt-BR-FranciscaNeural">pt-BR - Francisca (Feminino)</option>
                              <option value="pt-PT-DuarteNeural">pt-PT - Duarte (Portugal)</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold font-mono text-slate-400">
                              <span>VELOCIDADE</span>
                              <span>{voiceRate >= 0 ? `+${voiceRate}%` : `${voiceRate}%`}</span>
                            </div>
                            <input 
                              type="range"
                              min="-30"
                              max="30"
                              value={voiceRate}
                              onChange={(e) => setVoiceRate(parseInt(e.target.value))}
                              className="w-full accent-indigo-500"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={handleGenerateTTS}
                          disabled={isGeneratingNarration}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isGeneratingNarration && <Loader2 className="w-4 h-4 animate-spin" />}
                          <span>Gerar Áudio da Narração</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA REMOTION: SEO */}
                {activeTabRemotion === "seo" && (
                  <div className="space-y-6 animate-scale-up">
                    <div className="flex justify-between items-center">
                      <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-500" />
                        Otimizador SEO e Upload YouTube
                      </h3>
                      <button 
                        onClick={handleOptimizeSeo}
                        disabled={isOptimizingSeo}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                      >
                        {isOptimizingSeo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Otimizar Metadados com IA
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <form onSubmit={handlePublishYt} className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-mono">Publicação no YouTube Shorts</h4>
                        
                        <div className="space-y-1.5">
                          <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Título do Vídeo</label>
                          <input 
                            type="text"
                            required
                            value={ytTitle}
                            onChange={(e) => setYtTitle(e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/5 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Descrição</label>
                          <textarea 
                            rows={6}
                            value={ytDescription}
                            onChange={(e) => setYtDescription(e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/5 focus:border-indigo-500 rounded-xl p-3 text-xs text-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Tags (separadas por vírgula)</label>
                          <input 
                            type="text"
                            value={ytTags}
                            onChange={(e) => setYtTags(e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/5 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white"
                          />
                        </div>

                        <div className="flex gap-4">
                          <div className="space-y-1.5 flex-1">
                            <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Privacidade</label>
                            <select 
                              value={ytPrivacy} 
                              onChange={(e) => setYtPrivacy(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-350"
                            >
                              <option value="private">Privado</option>
                              <option value="unlisted">Não Listado</option>
                              <option value="public">Público</option>
                            </select>
                          </div>

                          <div className="space-y-2 self-end">
                            {ytStatus.authenticated ? (
                              <button 
                                type="submit" 
                                disabled={isPublishingYt}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-xs font-bold px-6 py-3 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                              >
                                {isPublishingYt && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Publicar no Canal
                              </button>
                            ) : (
                              <button 
                                type="button" 
                                onClick={handleYtAuth}
                                className="bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold px-6 py-3 rounded-xl transition cursor-pointer"
                              >
                                Autenticar YouTube
                              </button>
                            )}
                          </div>
                        </div>
                      </form>

                      {/* Resultados da Otimização */}
                      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 space-y-4">
                        <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-mono">Sugestões da IA</h4>
                        {aiSeoData ? (
                          <div className="space-y-4 text-xs">
                            <div className="space-y-2">
                              <span className="block text-[9.5px] font-bold text-slate-400 uppercase font-mono">Títulos Sugeridos</span>
                              {aiSeoData.titles.map((t, i) => (
                                <div key={i} className="flex justify-between items-center bg-slate-950/80 p-2.5 rounded-lg border border-white/3 font-medium">
                                  <span>{t}</span>
                                  <button onClick={() => { setYtTitle(t); alert("Título aplicado!"); }} className="text-indigo-400 hover:text-indigo-300 font-bold shrink-0">Aplicar</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 leading-relaxed">Clique no botão superior "Otimizar Metadados com IA" para gerar títulos descritivos acurados e hashtags adequadas para o Shorts.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA REMOTION: RENDER */}
                {activeTabRemotion === "render" && (
                  <div className="space-y-6 animate-scale-up">
                    <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-indigo-500" />
                      Painel de Compilação
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                      
                      {/* Logs e Ações */}
                      <div className="col-span-2 space-y-4">
                        <div className="flex gap-3">
                          <button 
                            onClick={handleRenderVideo}
                            disabled={isRendering}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold px-6 py-3.5 rounded-xl transition cursor-pointer flex items-center gap-2"
                          >
                            {isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            <span>Renderizar Vídeo final (Remotion)</span>
                          </button>
                        </div>

                        {/* Terminal Logs */}
                        <div className="bg-slate-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-96">
                          <div className="bg-slate-900 px-4 py-2 border-b border-white/5 flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">TERMINAL LOGS</span>
                            {isRendering && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                          </div>
                          
                          <div className="flex-1 p-5 overflow-y-auto font-mono text-[11px] text-slate-350 space-y-1">
                            {renderLogs.map((log, index) => (
                              <div key={index}>{log}</div>
                            ))}
                            <div ref={logsEndRef} />
                          </div>
                        </div>

                        {/* Barra de Progresso */}
                        {isRendering && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
                              <span>PROGRESSO DO COMPILADOR</span>
                              <span>{renderProgress.percent}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-900 border border-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${renderProgress.percent}%` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Vídeo Renderizado */}
                      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-4">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Mídia Renderizada</h4>
                        {projectDetails.renderedVideo ? (
                          <div className="space-y-4">
                            <video 
                              key={audioTimestamp}
                              src={`${BACKEND_URL}/api/projects/${projectDetails.id}/video`}
                              controls
                              className="w-full rounded-xl border border-white/5 aspect-[9/16] bg-black"
                            />
                            <div className="space-y-1.5 text-xs text-slate-400">
                              <div className="flex justify-between"><span className="font-mono">Tamanho:</span> <span>{(projectDetails.renderedVideo.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span></div>
                              <div className="flex justify-between"><span className="font-mono">Compilação:</span> <span>{new Date(projectDetails.renderedVideo.modifiedAt).toLocaleString()}</span></div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-20 text-slate-500 text-xs">Aguardando primeira renderização do monumento.</div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

              </div>
            )}

            {/* CONTEÚDO PRINCIPAL ABAS - HYPERFRAME */}
            {projectDetails.projectType === "hyperframe" && (
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                
                {/* ABA HYPERFRAME: STORYBOARD */}
                {activeTabHyperframe === "storyboard" && (
                  <div className="space-y-6 animate-scale-up">
                    <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-amber-500" />
                      Storyboard e Cenas do Hyperframe
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {projectDetails.config.map((scene, idx) => (
                        <div key={idx} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3 glass-card">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[10px] font-bold text-amber-400 font-mono">CENA {idx + 1}</span>
                            <span className="text-[10px] text-slate-500 font-mono font-bold">{scene.duration || 5}s</span>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Título do Slide</label>
                            <input 
                              type="text"
                              value={scene.title || ""}
                              onChange={(e) => {
                                const newConfig = [...projectDetails.config];
                                newConfig[idx].title = e.target.value;
                                setProjectDetails({ ...projectDetails, config: newConfig });
                              }}
                              className="w-full bg-slate-950 border border-white/5 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />

                            <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Texto Legenda</label>
                            <textarea 
                              rows={3}
                              value={scene.text || ""}
                              onChange={(e) => {
                                const newConfig = [...projectDetails.config];
                                newConfig[idx].text = e.target.value;
                                setProjectDetails({ ...projectDetails, config: newConfig });
                              }}
                              className="w-full bg-slate-950 border border-white/5 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white resize-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => handleSaveConfig(projectDetails.config)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-5 py-3 rounded-xl transition cursor-pointer"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                )}

                {/* ABA HYPERFRAME: UPLOAD */}
                {activeTabHyperframe === "upload" && (
                  <div className="space-y-6 animate-scale-up">
                    <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-amber-500" />
                      Importação de Imagens e Trilhas (Hyperframe)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="col-span-2 space-y-4">
                        <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-mono">Imagens de fundo (1.jpg a 5.jpg)</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[1, 2, 3, 4, 5].map((num) => {
                            const filename = `${num}.jpg`;
                            const status = uploadStatus[filename];
                            const exists = projectDetails.images?.includes(filename);

                            return (
                              <div key={num} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <span className="text-xs font-bold font-mono text-white block">{filename}</span>
                                  <span className="text-[10px] text-slate-500">{exists ? "Arquivo no servidor ✓" : "Pendente"}</span>
                                </div>
                                <label className="bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/25 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1 shrink-0">
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  <span>{status === "uploading" ? "Enviando..." : "Selecionar"}</span>
                                  <input 
                                    type="file" 
                                    accept="image/jpeg" 
                                    onChange={(e) => handleUploadFile(e, filename)} 
                                    className="hidden" 
                                  />
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-4">
                        <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-mono">Fundo Musical</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold">Música (music.mp3)</span>
                            <span className="text-[9px] text-slate-500">{projectDetails.hasMusic ? "Encontrada ✓" : "Não encontrada"}</span>
                          </div>
                          <label className="w-full bg-slate-950 hover:bg-slate-900 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-slate-400 text-xs transition">
                            <UploadCloud className="w-5 h-5 text-amber-500" />
                            <span>Carregar music.mp3</span>
                            <input 
                              type="file" 
                              accept="audio/mpeg" 
                              onChange={(e) => handleUploadFile(e, "music.mp3")} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA HYPERFRAME: EDITOR DE CÓDIGO */}
                {activeTabHyperframe === "editor" && (
                  <div className="space-y-6 animate-scale-up">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                        <Code className="w-5 h-5 text-amber-500" />
                        Editor de Código Hyperframe (HTML/CSS/JS)
                      </h3>
                      <button 
                        onClick={handleSaveHyperframeCode}
                        disabled={isSavingCode}
                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
                      >
                        {isSavingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Salvar Código
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                      
                      <div className="flex flex-col h-full bg-slate-950 border border-white/5 rounded-2xl overflow-hidden">
                        <span className="bg-slate-900/60 px-4 py-2 border-b border-white/5 text-[10px] font-mono font-bold text-slate-400">index.html</span>
                        <textarea 
                          value={editorHtml}
                          onChange={(e) => setEditorHtml(e.target.value)}
                          className="flex-1 p-4 bg-transparent font-mono text-[11px] text-emerald-400 focus:outline-none resize-none"
                        />
                      </div>

                      <div className="flex flex-col h-full bg-slate-950 border border-white/5 rounded-2xl overflow-hidden">
                        <span className="bg-slate-900/60 px-4 py-2 border-b border-white/5 text-[10px] font-mono font-bold text-slate-400">style.css</span>
                        <textarea 
                          value={editorCss}
                          onChange={(e) => setEditorCss(e.target.value)}
                          className="flex-1 p-4 bg-transparent font-mono text-[11px] text-amber-400 focus:outline-none resize-none"
                        />
                      </div>

                      <div className="flex flex-col h-full bg-slate-950 border border-white/5 rounded-2xl overflow-hidden">
                        <span className="bg-slate-900/60 px-4 py-2 border-b border-white/5 text-[10px] font-mono font-bold text-slate-400">animation.js</span>
                        <textarea 
                          value={editorJs}
                          onChange={(e) => setEditorJs(e.target.value)}
                          className="flex-1 p-4 bg-transparent font-mono text-[11px] text-indigo-400 focus:outline-none resize-none"
                        />
                      </div>

                    </div>
                  </div>
                )}

                {/* ABA HYPERFRAME: NARRAÇÃO */}
                {activeTabHyperframe === "narration" && (
                  <div className="space-y-6 animate-scale-up">
                    <div className="flex justify-between items-center">
                      <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-amber-500" />
                        Geração de Narração Neural (Hyperframe)
                      </h3>
                      <button 
                        onClick={handleDraftNarrationsWithAI}
                        disabled={isDraftingNarration}
                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                      >
                        {isDraftingNarration ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Sugerir Roteiro com Gemini
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {[0, 1, 2, 3, 4].map((idx) => (
                          <div key={idx} className="space-y-1.5">
                            <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Texto do Slide {idx + 1}</label>
                            <textarea 
                              rows={2}
                              value={stageNarrations[idx]}
                              onChange={(e) => {
                                const newNarrations = [...stageNarrations];
                                newNarrations[idx] = e.target.value;
                                setStageNarrations(newNarrations);
                              }}
                              className="w-full bg-slate-900/60 border border-white/5 focus:border-amber-500 focus:outline-none rounded-xl p-3 text-xs text-white placeholder-slate-600"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 space-y-6">
                        <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-mono">Configurações de Áudio</h4>
                        
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Voz (Neural Edge)</label>
                            <select 
                              value={voiceId}
                              onChange={(e) => setVoiceId(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 focus:border-amber-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-350"
                            >
                              <option value="pt-BR-AntonioNeural">pt-BR - Antônio (Masculino)</option>
                              <option value="pt-BR-FranciscaNeural">pt-BR - Francisca (Feminino)</option>
                              <option value="pt-PT-DuarteNeural">pt-PT - Duarte (Portugal)</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold font-mono text-slate-400">
                              <span>VELOCIDADE DE LEITURA</span>
                              <span>{voiceRate >= 0 ? `+${voiceRate}%` : `${voiceRate}%`}</span>
                            </div>
                            <input 
                              type="range"
                              min="-30"
                              max="30"
                              value={voiceRate}
                              onChange={(e) => setVoiceRate(parseInt(e.target.value))}
                              className="w-full accent-amber-500"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={handleGenerateTTS}
                          disabled={isGeneratingNarration}
                          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isGeneratingNarration && <Loader2 className="w-4 h-4 animate-spin" />}
                          <span>Gerar Narração Unificada (narration.mp3)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA HYPERFRAME: RENDER */}
                {activeTabHyperframe === "render" && (
                  <div className="space-y-6 animate-scale-up">
                    <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-amber-500" />
                      Compilação Hyperframe
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                      
                      <div className="col-span-2 space-y-4">
                        <button 
                          onClick={handleRenderVideo}
                          disabled={isRendering}
                          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold px-6 py-3.5 rounded-xl transition cursor-pointer flex items-center gap-2"
                        >
                          {isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          <span>Renderizar Vídeo final (Hyperframe)</span>
                        </button>

                        <div className="bg-slate-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-96">
                          <div className="bg-slate-900 px-4 py-2 border-b border-white/5 flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">HYPERFRAME OUTPUT</span>
                            {isRendering && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                          </div>
                          
                          <div className="flex-1 p-5 overflow-y-auto font-mono text-[11px] text-slate-350 space-y-1">
                            {renderLogs.map((log, index) => (
                              <div key={index}>{log}</div>
                            ))}
                            <div ref={logsEndRef} />
                          </div>
                        </div>

                        {isRendering && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
                              <span>PROGRESSO DA RENDERIZAÇÃO</span>
                              <span>{renderProgress.percent}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-900 border border-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${renderProgress.percent}%` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-4">
                        <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-mono">Vídeo Renderizado</h4>
                        {projectDetails.renderedVideo ? (
                          <div className="space-y-4">
                            <video 
                              key={audioTimestamp}
                              src={`${BACKEND_URL}/api/projects/${projectDetails.id}/video`}
                              controls
                              className="w-full rounded-xl border border-white/5 aspect-[9/16] bg-black"
                            />
                            <div className="space-y-1.5 text-xs text-slate-400">
                              <div className="flex justify-between"><span className="font-mono">Tamanho:</span> <span>{(projectDetails.renderedVideo.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span></div>
                              <div className="flex justify-between"><span className="font-mono">Compilação:</span> <span>{new Date(projectDetails.renderedVideo.modifiedAt).toLocaleString()}</span></div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-20 text-slate-500 text-xs">Nenhum vídeo compilado encontrado.</div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#09090b]">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-500 shadow-2xl mb-5">
              <Folder className="w-7 h-7" />
            </div>
            <h2 className="font-cinzel text-lg font-bold text-white tracking-wide">Timelapse & Hyperframe Studio</h2>
            <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed font-medium">Selecione um projeto na barra lateral para editar a linha do tempo, carregar mídias, gerar narrações com inteligência artificial e compilar o vídeo final.</p>
          </div>
        )}
      </div>

      {/* DRAWER DO ASSISTENTE DE IA */}
      {isChatOpen && (
        <div className="w-96 h-full bg-[#0a0a0f] border-l border-white/5 flex flex-col min-w-[24rem] animate-fade-in z-45 shadow-2xl">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-200 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              CHAT COM ASSISTENTE IA
            </span>
            <button 
              onClick={() => setIsChatOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col bg-slate-950/20">
            {chatMessages.map((msg, index) => (
              <div 
                key={index}
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-amber-500/10 border border-amber-500/20 text-slate-100 self-end rounded-tr-none"
                    : "bg-slate-900/60 border border-white/5 text-slate-200 self-start rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 flex gap-2">
            <input 
              type="text"
              placeholder="Digite sua mensagem para a IA..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-white/5 focus:border-amber-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white placeholder-slate-650"
            />
            <button 
              type="submit" 
              className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold cursor-pointer transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* TELA INTEIRA: GERADOR CINEMATIC DEStoryboards */}
      {isCinematicActive && (
        <div className="fixed inset-0 z-50 flex flex-col animate-scale-up bg-[#070709]">
          <div className="bg-[#0a0a0f]/90 border-b border-white/5 px-8 py-4 flex items-center justify-between">
            <span className="font-cinzel text-sm font-black tracking-widest text-amber-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse" />
              PAINEL VIMAX AI GERADOR
            </span>
            <button 
              onClick={() => {
                setIsCinematicActive(false);
                fetchProjects();
              }}
              className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl hover:bg-slate-700 font-bold text-xs cursor-pointer transition flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Fechar Painel
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <CinematicGeneratorPage 
              geminiApiKey={geminiApiKey}
              geminiModel={geminiModel}
              fetchProjects={fetchProjects}
              BACKEND_URL={BACKEND_URL}
              projects={projects}
            />
          </div>
        </div>
      )}

      {/* MODAL CRIAR PROJETO RAPIDO */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-black/85 flex justify-center items-center p-4 z-50 animate-fade-in backdrop-blur-md">
          <div className="bg-[#0f0f15] border border-white/5 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-cinzel text-base font-bold text-white tracking-wide">Novo Projeto</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Crie uma nova estrutura na raiz do timelapse.</p>
              </div>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-widest mb-1.5 font-mono">Nome da Pasta</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Taj Mahal"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 focus:border-amber-500 focus:outline-none rounded-xl px-3.5 py-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-widest mb-1.5 font-mono">Tecnologia do Vídeo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewProjectType("remotion")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition ${
                      newProjectType === "remotion"
                        ? "bg-indigo-600/15 border-indigo-500 text-indigo-200"
                        : "bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/10"
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span className="text-[9.5px] font-bold">Remotion</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewProjectType("hyperframe")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition ${
                      newProjectType === "hyperframe"
                        ? "bg-amber-600/15 border-amber-500 text-amber-200"
                        : "bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/10"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-[9.5px] font-bold">Hyperframe</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button 
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 font-bold px-3 py-2 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isCreatingProject}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 text-xs font-bold px-5 py-3 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  {isCreatingProject && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Criar Projeto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
