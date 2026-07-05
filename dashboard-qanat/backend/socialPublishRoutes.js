import path from "path";
import { buildSocialPublishHealth } from "./socialPublishHealth.js";
import {
  enqueueSocialPublishItem,
  loadSocialPublishQueue,
  markSocialPublishPosted,
  removeSocialPublishItem,
  getSocialPublishQueueSummary,
  getSocialPublishItem,
  updateSocialPublishItem,
} from "./socialPublishQueue.js";
import {
  getDueScheduledItems,
  getSocialPublishSchedulerStatus,
  publishSocialQueueItem,
} from "./socialPublishRunner.js";
import { getYoutubeTokenScopes } from "./youtubeTitleAnalytics.js";

export function registerSocialPublishRoutes(app, deps) {
  const {
    WORKSPACE_DIR,
    getProjectDir,
    resolveProjectDir,
    PYTHON_PATH,
    syncUploadScripts,
    runPostUploadHooks,
  } = deps;

  const publishDeps = {
    resolveProjectDir,
    pythonPath: PYTHON_PATH,
    workspaceDir: WORKSPACE_DIR,
    syncUploadScripts,
    runPostUploadHooks,
  };

  app.get("/api/social/health", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      let youtubeScopes = null;
      try {
        youtubeScopes = await getYoutubeTokenScopes(WORKSPACE_DIR);
      } catch {
        youtubeScopes = { ready: false, missingLabels: [] };
      }

      const health = buildSocialPublishHealth({
        workspaceDir: WORKSPACE_DIR,
        projectDir: projDir,
        youtubeScopes,
      });
      res.json(health);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/social/queue", (req, res) => {
    try {
      const queue = loadSocialPublishQueue(WORKSPACE_DIR);
      const summary = getSocialPublishQueueSummary(WORKSPACE_DIR);
      res.json({ ...queue, summary });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/social/queue/enqueue", (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const projectSlug =
        req.body?.project || req.query?.project || path.basename(projDir);
      if (!projectSlug || projDir === WORKSPACE_DIR) {
        return res.status(400).json({ error: "Selecione um projeto ativo." });
      }

      const result = enqueueSocialPublishItem(WORKSPACE_DIR, {
        projectSlug: String(projectSlug),
        projectDir: projDir,
        videoFile: req.body?.videoFile || null,
        platforms: req.body?.platforms || ["youtube"],
        status: req.body?.status || "pending",
        scheduledAt: req.body?.scheduledAt || null,
        notes: req.body?.notes || "",
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/social/queue/:id", (req, res) => {
    try {
      const result = updateSocialPublishItem(
        WORKSPACE_DIR,
        req.params.id,
        req.body || {}
      );
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/social/queue/:id", (req, res) => {
    try {
      const queue = removeSocialPublishItem(WORKSPACE_DIR, req.params.id);
      res.json({ success: true, queue });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/social/queue/:id/approve", (req, res) => {
    try {
      const result = updateSocialPublishItem(WORKSPACE_DIR, req.params.id, {
        status: "pending",
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/social/queue/mark-posted", (req, res) => {
    try {
      const { project, videoFile } = req.body || {};
      const queue = markSocialPublishPosted(WORKSPACE_DIR, {
        projectSlug: project,
        videoFile,
      });
      res.json({
        success: true,
        queue: queue || loadSocialPublishQueue(WORKSPACE_DIR),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/social/scheduler/status", (req, res) => {
    try {
      const due = getDueScheduledItems(WORKSPACE_DIR);
      res.json({
        ...getSocialPublishSchedulerStatus(),
        dueCount: due.length,
        dueItems: due.map((item) => ({
          id: item.id,
          projectSlug: item.projectSlug,
          scheduledAt: item.scheduledAt,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/social/queue/:id/schedule", (req, res) => {
    try {
      const item = getSocialPublishItem(WORKSPACE_DIR, req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item da fila não encontrado." });
      }
      const scheduledAt = req.body?.scheduledAt;
      if (!scheduledAt) {
        return res.status(400).json({ error: "Informe scheduledAt (ISO)." });
      }
      const when = new Date(scheduledAt);
      if (Number.isNaN(when.getTime())) {
        return res.status(400).json({ error: "Data/hora inválida." });
      }
      if (when.getTime() <= Date.now() + 60_000) {
        return res
          .status(400)
          .json({ error: "Agende pelo menos 1 minuto no futuro." });
      }
      const result = updateSocialPublishItem(WORKSPACE_DIR, req.params.id, {
        status: "scheduled",
        scheduledAt: when.toISOString(),
        lastError: null,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/social/queue/:id/publish", async (req, res) => {
    try {
      const result = await publishSocialQueueItem(
        WORKSPACE_DIR,
        req.params.id,
        publishDeps
      );
      const queue = loadSocialPublishQueue(WORKSPACE_DIR);
      res.json({ success: true, ...result, queue });
    } catch (err) {
      const queue = loadSocialPublishQueue(WORKSPACE_DIR);
      res.status(400).json({ error: err.message, queue });
    }
  });
}
