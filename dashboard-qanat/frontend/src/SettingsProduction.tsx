import React, { useEffect, useMemo, useState } from "react";
import { Clapperboard, Save } from "lucide-react";
import { SettingLabel } from "./SettingHelpTip";
import { SectionHeader } from "./SectionHeader";
import {
  applyProductionPatch,
  pickProductionConfig,
  pickProductionConfigFromDisk,
  type BgmDuckStrength,
  type OverlayIntensity,
  type OverlayMinGap,
  type ProductionConfig,
} from "./productionConfig";

type Props = {
  config: ProductionConfig & { aspect_ratio?: string };
  projectKey: string;
  globalMusicVolume: number;
  isShortFormat: boolean;
  saving?: boolean;
  onSave: (draft: ProductionConfig) => void | Promise<void>;
};

const INTENSITY_OPTIONS: {
  id: OverlayIntensity;
  label: string;
  hint: string;
}[] = [
  {
    id: "light",
    label: "Leve",
    hint: "~35% menos overlays — visual mais limpo.",
  },
  {
    id: "normal",
    label: "Normal",
    hint: "Orçamento automático pelo formato e duração.",
  },
  {
    id: "rich",
    label: "Rico",
    hint: "~35% mais overlays — mais dados e lower-thirds.",
  },
];

const GAP_OPTIONS: { id: OverlayMinGap; label: string; hint: string }[] = [
  {
    id: "tight",
    label: "Apertado",
    hint: "Menos espaço limpo entre overlays — ritmo mais denso.",
  },
  {
    id: "normal",
    label: "Normal",
    hint: "Intervalo padrão do formato (18s longos / 5s Shorts).",
  },
  {
    id: "relaxed",
    label: "Relaxado",
    hint: "Mais respiro entre camadas — edição mais calma.",
  },
];

const DUCK_OPTIONS: { id: BgmDuckStrength; label: string; hint: string }[] = [
  {
    id: "light",
    label: "Leve",
    hint: "Trilha mais presente durante a narração.",
  },
  {
    id: "normal",
    label: "Normal",
    hint: "Mix equilibrado voz + BGM (padrão).",
  },
  {
    id: "strong",
    label: "Forte",
    hint: "Trilha abaixa mais quando você fala — voz em destaque.",
  },
];

const MAX_DURATION_OPTIONS = [
  { value: 0, label: "Automático" },
  { value: 4, label: "4s (rápido)" },
  { value: 5.5, label: "5,5s" },
  { value: 7, label: "7s (padrão longo)" },
  { value: 9, label: "9s (lento)" },
];

export function SettingsProduction({
  config,
  projectKey,
  globalMusicVolume,
  isShortFormat,
  saving,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<ProductionConfig>(() =>
    pickProductionConfig(config)
  );
  const productionFingerprint = useMemo(
    () => JSON.stringify(pickProductionConfigFromDisk(config)),
    [config]
  );

  useEffect(() => {
    setDraft(pickProductionConfig(config));
  }, [projectKey, productionFingerprint]);

  const intensity = draft.overlay_intensity || "normal";
  const gap = draft.overlay_min_gap || "normal";
  const duck = draft.bgm_duck_strength || "normal";
  const projectVol = draft.project_music_volume;
  const effectiveVol = projectVol ?? globalMusicVolume;
  const maxDur = draft.overlay_max_duration;
  const sfxVol = draft.overlay_sfx_volume ?? 1;
  const sfxEnabled = draft.sfx_enabled !== false;

  return (
    <div className="glass-panel p-4 sm:p-6 rounded-3xl space-y-5 min-w-0">
      <div className="border-b border-[var(--dash-border)] pb-4">
        <SectionHeader
          title="PRODUÇÃO DO ESTÚDIO"
          helpId="settings-producao"
          icon={<Clapperboard className="w-4 h-4 text-[var(--dash-primary)]" />}
          subtitle={
            <>
              Mix de áudio, ritmo de overlays e orçamento da IA — configuração
              global aplicada a todos os projetos.
            </>
          }
        />
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
                onClick={() =>
                  setDraft((prev) =>
                    applyProductionPatch(prev, {
                      overlay_intensity: o.id === "normal" ? undefined : o.id,
                    })
                  )
                }
                className={`dash-option-btn ${intensity === o.id ? "dash-option-btn-active" : ""}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-[var(--dash-muted)]">
            {INTENSITY_OPTIONS.find((o) => o.id === intensity)?.hint}
          </p>

          <div className="space-y-2 pt-2 border-t border-[var(--dash-border)]">
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
                  onClick={() =>
                    setDraft((prev) =>
                      applyProductionPatch(prev, {
                        overlay_min_gap: o.id === "normal" ? undefined : o.id,
                      })
                    )
                  }
                  className={`dash-option-btn ${gap === o.id ? "dash-option-btn-active" : ""}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-[var(--dash-muted)]">
              {GAP_OPTIONS.find((o) => o.id === gap)?.hint}
            </p>
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
                setDraft((prev) =>
                  applyProductionPatch(prev, {
                    overlay_max_duration: v > 0 ? v : undefined,
                  })
                );
              }}
              className="dash-select"
            >
              {MAX_DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center gap-2">
              <SettingLabel
                helpTitle="Volume da trilha"
                help={`Volume padrão da trilha em todos os projetos. Sem valor definido aqui, usa o volume de renderização global (${Math.round(globalMusicVolume * 100)}%).`}
                align="start"
              >
                Volume da trilha (estúdio)
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
              onChange={(e) =>
                setDraft((prev) =>
                  applyProductionPatch(prev, {
                    project_music_volume: parseFloat(e.target.value),
                  })
                )
              }
              className="dash-range"
            />
            <button
              type="button"
              onClick={() =>
                setDraft((prev) =>
                  applyProductionPatch(prev, {
                    project_music_volume: undefined,
                  })
                )
              }
              className={`dash-reset-btn ${projectVol === undefined ? "dash-reset-btn-active" : ""}`}
            >
              Usar global ({Math.round(globalMusicVolume * 100)}%)
            </button>
            <p className="text-[9px] text-[var(--dash-muted)] leading-relaxed">
              Define o volume da trilha em todos os renders. Sem valor aqui, usa
              o volume de renderização ({Math.round(globalMusicVolume * 100)}%).
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--dash-border)]">
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
                  onClick={() =>
                    setDraft((prev) =>
                      applyProductionPatch(prev, {
                        bgm_duck_strength: o.id === "normal" ? undefined : o.id,
                      })
                    )
                  }
                  className={`dash-option-btn ${duck === o.id ? "dash-option-btn-active" : ""}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-[var(--dash-muted)]">
              {DUCK_OPTIONS.find((o) => o.id === duck)?.hint}
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--dash-border)]">
            <SettingLabel
              helpTitle="Efeitos sonoros (SFX)"
              help="Whoosh, tick, impacto, riser e sons do roteiro. Desligue para render só com narração + trilha, sem efeitos."
              align="start"
            >
              Efeitos sonoros (SFX)
            </SettingLabel>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) =>
                    applyProductionPatch(prev, { sfx_enabled: undefined })
                  )
                }
                className={`dash-option-btn ${sfxEnabled ? "dash-option-btn-active" : ""}`}
              >
                Ligado
              </button>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) =>
                    applyProductionPatch(prev, { sfx_enabled: false })
                  )
                }
                className={`dash-option-btn ${!sfxEnabled ? "dash-option-btn-active" : ""}`}
              >
                Desligado
              </button>
            </div>
            <p className="text-[9px] text-[var(--dash-muted)]">
              {sfxEnabled
                ? "Sons curtos sincronizados com overlays e transições de bloco."
                : "Nenhum SFX no vídeo final — apenas voz e música de fundo."}
            </p>
          </div>

          <div
            className={`space-y-2 ${!sfxEnabled ? "opacity-45 pointer-events-none" : ""}`}
          >
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
              onChange={(e) =>
                setDraft((prev) =>
                  applyProductionPatch(prev, {
                    overlay_sfx_volume:
                      parseFloat(e.target.value) === 1
                        ? undefined
                        : parseFloat(e.target.value),
                  })
                )
              }
              className="dash-range"
            />
            <button
              type="button"
              onClick={() =>
                setDraft((prev) =>
                  applyProductionPatch(prev, { overlay_sfx_volume: undefined })
                )
              }
              className={`dash-reset-btn ${draft.overlay_sfx_volume === undefined ? "dash-reset-btn-active" : ""}`}
            >
              Usar padrão (100%)
            </button>
          </div>
        </div>
      </div>

      <p className="text-[9px] text-[var(--dash-muted)] leading-relaxed border-t border-[var(--dash-border)] pt-3">
        {isShortFormat
          ? "Shorts: listicles mantêm limite rígido de overlays independente da densidade."
          : "Vídeos longos: densidade, intervalo e duração afetam o planejamento da IA e a validação no render."}
      </p>

      <div className="flex justify-end border-t border-[var(--dash-border)] pt-4">
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={saving}
          className="dash-btn-primary text-xs px-5 py-2.5 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Produção Global"}
        </button>
      </div>
    </div>
  );
}
