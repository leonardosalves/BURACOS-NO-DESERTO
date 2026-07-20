/**
 * flowLab.js — Editor visual de pipelines e versionamento de fluxos.
 *
 * USO no server.js:
 *   import flowRouter from "./flowLab.js";
 *   app.use("/api/flows", flowRouter);
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_DIR = path.resolve(__dirname, "..", "..", "channels");
const router = Router();

const FLUXOS_PADRAO = {
  video_longo: {
    nome: "Vídeo Longo (8-12 min)",
    etapas: [
      "pesquisa",
      "roteiro",
      "prompts_visuais",
      "tts",
      "render",
      "upload",
    ],
    tempo_estimado_min: 25,
  },
  shorts: {
    nome: "Shorts (≤60s)",
    etapas: [
      "roteiro_curto",
      "prompts_visuais",
      "tts",
      "render_vertical",
      "upload",
    ],
    tempo_estimado_min: 10,
  },
  timelapse: {
    nome: "Timelapse de Construção",
    etapas: [
      "pesquisa_visual",
      "prompts_visuais",
      "render_timelapse",
      "upload",
    ],
    tempo_estimado_min: 15,
  },
};

// Lista fluxos (padrão + customizados do canal)
router.get("/:channelId", (req, res) => {
  const customPath = path.join(
    CHANNELS_DIR,
    req.params.channelId,
    "data",
    "flows.json"
  );
  const custom = fs.existsSync(customPath)
    ? JSON.parse(fs.readFileSync(customPath, "utf8"))
    : [];
  res.json({ ok: true, padrao: FLUXOS_PADRAO, custom });
});

// Simulação (dry-run) — valida o fluxo sem executar
router.post("/:channelId/simular", (req, res) => {
  const { fluxo } = req.body || {};
  const etapasValidas = [
    "pesquisa",
    "roteiro",
    "roteiro_curto",
    "prompts_visuais",
    "pesquisa_visual",
    "tts",
    "render",
    "render_vertical",
    "render_timelapse",
    "upload",
  ];
  const erros = (fluxo.etapas || []).filter((e) => !etapasValidas.includes(e));
  const avisos = [];
  if (!(fluxo.etapas || []).includes("tts"))
    avisos.push("Fluxo sem TTS — vídeo ficará sem narração.");
  if (!(fluxo.etapas || []).includes("upload"))
    avisos.push("Fluxo sem upload — vídeo não será publicado.");

  res.json({
    ok: erros.length === 0,
    erros,
    avisos,
    tempo_estimado_min: (fluxo.etapas || []).length * 4,
    simulacao: "Fluxo validado. Pronto para execução.",
  });
});

// Salvar fluxo customizado (com versionamento)
router.post("/:channelId/salvar", (req, res) => {
  const { fluxo } = req.body || {};
  const p = path.join(CHANNELS_DIR, req.params.channelId, "data", "flows.json");
  const flows = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
  fluxo.versao = (flows.find((f) => f.nome === fluxo.nome)?.versao || 0) + 1;
  fluxo.salvo_em = new Date().toISOString();
  flows.push(fluxo);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(flows, null, 2), "utf8");
  res.json({ ok: true, versao: fluxo.versao });
});

export default router;
