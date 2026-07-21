import express from "express";
import fs from "fs";
import path from "path";
import {
  saveCreatorHistory,
  getCreatorHistory,
} from "./creatorHistoryService.js";
import { resolveProjectsRoot } from "./projectsRoot.js";

const router = express.Router();

function getProjectDir(req) {
  const root = resolveProjectsRoot();
  const projectName = req.body?.projectName || "default";
  return path.join(root, projectName.trim().replace(/[^a-zA-Z0-9_\-]/g, "_"));
}

// Get the latest 5 history items for a creator mode
router.get("/:mode", async (req, res) => {
  try {
    const { mode } = req.params;
    const history = await getCreatorHistory(mode);
    res.json(history);
  } catch (err) {
    console.error("[CreatorHistoryRoutes] GET error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Save a new history item for a creator mode
router.post("/", async (req, res) => {
  try {
    const mode = req.body?.mode;
    const title =
      req.body?.title ||
      req.body?.project_title ||
      req.body?.project_name ||
      "Rascunho de Engenharia";
    const projectName = req.body?.projectName || req.body?.project_name;
    const directState = req.body?.directState;

    if (!mode || (!projectName && !directState)) {
      return res.status(400).json({
        error:
          "Campos obrigatórios ausentes: mode, projectName (ou directState)",
      });
    }

    if (directState) {
      await saveCreatorHistory(mode, title, directState);
      return res.json({ success: true });
    }

    const projDir = getProjectDir(req);
    const sessionPath = path.join(projDir, "wizard_session.json");

    if (!fs.existsSync(sessionPath)) {
      return res.status(404).json({
        error:
          "Nenhuma sessão encontrada para este projeto. Salve a sessão primeiro.",
      });
    }

    const statePayload = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
    await saveCreatorHistory(mode, title, statePayload);
    res.json({ success: true });
  } catch (err) {
    console.error("[CreatorHistoryRoutes] POST error:", err);
    res.status(500).json({ error: "Failed to save history" });
  }
});

export default router;
