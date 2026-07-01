import React, { useCallback, useEffect, useState } from 'react';
import {
  Cloud,
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Sparkles,
  Layers,
  Server,
  Key,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type McpTool = { name: string; desc: string };
type McpToolGroup = { group: string; tools: McpTool[] };
type PromptExample = { label: string; prompt: string };

type ComfyMcpStatus = {
  mcp_url?: string;
  api_base?: string;
  config?: {
    enabled?: boolean;
    has_api_key?: boolean;
    api_key_masked?: string;
    notes?: string;
  };
  cloud?: {
    connected?: boolean;
    error?: string | null;
    user?: { status?: string };
  };
  queue?: {
    running?: number;
    pending?: number;
    error?: string;
  } | null;
  local_comfyui?: {
    running?: boolean;
    installed?: boolean;
    port?: number;
  } | null;
  tools?: McpToolGroup[];
  prompts?: PromptExample[];
  install?: {
    cursor_config?: Record<string, unknown>;
    claude_command?: string;
    agent_prompt?: string;
    docs_url?: string;
    blog_url?: string;
    api_keys_url?: string;
    cloud_url?: string;
    skills_repo?: string;
  };
};

export function ComfyMcpPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [status, setStatus] = useState<ComfyMcpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [notes, setNotes] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/comfy-mcp/status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar');
      setStatus(data);
      setNotes(data.config?.notes || '');
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const saveConfig = async () => {
    setBusy('save');
    try {
      const body: Record<string, unknown> = { notes, enabled: true };
      if (apiKeyInput.trim()) body.api_key = apiKeyInput.trim();
      const res = await fetch('/api/comfy-mcp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setApiKeyInput('');
      await fetchStatus();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setBusy(null);
    }
  };

  const testConnection = async () => {
    setBusy('test');
    try {
      const res = await fetch('/api/comfy-mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiKeyInput.trim() ? { api_key: apiKeyInput.trim() } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na conexão');
      await fetchStatus();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Conexão falhou');
    } finally {
      setBusy(null);
    }
  };

  const connected = status?.cloud?.connected === true;
  const hasKey = status?.config?.has_api_key === true;
  const cursorJson = JSON.stringify(status?.install?.cursor_config || {}, null, 2);

  return (
    <div className="lumiera-panel-stack animate-fade-in max-w-5xl w-full mx-auto space-y-3 pb-8">
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {!embedded && (
            <SectionHeader
              title="Comfy Cloud MCP"
              helpId="tab-comfy-mcp"
              size="lg"
              icon={<Cloud className="w-6 h-6 text-sky-400 shrink-0" />}
              subtitle="Agente criativo na nuvem — imagem, vídeo, áudio e 3D via MCP. Sem GPU local obrigatória."
            />
          )}
          <button
            type="button"
            disabled={loading || !!busy}
            onClick={() => fetchStatus()}
            className={`p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-sky-500/30 hover:text-sky-300 transition disabled:opacity-40 ${embedded ? 'ml-auto' : ''}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Cloud MCP</div>
            <div className={`text-sm font-bold flex items-center gap-1 ${connected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {connected ? 'Conectado' : hasKey ? 'Erro auth' : 'Sem API key'}
            </div>
            <div className="text-[10px] text-zinc-500 truncate">{status?.cloud?.user?.status || status?.cloud?.error || '—'}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Fila cloud</div>
            <div className="text-sm font-bold text-zinc-200 tabular-nums">
              {status?.queue?.running ?? 0} run · {status?.queue?.pending ?? 0} pend.
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">ComfyUI local</div>
            <div className={`text-sm font-bold ${status?.local_comfyui?.running ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {status?.local_comfyui?.running ? `:${status.local_comfyui.port}` : 'Offline'}
            </div>
            <div className="text-[10px] text-zinc-500">LTX em Workflow</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">API key</div>
            <div className="text-sm font-mono text-zinc-300 truncate">
              {hasKey ? status?.config?.api_key_masked : 'não salva'}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          O MCP roda em <span className="text-zinc-400 font-mono">{status?.mcp_url || 'https://cloud.comfy.org/mcp'}</span>.
          Conecte no Cursor, Grok ou Claude — o agente usa templates, models e workflows na nuvem.
          O ComfyUI <strong className="text-zinc-400">local</strong> (aba Workflow) continua para LTX offline na RTX.
        </p>
      </div>

      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <SectionHeader
          title="Configuração"
          icon={<Key className="w-4 h-4 text-gold-500" />}
          subtitle="API key em config_qanat.json (workspace) — não commitar."
        />
        <div className="space-y-3">
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
            API Key (comfyui-…)
            <div className="mt-1 flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={hasKey ? 'Deixe vazio para manter a atual' : 'Cole a chave de platform.comfy.org'}
                className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs font-mono text-zinc-200 focus:border-sky-500/40 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="px-3 py-2 rounded-xl border border-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200"
              >
                {showKey ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
            Notas (opcional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-300 focus:border-sky-500/40 outline-none resize-none"
              placeholder="Ex.: conta do estúdio, projeto de thumbnails..."
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={saveConfig}
              className="px-4 py-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-xs font-bold text-sky-200 hover:bg-sky-500/25 transition disabled:opacity-50"
            >
              {busy === 'save' ? 'Salvando…' : 'Salvar config'}
            </button>
            <button
              type="button"
              disabled={!!busy || (!hasKey && !apiKeyInput.trim())}
              onClick={testConnection}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 hover:border-emerald-500/40 transition disabled:opacity-50"
            >
              {busy === 'test' ? 'Testando…' : 'Testar conexão'}
            </button>
            <a
              href={status?.install?.api_keys_url || 'https://platform.comfy.org/profile/api-keys'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-sky-300 transition"
            >
              Criar API key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <SectionHeader title="Cursor / MCP" icon={<Terminal className="w-4 h-4 text-violet-400" />} />
          <p className="text-[10px] text-zinc-500">
            Cole em <span className="font-mono text-zinc-400">.cursor/mcp.json</span> ou use o template em{' '}
            <span className="font-mono text-zinc-400">config/cursor-mcp-comfy.json</span>
          </p>
          <pre className="text-[9px] text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-xl p-3 overflow-x-auto max-h-48 font-mono">
            {cursorJson}
          </pre>
          <button
            type="button"
            onClick={() => copyText(cursorJson, 'cursor')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-[10px] font-bold text-zinc-300 hover:border-violet-500/30 transition"
          >
            <Copy className="w-3 h-3" />
            {copied === 'cursor' ? 'Copiado!' : 'Copiar JSON MCP'}
          </button>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <SectionHeader title="Claude Code / outros agentes" icon={<Sparkles className="w-4 h-4 text-amber-400" />} />
          <p className="text-[10px] text-zinc-500">Plugin recomendado: <span className="font-mono">comfy-cloud@comfy-skills</span></p>
          <pre className="text-[9px] text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-xl p-3 overflow-x-auto font-mono whitespace-pre-wrap">
            {status?.install?.claude_command}
          </pre>
          <button
            type="button"
            onClick={() => copyText(status?.install?.agent_prompt || '', 'agent')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-[10px] font-bold text-zinc-300 hover:border-amber-500/30 transition"
          >
            <Copy className="w-3 h-3" />
            {copied === 'agent' ? 'Copiado!' : 'Copiar prompt de instalação'}
          </button>
        </div>
      </div>

      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <SectionHeader
          title="Ferramentas MCP"
          icon={<Layers className="w-4 h-4 text-zinc-400" />}
          subtitle="O agente escolhe automaticamente — você pede em linguagem natural."
        />
        <div className="grid sm:grid-cols-3 gap-3">
          {(status?.tools ?? []).map((g) => (
            <div key={g.group} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-1.5">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{g.group}</div>
              {g.tools.map((t) => (
                <div key={t.name} className="text-[10px]">
                  <span className="font-mono text-sky-400/90">{t.name}</span>
                  <span className="text-zinc-600"> — </span>
                  <span className="text-zinc-500">{t.desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-3">
        <SectionHeader
          title="Exemplos para o agente"
          icon={<Server className="w-4 h-4 text-emerald-400" />}
          subtitle="Cole no chat do Cursor/Grok após conectar o MCP."
        />
        <div className="grid sm:grid-cols-2 gap-2">
          {(status?.prompts ?? []).map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => copyText(p.prompt, p.label)}
              className="text-left rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 hover:border-sky-500/25 transition group"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold text-zinc-300">{p.label}</span>
                <Copy className="w-3 h-3 text-zinc-600 group-hover:text-sky-400 shrink-0" />
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-3">{p.prompt}</p>
              {copied === p.label ? (
                <span className="text-[9px] text-emerald-500 mt-1 block">Copiado!</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px]">
        <a href={status?.install?.docs_url} target="_blank" rel="noopener noreferrer" className="text-sky-500/80 hover:text-sky-400 inline-flex items-center gap-1">
          Documentação <ExternalLink className="w-3 h-3" />
        </a>
        <a href={status?.install?.blog_url} target="_blank" rel="noopener noreferrer" className="text-sky-500/80 hover:text-sky-400 inline-flex items-center gap-1">
          Blog Comfy MCP <ExternalLink className="w-3 h-3" />
        </a>
        <a href={status?.install?.skills_repo} target="_blank" rel="noopener noreferrer" className="text-sky-500/80 hover:text-sky-400 inline-flex items-center gap-1">
          comfy-skills <ExternalLink className="w-3 h-3" />
        </a>
        <a href={status?.install?.cloud_url} target="_blank" rel="noopener noreferrer" className="text-sky-500/80 hover:text-sky-400 inline-flex items-center gap-1">
          cloud.comfy.org <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}