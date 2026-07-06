/**
 * Ask Lumiera — interpreta pedidos e devolve ações estruturadas — Fase 4
 */

import {
  buildStudioOverlayClip,
  resolvePackByAlias,
  STUDIO_TEMPLATE_DEFS,
  NICHE_PACK_CATALOG,
} from "./timelineStudioNichePacks.js";

function extractStockQuery(message = "") {
  const m = String(message);
  const quoted = m.match(/["']([^"']{2,60})["']/);
  if (quoted) return quoted[1].trim();
  const deMatch = m.match(
    /(?:pexels|pixabay|stock|b-?roll|floresta|vídeo|video|imagem|foto)\s+(?:de\s+)?([a-zA-Z0-9\s-]{2,50})/i
  );
  if (deMatch) return deMatch[1].trim();
  const english = m.match(/\b([a-z]+(?:\s+[a-z]+){0,4})\b/i);
  if (
    english &&
    /forest|city|ocean|night|aerial|factory|space/i.test(english[1])
  )
    return english[1].trim();
  return null;
}

function extractLocation(message = "") {
  const m = String(message);
  const loc = m.match(
    /(?:em|de|para|local|lugar|cidade|país|pais)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)?)/
  );
  return loc ? loc[1].trim() : null;
}

function ruleBasedAsk({ message, playhead, nichePack }) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const actions = [];
  let reply = "";

  const packAlias = resolvePackByAlias(lower);
  if (
    packAlias &&
    (/pacote|pack|aplica|mudar|trocar|usar/.test(lower) ||
      /jornalismo|geograf|mistério|misterio|social|industrial|document/.test(
        lower
      ))
  ) {
    const pack = NICHE_PACK_CATALOG.find((p) => p.id === packAlias);
    actions.push({ type: "set_niche_pack", niche_pack: packAlias });
    reply = `Pacote alterado para **${pack?.label || packAlias}**. Use os templates sugeridos abaixo.`;
    return { reply, actions, source: "rules" };
  }

  if (
    /pictograma|população|populacao|participação|comparação global|shipbuilding/i.test(
      lower
    )
  ) {
    const clip = buildStudioOverlayClip({
      templateId: "pictogram-chart",
      playhead,
    });
    if (clip) actions.push({ type: "add_overlay", clip });
    reply = `Pictograma inserido em ${formatTime(playhead)}. Edite segmentos no inspetor.`;
    return { reply, actions, source: "rules" };
  }

  if (
    /location|localização|localizacao|intro.*(cidade|país|pais)|satélite|satelite/i.test(
      lower
    ) ||
    (/(cidade|país|pais)\s/.test(lower) &&
      /adiciona|insere|coloca|intro/.test(lower))
  ) {
    const location = extractLocation(text) || "Local";
    const clip = buildStudioOverlayClip({
      templateId: "location-intro",
      playhead,
      props: { location, region: location },
      label: `Intro: ${location}`,
    });
    if (clip) actions.push({ type: "add_overlay", clip });
    reply = `Intro de local (${location}) em ${formatTime(playhead)}.`;
    return { reply, actions, source: "rules" };
  }

  if (/contador|counter|número grande|numero grande/i.test(lower)) {
    const clip = buildStudioOverlayClip({ templateId: "counter", playhead });
    if (clip) actions.push({ type: "add_overlay", clip });
    reply = `Contador inserido em ${formatTime(playhead)}.`;
    return { reply, actions, source: "rules" };
  }

  if (/bar chart|barras|gráfico de barras|grafico de barras/i.test(lower)) {
    const clip = buildStudioOverlayClip({ templateId: "bar-chart", playhead });
    if (clip) actions.push({ type: "add_overlay", clip });
    reply = `Gráfico de barras em ${formatTime(playhead)}.`;
    return { reply, actions, source: "rules" };
  }

  if (/lower third|faixa|tarja/i.test(lower)) {
    const clip = buildStudioOverlayClip({
      templateId: "lower-third",
      playhead,
    });
    if (clip) actions.push({ type: "add_overlay", clip });
    reply = `Lower third em ${formatTime(playhead)}.`;
    return { reply, actions, source: "rules" };
  }

  if (
    /pexels|pixabay|stock|b-?roll|floresta|busca.*(vídeo|video|imagem)/i.test(
      lower
    )
  ) {
    const query =
      extractStockQuery(text) ||
      (lower.includes("floresta") ? "forest aerial" : "documentary b-roll");
    const mediaType = /imagem|foto|image/i.test(lower) ? "image" : "video";
    actions.push({ type: "search_stock", query, mediaType });
    reply = `Busca stock "${query}" no painel esquerdo. Clique + no resultado desejado.`;
    return { reply, actions, source: "rules" };
  }

  if (/legenda|caption|subtítulo|subtitulo/i.test(lower)) {
    reply =
      "Selecione um clip na trilha **Legendas** e edite o texto no inspetor abaixo da timeline. Posso inserir templates de overlay se pedir pictograma, intro de local ou contador.";
    return { reply, actions, source: "rules" };
  }

  const pack = NICHE_PACK_CATALOG.find((p) => p.id === nichePack);
  const suggestions = (pack?.templateIds || [])
    .slice(0, 3)
    .map((id) => STUDIO_TEMPLATE_DEFS[id]?.label)
    .filter(Boolean)
    .join(", ");

  reply = suggestions
    ? `Pacote ativo: ${pack?.label || nichePack}. Templates sugeridos: ${suggestions}. Peça "adiciona pictograma", "intro de local em Paris" ou "busca stock de floresta".`
    : `Posição ${formatTime(playhead)}. Peça templates (pictograma, intro local, contador), stock Pexels ou troca de pacote de nicho.`;

  return { reply, actions, source: "rules" };
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

async function llmAsk({ message, playhead, nichePack, callGemini, projDir }) {
  if (!callGemini) return null;

  const pack = NICHE_PACK_CATALOG.find((p) => p.id === nichePack);
  const templateList = Object.keys(STUDIO_TEMPLATE_DEFS).join(", ");

  const prompt = `Você é o assistente Ask Lumiera do editor de vídeo Timeline Studio.
Playhead: ${playhead}s. Pacote de nicho ativo: ${nichePack} (${pack?.label || ""}).
Templates disponíveis: ${templateList}.
Pacotes: ${NICHE_PACK_CATALOG.map((p) => p.id).join(", ")}.

Pedido do usuário: "${message}"

Responda APENAS JSON válido:
{
  "reply": "resposta curta em português",
  "actions": [
    { "type": "add_overlay", "templateId": "pictogram-chart", "props": {}, "label": "opcional" },
    { "type": "set_niche_pack", "niche_pack": "data-journalist" },
    { "type": "search_stock", "query": "forest aerial", "mediaType": "video" }
  ]
}

Regras:
- Máximo 2 ações por resposta.
- add_overlay: use templateId válido; props só campos necessários (location para location-intro, segments para pictogram-chart).
- search_stock: query em inglês, 2-5 palavras.
- Se não houver ação concreta, actions = [].`;

  try {
    const raw = await callGemini(projDir, prompt, {
      responseMimeType: "application/json",
      temperature: 0.2,
    });
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const actions = [];

    for (const act of parsed.actions || []) {
      if (act.type === "add_overlay" && act.templateId) {
        const clip = buildStudioOverlayClip({
          templateId: act.templateId,
          playhead,
          props: act.props || {},
          label: act.label,
        });
        if (clip) actions.push({ type: "add_overlay", clip });
      } else if (act.type === "set_niche_pack" && act.niche_pack) {
        actions.push({ type: "set_niche_pack", niche_pack: act.niche_pack });
      } else if (act.type === "search_stock" && act.query) {
        actions.push({
          type: "search_stock",
          query: act.query,
          mediaType: act.mediaType === "image" ? "image" : "video",
        });
      }
    }

    return {
      reply: String(parsed.reply || "Entendido."),
      actions,
      source: "llm",
    };
  } catch {
    return null;
  }
}

export async function handleTimelineStudioAsk({
  message,
  playhead = 0,
  nichePack = "documentary-prestige",
  callGemini,
  projDir,
  preferLlm = true,
}) {
  const rules = ruleBasedAsk({ message, playhead, nichePack });

  if (rules.actions.length > 0 || !preferLlm) {
    return rules;
  }

  const llm = await llmAsk({
    message,
    playhead,
    nichePack,
    callGemini,
    projDir,
  });
  return llm || rules;
}
