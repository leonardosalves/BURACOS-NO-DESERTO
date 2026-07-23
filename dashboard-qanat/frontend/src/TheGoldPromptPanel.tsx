import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Layers,
  Crown,
  Youtube,
  Copy,
  Check,
  Plus,
  ArrowLeft,
  Trash2,
  Video,
  Image as ImageIcon,
  FileText,
  Clock,
  Zap,
  BookOpen,
  Volume2,
  Wand2,
} from "lucide-react";

interface Beat {
  id: string;
  scriptSegment: string;
  imagePrompt: string;
  videoPrompt?: string;
  cameraAngle?: string;
  lighting?: string;
  mood?: string;
}

interface ThumbnailConcept {
  id: string;
  visualConcept: string;
  textOverlay: string;
  emotionTrigger: string;
  prompt: string;
}

interface ReconstructedVideo {
  id: string;
  title: string;
  duration: string;
  wordCount: number;
  narrationScript: string;
  beats: Beat[];
  thumbnails: ThumbnailConcept[];
}

interface ClonedChannel {
  id: string;
  sourceChannel: string;
  cloneName: string;
  niche: string;
  createdAt: string;
  branding: {
    nameVariants?: string[];
    descriptions?: string[];
    logoPrompt?: string;
    bannerPrompt?: string;
  };
  styleDna: {
    niche?: string;
    targetAudience?: string;
    hookStyle?: string;
    scriptFlow?: string;
    sentenceRhythm?: string;
    tone?: string;
    retentionTechniques?: string;
    wordsPerSecond?: number;
    targetWordCount?: string;
  };
  visualProfile: {
    artStyle?: string;
    colorPalette?: string;
    lightingStyle?: string;
    cameraStyle?: string;
  };
  videos: ReconstructedVideo[];
}

interface Props {
  onOpenInEditor?: (videoTitle: string, scriptText: string) => void;
}

export const TheGoldPromptPanel: React.FC<Props> = ({ onOpenInEditor }) => {
  const [channels, setChannels] = useState<ClonedChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ClonedChannel | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"branding" | "videos">("branding");
  const [selectedVideo, setSelectedVideo] = useState<ReconstructedVideo | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal State for New Channel Cloning
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceChannelInput, setSourceChannelInput] = useState("");
  const [transcriptsInput, setTranscriptsInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [cloningStatus, setCloningStatus] = useState<string | null>(null);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gold-prompt/channels");
      const data = await res.json();
      if (data.ok && Array.isArray(data.channels)) {
        setChannels(data.channels);
      }
    } catch (e) {
      console.error("Erro ao carregar canais clonados:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStartClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceChannelInput.trim()) return;

    setCloningStatus(
      "⚡ Executando THE GOLDEN PROMPT... Extraindo Style DNA, Branding e Beats (8-15 min)"
    );
    try {
      const res = await fetch("/api/gold-prompt/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceChannel: sourceChannelInput,
          transcripts: transcriptsInput,
          topic: topicInput,
        }),
      });
      const data = await res.json();
      if (data.ok && data.channel) {
        setChannels((prev) => [data.channel, ...prev]);
        setSelectedChannel(data.channel);
        if (data.channel.videos && data.channel.videos.length > 0) {
          setSelectedVideo(data.channel.videos[0]);
        }
        setIsModalOpen(false);
        setSourceChannelInput("");
        setTranscriptsInput("");
        setTopicInput("");
      } else {
        alert(data.error || "Falha na clonagem do canal.");
      }
    } catch (err) {
      alert("Erro ao conectar com o backend Lumiera.");
    } finally {
      setCloningStatus(null);
    }
  };

  const handleDeleteChannel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja realmente excluir este canal copiado e seus vídeos?"))
      return;
    try {
      await fetch(`/api/gold-prompt/channels/${id}`, { method: "DELETE" });
      setChannels((prev) => prev.filter((c) => c.id !== id));
      if (selectedChannel?.id === id) {
        setSelectedChannel(null);
      }
    } catch (e) {
      console.error("Erro ao deletar canal:", e);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0d0f17] text-gray-100 p-6 flex flex-col gap-6 font-sans">
      {/* HEADER PRINCIPAL DA FERRAMENTA */}
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl shadow-lg shadow-amber-500/20 border border-yellow-400/40">
            <Crown className="w-7 h-7 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent tracking-wide flex items-center gap-2">
              THE GOLD PROMPT
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-bold tracking-wider">
                12-State YouTube Engine
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Clonagem rigorosa de estilo de canais concorrentes &
              recondicionamento completo de vídeos para seu canal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedChannel && (
            <button
              onClick={() => {
                setSelectedChannel(null);
                setSelectedVideo(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 border border-gray-700/60 rounded-xl text-sm font-semibold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Lista de Canais Copiados
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold rounded-xl shadow-lg shadow-amber-500/25 border border-yellow-300/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm"
          >
            <Sparkles className="w-4 h-4 text-black fill-black" />
            Clonar Novo Canal
          </button>
        </div>
      </div>

      {/* VISTA 1: LISTA DE CANAIS COPIADOS SALVOS */}
      {!selectedChannel && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Canais Copiados Salvos no Banco ({channels.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-amber-400 gap-3 font-semibold text-sm">
              <Zap className="w-5 h-5 animate-bounce" /> Carregando banco de
              dados de canais...
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl text-center p-8">
              <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20 text-amber-400 mb-4">
                <Youtube className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-gray-200">
                Nenhum canal clonado ainda
              </h3>
              <p className="text-xs text-gray-400 max-w-md mt-1 mb-6">
                Cole o nome de um canal de sucesso do YouTube para que o THE
                GOLD PROMPT extraia o Branding Brief, Style DNA e gere vídeos
                completos para produção.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl shadow-md text-sm transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Clonar Primeiro Canal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {channels.map((chan) => (
                <div
                  key={chan.id}
                  onClick={() => {
                    setSelectedChannel(chan);
                    if (chan.videos && chan.videos.length > 0) {
                      setSelectedVideo(chan.videos[0]);
                    }
                  }}
                  className="group bg-gradient-to-b from-gray-900/90 to-gray-950 border border-gray-800/80 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition-all cursor-pointer hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {chan.niche}
                        </span>
                        <h3 className="text-xl font-black text-gray-100 mt-2 group-hover:text-amber-400 transition-colors">
                          {chan.cloneName}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Youtube className="w-3.5 h-3.5 text-red-500" />{" "}
                          Origem:{" "}
                          <span className="text-gray-300 font-semibold">
                            {chan.sourceChannel}
                          </span>
                        </p>
                      </div>

                      <button
                        onClick={(e) => handleDeleteChannel(chan.id, e)}
                        className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Excluir Canal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* DNA SNAPSHOT */}
                    <div className="bg-gray-950/80 rounded-xl p-3 border border-gray-800/60 mb-4 flex flex-col gap-2">
                      <div className="text-xs text-gray-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="font-semibold text-gray-400">
                          Hook:
                        </span>{" "}
                        {chan.styleDna?.hookStyle || "Não especificado"}
                      </div>
                      <div className="text-xs text-gray-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold text-gray-400">
                          Alvo:
                        </span>{" "}
                        {chan.styleDna?.targetWordCount || "8 a 15 min"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-800/60 pt-4 mt-2">
                    <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-amber-400" />{" "}
                      {chan.videos?.length || 0} vídeo(s) para produção
                    </span>
                    <span className="text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Abrir Canal &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: PÁGINA DO CANAL COPIADO SELECIONADO */}
      {selectedChannel && (
        <div className="flex flex-col gap-6">
          {/* HEADER DO CANAL COPIADO */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-black font-black text-2xl shadow-lg shadow-amber-500/20">
                {selectedChannel.cloneName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-gray-100">
                    {selectedChannel.cloneName}
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {selectedChannel.niche}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                  <Youtube className="w-4 h-4 text-red-500" /> Clonado a partir
                  de:{" "}
                  <strong className="text-gray-200">
                    {selectedChannel.sourceChannel}
                  </strong>
                </p>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-gray-950/80 p-1.5 rounded-xl border border-gray-800/80 self-stretch md:self-auto">
              <button
                onClick={() => setActiveTab("branding")}
                className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "branding"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Crown className="w-3.5 h-3.5" /> Branding & Style DNA
              </button>
              <button
                onClick={() => setActiveTab("videos")}
                className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "videos"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Vídeos para Produção (
                {selectedChannel.videos?.length || 0})
              </button>
            </div>
          </div>

          {/* ABA 1: BRANDING & STYLE DNA */}
          {activeTab === "branding" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* BRANDING BRIEF */}
              <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
                <h3 className="text-base font-extrabold text-amber-400 flex items-center gap-2 border-b border-gray-800 pb-3">
                  <Crown className="w-5 h-5 text-amber-400" /> Branding Brief
                  (STATE 2)
                </h3>

                {/* NOMES SUGERIDOS */}
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2 uppercase tracking-wider">
                    5 Variações de Nomes para o Canal Clone:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedChannel.branding?.nameVariants?.map((name, i) => (
                      <button
                        key={i}
                        onClick={() => handleCopy(name, `name-${i}`)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-950 hover:bg-amber-500/10 border border-gray-800 hover:border-amber-500/40 rounded-lg text-xs font-semibold text-gray-200 transition-all"
                      >
                        {name}
                        {copiedKey === `name-${i}` ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DESCRIÇÕES */}
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2 uppercase tracking-wider">
                    2 Descrições na Voz do Canal:
                  </label>
                  <div className="flex flex-col gap-2">
                    {selectedChannel.branding?.descriptions?.map((desc, i) => (
                      <div
                        key={i}
                        className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300 relative group"
                      >
                        <p>{desc}</p>
                        <button
                          onClick={() => handleCopy(desc, `desc-${i}`)}
                          className="absolute top-2 right-2 p-1 bg-gray-800 hover:bg-amber-500 text-gray-300 hover:text-black rounded transition-all opacity-0 group-hover:opacity-100"
                        >
                          {copiedKey === `desc-${i}` ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LOGO & BANNER PROMPTS */}
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                      <ImageIcon className="w-3.5 h-3.5" /> Prompt para Logo
                      (Style-Matched):
                    </label>
                    <div className="p-3 bg-gray-950 border border-amber-500/20 rounded-xl text-xs text-gray-300 font-mono flex items-start justify-between gap-3">
                      <span>{selectedChannel.branding?.logoPrompt}</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            selectedChannel.branding?.logoPrompt || "",
                            "logo"
                          )
                        }
                        className="p-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black rounded-lg transition-all shrink-0"
                      >
                        {copiedKey === "logo" ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                      <ImageIcon className="w-3.5 h-3.5" /> Prompt para Banner
                      (Style-Matched):
                    </label>
                    <div className="p-3 bg-gray-950 border border-amber-500/20 rounded-xl text-xs text-gray-300 font-mono flex items-start justify-between gap-3">
                      <span>{selectedChannel.branding?.bannerPrompt}</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            selectedChannel.branding?.bannerPrompt || "",
                            "banner"
                          )
                        }
                        className="p-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black rounded-lg transition-all shrink-0"
                      >
                        {copiedKey === "banner" ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* STYLE DNA */}
              <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                <h3 className="text-base font-extrabold text-amber-400 flex items-center gap-2 border-b border-gray-800 pb-3">
                  <Zap className="w-5 h-5 text-yellow-400" /> Style DNA (STATE
                  5)
                </h3>

                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl">
                    <span className="font-bold text-gray-400 block mb-1">
                      Hook Style (Gancho Inicial):
                    </span>
                    <span className="text-gray-200 font-medium">
                      {selectedChannel.styleDna?.hookStyle}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl">
                    <span className="font-bold text-gray-400 block mb-1">
                      Fluxo do Roteiro (Script Flow):
                    </span>
                    <span className="text-gray-200 font-medium">
                      {selectedChannel.styleDna?.scriptFlow}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl">
                    <span className="font-bold text-gray-400 block mb-1">
                      Gatilhos de Retenção & Curiosidade:
                    </span>
                    <span className="text-gray-200 font-medium">
                      {selectedChannel.styleDna?.retentionTechniques}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl">
                      <span className="font-bold text-gray-400 block mb-1">
                        Ritmo & Frasagem:
                      </span>
                      <span className="text-gray-200 font-medium">
                        {selectedChannel.styleDna?.sentenceRhythm}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl">
                      <span className="font-bold text-gray-400 block mb-1">
                        Palavras / Segundo (11Labs):
                      </span>
                      <span className="text-amber-400 font-black text-sm">
                        {selectedChannel.styleDna?.wordsPerSecond || 2.4} wps
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-950 border border-amber-500/30 rounded-xl">
                    <span className="font-bold text-amber-400 block mb-1">
                      Contagem Alvo de Palavras (8 a 15 min):
                    </span>
                    <span className="text-gray-200 font-bold">
                      {selectedChannel.styleDna?.targetWordCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: VÍDEOS PARA PRODUÇÃO RECONDICIONADOS */}
          {activeTab === "videos" && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* LISTA LATERAL DE VÍDEOS */}
              <div className="w-full lg:w-1/3 flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Vídeos Recondicionados ({selectedChannel.videos?.length || 0}
                  ):
                </h3>

                {selectedChannel.videos?.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => setSelectedVideo(vid)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      selectedVideo?.id === vid.id
                        ? "bg-amber-500/15 border-amber-500 text-gray-100 shadow-lg shadow-amber-500/10"
                        : "bg-gray-900/80 border-gray-800 hover:border-gray-700 text-gray-300"
                    }`}
                  >
                    <h4 className="font-bold text-sm leading-snug">
                      {vid.title}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />{" "}
                        {vid.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-yellow-400" />{" "}
                        {vid.wordCount} palavras
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* DETALHES DO VÍDEO SELECIONADO */}
              {selectedVideo ? (
                <div className="w-full lg:w-2/3 bg-gray-900/90 border border-gray-800 rounded-2xl p-6 flex flex-col gap-6 shadow-2xl">
                  {/* BARRA SUPERIOR DO VÍDEO */}
                  <div className="flex items-start justify-between border-b border-gray-800 pb-4 gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Totalmente Recondicionado para seu Canal
                      </span>
                      <h3 className="text-xl font-black text-gray-100 mt-2">
                        {selectedVideo.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                        <span>
                          Duração:{" "}
                          <strong className="text-amber-400">
                            {selectedVideo.duration}
                          </strong>
                        </span>
                        <span>
                          Palavras:{" "}
                          <strong className="text-yellow-400">
                            {selectedVideo.wordCount}
                          </strong>
                        </span>
                      </p>
                    </div>

                    {onOpenInEditor && (
                      <button
                        onClick={() =>
                          onOpenInEditor(
                            selectedVideo.title,
                            selectedVideo.narrationScript
                          )
                        }
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold rounded-xl shadow-lg text-xs transition-all flex items-center gap-2 shrink-0"
                      >
                        <Wand2 className="w-4 h-4 fill-black" /> Abrir no Editor
                        Lumiera
                      </button>
                    )}
                  </div>

                  {/* ROTEIRO HUMANIZADO (11LABS) */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-amber-400" /> Roteiro
                      Humanizado para 11Labs (STATE 6):
                    </h4>
                    <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300 font-sans leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {selectedVideo.narrationScript}
                    </div>
                  </div>

                  {/* BEATS DE 3 A 5 SEGUNDOS COM PROMPTS DE IMAGEM & VÍDEO (STATE 8 & 9) */}
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-400" /> Beats de
                      Cena de 3 a 5 Segundos (Prompts Standalone Image & Video):
                    </h4>

                    <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                      {selectedVideo.beats?.map((beat, idx) => (
                        <div
                          key={beat.id || idx}
                          className="p-3.5 bg-gray-950 border border-gray-800 rounded-xl flex flex-col gap-2 text-xs"
                        >
                          <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                            <span className="font-extrabold text-amber-400 text-xs">
                              Beat #{idx + 1} (3-5s)
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                              <span>
                                Ângulo:{" "}
                                <strong>
                                  {beat.cameraAngle || "Cinematográfico"}
                                </strong>
                              </span>
                              <span>
                                Mood:{" "}
                                <strong>{beat.mood || "Dramático"}</strong>
                              </span>
                            </div>
                          </div>

                          <p className="text-gray-300 italic bg-gray-900/50 p-2 rounded border border-gray-800/50">
                            "{beat.scriptSegment}"
                          </p>

                          <div className="flex flex-col gap-1.5 mt-1">
                            <div className="text-gray-200">
                              <span className="font-bold text-amber-400">
                                Image Prompt:
                              </span>{" "}
                              {beat.imagePrompt}
                            </div>
                            {beat.videoPrompt && (
                              <div className="text-gray-400 text-[11px]">
                                <span className="font-bold text-yellow-500">
                                  Video Motion Prompt:
                                </span>{" "}
                                {beat.videoPrompt}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CONCEITOS DE THUMBNAILS (STATE 11) */}
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-amber-400" /> 5
                      Conceitos de Thumbnails (STATE 11):
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedVideo.thumbnails?.map((thumb, idx) => (
                        <div
                          key={thumb.id || idx}
                          className="p-3 bg-gray-950 border border-amber-500/20 rounded-xl flex flex-col gap-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-amber-300">
                            <span>Thumb #{idx + 1}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                              {thumb.emotionTrigger}
                            </span>
                          </div>
                          <div className="font-black text-white text-sm text-yellow-400 uppercase tracking-wide">
                            "{thumb.textOverlay}"
                          </div>
                          <p className="text-gray-400 text-[11px]">
                            {thumb.visualConcept}
                          </p>
                          <div className="p-2 bg-gray-900 rounded font-mono text-[10px] text-gray-300 border border-gray-800 mt-1">
                            {thumb.prompt}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full lg:w-2/3 flex items-center justify-center p-12 bg-gray-900/40 rounded-2xl border border-dashed border-gray-800 text-gray-500 text-sm">
                  Selecione um vídeo da lista ao lado para ver o roteiro e
                  beats.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: WIZARD DE CLONAGEM DO THE GOLDEN PROMPT (12 ESTADOS) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-amber-500/40 rounded-2xl p-6 max-w-2xl w-full shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg font-black text-gray-100">
                  Workflow de Clonagem THE GOLDEN PROMPT
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleStartClone}
              className="flex flex-col gap-4 text-xs"
            >
              <div>
                <label className="font-bold text-amber-400 block mb-1 uppercase tracking-wider">
                  STATE 1 — Canal a Clonar (Nome ou URL):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Veritasium, Magnates Media, SunnyV2"
                  value={sourceChannelInput}
                  onChange={(e) => setSourceChannelInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-amber-500 rounded-xl p-3 text-gray-100 outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-300 block mb-1">
                  STATE 3 — Transcrições ou Amostras de Texto (Opcional):
                </label>
                <textarea
                  rows={4}
                  placeholder="Cole aqui transcrições ou trechos de roteiros dos melhores vídeos desse canal..."
                  value={transcriptsInput}
                  onChange={(e) => setTranscriptsInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-amber-500 rounded-xl p-3 text-gray-100 outline-none transition-all font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-300 block mb-1">
                  STATE 4 — Tema ou Tópico para o Vídeo Recondicionado:
                </label>
                <input
                  type="text"
                  placeholder="Ex: O colapso estrutural da torre Ronan Point em 1968"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-amber-500 rounded-xl p-3 text-gray-100 outline-none transition-all font-semibold"
                />
              </div>

              {cloningStatus && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 font-semibold animate-pulse text-xs flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 animate-bounce" />{" "}
                  {cloningStatus}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={Boolean(cloningStatus)}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 fill-black" /> Executar THE
                  GOLDEN PROMPT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TheGoldPromptPanel;
