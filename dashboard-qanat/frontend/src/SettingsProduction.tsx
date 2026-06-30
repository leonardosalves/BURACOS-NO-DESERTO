import React, { useEffect, useState } from 'react';
import { Clapperboard, Save } from 'lucide-react';
import { SettingLabel } from './SettingHelpTip';
import {
  applyProductionPatch,
  pickProductionConfig,
  type BgmDuckStrength,
  type OverlayIntensity,
  type OverlayMinGap,
  type ProductionConfig,
} from './productionConfig';

type Props = {
  config: ProductionConfig & { aspect_ratio?: string };
  projectKey: string;
  globalMusicVolume: number;
  isShortFormat: boolean;
  saving?: boolean;
  onSave: (draft: ProductionConfig) => void | Promise<void>;
};

const INTENSITY_OPTIONS: { id: OverlayIntensity; label: string; hint: string }[] = [
  { id: 'light', label: 'Leve', hint: '~35% menos overlays — visual mais limpo.' },
  { id: 'normal', label: 'Normal', hint: 'Orçamento automático pelo formato e duração.' },
  { id: 'rich', label: 'Rico', hint: '~35% mais overlays — mais dados e lower-thirds.' },
];

const GAP_OPTIONS: { id: OverlayMinGap; label: string; hint: string }[] = [
  { id: 'tight', label: 'Apertado', hint: 'Menos espaço limpo entre overlays — ritmo mais denso.' },
  { id: 'normal', label: 'Normal', hint: 'Intervalo padrão do formato (18s longos / 5s Shorts).' },
  { id: 'relaxed', label: 'Relaxado', hint: 'Mais respiro entre camadas — edição mais calma.' },
];

const DUCK_OPTIONS: { id: BgmDuckStrength; label: string; hint: string }[] = [
  { id: 'light', label: 'Leve', hint: 'Trilha mais presente durante a narração.' },
  { id: 'normal', label: 'Normal', hint: 'Mix equilibrado voz + BGM (padrão).' },
  { id: 'strong', label: 'Forte', hint: 'Trilha abaixa mais quando você fala — voz em destaque.' },
];

const MAX_DURATION_OPTIONS = [
  { value: 0, label: 'Automático' },
  { value: 4, label: '4s (rápido)' },
  { value: 5.5, label: '5,5s' },
  { value: 7, label: '7s (padrão longo)' },
  { value: 9, label: '9s (lento)' },
];

export function SettingsProduction({
  config,
  projectKey,
  globalMusicVolume,
  isShortFormat,
  saving,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<ProductionConfig>(() => pickProductionConfig(config));

  useEffect(() => {
    setDraft(pickProductionConfig(config));
  }, [projectKey]);

  const intensity = draft.overlay_intensity || 'normal';
  const gap = draft.overlay_min_gap || 'normal';
  const duck = draft.bgm_duck_strength || 'normal';
  const projectVol = draft.project_music_volume;
  const effectiveVol = projectVol ?? globalMusicVolume;
  const maxDur = draft.overlay_max_duration;
  const sfxVol = draft.overlay_sfx_volume ?? 1;

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-5">
      <div className="border-b border-zinc-900 pb-4">
        <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-gold-500" /> PRODUÇÃO DO PROJETO
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Mix de áudio, ritmo de overlays e orçamento da IA — salvo em <span className="text-zinc-300">config_qanat.json</span> por projeto.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <SettingLabel
            helpTitle="Densidade de overlays"
            help="Controla quantos lower-thirds, counters, gráficos e cards a IA pode gerar. Leve reduz poluição visual; Rico aumenta camadas informativas em vídeos longos."
            align="start"
          >
            Densidade de overlays (IA)
          </SettingLabel>
          <div className="flex flex-wrap gap-2">
            {INTENSITY_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setDraft((prev) => applyProductionPatch(prev, {
                  overlay_intensity: o.id === 'normal' ? undefined : o.id,
                }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  intensity === o.id
                    ? 'border-gold-500/60 bg-gold-500/15 text-gold-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-zinc-500">{INTENSITY_OPTIONS.find((o) => o.id === intensity)?.hint}</p>

          <div className="space-y-2 pt-2 border-t border-zinc-900">
            <SettingLabel
              helpTitle="Intervalo entre overlays"
              help="Tempo mínimo de tela limpa entre um overlay e o próximo. Apertado deixa a edição mais dinâmica; Relaxado dá mais respiro visual."
              align="start"
            >
              Intervalo entre overlays
            </SettingLabel>
            <div className="flex flex-wrap gap-2">
              {GAP_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setDraft((prev) => applyProductionPatch(prev, {
                    overlay_min_gap: o.id === 'normal' ? undefined : o.id,
                  }))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    gap === o.id
                      ? 'border-gold-500/60 bg-gold-500/15 text-gold-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-zinc-500">{GAP_OPTIONS.find((o) => o.id === gap)?.hint}</p>
          </div>

          <div className="space-y-2">
            <SettingLabel
              helpTitle="Duração máxima de overlay"
              help="Limite de quanto tempo cada lower-third, counter ou gráfico fica na tela. Automático segue o bloco; valores menores = edição mais rápida."
              align="start"
            >
              Duração máxima por overlay
            </SettingLabel>
            <select
              value={maxDur ?? 0}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setDraft((prev) => applyProductionPatch(prev, {
                  overlay_max_duration: v > 0 ? v : undefined,
                }));
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white"
            >
              {MAX_DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center gap-2">
              <SettingLabel
                helpTitle="Volume BGM do projeto"
                help={`Substitui o volume global (${Math.round(globalMusicVolume * 100)}%) só neste projeto. Útil quando a narração é mais baixa ou a trilha precisa de mais presença.`}
                align="start"
              >
                Volume da trilha (este projeto)
              </SettingLabel>
              <span className="text-xs text-white font-mono font-bold shrink-0">
                {(effectiveVol * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.01}
              max={0.45}
              step={0.01}
              value={effectiveVol}
              onChange={(e) => setDraft((prev) => applyProductionPatch(prev, {
                project_music_volume: parseFloat(e.target.value),
              }))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gold-500"
            />
            <button
              type="button"
              onClick={() => setDraft((prev) => applyProductionPatch(prev, { project_music_volume: undefined }))}
              className={`w-full py-2 rounded-xl text-[10px] font-bold border transition ${
                projectVol === undefined
                  ? 'border-gold-500/40 bg-gold-500/10 text-gold-400'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              Usar global ({Math.round(globalMusicVolume * 100)}%)
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-900">
            <SettingLabel
              helpTitle="Ducking da trilha"
              help="Quanto a música abaixa automaticamente quando a narração está ativa. Forte prioriza a voz; Leve mantém a trilha mais audível."
              align="start"
            >
              Ducking da trilha (voz vs BGM)
            </SettingLabel>
            <div className="flex flex-wrap gap-2">
              {DUCK_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setDraft((prev) => applyProductionPatch(prev, {
                    bgm_duck_strength: o.id === 'normal' ? undefined : o.id,
                  }))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    duck === o.id
                      ? 'border-gold-500/60 bg-gold-500/15 text-gold-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-zinc-500">{DUCK_OPTIONS.find((o) => o.id === duck)?.hint}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <SettingLabel
                helpTitle="Volume SFX nos overlays"
                help="Multiplicador dos sons curtos (whoosh, tick, impacto) quando overlays entram. 100% é o padrão; reduza se os SFX estiverem altos demais."
                align="start"
              >
                Volume SFX dos overlays
              </SettingLabel>
              <span className="text-xs text-white font-mono font-bold shrink-0">
                {(sfxVol * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.25}
              max={1.5}
              step={0.05}
              value={sfxVol}
              onChange={(e) => setDraft((prev) => applyProductionPatch(prev, {
                overlay_sfx_volume: parseFloat(e.target.value) === 1 ? undefined : parseFloat(e.target.value),
              }))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gold-500"
            />
            <button
              type="button"
              onClick={() => setDraft((prev) => applyProductionPatch(prev, { overlay_sfx_volume: undefined }))}
              className={`w-full py-2 rounded-xl text-[10px] font-bold border transition ${
                draft.overlay_sfx_volume === undefined
                  ? 'border-gold-500/40 bg-gold-500/10 text-gold-400'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              Usar padrão (100%)
            </button>
          </div>
        </div>
      </div>

      <p className="text-[9px] text-zinc-600 leading-relaxed border-t border-zinc-900 pt-3">
        {isShortFormat
          ? 'Shorts: listicles mantêm limite rígido de overlays independente da densidade.'
          : 'Vídeos longos: densidade, intervalo e duração afetam o planejamento da IA e a validação no render.'}
      </p>

      <div className="flex justify-end border-t border-zinc-900 pt-4">
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={saving}
          className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Produção do Projeto'}
        </button>
      </div>
    </div>
  );
}