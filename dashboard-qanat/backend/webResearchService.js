/**
 * Pesquisa web com Agent Reach (Exa) + Gemini Google Search grounding.
 */

import { fetchAgentReachResearchForTopic, mergeWebResearch } from "./agentReachService.js";

function extractGroundingSources(candidate = {}) {
  const meta = candidate?.groundingMetadata || candidate?.grounding_metadata || {};
  const chunks = meta.groundingChunks || meta.grounding_chunks || [];
  const out = [];
  const seen = new Set();

  for (const chunk of chunks) {
    const web = chunk?.web || chunk?.retrievedContext?.uri ? chunk : null;
    const uri = web?.uri || web?.web?.uri || chunk?.retrievedContext?.uri;
    const title = web?.title || chunk?.retrievedContext?.title || "";
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    out.push({
      title: String(title || uri).trim().slice(0, 200),
      url: String(uri).trim(),
    });
  }

  const supports = meta.groundingSupports || meta.grounding_supports || [];
  for (const s of supports) {
    const idx = Number(s?.groundingChunkIndices?.[0] ?? s?.grounding_chunk_indices?.[0]);
    if (Number.isFinite(idx) && chunks[idx]?.web?.uri && !seen.has(chunks[idx].web.uri)) {
      seen.add(chunks[idx].web.uri);
      out.push({
        title: String(chunks[idx].web.title || chunks[idx].web.uri).slice(0, 200),
        url: chunks[idx].web.uri,
      });
    }
  }

  return out.slice(0, 12);
}

function parseResearchJson(text = "") {
  const raw = String(text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = raw.indexOf("{");
  if (start < 0) return null;
  try {
    return JSON.parse(raw.slice(start, raw.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
}

export async function fetchWebResearchForTopic({
  topic = "",
  niche = "",
  format = "SHORTS",
  apiKey = null,
  getApiKeys = () => [],
  workspaceDir = null,
} = {}) {
  const query = String(topic || niche).trim();
  if (!query) {
    return { available: false, summary: "", sources: [], facts: [], message: "Tema vazio" };
  }

  let agentReach = { available: false, summary: "", sources: [], facts: [] };
  if (workspaceDir) {
    try {
      agentReach = await fetchAgentReachResearchForTopic({
        topic: query,
        niche,
        workspaceDir,
        numResults: 6,
      });
      if (agentReach.available) {
        console.log(`[WebResearch] Agent Reach: ${agentReach.sources?.length || 0} fontes.`);
      }
    } catch (err) {
      console.warn("[WebResearch] Agent Reach falhou:", err.message);
    }
  }

  const keys = [...new Set([apiKey, ...getApiKeys()].filter(Boolean))];
  if (!keys.length) {
    if (agentReach.available) return agentReach;
    return {
      available: false,
      summary: "",
      sources: [],
      facts: [],
      message: "Sem chave API e Agent Reach indisponível",
      fallback: true,
    };
  }

  const prompt = `Pesquise na web (fontes confiáveis: museus, .edu, imprensa, órgãos oficiais, Wikipedia só como ponto de partida) sobre:

TEMA: ${query}
NICHO: ${niche || query}
FORMATO: ${format}

Retorne APENAS JSON válido:
{
  "facts": [
    "5 a 8 fatos verificáveis com datas, nomes ou números quando possível"
  ],
  "angles": [
    "2 a 3 ângulos narrativos fortes para um vídeo ${format === "SHORTS" ? "Short" : "documentário"}"
  ],
  "summary": "Parágrafo único em PT-BR sintetizando o que importa para o roteiro"
}

Regras:
- Só fatos que você encontrou na pesquisa; não invente URLs nem estatísticas.
- Priorize detalhes surpreendentes e pouco conhecidos.
- Evite generalidades tipo "é muito importante" ou "mudou o mundo" sem prova.`;

  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
  let lastErr = null;

  for (const model of models) {
    for (const key of keys) {
      try {
        const body = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.25 },
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          lastErr = new Error(err?.error?.message || res.statusText);
          if (res.status === 429) break;
          continue;
        }

        const data = await res.json();
        const candidate = data.candidates?.[0] || {};
        const text = candidate.content?.parts?.map((p) => p.text || "").join("\n") || "";
        const sources = extractGroundingSources(candidate);
        const parsed = parseResearchJson(text) || {};

        const facts = Array.isArray(parsed.facts) ? parsed.facts.map(String).filter(Boolean) : [];
        const angles = Array.isArray(parsed.angles) ? parsed.angles.map(String).filter(Boolean) : [];
        const summary = String(parsed.summary || "").trim()
          || [facts.slice(0, 5).join(" "), ...angles].filter(Boolean).join(" ");

        if (!summary && facts.length === 0) {
          lastErr = new Error("Pesquisa web sem fatos utilizáveis");
          continue;
        }

        const gemini = {
          available: true,
          summary: summary.slice(0, 8000),
          facts,
          angles,
          sources,
          model,
          fallback: false,
          via: "gemini-grounding",
        };
        return mergeWebResearch(agentReach, gemini);
      } catch (err) {
        lastErr = err;
      }
    }
  }

  console.warn("[WebResearch] Gemini falhou:", lastErr?.message || "desconhecido");
  if (agentReach.available) return agentReach;

  return {
    available: false,
    summary: "",
    sources: [],
    facts: [],
    message: lastErr?.message || "Pesquisa web indisponível",
    fallback: true,
  };
}

export function formatWebResearchPromptBlock(research = {}, label = "PESQUISA WEB (FONTES REAIS)") {
  if (!research?.summary && !(research?.facts?.length)) return "";

  const sourceLines = (research.sources || [])
    .slice(0, 8)
    .map((s, i) => `${i + 1}. ${s.title} — ${s.url}`)
    .join("\n");

  const factLines = (research.facts || []).slice(0, 8).map((f) => `• ${f}`).join("\n");

  return `
${label}:
${research.summary || ""}
${factLines ? `\nFATOS PARA USAR NA NARRAÇÃO:\n${factLines}` : ""}
${sourceLines ? `\nFONTES (cite mentalmente — use só o que estiver acima):\n${sourceLines}` : ""}

INSTRUÇÃO: Incorpore fatos verificáveis na narração. Não invente dados além desta pesquisa. O fechamento deve ser declarativo (mic drop), NUNCA pergunta vazia ao espectador.
`;
}