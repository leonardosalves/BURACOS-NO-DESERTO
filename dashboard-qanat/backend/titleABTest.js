/**
 * titleABTest.js — Gera variantes de título, rastreia CTR e promove templates.
 *
 * USO no server.js:
 *   import abRouter from "./titleABTest.js";
 *   app.use("/api/ab", abRouter);
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadChannelConfig } from "./channelProfiles.js";
import { registrarLicao } from "./memoryEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_DIR = path.resolve(__dirname, "..", "..", "channels");
const router = Router();

const readJson = (p, fb = {}) =>
  fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fb;
const writeJson = (p, d) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(d, null, 2), "utf8");
};
const abPath = (id) => path.join(CHANNELS_DIR, id, "data", "ab_tests.json");

// ── Preenche um template com dados do vídeo ──
function preencherTemplate(template, dados) {
  return template
    .replace(/{objeto}/gi, dados.objeto || "[objeto]")
    .replace(/{ação_negativa}/gi, dados.acao_negativa || "[ação]")
    .replace(/{numero}/gi, dados.numero || "[nº]")
    .replace(/{unidade}/gi, dados.unidade || "[unidade]")
    .replace(/{verbo_acao}/gi, dados.verbo_acao || "[verbo]")
    .replace(/{sujeito}/gi, dados.sujeito || "[sujeito]")
    .replace(/{acao}/gi, dados.acao || "[ação]")
    .replace(/{metodo_inesperado}/gi, dados.metodo || "[método]")
    .replace(/{epoca}/gi, dados.epoca || "[época]")
    .replace(/{consequencia}/gi, dados.consequencia || "[consequência]")
    .replace(/{material}/gi, dados.material || "[material]")
    .replace(/{tempo}/gi, dados.tempo || "[tempo]");
}

// ── Gera N variantes usando templates do canal + memória ──
export function gerarVariantes(channelId, dados, qtd = 3) {
  const config = loadChannelConfig(channelId);
  const templates = config?.titulo?.templates_vencedores || [];
  const maxChars = config?.titulo?.max_caracteres || 60;

  // Embaralha e pega os primeiros N templates distintos
  const embaralhados = [...templates].sort(() => Math.random() - 0.5);
  const variantes = [];
  const usados = new Set();

  for (const tpl of embaralhados) {
    if (variantes.length >= qtd) break;
    const titulo = preencherTemplate(tpl, dados).trim();
    if (usados.has(titulo)) continue;
    usados.add(titulo);
    variantes.push({
      id: String.fromCharCode(65 + variantes.length), // A, B, C
      titulo:
        titulo.length > maxChars ? titulo.slice(0, maxChars - 1) + "…" : titulo,
      template: tpl,
      chars: titulo.length,
      dentro_limite: titulo.length <= maxChars,
    });
  }

  return variantes;
}

// ── ENDPOINTS ──

// Gera variantes para um vídeo
router.post("/generate/:channelId", (req, res) => {
  const { dados, qtd } = req.body || {};
  const variantes = gerarVariantes(req.params.channelId, dados || {}, qtd || 3);
  res.json({ ok: true, variantes });
});

// Registra qual variante foi publicada (inicia tracking)
router.post("/register/:channelId", (req, res) => {
  const { video_id, titulo, template, variante_id } = req.body || {};
  const ab = readJson(abPath(req.params.channelId), {
    testes: [],
    ranking_templates: [],
  });

  ab.testes.push({
    video_id,
    variante_id: variante_id || "A",
    titulo,
    template,
    publicado_em: new Date().toISOString(),
    ctr: null,
    impressoes: null,
    status: "em_andamento",
  });
  writeJson(abPath(req.params.channelId), ab);
  res.json({ ok: true });
});

// Atualiza resultado (CTR medido) de um teste
router.post("/result/:channelId", (req, res) => {
  const { video_id, ctr, impressoes } = req.body || {};
  const ab = readJson(abPath(req.params.channelId), {
    testes: [],
    ranking_templates: [],
  });

  const teste = ab.testes.find(
    (t) => t.video_id === video_id && t.status === "em_andamento"
  );
  if (!teste) return res.status(404).json({ error: "Teste não encontrado." });

  teste.ctr = ctr;
  teste.impressoes = impressoes;
  teste.status = "concluido";
  teste.concluido_em = new Date().toISOString();

  // Atualiza ranking do template
  const rank = ab.ranking_templates.find((r) => r.template === teste.template);
  if (rank) {
    rank.usos++;
    rank.ctr_soma = (rank.ctr_soma || 0) + ctr;
    rank.ctr_medio = Math.round((rank.ctr_soma / rank.usos) * 100) / 100;
    if (ctr >= 6) rank.vitorias = (rank.vitorias || 0) + 1;
  } else {
    ab.ranking_templates.push({
      template: teste.template,
      usos: 1,
      ctr_soma: ctr,
      ctr_medio: ctr,
      vitorias: ctr >= 6 ? 1 : 0,
    });
  }
  ab.ranking_templates.sort((a, b) => b.ctr_medio - a.ctr_medio);

  writeJson(abPath(req.params.channelId), ab);

  // 🧠 Se um template performa bem consistentemente → vira lição de memória
  const t = ab.ranking_templates.find((r) => r.template === teste.template);
  if (t && t.usos >= 4 && t.ctr_medio >= 6) {
    registrarLicao(req.params.channelId, {
      tipo: "titulo",
      insight: `O template "${t.template}" tem CTR médio de ${t.ctr_medio}% em ${t.usos} vídeos`,
      acao: "Priorizar este template nos próximos títulos.",
      evidencias: t.usos,
    });
  }

  res.json({ ok: true, teste, ranking: ab.ranking_templates });
});

// Resultados e ranking de templates
router.get("/results/:channelId", (req, res) => {
  const ab = readJson(abPath(req.params.channelId), {
    testes: [],
    ranking_templates: [],
  });
  res.json({ ok: true, ...ab });
});

// Promove template vencedor para templates_vencedores do canal
router.post("/promote/:channelId", (req, res) => {
  const { template } = req.body || {};
  const config = loadChannelConfig(req.params.channelId);
  if (!config) return res.status(404).json({ error: "Canal não encontrado." });

  config.titulo = config.titulo || {};
  config.titulo.templates_vencedores = config.titulo.templates_vencedores || [];
  if (!config.titulo.templates_vencedores.includes(template)) {
    config.titulo.templates_vencedores.unshift(template); // topo da lista
  }
  const configPath = path.join(
    CHANNELS_DIR,
    req.params.channelId,
    "channel.config.json"
  );
  writeJson(configPath, config);

  res.json({ ok: true, templates: config.titulo.templates_vencedores });
});

export default router;
