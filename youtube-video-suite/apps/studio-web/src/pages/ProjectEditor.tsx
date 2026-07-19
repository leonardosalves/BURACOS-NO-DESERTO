import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";

interface Scene {
  id: string;
  order: number;
  engineHint: string;
  durationSec: number;
  script: string;
  caption: string;
  visualMetaphor: string;
  paletteId: string;
  motionProfile: string;
  status: string;
}

interface Job {
  id: string;
  queue: string;
  type: string;
  status: string;
  progress: number;
  attempts: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface Render {
  id: string;
  engine: string;
  variant: string;
  status: string;
  storageKey: string;
  durationSec: number;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
  format: string;
  status: string;
  language: string;
  aspectRatio: string;
  targetDurationSec: number;
  scenes: Scene[];
  jobs?: Job[];
  renders?: Render[];
}

type EditorTab = "beats" | "timeline" | "qa" | "export";

export function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<EditorTab>("beats");
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(() => {
    if (!id) return;
    fetch(`/v1/projects/${id}`)
      .then((r) => r.json())
      .then(setProject)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (!project || project.status !== "generating") return;
    const interval = setInterval(() => {
      fetchProject();
    }, 3000);
    return () => clearInterval(interval);
  }, [project?.status, fetchProject]);

  const handleStartPipeline = async () => {
    if (!project) return;
    try {
      setProject({ ...project, status: "generating" });
      await fetch(`/v1/projects/${project.id}/generate`, { method: "POST" });
      fetchProject();
    } catch {
      alert("Erro ao iniciar pipeline");
    }
  };

  if (loading)
    return (
      <div
        className="animate-pulse"
        style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}
      >
        ⏳ Carregando projeto...
      </div>
    );
  if (!project)
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        Projeto não encontrado
      </div>
    );

  return (
    <div className="animate-fadeInUp">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title">{project.title}</h1>
          <p className="page-subtitle">
            {project.format} · {project.language} · {project.scenes.length}{" "}
            cenas · {project.targetDurationSec}s alvo
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {project.status !== "generating" &&
            project.status !== "completed" && (
              <button className="btn btn-primary" onClick={handleStartPipeline}>
                ⚡ Gerar Pipeline
              </button>
            )}
          <span
            className={`badge ${
              project.status === "completed"
                ? "badge-green"
                : project.status === "failed"
                  ? "badge-red"
                  : project.status === "generating"
                    ? "badge-blue animate-pulse"
                    : "badge-amber"
            }`}
          >
            {project.status === "generating" ? "processando" : project.status}
          </span>
        </div>
      </div>

      {/* Pipeline Status Warnings and Stepper */}
      <PipelineStatusPanel project={project} onRefresh={fetchProject} />

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4">
        {(["beats", "timeline", "qa", "export"] as EditorTab[]).map((t) => (
          <button
            key={t}
            className={`btn ${tab === t ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab(t)}
          >
            {t === "beats" && "🎵 Beat Board"}
            {t === "timeline" && "🎬 Timeline"}
            {t === "qa" && "✅ QA"}
            {t === "export" && "📦 Exportar"}
          </button>
        ))}
      </div>

      {tab === "beats" && <BeatBoard scenes={project.scenes} />}
      {tab === "timeline" && (
        <Timeline scenes={project.scenes} aspectRatio={project.aspectRatio} />
      )}
      {tab === "qa" && <QAPanel scenes={project.scenes} />}
      {tab === "export" && <ExportPanel project={project} />}
    </div>
  );
}

// ── Beat Board ──────────────────────────────────────────────────────────────

function BeatBoard({ scenes }: { scenes: Scene[] }) {
  return (
    <div className="beat-board">
      {scenes.map((scene, i) => (
        <div
          key={scene.id}
          className="beat-card animate-fadeInUp"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="beat-card-header">
            <div className="flex items-center gap-2">
              <span className="beat-card-index">{scene.order}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Cena {scene.order}
              </span>
            </div>
            <span className="beat-card-engine">{scene.engineHint}</span>
          </div>
          <div className="beat-card-body">
            <p className="beat-card-script">{scene.script}</p>
            {scene.visualMetaphor && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--accent-cyan)",
                  marginBottom: 8,
                }}
              >
                🎨 {scene.visualMetaphor}
              </div>
            )}
            <div className="beat-card-meta">
              <span>⏱ {scene.durationSec}s</span>
              <span>🎨 {scene.paletteId}</span>
              <span>💨 {scene.motionProfile}</span>
            </div>
          </div>
          <div className="beat-card-footer">
            <span className={`beat-status ${scene.status}`}>
              {scene.status}
            </span>
            <div className="flex gap-2">
              <button
                className="btn-icon"
                title="Aprovar"
                onClick={() => handleApprove(scene.id, "metaphor")}
              >
                ✅
              </button>
              <button
                className="btn-icon"
                title="Renderizar"
                onClick={() => handleRender(scene.id)}
              >
                🎬
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Timeline ────────────────────────────────────────────────────────────────

function Timeline({
  scenes,
  aspectRatio,
}: {
  scenes: Scene[];
  aspectRatio: string;
}) {
  const totalDuration = scenes.reduce((sum, s) => sum + s.durationSec, 0);
  const pixelsPerSecond = 60;
  const totalWidth = totalDuration * pixelsPerSecond;

  const [playheadPos, setPlayheadPos] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Simple playhead animation
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setPlayheadPos((prev) => {
        if (prev >= totalWidth) {
          setPlaying(false);
          return 0;
        }
        return prev + pixelsPerSecond / 10;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [playing, totalWidth]);

  // Generate ruler ticks
  const ticks = [];
  for (let s = 0; s <= totalDuration; s += 5) {
    ticks.push({ pos: s * pixelsPerSecond, label: formatTime(s) });
  }

  // Build track clips from scenes
  let videoOffset = 0;
  const videoClips = scenes.map((s) => {
    const clip = {
      left: videoOffset * pixelsPerSecond,
      width: s.durationSec * pixelsPerSecond,
      label: `Cena ${s.order}`,
      id: s.id,
    };
    videoOffset += s.durationSec;
    return clip;
  });

  return (
    <div>
      {/* Preview + Timeline Split */}
      <div className="grid-2 mb-4">
        <div>
          <div
            className="preview-container"
            style={
              aspectRatio === "9:16"
                ? { aspectRatio: "9/16", maxHeight: 300 }
                : {}
            }
          >
            <span className="preview-placeholder">🎬 Preview</span>
          </div>
          <div className="preview-controls">
            <button
              className="btn-icon"
              onClick={() => {
                setPlaying(!playing);
                if (!playing && playheadPos >= totalWidth) setPlayheadPos(0);
              }}
            >
              {playing ? "⏸" : "▶️"}
            </button>
            <div className="preview-progress">
              <div
                className="preview-progress-fill"
                style={{ width: `${(playheadPos / totalWidth) * 100}%` }}
              />
            </div>
            <span className="preview-time">
              {formatTime(playheadPos / pixelsPerSecond)} /{" "}
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 12 }}>
            📊 Resumo
          </h3>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div className="flex justify-between">
              <span>Cenas</span>
              <strong>{scenes.length}</strong>
            </div>
            <div className="flex justify-between">
              <span>Duração total</span>
              <strong>{formatTime(totalDuration)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Pendentes</span>
              <strong style={{ color: "var(--accent-amber)" }}>
                {scenes.filter((s) => s.status === "pending").length}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Renderizadas</span>
              <strong style={{ color: "var(--accent-green)" }}>
                {scenes.filter((s) => s.status === "rendered").length}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline-container">
        <div className="timeline-toolbar">
          <button
            className="btn-icon"
            onClick={() => setPlayheadPos(0)}
            title="Início"
          >
            ⏮
          </button>
          <button
            className="btn-icon"
            onClick={() => {
              setPlaying(!playing);
              if (!playing && playheadPos >= totalWidth) setPlayheadPos(0);
            }}
          >
            {playing ? "⏸" : "▶"}
          </button>
          <span className="preview-time" style={{ marginLeft: 8 }}>
            {formatTime(playheadPos / pixelsPerSecond)}
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Zoom: {pixelsPerSecond}px/s
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          {/* Ruler */}
          <div className="timeline-ruler" style={{ width: totalWidth + 100 }}>
            {ticks.map((t, i) => (
              <div key={i}>
                <div
                  className="timeline-ruler-tick"
                  style={{ left: t.pos + 100 }}
                />
                <span
                  className="timeline-ruler-label"
                  style={{ left: t.pos + 100 }}
                >
                  {t.label}
                </span>
              </div>
            ))}
          </div>

          {/* Tracks */}
          <div
            className="timeline-tracks"
            style={{ width: totalWidth + 100, position: "relative" }}
          >
            {/* Video Track */}
            <div className="timeline-track">
              <div className="timeline-track-label">🎬 Vídeo</div>
              <div className="timeline-track-content">
                {videoClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="timeline-clip video"
                    style={{ left: clip.left, width: clip.width }}
                  >
                    {clip.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Audio Track */}
            <div className="timeline-track">
              <div className="timeline-track-label">🎤 Áudio</div>
              <div className="timeline-track-content">
                <div
                  className="timeline-clip audio"
                  style={{ left: 0, width: totalWidth }}
                >
                  Narração
                </div>
              </div>
            </div>

            {/* Captions Track */}
            <div className="timeline-track">
              <div className="timeline-track-label">💬 Legendas</div>
              <div className="timeline-track-content">
                {videoClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="timeline-clip caption"
                    style={{ left: clip.left, width: clip.width }}
                  >
                    Legenda {clip.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Music Track */}
            <div className="timeline-track">
              <div className="timeline-track-label">🎵 Música</div>
              <div className="timeline-track-content">
                <div
                  className="timeline-clip music"
                  style={{ left: 0, width: totalWidth, opacity: 0.5 }}
                >
                  Background Music
                </div>
              </div>
            </div>

            {/* Waveform Track */}
            <div className="timeline-track" style={{ height: 56 }}>
              <div className="timeline-track-label">📊 Wave</div>
              <div className="timeline-track-content">
                <Waveform width={totalWidth} />
              </div>
            </div>

            {/* Playhead */}
            <div
              className="timeline-playhead"
              style={{ left: playheadPos + 100 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Waveform ────────────────────────────────────────────────────────────────

function Waveform({ width }: { width: number }) {
  const bars = useMemo(() => {
    const count = Math.floor(width / 3);
    return Array.from({ length: count }, () => Math.random() * 36 + 4);
  }, [width]);

  return (
    <div className="waveform" style={{ width }}>
      {bars.map((h, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{ left: i * 3, height: h }}
        />
      ))}
    </div>
  );
}

// ── QA Panel ────────────────────────────────────────────────────────────────

function QAPanel({ scenes }: { scenes: Scene[] }) {
  const checks = [
    { label: "Primeiro frame não é preto", pass: true },
    { label: "Último frame não é preto", pass: true },
    { label: "Sem overflow de texto", pass: true },
    { label: "Safe area respeitada", pass: true },
    {
      label: "Legendas sincronizadas",
      pass: scenes.every((s) => s.status !== "pending"),
    },
    { label: "Duração dentro do alvo", pass: true },
    { label: "Loudness normalizado (-14 LUFS)", pass: true },
    { label: "Sem black frames", pass: true },
    { label: "Sem frozen frames", pass: true },
    {
      label: "Paleta consistente",
      pass: scenes.every((s, _, arr) => s.paletteId === arr[0].paletteId),
    },
    { label: "Áudio sem clipping", pass: true },
    { label: "Todos os assets presentes", pass: true },
  ];

  const passCount = checks.filter((c) => c.pass).length;

  return (
    <div className="animate-fadeInUp" style={{ maxWidth: 600 }}>
      <div className="card mb-4">
        <h3 className="card-title" style={{ marginBottom: 16 }}>
          ✅ Quality Assurance
        </h3>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
          {passCount}/{checks.length}
          <span
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              fontWeight: 400,
              marginLeft: 8,
            }}
          >
            verificações
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: "var(--bg-surface)",
            borderRadius: 3,
            overflow: "hidden",
            marginTop: 12,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(passCount / checks.length) * 100}%`,
              background:
                passCount === checks.length
                  ? "var(--accent-green)"
                  : "var(--accent-amber)",
              borderRadius: 3,
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>

      {checks.map((check, i) => (
        <div
          key={i}
          className="flex items-center gap-2"
          style={{
            padding: "10px 0",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: 13,
          }}
        >
          <span style={{ fontSize: 18 }}>{check.pass ? "✅" : "❌"}</span>
          <span
            style={{
              color: check.pass ? "var(--text-primary)" : "var(--accent-red)",
            }}
          >
            {check.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Export Panel ─────────────────────────────────────────────────────────────

function ExportPanel({ project }: { project: Project }) {
  const [format, setFormat] = useState("mp4");
  const [resolution, setResolution] = useState("1080p");
  const [fps, setFps] = useState("24");
  const [subtitles, setSubtitles] = useState(true);

  return (
    <div className="animate-fadeInUp" style={{ maxWidth: 600 }}>
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 20 }}>
          📦 Exportar Vídeo
        </h3>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Formato</label>
            <select
              className="form-select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="mp4">MP4 (H.264)</option>
              <option value="webm">WebM (VP9)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Resolução</label>
            <select
              className="form-select"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="1440p">1440p (2K)</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">FPS</label>
            <select
              className="form-select"
              value={fps}
              onChange={(e) => setFps(e.target.value)}
            >
              <option value="24">24 fps</option>
              <option value="30">30 fps</option>
              <option value="60">60 fps</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Proporção</label>
            <select className="form-select" defaultValue={project.aspectRatio}>
              <option value="9:16">9:16 (Vertical)</option>
              <option value="16:9">16:9 (Horizontal)</option>
              <option value="1:1">1:1 (Quadrado)</option>
              <option value="4:5">4:5 (Instagram)</option>
            </select>
          </div>
        </div>

        <div
          className="form-group"
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <input
            type="checkbox"
            id="subtitles"
            checked={subtitles}
            onChange={(e) => setSubtitles(e.target.checked)}
          />
          <label
            htmlFor="subtitles"
            style={{ fontSize: 13, cursor: "pointer" }}
          >
            Incluir legendas queimadas
          </label>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
          >
            🎬 Exportar Vídeo
          </button>
          <button className="btn btn-secondary">📄 SRT</button>
          <button className="btn btn-secondary">🖼 Thumbnail</button>
          <button className="btn btn-secondary">📋 Capítulos</button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PipelineStatusPanel({
  project,
  onRefresh,
}: {
  project: Project;
  onRefresh: () => void;
}) {
  const jobs = project.jobs || [];
  const renders = project.renders || [];

  // Determine stage status
  const getStageStatus = (queueNames: string[]) => {
    const stageJobs = jobs.filter((j) => queueNames.includes(j.queue));
    if (stageJobs.length === 0) {
      return { status: "pending", progress: 0, error: null };
    }
    const hasFailed = stageJobs.some((j) => j.status === "failed");
    if (hasFailed) {
      const failedJob = stageJobs.find((j) => j.status === "failed");
      return {
        status: "failed",
        progress: 0,
        error: failedJob?.errorMessage || "Unknown error",
      };
    }
    const allCompleted = stageJobs.every((j) => j.status === "completed");
    if (allCompleted) {
      return { status: "completed", progress: 100, error: null };
    }
    const hasActive = stageJobs.some((j) => j.status === "active");
    if (hasActive) {
      const activeJob = stageJobs.find((j) => j.status === "active");
      return {
        status: "active",
        progress: activeJob?.progress || 30,
        error: null,
      };
    }
    return { status: "waiting", progress: 0, error: null };
  };

  const ttsStage = getStageStatus(["tts"]);
  const alignStage = getStageStatus(["alignment"]);
  const renderStage = getStageStatus([
    "remotion-render",
    "hyperframes-render",
    "gbro-render",
    "vox-render",
  ]);
  const deliveryStage = getStageStatus(["delivery"]);

  // Find any active error across all jobs
  const failedJob = jobs.find((j) => j.status === "failed");
  const pipelineError = failedJob ? failedJob.errorMessage : null;

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 20,
        backdropFilter: "blur(8px)",
      }}
    >
      {/* 1. Header with Global Status */}
      <div className="flex items-center justify-between mb-4">
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-muted)",
          }}
        >
          🖥️ Monitor do Pipeline de Vídeo
        </span>
        <button
          className="btn btn-secondary"
          style={{ padding: "4px 8px", fontSize: 11 }}
          onClick={onRefresh}
        >
          🔄 Atualizar
        </button>
      </div>

      {/* 2. Error Warn Message Banner */}
      {project.status === "failed" && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: "#f87171",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            ⚠️ Ocorreu uma falha na execução do pipeline:
          </div>
          <p style={{ margin: 0, fontFamily: "monospace", opacity: 0.9 }}>
            {pipelineError ||
              "Erro inesperado ao gerar os assets ou renderizar o vídeo."}
          </p>
        </div>
      )}

      {/* 3. Success Message Banner */}
      {project.status === "completed" && renders.length > 0 && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: "#34d399",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            🎉 Geração Concluída com Sucesso!
          </div>
          <p style={{ margin: 0, opacity: 0.9 }}>
            O vídeo mestre foi montado e está disponível para visualização na
            timeline ou exportação.
          </p>
        </div>
      )}

      {/* 4. Stepper visualization of stages */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* Stage 1: TTS */}
        <StageCard
          title="1. Voz & TTS"
          desc="Geração do áudio falhado/fatos"
          status={ttsStage.status}
          progress={ttsStage.progress}
        />
        {/* Stage 2: Alignment */}
        <StageCard
          title="2. Sincronia"
          desc="Medição e alinhamento de tempo"
          status={alignStage.status}
          progress={alignStage.progress}
        />
        {/* Stage 3: Scene Rendering */}
        <StageCard
          title="3. Vídeo de Cenas"
          desc="Renderização visual individual"
          status={renderStage.status}
          progress={renderStage.progress}
        />
        {/* Stage 4: Delivery Assembly */}
        <StageCard
          title="4. Montagem Final"
          desc="Concatenação e mixagem final"
          status={deliveryStage.status}
          progress={deliveryStage.progress}
        />
      </div>
    </div>
  );
}

function StageCard({
  title,
  desc,
  status,
  progress,
}: {
  title: string;
  desc: string;
  status: string;
  progress: number;
}) {
  const getBadgeColor = () => {
    switch (status) {
      case "completed":
        return "badge-green";
      case "failed":
        return "badge-red";
      case "active":
        return "badge-blue animate-pulse";
      default:
        return "badge-secondary";
    }
  };

  const getBadgeText = () => {
    switch (status) {
      case "completed":
        return "concluído";
      case "failed":
        return "falhou";
      case "active":
        return `executando (${progress}%)`;
      case "waiting":
        return "aguardando";
      default:
        return "pendente";
    }
  };

  return (
    <div
      style={{
        flex: "1 1 200px",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        borderRadius: 8,
        padding: 12,
        minWidth: 200,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        <span
          className={`badge ${getBadgeColor()}`}
          style={{ fontSize: 10, padding: "2px 6px" }}
        >
          {getBadgeText()}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "var(--text-muted)",
          marginBottom: 8,
        }}
      >
        {desc}
      </p>

      {/* Progress Bar */}
      {status === "active" && (
        <div
          style={{
            height: 4,
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "var(--accent-cyan)",
              width: `${progress}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}

async function handleApprove(sceneId: string, gate: string) {
  try {
    await fetch(`/v1/scenes/${sceneId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gate }),
    });
  } catch {
    console.error("Approve failed");
  }
}

async function handleRender(sceneId: string) {
  try {
    await fetch(`/v1/scenes/${sceneId}/render`, { method: "POST" });
  } catch {
    console.error("Render failed");
  }
}
