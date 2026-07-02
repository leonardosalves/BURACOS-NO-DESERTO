import React from 'react';
import { Brain, KeyRound, Sliders, Plug, Palette, Clapperboard } from 'lucide-react';
import { SettingHelpTip } from './SettingHelpTip';
import { SECTION_HELP } from './sectionHelpContent';

export type SettingsSection = 'ia' | 'apis' | 'render' | 'visual' | 'producao' | 'integracoes';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode; helpId: string }[] = [
  { id: 'ia', label: 'IA', icon: <Brain className="w-3.5 h-3.5" />, helpId: 'settings-ia' },
  { id: 'apis', label: 'APIs & Mídia', icon: <KeyRound className="w-3.5 h-3.5" />, helpId: 'settings-apis' },
  { id: 'render', label: 'Render', icon: <Sliders className="w-3.5 h-3.5" />, helpId: 'settings-render' },
  { id: 'visual', label: 'Visual', icon: <Palette className="w-3.5 h-3.5" />, helpId: 'settings-visual' },
  { id: 'producao', label: 'Produção', icon: <Clapperboard className="w-3.5 h-3.5" />, helpId: 'settings-producao' },
  { id: 'integracoes', label: 'Integrações', icon: <Plug className="w-3.5 h-3.5" />, helpId: 'settings-integracoes' },
];

type Props = {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
};

export function SettingsSectionNav({ active, onChange }: Props) {
  return (
    <div className="glass-panel p-3 rounded-2xl min-w-0">
      <p className="lumiera-section-label mb-2 px-1 flex flex-wrap items-center gap-1.5">
        Seções de configuração
        <SettingHelpTip title="Configurações" align="start">
          Navegue entre IA, APIs, render global, visual do projeto, produção e integrações de publicação. Marca (logo/canal) fica na aba Render.
        </SettingHelpTip>
      </p>
      <div className="flex flex-wrap gap-2 min-w-0">
        {SECTIONS.map((s) => {
          const help = SECTION_HELP[s.helpId];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className={`flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[10px] font-bold px-3 py-2 rounded-full border transition min-w-0 max-w-full text-center leading-snug ${
                active === s.id
                  ? 'dash-nav-pill-active'
                  : 'border-dash-border bg-dash-card-hover text-zinc-400 hover:border-dash-primary/40 hover:text-white'
              }`}
            >
              {s.icon}
              {s.label}
              {help && (
                <span
                  className="inline-flex"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  <SettingHelpTip title={help.title} align="start">
                    {help.body}
                  </SettingHelpTip>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}