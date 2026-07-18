import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Layers,
  PenTool,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import type { CreatorModeIdentity } from "./creatorModeIdentity";

type CollageCreatorStep1Props = {
  creatorLoading: boolean;
  creatorProjectName: string;
  setCreatorProjectName: (v: string) => void;
  nicheInput: string;
  setNicheInput: (v: string) => void;
  narrationDraft: string;
  setNarrationDraft: (v: string) => void;
  formatSelector: "LONGO" | "SHORTS";
  setFormatSelector: (v: "LONGO" | "SHORTS") => void;
  hasApiKey: boolean;
  getProjectUrl: (path: string) => string;
  setCreatorStep: (v: number) => void;
  activeProject: string;
  modeIdentity: CreatorModeIdentity;
};

/**
 * Step 1 for the `collage-broll` Creator wizard.
 *
 * Provides:
 * - Project name input
 * - Niche input
 * - Narration text area (paste or AI-generate)
 * - Format selector (SHORTS / LONGO)
 * - Button to create the project and trigger the metaphor analysis on the backend
 */
export function CollageCreatorStep1({
  creatorLoading,
  creatorProjectName,
  setCreatorProjectName,
  nicheInput,
  setNicheInput,
  narrationDraft,
  setNarrationDraft,
  formatSelector,
  setFormatSelector,
  hasApiKey,
  getProjectUrl,
  setCreatorStep,
  activeProject,
  modeIdentity,
}: CollageCreatorStep1Props) {
  const [generating, setGenerating] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [ideaPremise, setIdeaPremise] = useState("");

  const identity = modeIdentity;

  /* ─── Generate narration via AI ─── */
  const handleGenerateNarration = async () => {
    if (!ideaPremise.trim() && !nicheInput.trim()) {
      toast.error(
        "Escreva ao menos a premissa ou o nicho para gerar a narração."
      );
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/collage-broll/generate-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: ideaPremise.trim(),
          niche: nicheInput.trim(),
          format: formatSelector,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar narração.");
      if (data.text) {
        setNarrationDraft(data.text);
        toast.success(
          "Narração gerada! Revise e ajuste antes de criar o projeto."
        );
      } else {
        toast.error("A IA não retornou uma narração válida.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao gerar narração."
      );
    } finally {
      setGenerating(false);
    }
  };

  /* ─── Create project + trigger metaphor analysis ─── */
  const handleCreateCollageProject = async () => {
    const projectName = creatorProjectName.trim();
    if (!projectName) {
      toast.error("Defina o nome do projeto.");
      return;
    }
    if (!narrationDraft.trim()) {
      toast.error("Cole ou gere a narração antes de criar o projeto.");
      return;
    }
    setCreatingProject(true);
    try {
      // 1) Create project folder
      const createRes = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.replace(/[^a-zA-Z0-9_-]/g, "_"),
          format: formatSelector,
          niche: nicheInput.trim() || "Geral",
        }),
      });
      const createData = await createRes.json();
      if (
        !createRes.ok &&
        !String(createData.error || "").includes("Já existe")
      ) {
        throw new Error(createData.error || "Erro ao criar projeto.");
      }

      // 2) Call the metaphor analysis (Gate 1)
      toast.loading("Analisando narração e gerando metáforas de colagem…", {
        id: "collage-metaphors",
      });
      const metaphorsRes = await fetch("/api/collage-broll/metaphors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: narrationDraft.trim(),
          sessionId: projectName.replace(/[^a-zA-Z0-9_-]/g, "_"),
        }),
      });
      const metaphorsData = await metaphorsRes.json();
      if (!metaphorsRes.ok) {
        throw new Error(metaphorsData.error || "Falha ao gerar metáforas.");
      }

      toast.success("Projeto de colagem criado e metáforas geradas!", {
        id: "collage-metaphors",
      });

      // 3) Advance to Step 2 (Voice & Timing)
      setCreatorStep(2);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao criar projeto de colagem.",
        { id: "collage-metaphors" }
      );
    } finally {
      setCreatingProject(false);
    }
  };

  const disabled = creatorLoading || generating || creatingProject;

  return (
    <div
      className={`mx-auto max-w-4xl space-y-6 rounded-[28px] border ${identity.accentBorder} bg-[#070f0d] p-5 shadow-2xl shadow-black/20 sm:p-7`}
    >
      {/* Header */}
      <div
        className={`border-b ${identity.accentBorder.replace("30", "10")} pb-5`}
      >
        <SectionHeader
          title="Narração para Colagem"
          helpId="creator-step-collage-broll"
          subtitle="Escreva ou cole a narração que será decomposta em metáforas visuais de colagem. Ou use a IA para gerar uma narração a partir de uma premissa."
        />
      </div>

      <div className="space-y-5">
        {/* Project Name */}
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Nome do Projeto
          </label>
          <input
            disabled={disabled}
            type="text"
            placeholder="Ex: deserto-digital, raizes-urbanas..."
            value={creatorProjectName}
            onChange={(e) => setCreatorProjectName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-emerald-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
          />
        </div>

        {/* Niche */}
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Nicho / Contexto
          </label>
          <input
            disabled={disabled}
            type="text"
            placeholder="Ex: filosofia, natureza, tecnologia, finanças..."
            value={nicheInput}
            onChange={(e) => setNicheInput(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-emerald-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
          />
        </div>

        {/* Format */}
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Formato
          </label>
          <select
            disabled={disabled}
            value={formatSelector}
            onChange={(e) =>
              setFormatSelector(e.target.value as "LONGO" | "SHORTS")
            }
            className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-emerald-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
          >
            <option value="SHORTS">Shorts (até 60s)</option>
            <option value="LONGO">Longo (2min+)</option>
          </select>
        </div>

        {/* Premise for AI Generation */}
        <div
          className={`rounded-2xl border ${identity.accentBorder} ${identity.accentSurface} p-4 space-y-3`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${identity.accentText}`} />
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${identity.accentText}`}
            >
              Gerador de Narração IA
            </span>
          </div>
          <input
            disabled={disabled || !hasApiKey}
            type="text"
            placeholder={
              hasApiKey
                ? "Descreva a premissa, tema ou ideia para gerar a narração…"
                : "Configure um provedor de IA primeiro…"
            }
            value={ideaPremise}
            onChange={(e) => setIdeaPremise(e.target.value)}
            className="w-full bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
          />
          <button
            disabled={
              disabled ||
              !hasApiKey ||
              (!ideaPremise.trim() && !nicheInput.trim())
            }
            onClick={handleGenerateNarration}
            className={`${identity.accentSurface} border ${identity.accentBorder} hover:brightness-125 disabled:opacity-40 ${identity.accentText} text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer`}
          >
            {generating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {generating ? "Gerando narração…" : "Gerar Narração por IA"}
            </span>
          </button>
        </div>

        {/* Narration Text Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Narração Completa
            </label>
            {narrationDraft.trim() && (
              <span className="text-[9px] text-emerald-400/70">
                {narrationDraft.trim().split(/\s+/).length} palavras
              </span>
            )}
          </div>
          <textarea
            disabled={disabled}
            rows={10}
            placeholder="Cole aqui a narração completa para o vídeo de colagem, ou gere acima por IA…"
            value={narrationDraft}
            onChange={(e) => setNarrationDraft(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-emerald-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white leading-relaxed resize-y min-h-[120px]"
          />
          <p className="text-[9px] text-zinc-600">
            Cada parágrafo será decomposto em uma metáfora visual para colagem
            de papel stop-motion.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            disabled={
              disabled || !creatorProjectName.trim() || !narrationDraft.trim()
            }
            onClick={handleCreateCollageProject}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            {creatingProject ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
            <span>
              {creatingProject
                ? "Criando projeto e analisando…"
                : "Criar Projeto e Gerar Metáforas"}
            </span>
            {!creatingProject && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
