import path from "path";
import { buildSocialPublishHealth } from "./socialPublishHealth.js";
import {
  enqueueSocialPublishItem,
  loadSocialPublishQueue,
  markSocialPublishPosted,
  removeSocialPublishItem,
  getSocialPublishQueueSummary,
  updateSocialPublishItem,
} from "./socialPublishQueue.js";
import { getYoutubeTokenScopes } from "./youtubeTitleAnalytics.js";

export function registerSocialPublishRoutes(app, deps) {
  const { WORKSPACE_DIR, getProjectDir } = deps;

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
}
