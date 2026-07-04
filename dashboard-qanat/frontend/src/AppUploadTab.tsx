import toast from 'react-hot-toast';
import React from 'react';
import { Image, RefreshCw, Share2, Sparkles } from 'lucide-react';
import { DashminProjectTabLayout } from './DashminProjectTabLayout';
import { ProjectYoutubeCard } from './ProjectYoutubeCard';
import type { AppTab } from './appTabs';
import type { ConfigData } from './appTypes';
import type { SettingsSection } from './SettingsSectionNav';

export type AppUploadTabProps = {
  activeProject: string;
  applyMetadataToUpload: () => void | Promise<void>;
  config: ConfigData | null;
  getProjectUrl: (path: string) => string;
  handleFixYoutubeMetadata: () => void | Promise<void>;
  handleGenerateYoutubeThumbnailImages: () => void | Promise<void>;
  handlePostUploadComplete: (videoId: string, postUpload?: unknown) => void | Promise<void>;
  igCaption: string;
  setIgCaption: (v: string) => void;
  kwCaption: string;
  setKwCaption: (v: string) => void;
  openCanvaThumbnailDesigner: (thumb?: {
    id: string; label?: string; overlayText?: string; pairedTitle?: string;
    composition?: string; focalElement?: string; colors?: string[];
  }) => void | Promise<void>;
  pipelineRunning: boolean;
  setPipelineRunning: (v: boolean) => void;
  prepareUploadForPublish: () => Promise<{ ok: boolean; payload?: unknown }>;
  saveUploadMetadataToProject: (payload?: unknown) => Promise<boolean>;
  selectThumbnailForUpload: (generated: { id: string; fileName?: string; url: string }) => void | Promise<void>;
  selectedPlatforms: Record<string, boolean>;
  setSelectedPlatforms: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
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
  youtubeThumbnailsGenerated: Array<{ id: string; fileName?: string; url: string; label?: string; overlayText?: string }>;
  youtubeThumbnailsLoading: boolean;
  ytThumbnailVariant: string;
};

export function AppUploadTab({
  activeProject,
  applyMetadataToUpload,
  config,
  getProjectUrl,
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
                          onChange={(e) => setSelectedPlatforms(prev => ({ ...prev, youtube: e.target.checked }))}
                          className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                        />
                        <label htmlFor="select-yt" className="text-xs font-bold text-zinc-200 cursor-pointer flex items-center gap-1.5">
                          <span>YouTube (Videos / Shorts)</span>
                        </label>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.youtube?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {uploadStatus.youtube?.connected ? 'Conectado' : 'Não Conectado'}
                      </span>
                    </div>

                    {selectedPlatforms.youtube && (
                      <div className="space-y-4 text-xs font-sans">
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-violet-500/25 bg-violet-500/5">
                          <p className="text-[10px] text-zinc-400 leading-relaxed max-w-md">
                            {uploadMetadataReady
                              ? 'Metadados da aba IA · Metadados disponíveis — preencha os campos abaixo com um clique.'
                              : 'Gere títulos, descrição e tags na aba IA · Metadados, depois volte aqui para preencher.'}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setActiveTab('ai')}
                              className="text-[9px] font-bold text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-800 transition cursor-pointer"
                            >
                              IA · Metadados
                            </button>
                            <button
                              type="button"
                              onClick={() => { void applyMetadataToUpload(); }}
                              disabled={!uploadMetadataReady}
                              className="text-[9px] font-bold text-violet-100 bg-violet-600/30 hover:bg-violet-600/45 disabled:opacity-40 border border-violet-500/40 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              Preencher com metadados IA
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="ui-micro-label text-gray-500 block text-balance-safe">Título no YouTube</label>
                          <input
                            type="text"
                            maxLength={100}
                            value={ytTitle}
                            onChange={(e) => setYtTitle(e.target.value)}
                            placeholder="Insira o título do vídeo para o YouTube"
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs"
                          />
                          <span className="text-[9px] text-zinc-600 block text-right">{ytTitle.length}/100</span>
                        </div>
                        <div className="space-y-2">
                          <label className="ui-micro-label text-gray-500 block text-balance-safe">Descrição do YouTube</label>
                          <textarea
                            rows={3}
                            value={ytDescription}
                            onChange={(e) => setYtDescription(e.target.value)}
                            placeholder="Descrição completa para SEO, links e hashtags"
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-white font-sans text-xs resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="ui-micro-label text-gray-500 block text-balance-safe">Privacidade</label>
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
                          <label className="ui-micro-label text-gray-500 block text-balance-safe">Tags (vírgula)</label>
                          <input
                            type="text"
                            value={ytTags}
                            onChange={(e) => setYtTags(e.target.value)}
                            placeholder="tag1, tag2, tag3..."
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="ui-micro-label text-gray-500 block text-balance-safe">Capítulos (marcadores)</label>
                          <textarea
                            rows={2}
                            value={ytChapters}
                            onChange={(e) => setYtChapters(e.target.value)}
                            placeholder="0:00 Intro&#10;1:30 Tema principal"
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white text-xs resize-none font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="ui-micro-label text-gray-500 block text-balance-safe">Comentário fixo (pós-upload)</label>
                          <textarea
                            rows={2}
                            value={ytPinnedComment}
                            onChange={(e) => setYtPinnedComment(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2 text-white text-xs resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <label className="ui-micro-label text-gray-500 block text-balance-safe">Agendar (ISO)</label>
                            <input
                              type="datetime-local"
                              value={ytPublishAt ? ytPublishAt.slice(0, 16) : ''}
                              onChange={(e) => setYtPublishAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-white text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="ui-micro-label text-gray-500 block text-balance-safe">Categoria ID</label>
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
                              <label className="ui-micro-label text-gray-500 block text-balance-safe">Thumbnail do YouTube (A/B/C)</label>
                              <p className="text-[9px] text-zinc-600 mt-0.5">Gera 3 capas com texto overlay a partir dos assets do projeto.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveTab('ai')}
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
                                {youtubeThumbnailsLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />}
                                {youtubeThumbnailsLoading ? 'Gerando...' : 'Gerar Thumbnails'}
                              </button>
                            </div>
                          </div>
                          {ytThumbnailVariant && (
                            <p className="text-[9px] text-gold-500/80">
                              Selecionada para upload: <strong>Variante {ytThumbnailVariant}</strong>
                            </p>
                          )}
                          {youtubeThumbnailsGenerated.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {youtubeThumbnailsGenerated.map((thumb) => (
                                <div
                                  key={thumb.id}
                                  className={`rounded-lg overflow-hidden border transition ${ytThumbnailVariant === thumb.id ? 'border-gold-500/60 ring-1 ring-gold-500/20' : 'border-zinc-800'}`}
                                >
                                  <a href={thumb.url} target="_blank" rel="noreferrer" className="block">
                                    <img
                                      src={`${thumb.url}?t=${Date.now()}`}
                                      alt={`Thumbnail ${thumb.id}`}
                                      className={`w-full object-cover ${youtubeMetadataFormat === 'SHORT' ? 'aspect-[9/16]' : 'aspect-video'}`}
                                    />
                                  </a>
                                  <div className="flex gap-1 p-1 bg-zinc-950/80">
                                    <button
                                      type="button"
                                      onClick={() => selectThumbnailForUpload(thumb)}
                                      className={`flex-1 text-[8px] font-bold py-1 rounded ${ytThumbnailVariant === thumb.id ? 'bg-gold-500/20 text-gold-300' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                      {ytThumbnailVariant === thumb.id ? '✓' : 'Usar'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openCanvaThumbnailDesigner({ id: thumb.id, label: thumb.label, overlayText: thumb.overlayText })}
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
                              Nenhuma thumbnail gerada ainda. Use &quot;Gerar Metadados&quot; na aba Agente IA, depois clique em &quot;Gerar Thumbnails&quot;.
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
                          onChange={(e) => setSelectedPlatforms(prev => ({ ...prev, instagram: e.target.checked }))}
                          className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                        />
                        <label htmlFor="select-ig" className="text-xs font-bold text-zinc-200 cursor-pointer">
                          Instagram Reels
                        </label>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.instagram?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {uploadStatus.instagram?.connected ? 'Conectado' : 'Não Conectado'}
                      </span>
                    </div>

                    {selectedPlatforms.instagram && (
                      <div className="space-y-3 text-xs font-sans">
                        <div className="space-y-2">
                          <label className="ui-micro-label text-gray-500 block text-balance-safe">Legenda do Reels (Caption)</label>
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
                          onChange={(e) => setSelectedPlatforms(prev => ({ ...prev, tiktok: e.target.checked }))}
                          className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                        />
                        <label htmlFor="select-tt" className="text-xs font-bold text-zinc-200 cursor-pointer">
                          TikTok (Playwright Automação)
                        </label>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.tiktok?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {uploadStatus.tiktok?.connected ? 'Sessão Ativa' : 'Desconectado'}
                      </span>
                    </div>

                    {selectedPlatforms.tiktok && (
                      <div className="space-y-3 text-xs font-sans">
                        <div className="space-y-2">
                          <label className="ui-micro-label text-gray-500 block text-balance-safe">Legenda do TikTok</label>
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
                          onChange={(e) => setSelectedPlatforms(prev => ({ ...prev, kwai: e.target.checked }))}
                          className="w-4 h-4 accent-gold-500 bg-zinc-950 border-zinc-800 rounded cursor-pointer"
                        />
                        <label htmlFor="select-kw" className="text-xs font-bold text-zinc-200 cursor-pointer">
                          Kwai (Playwright Automação)
                        </label>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${uploadStatus.kwai?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {uploadStatus.kwai?.connected ? 'Sessão Ativa' : 'Desconectado'}
                      </span>
                    </div>

                    {selectedPlatforms.kwai && (
                      <div className="space-y-3 text-xs font-sans">
                        <div className="space-y-2">
                          <label className="ui-micro-label text-gray-500 block text-balance-safe">Legenda do Kwai</label>
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
                    <span className="ui-micro-label text-gray-500 block text-balance-safe">Ações Globais</span>
                    {selectedUploadVideo ? (
                      <div className="text-[10px] text-zinc-400 p-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 leading-relaxed">
                        Vídeo para publicar: <strong className="text-emerald-300">{selectedUploadVideo}</strong>
                        <button
                          type="button"
                          onClick={() => setActiveTab('status')}
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
                    <button
                      type="button"
                      onClick={() => { void applyMetadataToUpload(); }}
                      disabled={!uploadMetadataReady}
                      className="w-full bg-violet-600/15 hover:bg-violet-600/25 disabled:opacity-40 border border-violet-500/30 text-violet-200 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Preencher com metadados IA
                    </button>
                    <button
                      onClick={async () => {
                        const ok = await saveUploadMetadataToProject();
                        toast(ok ? 'Metadados salvos com sucesso!' : 'Erro ao salvar metadados.');
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 hover:border-gold-500/20 text-gold-500 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      Salvar Metadados do Projeto
                    </button>
                    {(titleExperimentVideoId || config?.upload_metadata?.youtube?.post_id) && (
                      <button
                        type="button"
                        onClick={() => { void handleFixYoutubeMetadata(); }}
                        className="w-full bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/30 text-amber-200 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                      >
                        Corrigir metadados no YouTube (vídeo já enviado)
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const prepared = await prepareUploadForPublish();
                        if (!prepared.ok) return;
                        const saved = await saveUploadMetadataToProject(prepared.payload);
                        if (!saved) {
                          toast.error('Erro ao salvar metadados antes do upload.');
                          return;
                        }
                        setUploading(true);
                        setUploadLogs([]);
                        setUploadProgress(0);
                        const platformList = Object.entries(selectedPlatforms)
                          .filter(([_, active]) => active)
                          .map(([key]) => key)
                          .join(",");
                        
                        const videoParam = selectedUploadVideo ? `&video=${encodeURIComponent(selectedUploadVideo)}` : '';
                        const eventSource = new EventSource(getProjectUrl(`/api/projects/upload-pipeline?platforms=${platformList}${videoParam}`));
                        eventSource.onmessage = (event) => {
                          const data = JSON.parse(event.data);
                          if (data.type === "log") {
                            setUploadLogs(prev => [...prev, data.text]);
                            const progressMatch = data.text.match(/\[PROGRESSO\] (\d+)%/);
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
                            const detail = data.detail || data.message || 'Erro desconhecido';
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
                      <span>{uploading ? "Publicando..." : "Publicar nas Selecionadas"}</span>
                    </button>
                    <button
                      onClick={() => {
                        setPipelineRunning(true);
                        setUploadLogs([]);
                        const es = new EventSource(getProjectUrl('/api/pipeline/run?steps=mix,thumbnails,upload'));
                        es.onmessage = (event) => {
                          const data = JSON.parse(event.data);
                          if (data.type === 'log') setUploadLogs((prev) => [...prev, data.text]);
                          if (data.type === 'complete' || data.type === 'error') {
                            es.close();
                            setPipelineRunning(false);
                            toast(data.type === 'complete' ? 'Pipeline concluído!' : data.message);
                          }
                        };
                        es.onerror = () => { es.close(); setPipelineRunning(false); };
                      }}
                      disabled={pipelineRunning || uploading}
                      className="w-full bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 disabled:opacity-50 text-violet-200 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      {pipelineRunning ? 'Pipeline rodando...' : 'Pipeline rápido (mix → thumbs → upload)'}
                    </button>
                    {titleExperimentVideoId && youtubeThumbnailsGenerated.length >= 2 && (
                      <button
                        onClick={async () => {
                          const res = await fetch(getProjectUrl('/api/youtube/thumbnail-experiment/start'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              videoId: titleExperimentVideoId,
                              thumbnails: youtubeThumbnailsGenerated.map((t) => ({ id: t.id, fileName: t.fileName })),
                            }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setThumbnailExperiment(data.experiment);
                            toast('Teste A/B de thumbnails iniciado.');
                          } else toast(data.error || 'Falha ao iniciar teste de capas.');
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
                      onOpenYoutubePanel={() => setActiveTab('youtube-studio')}
                    />
                  )}

                  {/* Auth Configuration */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-3">
                    <span className="ui-micro-label text-gray-500 block text-balance-safe">Integrações</span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Chaves de API, OAuth e sessões ficam em Configurações → Integrações.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSettingsSection('integracoes'); setActiveTab('settings'); }}
                      className="w-full bg-gold-500/10 border border-gold-500/30 text-gold-400 font-bold py-2.5 rounded-xl text-xs hover:bg-gold-500/20 transition"
                    >
                      Abrir Configurações → Integrações
                    </button>
                  </div>

                </div>
              </div>

              {/* Progress and Live Terminal log view */}
              {(uploading || uploadLogs.length > 0) && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="ui-micro-label text-gray-500 block text-balance-safe">Progresso do Envio</span>
                    <span className="text-xs font-mono font-bold text-gold-500">{uploadProgress}%</span>
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
