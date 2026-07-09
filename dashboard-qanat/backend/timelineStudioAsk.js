/**
 * Ask Lumiera — interpreta pedidos e devolve ações estruturadas — Fase 4
 */

import {
  resolvePackByAlias,
  NICHE_PACK_CATALOG,
} from "./timelineStudioNichePacks.js";

const LEGACY_TEMPLATE_REPLY =
  "Templates legados (COMPARACAO, CRONOLOGIA, Lower Third fixo) foram removidos. Use os botoes roxos do Template Studio no painel Ask Lumiera.";

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

function parseTimecode(value = "") {
  const raw = String(value || "").trim();
  const mmss = raw.match(/\b(\d{1,2}):(\d{2})\b/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const sec = raw.match(/\b(\d+(?:[.,]\d+)?)\s*(?:s|seg|segundos?)\b/i);
  if (sec) return Number(sec[1].replace(",", "."));
  return null;
}

function extractQuotedText(message = "") {
  const quoted = String(message || "").match(/["“”']([^"“”']{1,160})["“”']/);
  return quoted ? quoted[1].trim() : null;
}

function extractCaptionReplacement(message = "") {
  const quoted = extractQuotedText(message);
  if (quoted) return quoted;
  const match = String(message || "").match(/(?:para|por|como)\s+(.{2,160})$/i);
  return match ? match[1].trim() : null;
}

function extractPercent(message = "") {
  const m = String(message || "").match(/\b(\d{1,3})\s*%/);
  if (!m) return null;
  return Math.min(1, Math.max(0, Number(m[1]) / 100));
}

function askTargetTrack(lower = "") {
  if (/legenda|caption|subt[ií]tulo/.test(lower)) return "captions";
  if (/m[uú]sica|bgm|trilha/.test(lower)) return "music";
  if (/v[ií]deo|b-?roll|stock/.test(lower)) return "video";
  if (/motion|remotion|mapa|gr[aá]fico|contador|pictograma/.test(lower)) {
    return "motion";
  }
  if (/overlay|lower third|tarja|faixa/.test(lower)) return "overlays";
  return undefined;
}

function wantsLegacyTemplate(lower = "") {
  return (
    /pictograma|população|populacao|participação|comparação global|shipbuilding/i.test(
      lower
    ) ||
    /location|localização|localizacao|intro.*(cidade|país|pais)|satélite|satelite/i.test(
      lower
    ) ||
    /contador|counter|número grande|numero grande/i.test(lower) ||
    /bar chart|barras|gráfico de barras|grafico de barras/i.test(lower) ||
    /lower third|faixa|tarja|cronolog|linha do tempo|timeline/i.test(lower) ||
    /adiciona|insere|coloca/.test(lower)
  );
}

function ruleBasedAsk({ message, playhead, nichePack }) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const actions = [];
  let reply = "";

  if (
    /^(vai|ir|pula|pular|posiciona|seek)\b|playhead|cabe[cç]ote/.test(lower)
  ) {
    const target = parseTimecode(text);
    if (target != null) {
      actions.push({ type: "seek_to", time: target });
      return {
        reply: `Playhead movido para ${formatTime(target)}.`,
        actions,
        source: "rules",
      };
    }
  }

  if (
    /fechar gaps|remover gaps|tirar gaps|sem gaps|fecha os gaps/.test(lower)
  ) {
    actions.push({ type: "tighten_gaps" });
    return {
      reply: "Vou fechar os gaps curtos/visiveis da timeline.",
      actions,
      source: "rules",
    };
  }

  if (/legenda|caption|subt[ií]tulo/.test(lower)) {
    const quoted = extractCaptionReplacement(text);
    if (
      quoted &&
      /muda|troca|altera|corrige|coloca|define|renomeia/.test(lower)
    ) {
      actions.push({ type: "set_caption_text", text: quoted });
      return {
        reply: `Legenda atualizada para "${quoted}".`,
        actions,
        source: "rules",
      };
    }
  }

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
    reply = `Pacote alterado para **${pack?.label || packAlias}**. Use os templates roxos do Template Studio abaixo.`;
    return { reply, actions, source: "rules" };
  }

  if (wantsLegacyTemplate(lower)) {
    return { reply: LEGACY_TEMPLATE_REPLY, actions: [], source: "rules" };
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
      "Selecione um clip na trilha **Legendas** e edite o texto no inspetor. Para templates Remotion, use os botoes roxos do Template Studio.";
    return { reply, actions, source: "rules" };
  }

  const pack = NICHE_PACK_CATALOG.find((p) => p.id === nichePack);
  reply = pack
    ? `Pacote ativo: ${pack.label}. Insira templates pelo painel **Templates Studio** (botoes roxos) ou peca stock Pexels.`
    : `Posicao ${formatTime(playhead)}. Use Templates Studio (roxos) ou stock Pexels.`;

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

  const prompt = `Você é o assistente Ask Lumiera do editor de vídeo Timeline Studio.
Playhead: ${playhead}s. Pacote de nicho ativo: ${nichePack} (${pack?.label || ""}).
Templates legados (bar-chart, counter, lower-third fixos) foram REMOVIDOS.
O usuario deve usar apenas templates do Remotion Template Studio (botoes roxos na UI).

Pedido do usuário: "${message}"

Responda APENAS JSON válido:
{
  "reply": "resposta curta em português",
  "actions": [
    { "type": "set_niche_pack", "niche_pack": "data-journalist" },
    { "type": "search_stock", "query": "forest aerial", "mediaType": "video" },
    { "type": "update_clip", "targetTrack": "video", "patch": { "start": 12, "duration": 4 } },
    { "type": "update_clip_props", "targetTrack": "music", "props": { "volume": 0.25 } },
    { "type": "set_caption_text", "text": "texto novo" },
    { "type": "delete_clip", "targetTrack": "overlays" },
    { "type": "seek_to", "time": 42 },
    { "type": "tighten_gaps" }
  ]
}

Regras:
- NUNCA use add_overlay — templates legados foram removidos.
- Máximo 2 ações por resposta.
- search_stock: query em inglês, 2-5 palavras.
- Se pedir template/grafico/contador, explique que deve usar Template Studio.
- Se não houver ação concreta, actions = [].`;

  try {
    const raw = await callGemini(projDir, prompt, {
      responseMimeType: "application/json",
      temperature: 0.2,
    });
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const actions = [];

    for (const act of parsed.actions || []) {
      if (act.type === "add_overlay") continue;
      if (act.type === "set_niche_pack" && act.niche_pack) {
        actions.push({ type: "set_niche_pack", niche_pack: act.niche_pack });
      } else if (act.type === "search_stock" && act.query) {
        actions.push({
          type: "search_stock",
          query: act.query,
          mediaType: act.mediaType === "image" ? "image" : "video",
        });
      } else if (act.type === "update_clip" && act.patch) {
        actions.push({
          type: "update_clip",
          clipId: act.clipId ? String(act.clipId) : undefined,
          targetTrack: act.targetTrack ? String(act.targetTrack) : undefined,
          patch: act.patch,
        });
      } else if (act.type === "update_clip_props" && act.props) {
        actions.push({
          type: "update_clip_props",
          clipId: act.clipId ? String(act.clipId) : undefined,
          targetTrack: act.targetTrack ? String(act.targetTrack) : undefined,
          props: act.props,
        });
      } else if (act.type === "set_caption_text" && act.text) {
        actions.push({ type: "set_caption_text", text: String(act.text) });
      } else if (act.type === "delete_clip") {
        actions.push({
          type: "delete_clip",
          clipId: act.clipId ? String(act.clipId) : undefined,
          targetTrack: act.targetTrack ? String(act.targetTrack) : undefined,
        });
      } else if (act.type === "seek_to" && act.time != null) {
        actions.push({ type: "seek_to", time: Number(act.time) });
      } else if (act.type === "tighten_gaps") {
        actions.push({ type: "tighten_gaps" });
      }
    }

    let reply = String(parsed.reply || "").trim();
    if (/add_overlay|pictograma|contador|barras|lower third/i.test(reply)) {
      reply = LEGACY_TEMPLATE_REPLY;
    }

    return { reply: reply || "Pronto.", actions, source: "llm" };
  } catch {
    return null;
  }
}

export async function handleTimelineStudioAsk({
  message,
  playhead = 0,
  niche_pack = "documentary-prestige",
  prefer_llm = false,
  callGemini,
  projDir,
}) {
  const rules = ruleBasedAsk({
    message,
    playhead: Number(playhead) || 0,
    nichePack: String(niche_pack || "documentary-prestige"),
  });

  if (!prefer_llm || !callGemini) {
    return rules;
  }

  const llm = await llmAsk({
    message,
    playhead: Number(playhead) || 0,
    nichePack: String(niche_pack || "documentary-prestige"),
    callGemini,
    projDir,
  });

  return llm || rules;
}
