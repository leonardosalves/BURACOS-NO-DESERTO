/**
 * templatesManager.js — Biblioteca e exportação de templates do canal.
 *
 * USO no server.js:
 *   import templatesRouter from "./templatesManager.js";
 *   app.use("/api/templates", templatesRouter);
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadChannelConfig, saveChannelConfig } from "./channelProfiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_DIR = path.resolve(__dirname, "..", "..", "channels");
const router = Router();

// Lista templates do canal
router.get("/:channelId", (req, res) => {
  const config = loadChannelConfig(req.params.channelId);
  const tplDir = path.join(CHANNELS_DIR, req.params.channelId, "templates");
  const arquivos = fs.existsSync(tplDir)
    ? fs.readdirSync(tplDir).filter((f) => f.endsWith(".json"))
    : [];
  const templates = arquivos.map((f) =>
    JSON.parse(fs.readFileSync(path.join(tplDir, f), "utf8"))
  );
  res.json({
    ok: true,
    templates_titulo: config?.titulo?.templates_vencedores || [],
    templates_custom: templates,
  });
});

// Sugestão inteligente (qual template usar para um tema)
router.post("/:channelId/sugerir", (req, res) => {
  const { tema } = req.body || {};
  const config = loadChannelConfig(req.params.channelId);
  const templates = config?.titulo?.templates_vencedores || [];

  const temNumero = /\d/.test(tema || "");
  const sugerido = temNumero
    ? templates.find((t) => t.includes("{numero}")) || templates[0]
    : templates.find((t) => t.includes("{ação_negativa}")) || templates[0];

  res.json({
    ok: true,
    sugerido,
    todos: templates,
    criterio: temNumero ? "tema com número" : "tema sem número",
  });
});

// Exportar templates do canal
router.get("/:channelId/export", (req, res) => {
  const config = loadChannelConfig(req.params.channelId);
  res.json({
    ok: true,
    export: {
      titulo: config?.titulo,
      nicho: config?.nicho,
      visual: config?.visual,
    },
  });
});

export default router;
