import React from 'react';
import {
  AlertTriangle, CheckCircle, Download, ExternalLink, Play, RefreshCw, Sparkles, Trash2, Tv, Video,
} from 'lucide-react';
import { DashminProjectTabLayout } from './DashminProjectTabLayout';
import { SectionHeader } from './SectionHeader';
import { BrandSettingsPanel } from './BrandSettingsPanel';
import { PreRenderAdvicePanel } from './PreRenderAdvice';
import type { AppTab } from './appTabs';
import type { ConfigData, OutputVideo, VideoQualityReport, WorkspaceStatus } from './appTypes';

export type AppStatusTabProps = {
  activeProject: string;
  brandPanelProps: Record<string, unknown>;
  config: ConfigData | null;
  effectiveRenderResolution: string;
  fetchVideoQuality: () => void | Promise<void>;
  getFormatBytes: (n: number) => string;
  handlePreRenderAutoFix: (fixId: string) => void | Promise<void>;
  outputs: OutputVideo[];
  preRenderFixingId: string | null;
  renderResolutionLabel: string;
  rendering: boolean;
  selectedUploadVideo: string | null;
  setActiveTab: (tab: AppTab) => void;
  setPendingOutputDelete: (v: OutputVideo | null) => void;
  setPreviewVideoUrl: (url: string | null) => void;
  setSelectedUploadVideo: (v: string | null) => void;
  status: WorkspaceStatus | null;
  triggerRender: (...args: any[]) => void | Promise<void>;
  videoQuality: VideoQualityReport | null;
};

export function AppStatusTab({
  activeProject,
  brandPanelProps,
  config,
  effectiveRenderResolution,
  fetchVideoQuality,
  getFormatBytes,
  handlePreRenderAutoFix,
  outputs,
  preRenderFixingId,
  renderResolutionLabel,
  rendering,
  selectedUploadVideo,
  setActiveTab,
  setPendingOutputDelete,
  setPreviewVideoUrl,
  setSelectedUploadVideo,
  status,
  triggerRender,
  videoQuality,
}: AppStatusTabProps) {
  return (
            <DashminProjectTabLayout tab="status" activeProject={activeProject}>

            <div className="lumiera-render-workspace">

              <div className="lumiera-render-hero">
                <div className="lumiera-render-topbar glass-panel px-3 py-2 rounded-lg border border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-gold-500" />
                      <span><strong className="text-gold-400">{renderResolutionLabel}</strong></span>
                    </span>
                    {videoQuality && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tabular-nums ${
                        videoQuality.score >= 80
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : videoQuality.score >= 60
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-red-400 bg-red-500/10'
                      }`}>
                        {videoQuality.score}/100
                      </span>
                    )}
                    {outputs.length > 0 && (
                      <span className="text-[9px] text-zinc-500">{outputs.length} em OUTPUT</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="text-[9px] text-zinc-500 hover:text-gold-400 transition shrink-0"
                  >
                    Resolução →
                  </button>
                </div>
                <div className="lumiera-render-engines-grid">
                
                {/* Compiler Card */}
                <div className="glass-panel lumiera-render-card">
                  <div>
                    <SectionHeader
                      title="RENDERIZADOR PADRÃO"
                      helpId="render-standard"
                      icon={<Tv className="w-4 h-4 text-gold-500" />}
                      size="sm"
                      titleClassName="text-[10px]"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">Legendas Gold/Water e Ken Burns.</p>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <button 
                      disabled={rendering || !status?.has_narration}
                      onClick={() => triggerRender('standard')}
                      className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-gold-500/10 cursor-pointer w-full"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Compilação Padrão</span>
                    </button>
                    <button
                      disabled={rendering || !status?.has_narration}
                      onClick={() => triggerRender('standard', false, true)}
                      className="bg-zinc-900 border border-zinc-800 hover:border-gold-500/40 disabled:opacity-50 disabled:cursor-not-allowed text-gold-500 font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-2 text-[10px] cursor-pointer w-full"
                      title="Renderiza mantendo as legendas normais, mas removendo os textos grandes de impacto no centro da tela."
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Sem títulos grandes</span>
                    </button>
                  </div>
                </div>

                <div className="glass-panel lumiera-render-card">
                  <div>
                    <SectionHeader
                      title="REMOTION ENGINE"
                      helpId="render-remotion"
                      icon={<ExternalLink className="w-4 h-4 text-water-300" />}
                      size="sm"
                      titleClassName="text-[10px]"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">Timeline + narração + legendas.</p>
                  </div>
                  <button
                    disabled={rendering || !status?.has_narration}
                    onClick={() => triggerRender('remotion')}
                    className="bg-water-500/15 border border-water-400/30 hover:bg-water-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-water-200 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs cursor-pointer w-full"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Render Remotion</span>
                  </button>
                </div>

                <div className="glass-panel-glow border border-amber-500/30 lumiera-render-card">
                  <div>
                    <div className="flex flex-wrap justify-between items-start gap-1">
                      <SectionHeader
                        title="REMOTION PRO"
                        helpId="render-remotion-pro"
                        icon={<Sparkles className="w-4 h-4 text-amber-500" />}
                        size="sm"
                        titleClassName="text-[10px]"
                      />
                      <span className="bg-amber-500/15 text-amber-500 text-[7px] font-bold px-1.5 py-0.5 rounded uppercase">Premium</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Infográficos e textos de impacto.</p>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <button
                      disabled={rendering || !status?.has_narration}
                      onClick={() => triggerRender('remotion-pro')}
                      className="bg-dash-primary hover:bg-dash-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs cursor-pointer w-full"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Render PRO</span>
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        disabled={rendering || !status?.has_narration}
                        onClick={() => triggerRender('remotion-pro', false, false, false, false, 0, effectiveRenderResolution, false, true)}
                        className="bg-zinc-900 border border-cyan-500/35 hover:border-cyan-400/50 disabled:opacity-50 text-cyan-300 font-bold py-1.5 rounded-lg text-[9px] cursor-pointer"
                        title="Amostra 12s"
                      >
                        Amostra 12s
                      </button>
                      <button
                        disabled={rendering || !status?.has_narration}
                        onClick={() => triggerRender('remotion-pro', false, false, false, false, 30)}
                        className="bg-zinc-900 border border-amber-500/30 hover:border-amber-400/50 disabled:opacity-50 text-amber-300 font-bold py-1.5 rounded-lg text-[9px] cursor-pointer"
                        title="Preview 30s"
                      >
                        Preview 30s
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-panel-glow border border-emerald-500/30 lumiera-render-card">
                  <div>
                    <div className="flex flex-wrap justify-between items-start gap-1">
                      <SectionHeader
                        title="HYPERFRAMES AI"
                        helpId="render-hyperframes"
                        icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
                        size="sm"
                        titleClassName="text-[10px]"
                      />
                      <span className="bg-emerald-500/15 text-emerald-400 text-[7px] font-bold px-1.5 py-0.5 rounded uppercase">Orq.</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Catálogo HyperFrames · ProRes opcional.</p>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="flex items-center gap-1.5 text-[9px] text-zinc-400 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        id="prores-alpha-checkbox" 
                        className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer w-3 h-3" 
                      />
                      <span>ProRes Alpha</span>
                    </label>
                    <button
                      disabled={rendering || !status?.has_narration}
                      onClick={() => {
                        const proresCheck = document.getElementById('prores-alpha-checkbox') as HTMLInputElement;
                        triggerRender('remotion-pro', false, false, true, proresCheck?.checked);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs cursor-pointer w-full"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>HyperFrames AI</span>
                    </button>
                  </div>
                </div>
              </div>
              </div>

              <BrandSettingsPanel {...brandPanelProps} />

              {config && !status?.has_narration && (
                <div className="glass-panel px-3 py-2 rounded-lg border border-amber-500/25 bg-amber-500/5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] text-amber-200/90">
                    Sem narração — use Workflow antes de renderizar.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('workflow')}
                    className="text-[10px] font-bold text-amber-300 hover:text-amber-100 border border-amber-500/40 px-2.5 py-1 rounded-lg transition"
                  >
                    Workflow →
                  </button>
                </div>
              )}

              <div className="lumiera-render-grid">
                <div className="lumiera-render-primary space-y-3 min-w-0">

              {videoQuality && (!(videoQuality.score >= 80) || !videoQuality.ok || videoQuality.issues.some((i) => i.severity === 'error' || i.severity === 'warning') || Boolean(videoQuality.preRenderAdvice)) && (
                <details
                  className="glass-panel rounded-xl font-sans group"
                  open={videoQuality.score < 70 || !videoQuality.ok || videoQuality.issues.some((i) => i.severity === 'error')}
                >
                  <summary className="p-4 cursor-pointer list-none flex flex-wrap items-center justify-between gap-3">
                    <SectionHeader
                      title="Ajustes antes do render"
                      helpId="quality-pre-render"
                      icon={<CheckCircle className={`w-4 h-4 ${videoQuality.ok ? 'text-emerald-400' : 'text-amber-400'}`} />}
                    />
                    <span className={`text-sm font-bold tabular-nums ${videoQuality.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      {videoQuality.score}/100
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-0 border-t border-zinc-800/60">
                  <div className="flex flex-wrap items-center gap-3 mb-3 pt-3">
                      {videoQuality.preset && (
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Preset: {videoQuality.preset}</span>
                      )}
                      {videoQuality.epidemicMood && (
                        <span className="text-[10px] text-zinc-500">BGM: {videoQuality.epidemicMood}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => fetchVideoQuality()}
                        className="text-[10px] text-zinc-400 hover:text-gold-400 transition flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Atualizar
                      </button>
                    </div>
                  {videoQuality.preRenderAdvice ? (
                    <div className="mt-3">
                      <PreRenderAdvicePanel
                        advice={videoQuality.preRenderAdvice}
                        compact
                        onRefresh={() => fetchVideoQuality()}
                        onGoToTab={(tab) => setActiveTab(tab)}
                        onAutoFix={handlePreRenderAutoFix}
                        fixingFixId={preRenderFixingId}
                      />
                    </div>
                  ) : videoQuality.issues.length > 0 ? (
                    <ul className="mt-3 space-y-1.5 max-h-28 overflow-y-auto">
                      {videoQuality.issues.slice(0, 6).map((issue, idx) => (
                        <li
                          key={`${issue.code}-${idx}`}
                          className={`text-[11px] leading-snug flex gap-2 ${
                            issue.severity === 'error' ? 'text-red-300' : issue.severity === 'warning' ? 'text-amber-300/90' : 'text-zinc-500'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 opacity-70" />
                          <span>{issue.message}</span>
                        </li>
                      ))}
                      {videoQuality.issues.length > 6 && (
                        <li className="text-[10px] text-zinc-500 pl-5">+{videoQuality.issues.length - 6} observação(ões)</li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-zinc-500 mt-2">Sem observações — overlays, gancho e orçamento dentro do esperado.</p>
                  )}
                  {videoQuality.overlay_timing && (videoQuality.overlay_timing.entries || []).some((e) => e.status === 'error' || e.status === 'warning') && (
                    <div className="mt-4 pt-3 border-t border-zinc-800/80">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                        Overlays com problema
                      </p>
                      <ul className="space-y-1 max-h-24 overflow-y-auto">
                        {videoQuality.overlay_timing.entries!
                          .filter((e) => e.status === 'error' || e.status === 'warning')
                          .map((entry) => (
                            <li key={entry.id} className="text-[10px] font-mono text-amber-300/90 flex gap-2">
                              <span>!</span>
                              <span>
                                {entry.id} @ {entry.startSec?.toFixed(1)}s
                                {entry.message ? ` — ${entry.message}` : ''}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  </div>
                </details>
              )}

                </div>

                <aside className="lumiera-render-sidebar space-y-4">
                  <div className="glass-panel p-4 rounded-2xl space-y-3 lumiera-render-output-panel">
                    <div className="flex items-center justify-between gap-2">
                      <SectionHeader title="Saída (OUTPUT)" helpId="render-output" />
                      {selectedUploadVideo && (
                        <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Para upload</span>
                      )}
                    </div>

                    {outputs.length === 0 ? (
                      <div className="text-center py-8 bg-zinc-950/20 border border-zinc-900 rounded-xl text-gray-500 text-[11px] font-sans">
                        Nenhum vídeo em OUTPUT. Inicie um render ao lado.
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-900 border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/20 font-sans max-h-[min(52vh,28rem)] overflow-y-auto">
                        {outputs.map((video) => (
                          <div
                            key={video.name}
                            className={`p-3 transition ${selectedUploadVideo === video.name ? 'bg-violet-500/10 border-l-2 border-l-violet-500' : 'hover:bg-zinc-900/10'}`}
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="radio"
                                name="upload-output-video"
                                checked={selectedUploadVideo === video.name}
                                onChange={() => setSelectedUploadVideo(video.name)}
                                className="mt-1 accent-violet-500 cursor-pointer"
                                title="Usar este vídeo no upload"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-white truncate max-w-full">{video.name}</span>
                                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                                    video.renderEngine === 'remotion'
                                      ? 'text-water-300 bg-water-500/10 border-water-400/20'
                                      : 'text-gold-500 bg-gold-500/10 border-gold-500/20'
                                  }`}>
                                    {video.renderEngineLabel || (video.name.toLowerCase().startsWith('remotion_') ? 'Remotion' : 'Padrão')}
                                  </span>
                                </div>
                                <span className="text-[9px] text-gray-500 block">
                                  {getFormatBytes(video.sizeBytes)} · {new Date(video.modifiedAt).toLocaleString('pt-BR')}
                                </span>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const videoPath = activeProject === 'Buracos no Deserto'
                                        ? `/OUTPUT/qanat_persa_video_final/${video.name}`
                                        : `/${activeProject}/OUTPUT/qanat_persa_video_final/${video.name}`;
                                      setPreviewVideoUrl(`/api/projects-media${videoPath}`);
                                    }}
                                    className="bg-gold-500/90 hover:bg-gold-500 text-zinc-950 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    Ver
                                  </button>
                                  <a
                                    href={`/api/projects-media${activeProject === 'Buracos no Deserto' ? `/OUTPUT/qanat_persa_video_final/${video.name}` : `/${activeProject}/OUTPUT/qanat_persa_video_final/${video.name}`}?download=true`}
                                    download
                                    className="bg-zinc-900 border border-zinc-800 text-gray-300 hover:text-white px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => setPendingOutputDelete(video)}
                                    className="bg-red-950/80 border border-red-900/50 text-red-400 hover:text-red-300 px-2 py-1 rounded-md text-[10px] cursor-pointer"
                                    title={`Excluir ${video.name}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedUploadVideo && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('upload')}
                        className="w-full text-[10px] font-bold text-violet-200 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 py-2 rounded-lg transition cursor-pointer"
                      >
                        Ir para Upload com este vídeo →
                      </button>
                    )}
                  </div>

                </aside>
              </div>
            </div>

            </DashminProjectTabLayout>
  );
}
