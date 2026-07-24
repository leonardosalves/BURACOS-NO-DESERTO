import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Check,
  ChevronDown,
  Clapperboard,
  Clock3,
  Copy,
  Crown,
  Download,
  Eye,
  FileText,
  Film,
  FlaskConical,
  History,
  Layers,
  Lightbulb,
  Lock,
  Mic,
  Palette,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Unlock,
  Users,
  Wand2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Tipos ──────────────────────────────────────────────────────────────────
type StateStatus =
  "blocked" | "pending" | "processing" | "review" | "done" | "approved";

interface GoldState {
  id: string;
  key: string;
  label: string;
  desc: string;
}

interface VideoStage {
  id: string;
  label: string;
}

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

interface FactClaim {
  text: string;
  status: string;
  note?: string;
  confidence?: number;
}

interface FactCheck {
  claims: FactClaim[];
  riskySentences?: string[];
  summary?: string;
  checkedAt?: string;
}

interface ReconstructedVideo {
  id: string;
  title: string;
  duration: string;
  wordCount: number;
  pipelineStage: string;
  narrationScript: string;
  beats: Beat[];
  thumbnails: ThumbnailConcept[];
  factCheck?: FactCheck | null;
}

interface ChannelVersion {
  id: string;
  name: string;
  createdAt: string;
}

interface ClonedChannel {
  id: string;
  sourceChannel: string;
  cloneName: string;
  niche: string;
  createdAt: string;
  lastEditedAt?: string;
  officialName?: string | null;
  transformationLevel?: string;
  similarityScore?: number;
  stateProgress: Record<string, StateStatus>;
  lockedBlocks: string[];
  versions: ChannelVersion[];
  branding: {
    nameVariants?: string[];
    descriptions?: string[];
    logoPrompt?: string;
    bannerPrompt?: string;
  };
  styleDna: Record<string, unknown> & {
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

// ── Metadados visuais de status ────────────────────────────────────────────
const STATUS_META: Record<
  StateStatus,
  { label: string; dot: string; text: string; border: string; bg: string }
> = {
  blocked: {
    label: "Bloqueado",
    dot: "bg-rose-400",
    text: "text-rose-300",
    border: "border-rose-400/40",
    bg: "bg-rose-400/10",
  },
  pending: {
    label: "Pendente",
    dot: "bg-zinc-500",
    text: "text-zinc-400",
    border: "border-zinc-600/40",
    bg: "bg-zinc-600/10",
  },
  processing: {
    label: "Processando",
    dot: "bg-sky-400",
    text: "text-sky-300",
    border: "border-sky-400/40",
    bg: "bg-sky-400/10",
  },
  review: {
    label: "Requer revisão",
    dot: "bg-orange-400",
    text: "text-orange-300",
    border: "border-orange-400/40",
    bg: "bg-orange-400/10",
  },
  done: {
    label: "Concluído",
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    border: "border-emerald-400/40",
    bg: "bg-emerald-400/10",
  },
  approved: {
    label: "Aprovado",
    dot: "bg-gp-400",
    text: "text-gp-300",
    border: "border-gp-400/50",
    bg: "bg-gp-400/10",
  },
};

const CLAIM_META: Record<string, { label: string; cls: string }> = {
  confirmada: {
    label: "Confirmada",
    cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  },
  provavel: {
    label: "Provável",
    cls: "border-teal-400/40 bg-teal-400/10 text-teal-300",
  },
  contestada: {
    label: "Contestada",
    cls: "border-orange-400/40 bg-orange-400/10 text-orange-300",
  },
  sem_fonte: {
    label: "Sem fonte suficiente",
    cls: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  },
  interpretacao: {
    label: "Interpretação narrativa",
    cls: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function progressCount(channel: ClonedChannel): number {
  return Object.values(channel.stateProgress || {}).filter(
    (s) => s === "done" || s === "approved"
  ).length;
}

function computeNextAction(
  channel: ClonedChannel,
  states: GoldState[]
): { label: string; stateId: string | null } {
  for (const st of states) {
    if (channel.stateProgress?.[st.id] === "review")
      return { label: `Revisar ${st.label}`, stateId: st.id };
  }
  for (const v of channel.videos || []) {
    if (!v.factCheck && ["roteiro", "revisao"].includes(v.pipelineStage)) {
      return { label: "Checar fatos do roteiro", stateId: "s12" };
    }
  }
  for (const st of states) {
    const s = channel.stateProgress?.[st.id];
    if (s === "pending" || s === "processing")
      return { label: `Avançar ${st.label}`, stateId: st.id };
  }
  return { label: "Canal pronto para produção", stateId: null };
}

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

// ── Fundo ambiente ─────────────────────────────────────────────────────────
function EngineBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(212,160,23,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-gp-500/[0.07] blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-[300px] w-[420px] rounded-full bg-gp-700/[0.05] blur-[100px]" />
    </div>
  );
}

// ── Anel de progresso ──────────────────────────────────────────────────────
function ProgressRing({ value, size = 52 }: { value: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.round((value / 12) * 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#d4a017"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[11px] font-bold text-gp-300">
          {value}
        </span>
        <span className="font-mono text-[8px] text-zinc-500">/12</span>
      </div>
    </div>
  );
}

// ── Pill de status ─────────────────────────────────────────────────────────
function StatusPill({
  status,
  onClick,
}: {
  status: StateStatus;
  onClick?: () => void;
}) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider ${meta.border} ${meta.bg} ${meta.text} ${onClick ? "cursor-pointer transition hover:brightness-125" : ""}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${status === "processing" ? "animate-pulse" : ""}`}
      />
      {meta.label}
    </Tag>
  );
}

// ── Linha de campo editável ────────────────────────────────────────────────
function FieldRow({
  label,
  value,
  locked,
  mono,
  onSave,
  onToggleLock,
  onCopy,
}: {
  label: string;
  value: string;
  locked: boolean;
  mono?: boolean;
  onSave: (v: string) => void;
  onToggleLock: () => void;
  onCopy: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== value) onSave(draft.trim());
  };

  return (
    <div className="group/field rounded-xl border border-gp-line/60 bg-gp-panel2/60 p-3 transition hover:border-gp-500/30">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-gp-400/80">
          {label}
        </span>
        <div className="flex items-center gap-1 opacity-0 transition group-hover/field:opacity-100">
          <button
            onClick={onCopy}
            title="Copiar"
            className="rounded p-1 text-zinc-500 transition hover:bg-white/5 hover:text-gp-300"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            onClick={onToggleLock}
            title={locked ? "Desbloquear" : "Bloquear"}
            className={`rounded p-1 transition hover:bg-white/5 ${locked ? "text-gp-400" : "text-zinc-500 hover:text-gp-300"}`}
          >
            {locked ? (
              <Lock className="h-3 w-3" />
            ) : (
              <Unlock className="h-3 w-3" />
            )}
          </button>
          {!locked && (
            <button
              onClick={() => setEditing(true)}
              title="Editar"
              className="rounded p-1 text-zinc-500 transition hover:bg-white/5 hover:text-gp-300"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") setEditing(false);
          }}
          rows={3}
          className="w-full resize-y rounded-lg border border-gp-500/40 bg-gp-ink/80 p-2 text-xs leading-5 text-zinc-100 outline-none"
        />
      ) : (
        <p
          className={`text-xs leading-5 text-zinc-300 ${mono ? "font-mono text-[11px]" : ""} ${locked ? "opacity-80" : ""}`}
        >
          {locked && <Lock className="mr-1 inline h-3 w-3 text-gp-500" />}
          {value || <span className="italic text-zinc-600">não definido</span>}
        </p>
      )}
    </div>
  );
}

// ── Card de bloco com ações ────────────────────────────────────────────────
function BlockCard({
  icon,
  title,
  stateRef,
  status,
  onRegenerate,
  regenerating,
  onApprove,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  stateRef?: string;
  status?: StateStatus;
  onRegenerate?: () => void;
  regenerating?: boolean;
  onApprove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gp-line bg-gp-panel/80 backdrop-blur-sm">
      <header className="flex items-center justify-between gap-3 border-b border-gp-line/70 bg-gp-panel2/50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gp-500/30 bg-gp-500/10 text-gp-400 [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
          <div>
            <h3 className="font-display text-sm font-semibold tracking-tight text-zinc-100">
              {title}
            </h3>
            {stateRef && (
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gp-500/80">
                {stateRef}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status && <StatusPill status={status} />}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gp-line px-2.5 py-1.5 font-mono text-[10px] font-medium text-zinc-300 transition hover:border-gp-500/40 hover:text-gp-300 disabled:opacity-40"
            >
              {regenerating ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Wand2 className="h-3 w-3" />
              )}
              Regenerar
            </button>
          )}
          {onApprove && (
            <button
              onClick={onApprove}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gp-500 px-2.5 py-1.5 font-mono text-[10px] font-bold text-gp-ink transition hover:bg-gp-400"
            >
              <BadgeCheck className="h-3 w-3" />
              Aprovar
            </button>
          )}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export function TheGoldPromptPanel({ onOpenInEditor }: Props) {
  const [channels, setChannels] = useState<ClonedChannel[]>([]);
  const [states, setStates] = useState<GoldState[]>([]);
  const [videoStages, setVideoStages] = useState<VideoStage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeStateId, setActiveStateId] = useState("s2");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "name" | "progress">(
    "updated"
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [regeneratingBlock, setRegeneratingBlock] = useState<string | null>(
    null
  );
  const [factChecking, setFactChecking] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [newVideoTopic, setNewVideoTopic] = useState("");
  const [showVersions, setShowVersions] = useState(false);

  // clone wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sourceChannelInput, setSourceChannelInput] = useState("");
  const [transcriptsInput, setTranscriptsInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [transformLevel, setTransformLevel] = useState<
    "conservador" | "equilibrado" | "original"
  >("equilibrado");
  const [cloning, setCloning] = useState(false);

  const selected = useMemo(
    () => channels.find((c) => c.id === selectedId) || null,
    [channels, selectedId]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [chRes, stRes] = await Promise.all([
        fetch("/api/gold-prompt/channels"),
        fetch("/api/gold-prompt/states"),
      ]);
      const chData = await chRes.json();
      const stData = await stRes.json();
      if (chData.ok) setChannels(chData.channels || []);
      if (stData.ok) {
        setStates(stData.states || []);
        setVideoStages(stData.videoStages || []);
      }
    } catch (e) {
      console.error("Erro ao carregar Gold Prompt:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const patchChannel = useCallback((updated: ClonedChannel) => {
    setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const api = useCallback(async (path: string, options: RequestInit = {}) => {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(data.error || "Operação falhou."));
    return data;
  }, []);

  const setStateStatus = async (stateId: string, status: StateStatus) => {
    if (!selected) return;
    try {
      const data = await api(`/api/gold-prompt/channels/${selected.id}/state`, {
        method: "PATCH",
        body: JSON.stringify({ stateId, status }),
      });
      patchChannel(data.channel);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  const saveField = async (section: string, field: string, value: string) => {
    if (!selected) return;
    try {
      const data = await api(`/api/gold-prompt/channels/${selected.id}/field`, {
        method: "PATCH",
        body: JSON.stringify({ section, field, value }),
      });
      patchChannel(data.channel);
      toast.success("Campo atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  const toggleLock = async (blockPath: string, locked: boolean) => {
    if (!selected) return;
    try {
      const data = await api(`/api/gold-prompt/channels/${selected.id}/lock`, {
        method: "POST",
        body: JSON.stringify({ path: blockPath, locked }),
      });
      patchChannel(data.channel);
      toast.success(
        locked
          ? "Campo bloqueado — a IA não o alterará."
          : "Campo desbloqueado."
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  const setOfficialName = async (name: string) => {
    if (!selected) return;
    try {
      const data = await api(
        `/api/gold-prompt/channels/${selected.id}/official-name`,
        {
          method: "POST",
          body: JSON.stringify({ name }),
        }
      );
      patchChannel(data.channel);
      toast.success(`"${name}" definido como nome oficial.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  const regenerateBlock = async (block: string) => {
    if (!selected) return;
    setRegeneratingBlock(block);
    try {
      const data = await api(
        `/api/gold-prompt/channels/${selected.id}/regenerate-block`,
        {
          method: "POST",
          body: JSON.stringify({ block }),
        }
      );
      patchChannel(data.channel);
      toast.success("Bloco regenerado (campos bloqueados preservados).");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao regenerar.");
    } finally {
      setRegeneratingBlock(null);
    }
  };

  const snapshot = async () => {
    if (!selected) return;
    try {
      const data = await api(
        `/api/gold-prompt/channels/${selected.id}/snapshot`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      patchChannel(data.channel);
      toast.success(`Versão "${data.version.name}" salva.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  const restoreVersion = async (vid: string) => {
    if (!selected) return;
    try {
      const data = await api(
        `/api/gold-prompt/channels/${selected.id}/versions/${vid}/restore`,
        { method: "POST" }
      );
      patchChannel(data.channel);
      toast.success("Versão restaurada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  const runFactCheck = async (videoId: string) => {
    if (!selected) return;
    setFactChecking(videoId);
    try {
      const data = await api(
        `/api/gold-prompt/channels/${selected.id}/videos/${videoId}/fact-check`,
        { method: "POST" }
      );
      patchChannel(data.channel);
      toast.success("Checagem factual concluída.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na checagem.");
    } finally {
      setFactChecking(null);
    }
  };

  const moveVideoStage = async (videoId: string, stage: string) => {
    if (!selected) return;
    try {
      const data = await api(
        `/api/gold-prompt/channels/${selected.id}/videos/${videoId}/stage`,
        {
          method: "PATCH",
          body: JSON.stringify({ stage }),
        }
      );
      patchChannel(data.channel);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  const addVideo = async () => {
    if (!selected) return;
    setGeneratingVideo(true);
    try {
      const data = await api(
        `/api/gold-prompt/channels/${selected.id}/videos`,
        {
          method: "POST",
          body: JSON.stringify({ topic: newVideoTopic }),
        }
      );
      patchChannel(data.channel);
      setNewVideoTopic("");
      toast.success("Novo vídeo gerado e adicionado ao pipeline.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar vídeo.");
    } finally {
      setGeneratingVideo(false);
    }
  };

  const deleteChannel = async (id: string) => {
    try {
      await api(`/api/gold-prompt/channels/${id}`, { method: "DELETE" });
      setChannels((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast.success("Canal excluído.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  const startClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceChannelInput.trim()) return;
    setCloning(true);
    try {
      const data = await api("/api/gold-prompt/clone", {
        method: "POST",
        body: JSON.stringify({
          sourceChannel: sourceChannelInput,
          transcripts: transcriptsInput,
          topic: topicInput,
          transformationLevel: transformLevel,
        }),
      });
      setChannels((prev) => [data.channel, ...prev]);
      setWizardOpen(false);
      setSourceChannelInput("");
      setTranscriptsInput("");
      setTopicInput("");
      toast.success(`Canal "${data.channel.cloneName}" criado.`);
      setSelectedId(data.channel.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na análise.");
    } finally {
      setCloning(false);
    }
  };

  const isLocked = (blockPath: string) =>
    selected?.lockedBlocks?.includes(blockPath) || false;

  // ── Lista filtrada/ordenada ──────────────────────────────────────────────
  const visibleChannels = useMemo(() => {
    let list = channels;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.cloneName.toLowerCase().includes(q) ||
          c.niche.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.cloneName.localeCompare(b.cloneName);
      if (sortBy === "progress") return progressCount(b) - progressCount(a);
      return (
        new Date(b.lastEditedAt || 0).getTime() -
        new Date(a.lastEditedAt || 0).getTime()
      );
    });
  }, [channels, search, sortBy]);

  const inProduction = visibleChannels.filter(
    (c) => computeNextAction(c, states).stateId !== null
  );
  const archived = visibleChannels.filter(
    (c) => computeNextAction(c, states).stateId === null
  );

  // ── Render: lista de canais ──────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="relative min-h-full bg-gp-ink">
        <EngineBackdrop />
        <div className="relative mx-auto w-full max-w-[1400px] px-4 pb-16 pt-8 sm:px-6">
          {/* Cabeçalho do motor */}
          <header className="mb-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gp-500/30 bg-gp-500/10 px-3 py-1">
                  <Crown className="h-3.5 w-3.5 text-gp-400" />
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-gp-300">
                    Motor de 12 Estados
                  </span>
                </div>
                <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                  THE GOLD <span className="text-gp-400">PROMPT</span>
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                  Painel operacional de criação de canal e produção de vídeos —
                  do canal de referência ao vídeo final, com rastreamento
                  completo.
                </p>
              </div>
              <button
                onClick={() => setWizardOpen(true)}
                className="group inline-flex items-center gap-2 rounded-xl bg-gp-500 px-5 py-3 font-display text-sm font-semibold text-gp-ink shadow-lg shadow-gp-500/20 transition hover:bg-gp-400 hover:shadow-gp-400/30"
              >
                <FlaskConical className="h-4 w-4 transition group-hover:rotate-12" />
                Analisar Canal de Referência
              </button>
            </div>

            {/* Barra de controles */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar canal ou nicho..."
                  className="w-full rounded-xl border border-gp-line bg-gp-panel/70 py-2.5 pl-9 pr-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-gp-500/50"
                />
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-gp-line bg-gp-panel/70 p-1">
                {(
                  [
                    ["updated", "Recentes"],
                    ["name", "Nome"],
                    ["progress", "Progresso"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider transition ${
                      sortBy === key
                        ? "bg-gp-500/20 text-gp-300"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-2xl border border-gp-line bg-gp-panel/50"
                />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center rounded-3xl border border-dashed border-gp-line bg-gp-panel/30 text-center">
              <Crown className="h-10 w-10 text-gp-500/50" />
              <h2 className="mt-4 font-display text-2xl font-semibold text-zinc-200">
                Nenhum canal analisado
              </h2>
              <p className="mt-2 max-w-md text-sm text-zinc-500">
                Analise um canal de referência para extrair o DNA estratégico e
                começar a produzir.
              </p>
              <button
                onClick={() => setWizardOpen(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gp-500 px-5 py-2.5 font-display text-sm font-semibold text-gp-ink transition hover:bg-gp-400"
              >
                <Plus className="h-4 w-4" /> Analisar primeiro canal
              </button>
            </div>
          ) : (
            <>
              {inProduction.length > 0 && (
                <>
                  <SectionLabel
                    icon={<Play className="h-3.5 w-3.5" />}
                    title="Em produção"
                    count={inProduction.length}
                  />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {inProduction.map((c) => (
                      <ChannelCard
                        key={c.id}
                        channel={c}
                        states={states}
                        onOpen={() => {
                          setSelectedId(c.id);
                          setActiveStateId(
                            computeNextAction(c, states).stateId || "s2"
                          );
                        }}
                        onDelete={() => deleteChannel(c.id)}
                      />
                    ))}
                  </div>
                </>
              )}
              {archived.length > 0 && (
                <>
                  <SectionLabel
                    icon={<BadgeCheck className="h-3.5 w-3.5" />}
                    title="Prontos / Arquivados"
                    count={archived.length}
                  />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {archived.map((c) => (
                      <ChannelCard
                        key={c.id}
                        channel={c}
                        states={states}
                        onOpen={() => {
                          setSelectedId(c.id);
                          setActiveStateId("s2");
                        }}
                        onDelete={() => deleteChannel(c.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {wizardOpen && (
          <CloneWizard
            sourceChannel={sourceChannelInput}
            setSourceChannel={setSourceChannelInput}
            transcripts={transcriptsInput}
            setTranscripts={setTranscriptsInput}
            topic={topicInput}
            setTopic={setTopicInput}
            transformLevel={transformLevel}
            setTransformLevel={setTransformLevel}
            cloning={cloning}
            onClose={() => setWizardOpen(false)}
            onSubmit={startClone}
          />
        )}
      </div>
    );
  }

  // ── Render: detalhe do canal ─────────────────────────────────────────────
  const progress = progressCount(selected);
  const nextAction = computeNextAction(selected, states);
  const activeState = states.find((s) => s.id === activeStateId);

  return (
    <div className="relative min-h-full bg-gp-ink">
      <EngineBackdrop />
      <div className="relative mx-auto w-full max-w-[1500px] px-4 pb-16 pt-6 sm:px-6">
        {/* Barra superior */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedId(null)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gp-line bg-gp-panel/70 text-zinc-400 transition hover:border-gp-500/40 hover:text-gp-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-50">
                  {selected.cloneName}
                </h1>
                {selected.officialName && (
                  <span className="rounded-full border border-gp-500/40 bg-gp-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-gp-300">
                    Oficial
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] text-zinc-500">
                Estado {states.findIndex((s) => s.id === activeStateId) + 1} de
                12 · Salvo automaticamente {timeAgo(selected.lastEditedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVersions((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[10px] font-medium transition ${
                showVersions
                  ? "border-gp-500/50 bg-gp-500/15 text-gp-300"
                  : "border-gp-line bg-gp-panel/70 text-zinc-300 hover:border-gp-500/40"
              }`}
            >
              <History className="h-3.5 w-3.5" /> Versões (
              {selected.versions.length})
            </button>
            <button
              onClick={snapshot}
              className="inline-flex items-center gap-2 rounded-xl border border-gp-line bg-gp-panel/70 px-3 py-2 font-mono text-[10px] font-medium text-zinc-300 transition hover:border-gp-500/40 hover:text-gp-300"
            >
              <Download className="h-3.5 w-3.5" /> Snapshot
            </button>
          </div>
        </div>

        {/* Painel de versões */}
        {showVersions && (
          <div className="mb-6 rounded-2xl border border-gp-line bg-gp-panel/80 p-4">
            <h3 className="mb-3 font-display text-sm font-semibold text-zinc-100">
              Controle de versões
            </h3>
            {selected.versions.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Nenhuma versão salva. Clique em "Snapshot" para criar a
                primeira.
              </p>
            ) : (
              <div className="space-y-2">
                {selected.versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-xl border border-gp-line/60 bg-gp-panel2/50 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-xs font-medium text-zinc-200">
                        {v.name}
                      </p>
                      <p className="font-mono text-[10px] text-zinc-500">
                        {timeAgo(v.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => restoreVersion(v.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gp-line px-2.5 py-1.5 font-mono text-[10px] text-zinc-300 transition hover:border-gp-500/40 hover:text-gp-300"
                    >
                      <RotateCcw className="h-3 w-3" /> Restaurar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Trilho dos 12 estados */}
          <aside className="h-fit rounded-2xl border border-gp-line bg-gp-panel/80 p-3 lg:sticky lg:top-6">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gp-400">
                Motor · 12 Estados
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                {progress}/12
              </span>
            </div>
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gp-600 to-gp-400 transition-all duration-700"
                style={{ width: `${(progress / 12) * 100}%` }}
              />
            </div>
            <nav className="space-y-1">
              {states.map((st, index) => {
                const status = selected.stateProgress?.[st.id] || "pending";
                const meta = STATUS_META[status];
                const active = activeStateId === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setActiveStateId(st.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                      active
                        ? "border-gp-500/50 bg-gp-500/10"
                        : "border-transparent hover:border-gp-line hover:bg-gp-panel2/50"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                        status === "approved"
                          ? "bg-gp-500 text-gp-ink"
                          : status === "done"
                            ? "bg-emerald-400/90 text-emerald-950"
                            : "bg-white/5 text-zinc-500"
                      }`}
                    >
                      {status === "done" || status === "approved" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[11px] font-medium ${active ? "text-gp-200" : "text-zinc-300"}`}
                      >
                        {st.label}
                      </span>
                    </span>
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot} ${status === "processing" ? "animate-pulse" : ""}`}
                      title={meta.label}
                    />
                  </button>
                );
              })}
            </nav>
            <div className="mt-3 rounded-xl border border-gp-line/60 bg-gp-panel2/50 p-3">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gp-400">
                Próxima ação
              </p>
              <p className="mt-1 text-[11px] leading-4 text-zinc-300">
                {nextAction.label}
              </p>
            </div>
          </aside>

          {/* Conteúdo do estado */}
          <main className="space-y-5">
            {activeState && (
              <div className="flex items-center justify-between rounded-2xl border border-gp-line bg-gp-panel/60 px-4 py-3">
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">
                    {activeState.label}
                  </h2>
                  <p className="text-xs text-zinc-500">{activeState.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill
                    status={
                      selected.stateProgress?.[activeState.id] || "pending"
                    }
                  />
                  <select
                    value={
                      selected.stateProgress?.[activeState.id] || "pending"
                    }
                    onChange={(e) =>
                      setStateStatus(
                        activeState.id,
                        e.target.value as StateStatus
                      )
                    }
                    className="rounded-lg border border-gp-line bg-gp-panel2 px-2 py-1.5 font-mono text-[10px] text-zinc-300 outline-none focus:border-gp-500/50"
                  >
                    {Object.entries(STATUS_META).map(([key, m]) => (
                      <option key={key} value={key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {renderStateContent()}
          </main>
        </div>
      </div>
    </div>
  );

  // ── Conteúdo por estado ──────────────────────────────────────────────────
  function renderStateContent() {
    if (!selected) return null;
    switch (activeStateId) {
      case "s1":
        return renderReference();
      case "s2":
        return renderBranding();
      case "s5":
        return renderStyleDna();
      case "s7":
        return renderVisual();
      case "s9":
      case "s10":
      case "s11":
        return renderPipeline();
      case "s12":
        return renderFactCheck();
      default:
        return renderGenericState();
    }
  }

  function renderReference() {
    if (!selected) return null;
    const level = selected.transformationLevel || "equilibrado";
    const sim = selected.similarityScore ?? 34;
    return (
      <BlockCard
        icon={<Target />}
        title="Canal de Referência"
        stateRef="Estado 01"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow
            label="Canal de origem"
            value={selected.sourceChannel}
            locked={isLocked("sourceChannel")}
            onSave={(v) => saveField("sourceChannel" as never, "" as never, v)}
            onToggleLock={() =>
              toggleLock("sourceChannel", !isLocked("sourceChannel"))
            }
            onCopy={() => handleCopy(selected.sourceChannel, "src")}
          />
          <div className="rounded-xl border border-gp-line/60 bg-gp-panel2/60 p-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-gp-400/80">
              Nicho detectado
            </span>
            <p className="mt-1.5 text-xs text-zinc-300">{selected.niche}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-gp-line/60 bg-gp-panel2/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-gp-400/80">
                Nível de transformação
              </span>
              <p className="mt-1 text-xs capitalize text-zinc-300">{level}</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-gp-400/80">
                Similaridade estrutural
              </span>
              <p className="font-mono text-lg font-bold text-gp-300">{sim}%</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-gp-400"
              style={{ width: `${sim}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[10px] text-zinc-500">
            Originalidade recomendada: 80%+ · O sistema identifica padrões
            estratégicos sem copiar elementos protegidos.
          </p>
        </div>
      </BlockCard>
    );
  }

  function renderBranding() {
    if (!selected) return null;
    const b = selected.branding || {};
    const names = b.nameVariants || [];
    const descs = b.descriptions || [];
    const descLabels = [
      "Descrição curta para cabeçalho",
      "Descrição completa para YouTube",
      "Bio para redes sociais",
    ];
    return (
      <>
        <BlockCard
          icon={<Sparkles />}
          title="Nomes do Canal"
          stateRef="Estado 02 · Branding"
          status={selected.stateProgress?.s2}
          onRegenerate={() => regenerateBlock("branding")}
          regenerating={regeneratingBlock === "branding"}
        >
          <div className="space-y-2">
            {names.map((name, i) => {
              const isOfficial =
                selected.officialName === name ||
                (!selected.officialName && selected.cloneName === name);
              const scores = {
                clareza: 95 - i * 4,
                memorabilidade: 88 - i * 5,
                diferenciacao: 70 - i * 6,
              };
              return (
                <div
                  key={name}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition ${
                    isOfficial
                      ? "border-gp-500/50 bg-gp-500/[0.08]"
                      : "border-gp-line/60 bg-gp-panel2/50 hover:border-gp-500/30"
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${isOfficial ? "text-gp-300" : "text-zinc-200"}`}
                    >
                      {name}{" "}
                      {isOfficial && (
                        <BadgeCheck className="ml-1 inline h-4 w-4 text-gp-400" />
                      )}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-3">
                      {Object.entries(scores).map(([k, v]) => (
                        <span
                          key={k}
                          className="font-mono text-[9px] uppercase tracking-wider text-zinc-500"
                        >
                          {k}{" "}
                          <span className="font-bold text-zinc-300">{v}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(name, `name-${i}`)}
                      className="rounded-lg border border-gp-line p-1.5 text-zinc-400 transition hover:text-gp-300"
                    >
                      {copiedKey === `name-${i}` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    {!isOfficial && (
                      <button
                        onClick={() => setOfficialName(name)}
                        className="rounded-lg border border-gp-line px-2.5 py-1.5 font-mono text-[10px] text-zinc-300 transition hover:border-gp-500/40 hover:text-gp-300"
                      >
                        Tornar oficial
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </BlockCard>

        <BlockCard
          icon={<FileText />}
          title="Descrições"
          stateRef="Estado 02 · Branding"
        >
          <div className="space-y-3">
            {descs.map((d, i) => (
              <FieldRow
                key={i}
                label={descLabels[i] || `Descrição ${i + 1}`}
                value={d}
                locked={isLocked(`branding.descriptions.${i}`)}
                onSave={(v) => {
                  const next = [...descs];
                  next[i] = v;
                  saveField(
                    "branding",
                    "descriptions",
                    next.join("|||") as never
                  );
                }}
                onToggleLock={() =>
                  toggleLock(
                    `branding.descriptions.${i}`,
                    !isLocked(`branding.descriptions.${i}`)
                  )
                }
                onCopy={() => handleCopy(d, `desc-${i}`)}
              />
            ))}
          </div>
        </BlockCard>

        <div className="grid gap-5 xl:grid-cols-2">
          <BlockCard
            icon={<Crown />}
            title="Prompt de Logo"
            stateRef="Estado 02 · Branding"
          >
            <FieldRow
              label="Prompt"
              value={b.logoPrompt || ""}
              mono
              locked={isLocked("branding.logoPrompt")}
              onSave={(v) => saveField("branding", "logoPrompt", v)}
              onToggleLock={() =>
                toggleLock(
                  "branding.logoPrompt",
                  !isLocked("branding.logoPrompt")
                )
              }
              onCopy={() => handleCopy(b.logoPrompt || "", "logo")}
            />
            <ul className="mt-3 space-y-1">
              {[
                "Formato quadrado",
                "Leitura em tamanho pequeno",
                "Fundo transparente",
                "Sem texto excessivo",
              ].map((r) => (
                <li
                  key={r}
                  className="flex items-center gap-2 font-mono text-[10px] text-zinc-500"
                >
                  <span className="h-1 w-1 rounded-full bg-gp-500" /> {r}
                </li>
              ))}
            </ul>
          </BlockCard>

          <BlockCard
            icon={<Film />}
            title="Prompt de Banner"
            stateRef="Estado 02 · Branding"
          >
            <FieldRow
              label="Prompt"
              value={b.bannerPrompt || ""}
              mono
              locked={isLocked("branding.bannerPrompt")}
              onSave={(v) => saveField("branding", "bannerPrompt", v)}
              onToggleLock={() =>
                toggleLock(
                  "branding.bannerPrompt",
                  !isLocked("branding.bannerPrompt")
                )
              }
              onCopy={() => handleCopy(b.bannerPrompt || "", "banner")}
            />
            <ul className="mt-3 space-y-1">
              {[
                "Formato 16:9",
                "Área segura para celular",
                "Espaço para nome e slogan",
                "Consistência com o logo",
              ].map((r) => (
                <li
                  key={r}
                  className="flex items-center gap-2 font-mono text-[10px] text-zinc-500"
                >
                  <span className="h-1 w-1 rounded-full bg-gp-500" /> {r}
                </li>
              ))}
            </ul>
          </BlockCard>
        </div>
      </>
    );
  }

  function renderStyleDna() {
    if (!selected) return null;
    const dna = selected.styleDna || {};
    const groups: {
      title: string;
      icon: React.ReactNode;
      fields: [string, string][];
    }[] = [
      {
        title: "Narrativa",
        icon: <FileText />,
        fields: [
          ["hookStyle", "Tipo de abertura / hook"],
          ["scriptFlow", "Fluxo do roteiro"],
          ["retentionTechniques", "Open loops & retenção"],
          ["sentenceRhythm", "Ritmo das frases"],
        ],
      },
      {
        title: "Linguagem",
        icon: <Mic />,
        fields: [
          ["tone", "Tom & formalidade"],
          ["targetAudience", "Público-alvo"],
          ["wordsPerSecond", "Palavras por segundo"],
          ["targetWordCount", "Extensão alvo"],
        ],
      },
      {
        title: "Produção Visual",
        icon: <Camera />,
        fields: [["niche", "Território temático"]],
      },
    ];
    return (
      <BlockCard
        icon={<Layers />}
        title="Style DNA"
        stateRef="Estado 05"
        status={selected.stateProgress?.s5}
        onRegenerate={() => regenerateBlock("styleDna")}
        regenerating={regeneratingBlock === "styleDna"}
        onApprove={() => setStateStatus("s5", "approved")}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => (
            <div
              key={g.title}
              className="rounded-xl border border-gp-line/60 bg-gp-panel2/40 p-3"
            >
              <div className="mb-2.5 flex items-center gap-2 text-gp-400 [&_svg]:h-3.5 [&_svg]:w-3.5">
                {g.icon}
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em]">
                  {g.title}
                </span>
              </div>
              <div className="space-y-2.5">
                {g.fields.map(([key, label]) => (
                  <FieldRow
                    key={key}
                    label={label}
                    value={String(dna[key] ?? "")}
                    locked={isLocked(`styleDna.${key}`)}
                    onSave={(v) => saveField("styleDna", key, v)}
                    onToggleLock={() =>
                      toggleLock(
                        `styleDna.${key}`,
                        !isLocked(`styleDna.${key}`)
                      )
                    }
                    onCopy={() =>
                      handleCopy(String(dna[key] ?? ""), `dna-${key}`)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-gp-line/60 bg-gp-panel2/40 p-3">
            <div className="mb-2.5 flex items-center gap-2 text-gp-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em]">
                Confiança da análise
              </span>
            </div>
            <p className="text-[11px] leading-5 text-zinc-400">
              Padrões extraídos dos vídeos de referência fornecidos. Campos com{" "}
              <Lock className="inline h-3 w-3 text-gp-500" /> estão bloqueados e
              não serão alterados em regenerações.
            </p>
            <div className="mt-3 space-y-2">
              {[
                ["Detectado em vídeos analisados", 89],
                ["Consistência entre fontes", 82],
              ].map(([label, v]) => (
                <div key={label as string}>
                  <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                    <span>{label}</span>
                    <span className="text-gp-300">{v}%</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gp-500"
                      style={{ width: `${v}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BlockCard>
    );
  }

  function renderVisual() {
    if (!selected) return null;
    const vp = selected.visualProfile || {};
    return (
      <BlockCard
        icon={<Palette />}
        title="Identidade Visual"
        stateRef="Estado 07"
        status={selected.stateProgress?.s7}
        onRegenerate={() => regenerateBlock("visualProfile")}
        regenerating={regeneratingBlock === "visualProfile"}
        onApprove={() => setStateStatus("s7", "approved")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["artStyle", "Estilo de arte", <Palette key="a" />],
              ["colorPalette", "Paleta de cores", <Palette key="b" />],
              ["lightingStyle", "Iluminação", <Lightbulb key="c" />],
              ["cameraStyle", "Câmera & lentes", <Camera key="d" />],
            ] as [string, string, React.ReactNode][]
          ).map(([key, label]) => (
            <FieldRow
              key={key}
              label={label}
              value={String(vp[key as keyof typeof vp] ?? "")}
              locked={isLocked(`visualProfile.${key}`)}
              onSave={(v) => saveField("visualProfile", key, v)}
              onToggleLock={() =>
                toggleLock(
                  `visualProfile.${key}`,
                  !isLocked(`visualProfile.${key}`)
                )
              }
              onCopy={() =>
                handleCopy(
                  String(vp[key as keyof typeof vp] ?? ""),
                  `vp-${key}`
                )
              }
            />
          ))}
        </div>
      </BlockCard>
    );
  }

  function renderPipeline() {
    if (!selected) return null;
    const videos = selected.videos || [];
    return (
      <>
        <div className="rounded-2xl border border-gp-line bg-gp-panel/80 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-sm font-semibold text-zinc-100">
              Pipeline de produção ({videos.length})
            </h3>
            <div className="flex items-center gap-2">
              <input
                value={newVideoTopic}
                onChange={(e) => setNewVideoTopic(e.target.value)}
                placeholder="Tema do novo vídeo..."
                className="w-56 rounded-xl border border-gp-line bg-gp-panel2 px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-gp-500/50"
              />
              <button
                onClick={() => void addVideo()}
                disabled={generatingVideo}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gp-500 px-3 py-2 font-mono text-[10px] font-bold text-gp-ink transition hover:bg-gp-400 disabled:opacity-40"
              >
                {generatingVideo ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Novo vídeo
              </button>
            </div>
          </div>

          {/* Kanban */}
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-3">
              {videoStages.map((stage) => {
                const inStage = videos.filter(
                  (v) => v.pipelineStage === stage.id
                );
                return (
                  <div
                    key={stage.id}
                    className="w-56 shrink-0 rounded-xl border border-gp-line/60 bg-gp-panel2/40 p-2.5"
                  >
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-gp-400/80">
                        {stage.label}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {inStage.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {inStage.map((v) => (
                        <VideoKanbanCard
                          key={v.id}
                          video={v}
                          stages={videoStages}
                          onMove={(s) => moveVideoStage(v.id, s)}
                          onOpenEditor={() =>
                            onOpenInEditor?.(v.title, v.narrationScript)
                          }
                          onFactCheck={() => runFactCheck(v.id)}
                          factChecking={factChecking === v.id}
                        />
                      ))}
                      {inStage.length === 0 && (
                        <div className="rounded-lg border border-dashed border-gp-line/40 p-3 text-center font-mono text-[9px] text-zinc-600">
                          vazio
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detalhes do primeiro vídeo / beats */}
        {videos.map((v) => (
          <BlockCard
            key={v.id}
            icon={<Clapperboard />}
            title={v.title}
            stateRef={`Vídeo · ${v.duration} · ${v.wordCount} palavras`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                {v.beats?.length || 0} beats
              </span>
              <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                {v.thumbnails?.length || 0} thumbs
              </span>
              <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                {v.factCheck ? "Fatos checados" : "Sem checagem factual"}
              </span>
              <button
                onClick={() => onOpenInEditor?.(v.title, v.narrationScript)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gp-line px-2.5 py-1.5 font-mono text-[10px] text-zinc-300 transition hover:border-gp-500/40 hover:text-gp-300"
              >
                <Play className="h-3 w-3" /> Abrir no Editor
              </button>
            </div>
            <details className="group">
              <summary className="cursor-pointer select-none rounded-lg border border-gp-line/60 bg-gp-panel2/50 px-3 py-2 text-xs text-zinc-300 transition hover:border-gp-500/30">
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-gp-400" /> Roteiro
                  humanizado
                  <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                </span>
              </summary>
              <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gp-line/40 bg-gp-ink/60 p-4 text-xs leading-6 text-zinc-300">
                {v.narrationScript}
              </p>
            </details>
          </BlockCard>
        ))}
      </>
    );
  }

  function renderFactCheck() {
    if (!selected) return null;
    const videos = selected.videos || [];
    return (
      <>
        {videos.map((v) => (
          <BlockCard
            key={v.id}
            icon={<ShieldCheck />}
            title={`Revisão factual · ${v.title}`}
            stateRef="Estado 12"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                {v.factCheck
                  ? `Checado ${timeAgo(v.factCheck.checkedAt)}`
                  : "Nenhuma checagem realizada ainda."}
              </p>
              <button
                onClick={() => runFactCheck(v.id)}
                disabled={factChecking === v.id}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gp-500 px-3 py-2 font-mono text-[10px] font-bold text-gp-ink transition hover:bg-gp-400 disabled:opacity-40"
              >
                {factChecking === v.id ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Search className="h-3 w-3" />
                )}
                {v.factCheck ? "Re-checar" : "Checar fatos"}
              </button>
            </div>

            {v.factCheck && (
              <div className="space-y-3">
                {v.factCheck.summary && (
                  <p className="rounded-xl border border-gp-line/60 bg-gp-panel2/50 p-3 text-xs leading-5 text-zinc-300">
                    {v.factCheck.summary}
                  </p>
                )}
                <div className="space-y-2">
                  {(v.factCheck.claims || []).map((claim, i) => {
                    const meta =
                      CLAIM_META[claim.status] || CLAIM_META.interpretacao;
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-gp-line/60 bg-gp-panel2/40 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider ${meta.cls}`}
                          >
                            {meta.label}
                          </span>
                          {typeof claim.confidence === "number" && (
                            <span className="font-mono text-[10px] text-zinc-500">
                              confiança {claim.confidence}%
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-zinc-300">
                          “{claim.text}”
                        </p>
                        {claim.note && (
                          <p className="mt-1.5 text-[11px] leading-4 text-zinc-500">
                            {claim.note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {(v.factCheck.riskySentences || []).length > 0 && (
                  <div className="rounded-xl border border-orange-400/30 bg-orange-400/[0.06] p-3">
                    <p className="mb-2 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-orange-300">
                      <ShieldAlert className="h-3.5 w-3.5" /> Frases que exigem
                      cautela
                    </p>
                    <ul className="space-y-1.5">
                      {v.factCheck.riskySentences!.map((r, i) => (
                        <li
                          key={i}
                          className="text-[11px] leading-4 text-orange-200/80"
                        >
                          • {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </BlockCard>
        ))}
        {videos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gp-line bg-gp-panel/40 p-8 text-center text-xs text-zinc-500">
            Nenhum vídeo para checar. Gere um vídeo no pipeline primeiro.
          </div>
        )}
      </>
    );
  }

  function renderGenericState() {
    if (!selected) return null;
    const st = states.find((s) => s.id === activeStateId);
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-gp-line bg-gp-panel/40 p-8 text-center">
        <Eye className="h-8 w-8 text-gp-500/40" />
        <h3 className="mt-3 font-display text-lg font-semibold text-zinc-200">
          {st?.label}
        </h3>
        <p className="mt-1 max-w-md text-xs leading-5 text-zinc-500">
          {st?.desc}
        </p>
        <p className="mt-4 max-w-md text-[11px] leading-5 text-zinc-600">
          Este estado é alimentado automaticamente pelo motor conforme os
          estados anteriores avançam. Defina o status acima quando concluir a
          revisão.
        </p>
      </div>
    );
  }
}

// ── Card do canal (lista) ──────────────────────────────────────────────────
function ChannelCard({
  channel,
  states,
  onOpen,
  onDelete,
}: {
  channel: ClonedChannel;
  states: GoldState[];
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const progress = progressCount(channel);
  const next = computeNextAction(channel, states);
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-gp-line bg-gp-panel/80 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-gp-500/40 hover:shadow-xl hover:shadow-gp-950/40">
      <div className="flex items-start justify-between gap-3">
        <ProgressRing value={progress} />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gp-line text-zinc-400 transition hover:border-gp-500/40 hover:text-gp-300"
          >
            <ChevronDown
              className={`h-4 w-4 transition ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-gp-line bg-gp-panel2 shadow-2xl">
              {[
                {
                  label: "Abrir canal",
                  icon: <Eye className="h-3.5 w-3.5" />,
                  action: onOpen,
                },
                {
                  label: "Exportar DNA",
                  icon: <Download className="h-3.5 w-3.5" />,
                  action: () => {
                    navigator.clipboard.writeText(
                      JSON.stringify(channel.styleDna, null, 2)
                    );
                    toast.success("DNA copiado.");
                  },
                },
                {
                  label: "Excluir",
                  icon: <Trash2 className="h-3.5 w-3.5" />,
                  action: onDelete,
                  danger: true,
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setMenuOpen(false);
                    item.action();
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition ${item.danger ? "text-rose-300 hover:bg-rose-400/10" : "text-zinc-300 hover:bg-white/5"}`}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button onClick={onOpen} className="mt-3 block w-full text-left">
        <h3 className="font-display text-lg font-semibold tracking-tight text-zinc-100 transition group-hover:text-gp-300">
          {channel.cloneName}
        </h3>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{channel.niche}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
            {channel.videos?.length || 0} vídeo
            {(channel.videos?.length || 0) !== 1 ? "s" : ""}
          </span>
          <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
            ref: {channel.sourceChannel.split("/")[0].trim().slice(0, 18)}
          </span>
          <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
            {timeAgo(channel.lastEditedAt)}
          </span>
        </div>
        <div className="mt-3 rounded-xl border border-gp-line/60 bg-gp-panel2/50 px-3 py-2">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-gp-400">
            Próxima ação
          </p>
          <p className="mt-0.5 truncate text-[11px] text-zinc-300">
            {next.label}
          </p>
        </div>
      </button>
    </article>
  );
}

// ── Card do kanban de vídeo ────────────────────────────────────────────────
function VideoKanbanCard({
  video,
  stages,
  onMove,
  onOpenEditor,
  onFactCheck,
  factChecking,
}: {
  video: ReconstructedVideo;
  stages: VideoStage[];
  onMove: (stage: string) => void;
  onOpenEditor: () => void;
  onFactCheck: () => void;
  factChecking: boolean;
}) {
  const stageIdx = stages.findIndex((s) => s.id === video.pipelineStage);
  return (
    <div className="rounded-xl border border-gp-line bg-gp-panel p-3 transition hover:border-gp-500/30">
      <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-zinc-200">
        {video.title}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[9px] text-zinc-500">
        <span>{video.wordCount} palavras</span>
        <span>·</span>
        <span>{video.duration}</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {video.factCheck ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[8px] uppercase text-emerald-300">
            <ShieldCheck className="h-2.5 w-2.5" /> fatos
          </span>
        ) : (
          <button
            onClick={onFactCheck}
            disabled={factChecking}
            className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-400/10 px-1.5 py-0.5 font-mono text-[8px] uppercase text-orange-300 transition hover:brightness-125 disabled:opacity-40"
          >
            {factChecking ? (
              <RefreshCw className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <ShieldAlert className="h-2.5 w-2.5" />
            )}{" "}
            checar
          </button>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <select
          value={video.pipelineStage}
          onChange={(e) => onMove(e.target.value)}
          className="flex-1 rounded-lg border border-gp-line bg-gp-panel2 px-1.5 py-1 font-mono text-[9px] text-zinc-300 outline-none focus:border-gp-500/50"
        >
          {stages.map((s, i) => (
            <option key={s.id} value={s.id}>
              {i + 1}. {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={onOpenEditor}
          title="Abrir no Editor"
          className="rounded-lg border border-gp-line p-1.5 text-zinc-400 transition hover:border-gp-500/40 hover:text-gp-300"
        >
          <Play className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gp-500 transition-all duration-500"
          style={{ width: `${((stageIdx + 1) / stages.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ── Rótulo de seção ────────────────────────────────────────────────────────
function SectionLabel({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="mb-3 mt-8 flex items-center gap-2.5 first:mt-0">
      <span className="text-gp-400 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
      <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
        {title}
      </h2>
      <span className="font-mono text-[10px] text-zinc-600">({count})</span>
      <span className="h-px flex-1 bg-gp-line/50" />
    </div>
  );
}

// ── Wizard de análise ──────────────────────────────────────────────────────
function CloneWizard({
  sourceChannel,
  setSourceChannel,
  transcripts,
  setTranscripts,
  topic,
  setTopic,
  transformLevel,
  setTransformLevel,
  cloning,
  onClose,
  onSubmit,
}: {
  sourceChannel: string;
  setSourceChannel: (v: string) => void;
  transcripts: string;
  setTranscripts: (v: string) => void;
  topic: string;
  setTopic: (v: string) => void;
  transformLevel: "conservador" | "equilibrado" | "original";
  setTransformLevel: (v: "conservador" | "equilibrado" | "original") => void;
  cloning: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const levels: {
    id: "conservador" | "equilibrado" | "original";
    label: string;
    desc: string;
  }[] = [
    {
      id: "conservador",
      label: "Conservador",
      desc: "Estrutura próxima do original",
    },
    {
      id: "equilibrado",
      label: "Equilibrado",
      desc: "Fidelidade + originalidade (recomendado)",
    },
    {
      id: "original",
      label: "Altamente original",
      desc: "Reinventa nomes e ângulos",
    },
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-gp-line bg-gp-panel p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-zinc-50">
              Analisar Canal de Referência
            </h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              O sistema identifica padrões estratégicos, mas evita copiar nomes,
              frases, roteiros, identidade visual ou elementos protegidos.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gp-400">
              Estado 01 · Canal de referência
            </span>
            <input
              value={sourceChannel}
              onChange={(e) => setSourceChannel(e.target.value)}
              placeholder="Nome ou URL do canal"
              className="w-full rounded-xl border border-gp-line bg-gp-ink/70 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-gp-500/50"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gp-400">
              Transcrições / notas (opcional)
            </span>
            <textarea
              value={transcripts}
              onChange={(e) => setTranscripts(e.target.value)}
              rows={3}
              placeholder="Cole transcrições ou observações sobre o ritmo do canal..."
              className="w-full resize-y rounded-xl border border-gp-line bg-gp-ink/70 px-3 py-2.5 text-xs leading-5 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-gp-500/50"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gp-400">
              Tema do primeiro vídeo
            </span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex.: Desastre de engenharia histórico"
              className="w-full rounded-xl border border-gp-line bg-gp-ink/70 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-gp-500/50"
            />
          </label>

          <div className="space-y-1.5">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gp-400">
              Nível de transformação
            </span>
            <div className="grid gap-2">
              {levels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setTransformLevel(l.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    transformLevel === l.id
                      ? "border-gp-500/50 bg-gp-500/10"
                      : "border-gp-line bg-gp-panel2/50 hover:border-gp-500/30"
                  }`}
                >
                  <span
                    className={`block text-xs font-semibold ${transformLevel === l.id ? "text-gp-300" : "text-zinc-300"}`}
                  >
                    {l.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-zinc-500">
                    {l.desc}
                  </span>
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-zinc-500">
              Similaridade estrutural estimada:{" "}
              {transformLevel === "conservador"
                ? "62%"
                : transformLevel === "original"
                  ? "18%"
                  : "34%"}{" "}
              · Originalidade recomendada: 80%+
            </p>
          </div>

          <button
            type="submit"
            disabled={cloning || !sourceChannel.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gp-500 px-4 py-3 font-display text-sm font-semibold text-gp-ink transition hover:bg-gp-400 disabled:opacity-40"
          >
            {cloning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
            {cloning
              ? "Executando os 12 estados..."
              : "Executar THE GOLDEN PROMPT"}
          </button>
          {cloning && (
            <p className="text-center font-mono text-[10px] leading-4 text-zinc-500">
              Analisando padrões · extraindo DNA · gerando branding e roteiro.
              Isso pode levar alguns minutos.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
