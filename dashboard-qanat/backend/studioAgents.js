/**
 * studioAgents.js — Monitoramento e controle de agentes.
 *
 * USO no server.js:
 *   import agentsRouter from "./studioAgents.js";
 *   app.use("/api/agents", agentsRouter);
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadChannelPrompts } from "./channelProfiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_DIR = path.resolve(__dirname, "..", "..", "channels");
const router = Router();

// Lista agentes e status
router.get("/:channelId", (req, res) => {
  const prompts = loadChannelPrompts(req.params.channelId);
  const agentes = [
    {
      id: "roteiro",
      nome: "Agente de Roteiro",
      prompt: prompts.narracao ? "configurado" : "padrão",
      status: "online",
    },
    {
      id: "visual",
      nome: "Agente Visual",
      prompt: prompts.visual ? "configurado" : "padrão",
      status: "online",
    },
    {
      id: "pesquisa",
      nome: "Agente de Pesquisa",
      prompt: prompts.pesquisa ? "configurado" : "padrão",
      status: "online",
    },
    { id: "tts", nome: "Agente TTS", prompt: "sistema", status: "online" },
  ];
  res.json({ ok: true, agentes });
});

// Editor de prompts (lê/salva .md do canal)
router.get("/:channelId/prompts/:nome", (req, res) => {
  const p = path.join(
    CHANNELS_DIR,
    req.params.channelId,
    "prompts",
    `${req.params.nome}.md`
  );
  res.json({
    ok: true,
    conteudo: fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "",
  });
});

router.put("/:channelId/prompts/:nome", (req, res) => {
  const dir = path.join(CHANNELS_DIR, req.params.channelId, "prompts");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${req.params.nome}.md`),
    req.body.conteudo || "",
    "utf8"
  );
  res.json({ ok: true });
});

// Logs de execução
router.get("/:channelId/logs", (req, res) => {
  const logsPath = path.join(
    CHANNELS_DIR,
    req.params.channelId,
    "data",
    "agent_logs.json"
  );
  const logs = fs.existsSync(logsPath)
    ? JSON.parse(fs.readFileSync(logsPath, "utf8"))
    : [];
  res.json({ ok: true, logs });
});

export default router;
