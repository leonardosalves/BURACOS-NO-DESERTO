import React from 'react';
import {
  Check, CheckCircle, Copy, Image, Lock, RefreshCw, Settings, Sparkles, Video,
} from 'lucide-react';
import { DashminProjectTabLayout } from './DashminProjectTabLayout';
import { SectionHeader } from './SectionHeader';
import { DashminAiChat, DashminChatApplyButton } from './DashminAiChat';
import {
  buildThumbnailBrief,
  detectJsonConfig,
  normalizeYoutubeMetadataDisplay,
  renderFormattedText,
} from './youtubeMetadataDisplay';
import type { AppTab } from './appTabs';

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
    id: string; label?: string; overlayText?: string; pairedTitle?: string;
    composition?: string; focalElement?: string; colors?: string[];
  }) => void | Promise<void>;
  selectThumbnailForUpload: (generated: { id: string; fileName?: string; url: string }) => void | Promise<void>;
  setActiveTab: (tab: AppTab) => void;
  setTitleAbSelected: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setTitleExperimentLoading: (v: boolean) => void;
  setTitleExperimentVideoId: (v: string | null) => void;
  setYtTitle: (v: string) => void;
  titleAbSelected: Record<string, boolean>;
  titleExperiment: any;
  titleExperimentAnalytics: any;
  titleExperimentLoading: boolean;
  titleExperimentRankings: Array<{ id: string; views?: number }>;
  titleExperimentVideoId: string | null;
  titleExperimentWinner: { variantId?: string; views?: number } | null;
  titleRetention: any;
  uploadStatus: any;
  youtubeLoading: boolean;
  youtubeMetadata: string;
  youtubeMetadataFormat: string;
  youtubeMetadataParsed: any;
  youtubeMetadataStrategy: any;
  youtubeThumbnailsGenerated: Array<{ id: string; fileName?: string; url: string; label?: string; overlayText?: string }>;
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
  return (
            <DashminProjectTabLayout tab="ai" activeProject={activeProject} className="lumiera-fill-view overflow-hidden">
            <div className="lumiera-fill-view space-y-6 overflow-hidden">

              <div className="dash-status-card">

                <div className="flex items-center gap-3">

                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasApiKey ? 'bg-emerald-500/10 text-emerald-500' : 'bg-dash-primary/10 text-dash-primary'}`}>

                    {hasApiKey ? <CheckCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}

                  </div>

                  <div>

                    <SectionHeader title="Provedor de IA" helpId="ai-provider-panel" size="sm" titleClassName="text-xs tracking-wide" />

                    <p className="text-[10px] text-dash-muted mt-0.5">

                      {hasApiKey
                        ? `Conectado via ${aiProviderBadge.short}. ${aiProviderBadge.detail}`
                        : aiProviderBadge.detail}

                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">

                  <button 

                    onClick={() => setActiveTab('settings')}

                    className="dash-btn-ghost-sm"

                  >

                    <Settings className="w-3.5 h-3.5" />

                    Configurações

                  </button>

                </div>

              </div>

              {/* Two Column Layout: YouTube Metadata & AI Chat */}

              <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0 min-w-0 overflow-hidden">

                {/* Column 1: YouTube Metadata */}

                <div className="flex-1 dash-chat-panel">

                  <div className="flex justify-between items-start dash-chat-panel-header">

                    <div>

                      <SectionHeader
                        title="Otimizador de Metadados do YouTube"
                        helpId="ai-metadata"
                        icon={<Video className="w-4 h-4 text-dash-primary" />}
                        size="sm"
                        titleClassName="tracking-widest uppercase text-xs"
                        subtitle={<>Passo 1: <strong className="text-zinc-300">Gerar Metadados</strong> → Passo 2: <strong className="text-zinc-300">Gerar Thumbnails</strong> (botão verde). Títulos, descrição, tags e 3 capas A/B para upload no YouTube.</>}
                      />
                      {(youtubeMetadataFormat || youtubeMetadataStrategy?.profileLabel) && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {youtubeMetadataFormat && (
                            <span className={`inline-flex text-[9px] font-bold px-2 py-0.5 rounded ${youtubeMetadataFormat === 'SHORT' ? 'bg-fuchsia-500/10 text-fuchsia-400' : 'bg-sky-500/10 text-sky-400'}`}>
                              {youtubeMetadataFormat === 'SHORT' ? 'Shorts · feed + rewatch' : 'Longo · CTR + retenção'}
                            </span>
                          )}
                          {youtubeMetadataStrategy?.profileLabel && (
                            <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                              Perfil: {youtubeMetadataStrategy.profileLabel}
                            </span>
                          )}
                          {youtubeMetadataStrategy?.rpm && (
                            <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                              RPM {youtubeMetadataStrategy.rpm}
                            </span>
                          )}
                        </div>
                      )}

                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <button
                      disabled={canvaThumbnailsLoading || !uploadStatus.canva?.connected}
                      onClick={handleGenerateCanvaThumbnails}
                      title={uploadStatus.canva?.connected ? 'Gera capas A/B/C automaticamente via Canva Connect' : 'Conecte o Canva em Upload → Integrações'}
                      className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10"
                    >
                      {canvaThumbnailsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{canvaThumbnailsLoading ? 'Canva...' : 'Gerar no Canva'}</span>
                    </button>
                    <button
                      disabled={youtubeThumbnailsLoading}
                      onClick={handleGenerateYoutubeThumbnailImages}
                      title={youtubeMetadataParsed?.thumbnails?.length ? 'Gera 3 imagens de capa A/B/C' : 'Gere os metadados primeiro (passo 1)'}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
                    >
                      {youtubeThumbnailsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
                      <span>{youtubeThumbnailsLoading ? 'Gerando...' : 'Gerar Thumbnails'}</span>
                    </button>
                    <button 

                      disabled={youtubeLoading || !hasApiKey}

                      onClick={handleGenerateYoutubeMetadata}

                      className="dash-btn-primary text-[11px] px-4 py-2 disabled:opacity-50"

                    >

                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />

                      <span>{youtubeLoading ? 'Gerando...' : 'Gerar Metadados'}</span>

                    </button>
                    </div>

                  </div>

                  <div className="flex-1 dash-inset-panel mt-3 relative">

                    {youtubeLoading ? (

                      <div className="flex flex-col items-center justify-center h-full gap-3 text-dash-muted text-xs">

                        <RefreshCw className="w-6 h-6 animate-spin text-dash-primary" />

                        <span>A IA está analisando o roteiro e gerando metadados ideais...</span>

                      </div>

                    ) : youtubeMetadata ? (

                      <div className="space-y-3">

                        {/* Aplicar ao Upload + Copiar Tudo */}

                        <div className="flex justify-between items-center gap-2 flex-wrap">
                          {youtubeMetadataParsed?.description && (
                            <button
                              onClick={applyMetadataToUpload}
                              className="dash-chat-chip font-bold flex items-center gap-1"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Aplicar ao Upload (completo)
                            </button>
                          )}
                          <div className="flex-1" />

                          <button 

                            onClick={() => copyToClipboard(youtubeMetadata, 'youtube')}

                            className="dash-btn-ghost-sm"

                          >

                            {copiedSection === 'youtube' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}

                            <span>{copiedSection === 'youtube' ? 'Copiado!' : 'Copiar Tudo'}</span>

                          </button>

                        </div>

                        {(youtubeMetadataParsed?.thumbnails?.length || youtubeMetadataParsed?.titles?.length) && (
                          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div>
                                <SectionHeader title="Thumbnails A/B" helpId="thumbnails-ab" size="sm" titleClassName="text-gold-500 tracking-wide uppercase text-xs" />
                                <span className="text-[9px] text-zinc-500">
                                  {uploadStatus.canva?.connected ? 'Canva automático ou local sharp' : 'Conecte o Canva para gerar capas sem abrir o navegador'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  disabled={canvaThumbnailsLoading || !uploadStatus.canva?.connected}
                                  onClick={handleGenerateCanvaThumbnails}
                                  className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                  {canvaThumbnailsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                  {canvaThumbnailsLoading ? 'Canva...' : 'Gerar no Canva'}
                                </button>
                                <button
                                  disabled={youtubeThumbnailsLoading}
                                  onClick={handleGenerateYoutubeThumbnailImages}
                                  className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                  {youtubeThumbnailsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
                                  {youtubeThumbnailsLoading ? 'Gerando...' : 'Local'}
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {(youtubeMetadataParsed.thumbnails?.length
                                ? youtubeMetadataParsed.thumbnails
                                : (youtubeMetadataParsed.titles || []).slice(0, 3).map((t, i) => ({
                                    id: String.fromCharCode(65 + i),
                                    label: ['Curiosidade', 'Contraste', 'Prova Visual'][i] || 'Variante',
                                    overlayText: t.text?.split(' ').slice(0, 4).join(' '),
                                    pairedTitle: `${i + 1}. ${t.text}`,
                                  }))
                              ).map((thumb) => {
                                const generated = youtubeThumbnailsGenerated.find((g) => g.id === thumb.id);
                                return (
                                <div key={thumb.id} className={`bg-zinc-900/50 border rounded-lg p-3 space-y-2 ${ytThumbnailVariant === thumb.id ? 'border-gold-500/60 ring-1 ring-gold-500/20' : 'border-zinc-800'}`}>
                                  {generated?.url && (
                                    <a href={generated.url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-zinc-800 hover:border-gold-500/40 transition">
                                      <img
                                        src={`${generated.url}?t=${Date.now()}`}
                                        alt={`Thumbnail variante ${thumb.id}`}
                                        className={`w-full object-cover ${youtubeMetadataFormat === 'SHORT' ? 'aspect-[9/16] max-h-64' : 'aspect-video'}`}
                                      />
                                    </a>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-white">Variante {thumb.id}</span>
                                    <span className="text-[9px] text-zinc-500">{thumb.label}</span>
                                  </div>
                                  {thumb.overlayText && (
                                    <div className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5">
                                      <span className="text-[8px] text-zinc-500 uppercase block">Texto na capa</span>
                                      <span className="text-sm font-black text-gold-400 tracking-wide">{thumb.overlayText}</span>
                                    </div>
                                  )}
                                  {thumb.pairedTitle && (
                                    <p className="text-[10px] text-zinc-400"><span className="text-zinc-600">Título:</span> {thumb.pairedTitle}</p>
                                  )}
                                  {thumb.composition && (
                                    <p className="text-[10px] text-zinc-400 leading-relaxed">{thumb.composition}</p>
                                  )}
                                  {thumb.focalElement && (
                                    <p className="text-[10px] text-zinc-500"><span className="text-zinc-600">Foco:</span> {thumb.focalElement}</p>
                                  )}
                                  {thumb.colors && thumb.colors.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {thumb.colors.map((color, cIdx) => (
                                        <span
                                          key={cIdx}
                                          className="w-4 h-4 rounded-full border border-zinc-700"
                                          style={{ backgroundColor: color }}
                                          title={color}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {generated?.url && (
                                      <button
                                        onClick={() => selectThumbnailForUpload(generated)}
                                        className={`text-[9px] font-bold py-1.5 rounded border transition cursor-pointer ${ytThumbnailVariant === thumb.id ? 'bg-gold-500/20 border-gold-500/40 text-gold-300' : 'border-zinc-800 text-zinc-300 hover:border-gold-500/30'}`}
                                      >
                                        {ytThumbnailVariant === thumb.id ? '✓ No Upload' : 'Usar no Upload'}
                                      </button>
                                    )}
                                    {generated?.editUrl && (
                                      <a
                                        href={generated.editUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-center text-[9px] font-bold text-cyan-400 hover:text-cyan-300 py-1.5 rounded border border-cyan-500/20 hover:border-cyan-500/40 transition"
                                      >
                                        Editar no Canva
                                      </a>
                                    )}
                                    <button
                                      onClick={() => openCanvaThumbnailDesigner(thumb)}
                                      className="text-[9px] font-bold text-sky-400 hover:text-sky-300 py-1.5 rounded border border-sky-500/20 hover:border-sky-500/40 transition cursor-pointer"
                                    >
                                      {copiedSection === `canva-${thumb.id}` ? 'Brief copiado!' : 'Abrir Canva'}
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(buildThumbnailBrief(thumb, { profileLabel: youtubeMetadataStrategy?.profileLabel, format: youtubeMetadataFormat }), `thumb-${thumb.id}`)}
                                      className="text-[9px] font-bold text-zinc-400 hover:text-white py-1.5 rounded border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
                                    >
                                      {copiedSection === `thumb-${thumb.id}` ? 'Copiado!' : 'Copiar briefing'}
                                    </button>
                                    {generated?.url ? (
                                      <a
                                        href={generated.url}
                                        download
                                        className="text-center text-[9px] font-bold text-gold-500 hover:text-gold-400 py-1.5 rounded border border-gold-500/20 hover:border-gold-500/40 transition"
                                      >
                                        Baixar
                                      </a>
                                    ) : (
                                      <span className="text-[9px] text-zinc-600 text-center py-1.5">Gere imagens</span>
                                    )}
                                  </div>
                                </div>
                              );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Render sections with individual copy buttons */}

                        {(() => {

                          const sections = normalizeYoutubeMetadataDisplay(youtubeMetadata).split(/^## /m).filter(Boolean).filter((section) => {
                            const sectionTitle = section.split('\n')[0]?.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                            if (sectionTitle === 'THUMBNAILS A/B' && youtubeMetadataParsed?.thumbnails?.length) return false;
                            return true;
                          });

                          return sections.map((section, sIdx) => {

                            const lines = section.split('\n');

                            const title = lines[0]?.trim() || `Seção ${sIdx + 1}`;

                            const content = lines.slice(1).join('\n').trim();

                            const sectionKey = `meta-${sIdx}`;

                            return (

                              <div key={sIdx} className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 relative group">

                                <div className="flex items-center justify-between mb-2">

                                  <h3 className="text-gold-500 font-bold text-xs tracking-wide font-sans uppercase">{title}</h3>

                                  <button

                                    onClick={() => copyToClipboard(content, sectionKey)}

                                    className="bg-zinc-900 border border-zinc-800 text-gray-500 hover:text-white px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 transition cursor-pointer opacity-60 group-hover:opacity-100"

                                  >

                                    {copiedSection === sectionKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}

                                    <span>{copiedSection === sectionKey ? 'Copiado!' : 'Copiar'}</span>

                                  </button>

                                </div>

                                <div className="prose prose-invert max-w-none">
                                  {/^T[ÍI]TULOS$/i.test(title) && youtubeMetadataParsed?.titles?.length ? (
                                    <div className="space-y-3 not-prose">
                                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <div>
                                            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wide">Teste A/B de Títulos</span>
                                            <p className="text-[9px] text-zinc-500">Publique o vídeo, cole o videoId e alterne títulos com analytics do YouTube.</p>
                                          </div>
                                          <button
                                            disabled={titleExperimentLoading}
                                            onClick={fetchTitleExperimentAnalytics}
                                            className="text-[9px] font-bold text-violet-400 hover:text-violet-300 px-2 py-1 rounded border border-violet-500/30 hover:border-violet-500/50 transition cursor-pointer"
                                          >
                                            {titleExperimentLoading ? 'Atualizando...' : 'Atualizar Analytics'}
                                          </button>
                                        </div>
                                        <input
                                          type="text"
                                          placeholder="videoId do YouTube (ex: dQw4w9WgXcQ)"
                                          value={titleExperimentVideoId}
                                          onChange={(e) => setTitleExperimentVideoId(e.target.value)}
                                          className="w-full bg-black border border-zinc-800 focus:border-violet-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-white"
                                        />
                                        {titleExperimentAnalytics?.available && (
                                          <div className="space-y-2">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                                              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                                                <span className="text-zinc-500 block">Views (28d)</span>
                                                <span className="text-white font-bold">{titleExperimentAnalytics.metrics?.views ?? 0}</span>
                                              </div>
                                              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                                                <span className="text-zinc-500 block">Min. assistidos</span>
                                                <span className="text-white font-bold">{Math.round(titleExperimentAnalytics.metrics?.estimatedMinutesWatched || 0)}</span>
                                              </div>
                                              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                                                <span className="text-zinc-500 block">Retenção média</span>
                                                <span className="text-white font-bold">{Math.round(titleExperimentAnalytics.metrics?.averageViewDuration || 0)}s</span>
                                              </div>
                                              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5">
                                                <span className="text-zinc-500 block">Likes / Coment.</span>
                                                <span className="text-white font-bold">
                                                  {titleExperimentAnalytics.metrics?.likes ?? 0} / {titleExperimentAnalytics.metrics?.comments ?? 0}
                                                </span>
                                              </div>
                                            </div>
                                            {titleExperimentAnalytics.reachNote && (
                                              <p className="text-[8px] text-zinc-500">{titleExperimentAnalytics.reachNote}</p>
                                            )}
                                            {titleExperimentWinner?.variantId && (
                                              <p className="text-[9px] text-emerald-400 font-bold">
                                                Líder por views no período: variante {titleExperimentWinner.variantId} ({titleExperimentWinner.views} views)
                                              </p>
                                            )}
                                            {titleRetention?.velocity?.views48h != null && (
                                              <p className="text-[9px] text-cyan-400">
                                                Views 48h: {titleRetention.velocity.views48h}
                                              </p>
                                            )}
                                            <div className="flex gap-2 flex-wrap">
                                              <button
                                                type="button"
                                                disabled={titleExperimentLoading || !titleExperimentWinner}
                                                onClick={async () => {
                                                  setTitleExperimentLoading(true);
                                                  try {
                                                    const res = await fetch(getProjectUrl('/api/youtube/title-experiment/apply-winner'), { method: 'POST' });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                      toast(`Vencedor ${data.winner?.variantId} aplicado permanentemente.`);
                                                      fetchTitleExperimentAnalytics();
                                                    } else toast(data.error || 'Falha ao aplicar vencedor.');
                                                  } finally { setTitleExperimentLoading(false); }
                                                }}
                                                className="text-[8px] font-bold text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded disabled:opacity-50"
                                              >
                                                Aplicar vencedor
                                              </button>
                                              <button
                                                type="button"
                                                disabled={titleExperimentLoading}
                                                onClick={async () => {
                                                  await fetch(getProjectUrl('/api/youtube/title-experiment/stop'), { method: 'POST' });
                                                  toast('Experimento de títulos encerrado.');
                                                  fetchTitleExperiment();
                                                }}
                                                className="text-[8px] font-bold text-zinc-400 border border-zinc-700 px-2 py-1 rounded"
                                              >
                                                Parar teste
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        {uploadStatus.youtube?.connected && uploadStatus.youtube?.titleTestReady === false && (
                                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-2 space-y-1.5">
                                            <p className="text-[9px] text-amber-400 font-bold">Permissões antigas (só upload)</p>
                                            <p className="text-[9px] text-amber-500/90">
                                              Faltam: {(uploadStatus.youtube?.missingScopes || []).join(', ') || 'editar títulos e analytics'}.
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
                                        {titleExperimentAnalytics && !titleExperimentAnalytics.available && titleExperimentAnalytics.error && (
                                          <p className="text-[9px] text-amber-500">{titleExperimentAnalytics.error}</p>
                                        )}
                                        <button
                                          disabled={titleExperimentLoading || !uploadStatus.youtube?.connected}
                                          onClick={handleStartTitleExperiment}
                                          className="w-full bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 disabled:opacity-50 text-[10px] font-bold py-1.5 rounded-lg transition cursor-pointer"
                                        >
                                          {titleExperimentLoading ? 'Processando...' : 'Iniciar teste A/B (títulos marcados)'}
                                        </button>
                                      </div>
                                      {youtubeMetadataParsed.titles.map((t, tIdx) => {
                                        const hasHashtag = /#[\wÀ-ÿ]+/i.test(t.text);
                                        const hasEmoji = /\p{Extended_Pictographic}/u.test(t.text);
                                        const maxChars = youtubeMetadataFormat === 'SHORT'
                                          ? (hasHashtag || hasEmoji ? 55 : 40)
                                          : 50;
                                        const ok = t.chars <= maxChars;
                                        const isRecommended = tIdx === 0 || t.text === youtubeMetadataParsed.recommendedTitle;
                                        const variantId = String.fromCharCode(65 + tIdx);
                                        const isAbSelected = titleAbSelected[String(tIdx)] !== false;
                                        const isActiveVariant = titleExperiment?.activeVariantId === variantId;
                                        const ranking = titleExperimentRankings.find((r) => r.id === variantId);
                                        return (
                                          <div key={tIdx} className={`flex items-start justify-between gap-2 bg-zinc-900/50 border rounded-lg px-3 py-2 ${isRecommended ? 'border-gold-500/40 ring-1 ring-gold-500/15' : isActiveVariant ? 'border-violet-500/50 ring-1 ring-violet-500/20' : 'border-zinc-800'}`}>
                                            <div className="min-w-0 flex items-start gap-2">
                                              <input
                                                type="checkbox"
                                                checked={isAbSelected}
                                                onChange={(e) => setTitleAbSelected((prev) => ({ ...prev, [String(tIdx)]: e.target.checked }))}
                                                className="mt-1 accent-violet-500"
                                                title="Incluir no teste A/B"
                                              />
                                              <div>
                                                <span className="text-[10px] text-zinc-500 mr-2">{tIdx + 1}.</span>
                                                {isRecommended && (
                                                  <span className="text-[8px] font-bold text-gold-400 bg-gold-500/10 border border-gold-500/30 px-1.5 py-0.5 rounded mr-1.5 uppercase tracking-wide">
                                                    Recomendado
                                                  </span>
                                                )}
                                                <span className="text-xs text-zinc-200 break-words whitespace-normal leading-snug">{t.text}</span>
                                                <span className={`ml-2 text-[9px] font-mono ${ok ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                  {t.chars}/{maxChars}
                                                </span>
                                                {typeof t.score === 'number' && (
                                                  <span className="ml-1 text-[8px] text-zinc-600 font-mono" title="Score de qualidade">
                                                    · {t.score}pts
                                                  </span>
                                                )}
                                                {isActiveVariant && <span className="ml-2 text-[8px] text-violet-400 font-bold">ATIVO NO YT</span>}
                                                {typeof ranking?.periodViews === 'number' && (
                                                  <span className="block text-[8px] text-emerald-500 mt-0.5">
                                                    {ranking.periodViews} views no período deste título
                                                    {ranking.periodAvgDuration ? ` · ${ranking.periodAvgDuration}s retenção` : ''}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex flex-col gap-1 shrink-0">
                                              <button
                                                onClick={() => {
                                                  setYtTitle(t.text.slice(0, 100));
                                                  toast(`Título #${tIdx + 1} aplicado na aba Upload.`);
                                                }}
                                                className="text-[9px] font-bold text-gold-500 hover:text-gold-400 px-2 py-1 rounded border border-gold-500/20 hover:border-gold-500/40 transition cursor-pointer"
                                              >
                                                Usar
                                              </button>
                                              {titleExperiment?.videoId && uploadStatus.youtube?.connected && tIdx < 5 && (
                                                <button
                                                  disabled={titleExperimentLoading}
                                                  onClick={() => handleApplyTitleVariant(variantId)}
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
                                  ) : (
                                    renderFormattedText(content)
                                  )}

                                </div>

                              </div>

                            );

                          });

                        })()}

                      </div>

                    ) : (

                      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500 text-xs gap-2">

                        <MessageSquare className="w-8 h-8 text-zinc-700" />

                        <span>Clique em "Gerar Metadados" para criar títulos magnéticos, descrição otimizada, tags e capítulos com carimbo de data/hora reais baseados no roteiro sincronizado.</span>

                      </div>

                    )}

                  </div>

                </div>

                {/* Column 2: AI Chat Assistant */}

                <div className="flex-1 dash-chat-panel font-sans">

                  <div className="dash-chat-panel-header">

                    <SectionHeader
                      title="Chat de Engenharia e Criação IA"
                      helpId="ai-chat"
                      icon={<Sparkles className="w-4 h-4 text-dash-primary" />}
                      size="sm"
                      titleClassName="tracking-widest uppercase text-xs"
                      subtitle="Peça alterações de BGM, sugestões de palavras-chave ou reescrita de textos de impacto."
                    />

                  </div>

                  <DashminAiChat
                    messages={chatMessages}
                    loading={chatLoading}
                    input={chatInput}
                    onInputChange={setChatInput}
                    onSend={handleSendChatMessage}
                    hasApiKey={hasApiKey}
                    chatEndRef={chatEndRef}
                    suggestions={[
                      { label: '💡 Sugerir Destaques', message: 'Sugerir palavras-chave extras para destacar baseadas no roteiro.' },
                      { label: '🔥 Impactos Épicos', message: 'Melhorar frases de impacto para deixá-las mais dramáticas e épicas.' },
                      { label: '🎵 Análise Musical', message: 'Me sugira faixas de trilha sonora ideais para os blocos da metade do vídeo.' },
                    ]}
                    renderMessageExtra={(msg) => {
                      if (msg.role !== 'assistant') return null;
                      const parsedConfig = detectJsonConfig(msg.content);
                      return parsedConfig ? (
                        <DashminChatApplyButton onClick={() => applyAiConfig(parsedConfig)} />
                      ) : null;
                    }}
                  />

                </div>

              </div>

            </div>

            </DashminProjectTabLayout>
  );
}
