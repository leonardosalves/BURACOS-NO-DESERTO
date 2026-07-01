import React from 'react';

export type ListicleRankingIdea = {
  title: string;
  suggested_rank_count?: number;
  list_topic?: string;
  listicle_angle?: string;
  promise?: string;
  why_interesting?: string;
  controversy_hook?: string;
  sample_items?: string[];
  emotion?: string;
  best_format?: string;
};

export type ListicleIdeasResponse = {
  niche_analysis?: {
    audience_profile?: string;
    what_they_search?: string;
    comment_triggers?: string;
    best_ranking_styles?: string;
  };
  ranking_ideas?: ListicleRankingIdea[];
  best_index?: number;
  best_reason?: string;
};

type Props = {
  data: ListicleIdeasResponse;
  selectedIndex: number;
  onSelect: (index: number, idea: ListicleRankingIdea) => void;
};

export function ListicleRankingIdeas({ data, selectedIndex, onSelect }: Props) {
  const ideas = data.ranking_ideas || [];
  const analysis = data.niche_analysis;

  return (
    <div className="space-y-4 animate-fade-in">
      {analysis && (
        <div className="p-4 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-2 text-[10px]">
          <p className="text-gold-500 font-bold uppercase tracking-wider">Análise do nicho</p>
          {analysis.audience_profile && (
            <p className="text-zinc-400"><span className="text-zinc-500">Público:</span> {analysis.audience_profile}</p>
          )}
          {analysis.what_they_search && (
            <p className="text-zinc-400"><span className="text-zinc-500">Buscam:</span> {analysis.what_they_search}</p>
          )}
          {analysis.best_ranking_styles && (
            <p className="text-zinc-400"><span className="text-zinc-500">Rankings que funcionam:</span> {analysis.best_ranking_styles}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] bg-gold-500/10 border border-gold-500/20 text-gold-500 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
          {ideas.length} rankings sugeridos
        </span>
        {typeof data.best_index === 'number' && data.best_reason && (
          <span className="text-[9px] text-emerald-500/90 truncate max-w-[55%]" title={data.best_reason}>
            ★ Recomendado: #{data.best_index + 1}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
        {ideas.map((idea, index) => {
          const isSelected = selectedIndex === index;
          const isBest = data.best_index === index;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(index, idea)}
              className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? 'border-gold-500/60 bg-gold-500/10 ring-1 ring-gold-500/20'
                  : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-white leading-snug">{idea.title}</span>
                {isBest && (
                  <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">TOP</span>
                )}
              </div>
              {idea.listicle_angle && (
                <span className="text-[8px] text-violet-400 font-bold uppercase tracking-wide">{idea.listicle_angle}</span>
              )}
              {idea.suggested_rank_count && (
                <span className="ml-2 text-[8px] text-zinc-500 font-mono">Top {idea.suggested_rank_count}</span>
              )}
              {idea.best_format === 'SHORTS' && (
                <span className="ml-1 text-[8px] text-fuchsia-400 font-bold uppercase">Short</span>
              )}
              {idea.why_interesting && (
                <p className="text-[9px] text-zinc-500 mt-1.5 leading-relaxed">{idea.why_interesting}</p>
              )}
              {idea.sample_items && idea.sample_items.length > 0 && (
                <p className="text-[8px] text-zinc-600 mt-1 truncate" title={idea.sample_items.join(', ')}>
                  Ex.: {idea.sample_items.slice(0, 3).join(' · ')}
                </p>
              )}
              {idea.controversy_hook && (
                <p className="text-[8px] text-amber-500/80 mt-1 italic">{idea.controversy_hook}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}