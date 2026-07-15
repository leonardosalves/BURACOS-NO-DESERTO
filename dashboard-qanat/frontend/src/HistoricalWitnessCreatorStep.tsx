import React from "react";
import toast from "react-hot-toast";
import {
  Camera,
  Check,
  ChevronRight,
  Lightbulb,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import type {
  HistoricalWitnessBlueprint,
  HistoricalWitnessCharacter,
  HistoricalWitnessContext,
  HistoricalWitnessIdea,
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

const BUILTIN_CHARACTERS: HistoricalWitnessCharacter[] = [
  {
    id: "reporter",
    label: "Repórter de campo",
    hint: "Investiga a verdade no local",
    description: "repórter de campo curiosa, didática e direta",
  },
  {
    id: "archaeologist",
    label: "Arqueólogo(a)",
    hint: "Lê vestígios e objetos",
    description: "arqueólogo especialista, observador e preciso",
  },
  {
    id: "chronicler",
    label: "Cronista militar",
    hint: "Vê a estratégia sem lutar",
    description:
      "cronista militar não combatente, sóbrio e atento à estratégia",
  },
  {
    id: "resident",
    label: "Morador(a) local",
    hint: "Vive o cotidiano da época",
    description:
      "morador local que presencia o acontecimento sem conhecer o futuro",
  },
  {
    id: "scholar",
    label: "Pesquisador(a)",
    hint: "Explica mecanismos e documentos",
    description: "pesquisador viajante analítico e acessível",
  },
];

const CHARACTER_STORAGE = "lumiera-historical-witness-characters-v1";

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
  const [character, setCharacter] = React.useState("reporter");
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
  const characters = [...BUILTIN_CHARACTERS, ...savedCharacters];
  const activeCharacter =
    characters.find((profile) => profile.id === character) || characters[0];
  const idea = selectedIdea == null ? null : ideas[selectedIdea];

  const persistCharacters = (next: HistoricalWitnessCharacter[]) => {
    setSavedCharacters(next);
    localStorage.setItem(CHARACTER_STORAGE, JSON.stringify(next));
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

  const generate = async () => {
    if (!idea) return;
    setLoading(true);
    try {
      const response = await fetch("/api/ai/creator/historical-witness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          topic: idea.event,
          period: idea.period,
          location: idea.location,
          characterProfile: activeCharacter.custom
            ? "custom"
            : activeCharacter.id,
          customCharacter: activeCharacter.description,
          format: formatSelector,
          editorialTruth: idea.hiddenTruth,
          characterView: idea.characterView,
          selectedHook: idea.hook,
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

  const apply = () => {
    if (!blueprint || !idea) return;
    const frame = blueprint.historicalFrame || {};
    const productionBible = [
      "MODO ESPECIAL: HISTÓRIA VIVA / TESTEMUNHA NO PRESENTE DA ÉPOCA.",
      `VERDADE CENTRAL: ${idea.hiddenTruth}`,
      `VERSÃO POPULAR: ${idea.popularBelief || ""}`,
      `TESE CENTRAL: ${blueprint.promise || idea.whyItMatters || ""}`,
      `ENTIDADE: ${frame.entity || idea.event}`,
      `LOCAL: ${frame.location || idea.location}`,
      `PERÍODO: ${frame.period || idea.period}`,
      `CERTEZA: ${frame.certainty || idea.certainty || "validar em fontes"}`,
      `STATUS DE REALIDADE: ${idea.reality_status || "disputed"}`,
      `ÂNCORA DE EVIDÊNCIA: ${idea.evidence_anchor || "validar antes do roteiro"}`,
      `SATURAÇÃO: ${idea.saturation_level || "unknown"} — ${idea.saturation_evidence || "não confirmada"}`,
      `LACUNA EDITORIAL: ${idea.undercovered_reason || "não confirmada"}`,
      `UPGRADE PREMIUM: ${idea.premium_upgrade || ""}`,
      `VALIDAÇÃO PENDENTE: ${idea.validation_needed || ""}`,
      `PONTO DE VISTA: ${idea.characterView}`,
      `CHARACTER LOCK: ${blueprint.characterLock || ""}`,
      `DIREÇÃO DE VOZ: ${blueprint.voiceDirection || ""}`,
      `NEGATIVE PROMPT GLOBAL: ${blueprint.globalNegativePrompt || ""}`,
    ].join("\n\n");
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

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-[#14120f] p-5">
        <div className="absolute right-0 top-0 h-full w-56 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.14),transparent_65%)]" />
        <div className="relative flex items-start gap-3">
          <Camera className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">
              História Viva · o passado no presente
            </h3>
            <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-zinc-400">
              Escolha o universo e quem contará. A IA encontra dez verdades
              históricas, define época e local e transforma o personagem em
              testemunha daquele momento.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Modo de nicho
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Personagem que viverá a história
          </p>
          <button
            type="button"
            onClick={() => setAddingCharacter((value) => !value)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-amber-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar personagem
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {characters.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => {
                setCharacter(profile.id);
                setIdeas([]);
                setSelectedIdea(null);
              }}
              className={`group relative rounded-xl border p-3 text-left transition ${character === profile.id ? "border-amber-500/60 bg-amber-500/10" : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"}`}
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
                    if (character === profile.id) setCharacter("reporter");
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

      {ideas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-100">
                Dez portas para o passado
              </p>
              <p className="text-[9px] text-zinc-500">
                Escolha a verdade que o personagem revelará.
              </p>
            </div>
            <span className="text-[9px] text-amber-300">
              {selectedIdea == null
                ? "nenhuma selecionada"
                : `ideia ${selectedIdea + 1} selecionada`}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {ideas.map((entry, index) => (
              <button
                key={`${entry.title}-${index}`}
                type="button"
                onClick={() => {
                  setSelectedIdea(index);
                  setBlueprint(null);
                }}
                className={`rounded-xl border p-3 text-left transition ${selectedIdea === index ? "border-cyan-400/60 bg-cyan-400/8" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"}`}
              >
                <div className="flex gap-3">
                  <span className="font-mono text-[10px] text-amber-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-100">
                      {entry.title}
                    </p>
                    <p className="mt-1 text-[9px] leading-relaxed text-cyan-200/75">
                      {entry.hiddenTruth}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1 text-[8px] uppercase text-zinc-500">
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5">Realidade: {entry.reality_status || "validar"}</span>
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5">Saturação: {entry.saturation_level || "unknown"}</span>
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5">{entry.format_fit || formatSelector} · {entry.recommended_duration}</span>
                    </div>
                    {entry.undercovered_reason && (
                      <p className="mt-1 text-[8px] leading-relaxed text-amber-200/65">Lacuna: {entry.undercovered_reason}</p>
                    )}
                    <p className="mt-2 text-[8px] uppercase tracking-wide text-zinc-600">
                      {entry.period} · {entry.location}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-zinc-700" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {idea && !blueprint && (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-cyan-300" />
            <div className="flex-1">
              <p className="text-[11px] font-bold text-zinc-100">
                {idea.title}
              </p>
              <p className="mt-1 text-[10px] text-zinc-400">
                {idea.characterView}
              </p>
              <p className="mt-2 border-l border-cyan-500/40 pl-3 text-[10px] italic text-cyan-100/80">
                “{idea.hook}”
              </p>
              {idea.premium_upgrade && (
                <p className="mt-2 text-[9px] leading-relaxed text-violet-200/75">Upgrade premium: {idea.premium_upgrade}</p>
              )}
              {idea.validation_needed && (
                <p className="mt-1 text-[9px] leading-relaxed text-amber-200/70">Validar antes do roteiro: {idea.validation_needed}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={loading || creatorLoading}
            onClick={() => void generate()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-[11px] font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading
              ? "Pesquisando e construindo cenas…"
              : "Desenvolver esta ideia em roteiro e prompts"}
          </button>
        </div>
      )}

      {blueprint && (
        <div className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
            <Check className="h-4 w-4" />
            {blueprint.title}
          </div>
          <p className="text-[10px] leading-relaxed text-zinc-400">
            {blueprint.promise}
          </p>
          <p className="text-[9px] text-zinc-500">
            {blueprint.blocks?.length || 0} cenas · personagem travado · cadeia
            causal e entidade validadas
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
  );
}
