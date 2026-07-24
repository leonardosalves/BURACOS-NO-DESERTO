import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenCheck,
  ArrowRight,
  Bookmark,
  Check,
  Clock3,
  Copy,
  Clapperboard,
  ExternalLink,
  Feather,
  FlaskConical,
  Laugh,
  Loader2,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Sparkles,
  ThumbsDown,
  Wand2,
} from "lucide-react";
import toast from "react-hot-toast";
import type { CreatorApplyIdeaOptions } from "./creatorEditorialImport";
import { VisualAssetStylePicker } from "./VisualAssetStylePicker";

type HumorIdea = {
  id: string;
  title: string;
  hook: string;
  factualPremise: string;
  whyFunny: string;
  whyUnderexplored: string;
  formatFit: "SHORTS" | "LONGO";
  durationSeconds: number;
  verificationQueries: string[];
  sources: Array<{ title: string; url: string }>;
  saturationRisk: "baixo" | "medio" | "alto";
  confidence: "alta" | "media" | "baixa";
};

type NarrationResult = {
  title: string;
  hook: string;
  narration: string;
  estimatedSeconds: number;
  verificationNotes: string[];
  factIntegrity: string;
};

type HumorProductionScene = {
  id?: string;
  order: number;
  durationSeconds: number;
  narration: string;
  visualBeat: string;
  mediaType: "image" | "video";
  mediaReason: string;
  imagePrompt: string;
  videoPrompt: string;
  shot: string;
  camera: string;
  onScreenText: string;
  sfxCue: string;
  transition: string;
};

type HumorProductionPlan = {
  title?: string;
  hook?: string;
  narration: string;
  visualComedyDirection?: string;
  continuityBible?: string;
  musicDirection?: string;
  sfxDirection?: string;
  scenes: HumorProductionScene[];
};

type Props = {
  getProjectUrl: (path: string) => string;
  visualAssetStyle?: string;
  visualMapOnly?: boolean;
  onVisualAssetStyleChange?: (styleId: string) => void;
  onVisualMapOnlyChange?: (enabled: boolean) => void;
  onApplyCreator: (
    title: string,
    hook: string,
    options?: CreatorApplyIdeaOptions
  ) => void | Promise<void>;
};

const HUMOR_STYLES = [
  ["observacional inteligente", "Inteligente"],
  ["seco e sutil", "Humor seco"],
  ["ironia leve sem deboche", "Ironia leve"],
  ["energia de stand-up familiar", "Stand-up leve"],
] as const;

const WORK_STEPS = [
  { id: "briefing", label: "Briefing" },
  { id: "pesquisa", label: "Pesquisa" },
  { id: "angulos", label: "Ângulos" },
  { id: "roteiro", label: "Roteiro" },
  { id: "visual", label: "Visual" },
  { id: "revisao", label: "Revisão" },
] as const;

type WorkStepId = (typeof WORK_STEPS)[number]["id"];

const RESEARCH_PHASES = [
  { label: "Analisando o nicho", detail: "Mapeando o território editorial" },
  {
    label: "Buscando fatos verificáveis",
    detail: "Consultando fontes e dados",
  },
  {
    label: "Eliminando pautas fracas",
    detail: "Cortando o que não se sustenta",
  },
  {
    label: "Testando potencial humorístico",
    detail: "Procurando o ângulo da graça",
  },
  {
    label: "Classificando os melhores ângulos",
    detail: "Ranqueando por raridade e força",
  },
];

function deriveVerificationSeal(idea: HumorIdea): {
  label: string;
  tone: "verified" | "partial" | "review" | "controversial";
} {
  const sourceCount = idea.sources?.length || 0;
  if (idea.confidence === "alta" && sourceCount >= 2)
    return { label: "Verificado", tone: "verified" };
  if (idea.confidence === "alta" && sourceCount === 1)
    return { label: "Parcialmente verificado", tone: "partial" };
  if (idea.confidence === "media")
    return { label: "Requer revisão", tone: "review" };
  return { label: "Fato controverso", tone: "controversial" };
}

const SEAL_STYLES: Record<string, string> = {
  verified: "border-emerald-400/30 bg-emerald-950/40 text-emerald-300",
  partial: "border-teal-400/30 bg-teal-950/40 text-teal-300",
  review: "border-amber-400/30 bg-amber-950/40 text-amber-300",
  controversial: "border-rose-400/30 bg-rose-950/40 text-rose-300",
};

function buildHumorStoryboard({
  plan,
  idea,
  format,
  humorStyle,
}: {
  plan: HumorProductionPlan;
  idea: HumorIdea;
  format: "SHORTS" | "LONGO";
  humorStyle: string;
}) {
  const maxBlocks = format === "SHORTS" ? 4 : 8;
  const scenesPerBlock = Math.max(1, Math.ceil(plan.scenes.length / maxBlocks));
  const visualPrompts = plan.scenes.map((scene, index) => {
    const block = Math.floor(index / scenesPerBlock) + 1;
    const sceneInBlock = (index % scenesPerBlock) + 1;
    const durationSeconds = Math.max(2, Number(scene.durationSeconds) || 5);
    const continuity = plan.continuityBible?.trim();
    const mediaType = scene.mediaType === "video" ? "video" : "image";
    const selectedPrompt =
      mediaType === "video"
        ? scene.videoPrompt?.trim()
        : scene.imagePrompt?.trim();
    const productionPrompt = [
      continuity ? `CONTINUITY BIBLE: ${continuity}` : "",
      selectedPrompt,
      scene.visualBeat?.trim()
        ? `VISUAL COMEDY BEAT: ${scene.visualBeat.trim()}`
        : "",
      scene.shot?.trim() ? `SHOT: ${scene.shot.trim()}` : "",
      scene.camera?.trim() ? `CAMERA: ${scene.camera.trim()}` : "",
      mediaType === "video"
        ? "Natural continuous action, precise visual-comedy timing, one readable gag, no meme clutter, no watermark."
        : "Single decisive still frame, precise factual composition, editorial depth, no meme clutter, no watermark.",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      scene: `${block}.${sceneInBlock}`,
      block,
      source_scene_id:
        scene.id || `humor-scene-${String(index + 1).padStart(2, "0")}`,
      narration_text: scene.narration,
      narration_excerpt: scene.narration,
      visual_description: scene.visualBeat,
      duration: `${durationSeconds} segundos`,
      duration_seconds: durationSeconds,
      type: mediaType === "video" ? "vídeo IA (max 10s)" : "imagem IA",
      media_mode: mediaType,
      aspect_ratio: format === "SHORTS" ? "9:16" : "16:9",
      prompt: productionPrompt,
      image_prompt: mediaType === "image" ? productionPrompt : "",
      video_prompt: mediaType === "video" ? productionPrompt : "",
      ai_video_prompt: mediaType === "video" ? productionPrompt : "",
      production: {
        broll_type: mediaType,
        generation_source: "humor-facts",
        media_reason: scene.mediaReason,
      },
      shot: scene.shot,
      camera: scene.camera,
      text_overlay: scene.onScreenText,
      transition: scene.transition,
      sfx_cue: scene.sfxCue,
      editor_notes: [
        scene.visualBeat,
        `Mídia: ${mediaType === "video" ? "vídeo" : "imagem"}`,
        scene.mediaReason ? `Motivo: ${scene.mediaReason}` : "",
        scene.shot ? `Plano: ${scene.shot}` : "",
        scene.camera ? `Câmera: ${scene.camera}` : "",
        scene.sfxCue ? `SFX: ${scene.sfxCue}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      provenance: "humor-facts",
    };
  });

  return {
    strategy: {
      title_main: plan.title || idea.title,
      title_variations: [],
      hook: plan.hook || idea.hook,
      tone: humorStyle,
      factual_premise: idea.factualPremise,
    },
    narrative_script: plan.narration,
    visual_prompts: visualPrompts,
    research_facts: [idea.factualPremise],
    research_sources: idea.sources,
    music_direction: plan.musicDirection || "",
    sfx_direction: plan.sfxDirection || "",
    visual_comedy_direction: plan.visualComedyDirection || "",
    continuity_bible: plan.continuityBible || "",
    technical_config: {
      format,
      aspect_ratio: format === "SHORTS" ? "9:16" : "16:9",
      imported_scene_count: visualPrompts.length,
    },
    specialized_import: {
      source: "humor-facts",
      title: plan.title || idea.title,
      hook: plan.hook || idea.hook,
      factual_premise: idea.factualPremise,
      humor_style: humorStyle,
      source_idea_id: idea.id,
    },
  };
}

function WorkStepper({
  currentStep,
  completedSteps,
}: {
  currentStep: WorkStepId;
  completedSteps: Set<WorkStepId>;
}) {
  const currentIndex = WORK_STEPS.findIndex((s) => s.id === currentStep);
  return (
    <nav className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-stone-800/80 bg-stone-950/60 px-3 py-2.5 backdrop-blur">
      {WORK_STEPS.map((step, index) => {
        const isDone = completedSteps.has(step.id);
        const isCurrent = step.id === currentStep;
        const isPast = index < currentIndex;
        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <span
                className={`h-px w-5 shrink-0 transition-colors duration-500 ${
                  isPast || isDone ? "bg-orange-300/50" : "bg-stone-800"
                }`}
              />
            )}
            <div
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 transition-all duration-300 ${
                isCurrent
                  ? "bg-orange-300/10 ring-1 ring-orange-300/40"
                  : isDone || isPast
                    ? "opacity-90"
                    : "opacity-40"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black transition-all duration-300 ${
                  isDone
                    ? "bg-emerald-400/90 text-emerald-950"
                    : isCurrent
                      ? "bg-orange-300 text-stone-950"
                      : "bg-stone-800 text-stone-500"
                }`}
              >
                {isDone ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isCurrent
                    ? "text-orange-200"
                    : isDone
                      ? "text-stone-300"
                      : "text-stone-600"
                }`}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function ResearchProgress({ phaseIndex }: { phaseIndex: number }) {
  return (
    <div className="rounded-3xl border border-orange-300/15 bg-[#141110] p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-400" />
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200">
          Redação investigando
        </p>
      </div>
      <ol className="space-y-3">
        {RESEARCH_PHASES.map((phase, index) => {
          const done = index < phaseIndex;
          const active = index === phaseIndex;
          return (
            <li
              key={phase.label}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-500 ${
                active
                  ? "border-orange-300/30 bg-orange-300/[0.06]"
                  : done
                    ? "border-emerald-400/15 bg-emerald-950/10"
                    : "border-stone-800/60 bg-transparent opacity-40"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                  done
                    ? "bg-emerald-400/90 text-emerald-950"
                    : active
                      ? "bg-orange-300 text-stone-950"
                      : "bg-stone-800 text-stone-600"
                }`}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="text-[9px] font-black">{index + 1}</span>
                )}
              </span>
              <div>
                <p
                  className={`text-xs font-bold transition-colors duration-500 ${
                    active
                      ? "text-orange-100"
                      : done
                        ? "text-stone-300"
                        : "text-stone-600"
                  }`}
                >
                  {phase.label}
                </p>
                {(active || done) && (
                  <p className="mt-0.5 text-[10px] text-stone-500">
                    {phase.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 border-t border-stone-800/60 pt-4 text-[10px] leading-4 text-stone-600">
        A pesquisa cruza fontes e elimina pautas sem sustentação factual. Isso
        costuma levar cerca de um minuto — cada etapa acima reflete o que a
        redação está fazendo de fato.
      </p>
    </div>
  );
}

function IdeaCard({
  idea,
  index,
  active,
  saved,
  refining,
  onSelect,
  onDevelop,
  onReject,
  onToggleSave,
  onRefine,
}: {
  idea: HumorIdea;
  index: number;
  active: boolean;
  saved: boolean;
  refining: string | null;
  onSelect: () => void;
  onDevelop: () => void;
  onReject: () => void;
  onToggleSave: () => void;
  onRefine: (kind: "hook" | "funnier" | "factual") => void;
}) {
  const [showSources, setShowSources] = useState(false);
  const seal = deriveVerificationSeal(idea);
  const isRefining = refining === idea.id;

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
        active
          ? "border-orange-300/55 bg-orange-300/[0.08] shadow-lg shadow-orange-950/30"
          : "border-stone-800 bg-stone-950/60 hover:border-stone-600 hover:bg-stone-950/80"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0 z-0 cursor-pointer"
        aria-label={`Selecionar pauta ${idea.title}`}
      />
      <div className="relative z-10 pointer-events-none">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[10px] text-orange-300/70">
            PAUTA {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${SEAL_STYLES[seal.tone]}`}
          >
            {seal.tone === "verified" ? (
              <ShieldCheck className="h-3 w-3" />
            ) : seal.tone === "controversial" ? (
              <ShieldAlert className="h-3 w-3" />
            ) : (
              <ShieldQuestion className="h-3 w-3" />
            )}
            {seal.label}
          </span>
        </div>
        <h3 className="mt-3 text-sm font-black leading-5 text-stone-100">
          {idea.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-stone-400">
          {idea.hook}
        </p>

        <div className="mt-3 rounded-xl border border-stone-800/80 bg-black/25 p-3">
          <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
            <BookOpenCheck className="h-3 w-3" /> Fato intocável
          </p>
          <p className="mt-1.5 text-[10px] leading-4 text-stone-400">
            {idea.factualPremise}
          </p>
          <p className="mt-2.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-orange-300">
            <Laugh className="h-3 w-3" /> Espaço para humor
          </p>
          <p className="mt-1.5 text-[10px] leading-4 text-stone-400">
            {idea.whyFunny}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-wide">
          <span className="rounded-md bg-stone-800 px-2 py-1 text-stone-300">
            {idea.formatFit}
          </span>
          <span className="rounded-md bg-emerald-950/60 px-2 py-1 text-emerald-300">
            saturação {idea.saturationRisk}
          </span>
          <span className="rounded-md bg-sky-950/60 px-2 py-1 text-sky-300">
            {idea.sources?.length || 0} fonte
            {(idea.sources?.length || 0) !== 1 ? "s" : ""}
          </span>
          <span className="rounded-md bg-stone-800/80 px-2 py-1 text-stone-400">
            ~{idea.durationSeconds}s
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-1.5 border-t border-stone-800/60 pt-3">
        <button
          type="button"
          onClick={onDevelop}
          className="inline-flex items-center gap-1 rounded-lg bg-orange-300 px-2.5 py-1.5 text-[10px] font-black text-stone-950 transition hover:bg-orange-200"
        >
          <Feather className="h-3 w-3" /> Desenvolver
        </button>
        <button
          type="button"
          onClick={() => setShowSources((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-stone-700 px-2 py-1.5 text-[10px] font-bold text-stone-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
        >
          <ExternalLink className="h-3 w-3" /> Fontes
        </button>
        <button
          type="button"
          disabled={isRefining}
          onClick={() => onRefine("hook")}
          className="inline-flex items-center gap-1 rounded-lg border border-stone-700 px-2 py-1.5 text-[10px] font-bold text-stone-300 transition hover:border-sky-400/40 hover:text-sky-200 disabled:opacity-40"
          title="Gerar outro gancho"
        >
          {refining === idea.id + ":hook" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Gancho
        </button>
        <button
          type="button"
          disabled={isRefining}
          onClick={() => onRefine("funnier")}
          className="inline-flex items-center gap-1 rounded-lg border border-stone-700 px-2 py-1.5 text-[10px] font-bold text-stone-300 transition hover:border-fuchsia-400/40 hover:text-fuchsia-200 disabled:opacity-40"
          title="Tornar mais engraçado"
        >
          {refining === idea.id + ":funnier" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Laugh className="h-3 w-3" />
          )}
          +Graça
        </button>
        <button
          type="button"
          disabled={isRefining}
          onClick={() => onRefine("factual")}
          className="inline-flex items-center gap-1 rounded-lg border border-stone-700 px-2 py-1.5 text-[10px] font-bold text-stone-300 transition hover:border-emerald-400/40 hover:text-emerald-200 disabled:opacity-40"
          title="Tornar mais factual"
        >
          {refining === idea.id + ":factual" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <BookOpenCheck className="h-3 w-3" />
          )}
          +Fatos
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onToggleSave}
          className={`rounded-lg border p-1.5 transition ${
            saved
              ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
              : "border-stone-700 text-stone-500 hover:border-amber-400/40 hover:text-amber-300"
          }`}
          title={saved ? "Salvo para depois" : "Salvar para depois"}
        >
          <Bookmark className={`h-3 w-3 ${saved ? "fill-amber-300" : ""}`} />
        </button>
        <button
          type="button"
          onClick={onReject}
          className="rounded-lg border border-stone-700 p-1.5 text-stone-500 transition hover:border-rose-400/40 hover:text-rose-300"
          title="Rejeitar pauta"
        >
          <ThumbsDown className="h-3 w-3" />
        </button>
      </div>

      {showSources && (
        <div className="relative z-10 mt-3 rounded-xl border border-emerald-400/15 bg-emerald-950/10 p-3">
          <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
            Evidências encontradas
          </p>
          {idea.sources?.length ? (
            <ul className="mt-2 space-y-1.5">
              {idea.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 text-[10px] text-emerald-200/80 underline-offset-2 hover:underline"
                  >
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">
                      {source.title || source.url}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[10px] text-stone-500">
              Nenhuma fonte direta — use os termos de verificação abaixo.
            </p>
          )}
          {idea.verificationQueries?.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {idea.verificationQueries.map((query) => (
                <span
                  key={query}
                  className="rounded-md border border-sky-400/15 bg-black/20 px-2 py-1 text-[9px] text-sky-100/70"
                >
                  {query}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function HumorFactsLab({
  getProjectUrl,
  visualAssetStyle: visualAssetStyleProp = "photorealistic",
  visualMapOnly: visualMapOnlyProp = false,
  onVisualAssetStyleChange,
  onVisualMapOnlyChange,
  onApplyCreator,
}: Props) {
  const [niche, setNiche] = useState("");
  const [format, setFormat] = useState<"SHORTS" | "LONGO">("SHORTS");
  const [humorStyle, setHumorStyle] = useState<string>(HUMOR_STYLES[0][0]);
  const [audience, setAudience] = useState("publico geral brasileiro");
  const [ideas, setIdeas] = useState<HumorIdea[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [narration, setNarration] = useState<NarrationResult | null>(null);
  const [instructions, setInstructions] = useState("");
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingNarration, setLoadingNarration] = useState(false);
  const [loadingProduction, setLoadingProduction] = useState(false);
  const [researchPhase, setResearchPhase] = useState(0);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [rejectedTitles, setRejectedTitles] = useState<string[]>([]);
  const [localVisualStyle, setLocalVisualStyle] =
    useState(visualAssetStyleProp);
  const [localMapOnly, setLocalMapOnly] = useState(visualMapOnlyProp);
  const narrationRef = useRef<HTMLDivElement>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const visualAssetStyle = onVisualAssetStyleChange
    ? visualAssetStyleProp
    : localVisualStyle;
  const visualMapOnly = onVisualMapOnlyChange
    ? visualMapOnlyProp
    : localMapOnly;
  const setVisualAssetStyle = (id: string) => {
    if (onVisualAssetStyleChange) onVisualAssetStyleChange(id);
    else setLocalVisualStyle(id);
  };
  const setVisualMapOnly = (v: boolean) => {
    if (onVisualMapOnlyChange) onVisualMapOnlyChange(v);
    else setLocalMapOnly(v);
  };

  const selected = useMemo(
    () => ideas.find((idea) => idea.id === selectedId) || null,
    [ideas, selectedId]
  );

  useEffect(() => {
    if (loadingIdeas) {
      setResearchPhase(0);
      phaseTimerRef.current = setInterval(() => {
        setResearchPhase((p) => Math.min(p + 1, RESEARCH_PHASES.length - 1));
      }, 11000);
    } else if (phaseTimerRef.current) {
      clearInterval(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    return () => {
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    };
  }, [loadingIdeas]);

  const completedSteps = useMemo(() => {
    const done = new Set<WorkStepId>();
    if (niche.trim().length >= 3) done.add("briefing");
    if (ideas.length > 0) {
      done.add("pesquisa");
      done.add("angulos");
    }
    if (narration) done.add("roteiro");
    if (narration && loadingProduction === false && narration.narration) {
      // visual só marca quando o plano de produção foi enviado ao wizard
    }
    return done;
  }, [niche, ideas.length, narration, loadingProduction]);

  const currentStep: WorkStepId = useMemo(() => {
    if (loadingIdeas) return "pesquisa";
    if (!ideas.length) return "briefing";
    if (!narration) return "angulos";
    if (loadingProduction) return "visual";
    return "revisao";
  }, [loadingIdeas, ideas.length, narration, loadingProduction]);

  const postJson = async (path: string, body: unknown) => {
    const res = await fetch(getProjectUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(data.error || "A operacao falhou."));
    return data;
  };

  const generateIdeas = async () => {
    if (niche.trim().length < 3) {
      toast.error("Informe um nicho para a redacao investigar.");
      return;
    }
    setLoadingIdeas(true);
    setNarration(null);
    try {
      const data = await postJson("/api/humor-facts/ideas", {
        niche,
        format,
        humorStyle,
        audience,
        count: 6,
        excludeIdeas: [...ideas.map((idea) => idea.title), ...rejectedTitles],
        forceVariety: ideas.length > 0,
      });
      const next = (data.ideas || []) as HumorIdea[];
      setIdeas(next);
      setSelectedId(next[0]?.id || "");
      const blocked = Number(data.meta?.rejectedCount || 0);
      toast.success(
        `${next.length} pautas novas encontradas${blocked ? `; ${blocked} repetidas foram bloqueadas` : ""}.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao criar pautas."
      );
    } finally {
      setLoadingIdeas(false);
    }
  };

  const refineIdea = async (
    idea: HumorIdea,
    kind: "hook" | "funnier" | "factual"
  ) => {
    setRefiningId(idea.id + ":" + kind);
    try {
      const data = await postJson("/api/humor-facts/refine-idea", {
        idea,
        refinement: kind,
      });
      const patch = data.result || {};
      setIdeas((prev) =>
        prev.map((item) =>
          item.id === idea.id
            ? {
                ...item,
                hook: patch.hook || item.hook,
                whyFunny: patch.whyFunny || item.whyFunny,
                factualPremise: patch.factualPremise || item.factualPremise,
                confidence: patch.confidence || item.confidence,
              }
            : item
        )
      );
      toast.success(
        kind === "hook"
          ? "Novo gancho gerado."
          : kind === "funnier"
            ? "Pauta ajustada para mais humor."
            : "Base factual reforçada."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no refino.");
    } finally {
      setRefiningId(null);
    }
  };

  const rejectIdea = (idea: HumorIdea) => {
    setIdeas((prev) => prev.filter((item) => item.id !== idea.id));
    setRejectedTitles((prev) => [...prev, idea.title]);
    if (selectedId === idea.id) setSelectedId("");
    toast("Pauta rejeitada — não será sugerida de novo nesta sessão.", {
      icon: "🗑️",
    });
  };

  const toggleSave = (idea: HumorIdea) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idea.id)) {
        next.delete(idea.id);
        toast("Removida das salvas.");
      } else {
        next.add(idea.id);
        toast.success("Pauta salva para depois.");
      }
      return next;
    });
  };

  const developIdea = (idea: HumorIdea) => {
    setSelectedId(idea.id);
    setNarration(null);
    requestAnimationFrame(() => {
      narrationRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const generateNarration = async () => {
    if (!selected) return;
    setLoadingNarration(true);
    try {
      const data = await postJson("/api/humor-facts/narration", {
        idea: selected,
        format,
        humorStyle,
        instructions,
      });
      setNarration(data.result as NarrationResult);
      toast.success(
        "Narracao humoristica criada com a premissa factual preservada."
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao criar narracao."
      );
    } finally {
      setLoadingNarration(false);
    }
  };

  const copyNarration = async () => {
    if (!narration?.narration) return;
    await navigator.clipboard.writeText(narration.narration);
    toast.success("Narracao copiada. Nenhum arquivo do Criador foi alterado.");
  };

  const createVideoFromNarration = async () => {
    if (!selected || !narration) return;
    setLoadingProduction(true);
    try {
      const data = await postJson("/api/humor-facts/production-plan", {
        title: narration.title || selected.title,
        hook: narration.hook || selected.hook,
        narration: narration.narration,
        factualPremise: selected.factualPremise,
        format,
        humorStyle,
        visualAssetStyle,
        visual_map_only_prompts: visualMapOnly,
      });
      const plan = data.result as HumorProductionPlan;
      const sceneText = (scene: (typeof plan.scenes)[number]) =>
        [
          `CENA ${scene.order}`,
          `NARRACAO: ${scene.narration}`,
          `HUMOR VISUAL: ${scene.visualBeat}`,
          `MIDIA ESCOLHIDA: ${scene.mediaType === "video" ? "VIDEO" : "IMAGEM"}`,
          scene.mediaReason ? `MOTIVO DA MIDIA: ${scene.mediaReason}` : "",
          scene.mediaType === "image"
            ? `PROMPT IMAGEM: ${scene.imagePrompt}`
            : `PROMPT VIDEO: ${scene.videoPrompt}`,
          `PLANO/CAMERA: ${scene.shot}; ${scene.camera}`,
          scene.onScreenText ? `TEXTO NA TELA: ${scene.onScreenText}` : "",
          scene.sfxCue ? `SFX: ${scene.sfxCue}` : "",
          scene.transition ? `TRANSICAO: ${scene.transition}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      if (!plan.scenes.length) {
        throw new Error("O diretor visual nao retornou cenas aproveitaveis.");
      }
      const outline = [
        "PLANO FATOS COM GRACA — preservar premissa e narracao aprovadas:",
        `DIRECAO DO HUMOR VISUAL: ${plan.visualComedyDirection || "humor observacional elegante"}`,
        `CONTINUIDADE: ${plan.continuityBible || "manter personagens e linguagem visual"}`,
        `MUSICA: ${plan.musicDirection || ""}`,
        `SONOPLASTIA: ${plan.sfxDirection || "efeitos pontuais, sem poluicao"}`,
        "",
        ...plan.scenes.map(sceneText),
      ].join("\n\n");
      const maxBlocks = format === "SHORTS" ? 4 : 8;
      const groupSize = Math.max(1, Math.ceil(plan.scenes.length / maxBlocks));
      const blocks = Array.from(
        { length: Math.ceil(plan.scenes.length / groupSize) },
        (_, index) => ({
          block: index + 1,
          content: plan.scenes
            .slice(index * groupSize, (index + 1) * groupSize)
            .map(sceneText)
            .join("\n\n"),
        })
      );
      const prebuiltStoryboard = {
        ...buildHumorStoryboard({
          plan,
          idea: selected,
          format,
          humorStyle,
        }),
        visual_asset_style: visualAssetStyle,
        visual_map_only_prompts: visualMapOnly,
        technical_config: {
          visual_asset_style: visualAssetStyle,
          visual_map_only_prompts: visualMapOnly,
        },
      };
      await onApplyCreator(
        plan.title || narration.title,
        plan.hook || narration.hook,
        {
          format,
          mechanic: "humor-facts",
          source: `humor-facts:${selected.id}`,
          customTitle: plan.title || narration.title,
          customHook: plan.hook || narration.hook,
          customPromise: outline,
          whyWorks: outline,
          approvedNarration: plan.narration,
          targetNiche: niche.trim() || "Geral",
          prebuiltStoryboard,
          wizardMode: "humor-facts",
          directImportLabel: "Fatos com Graça",
          visualAssetStyle,
          visualMapOnly,
          blocks,
        }
      );
      toast.success("Storyboard humorístico carregado diretamente no Wizard.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao planejar as cenas."
      );
    } finally {
      setLoadingProduction(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-5 px-1 pb-14 sm:px-2">
      <section className="relative overflow-hidden rounded-[24px] border border-orange-300/20 bg-[#17120f] px-6 py-5 shadow-2xl shadow-black/20 sm:px-8">
        <div className="absolute right-[-70px] top-[-90px] h-56 w-56 rounded-full border-[42px] border-orange-400/5" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-orange-200">
              <Laugh className="h-3.5 w-3.5" /> Redação isolada
            </div>
            <h1 className="font-serif text-3xl font-semibold leading-[1.02] tracking-tight text-stone-50 sm:text-4xl">
              Fatos com <span className="italic text-orange-300">Graça</span>
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-stone-400">
              Descubra fatos pouco explorados e transforme-os em narrativas
              engraçadas sem inventar a realidade.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-950/20 px-3 py-2 text-[10px] leading-4 text-emerald-100/75">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-200" />
            <span>Não lê, não grava e não altera o Criador principal.</span>
          </div>
        </div>
      </section>

      <WorkStepper currentStep={currentStep} completedSteps={completedSteps} />

      <section className="grid gap-6 lg:grid-cols-[minmax(400px,30%)_minmax(0,1fr)] xl:grid-cols-[minmax(440px,28%)_minmax(0,1fr)]">
        <div className="h-fit space-y-5 rounded-3xl border border-stone-800 bg-stone-950/70 p-5 sm:p-6 lg:sticky lg:top-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
              Briefing da pauta
            </p>
            <p className="mt-1 text-xs text-stone-500">
              A busca começa pelo ângulo, não pela piada.
            </p>
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-bold text-stone-300">Nicho</span>
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Ex.: engenharia antiga, animais, medicina..."
              className="w-full rounded-xl border border-stone-700 bg-black/40 px-3 py-3 text-sm text-stone-100 outline-none transition focus:border-orange-400/60"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["SHORTS", "LONGO"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFormat(item)}
                className={`rounded-xl border px-3 py-3 text-left transition ${format === item ? "border-orange-300/50 bg-orange-300/10 text-orange-100" : "border-stone-800 bg-stone-900/50 text-stone-500"}`}
              >
                <span className="block text-[11px] font-black">
                  {item === "SHORTS" ? "Short" : "Vídeo longo"}
                </span>
                <span className="mt-1 block text-[9px] opacity-70">
                  {item === "SHORTS" ? "até 60 segundos" : "6 a 12 minutos"}
                </span>
              </button>
            ))}
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-bold text-stone-300">
              Personalidade do humor
            </span>
            <select
              value={humorStyle}
              onChange={(e) => setHumorStyle(e.target.value)}
              className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-xs text-stone-200"
            >
              {HUMOR_STYLES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold text-stone-300">Público</span>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full rounded-xl border border-stone-700 bg-black/40 px-3 py-2.5 text-xs text-stone-200"
            />
          </label>
          <div className="space-y-2 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/[0.06] p-3">
            <span className="text-xs font-bold text-fuchsia-200">
              Estilo visual dos prompts
            </span>
            <p className="text-[10px] leading-4 text-stone-500">
              Look dos assets no plano visual e no wizard (3D, realista,
              anime…).
            </p>
            <VisualAssetStylePicker
              value={visualAssetStyle}
              onChange={setVisualAssetStyle}
              mapOnly={visualMapOnly}
              onMapOnlyChange={setVisualMapOnly}
            />
          </div>
          <button
            type="button"
            onClick={() => void generateIdeas()}
            disabled={loadingIdeas}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-300 px-4 py-3 text-xs font-black text-stone-950 transition hover:bg-orange-200 disabled:opacity-50"
          >
            {loadingIdeas ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
            {loadingIdeas
              ? "Investigando pautas"
              : ideas.length
                ? "Buscar outras sem repetir"
                : "Descobrir pautas raras"}
          </button>
          {loadingIdeas && (
            <p className="text-center text-[10px] leading-4 text-stone-500">
              Pesquisando fatos verificáveis e eliminando pautas sem
              sustentação.
            </p>
          )}
        </div>

        <div className="space-y-5">
          {loadingIdeas ? (
            <ResearchProgress phaseIndex={researchPhase} />
          ) : ideas.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-stone-700 bg-stone-950/30 px-8 text-center">
              <Feather className="h-9 w-9 text-orange-300/60" />
              <h2 className="mt-4 font-serif text-2xl text-stone-200">
                A mesa de pauta está vazia.
              </h2>
              <p className="mt-2 max-w-md text-xs leading-5 text-stone-500">
                Defina o nicho. A IA separa o que cabe num Short do que merece
                explicação longa e devolve termos para verificação.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  "Tecnologias antigas que parecem modernas",
                  "Erros históricos com consequências inesperadas",
                  "Soluções absurdas que realmente funcionavam",
                  "Profissões antigas difíceis de acreditar",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setNiche(suggestion)}
                    className="rounded-full border border-stone-700 px-3 py-1.5 text-[10px] text-stone-400 transition hover:border-orange-300/40 hover:text-orange-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">
                  {ideas.length} pauta{ideas.length !== 1 ? "s" : ""} em análise
                </p>
                {savedIds.size > 0 && (
                  <p className="inline-flex items-center gap-1 text-[10px] text-amber-300">
                    <Bookmark className="h-3 w-3 fill-amber-300" />
                    {savedIds.size} salva{savedIds.size !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {ideas.map((idea, index) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    index={index}
                    active={selectedId === idea.id}
                    saved={savedIds.has(idea.id)}
                    refining={refiningId}
                    onSelect={() => {
                      setSelectedId(idea.id);
                    }}
                    onDevelop={() => developIdea(idea)}
                    onReject={() => rejectIdea(idea)}
                    onToggleSave={() => toggleSave(idea)}
                    onRefine={(kind) => void refineIdea(idea, kind)}
                  />
                ))}
              </div>
            </>
          )}

          {selected && !loadingIdeas && (
            <section
              ref={narrationRef}
              className="rounded-3xl border border-stone-800 bg-[#11100f] p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 border-b border-stone-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                    Pauta selecionada · etapa Roteiro
                  </p>
                  <h2 className="mt-2 font-serif text-2xl text-stone-100">
                    {selected.title}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-700 px-3 py-1 text-[10px] text-stone-400">
                  <Clock3 className="h-3 w-3" /> ~{selected.durationSeconds}s
                </span>
              </div>
              <div className="grid gap-4 py-5 md:grid-cols-3">
                <InfoBlock
                  icon={<BookOpenCheck />}
                  title="Base factual"
                  text={selected.factualPremise}
                />
                <InfoBlock
                  icon={<Laugh />}
                  title="Onde está a graça"
                  text={selected.whyFunny}
                />
                <InfoBlock
                  icon={<Sparkles />}
                  title="Por que é raro"
                  text={selected.whyUnderexplored}
                />
              </div>
              {selected.verificationQueries.length > 0 && (
                <div className="rounded-2xl border border-sky-400/15 bg-sky-950/15 p-4">
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-sky-300">
                    <SearchCheck className="h-4 w-4" /> Pesquisar antes de
                    publicar
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.verificationQueries.map((query) => (
                      <span
                        key={query}
                        className="rounded-lg border border-sky-400/15 bg-black/20 px-2.5 py-1.5 text-[10px] text-sky-100/70"
                      >
                        {query}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selected.sources?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.sources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-emerald-400/20 bg-emerald-950/20 px-2.5 py-1.5 text-[10px] text-emerald-200 hover:border-emerald-300/50"
                    >
                      {source.title || "Abrir fonte"}
                    </a>
                  ))}
                </div>
              )}
              <label className="mt-5 block space-y-2">
                <span className="text-xs font-bold text-stone-300">
                  Direção opcional da narração
                </span>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="Ex.: mais cinematográfica, evitar gírias, terminar com uma pergunta..."
                  className="w-full resize-y rounded-xl border border-stone-700 bg-black/30 px-3 py-3 text-xs leading-5 text-stone-200 outline-none focus:border-orange-300/50"
                />
              </label>
              <button
                type="button"
                onClick={() => void generateNarration()}
                disabled={loadingNarration}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-orange-300/40 bg-orange-300/10 px-4 py-2.5 text-xs font-black text-orange-200 hover:bg-orange-300/15 disabled:opacity-50"
              >
                {loadingNarration ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Feather className="h-4 w-4" />
                )}{" "}
                {loadingNarration
                  ? "Escrevendo narração..."
                  : "Escrever narração engraçada"}
              </button>
            </section>
          )}

          {narration && (
            <section className="rounded-3xl border border-emerald-300/20 bg-emerald-950/10 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                    Texto final isolado · etapa Revisão
                  </p>
                  <h2 className="mt-1 font-serif text-xl text-stone-100">
                    {narration.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => void copyNarration()}
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-700 px-3 py-2 text-[10px] font-bold text-stone-300 hover:border-emerald-300/40"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </button>
              </div>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-stone-200">
                {narration.narration}
              </p>
              {narration.verificationNotes.length > 0 && (
                <div className="mt-5 border-t border-emerald-300/10 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Pontos que ainda exigem checagem
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-stone-400">
                    {narration.verificationNotes.map((note) => (
                      <li key={note}>• {note}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-5 flex flex-col gap-3 border-t border-emerald-300/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-[10px] leading-5 text-stone-500">
                  O diretor escolherá imagem ou vídeo para cada cena conforme a
                  ação realmente exigir, além de continuidade, música e SFX. A
                  narração acima será preservada palavra por palavra no wizard.
                </p>
                <button
                  type="button"
                  onClick={() => void createVideoFromNarration()}
                  disabled={loadingProduction}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-emerald-950 hover:bg-emerald-200 disabled:opacity-50"
                >
                  {loadingProduction ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clapperboard className="h-4 w-4" />
                  )}
                  {loadingProduction
                    ? "Criando cenas..."
                    : "Criar vídeo no wizard"}
                  {!loadingProduction && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  text,
}: {
  icon: React.ReactElement;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-orange-300 [&_svg]:h-4 [&_svg]:w-4">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-wider">
          {title}
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-stone-400">{text}</p>
    </div>
  );
}
