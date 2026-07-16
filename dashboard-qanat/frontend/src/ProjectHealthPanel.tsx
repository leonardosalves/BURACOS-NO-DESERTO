import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Cpu,
  Database,
  FileCheck2,
  Gauge,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Siren,
  Trash2,
  Volume2,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

type HealthStatus = "ok" | "warning" | "error" | "neutral" | "missing";

type HealthReport = {
  generatedAt: string;
  overall: HealthStatus;
  system: {
    pid: number;
    uptimeSeconds: number;
    node: string;
    platform: string;
    memory: { rssBytes: number; heapUsedBytes: number; heapTotalBytes: number };
    disk: {
      status: HealthStatus;
      totalBytes?: number;
      freeBytes?: number;
      freePercent?: number;
      path: string;
    };
  };
  project: null | {
    name: string;
    path: string;
    alerts: string[];
    files: Array<{
      name: string;
      exists: boolean;
      required: boolean;
      bytes: number | null;
      modifiedAt: string | null;
      status: HealthStatus;
    }>;
    integrity: {
      status: HealthStatus;
      auditEvents: number;
      lastAuditEvent: Record<string, unknown> | null;
      checks: Array<{
        id: string;
        label: string;
        status: HealthStatus;
        detail: string;
      }>;
    };
  };
};

type TtsEngine = {
  id: string;
  label: string;
  defaultVoice: string;
  available?: boolean;
  voices?: Array<{ id: string; label: string }>;
  hint?: string;
};

type TempCacheReport = {
  CandidateCount: number;
  CandidateGB: number;
  RemovedCount?: number;
  RemovedGB?: number;
  FailedCount?: number;
  TempRoot: string;
  Items?: Array<{
    Category: string;
    Name: string;
    SizeGB: number;
    Error?: string | null;
  }>;
};

type Props = {
  activeProject: string;
  getProjectUrl: (path: string) => string;
};

const STATUS_META: Record<
  HealthStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  ok: {
    label: "Operacional",
    className: "text-emerald-300 border-emerald-400/25 bg-emerald-400/[0.07]",
    icon: CheckCircle2,
  },
  warning: {
    label: "Atencao",
    className: "text-amber-300 border-amber-400/25 bg-amber-400/[0.07]",
    icon: AlertTriangle,
  },
  error: {
    label: "Critico",
    className: "text-red-300 border-red-400/25 bg-red-400/[0.07]",
    icon: XCircle,
  },
  neutral: {
    label: "Nao aplicado",
    className: "text-zinc-400 border-zinc-700 bg-zinc-900/60",
    icon: CircleDashed,
  },
  missing: {
    label: "Ausente",
    className: "text-zinc-500 border-zinc-800 bg-black/20",
    icon: CircleDashed,
  },
};

function formatBytes(value?: number | null) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  return `${(bytes / 1024 ** index).toFixed(index >= 3 ? 1 : 0)} ${units[index]}`;
}

function formatUptime(seconds = 0) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}min` : `${minutes}min`;
}

export function ProjectHealthPanel({ activeProject, getProjectUrl }: Props) {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [engines, setEngines] = useState<TtsEngine[]>([]);
  const [service, setService] = useState<Record<string, unknown> | null>(null);
  const [tempCache, setTempCache] = useState<TempCacheReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanningCache, setScanningCache] = useState(false);
  const [cleaningCache, setCleaningCache] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [includeExternal, setIncludeExternal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, ttsRes, serviceRes] = await Promise.all([
        fetch(getProjectUrl("/api/project-health"), { cache: "no-store" }),
        fetch(getProjectUrl("/api/tts/voices"), { cache: "no-store" }),
        fetch("/api/ops/service", { cache: "no-store" }),
      ]);
      const [healthData, ttsData, serviceData] = await Promise.all([
        healthRes.json().catch(() => ({})),
        ttsRes.json().catch(() => ({})),
        serviceRes.json().catch(() => ({})),
      ]);
      if (!healthRes.ok)
        throw new Error(String(healthData.error || "Falha no diagnostico"));
      setReport(healthData as HealthReport);
      setEngines(Array.isArray(ttsData.engines) ? ttsData.engines : []);
      setService(serviceRes.ok ? serviceData : null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Falha ao carregar saude do projeto."
      );
    } finally {
      setLoading(false);
    }
  }, [getProjectUrl]);

  useEffect(() => {
    void load();
  }, [load, activeProject]);

  const scanCache = async () => {
    setScanningCache(true);
    try {
      const query = includeExternal ? "?include_external=true" : "";
      const res = await fetch(`/api/project-health/temp-cache${query}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(String(data.error || "Falha ao analisar caches"));
      setTempCache(data as TempCacheReport);
      toast.success(
        `${Number(data.CandidateCount || 0)} cache(s) antigo(s) analisado(s).`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao analisar caches."
      );
    } finally {
      setScanningCache(false);
    }
  };

  const cleanupCache = async () => {
    if (!tempCache?.CandidateCount) return;
    const scope = includeExternal
      ? "caches do Lumiera e caches externos _MEI/Edge"
      : "somente caches antigos do Lumiera";
    if (
      !window.confirm(
        `Remover ${scope}, totalizando ${tempCache.CandidateGB.toFixed(3)} GB?`
      )
    )
      return;
    setCleaningCache(true);
    try {
      const res = await fetch("/api/project-health/temp-cache/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: "LIMPAR",
          includeExternal,
          minimumAgeHours: 24,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || "Falha na limpeza"));
      setTempCache(data as TempCacheReport);
      toast.success(
        `${Number(data.RemovedCount || 0)} pasta(s) removida(s), ${Number(data.RemovedGB || 0).toFixed(3)} GB liberados.`
      );
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao limpar caches."
      );
    } finally {
      setCleaningCache(false);
    }
  };

  const restartService = async () => {
    setRestarting(true);
    try {
      const res = await fetch("/api/ops/restart-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(String(data.error || "Falha ao reiniciar servico"));
      toast.success(String(data.message || "Reinicio agendado."));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao reiniciar servico."
      );
    } finally {
      setRestarting(false);
    }
  };

  const availableEngines = engines.filter(
    (engine) => engine.available !== false
  ).length;
  const overall = report?.overall || "neutral";
  const overallMeta = STATUS_META[overall];
  const overallScore = useMemo(() => {
    if (!report) return 0;
    let score = 100;
    if (report.system.disk.status === "warning") score -= 15;
    if (report.system.disk.status === "error") score -= 35;
    for (const check of report.project?.integrity.checks || []) {
      if (check.status === "warning") score -= 6;
      if (check.status === "error") score -= 22;
    }
    score -=
      (report.project?.files || []).filter(
        (file) => file.required && !file.exists
      ).length * 25;
    score -= engines.filter((engine) => engine.available === false).length * 3;
    return Math.max(0, Math.min(100, score));
  }, [report, engines]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <section className="relative overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[#0a1012] p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(#67e8f9 1px, transparent 1px), linear-gradient(90deg, #67e8f9 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_280px] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200">
              <Activity className="h-3.5 w-3.5" /> Lumiera diagnostics console
            </div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              O programa esta{" "}
              <span
                className={
                  overall === "ok"
                    ? "text-emerald-300"
                    : overall === "error"
                      ? "text-red-300"
                      : "text-amber-300"
                }
              >
                {overallMeta.label.toLowerCase()}
              </span>
              .
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Diagnostico somente leitura de servico, disco, motores de voz e
              cadeia de integridade da narracao.
            </p>
          </div>
          <div className={`border p-4 ${overallMeta.className}`}>
            <div className="flex items-end justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                Indice operacional
              </span>
              <Gauge className="h-5 w-5" />
            </div>
            <div className="mt-3 flex items-end gap-2">
              <strong className="font-mono text-5xl leading-none">
                {loading ? "--" : overallScore}
              </strong>
              <span className="mb-1 text-xs opacity-60">/100</span>
            </div>
            <div className="mt-4 h-1.5 bg-black/30">
              <div
                className="h-full bg-current transition-all duration-700"
                style={{ width: `${overallScore}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-[10px] font-bold text-zinc-300 hover:border-cyan-400/40 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}{" "}
          Atualizar diagnostico
        </button>
        <button
          type="button"
          onClick={() => void restartService()}
          disabled={restarting || service?.canRestart === false}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-[10px] font-bold text-amber-200 disabled:opacity-40"
        >
          {restarting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCw className="h-3.5 w-3.5" />
          )}{" "}
          Reiniciar backend com seguranca
        </button>
        <span className="ml-auto font-mono text-[9px] text-zinc-600">
          {report?.generatedAt
            ? new Date(report.generatedAt).toLocaleString("pt-BR")
            : "aguardando leitura"}
        </span>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Cpu />}
          eyebrow="Processo"
          value={report ? `PID ${report.system.pid}` : "--"}
          detail={
            report
              ? `${report.system.node} · ${formatUptime(report.system.uptimeSeconds)}`
              : "Carregando"
          }
          status="ok"
        />
        <MetricCard
          icon={<HardDrive />}
          eyebrow="Disco"
          value={
            report?.system.disk.freePercent != null
              ? `${report.system.disk.freePercent}% livre`
              : "--"
          }
          detail={
            report?.system.disk.freeBytes != null
              ? `${formatBytes(report.system.disk.freeBytes)} disponiveis`
              : "Sem leitura"
          }
          status={report?.system.disk.status || "neutral"}
        />
        <MetricCard
          icon={<Volume2 />}
          eyebrow="Motores TTS"
          value={`${availableEngines}/${engines.length || 0} online`}
          detail={
            engines.length ? "Padroes isolados por motor" : "Consultando vozes"
          }
          status={
            engines.some((engine) => engine.available === false)
              ? "warning"
              : "ok"
          }
        />
        <MetricCard
          icon={<ShieldCheck />}
          eyebrow="Narracao"
          value={
            report?.project?.integrity.status === "ok"
              ? "Intacta"
              : report?.project
                ? "Revisar"
                : "Sem projeto"
          }
          detail={
            report?.project
              ? `${report.project.integrity.auditEvents} eventos de auditoria`
              : "Selecione um projeto"
          }
          status={report?.project?.integrity.status || "neutral"}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-zinc-800 bg-[#0c0e10]">
          <PanelTitle
            icon={<FileCheck2 />}
            title="Cadeia de integridade"
            subtitle={
              report?.project
                ? report.project.name
                : "Nenhum projeto selecionado"
            }
          />
          <div className="divide-y divide-zinc-800/80">
            {(report?.project?.integrity.checks || []).map((check) => (
              <StatusRow
                key={check.id}
                label={check.label}
                detail={check.detail}
                status={check.status}
              />
            ))}
            {!report?.project && (
              <EmptyRow text="Selecione um projeto para verificar texto aprovado, tags e plano por trechos." />
            )}
          </div>
          {report?.project?.alerts?.length ? (
            <div className="border-t border-red-400/15 bg-red-400/[0.04] p-4">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-red-300">
                <Siren className="h-4 w-4" /> Alertas ativos
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-red-100/70">
                {report.project.alerts.map((alert) => (
                  <li key={alert}>— {alert}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#0c0e10]">
          <PanelTitle
            icon={<Database />}
            title="Arquivos essenciais"
            subtitle={report?.project?.path || "Selecione um projeto"}
          />
          <div className="divide-y divide-zinc-800/80">
            {(report?.project?.files || []).map((file) => (
              <StatusRow
                key={file.name}
                label={file.name}
                detail={
                  file.exists
                    ? `${formatBytes(file.bytes)}${file.modifiedAt ? ` · ${new Date(file.modifiedAt).toLocaleString("pt-BR")}` : ""}`
                    : file.required
                      ? "Obrigatorio e ausente"
                      : "Ainda nao criado"
                }
                status={file.status}
              />
            ))}
            {!report?.project && (
              <EmptyRow text="Os arquivos aparecem aqui sem serem modificados." />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-[#0c0e10] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
                Armazenamento temporario
              </p>
              <h3 className="mt-1 text-lg font-bold text-zinc-100">
                Radar de caches antigos
              </h3>
            </div>
            <Trash2 className="h-5 w-5 text-zinc-600" />
          </div>
          <p className="mt-3 text-[11px] leading-5 text-zinc-500">
            A simulacao encontra apenas pastas com mais de 24 horas e criadas
            antes da inicializacao atual do Windows.
          </p>
          <label className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.04] p-3 text-[10px] text-amber-100/70">
            <input
              type="checkbox"
              checked={includeExternal}
              onChange={(event) => {
                setIncludeExternal(event.target.checked);
                setTempCache(null);
              }}
              className="mt-0.5"
            />
            <span>
              <strong className="text-amber-200">
                Incluir caches externos
              </strong>
              <br />
              Tambem analisa `_MEI` do PyInstaller e Headless Edge. Desativado
              por seguranca.
            </span>
          </label>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void scanCache()}
              disabled={scanningCache}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-2.5 text-[10px] font-bold text-cyan-200 disabled:opacity-40"
            >
              {scanningCache ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <HardDrive className="h-3.5 w-3.5" />
              )}{" "}
              Simular limpeza
            </button>
            <button
              type="button"
              onClick={() => void cleanupCache()}
              disabled={cleaningCache || !tempCache?.CandidateCount}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/25 bg-red-400/[0.06] px-3 py-2.5 text-[10px] font-bold text-red-200 disabled:opacity-35"
            >
              {cleaningCache ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}{" "}
              Limpar
            </button>
          </div>
          {tempCache && (
            <div className="mt-4 border-l-2 border-cyan-300/50 bg-black/20 p-3">
              <p className="font-mono text-2xl font-black text-zinc-100">
                {Number(
                  tempCache.CandidateGB || tempCache.RemovedGB || 0
                ).toFixed(3)}{" "}
                GB
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">
                {tempCache.RemovedCount
                  ? `${tempCache.RemovedCount} removidos`
                  : `${tempCache.CandidateCount} candidatos seguros`}{" "}
                · {tempCache.TempRoot}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#0c0e10]">
          <PanelTitle
            icon={<Volume2 />}
            title="Matriz dos motores TTS"
            subtitle="Disponibilidade e voz padrao efetiva"
          />
          <div className="grid gap-px bg-zinc-800 sm:grid-cols-2">
            {engines.map((engine) => {
              const status: HealthStatus =
                engine.available === false ? "error" : "ok";
              const meta = STATUS_META[status];
              const Icon = meta.icon;
              const voice =
                engine.voices?.find((item) => item.id === engine.defaultVoice)
                  ?.label ||
                engine.defaultVoice ||
                "Nao definida";
              return (
                <div key={engine.id} className="bg-[#0c0e10] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-zinc-200">
                      {engine.label}
                    </span>
                    <Icon
                      className={`h-4 w-4 ${status === "ok" ? "text-emerald-400" : "text-red-400"}`}
                    />
                  </div>
                  <p
                    className="mt-2 truncate font-mono text-[9px] text-cyan-200/75"
                    title={voice}
                  >
                    {voice}
                  </p>
                  <p className="mt-2 line-clamp-2 text-[9px] leading-4 text-zinc-600">
                    {engine.hint ||
                      `${engine.voices?.length || 0} vozes catalogadas`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  eyebrow,
  value,
  detail,
  status,
}: {
  icon: React.ReactElement;
  eyebrow: string;
  value: string;
  detail: string;
  status: HealthStatus;
}) {
  const meta = STATUS_META[status];
  return (
    <div className={`border p-4 ${meta.className}`}>
      <div className="flex items-center justify-between opacity-70">
        <span className="font-mono text-[9px] font-black uppercase tracking-widest">
          {eyebrow}
        </span>
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      </div>
      <p className="mt-4 text-xl font-black text-current">{value}</p>
      <p className="mt-1 truncate text-[9px] opacity-60" title={detail}>
        {detail}
      </p>
    </div>
  );
}

function PanelTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactElement;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-zinc-800 p-4">
      <span className="mt-0.5 text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200">
          {title}
        </h3>
        <p
          className="mt-1 truncate font-mono text-[9px] text-zinc-600"
          title={subtitle}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  detail,
  status,
}: {
  label: string;
  detail: string;
  status: HealthStatus;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${meta.className.split(" ")[0]}`}
      />
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-zinc-200">{label}</p>
        <p className="mt-1 text-[9px] leading-4 text-zinc-500">{detail}</p>
      </div>
      <span
        className={`ml-auto shrink-0 border px-2 py-1 font-mono text-[8px] uppercase ${meta.className}`}
      >
        {meta.label}
      </span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center p-6 text-center">
      <CircleDashed className="h-6 w-6 text-zinc-700" />
      <p className="mt-3 max-w-sm text-[10px] leading-5 text-zinc-600">
        {text}
      </p>
    </div>
  );
}
