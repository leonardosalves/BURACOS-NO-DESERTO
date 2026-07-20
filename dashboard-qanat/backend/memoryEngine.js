/**
 * memoryEngine.js — Converte lições aprendidas em prompt + gerencia confiança.
 *
 * USO no server.js:
 *   import memoryRouter from "./memoryEngine.js";
 *   app.use("/api/memory", memoryRouter);
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_DIR = path.resolve(__dirname, "..", "..", "channels");
const router = Router();

const readJson = (p, fb = {}) =>
  fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fb;
const writeJson = (p, d) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(d, null, 2), "utf8");
};
const memPath = (id) => path.join(CHANNELS_DIR, id, "data", "memoria.json");

// ── Registrar/atualizar uma lição (com confiança e evidências) ──
export function registrarLicao(
  channelId,
  { tipo, insight, acao, evidencias = 1 }
) {
  const memoria = readJson(memPath(channelId), { licoes: [] });
  const chave = `${tipo}:${insight}`.toLowerCase().slice(0, 120);

  const existente = memoria.licoes.find((l) => l.chave === chave);
  if (existente) {
    // Reforça a lição: aumenta evidências e confiança
    existente.evidencias = (existente.evidencias || 1) + evidencias;
    existente.confianca = Math.min(0.99, (existente.confianca || 0.5) + 0.08);
    existente.reforçada_em = new Date().toISOString();
  } else {
    memoria.licoes.push({
      chave,
      tipo,
      insight,
      acao,
      ativo: true,
      evidencias,
      confianca: 0.5,
      descoberto_em: new Date().toISOString(),
    });
  }
  memoria.atualizado_em = new Date().toISOString();
  writeJson(memPath(channelId), memoria);
  return memoria;
}

// ── Converte lições ativas em bloco de prompt ──
export function memoriaParaPrompt(channelId, { minConfianca = 0.55 } = {}) {
  const memoria = readJson(memPath(channelId), { licoes: [] });
  const ativas = memoria.licoes
    .filter((l) => l.ativo && (l.confianca || 0) >= minConfianca)
    .sort((a, b) => (b.confianca || 0) - (a.confianca || 0));

  if (ativas.length === 0) return "";

  const porTipo = {};
  for (const l of ativas) {
    porTipo[l.tipo] = porTipo[l.tipo] || [];
    porTipo[l.tipo].push(l);
  }

  const rotulos = {
    gancho: "GANCHOS (primeiros 10s)",
    nicho: "SUB-NICHOS",
    duracao: "DURAÇÃO",
    titulo: "TÍTULOS",
    thumbnail: "THUMBNAILS",
    roteiro: "ROTEIRO",
  };

  let prompt =
    "\n\n## 🧠 MEMÓRIA DE APRENDIZADO DESTE CANAL (dados reais de desempenho)\n";
  prompt +=
    "Estas lições foram extraídas automaticamente do desempenho dos vídeos deste canal. ";
  prompt +=
    "Aplique-as com prioridade — elas refletem o que o PÚBLICO DESTE CANAL responde melhor.\n\n";

  for (const [tipo, licoes] of Object.entries(porTipo)) {
    prompt += `### ${rotulos[tipo] || tipo.toUpperCase()}\n`;
    for (const l of licoes) {
      const conf = Math.round((l.confianca || 0) * 100);
      prompt += `- ${l.insight} → **${l.acao}** _(confiança ${conf}% · ${l.evidencias} evidências)_\n`;
    }
    prompt += "\n";
  }

  prompt +=
    "> Use estas lições como diretrizes fortes, mas sem violar a integridade factual nem o nicho do canal.\n";
  return prompt;
}

// ── ENDPOINTS ──

// Prompt pronto para injetar no agente
router.get("/:channelId/prompt", (req, res) => {
  const minConfianca = req.query.min_confianca
    ? parseFloat(req.query.min_confianca)
    : 0.55;
  res.json({
    ok: true,
    prompt: memoriaParaPrompt(req.params.channelId, { minConfianca }),
  });
});

// Lista lições (para o painel de gestão)
router.get("/:channelId", (req, res) => {
  const memoria = readJson(memPath(req.params.channelId), { licoes: [] });
  res.json({
    ok: true,
    licoes: memoria.licoes,
    atualizado_em: memoria.atualizado_em,
  });
});

// Ativar/desativar uma lição
router.patch("/:channelId/:chave", (req, res) => {
  const memoria = readJson(memPath(req.params.channelId), { licoes: [] });
  const licao = memoria.licoes.find((l) => l.chave === req.params.chave);
  if (!licao) return res.status(404).json({ error: "Lição não encontrada." });
  if (req.body.ativo !== undefined) licao.ativo = req.body.ativo;
  writeJson(memPath(req.params.channelId), memoria);
  res.json({ ok: true, licao });
});

// Remover lição
router.delete("/:channelId/:chave", (req, res) => {
  const memoria = readJson(memPath(req.params.channelId), { licoes: [] });
  memoria.licoes = memoria.licoes.filter((l) => l.chave !== req.params.chave);
  writeJson(memPath(req.params.channelId), memoria);
  res.json({ ok: true });
});

export default router;
