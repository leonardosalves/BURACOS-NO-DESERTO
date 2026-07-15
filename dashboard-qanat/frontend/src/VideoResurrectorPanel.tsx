import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import hotToast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImagePlus,
  Loader2,
  RefreshCw,
  Sun,
  Sunset,
  Upload,
  Video,
  Zap,
} from "lucide-react";

type ResurrectorSlot = "morning" | "afternoon";

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
  type: "missed_batch" | "auto_ran";
  slot: ResurrectorSlot;
  severity: "warning" | "success";
  message: string;
  ranAt?: string;
};

type DailyRunEntry = {
  ranAt: string;
  trigger: "auto" | "manual";
  videoIds: string[];
  count: number;
} | null;

type ResurrectorItem = {
  id: string;
  videoId: string;
  projectName: string;
  format: "LONG" | "SHORT" | string;
  title: string;
  ageDays?: number;
  viewCount?: number;
  thumbnailUrl?: string;
  status: string;
  selectedTitle?: string | null;
  thumbnailStatus?: string;
  thumbnailLocalPath?: string | null;
  currentMetadata?: { title?: string; description?: string; tags?: string[] };
  opportunityScore?: number;
  diagnosis?: {
    score: number;
    tier: "high" | "medium" | "low";
    diagnosis: string;
    recommendedTreatment: string;
    treatmentLabel: string;
    reasons: string[];
    risks: string[];
    analyticsAvailable: boolean;
    metrics?: {
      recentViews?: number;
      averageViewDuration?: number;
      shares?: number;
      subscribersGained?: number;
    };
    analyzedAt: string;
  };
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
  history: Array<{
    videoId: string;
    projectName: string;
    title: string;
    appliedAt: string;
  }>;
  activityLog?: ActivityLogEntry[];
};

type ActivityLogEntry = {
  at: string;
  level: "info" | "success" | "warn" | "error" | string;
  message: string;
  videoId?: string;
};

const BATCH_TOAST_ID = "resurrector-batch-progress";

type Props = {
  toast: (msg: string, opts?: unknown) => void;
  externalAlerts?: ResurrectorAlert[];
  onDashboardChange?: (dashboard: Dashboard | null) => void;
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Na fila",
  generating: "Gerando IA…",
  review: "Revisar",
  applied: "Aplicado",
  skipped: "Ignorado",
  failed: "Falhou",
};

function slotLabel(slot: ResurrectorSlot, hour?: number) {
  if (slot === "morning") return `Manhã${hour != null ? ` (${hour}h)` : ""}`;
  return `Tarde${hour != null ? ` (${hour}h)` : ""}`;
}

function runEntryLabel(entry: DailyRunEntry) {
  if (!entry?.ranAt) return "Pendente";
  const time = new Date(entry.ranAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const mode = entry.trigger === "auto" ? "automático" : "manual";
  return `${time} · ${mode} · ${entry.count} vídeo(s)`;
}

export function VideoResurrectorPanel({
  toast,
  externalAlerts,
  onDashboardChange,
}: Props) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [deepScanning, setDeepScanning] = useState(false);
  const [runningSlot, setRunningSlot] = useState<ResurrectorSlot | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [liveLog, setLiveLog] = useState<ActivityLogEntry[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [applyingPending, setApplyingPending] = useState(false);
  const autoApplyRanRef = useRef(false);
  const lastReviewCountRef = useRef(0);

  const activityLog = useMemo(() => {
    const persisted = dashboard?.activityLog ?? [];
    return [...liveLog, ...persisted].slice(0, 120);
  }, [dashboard?.activityLog, liveLog]);

  const applyDashboard = useCallback(
    (data: Dashboard) => {
      setDashboard(data);
      onDashboardChange?.(data);
    },
    [onDashboardChange]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/youtube/resurrector");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar");
      applyDashboard(data);
      if (!selectedId && data.items?.length) {
        const latestApplied = [...data.items]
          .filter((i: ResurrectorItem) => i.status === "applied" && i.appliedAt)
          .sort(
            (a: ResurrectorItem, b: ResurrectorItem) =>
              new Date(b.appliedAt || 0).getTime() -
              new Date(a.appliedAt || 0).getTime()
          )[0];
        setSelectedId(latestApplied?.id || data.items[0].id);
      }
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Erro ao carregar ressuscitador."
      );
    } finally {
      setLoading(false);
    }
  }, [applyDashboard, selectedId, toast]);

  useEffect(() => {
    void load();
  }, []);

  const pushLiveLog = useCallback((entries: ActivityLogEntry[]) => {
    if (!entries.length) return;
    setLiveLog((prev) => [...entries, ...prev].slice(0, 80));
  }, []);

  const applyPendingReviews = useCallback(
    async (silent = false) => {
      setApplyingPending(true);
      try {
        const res = await fetch("/api/youtube/resurrector/apply-pending", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.dashboard) applyDashboard(data.dashboard);
        const runEntries = (data.runLog || []).map((row: ActivityLogEntry) => ({
          at: row.at || new Date().toISOString(),
          level: row.level || "info",
          message: row.message,
          videoId: row.videoId,
        }));
        pushLiveLog(runEntries);

        if (!silent && (data.applied || data.failed)) {
          if (data.applied > 0) {
            hotToast.success(
              data.message || `${data.applied} publicado(s) no YouTube.`,
              { duration: 6000 }
            );
          } else if (data.failed > 0) {
            hotToast.error(
              data.message || `${data.failed} falha(s) ao publicar.`,
              { duration: 8000 }
            );
          }
        }
        return data;
      } catch (err) {
        if (!silent) {
          hotToast.error(
            err instanceof Error ? err.message : "Falha ao publicar revisões."
          );
        }
        throw err;
      } finally {
        setApplyingPending(false);
      }
    },
    [applyDashboard, pushLiveLog]
  );

  useEffect(() => {
    const reviewCount = dashboard?.counts?.review ?? 0;
    if (reviewCount > lastReviewCountRef.current) {
      autoApplyRanRef.current = false;
    }
    lastReviewCountRef.current = reviewCount;
  }, [dashboard?.counts?.review]);

  useEffect(() => {
    if (!dashboard || loading || autoApplyRanRef.current) return;
    const reviewCount = dashboard.counts?.review ?? 0;
    const autoApply = dashboard.settings?.autoApplyToYoutube !== false;
    if (!autoApply || reviewCount === 0) return;

    autoApplyRanRef.current = true;
    void applyPendingReviews(true)
      .then((data) => {
        if (data?.applied > 0) {
          hotToast.success(
            data.message ||
              `${data.applied} publicado(s) automaticamente no YouTube.`,
            { duration: 6000 }
          );
        }
      })
      .catch(() => {
        autoApplyRanRef.current = false;
      });
  }, [dashboard, loading, applyPendingReviews]);

  const selected = useMemo(
    () => dashboard?.items.find((i) => i.id === selectedId) || null,
    [dashboard, selectedId]
  );
  const recentChangedItems = useMemo(
    () =>
      (dashboard?.items || [])
        .filter((item) => item.status === "applied" && item.appliedAt)
        .sort(
          (a, b) =>
            new Date(b.appliedAt || 0).getTime() -
            new Date(a.appliedAt || 0).getTime()
        )
        .slice(0, 10),
    [dashboard?.items]
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
    const res = await fetch("/api/youtube/resurrector/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { ...dashboard?.settings, ...patch } }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    applyDashboard(data);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/youtube/resurrector/scan", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyDashboard(data.dashboard);
      toast(
        data.message ||
          `${data.added} vídeo(s) adicionados à fila (${data.eligible} elegíveis).`,
        {
          duration: data.eligible === 0 ? 8000 : 4000,
        }
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Scan falhou.");
    } finally {
      setScanning(false);
    }
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/youtube/resurrector/retry-failed", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyDashboard(data.dashboard);
      toast(data.message || "Falhas recolocadas na fila.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao reprocessar.");
    } finally {
      setRetrying(false);
    }
  };

  const handleRunBatch = async (slot: ResurrectorSlot) => {
    const batchTotal = slot === "morning" ? morningSize : afternoonSize;
    setRunningSlot(slot);
    setLiveLog([]);
    let totalApplied = 0;
    let totalReview = 0;
    let totalFail = 0;

    try {
      for (let step = 0; step < batchTotal; step += 1) {
        const label = slot === "morning" ? "manhã" : "tarde";
        hotToast.loading(
          `Ressuscitador (${label}): vídeo ${step + 1}/${batchTotal}…`,
          { id: BATCH_TOAST_ID }
        );
        pushLiveLog([
          {
            at: new Date().toISOString(),
            level: "info",
            message: `▶ Etapa ${step + 1}/${batchTotal} — chamando IA…`,
          },
        ]);

        const res = await fetch("/api/youtube/resurrector/run-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot,
            trigger: "manual",
            limit: 1,
            finalizeSlot: step === batchTotal - 1,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.skipped) {
          hotToast.dismiss(BATCH_TOAST_ID);
          toast(data.reason || "Batch já executado hoje.");
          if (data.dashboard) applyDashboard(data.dashboard);
          return;
        }

        if (data.dashboard) applyDashboard(data.dashboard);
        const runEntries = (data.runLog || []).map((row: ActivityLogEntry) => ({
          at: row.at || new Date().toISOString(),
          level: row.level || "info",
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
        hotToast.error(
          `${totalFail} falha(s) — rede/Gemini. Use "Reprocessar falhas" e tente de novo.`,
          { duration: 8000 }
        );
      } else if (totalApplied > 0) {
        hotToast.success(
          `${totalApplied} publicado(s) no YouTube${totalReview ? `, ${totalReview} para revisar` : ""}${totalFail ? `, ${totalFail} falha(s)` : ""}.`,
          { duration: 6000 }
        );
      } else {
        hotToast.success(
          `${totalReview} pronto(s) para revisão${totalFail ? `, ${totalFail} falha(s)` : ""}.`,
          { duration: 6000 }
        );
      }
    } catch (err) {
      hotToast.dismiss(BATCH_TOAST_ID);
      const msg = err instanceof Error ? err.message : "Batch falhou.";
      pushLiveLog([
        { at: new Date().toISOString(), level: "error", message: msg },
      ]);
      hotToast.error(msg);
    } finally {
      setRunningSlot(null);
      void load();
    }
  };

  const patchItem = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/youtube/resurrector/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    applyDashboard(data.dashboard);
  };

  const handleDeepScan = async () => {
    setDeepScanning(true);
    const toastId = hotToast.loading(
      "Varredura profunda: coletando analytics de todo o canal…"
    );
    try {
      const res = await fetch("/api/youtube/resurrector/deep-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 500 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Varredura profunda falhou.");
      applyDashboard(data.dashboard);
      hotToast.success(
        `${data.analyzed} vídeo(s) analisados · ${data.highPotential} com alto potencial · ${data.mediumPotential} médios.`,
        { id: toastId, duration: 8000 }
      );
    } catch (err) {
      hotToast.error(
        err instanceof Error ? err.message : "Varredura profunda falhou.",
        { id: toastId }
      );
    } finally {
      setDeepScanning(false);
    }
  };

  const handleDiagnose = async () => {
    if (!selected) return;
    setDiagnosing(true);
    try {
      const res = await fetch(
        `/api/youtube/resurrector/items/${selected.id}/diagnose`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao analisar vídeo.");
      await load();
      hotToast.success("Diagnóstico e baseline de 28 dias atualizados.");
    } catch (err) {
      hotToast.error(
        err instanceof Error ? err.message : "Falha ao analisar vídeo."
      );
    } finally {
      setDiagnosing(false);
    }
  };

  const handleApply = async () => {
    if (!selected) return;
    setApplying(true);
    try {
      const res = await fetch(
        `/api/youtube/resurrector/items/${selected.id}/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: selected.selectedTitle || selected.proposedMetadata?.title,
            description: selected.proposedMetadata?.description,
            tags: selected.proposedMetadata?.tags,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyDashboard(data.dashboard);
      toast(
        data.thumbnailApplied
          ? "Metadados e thumbnail aplicados no YouTube."
          : "Metadados aplicados no YouTube."
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao aplicar.");
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
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1)
        binary += String.fromCharCode(bytes[i]);
      const data = btoa(binary);
      const res = await fetch(
        `/api/youtube/resurrector/items/${selected.id}/thumbnail`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data,
            fileName: file.name,
            mimeType: file.type,
          }),
        }
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      await load();
      toast("Thumbnail salva — aplique no YouTube quando estiver pronto.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload falhou.");
    } finally {
      setUploadingThumb(false);
    }
  };

  const counts = dashboard?.counts || {};
  const schedule = dashboard?.schedule;
  const morningHour =
    schedule?.morningHour ?? dashboard?.settings?.morningHour ?? 11;
  const afternoonHour =
    schedule?.afternoonHour ?? dashboard?.settings?.afternoonHour ?? 18;
  const morningSize = dashboard?.settings?.morningBatchSize ?? 5;
  const afternoonSize = dashboard?.settings?.afternoonBatchSize ?? 5;
  const morningProcessed = dashboard?.dailyRuns?.morning?.count ?? 0;
  const afternoonProcessed = dashboard?.dailyRuns?.afternoon?.count ?? 0;
  const todayProcessed = morningProcessed + afternoonProcessed;
  const dailyTarget = morningSize + afternoonSize;
  const cyclePercent = dashboard?.cycleProgress?.total
    ? Math.min(
        100,
        Math.round(
          ((dashboard.cycleProgress.batched || 0) /
            dashboard.cycleProgress.total) *
            100
        )
      )
    : 0;
  const highPotential = (dashboard?.items || []).filter(
    (item) => item.diagnosis?.tier === "high"
  ).length;

  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-[linear-gradient(120deg,rgba(6,182,212,0.10),rgba(9,9,11,0.96)_45%)] px-4 py-3 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  (counts.generating ?? 0) > 0
                    ? "animate-pulse bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.9)]"
                    : dashboard?.settings?.enabled
                      ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.65)]"
                      : "bg-zinc-600"
                }`}
              />
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
                {(counts.generating ?? 0) > 0
                  ? "IA trabalhando agora"
                  : dashboard?.settings?.enabled
                    ? "Automação online"
                    : "Automação pausada"}
              </p>
              <span className="rounded-full border border-zinc-700/80 bg-black/20 px-2 py-0.5 text-[9px] text-zinc-500">
                Ciclo {dashboard?.cycle?.number ?? 1}
              </span>
            </div>
            <h2 className="mt-1 text-base font-black tracking-tight text-white">
              {todayProcessed}/{dailyTarget} vídeos processados hoje
            </h2>
            <p className="hidden mt-0.5 max-w-2xl text-[9px] leading-relaxed text-zinc-500 2xl:block">
              Ordem protegida: mais antigo → mais novo. O servidor executa{" "}
              {morningSize} às {morningHour}h e {afternoonSize} às{" "}
              {afternoonHour}h, mesmo com o navegador fechado.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 xl:min-w-[430px]">
            {[
              ["Fila", counts.queued ?? 0, "text-white"],
              ["Em análise", counts.generating ?? 0, "text-amber-300"],
              ["Alto potencial", highPotential, "text-cyan-300"],
              ["Ciclo", `${cyclePercent}%`, "text-emerald-300"],
            ].map(([label, value, color]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-1.5 backdrop-blur-sm"
              >
                <p className={`text-sm font-black ${color}`}>{value}</p>
                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/80 p-1.5 shadow-lg shadow-black/20">
        <button
          type="button"
          disabled={deepScanning || scanning || runningSlot != null || loading}
          onClick={() => void handleDeepScan()}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-[10px] font-black text-cyan-950 transition hover:bg-cyan-300 disabled:opacity-50"
        >
          {deepScanning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          Varredura inteligente
        </button>
        <button
          type="button"
          disabled={scanning || loading}
          onClick={() => void handleScan()}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] font-bold text-zinc-300 hover:border-zinc-600"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`}
          />
          Sincronizar canal
        </button>
        <div className="mx-1 hidden h-6 w-px bg-zinc-800 sm:block" />
        <span className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[9px] font-bold text-amber-300">
          ☀ {runEntryLabel(dashboard?.dailyRuns?.morning ?? null)}
        </span>
        <span className="rounded-lg bg-orange-500/10 px-2.5 py-1.5 text-[9px] font-bold text-orange-300">
          ◐ {runEntryLabel(dashboard?.dailyRuns?.afternoon ?? null)}
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto rounded-lg px-2.5 py-1.5 text-[9px] font-bold text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
        >
          Atualizar dados
        </button>
      </div>

      <details className="group rounded-xl border border-zinc-800 bg-zinc-950/35">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-200">
          <span>Agenda, alertas e configurações avançadas</span>
          <span className="text-zinc-600 transition group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="space-y-4 border-t border-zinc-800 p-4">
          {dashboard?.cycleProgress && dashboard.cycleProgress.total > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Ciclo {dashboard.cycleProgress.number} · mais antigo → mais
                  novo
                </p>
                <p className="text-[10px] text-zinc-500">
                  {dashboard.cycleProgress.batched}/
                  {dashboard.cycleProgress.total} processados
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
              {dashboard.cycleProgress.nextVideoTitle &&
                !dashboard.cycleProgress.complete && (
                  <p className="text-[10px] text-zinc-500 truncate">
                    Próximo na fila: {dashboard.cycleProgress.nextVideoTitle}
                  </p>
                )}
              {dashboard.cycleProgress.complete && (
                <p className="text-[10px] text-emerald-400">
                  Ciclo concluído — o próximo batch recomeça do vídeo mais
                  antigo.
                </p>
              )}
            </div>
          )}

          {dashboard?.scanDiagnostics &&
            (dashboard.scanDiagnostics.channelTotal ??
              dashboard.scanDiagnostics.publishedOnDisk) > 0 &&
            dashboard.scanDiagnostics.eligibleCount === 0 && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 space-y-2 text-[11px] text-sky-100">
                <p className="font-bold">
                  {dashboard.scanDiagnostics.channelTotal ??
                    dashboard.scanDiagnostics.publishedOnDisk}{" "}
                  vídeo(s) no canal
                  {dashboard.scanDiagnostics.channelTitle
                    ? ` “${dashboard.scanDiagnostics.channelTitle}”`
                    : ""}{" "}
                  — nenhum elegível ainda
                </p>
                {(dashboard.scanDiagnostics.withLumieraProject ?? 0) > 0 && (
                  <p className="text-[10px] opacity-80">
                    {dashboard.scanDiagnostics.withLumieraProject} com projeto
                    Lumiera vinculado
                    {(dashboard.scanDiagnostics.channelOnlyCount ?? 0) > 0
                      ? ` · ${dashboard.scanDiagnostics.channelOnlyCount} só no canal`
                      : ""}
                  </p>
                )}
                <p className="opacity-90">
                  Regra atual: só entram vídeos com +
                  {dashboard.scanDiagnostics.minAgeDays} dias no ar.
                  {dashboard.scanDiagnostics.nextToQualify && (
                    <>
                      {" "}
                      O mais antigo é{" "}
                      <strong>
                        {dashboard.scanDiagnostics.nextToQualify.title}
                      </strong>{" "}
                      ({dashboard.scanDiagnostics.nextToQualify.ageDays}d) —
                      elegível em ~
                      {
                        dashboard.scanDiagnostics.nextToQualify
                          .daysUntilEligible
                      }
                      d
                      {dashboard.scanDiagnostics.nextToQualify.eligibleOn && (
                        <>
                          {" "}
                          (
                          {new Date(
                            dashboard.scanDiagnostics.nextToQualify.eligibleOn
                          ).toLocaleDateString("pt-BR")}
                          )
                        </>
                      )}
                      .
                    </>
                  )}
                </p>
                {(dashboard.scanDiagnostics.tooYoung?.length ?? 0) > 0 && (
                  <ul className="text-[10px] text-sky-200/80 space-y-0.5 max-h-24 overflow-y-auto">
                    {dashboard.scanDiagnostics.tooYoung!.map((v) => (
                      <li
                        key={`${v.projectName}-${v.ageDays}`}
                        className="truncate"
                      >
                        {v.title} · {v.ageDays}d · faltam {v.daysUntilEligible}d
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] text-sky-200/70">
                  Pode reduzir &quot;Idade mín. (dias)&quot; abaixo se quiser
                  ressuscitar vídeos mais recentes.
                </p>
              </div>
            )}

          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={`${alert.type}-${alert.slot}`}
                  className={`rounded-xl border px-4 py-3 flex items-start gap-3 text-[11px] ${
                    alert.severity === "warning"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  {alert.severity === "warning" ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold">
                      {slotLabel(
                        alert.slot,
                        alert.slot === "morning" ? morningHour : afternoonHour
                      )}
                    </p>
                    <p className="opacity-90">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Agenda diária
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`rounded-xl border p-3 ${schedule?.morningRan ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/60"}`}
              >
                <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-200">
                  <Sun className="w-4 h-4 text-amber-400" />
                  {slotLabel("morning", morningHour)} · {morningSize} vídeos
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {runEntryLabel(dashboard?.dailyRuns?.morning ?? null)}
                </p>
              </div>
              <div
                className={`rounded-xl border p-3 ${schedule?.afternoonRan ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/60"}`}
              >
                <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-200">
                  <Sunset className="w-4 h-4 text-orange-400" />
                  {slotLabel("afternoon", afternoonHour)} · {afternoonSize}{" "}
                  vídeos
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {runEntryLabel(dashboard?.dailyRuns?.afternoon ?? null)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-zinc-600">
              Vídeos processados de manhã não entram no batch da tarde. O
              serviço executa os horários mesmo com o navegador fechado e
              recupera lotes atrasados quando o backend volta a ficar online.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Configuração
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-[11px] text-zinc-300">
                <input
                  type="checkbox"
                  checked={dashboard?.settings?.enabled ?? true}
                  onChange={(e) =>
                    void saveSettings({ enabled: e.target.checked }).catch(
                      (err) => toast(String(err.message))
                    )
                  }
                />
                Ativo
              </label>
              <label className="flex items-center gap-2 text-[11px] text-zinc-300">
                <input
                  type="checkbox"
                  checked={dashboard?.settings?.autoRunWhenAppOpen ?? true}
                  onChange={(e) =>
                    void saveSettings({
                      autoRunWhenAppOpen: e.target.checked,
                    }).catch((err) => toast(String(err.message)))
                  }
                />
                Agendamento no servidor (11h e 18h)
              </label>
              <label className="flex items-center gap-2 text-[11px] text-zinc-300">
                <input
                  type="checkbox"
                  checked={dashboard?.settings?.autoApplyToYoutube !== false}
                  onChange={(e) =>
                    void saveSettings({
                      autoApplyToYoutube: e.target.checked,
                    }).catch((err) => toast(String(err.message)))
                  }
                />
                Publicar automaticamente no YouTube
              </label>
              <div>
                <span className="text-[9px] text-zinc-500 uppercase">
                  Idade mín. (dias)
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="dash-input w-full text-xs mt-0.5"
                  value={dashboard?.settings?.minAgeDays ?? 10}
                  onChange={(e) =>
                    void saveSettings({
                      minAgeDays: parseInt(e.target.value, 10) || 10,
                    })
                  }
                />
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 uppercase">
                  Manhã (qtd)
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="dash-input w-full text-xs mt-0.5"
                  value={morningSize}
                  onChange={(e) =>
                    void saveSettings({
                      morningBatchSize: parseInt(e.target.value, 10) || 5,
                    })
                  }
                />
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 uppercase">
                  Tarde (qtd)
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="dash-input w-full text-xs mt-0.5"
                  value={afternoonSize}
                  onChange={(e) =>
                    void saveSettings({
                      afternoonBatchSize: parseInt(e.target.value, 10) || 5,
                    })
                  }
                />
              </div>
            </div>
            {dashboard?.lastDailyRunAt && (
              <p className="text-[10px] text-zinc-600">
                Último batch:{" "}
                {new Date(dashboard.lastDailyRunAt).toLocaleString("pt-BR")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={scanning || loading}
                onClick={() => void handleScan()}
                className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 flex items-center gap-1.5"
              >
                {scanning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Escanear elegíveis
              </button>
              <button
                type="button"
                disabled={
                  deepScanning || scanning || runningSlot != null || loading
                }
                onClick={() => void handleDeepScan()}
                className="text-[10px] font-bold px-3 py-2 rounded-lg border border-cyan-500/35 bg-cyan-500/10 text-cyan-100 flex items-center gap-1.5"
              >
                {deepScanning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                Varredura inteligente do canal
              </button>
              <button
                type="button"
                disabled={
                  runningSlot != null || loading || schedule?.morningRan
                }
                onClick={() => void handleRunBatch("morning")}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                {runningSlot === "morning" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sun className="w-3.5 h-3.5" />
                )}
                Batch manhã ({morningSize})
              </button>
              <button
                type="button"
                disabled={
                  runningSlot != null || loading || schedule?.afternoonRan
                }
                onClick={() => void handleRunBatch("afternoon")}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                {runningSlot === "afternoon" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sunset className="w-3.5 h-3.5" />
                )}
                Batch tarde ({afternoonSize})
              </button>
              {(counts.review ?? 0) > 0 &&
                dashboard?.settings?.autoApplyToYoutube === false && (
                  <button
                    type="button"
                    disabled={applyingPending || runningSlot != null}
                    onClick={() => void applyPendingReviews()}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
                  >
                    {applyingPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
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
                  {retrying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Reprocessar falhas ({counts.failed})
                </button>
              )}
              <button
                type="button"
                onClick={() => void load()}
                className="text-[10px] text-zinc-500 px-2"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </details>

      <div className="grid grid-cols-1 gap-3 xl:h-[calc(100vh-285px)] xl:min-h-[520px] xl:grid-cols-[minmax(340px,0.72fr)_minmax(560px,1.28fr)]">
        <div className="h-full overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/45 p-3 pr-2">
          <div className="sticky top-0 z-10 -mx-1 mb-3 border-b border-zinc-800 bg-zinc-950/95 px-1 pb-3 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-400 font-bold">
                Últimos vídeos alterados
              </p>
              <span className="font-mono text-[9px] text-zinc-600">
                {recentChangedItems.length}/10
              </span>
            </div>
          </div>
          {loading && <p className="text-xs text-zinc-500">Carregando…</p>}
          {!loading && recentChangedItems.length === 0 && (
            <p className="text-xs text-zinc-500 italic">
              Nenhum vídeo foi alterado neste ciclo.
            </p>
          )}
          <div className="space-y-2">
            {recentChangedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left rounded-xl border p-3 transition ${
                  selectedId === item.id
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                }`}
              >
                <div className="flex gap-2">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-16 h-9 object-cover rounded shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-9 bg-zinc-800 rounded flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-zinc-200 truncate">
                      {item.title}
                    </p>
                    <p className="text-[9px] text-zinc-500 truncate">
                      {item.appliedAt
                        ? new Date(item.appliedAt).toLocaleString("pt-BR")
                        : ""}{" "}
                      · {item.format}
                    </p>
                    <span className="mt-1 inline-block rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] text-emerald-300">
                      Publicado no YouTube
                    </span>
                    {item.diagnosis && (
                      <span className="ml-1 mt-1 inline-block rounded bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-bold text-cyan-300">
                        potencial {item.diagnosis.score}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="h-full min-h-[420px] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
          {!selected ? (
            <p className="text-xs text-zinc-500">Selecione um vídeo na fila.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between gap-2 items-start">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-100 truncate">
                    {selected.title}
                  </p>
                  <a
                    href={`https://www.youtube.com/watch?v=${selected.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-amber-400/90 inline-flex items-center gap-1"
                  >
                    Abrir no YouTube <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {selected.status === "applied" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
              </div>

              {selected.status === "applied" && selected.proposedMetadata && (
                <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.035] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
                      Alterações publicadas
                    </p>
                    <span className="text-[9px] text-zinc-500">
                      {selected.appliedAt
                        ? new Date(selected.appliedAt).toLocaleString("pt-BR")
                        : ""}
                    </span>
                  </div>
                  <div className="grid gap-2 2xl:grid-cols-2">
                    <div className="rounded-lg border border-zinc-800 bg-black/20 p-2.5">
                      <p className="mb-1 text-[8px] font-bold uppercase text-zinc-600">
                        Título anterior
                      </p>
                      <p className="text-[10px] leading-relaxed text-zinc-400">
                        {selected.currentMetadata?.title || "Não registrado"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                      <p className="mb-1 text-[8px] font-bold uppercase text-emerald-500/70">
                        Título publicado
                      </p>
                      <p className="text-[10px] font-semibold leading-relaxed text-zinc-100">
                        {selected.selectedTitle ||
                          selected.proposedMetadata.title}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-black/20 p-2.5">
                      <p className="mb-1 text-[8px] font-bold uppercase text-zinc-600">
                        Descrição anterior
                      </p>
                      <p className="line-clamp-4 whitespace-pre-wrap text-[9px] leading-relaxed text-zinc-500">
                        {selected.currentMetadata?.description ||
                          "Não registrada"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                      <p className="mb-1 text-[8px] font-bold uppercase text-emerald-500/70">
                        Descrição publicada
                      </p>
                      <p className="line-clamp-4 whitespace-pre-wrap text-[9px] leading-relaxed text-zinc-300">
                        {selected.proposedMetadata.description ||
                          "Sem alteração"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-black/20 p-2.5">
                    <p className="mb-1 text-[8px] font-bold uppercase text-zinc-600">
                      Tags publicadas
                    </p>
                    <p className="text-[9px] leading-relaxed text-cyan-200/80">
                      {selected.proposedMetadata.tags?.join(" · ") ||
                        "Sem tags"}
                    </p>
                  </div>
                  {selected.format === "LONG" && (
                    <p className="text-[9px] text-zinc-500">
                      Thumbnail: {selected.thumbnailStatus || "não alterada"}
                    </p>
                  )}
                </div>
              )}

              <div className="relative overflow-hidden rounded-xl border border-cyan-500/25 bg-[linear-gradient(120deg,rgba(8,145,178,0.10),rgba(9,9,11,0.72)_55%)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300/80">
                      Diagnóstico Ressuscitador 2.0
                    </p>
                    <p className="mt-1 text-xs font-semibold text-zinc-100">
                      {selected.diagnosis?.treatmentLabel ||
                        "Colete o baseline antes de alterar o vídeo"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.diagnosis && (
                      <span
                        className={`rounded-lg border px-2 py-1 font-mono text-sm font-black ${
                          selected.diagnosis.tier === "high"
                            ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
                            : selected.diagnosis.tier === "medium"
                              ? "border-amber-400/35 bg-amber-400/10 text-amber-300"
                              : "border-zinc-600 bg-zinc-800/70 text-zinc-300"
                        }`}
                        title="Pontuação de recuperabilidade"
                      >
                        {selected.diagnosis.score}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={diagnosing}
                      onClick={() => void handleDiagnose()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-bold text-cyan-100 transition hover:bg-cyan-400/15 disabled:opacity-50"
                    >
                      {diagnosing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      Analisar 28 dias
                    </button>
                  </div>
                </div>
                {selected.diagnosis && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-2">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                        Por que vale testar
                      </p>
                      <ul className="mt-1 space-y-1 text-[10px] text-zinc-300">
                        {selected.diagnosis.reasons.map((reason) => (
                          <li key={reason}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-2">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                        Baseline recente
                      </p>
                      <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-zinc-300">
                        <span>
                          Views: {selected.diagnosis.metrics?.recentViews ?? 0}
                        </span>
                        <span>
                          Compart.: {selected.diagnosis.metrics?.shares ?? 0}
                        </span>
                        <span>
                          Duração média:{" "}
                          {selected.diagnosis.metrics?.averageViewDuration ?? 0}
                          s
                        </span>
                        <span>
                          Inscritos:{" "}
                          {selected.diagnosis.metrics?.subscribersGained ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {(selected.status === "review" ||
                selected.status === "applied") &&
                selected.proposedMetadata && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-zinc-500 font-bold">
                        Título (SEO)
                      </label>
                      <select
                        className="dash-select w-full text-xs"
                        value={
                          selected.selectedTitle ||
                          selected.proposedMetadata.title ||
                          ""
                        }
                        disabled={selected.status === "applied"}
                        onChange={(e) =>
                          void patchItem(selected.id, {
                            selectedTitle: e.target.value,
                          })
                        }
                      >
                        {(
                          selected.proposedMetadata.titleVariants || [
                            selected.proposedMetadata.title || "",
                          ]
                        ).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-zinc-500 font-bold">
                        Descrição
                      </label>
                      <textarea
                        className="dash-input w-full text-[11px] min-h-[120px] font-mono"
                        value={selected.proposedMetadata.description || ""}
                        readOnly={selected.status === "applied"}
                        onChange={(e) =>
                          void patchItem(selected.id, {
                            proposedMetadata: {
                              ...selected.proposedMetadata,
                              description: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-zinc-500 font-bold">
                        Tags
                      </label>
                      <input
                        className="dash-input w-full text-xs"
                        value={(selected.proposedMetadata.tags || []).join(
                          ", "
                        )}
                        readOnly={selected.status === "applied"}
                        onChange={(e) =>
                          void patchItem(selected.id, {
                            proposedMetadata: {
                              ...selected.proposedMetadata,
                              tags: e.target.value
                                .split(",")
                                .map((t) => t.trim())
                                .filter(Boolean),
                            },
                          })
                        }
                      />
                      {selected.proposedMetadata.hashtags && (
                        <p className="text-[9px] text-zinc-600">
                          Hashtags: {selected.proposedMetadata.hashtags}
                        </p>
                      )}
                    </div>

                    {selected.format === "LONG" && (
                      <div className="rounded-xl border border-dashed border-zinc-700 p-3 space-y-2">
                        <p className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
                          <ImagePlus className="w-3.5 h-3.5" /> Thumbnail
                          (upload manual)
                        </p>
                        <p className="text-[9px] text-zinc-500">
                          Status:{" "}
                          {selected.thumbnailStatus || "awaiting_manual"}
                          {selected.thumbnailLocalPath
                            ? " · arquivo pronto"
                            : ""}
                        </p>
                        <label className="inline-flex items-center gap-2 text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 cursor-pointer hover:border-amber-500/40">
                          {uploadingThumb ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
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

                    {selected.status === "applied" ? (
                      <p className="text-[10px] text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Publicado no YouTube
                        {selected.appliedAt && (
                          <span className="text-zinc-500">
                            ·{" "}
                            {new Date(selected.appliedAt).toLocaleString(
                              "pt-BR"
                            )}
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
                          {applying ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Aplicar no YouTube
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void patchItem(selected.id, { status: "skipped" })
                          }
                          className="text-[10px] text-zinc-500 px-3 py-2 border border-zinc-800 rounded-lg"
                        >
                          Ignorar
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-300/90 flex items-center gap-1.5">
                        {applyingPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5" />
                        )}
                        Publicando automaticamente no YouTube…
                      </p>
                    )}
                  </>
                )}

              {selected.status === "queued" && (
                <p className="text-xs text-zinc-500">
                  Na fila — será processado no próximo batch (manhã ou tarde) ou
                  dispare manualmente.
                </p>
              )}
              {selected.status === "failed" && selected.error && (
                <p className="text-xs text-red-400">{selected.error}</p>
              )}
              {selected.currentMetadata && (
                <details className="text-[10px] text-zinc-600">
                  <summary className="cursor-pointer text-zinc-500">
                    Metadados atuais no YouTube
                  </summary>
                  <p className="mt-2 font-mono whitespace-pre-wrap">
                    {selected.currentMetadata.title}
                  </p>
                  <p className="mt-1 line-clamp-4">
                    {selected.currentMetadata.description}
                  </p>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
