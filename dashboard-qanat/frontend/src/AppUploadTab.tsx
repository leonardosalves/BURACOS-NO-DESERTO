import toast from "react-hot-toast";
import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Image,
  RefreshCw,
  Share2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { DashminProjectTabLayout } from "./DashminProjectTabLayout";
import { ProjectYoutubeCard } from "./ProjectYoutubeCard";
import type { AppTab } from "./appTabs";
import type { ConfigData } from "./appTypes";
import type { SettingsSection } from "./SettingsSectionNav";
import { SocialPublishPanel } from "./SocialPublishPanel";

export type AppUploadTabProps = {
  activeProject: string;
  applyMetadataToUpload: (opts?: {
    silent?: boolean;
  }) => Promise<{ ok: true; payload: unknown } | { ok: false }>;
  config: ConfigData | null;
  getProjectUrl: (path: string) => string;
  generateYoutubeMetadata: (options?: {
    silent?: boolean;
    keepExistingOnError?: boolean;
  }) => Promise<boolean>;
  handleFixYoutubeMetadata: () => void | Promise<void>;
  handleGenerateYoutubeThumbnailImages: () => void | Promise<void>;
  handlePostUploadComplete: (
    videoId: string,
    postUpload?: unknown
  ) => void | Promise<void>;
  igCaption: string;
  setIgCaption: (v: string) => void;
  kwCaption: string;
  setKwCaption: (v: string) => void;
  openCanvaThumbnailDesigner: (thumb?: {
    id: string;
    label?: string;
    overlayText?: string;
    pairedTitle?: string;
    composition?: string;
    focalElement?: string;
    colors?: string[];
  }) => void | Promise<void>;
  pipelineRunning: boolean;
  setPipelineRunning: (v: boolean) => void;
  prepareUploadForPublish: () => Promise<{ ok: boolean; payload?: unknown }>;
  saveUploadMetadataToProject: (payload?: unknown) => Promise<boolean>;
  selectThumbnailForUpload: (generated: {
    id: string;
    fileName?: string;
    url: string;
  }) => void | Promise<void>;
  selectedPlatforms: Record<string, boolean>;
  setSelectedPlatforms: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  selectedUploadVideo: string | null;
  setActiveTab: (tab: AppTab) => void;
  setSettingsSection: (s: SettingsSection) => void;
  setThumbnailExperiment: (v: any) => void;
  setTtCaption: (v: string) => void;
  ttCaption: string;
  setUploadLogs: React.Dispatch<React.SetStateAction<string[]>>;
  uploadLogs: string[];
  setUploadProgress: (v: number) => void;
  uploadProgress: number;
  setUploading: (v: boolean) => void;
  uploading: boolean;
  setYtCategoryId: (v: string) => void;
  ytCategoryId: string;
  setYtContainsSyntheticMedia: (v: boolean) => void;
  ytContainsSyntheticMedia: boolean;
  setYtDefaultLanguage: (v: string) => void;
  ytDefaultLanguage: string;
  setYtPlaylistId: (v: string) => void;
  ytPlaylistId: string;
  ytPlaylists: Array<{ id: string; title: string; itemCount?: number }>;
  ytPlaylistsLoading: boolean;
  fetchYoutubePlaylists: () => void | Promise<void>;
  setYtChapters: (v: string) => void;
  ytChapters: string;
  setYtDescription: (v: string) => void;
  ytDescription: string;
  setYtPinnedComment: (v: string) => void;
  ytPinnedComment: string;
  setYtPrivacy: (v: string) => void;
  ytPrivacy: string;
  setYtPublishAt: (v: string) => void;
  ytPublishAt: string;
  setYtTags: (v: string) => void;
  ytTags: string;
  setYtTitle: (v: string) => void;
  ytTitle: string;
  titleExperimentVideoId: string | null;
  uploadMetadataReady: boolean;
  uploadStatus: any;
  youtubeMetadataFormat: string;
  youtubeThumbnailsGenerated: Array<{
    id: string;
    fileName?: string;
    url: string;
    label?: string;
    overlayText?: string;
  }>;
  youtubeThumbnailsLoading: boolean;
  ytThumbnailVariant: string;
};

type YoutubeQualityGateReport = {
  ready: boolean;
  missing?: boolean;
  score?: number;
  blockingCount?: number;
  warningCount?: number;
  video?: { name?: string } | null;
  dimensions?: Record<string, number>;
  checks?: Array<{
    id: string;
    category: string;
    status: "pass" | "warning" | "error" | "info";
    message: string;
    fix?: string;
  }>;
};

export function AppUploadTab({
  activeProject,
  applyMetadataToUpload,
  config,
  getProjectUrl,
  generateYoutubeMetadata,
  handleFixYoutubeMetadata,
  handleGenerateYoutubeThumbnailImages,
  handlePostUploadComplete,
  igCaption,
  setIgCaption,
  kwCaption,
  setKwCaption,
  openCanvaThumbnailDesigner,
  pipelineRunning,
  setPipelineRunning,
  prepareUploadForPublish,
  saveUploadMetadataToProject,
  selectThumbnailForUpload,
  selectedPlatforms,
  setSelectedPlatforms,
  selectedUploadVideo,
  setActiveTab,
  setSettingsSection,
  setThumbnailExperiment,
  setTtCaption,
  ttCaption,
  setUploadLogs,
  uploadLogs,
  setUploadProgress,
  uploadProgress,
  setUploading,
  uploading,
  setYtCategoryId,
  ytCategoryId,
  setYtContainsSyntheticMedia,
  ytContainsSyntheticMedia,
  setYtDefaultLanguage,
  ytDefaultLanguage,
  setYtPlaylistId,
  ytPlaylistId,
  ytPlaylists,
  ytPlaylistsLoading,
  fetchYoutubePlaylists,
  setYtChapters,
  ytChapters,
  setYtDescription,
  ytDescription,
  setYtPinnedComment,
  ytPinnedComment,
  setYtPrivacy,
  ytPrivacy,
  setYtPublishAt,
  ytPublishAt,
  setYtTags,
  ytTags,
  setYtTitle,
  ytTitle,
  titleExperimentVideoId,
  uploadMetadataReady,
  uploadStatus,
  youtubeMetadataFormat,
  youtubeThumbnailsGenerated,
  youtubeThumbnailsLoading,
  ytThumbnailVariant,
}: AppUploadTabProps) {
  const [qualityGate, setQualityGate] =
    useState<YoutubeQualityGateReport | null>(null);
  const [qualityGateLoading, setQualityGateLoading] = useState(false);
  const [qualityGateFixing, setQualityGateFixing] = useState(false);
  const [qualityGateFixSummary, setQualityGateFixSummary] = useState<{
    applied: string[];
    deferred: string[];
  } | null>(null);

  const runQualityGate = useCallback(async () => {
    if (!selectedUploadVideo) {
      toast.error("Selecione um vídeo renderizado.");
      return null;
    }
    setQualityGateLoading(true);
    try {
      const response = await fetch(
        getProjectUrl(
          `/api/youtube/quality-gate?video=${encodeURIComponent(selectedUploadVideo)}`
        )
      );
      const report = (await response.json()) as YoutubeQualityGateReport & {
        error?: string;
      };
      if (report.error) throw new Error(report.error);
      setQualityGate(report);
      if (report.ready) {
        toast.success(`Quality Gate aprovado: ${report.score ?? 0}/100.`);
      } else {
        toast.error(
          `Quality Gate bloqueou o upload: ${report.blockingCount ?? 1} problema(s).`
        );
      }
      return report;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Falha ao executar o Quality Gate."
      );
      return null;
    } finally {
      setQualityGateLoading(false);
    }
  }, [getProjectUrl, selectedUploadVideo]);

  const fixQualityGate = useCallback(async () => {
    if (!selectedUploadVideo) {
      toast.error("Selecione um vídeo renderizado.");
      return;
    }
    setQualityGateFixing(true);
    setQualityGateFixSummary(null);
    try {
      const response = await fetch(
        getProjectUrl("/api/youtube/quality-gate/fix"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video: selectedUploadVideo }),
        }
      );
      const result = (await response.json()) as {
        error?: string;
        applied?: Array<{ id: string; message: string }>;
        deferred?: Array<{ id: string; message: string }>;
        metadata?: { title?: string; description?: string };
        report?: YoutubeQualityGateReport;
      };
      if (response.status === 404) {
        toast("Atualizando metadados com o mecanismo de IA disponível...");
        const generated = await generateYoutubeMetadata({
          silent: true,
          keepExistingOnError: true,
        });
        if (!generated) {
          throw new Error(
            "A rota nova ainda não está ativa e a geração alternativa de metadados falhou."
          );
        }
        const applied = await applyMetadataToUpload({ silent: true });
        if (!applied || !("ok" in applied) || !applied.ok) {
          throw new Error(
            "A IA gerou os dados, mas não foi possível aplicá-los."
          );
        }
        const saved = await saveUploadMetadataToProject(applied.payload);
        if (!saved) {
          throw new Error("Não foi possível salvar as correções da IA.");
        }
        const report = await runQualityGate();
        setQualityGateFixSummary({
          applied: [
            "Metadados regenerados, aplicados e salvos pelo mecanismo de IA disponível.",
          ],
          deferred: report?.ready
            ? []
            : [
                "O backend técnico ainda precisa ser atualizado para executar reparos no arquivo MP4.",
              ],
        });
        if (report?.ready) {
          toast.success("Problemas resolvidos e Quality Gate aprovado.");
        } else {
          toast(
            "A IA aplicou as correções possíveis. Revise os avisos restantes."
          );
        }
        return;
      }
      if (result.error) throw new Error(result.error);
      if (result.metadata?.title) setYtTitle(result.metadata.title);
      if (result.metadata?.description)
        setYtDescription(result.metadata.description);
      if (result.report) setQualityGate(result.report);
      setQualityGateFixSummary({
        applied: (result.applied || []).map((item) => item.message),
        deferred: (result.deferred || []).map((item) => item.message),
      });

      const appliedCount = result.applied?.length ?? 0;
      const deferredCount = result.deferred?.length ?? 0;
      if (result.report?.ready) {
        toast.success(
          `IA resolveu ${appliedCount} problema(s). Quality Gate aprovado.`
        );
      } else if (appliedCount) {
        toast.success(`IA aplicou ${appliedCount} correção(ões).`);
        if (deferredCount) {
          toast(
            `${deferredCount} item(ns) ainda exigem renderização ou confirmação humana.`
          );
        }
      } else {
        toast(
          deferredCount
            ? "Esses itens exigem renderização ou confirmação humana."
            : "Nenhuma correção automática foi necessária."
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha na correção automática."
      );
    } finally {
      setQualityGateFixing(false);
    }
  }, [
    getProjectUrl,
    generateYoutubeMetadata,
    applyMetadataToUpload,
    saveUploadMetadataToProject,
    runQualityGate,
    selectedUploadVideo,
    setYtDescription,
    setYtTitle,
  ]);

  useEffect(() => {
    let cancelled = false;
    setQualityGate(null);
    if (!selectedUploadVideo) return () => undefined;
    void fetch(getProjectUrl("/api/youtube/quality-gate/cached"))
      .then((response) => response.json())
      .then((report: YoutubeQualityGateReport) => {
        if (
          !cancelled &&
          !report.missing &&
          report.video?.name === selectedUploadVideo
        ) {
          setQualityGate(report);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeProject, getProjectUrl, selectedUploadVideo]);

  return (
    <DashminProjectTabLayout tab="upload" activeProject={activeProject}>
      <div className="space-y-6 font-sans">
        {/* Step 1: Select platforms & Edit metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadados por Plataforma */}
          <div className="lg:col-span-2 space-y-6">
            {/* YouTube Section */}
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-900/40">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-yt"
                    checked={selectedPlatforms.youtube}
                    onChange={(e) =>
                      setSelectedPlatforms((prev) => ({
                        ...prev,
                        youtube: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="select-yt"
                    className="text-xs font-bold text-zinc-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>YouTube (Videos / Shorts)</span>
                  </label>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.youtube?.connected ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
                >
                  {uploadStatus.youtube?.connected
                    ? "Conectado"
                    : "Não Conectado"}
                </span>
              </div>

              {selectedPlatforms.youtube && (
                <div className="space-y-4 text-xs font-sans">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-violet-500/25 bg-violet-500/5">
                    <p className="text-[10px] text-zinc-400 leading-relaxed max-w-md">
                      {uploadMetadataReady
                        ? "Metadados da aba IA · Metadados disponíveis — preencha os campos abaixo com um clique."
                        : "Gere títulos, descrição e tags na aba IA · Metadados, depois volte aqui para preencher."}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab("ai")}
                        className="text-[9px] font-bold text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-800 transition cursor-pointer"
                      >
                        IA · Metadados
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void applyMetadataToUpload();
                        }}
                        disabled={!uploadMetadataReady}
                        className="text-[9px] font-bold text-violet-100 bg-violet-600/30 hover:bg-violet-600/45 disabled:opacity-40 border border-violet-500/40 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        Preencher com metadados IA
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="ui-micro-label text-gray-500 block text-balance-safe">
                      Título no YouTube
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={ytTitle}
                      onChange={(e) => setYtTitle(e.target.value)}
                      placeholder="Insira o título do vídeo para o YouTube"
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs"
                    />
                    <span className="text-[9px] text-zinc-600 block text-right">
                      {ytTitle.length}/100
                    </span>
                  </div>
                  <div className="space-y-2">
                    <label className="ui-micro-label text-gray-500 block text-balance-safe">
                      Descrição do YouTube
                    </label>
                    <textarea
                      rows={3}
                      value={ytDescription}
                      onChange={(e) => setYtDescription(e.target.value)}
                      placeholder="Descrição completa para SEO, links e hashtags"
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="ui-micro-label text-gray-500 block text-balance-safe">
                      Privacidade
                    </label>
                    <select
                      value={ytPrivacy}
                      onChange={(e) => setYtPrivacy(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white font-sans text-xs"
                    >
                      <option value="private">Privado (Recomendado)</option>
                      <option value="public">Público</option>
                      <option value="unlisted">Não listado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="ui-micro-label text-gray-500 block text-balance-safe">
                      Tags (vírgula)
                    </label>
                    <input
                      type="text"
                      value={ytTags}
                      onChange={(e) => setYtTags(e.target.value)}
                      placeholder="tag1, tag2, tag3..."
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="ui-micro-label text-gray-500 block text-balance-safe">
                      Capítulos (marcadores)
                    </label>
                    <textarea
                      rows={2}
                      value={ytChapters}
                      onChange={(e) => setYtChapters(e.target.value)}
                      placeholder="0:00 Intro&#10;1:30 Tema principal"
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white text-xs resize-none font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="ui-micro-label text-gray-500 block text-balance-safe">
                      Comentário fixo (pós-upload)
                    </label>
                    <textarea
                      rows={2}
                      value={ytPinnedComment}
                      onChange={(e) => setYtPinnedComment(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white text-xs resize-none"
                    />
                  </div>
                  <div className="space-y-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <p className="text-[10px] text-zinc-300 font-bold">
                      YouTube Studio — padrões de publicação
                    </p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ytContainsSyntheticMedia}
                        onChange={(e) =>
                          setYtContainsSyntheticMedia(e.target.checked)
                        }
                        className="mt-0.5 w-4 h-4 accent-amber-500 bg-zinc-950 border-zinc-800 rounded"
                      />
                      <span className="text-[10px] text-zinc-300 leading-relaxed">
                        <strong className="text-amber-200/90">
                          Uso de IA: Sim
                        </strong>{" "}
                        — declarar conteúdo sintético/alterado (simulação
                        realista, narração IA, imagens geradas). Desmarque só se
                        o vídeo for 100% original sem IA.
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="ui-micro-label text-gray-500 block text-balance-safe">
                          Idioma do vídeo
                        </label>
                        <select
                          value={ytDefaultLanguage}
                          onChange={(e) => setYtDefaultLanguage(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white font-sans text-xs"
                        >
                          <option value="pt-BR">Português (Brasil)</option>
                          <option value="pt">Português</option>
                          <option value="en">Inglês</option>
                          <option value="es">Espanhol</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="ui-micro-label text-gray-500 block text-balance-safe">
                            Playlist
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              void fetchYoutubePlaylists();
                            }}
                            disabled={
                              ytPlaylistsLoading ||
                              !uploadStatus.youtube?.connected
                            }
                            className="text-[9px] font-bold text-zinc-400 hover:text-white disabled:opacity-40"
                          >
                            {ytPlaylistsLoading ? "Carregando..." : "Atualizar"}
                          </button>
                        </div>
                        <select
                          value={ytPlaylistId}
                          onChange={(e) => setYtPlaylistId(e.target.value)}
                          disabled={!uploadStatus.youtube?.connected}
                          className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white font-sans text-xs disabled:opacity-50"
                        >
                          <option value="">Nenhuma (não adicionar)</option>
                          {ytPlaylistId &&
                            !ytPlaylists.some((p) => p.id === ytPlaylistId) && (
                              <option value={ytPlaylistId}>
                                Playlist salva ({ytPlaylistId.slice(0, 12)}…)
                              </option>
                            )}
                          {ytPlaylists.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.title}
                              {pl.itemCount != null ? ` (${pl.itemCount})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="ui-micro-label text-gray-500 block text-balance-safe">
                        Agendar (ISO)
                      </label>
                      <input
                        type="datetime-local"
                        value={ytPublishAt ? ytPublishAt.slice(0, 16) : ""}
                        onChange={(e) =>
                          setYtPublishAt(
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : ""
                          )
                        }
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="ui-micro-label text-gray-500 block text-balance-safe">
                        Categoria ID
                      </label>
                      <input
                        type="text"
                        value={ytCategoryId}
                        onChange={(e) => setYtCategoryId(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-zinc-900/60">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <label className="ui-micro-label text-gray-500 block text-balance-safe">
                          Thumbnail do YouTube (A/B/C)
                        </label>
                        <p className="text-[9px] text-zinc-600 mt-0.5">
                          Gera 3 capas com texto overlay a partir dos assets do
                          projeto.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("ai")}
                          className="text-[9px] font-bold text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded border border-zinc-800 transition cursor-pointer"
                        >
                          Agente IA
                        </button>
                        <button
                          type="button"
                          disabled={youtubeThumbnailsLoading}
                          onClick={handleGenerateYoutubeThumbnailImages}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        >
                          {youtubeThumbnailsLoading ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Image className="w-3 h-3" />
                          )}
                          {youtubeThumbnailsLoading
                            ? "Gerando..."
                            : "Gerar Thumbnails"}
                        </button>
                      </div>
                    </div>
                    {ytThumbnailVariant && (
                      <p className="text-[9px] text-gold-500/80">
                        Selecionada para upload:{" "}
                        <strong>Variante {ytThumbnailVariant}</strong>
                      </p>
                    )}
                    {youtubeThumbnailsGenerated.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {youtubeThumbnailsGenerated.map((thumb) => (
                          <div
                            key={thumb.id}
                            className={`rounded-lg overflow-hidden border transition ${ytThumbnailVariant === thumb.id ? "border-gold-500/60 ring-1 ring-gold-500/20" : "border-zinc-800"}`}
                          >
                            <a
                              href={thumb.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={`${thumb.url}?t=${Date.now()}`}
                                alt={`Thumbnail ${thumb.id}`}
                                className={`w-full object-cover ${youtubeMetadataFormat === "SHORT" ? "aspect-[9/16]" : "aspect-video"}`}
                              />
                            </a>
                            <div className="flex gap-1 p-1 bg-zinc-950/80">
                              <button
                                type="button"
                                onClick={() => selectThumbnailForUpload(thumb)}
                                className={`flex-1 text-[8px] font-bold py-1 rounded ${ytThumbnailVariant === thumb.id ? "bg-gold-500/20 text-gold-300" : "text-zinc-400 hover:text-white"}`}
                              >
                                {ytThumbnailVariant === thumb.id ? "✓" : "Usar"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openCanvaThumbnailDesigner({
                                    id: thumb.id,
                                    label: thumb.label,
                                    overlayText: thumb.overlayText,
                                  })
                                }
                                className="flex-1 text-[8px] font-bold py-1 rounded text-sky-400 hover:text-sky-300"
                              >
                                Canva
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-zinc-600 italic">
                        Nenhuma thumbnail gerada ainda. Use &quot;Gerar
                        Metadados&quot; na aba Agente IA, depois clique em
                        &quot;Gerar Thumbnails&quot;.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Instagram Reels Section */}
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-900/40">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-ig"
                    checked={selectedPlatforms.instagram}
                    onChange={(e) =>
                      setSelectedPlatforms((prev) => ({
                        ...prev,
                        instagram: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="select-ig"
                    className="text-xs font-bold text-zinc-200 cursor-pointer"
                  >
                    Instagram Reels
                  </label>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.instagram?.connected ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
                >
                  {uploadStatus.instagram?.connected
                    ? "Conectado"
                    : "Não Conectado"}
                </span>
              </div>

              {selectedPlatforms.instagram && (
                <div className="space-y-3 text-xs font-sans">
                  <div className="space-y-2">
                    <label className="ui-micro-label text-gray-500 block text-balance-safe">
                      Legenda do Reels (Caption)
                    </label>
                    <textarea
                      rows={3}
                      value={igCaption}
                      onChange={(e) => setIgCaption(e.target.value)}
                      placeholder="Legenda para o Reels com hashtags"
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* TikTok Section */}
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-900/40">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-tt"
                    checked={selectedPlatforms.tiktok}
                    onChange={(e) =>
                      setSelectedPlatforms((prev) => ({
                        ...prev,
                        tiktok: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="select-tt"
                    className="text-xs font-bold text-zinc-200 cursor-pointer"
                  >
                    TikTok (Playwright Automação)
                  </label>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.tiktok?.connected ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
                >
                  {uploadStatus.tiktok?.connected
                    ? "Sessão Ativa"
                    : "Desconectado"}
                </span>
              </div>

              {selectedPlatforms.tiktok && (
                <div className="space-y-3 text-xs font-sans">
                  <div className="space-y-2">
                    <label className="ui-micro-label text-gray-500 block text-balance-safe">
                      Legenda do TikTok
                    </label>
                    <textarea
                      rows={3}
                      value={ttCaption}
                      onChange={(e) => setTtCaption(e.target.value)}
                      placeholder="Legenda curta e tags virais"
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Kwai Section */}
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-900/40">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-kw"
                    checked={selectedPlatforms.kwai}
                    onChange={(e) =>
                      setSelectedPlatforms((prev) => ({
                        ...prev,
                        kwai: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="select-kw"
                    className="text-xs font-bold text-zinc-200 cursor-pointer"
                  >
                    Kwai (Playwright Automação)
                  </label>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.kwai?.connected ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
                >
                  {uploadStatus.kwai?.connected
                    ? "Sessão Ativa"
                    : "Desconectado"}
                </span>
              </div>

              {selectedPlatforms.kwai && (
                <div className="space-y-3 text-xs font-sans">
                  <div className="space-y-2">
                    <label className="ui-micro-label text-gray-500 block text-balance-safe">
                      Legenda do Kwai
                    </label>
                    <textarea
                      rows={3}
                      value={kwCaption}
                      onChange={(e) => setKwCaption(e.target.value)}
                      placeholder="Legenda para o Kwai"
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Auth Connection Panel */}
          <div className="space-y-6">
            {/* Salvar Metadados GLOBAIS */}
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
              <span className="ui-micro-label text-gray-500 block text-balance-safe">
                Ações Globais
              </span>
              {selectedUploadVideo ? (
                <div className="text-[10px] text-zinc-400 p-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 leading-relaxed">
                  Vídeo para publicar:{" "}
                  <strong className="text-emerald-300">
                    {selectedUploadVideo}
                  </strong>
                  <button
                    type="button"
                    onClick={() => setActiveTab("status")}
                    className="block mt-1 text-[9px] text-zinc-500 hover:text-white transition"
                  >
                    Trocar na aba Render →
                  </button>
                </div>
              ) : (
                <div className="text-[10px] text-amber-300/90 p-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5">
                  Nenhum vídeo em OUTPUT. Renderize na aba Render primeiro.
                </div>
              )}
              <div
                className={`rounded-xl border p-3 space-y-3 ${
                  qualityGate?.ready
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : qualityGate
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-zinc-800 bg-zinc-900/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {qualityGate?.ready ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                    )}
                    <div>
                      <div className="text-[11px] font-bold text-zinc-100">
                        YouTube Quality Gate
                      </div>
                      <div className="text-[9px] text-zinc-500">
                        Técnica, originalidade, retenção e monetização
                      </div>
                    </div>
                  </div>
                  {qualityGate && !qualityGate.missing && (
                    <div
                      className={`text-lg font-black ${
                        qualityGate.ready ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {qualityGate.score ?? 0}
                    </div>
                  )}
                </div>
                {qualityGate?.dimensions && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(qualityGate.dimensions).map(
                      ([label, score]) => (
                        <div
                          key={label}
                          className="flex justify-between rounded-md bg-black/20 px-2 py-1 text-[9px]"
                        >
                          <span className="capitalize text-zinc-500">
                            {label}
                          </span>
                          <strong className="text-zinc-200">{score}</strong>
                        </div>
                      )
                    )}
                  </div>
                )}
                {qualityGate && (
                  <div className="text-[9px] text-zinc-400">
                    {qualityGate.ready
                      ? `${qualityGate.warningCount ?? 0} aviso(s), sem bloqueios.`
                      : `${qualityGate.blockingCount ?? 0} bloqueio(s) e ${qualityGate.warningCount ?? 0} aviso(s).`}
                  </div>
                )}
                {qualityGate?.checks
                  ?.filter(
                    (item) =>
                      item.status === "error" || item.status === "warning"
                  )
                  .slice(0, 4)
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`text-[9px] leading-relaxed ${
                        item.status === "error"
                          ? "text-red-300"
                          : "text-amber-300"
                      }`}
                    >
                      • {item.message}
                    </div>
                  ))}
                {qualityGateFixSummary && (
                  <div className="space-y-1.5 rounded-lg border border-violet-400/20 bg-violet-500/5 p-2.5">
                    {qualityGateFixSummary.applied.map((message, index) => (
                      <div
                        key={`applied-${index}`}
                        className="text-[9px] leading-relaxed text-emerald-300"
                      >
                        ✓ {message}
                      </div>
                    ))}
                    {qualityGateFixSummary.deferred.map((message, index) => (
                      <div
                        key={`deferred-${index}`}
                        className="text-[9px] leading-relaxed text-amber-300"
                      >
                        → {message}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void runQualityGate();
                  }}
                  disabled={qualityGateLoading || !selectedUploadVideo}
                  className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 disabled:opacity-40 text-cyan-200 font-bold py-2 rounded-lg text-[10px] transition"
                >
                  {qualityGateLoading
                    ? "Auditando MP4..."
                    : "Executar auditoria completa"}
                </button>
                {qualityGate &&
                  ((qualityGate.blockingCount ?? 0) > 0 ||
                    (qualityGate.warningCount ?? 0) > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        void fixQualityGate();
                      }}
                      disabled={
                        qualityGateFixing ||
                        qualityGateLoading ||
                        !selectedUploadVideo
                      }
                      className="w-full bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/35 disabled:opacity-40 text-violet-100 font-bold py-2.5 rounded-lg text-[10px] transition flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {qualityGateFixing
                        ? "IA resolvendo problemas..."
                        : "Resolver problemas com IA"}
                    </button>
                  )}
                <div className="text-[8px] text-zinc-600 leading-relaxed">
                  Upload aprovado entra como privado até os checks do YouTube
                  terminarem. Isso reduz risco, mas não garante monetização ou
                  alcance.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void applyMetadataToUpload();
                }}
                disabled={!uploadMetadataReady}
                className="w-full bg-violet-600/15 hover:bg-violet-600/25 disabled:opacity-40 border border-violet-500/30 text-violet-200 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Preencher com metadados IA
              </button>
              <button
                onClick={async () => {
                  const ok = await saveUploadMetadataToProject();
                  toast(
                    ok
                      ? "Metadados salvos com sucesso!"
                      : "Erro ao salvar metadados."
                  );
                }}
                className="w-full bg-zinc-900 border border-zinc-800 hover:border-gold-500/20 text-gold-500 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Salvar Metadados do Projeto
              </button>
              {(titleExperimentVideoId ||
                config?.upload_metadata?.youtube?.post_id) && (
                <button
                  type="button"
                  onClick={() => {
                    void handleFixYoutubeMetadata();
                  }}
                  className="w-full bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/30 text-amber-200 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Corrigir metadados no YouTube (vídeo já enviado)
                </button>
              )}
              <button
                onClick={async () => {
                  const prepared = await prepareUploadForPublish();
                  if (!prepared.ok) return;
                  const saved = await saveUploadMetadataToProject(
                    prepared.payload
                  );
                  if (!saved) {
                    toast.error("Erro ao salvar metadados antes do upload.");
                    return;
                  }
                  if (selectedPlatforms.youtube) {
                    const report = await runQualityGate();
                    if (!report?.ready) return;
                  }
                  setUploading(true);
                  setUploadLogs([]);
                  setUploadProgress(0);
                  const platformList = Object.entries(selectedPlatforms)
                    .filter(([_, active]) => active)
                    .map(([key]) => key)
                    .join(",");

                  const videoParam = selectedUploadVideo
                    ? `&video=${encodeURIComponent(selectedUploadVideo)}`
                    : "";
                  const eventSource = new EventSource(
                    getProjectUrl(
                      `/api/projects/upload-pipeline?platforms=${platformList}${videoParam}`
                    )
                  );
                  eventSource.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === "log") {
                      setUploadLogs((prev) => [...prev, data.text]);
                      const progressMatch =
                        data.text.match(/\[PROGRESSO\] (\d+)%/);
                      if (progressMatch) {
                        setUploadProgress(parseInt(progressMatch[1]));
                      }
                    } else if (data.type === "complete") {
                      eventSource.close();
                      setUploading(false);
                      setUploadProgress(100);
                      toast("Upload concluído com sucesso!");
                      if (data.videoId) {
                        handlePostUploadComplete(data.videoId, data.postUpload);
                      }
                    } else if (data.type === "error") {
                      eventSource.close();
                      setUploading(false);
                      const detail =
                        data.detail || data.message || "Erro desconhecido";
                      toast.error(`Upload falhou: ${detail}`);
                    }
                  };
                  eventSource.onerror = () => {
                    eventSource.close();
                    setUploading(false);
                    toast("Falha na conexão SSE.");
                  };
                }}
                disabled={uploading || !selectedUploadVideo}
                className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 font-bold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-gold-500/10"
              >
                <Share2 className="w-4 h-4" />
                <span>
                  {uploading ? "Publicando..." : "Publicar nas Selecionadas"}
                </span>
              </button>
              <button
                onClick={() => {
                  setPipelineRunning(true);
                  setUploadLogs([]);
                  const es = new EventSource(
                    getProjectUrl(
                      "/api/pipeline/run?steps=mix,thumbnails,upload"
                    )
                  );
                  es.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === "log")
                      setUploadLogs((prev) => [...prev, data.text]);
                    if (data.type === "complete" || data.type === "error") {
                      es.close();
                      setPipelineRunning(false);
                      toast(
                        data.type === "complete"
                          ? "Pipeline concluído!"
                          : data.message
                      );
                    }
                  };
                  es.onerror = () => {
                    es.close();
                    setPipelineRunning(false);
                  };
                }}
                disabled={pipelineRunning || uploading}
                className="w-full bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 disabled:opacity-50 text-violet-200 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                {pipelineRunning
                  ? "Pipeline rodando..."
                  : "Pipeline rápido (mix → thumbs → upload)"}
              </button>
              {titleExperimentVideoId &&
                youtubeThumbnailsGenerated.length >= 2 && (
                  <button
                    onClick={async () => {
                      const res = await fetch(
                        getProjectUrl(
                          "/api/youtube/thumbnail-experiment/start"
                        ),
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            videoId: titleExperimentVideoId,
                            thumbnails: youtubeThumbnailsGenerated.map((t) => ({
                              id: t.id,
                              fileName: t.fileName,
                            })),
                          }),
                        }
                      );
                      const data = await res.json();
                      if (res.ok) {
                        setThumbnailExperiment(data.experiment);
                        toast("Teste A/B de thumbnails iniciado.");
                      } else
                        toast(data.error || "Falha ao iniciar teste de capas.");
                    }}
                    className="w-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold py-2 rounded-xl text-[10px]"
                  >
                    Iniciar A/B de Thumbnails
                  </button>
                )}
            </div>

            {titleExperimentVideoId && activeProject && (
              <ProjectYoutubeCard
                projectName={activeProject}
                videoId={titleExperimentVideoId}
                toast={toast}
                onOpenYoutubePanel={() => setActiveTab("youtube-studio")}
              />
            )}

            <SocialPublishPanel
              activeProject={activeProject}
              getProjectUrl={getProjectUrl}
              selectedPlatforms={selectedPlatforms}
              selectedUploadVideo={selectedUploadVideo}
              setActiveTab={setActiveTab}
              setSettingsSection={setSettingsSection}
            />
          </div>
        </div>

        {/* Progress and Live Terminal log view */}
        {(uploading || uploadLogs.length > 0) && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="ui-micro-label text-gray-500 block text-balance-safe">
                Progresso do Envio
              </span>
              <span className="text-xs font-mono font-bold text-gold-500">
                {uploadProgress}%
              </span>
            </div>

            <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
              <div
                className="bg-gold-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            <div className="bg-black/60 border border-zinc-950 rounded-xl p-4 h-64 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1">
              {uploadLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashminProjectTabLayout>
  );
}
