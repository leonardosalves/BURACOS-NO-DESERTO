import React from 'react';
import { Check, Image, Trash2, Upload, Video } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { SettingHelpTip, SettingLabel } from './SettingHelpTip';

export type BrandLogoItem = {
  id: string;
  name: string;
  file: string;
  url: string;
  exists?: boolean;
};

export type YoutubeChannelItem = {
  id: string;
  label: string;
  channelUrl: string;
  channelName?: string;
  subscriberCount?: string;
};

export type BrandSettingsPanelProps = {
  variant?: 'render' | 'settings';
  logoCatalogScope: 'global' | 'project';
  setLogoCatalogScope: (scope: 'global' | 'project') => void;
  logoStatus: {
    hasProjectLogo?: boolean;
    currentLogoUrl?: string | null;
  } | null;
  logoTimestamp: number;
  brandLogos: BrandLogoItem[];
  setBrandLogos: React.Dispatch<React.SetStateAction<BrandLogoItem[]>>;
  selectedLogoId: string | null;
  projectSelectedLogoId: string | null;
  newLogoName: string;
  setNewLogoName: (v: string) => void;
  uploadingLogo: boolean;
  onResetLogo: () => void;
  onSelectLogo: (id: string) => void;
  onRenameLogo: (id: string, name: string) => void;
  onDeleteLogo: (id: string) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  channelConfigScope: 'global' | 'project';
  setChannelConfigScope: (scope: 'global' | 'project') => void;
  onChannelScopeGlobal: () => void;
  youtubeChannels: YoutubeChannelItem[];
  selectedChannelId: string | null;
  projectSelectedChannelId: string | null;
  newChannelLabel: string;
  setNewChannelLabel: (v: string) => void;
  newChannelUrl: string;
  setNewChannelUrl: (v: string) => void;
  globalYoutubeChannelName: string;
  setGlobalYoutubeChannelName: (v: string) => void;
  globalYoutubeSubscriberCount: string;
  setGlobalYoutubeSubscriberCount: (v: string) => void;
  onSelectChannel: (id: string) => void;
  onUpdateChannelField: (id: string, field: keyof YoutubeChannelItem, value: string) => void;
  onDeleteChannel: (id: string) => void;
  onAddChannel: () => void;
};

export function BrandSettingsPanel({
  variant = 'settings',
  logoCatalogScope,
  setLogoCatalogScope,
  logoStatus,
  logoTimestamp,
  brandLogos,
  setBrandLogos,
  selectedLogoId,
  projectSelectedLogoId,
  newLogoName,
  setNewLogoName,
  uploadingLogo,
  onResetLogo,
  onSelectLogo,
  onRenameLogo,
  onDeleteLogo,
  onLogoUpload,
  channelConfigScope,
  setChannelConfigScope,
  onChannelScopeGlobal,
  youtubeChannels,
  selectedChannelId,
  projectSelectedChannelId,
  newChannelLabel,
  setNewChannelLabel,
  newChannelUrl,
  setNewChannelUrl,
  globalYoutubeChannelName,
  setGlobalYoutubeChannelName,
  globalYoutubeSubscriberCount,
  setGlobalYoutubeSubscriberCount,
  onSelectChannel,
  onUpdateChannelField,
  onDeleteChannel,
  onAddChannel,
}: BrandSettingsPanelProps) {
  const isRender = variant === 'render';
  const panelClass = isRender
    ? 'glass-panel p-4 md:p-5 rounded-2xl space-y-4 border border-[var(--dash-primary)]/20'
    : 'glass-panel p-6 rounded-3xl space-y-5';

  return (
    <div className={panelClass}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRender ? 'pb-3 border-b border-zinc-800/80' : 'border-b border-[var(--dash-border)] pb-4'}`}>
        <SectionHeader
          title={isRender ? 'MARCA — ANTES DO RENDER' : 'LOGOTIPO DO FINAL DO VÍDEO'}
          helpId="settings-marca"
          icon={<Image className={`w-4 h-4 ${isRender ? 'text-gold-400' : 'text-[var(--dash-primary)]'}`} />}
          subtitle={
            isRender
              ? 'Troque logo e canal do encerramento aqui — sem sair da aba Render.'
              : <>Logos e canal do encerramento. Use o <span className="text-[var(--dash-primary)]">?</span> em cada seção para entender o escopo global vs. projeto.</>
          }
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Escopo do logo</span>
          <SettingHelpTip title="Escopo" align="start">
            Global aplica o logo escolhido em todos os projetos. Personalizado permite um logo diferente só neste projeto.
          </SettingHelpTip>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setLogoCatalogScope('global')} className={`dash-scope-tab ${logoCatalogScope === 'global' ? 'dash-scope-tab-active' : ''}`}>Padrão Global</button>
          <button type="button" onClick={() => setLogoCatalogScope('project')} className={`dash-scope-tab ${logoCatalogScope === 'project' ? 'dash-scope-tab-active' : ''}`}>Personalizado do Projeto</button>
        </div>
      </div>

      <div className="dash-logo-preview">
        {(() => {
          const activeId = logoCatalogScope === 'project' ? (projectSelectedLogoId || selectedLogoId) : selectedLogoId;
          const activeLogo = brandLogos.find((l) => l.id === activeId) || brandLogos[0];
          const previewUrl = logoStatus?.currentLogoUrl || activeLogo?.url;
          return previewUrl ? (
            <img src={`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}t=${logoTimestamp}`} alt="Logo ativo" className="max-h-24 max-w-full object-contain drop-shadow-lg" />
          ) : (
            <div className="text-zinc-600 text-xs font-mono">Nenhum logo no catálogo</div>
          );
        })()}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-center text-[9px] text-[var(--dash-muted)] bg-[var(--dash-card)]/90 px-2.5 py-1 rounded-lg">
          <span>Escopo: {logoCatalogScope === 'project' ? 'Personalizado do Projeto' : 'Padrão Global'}</span>
          {logoCatalogScope === 'project' && (projectSelectedLogoId || logoStatus?.hasProjectLogo) && (
            <button type="button" onClick={onResetLogo} className="text-red-400 hover:text-red-300 font-semibold cursor-pointer transition">Usar logo global</button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <SettingLabel helpTitle="Catálogo de logos" help="Biblioteca de PNGs (fundo transparente) exibidos no final do vídeo. Escolha qual está ativo e renomeie para organizar marcas diferentes." align="start" className="mb-0">Catálogo de Logos</SettingLabel>
        {brandLogos.length === 0 ? (
          <p className="text-xs text-zinc-500">Nenhum logo cadastrado. Envie o primeiro abaixo.</p>
        ) : (
          <div className={`grid gap-3 ${isRender ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
            {brandLogos.map((logo) => {
              const activeId = logoCatalogScope === 'project' ? (projectSelectedLogoId || selectedLogoId) : selectedLogoId;
              const isActive = logo.id === activeId;
              return (
                <div key={logo.id} className={`dash-logo-card ${isActive ? 'dash-logo-card-active' : ''}`}>
                  <div className="h-20 flex items-center justify-center mb-2 rounded-xl overflow-hidden" style={{ background: 'var(--dash-bg)' }}>
                    <img src={`${logo.url}${logo.url.includes('?') ? '&' : '?'}t=${logoTimestamp}`} alt={logo.name} className="max-h-16 max-w-full object-contain" />
                  </div>
                  <input
                    type="text"
                    value={logo.name}
                    onChange={(e) => setBrandLogos((prev) => prev.map((l) => (l.id === logo.id ? { ...l, name: e.target.value } : l)))}
                    onBlur={(e) => onRenameLogo(logo.id, e.target.value)}
                    className="dash-input w-full px-2 py-1 text-[10px] mb-2"
                    title="Renomear logo"
                  />
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => onSelectLogo(logo.id)} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition border ${isActive ? 'dash-scope-tab-active' : 'dash-option-btn'}`}>
                      {isActive ? <span className="flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Ativo</span> : 'Usar'}
                    </button>
                    <button type="button" onClick={() => onDeleteLogo(logo.id)} className="p-1.5 rounded-lg dash-btn-ghost text-[var(--dash-muted)] hover:text-red-400 hover:border-red-500/30 transition" title="Remover">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-[var(--dash-border)] pt-5">
        <SettingLabel helpTitle="Novo logo" help="Envie um PNG com fundo transparente. O nome ajuda a identificar a marca no catálogo — ex.: canal principal, parceiro, versão branca." align="start" className="mb-0">Adicionar Logo ao Catálogo</SettingLabel>
        <input type="text" value={newLogoName} onChange={(e) => setNewLogoName(e.target.value)} placeholder="Nome do logo" className="dash-input placeholder:text-[var(--dash-muted)]" />
        <label className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition min-h-[96px] hover:bg-[var(--dash-card-hover)]" style={{ borderColor: 'var(--dash-border)', background: 'var(--dash-bg)' }}>
          <Upload className="w-6 h-6 text-zinc-500 mb-2" />
          <span className="text-xs text-gray-400 font-semibold">{uploadingLogo ? 'Enviando imagem...' : 'Escolher imagem PNG'}</span>
          <span className="text-[9px] text-zinc-500 mt-1">Recomendado: fundo transparente</span>
          <input type="file" accept="image/png" className="hidden" onChange={onLogoUpload} disabled={uploadingLogo} />
        </label>
      </div>

      <div className="border-t border-zinc-900 pt-5 space-y-4">
        <div>
          <h4 className="font-sans text-xs font-bold text-white tracking-wide flex items-center gap-2">
            <Video className="w-4 h-4 text-red-500" /> CANAL DO YOUTUBE (BOTÃO INSCREVER-SE)
            <SettingHelpTip title="Botão Inscrever-se" align="start">
              Card de encerramento com link do canal, nome e contagem de inscritos. Aparece no outro do vídeo junto com o logo.
            </SettingHelpTip>
          </h4>
          <p className="text-xs text-gray-400 mt-1">
            Cadastre vários canais e selecione qual usar no encerramento. Escopo global ou por projeto.
          </p>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onChannelScopeGlobal} className={`dash-scope-tab ${channelConfigScope === 'global' ? 'dash-scope-tab-active' : ''}`}>Padrão Global</button>
          <button type="button" onClick={() => setChannelConfigScope('project')} className={`dash-scope-tab ${channelConfigScope === 'project' ? 'dash-scope-tab-active' : ''}`}>Personalizado do Projeto</button>
        </div>

        <div className="space-y-3">
          <SettingLabel helpTitle="Catálogo de canais" help="Cadastre vários canais YouTube e escolha qual usar no encerramento. Útil se você gerencia mais de uma marca no mesmo Lumiera." align="start" className="mb-0">Catálogo de Canais</SettingLabel>
          {youtubeChannels.length === 0 ? (
            <p className="text-xs text-zinc-500">Nenhum canal cadastrado. Adicione o primeiro abaixo.</p>
          ) : (
            <div className="space-y-2">
              {youtubeChannels.map((channel) => {
                const activeId = channelConfigScope === 'project' ? (projectSelectedChannelId || selectedChannelId) : selectedChannelId;
                const isActive = channel.id === activeId;
                return (
                  <div key={channel.id} className={`dash-settings-card space-y-3 ${isActive ? 'border-red-500/40' : ''}`} style={isActive ? { background: 'rgba(232, 101, 120, 0.05)' } : undefined}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <input type="text" value={channel.label} onChange={(e) => onUpdateChannelField(channel.id, 'label', e.target.value)} className="dash-input px-2.5 py-1.5 text-xs" placeholder="Rótulo" />
                        <input type="text" value={channel.channelUrl} onChange={(e) => onUpdateChannelField(channel.id, 'channelUrl', e.target.value)} className="dash-input px-2.5 py-1.5 text-xs" placeholder="URL do canal" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input type="text" value={channel.channelName || ''} onChange={(e) => onUpdateChannelField(channel.id, 'channelName', e.target.value)} className="dash-input px-2.5 py-1.5 text-xs" placeholder="Nome (opcional)" />
                          <input type="text" value={channel.subscriberCount || ''} onChange={(e) => onUpdateChannelField(channel.id, 'subscriberCount', e.target.value)} className="dash-input px-2.5 py-1.5 text-xs" placeholder="Inscritos (opcional)" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button type="button" onClick={() => onSelectChannel(channel.id)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition ${isActive ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-red-500/30 hover:text-red-300'}`}>
                          {isActive ? 'Ativo' : 'Usar'}
                        </button>
                        <button type="button" onClick={() => onDeleteChannel(channel.id)} disabled={youtubeChannels.length <= 1} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition disabled:opacity-30 disabled:cursor-not-allowed" title="Remover">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-zinc-900 pt-4">
          <SettingLabel helpTitle="Adicionar canal" help="Cadastre um novo canal YouTube no catálogo global. Depois selecione qual canal aparece no card de inscrição do encerramento — global ou personalizado por projeto." align="start" className="mb-0 [&_span]:text-gold-500 [&_span]:uppercase [&_span]:tracking-wider">Adicionar Canal ao Catálogo</SettingLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" value={newChannelLabel} onChange={(e) => setNewChannelLabel(e.target.value)} placeholder="Rótulo do canal" className="dash-input placeholder:text-[var(--dash-muted)]" />
            <input type="text" value={newChannelUrl} onChange={(e) => setNewChannelUrl(e.target.value)} placeholder="https://www.youtube.com/@seucanal" className="dash-input placeholder:text-[var(--dash-muted)]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" value={globalYoutubeChannelName} onChange={(e) => setGlobalYoutubeChannelName(e.target.value)} placeholder="Nome do canal (opcional)" className="dash-input placeholder:text-[var(--dash-muted)]" />
            <input type="text" value={globalYoutubeSubscriberCount} onChange={(e) => setGlobalYoutubeSubscriberCount(e.target.value)} placeholder="Inscritos (opcional)" className="dash-input placeholder:text-[var(--dash-muted)]" />
          </div>
          <button type="button" onClick={onAddChannel} className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider transition">Adicionar Canal</button>
        </div>
      </div>
    </div>
  );
}