import {
  applyAssetCleanupResult,
  createAssetCleanupResult,
  readAssetCleanupJob,
  revertAssetCleanupResult,
} from "./assetCleanupService.js";

export function registerAssetCleanupRoutes(app, { getProjectDir }) {
  app.post("/api/asset-cleanup/process", async (req, res) => {
    try {
      const job = await createAssetCleanupResult(getProjectDir(req), {
        asset: req.body?.asset,
        block: req.body?.block,
        assetIndex: req.body?.asset_index,
        rect: req.body?.rect,
        method: req.body?.method,
        rightsConfirmed: req.body?.rights_confirmed === true,
      });
      res.json({ success: true, job });
    } catch (err) {
      res
        .status(err?.code === "RIGHTS_CONFIRMATION_REQUIRED" ? 403 : 400)
        .json({
          error: err?.message || String(err),
          code: err?.code || "ASSET_CLEANUP_FAILED",
        });
    }
  });

  app.get("/api/asset-cleanup/job/:jobId", (req, res) => {
    try {
      res.json({
        success: true,
        job: readAssetCleanupJob(getProjectDir(req), req.params.jobId),
      });
    } catch (err) {
      res.status(404).json({ error: err?.message || String(err) });
    }
  });

  app.post("/api/asset-cleanup/apply", (req, res) => {
    try {
      const result = applyAssetCleanupResult(
        getProjectDir(req),
        req.body?.job_id
      );
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(409).json({ error: err?.message || String(err) });
    }
  });

  app.post("/api/asset-cleanup/revert", (req, res) => {
    try {
      const result = revertAssetCleanupResult(
        getProjectDir(req),
        req.body?.job_id
      );
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(409).json({ error: err?.message || String(err) });
    }
  });
}
