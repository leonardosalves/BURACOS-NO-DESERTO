/**
 * Rotas de previsão de tendências YouTube (TimesFM).
 */

import { probeTimesfmStatus, runTrendForecast } from "./timesfmForecast.js";

export function registerTimesfmRoutes(app, deps) {
  const { WORKSPACE_DIR, PROJECTS_ROOT, PYTHON_PATH } = deps;

  app.get("/api/trends/status", async (_req, res) => {
    try {
      const status = await probeTimesfmStatus({ pythonPath: PYTHON_PATH });
      res.json(status);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/trends/forecast", async (req, res) => {
    try {
      const formatRaw = String(req.body?.format || "all").toUpperCase();
      const format = ["SHORT", "SHORTS", "LONG", "LONGO", "ALL"].includes(formatRaw)
        ? formatRaw
        : "all";

      const result = await runTrendForecast(WORKSPACE_DIR, {
        projectsRoot: PROJECTS_ROOT,
        pythonPath: PYTHON_PATH,
        horizon: Number(req.body?.horizon) || 7,
        historyDays: Number(req.body?.historyDays) || 14,
        maxVideos: Number(req.body?.maxVideos) || 12,
        format,
        enqueueIdeas: req.body?.enqueueIdeas === true,
        niche: String(req.body?.niche || "").trim(),
      });

      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: "Falha na previsão de tendências", details: err.message });
    }
  });
}