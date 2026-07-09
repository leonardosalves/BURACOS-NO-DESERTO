import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export type NotebooklmStatus = {
  available?: boolean;
  authenticated?: boolean;
  notebookCount?: number;
  loginInProgress?: boolean;
  needsLogin?: boolean;
  cliMissing?: boolean;
  message?: string;
  dataDir?: string;
};

const AUTO_LOGIN_SESSION_KEY = "lumiera_nlm_auto_login_attempted";
const STATUS_EVENT = "lumiera-nlm-status";

function broadcastStatus(status: NotebooklmStatus) {
  window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail: status }));
}

async function parseJsonResponse<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function fetchNotebooklmStatusApi(): Promise<NotebooklmStatus | null> {
  try {
    const res = await fetch("/api/notebooklm/status");
    if (!res.ok) return null;
    return (await parseJsonResponse<NotebooklmStatus>(res)) ?? null;
  } catch {
    return null;
  }
}

export function useNotebooklmAuth(opts?: {
  /** Tenta abrir login uma vez por sessão ao montar, se desconectado */
  autoLogin?: boolean;
  /** Poll após iniciar login até autenticar (ms) */
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}) {
  const [status, setStatus] = useState<NotebooklmStatus | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const pollTimerRef = useRef<number | null>(null);
  const autoAttemptedRef = useRef(false);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const next = await fetchNotebooklmStatusApi();
    if (next) {
      setStatus(next);
      broadcastStatus(next);
    }
    return next;
  }, []);

  const startLoginPoll = useCallback(() => {
    clearPoll();
    const interval = opts?.pollIntervalMs ?? 3000;
    const timeout = opts?.pollTimeoutMs ?? 180000;
    const started = Date.now();

    pollTimerRef.current = window.setInterval(() => {
      void (async () => {
        const next = await refresh();
        if (next?.authenticated) {
          clearPoll();
          setLoggingIn(false);
          toast.success(next.message || "NotebookLM conectado.");
          return;
        }
        if (Date.now() - started > timeout) {
          clearPoll();
          setLoggingIn(false);
          toast(
            "Login ainda pendente — conclua no navegador e clique em Atualizar.",
            { icon: "⏳" }
          );
        }
      })();
    }, interval);
  }, [clearPoll, opts?.pollIntervalMs, opts?.pollTimeoutMs, refresh]);

  const login = useCallback(async () => {
    setLoggingIn(true);
    try {
      const res = await fetch("/api/notebooklm/login", { method: "POST" });
      const data =
        (await parseJsonResponse<Record<string, unknown>>(res)) ?? {};
      if (!res.ok) {
        const fallback =
          res.status === 404
            ? "Rota de login ausente — reinicie o backend (porta 3005) com o código atual."
            : "Falha ao iniciar login NotebookLM.";
        toast.error(String(data.error || fallback), { duration: 8000 });
        setLoggingIn(false);
        return false;
      }
      if (data.alreadyAuthenticated) {
        const merged = {
          ...(data as Record<string, unknown>),
          authenticated: true,
        } as NotebooklmStatus;
        setStatus(merged);
        broadcastStatus(merged);
        setLoggingIn(false);
        toast.success(String(data.message || "NotebookLM já conectado."));
        return true;
      }
      if (data.status) {
        setStatus(data.status as NotebooklmStatus);
        broadcastStatus(data.status as NotebooklmStatus);
      }
      toast.success(String(data.message || "Abrindo navegador para login…"), {
        duration: 8000,
      });
      startLoginPoll();
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro de conexão ao iniciar login."
      );
      setLoggingIn(false);
      return false;
    }
  }, [startLoginPoll]);

  useEffect(() => {
    void refresh();
    return () => clearPoll();
  }, [refresh, clearPoll]);

  useEffect(() => {
    const onExternal = (e: Event) => {
      const detail = (e as CustomEvent<NotebooklmStatus>).detail;
      if (detail) setStatus(detail);
    };
    window.addEventListener(STATUS_EVENT, onExternal);
    return () => window.removeEventListener(STATUS_EVENT, onExternal);
  }, []);

  useEffect(() => {
    if (!opts?.autoLogin || autoAttemptedRef.current) return;
    if (status == null) return;
    if (status.authenticated) return;
    if (status.loginInProgress) return;

    const sessionDone = sessionStorage.getItem(AUTO_LOGIN_SESSION_KEY);
    if (sessionDone) return;

    autoAttemptedRef.current = true;
    sessionStorage.setItem(AUTO_LOGIN_SESSION_KEY, "1");
    void login();
  }, [opts?.autoLogin, status, login]);

  return {
    status,
    loggingIn: loggingIn || Boolean(status?.loginInProgress),
    refresh,
    login,
  };
}
