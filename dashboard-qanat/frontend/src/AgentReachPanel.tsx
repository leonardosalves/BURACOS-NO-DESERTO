import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type Platform = { id: string; label: string; description?: string };

type PlatformStatus = {
  id: string;
  name?: string;
  status?: string;
  message?: string;
  activeBackend?: string | null;
};

type SearchItem = {
  title?: string;
  url?: string;
  snippet?: string;
  published?: string;
};

type SearchResult = {
  ok?: boolean;
  available?: boolean;
  summary?: string;
  sources?: { title?: string; url?: string }[];
  items?: SearchItem[];
  source?: string;
  via?: string;
  message?: string;
  error?: string;
};

type AgentReachPanelProps = {
  niche?: string;
  onApplyCreatorIdea?: (title: string, hookPt: string, options?: { format?: string }) => void;
  embedded?: boolean;
};

const PLATFORMS: Platform[] = [
  { id: 'exa', label: 'Web (Exa)', description: 'Busca semântica na internet' },
  { id: 'url', label: 'Ler URL', description: 'Extrai texto de uma página' },
  { id: 'github', label: 'GitHub', description: 'Repositórios e projetos' },
  { id: 'bilibili', label: 'Bilibili', description: 'Vídeos (busca pública)' },
  { id: 'rss', label: 'RSS', description: 'Feed de notícias' },
];

function statusColor(status?: string) {
  if (status === 'ok') return 'text-emerald-400';
  if (status === 'warn') return 'text-amber-400';
  return 'text-zinc-500';
}

export function AgentReachPanel({ niche = '', onApplyCreatorIdea, embedded = false }: AgentReachPanelProps) {
  const [platform, setPlatform] = useState('exa');
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [platformsStatus, setPlatformsStatus] = useState<PlatformStatus[]>([]);
  const [readyCount, setReadyCount] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/agent-reach/status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar status');
      setPlatformsStatus(data.platforms || []);
      setReadyCount(data.readyCount || 0);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const runSearch = async () => {
    const isUrlMode = platform === 'url' || platform === 'rss';
    const q = query.trim();
    const u = url.trim();
    if (isUrlMode && platform === 'url' && !u && !q) {
      toast.error('Cole a URL da página.');
      return;
    }
    if (isUrlMode && platform === 'rss' && !u && !q) {
      toast.error('Cole a URL do feed RSS.');
      return;
    }
    if (!isUrlMode && !q) {
      toast.error('Digite o que deseja pesquisar.');
      return;
    }

    setBusy(true);
    setResult(null);
    const toastId = 'agent-reach-search';
    try {
      toast.loading('Buscando na internet…', { id: toastId });
      const res = await fetch('/api/agent-reach/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          query: q || u,
          url: u || undefined,
          numResults: 8,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || data.message || data.details || 'Falha na busca'));
      setResult(data);
      const n = data.sources?.length || data.items?.length || 0;
      toast.success(`Resultado pronto · ${n} fonte(s)`, { id: toastId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro na busca', { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const copySummary = async () => {
    if (!result?.summary) return;
    try {
      await navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const needsUrl = platform === 'url' || platform === 'rss';

  return (
    <div className="lumiera-panel-stack animate-fade-in font-sans min-w-0 space-y-4">
      {!embedded && (
        <SectionHeader
          title="Pesquisa Web"
          helpId="tab-agent-reach"
          size="lg"
          icon={<Globe className="w-6 h-6 text-sky-400 shrink-0" />}
          subtitle="Busca na internet integrada (Agent Reach) — Exa, Jina, GitHub, Bilibili e RSS, sem terminal"
        />
      )}

      <div className="glass-panel p-5 rounded-3xl space-y-4 border border-sky-500/10">
        <div className="flex flex-wrap items-center gap-3">
          {loadingStatus ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-xs text-zinc-300">
            {loadingStatus
              ? 'Verificando canais…'
              : `${readyCount} canal(is) prontos · Agent Reach`}
          </span>
          <button
            type="button"
            onClick={() => void fetchStatus()}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 ml-auto"
          >
            <RefreshCw className="w-3 h-3" />
            Atualizar
          </button>
        </div>

        {!loadingStatus && platformsStatus.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {platformsStatus
              .filter((p) => ['exa_search', 'web', 'github', 'bilibili', 'rss', 'youtube'].includes(p.id))
              .map((p) => (
                <span
                  key={p.id}
                  title={p.message || ''}
                  className={`text-[9px] px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-950/60 ${statusColor(p.status)}`}
                >
                  {p.name || p.id}
                </span>
              ))}
          </div>
        )}
      </div>

      <div className="glass-panel p-5 rounded-3xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-[10px] text-zinc-500 space-y-1 sm:col-span-2">
            Plataforma
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-zinc-200"
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} — {p.description}
                </option>
              ))}
            </select>
          </label>

          {needsUrl ? (
            <label className="text-[10px] text-zinc-500 space-y-1 sm:col-span-2">
              {platform === 'rss' ? 'URL do feed RSS' : 'URL da página'}
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={platform === 'rss' ? 'https://exemplo.com/feed.xml' : 'https://...'}
                className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600"
              />
            </label>
          ) : (
            <label className="text-[10px] text-zinc-500 space-y-1 sm:col-span-2">
              Consulta
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
                placeholder={
                  niche
                    ? `Ex: tendências ${niche} YouTube 2026`
                    : 'Ex: engenharia antiga fatos surpreendentes'
                }
                className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600"
              />
            </label>
          )}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void runSearch()}
          className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl transition"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Pesquisar na internet
        </button>
      </div>

      {result && (
        <div className="glass-panel p-5 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="w-4 h-4 text-sky-300" />
            <p className="text-xs font-bold text-zinc-200">
              Resultado
              {result.via ? ` · ${result.via}` : ''}
              {result.source ? ` / ${result.source}` : ''}
            </p>
            {result.summary && (
              <button
                type="button"
                onClick={() => void copySummary()}
                className="ml-auto text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>

          {(result.items || []).length > 0 ? (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {(result.items || []).map((item, i) => (
                <li
                  key={`${item.url || item.title}-${i}`}
                  className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60 space-y-1"
                >
                  <p className="text-[11px] font-semibold text-zinc-200">{item.title}</p>
                  {item.snippet && (
                    <p className="text-[9px] text-zinc-500 line-clamp-4 whitespace-pre-wrap">{item.snippet}</p>
                  )}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Abrir fonte
                    </a>
                  )}
                  {onApplyCreatorIdea && item.title && (
                    <button
                      type="button"
                      onClick={() =>
                        onApplyCreatorIdea(
                          `Baseado em: ${item.title.slice(0, 72)}`,
                          item.snippet?.slice(0, 200) || item.title,
                        )
                      }
                      className="block text-[10px] text-amber-300 hover:text-amber-200 mt-1"
                    >
                      Usar no Creator
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : result.summary ? (
            <pre className="text-[10px] text-zinc-300 whitespace-pre-wrap max-h-80 overflow-y-auto bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/60">
              {result.summary}
            </pre>
          ) : (
            <p className="text-[10px] text-zinc-500 italic flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Sem conteúdo utilizável.
            </p>
          )}

          {(result.sources || []).length > 0 && !(result.items || []).length && (
            <ul className="space-y-1 border-t border-zinc-800/80 pt-2">
              {(result.sources || []).map((s, i) => (
                <li key={`${s.url}-${i}`}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-sky-400 hover:text-sky-300"
                  >
                    {s.title || s.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
        Usado automaticamente ao gerar ideias, roteiros e pesquisa profunda (DeerFlow).
        Canais extras: <code className="text-zinc-500">.\scripts\setup-agent-reach.ps1</code>
      </p>
    </div>
  );
}