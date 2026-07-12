import React from "react";
import toast from "react-hot-toast";
import {
  Check,
  CheckCircle,
  Copy,
  Image,
  Lock,
  MessageSquare,
  RefreshCw,
  Settings,
  Sparkles,
  Video,
} from "lucide-react";
import { DashminProjectTabLayout } from "./DashminProjectTabLayout";
import { SectionHeader } from "./SectionHeader";
import { DashminAiChat, DashminChatApplyButton } from "./DashminAiChat";
import {
  buildThumbnailBrief,
  detectJsonConfig,
  normalizeYoutubeMetadataDisplay,
  renderFormattedText,
} from "./youtubeMetadataDisplay";
import type { AppTab } from "./appTabs";

export type AppAiTabProps = {
  activeProject: string;
  aiProviderBadge: { short: string; detail: string };
  applyAiConfig: (parsedConfig: any) => void;
  applyMetadataToUpload: () => void | Promise<void>;
  canvaThumbnailsLoading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  chatInput: string;
  setChatInput: (v: string) => void;
  chatLoading: boolean;
  chatMessages: Array<{ role: string; content: string }>;
  copiedSection: string | null;
  copyToClipboard: (text: string, section: string) => void;
  fetchTitleExperiment: () => void | Promise<void>;
  fetchTitleExperimentAnalytics: () => void | Promise<void>;
  getProjectUrl: (path: string) => string;
  handleApplyTitleVariant: (variantId: string) => void | Promise<void>;
  handleGenerateCanvaThumbnails: () => void | Promise<void>;
  handleGenerateYoutubeMetadata: () => void | Promise<void>;
  handleGenerateYoutubeThumbnailImages: () => void | Promise<void>;
  handleRelinkYoutube: () => void | Promise<void>;
  handleSendChatMessage: () => void | Promise<void>;
  handleStartTitleExperiment: () => void | Promise<void>;
  hasApiKey: boolean;
  openCanvaThumbnailDesigner: (thumb?: {
    id: string;
    label?: string;
    overlayText?: string;
    pairedTitle?: string;
    composition?: string;
    focalElement?: string;
    colors?: string[];
  }) => void | Promise<void>;
  selectThumbnailForUpload: (generated: {
    id: string;
    fileName?: string;
    url: string;
    editUrl?: string;
  }) => void | Promise<void>;
  setActiveTab: (tab: AppTab) => void;
  setTitleAbSelected: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  setTitleExperimentLoading: (v: boolean) => void;
  setTitleExperimentVideoId: (v: string | null) => void;
  setYtTitle: (v: string) => void;
  titleAbSelected: Record<string, boolean>;
  titleExperiment: any;
  titleExperimentAnalytics: any;
  titleExperimentLoading: boolean;
  titleExperimentRankings: Array<{
    id: string;
    views?: number;
    periodViews?: number;
    periodAvgDuration?: number;
  }>;
  titleExperimentVideoId: string | null;
  titleExperimentWinner: { variantId?: string; views?: number } | null;
  titleRetention: any;
  uploadStatus: any;
  youtubeLoading: boolean;
  youtubeMetadata: string;
  youtubeMetadataFormat: string;
  youtubeMetadataParsed: any;
  youtubeMetadataStrategy: any;
  youtubeThumbnailsGenerated: Array<{
    id: string;
    fileName?: string;
    url: string;
    editUrl?: string;
    label?: string;
    overlayText?: string;
  }>;
  youtubeThumbnailsLoading: boolean;
  ytThumbnailVariant: string;
};

export function AppAiTab({
  activeProject,
  aiProviderBadge,
  applyAiConfig,
  applyMetadataToUpload,
  canvaThumbnailsLoading,
  chatEndRef,
  chatInput,
  setChatInput,
  chatLoading,
  chatMessages,
  copiedSection,
  copyToClipboard,
  fetchTitleExperiment,
  fetchTitleExperimentAnalytics,
  getProjectUrl,
  handleApplyTitleVariant,
  handleGenerateCanvaThumbnails,
  handleGenerateYoutubeMetadata,
  handleGenerateYoutubeThumbnailImages,
  handleRelinkYoutube,
  handleSendChatMessage,
  handleStartTitleExperiment,
  hasApiKey,
  openCanvaThumbnailDesigner,
  selectThumbnailForUpload,
  setActiveTab,
  setTitleAbSelected,
  setTitleExperimentLoading,
  setTitleExperimentVideoId,
  setYtTitle,
  titleAbSelected,
  titleExperiment,
  titleExperimentAnalytics,
  titleExperimentLoading,
  titleExperimentRankings,
  titleExperimentVideoId,
  titleExperimentWinner,
  titleRetention,
  uploadStatus,
  youtubeLoading,
  youtubeMetadata,
  youtubeMetadataFormat,
  youtubeMetadataParsed,
  youtubeMetadataStrategy,
  youtubeThumbnailsGenerated,
  youtubeThumbnailsLoading,
  ytThumbnailVariant,
}: AppAiTabProps) {
  // Helper to parse sections by title
  const parsedSections: Record<string, string> = {};
  const otherSections: Array<{ title: string; content: string }> = [];

  if (youtubeMetadata) {
    const rawSections = normalizeYoutubeMetadataDisplay(youtubeMetadata)
      .split(/^## /m)
      .filter(Boolean);

    for (const sec of rawSections) {
      const lines = sec.split("\n");
      const title = lines[0]?.trim();
      const content = lines.slice(1).join("\n").trim();
      if (title) {
        const normalizedTitle = title
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        if (
          [
            "TITULOS",
            "DESCRICAO",
            "CAPITULOS",
            "GANCHO DE RETENCAO",
            "CTA DE MEIO DE VIDEO",
          ].includes(normalizedTitle)
        ) {
          parsedSections[normalizedTitle] = content;
        } else {
          // If the title is "THUMBNAILS A/B" or similar and thumbnails list is handled separately, skip it
          if (
            normalizedTitle === "THUMBNAILS A/B" &&
            youtubeMetadataParsed?.thumbnails?.length
          ) {
            continue;
          }
          otherSections.push({ title, content });
        }
      }
    }
  }

  return (
    <DashminProjectTabLayout
      tab="ai"
      activeProject={activeProject}
      className=""
    >
      <div className="space-y-6">
        {/* Unified Status and Action Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasApiKey ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-dash-primary/10 text-dash-primary border border-dash-primary/20"}`}
              >
                {hasApiKey ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </div>

              <div>
                <h3 className="text-white font-bold text-xs uppercase tracking-wider">
                  Painel AI Metadados
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {hasApiKey
                    ? `Conectado via ${aiProviderBadge.short}. ${aiProviderBadge.detail}`
                    : aiProviderBadge.detail}
                </p>
              </div>
            </div>

            {(youtubeMetadataFormat ||
              youtubeMetadataStrategy?.profileLabel) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {youtubeMetadataFormat && (
                  <span
                    className={`inline-flex text-[9px] font-bold px-2 py-0.5 rounded ${youtubeMetadataFormat === "SHORT" ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"}`}
                  >
                    {youtubeMetadataFormat === "SHORT"
                      ? "Shorts · feed + rewatch"
                      : "Longo · CTR + retenção"}
                  </span>
                )}
                {youtubeMetadataStrategy?.profileLabel && (
                  <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Perfil: {youtubeMetadataStrategy.profileLabel}
                  </span>
                )}
                {youtubeMetadataStrategy?.rpm && (
                  <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    RPM {youtubeMetadataStrategy.rpm}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <button
              onClick={() => setActiveTab("settings")}
              className="dash-btn-ghost-sm h-9 px-3"
            >
              <Settings className="w-3.5 h-3.5" />
              Configurações
            </button>

            {youtubeMetadataParsed?.description && (
              <button
                onClick={applyMetadataToUpload}
                className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-[11px] font-bold h-9 px-4 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-gold-500/10"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Aplicar ao Upload</span>
              </button>
            )}

            <button
              disabled={youtubeLoading || !hasApiKey}
              onClick={handleGenerateYoutubeMetadata}
              className="dash-btn-primary text-[11px] h-9 px-4 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{youtubeLoading ? "Gerando..." : "Gerar Metadados"}</span>
            </button>

            <button
              disabled={youtubeThumbnailsLoading}
              onClick={handleGenerateYoutubeThumbnailImages}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-bold h-9 px-4 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              {youtubeThumbnailsLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Image className="w-3.5 h-3.5" />
              )}
              <span>
                {youtubeThumbnailsLoading ? "Gerando..." : "Gerar Capas"}
              </span>
            </button>

            <button
              disabled={
                canvaThumbnailsLoading || !uploadStatus.canva?.connected
              }
              onClick={handleGenerateCanvaThumbnails}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-[11px] font-bold h-9 px-4 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10"
            >
              {canvaThumbnailsLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>
                {canvaThumbnailsLoading ? "Canva..." : "Gerar no Canva"}
              </span>
            </button>
          </div>
        </div>

        {/* State Handler Rendering */}
        {youtubeLoading ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-16 flex flex-col items-center justify-center text-center gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-gold-500" />
            <h3 className="text-white font-bold text-base">
              Analisando Roteiro...
            </h3>
            <p className="text-zinc-400 text-xs max-w-md">
              A IA está examinando a estrutura narrativa, os pontos de retenção
              e ganchos para gerar metadados de alta performance.
            </p>
          </div>
        ) : youtubeMetadata ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Column 1 (Left - 7 cols): Titles, Description & Chapters */}
            <div className="lg:col-span-7 space-y-6">
              {/* TITLES CARD */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 relative group shadow-lg">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
                  <div>
                    <h3 className="text-gold-500 font-bold text-xs tracking-wider font-sans uppercase">
                      TÍTULOS E EXPERIMENTOS A/B
                    </h3>
                    <p className="text-[9px] text-zinc-500 mt-0.5">
                      Varie e teste títulos com base no roteiro sincronizado.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      copyToClipboard(
                        parsedSections["TITULOS"] || "",
                        "youtube-titles"
                      )
                    }
                    className="bg-zinc-900 border border-zinc-800 text-gray-500 hover:text-white px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 transition cursor-pointer opacity-60 group-hover:opacity-100"
                  >
                    {copiedSection === "youtube-titles" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedSection === "youtube-titles"
                        ? "Copiado!"
                        : "Copiar Títulos"}
                    </span>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Title Experiment Controls */}
                  <div className="bg-black/60 border border-zinc-900 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wide">
                          Teste A/B de Títulos
                        </span>
                        <p className="text-[9px] text-zinc-500 mt-0.5">
                          Publique o vídeo, cole o videoId e alterne títulos com
                          analytics do YouTube.
                        </p>
                      </div>
                      <button
                        disabled={titleExperimentLoading}
                        onClick={fetchTitleExperimentAnalytics}
                        className="text-[9px] font-bold text-violet-400 hover:text-violet-300 px-2 py-1 rounded border border-violet-500/30 hover:border-violet-500/50 transition cursor-pointer"
                      >
                        {titleExperimentLoading
                          ? "Atualizando..."
                          : "Atualizar Analytics"}
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="videoId do YouTube (ex: dQw4w9WgXcQ)"
                      value={titleExperimentVideoId || ""}
                      onChange={(e) =>
                        setTitleExperimentVideoId(e.target.value)
                      }
                      className="w-full bg-black border border-zinc-800 focus:border-violet-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-white"
                    />

                    {titleExperimentAnalytics?.available && (
                      <div className="space-y-2 pt-1 border-t border-zinc-900/60">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                            <span className="text-zinc-500 block">
                              Views (28d)
                            </span>
                            <span className="text-white font-bold">
                              {titleExperimentAnalytics.metrics?.views ?? 0}
                            </span>
                          </div>
                          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                            <span className="text-zinc-500 block">
                              Min. assistidos
                            </span>
                            <span className="text-white font-bold">
                              {Math.round(
                                titleExperimentAnalytics.metrics
                                  ?.estimatedMinutesWatched || 0
                              )}
                            </span>
                          </div>
                          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                            <span className="text-zinc-500 block">
                              Retenção média
                            </span>
                            <span className="text-white font-bold">
                              {Math.round(
                                titleExperimentAnalytics.metrics
                                  ?.averageViewDuration || 0
                              )}
                              s
                            </span>
                          </div>
                          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                            <span className="text-zinc-500 block">
                              Likes / Coment.
                            </span>
                            <span className="text-white font-bold">
                              {titleExperimentAnalytics.metrics?.likes ?? 0} /{" "}
                              {titleExperimentAnalytics.metrics?.comments ?? 0}
                            </span>
                          </div>
                        </div>

                        {titleExperimentAnalytics.reachNote && (
                          <p className="text-[8px] text-zinc-500">
                            {titleExperimentAnalytics.reachNote}
                          </p>
                        )}
                        {titleExperimentWinner?.variantId && (
                          <p className="text-[9px] text-emerald-400 font-bold">
                            Líder por views no período: variante{" "}
                            {titleExperimentWinner.variantId} (
                            {titleExperimentWinner.views} views)
                          </p>
                        )}
                        {titleRetention?.velocity?.views48h != null && (
                          <p className="text-[9px] text-cyan-400">
                            Views 48h: {titleRetention.velocity.views48h}
                          </p>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            disabled={
                              titleExperimentLoading || !titleExperimentWinner
                            }
                            onClick={async () => {
                              setTitleExperimentLoading(true);
                              try {
                                const res = await fetch(
                                  getProjectUrl(
                                    "/api/youtube/title-experiment/apply-winner"
                                  ),
                                  { method: "POST" }
                                );
                                const data = await res.json();
                                if (res.ok) {
                                  toast(
                                    `Vencedor ${data.winner?.variantId} aplicado permanentemente.`
                                  );
                                  fetchTitleExperimentAnalytics();
                                } else {
                                  toast(
                                    data.error || "Falha ao aplicar vencedor."
                                  );
                                }
                              } finally {
                                setTitleExperimentLoading(false);
                              }
                            }}
                            className="text-[8px] font-bold text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded disabled:opacity-50"
                          >
                            Aplicar vencedor
                          </button>
                          <button
                            type="button"
                            disabled={titleExperimentLoading}
                            onClick={async () => {
                              await fetch(
                                getProjectUrl(
                                  "/api/youtube/title-experiment/stop"
                                ),
                                { method: "POST" }
                              );
                              toast("Experimento de títulos encerrado.");
                              fetchTitleExperiment();
                            }}
                            className="text-[8px] font-bold text-zinc-400 border border-zinc-700 px-2 py-1 rounded"
                          >
                            Parar teste
                          </button>
                        </div>
                      </div>
                    )}

                    {uploadStatus.youtube?.connected &&
                      uploadStatus.youtube?.titleTestReady === false && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-2 space-y-1.5">
                          <p className="text-[9px] text-amber-400 font-bold">
                            Permissões antigas (só upload)
                          </p>
                          <p className="text-[9px] text-amber-500/90">
                            Faltam:{" "}
                            {(uploadStatus.youtube?.missingScopes || []).join(
                              ", "
                            ) || "editar títulos e analytics"}
                            .
                          </p>
                          <button
                            type="button"
                            onClick={handleRelinkYoutube}
                            className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 text-[9px] font-bold py-1.5 rounded-lg transition cursor-pointer"
                          >
                            Revincular YouTube (obrigatório)
                          </button>
                        </div>
                      )}

                    {titleExperimentAnalytics &&
                      !titleExperimentAnalytics.available &&
                      titleExperimentAnalytics.error && (
                        <p className="text-[9px] text-amber-500">
                          {titleExperimentAnalytics.error}
                        </p>
                      )}

                    <button
                      disabled={
                        titleExperimentLoading ||
                        !uploadStatus.youtube?.connected
                      }
                      onClick={handleStartTitleExperiment}
                      className="w-full bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 disabled:opacity-50 text-[10px] font-bold py-1.5 rounded-lg transition cursor-pointer"
                    >
                      {titleExperimentLoading
                        ? "Processando..."
                        : "Iniciar teste A/B (títulos marcados)"}
                    </button>
                  </div>

                  {/* Coherence / Fidelity Warnings */}
                  {youtubeMetadataParsed?.fidelity && (
                    <div
                      className={`rounded-lg border px-3 py-2 text-[9px] ${youtubeMetadataParsed.fidelity.ok ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-300" : "border-amber-500/25 bg-amber-500/5 text-amber-200"}`}
                    >
                      <div className="flex items-center justify-between gap-2 font-bold">
                        <span>
                          {youtubeMetadataParsed.fidelity.ok
                            ? "Metadados coerentes com o roteiro"
                            : "Revisão de coerência recomendada"}
                        </span>
                        {typeof youtubeMetadataParsed.fidelity?.grounding
                          ?.coverage === "number" && (
                          <span className="font-mono">
                            {youtubeMetadataParsed.fidelity.grounding.coverage}%
                            dos termos sustentados
                          </span>
                        )}
                      </div>
                      {youtubeMetadataParsed.fidelity.warnings?.length > 0 && (
                        <p className="mt-1 leading-relaxed">
                          {youtubeMetadataParsed.fidelity.warnings.join(" ")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Title List */}
                  {youtubeMetadataParsed?.titles?.length ? (
                    <div className="space-y-2">
                      {youtubeMetadataParsed.titles.map((t, tIdx) => {
                        const hasHashtag = /#[\wÀ-ÿ]+/i.test(t.text);
                        const hasEmoji = /\p{Extended_Pictographic}/u.test(
                          t.text
                        );
                        const maxChars =
                          youtubeMetadataFormat === "SHORT"
                            ? hasHashtag || hasEmoji
                              ? 55
                              : 40
                            : 50;
                        const ok = t.chars <= maxChars;
                        const isRecommended =
                          tIdx === 0 ||
                          t.text === youtubeMetadataParsed.recommendedTitle;
                        const variantId = String.fromCharCode(65 + tIdx);
                        const isAbSelected =
                          titleAbSelected[String(tIdx)] !== false;
                        const isActiveVariant =
                          titleExperiment?.activeVariantId === variantId;
                        const ranking = titleExperimentRankings.find(
                          (r) => r.id === variantId
                        );

                        return (
                          <div
                            key={tIdx}
                            className={`flex items-start justify-between gap-3 bg-zinc-900/40 border rounded-xl px-3 py-2.5 transition ${isRecommended ? "border-gold-500/40 bg-gold-500/5 ring-1 ring-gold-500/10" : isActiveVariant ? "border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/10" : "border-zinc-800 hover:border-zinc-700"}`}
                          >
                            <div className="min-w-0 flex items-start gap-2.5 flex-1">
                              <input
                                type="checkbox"
                                checked={isAbSelected}
                                onChange={(e) =>
                                  setTitleAbSelected((prev) => ({
                                    ...prev,
                                    [String(tIdx)]: e.target.checked,
                                  }))
                                }
                                className="mt-1 accent-violet-500 cursor-pointer"
                                title="Incluir no teste A/B"
                              />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    #{tIdx + 1}
                                  </span>
                                  {isRecommended && (
                                    <span className="text-[8px] font-bold text-gold-400 bg-gold-500/10 border border-gold-500/20 px-1 rounded uppercase tracking-wide">
                                      Recomendado
                                    </span>
                                  )}
                                  {isActiveVariant && (
                                    <span className="text-[8px] text-violet-400 font-bold bg-violet-500/10 border border-violet-500/20 px-1 rounded uppercase">
                                      Ativo no YT
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-zinc-200 leading-snug break-words">
                                  {t.text}
                                </span>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span
                                    className={`text-[9px] font-mono ${ok ? "text-emerald-500" : "text-amber-500"}`}
                                  >
                                    {t.chars}/{maxChars} caracteres
                                  </span>
                                  {typeof t.score === "number" && (
                                    <span
                                      className="text-[9px] text-zinc-500 font-mono border-l border-zinc-800 pl-2 cursor-help"
                                      title={[
                                        "Score de qualidade",
                                        ...(t.scoreReasons || []),
                                        ...(t.scoreWarnings || []),
                                      ].join(" · ")}
                                    >
                                      {t.score} pts
                                    </span>
                                  )}
                                </div>
                                {t.scoreReasons?.length > 0 && (
                                  <span className="block mt-1 text-[8px] text-zinc-500">
                                    {t.scoreReasons.join(" · ")}
                                    {t.scoreWarnings?.length
                                      ? ` · atenção: ${t.scoreWarnings.join(", ")}`
                                      : ""}
                                  </span>
                                )}
                                {typeof ranking?.periodViews === "number" && (
                                  <span className="block text-[8px] text-emerald-500 mt-1">
                                    {ranking.periodViews} views no período deste
                                    título
                                    {ranking.periodAvgDuration
                                      ? ` · ${ranking.periodAvgDuration}s retenção`
                                      : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setYtTitle(t.text.slice(0, 100));
                                  toast(
                                    `Título #${tIdx + 1} applied na aba Upload.`
                                  );
                                }}
                                className="text-[9px] font-bold text-gold-500 hover:text-gold-400 px-2 py-1 rounded border border-gold-500/20 hover:border-gold-500/40 transition cursor-pointer"
                              >
                                Usar
                              </button>
                              {titleExperiment?.videoId &&
                                uploadStatus.youtube?.connected &&
                                tIdx < 5 && (
                                  <button
                                    disabled={titleExperimentLoading}
                                    onClick={() =>
                                      handleApplyTitleVariant(variantId)
                                    }
                                    className="text-[9px] font-bold text-violet-400 hover:text-violet-300 px-2 py-1 rounded border border-violet-500/20 hover:border-violet-500/40 transition cursor-pointer disabled:opacity-50"
                                  >
                                    Aplicar {variantId}
                                  </button>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* CAPÍTULOS CARD */}
              {parsedSections["CAPITULOS"] && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 relative group shadow-lg">
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-3">
                    <div>
                      <h3 className="text-gold-500 font-bold text-xs tracking-wider font-sans uppercase">
                        Linha do Tempo / Capítulos
                      </h3>
                      <p className="text-[9px] text-zinc-500 mt-0.5">
                        Marcações de tempo automáticas baseadas no
                        áudio/roteiro.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        copyToClipboard(
                          parsedSections["CAPITULOS"],
                          "youtube-chapters"
                        )
                      }
                      className="bg-zinc-900 border border-zinc-800 text-gray-500 hover:text-white px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 transition cursor-pointer opacity-60 group-hover:opacity-100"
                    >
                      {copiedSection === "youtube-chapters" ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>
                        {copiedSection === "youtube-chapters"
                          ? "Copiado!"
                          : "Copiar"}
                      </span>
                    </button>
                  </div>

                  <div className="bg-black/60 border border-zinc-900 rounded-xl p-4 font-mono text-xs text-zinc-300 leading-relaxed max-h-[300px] overflow-y-auto select-text scrollbar-thin">
                    {parsedSections["CAPITULOS"]
                      .split("\n")
                      .map((line, lIdx) => (
                        <div
                          key={lIdx}
                          className="hover:bg-zinc-900/40 px-2 py-0.5 rounded transition"
                        >
                          {line}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* DESCRIÇÃO CARD */}
              {parsedSections["DESCRICAO"] && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 relative group shadow-lg">
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-3">
                    <div>
                      <h3 className="text-gold-500 font-bold text-xs tracking-wider font-sans uppercase">
                        Descrição do Vídeo
                      </h3>
                      <p className="text-[9px] text-zinc-500 mt-0.5">
                        Texto otimizado com palavras-chave e hashtags
                        relevantes.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        copyToClipboard(
                          parsedSections["DESCRICAO"],
                          "youtube-desc"
                        )
                      }
                      className="bg-zinc-900 border border-zinc-800 text-gray-500 hover:text-white px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 transition cursor-pointer opacity-60 group-hover:opacity-100"
                    >
                      {copiedSection === "youtube-desc" ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>
                        {copiedSection === "youtube-desc"
                          ? "Copiado!"
                          : "Copiar"}
                      </span>
                    </button>
                  </div>

                  <div className="bg-black/40 rounded-xl p-4 max-h-[350px] overflow-y-auto border border-zinc-900 scrollbar-thin">
                    <div className="prose prose-invert max-w-none text-zinc-300 select-text">
                      {renderFormattedText(parsedSections["DESCRICAO"])}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Column 2 (Right - 5 cols): Thumbnails & Script Highlights */}
            <div className="lg:col-span-5 space-y-6">
              {/* THUMBNAILS CARD */}
              {(youtubeMetadataParsed?.thumbnails?.length ||
                youtubeMetadataParsed?.titles?.length) && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 relative group shadow-lg">
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
                    <div>
                      <h3 className="text-gold-500 font-bold text-xs tracking-wider font-sans uppercase">
                        Variantes de Capas / Thumbnails
                      </h3>
                      <span className="text-[8px] text-zinc-500 mt-0.5 block">
                        {uploadStatus.canva?.connected
                          ? "Gere layouts automáticos no Canva"
                          : "Conecte o Canva no painel para automatizar"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Compact layout for variants list */}
                    {(youtubeMetadataParsed.thumbnails?.length
                      ? youtubeMetadataParsed.thumbnails
                      : (youtubeMetadataParsed.titles || [])
                          .slice(0, 3)
                          .map((t, i) => ({
                            id: String.fromCharCode(65 + i),
                            label:
                              ["Curiosidade", "Contraste", "Prova Visual"][i] ||
                              "Variante",
                            overlayText: t.text
                              ?.split(" ")
                              .slice(0, 4)
                              .join(" "),
                            pairedTitle: `${i + 1}. ${t.text}`,
                          }))
                    ).map((thumb) => {
                      const generated = youtubeThumbnailsGenerated.find(
                        (g) => g.id === thumb.id
                      );
                      const isSelected = ytThumbnailVariant === thumb.id;

                      return (
                        <div
                          key={thumb.id}
                          className={`bg-zinc-900/30 border rounded-xl p-3.5 space-y-3 transition ${isSelected ? "border-gold-500/50 bg-gold-500/5 ring-1 ring-gold-500/10" : "border-zinc-800 hover:border-zinc-700"}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white uppercase font-mono">
                              Variante {thumb.id}
                            </span>
                            <span className="text-[9px] text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                              {thumb.label}
                            </span>
                          </div>

                          {generated?.url && (
                            <div className="relative group/thumb rounded-lg overflow-hidden border border-zinc-800 max-h-[140px]">
                              <img
                                src={`${generated.url}?t=${Date.now()}`}
                                alt={`Thumbnail variante ${thumb.id}`}
                                className={`w-full object-cover transition duration-300 group-hover/thumb:scale-105 ${youtubeMetadataFormat === "SHORT" ? "aspect-[9/16] max-h-32" : "aspect-video"}`}
                              />
                            </div>
                          )}

                          {thumb.overlayText && (
                            <div className="bg-black/50 border border-zinc-900 rounded px-2.5 py-1.5">
                              <span className="text-[8px] text-zinc-500 uppercase block font-sans">
                                Texto na capa
                              </span>
                              <span className="text-xs font-black text-gold-400 tracking-wide">
                                {thumb.overlayText}
                              </span>
                            </div>
                          )}

                          <div className="space-y-1.5 text-[9px] text-zinc-400 leading-normal">
                            {thumb.pairedTitle && (
                              <p className="line-clamp-2">
                                <span className="text-zinc-500">Título:</span>{" "}
                                {thumb.pairedTitle}
                              </p>
                            )}
                            {thumb.composition && (
                              <p className="line-clamp-3">
                                <span className="text-zinc-500">
                                  Composição:
                                </span>{" "}
                                {thumb.composition}
                              </p>
                            )}
                            {thumb.focalElement && (
                              <p>
                                <span className="text-zinc-500">Foco:</span>{" "}
                                {thumb.focalElement}
                              </p>
                            )}
                          </div>

                          {thumb.colors && thumb.colors.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] text-zinc-500 mr-1 uppercase">
                                Cores:
                              </span>
                              {thumb.colors.map((color, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="w-3 h-3 rounded-full border border-zinc-800"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {generated?.url && (
                              <button
                                onClick={() =>
                                  selectThumbnailForUpload(generated)
                                }
                                className={`text-[9px] font-bold py-1.5 rounded-lg border transition cursor-pointer ${isSelected ? "bg-gold-500/20 border-gold-500/40 text-gold-300" : "border-zinc-800 text-zinc-300 hover:border-gold-500/30"}`}
                              >
                                {isSelected ? "✓ No Upload" : "Usar no Upload"}
                              </button>
                            )}
                            {generated?.editUrl && (
                              <a
                                href={generated.editUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-center text-[9px] font-bold text-cyan-400 hover:text-cyan-300 py-1.5 rounded border border-cyan-500/20 hover:border-cyan-500/40 transition"
                              >
                                Canva Editor
                              </a>
                            )}
                            <button
                              onClick={() => openCanvaThumbnailDesigner(thumb)}
                              className="text-[9px] font-bold text-sky-400 hover:text-sky-300 py-1.5 rounded-lg border border-sky-500/20 hover:border-sky-500/40 transition cursor-pointer"
                            >
                              Canva Link
                            </button>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  buildThumbnailBrief(thumb, {
                                    profileLabel:
                                      youtubeMetadataStrategy?.profileLabel,
                                    format: youtubeMetadataFormat,
                                  }),
                                  `thumb-${thumb.id}`
                                )
                              }
                              className="text-[9px] font-bold text-zinc-400 hover:text-white py-1.5 rounded border border-zinc-850 hover:border-zinc-700 transition cursor-pointer"
                            >
                              {copiedSection === `thumb-${thumb.id}`
                                ? "Copiado!"
                                : "Copiar Briefing"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SCRIPT HIGHLIGHTS (GANCHO & CTA) */}
              {(parsedSections["GANCHO DE RETENCAO"] ||
                parsedSections["CTA DE MEIO DE VIDEO"]) && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 relative shadow-lg space-y-4">
                  <div className="border-b border-zinc-900 pb-3">
                    <h3 className="text-gold-500 font-bold text-xs tracking-wider font-sans uppercase">
                      Destaques Narrativos (Roteiro)
                    </h3>
                    <p className="text-[9px] text-zinc-500 mt-0.5">
                      Ganchos e chamadas estruturadas para retenção do público.
                    </p>
                  </div>

                  {parsedSections["GANCHO DE RETENCAO"] && (
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 space-y-2 group/hook relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-gold-400 uppercase tracking-wide bg-gold-500/5 border border-gold-500/10 px-2 py-0.5 rounded">
                          Gancho de Retenção
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              parsedSections["GANCHO DE RETENCAO"],
                              "hook-copy"
                            )
                          }
                          className="text-[9px] text-zinc-500 hover:text-white transition cursor-pointer opacity-0 group-hover/hook:opacity-100"
                        >
                          {copiedSection === "hook-copy"
                            ? "Copiado!"
                            : "Copiar"}
                        </button>
                      </div>
                      <div className="text-xs text-zinc-300 leading-relaxed prose prose-invert max-w-none">
                        {renderFormattedText(
                          parsedSections["GANCHO DE RETENCAO"]
                        )}
                      </div>
                    </div>
                  )}

                  {parsedSections["CTA DE MEIO DE VIDEO"] && (
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 space-y-2 group/cta relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wide bg-violet-500/5 border border-violet-500/10 px-2 py-0.5 rounded">
                          CTA de Meio de Vídeo
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              parsedSections["CTA DE MEIO DE VIDEO"],
                              "cta-copy"
                            )
                          }
                          className="text-[9px] text-zinc-500 hover:text-white transition cursor-pointer opacity-0 group-hover/cta:opacity-100"
                        >
                          {copiedSection === "cta-copy" ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                      <div className="text-xs text-zinc-300 leading-relaxed prose prose-invert max-w-none">
                        {renderFormattedText(
                          parsedSections["CTA DE MEIO DE VIDEO"]
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Row 3 (Bottom - Full Width): Platform Packages */}
            {youtubeMetadataParsed?.platformPackages && (
              <div className="lg:col-span-12">
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 relative group shadow-xl">
                  <div className="border-b border-zinc-900 pb-3 mb-4">
                    <h3 className="text-gold-500 font-bold text-xs tracking-wider font-sans uppercase">
                      Pacotes Multiplataforma
                    </h3>
                    <p className="text-[9px] text-zinc-500 mt-0.5">
                      Textos e tags limpas adaptadas de acordo com as diretrizes
                      e público de cada rede social.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {Object.entries(youtubeMetadataParsed.platformPackages).map(
                      ([platform, pack]: [string, any]) => {
                        const copyText = [
                          pack.title,
                          pack.caption,
                          pack.description,
                          pack.hashtags,
                        ]
                          .filter(Boolean)
                          .join("\n\n");
                        const packageKey = `platform-${platform}`;
                        return (
                          <div
                            key={platform}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 space-y-3 relative group/pack hover:border-zinc-700 transition"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                              <span className="text-[10px] uppercase font-bold text-violet-300 font-mono tracking-wider">
                                {platform}
                              </span>
                              <button
                                onClick={() =>
                                  copyToClipboard(copyText, packageKey)
                                }
                                className="text-[9px] text-zinc-500 hover:text-white cursor-pointer transition opacity-60 group-hover/pack:opacity-100"
                              >
                                {copiedSection === packageKey
                                  ? "Copiado!"
                                  : "Copiar"}
                              </button>
                            </div>

                            <div className="space-y-2">
                              {pack.title && (
                                <p className="text-xs font-bold text-white leading-snug line-clamp-2">
                                  {pack.title}
                                </p>
                              )}
                              <p className="text-[11px] leading-relaxed text-zinc-300 whitespace-pre-line line-clamp-6 select-text">
                                {pack.caption || pack.description}
                              </p>
                              {pack.hashtags && (
                                <p className="pt-1 text-[9px] text-cyan-300 break-words select-text">
                                  {pack.hashtags}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Fallback Rendering for other parsed sections */}
            {otherSections.length > 0 && (
              <div className="lg:col-span-12 space-y-6">
                {otherSections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 relative group shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-3">
                      <h3 className="text-gold-500 font-bold text-xs tracking-wider font-sans uppercase">
                        {sec.title}
                      </h3>
                      <button
                        onClick={() =>
                          copyToClipboard(sec.content, `other-${idx}`)
                        }
                        className="bg-zinc-900 border border-zinc-800 text-gray-500 hover:text-white px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 transition cursor-pointer opacity-60 group-hover:opacity-100"
                      >
                        {copiedSection === `other-${idx}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>
                          {copiedSection === `other-${idx}`
                            ? "Copiado!"
                            : "Copiar"}
                        </span>
                      </button>
                    </div>
                    <div className="prose prose-invert max-w-none text-zinc-300 select-text">
                      {renderFormattedText(sec.content)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-16 flex flex-col items-center justify-center text-center gap-4 shadow-xl">
            <MessageSquare className="w-12 h-12 text-zinc-700 animate-pulse" />
            <h3 className="text-white font-bold text-base">
              Metadados não Gerados
            </h3>
            <p className="text-zinc-400 text-xs max-w-md">
              Gere os metadados do vídeo para criar títulos magnéticos,
              descrição otimizada, tags e capítulos com marcações reais baseados
              no roteiro.
            </p>
            <button
              disabled={!hasApiKey}
              onClick={handleGenerateYoutubeMetadata}
              className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-2 mt-2 cursor-pointer shadow-lg shadow-gold-500/10"
            >
              <Sparkles className="w-4 h-4" />
              <span>Gerar Metadados</span>
            </button>
          </div>
        )}
      </div>
    </DashminProjectTabLayout>
  );
}
