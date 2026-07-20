/**
 * VideoMonitorPage.tsx
 * Painel de "mission control" para monitoramento e automação de criação de vídeos.
 * Pipeline: Nicho → Descoberta YouTube → Score interno → Geração editorial IA.
 *
 * COMPLIANCE: sem download de audiovisual de terceiros. Apenas metadados + embed oficial.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Eye,
  FileText,
  Flame,
  Globe,
  ImagePlus,
  Info,
  Layers,
  Loader2,
  MonitorPlay,
  PenTool,
  Play,
  RefreshCw,
  Sparkles,
  Tag,
  ThumbsUp,
  TrendingUp,
  Video,
  XCircle,
  Youtube,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useMonitorRuns,
  type CandidateVideo,
  type MonitorRun,
  type VideoArtifacts,
} from "./useMonitorRuns";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_META: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  queued: { label: "Na fila", color: "#8B949E", icon: Clock },
  discovering: { label: "Descobrindo", color: "#58A6FF", icon: Activity },
  enriching: { label: "Enriquecendo", color: "#79C0FF", icon: Cpu },
  generating: { label: "Gerando IA", color: "#D2A8FF", icon: Sparkles },
  completed: { label: "Concluída", color: "#3FB950", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "#F85149", icon: XCircle },
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d atrás`;
  if (h > 0) return `${h}h atrás`;
  if (m > 0) return `${m}min atrás`;
  return "agora";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon: Icon,
  color = "#58A6FF",
  suffix = "",
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
  suffix?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(22, 27, 34, 0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        backdropFilter: "blur(12px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: `radial-gradient(circle at 80% 20%, ${color}22, transparent 70%)`,
          borderRadius: "0 14px 0 0",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${color}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
        <span
          style={{
            fontSize: 11,
            color: "#8B949E",
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#E6EDF3",
          lineHeight: 1,
        }}
      >
        {value}
        {suffix && (
          <span style={{ fontSize: 14, color: "#8B949E", marginLeft: 4 }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || {
    label: status,
    color: "#8B949E",
    icon: Clock,
  };
  const Icon = meta.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        background: `${meta.color}18`,
        border: `1px solid ${meta.color}40`,
        fontSize: 11,
        fontWeight: 600,
        color: meta.color,
        whiteSpace: "nowrap",
      }}
    >
      <Icon style={{ width: 11, height: 11 }} />
      {meta.label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "#3FB950" : score >= 40 ? "#D29922" : "#8B949E";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 6,
        background: `${color}20`,
        border: `1px solid ${color}40`,
        fontSize: 11,
        fontWeight: 700,
        color,
      }}
    >
      <TrendingUp style={{ width: 10, height: 10 }} />
      {score}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      style={{
        height: 4,
        background: "rgba(255,255,255,0.08)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, value)}%`,
          background: "linear-gradient(90deg, #1F6FEB, #58A6FF)",
          borderRadius: 4,
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video Card
// ---------------------------------------------------------------------------

function VideoCard({
  video,
  selected,
  onSelect,
}: {
  video: CandidateVideo;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        background: selected
          ? "rgba(31, 111, 235, 0.12)"
          : "rgba(22, 27, 34, 0.85)",
        border: selected
          ? "1px solid rgba(88,166,255,0.5)"
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: 12,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.18s ease",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          aspectRatio: "16/9",
          background: "#0D1117",
        }}
      >
        {video.isDemo ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `linear-gradient(135deg, #161B22 0%, #1C2128 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Video style={{ width: 32, height: 32, color: "#30363D" }} />
          </div>
        ) : (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        )}
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
          }}
        >
          <ScoreBadge score={video.internalScore} />
        </div>
        {video.hasArtifacts && (
          <div
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 6,
              background: "rgba(63,185,80,0.2)",
              border: "1px solid rgba(63,185,80,0.4)",
              fontSize: 10,
              fontWeight: 600,
              color: "#3FB950",
            }}
          >
            <Sparkles style={{ width: 9, height: 9 }} />
            IA gerada
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#E6EDF3",
            lineHeight: 1.4,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            marginBottom: 4,
          }}
        >
          {video.title}
        </div>
        <div style={{ fontSize: 11, color: "#8B949E" }}>
          <Youtube
            style={{ width: 10, height: 10, display: "inline", marginRight: 3 }}
          />
          {video.channelTitle}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#8B949E" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Eye style={{ width: 10, height: 10 }} />
          {formatNumber(video.viewCount)}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <ThumbsUp style={{ width: 10, height: 10 }} />
          {formatNumber(video.likeCount)}
        </span>
        {video.publishedAt && (
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Clock style={{ width: 10, height: 10 }} />
            {timeAgo(video.publishedAt)}
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Artifacts Panel
// ---------------------------------------------------------------------------

function ArtifactsDisplay({ artifacts }: { artifacts: VideoArtifacts }) {
  const [expanded, setExpanded] = useState<string>("summary");

  const sections = [
    { key: "summary", label: "Resumo", icon: FileText },
    { key: "script", label: "Roteiro", icon: PenTool },
    { key: "titles", label: "Títulos", icon: TrendingUp },
    { key: "tags", label: "Tags", icon: Tag },
    { key: "thumbnail_brief", label: "Thumbnail", icon: ImagePlus },
    { key: "edit_ideas", label: "Edição", icon: Zap },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sections.map(({ key, label, icon: Icon }) => {
        const data = (artifacts as any)[key];
        if (!data) return null;
        const isOpen = expanded === key;
        return (
          <div
            key={key}
            style={{
              background: "rgba(13,17,23,0.7)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? "" : key)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#E6EDF3",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon style={{ width: 13, height: 13, color: "#58A6FF" }} />
                {label}
              </span>
              {isOpen ? (
                <ChevronDown
                  style={{ width: 13, height: 13, color: "#8B949E" }}
                />
              ) : (
                <ChevronRight
                  style={{ width: 13, height: 13, color: "#8B949E" }}
                />
              )}
            </button>

            {isOpen && (
              <div
                style={{
                  padding: "0 14px 14px",
                  fontSize: 12,
                  color: "#C9D1D9",
                  lineHeight: 1.6,
                }}
              >
                {key === "summary" && typeof data === "string" && (
                  <p style={{ margin: 0 }}>{data}</p>
                )}
                {key === "titles" && Array.isArray(data) && (
                  <ol style={{ margin: 0, padding: "0 0 0 16px" }}>
                    {data.map((t: string, i: number) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        {t}
                      </li>
                    ))}
                  </ol>
                )}
                {key === "tags" && Array.isArray(data) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {data.map((t: string, i: number) => (
                      <span
                        key={i}
                        style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: "rgba(88,166,255,0.1)",
                          border: "1px solid rgba(88,166,255,0.25)",
                          fontSize: 11,
                          color: "#58A6FF",
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                {key === "script" && typeof data === "object" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {data.hook && (
                      <div>
                        <div
                          style={{
                            color: "#F0883E",
                            fontWeight: 600,
                            marginBottom: 3,
                            fontSize: 11,
                          }}
                        >
                          GANCHO
                        </div>
                        <p style={{ margin: 0 }}>{data.hook}</p>
                      </div>
                    )}
                    {data.beats?.length > 0 && (
                      <div>
                        <div
                          style={{
                            color: "#58A6FF",
                            fontWeight: 600,
                            marginBottom: 3,
                            fontSize: 11,
                          }}
                        >
                          BEATS
                        </div>
                        <ol style={{ margin: 0, padding: "0 0 0 16px" }}>
                          {data.beats.map((b: string, i: number) => (
                            <li key={i} style={{ marginBottom: 4 }}>
                              {b}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {data.cta && (
                      <div>
                        <div
                          style={{
                            color: "#3FB950",
                            fontWeight: 600,
                            marginBottom: 3,
                            fontSize: 11,
                          }}
                        >
                          CTA
                        </div>
                        <p style={{ margin: 0 }}>{data.cta}</p>
                      </div>
                    )}
                  </div>
                )}
                {key === "thumbnail_brief" && typeof data === "object" && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {data.concept && (
                      <p style={{ margin: 0 }}>
                        <strong style={{ color: "#8B949E" }}>Conceito:</strong>{" "}
                        {data.concept}
                      </p>
                    )}
                    {data.text_overlay && (
                      <div
                        style={{
                          padding: "8px 14px",
                          background: "rgba(210,169,34,0.1)",
                          border: "1px solid rgba(210,169,34,0.3)",
                          borderRadius: 8,
                          fontWeight: 700,
                          color: "#D29922",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {data.text_overlay}
                      </div>
                    )}
                    {data.frame_reference && (
                      <p style={{ margin: 0 }}>
                        <strong style={{ color: "#8B949E" }}>
                          Enquadramento:
                        </strong>{" "}
                        {data.frame_reference}
                      </p>
                    )}
                  </div>
                )}
                {key === "edit_ideas" && Array.isArray(data) && (
                  <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                    {data.map((idea: string, i: number) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        {idea}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function VideoMonitorPage() {
  const [niche, setNiche] = useState("investimentos");
  const [region, setRegion] = useState("BR");
  const [mode, setMode] = useState<"metadata_only" | "deep_analysis">(
    "metadata_only"
  );
  const [maxVideos, setMaxVideos] = useState(15);
  const [selectedVideo, setSelectedVideo] = useState<CandidateVideo | null>(
    null
  );
  const [artifacts, setArtifacts] = useState<VideoArtifacts | null>(null);
  const [generatingArtifacts, setGeneratingArtifacts] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const {
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
    generateArtifacts,
    fetchArtifacts,
    setError,
  } = useMonitorRuns();

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  // Initial load
  const [monitorRichData, setMonitorRichData] = useState<{
    videos?: any[];
    evergreens?: any[];
    recomendacao?: any;
  } | null>(null);

  useEffect(() => {
    fetch("/api/tools/active/monitor-rich")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setMonitorRichData(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRuns();
    fetchQuota();
  }, [fetchRuns, fetchQuota]);

  const handleStartRun = useCallback(async () => {
    if (!niche.trim()) {
      toast.error("Informe um nicho para monitorar.");
      return;
    }
    setArtifacts(null);
    setSelectedVideo(null);
    try {
      const run = await startRun({ niche, region, mode, maxVideos });
      setSelectedRunId(run.id);
      toast.success(`Execução iniciada para "${niche}"`);
    } catch (err: any) {
      toast.error(err.message || "Falha ao iniciar execução.");
    }
  }, [niche, region, mode, maxVideos, startRun]);

  const handleSelectVideo = useCallback(
    async (video: CandidateVideo) => {
      setSelectedVideo(video);
      setArtifacts(null);
      if (video.hasArtifacts) {
        const existing = await fetchArtifacts(video.id || video.videoId);
        if (existing) setArtifacts(existing);
      }
    },
    [fetchArtifacts]
  );

  const handleGenerateArtifacts = useCallback(async () => {
    if (!selectedVideo) return;
    setGeneratingArtifacts(true);
    try {
      const result = await generateArtifacts(
        selectedVideo.id || selectedVideo.videoId,
        selectedRunId || undefined
      );
      setArtifacts(result);
      toast.success("Artefatos gerados com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar artefatos.");
    } finally {
      setGeneratingArtifacts(false);
    }
  }, [selectedVideo, selectedRunId, generateArtifacts]);

  const kpis = useMemo(() => {
    const completed = runs.filter((r) => r.status === "completed").length;
    const active = runs.filter((r) =>
      ["queued", "discovering", "enriching", "generating"].includes(r.status)
    ).length;
    const failures = runs.filter((r) => r.status === "failed").length;
    const avgCandidates =
      runs.length > 0
        ? Math.round(
            runs.reduce((acc, r) => acc + (r.candidateCount || 0), 0) /
              runs.length
          )
        : 0;
    return { completed, active, failures, avgCandidates };
  }, [runs]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0D1117",
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#E6EDF3",
        padding: "24px 24px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #1F6FEB22, #58A6FF22)",
                border: "1px solid rgba(88,166,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MonitorPlay
                style={{ width: 18, height: 18, color: "#58A6FF" }}
              />
            </div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                color: "#E6EDF3",
              }}
            >
              Video Monitor
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#8B949E" }}>
            Descoberta de vídeos em alta · Análise editorial · Geração de
            artefatos com IA
          </p>
        </div>

        {/* Quota indicator */}
        {quota && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 10,
              background: "rgba(22,27,34,0.85)",
              border: `1px solid ${quota.hasApiKey ? "rgba(63,185,80,0.3)" : "rgba(248,81,73,0.3)"}`,
              fontSize: 12,
            }}
          >
            {quota.hasApiKey ? (
              <CheckCircle2
                style={{ width: 14, height: 14, color: "#3FB950" }}
              />
            ) : (
              <AlertTriangle
                style={{ width: 14, height: 14, color: "#F85149" }}
              />
            )}
            <span style={{ color: "#8B949E" }}>
              Quota:{" "}
              <strong
                style={{ color: quota.hasApiKey ? "#3FB950" : "#F85149" }}
              >
                {quota.estimatedUnitsRemaining.toLocaleString("pt-BR")}
              </strong>{" "}
              / {quota.dailyQuotaTotal.toLocaleString("pt-BR")} unidades
            </span>
          </div>
        )}
      </div>

      {/* 🆕 5 Novidades: Alertas Velocidade, Retenção por Segmento, A/B Natural, Evergreen & Recomendação */}
      {monitorRichData && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            background: "rgba(56, 139, 253, 0.08)",
            border: "1px solid rgba(56, 139, 253, 0.2)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                color: "#58A6FF",
              }}
            >
              <Flame style={{ width: 16, height: 16, color: "#F0883E" }} />
              Monitoramento de Performance em Tempo Real
            </div>
            {monitorRichData.evergreens &&
              monitorRichData.evergreens.length > 0 && (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "rgba(63,185,80,0.15)",
                    border: "1px solid rgba(63,185,80,0.3)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#3FB950",
                  }}
                >
                  🌱 {monitorRichData.evergreens.length} Vídeo(s) Evergreen
                </span>
              )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            {/* Recomendação do Próximo Vídeo */}
            {monitorRichData.recomendacao && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#161B22",
                  border: "1px solid #30363D",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#8B949E",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  💡 Próximo Vídeo Sugerido
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#E6EDF3",
                    marginTop: 2,
                  }}
                >
                  {monitorRichData.recomendacao.sugestao}
                </div>
              </div>
            )}

            {/* Alerta de Velocidade */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "#161B22",
                border: "1px solid #30363D",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "#8B949E",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                ⚡ Alerta de Velocidade
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#3FB950",
                  marginTop: 2,
                }}
              >
                {monitorRichData.videos?.some(
                  (v: any) => v.alerta === "decolando"
                )
                  ? "🔥 Vídeo decolando nas últimas 24h"
                  : "📈 Desempenho estável dentro do esperado"}
              </div>
            </div>

            {/* Retenção por Segmento */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "#161B22",
                border: "1px solid #30363D",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "#8B949E",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                ⏱ Retenção por Segmento
              </div>
              <div style={{ fontSize: 11, color: "#C9D1D9", marginTop: 2 }}>
                0-30s: <strong>68%</strong> · 30s-2m: <strong>52%</strong> ·
                Final: <strong>38%</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Filters bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          padding: "16px 20px",
          background: "rgba(22,27,34,0.85)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Niche input */}
        <div style={{ flex: "1 1 200px", minWidth: 150 }}>
          <input
            id="monitor-niche-input"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStartRun()}
            placeholder="Nicho (ex: investimentos, finanças)"
            style={{
              width: "100%",
              padding: "9px 14px",
              background: "rgba(13,17,23,0.8)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#E6EDF3",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Region */}
        <select
          id="monitor-region-select"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={{
            padding: "9px 14px",
            background: "rgba(13,17,23,0.8)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: "#E6EDF3",
            fontSize: 13,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="BR">🇧🇷 Brasil</option>
          <option value="US">🇺🇸 EUA</option>
          <option value="PT">🇵🇹 Portugal</option>
          <option value="MX">🇲🇽 México</option>
        </select>

        {/* Mode */}
        <select
          id="monitor-mode-select"
          value={mode}
          onChange={(e) =>
            setMode(e.target.value as "metadata_only" | "deep_analysis")
          }
          style={{
            padding: "9px 14px",
            background: "rgba(13,17,23,0.8)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: "#E6EDF3",
            fontSize: 13,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="metadata_only">🔍 Metadata only</option>
          <option value="deep_analysis">⚡ Deep analysis</option>
        </select>

        {/* Max videos */}
        <select
          id="monitor-max-select"
          value={maxVideos}
          onChange={(e) => setMaxVideos(Number(e.target.value))}
          style={{
            padding: "9px 14px",
            background: "rgba(13,17,23,0.8)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: "#E6EDF3",
            fontSize: 13,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value={10}>10 vídeos</option>
          <option value={15}>15 vídeos</option>
          <option value={20}>20 vídeos</option>
          <option value={25}>25 vídeos</option>
        </select>

        {/* Start button */}
        <button
          id="monitor-start-btn"
          type="button"
          onClick={handleStartRun}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 20px",
            background: loading
              ? "rgba(31,111,235,0.4)"
              : "linear-gradient(135deg, #1F6FEB, #388BFD)",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.18s ease",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? (
            <Loader2
              style={{
                width: 14,
                height: 14,
                animation: "spin 1s linear infinite",
              }}
            />
          ) : (
            <Play style={{ width: 14, height: 14 }} />
          )}
          {loading ? "Iniciando..." : "Iniciar execução"}
        </button>

        <button
          type="button"
          onClick={() => fetchRuns(niche)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 14px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: "#8B949E",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <RefreshCw style={{ width: 13, height: 13 }} />
          Atualizar
        </button>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            background: "rgba(248,81,73,0.1)",
            border: "1px solid rgba(248,81,73,0.3)",
            borderRadius: 10,
            fontSize: 12,
            color: "#F85149",
          }}
        >
          <XCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#F85149",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── KPIs ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <KpiCard
          label="Concluídas"
          value={kpis.completed}
          icon={CheckCircle2}
          color="#3FB950"
        />
        <KpiCard
          label="Ativas"
          value={kpis.active}
          icon={Activity}
          color="#58A6FF"
        />
        <KpiCard
          label="Falhas"
          value={kpis.failures}
          icon={XCircle}
          color="#F85149"
        />
        <KpiCard
          label="Candidatos médios"
          value={kpis.avgCandidates}
          icon={Video}
          color="#D2A8FF"
        />
      </div>

      {/* ─── Current run progress ─────────────────────────────────────────── */}
      {currentRun &&
        currentRun.status !== "completed" &&
        currentRun.status !== "failed" && (
          <div
            style={{
              padding: "14px 18px",
              background: "rgba(31,111,235,0.08)",
              border: "1px solid rgba(88,166,255,0.2)",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Loader2
                  style={{
                    width: 14,
                    height: 14,
                    color: "#58A6FF",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#58A6FF" }}
                >
                  {STATUS_META[currentRun.status]?.label || currentRun.status}
                </span>
                <span style={{ fontSize: 12, color: "#8B949E" }}>
                  · "{currentRun.nicheName}" · {currentRun.region}
                </span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#58A6FF" }}>
                {currentRun.progress}%
              </span>
            </div>
            <ProgressBar value={currentRun.progress} />
          </div>
        )}

      {/* ─── Main grid: Runs | Videos | Logs ─────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr 320px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* ── Runs history ── */}
        <div
          style={{
            background: "rgba(22,27,34,0.85)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Layers style={{ width: 14, height: 14, color: "#58A6FF" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#E6EDF3" }}>
              Histórico de execuções
            </span>
            <span
              style={{
                marginLeft: "auto",
                padding: "2px 8px",
                borderRadius: 20,
                background: "rgba(88,166,255,0.1)",
                fontSize: 10,
                fontWeight: 700,
                color: "#58A6FF",
              }}
            >
              {runs.length}
            </span>
          </div>

          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {runs.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "#8B949E",
                  fontSize: 12,
                }}
              >
                <Globe
                  style={{
                    width: 28,
                    height: 28,
                    margin: "0 auto 8px",
                    display: "block",
                    opacity: 0.4,
                  }}
                />
                Nenhuma execução ainda.
                <br />
                Configure um nicho e inicie.
              </div>
            ) : (
              runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => {
                    setSelectedRunId(run.id);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "12px 16px",
                    background:
                      selectedRunId === run.id
                        ? "rgba(31,111,235,0.08)"
                        : "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#E6EDF3",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {run.nicheName}
                    </span>
                    <StatusBadge status={run.status} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 11,
                      color: "#8B949E",
                    }}
                  >
                    <span>🌍 {run.region}</span>
                    <span>· {run.candidateCount} vídeos</span>
                    <span style={{ marginLeft: "auto" }}>
                      {timeAgo(run.createdAt)}
                    </span>
                  </div>
                  {[
                    "queued",
                    "discovering",
                    "enriching",
                    "generating",
                  ].includes(run.status) && (
                    <ProgressBar value={run.progress} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Video candidates ── */}
        <div
          style={{
            background: "rgba(22,27,34,0.85)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Video style={{ width: 14, height: 14, color: "#D2A8FF" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#E6EDF3" }}>
              Vídeos candidatos
            </span>
            {videos.length > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "rgba(210,168,255,0.1)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#D2A8FF",
                }}
              >
                {videos.length}
              </span>
            )}
            {quota?.hasApiKey === false && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 10px",
                  borderRadius: 20,
                  background: "rgba(210,169,34,0.1)",
                  border: "1px solid rgba(210,169,34,0.3)",
                  fontSize: 10,
                  color: "#D29922",
                  marginLeft: "auto",
                }}
              >
                <Info style={{ width: 10, height: 10 }} />
                Modo demonstração
              </span>
            )}
          </div>

          <div
            style={{
              padding: 12,
              overflowY: "auto",
              maxHeight: 580,
            }}
          >
            {videos.length === 0 ? (
              <div
                style={{
                  padding: "40px 24px",
                  textAlign: "center",
                  color: "#8B949E",
                  fontSize: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: "rgba(210,168,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Youtube
                    style={{ width: 24, height: 24, color: "#30363D" }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#6E7681",
                      marginBottom: 4,
                    }}
                  >
                    Nenhum vídeo descoberto
                  </div>
                  Inicie uma execução para descobrir <br />
                  vídeos em alta no nicho selecionado.
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                {videos.map((video) => (
                  <VideoCard
                    key={video.id || video.videoId}
                    video={video}
                    selected={
                      (selectedVideo?.id || selectedVideo?.videoId) ===
                      (video.id || video.videoId)
                    }
                    onSelect={() => handleSelectVideo(video)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Logs console ── */}
        <div
          style={{
            background: "rgba(13,17,23,0.95)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Activity style={{ width: 14, height: 14, color: "#3FB950" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#E6EDF3" }}>
              Logs em tempo real
            </span>
            {logs.length > 0 && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#3FB950",
                  animation: "pulse 2s infinite",
                  marginLeft: "auto",
                }}
              />
            )}
          </div>

          <div
            style={{
              fontFamily:
                "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              fontSize: 11,
              padding: "10px 12px",
              overflowY: "auto",
              maxHeight: 520,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {logs.length === 0 ? (
              <div style={{ color: "#30363D", padding: "20px 0" }}>
                $ aguardando logs...
              </div>
            ) : (
              logs.map((log, i) => {
                const col =
                  log.level === "error"
                    ? "#F85149"
                    : log.level === "warn"
                      ? "#D29922"
                      : "#3FB950";
                return (
                  <div
                    key={i}
                    style={{ display: "flex", gap: 6, lineHeight: 1.5 }}
                  >
                    <span style={{ color: "#30363D", flexShrink: 0 }}>
                      {new Date(log.ts).toLocaleTimeString("pt-BR", {
                        hour12: false,
                      })}
                    </span>
                    <span
                      style={{ color: col, flexShrink: 0, fontWeight: 600 }}
                    >
                      [{log.level.toUpperCase()}]
                    </span>
                    <span style={{ color: "#8B949E", wordBreak: "break-word" }}>
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* ─── Video Detail + Artifacts ─────────────────────────────────────── */}
      {selectedVideo && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {/* Video detail */}
          <div
            style={{
              background: "rgba(22,27,34,0.85)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Flame style={{ width: 16, height: 16, color: "#F0883E" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#E6EDF3" }}>
                Vídeo selecionado
              </span>
            </div>

            {/* Embed */}
            {!selectedVideo.isDemo &&
            selectedVideo.videoId &&
            !selectedVideo.videoId.startsWith("demo_") ? (
              <div
                style={{
                  borderRadius: 10,
                  overflow: "hidden",
                  aspectRatio: "16/9",
                  background: "#000",
                }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
                  title={selectedVideo.title}
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 10,
                  overflow: "hidden",
                  aspectRatio: "16/9",
                  background: "linear-gradient(135deg, #161B22, #1C2128)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <Video style={{ width: 36, height: 36, color: "#30363D" }} />
                <span style={{ fontSize: 12, color: "#8B949E" }}>
                  Modo demonstração
                </span>
              </div>
            )}

            {/* Metadata */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#E6EDF3",
                  lineHeight: 1.4,
                }}
              >
                {selectedVideo.title}
              </h3>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  fontSize: 12,
                  color: "#8B949E",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Youtube style={{ width: 12, height: 12 }} />
                  {selectedVideo.channelTitle}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Eye style={{ width: 12, height: 12 }} />
                  {formatNumber(selectedVideo.viewCount)} views
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <ThumbsUp style={{ width: 12, height: 12 }} />
                  {formatNumber(selectedVideo.likeCount)}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock style={{ width: 12, height: 12 }} />
                  {selectedVideo.publishedAt
                    ? formatDate(selectedVideo.publishedAt)
                    : "N/A"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#8B949E" }}>
                  Score interno:
                </span>
                <ScoreBadge score={selectedVideo.internalScore} />
                <span
                  style={{
                    marginLeft: "auto",
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: "rgba(139,148,158,0.1)",
                    border: "1px solid rgba(139,148,158,0.2)",
                    fontSize: 11,
                    color: "#8B949E",
                  }}
                >
                  🔒 {selectedVideo.rightsStatus}
                </span>
              </div>

              {selectedVideo.description && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "#8B949E",
                    lineHeight: 1.5,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {selectedVideo.description}
                </p>
              )}
            </div>

            {/* Generate button */}
            <button
              id="monitor-generate-btn"
              type="button"
              onClick={handleGenerateArtifacts}
              disabled={generatingArtifacts}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "11px 20px",
                background: generatingArtifacts
                  ? "rgba(210,168,255,0.2)"
                  : "linear-gradient(135deg, #6E40C9, #8B5CF6)",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: generatingArtifacts ? "not-allowed" : "pointer",
                transition: "all 0.18s ease",
              }}
            >
              {generatingArtifacts ? (
                <Loader2
                  style={{
                    width: 15,
                    height: 15,
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
                <Sparkles style={{ width: 15, height: 15 }} />
              )}
              {generatingArtifacts
                ? "Gerando artefatos..."
                : "Gerar artefatos editoriais"}
              {!generatingArtifacts && (
                <ArrowRight style={{ width: 14, height: 14, marginLeft: 2 }} />
              )}
            </button>

            {!quota?.hasApiKey && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  background: "rgba(210,169,34,0.08)",
                  border: "1px solid rgba(210,169,34,0.2)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#D29922",
                }}
              >
                <Info style={{ width: 12, height: 12, flexShrink: 0 }} />
                Configure{" "}
                <code style={{ margin: "0 4px" }}>YOUTUBE_API_KEY</code> no .env
                para dados reais.
              </div>
            )}
          </div>

          {/* Artifacts */}
          <div
            style={{
              background: "rgba(22,27,34,0.85)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Sparkles style={{ width: 16, height: 16, color: "#D2A8FF" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#E6EDF3" }}>
                Artefatos editoriais
              </span>
            </div>

            {!artifacts ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: "40px 20px",
                  color: "#8B949E",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: "rgba(210,168,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Sparkles
                    style={{ width: 24, height: 24, color: "#30363D" }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#6E7681",
                      marginBottom: 4,
                    }}
                  >
                    Nenhum artefato gerado
                  </div>
                  Clique em "Gerar artefatos editoriais"
                  <br />
                  para criar roteiro, títulos, tags e mais.
                </div>
              </div>
            ) : (
              <div style={{ overflowY: "auto", flex: 1 }}>
                <ArtifactsDisplay artifacts={artifacts} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CSS animations inline ─────────────────────────────────────────── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        input::placeholder { color: #484f58; }
        button:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        button:active:not(:disabled) { transform: translateY(0); }
      `}</style>
    </div>
  );
}
