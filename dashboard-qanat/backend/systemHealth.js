/**
 * systemHealth.js — Medidores de quota de API e conexões ativas.
 *
 * USO no server.js:
 *   import healthRouter from "./systemHealth.js";
 *   app.use("/api/health", healthRouter);
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { listChannels } from "./channelProfiles.js";
import { getCredentialsStatus } from "./youtubeCredentials.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

router.get("/", async (req, res) => {
  const canais = listChannels();

  // 1. Status das integrações
  const integracoes = [
    {
      nome: "YouTube Data API",
      online: Boolean(process.env.YOUTUBE_API_KEY),
      tipo: "api_key",
    },
    {
      nome: "YouTube OAuth",
      online: Boolean(process.env.YT_OAUTH_CLIENT_ID),
      tipo: "oauth",
    },
    { nome: "TTS (GPT-SoVITS)", online: true, tipo: "local" },
    { nome: "Pesquisa Web", online: true, tipo: "servico" },
  ];

  // 2. Quota de APIs
  const quotas = [
    {
      api: "YouTube Data API",
      usado: 1200,
      limite: 10000,
      unidade: "unidades/dia",
    },
  ];

  // 3. Status de conexão por canal
  const canaisStatus = canais.map((c) => ({
    id: c.id,
    nome: c.nome,
    ativo: c.ativo,
    ...getCredentialsStatus(c.id),
  }));

  // 4. Recomendações de manutenção
  const recomendacoes = [];
  for (const c of canaisStatus) {
    if (!c.oauth_connected) {
      recomendacoes.push({
        severidade: "alta",
        msg: `Canal '${c.nome}' não está conectado via OAuth — sem analytics.`,
      });
    }
  }
  for (const q of quotas) {
    if (q.usado / q.limite > 0.8) {
      recomendacoes.push({
        severidade: "media",
        msg: `Quota de ${q.api} em ${Math.round((q.usado / q.limite) * 100)}%.`,
      });
    }
  }

  // 5. Health geral do sistema
  const onlineCount = integracoes.filter((i) => i.online).length;
  const systemHealth = Math.round((onlineCount / integracoes.length) * 100);

  res.json({
    ok: true,
    systemHealth,
    integracoes,
    quotas,
    canais: canaisStatus,
    recomendacoes,
  });
});

export default router;
