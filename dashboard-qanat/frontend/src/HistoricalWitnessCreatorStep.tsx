import React from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GitBranch,
  HelpCircle,
  Landmark,
  Lightbulb,
  Link2,
  Lock,
  Mic,
  Plus,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type {
  HistoricalWitnessBlueprint,
  HistoricalWitnessCharacter,
  HistoricalWitnessContext,
  HistoricalWitnessIdea,
  WitnessMode,
} from "./historicalWitnessTypes";

const NICHE_MODES = [
  "História antiga",
  "História militar",
  "Engenharia histórica",
  "Arqueologia",
  "Civilizações e cotidiano",
  "Grandes navegações",
  "História política",
  "Mistérios documentados",
];

// ── Testemunhas separadas por modo ─────────────────────────────────────────
const BUILTIN_CHARACTERS: HistoricalWitnessCharacter[] = [
  // Testemunha histórica — pertence à época
  {
    id: "resident",
    label: "Morador(a) local",
    hint: "Vive o cotidiano e presencia o evento",
    description:
      "morador local que presencia o acontecimento sem conhecer o futuro ou explicações modernas",
    mode: "historical",
  },
  {
    id: "chronicler",
    label: "Cronista militar",
    hint: "Observa a estratégia sem combater",
    description:
      "cronista militar não combatente da época, sóbrio e atento à estratégia e à logística",
    mode: "historical",
  },
  {
    id: "scribe",
    label: "Escriba",
    hint: "Registra documentos e decretos",
    description:
      "escriba que registra documentos, contas e decretos, com acesso a arquivos da época",
    mode: "historical",
  },
  {
    id: "merchant",
    label: "Comerciante",
    hint: "Circula pela cidade e conhece os preços",
    description:
      "comerciante que circula pelas ruas, conhece ofícios, preços, rotas e o movimento da cidade",
    mode: "historical",
  },
  {
    id: "builder",
    label: "Construtor",
    hint: "Entende materiais e técnicas",
    description:
      "construtor ou artesão que entende de materiais, ferramentas e técnicas construtivas da época",
    mode: "historical",
  },
  // Apresentador moderno — reconstrói a história
  {
    id: "reporter",
    label: "Repórter de campo",
    hint: "Investiga a verdade no local",
    description:
      "repórter de campo moderno, curioso, didático e direto, reconstruindo o evento no local",
    mode: "presenter",
  },
  {
    id: "archaeologist",
    label: "Arqueólogo(a)",
    hint: "Lê vestígios e objetos",
    description:
      "arqueólogo especialista, observador e preciso, interpretando vestígios e objetos",
    mode: "presenter",
  },
  {
    id: "scholar",
    label: "Pesquisador(a)",
    hint: "Explica mecanismos e documentos",
    description:
      "pesquisador viajante analítico e acessível, explicando mecanismos e documentos",
    mode: "presenter",
  },
  {
    id: "documentarian",
    label: "Documentarista",
    hint: "Conduz a investigação em câmera",
    description:
      "documentarista que conduz a investigação em câmera, conectando passado e presente",
    mode: "presenter",
  },
];

const CHARACTER_STORAGE = "lumiera-historical-witness-characters-v1";

// ── Metadados semânticos em português ──────────────────────────────────────
const REALITY_META: Record<
  string,
  { label: string; cls: string; tip: string }
> = {
  documented: {
    label: "Bem documentado",
    cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    tip: "Aparece em fontes históricas ou acadêmicas confiáveis.",
  },
  current: {
    label: "Atual",
    cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    tip: "Fato recente ou em vigor.",
  },
  plausible: {
    label: "Interpretação provável",
    cls: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    tip: "A narrativa é plausível, mas parte de interpretação.",
  },
  disputed: {
    label: "Controverso",
    cls: "border-orange-400/40 bg-orange-400/10 text-orange-300",
    tip: "A narrativa aparece em fontes, mas há dúvidas sobre detalhes, causalidade ou interpretação.",
  },
};

const REALITY_FALLBACK = {
  label: "Sem sustentação suficiente",
  cls: "border-rose-400/40 bg-rose-400/10 text-rose-300",
  tip: "Não há fontes suficientes para sustentar a afirmação.",
};

const SATURATION_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  unknown: "Ainda não analisada",
};

function realityMeta(status?: string) {
  return REALITY_META[String(status || "").toLowerCase()] || REALITY_FALLBACK;
}

type Props = {
  creatorLoading: boolean;
  formatSelector: "LONGO" | "SHORTS";
  setFormatSelector: (value: "LONGO" | "SHORTS") => void;
  setIdeationTab: (value: string) => void;
  setCustomTitle: (value: string) => void;
  setCustomHooks: (value: string) => void;
  setCustomOutline: (value: string) => void;
  setCustomBlocks: (value: Array<{ block: number; content: string }>) => void;
  setCreatorProjectName: (value: string) => void;
  setNicheInput: (value: string) => void;
  setHistoricalWitnessContext: (value: HistoricalWitnessContext | null) => void;
};

function projectSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 58);
}

// ── Subcomponentes ─────────────────────────────────────────────────────────
function RealityBadge({ status }: { status?: string }) {
  const meta = realityMeta(status);
  return (
    <span
      title={meta.tip}
      className={`inline-flex cursor-help items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${meta.cls}`}
    >
      <ShieldCheck className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  );
}

function ScoreBar({ label, value }: { label: string; value?: number }) {
  const v =
    typeof value === "number" ? Math.max(0, Math.min(100, value)) : null;
  const tone =
    v == null
      ? "bg-zinc-700"
      : v >= 75
        ? "bg-emerald-400"
        : v >= 50
          ? "bg-amber-400"
          : "bg-rose-400";
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-zinc-500">
        <span>{label}</span>
        <span className="text-zinc-300">{v == null ? "—" : v}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${v ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="cursor-help text-zinc-600 hover:text-zinc-400"
    >
      <HelpCircle className="h-3 w-3" />
    </span>
  );
}

export function HistoricalWitnessCreatorStep(props: Props) {
  const {
    creatorLoading,
    formatSelector,
    setFormatSelector,
    setIdeationTab,
    setCustomTitle,
    setCustomHooks,
    setCustomOutline,
    setCustomBlocks,
    setCreatorProjectName,
    setNicheInput,
    setHistoricalWitnessContext,
  } = props;
  const [niche, setNiche] = React.useState(NICHE_MODES[0]);
  const [witnessMode, setWitnessMode] =
    React.useState<WitnessMode>("historical");
  const [character, setCharacter] = React.useState("resident");
  const [savedCharacters, setSavedCharacters] = React.useState<
    HistoricalWitnessCharacter[]
  >(() => {
    try {
      return JSON.parse(localStorage.getItem(CHARACTER_STORAGE) || "[]");
    } catch {
      return [];
    }
  });
  const [addingCharacter, setAddingCharacter] = React.useState(false);
  const [newCharacterName, setNewCharacterName] = React.useState("");
  const [newCharacterDescription, setNewCharacterDescription] =
    React.useState("");
  const [ideas, setIdeas] = React.useState<HistoricalWitnessIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = React.useState<number | null>(null);
  const [loadingIdeas, setLoadingIdeas] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [blueprint, setBlueprint] =
    React.useState<HistoricalWitnessBlueprint | null>(null);
  const [showHowItWorks, setShowHowItWorks] = React.useState(false);
  const [detailTab, setDetailTab] = React.useState<
    "premissa" | "fontes" | "causalidade" | "contrato"
  >("premissa");
  const [contestAlert, setContestAlert] =
    React.useState<HistoricalWitnessIdea | null>(null);
  const [contractLocked, setContractLocked] = React.useState(false);

  const characters = [...BUILTIN_CHARACTERS, ...savedCharacters];
  const modeCharacters = characters.filter(
    (c) => (c.mode || "presenter") === witnessMode || (c.custom && !c.mode)
  );
  const activeCharacter =
    characters.find((profile) => profile.id === character) || characters[0];
  const idea = selectedIdea == null ? null : ideas[selectedIdea];

  const persistCharacters = (next: HistoricalWitnessCharacter[]) => {
    setSavedCharacters(next);
    localStorage.setItem(CHARACTER_STORAGE, JSON.stringify(next));
  };

  const switchMode = (mode: WitnessMode) => {
    setWitnessMode(mode);
    const first = characters.find((c) => (c.mode || "presenter") === mode);
    if (first) setCharacter(first.id);
    setIdeas([]);
    setSelectedIdea(null);
    setBlueprint(null);
  };

  const addCharacter = () => {
    if (!newCharacterName.trim() || !newCharacterDescription.trim()) {
      toast.error("Dê um nome e uma identidade ao personagem.");
      return;
    }
    const profile: HistoricalWitnessCharacter = {
      id: `custom-${Date.now()}`,
      label: newCharacterName.trim(),
      hint: newCharacterDescription.trim().slice(0, 70),
      description: newCharacterDescription.trim(),
      custom: true,
      mode: witnessMode,
    };
    persistCharacters([...savedCharacters, profile]);
    setCharacter(profile.id);
    setNewCharacterName("");
    setNewCharacterDescription("");
    setAddingCharacter(false);
    toast.success("Personagem adicionado");
  };

  const generateIdeas = async () => {
    setLoadingIdeas(true);
    setBlueprint(null);
    setSelectedIdea(null);
    setContractLocked(false);
    try {
      const response = await fetch("/api/ai/creator/historical-witness-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          format: formatSelector,
          character: activeCharacter.description,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Falha ao gerar ideias.");
      setIdeas(data.ideas || []);
      toast.success("10 perspectivas históricas preparadas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na geração");
    } finally {
      setLoadingIdeas(false);
    }
  };

  const generate = async (target: HistoricalWitnessIdea) => {
    setLoading(true);
    setContestAlert(null);
    try {
      const response = await fetch("/api/ai/creator/historical-witness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          topic: target.event,
          period: target.period,
          location: target.location,
          characterProfile: activeCharacter.custom
            ? "custom"
            : activeCharacter.id,
          customCharacter: activeCharacter.description,
          format: formatSelector,
          editorialTruth: target.hiddenTruth,
          characterView: target.characterView,
          selectedHook: target.hook,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Falha ao criar o roteiro.");
      setBlueprint(data);
      toast.success("Roteiro e prompts da História Viva preparados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na geração");
    } finally {
      setLoading(false);
    }
  };

  // Ao desenvolver: se contestada, exige confirmação antes
  const requestDevelop = (target: HistoricalWitnessIdea) => {
    if (target.contested) {
      setContestAlert(target);
      return;
    }
    void generate(target);
  };

  const apply = () => {
    if (!blueprint || !idea) return;
    const frame = blueprint.historicalFrame || {};
    const contract = idea.historicalContract || {};
    const productionBible = [
      "MODO ESPECIAL: HISTÓRIA VIVA / TESTEMUNHA NO PRESENTE DA ÉPOCA.",
      `VERDADE CENTRAL: ${idea.hiddenTruth}`,
      `VERSÃO POPULAR: ${idea.popularBelief || ""}`,
      `TESE CENTRAL: ${blueprint.promise || idea.whyItMatters || ""}`,
      `ENTIDADE: ${frame.entity || idea.event}`,
      `LOCAL: ${frame.location || idea.location}`,
      `PERÍODO: ${frame.period || idea.period}`,
      `CERTEZA: ${frame.certainty || idea.certainty || "validar em fontes"}`,
      `CONFIABILIDADE HISTÓRICA: ${realityMeta(idea.reality_status).label}`,
      idea.contested
        ? `IDEIA CONTESTADA: ${idea.contestNote || "tratada com ressalvas"}`
        : "",
      `ÂNCORA DE EVIDÊNCIA: ${idea.evidence_anchor || "validar antes do roteiro"}`,
      `SATURAÇÃO NO YOUTUBE: ${SATURATION_LABEL[idea.saturation_level || "unknown"] || "Ainda não analisada"}`,
      `LACUNA EDITORIAL: ${idea.undercovered_reason || "não confirmada"}`,
      `LIMITE DE CONHECIMENTO DA TESTEMUNHA — PODE SABER: ${(idea.knowledgeBarrier?.canKnow || []).join("; ")}`,
      `LIMITE DE CONHECIMENTO DA TESTEMUNHA — NÃO PODE SABER: ${(idea.knowledgeBarrier?.cannotKnow || []).join("; ")}`,
      `CADEIA CAUSAL: ${(idea.causality || []).join(" → ")}`,
      `CONTRATO HISTÓRICO — TECNOLOGIAS PERMITIDAS: ${contract.allowedTech || ""}`,
      `CONTRATO HISTÓRICO — ELEMENTOS PROIBIDOS (ANACRONISMOS): ${contract.forbidden || ""}`,
      `UPGRADE PREMIUM: ${idea.premium_upgrade || ""}`,
      `VALIDAÇÃO PENDENTE: ${idea.validation_needed || ""}`,
      `PONTO DE VISTA: ${idea.characterView}`,
      `CHARACTER LOCK: ${blueprint.characterLock || ""}`,
      `DIREÇÃO DE VOZ: ${blueprint.voiceDirection || ""}`,
      `NEGATIVE PROMPT GLOBAL: ${blueprint.globalNegativePrompt || ""}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    setCustomTitle(blueprint.title || idea.title);
    setCustomHooks(blueprint.hook || idea.hook);
    setCustomOutline(productionBible);
    setCustomBlocks(
      (blueprint.blocks || []).map((block, index) => ({
        block: index + 1,
        content: [
          `NARRAÇÃO: ${block.narration || ""}`,
          `FUNÇÃO CAUSAL: ${block.causalRole || ""}`,
          `BASE FACTUAL: ${block.factBasis || ""}`,
          `EVIDÊNCIA VISUAL: ${block.visualEvidence || ""}`,
          `DURAÇÃO: ${block.durationSeconds || 6}s`,
          `PROMPT VISUAL: ${block.visualPrompt || ""}`,
          `NEGATIVE PROMPT: ${block.negativePrompt || ""}`,
        ].join("\n"),
      }))
    );
    setCreatorProjectName(projectSlug(blueprint.title || idea.title));
    setNicheInput(`${niche}: ${idea.event}`);
    setHistoricalWitnessContext({
      contentMode: "HISTORICAL_WITNESS",
      niche,
      format: formatSelector,
      character: { ...activeCharacter },
      idea: { ...idea },
      blueprint: {
        ...blueprint,
        historicalFrame: { ...(blueprint.historicalFrame || {}) },
        blocks: (blueprint.blocks || []).map((block) => ({ ...block })),
      },
      appliedAt: new Date().toISOString(),
    });
    setIdeationTab("custom");
    toast.success(
      "NARRADORPRO conectado: personagem, época e prompts preservados."
    );
  };

  const sceneCount = formatSelector === "SHORTS" ? 10 : 18;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Hero compacto */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-[#14120f] px-5 py-4">
        <div className="absolute right-0 top-0 h-full w-56 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.14),transparent_65%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Camera className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h3 className="font-display text-base font-bold tracking-tight text-zinc-100">
                História Viva
              </h3>
              <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-zinc-400">
                Reconstrução histórica guiada por época, local, testemunha e
                causalidade — com limite de conhecimento e contrato histórico.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHowItWorks((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-1.5 text-[10px] font-bold text-amber-200 transition hover:bg-amber-500/10"
          >
            Como funciona
            <ChevronDown
              className={`h-3.5 w-3.5 transition ${showHowItWorks ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        {showHowItWorks && (
          <div className="relative mt-4 grid gap-3 border-t border-amber-500/15 pt-4 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Abrir o arquivo",
                d: "Escolha o nicho e o formato do vídeo.",
              },
              {
                n: "2",
                t: "Escolher a testemunha",
                d: "Testemunha histórica ou apresentador moderno.",
              },
              {
                n: "3",
                t: "Reconstruir a época",
                d: "Compare 10 ideias, revise o contrato e desenvolva.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3"
              >
                <span className="font-mono text-[10px] font-bold text-amber-400">
                  PASSO {s.n}
                </span>
                <p className="mt-1 text-xs font-semibold text-zinc-200">
                  {s.t}
                </p>
                <p className="mt-0.5 text-[10px] leading-4 text-zinc-500">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuração principal */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Nicho
          <select
            value={niche}
            onChange={(event) => {
              setNiche(event.target.value);
              setIdeas([]);
              setSelectedIdea(null);
            }}
            className="dash-select normal-case"
          >
            {NICHE_MODES.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Formato
          <select
            value={formatSelector}
            onChange={(event) => {
              setFormatSelector(event.target.value as "LONGO" | "SHORTS");
              setIdeas([]);
              setSelectedIdea(null);
            }}
            className="dash-select normal-case"
          >
            <option value="SHORTS">Shorts 9:16 · 10 cenas</option>
            <option value="LONGO">Longo 16:9 · até 18 cenas</option>
          </select>
        </label>
      </div>

      {/* Testemunha */}
      <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-amber-300" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
              Quem contará a história
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddingCharacter((value) => !value)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-amber-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar personagem
          </button>
        </div>

        {/* Modo: testemunha histórica vs apresentador moderno */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              {
                id: "historical",
                label: "Testemunha histórica",
                desc: "A pessoa pertence à época",
                icon: <Landmark className="h-3.5 w-3.5" />,
              },
              {
                id: "presenter",
                label: "Apresentador moderno",
                desc: "Uma pessoa de hoje reconstrói",
                icon: <Mic className="h-3.5 w-3.5" />,
              },
            ] as {
              id: WitnessMode;
              label: string;
              desc: string;
              icon: React.ReactNode;
            }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => switchMode(m.id)}
              className={`rounded-xl border p-3 text-left transition ${
                witnessMode === m.id
                  ? "border-amber-500/60 bg-amber-500/10"
                  : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
              }`}
            >
              <span
                className={`flex items-center gap-1.5 text-[11px] font-bold ${witnessMode === m.id ? "text-amber-200" : "text-zinc-300"}`}
              >
                {m.icon}
                {m.label}
              </span>
              <span className="mt-1 block text-[9px] text-zinc-500">
                {m.desc}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {modeCharacters.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => {
                setCharacter(profile.id);
                setIdeas([]);
                setSelectedIdea(null);
              }}
              className={`group relative rounded-xl border p-3 text-left transition ${
                character === profile.id
                  ? "border-amber-500/60 bg-amber-500/10"
                  : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
              }`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-200">
                <UserRound className="h-3.5 w-3.5" />
                {profile.label}
              </span>
              <span className="mt-1 block text-[9px] text-zinc-500">
                {profile.hint}
              </span>
              {profile.custom && (
                <span
                  onClick={(event) => {
                    event.stopPropagation();
                    const next = savedCharacters.filter(
                      (entry) => entry.id !== profile.id
                    );
                    persistCharacters(next);
                    if (character === profile.id) setCharacter("resident");
                  }}
                  className="absolute right-2 top-2 hidden text-zinc-600 hover:text-red-400 group-hover:block"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}
        </div>

        {addingCharacter && (
          <div className="grid gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 sm:grid-cols-[.7fr_1.5fr_auto]">
            <input
              value={newCharacterName}
              onChange={(event) => setNewCharacterName(event.target.value)}
              placeholder="Nome ou função"
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
            />
            <input
              value={newCharacterDescription}
              onChange={(event) =>
                setNewCharacterDescription(event.target.value)
              }
              placeholder="Identidade, comportamento, conhecimento e modo de falar"
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={addCharacter}
              className="rounded-lg bg-amber-400 px-4 py-2 text-[10px] font-bold text-zinc-950"
            >
              Salvar
            </button>
          </div>
        )}

        <p className="rounded-lg border border-zinc-800/70 bg-zinc-950/50 px-3 py-2 text-[10px] leading-4 text-zinc-500">
          <span className="font-bold text-zinc-400">
            Limite de conhecimento:{" "}
          </span>
          {witnessMode === "historical"
            ? "a testemunha só pode dizer o que alguém da época veria ou saberia — nada de explicações descobertas séculos depois."
            : "o apresentador pode explicar o contexto moderno, mas deve distinguir evidência, relato antigo e interpretação."}
        </p>
      </div>

      <button
        type="button"
        disabled={loadingIdeas || creatorLoading}
        onClick={() => void generateIdeas()}
        className="dash-btn-primary flex w-full items-center justify-center gap-2 py-3 text-xs disabled:opacity-50"
      >
        {loadingIdeas ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Lightbulb className="h-4 w-4" />
        )}
        {loadingIdeas
          ? "Investigando dez possibilidades…"
          : ideas.length
            ? "Gerar outras 10 ideias"
            : "Descobrir 10 ideias neste nicho"}
      </button>

      {/* Split-view: ideias à esquerda, detalhe à direita */}
      {ideas.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          {/* Coluna esquerda: lista ranqueada */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-zinc-100">
                Dez portas para o passado
              </p>
              <span className="text-[9px] text-amber-300">
                {ideas.length} ideias
              </span>
            </div>
            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {ideas.map((entry, index) => {
                const overall =
                  entry.scores &&
                  Math.round(
                    ((entry.scores.gancho || 0) +
                      (entry.scores.visual || 0) +
                      (entry.scores.originalidade || 0) +
                      (entry.scores.segurancaFactual || 0)) /
                      4
                  );
                return (
                  <button
                    key={`${entry.title}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedIdea(index);
                      setBlueprint(null);
                      setDetailTab("premissa");
                      setContractLocked(false);
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedIdea === index
                        ? "border-amber-500/60 bg-amber-500/[0.07]"
                        : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex gap-2.5">
                      <span className="font-mono text-[10px] text-amber-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold leading-4 text-zinc-100">
                          {entry.title}
                        </p>
                        <p className="mt-1 text-[8px] uppercase tracking-wide text-zinc-600">
                          {entry.period} · {entry.location}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <RealityBadge status={entry.reality_status} />
                          {entry.contested && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-400/10 px-2 py-0.5 text-[9px] font-bold text-orange-300">
                              <AlertTriangle className="h-2.5 w-2.5" />{" "}
                              Contestada
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1 font-mono text-[8px] text-zinc-500">
                          {entry.scores?.gancho != null && (
                            <span>gancho {entry.scores.gancho}</span>
                          )}
                          {entry.scores?.visual != null && (
                            <span>· visual {entry.scores.visual}</span>
                          )}
                          {overall != null && (
                            <span className="text-amber-300">
                              · nota {overall}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-700" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna direita: detalhe da ideia selecionada */}
          <div>
            {!idea ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/30 p-8 text-center">
                <ScrollText className="h-8 w-8 text-zinc-700" />
                <p className="mt-3 text-sm font-semibold text-zinc-300">
                  Selecione uma ideia
                </p>
                <p className="mt-1 max-w-xs text-[11px] leading-5 text-zinc-500">
                  Compare as dez opções à esquerda. Aqui você verá premissa,
                  fontes, cadeia causal e o contrato histórico.
                </p>
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-amber-500/20 bg-[#14120f] p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RealityBadge status={idea.reality_status} />
                    <span
                      title="Quantidade de conteúdo já explorado no YouTube sobre o tema."
                      className="inline-flex cursor-help items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold text-zinc-400"
                    >
                      Saturação:{" "}
                      {SATURATION_LABEL[idea.saturation_level || "unknown"] ||
                        "Ainda não analisada"}
                    </span>
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                      {idea.format_fit || formatSelector} ·{" "}
                      {idea.recommended_duration}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold leading-6 tracking-tight text-zinc-50">
                    {idea.title}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-zinc-500">
                    {idea.period} · {idea.location}
                  </p>
                </div>

                {/* Abas */}
                <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-2">
                  {(
                    [
                      {
                        id: "premissa",
                        label: "Premissa",
                        icon: <BookOpen className="h-3 w-3" />,
                      },
                      {
                        id: "fontes",
                        label: "Evidências",
                        icon: <Link2 className="h-3 w-3" />,
                      },
                      {
                        id: "causalidade",
                        label: "Causalidade",
                        icon: <GitBranch className="h-3 w-3" />,
                      },
                      {
                        id: "contrato",
                        label: "Contrato histórico",
                        icon: <Lock className="h-3 w-3" />,
                      },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDetailTab(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                        detailTab === t.id
                          ? "bg-amber-500/15 text-amber-200"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>

                {detailTab === "premissa" && (
                  <div className="space-y-3">
                    <Field label="Verdade central" value={idea.hiddenTruth} />
                    {idea.popularBelief && (
                      <Field
                        label="Versão popular"
                        value={idea.popularBelief}
                      />
                    )}
                    <Field
                      label="Abertura sugerida"
                      value={`“${idea.hook}”`}
                      italic
                    />
                    <Field
                      label="Perspectiva da testemunha"
                      value={idea.characterView}
                    />
                    {idea.whyItMatters && (
                      <Field
                        label="Por que funciona"
                        value={idea.whyItMatters}
                      />
                    )}

                    {/* Limite de conhecimento */}
                    {idea.knowledgeBarrier?.canKnow?.length ||
                    idea.knowledgeBarrier?.cannotKnow?.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
                          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            <Eye className="h-3 w-3" /> Pode saber / ver
                          </p>
                          <ul className="mt-2 space-y-1">
                            {(idea.knowledgeBarrier?.canKnow || []).map(
                              (k, i) => (
                                <li
                                  key={i}
                                  className="text-[10px] leading-4 text-zinc-400"
                                >
                                  • {k}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-3">
                          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                            <EyeOff className="h-3 w-3" /> Não poderia saber
                          </p>
                          <ul className="mt-2 space-y-1">
                            {(idea.knowledgeBarrier?.cannotKnow || []).map(
                              (k, i) => (
                                <li
                                  key={i}
                                  className="text-[10px] leading-4 text-zinc-400"
                                >
                                  • {k}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    ) : null}

                    {/* Pontuação editorial */}
                    {idea.scores && (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Pontuação editorial
                        </p>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <ScoreBar label="Gancho" value={idea.scores.gancho} />
                          <ScoreBar label="Visual" value={idea.scores.visual} />
                          <ScoreBar
                            label="Originalidade"
                            value={idea.scores.originalidade}
                          />
                          <ScoreBar
                            label="Clareza"
                            value={idea.scores.clareza}
                          />
                          <ScoreBar
                            label="Segurança factual"
                            value={idea.scores.segurancaFactual}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {detailTab === "fontes" && (
                  <div className="space-y-3">
                    {typeof idea.factualCoverage === "number" && (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Cobertura factual
                          </span>
                          <span className="font-mono text-sm font-bold text-amber-300">
                            {idea.factualCoverage}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${idea.factualCoverage}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {idea.evidence_anchor && (
                      <Field
                        label="Âncora de evidência"
                        value={idea.evidence_anchor}
                      />
                    )}
                    {idea.sources && idea.sources.length > 0 ? (
                      <div className="space-y-2">
                        {idea.sources.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
                          >
                            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-zinc-200">
                                {s.title}
                              </p>
                              {s.type && (
                                <span className="mt-0.5 inline-block rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-zinc-500">
                                  {s.type}
                                </span>
                              )}
                              {s.url && (
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 block truncate text-[10px] text-sky-300 hover:underline"
                                >
                                  {s.url}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500">
                        Fontes não listadas pela IA. Use a âncora de evidência e
                        valide antes do roteiro.
                      </p>
                    )}
                    {idea.validation_needed && (
                      <Field
                        label="Validar antes do roteiro"
                        value={idea.validation_needed}
                      />
                    )}
                  </div>
                )}

                {detailTab === "causalidade" && (
                  <div className="space-y-3">
                    {idea.causality && idea.causality.length > 0 ? (
                      <ol className="space-y-2">
                        {idea.causality.map((c, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 font-mono text-[9px] font-bold text-amber-300">
                              {i + 1}
                            </span>
                            <p className="pt-0.5 text-[11px] leading-5 text-zinc-300">
                              {c}
                            </p>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-[11px] text-zinc-500">
                        Cadeia causal não detalhada pela IA.
                      </p>
                    )}
                    {idea.undercovered_reason && (
                      <Field
                        label="Lacuna editorial"
                        value={idea.undercovered_reason}
                      />
                    )}
                  </div>
                )}

                {detailTab === "contrato" && idea.historicalContract && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <Lock className="h-3 w-3" /> Contrato histórico da
                        história
                        <InfoTip text="Depois de aprovado, orienta roteiro, imagens, roupas, arquitetura e narração." />
                      </p>
                      <button
                        type="button"
                        onClick={() => setContractLocked((v) => !v)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
                          contractLocked
                            ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                            : "border-zinc-700 text-zinc-400 hover:border-amber-500/40 hover:text-amber-200"
                        }`}
                      >
                        {contractLocked ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {contractLocked
                          ? "Contrato aprovado"
                          : "Aprovar contrato"}
                      </button>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <ContractField
                        label="Período"
                        value={idea.historicalContract.period}
                      />
                      <ContractField
                        label="Local"
                        value={idea.historicalContract.location}
                      />
                      <ContractField
                        label="Personagem"
                        value={idea.historicalContract.character}
                      />
                      <ContractField
                        label="Evento"
                        value={idea.historicalContract.event}
                      />
                      <ContractField
                        label="Nível de certeza"
                        value={idea.historicalContract.certaintyLevel}
                      />
                      <ContractField
                        label="Clima visual"
                        value={idea.historicalContract.visualMood}
                      />
                    </div>
                    <ContractField
                      label="Tecnologias permitidas"
                      value={idea.historicalContract.allowedTech}
                    />
                    <div className="rounded-xl border border-rose-400/25 bg-rose-400/[0.05] p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-rose-300">
                        Elementos proibidos (anacronismos)
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-zinc-300">
                        {idea.historicalContract.forbidden || "—"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Ação: desenvolver */}
                {!blueprint && (
                  <div className="border-t border-zinc-800 pt-4">
                    <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-[10px] leading-5 text-zinc-500">
                      <span className="font-bold text-zinc-400">
                        Será gerado:{" "}
                      </span>
                      roteiro de ~
                      {idea.recommended_duration ||
                        (formatSelector === "SHORTS" ? "55s" : "10min")}{" "}
                      · {sceneCount} cenas · {sceneCount} prompts de imagem ·{" "}
                      {sceneCount} prompts de movimento · notas de verificação
                      histórica.
                    </div>
                    <button
                      type="button"
                      disabled={loading || creatorLoading}
                      onClick={() => requestDevelop(idea)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-[11px] font-black text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {loading
                        ? "Pesquisando e construindo cenas…"
                        : "Desenvolver história"}
                    </button>
                  </div>
                )}

                {blueprint && (
                  <div className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
                      <Check className="h-4 w-4" />
                      {blueprint.title}
                    </div>
                    <p className="text-[10px] leading-relaxed text-zinc-400">
                      {blueprint.promise}
                    </p>
                    <p className="text-[9px] text-zinc-500">
                      {blueprint.blocks?.length || 0} cenas · personagem travado
                      · cadeia causal e entidade validadas
                    </p>
                    <button
                      type="button"
                      onClick={apply}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-[11px] font-bold text-zinc-950 hover:bg-emerald-400"
                    >
                      <Check className="h-4 w-4" />
                      Aplicar ao Creator
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de alerta histórico */}
      {contestAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setContestAlert(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-orange-400/30 bg-[#16120c] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/40 bg-orange-400/10 text-orange-300">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-zinc-50">
                  Atenção histórica
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-zinc-400">
                  Esta ideia contém elementos discutidos por historiadores.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-400/[0.05] p-3">
              <p className="text-[11px] leading-5 text-zinc-300">
                {contestAlert.contestNote ||
                  "A narrativa aparece em fontes, mas há dúvidas sobre detalhes, causalidade ou interpretação."}
              </p>
              <p className="mt-2 text-[10px] leading-4 text-zinc-500">
                O roteiro deverá distinguir evidência, relato antigo e
                interpretação moderna.
              </p>
            </div>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void generate(contestAlert)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-400 px-4 py-2.5 text-[11px] font-black text-zinc-950 transition hover:bg-orange-300 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Desenvolver com ressalvas
              </button>
              <button
                type="button"
                onClick={() => setContestAlert(null)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-[11px] font-bold text-zinc-300 transition hover:border-zinc-600"
              >
                <X className="h-4 w-4" />
                Buscar uma ideia mais bem documentada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  italic,
}: {
  label: string;
  value: string;
  italic?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1 text-[11px] leading-5 text-zinc-300 ${italic ? "italic text-amber-100/80" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function ContractField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-zinc-300">{value || "—"}</p>
    </div>
  );
}
