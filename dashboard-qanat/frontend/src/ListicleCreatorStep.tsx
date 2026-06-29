import React, { useMemo } from 'react';
import { RefreshCw, Sparkles, Lightbulb } from 'lucide-react';
import { ListicleRankingIdeas, type ListicleIdeasResponse, type ListicleRankingIdea } from './ListicleRankingIdeas';
import { buildHudPreviewItems, ListicleHudPreview, type HudPreviewListItem } from './ListicleHudPreview';

export const LONGO_RANK_OPTIONS = [5, 10, 15, 20, 25, 30] as const;
export const SHORTS_RANK_OPTIONS = [3, 5] as const;

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

export const LISTICLE_SHORTS_PRESETS = [
  {
    label: 'Short Top 3 — choque rápido',
    niche: 'curiosidades e fatos surpreendentes',
    topic: 'fatos mais chocantes que poucos conhecem',
    rankCount: 3,
    project: 'Top3_Shock_Short',
  },
  {
    label: 'Short Top 5 — ranking viral',
    niche: 'história e tecnologia em formato curto',
    topic: 'invenções ou eventos que mudaram tudo em segundos',
    rankCount: 5,
    project: 'Top5_Viral_Short',
  },
] as const;

function clampShortsRankCount(count: number) {
  return count === 5 ? 5 : 3;
}

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
  listicleHudStyle: 'full' | 'compact' | 'auto';
  setListicleHudStyle: (v: 'full' | 'compact' | 'auto') => void;
  listItems?: HudPreviewListItem[];
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
  listicleHudStyle,
  setListicleHudStyle,
  listItems = [],
  onSuggestRankings,
  onSelectRankingIdea,
  onGenerateScript,
}: Props) {
  const rankOptions = formatSelector === 'SHORTS' ? SHORTS_RANK_OPTIONS : LONGO_RANK_OPTIONS;
  const hudPreview = useMemo(
    () => buildHudPreviewItems(rankCount, rankOrder, listItems),
    [rankCount, rankOrder, listItems],
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto font-sans">
      <div>
        <h4 className="text-white font-bold text-sm tracking-wide font-cinzel">Top N — Rankings por Nicho</h4>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Escolha um nicho e a IA sugere rankings interessantes (subestimados, controversos, impacto diário…). Selecione um, gere a narração, revise e só então monte o roteiro completo.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Nicho do Canal / Tema</label>
        <input
          type="text"
          disabled={creatorLoading || !hasApiKey}
          placeholder="Ex: curiosidades e fatos surpreendentes, finanças, culinária, natureza, esportes..."
          value={listNiche}
          onChange={(e) => setListNiche(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Formato do vídeo</label>
        <select
          value={formatSelector}
          onChange={(e) => {
            const nextFormat = e.target.value as 'LONGO' | 'SHORTS';
            setFormatSelector(nextFormat);
            if (nextFormat === 'SHORTS' && !SHORTS_RANK_OPTIONS.includes(rankCount as 3 | 5)) {
              setRankCount(3);
            } else if (nextFormat === 'LONGO' && SHORTS_RANK_OPTIONS.includes(rankCount as 3 | 5)) {
              setRankCount(10);
            }
          }}
          disabled={creatorLoading}
          className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
        >
          <option value="LONGO">Longo — rankings Top 5 a 30</option>
          <option value="SHORTS">Shorts — rankings Top 3 ou Top 5 (exclusivo)</option>
        </select>
        {formatSelector === 'SHORTS' && (
          <p className="text-[9px] text-fuchsia-400/80 leading-relaxed">
            Em Shorts, a IA sugere apenas rankings Top 3 (choque rápido) e Top 5 (mais denso) adaptados ao nicho.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[9px] text-zinc-600 uppercase tracking-wider w-full sm:w-auto">
          {formatSelector === 'SHORTS' ? 'Atalhos Shorts:' : 'Atalhos Longo:'}
        </span>
        {(formatSelector === 'SHORTS' ? LISTICLE_SHORTS_PRESETS : LISTICLE_PRESETS).map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setListNiche(preset.niche);
              setListTopic(preset.topic);
              setRankCount(preset.rankCount);
              setNicheInput(preset.niche);
              setCreatorProjectName(preset.project);
              setFormatSelector(formatSelector === 'SHORTS' ? 'SHORTS' : 'LONGO');
              setRankOrder('desc');
            }}
            className={`text-[10px] font-bold px-3 py-2 rounded-lg border transition cursor-pointer ${
              formatSelector === 'SHORTS'
                ? 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20'
                : 'border-gold-500/30 bg-gold-500/10 text-gold-300 hover:bg-gold-500/20'
            }`}
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
            if (idea.suggested_rank_count) {
              const nextRank = idea.best_format === 'SHORTS' || formatSelector === 'SHORTS'
                ? clampShortsRankCount(idea.suggested_rank_count)
                : idea.suggested_rank_count;
              setRankCount(nextRank);
            }
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Estilo do HUD no vídeo</label>
            <select
              value={listicleHudStyle}
              onChange={(e) => setListicleHudStyle(e.target.value as 'full' | 'compact' | 'auto')}
              disabled={creatorLoading}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
            >
              <option value="auto">Automático (compacto em Top 9+)</option>
              <option value="full">Completo (badge + título + ícone)</option>
              <option value="compact">Compacto (só #N + TOP N)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider">
              Quantidade {formatSelector === 'SHORTS' ? '(Shorts)' : ''}
            </label>
            <select
              value={rankCount}
              onChange={(e) => setRankCount(Number(e.target.value))}
              disabled={creatorLoading}
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
            >
              {rankOptions.map((n) => (
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
        </div>

        <ListicleHudPreview
          rankCount={rankCount}
          rankOrder={rankOrder}
          hudStyle={listicleHudStyle}
          items={hudPreview.items}
          hasRealListItems={hudPreview.hasRealListItems}
          videoSeed={[creatorProjectName, listTopic, listNiche, `top${rankCount}`].filter(Boolean).join('|')}
        />

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
            <span>Gerar Narração Top {rankCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}