import React from 'react';
import { Brain, KeyRound, Sliders, Image, Plug } from 'lucide-react';

export type SettingsSection = 'ia' | 'apis' | 'render' | 'marca' | 'integracoes';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { id: 'ia', label: 'IA', icon: <Brain className="w-3.5 h-3.5" /> },
  { id: 'apis', label: 'APIs & Mídia', icon: <KeyRound className="w-3.5 h-3.5" /> },
  { id: 'render', label: 'Render', icon: <Sliders className="w-3.5 h-3.5" /> },
  { id: 'marca', label: 'Marca', icon: <Image className="w-3.5 h-3.5" /> },
  { id: 'integracoes', label: 'Integrações', icon: <Plug className="w-3.5 h-3.5" /> },
];

type Props = {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
};

export function SettingsSectionNav({ active, onChange }: Props) {
  return (
    <div className="glass-panel p-3 rounded-2xl">
      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-2 px-1">Seções</p>
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-xl border transition ${
              active === s.id
                ? 'border-gold-500/50 bg-gold-500/10 text-gold-400'
                : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}