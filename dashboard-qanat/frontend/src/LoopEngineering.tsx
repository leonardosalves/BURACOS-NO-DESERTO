import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Gauge,
  RefreshCw,
  Repeat,
  Sparkles,
  Zap,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type LoopPattern = {
  id: string;
  name: string;
  cadence: string;
  risk: string;
  tokenCost: string;
  stateFile: string;
  description: string;
};

type LoopAudit = {
  score?: number;
  level?: string;
  assessment?: string;
  findings?: Array<{ level: string; message: string }>;
  recommendations?: string[];
  error?: string;
};

type LoopSync = {
  score?: number;
  issueCount?: number;
  issues?: Array<{ severity?: string; message: string }>;
  healthy?: boolean;
  error?: string;
};

type LoopCost = {
  pattern?: string;
  level?: string;
  realisticBlendDaily?: number;
  suggestedDailyCap?: number;
  daily?: Record<string, unknown>;
  error?: string;
};

type LoopFile = {
  name: string;
  exists: boolean;
  mtime?: string | null;
};

type LoopStatus = {
  installed: boolean;
  activePattern: string;
  pattern: LoopPattern;
  patterns: LoopPattern[];
  files: LoopFile[];
  lastRun?: string | null;
  stateFile?: string;
  loopSkillCount?: number;
  audit?: LoopAudit | null;
  sync?: LoopSync | null;
  cost?: LoopCost | null;
  firstLoopCommand?: { tool: string; command: string };
  lumieraLinks?: Record<string, string>;
  error?: string;
};

type LoopEngineeringProps = {
  busy: string | null;
  setBusy: (v: string | null) => void;
  onOpenObsidian?: (file: string) => void;
  obsidianInstalled?: boolean;
  initialStatus?: LoopStatus | null;
};

function scoreColor(score: number | undefined) {
  if (score == null) return 'text-zinc-500';
  if (score >= 90) return 'text-emerald-400';
  if (score >= 70) return 'text-amber-400';
  return 'text-rose-400';
}

function formatTokens(n: number | undefined | null) {
  if (n == null) return '—';
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export function LoopEngineering({
  busy,
  setBusy,
  onOpenObsidian,
  obsidianInstalled,
  initialStatus,
}: LoopEngineeringProps) {
  const [status, setStatus] = useState<LoopStatus | null>(initialStatus ?? null);
  const [loading, setLoading] = useState(!initialStatus);
  const [selectedPattern, setSelectedPattern] = useState('changelog-drafter');
  const [costLevel, setCostLevel] = useState<'L1' | 'L2' | 'L3'>('L1');
  const auditBootstrapped = useRef(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/studio-agents/loops/status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar loops');
      setStatus(data);
      if (data.activePattern) setSelectedPattern(data.activePattern);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar Loop Engineering');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialStatus) fetchStatus();
  }, [fetchStatus, initialStatus]);

  useEffect(() => {
    if (auditBootstrapped.current || loading || busy) return;
    auditBootstrapped.current = true;
    runAudit(false);
    runSync();
    fetchCost();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap CLI metrics once
  }, [loading, busy]);

  useEffect(() => {
    if (initialStatus) setStatus(initialStatus);
  }, [initialStatus]);

  const runAudit = async (suggest = false) => {
    setBusy('loop-audit');
    try {
      const res = await fetch('/api/studio-agents/loops/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggest }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Audit falhou');
      setStatus((prev) => (prev ? { ...prev, audit: data.audit } : prev));
      toast.success(`Loop Ready: ${data.audit?.score ?? '?'}/100 (${data.audit?.level ?? '—'})`);
      if (!suggest) await fetchStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro no audit');
    } finally {
      setBusy(null);
    }
  };

  const runSync = async () => {
    setBusy('loop-sync');
    try {
      const res = await fetch('/api/studio-agents/loops/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Sync falhou');
      setStatus((prev) => (prev ? { ...prev, sync: data.sync } : prev));
      toast.success(`Sync: ${data.sync?.score ?? '?'}/100`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro no sync');
    } finally {
      setBusy(null);
    }
  };

  const fetchCost = async (pattern = selectedPattern, level = costLevel) => {
    setBusy('loop-cost');
    try {
      const res = await fetch(
        `/api/studio-agents/loops/cost?pattern=${encodeURIComponent(pattern)}&level=${level}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Cost falhou');
      setStatus((prev) => (prev ? { ...prev, cost: data.cost } : prev));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro na estimativa');
    } finally {
      setBusy(null);
    }
  };

  const initPattern = async () => {
    if (!window.confirm(`Scaffold do pattern "${selectedPattern}" com Grok? Arquivos existentes podem ser atualizados.`)) {
      return;
    }
    setBusy('loop-init');
    try {
      const res = await fetch('/api/studio-agents/loops/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: selectedPattern, tool: 'grok' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Init falhou');
      toast.success(`Pattern ${selectedPattern} scaffolded`);
      if (data.status) setStatus(data.status);
      else await fetchStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro no init');
    } finally {
      setBusy(null);
    }
  };

  const copyCommand = () => {
    const cmd = status?.firstLoopCommand?.command;
    if (!cmd) return;
    navigator.clipboard.writeText(cmd).then(
      () => toast.success('Comando /loop copiado'),
      () => toast.error('Não foi possível copiar'),
    );
  };

  const audit = status?.audit;
  const sync = status?.sync;
  const cost = status?.cost;
  const auditScore = audit?.score ?? null;

  return (
    <div className="space-y-3">
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeader
            title="Loop Engineering"
            helpId="agents-loops"
            icon={<Repeat className="w-4 h-4 text-cyan-400" />}
            subtitle="Design the loop — audit, sync, budget e patterns do cobusgreyling/loop-engineering."
          />
          <button
            type="button"
            disabled={!!busy || loading}
            onClick={() => fetchStatus()}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500/30 hover:text-cyan-300 transition disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Loop Ready</div>
            <div className={`text-xl font-bold tabular-nums ${scoreColor(auditScore ?? undefined)}`}>
              {auditScore != null ? `${auditScore}/100` : '—'}
            </div>
            <div className="text-[10px] text-zinc-500">{audit?.level ?? 'rodar audit'}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Sync</div>
            <div className={`text-xl font-bold tabular-nums ${scoreColor(sync?.score)}`}>
              {sync?.score != null ? `${sync.score}/100` : '—'}
            </div>
            <div className="text-[10px] text-zinc-500">
              {sync?.healthy ? 'healthy' : sync?.issueCount ? `${sync.issueCount} issue(s)` : 'rodar sync'}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Custo/dia</div>
            <div className="text-xl font-bold tabular-nums text-violet-300">
              {formatTokens(cost?.realisticBlendDaily ?? (cost?.daily as { realistic_blend?: number })?.realistic_blend)}
            </div>
            <div className="text-[10px] text-zinc-500">cap {formatTokens(cost?.suggestedDailyCap)}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Pattern</div>
            <div className="text-sm font-bold text-cyan-200 truncate">{status?.pattern?.name ?? '—'}</div>
            <div className="text-[10px] text-zinc-500 truncate">{status?.lastRun ?? 'Last run: never'}</div>
          </div>
        </div>

        {auditScore != null && (
          <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-emerald-500 transition-all"
              style={{ width: `${Math.min(100, auditScore)}%` }}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => runAudit(false)}
            className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/20 transition disabled:opacity-50"
          >
            {busy === 'loop-audit' ? 'Auditando…' : 'Loop Audit'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={runSync}
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-zinc-200 hover:border-violet-500/40 transition disabled:opacity-50"
          >
            {busy === 'loop-sync' ? 'Sync…' : 'Sync STATE ↔ LOOP'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => fetchCost()}
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-zinc-200 hover:border-violet-500/40 transition disabled:opacity-50"
          >
            {busy === 'loop-cost' ? 'Estimando…' : 'Estimar tokens'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => runAudit(true)}
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-zinc-400 hover:text-zinc-200 transition disabled:opacity-50"
          >
            Audit + sugestões
          </button>
        </div>
      </div>

      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <SectionHeader
          title="Pattern & scaffold"
          icon={<Sparkles className="w-4 h-4 text-gold-500" />}
          subtitle="Trocar pattern ou rodar loop-init (skills + STATE + budget)."
        />
        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex flex-col gap-1 text-[10px] text-zinc-500">
            Pattern
            <select
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
              className="rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 px-2 py-1.5 min-w-[180px]"
            >
              {(status?.patterns ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-zinc-500">
            Nível custo
            <select
              value={costLevel}
              onChange={(e) => setCostLevel(e.target.value as 'L1' | 'L2' | 'L3')}
              className="rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 px-2 py-1.5"
            >
              <option value="L1">L1 report</option>
              <option value="L2">L2 assisted</option>
              <option value="L3">L3 unattended</option>
            </select>
          </label>
          <button
            type="button"
            disabled={!!busy}
            onClick={initPattern}
            className="px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/30 text-[11px] font-bold text-gold-300 hover:bg-gold-500/20 transition disabled:opacity-50"
          >
            {busy === 'loop-init' ? 'Scaffolding…' : 'loop-init (Grok)'}
          </button>
        </div>
        {status?.patterns?.find((p) => p.id === selectedPattern)?.description && (
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            {status.patterns.find((p) => p.id === selectedPattern)?.description}
          </p>
        )}
      </div>

      {status?.firstLoopCommand?.command && (
        <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-3">
          <SectionHeader
            title="Primeiro loop (Grok)"
            icon={<Zap className="w-4 h-4 text-amber-400" />}
            subtitle="Cole no Grok Build como /loop — semana 1 em L1 (report-only)."
          />
          <pre className="text-[10px] text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap font-mono">
            {status.firstLoopCommand.command}
          </pre>
          <button
            type="button"
            onClick={copyCommand}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-[10px] font-bold text-zinc-300 hover:border-gold-500/30 hover:text-gold-400 transition"
          >
            <Copy className="w-3 h-3" />
            Copiar comando
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <SectionHeader title="Arquivos do loop" icon={<Activity className="w-4 h-4 text-zinc-400" />} />
          <ul className="space-y-1">
            {(status?.files ?? []).map((f) => (
              <li key={f.name} className="flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  disabled={!f.exists || !obsidianInstalled}
                  onClick={() => onOpenObsidian?.(f.name)}
                  className="font-mono text-zinc-400 hover:text-violet-300 disabled:opacity-40 disabled:cursor-default text-left"
                >
                  {f.name}
                </button>
                {f.exists ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                )}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-zinc-600">
            Skills Grok: <span className="text-zinc-400 tabular-nums">{status?.loopSkillCount ?? 0}</span>
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <SectionHeader title="Findings" icon={<Gauge className="w-4 h-4 text-zinc-400" />} />
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {(audit?.findings ?? []).slice(0, 12).map((f, i) => (
              <li key={i} className="text-[10px] text-zinc-500 flex gap-1.5">
                <span className={f.level === 'ok' ? 'text-emerald-500' : 'text-amber-500'}>
                  {f.level === 'ok' ? '✓' : '!'}
                </span>
                <span>{f.message}</span>
              </li>
            ))}
            {!audit?.findings?.length && (
              <li className="text-[10px] text-zinc-600">Rode Loop Audit para ver findings.</li>
            )}
          </ul>
          {(audit?.recommendations?.length ?? 0) > 0 && (
            <div className="pt-2 border-t border-zinc-800">
              <div className="text-[9px] uppercase text-zinc-600 mb-1">Recomendações</div>
              <ul className="space-y-0.5">
                {audit!.recommendations!.slice(0, 4).map((r, i) => (
                  <li key={i} className="text-[10px] text-zinc-500">
                    → {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>
          Lumiera ↔ Hermes · VideoAgent · lumiera-ops
        </span>
        <a
          href="https://github.com/cobusgreyling/loop-engineering"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-cyan-500/80 hover:text-cyan-400"
        >
          loop-engineering
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}