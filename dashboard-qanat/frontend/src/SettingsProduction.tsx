import React, { useEffect, useState } from 'react';
import { Clapperboard, Save } from 'lucide-react';
import { SettingLabel } from './SettingHelpTip';
import { applyProductionPatch, pickProductionConfig, type OverlayIntensity, type ProductionConfig } from './productionConfig';

type Props = {
  config: ProductionConfig & { aspect_ratio?: string };
  projectKey: string;
  globalMusicVolume: number;
  saving?: boolean;
  onSave: (draft: ProductionConfig) => void | Promise<void>;
};

const INTENSITY_OPTIONS: { id: OverlayIntensity; label: string; hint: string }[] = [
  { id: 'light', label: 'Leve', hint: '~35% menos overlays — visual mais limpo.' },
  { id: 'normal', label: 'Normal', hint: 'Orçamento automático pelo formato e duração.' },
  { id: 'rich', label: 'Rico', hint: '~35% mais overlays — mais dados e lower-thirds.' },
];

export function SettingsProduction({
  config,
  projectKey,
  globalMusicVolume,
  saving,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<ProductionConfig>(() => pickProductionConfig(config));

  useEffect(() => {
    setDraft(pickProductionConfig(config));
  }, [projectKey]);

  const intensity = draft.overlay_intensity || 'normal';
  const projectVol = draft.project_music_volume;
  const effectiveVol = projectVol ?? globalMusicVolume;

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-5">
      <div className="border-b border-zinc-900 pb-4">
        <h3 className="font-cinzel text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-gold-500" /> PRODUÇÃO DO PROJETO
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Overlays gerados pela IA e mix de trilha <span className="text-zinc-300">por projeto</span> (salvo em config_qanat.json).
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
          <p className="text-[9px] text-zinc-600 leading-relaxed">
            Listicles Shorts mantêm limite rígido (HUD + poucos counters) independente desta opção.
          </p>
        </div>

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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft((prev) => applyProductionPatch(prev, { project_music_volume: undefined }))}
              className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition ${
                projectVol === undefined
                  ? 'border-gold-500/40 bg-gold-500/10 text-gold-400'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              Usar global ({Math.round(globalMusicVolume * 100)}%)
            </button>
          </div>
          <p className="text-[9px] text-zinc-500">Recomendado: 12–18% para não encobrir a voz.</p>
        </div>
      </div>

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