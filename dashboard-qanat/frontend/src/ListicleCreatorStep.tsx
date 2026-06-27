import React from 'react';
import { RefreshCw, Sparkles, Lightbulb } from 'lucide-react';
import { ListicleRankingIdeas, type ListicleIdeasResponse, type ListicleRankingIdea } from './ListicleRankingIdeas';

export const LISTICLE_PRESETS = [
  {
    label: 'Top 20 invenções chinesas',
    niche: 'história e invenções da China',
    topic: 'invenções chinesas que mudaram o mundo',
    rankCount: 20,
    project: 'Top20_Inventions_China',
  },
  {
    label: 'Top 15 invenções americanas',
    niche: 'história e invenções dos Estados Unidos',
    topic: 'invenções americanas que revolucionaram o mundo',
    rankCount: 15,
    project: 'Top15_Inventions_USA',
  },
  {
    label: 'Top 20 revoluções industriais',
    niche: 'história industrial e revoluções tecnológicas',
    topic: 'revoluções industriais e marcos da engenharia humana',
    rankCount: 20,
    project: 'Top20_Industrial_Revolutions',
  },
] as const;

type Props = {
  listNiche: string;
  setListNiche: (v: string) => void;
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
  listicleIdeasData: ListicleIdeasResponse | null;
  selectedListicleIdeaIndex: number;
  onSuggestRankings: () => void;
  onSelectRankingIdea: (index: number, idea: ListicleRankingIdea) => void;
  onGenerateScript: () => void;
};

function projectNameFromTitle(title: string) {
  const stopWords = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'em', 'por', 'para', 'com', 'e', 'que', 'se', 'ou', 'top']);
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w.toLowerCase()))
    .slice(0, 4)
    .join('_') || 'TopN_Project';
}

export function ListicleCreatorStep({
  listNiche,
  setListNiche,
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
  listicleIdeasData,
  selectedListicleIdeaIndex,
  onSuggestRankings,
  onSelectRankingIdea,
  onGenerateScript,
}: Props) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto font-sans">
      <div>
        <h4 className="text-white font-bold text-sm tracking-wide font-cinzel">Top N — Rankings por Nicho</h4>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Escolha um nicho e a IA sugere rankings interessantes (subestimados, controversos, impacto diário…). Selecione um e gere o roteiro completo.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Nicho do Canal / Tema</label>
        <input
          type="text"
          disabled={creatorLoading || !hasApiKey}
          placeholder="Ex: história militar, engenharia antiga, tecnologia, curiosidades científicas..."
          value={listNiche}
          onChange={(e) => setListNiche(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[9px] text-zinc-600 uppercase tracking-wider w-full sm:w-auto">Atalhos:</span>
        {LISTICLE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setListNiche(preset.niche);
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

      <button
        type="button"
        disabled={creatorLoading || !listNiche.trim() || !hasApiKey}
        onClick={onSuggestRankings}
        className="w-full bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-200 disabled:opacity-50 text-xs font-bold px-5 py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
      >
        {creatorLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
        <span>Sugerir rankings interessantes para este nicho</span>
      </button>

      {listicleIdeasData?.ranking_ideas?.length ? (
        <ListicleRankingIdeas
          data={listicleIdeasData}
          selectedIndex={selectedListicleIdeaIndex}
          onSelect={(index, idea) => {
            onSelectRankingIdea(index, idea);
            if (idea.list_topic) setListTopic(idea.list_topic);
            if (idea.suggested_rank_count) setRankCount(idea.suggested_rank_count);
            if (idea.title) setCreatorProjectName(projectNameFromTitle(idea.title));
            if (idea.best_format === 'SHORTS' || idea.best_format === 'LONGO') {
              setFormatSelector(idea.best_format);
            }
            setNicheInput(listNiche.trim());
          }}
        />
      ) : null}

      <div className="border-t border-zinc-900 pt-4 space-y-4">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Configuração do ranking escolhido</p>

        <div className="space-y-2">
          <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Tema da lista (editável)</label>
          <input
            type="text"
            disabled={creatorLoading}
            placeholder="Preenchido ao escolher um ranking acima"
            value={listTopic}
            onChange={(e) => setListTopic(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Quantidade</label>
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
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Ordem</label>
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
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Formato</label>
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
          <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Nome do Projeto (pasta)</label>
          <input
            type="text"
            disabled={creatorLoading}
            placeholder="Ex: Top20_Inventions_China"
            value={creatorProjectName}
            onChange={(e) => setCreatorProjectName(e.target.value)}
            className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-xs text-zinc-900 font-semibold"
          />
        </div>

        <div className="flex justify-end">
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
    </div>
  );
}