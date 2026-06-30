import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bot,
  Brain,
  RefreshCw,
  Sparkles,
  Database,
  TrendingUp,
  BookOpen,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { SectionHeader, SectionLabel } from './SectionHeader';

type AgentConfig = {
  autoCaptureOnQualityCheck: boolean;
  applyLearningsInAgentMode: boolean;
  promoteThreshold: number;
};

type NicheMemory = {
  slug: string;
  niche: string;
  promoted: number;
  candidates: number;
  runs: number;
};

type LearningItem = {
  text: string;
  count: number;
  promoted: boolean;
  global?: boolean;
};

type ObsidianStatus = {
  installed: boolean;
  vaultDir?: string;
  vaultName?: string;
  hubNote?: string;
  hubPath?: string;
};

type StudioAgentsProps = {
  activeProject: string;
  projectNiche?: string;
  getProjectUrl: (endpoint: string) => string;
};

export function StudioAgents({ activeProject, projectNiche = 'Geral', getProjectUrl }: StudioAgentsProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [config, setConfig] = useState<AgentConfig>({
    autoCaptureOnQualityCheck: false,
    applyLearningsInAgentMode: true,
    promoteThreshold: 3,
  });
  const [niches, setNiches] = useState<NicheMemory[]>([]);
  const [totals, setTotals] = useState({ nicheFiles: 0, promoted: 0, candidates: 0 });
  const [learnings, setLearnings] = useState<LearningItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<{ date: string; content: string }[]>([]);
  const [obsidian, setObsidian] = useState<ObsidianStatus>({ installed: false });

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/studio-agents/status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar status');
      setConfig(data.config || config);
      setNiches(data.niches || []);
      setTotals(data.totals || totals);
      setRecentLogs(data.recentLogs || []);
      setObsidian(data.obsidian || { installed: false });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar Studio Agents');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLearnings = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/studio-agents/learnings?niche=${encodeURIComponent(projectNiche)}&task=overlay`,
      );
      const data = await res.json();
      if (res.ok) setLearnings(data.learnings || []);
    } catch {
      /* non-blocking */
    }
  }, [projectNiche]);

  useEffect(() => {
    fetchStatus();
    fetchLearnings();
  }, [fetchStatus, fetchLearnings]);

  const saveConfig = async (patch: Partial<AgentConfig>) => {
    setBusy('config');
    try {
      const res = await fetch('/api/studio-agents/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setConfig(data.config);
      toast.success('Configuração salva');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar config');
    } finally {
      setBusy(null);
    }
  };

  const openObsidian = async (file = 'MEMORIA-LUMIERA.md') => {
    setBusy('obsidian');
    try {
      const res = await fetch('/api/studio-agents/obsidian/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Falha ao abrir Obsidian');
      toast.success('Obsidian aberto com a memória do Lumiera');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao abrir Obsidian');
    } finally {
      setBusy(null);
    }
  };

  const runAction = async (
    action: 'capture' | 'reflect' | 'consolidate' | 'plan-overlays',
    label: string,
  ) => {
    setBusy(action);
    try {
      const url =
        action === 'consolidate'
          ? '/api/studio-agents/consolidate'
          : getProjectUrl(`/api/studio-agents/${action}`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'plan-overlays' ? JSON.stringify({ hyperframes: true }) : '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Falha em ${label}`);
      toast.success(
        action === 'plan-overlays'
          ? `${data.overlayCount ?? 0} overlays planejados com memória do estúdio`
          : `${label} concluído`,
      );
      await fetchStatus();
      await fetchLearnings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Erro: ${label}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader
          title="Studio Agents"
          helpId="agents-overview"
          size="lg"
          icon={<Bot className="w-7 h-7 text-gold-500 shrink-0" />}
          subtitle="Área separada do fluxo normal. Captura padrões de qualidade por projeto, consolida aprendizados por nicho e aplica memória só quando você usa as ações desta aba."
        />
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={!!busy || !obsidian.installed}
            onClick={() => openObsidian()}
            title={obsidian.installed ? 'Abrir vault .agents no Obsidian' : 'Instale o Obsidian em obsidian.md'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-bold hover:border-violet-400/50 hover:text-violet-200 transition disabled:opacity-40"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {busy === 'obsidian' ? 'Abrindo…' : 'Abrir no Obsidian'}
          </button>
          <button
            type="button"
            onClick={() => { fetchStatus(); fetchLearnings(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs font-bold hover:border-gold-500/30 hover:text-gold-400 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader
          title="Memória visual (Obsidian)"
          helpId="agents-obsidian"
          icon={<BookOpen className="w-5 h-5 text-violet-400 shrink-0" />}
          subtitle="As notas em .agents/ são um vault Obsidian. Edite MEMORY.md, memória por nicho e logs com wikilinks e grafo."
        />
        <div className="flex flex-col gap-2 text-[10px] text-zinc-500 font-mono min-w-0">
          <span className="break-all">{obsidian.vaultDir || '.agents/'}</span>
          {obsidian.installed ? (
            <span className="text-emerald-400/90">Obsidian detectado</span>
          ) : (
            <a
              href="https://obsidian.md/download"
              target="_blank"
              rel="noreferrer"
              className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
            >
              Baixar Obsidian <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-gold-500 mb-2">
            <Database className="w-4 h-4" />
            <SectionLabel helpId="agents-stats" className="text-[10px] uppercase tracking-widest font-bold text-gold-500">
              Nichos
            </SectionLabel>
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">{totals.nicheFiles}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Promovidos</span>
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">{totals.promoted}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Brain className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Em observação</span>
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">{totals.candidates}</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <SectionHeader
          title={`Ações — projeto ativo: ${activeProject}`}
          helpId="agents-actions"
          icon={<Zap className="w-4 h-4 text-gold-500" />}
        />
        <p className="text-[11px] text-zinc-500">
          Nicho detectado: <span className="text-zinc-300">{projectNiche}</span>
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => runAction('capture', 'Captura')}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 hover:border-gold-500/40 hover:text-gold-400 transition disabled:opacity-50"
          >
            {busy === 'capture' ? 'Capturando…' : 'Capturar qualidade'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => runAction('reflect', 'Reflexão')}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 hover:border-gold-500/40 hover:text-gold-400 transition disabled:opacity-50"
          >
            {busy === 'reflect' ? 'Refletindo…' : 'Refletir e aprender'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => runAction('consolidate', 'Consolidação')}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 hover:border-emerald-500/40 hover:text-emerald-400 transition disabled:opacity-50"
          >
            {busy === 'consolidate' ? 'Consolidando…' : 'Consolidar memória'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => runAction('plan-overlays', 'Planejamento')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500/20 to-amber-500/10 border border-gold-500/40 text-xs font-bold text-gold-400 hover:from-gold-500/30 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {busy === 'plan-overlays' ? 'Planejando…' : 'Planejar overlays (com memória)'}
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          O botão &quot;Planejar overlays&quot; grava em <code className="text-zinc-500">overlays_ai</code> como o fluxo
          normal, mas injeta aprendizados do estúdio. O render padrão continua igual se você não usar esta aba.
        </p>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <SectionHeader title="Configuração" helpId="agents-config" />
        <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.applyLearningsInAgentMode}
            onChange={(e) => saveConfig({ applyLearningsInAgentMode: e.target.checked })}
            className="rounded border-zinc-700"
          />
          Aplicar aprendizados no modo Studio Agents
        </label>
        <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.autoCaptureOnQualityCheck}
            onChange={(e) => saveConfig({ autoCaptureOnQualityCheck: e.target.checked })}
            className="rounded border-zinc-700"
          />
          Captura automática ao verificar qualidade (experimental)
        </label>
        <div className="flex items-center gap-3 text-xs text-zinc-300">
          <span>Promover após</span>
          <input
            type="number"
            min={2}
            max={10}
            value={config.promoteThreshold}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 2 && v <= 10) saveConfig({ promoteThreshold: v });
            }}
            className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center"
          />
          <span>ocorrências</span>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-3">
        <SectionHeader
          title={`Aprendizados para "${projectNiche}"`}
          helpId="agents-learnings"
          icon={<BookOpen className="w-4 h-4 text-gold-500" />}
        />
        {learnings.length === 0 ? (
          <p className="text-xs text-zinc-500">
            Nenhum aprendizado ainda. Capture qualidade de alguns renders e consolide a memória.
          </p>
        ) : (
          <ul className="space-y-2">
            {learnings.map((l, i) => (
              <li
                key={`${l.text}-${i}`}
                className={`text-xs px-3 py-2 rounded-lg border ${
                  l.promoted
                    ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-100/90'
                    : 'border-zinc-800 bg-zinc-950/50 text-zinc-400'
                }`}
              >
                {l.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {niches.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl space-y-3">
          <SectionHeader title="Memória por nicho" helpId="agents-niche-memory" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="py-2 pr-4">Nicho</th>
                  <th className="py-2 pr-4">Runs</th>
                  <th className="py-2 pr-4">Promovidos</th>
                  <th className="py-2">Candidatos</th>
                </tr>
              </thead>
              <tbody>
                {niches.map((n) => (
                  <tr key={n.slug} className="border-b border-zinc-900 text-zinc-300">
                    <td className="py-2 pr-4">{n.niche}</td>
                    <td className="py-2 pr-4 tabular-nums">{n.runs}</td>
                    <td className="py-2 pr-4 tabular-nums text-emerald-400">{n.promoted}</td>
                    <td className="py-2 tabular-nums text-amber-400">{n.candidates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recentLogs.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl space-y-2">
          <SectionHeader title="Log recente" helpId="agents-log" />
          {recentLogs.slice(0, 2).map((log) => (
            <pre
              key={log.date}
              className="text-[10px] text-zinc-500 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto"
            >
              {log.content.slice(0, 1200)}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
}