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
  X,
  CheckCircle2,
  AlertTriangle,
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
  baseline?: boolean;
};

type ObsidianStatus = {
  installed: boolean;
  vaultDir?: string;
  vaultName?: string;
  hubNote?: string;
  hubPath?: string;
  uri?: string;
  vaultUri?: string;
};

type QualityIssue = {
  code?: string;
  message: string;
  severity?: string;
};

type CapturedPattern = {
  category: string;
  description: string;
  increment?: number;
};

type CapturePreview = {
  action: 'capture' | 'reflect';
  score: number | null;
  niche: string;
  issues: QualityIssue[];
  patterns: CapturedPattern[];
  at: string;
};

type ConsolidatePromoteItem = {
  category: string;
  description: string;
  count: number;
};

type ConsolidateNichePreview = {
  niche: string;
  slug: string;
  toPromote: ConsolidatePromoteItem[];
  remainingCount: number;
  alreadyPromoted: number;
};

type ConsolidatePreview = {
  threshold: number;
  totalToPromote: number;
  niches: ConsolidateNichePreview[];
};

type StudioAgentsProps = {
  activeProject: string;
  projectNiche?: string;
  projectVideoFormat?: string;
  projectAspectRatio?: string;
  getProjectUrl: (endpoint: string) => string;
};

function resolveProjectFormat(videoFormat?: string, aspectRatio?: string): 'SHORT' | 'LONG' {
  const vf = String(videoFormat || '').toUpperCase();
  if (vf === 'SHORTS' || vf === 'SHORT') return 'SHORT';
  if (vf === 'LONGO' || vf === 'LONG') return 'LONG';
  return aspectRatio === '9:16' ? 'SHORT' : 'LONG';
}

export function StudioAgents({
  activeProject,
  projectNiche = 'Geral',
  projectVideoFormat,
  projectAspectRatio,
  getProjectUrl,
}: StudioAgentsProps) {
  const projectFormat = resolveProjectFormat(projectVideoFormat, projectAspectRatio);
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
  const [capturePreview, setCapturePreview] = useState<CapturePreview | null>(null);
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);
  const [consolidatePreview, setConsolidatePreview] = useState<ConsolidatePreview | null>(null);

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
        `/api/studio-agents/learnings?niche=${encodeURIComponent(projectNiche)}&task=overlay&format=${projectFormat}`,
      );
      const data = await res.json();
      if (res.ok) setLearnings(data.learnings || []);
    } catch {
      /* non-blocking */
    }
  }, [projectNiche, projectFormat]);

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

  const triggerObsidianUri = (uri?: string) => {
    if (!uri) return false;
    try {
      const anchor = document.createElement('a');
      anchor.href = uri;
      anchor.rel = 'noopener';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return true;
    } catch {
      return false;
    }
  };

  const buildVaultFileUri = (file: string) =>
    `obsidian://open?vault=.agents&file=${encodeURIComponent(file.replace(/\\/g, '/'))}`;

  const openObsidian = async (file = 'MEMORIA-LUMIERA.md') => {
    setBusy('obsidian');
    const fileUri = file === 'MEMORIA-LUMIERA.md' ? obsidian.uri : buildVaultFileUri(file);
    // Dispara URI no mesmo gesto do clique (antes do await) — senão o navegador bloqueia o protocolo
    const browserTriggered = triggerObsidianUri(fileUri || obsidian.vaultUri);
    try {
      const res = await fetch('/api/studio-agents/obsidian/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Falha ao abrir Obsidian');

      if (!browserTriggered) {
        triggerObsidianUri(data.uri || data.vaultUri || obsidian.uri);
      }

      toast.success(
        data.method === 'obsidian-exe-vault-dir' || data.method === 'obsidian-exe-path-uri'
          ? 'Obsidian aberto na pasta .agents/'
          : 'Obsidian aberto com a memória do Lumiera',
      );
    } catch (err: unknown) {
      if (!browserTriggered && (obsidian.uri || obsidian.vaultUri)) {
        triggerObsidianUri(obsidian.uri || obsidian.vaultUri);
        toast.success('Tentando abrir Obsidian pelo navegador…');
      } else {
        toast.error(err instanceof Error ? err.message : 'Erro ao abrir Obsidian');
      }
    } finally {
      setBusy(null);
    }
  };

  const runCaptureOrReflect = async (action: 'capture' | 'reflect') => {
    const label = action === 'capture' ? 'Captura' : 'Reflexão';
    setBusy(action);
    try {
      const res = await fetch(getProjectUrl(`/api/studio-agents/${action}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || `Falha em ${label}`);

      setCapturePreview({
        action,
        score: data.report?.score ?? data.run?.score ?? null,
        niche: data.run?.niche || projectNiche,
        issues: (data.report?.issues || []).slice(0, 15),
        patterns: data.patterns || [],
        at: data.run?.at || new Date().toISOString(),
      });

      toast.success(
        `${label} concluído — ${data.patterns?.length ?? 0} padrão(ões) registrado(s)`,
      );
      await fetchStatus();
      await fetchLearnings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Erro: ${label}`);
    } finally {
      setBusy(null);
    }
  };

  const openConsolidateModal = async () => {
    setBusy('consolidate-preview');
    try {
      const res = await fetch('/api/studio-agents/consolidate/preview');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Falha ao carregar prévia');
      setConsolidatePreview(data);
      setShowConsolidateModal(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao pré-visualizar consolidação');
    } finally {
      setBusy(null);
    }
  };

  const confirmConsolidate = async () => {
    setBusy('consolidate');
    try {
      const res = await fetch('/api/studio-agents/consolidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Falha na consolidação');

      const promoted = (data.results || []).reduce(
        (sum: number, r: { newlyPromoted?: number }) => sum + (r.newlyPromoted || 0),
        0,
      );
      toast.success(
        promoted > 0
          ? `Consolidação concluída — ${promoted} padrão(ões) promovido(s)`
          : 'Consolidação concluída — nenhuma promoção nova',
      );
      setShowConsolidateModal(false);
      setConsolidatePreview(null);
      await fetchStatus();
      await fetchLearnings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro na consolidação');
    } finally {
      setBusy(null);
    }
  };

  const runPlanOverlays = async () => {
    setBusy('plan-overlays');
    try {
      const res = await fetch(getProjectUrl('/api/studio-agents/plan-overlays'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hyperframes: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Falha no planejamento');
      toast.success(
        `${data.overlayCount ?? 0} overlays planejados${
          data.learningsApplied ? ' com memória do estúdio' : ''
        }`,
      );
      await fetchStatus();
      await fetchLearnings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro no planejamento');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="lumiera-panel-stack animate-fade-in max-w-5xl w-full mx-auto">
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
          Nicho: <span className="text-zinc-300">{projectNiche}</span>
          {' · '}
          Formato:{' '}
          <span className={projectFormat === 'SHORT' ? 'text-amber-400' : 'text-sky-400'}>
            {projectFormat === 'SHORT' ? 'Shorts 9:16' : 'Longo 16:9'}
          </span>
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => runCaptureOrReflect('capture')}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 hover:border-gold-500/40 hover:text-gold-400 transition disabled:opacity-50"
          >
            {busy === 'capture' ? 'Capturando…' : 'Capturar qualidade'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => runCaptureOrReflect('reflect')}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 hover:border-gold-500/40 hover:text-gold-400 transition disabled:opacity-50"
          >
            {busy === 'reflect' ? 'Refletindo…' : 'Refletir e aprender'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={openConsolidateModal}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 hover:border-emerald-500/40 hover:text-emerald-400 transition disabled:opacity-50"
          >
            {busy === 'consolidate-preview' ? 'Carregando…' : 'Consolidar memória'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={runPlanOverlays}
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

      {capturePreview && (
        <div className="glass-panel p-6 rounded-2xl space-y-4 border border-gold-500/20">
          <div className="flex items-start justify-between gap-3">
            <SectionHeader
              title={
                capturePreview.action === 'capture'
                  ? 'Resultado da captura'
                  : 'Resultado da reflexão'
              }
              icon={<CheckCircle2 className="w-4 h-4 text-gold-500" />}
              subtitle={`Nicho ${capturePreview.niche} · ${new Date(capturePreview.at).toLocaleString('pt-BR')}`}
            />
            <button
              type="button"
              onClick={() => setCapturePreview(null)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
              aria-label="Fechar preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500">Score </span>
              <span
                className={`font-bold tabular-nums ${
                  (capturePreview.score ?? 0) >= 80
                    ? 'text-emerald-400'
                    : (capturePreview.score ?? 0) >= 60
                      ? 'text-amber-400'
                      : 'text-red-400'
                }`}
              >
                {capturePreview.score ?? '—'}/100
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500">Padrões registrados </span>
              <span className="font-bold text-gold-400 tabular-nums">{capturePreview.patterns.length}</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500">Issues </span>
              <span className="font-bold text-zinc-300 tabular-nums">{capturePreview.issues.length}</span>
            </div>
          </div>

          {capturePreview.patterns.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                Padrões adicionados à memória
              </p>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {capturePreview.patterns.map((p, i) => (
                  <li
                    key={`${p.category}-${i}`}
                    className="text-xs px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-100/90"
                  >
                    <span className="text-amber-400/80 font-mono text-[10px]">[{p.category}]</span>{' '}
                    {p.description}
                    {p.increment && p.increment > 1 ? (
                      <span className="text-zinc-500 ml-1">(+{p.increment})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {capturePreview.issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                Issues de qualidade
              </p>
              <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                {capturePreview.issues.map((issue, i) => (
                  <li
                    key={`${issue.code || 'issue'}-${i}`}
                    className="text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/50 text-zinc-400 flex gap-2"
                  >
                    <AlertTriangle
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                        issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'
                      }`}
                    />
                    <span>
                      {issue.code ? (
                        <span className="text-zinc-500 font-mono text-[10px]">{issue.code}: </span>
                      ) : null}
                      {issue.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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
          title={`Aprendizados — ${projectNiche} (${projectFormat === 'SHORT' ? 'Shorts' : 'Longo'})`}
          helpId="agents-learnings"
          icon={<BookOpen className="w-4 h-4 text-gold-500" />}
          subtitle="Regras de sucesso do formato + padrões promovidos do nicho. Edite em Obsidian ou consolide aqui."
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
                  l.baseline
                    ? 'border-sky-500/25 bg-sky-500/5 text-sky-100/90'
                    : l.promoted
                      ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-100/90'
                      : 'border-zinc-800 bg-zinc-950/50 text-zinc-400'
                }`}
              >
                {l.baseline ? (
                  <span className="text-[9px] uppercase tracking-wider text-sky-400/80 mr-2">padrão</span>
                ) : null}
                {l.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {niches.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl space-y-3">
          <SectionHeader
            title="Memória por nicho"
            helpId="agents-niche-memory"
            subtitle="Clique em uma linha para abrir a nota do nicho no Obsidian."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="py-2 pr-4">Nicho</th>
                  <th className="py-2 pr-4">Runs</th>
                  <th className="py-2 pr-4">Promovidos</th>
                  <th className="py-2 pr-4">Candidatos</th>
                  <th className="py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {niches.map((n) => {
                  const isActiveNiche =
                    n.niche.toLowerCase() === projectNiche.toLowerCase() ||
                    n.slug === projectNiche.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return (
                    <tr
                      key={n.slug}
                      className={`border-b border-zinc-900 transition ${
                        isActiveNiche ? 'bg-gold-500/5' : ''
                      } ${obsidian.installed ? 'cursor-pointer hover:bg-violet-500/5' : ''}`}
                      onClick={() => {
                        if (obsidian.installed) openObsidian(`memory/${n.slug}.md`);
                      }}
                      title={
                        obsidian.installed
                          ? `Abrir memory/${n.slug}.md no Obsidian`
                          : 'Instale o Obsidian para abrir notas'
                      }
                    >
                      <td className={`py-2 pr-4 ${isActiveNiche ? 'text-gold-400 font-semibold' : 'text-zinc-300'}`}>
                        {n.niche}
                        {isActiveNiche ? (
                          <span className="ml-2 text-[9px] text-gold-500/70 uppercase">ativo</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{n.runs}</td>
                      <td className="py-2 pr-4 tabular-nums text-emerald-400">{n.promoted}</td>
                      <td className="py-2 pr-4 tabular-nums text-amber-400">{n.candidates}</td>
                      <td className="py-2 text-violet-400/60">
                        {obsidian.installed ? <BookOpen className="w-3.5 h-3.5" /> : null}
                      </td>
                    </tr>
                  );
                })}
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

      {showConsolidateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-panel rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-emerald-500/20 shadow-2xl">
            <div className="flex items-start justify-between gap-3 p-5 border-b border-zinc-800">
              <SectionHeader
                title="Confirmar consolidação"
                icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
                subtitle={
                  consolidatePreview
                    ? `Limiar: ${consolidatePreview.threshold} ocorrências`
                    : undefined
                }
              />
              <button
                type="button"
                onClick={() => {
                  setShowConsolidateModal(false);
                  setConsolidatePreview(null);
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition shrink-0"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {!consolidatePreview || consolidatePreview.totalToPromote === 0 ? (
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Nenhum candidato pronto para promover. Continue capturando qualidade até os
                  padrões atingirem <strong className="text-zinc-300">{config.promoteThreshold}</strong>{' '}
                  ocorrências.
                </p>
              ) : (
                <>
                  <p className="text-xs text-emerald-400/90 font-semibold">
                    {consolidatePreview.totalToPromote} padrão(ões) será(ão) promovido(s) em{' '}
                    {consolidatePreview.niches.length} nicho(s):
                  </p>
                  {consolidatePreview.niches.map((niche) => (
                    <div key={niche.slug} className="space-y-2">
                      <p className="text-xs font-bold text-zinc-300">
                        {niche.niche}
                        <span className="text-zinc-500 font-normal ml-2">
                          ({niche.toPromote.length} promovidos · {niche.remainingCount} ficam em observação)
                        </span>
                      </p>
                      <ul className="space-y-1.5">
                        {niche.toPromote.map((item, i) => (
                          <li
                            key={`${item.category}-${i}`}
                            className="text-xs px-3 py-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 text-emerald-100/90"
                          >
                            <span className="text-emerald-400/70 font-mono text-[10px]">
                              [{item.category}]
                            </span>{' '}
                            {item.description}
                            <span className="text-zinc-500 ml-1">(count: {item.count})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-3 p-5 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setShowConsolidateModal(false);
                  setConsolidatePreview(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  !!busy ||
                  !consolidatePreview ||
                  consolidatePreview.totalToPromote === 0
                }
                onClick={confirmConsolidate}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition disabled:opacity-40"
              >
                {busy === 'consolidate' ? 'Consolidando…' : 'Confirmar promoção'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}