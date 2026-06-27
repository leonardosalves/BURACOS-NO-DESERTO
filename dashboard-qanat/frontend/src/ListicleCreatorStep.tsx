import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

export const LISTICLE_PRESETS = [
  {
    label: 'Top 20 invenções chinesas',
    topic: 'invenções chinesas que mudaram o mundo',
    rankCount: 20,
    niche: 'história e invenções da China',
    project: 'Top20_Inventions_China',
  },
  {
    label: 'Top 15 invenções americanas',
    topic: 'invenções americanas que revolucionaram o mundo',
    rankCount: 15,
    niche: 'história e invenções dos Estados Unidos',
    project: 'Top15_Inventions_USA',
  },
  {
    label: 'Top 20 revoluções industriais',
    topic: 'revoluções industriais e marcos da engenharia humana',
    rankCount: 20,
    niche: 'história industrial e revoluções tecnológicas',
    project: 'Top20_Industrial_Revolutions',
  },
] as const;

type Props = {
  listTopic: string;
  setListTopic: (v: string) => void;
  rankCount: number;
  setRankCount: (v: number) => void;
  rankOrder: 'desc' | 'asc';
  setRankOrder: (v: 'desc' | 'asc') => void;
  formatSelector: 'LONGO' | 'SHORTS';
  setFormatSelector: (v: 'LONGO' | 'SHORTS') => void;
  creatorProjectName: string;
  setCreatorProjectName: (v: string) => void;
  setNicheInput: (v: string) => void;
  creatorLoading: boolean;
  hasApiKey: boolean;
  onGenerateIdeas: () => void;
  onGenerateScript: () => void;
};

export function ListicleCreatorStep({
  listTopic,
  setListTopic,
  rankCount,
  setRankCount,
  rankOrder,
  setRankOrder,
  formatSelector,
  setFormatSelector,
  creatorProjectName,
  setCreatorProjectName,
  setNicheInput,
  creatorLoading,
  hasApiKey,
  onGenerateIdeas,
  onGenerateScript,
}: Props) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto font-sans">
      <div>
        <h4 className="text-white font-bold text-sm tracking-wide font-cinzel">Top N — Vídeo em Ranking</h4>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Gere roteiros countdown (N→1) ou build-up (1→N). Cada item vira um bloco com narração, prompts visuais e texto de impacto (#N — Nome).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LISTICLE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setListTopic(preset.topic);
              setRankCount(preset.rankCount);
              setNicheInput(preset.niche);
              setCreatorProjectName(preset.project);
              setFormatSelector('LONGO');
              setRankOrder('desc');
            }}
            className="text-[10px] font-bold px-3 py-2 rounded-lg border border-gold-500/30 bg-gold-500/10 text-gold-300 hover:bg-gold-500/20 transition cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Tema da Lista</label>
          <input
            type="text"
            disabled={creatorLoading || !hasApiKey}
            placeholder="Ex: invenções chinesas, revoluções industriais..."
            value={listTopic}
            onChange={(e) => setListTopic(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Quantidade</label>
            <select
              value={rankCount}
              onChange={(e) => setRankCount(Number(e.target.value))}
              disabled={creatorLoading}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
            >
              {[5, 10, 15, 20, 25, 30].map((n) => (
                <option key={n} value={n}>Top {n}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Ordem</label>
            <select
              value={rankOrder}
              onChange={(e) => setRankOrder(e.target.value as 'desc' | 'asc')}
              disabled={creatorLoading}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
            >
              <option value="desc">Countdown (N → 1)</option>
              <option value="asc">Build-up (1 → N)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Formato</label>
            <select
              value={formatSelector}
              onChange={(e) => setFormatSelector(e.target.value as 'LONGO' | 'SHORTS')}
              disabled={creatorLoading}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
            >
              <option value="LONGO">Longo (recomendado)</option>
              <option value="SHORTS">Shorts (máx. 3 itens)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Nome do Projeto (pasta)</label>
          <input
            type="text"
            disabled={creatorLoading}
            placeholder="Ex: Top20_Inventions_China"
            value={creatorProjectName}
            onChange={(e) => setCreatorProjectName(e.target.value)}
            className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-xs text-zinc-900 font-semibold"
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-zinc-900">
        <button
          type="button"
          disabled={creatorLoading || !listTopic.trim() || !hasApiKey}
          onClick={() => {
            setNicheInput(listTopic.trim());
            onGenerateIdeas();
          }}
          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold px-5 py-3 rounded-xl transition cursor-pointer"
        >
          Gerar 10 títulos Top N
        </button>
        <button
          type="button"
          disabled={creatorLoading || !listTopic.trim() || !creatorProjectName.trim() || !hasApiKey}
          onClick={onGenerateScript}
          className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10"
        >
          {creatorLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>Gerar Roteiro Top {rankCount}</span>
        </button>
      </div>
    </div>
  );
}