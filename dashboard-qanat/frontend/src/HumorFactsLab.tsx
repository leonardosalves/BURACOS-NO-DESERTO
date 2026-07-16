import React, { useMemo, useState } from "react";
import {
  BookOpenCheck,
  ArrowRight,
  Check,
  Clock3,
  Copy,
  Clapperboard,
  Feather,
  FlaskConical,
  Laugh,
  Loader2,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import type { CreatorApplyIdeaOptions } from "./creatorEditorialImport";

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

type Props = {
  getProjectUrl: (path: string) => string;
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

export function HumorFactsLab({ getProjectUrl, onApplyCreator }: Props) {
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

  const selected = useMemo(
    () => ideas.find((idea) => idea.id === selectedId) || null,
    [ideas, selectedId]
  );

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
      });
      const next = (data.ideas || []) as HumorIdea[];
      setIdeas(next);
      setSelectedId(next[0]?.id || "");
      toast.success(
        `${next.length} pautas encontradas sem misturar com o Criador principal.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao criar pautas."
      );
    } finally {
      setLoadingIdeas(false);
    }
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
      });
      const plan = data.result as {
        title?: string;
        hook?: string;
        narration: string;
        visualComedyDirection?: string;
        continuityBible?: string;
        musicDirection?: string;
        sfxDirection?: string;
        scenes: Array<{
          order: number;
          narration: string;
          visualBeat: string;
          imagePrompt: string;
          videoPrompt: string;
          shot: string;
          camera: string;
          onScreenText: string;
          sfxCue: string;
          transition: string;
        }>;
      };
      const sceneText = (scene: (typeof plan.scenes)[number]) =>
        [
          `CENA ${scene.order}`,
          `NARRACAO: ${scene.narration}`,
          `HUMOR VISUAL: ${scene.visualBeat}`,
          `PROMPT IMAGEM: ${scene.imagePrompt}`,
          `PROMPT VIDEO: ${scene.videoPrompt}`,
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
          blocks,
        }
      );
      toast.success(
        "Cenas humoristicas prontas. Narracao enviada intacta ao wizard."
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao planejar as cenas."
      );
    } finally {
      setLoadingProduction(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-14">
      <section className="relative overflow-hidden rounded-[28px] border border-orange-300/20 bg-[#17120f] px-6 py-7 shadow-2xl shadow-black/20 sm:px-9">
        <div className="absolute right-[-70px] top-[-90px] h-64 w-64 rounded-full border-[42px] border-orange-400/5" />
        <div className="relative grid gap-7 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-orange-200">
              <Laugh className="h-3.5 w-3.5" /> Feature exclusiva
            </div>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.02] tracking-tight text-stone-50 sm:text-5xl">
              Fatos com <span className="italic text-orange-300">Graca</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-400">
              Uma redacao separada para descobrir fatos pouco explorados e
              transforma-los em narracoes engraçadas sem inventar a realidade.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-950/20 p-4 text-xs leading-5 text-emerald-100/75">
            <p className="flex items-center gap-2 font-bold text-emerald-200">
              <ShieldCheck className="h-4 w-4" /> Isolamento garantido
            </p>
            <p className="mt-2">
              Nao le, nao grava e nao altera roteiro, storyboard, ideias ou
              narracao do Criador principal.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="h-fit space-y-5 rounded-3xl border border-stone-800 bg-stone-950/70 p-5 lg:sticky lg:top-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
              Briefing da pauta
            </p>
            <p className="mt-1 text-xs text-stone-500">
              A busca comeca pelo angulo, nao pela piada.
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
                  {item === "SHORTS" ? "Short" : "Video longo"}
                </span>
                <span className="mt-1 block text-[9px] opacity-70">
                  {item === "SHORTS" ? "ate 60 segundos" : "6 a 12 minutos"}
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
            <span className="text-xs font-bold text-stone-300">Publico</span>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full rounded-xl border border-stone-700 bg-black/40 px-3 py-2.5 text-xs text-stone-200"
            />
          </label>
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
              ? "Investigando angulos..."
              : "Descobrir pautas raras"}
          </button>
        </div>

        <div className="space-y-5">
          {ideas.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-stone-700 bg-stone-950/30 px-8 text-center">
              <Feather className="h-9 w-9 text-orange-300/60" />
              <h2 className="mt-4 font-serif text-2xl text-stone-200">
                A mesa de pauta esta vazia.
              </h2>
              <p className="mt-2 max-w-md text-xs leading-5 text-stone-500">
                Defina o nicho. A IA separa o que cabe num Short do que merece
                explicacao longa e devolve termos para verificacao.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {ideas.map((idea, index) => {
                const active = selectedId === idea.id;
                return (
                  <button
                    key={idea.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(idea.id);
                      setNarration(null);
                    }}
                    className={`group rounded-2xl border p-4 text-left transition ${active ? "border-orange-300/55 bg-orange-300/[0.08]" : "border-stone-800 bg-stone-950/60 hover:border-stone-600"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono text-[10px] text-orange-300/70">
                        PAUTA {String(index + 1).padStart(2, "0")}
                      </span>
                      {active && <Check className="h-4 w-4 text-orange-300" />}
                    </div>
                    <h3 className="mt-3 text-sm font-black leading-5 text-stone-100">
                      {idea.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-stone-400">
                      {idea.hook}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-wide">
                      <span className="rounded-md bg-stone-800 px-2 py-1 text-stone-300">
                        {idea.formatFit}
                      </span>
                      <span className="rounded-md bg-emerald-950/60 px-2 py-1 text-emerald-300">
                        saturacao {idea.saturationRisk}
                      </span>
                      <span className="rounded-md bg-sky-950/60 px-2 py-1 text-sky-300">
                        confianca {idea.confidence}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selected && (
            <section className="rounded-3xl border border-stone-800 bg-[#11100f] p-5 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-stone-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                    Pauta selecionada
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
                  title="Onde esta a graca"
                  text={selected.whyFunny}
                />
                <InfoBlock
                  icon={<Sparkles />}
                  title="Por que e raro"
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
                  Direcao opcional da narracao
                </span>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="Ex.: mais cinematografica, evitar girias, terminar com uma pergunta..."
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
                Escrever narracao engraçada
              </button>
            </section>
          )}

          {narration && (
            <section className="rounded-3xl border border-emerald-300/20 bg-emerald-950/10 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                    Texto final isolado
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
                  O diretor de humor criara cenas, prompts de imagem e video,
                  continuidade, musica e SFX. A narracao acima sera preservada
                  palavra por palavra no wizard.
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
                    : "Criar video no wizard"}
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
