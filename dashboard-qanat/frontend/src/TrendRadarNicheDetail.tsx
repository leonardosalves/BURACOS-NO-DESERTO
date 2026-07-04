import React from 'react';
import {
  ArrowLeft,
  Bookmark,
  Compass,
  ExternalLink,
  Trash2,
  TrendingUp,
  Users,
  Video,
  Youtube,
} from 'lucide-react';
import type { CreatorApplyIdeaOptions } from './creatorEditorialImport';
import { resolvePioneerCreatorSeed } from './creatorEditorialImport';

export type TrendRadarAspects = {
  overview?: { title?: string; summary?: string; headline?: string };
  macroNiche?: { title?: string; value?: string; description?: string };
  angle?: { title?: string; value?: string; description?: string };
  formatPattern?: { title?: string; value?: string; description?: string };
  competition?: {
    title?: string;
    searchQuery?: string;
    dedicatedChannels?: number;
    channelCount?: number;
    videoCount?: number;
    saturationPct?: number | null;
    macroSaturationPct?: number | null;
    gapScore?: number | null;
    avgTopViews?: number;
    maxTopViews?: number;
    sampleChannels?: { title?: string; channelId?: string }[];
    sampleVideos?: { title?: string; views?: number; videoId?: string }[];
  };
  pioneerAnalysis?: {
    title?: string;
    pioneerScore?: number;
    interestScore?: number;
    status?: string;
    whyPioneer?: string;
  };
  firstVideo?: { title?: string; idea?: string; hook?: string };
  risks?: { title?: string; items?: string[] };
  audience?: { title?: string; description?: string };
  contentPillars?: { title?: string; items?: string[] };
  monetization?: { title?: string; items?: string[] };
  searchStrategy?: { title?: string; primaryQuery?: string; format?: string; tips?: string[] };
};

export type TrendRadarSavedItem = {
  id: string;
  type: 'niche' | 'scan';
  label?: string;
  savedAt?: string;
  discoveryMode?: 'virgin' | 'chosen';
  nicheFilter?: string | null;
  format?: string;
  status?: string;
  pioneerScore?: number;
  macroNiche?: string;
  niche?: Record<string, unknown>;
  detail?: {
    label?: string;
    status?: string;
    pioneerScore?: number;
    format?: string;
    discoveryMode?: string;
    nicheFilter?: string | null;
    aspects?: TrendRadarAspects;
    raw?: Record<string, unknown>;
  };
  niches?: Array<{
    label?: string;
    status?: string;
    pioneerScore?: number;
    aspects?: TrendRadarAspects;
    raw?: Record<string, unknown>;
  }>;
  summary?: {
    scanned?: number;
    virginCount?: number;
    pioneerCount?: number;
    topPick?: string;
  };
};

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    virgem: 'bg-violet-500/20 text-violet-200 border-violet-500/40',
    pioneiro: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30',
    emergente: 'bg-amber-500/10 text-amber-200 border-amber-500/25',
    saturado: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/40',
  };
  const labels: Record<string, string> = {
    virgem: 'Virgem',
    pioneiro: 'Pioneiro',
    emergente: 'Emergente',
    saturado: 'Saturado',
  };
  const key = status && map[status] ? status : 'emergente';
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${map[key]}`}>
      {labels[key]}
    </span>
  );
}

function AspectCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/70 space-y-2 ${className}`}>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">{title}</h3>
      {children}
    </section>
  );
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center min-w-[88px]">
      <p className="text-[8px] text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-zinc-100 tabular-nums">{value}</p>
    </div>
  );
}

type NicheDetailEntry = NonNullable<TrendRadarSavedItem['niches']>[number];

type NicheDetailViewProps = {
  item: TrendRadarSavedItem;
  onBack: () => void;
  onDelete?: (id: string) => void;
  onOpenNicheFromScan?: (entry: NicheDetailEntry) => void;
  onApplyCreatorIdea?: (title: string, hook: string, options?: CreatorApplyIdeaOptions) => void;
};

export function TrendRadarNicheDetailView({
  item,
  onBack,
  onDelete,
  onOpenNicheFromScan,
  onApplyCreatorIdea,
}: NicheDetailViewProps) {
  if (item.type === 'scan' && item.niches?.length) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          {onDelete && (
            <button type="button" onClick={() => onDelete(item.id)} className="ml-auto text-[10px] text-zinc-500 hover:text-red-400">
              Excluir varredura
            </button>
          )}
        </div>
        <div className="glass-panel p-5 rounded-3xl border border-violet-500/15 space-y-2">
          <h2 className="text-lg font-bold text-zinc-100">{item.label}</h2>
          <p className="text-[10px] text-zinc-500">
            {item.summary?.scanned ?? item.niches.length} analisados · {item.summary?.virginCount ?? 0} virgens ·{' '}
            {item.savedAt ? new Date(item.savedAt).toLocaleString('pt-BR') : ''}
          </p>
        </div>
        <ul className="space-y-2">
          {item.niches.map((n, i) => (
            <li key={i} className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <StatusBadge status={n.status} />
                  <p className="text-[11px] font-semibold text-zinc-100 mt-1">{n.label}</p>
                  <p className="text-[9px] text-zinc-500">{n.aspects?.overview?.summary?.slice(0, 120)}…</p>
                </div>
                <span className="text-[9px] font-bold text-violet-300">{Number(n.pioneerScore || 0).toFixed(0)} pts</span>
              </div>
              {onOpenNicheFromScan && (
                <button
                  type="button"
                  onClick={() => onOpenNicheFromScan(n)}
                  className="mt-2 text-[10px] font-bold text-violet-300 hover:text-violet-200"
                >
                  Ver detalhes completos
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const detail = item.detail;
  const aspects = detail?.aspects;
  const raw = (detail?.raw || item.niche || {}) as Record<string, unknown>;
  const competition = aspects?.competition;
  const pioneer = aspects?.pioneerAnalysis;

  const openCreator = () => {
    if (!onApplyCreatorIdea) return;
    const pioneerMeta = {
      macroNiche: String(raw.macroNiche || item.macroNiche || ''),
      angle: String(raw.angle || ''),
      formatPattern: String(raw.formatPattern || ''),
      youtubeSearchQuery: String(raw.youtubeSearchQuery || ''),
    };
    const seed = resolvePioneerCreatorSeed(
      String(aspects?.firstVideo?.idea || item.label || ''),
      String(aspects?.firstVideo?.hook || aspects?.firstVideo?.idea || ''),
      pioneerMeta,
      String(pioneer?.whyPioneer || ''),
    );
    onApplyCreatorIdea(seed.title, seed.hook, {
      format: (item.format === 'LONGO' ? 'LONGO' : 'SHORTS') as 'LONGO' | 'SHORTS',
      mechanic: 'pioneer-niche',
      whyWorks: pioneer?.whyPioneer,
      pioneerMeta,
    });
  };

  return (
    <div className="space-y-4 animate-fade-in font-sans min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <span className="text-[9px] text-zinc-600">
          Salvo em {item.savedAt ? new Date(item.savedAt).toLocaleString('pt-BR') : '—'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {onApplyCreatorIdea && (
            <button
              type="button"
              onClick={openCreator}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition"
            >
              Abrir no Creator
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-violet-500/20 space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Compass className="w-5 h-5 text-violet-300 shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-wide text-amber-400/90">
                {aspects?.macroNiche?.value || item.macroNiche || 'Macro-nicho'}
              </span>
              <StatusBadge status={detail?.status || item.status} />
              <span className="text-[9px] text-zinc-500">
                {item.discoveryMode === 'chosen' ? `Modo: nicho escolhido${item.nicheFilter ? ` (${item.nicheFilter})` : ''}` : 'Modo: descoberta virgem'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-zinc-50 leading-snug">
              {detail?.label || item.label || 'Nicho pioneiro'}
            </h2>
            {aspects?.overview?.summary && (
              <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">{aspects.overview.summary}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <MetricPill label="Pioneiro" value={`${Number(detail?.pioneerScore ?? item.pioneerScore ?? 0).toFixed(0)} pts`} />
            <MetricPill label="Gap" value={competition?.gapScore ?? '—'} />
            <MetricPill label="Saturação" value={competition?.saturationPct != null ? `${competition.saturationPct}%` : '—'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AspectCard title={aspects?.angle?.title || 'Ângulo específico'}>
          <p className="text-sm text-zinc-200">{aspects?.angle?.value || '—'}</p>
          <p className="text-[10px] text-zinc-500">{aspects?.angle?.description}</p>
        </AspectCard>
        <AspectCard title={aspects?.formatPattern?.title || 'Padrão de vídeo'}>
          <p className="text-sm text-zinc-200">{aspects?.formatPattern?.value || '—'}</p>
          <p className="text-[10px] text-zinc-500">{aspects?.formatPattern?.description}</p>
        </AspectCard>
        <AspectCard title={aspects?.audience?.title || 'Público-alvo'} className="md:col-span-2">
          <p className="text-sm text-zinc-300 leading-relaxed flex items-start gap-2">
            <Users className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            {aspects?.audience?.description || '—'}
          </p>
        </AspectCard>
        <AspectCard title={aspects?.pioneerAnalysis?.title || 'Análise pioneira'}>
          <p className="text-sm text-zinc-300 leading-relaxed">{pioneer?.whyPioneer || '—'}</p>
          <p className="text-[10px] text-zinc-500 mt-2">
            Interesse: {pioneer?.interestScore ?? '—'} · Score: {pioneer?.pioneerScore ?? '—'}
          </p>
        </AspectCard>
        <AspectCard title={aspects?.firstVideo?.title || 'Primeiro vídeo'}>
          <p className="text-sm font-semibold text-cyan-300">{aspects?.firstVideo?.idea || '—'}</p>
          {aspects?.firstVideo?.hook && (
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{aspects.firstVideo.hook}</p>
          )}
        </AspectCard>
      </div>

      <AspectCard title={aspects?.competition?.title || 'Concorrência no YouTube'}>
        <div className="flex flex-wrap gap-2 mb-3">
          <MetricPill label="Canais dedicados" value={competition?.dedicatedChannels ?? 0} />
          <MetricPill label="Canais (busca)" value={competition?.channelCount ?? 0} />
          <MetricPill label="Vídeos" value={competition?.videoCount ?? 0} />
          <MetricPill label="Views médias" value={(competition?.avgTopViews ?? 0).toLocaleString('pt-BR')} />
          <MetricPill label="Macro sat." value={competition?.macroSaturationPct != null ? `${competition.macroSaturationPct}%` : '—'} />
        </div>
        {competition?.searchQuery && (
          <p className="text-[10px] text-zinc-500 mb-3">
            Busca: <code className="text-zinc-400">{competition.searchQuery}</code>
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] font-bold text-zinc-500 uppercase mb-2 flex items-center gap-1">
              <Youtube className="w-3 h-3" /> Canais de referência
            </p>
            <ul className="space-y-1">
              {(competition?.sampleChannels || []).slice(0, 5).map((ch, i) => (
                <li key={`${ch.title}-${i}`} className="text-[10px] text-zinc-400 truncate">{ch.title || '—'}</li>
              ))}
              {!(competition?.sampleChannels || []).length && (
                <li className="text-[10px] text-zinc-600 italic">Nenhum canal amostrado</li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-[9px] font-bold text-zinc-500 uppercase mb-2 flex items-center gap-1">
              <Video className="w-3 h-3" /> Vídeos similares
            </p>
            <ul className="space-y-1">
              {(competition?.sampleVideos || []).slice(0, 5).map((v, i) => (
                <li key={`${v.videoId || v.title}-${i}`} className="text-[10px] text-zinc-400">
                  <span className="line-clamp-1">{v.title || '—'}</span>
                  <span className="text-zinc-600"> · {(v.views ?? 0).toLocaleString('pt-BR')} views</span>
                </li>
              ))}
              {!(competition?.sampleVideos || []).length && (
                <li className="text-[10px] text-zinc-600 italic">Nenhum vídeo amostrado</li>
              )}
            </ul>
          </div>
        </div>
      </AspectCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AspectCard title={aspects?.contentPillars?.title || 'Pilares de conteúdo'}>
          <ul className="space-y-1.5">
            {(aspects?.contentPillars?.items || []).map((line, i) => (
              <li key={i} className="text-[11px] text-zinc-300 flex gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                {line}
              </li>
            ))}
          </ul>
        </AspectCard>
        <AspectCard title={aspects?.monetization?.title || 'Monetização'}>
          <ul className="space-y-1.5">
            {(aspects?.monetization?.items || []).map((line, i) => (
              <li key={i} className="text-[11px] text-zinc-400 leading-relaxed">{line}</li>
            ))}
          </ul>
        </AspectCard>
        <AspectCard title={aspects?.risks?.title || 'Riscos'}>
          <ul className="space-y-1">
            {(aspects?.risks?.items || []).map((line, i) => (
              <li key={i} className="text-[11px] text-amber-400/90">{line}</li>
            ))}
          </ul>
        </AspectCard>
        <AspectCard title={aspects?.searchStrategy?.title || 'Estratégia de busca'}>
          {aspects?.searchStrategy?.primaryQuery && (
            <p className="text-[11px] text-zinc-300 mb-2">
              Query: <code className="text-violet-300">{aspects.searchStrategy.primaryQuery}</code>
            </p>
          )}
          <ul className="space-y-1">
            {(aspects?.searchStrategy?.tips || []).map((tip, i) => (
              <li key={i} className="text-[10px] text-zinc-500 flex gap-1.5">
                <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>
        </AspectCard>
      </div>
    </div>
  );
}

type SavedListProps = {
  items: TrendRadarSavedItem[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
};

export function TrendRadarSavedList({
  items,
  onOpen,
  onDelete,
  onBack,
}: SavedListProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao radar
        </button>
        <p className="text-xs font-bold text-zinc-200 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-400" />
          Nichos salvos ({items.length})
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-zinc-500 italic p-4">Nenhum resultado salvo ainda. Rode uma varredura e clique em Salvar.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={item.status} />
                  <span className="text-[8px] text-zinc-600 uppercase">
                    {item.discoveryMode === 'chosen' ? 'Escolhido' : 'Virgem'} · {item.type === 'scan' ? 'Varredura' : 'Nicho'}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-zinc-100 line-clamp-2">{item.label}</p>
                <p className="text-[9px] text-zinc-500">
                  {item.macroNiche ? `${item.macroNiche} · ` : ''}
                  {item.savedAt ? new Date(item.savedAt).toLocaleString('pt-BR') : ''}
                  {item.pioneerScore != null ? ` · ${item.pioneerScore} pts` : ''}
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="text-[10px] font-bold text-violet-300 hover:text-violet-200 px-2 py-1"
                >
                  Detalhes
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="text-[10px] text-zinc-600 hover:text-red-400 px-2 py-1"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}