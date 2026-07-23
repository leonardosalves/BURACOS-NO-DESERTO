import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Clapperboard,
  Layers,
  BarChart3,
  Type,
  Image,
  Check,
  X,
  Sparkles,
  Film,
  LayoutGrid,
  Play,
  Terminal,
  RefreshCw,
  Eye,
  Download,
} from "lucide-react";

interface AgentMessage {
  role: "user" | "agent" | "system";
  content: string;
  phase?: string;
  suggestions?: string[];
  command?: string;
  output?: string;
  previewUrl?: string;
}

interface StoryboardFrame {
  id: string;
  time: string;
  title: string;
  description: string;
  type: string;
  status: "proposed" | "approved" | "rejected" | "built";
}

interface GraphicsIdea {
  id: string;
  sceneTitle: string;
  type: string;
  description: string;
  data_hint: string;
  status: "suggested" | "approved" | "rejected";
}

type HfStatus = "idle" | "init" | "lint" | "preview" | "render" | "error";

const SUGGESTIONS_INITIAL = [
  "npx hyperframes init",
  "Analisar storyboard e sugerir gráficos",
  "Companion mode: dirigir passo a passo",
  "npx hyperframes doctor",
];

export default function VideoAgentPage({
  activeProject,
  getProjectUrl,
}: {
  activeProject: string | null;
  getProjectUrl: (path: string) => string;
}) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      role: "agent",
      content:
        "Video Agent pronto. Uso o HyperFrames CLI real (npx hyperframes) para criar, validar e renderizar composições HTML → vídeo.\n\nComandos disponíveis:\n• init — scaffold de composição\n• lint — validar estrutura\n• inspect — inspeção visual\n• preview — preview no browser\n• render — renderizar MP4/WebM\n\nO que vamos criar?",
      suggestions: SUGGESTIONS_INITIAL,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hfStatus, setHfStatus] = useState<HfStatus>("idle");
  const [storyboard, setStoryboard] = useState<StoryboardFrame[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [graphicsIdeas, setGraphicsIdeas] = useState<GraphicsIdea[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeProject) return;
    const resolveUrl =
      typeof getProjectUrl === "function"
        ? getProjectUrl
        : (path: string) => path;

    fetch(resolveUrl("/api/video-agent/storyboard"))
      .then((res) => res.json())
      .then((data) => {
        if (
          data?.ok &&
          Array.isArray(data.storyboard) &&
          data.storyboard.length > 0
        ) {
          setStoryboard(data.storyboard);
        }
      })
      .catch(() => {});
  }, [activeProject, getProjectUrl]);

  const selectedSceneObj =
    storyboard.find((f) => f.id === selectedSceneId) || null;

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg: AgentMessage = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setHfStatus("idle");

      try {
        const resolveUrl =
          typeof getProjectUrl === "function"
            ? getProjectUrl
            : (path: string) => path;
        const approvedSb = Array.isArray(storyboard)
          ? storyboard.filter((f) => f?.status === "approved")
          : [];
        const approvedGi = Array.isArray(graphicsIdeas)
          ? graphicsIdeas.filter((g) => g?.status === "approved")
          : [];

        const res = await fetch(resolveUrl("/api/video-agent/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            project: activeProject,
            selected_scene: selectedSceneObj,
            storyboard: approvedSb,
            graphics_ideas: approvedGi,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data) {
          const errMsg =
            data?.error ||
            data?.message ||
            `Erro de conexão com o servidor (HTTP ${res.status}).`;
          setMessages((prev) => [
            ...prev,
            { role: "agent", content: `❌ ${errMsg}` },
          ]);
          setHfStatus("error");
          return;
        }

        if (data.hf_status) setHfStatus(data.hf_status);
        if (Array.isArray(data.storyboard)) setStoryboard(data.storyboard);
        if (Array.isArray(data.graphics_ideas))
          setGraphicsIdeas(data.graphics_ideas);
        if (data.preview_url) setPreviewUrl(data.preview_url);

        const agentMsg: AgentMessage = {
          role: "agent",
          content: data.reply || data.error || "Feito.",
          suggestions: data.suggestions,
          command: data.command,
          output: data.output,
          previewUrl: data.preview_url,
        };
        setMessages((prev) => [...prev, agentMsg]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            content: `Erro ao conectar com o backend: ${err?.message || "Serviço indisponível"}. Verifique se o LumieraBackend na porta 3005 está rodando.`,
          },
        ]);
        setHfStatus("error");
      } finally {
        setLoading(false);
      }
    },
    [loading, activeProject, storyboard, graphicsIdeas, getProjectUrl]
  );

  const updateFrameStatus = (id: string, status: "approved" | "rejected") => {
    setStoryboard((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status } : f))
    );
  };

  const updateGraphicsStatus = (
    id: string,
    status: "approved" | "rejected"
  ) => {
    setGraphicsIdeas((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status } : g))
    );
  };

  return (
    <div className="flex h-full min-h-0 divide-x divide-gray-800">
      {/* 1. Chat Panel (Left) */}
      <div className="flex flex-[1.2] flex-col min-w-[320px]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white">
              Video Agent · HyperFrames
            </h2>
            <p className="text-xs text-gray-400">
              {activeProject || "Selecione um projeto"}
            </p>
          </div>
          <HfStatusBadge status={hfStatus} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700"
                }`}
              >
                {msg.role === "agent" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Bot size={14} className="text-violet-400" />
                    <span className="text-xs font-medium text-violet-300">
                      Video Agent
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {msg.command && (
                  <div className="mt-2 rounded-lg bg-gray-900 p-2.5 font-mono text-xs text-emerald-400 border border-gray-700/50">
                    <div className="text-[10px] text-gray-500 mb-1">
                      &gt;_ COMANDO
                    </div>
                    {msg.command}
                  </div>
                )}

                {msg.output && (
                  <div className="mt-2 rounded-lg bg-gray-950 p-2.5 font-mono text-[11px] text-gray-400 max-h-40 overflow-y-auto border border-gray-800">
                    <pre className="whitespace-pre-wrap">{msg.output}</pre>
                  </div>
                )}

                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-gray-700/50">
                    {msg.suggestions.map((sug, j) => (
                      <button
                        key={j}
                        onClick={() => sendMessage(sug)}
                        className="px-2.5 py-1 rounded-lg bg-gray-700/60 hover:bg-violet-600/30 hover:border-violet-500/50 border border-gray-600/40 text-xs text-violet-200 transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  Executando HyperFrames...
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={
                selectedSceneObj
                  ? `Digite a instrução para a Cena ${selectedSceneObj.id}...`
                  : "Descreva o vídeo ou digite um comando HyperFrames..."
              }
              rows={2}
              className="flex-1 resize-none rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Middle Scene Preview Player */}
      <ScenePreviewPanel
        selectedScene={selectedSceneObj}
        previewUrl={previewUrl}
        hfStatus={hfStatus}
        onSendMessage={sendMessage}
        graphicsIdeas={graphicsIdeas}
      />

      {/* 3. Storyboard + Graphics Panel (Right) */}
      <div className="w-[320px] shrink-0 flex flex-col min-h-0 bg-gray-900/30">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid size={14} className="text-violet-400" />
            <span className="text-xs font-medium text-gray-300">
              Storyboard · HyperFrames
            </span>
          </div>
          {selectedSceneObj && (
            <span className="px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/40 text-[10px] font-medium">
              Cena {selectedSceneObj.id} selecionada
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {storyboard.length === 0 && graphicsIdeas.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Film size={32} className="text-gray-600 mb-3" />
              <p className="text-xs text-gray-500">
                O storyboard aparecerá aqui quando o Video Agent propor a
                estrutura da composição HyperFrames.
              </p>
            </div>
          )}

          {storyboard.map((frame) => {
            const isSelected = selectedSceneId === frame.id;
            return (
              <div
                key={frame.id}
                onClick={() => setSelectedSceneId(isSelected ? null : frame.id)}
                className={`rounded-lg border p-3 transition-all cursor-pointer relative ${
                  isSelected
                    ? "border-violet-500 bg-violet-950/40 ring-2 ring-violet-500/50 shadow-md shadow-violet-950/50"
                    : frame.status === "approved"
                      ? "border-emerald-600/40 bg-emerald-900/10 hover:border-emerald-500/60"
                      : frame.status === "rejected"
                        ? "border-red-600/30 bg-red-900/10 opacity-50"
                        : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-violet-600 text-white text-[9px] font-bold tracking-wider shadow">
                    SELECIONADA
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <FrameIcon type={frame.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white truncate">
                        {frame.title}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {frame.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 mt-0.5 line-clamp-2">
                      {frame.description}
                    </p>
                  </div>
                  {frame.status === "proposed" && (
                    <div
                      className="flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => updateFrameStatus(frame.id, "approved")}
                        className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => updateFrameStatus(frame.id, "rejected")}
                        className="p-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {frame.status === "approved" && !isSelected && (
                    <Check size={14} className="text-emerald-400 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}

          {graphicsIdeas.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={13} className="text-amber-400" />
                <span className="text-xs font-medium text-gray-300">
                  Gráficos & Overlays
                </span>
              </div>
              {graphicsIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className={`rounded-lg border p-3 mb-2 ${
                    idea.status === "approved"
                      ? "border-amber-600/40 bg-amber-900/10"
                      : idea.status === "rejected"
                        ? "border-red-600/30 opacity-50"
                        : "border-gray-700 bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <BarChart3
                      size={13}
                      className="text-amber-400 mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-white">
                        {idea.sceneTitle}
                      </span>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {idea.description}
                      </p>
                      <p className="text-[10px] text-amber-400/70 mt-1 italic">
                        {idea.data_hint}
                      </p>
                    </div>
                    {idea.status === "suggested" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            updateGraphicsStatus(idea.id, "approved")
                          }
                          className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() =>
                            updateGraphicsStatus(idea.id, "rejected")
                          }
                          className="p-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-3 border-t border-gray-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => sendMessage("npx hyperframes lint")}
              className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-violet-500/50 hover:text-violet-200 flex items-center justify-center gap-1.5"
            >
              <Check size={12} /> Lint
            </button>
            <button
              onClick={() => sendMessage("npx hyperframes preview")}
              className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-violet-500/50 hover:text-violet-200 flex items-center justify-center gap-1.5"
            >
              <Play size={12} /> Preview
            </button>
            <button
              onClick={() =>
                sendMessage("npx hyperframes render --quality standard")
              }
              className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-violet-500/50 hover:text-violet-200 flex items-center justify-center gap-1.5"
            >
              <Film size={12} /> Render
            </button>
            <button
              onClick={() => sendMessage("npx hyperframes inspect --json")}
              className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-violet-500/50 hover:text-violet-200 flex items-center justify-center gap-1.5"
            >
              <Eye size={12} /> Inspect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenePreviewPanel({
  selectedScene,
  previewUrl,
  hfStatus,
  onSendMessage,
  graphicsIdeas,
}: {
  selectedScene: StoryboardFrame | null;
  previewUrl: string | null;
  hfStatus: HfStatus;
  onSendMessage: (msg: string) => void;
  graphicsIdeas: GraphicsIdea[];
}) {
  const sceneGraphics = graphicsIdeas.filter(
    (g) => selectedScene && g.sceneTitle?.includes(selectedScene.id)
  );

  return (
    <div className="flex-1 flex flex-col min-w-[320px] max-w-[480px] bg-gray-900/60 border-r border-gray-800">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/80">
        <div className="flex items-center gap-2 min-w-0">
          <Film size={15} className="text-violet-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-white truncate">
              {selectedScene
                ? `Preview · Cena ${selectedScene.id}`
                : "Preview Visual da Cena"}
            </h3>
            <p className="text-[10px] text-gray-400 truncate">
              {selectedScene
                ? `Bloco ${selectedScene.block} · ${selectedScene.time}`
                : "Selecione uma cena no storyboard à direita"}
            </p>
          </div>
        </div>
        {selectedScene && (
          <span className="px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 text-[10px] font-medium">
            Ativa
          </span>
        )}
      </div>

      {/* Preview Canvas / Player Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-black/40 overflow-y-auto relative">
        {previewUrl ? (
          <div className="w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-violet-500/60 shadow-2xl shadow-violet-950/50 bg-black relative">
            <iframe
              src={previewUrl}
              title="HyperFrames Live Preview"
              className="w-full h-full border-0"
            />
          </div>
        ) : selectedScene ? (
          <div className="w-full max-w-[260px] aspect-[9/16] rounded-2xl border-2 border-violet-500/40 bg-gradient-to-b from-gray-950 via-gray-900 to-black p-4 flex flex-col justify-between shadow-2xl shadow-violet-950/40 relative overflow-hidden group">
            {/* Ambient Glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-600/15 rounded-full blur-3xl group-hover:bg-violet-600/25 transition-all" />

            {/* Top Scene Tag */}
            <div className="flex items-center justify-between z-10">
              <span className="px-2.5 py-1 rounded-md bg-violet-900/60 text-violet-200 border border-violet-700/50 text-[10px] font-bold tracking-wider uppercase">
                CENA {selectedScene.id}
              </span>
              <span className="text-[10px] font-mono text-gray-400 bg-gray-900/80 px-2 py-0.5 rounded border border-gray-800">
                {selectedScene.time}
              </span>
            </div>

            {/* Graphic / HyperFrames Mockup Overlay Center */}
            <div className="my-auto py-6 text-center z-10 flex flex-col items-center justify-center">
              {selectedScene.type === "graphics" ||
              selectedScene.motion_template_id ? (
                <div className="px-3 py-2 rounded-xl bg-violet-900/30 border border-violet-500/40 text-violet-200 text-xs font-mono mb-2 flex items-center gap-1.5 shadow">
                  <Sparkles size={13} className="text-violet-400" />
                  <span>
                    {selectedScene.motion_template_id || "hyperframes-graphic"}
                  </span>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-2">
                  <Layers size={20} />
                </div>
              )}

              <p className="text-[11px] text-gray-300 font-medium leading-snug max-w-[200px] px-2 italic">
                "{selectedScene.description}"
              </p>

              {sceneGraphics.length > 0 && (
                <div className="mt-3 px-2 py-1 rounded-md bg-amber-950/40 border border-amber-600/40 text-amber-300 text-[10px] font-medium flex items-center gap-1">
                  <BarChart3 size={11} /> {sceneGraphics.length} gráfico(s)
                  sugerido(s)
                </div>
              )}
            </div>

            {/* Subtitle / Narration Bottom Overlay */}
            <div className="z-10 bg-black/70 backdrop-blur-md rounded-xl p-2.5 border border-gray-800 text-center">
              <span className="text-[9px] uppercase tracking-widest text-violet-400 font-bold block mb-0.5">
                LEGENDA DE RETENÇÃO
              </span>
              <p className="text-[11px] font-semibold text-white leading-tight">
                {selectedScene.narration_text || selectedScene.description}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center px-6 py-12">
            <div className="w-14 h-14 rounded-2xl bg-gray-800/80 border border-gray-700 flex items-center justify-center text-gray-500 mb-3">
              <Film size={26} />
            </div>
            <h4 className="text-xs font-semibold text-gray-300 mb-1">
              Nenhuma cena selecionada
            </h4>
            <p className="text-[11px] text-gray-500 max-w-[220px]">
              Clique em uma cena no storyboard à direita para visualizar o
              preview e orientar o Video Agent.
            </p>
          </div>
        )}
      </div>

      {/* Scene Quick Controls */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              selectedScene
                ? onSendMessage(
                    `Criar gráfico HyperFrames para a cena ${selectedScene.id}: "${selectedScene.description}"`
                  )
                : onSendMessage("npx hyperframes init")
            }
            disabled={!selectedScene}
            className="py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white font-medium flex items-center justify-center gap-1.5 transition-colors shadow"
          >
            <Sparkles size={13} /> Gerar Gráfico
          </button>
          <button
            onClick={() => onSendMessage("npx hyperframes preview")}
            className="py-2 px-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-violet-500/50 text-xs text-gray-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Play size={13} /> Preview Ao Vivo
          </button>
        </div>
      </div>
    </div>
  );
}

function HfStatusBadge({ status }: { status: HfStatus }) {
  const map: Record<HfStatus, { label: string; cls: string }> = {
    idle: {
      label: "Pronto",
      cls: "bg-gray-700/50 text-gray-400 border-gray-600",
    },
    init: {
      label: "Init...",
      cls: "bg-blue-600/20 text-blue-300 border-blue-600/30",
    },
    lint: {
      label: "Lint",
      cls: "bg-amber-600/20 text-amber-300 border-amber-600/30",
    },
    preview: {
      label: "Preview",
      cls: "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
    },
    render: {
      label: "Render",
      cls: "bg-violet-600/20 text-violet-300 border-violet-600/30",
    },
    error: {
      label: "Erro",
      cls: "bg-red-600/20 text-red-300 border-red-600/30",
    },
  };
  const { label, cls } = map[status] || map.idle;
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}
    >
      {label}
    </span>
  );
}

function FrameIcon({ type }: { type: string }) {
  const cls = "text-gray-400 mt-0.5 shrink-0";
  switch (type) {
    case "graphics":
      return <Layers size={13} className={cls} />;
    case "caption":
      return <Type size={13} className={cls} />;
    case "broll":
      return <Image size={13} className={cls} />;
    case "chart":
      return <BarChart3 size={13} className={cls} />;
    default:
      return <Film size={13} className={cls} />;
  }
}
