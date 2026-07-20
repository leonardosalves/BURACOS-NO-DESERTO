/**
 * channelAwareSearch.js — Pesquisa web filtrada pelo nicho/config do canal.
 *
 * USO no server.js:
 *   import searchRouter from "./channelAwareSearch.js";
 *   app.use("/api/search", searchRouter);
 */

import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { loadChannelConfig } from "./channelProfiles.js";
import { fetchWebResearchForTopic } from "./webResearchService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, "..", "..");
const router = Router();

// ── Fontes com autoridade conhecida por nicho ──
const FONTES_AUTORIDADE = {
  engenharia_e_construcao: [
    "arup.com",
    "asce.org",
    "construction-physics.com",
    "bloomberg.com",
    "reuters.com",
  ],
  historia_antiga: [
    "britannica.com",
    "nationalgeographic.com",
    "archaeology.org",
    "smithsonianmag.com",
  ],
  tecnologia: ["theverge.com", "arstechnica.com", "wired.com", "ieee.org"],
  ciencia: [
    "nature.com",
    "science.org",
    "scientificamerican.com",
    "newscientist.com",
  ],
  default: ["reuters.com", "apnews.com", "bbc.com", "britannica.com"],
};

// ── Valida se um tema é permitido no canal ──
function validarTema(tema, config) {
  const nicho = config.nicho || {};
  const t = String(tema).toLowerCase();

  for (const proibido of nicho.temas_proibidos || []) {
    if (t.includes(proibido.toLowerCase())) {
      return {
        permitido: false,
        motivo: `Tema proibido neste canal: "${proibido}"`,
      };
    }
  }
  return { permitido: true };
}

// ── Enriquece a query com palavras-chave SEO do canal ──
function enriquecerQuery(query, config) {
  const keywords = config.nicho?.palavras_chave_seo || [];
  const nicho = config.nicho?.principal || "";
  const extras = keywords
    .filter((kw) => !query.toLowerCase().includes(kw.toLowerCase()))
    .slice(0, 2);
  return {
    query_original: query,
    query_enriquecida: [query, ...extras].join(" "),
    keywords_usadas: extras,
    nicho,
  };
}

// ── Ranqueia resultados por autoridade no nicho ──
function ranquearResultados(resultados, config) {
  const nicho = config.nicho?.principal || "default";
  const fontesBoas = FONTES_AUTORIDADE[nicho] || FONTES_AUTORIDADE.default;

  return resultados
    .map((r) => {
      const dominio = extrairDominio(r.url);
      const autoridade = fontesBoas.some((f) => dominio.includes(f)) ? 100 : 50;
      const relevancia = calcularRelevancia(r, config);
      return {
        ...r,
        dominio,
        score_autoridade: autoridade,
        score_relevancia: relevancia,
        score_final: autoridade * 0.4 + relevancia * 0.6,
      };
    })
    .sort((a, b) => b.score_final - a.score_final);
}

function extrairDominio(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function calcularRelevancia(resultado, config) {
  const keywords = config.nicho?.palavras_chave_seo || [];
  const texto = `${resultado.titulo} ${resultado.snippet}`.toLowerCase();
  const matches = keywords.filter((kw) =>
    texto.includes(kw.toLowerCase())
  ).length;
  return Math.min(100, 40 + matches * 20);
}

// ── Gera ângulos de vídeo a partir da pesquisa ──
function gerarAngulos(resultados, config) {
  const templates = config.titulo?.templates_vencedores || [];
  const topResultados = resultados.slice(0, 3);
  return topResultados.map((r, i) => ({
    angulo: `Ângulo ${i + 1}: ${r.titulo}`,
    fonte: r.dominio,
    sugestao_titulo: templates[0]
      ? "Aplicar template: " + templates[0]
      : "Criar título com número + contradição",
    por_que_funciona: `Fonte de alta autoridade (${r.score_autoridade}/100) · relevância ${r.score_relevancia}/100`,
  }));
}

// ── ENDPOINT PRINCIPAL ──
router.post("/:channelId", async (req, res) => {
  try {
    const { channelId } = req.params;
    const { query } = req.body || {};
    const config = loadChannelConfig(channelId);
    if (!config)
      return res.status(404).json({ error: "Canal não encontrado." });

    // 1. Valida tema
    const validacao = validarTema(query, config);
    if (!validacao.permitido) {
      return res.json({
        ok: false,
        bloqueado: true,
        motivo: validacao.motivo,
        resultados: [],
      });
    }

    // 2. Enriquece query
    const queryInfo = enriquecerQuery(query, config);

    // 3. Executa pesquisa real
    let resultados = [];
    try {
      const resWeb = await fetchWebResearchForTopic({
        topic: queryInfo.query_enriquecida,
        niche: queryInfo.nicho,
        format: config.formato_video?.formato || "SHORTS",
        workspaceDir: WORKSPACE_DIR,
      });

      if (resWeb.sources && resWeb.sources.length > 0) {
        resultados = resWeb.sources.map((s) => {
          const fato = resWeb.facts?.find(
            (f) => f.sourceId === s.url || f.url === s.url
          );
          return {
            titulo: s.title || "Resultado de pesquisa",
            url: s.url,
            snippet: fato
              ? fato.claim
              : "Informações e análises do nicho extraídas da fonte.",
          };
        });
      } else if (resWeb.facts && resWeb.facts.length > 0) {
        resultados = resWeb.facts.map((f, idx) => ({
          titulo: f.subject || `Fato de Pesquisa #${idx + 1}`,
          url: f.url || "https://google.com",
          snippet: f.claim,
        }));
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: `Falha na pesquisa: ${err.message}` });
    }

    // 4. Ranqueia por autoridade + relevância
    resultados = ranquearResultados(resultados, config);

    // 5. Gera ângulos de vídeo
    const angulos = gerarAngulos(resultados, config);

    res.json({
      ok: true,
      canal: config.meta?.nome,
      nicho: config.nicho?.principal,
      query: queryInfo,
      resultados,
      angulos,
      total: resultados.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
