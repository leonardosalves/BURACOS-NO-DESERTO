import React, { useEffect, useState } from 'react';
import { Palette, Save, Smartphone, Tv } from 'lucide-react';
import { applyVisualPatch, pickVisualConfig } from './visualConfig';
import { SettingHelpTip, SettingLabel } from './SettingHelpTip';
import { SectionHeader } from './SectionHeader';
import { CaptionPreview } from './CaptionPreview';
import {
  LONG_CAPTION_MODES,
  SHORT_CAPTION_MODES,
  resolveLongCaptionMode,
  resolveShortCaptionBgmPulse,
  resolveShortCaptionMode,
  type CaptionModeId,
} from './captionConfig';

export type VisualConfig = {
  design_preset?: string;
  caption_style?: string;
  caption_mode_short?: CaptionModeId;
  caption_mode_long?: CaptionModeId;
  caption_style_short?: 'shorts-viral' | 'documentary';
  caption_style_long?: 'shorts-viral' | 'documentary';
  caption_effect_short?: string;
  caption_effect_long?: string;
  grain_overlay?: boolean;
  vignette?: boolean;
  progress_bar?: boolean;
  chapter_stingers?: boolean;
  source_cards?: boolean;
  overlay_sfx_sync?: boolean;
  social_proof_cards?: boolean;
  geo_map_overlays?: boolean;
  listicle_hud_style?: 'auto' | 'full' | 'compact';
  shorts_zoom_intensity?: 'normal' | 'aggressive' | 'cinematic';
  shorts_hook_flash?: boolean;
  shorts_edge_glow?: boolean;
  shorts_caption_bgm_pulse?: boolean;
  shorts_portal_transition?: boolean;
  shorts_portal_every?: number;
  accent_color?: string;
  secondary_color?: string;
  listicle_hud_theme?: 'ancient' | 'mysterious' | 'nature' | 'classic' | 'tech' | 'industrial';
  long_zoom_intensity?: 'normal' | 'aggressive' | 'cinematic';
};

type Props = {
  config: VisualConfig;
  projectKey: string;
  isShortFormat: boolean;
  isListicle: boolean;
  saving?: boolean;
  onSave: (draft: VisualConfig) => void | Promise<void>;
};

const PRESET_OPTIONS = [
  { id: 'auto', label: 'Automático (por nicho)', hint: 'História, mistério, geografia, dados ou finanças conforme o tema.' },
  { id: 'documentary-history', label: 'Documentário História', hint: 'Grain + vinheta, tons quentes, títulos PT Sans.' },
  { id: 'documentary-mystery', label: 'Documentário Mistério', hint: 'Roxo escuro, grain, atmosfera sombria.' },
  { id: 'documentary-geography', label: 'Explorador Geográfico', hint: 'Azul-água + verde, mapas e timeline.' },
  { id: 'documentary-data', label: 'Jornalismo de Dados', hint: 'Limpo, counters e gráficos.' },
  { id: 'documentary-finance', label: 'Finanças Premium', hint: 'Dourado + verde neon, sem grain.' },
];

const ZOOM_OPTIONS: { id: 'normal' | 'aggressive' | 'cinematic'; label: string; hint: string }[] = [
  { id: 'normal', label: 'Normal', hint: 'Ken Burns 6% → 22%.' },
  { id: 'aggressive', label: 'Agressivo', hint: '10% → 28% — máxima retenção.' },
  { id: 'cinematic', label: 'Cine', hint: '4% → 16% — tom premium.' },
];

const LONG_ZOOM_OPTIONS: { id: 'normal' | 'aggressive' | 'cinematic'; label: string; hint: string }[] = [
  { id: 'normal', label: 'Normal', hint: 'Ken Burns 4% → 14% — documentário clássico.' },
  { id: 'aggressive', label: 'Agressivo', hint: '6% → 18% — mais movimento em 16:9.' },
  { id: 'cinematic', label: 'Cine', hint: '3% → 12% — zoom sutil e premium.' },
];

const HUD_THEME_OPTIONS: { id: string; label: string; hint: string }[] = [
  { id: 'auto', label: 'Automático (preset)', hint: 'Herda do preset visual ou nicho.' },
  { id: 'ancient', label: 'Antigo', hint: 'Pergaminho, sépia, ícones históricos.' },
  { id: 'mysterious', label: 'Mistério', hint: 'Roxo escuro, atmosfera enigmática.' },
  { id: 'nature', label: 'Natureza', hint: 'Verde-água, exploração geográfica.' },
  { id: 'classic', label: 'Clássico', hint: 'Dourado neutro, finanças e geral.' },
  { id: 'tech', label: 'Tech', hint: 'Ciano e roxo, tom futurista.' },
  { id: 'industrial', label: 'Industrial', hint: 'Laranja e aço, impacto militar/engenharia.' },
];

const PORTAL_EVERY_OPTIONS = [
  { value: 3, label: 'A cada 3 cenas' },
  { value: 4, label: 'A cada 4 cenas (padrão)' },
  { value: 5, label: 'A cada 5 cenas' },
];

const LAYER_HELP: Record<string, { title: string; body: string }> = {
  grain_overlay: {
    title: 'Grain (filme)',
    body: 'Camada de granulação sobre as cenas, como filme analógico. Dá textura e tom documentário. Em Shorts costuma ficar ligado por padrão.',
  },
  vignette: {
    title: 'Vinheta escura',
    body: 'Escurece suavemente as bordas do quadro e direciona o olhar para o centro. Reforça clima cinematográfico sem poluir a imagem.',
  },
  progress_bar: {
    title: 'Barra de progresso',
    body: 'Barra fina no topo do vídeo mostrando quanto falta para terminar. Recomendado em vídeos longos para retenção.',
  },
  chapter_stingers: {
    title: 'Chapter stingers',
    body: 'Pulso visual curto (flash + linha) ao entrar em capítulos ou blocos grandes. Marca mudanças de assunto no vídeo.',
  },
  source_cards: {
    title: 'Cards de fonte',
    body: 'Exibe cards com referências, documentos ou fontes quando o roteiro cita algo verificável. Aumenta credibilidade.',
  },
  social_proof_cards: {
    title: 'Cards Reddit / X',
    body: 'Overlays estilo post de rede social (Reddit, X) com comentários ou reações. Bom para gancho e prova social.',
  },
  geo_map_overlays: {
    title: 'Mapas geográficos',
    body: 'Mapas animados destacando países, rotas ou regiões citadas na narração. Ideal para história e geografia.',
  },
  overlay_sfx_sync: {
    title: 'SFX nos overlays',
    body: 'Sons curtos (whoosh, tick, impacto) quando um overlay entra ou sai. Deixa a edição mais dinâmica e sincronizada.',
  },
};

function triBool(value: boolean | undefined, defaultOn: boolean) {
  if (value === undefined) return defaultOn ? 'default-on' : 'default-off';
  return value ? 'on' : 'off';
}

function parseTriBool(raw: string, defaultValue: boolean): boolean | undefined {
  if (raw === 'default') return undefined;
  return raw === 'on';
}

function ToggleCard({
  label,
  description,
  help,
  checked,
  defaultChecked = true,
  onChange,
}: {
  label: string;
  description: string;
  help: string;
  checked: boolean;
  defaultChecked?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="dash-toggle-card">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="dash-checkbox mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-200 font-semibold">{label}</span>
          <SettingHelpTip title={label} align="start">{help}</SettingHelpTip>
        </div>
        <span className="text-[9px] text-[var(--dash-muted)] leading-relaxed block mt-0.5">{description}</span>
        {!checked && defaultChecked && (
          <span className="text-[8px] text-[var(--dash-warning)] mt-1 block">Desligado (padrão: ligado)</span>
        )}
      </div>
    </label>
  );
}

export function VisualSettings({ config, projectKey, isShortFormat, isListicle, saving, onSave }: Props) {
  const [draft, setDraft] = useState<VisualConfig>(() => pickVisualConfig(config));

  useEffect(() => {
    setDraft(pickVisualConfig(config));
  }, [config, projectKey]);

  const patchDraft = (patch: Partial<VisualConfig>) => {
    setDraft((prev) => applyVisualPatch(prev, patch));
  };

  const preset = draft.design_preset || 'auto';
  const shortCaptionMode = resolveShortCaptionMode(draft);
  const longCaptionMode = resolveLongCaptionMode(draft);
  const shortBgmPulse = resolveShortCaptionBgmPulse(shortCaptionMode, draft);
  const zoom = draft.shorts_zoom_intensity || 'normal';
  const longZoom = draft.long_zoom_intensity || 'normal';
  const portalEvery = draft.shorts_portal_every || 4;
  const hudTheme = draft.listicle_hud_theme || 'auto';
  const accent = draft.accent_color || '#FACC15';

  const setShortCaptionMode = (mode: CaptionModeId) => {
    patchDraft({
      caption_mode_short: mode,
      caption_style_short: undefined,
      caption_effect_short: undefined,
      caption_style: undefined,
    });
  };

  const setLongCaptionMode = (mode: CaptionModeId) => {
    patchDraft({
      caption_mode_long: mode,
      caption_style_long: undefined,
      caption_effect_long: undefined,
      caption_style: undefined,
    });
  };

  return (
    <div className="glass-panel p-4 sm:p-6 rounded-3xl space-y-5 min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--dash-border)] pb-4">
        <SectionHeader
          title="LAYOUT & EFEITOS VISUAIS"
          helpId="settings-visual"
          icon={<Palette className="w-4 h-4 text-[var(--dash-primary)]" />}
          subtitle={(
            <>
              Ajustes por projeto. Passe o mouse ou toque no <span className="text-[var(--dash-primary)]">?</span> ao lado de cada item para entender o efeito.
            </>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-b border-[var(--dash-border)]">
        <div className="space-y-2">
          <SettingLabel
            helpTitle="Preset visual"
            help="Define paleta, tipografia e atmosfera do vídeo (grain, vinheta, fontes). Automático escolhe conforme o nicho."
            align="start"
          >
            Preset visual (global)
          </SettingLabel>
          <select
            value={preset}
            onChange={(e) => patchDraft({ design_preset: e.target.value === 'auto' ? undefined : e.target.value })}
            className="dash-select"
          >
            {PRESET_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <p className="text-[9px] text-[var(--dash-muted)]">{PRESET_OPTIONS.find((o) => o.id === preset)?.hint}</p>
        </div>
        <div className="space-y-2">
          <SettingLabel
            helpTitle="Cor de acento"
            help="Cor de destaque em overlays, portal e legendas. Usada no preview ao lado."
            align="start"
          >
            Cor de acento (legendas + overlays)
          </SettingLabel>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={draft.accent_color || '#C5A880'}
              onChange={(e) => patchDraft({ accent_color: e.target.value })}
              className="w-10 h-10 rounded-lg border cursor-pointer shrink-0"
              style={{ borderColor: 'var(--dash-border)', background: 'var(--dash-bg)' }}
            />
            <input
              type="text"
              value={draft.accent_color || ''}
              placeholder="#C5A880 (automático)"
              onChange={(e) => patchDraft({ accent_color: e.target.value.trim() || undefined })}
              className="dash-input flex-1 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="dash-effect-panel space-y-4">
          <p className="text-[10px] text-[var(--dash-primary-light)] font-bold uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5" /> Shorts · 9:16
          </p>
          <div className="space-y-4">
            <div className="space-y-3 min-w-0">
              <div className="space-y-2">
                <SettingLabel helpTitle="Legenda HyperFrames (Short)" help="Estilos do catálogo HeyGen HyperFrames portados para Remotion." align="start">
                  Estilo de legenda
                </SettingLabel>
                <select
                  value={shortCaptionMode}
                  onChange={(e) => setShortCaptionMode(e.target.value as CaptionModeId)}
                  className="dash-select"
                >
                  {SHORT_CAPTION_MODES.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <p className="text-[9px] text-[var(--dash-muted)]">
                  {SHORT_CAPTION_MODES.find((o) => o.id === shortCaptionMode)?.hint}
                </p>
              </div>
              {shortCaptionMode === 'caption-highlight' && (
                <ToggleCard
                  label="Pulso no BGM"
                  description="Palavra ativa pulsa no ritmo da trilha."
                  help="Sincroniza o destaque da legenda com o BPM da música (~120 BPM)."
                  checked={shortBgmPulse}
                  onChange={(v) => patchDraft({ shorts_caption_bgm_pulse: v })}
                />
              )}
            </div>
            <CaptionPreview
              format="short"
              mode={shortCaptionMode}
              bgmPulse={shortBgmPulse}
              accentColor={accent}
              className="w-full max-w-[min(100%,300px)] mx-auto"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--dash-border)]">
            <SettingLabel helpTitle="Zoom Ken Burns (Short)" help="Intensidade do zoom em imagens 9:16." align="start" className="[&_span]:text-zinc-400">
              Zoom Ken Burns
            </SettingLabel>
            <div className="flex flex-wrap gap-2">
              {ZOOM_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => patchDraft({ shorts_zoom_intensity: o.id })}
                  className={`dash-option-btn ${zoom === o.id ? 'dash-option-btn-active' : ''}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ToggleCard
              label="Flash no gancho"
              description="Burst nos primeiros 0,3s."
              help="Flash branco sutil no início do Short."
              checked={draft.shorts_hook_flash !== false}
              onChange={(v) => patchDraft({ shorts_hook_flash: v })}
            />
            <ToggleCard
              label="Glow inferior"
              description="Brilho na safe zone."
              help="Brilho na base, longe dos botões do YouTube."
              checked={draft.shorts_edge_glow === true}
              defaultChecked={false}
              onChange={(v) => patchDraft({ shorts_edge_glow: v })}
            />
            <ToggleCard
              label="Transição portal"
              description="Wipe circular entre cenas."
              help="Transição com anel na cor de acento."
              checked={draft.shorts_portal_transition !== false}
              onChange={(v) => patchDraft({ shorts_portal_transition: v })}
            />
          </div>

          {draft.shorts_portal_transition !== false && (
            <div className="space-y-2">
              <SettingLabel
                helpTitle="Frequência portal"
                help="Define a cada quantas trocas de cena a transição portal aparece."
                align="start"
                className="[&_span]:text-[var(--dash-muted)]"
              >
                Frequência portal
              </SettingLabel>
              <div className="flex flex-wrap gap-2">
                {PORTAL_EVERY_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => patchDraft({ shorts_portal_every: o.value })}
                    className={`dash-option-btn px-3 py-1.5 text-[10px] ${portalEvery === o.value ? 'dash-option-btn-active' : ''}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="dash-effect-panel space-y-4">
          <p className="text-[10px] text-sky-400/90 font-bold uppercase tracking-wider flex items-center gap-2">
            <Tv className="w-3.5 h-3.5" /> Longo · 16:9
          </p>
          <div className="space-y-4">
            <div className="space-y-3 min-w-0">
              <div className="space-y-2">
                <SettingLabel helpTitle="Legenda HyperFrames (Longo)" help="Estilos do catálogo HeyGen HyperFrames portados para Remotion." align="start">
                  Estilo de legenda
                </SettingLabel>
                <select
                  value={longCaptionMode}
                  onChange={(e) => setLongCaptionMode(e.target.value as CaptionModeId)}
                  className="dash-select"
                >
                  {LONG_CAPTION_MODES.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <p className="text-[9px] text-[var(--dash-muted)]">
                  {LONG_CAPTION_MODES.find((o) => o.id === longCaptionMode)?.hint}
                </p>
              </div>
            </div>
            <CaptionPreview
              format="long"
              mode={longCaptionMode}
              accentColor={accent}
              className="w-full"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--dash-border)]">
            <SettingLabel helpTitle="Zoom Ken Burns (Longo)" help="Zoom sutil em B-roll 16:9." align="start" className="[&_span]:text-zinc-400">
              Zoom Ken Burns
            </SettingLabel>
            <div className="flex flex-wrap gap-2">
              {LONG_ZOOM_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => patchDraft({ long_zoom_intensity: o.id })}
                  className={`dash-option-btn ${longZoom === o.id ? 'dash-option-btn-active' : ''}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <SettingLabel
            helpTitle="Camadas & overlays"
            help="Liga ou desliga tipos de elementos visuais que a IA pode inserir no vídeo. Padrão = o sistema decide conforme formato e nicho; Ligado/Desligado força sua escolha."
            align="start"
          >
            Camadas & overlays
          </SettingLabel>

          {[
            { key: 'grain_overlay' as const, label: 'Grain (filme)', defaultOn: isShortFormat },
            { key: 'vignette' as const, label: 'Vinheta escura', defaultOn: true },
            { key: 'progress_bar' as const, label: 'Barra de progresso (longo)', defaultOn: true },
            { key: 'chapter_stingers' as const, label: 'Chapter stingers (longo)', defaultOn: true },
            { key: 'source_cards' as const, label: 'Cards de fonte', defaultOn: true },
            { key: 'social_proof_cards' as const, label: 'Cards Reddit / X', defaultOn: true },
            { key: 'geo_map_overlays' as const, label: 'Mapas geográficos', defaultOn: true },
            { key: 'overlay_sfx_sync' as const, label: 'SFX nos overlays', defaultOn: true },
          ].map((item) => {
            const help = LAYER_HELP[item.key];
            return (
              <div key={item.key} className="flex items-center justify-between gap-3 py-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs text-zinc-300 truncate">{item.label}</span>
                  <SettingHelpTip title={help.title} align="start">{help.body}</SettingHelpTip>
                </div>
                <select
                  value={triBool(draft[item.key], item.defaultOn)}
                  onChange={(e) => patchDraft({ [item.key]: parseTriBool(e.target.value, item.defaultOn) })}
                  className="dash-select w-auto shrink-0 px-3 py-1.5 text-[10px]"
                >
                  <option value="default">Padrão</option>
                  <option value="on">Ligado</option>
                  <option value="off">Desligado</option>
                </select>
              </div>
            );
          })}

          {isListicle && (
            <div className="space-y-4 pt-2 border-t border-[var(--dash-border)]">
              <div className="space-y-2">
                <SettingLabel
                  helpTitle="HUD listicle"
                  help="Badge #N fixa no topo durante cada item do ranking. Completo mostra título + ícone; Compacto usa barra de progresso em listas com mais de 8 itens."
                  align="start"
                >
                  HUD listicle (layout)
                </SettingLabel>
                <select
                  value={draft.listicle_hud_style || 'auto'}
                  onChange={(e) => patchDraft({
                    listicle_hud_style: e.target.value as 'auto' | 'full' | 'compact',
                  })}
                  className="dash-select"
                >
                  <option value="auto">Automático (compacto se &gt;8 itens)</option>
                  <option value="full">Completo</option>
                  <option value="compact">Compacto</option>
                </select>
              </div>

              <div className="space-y-2">
                <SettingLabel
                  helpTitle="Tema visual do HUD"
                  help="Paleta e estilo do badge #N, ícones Lottie e barra de progresso. Automático segue o preset do nicho; os temas fixos forçam uma identidade visual específica."
                  align="start"
                >
                  Tema visual do HUD
                </SettingLabel>
                <select
                  value={hudTheme}
                  onChange={(e) => patchDraft({
                    listicle_hud_theme: e.target.value === 'auto'
                      ? undefined
                      : e.target.value as VisualConfig['listicle_hud_theme'],
                  })}
                  className="dash-select"
                >
                  {HUD_THEME_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <p className="text-[9px] text-[var(--dash-muted)]">{HUD_THEME_OPTIONS.find((o) => o.id === hudTheme)?.hint}</p>
              </div>

              <div className="space-y-2">
                <SettingLabel
                  helpTitle="Cor de clímax (#1)"
                  help="Cor usada no item #1 do ranking (clímax). Destaca o momento mais importante com tom diferente da cor de acento principal."
                  align="start"
                >
                  Cor de clímax (#1)
                </SettingLabel>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={draft.secondary_color || '#D4AF37'}
                    onChange={(e) => patchDraft({ secondary_color: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer shrink-0"
                    style={{ borderColor: 'var(--dash-border)', background: 'var(--dash-bg)' }}
                  />
                  <input
                    type="text"
                    value={draft.secondary_color || ''}
                    placeholder="Automático (preset)"
                    onChange={(e) => patchDraft({ secondary_color: e.target.value.trim() || undefined })}
                    className="dash-input flex-1 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-[var(--dash-border)] pt-4">
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={saving}
          className="dash-btn-primary text-xs px-5 py-2.5 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Visual do Projeto'}
        </button>
      </div>
    </div>
  );
}