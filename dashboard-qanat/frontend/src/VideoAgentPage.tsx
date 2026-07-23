import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Clapperboard,
  Layers,
  BarChart3,
  Type,
  Image,
  Music,
  User,
  Check,
  X,
  ChevronRight,
  Sparkles,
  Film,
  LayoutGrid,
  MessageSquare,
} from "lucide-react";

interface AgentMessage {
  role: "user" | "agent";
  content: string;
  phase?: "pitch" | "storyboard" | "sketch" | "build" | "chat";
  suggestions?: string[];
  storyboard?: StoryboardFrame[];
  graphicsIdeas?: GraphicsIdea[];
}

interface StoryboardFrame {
  id: string;
  time: string;
  title: string;
  description: string;
  type: "avatar" | "graphics" | "caption" | "broll" | "chart" | "transition";
  status: "proposed" | "approved" | "rejected" | "built";
}

interface GraphicsIdea {
  id: string;
  sceneId: string;
  sceneTitle: string;
  type:
    | "chart"
    | "lower_third"
    | "text_overlay"
    | "counter"
    | "comparison"
    | "timeline";
  description: string;
  data_hint: string;
  status: "suggested" | "approved" | "rejected";
}

type CompanionPhase = "idle" | "pitch" | "storyboard" | "sketch" | "build";

const PHASE_LABELS: Record<CompanionPhase, string> = {
  idle: "Pronto",
  pitch: "Pitch de Ângulos",
  storyboard: "Storyboard",
  sketch: "Sketch de Frames",
  build: "Construindo",
};

const SUGGESTIONS_INITIAL = [
  "Criar vídeo do zero com prompt",
  "Analisar storyboard atual e sugerir gráficos",
  "Companion mode: dirigir passo a passo",
  "Adicionar overlays de dados ao vídeo",
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
        "Olá! Sou o Video Agent do Lumiera. Posso criar vídeos completos a partir de um prompt, analisar seu storyboard e sugerir gráficos/overlays, ou trabalhar em modo companion onde você dirige cada etapa.\n\nO que vamos criar hoje?",
      phase: "chat",
      suggestions: SUGGESTIONS_INITIAL,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<CompanionPhase>("idle");
  const [storyboard, setStoryboard] = useState<StoryboardFrame[]>([]);
  const [graphicsIdeas, setGraphicsIdeas] = useState<GraphicsIdea[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg: AgentMessage = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch(getProjectUrl("/api/video-agent/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            phase,
            project: activeProject,
            storyboard: storyboard.filter((f) => f.status === "approved"),
            graphics_ideas: graphicsIdeas.filter(
              (g) => g.status === "approved"
            ),
          }),
        });
        const data = await res.json();

        if (data.phase) setPhase(data.phase);
        if (data.storyboard) {
          setStoryboard(data.storyboard);
        }
        if (data.graphics_ideas) {
          setGraphicsIdeas(data.graphics_ideas);
        }

        const agentMsg: AgentMessage = {
          role: "agent",
          content: data.reply || "Entendido.",
          phase: data.phase,
          suggestions: data.suggestions,
          storyboard: data.storyboard,
          graphicsIdeas: data.graphics_ideas,
        };
        setMessages((prev) => [...prev, agentMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            content:
              "Erro ao conectar com o Video Agent. Verifique se o backend está rodando.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, phase, activeProject, storyboard, graphicsIdeas, getProjectUrl]
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

  const approvedFrames = storyboard.filter(
    (f) => f.status === "approved"
  ).length;
  const totalFrames = storyboard.length;

  return (
    <div className="flex h-full min-h-0">
      {/* Chat Panel */}
      <div className="flex flex-1 flex-col min-w-0 border-r border-gray-800">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white">Video Agent</h2>
            <p className="text-xs text-gray-400">
              {activeProject || "Nenhum projeto"} · Companion Mode
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-600/20 text-violet-300 border border-violet-600/30">
            {PHASE_LABELS[phase]}
          </span>
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
                    <Sparkles size={12} className="text-violet-400" />
                    <span className="text-[10px] font-medium text-violet-400 uppercase tracking-wide">
                      Video Agent
                    </span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.suggestions.map((s, j) => (
                      <button
                        key={j}
                        onClick={() => sendMessage(s)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-gray-700/50 text-gray-300 border border-gray-600 hover:bg-violet-600/20 hover:border-violet-500/50 hover:text-violet-200 transition-colors"
                      >
                        {s}
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
                  Analisando...
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
              placeholder="Descreva o vídeo ou dê uma instrução..."
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

      {/* Storyboard + Graphics Panel */}
      <div className="w-[380px] flex flex-col min-h-0 bg-gray-900/30">
        {/* Phase Progress */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid size={14} className="text-violet-400" />
            <span className="text-xs font-medium text-gray-300">
              Storyboard HyperFrames
            </span>
            {totalFrames > 0 && (
              <span className="ml-auto text-[10px] text-gray-500">
                {approvedFrames}/{totalFrames} aprovados
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {(
              ["pitch", "storyboard", "sketch", "build"] as CompanionPhase[]
            ).map((p, i) => (
              <div
                key={p}
                className={`flex-1 h-1 rounded-full ${
                  phase === p
                    ? "bg-violet-500"
                    : ["pitch", "storyboard", "sketch", "build"].indexOf(
                          phase
                        ) > i
                      ? "bg-violet-700"
                      : "bg-gray-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Storyboard Frames */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {storyboard.length === 0 && graphicsIdeas.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Film size={32} className="text-gray-600 mb-3" />
              <p className="text-xs text-gray-500">
                O storyboard aparecerá aqui quando o Video Agent propor a
                estrutura do vídeo.
              </p>
            </div>
          )}

          {storyboard.map((frame) => (
            <div
              key={frame.id}
              className={`rounded-lg border p-3 transition-colors ${
                frame.status === "approved"
                  ? "border-emerald-600/40 bg-emerald-900/10"
                  : frame.status === "rejected"
                    ? "border-red-600/30 bg-red-900/10 opacity-50"
                    : "border-gray-700 bg-gray-800/50"
              }`}
            >
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
                  <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                    {frame.description}
                  </p>
                </div>
                {frame.status === "proposed" && (
                  <div className="flex gap-1">
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
                {frame.status === "approved" && (
                  <Check size={14} className="text-emerald-400" />
                )}
              </div>
            </div>
          ))}

          {/* Graphics Ideas */}
          {graphicsIdeas.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={13} className="text-amber-400" />
                <span className="text-xs font-medium text-gray-300">
                  Ideias de Gráficos & Overlays
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
                    <GraphicsIcon type={idea.type} />
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

        {/* Build Button */}
        {approvedFrames > 0 && phase !== "build" && (
          <div className="px-4 py-3 border-t border-gray-800">
            <button
              onClick={() =>
                sendMessage(
                  `Aprovar e construir vídeo com ${approvedFrames} frames e ${
                    graphicsIdeas.filter((g) => g.status === "approved").length
                  } overlays de dados.`
                )
              }
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
            >
              <Clapperboard size={15} />
              Construir Vídeo ({approvedFrames} frames)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FrameIcon({ type }: { type: string }) {
  const cls = "text-gray-400 mt-0.5 shrink-0";
  switch (type) {
    case "avatar":
      return <User size={13} className={cls} />;
    case "graphics":
      return <Layers size={13} className={cls} />;
    case "caption":
      return <Type size={13} className={cls} />;
    case "broll":
      return <Image size={13} className={cls} />;
    case "chart":
      return <BarChart3 size={13} className={cls} />;
    case "transition":
      return <ChevronRight size={13} className={cls} />;
    default:
      return <Film size={13} className={cls} />;
  }
}

function GraphicsIcon({ type }: { type: string }) {
  const cls = "text-amber-400 mt-0.5 shrink-0";
  switch (type) {
    case "chart":
      return <BarChart3 size={13} className={cls} />;
    case "counter":
      return <span className={`text-[10px] font-bold ${cls}`}>#</span>;
    case "timeline":
      return <Layers size={13} className={cls} />;
    default:
      return <Sparkles size={13} className={cls} />;
  }
}
