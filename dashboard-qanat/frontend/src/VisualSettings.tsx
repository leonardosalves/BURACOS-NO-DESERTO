import React from 'react';
import { Palette, Save, Sparkles } from 'lucide-react';

export type VisualConfig = {
  design_preset?: string;
  caption_style?: string;
  grain_overlay?: boolean;
  vignette?: boolean;
  progress_bar?: boolean;
  chapter_stingers?: boolean;
  source_cards?: boolean;
  overlay_sfx_sync?: boolean;
  listicle_hud_style?: 'auto' | 'full' | 'compact';
  shorts_zoom_intensity?: 'normal' | 'aggressive' | 'cinematic';
  shorts_hook_flash?: boolean;
  shorts_edge_glow?: boolean;
  accent_color?: string;
};

type Props = {
  config: VisualConfig;
  isShortFormat: boolean;
  isListicle: boolean;
  saving?: boolean;
  onChange: (patch: Partial<VisualConfig>) => void;
  onSave: () => void;
};

const PRESET_OPTIONS = [
  { id: 'auto', label: 'Automático (por nicho)', hint: 'História, mistério, geografia, dados ou finanças conforme o tema.' },
  { id: 'documentary-history', label: 'Documentário História', hint: 'Grain + vinheta, tons quentes, Cinzel.' },
  { id: 'documentary-mystery', label: 'Documentário Mistério', hint: 'Roxo escuro, grain, atmosfera sombria.' },
  { id: 'documentary-geography', label: 'Explorador Geográfico', hint: 'Azul-água + verde, mapas e timeline.' },
  { id: 'documentary-data', label: 'Jornalismo de Dados', hint: 'Limpo, counters e gráficos.' },
  { id: 'documentary-finance', label: 'Finanças Premium', hint: 'Dourado + verde neon, sem grain.' },
];

const CAPTION_OPTIONS = [
  { id: 'auto', label: 'Automático', hint: 'Shorts → viral palavra-a-palavra; Longos → documentário.' },
  { id: 'shorts-viral', label: 'Shorts Viral', hint: '1 palavra por vez, destaque amarelo.' },
  { id: 'documentary', label: 'Documentário', hint: '2 palavras, estilo longo.' },
];

const ZOOM_OPTIONS = [
  { id: 'normal', label: 'Normal (padrão)', hint: 'Zoom Ken Burns 6% → 22%.' },
  { id: 'aggressive', label: 'Agressivo', hint: 'Mais movimento — ideal para retenção em Shorts.' },
  { id: 'cinematic', label: 'Cinematográfico', hint: 'Zoom suave — tom mais premium.' },
];

function triBool(value: boolean | undefined, defaultOn: boolean) {
  if (value === undefined) return defaultOn ? 'default-on' : 'default-off';
  return value ? 'on' : 'off';
}

function parseTriBool(raw: string, defaultValue: boolean): boolean | undefined {
  if (raw === 'default') return undefined;
  return raw === 'on';
}

export function VisualSettings({ config, isShortFormat, isListicle, saving, onChange, onSave }: Props) {
  const preset = config.design_preset || 'auto';
  const caption = config.caption_style || 'auto';
  const zoom = config.shorts_zoom_intensity || 'normal';

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Palette className="w-4 h-4 text-gold-500" /> LAYOUT & EFEITOS VISUAIS
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Ajustes por projeto. Valores em <span className="text-zinc-300">Automático</span> seguem o preset do nicho.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Preset visual</label>
            <select
              value={preset}
              onChange={(e) => onChange({ design_preset: e.target.value === 'auto' ? undefined : e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-3 text-xs text-white"
            >
              {PRESET_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <p className="text-[9px] text-zinc-500">{PRESET_OPTIONS.find((o) => o.id === preset)?.hint}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Estilo de legenda</label>
            <select
              value={caption}
              onChange={(e) => onChange({ caption_style: e.target.value === 'auto' ? undefined : e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-3 text-xs text-white"
            >
              {CAPTION_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <p className="text-[9px] text-zinc-500">{CAPTION_OPTIONS.find((o) => o.id === caption)?.hint}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Cor de acento</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={config.accent_color || '#C5A880'}
                onChange={(e) => onChange({ accent_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-zinc-800 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={config.accent_color || ''}
                placeholder="#C5A880 (automático)"
                onChange={(e) => onChange({ accent_color: e.target.value || undefined })}
                className="flex-1 bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-2.5 text-xs text-white font-mono"
              />
            </div>
            <p className="text-[9px] text-zinc-500">Overlays, barra de progresso e HUD listicle.</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Camadas & overlays</p>

          {[
            { key: 'grain_overlay' as const, label: 'Grain (filme)', defaultOn: isShortFormat },
            { key: 'vignette' as const, label: 'Vinheta escura', defaultOn: true },
            { key: 'progress_bar' as const, label: 'Barra de progresso (longos)', defaultOn: true, longOnly: true },
            { key: 'chapter_stingers' as const, label: 'Chapter stingers (longos)', defaultOn: true, longOnly: true },
            { key: 'source_cards' as const, label: 'Cards de fonte', defaultOn: true },
            { key: 'overlay_sfx_sync' as const, label: 'SFX nos overlays', defaultOn: true },
          ].filter((item) => !item.longOnly || !isShortFormat).map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-300">{item.label}</span>
              <select
                value={triBool(config[item.key], item.defaultOn)}
                onChange={(e) => onChange({ [item.key]: parseTriBool(e.target.value, item.defaultOn) })}
                className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-[10px] text-white"
              >
                <option value="default">Padrão</option>
                <option value="on">Ligado</option>
                <option value="off">Desligado</option>
              </select>
            </div>
          ))}

          {isListicle && (
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <label className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">HUD listicle</label>
              <select
                value={config.listicle_hud_style || 'auto'}
                onChange={(e) => onChange({
                  listicle_hud_style: e.target.value as 'auto' | 'full' | 'compact',
                })}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-3 text-xs text-white"
              >
                <option value="auto">Automático (compacto se &gt;8 itens)</option>
                <option value="full">Completo — título + hook visual</option>
                <option value="compact">Compacto — só badge #N</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {isShortFormat && (
        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4 space-y-4">
          <p className="text-[10px] text-violet-300 font-bold uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Efeitos Shorts / Reels
          </p>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Intensidade do zoom</label>
            <select
              value={zoom}
              onChange={(e) => onChange({
                shorts_zoom_intensity: e.target.value as 'normal' | 'aggressive' | 'cinematic',
              })}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-3 text-xs text-white"
            >
              {ZOOM_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <p className="text-[9px] text-zinc-500">{ZOOM_OPTIONS.find((o) => o.id === zoom)?.hint}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-xs text-zinc-300">Flash no gancho (0–0,3s)</span>
              <input
                type="checkbox"
                checked={config.shorts_hook_flash !== false}
                onChange={(e) => onChange({ shorts_hook_flash: e.target.checked })}
                className="accent-violet-500 w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-xs text-zinc-300">Glow inferior (safe zone)</span>
              <input
                type="checkbox"
                checked={config.shorts_edge_glow === true}
                onChange={(e) => onChange({ shorts_edge_glow: e.target.checked })}
                className="accent-violet-500 w-4 h-4"
              />
            </label>
          </div>
          <p className="text-[9px] text-zinc-500">
            Padrão: flash ligado, glow desligado. Vinheta e grain já vêm ativos em Shorts.
          </p>
        </div>
      )}

      <div className="flex justify-end border-t border-zinc-900 pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Visual do Projeto'}
        </button>
      </div>
    </div>
  );
}