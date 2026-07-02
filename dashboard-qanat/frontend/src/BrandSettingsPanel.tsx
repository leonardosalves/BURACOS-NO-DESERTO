import React, { useMemo, useState } from 'react';
import { Image, Plus, Trash2, Upload, Youtube } from 'lucide-react';
import { SettingHelpTip } from './SettingHelpTip';

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

function ScopeToggle({
  value,
  onChange,
}: {
  value: 'global' | 'project';
  onChange: (v: 'global' | 'project') => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-800/90 p-0.5 bg-zinc-950/60">
      {(['global', 'project'] as const).map((scope) => (
        <button
          key={scope}
          type="button"
          onClick={() => onChange(scope)}
          className={`px-2 py-0.5 rounded-md text-[9px] font-semibold transition ${
            value === scope
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {scope === 'global' ? 'Global' : 'Projeto'}
        </button>
      ))}
    </div>
  );
}

export function BrandSettingsPanel(props: BrandSettingsPanelProps) {
  const {
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
  } = props;

  const [catalogOpen, setCatalogOpen] = useState(false);

  const activeLogoId = logoCatalogScope === 'project'
    ? (projectSelectedLogoId || selectedLogoId)
    : selectedLogoId;

  const activeChannelId = channelConfigScope === 'project'
    ? (projectSelectedChannelId || selectedChannelId)
    : selectedChannelId;

  const activeLogo = brandLogos.find((l) => l.id === activeLogoId) || brandLogos[0];
  const previewUrl = logoStatus?.currentLogoUrl || activeLogo?.url;

  const activeChannel = useMemo(
    () => youtubeChannels.find((c) => c.id === activeChannelId) || youtubeChannels[0],
    [youtubeChannels, activeChannelId],
  );

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2 min-w-0">
          <Image className="w-3.5 h-3.5 text-gold-500/90 shrink-0" />
          <span className="text-[11px] font-semibold text-zinc-200">Marca</span>
          <span className="text-[9px] text-zinc-600 truncate hidden sm:inline">· logo e canal no encerramento</span>
        </div>
        <SettingHelpTip title="Marca no render" align="end">
          Logo PNG e card do canal YouTube no final do vídeo. Troque aqui antes de compilar.
        </SettingHelpTip>
      </header>

      <div className="grid gap-px bg-zinc-800/50 md:grid-cols-2">
        {/* Logo */}
        <div className="bg-zinc-950/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Logo</span>
            <ScopeToggle value={logoCatalogScope} onChange={setLogoCatalogScope} />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-lg border border-zinc-800 bg-zinc-900/80 flex items-center justify-center shrink-0 overflow-hidden">
              {previewUrl ? (
                <img
                  src={`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}t=${logoTimestamp}`}
                  alt=""
                  className="max-w-full max-h-full object-contain p-1"
                />
              ) : (
                <Image className="w-4 h-4 text-zinc-700" />
              )}
            </div>
            <select
              value={activeLogoId || ''}
              onChange={(e) => e.target.value && onSelectLogo(e.target.value)}
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200"
              disabled={!brandLogos.length}
            >
              {!brandLogos.length ? (
                <option value="">Nenhum logo</option>
              ) : (
                brandLogos.map((logo) => (
                  <option key={logo.id} value={logo.id}>{logo.name}</option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1 text-[9px] font-semibold text-zinc-400 hover:text-gold-300 border border-zinc-800 hover:border-zinc-700 rounded-lg px-2 py-1 cursor-pointer transition">
              <Upload className="w-3 h-3" />
              {uploadingLogo ? 'Enviando…' : 'PNG'}
              <input type="file" accept="image/png" className="hidden" onChange={onLogoUpload} disabled={uploadingLogo} />
            </label>
            {logoCatalogScope === 'project' && (projectSelectedLogoId || logoStatus?.hasProjectLogo) && (
              <button type="button" onClick={onResetLogo} className="text-[9px] text-zinc-500 hover:text-red-400 transition">
                Usar global
              </button>
            )}
          </div>
        </div>

        {/* Canal */}
        <div className="bg-zinc-950/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Canal</span>
            <ScopeToggle
              value={channelConfigScope}
              onChange={(scope) => (scope === 'global' ? onChannelScopeGlobal() : setChannelConfigScope('project'))}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-lg border border-zinc-800 bg-zinc-900/80 flex items-center justify-center shrink-0">
              <Youtube className="w-4 h-4 text-red-500/80" />
            </div>
            <select
              value={activeChannelId || ''}
              onChange={(e) => e.target.value && onSelectChannel(e.target.value)}
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200"
              disabled={!youtubeChannels.length}
            >
              {!youtubeChannels.length ? (
                <option value="">Nenhum canal</option>
              ) : (
                youtubeChannels.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.label}</option>
                ))
              )}
            </select>
          </div>

          {activeChannel && (
            <p className="text-[9px] text-zinc-600 truncate pl-[3.25rem]" title={activeChannel.channelUrl}>
              {activeChannel.channelName || activeChannel.channelUrl}
              {activeChannel.subscriberCount ? ` · ${activeChannel.subscriberCount}` : ''}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCatalogOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-[9px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40 border-t border-zinc-800/60 transition"
      >
        <span>{catalogOpen ? 'Ocultar catálogo' : 'Gerenciar catálogo (logos e canais)'}</span>
        <Plus className={`w-3 h-3 transition ${catalogOpen ? 'rotate-45' : ''}`} />
      </button>

      {catalogOpen && (
        <div className="px-3 pb-3 pt-1 space-y-4 border-t border-zinc-800/40">
          <div className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">Logos</p>
            {brandLogos.length === 0 ? (
              <p className="text-[10px] text-zinc-600">Envie um PNG acima.</p>
            ) : (
              <ul className="space-y-1">
                {brandLogos.map((logo) => (
                  <li key={logo.id} className="flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5">
                    <img
                      src={`${logo.url}${logo.url.includes('?') ? '&' : '?'}t=${logoTimestamp}`}
                      alt=""
                      className="w-7 h-7 object-contain shrink-0"
                    />
                    <input
                      type="text"
                      value={logo.name}
                      onChange={(e) => setBrandLogos((prev) => prev.map((l) => (l.id === logo.id ? { ...l, name: e.target.value } : l)))}
                      onBlur={(e) => onRenameLogo(logo.id, e.target.value)}
                      className="flex-1 min-w-0 bg-transparent border-0 text-[10px] text-zinc-300 focus:outline-none"
                    />
                    <button type="button" onClick={() => onDeleteLogo(logo.id)} className="p-1 text-zinc-600 hover:text-red-400 transition" title="Remover">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newLogoName}
                onChange={(e) => setNewLogoName(e.target.value)}
                placeholder="Nome do logo"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-800/50">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">Canais YouTube</p>
            {youtubeChannels.map((channel) => (
              <div key={channel.id} className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={channel.label}
                    onChange={(e) => onUpdateChannelField(channel.id, 'label', e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-300"
                    placeholder="Rótulo"
                  />
                  <button
                    type="button"
                    onClick={() => onDeleteChannel(channel.id)}
                    disabled={youtubeChannels.length <= 1}
                    className="p-1 text-zinc-600 hover:text-red-400 disabled:opacity-30 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={channel.channelUrl}
                  onChange={(e) => onUpdateChannelField(channel.id, 'channelUrl', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-400"
                  placeholder="URL do canal"
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newChannelLabel}
                onChange={(e) => setNewChannelLabel(e.target.value)}
                placeholder="Novo canal — rótulo"
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 placeholder:text-zinc-600"
              />
              <input
                type="text"
                value={newChannelUrl}
                onChange={(e) => setNewChannelUrl(e.target.value)}
                placeholder="URL @canal"
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 placeholder:text-zinc-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={globalYoutubeChannelName}
                onChange={(e) => setGlobalYoutubeChannelName(e.target.value)}
                placeholder="Nome exibido (opc.)"
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 placeholder:text-zinc-600"
              />
              <input
                type="text"
                value={globalYoutubeSubscriberCount}
                onChange={(e) => setGlobalYoutubeSubscriberCount(e.target.value)}
                placeholder="Inscritos (opc.)"
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 placeholder:text-zinc-600"
              />
            </div>
            <button
              type="button"
              onClick={onAddChannel}
              className="w-full py-1.5 rounded-lg border border-zinc-800 text-[9px] font-semibold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition"
            >
              + Adicionar canal
            </button>
          </div>
        </div>
      )}
    </section>
  );
}