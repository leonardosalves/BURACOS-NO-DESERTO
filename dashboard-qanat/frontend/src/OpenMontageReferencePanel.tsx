import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Clapperboard,
  Link2,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { SettingHelpTip } from "./SettingHelpTip";
import type { GeminiBrowserRequest } from "./geminiAiFetch";
import {
  buildOpenMontageCreatorOutline,
  type CreatorApplyIdeaOptions,
} from "./creatorEditorialImport";

type CapabilityItem = {
  id: string;
  label: string;
  ready: boolean;
  hint?: string;
};

type CapabilityCategory = {
  id: string;
  label: string;
  items: CapabilityItem[];
};

type ReferenceConcept = {
  id: string;
  title: string;
  inspired_by: string;
  creative_twist: string;
  visual_plan?: string;
  audio_plan?: string;
  duration_sec?: number;
};

type ReferenceBrief = {
  content_summary?: string;
  style_profile?: string;
  hook_technique?: string;
  what_works?: string[];
  concepts?: ReferenceConcept[];
  recommended_concept?: string;
  lumiera_requirement?: string;
  creator_title?: string;
  creator_hook?: string;
  _fallback?: boolean;
};

type VideoUnderstanding = {
  summary?: string;
  visual_description?: string;
  hook_first_3s?: string;
  pacing?: string;
  what_works_for_retention?: string[];
  lumiera_takeaways?: string[];
  multimodal?: boolean;
};

type PostAiFn = (
  path: string,
  init?: RequestInit
) => Promise<{
  ok: boolean;
  status: number;
  data: GeminiBrowserRequest & Record<string, unknown>;
}>;

type OpenMontageReferencePanelProps = {
  projectNiche?: string;
  projectFormat: "SHORT" | "LONG";
  getProjectUrl: (endpoint: string) => string;
  postAi: PostAiFn;
  onApplyRequirement?: (text: string) => void;
  onApplyCreator?: (
    title: string,
    hook: string,
    options?: CreatorApplyIdeaOptions
  ) => void;
};

export function OpenMontageReferencePanel({
  projectNiche = "Geral",
  projectFormat,
  getProjectUrl,
  postAi,
  onApplyRequirement,
  onApplyCreator,
}: OpenMontageReferencePanelProps) {
  const [referenceUrl, setReferenceUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState<"analyze" | "capability" | null>(null);
  const [capability, setCapability] = useState<{
    summary?: { ready: number; total: number; coverage: number };
    categories?: CapabilityCategory[];
    recommendation?: string;
  } | null>(null);
  const [brief, setBrief] = useState<ReferenceBrief | null>(null);
  const [metadata, setMetadata] = useState<{
    title?: string;
    author?: string;
    thumbnail?: string;
  } | null>(null);
  const [aiEnhanced, setAiEnhanced] = useState(false);
  const [videoUnderstanding, setVideoUnderstanding] =
    useState<VideoUnderstanding | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(
    null
  );

  const apiFormat = projectFormat === "SHORT" ? "SHORTS" : "LONGO";

  const loadCapability = useCallback(async () => {
    setBusy("capability");
    try {
      const res = await fetch(getProjectUrl("/api/workflow/capability-menu"));
      const data = await res.json();
      if (!res.ok)
        throw new Error(String(data.error || "Falha ao carregar capacidades"));
      setCapability(data);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Erro no capability menu"
      );
    } finally {
      setBusy(null);
    }
  }, [getProjectUrl]);

  useEffect(() => {
    loadCapability();
  }, [loadCapability]);

  const runAnalyze = async () => {
    const url = referenceUrl.trim();
    if (!url) {
      toast.error("Cole a URL do vídeo de referência");
      return;
    }

    setBusy("analyze");
    setBrief(null);
    setMetadata(null);
    setVideoUnderstanding(null);
    setSelectedConceptId(null);

    try {
      const res = await fetch("/api/research/analyze-reference-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          format: apiFormat,
          niche: projectNiche,
          topic: topic.trim() || undefined,
          persist: true,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        const { ok, data: fallback } = await postAi(
          "/api/workflow/analyze-reference",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url,
              format: apiFormat,
              niche: projectNiche,
              topic: topic.trim() || undefined,
              useAi: true,
            }),
          }
        );
        if (!ok) {
          throw new Error(
            String(
              data.error || fallback.error || "Falha na análise multimodal"
            )
          );
        }
        const nextBrief = (fallback.brief as ReferenceBrief) || null;
        setBrief(nextBrief);
        setMetadata((fallback.metadata as typeof metadata) || null);
        setAiEnhanced(Boolean(fallback.aiEnhanced));
        setSelectedConceptId(
          nextBrief?.recommended_concept || nextBrief?.concepts?.[0]?.id || null
        );
        toast(
          "Análise clássica (sem vídeo) — configure Gemini para multimodal PRO."
        );
        return;
      }

      const nextBrief = (data.brief as ReferenceBrief) || null;
      setBrief(nextBrief);
      setMetadata((data.metadata as typeof metadata) || null);
      setVideoUnderstanding(
        (data.videoUnderstanding as VideoUnderstanding) || null
      );
      setAiEnhanced(Boolean(data.aiEnhanced));
      setSelectedConceptId(
        nextBrief?.recommended_concept || nextBrief?.concepts?.[0]?.id || null
      );
      const multimodal = Boolean(
        (data.videoUnderstanding as VideoUnderstanding)?.multimodal
      );
      toast.success(
        multimodal
          ? "Análise PRO — vídeo assistido + conceitos"
          : "Análise com legendas/metadados + conceitos"
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao analisar referência"
      );
    } finally {
      setBusy(null);
    }
  };

  const applyToVideoAgent = () => {
    const text = brief?.lumiera_requirement?.trim();
    if (!text) {
      toast.error("Brief sem lumiera_requirement");
      return;
    }
    onApplyRequirement?.(text);
    toast.success("Pedido copiado para o VideoAgent");
  };

  const activeConcept =
    brief?.concepts?.find((c) => c.id === selectedConceptId) ||
    brief?.concepts?.find((c) => c.id === brief.recommended_concept) ||
    brief?.concepts?.[0];

  const applyToCreator = () => {
    const title = activeConcept?.title?.trim() || brief?.creator_title?.trim();
    if (!title) {
      toast.error("Brief sem título de conceito");
      return;
    }
    const hook =
      brief?.creator_hook?.trim() || brief?.hook_technique?.trim() || title;
    const omPayload = {
      brief: brief!,
      conceptId: activeConcept?.id || selectedConceptId || undefined,
      referenceUrl: referenceUrl.trim() || undefined,
      referenceTitle: metadata?.title,
    };
    const outline = buildOpenMontageCreatorOutline(omPayload);
    onApplyCreator?.(title, hook, {
      format: projectFormat === "SHORT" ? "SHORTS" : "LONGO",
      mechanic: "openmontage-reference",
      whyWorks: outline,
      openMontage: omPayload,
    });
    toast.success(`Creator preparado — conceito ${activeConcept?.id || "A"}`);
  };

  const recommended =
    brief?.concepts?.find((c) => c.id === brief.recommended_concept) ||
    brief?.concepts?.[0];

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4 border border-cyan-500/15">
      <SectionHeader
        title="Inspirado em vídeo — OpenMontage"
        helpId="agents-openmontage"
        icon={<Clapperboard className="w-4 h-4 text-cyan-400 shrink-0" />}
        subtitle="Cole uma URL (YouTube, Shorts, TikTok, Reels). Análise multimodal PRO (Gemini vê o vídeo) + brief OpenMontage com 2–3 conceitos diferenciados."
      />

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
        <SettingHelpTip title="Capability envelope">
          Mostra o que seu estúdio já pode produzir (TTS, stock, Remotion,
          ComfyUI, NotebookLM). Igual ao preflight do OpenMontage — gaps
          aparecem em vermelho.
        </SettingHelpTip>
        {capability?.summary ? (
          <span>
            Capacidades:{" "}
            <span className="text-cyan-300 tabular-nums">
              {capability.summary.ready}/{capability.summary.total}
            </span>{" "}
            ({capability.summary.coverage}%)
          </span>
        ) : null}
        <button
          type="button"
          onClick={loadCapability}
          disabled={busy === "capability"}
          className="text-cyan-400 hover:text-cyan-300 underline-offset-2 hover:underline disabled:opacity-50"
        >
          {busy === "capability" ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      {capability?.categories && capability.categories.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
          {capability.categories.flatMap((cat) =>
            cat.items.map((item) => (
              <div
                key={`${cat.id}-${item.id}`}
                className={`text-[10px] px-2 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                  item.ready
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200/80"
                    : "border-amber-500/20 bg-amber-500/5 text-amber-200/70"
                }`}
                title={item.hint || item.label}
              >
                {item.ready ? (
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </div>
            ))
          )}
        </div>
      ) : null}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="url"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=… ou Shorts / TikTok / Reels"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/40 focus:outline-none"
          />
        </div>
      </div>

      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Twist opcional — ex.: mesmo pacing mas sobre clepsidras romanas"
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-cyan-500/30 focus:outline-none"
      />

      <button
        type="button"
        disabled={!!busy}
        onClick={runAnalyze}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-sky-500/10 border border-cyan-500/40 text-xs font-bold text-cyan-300 hover:from-cyan-500/30 transition disabled:opacity-50"
      >
        {busy === "analyze" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        {busy === "analyze"
          ? "Analisando vídeo (multimodal)…"
          : "Analisar PRO e gerar conceitos"}
      </button>

      {metadata?.thumbnail ? (
        <div className="flex gap-3 items-start">
          <img
            src={metadata.thumbnail}
            alt=""
            className="w-24 h-14 object-cover rounded-lg border border-zinc-800"
          />
          <div className="min-w-0 text-xs">
            <p className="text-zinc-200 font-medium line-clamp-2">
              {metadata.title || "Referência"}
            </p>
            {metadata.author ? (
              <p className="text-zinc-500 text-[10px] mt-0.5">
                {metadata.author}
              </p>
            ) : null}
            {videoUnderstanding?.multimodal ? (
              <span className="text-[10px] text-cyan-400">
                Multimodal · vídeo assistido
              </span>
            ) : aiEnhanced ? (
              <span className="text-[10px] text-cyan-400">
                IA · 5 aspectos + conceitos
              </span>
            ) : brief?._fallback ? (
              <span className="text-[10px] text-amber-400">
                Heurístico — configure Gemini
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {videoUnderstanding?.summary ? (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 space-y-1.5 text-[11px]">
          <p className="text-sky-300/90 font-bold text-[10px] uppercase tracking-wide">
            Entendimento do vídeo
          </p>
          <p className="text-zinc-400 leading-relaxed">
            {videoUnderstanding.summary}
          </p>
          {videoUnderstanding.hook_first_3s ? (
            <p className="text-zinc-500">
              <span className="text-zinc-600">Gancho 3s: </span>
              {videoUnderstanding.hook_first_3s}
            </p>
          ) : null}
          {(videoUnderstanding.what_works_for_retention || []).length > 0 ? (
            <ul className="text-zinc-500 list-disc pl-4 space-y-0.5">
              {videoUnderstanding.what_works_for_retention?.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {brief ? (
        <div className="space-y-3 border-t border-zinc-800 pt-4 animate-fade-in">
          <p className="text-xs text-zinc-400 leading-relaxed">
            {brief.content_summary}
          </p>
          {brief.style_profile ? (
            <p className="text-[11px] text-zinc-500">
              <span className="text-zinc-600">Estilo: </span>
              {brief.style_profile}
            </p>
          ) : null}
          {brief.hook_technique ? (
            <p className="text-[11px] text-zinc-500">
              <span className="text-zinc-600">Gancho: </span>
              {brief.hook_technique}
            </p>
          ) : null}

          {recommended ? (
            <div className="px-3 py-2 rounded-xl border border-cyan-500/25 bg-cyan-500/5">
              <p className="text-[10px] uppercase tracking-widest text-cyan-400/90 font-bold">
                Recomendado — Opção {recommended.id}
              </p>
              <p className="text-sm font-bold text-zinc-200 mt-1">
                {recommended.title}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                <span className="text-emerald-400/80">Mantém: </span>
                {recommended.inspired_by}
              </p>
              <p className="text-[10px] text-zinc-500">
                <span className="text-fuchsia-400/80">Twist: </span>
                {recommended.creative_twist}
              </p>
            </div>
          ) : null}

          {(brief.concepts || []).length > 0 ? (
            <ul className="space-y-1.5 max-h-36 overflow-y-auto">
              {brief.concepts?.map((c) => {
                const selected =
                  (selectedConceptId || recommended?.id) === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedConceptId(c.id)}
                      className={`w-full text-left text-[10px] px-2 py-1.5 rounded-lg border transition ${
                        selected
                          ? "border-cyan-500/40 bg-cyan-500/10 text-zinc-200"
                          : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      <span className="text-cyan-400/70 font-mono">{c.id}</span>{" "}
                      {c.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {onApplyRequirement ? (
              <button
                type="button"
                onClick={applyToVideoAgent}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-violet-500/35 text-violet-300 hover:bg-violet-500/10"
              >
                Usar no VideoAgent
              </button>
            ) : null}
            {onApplyCreator ? (
              <button
                type="button"
                onClick={applyToCreator}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/10"
              >
                Abrir no Creator
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
