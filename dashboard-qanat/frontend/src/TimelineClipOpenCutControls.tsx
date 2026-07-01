import React from 'react';
import { Volume2, Gauge } from 'lucide-react';
import { SettingHelpTip } from './SettingHelpTip';

type Props = {
  asset: { type?: string; volume?: number; playback_rate?: number };
  onFieldChange: (field: string, value: number) => void;
};

export function TimelineClipOpenCutControls({ asset, onFieldChange }: Props) {
  const isVideo = asset.type === 'video';
  const volume = asset.volume ?? 0;
  const rate = asset.playback_rate ?? 1;

  return (
    <div className="space-y-2 pt-2 border-t border-zinc-900/80">
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] uppercase tracking-wider text-zinc-600 font-bold">Clip (OpenCut)</span>
        <SettingHelpTip title="Controles por clip" align="start">
          Volume e velocidade do B-roll de cada asset. O preview do card acima atualiza em tempo real ao mover os sliders. Valores vão para o render Remotion; a narração principal não é afetada.
        </SettingHelpTip>
      </div>
      <div className="flex items-center gap-2">
        <Volume2 className="w-3 h-3 text-zinc-600 shrink-0" />
        <span className="text-[9px] text-zinc-500 w-10">Vol</span>
        <SettingHelpTip title="Volume do clip" align="start">
          0% = mudo (padrão Lumiera). Acima de 0% o áudio do vídeo B-roll entra no render — útil para clipes com som ambiente ou música embutida.
        </SettingHelpTip>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => onFieldChange('volume', Number(e.target.value) / 100)}
          className="flex-1 accent-emerald-500"
        />
        <span className="text-[9px] text-zinc-500 tabular-nums w-8">{Math.round(volume * 100)}%</span>
      </div>
      {isVideo && (
        <div className="flex items-center gap-2">
          <Gauge className="w-3 h-3 text-zinc-600 shrink-0" />
          <span className="text-[9px] text-zinc-500 w-10">Vel</span>
          <SettingHelpTip title="Velocidade" align="start">
            0,25× a 2× no playback do vídeo (OpenCut v0.3). Acelera ou desacelera o B-roll visual dentro da duração fixa do bloco. Narração e legendas seguem o tempo original.
          </SettingHelpTip>
          <input
            type="range"
            min={25}
            max={200}
            step={5}
            value={Math.round(rate * 100)}
            onChange={(e) => onFieldChange('playback_rate', Number(e.target.value) / 100)}
            className="flex-1 accent-violet-500"
          />
          <span className="text-[9px] text-zinc-500 tabular-nums w-8">{rate.toFixed(2)}×</span>
        </div>
      )}
      {isVideo && rate !== 1 && (
        <p className="text-[8px] text-zinc-600 leading-snug">
          Velocidade altera o B-roll visual; narração principal não é afetada.
        </p>
      )}
    </div>
  );
}