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
  Layers,
  Package,
  Play,
  Settings,
} from 'lucide-react';

type StudioAgentsSection = 'automacao' | 'qualidade' | 'memoria' | 'skills';
import { SectionHeader, SectionLabel } from './SectionHeader';
import { VideoAgentPlanner } from './VideoAgentPlanner';
import type { GeminiBrowserRequest } from './geminiAiFetch';

type AgentConfig = {
  autoCaptureOnQualityCheck: boolean;
  applyLearningsInAgentMode: boolean;
  promoteThreshold: number;
  skillsInAgentMode?: boolean;
  skillsWriteApproval?: boolean;
  skillBundleByTask?: Record<string, string>;
};

type SkillIndexItem = {
  name: string;
  slug: string;
  description: string;
  category?: string;
  tasks?: string[];
  formats?: string[];
};

type SkillBundle = {
  slug: string;
  name: string;
  description: string;
  skills: string[];
  tasks?: string[];
  formats?: string[];
};

type SkillWorkshopProposal = {
  id: string;
  skill: string;
  action: string;
  summary?: string;
  createdAt?: string;
};

type SkillsRegistryStatus = {
  skillsCount: number;
  bundlesCount: number;
  pendingProposals: number;
  skillsInAgentMode: boolean;
  skillsWriteApproval: boolean;
  skillBundleByTask?: Record<string, string>;
  skills?: SkillIndexItem[];
  bundles?: SkillBundle[];
  pending?: SkillWorkshopProposal[];
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

type VaultGraphStatus = {
  total: number;
  connected: number;
  orphans: number;
  orphanFiles?: string[];
  repaired?: number;
};

type ObsidianStatus = {
  installed: boolean;
  vaultDir?: string;
  vaultName?: string;
  hubNote?: string;
  hubPath?: string;
  uri?: string;
  vaultUri?: string;
  graph?: VaultGraphStatus;
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

type WorkshopStaged = {
  staged?: boolean;
  id?: string;
  record?: { summary?: string; skill?: string };
};

type CapturePreview = {
  action: 'capture' | 'reflect';
  score: number | null;
  niche: string;
  issues: QualityIssue[];
  patterns: CapturedPattern[];
  at: string;
  workshop?: WorkshopStaged | null;
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
  onNavigateTab?: (tab: string) => void;
  postAi: (
    path: string,
    init?: RequestInit,
  ) => Promise<{ ok: boolean; status: number; data: GeminiBrowserRequest & Record<string, unknown> }>;
  onExecuteCreator?: (
    title: string,
    hook: string,
    options?: { format?: 'LONGO' | 'SHORTS' },
  ) => Promise<void>;
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
  onNavigateTab,
  postAi,
  onExecuteCreator,
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
  const [skillsRegistry, setSkillsRegistry] = useState<SkillsRegistryStatus | null>(null);
  const [capturePreview, setCapturePreview] = useState<CapturePreview | null>(null);
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);
  const [consolidatePreview, setConsolidatePreview] = useState<ConsolidatePreview | null>(null);
  const [section, setSection] = useState<StudioAgentsSection>('automacao');

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
      setSkillsRegistry(data.skills || null);
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

  const repairObsidianGraph = async () => {
    setBusy('graph-repair');
    try {
      const res = await fetch('/api/studio-agents/obsidian/repair-graph', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Falha ao reparar grafo');
      toast.success(
        `Grafo reparado — ${data.repaired ?? 0} nota(s) ligada(s) ao hub · ${data.orphans ?? 0} órfã(s)`,
      );
      await fetchStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao reparar grafo');
    } finally {
      setBusy(null);
    }
  };

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
        data.method?.startsWith('windows-start') || data.method === 'obsidian-exe-vault-dir'
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
        workshop: data.workshop || null,
      });

      setSection('qualidade');
      toast.success(
        `${label} concluído — ${data.patterns?.length ?? 0} padrão(ões) registrado(s)`,
      );
      if (data.workshop?.staged) {
        toast(
          `Workshop: proposta para skill "${data.workshop.record?.skill || 'estúdio'}" — revise acima`,
          { duration: 7000, icon: '🔧' },
        );
      }
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

  const bundleMap = config.skillBundleByTask || skillsRegistry?.skillBundleByTask || {};

  const bundlesForTask = (task: string, format?: 'SHORT' | 'LONG') => {
    const list = skillsRegistry?.bundles || [];
    return list.filter((b) => {
      const taskOk = !b.tasks?.length || b.tasks.includes(task);
      const fmtOk = !format || !b.formats?.length || b.formats.includes(format);
      return taskOk && fmtOk;
    });
  };

  const saveBundleMapping = (key: string, slug: string) => {
    saveConfig({
      skillBundleByTask: {
        ...(config.skillBundleByTask || skillsRegistry?.skillBundleByTask || {}),
        [key]: slug,
      },
    });
  };

  const bundleSelectRow = (
    label: string,
    mapKey: string,
    task: string,
    format?: 'SHORT' | 'LONG',
  ) => {
    const options = bundlesForTask(task, format);
    const value = bundleMap[mapKey] || '';
    return (
      <label key={mapKey} className="flex flex-col gap-1 text-xs text-zinc-300">
        <span className="text-zinc-500">{label}</span>
        <select
          value={value}
          disabled={!!busy || options.length === 0}
          onChange={(e) => saveBundleMapping(mapKey, e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] font-mono text-zinc-200"
        >
          {options.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
    );
  };

  const runWorkshopAction = async (id: string, action: 'apply' | 'reject') => {
    setBusy(`workshop-${action}`);
    try {
      const res = await fetch(`/api/studio-agents/skill-workshop/${id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Falha no workshop');
      toast.success(
        action === 'apply'
          ? data.skipped
            ? 'Aprendizado já estava na skill — proposta arquivada'
            : 'Skill atualizada — não vai reaparecer para este projeto'
          : 'Proposta descartada — não vai reaparecer',
      );
      await fetchStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro no workshop');
    } finally {
      setBusy(null);
    }
  };

  const workshopPending = skillsRegistry?.pendingProposals ?? 0;
  const graphOrphans = obsidian.graph?.orphans ?? 0;

  const sectionTabs: Array<{
    id: StudioAgentsSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    { id: 'automacao', label: 'Automação', icon: <Play className="w-3 h-3" /> },
    {
      id: 'qualidade',
      label: 'Qualidade',
      icon: <Zap className="w-3 h-3" />,
      badge: capturePreview ? 1 : undefined,
    },
    {
      id: 'memoria',
      label: 'Memória',
      icon: <Database className="w-3 h-3" />,
      badge: graphOrphans > 0 ? graphOrphans : undefined,
    },
    {
      id: 'skills',
      label: 'Skills',
      icon: <Layers className="w-3 h-3" />,
      badge: workshopPending > 0 ? workshopPending : undefined,
    },
  ];

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
          data.learningsApplied ? ' com memória + skills do estúdio' : ''
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
    <div className="lumiera-panel-stack animate-fade-in max-w-5xl w-full mx-auto space-y-3">
      <div className="glass-panel p-4 sm:p-5 rounded-2xl space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeader
            title="Studio Agents"
            helpId="agents-overview"
            size="lg"
            icon={<Bot className="w-6 h-6 text-gold-500 shrink-0" />}
            subtitle="Memória do estúdio, automação VideoAgent e qualidade por projeto."
          />
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={!!busy || !obsidian.installed}
              onClick={() => openObsidian()}
              title="Abrir vault .agents"
              className="p-2 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:border-violet-400/50 transition disabled:opacity-40"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={repairObsidianGraph}
              title="Reparar grafo Obsidian"
              className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-400/50 transition disabled:opacity-40"
            >
              <Brain className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { fetchStatus(); fetchLearnings(); }}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-gold-500/30 hover:text-gold-400 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
          <span>
            Projeto: <span className="text-zinc-300 font-mono">{activeProject}</span>
          </span>
          <span className="text-zinc-700">·</span>
          <span>
            Nicho: <span className="text-zinc-300">{projectNiche}</span>
          </span>
          <span className="text-zinc-700">·</span>
          <span className={projectFormat === 'SHORT' ? 'text-amber-400' : 'text-sky-400'}>
            {projectFormat === 'SHORT' ? 'Shorts' : 'Longo'}
          </span>
          <span className="text-zinc-700">·</span>
          <span className="tabular-nums">
            <span className="text-gold-400">{totals.nicheFiles}</span> nichos
            {' · '}
            <span className="text-emerald-400">{totals.promoted}</span> promovidos
            {' · '}
            <span className="text-amber-400">{totals.candidates}</span> em observação
          </span>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-colors min-w-0 ${
                section === tab.id
                  ? tab.id === 'automacao'
                    ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/25'
                    : 'bg-gold-500/12 text-gold-300 border border-gold-500/25'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
              {tab.badge != null && tab.badge > 0 ? (
                <span className="min-w-[14px] px-1 py-0.5 rounded-full bg-zinc-800 text-[8px] tabular-nums shrink-0">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {section === 'automacao' && (
        <VideoAgentPlanner
          projectNiche={projectNiche}
          projectFormat={projectFormat}
          getProjectUrl={getProjectUrl}
          postAi={postAi}
          onNavigateTab={onNavigateTab}
          onOpenObsidian={openObsidian}
          obsidianInstalled={obsidian.installed}
          onExecuteCreator={onExecuteCreator}
        />
      )}

      {section === 'qualidade' && (
        <>
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <SectionHeader
          title="Qualidade do projeto"
          helpId="agents-actions"
          icon={<Zap className="w-4 h-4 text-gold-500" />}
          subtitle="Captura, reflexão e overlays com memória do estúdio injetada."
        />
        <div className="flex flex-wrap gap-2">
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
          normal, mas injeta aprendizados do estúdio e o bundle de skills (Hermes/OpenClaw). O render padrão continua
          igual se você não usar esta aba.
        </p>
      </div>

      {capturePreview ? (
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
            {capturePreview.workshop?.staged ? (
              <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <span className="text-amber-400/90">Workshop </span>
                <span className="font-mono text-[10px]">{capturePreview.workshop.record?.skill}</span>
              </div>
            ) : null}
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
      ) : null}

      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-3">
        <SectionHeader
          title={`Aprendizados — ${projectNiche}`}
          helpId="agents-learnings"
          icon={<BookOpen className="w-4 h-4 text-gold-500" />}
          subtitle={`Formato ${projectFormat === 'SHORT' ? 'Shorts' : 'Longo'} · edite em Obsidian ou consolide acima.`}
        />
        {learnings.length === 0 ? (
          <p className="text-xs text-zinc-500">
            Nenhum aprendizado ainda. Capture qualidade de alguns renders e consolide a memória.
          </p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
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
        </>
      )}

      {section === 'memoria' && (
        <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center gap-1.5 text-gold-500 mb-1">
            <Database className="w-3.5 h-3.5" />
            <SectionLabel helpId="agents-stats" className="text-[9px] uppercase tracking-widest font-bold text-gold-500">
              Nichos
            </SectionLabel>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{totals.nicheFiles}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-[9px] uppercase tracking-widest font-bold">Promovidos</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{totals.promoted}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center gap-1.5 text-amber-400 mb-1">
            <Brain className="w-3.5 h-3.5" />
            <span className="text-[9px] uppercase tracking-widest font-bold">Observação</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{totals.candidates}</p>
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SectionHeader
          title="Obsidian"
          helpId="agents-obsidian"
          icon={<BookOpen className="w-4 h-4 text-violet-400 shrink-0" />}
          subtitle="Vault .agents/ — memória visual com wikilinks e grafo."
        />
        <div className="flex flex-col gap-1 text-[10px] text-zinc-500 font-mono min-w-0 sm:text-right">
          <span className="break-all">{obsidian.vaultDir || '.agents/'}</span>
          {obsidian.graph ? (
            <span className={obsidian.graph.orphans === 0 ? 'text-emerald-400/90' : 'text-amber-400/90'}>
              Grafo: {obsidian.graph.connected}/{obsidian.graph.total}
              {obsidian.graph.orphans > 0 ? ` · ${obsidian.graph.orphans} órfã(s)` : ''}
            </span>
          ) : null}
          {obsidian.installed ? (
            <button
              type="button"
              onClick={() => openObsidian('memory/videoagent-lumiera.md')}
              className="text-left sm:text-right text-violet-400 hover:text-violet-300"
            >
              Abrir videoagent-lumiera.md →
            </button>
          ) : (
            <a
              href="https://obsidian.md/download"
              target="_blank"
              rel="noreferrer"
              className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 sm:justify-end"
            >
              Baixar Obsidian <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {niches.length > 0 && (
        <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-3">
          <SectionHeader
            title="Memória por nicho"
            helpId="agents-niche-memory"
            subtitle="Clique na linha para abrir a nota no Obsidian."
          />
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-zinc-950/95 backdrop-blur-sm z-10">
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="py-2 pr-4">Nicho</th>
                  <th className="py-2 pr-4">Runs</th>
                  <th className="py-2 pr-4">Prom.</th>
                  <th className="py-2 pr-4">Cand.</th>
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
                    >
                      <td className={`py-2 pr-4 ${isActiveNiche ? 'text-gold-400 font-semibold' : 'text-zinc-300'}`}>
                        {n.niche}
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
        <div className="glass-panel p-5 rounded-2xl space-y-2">
          <SectionHeader title="Log recente" helpId="agents-log" />
          {recentLogs.slice(0, 2).map((log) => (
            <pre
              key={log.date}
              className="text-[10px] text-zinc-500 whitespace-pre-wrap font-mono max-h-28 overflow-y-auto"
            >
              {log.content.slice(0, 1200)}
            </pre>
          ))}
        </div>
      )}
        </>
      )}

      {section === 'skills' && !skillsRegistry && (
        <div className="glass-panel p-6 rounded-2xl text-xs text-zinc-500 text-center">
          Carregando skills…
        </div>
      )}

      {section === 'skills' && skillsRegistry && (
        <>
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <SectionHeader
          title="Skills (Hermes / OpenClaw)"
          helpId="agents-skills"
          icon={<Layers className="w-4 h-4 text-sky-400 shrink-0" />}
          subtitle="Bundles carregados sob demanda nos prompts do estúdio."
        />
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
            Skills <span className="font-bold tabular-nums">{skillsRegistry.skillsCount}</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
            Bundles <span className="font-bold tabular-nums">{skillsRegistry.bundlesCount}</span>
          </span>
          {bundleMap.overlay ? (
            <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-200 text-[10px]">
              <Package className="w-3 h-3 inline mr-1 opacity-70" />
              overlay → <span className="font-mono">{bundleMap.overlay}</span>
            </span>
          ) : null}
          {skillsRegistry.skillsInAgentMode ? (
            <span className="text-emerald-400/90 text-[10px]">Injeção ativa</span>
          ) : (
            <span className="text-amber-400/90 text-[10px]">Injeção desligada</span>
          )}
        </div>
        {skillsRegistry.bundles && skillsRegistry.bundles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {skillsRegistry.bundles.map((b) => (
              <div
                key={b.slug}
                className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/80 text-[11px]"
              >
                <p className="font-bold text-zinc-200">{b.name}</p>
                <p className="text-zinc-500 mt-0.5 line-clamp-2">{b.description}</p>
              </div>
            ))}
          </div>
        )}
        {skillsRegistry.pending && skillsRegistry.pending.length > 0 && (
          <div className="space-y-2 border-t border-zinc-800 pt-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-amber-400">
              Workshop — {skillsRegistry.pending.length} pendente(s)
            </p>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {skillsRegistry.pending.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5"
                >
                  <span className="text-xs text-amber-100/90">
                    <span className="font-mono text-amber-400">{p.skill}</span>
                    {p.summary ? ` — ${p.summary}` : ` (${p.action})`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => runWorkshopAction(p.id, 'apply')}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    >
                      Aplicar
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => runWorkshopAction(p.id, 'reject')}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700"
                    >
                      Rejeitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <SectionHeader title="Configuração" helpId="agents-config" icon={<Settings className="w-4 h-4 text-zinc-400" />} />
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
            checked={config.skillsInAgentMode !== false}
            onChange={(e) => saveConfig({ skillsInAgentMode: e.target.checked })}
            className="rounded border-zinc-700"
          />
          Injetar skills bundle nos prompts (Hermes)
        </label>
        <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.skillsWriteApproval !== false}
            onChange={(e) => saveConfig({ skillsWriteApproval: e.target.checked })}
            className="rounded border-zinc-700"
          />
          Workshop com aprovação antes de gravar skills
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
        <div className="border-t border-zinc-800 pt-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
            Bundles por tarefa (Hermes)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bundleSelectRow('Overlays', 'overlay', 'overlay')}
            {bundleSelectRow('Ideias Short', 'ideas', 'ideas', 'SHORT')}
            {bundleSelectRow('Ideias Longo', 'ideas:LONG', 'ideas', 'LONG')}
            {bundleSelectRow('Roteiro Short', 'script', 'script', 'SHORT')}
            {bundleSelectRow('Roteiro Longo', 'script:LONG', 'script', 'LONG')}
            {bundleSelectRow('Metadados / upload', 'metadata', 'metadata')}
          </div>
        </div>
      </div>
        </>
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