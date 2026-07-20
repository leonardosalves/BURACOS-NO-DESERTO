/**
 * useMonitorRuns.ts
 * Hook customizado para interagir com a API do Video Monitor.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "/api/monitor";

export type RightsStatus =
  | "owned"
  | "licensed"
  | "creative_commons"
  | "authorized_third_party"
  | "public_metadata_only"
  | "blocked";

export type RunStatus =
  | "queued"
  | "discovering"
  | "enriching"
  | "generating"
  | "completed"
  | "failed";

export interface MonitorRun {
  id: string;
  workspaceId: string;
  nicheName: string;
  region: string;
  mode: "metadata_only" | "deep_analysis";
  sources: string[];
  maxVideos: number;
  status: RunStatus;
  progress: number;
  candidateCount: number;
  rightsStatus: RightsStatus;
  costEstimate: number;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface CandidateVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  rightsStatus: RightsStatus;
  internalScore: number;
  hasArtifacts?: boolean;
  isDemo?: boolean;
}

export interface RunLog {
  ts: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

export interface VideoArtifacts {
  summary?: string;
  titles?: string[];
  tags?: string[];
  script?: {
    hook: string;
    beats: string[];
    cta: string;
  };
  thumbnail_brief?: {
    concept: string;
    text_overlay: string;
    frame_reference: string;
  };
  edit_ideas?: string[];
}

export interface QuotaStatus {
  hasApiKey: boolean;
  estimatedUnitsUsedToday: number;
  dailyQuotaTotal: number;
  estimatedUnitsRemaining: number;
  totalRunsInMemory: number;
  message: string;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erro ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export function useMonitorRuns() {
  const [runs, setRuns] = useState<MonitorRun[]>([]);
  const [currentRun, setCurrentRun] = useState<MonitorRun | null>(null);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [videos, setVideos] = useState<CandidateVideo[]>([]);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const fetchRuns = useCallback(async (niche?: string) => {
    try {
      const qs = niche ? `?niche=${encodeURIComponent(niche)}` : "";
      const data = await apiFetch(`/runs${qs}`);
      setRuns(data.items || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchQuota = useCallback(async () => {
    try {
      const data = await apiFetch("/quota");
      setQuota(data);
    } catch {
      // Non-critical
    }
  }, []);

  const startRun = useCallback(
    async (params: {
      niche: string;
      region: string;
      mode: "metadata_only" | "deep_analysis";
      maxVideos: number;
    }) => {
      setLoading(true);
      setError(null);
      setLogs([]);
      setVideos([]);
      setCurrentRun(null);

      // Fechar SSE anterior
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      try {
        const data = await apiFetch("/runs", {
          method: "POST",
          body: JSON.stringify({ ...params, sources: ["youtube"] }),
        });

        setCurrentRun(data.run);
        subscribeToRun(data.runId);
        await fetchRuns(params.niche);
        return data.run as MonitorRun;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchRuns]
  );

  const subscribeToRun = useCallback((runId: string) => {
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(`${API_BASE}/runs/${runId}/events`);
    esRef.current = es;

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);

        if (data.type === "init") {
          if (data.run) setCurrentRun(data.run);
          if (data.logs?.length) setLogs(data.logs);
          if (data.videos?.length) setVideos(data.videos);
        } else if (data.type === "run.updated") {
          setCurrentRun(data.run);
          setRuns((prev) => {
            const idx = prev.findIndex((r) => r.id === data.run?.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = data.run;
              return next;
            }
            return prev;
          });
        } else if (data.type === "log.appended") {
          setLogs((prev) => [...prev.slice(-199), data.log]);
        } else if (data.type === "videos.discovered") {
          setVideos(data.videos || []);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // SSE reconnects automatically
    };
  }, []);

  const generateArtifacts = useCallback(
    async (
      videoId: string,
      runId?: string,
      tasks?: string[]
    ): Promise<VideoArtifacts> => {
      const data = await apiFetch(`/videos/${videoId}/generate`, {
        method: "POST",
        body: JSON.stringify({
          runId,
          tasks: tasks || [
            "summary",
            "titles",
            "tags",
            "script",
            "thumbnail_brief",
            "edit_ideas",
          ],
          language: "pt-BR",
        }),
      });
      return data.artifacts;
    },
    []
  );

  const fetchArtifacts = useCallback(
    async (videoId: string): Promise<VideoArtifacts | null> => {
      try {
        return await apiFetch(`/artifacts/${videoId}`);
      } catch {
        return null;
      }
    },
    []
  );

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  return {
    runs,
    currentRun,
    logs,
    videos,
    quota,
    loading,
    error,
    fetchRuns,
    fetchQuota,
    startRun,
    subscribeToRun,
    generateArtifacts,
    fetchArtifacts,
    setError,
  };
}
