import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Loader2,
  Play,
  RefreshCw,
  Settings2,
  Workflow,
  Zap,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type PipelineNode = {
  id: string;
  label: string;
  category: string;
  phase: number;
  method: string;
  path: string;
  lumieraAction: string;
  description: string;
  enabled: boolean;
  lastRunAt?: string | null;
  lastStatus?: string | null;
};

type N8nDashboard = {
  config: {
    enabled?: boolean;
    n8nBaseUrl?: string;
    lumieraPublicUrl?: string;
    hasApiKey?: boolean;
    apiKeyMasked?: string;
    autoSyncIntervalSec?: number;
  };
  map: {
    nodes: PipelineNode[];
    connections: string[][];
    upstreamRepo?: string;
  };
  n8n?: {
    ok?: boolean;
    health?: boolean;
    api?: boolean;
    editorUrl?: string;
    error?: string | null;
    lumieraWorkflows?: Array<{ id: string; name: string; active: boolean }>;
  };
  sync?: {
    lastSyncAt?: string | null;
    lastSyncDirection?: string | null;
    workflowId?: string | null;
  };
  events?: Array<{
    id: string;
    at: string;
    type: string;
    action?: string;
    status?: string;
    message?: string;
  }>;
  stats?: { totalNodes: number; enabledNodes: number };
};

const CATEGORY_COLORS: Record<string, string> = {
  creator: 'border-violet-500/40 bg-violet-500/10 text-violet-200',
  production: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  render: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  publish: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  ops: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
  research: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
  workflow: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300',
};

type Props = {
  toast: (msg: string) => void;
  embedded?: boolean;
};

export function N8nOrchestratorPage({ toast, embedded = false }: Props) {
  const [data, setData] = useState<N8nDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [n8nUrl, setN8nUrl] = useState('http://127.0.0.1:5678');
  const [lumieraUrl, setLumieraUrl] = useState('http://127.0.0.1:3005');
  const [apiKey, setApiKey] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/n8n/status');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar');
      setData(json);
      setN8nUrl(json.config?.n8nBaseUrl || 'http://127.0.0.1:5678');
      setLumieraUrl(json.config?.lumieraPublicUrl || 'http://127.0.0.1:3005');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar n8n.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!autoSync) return undefined;
    const interval = window.setInterval(() => { void load(); }, (data?.config?.autoSyncIntervalSec ?? 30) * 1000);
    return () => window.clearInterval(interval);
  }, [autoSync, data?.config?.autoSyncIntervalSec, load]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [data?.events?.length]);

  const orderedNodes = useMemo(() => {
    const nodes = data?.map?.nodes || [];
    return [...nodes].sort((a, b) => (a.phase || 0) - (b.phase || 0) || a.label.localeCompare(b.label));
  }, [data?.map?.nodes]);

  const saveConfig = async () => {
    setBusy('config');
    try {
      const body: Record<string, unknown> = {
        n8nBaseUrl: n8nUrl,
        lumieraPublicUrl: lumieraUrl,
        enabled: true,
      };
      if (apiKey.trim()) body.n8nApiKey = apiKey.trim();
      const res = await fetch('/api/n8n/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setApiKey('');
      setData((prev) => ({ ...(prev || {}), ...json.dashboard, n8n: prev?.n8n }));
      toast('Configuração n8n salva.');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setBusy(null);
    }
  };

  const syncPush = async () => {
    setBusy('push');
    try {
      const res = await fetch('/api/n8n/sync/push', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message);
      toast(json.message || 'Mapa enviado ao n8n.');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Sync push falhou.');
    } finally {
      setBusy(null);
    }
  };

  const syncPull = async () => {
    setBusy('pull');
    try {
      const res = await fetch('/api/n8n/sync/pull', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message);
      toast(json.message || 'Mapa atualizado do n8n.');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Sync pull falhou.');
    } finally {
      setBusy(null);
    }
  };

  const toggleNode = async (nodeId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/n8n/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData((prev) => {
        if (!prev?.map?.nodes) return prev;
        return {
          ...prev,
          map: {
            ...prev.map,
            nodes: prev.map.nodes.map((n) => (n.id === nodeId ? { ...n, enabled } : n)),
          },
        };
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao atualizar nó.');
    }
  };

  const n8nOnline = data?.n8n?.ok === true;
  const n8nEditor = data?.config?.n8nBaseUrl || n8nUrl;
  const iframeSrc = `/n8n-proxy/`;

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {!embedded && (
        <SectionHeader
          title="n8n — Orquestração Lumiera"
          helpId="tab-n8n-orchestrator"
          size="md"
          icon={<Workflow className="w-5 h-5 text-rose-400" />}
          subtitle="Mapa de funcionamento do programa sincronizado com n8n. Edite no n8n ou aqui — as mudanças refletem nos dois lados."
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
          <p className="text-[9px] uppercase text-zinc-500 mb-1">n8n</p>
          <p className={`text-sm font-bold flex items-center gap-1 ${n8nOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
            {n8nOnline ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {n8nOnline ? 'Online' : 'Offline'}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
          <p className="text-[9px] uppercase text-zinc-500 mb-1">Nós ativos</p>
          <p className="text-sm font-bold text-zinc-200 tabular-nums">
            {data?.stats?.enabledNodes ?? 0}/{data?.stats?.totalNodes ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
          <p className="text-[9px] uppercase text-zinc-500 mb-1">Último sync</p>
          <p className="text-[10px] text-zinc-400">
            {data?.sync?.lastSyncAt
              ? `${data.sync.lastSyncDirection === 'pull' ? '← n8n' : '→ n8n'} · ${new Date(data.sync.lastSyncAt).toLocaleString('pt-BR')}`
              : 'Nunca'}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
          <p className="text-[9px] uppercase text-zinc-500 mb-1">Workflow ID</p>
          <p className="text-[10px] text-zinc-400 truncate font-mono">{data?.sync?.workflowId || '—'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          disabled={loading || !!busy}
          onClick={() => void load()}
          className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Atualizar
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void syncPush()}
          className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
        >
          {busy === 'push' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          Sync Lumiera → n8n
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void syncPull()}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 border border-zinc-700"
        >
          {busy === 'pull' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
          Sync n8n → Lumiera
        </button>
        <button
          type="button"
          onClick={() => setShowConfig((v) => !v)}
          className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 flex items-center gap-1.5"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Config
        </button>
        <a
          href={n8nEditor}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-bold px-3 py-2 rounded-lg border border-rose-500/30 text-rose-300 flex items-center gap-1.5 ml-auto"
        >
          Abrir n8n <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <a
          href="https://github.com/n8n-io/n8n"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          github.com/n8n-io/n8n
        </a>
      </div>

      {showConfig && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
          <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Conexão n8n</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-zinc-500 uppercase">URL n8n</label>
              <input className="dash-input w-full text-xs mt-0.5" value={n8nUrl} onChange={(e) => setN8nUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] text-zinc-500 uppercase">URL Lumiera (webhooks)</label>
              <input className="dash-input w-full text-xs mt-0.5" value={lumieraUrl} onChange={(e) => setLumieraUrl(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[9px] text-zinc-500 uppercase">API Key n8n</label>
              <input
                type="password"
                className="dash-input w-full text-xs mt-0.5 font-mono"
                placeholder={data?.config?.hasApiKey ? `Atual: ${data.config.apiKeyMasked}` : 'Cole a API key do n8n'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
            <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
            Auto-atualizar status a cada {data?.config?.autoSyncIntervalSec ?? 30}s
          </label>
          <button
            type="button"
            disabled={busy === 'config'}
            onClick={() => void saveConfig()}
            className="bg-zinc-700 hover:bg-zinc-600 text-white text-[10px] font-bold px-4 py-2 rounded-lg"
          >
            {busy === 'config' ? 'Salvando…' : 'Salvar conexão'}
          </button>
          {!n8nOnline && (
            <p className="text-[10px] text-amber-300/90">
              n8n offline — rode <code className="text-amber-200">.\integrations\n8n\setup-n8n.ps1</code> na raiz do Lumiera.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3 min-h-[420px]">
          <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-rose-400" />
            Mapa de funcionamento Lumiera
          </p>
          <p className="text-[10px] text-zinc-500">
            Desative etapas aqui ou no n8n — use Sync para alinhar. Webhook inbound: <code className="text-zinc-400">POST /api/n8n/inbound</code>
          </p>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {orderedNodes.map((node, idx) => {
              const color = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.workflow;
              const showArrow = idx > 0 && node.phase > 0 && orderedNodes[idx - 1]?.phase !== node.phase;
              return (
                <React.Fragment key={node.id}>
                  {showArrow && (
                    <div className="flex justify-center py-0.5 text-zinc-700">
                      <ArrowDown className="w-4 h-4" />
                    </div>
                  )}
                  <div className={`rounded-xl border p-3 ${color} ${node.enabled ? '' : 'opacity-45'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold truncate">{node.label}</p>
                        <p className="text-[9px] opacity-70 font-mono truncate">{node.method} {node.path}</p>
                        <p className="text-[9px] opacity-60 mt-1 line-clamp-2">{node.description}</p>
                      </div>
                      <label className="flex items-center gap-1 shrink-0 text-[9px]">
                        <input
                          type="checkbox"
                          checked={node.enabled}
                          onChange={(e) => void toggleNode(node.id, e.target.checked)}
                        />
                        On
                      </label>
                    </div>
                    {node.lastRunAt && (
                      <p className={`text-[8px] mt-1.5 font-mono ${node.lastStatus === 'success' ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                        {node.lastStatus} · {new Date(node.lastRunAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 flex flex-col min-h-[420px] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
            <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-rose-400" />
              Editor n8n
            </p>
            {!n8nOnline && (
              <span className="text-[9px] text-amber-400">Inicie o n8n para embutir o editor</span>
            )}
          </div>
          {n8nOnline ? (
            <iframe
              title="n8n editor"
              src={iframeSrc}
              className="flex-1 w-full min-h-[380px] border-0 bg-zinc-950"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Workflow className="w-12 h-12 text-zinc-700" />
              <p className="text-sm text-zinc-400">n8n não está rodando na porta 5678</p>
              <p className="text-[10px] text-zinc-600 max-w-sm">
                Execute o script de setup para clonar o repositório oficial e subir o container Docker.
              </p>
              <code className="text-[10px] bg-zinc-900 px-3 py-2 rounded-lg text-rose-300">.\integrations\n8n\setup-n8n.ps1</code>
            </div>
          )}
        </div>
      </div>

      {(data?.events?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 max-h-36 overflow-y-auto font-mono text-[10px] space-y-1">
          <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1 sticky top-0 bg-zinc-950/95">Eventos (n8n ↔ Lumiera)</p>
          {data!.events!.map((ev) => (
            <div key={ev.id} className={ev.status === 'error' ? 'text-red-400' : 'text-zinc-400'}>
              <span className="text-zinc-600">{new Date(ev.at).toLocaleTimeString('pt-BR')}</span>
              {' '}
              {ev.action || ev.type}
              {ev.status ? ` · ${ev.status}` : ''}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}