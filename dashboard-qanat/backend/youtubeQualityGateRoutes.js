import {
  autoFixYoutubeQualityGate,
  readYoutubeQualityGate,
  recordYoutubeQualityOutcome,
  runYoutubeQualityGate,
} from "./youtubeQualityGate.js";

export function registerYoutubeQualityGateRoutes(
  app,
  { workspaceDir, projectsRoot, getProjectDir, fixWithAi }
) {
  app.get("/api/youtube/quality-gate/cached", (req, res) => {
    const report = readYoutubeQualityGate(getProjectDir(req));
    res.json(report || { ready: false, missing: true });
  });

  app.get("/api/youtube/quality-gate", async (req, res) => {
    try {
      const report = await runYoutubeQualityGate({
        workspaceDir,
        projectsRoot,
        projectDir: getProjectDir(req),
        videoName: String(req.query.video || ""),
      });
      res.status(report.ready ? 200 : 422).json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/youtube/quality-gate/run", async (req, res) => {
    try {
      const report = await runYoutubeQualityGate({
        workspaceDir,
        projectsRoot,
        projectDir: getProjectDir(req),
        videoName: String(req.body?.video || ""),
      });
      res.status(report.ready ? 200 : 422).json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/youtube/quality-gate/outcome", (req, res) => {
    try {
      const outcomes = recordYoutubeQualityOutcome(
        getProjectDir(req),
        req.body || {}
      );
      res.json({ success: true, ...outcomes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/youtube/quality-gate/fix", async (req, res) => {
    try {
      const result = await autoFixYoutubeQualityGate({
        workspaceDir,
        projectsRoot,
        projectDir: getProjectDir(req),
        videoName: String(req.body?.video || ""),
        fixWithAi,
      });
      res.status(result.report.ready ? 200 : 422).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}
