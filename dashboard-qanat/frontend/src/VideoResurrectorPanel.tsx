import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import hotToast from 'react-hot-toast';
import {
  AlertTriangle, CheckCircle2, Clock, ExternalLink, ImagePlus, Loader2, RefreshCw, Sun, Sunset, Terminal, Upload,
  Video, Zap,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

type ResurrectorSlot = 'morning' | 'afternoon';

type ResurrectorSettings = {
  enabled: boolean;
  autoRunWhenAppOpen: boolean;
  autoApplyToYoutube: boolean;
  minAgeDays: number;
  morningBatchSize: number;
  afternoonBatchSize: number;
  morningHour: number;
  afternoonHour: number;
  cooldownDays: number;
};

type ResurrectorAlert = {
  type: 'missed_batch' | 'auto_ran';
  slot: ResurrectorSlot;
  severity: 'warning' | 'success';
  message: string;
  ranAt?: string;
};

type DailyRunEntry = {
  ranAt: string;
  trigger: 'auto' | 'manual';
  videoIds: string[];
  count: number;
} | null;

type ResurrectorItem = {
  id: string;
  videoId: string;
  projectName: string;
  format: 'LONG' | 'SHORT' | string;
  title: string;
  ageDays?: number;
  viewCount?: number;
  thumbnailUrl?: string;
  status: string;
  selectedTitle?: string | null;
  thumbnailStatus?: string;
  thumbnailLocalPath?: string | null;
  currentMetadata?: { title?: string; description?: string; tags?: string[] };
  proposedMetadata?: {
    title?: string;
    titleVariants?: string[];
    description?: string;
    tags?: string[];
    hashtags?: string;
  } | null;
  error?: string | null;
  appliedAt?: string | null;
};

type CycleProgress = {
  number: number;
  total: number;
  batched: number;
  pending: number;
  complete: boolean;
  nextVideoTitle?: string | null;
  order: string;
};

type ScanDiagnostics = {
  channelTitle?: string | null;
  channelTotal?: number;
  withLumieraProject?: number;
  channelOnlyCount?: number;
  publishedOnDisk: number;
  minAgeDays: number;
  eligibleCount: number;
  tooYoungCount: number;
  tooYoung?: Array<{
    title: string;
    projectName: string;
    ageDays: number;
    daysUntilEligible: number;
    eligibleOn?: string;
  }>;
  nextToQualify?: {
    title: string;
    projectName: string;
    ageDays: number;
    daysUntilEligible: number;
    eligibleOn?: string;
  } | null;
  scannedAt?: string;
};

type Dashboard = {
  settings: ResurrectorSettings;
  cycle?: { number: number; startedAt?: string };
  cycleProgress?: CycleProgress | null;
  scanDiagnostics?: ScanDiagnostics | null;
  lastDailyRunAt?: string | null;
  lastDailyRunDate?: string | null;
  dailyRuns?: {
    date: string;
    morning: DailyRunEntry;
    afternoon: DailyRunEntry;
  };
  schedule?: {
    today: string;
    morningHour: number;
    afternoonHour: number;
    morningRan: boolean;
    afternoonRan: boolean;
    nextSlot: ResurrectorSlot | null;
    inMorningWindow: boolean;
    inAfternoonWindow: boolean;
  };
  alerts?: ResurrectorAlert[];
  badgeCount?: number;
  counts: Record<string, number>;
  items: ResurrectorItem[];
  history: Array<{ videoId: string; projectName: string; title: string; appliedAt: string }>;
  activityLog?: ActivityLogEntry[];
};

type ActivityLogEntry = {
  at: string;
  level: 'info' | 'success' | 'warn' | 'error' | string;
  message: string;
  videoId?: string;
};

const BATCH_TOAST_ID = 'resurrector-batch-progress';

type Props = {
  toast: (msg: string) => void;
  externalAlerts?: ResurrectorAlert[];
  onDashboardChange?: (dashboard: Dashboard | null) => void;
};

const STATUS_LABELS: Record<string, string> = {
  queued: 'Na fila',
  generating: 'Gerando IA…',
  review: 'Revisar',
  applied: 'Aplicado',
  skipped: 'Ignorado',
  failed: 'Falhou',
};

function slotLabel(slot: ResurrectorSlot, hour?: number) {
  if (slot === 'morning') return `Manhã${hour != null ? ` (${hour}h)` : ''}`;
  return `Tarde${hour != null ? ` (${hour}h)` : ''}`;
}

function runEntryLabel(entry: DailyRunEntry) {
  if (!entry?.ranAt) return 'Pendente';
  const time = new Date(entry.ranAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const mode = entry.trigger === 'auto' ? 'automático' : 'manual';
  return `${time} · ${mode} · ${entry.count} vídeo(s)`;
}

export function VideoResurrectorPanel({ toast, externalAlerts, onDashboardChange }: Props) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [runningSlot, setRunningSlot] = useState<ResurrectorSlot | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [liveLog, setLiveLog] = useState<ActivityLogEntry[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [applyingPending, setApplyingPending] = useState(false);
  const autoApplyRanRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const activityLog = useMemo(() => {
    const persisted = dashboard?.activityLog ?? [];
    return [...liveLog, ...persisted].slice(0, 120);
  }, [dashboard?.activityLog, liveLog]);

  useEffect(() => {
    if (runningSlot && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activityLog.length, runningSlot]);

  const applyDashboard = useCallback((data: Dashboard) => {
    setDashboard(data);
    onDashboardChange?.(data);
  }, [onDashboardChange]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/youtube/resurrector');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar');
      applyDashboard(data);
      if (!selectedId && data.items?.length) {
        const review = data.items.find((i: ResurrectorItem) => i.status === 'review');
        setSelectedId(review?.id || data.items[0].id);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar ressuscitador.');
    } finally {
      setLoading(false);
    }
  }, [applyDashboard, selectedId, toast]);

  useEffect(() => { void load(); }, []);

  const pushLiveLog = useCallback((entries: ActivityLogEntry[]) => {
    if (!entries.length) return;
    setLiveLog((prev) => [...entries, ...prev].slice(0, 80));
  }, []);

  const applyPendingReviews = useCallback(async (silent = false) => {
    setApplyingPending(true);
    try {
      const res = await fetch('/api/youtube/resurrector/apply-pending', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.dashboard) applyDashboard(data.dashboard);
      const runEntries = (data.runLog || []).map((row: ActivityLogEntry) => ({
        at: row.at || new Date().toISOString(),
        level: row.level || 'info',
        message: row.message,
        videoId: row.videoId,
      }));
      pushLiveLog(runEntries);

      if (!silent && (data.applied || data.failed)) {
        if (data.applied > 0) {
          hotToast.success(data.message || `${data.applied} publicado(s) no YouTube.`, { duration: 6000 });
        } else if (data.failed > 0) {
          hotToast.error(data.message || `${data.failed} falha(s) ao publicar.`, { duration: 8000 });
        }
      }
      return data;
    } catch (err) {
      if (!silent) {
        hotToast.error(err instanceof Error ? err.message : 'Falha ao publicar revisões.');
      }
      throw err;
    } finally {
      setApplyingPending(false);
    }
  }, [applyDashboard, pushLiveLog]);

  useEffect(() => {
    if (!dashboard || loading || autoApplyRanRef.current) return;
    const reviewCount = dashboard.counts?.review ?? 0;
    const autoApply = dashboard.settings?.autoApplyToYoutube !== false;
    if (!autoApply || reviewCount === 0) return;

    autoApplyRanRef.current = true;
    void applyPendingReviews(true).then((data) => {
      if (data?.applied > 0) {
        hotToast.success(data.message || `${data.applied} publicado(s) automaticamente no YouTube.`, { duration: 6000 });
      }
    }).catch(() => {
      autoApplyRanRef.current = false;
    });
  }, [dashboard, loading, applyPendingReviews]);

  const selected = useMemo(
    () => dashboard?.items.find((i) => i.id === selectedId) || null,
    [dashboard, selectedId],
  );

  const alerts = useMemo(() => {
    const local = dashboard?.alerts ?? [];
    if (!externalAlerts?.length) return local;
    const seen = new Set(local.map((a) => `${a.type}:${a.slot}`));
    const merged = [...local];
    for (const alert of externalAlerts) {
      const key = `${alert.type}:${alert.slot}`;
      if (!seen.has(key)) merged.push(alert);
    }
    return merged;
  }, [dashboard?.alerts, externalAlerts]);

  const saveSettings = async (patch: Partial<ResurrectorSettings>) => {
    const res = await fetch('/api/youtube/resurrector/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { ...dashboard?.settings, ...patch } }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    applyDashboard(data);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/youtube/resurrector/scan', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyDashboard(data.dashboard);
      toast(data.message || `${data.added} vídeo(s) adicionados à fila (${data.eligible} elegíveis).`, {
        duration: data.eligible === 0 ? 8000 : 4000,
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Scan falhou.');
    } finally {
      setScanning(false);
    }
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      const res = await fetch('/api/youtube/resurrector/retry-failed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyDashboard(data.dashboard);
      toast(data.message || 'Falhas recolocadas na fila.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao reprocessar.');
    } finally {
      setRetrying(false);
    }
  };

  const handleRunBatch = async (slot: ResurrectorSlot) => {
    const batchTotal = slot === 'morning' ? morningSize : afternoonSize;
    setRunningSlot(slot);
    setLiveLog([]);
    let totalApplied = 0;
    let totalReview = 0;
    let totalFail = 0;

    try {
      for (let step = 0; step < batchTotal; step += 1) {
        const label = slot === 'morning' ? 'manhã' : 'tarde';
        hotToast.loading(`Ressuscitador (${label}): vídeo ${step + 1}/${batchTotal}…`, { id: BATCH_TOAST_ID });
        pushLiveLog([{
          at: new Date().toISOString(),
          level: 'info',
          message: `▶ Etapa ${step + 1}/${batchTotal} — chamando IA…`,
        }]);

        const res = await fetch('/api/youtube/resurrector/run-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot,
            trigger: 'manual',
            limit: 1,
            finalizeSlot: step === batchTotal - 1,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.skipped) {
          hotToast.dismiss(BATCH_TOAST_ID);
          toast(data.reason || 'Batch já executado hoje.');
          if (data.dashboard) applyDashboard(data.dashboard);
          return;
        }

        if (data.dashboard) applyDashboard(data.dashboard);
        const runEntries = (data.runLog || []).map((row: ActivityLogEntry) => ({
          at: row.at || new Date().toISOString(),
          level: row.level || 'info',
          message: row.message,
          videoId: row.videoId,
        }));
        pushLiveLog(runEntries);

        totalApplied += data.appliedCount ?? 0;
        totalReview += data.reviewCount ?? 0;
        totalFail += data.failCount ?? 0;

        if (!data.processed) break;
      }

      hotToast.dismiss(BATCH_TOAST_ID);
      if (totalFail && !totalApplied && !totalReview) {
        hotToast.error(`${totalFail} falha(s) — rede/Gemini. Use "Reprocessar falhas" e tente de novo.`, { duration: 8000 });
      } else if (totalApplied > 0) {
        hotToast.success(
          `${totalApplied} publicado(s) no YouTube${totalReview ? `, ${totalReview} para revisar` : ''}${totalFail ? `, ${totalFail} falha(s)` : ''}.`,
          { duration: 6000 },
        );
      } else {
        hotToast.success(`${totalReview} pronto(s) para revisão${totalFail ? `, ${totalFail} falha(s)` : ''}.`, { duration: 6000 });
      }
    } catch (err) {
      hotToast.dismiss(BATCH_TOAST_ID);
      const msg = err instanceof Error ? err.message : 'Batch falhou.';
      pushLiveLog([{ at: new Date().toISOString(), level: 'error', message: msg }]);
      hotToast.error(msg);
    } finally {
      setRunningSlot(null);
      void load();
    }
  };

  const patchItem = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/youtube/resurrector/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    applyDashboard(data.dashboard);
  };

  const handleApply = async () => {
    if (!selected) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/youtube/resurrector/items/${selected.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selected.selectedTitle || selected.proposedMetadata?.title,
          description: selected.proposedMetadata?.description,
          tags: selected.proposedMetadata?.tags,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyDashboard(data.dashboard);
      toast(data.thumbnailApplied
        ? 'Metadados e thumbnail aplicados no YouTube.'
        : 'Metadados aplicados no YouTube.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao aplicar.');
    } finally {
      setApplying(false);
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    if (!selected) return;
    setUploadingThumb(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
      const data = btoa(binary);
      const res = await fetch(`/api/youtube/resurrector/items/${selected.id}/thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          fileName: file.name,
          mimeType: file.type,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      await load();
      toast('Thumbnail salva — aplique no YouTube quando estiver pronto.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload falhou.');
    } finally {
      setUploadingThumb(false);
    }
  };

  const counts = dashboard?.counts || {};
  const schedule = dashboard?.schedule;
  const morningHour = schedule?.morningHour ?? dashboard?.settings?.morningHour ?? 11;
  const afternoonHour = schedule?.afternoonHour ?? dashboard?.settings?.afternoonHour ?? 16;
  const morningSize = dashboard?.settings?.morningBatchSize ?? 5;
  const afternoonSize = dashboard?.settings?.afternoonBatchSize ?? 5;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Ressuscitador de vídeos"
        helpId="video-resurrector"
        size="md"
        icon={<Zap className="w-5 h-5 text-amber-400" />}
        subtitle={`Do mais antigo ao mais novo até o último postado — depois recomeça o ciclo. Batch ${morningSize} às ${morningHour}h + ${afternoonSize} às ${afternoonHour}h. Metadados publicados automaticamente no YouTube.`}
      />

      {dashboard?.cycleProgress && dashboard.cycleProgress.total > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Ciclo {dashboard.cycleProgress.number} · mais antigo → mais novo
            </p>
            <p className="text-[10px] text-zinc-500">
              {dashboard.cycleProgress.batched}/{dashboard.cycleProgress.total} processados
            </p>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{
                width: `${Math.min(100, Math.round((dashboard.cycleProgress.batched / dashboard.cycleProgress.total) * 100))}%`,
              }}
            />
          </div>
          {dashboard.cycleProgress.nextVideoTitle && !dashboard.cycleProgress.complete && (
            <p className="text-[10px] text-zinc-500 truncate">
              Próximo na fila: {dashboard.cycleProgress.nextVideoTitle}
            </p>
          )}
          {dashboard.cycleProgress.complete && (
            <p className="text-[10px] text-emerald-400">
              Ciclo concluído — o próximo batch recomeça do vídeo mais antigo.
            </p>
          )}
        </div>
      )}

      {dashboard?.scanDiagnostics && (dashboard.scanDiagnostics.channelTotal ?? dashboard.scanDiagnostics.publishedOnDisk) > 0
        && dashboard.scanDiagnostics.eligibleCount === 0 && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 space-y-2 text-[11px] text-sky-100">
          <p className="font-bold">
            {dashboard.scanDiagnostics.channelTotal ?? dashboard.scanDiagnostics.publishedOnDisk} vídeo(s) no canal
            {dashboard.scanDiagnostics.channelTitle ? ` “${dashboard.scanDiagnostics.channelTitle}”` : ''}
            {' '}— nenhum elegível ainda
          </p>
          {(dashboard.scanDiagnostics.withLumieraProject ?? 0) > 0 && (
            <p className="text-[10px] opacity-80">
              {dashboard.scanDiagnostics.withLumieraProject} com projeto Lumiera vinculado
              {(dashboard.scanDiagnostics.channelOnlyCount ?? 0) > 0
                ? ` · ${dashboard.scanDiagnostics.channelOnlyCount} só no canal`
                : ''}
            </p>
          )}
          <p className="opacity-90">
            Regra atual: só entram vídeos com +{dashboard.scanDiagnostics.minAgeDays} dias no ar.
            {dashboard.scanDiagnostics.nextToQualify && (
              <>
                {' '}O mais antigo é <strong>{dashboard.scanDiagnostics.nextToQualify.title}</strong>
                {' '}({dashboard.scanDiagnostics.nextToQualify.ageDays}d) — elegível em ~
                {dashboard.scanDiagnostics.nextToQualify.daysUntilEligible}d
                {dashboard.scanDiagnostics.nextToQualify.eligibleOn && (
                  <> ({new Date(dashboard.scanDiagnostics.nextToQualify.eligibleOn).toLocaleDateString('pt-BR')})</>
                )}.
              </>
            )}
          </p>
          {(dashboard.scanDiagnostics.tooYoung?.length ?? 0) > 0 && (
            <ul className="text-[10px] text-sky-200/80 space-y-0.5 max-h-24 overflow-y-auto">
              {dashboard.scanDiagnostics.tooYoung!.map((v) => (
                <li key={`${v.projectName}-${v.ageDays}`} className="truncate">
                  {v.title} · {v.ageDays}d · faltam {v.daysUntilEligible}d
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-sky-200/70">
            Pode reduzir &quot;Idade mín. (dias)&quot; abaixo se quiser ressuscitar vídeos mais recentes.
          </p>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={`${alert.type}-${alert.slot}`}
              className={`rounded-xl border px-4 py-3 flex items-start gap-3 text-[11px] ${
                alert.severity === 'warning'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
              }`}
            >
              {alert.severity === 'warning'
                ? <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />}
              <div className="min-w-0">
                <p className="font-bold">{slotLabel(alert.slot, alert.slot === 'morning' ? morningHour : afternoonHour)}</p>
                <p className="opacity-90">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          ['Fila', counts.queued, 'text-zinc-400'],
          ['Revisar', counts.review, 'text-amber-400'],
          ['Aplicados', counts.applied, 'text-emerald-400'],
          ['Falhas', counts.failed, 'text-red-400'],
        ].map(([label, n, color]) => (
          <div key={String(label)} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-center">
            <p className={`text-lg font-bold ${color}`}>{n ?? 0}</p>
            <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
        <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Agenda diária</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`rounded-xl border p-3 ${schedule?.morningRan ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-950/60'}`}>
            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-200">
              <Sun className="w-4 h-4 text-amber-400" />
              {slotLabel('morning', morningHour)} · {morningSize} vídeos
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {runEntryLabel(dashboard?.dailyRuns?.morning ?? null)}
            </p>
          </div>
          <div className={`rounded-xl border p-3 ${schedule?.afternoonRan ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-950/60'}`}>
            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-200">
              <Sunset className="w-4 h-4 text-orange-400" />
              {slotLabel('afternoon', afternoonHour)} · {afternoonSize} vídeos
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {runEntryLabel(dashboard?.dailyRuns?.afternoon ?? null)}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600">
          Vídeos processados de manhã não entram no batch da tarde. Fora do horário ou com o app fechado, dispare manualmente.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
        <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Configuração</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 text-[11px] text-zinc-300">
            <input
              type="checkbox"
              checked={dashboard?.settings?.enabled ?? true}
              onChange={(e) => void saveSettings({ enabled: e.target.checked }).catch((err) => toast(String(err.message)))}
            />
            Ativo
          </label>
          <label className="flex items-center gap-2 text-[11px] text-zinc-300">
            <input
              type="checkbox"
              checked={dashboard?.settings?.autoRunWhenAppOpen ?? true}
              onChange={(e) => void saveSettings({ autoRunWhenAppOpen: e.target.checked }).catch((err) => toast(String(err.message)))}
            />
            Auto com app aberto (11h e 16h)
          </label>
          <label className="flex items-center gap-2 text-[11px] text-zinc-300">
            <input
              type="checkbox"
              checked={dashboard?.settings?.autoApplyToYoutube !== false}
              onChange={(e) => void saveSettings({ autoApplyToYoutube: e.target.checked }).catch((err) => toast(String(err.message)))}
            />
            Publicar automaticamente no YouTube
          </label>
          <div>
            <span className="text-[9px] text-zinc-500 uppercase">Idade mín. (dias)</span>
            <input
              type="number"
              min={1}
              max={365}
              className="dash-input w-full text-xs mt-0.5"
              value={dashboard?.settings?.minAgeDays ?? 10}
              onChange={(e) => void saveSettings({ minAgeDays: parseInt(e.target.value, 10) || 10 })}
            />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 uppercase">Manhã (qtd)</span>
            <input
              type="number"
              min={1}
              max={20}
              className="dash-input w-full text-xs mt-0.5"
              value={morningSize}
              onChange={(e) => void saveSettings({ morningBatchSize: parseInt(e.target.value, 10) || 5 })}
            />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 uppercase">Tarde (qtd)</span>
            <input
              type="number"
              min={1}
              max={20}
              className="dash-input w-full text-xs mt-0.5"
              value={afternoonSize}
              onChange={(e) => void saveSettings({ afternoonBatchSize: parseInt(e.target.value, 10) || 5 })}
            />
          </div>
        </div>
        {dashboard?.lastDailyRunAt && (
          <p className="text-[10px] text-zinc-600">
            Último batch: {new Date(dashboard.lastDailyRunAt).toLocaleString('pt-BR')}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={scanning || loading}
            onClick={() => void handleScan()}
            className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 flex items-center gap-1.5"
          >
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Escanear elegíveis
          </button>
          <button
            type="button"
            disabled={runningSlot != null || loading || schedule?.morningRan}
            onClick={() => void handleRunBatch('morning')}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
          >
            {runningSlot === 'morning' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sun className="w-3.5 h-3.5" />}
            Batch manhã ({morningSize})
          </button>
          <button
            type="button"
            disabled={runningSlot != null || loading || schedule?.afternoonRan}
            onClick={() => void handleRunBatch('afternoon')}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
          >
            {runningSlot === 'afternoon' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sunset className="w-3.5 h-3.5" />}
            Batch tarde ({afternoonSize})
          </button>
          {(counts.review ?? 0) > 0 && dashboard?.settings?.autoApplyToYoutube === false && (
            <button
              type="button"
              disabled={applyingPending || runningSlot != null}
              onClick={() => void applyPendingReviews()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
            >
              {applyingPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Publicar revisões ({counts.review})
            </button>
          )}
          {(counts.failed ?? 0) > 0 && (
            <button
              type="button"
              disabled={retrying || runningSlot != null}
              onClick={() => void handleRetryFailed()}
              className="text-[10px] font-bold px-3 py-2 rounded-lg border border-red-500/40 text-red-300 flex items-center gap-1.5"
            >
              {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Reprocessar falhas ({counts.failed})
            </button>
          )}
          <button type="button" onClick={() => void load()} className="text-[10px] text-zinc-500 px-2">
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,0.55fr)] gap-4">
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Fila de monitoração</p>
          {loading && <p className="text-xs text-zinc-500">Carregando…</p>}
          {!loading && (dashboard?.items?.length ?? 0) === 0 && (
            <p className="text-xs text-zinc-500 italic">Nenhum vídeo na fila. Clique em Escanear elegíveis.</p>
          )}
          {(dashboard?.items || []).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`w-full text-left rounded-xl border p-3 transition ${
                selectedId === item.id
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
              }`}
            >
              <div className="flex gap-2">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" className="w-16 h-9 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-16 h-9 bg-zinc-800 rounded flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4 text-zinc-600" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-zinc-200 truncate">{item.title}</p>
                  <p className="text-[9px] text-zinc-500 truncate">{item.projectName} · {item.ageDays}d · {item.format}</p>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 mt-1 inline-block">
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 min-h-[320px]">
          {!selected ? (
            <p className="text-xs text-zinc-500">Selecione um vídeo na fila.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between gap-2 items-start">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-100 truncate">{selected.title}</p>
                  <a
                    href={`https://www.youtube.com/watch?v=${selected.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-amber-400/90 inline-flex items-center gap-1"
                  >
                    Abrir no YouTube <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {selected.status === 'applied' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
              </div>

              {(selected.status === 'review' || selected.status === 'applied') && selected.proposedMetadata && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-zinc-500 font-bold">Título (SEO)</label>
                    <select
                      className="dash-select w-full text-xs"
                      value={selected.selectedTitle || selected.proposedMetadata.title || ''}
                      disabled={selected.status === 'applied'}
                      onChange={(e) => void patchItem(selected.id, { selectedTitle: e.target.value })}
                    >
                      {(selected.proposedMetadata.titleVariants || [selected.proposedMetadata.title || '']).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-zinc-500 font-bold">Descrição</label>
                    <textarea
                      className="dash-input w-full text-[11px] min-h-[120px] font-mono"
                      value={selected.proposedMetadata.description || ''}
                      readOnly={selected.status === 'applied'}
                      onChange={(e) => void patchItem(selected.id, {
                        proposedMetadata: { ...selected.proposedMetadata, description: e.target.value },
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-zinc-500 font-bold">Tags</label>
                    <input
                      className="dash-input w-full text-xs"
                      value={(selected.proposedMetadata.tags || []).join(', ')}
                      readOnly={selected.status === 'applied'}
                      onChange={(e) => void patchItem(selected.id, {
                        proposedMetadata: {
                          ...selected.proposedMetadata,
                          tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                        },
                      })}
                    />
                    {selected.proposedMetadata.hashtags && (
                      <p className="text-[9px] text-zinc-600">Hashtags: {selected.proposedMetadata.hashtags}</p>
                    )}
                  </div>

                  {selected.format === 'LONG' && (
                    <div className="rounded-xl border border-dashed border-zinc-700 p-3 space-y-2">
                      <p className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
                        <ImagePlus className="w-3.5 h-3.5" /> Thumbnail (upload manual)
                      </p>
                      <p className="text-[9px] text-zinc-500">
                        Status: {selected.thumbnailStatus || 'awaiting_manual'}
                        {selected.thumbnailLocalPath ? ' · arquivo pronto' : ''}
                      </p>
                      <label className="inline-flex items-center gap-2 text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 cursor-pointer hover:border-amber-500/40">
                        {uploadingThumb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        Enviar imagem 1280×720
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void handleThumbnailUpload(f);
                          }}
                        />
                      </label>
                    </div>
                  )}

                  {selected.status === 'applied' ? (
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Publicado no YouTube
                      {selected.appliedAt && (
                        <span className="text-zinc-500">
                          · {new Date(selected.appliedAt).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </p>
                  ) : dashboard?.settings?.autoApplyToYoutube === false ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={applying}
                        onClick={() => void handleApply()}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
                      >
                        {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Aplicar no YouTube
                      </button>
                      <button
                        type="button"
                        onClick={() => void patchItem(selected.id, { status: 'skipped' })}
                        className="text-[10px] text-zinc-500 px-3 py-2 border border-zinc-800 rounded-lg"
                      >
                        Ignorar
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-amber-300/90 flex items-center gap-1.5">
                      {applyingPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Loader2 className="w-3.5 h-3.5" />}
                      Publicando automaticamente no YouTube…
                    </p>
                  )}
                </>
              )}

              {selected.status === 'queued' && (
                <p className="text-xs text-zinc-500">Na fila — será processado no próximo batch (manhã ou tarde) ou dispare manualmente.</p>
              )}
              {selected.status === 'failed' && selected.error && (
                <p className="text-xs text-red-400">{selected.error}</p>
              )}
              {selected.currentMetadata && (
                <details className="text-[10px] text-zinc-600">
                  <summary className="cursor-pointer text-zinc-500">Metadados atuais no YouTube</summary>
                  <p className="mt-2 font-mono whitespace-pre-wrap">{selected.currentMetadata.title}</p>
                  <p className="mt-1 line-clamp-4">{selected.currentMetadata.description}</p>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 flex flex-col min-h-[320px] max-h-[520px]">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Processo</p>
            {runningSlot && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 ml-auto" />
            )}
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-1 pr-1">
            {activityLog.length === 0 && (
              <p className="text-zinc-600 italic">Dispare um batch para ver o progresso aqui.</p>
            )}
            {[...activityLog].reverse().map((entry, idx) => (
              <div
                key={`${entry.at}-${idx}`}
                className={
                  entry.level === 'error'
                    ? 'text-red-400'
                    : entry.level === 'success'
                      ? 'text-emerald-400'
                      : entry.level === 'warn'
                        ? 'text-amber-300'
                        : 'text-zinc-400'
                }
              >
                <span className="text-zinc-600">
                  {new Date(entry.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {' '}
                {entry.message}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {(dashboard?.history?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-zinc-800 p-3">
          <p className="text-[9px] uppercase text-zinc-500 font-bold mb-2">Histórico recente</p>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {dashboard!.history.slice(0, 12).map((h) => (
              <li key={`${h.videoId}-${h.appliedAt}`} className="text-[10px] text-zinc-500 flex justify-between gap-2">
                <span className="truncate">{h.title}</span>
                <span className="shrink-0">{new Date(h.appliedAt).toLocaleDateString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}