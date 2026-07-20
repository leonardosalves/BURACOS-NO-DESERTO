/**
 * videoMonitorRoutes.js
 * Endpoints REST + SSE para o painel Video Monitor.
 *
 * Rotas:
 *   POST /api/monitor/runs                 — Criar run
 *   GET  /api/monitor/runs                 — Listar runs
 *   GET  /api/monitor/runs/:id             — Detalhes de um run
 *   GET  /api/monitor/runs/:id/events      — SSE stream de progresso
 *   GET  /api/monitor/runs/:id/logs        — Logs completos
 *   GET  /api/monitor/runs/:id/videos      — Vídeos candidatos
 *   POST /api/monitor/videos/:id/generate  — Gerar artefatos IA
 *   GET  /api/monitor/artifacts/:videoId   — Recuperar artefatos gerados
 *   GET  /api/monitor/quota               — Status de quota YouTube
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  createRun,
  executeDiscoveryPipeline,
  generateArtifacts,
  monitorRuns,
  runArtifacts,
  runLogs,
  runVideos,
  registerSseClient,
  unregisterSseClient,
  appendLog,
  nowIso,
} from "./videoMonitorService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, "../../");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWorkspaceId(req) {
  return (
    req.headers["x-workspace-id"] ||
    req.query.workspaceId?.toString() ||
    "default"
  );
}

// ---------------------------------------------------------------------------
// Registro de rotas
// ---------------------------------------------------------------------------

export function registerVideoMonitorRoutes(app, _deps = {}) {
  // --------------------------------------------------------------------------
  // POST /api/monitor/runs — Criar nova execução
  // --------------------------------------------------------------------------
  app.post("/api/monitor/runs", async (req, res) => {
    const {
      niche,
      region = "BR",
      mode = "metadata_only",
      maxVideos = 15,
      sources = ["youtube"],
    } = req.body || {};

    if (!niche || typeof niche !== "string" || !niche.trim()) {
      return res.status(400).json({ error: "Campo 'niche' é obrigatório." });
    }

    const workspaceId = getWorkspaceId(req);
    const run = createRun({
      niche: niche.trim(),
      region,
      mode,
      maxVideos: Math.min(parseInt(maxVideos, 10) || 15, 30),
      sources,
      workspaceId,
    });

    // Disparar pipeline assíncrona (não bloqueia a resposta)
    setImmediate(() => {
      executeDiscoveryPipeline(run.id).catch((err) => {
        appendLog(
          run.id,
          "error",
          `Pipeline falhou inesperadamente: ${err.message}`
        );
      });
    });

    return res.status(201).json({ runId: run.id, run });
  });

  // --------------------------------------------------------------------------
  // GET /api/monitor/runs — Listar runs do workspace
  // --------------------------------------------------------------------------
  app.get("/api/monitor/runs", (req, res) => {
    const workspaceId = getWorkspaceId(req);
    const nicheFilter = req.query.niche?.toString().toLowerCase();
    const statusFilter = req.query.status?.toString();
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);

    let items = Array.from(monitorRuns.values()).filter(
      (r) => r.workspaceId === workspaceId || workspaceId === "default"
    );

    if (nicheFilter) {
      items = items.filter((r) =>
        r.nicheName?.toLowerCase().includes(nicheFilter)
      );
    }
    if (statusFilter) {
      items = items.filter((r) => r.status === statusFilter);
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    items = items.slice(0, limit);

    return res.json({ items, total: items.length });
  });

  // --------------------------------------------------------------------------
  // GET /api/monitor/runs/:id — Detalhes de um run
  // --------------------------------------------------------------------------
  app.get("/api/monitor/runs/:id", (req, res) => {
    const run = monitorRuns.get(req.params.id);
    if (!run) {
      return res.status(404).json({ error: "Run não encontrada." });
    }

    return res.json({
      run,
      logs: (runLogs.get(run.id) || []).slice(-100),
      videoCount: (runVideos.get(run.id) || []).length,
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/monitor/runs/:id/events — SSE stream de progresso
  // --------------------------------------------------------------------------
  app.get("/api/monitor/runs/:id/events", (req, res) => {
    const run = monitorRuns.get(req.params.id);
    if (!run) {
      return res.status(404).json({ error: "Run não encontrada." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (res.flushHeaders) res.flushHeaders();

    // Enviar estado atual imediatamente (init snapshot)
    const currentRun = monitorRuns.get(run.id);
    const currentLogs = (runLogs.get(run.id) || []).slice(-20);
    const currentVideos = (runVideos.get(run.id) || []).slice(0, 30);

    res.write(
      `data: ${JSON.stringify({
        type: "init",
        run: currentRun,
        logs: currentLogs,
        videos: currentVideos,
      })}\n\n`
    );

    // Heartbeat a cada 25s
    const heartbeat = setInterval(() => {
      try {
        res.write(
          `data: ${JSON.stringify({ type: "ping", ts: nowIso() })}\n\n`
        );
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    registerSseClient(run.id, res);

    req.on("close", () => {
      clearInterval(heartbeat);
      unregisterSseClient(run.id, res);
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/monitor/runs/:id/logs — Logs completos
  // --------------------------------------------------------------------------
  app.get("/api/monitor/runs/:id/logs", (req, res) => {
    const run = monitorRuns.get(req.params.id);
    if (!run) return res.status(404).json({ error: "Run não encontrada." });

    const since = req.query.since?.toString();
    let logs = runLogs.get(run.id) || [];
    if (since) logs = logs.filter((l) => l.ts > since);

    return res.json({ logs, runId: run.id });
  });

  // --------------------------------------------------------------------------
  // GET /api/monitor/runs/:id/videos — Vídeos candidatos
  // --------------------------------------------------------------------------
  app.get("/api/monitor/runs/:id/videos", (req, res) => {
    const run = monitorRuns.get(req.params.id);
    if (!run) return res.status(404).json({ error: "Run não encontrada." });

    const videos = runVideos.get(run.id) || [];
    return res.json({ videos, total: videos.length });
  });

  // --------------------------------------------------------------------------
  // POST /api/monitor/videos/:videoId/generate — Gerar artefatos de IA
  // --------------------------------------------------------------------------
  app.post("/api/monitor/videos/:videoId/generate", async (req, res) => {
    const { videoId } = req.params;
    const {
      tasks = [
        "summary",
        "titles",
        "tags",
        "script",
        "thumbnail_brief",
        "edit_ideas",
      ],
      runId,
    } = req.body || {};

    // Localizar vídeo
    let video = null;
    let foundRunId = runId;

    if (runId) {
      const videos = runVideos.get(runId) || [];
      video =
        videos.find((v) => v.id === videoId || v.videoId === videoId) || null;
    }
    if (!video) {
      for (const [rid, videos] of runVideos.entries()) {
        const found = videos.find(
          (v) => v.id === videoId || v.videoId === videoId
        );
        if (found) {
          video = found;
          foundRunId = rid;
          break;
        }
      }
    }

    if (!video) {
      return res.status(404).json({ error: "Vídeo não encontrado." });
    }

    if (foundRunId) {
      appendLog(
        foundRunId,
        "info",
        `Gerando artefatos para: "${video.title}"...`
      );
    }

    try {
      const artifacts = await generateArtifacts(foundRunId, video, tasks);

      runArtifacts.set(videoId, {
        videoId,
        runId: foundRunId,
        generatedAt: nowIso(),
        tasks,
        ...artifacts,
      });

      if (foundRunId) {
        const vids = runVideos.get(foundRunId) || [];
        const idx = vids.findIndex(
          (v) => v.id === videoId || v.videoId === videoId
        );
        if (idx >= 0) {
          vids[idx] = { ...vids[idx], hasArtifacts: true };
          runVideos.set(foundRunId, vids);
        }
        appendLog(
          foundRunId,
          "info",
          `✓ Artefatos gerados para "${video.title}".`
        );
      }

      return res.json({ videoId, artifacts, generatedAt: nowIso() });
    } catch (err) {
      if (foundRunId)
        appendLog(
          foundRunId,
          "error",
          `Falha ao gerar artefatos: ${err.message}`
        );
      return res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // GET /api/monitor/artifacts/:videoId — Recuperar artefatos gerados
  // --------------------------------------------------------------------------
  app.get("/api/monitor/artifacts/:videoId", (req, res) => {
    const artifact = runArtifacts.get(req.params.videoId);
    if (!artifact) {
      return res
        .status(404)
        .json({ error: "Artefatos não encontrados para este vídeo." });
    }
    return res.json(artifact);
  });

  // --------------------------------------------------------------------------
  // GET /api/monitor/quota — Status de quota YouTube
  // --------------------------------------------------------------------------
  app.get("/api/monitor/quota", (_req, res) => {
    let hasKey = !!(
      process.env.YOUTUBE_API_KEY ||
      process.env.YT_API_KEY ||
      process.env.GOOGLE_API_KEY
    );

    if (!hasKey) {
      try {
        const configPath = path.join(WORKSPACE_DIR, "config_qanat.json");
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
          if (config.youtube_api_key) hasKey = true;
        }
      } catch (e) {}
    }

    const completedToday = Array.from(monitorRuns.values()).filter((r) => {
      if (!r.endedAt) return false;
      return (
        new Date(r.endedAt).toDateString() === new Date().toDateString() &&
        r.status === "completed"
      );
    }).length;

    const estimated = completedToday * 100;

    return res.json({
      hasApiKey: hasKey,
      estimatedUnitsUsedToday: estimated,
      dailyQuotaTotal: 10000,
      estimatedUnitsRemaining: Math.max(0, 10000 - estimated),
      totalRunsInMemory: monitorRuns.size,
      message: hasKey
        ? "API Key configurada. Quota estimada (100 unidades/run)."
        : "YOUTUBE_API_KEY não configurada — usando dados de demonstração.",
    });
  });
}
