import React, { useState, useEffect } from "react";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "ai" | "render";
  source: string;
  message: string;
  details?: any;
}

export interface ActiveJob {
  id: string;
  sceneId?: string | null;
  queue: string;
  type: string;
  status: string;
  progress: number;
  attempts: number;
  errorMessage?: string | null;
  startedAt?: string | null;
}

interface ProcessLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle?: () => void;
  activeJobs: ActiveJob[];
  onRefreshProject: () => void;
}

export function ProcessLogDrawer({
  isOpen,
  onClose,
  onToggle,
  activeJobs,
  onRefreshProject,
}: ProcessLogDrawerProps) {
  const [tab, setTab] = useState<"jobs" | "logs" | "errors">("jobs");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>("all");
  const [canceling, setCanceling] = useState(false);

  // Poll logs periodically when drawer is open or floating button is mounted
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/v1/logs?limit=100");
        if (res.ok) {
          const data = await res.json();
          if (data.logs) setLogs(data.logs);
        }
      } catch (err) {
        console.error("Failed to fetch logs", err);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelAll = async () => {
    if (!confirm("Deseja realmente encerrar TODOS os processos em andamento?")) return;
    setCanceling(true);
    try {
      const res = await fetch("/v1/jobs/cancel-all", { method: "POST" });
      if (res.ok) {
        onRefreshProject();
      }
    } catch {
      alert("Erro ao encerrar processos");
    } finally {
      setCanceling(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (logFilter === "all") return true;
    return l.level === logFilter;
  });

  const failedJobs = activeJobs.filter((j) => j.status === "failed");
  const runningJobs = activeJobs.filter((j) => j.status === "active" || j.status === "pending");

  return (
    <>
      {/* Floating Action Button on the right side */}
      <button
        onClick={() => (isOpen ? onClose() : onToggle ? onToggle() : null)}
        title="Abrir Central de Processos & Logs (1 Processo por vez)"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9980,
          background: runningJobs.length > 0
            ? "linear-gradient(135deg, rgba(6, 182, 212, 0.95), rgba(108, 99, 255, 0.95))"
            : "linear-gradient(135deg, rgba(26, 26, 46, 0.9), rgba(34, 34, 58, 0.95))",
          color: "#fff",
          border: runningJobs.length > 0 ? "1px solid #06b6d4" : "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 30,
          padding: "10px 18px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: runningJobs.length > 0
            ? "0 4px 20px rgba(6, 182, 212, 0.4), 0 0 15px rgba(6, 182, 212, 0.3)"
            : "0 4px 20px rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          backdropFilter: "blur(12px)",
          transition: "all 0.2s ease",
        }}
      >
        <span style={{ fontSize: 16 }}>⚡</span>
        <span>
          {runningJobs.length > 0
            ? `Processos (${runningJobs.length} ativo)`
            : "Central de Logs"}
        </span>
        {runningJobs.length > 0 && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 8px #22c55e",
              animation: "pulseGlow 1.5s infinite alternate",
            }}
          />
        )}
      </button>

      {/* Slide-over Drawer Panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: 460,
            maxWidth: "90vw",
            background: "#0e0e1a",
            borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "-10px 0 40px rgba(0, 0, 0, 0.8)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            animation: "slideInRight 0.25s ease-out",
          }}
        >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          background: "#161628",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>⚡</span>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#fff" }}>
              Central de Processos & Logs
            </h3>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {runningJobs.length} ativo(s) · {failedJobs.length} erro(s)
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#aaa",
            fontSize: 20,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Control Action Bar */}
      <div
        style={{
          padding: "10px 20px",
          background: "rgba(239, 68, 68, 0.08)",
          borderBottom: "1px solid rgba(239, 68, 68, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>
          {runningJobs.length > 0 ? `🔥 Running (${runningJobs.length})` : "🟢 Sistema ocioso"}
        </span>
        <button
          className="btn"
          disabled={canceling || runningJobs.length === 0}
          onClick={handleCancelAll}
          style={{
            background: "#ef4444",
            color: "#fff",
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 6,
            fontWeight: 700,
          }}
        >
          {canceling ? "Encerrando..." : "⛔ Encerrar Todos os Processos"}
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#121222",
        }}
      >
        <button
          style={{
            flex: 1,
            padding: "10px",
            fontSize: 12,
            fontWeight: 600,
            background: tab === "jobs" ? "rgba(108, 99, 255, 0.15)" : "transparent",
            color: tab === "jobs" ? "var(--accent-primary)" : "var(--text-muted)",
            border: "none",
            borderBottom: tab === "jobs" ? "2px solid var(--accent-primary)" : "none",
            cursor: "pointer",
          }}
          onClick={() => setTab("jobs")}
        >
          ⚡ Processos ({runningJobs.length})
        </button>
        <button
          style={{
            flex: 1,
            padding: "10px",
            fontSize: 12,
            fontWeight: 600,
            background: tab === "logs" ? "rgba(108, 99, 255, 0.15)" : "transparent",
            color: tab === "logs" ? "var(--accent-primary)" : "var(--text-muted)",
            border: "none",
            borderBottom: tab === "logs" ? "2px solid var(--accent-primary)" : "none",
            cursor: "pointer",
          }}
          onClick={() => setTab("logs")}
        >
          📜 Logs ({logs.length})
        </button>
        <button
          style={{
            flex: 1,
            padding: "10px",
            fontSize: 12,
            fontWeight: 600,
            background: tab === "errors" ? "rgba(239, 68, 68, 0.15)" : "transparent",
            color: tab === "errors" ? "#ef4444" : "var(--text-muted)",
            border: "none",
            borderBottom: tab === "errors" ? "2px solid #ef4444" : "none",
            cursor: "pointer",
          }}
          onClick={() => setTab("errors")}
        >
          ⚠️ Erros ({failedJobs.length})
        </button>
      </div>

      {/* Content Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* TAB 1: JOBS */}
        {tab === "jobs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {runningJobs.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>
                ✨ Nenhum processo ativo no momento.
              </div>
            ) : (
              runningJobs.map((job) => (
                <div
                  key={job.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-cyan)" }}>
                      {job.queue.toUpperCase()} {job.sceneId ? `(Cena ${job.sceneId.slice(0, 8)})` : ""}
                    </span>
                    <span className="badge badge-blue">{job.status}</span>
                  </div>

                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>
                    Tipo: {job.type} · Tentativas: {job.attempts}
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 5, background: "rgba(255, 255, 255, 0.1)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(job.progress || 20, 10)}%`,
                        background: "linear-gradient(90deg, #06b6d4, #6c63ff)",
                        transition: "width 300ms ease",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: LOGS */}
        {tab === "logs" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {["all", "info", "ai", "render", "error"].map((lvl) => (
                <button
                  key={lvl}
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    borderRadius: 12,
                    border: "none",
                    background: logFilter === lvl ? "var(--accent-primary)" : "rgba(255,255,255,0.06)",
                    color: "#fff",
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                  onClick={() => setLogFilter(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                background: "#080810",
                borderRadius: 8,
                padding: 12,
                maxHeight: 500,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                    paddingBottom: 4,
                  }}
                >
                  <div style={{ color: "var(--text-muted)", fontSize: 10 }}>
                    [{new Date(log.timestamp).toLocaleTimeString()}] [{log.source}]
                  </div>
                  <div
                    style={{
                      color:
                        log.level === "error"
                          ? "#f87171"
                          : log.level === "ai"
                          ? "#c084fc"
                          : log.level === "render"
                          ? "#38bdf8"
                          : "#e2e8f0",
                      wordBreak: "break-word",
                    }}
                  >
                    {log.message}
                  </div>
                </div>
              ))}
              {!filteredLogs.length && (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>
                  Sem registros de log para exibir.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ERRORS */}
        {tab === "errors" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {failedJobs.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>
                💚 Nenhum erro registrado recentemente.
              </div>
            ) : (
              failedJobs.map((j) => (
                <div
                  key={j.id}
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 12,
                  }}
                >
                  <div style={{ color: "#f87171", fontWeight: 700, marginBottom: 4 }}>
                    🔴 Queue: {j.queue} (Job: {j.id.slice(0, 8)})
                  </div>
                  <div style={{ color: "#fca5a5", fontFamily: "monospace", fontSize: 11 }}>
                    {j.errorMessage || "Erro desconhecido durante execução do render/IA"}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
    )}
    </>
  );
}
