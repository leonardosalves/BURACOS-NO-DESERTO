/**
 * Reparo automático de list_items para projetos LISTICLE quando a IA omitiu o array.
 */

import fs from "fs";
import path from "path";
import { isListicleProject } from "./videoProEnhancements.js";

export function needsListItemsRepair(config = {}, storyboard = {}) {
  if (!isListicleProject(config, storyboard)) return false;
  const expected = Number(config.rank_count || storyboard.listicle?.rank_count || 0) || 3;
  const items = Array.isArray(storyboard.list_items) ? storyboard.list_items : [];
  const valid = items.filter((it) => String(it?.title || it?.name || "").trim().length > 1);
  return valid.length < expected;
}

function inferRankCount(config = {}, storyboard = {}) {
  return Number(
    config.rank_count
    || storyboard.listicle?.rank_count
    || config.list_items?.length
    || 3,
  ) || 3;
}

function inferRankOrder(config = {}, storyboard = {}) {
  const order = config.rank_order || storyboard.listicle?.rank_order || "desc";
  return order === "asc" ? "asc" : "desc";
}

export function buildListItemsRepairPrompt({
  narrative = "",
  visualPrompts = [],
  rankCount = 3,
  rankOrder = "desc",
  listTopic = "",
  format = "SHORTS",
  blockPhrases = [],
} = {}) {
  const itemBlocks = visualPrompts
    .filter((vp) => Number(vp.block) > 1)
    .map((vp) => ({
      block: vp.block,
      scene: vp.scene,
      narration: String(vp.narration_text || "").slice(0, 280),
      overlay: String(vp.text_overlay || "").trim(),
    }));

  const phrases = blockPhrases
    .filter((bp) => Number(bp.block) > 1)
    .map((bp) => ({ block: bp.block, phrase: String(bp.phrase || "").slice(0, 120) }));

  return `Você é um editor de roteiros LISTICLE / TOP N para YouTube.

O roteiro abaixo foi gerado, mas o campo "list_items" está AUSENTE ou incompleto.
Sua tarefa: extrair EXATAMENTE ${rankCount} itens do ranking a partir do texto — sem inventar itens que não aparecem na narração.

TEMA DA LISTA: "${listTopic}"
FORMATO: ${format}
ORDEM DO RANKING: ${rankOrder === "asc" ? "1 → N (build-up)" : "N → 1 (countdown)"}
ITENS ESPERADOS: ${rankCount}

NARRAÇÃO COMPLETA:
${String(narrative).slice(0, 6000)}

BLOCOS / CENAS (referência de bloco → conteúdo):
${JSON.stringify(itemBlocks, null, 2)}

FRASES DE BLOCO (se houver):
${phrases.length ? JSON.stringify(phrases, null, 2) : "(nenhuma)"}

REGRAS OBRIGATÓRIAS:
- Retorne APENAS JSON válido (sem markdown).
- "list_items" deve ter exatamente ${rankCount} objetos.
- Cada item precisa: rank (número), title (nome curto do item), year, origin, block, hook_line, visual_hook.
- "block": bloco 2 = primeiro item na ordem narrativa, bloco 3 = segundo… até bloco ${rankCount + 1}.
- Em ordem ${rankOrder === "desc" ? "descendente" : "ascendente"}: ${rankOrder === "desc"
    ? `bloco 2 = rank ${rankCount}, bloco 3 = rank ${rankCount - 1} … bloco ${rankCount + 1} = rank 1`
    : `bloco 2 = rank 1 … bloco ${rankCount + 1} = rank ${rankCount}`}.
- Títulos REAIS citados na narração (ex: Helepolis, Balista Romana) — não genéricos.
- visual_hook: termo em inglês para busca de stock (2-4 palavras).

Responda neste formato:
{
  "list_items": [
    {
      "rank": 3,
      "title": "Nome do Item",
      "year": "305 a.C.",
      "origin": "Grécia",
      "block": 2,
      "hook_line": "frase curta de gancho",
      "visual_hook": "siege tower ancient"
    }
  ],
  "listicle": {
    "content_mode": "LISTICLE",
    "rank_count": ${rankCount},
    "rank_order": "${rankOrder}",
    "topic": "${String(listTopic).replace(/"/g, '\\"')}"
  }
}`;
}

function normalizeListItemEntry(item = {}, index = 0, { rankCount = 3, rankOrder = "desc" } = {}) {
  const rank = Number(item.rank ?? item.position ?? item.numero ?? 0);
  const title = String(item.title || item.name || item.item || "").trim();
  const block = Number(item.block) || 0;
  const fallbackRank = rankOrder === "desc" ? rankCount - index : index + 1;
  return {
    rank: rank > 0 ? rank : fallbackRank,
    title,
    year: String(item.year || item.ano || item.period || "").trim(),
    origin: String(item.origin || item.country || item.pais || item.civilization || "").trim(),
    block: block > 1 ? block : index + 2,
    hook_line: String(item.hook_line || item.hook || item.gancho || "").trim(),
    visual_hook: String(item.visual_hook || item.stock_query || item.visualHook || "").trim(),
  };
}

export function normalizeListItemsPayload(raw = {}, { rankCount = 3, rankOrder = "desc" } = {}) {
  let items = raw.list_items ?? raw.listItems ?? raw.items ?? [];
  if (!Array.isArray(items) && items && typeof items === "object") {
    items = Object.values(items);
  }
  if (!Array.isArray(items)) items = [];

  const normalized = items
    .map((item, i) => normalizeListItemEntry(item, i, { rankCount, rankOrder }))
    .filter((it) => it.title.length > 1);

  const byRank = new Map();
  for (const item of normalized) {
    if (!byRank.has(item.rank)) byRank.set(item.rank, item);
  }

  const orderedRanks = rankOrder === "desc"
    ? Array.from({ length: rankCount }, (_, i) => rankCount - i)
    : Array.from({ length: rankCount }, (_, i) => i + 1);

  const result = [];
  orderedRanks.forEach((rank, i) => {
    const existing = byRank.get(rank);
    if (existing) {
      result.push({ ...existing, rank, block: i + 2 });
    }
  });

  if (result.length < rankCount) {
    for (const item of normalized) {
      if (result.length >= rankCount) break;
      if (!result.some((r) => r.title.toLowerCase() === item.title.toLowerCase())) {
        result.push({ ...item, block: result.length + 2 });
      }
    }
  }

  return result.slice(0, rankCount);
}

export function mergeListItemsIntoStoryboard(storyboard = {}, listItems = [], listicleMeta = {}) {
  const next = { ...storyboard };
  next.list_items = listItems;
  if (listicleMeta && typeof listicleMeta === "object") {
    next.listicle = { ...(next.listicle || {}), ...listicleMeta, content_mode: "LISTICLE" };
  } else if (!next.listicle?.content_mode) {
    next.listicle = { ...(next.listicle || {}), content_mode: "LISTICLE" };
  }
  return next;
}

export async function repairListItemsWithAI(
  storyboard = {},
  config = {},
  {
    apiKey,
    callGemini,
    parseJson,
    format = "SHORTS",
  } = {},
) {
  if (!apiKey || !callGemini || !parseJson) {
    return { storyboard, repaired: false, reason: "no_api" };
  }
  if (!needsListItemsRepair(config, storyboard)) {
    return { storyboard, repaired: false, reason: "not_needed" };
  }

  const rankCount = inferRankCount(config, storyboard);
  const rankOrder = inferRankOrder(config, storyboard);
  const listTopic = String(
    config.list_topic
    || storyboard.listicle?.topic
    || storyboard.strategy?.title_main
    || config.niche
    || "",
  ).trim();

  const prompt = buildListItemsRepairPrompt({
    narrative: storyboard.narrative_script || "",
    visualPrompts: storyboard.visual_prompts || [],
    rankCount,
    rankOrder,
    listTopic,
    format: config.video_format || format,
    blockPhrases: config.block_phrases || [],
  });

  const responseText = await callGemini(prompt, {
    temperature: 0.35,
    maxRetries: 2,
  });
  const raw = await parseJson(responseText, "List items repair");
  const listItems = normalizeListItemsPayload(raw, { rankCount, rankOrder });

  if (listItems.length < Math.min(rankCount, 2)) {
    return { storyboard, repaired: false, reason: "empty_response", count: listItems.length };
  }

  const merged = mergeListItemsIntoStoryboard(
    storyboard,
    listItems,
    raw.listicle || {
      content_mode: "LISTICLE",
      rank_count: rankCount,
      rank_order: rankOrder,
      topic: listTopic,
    },
  );

  return { storyboard: merged, repaired: true, count: listItems.length, listItems };
}

export async function ensureListItemsInProject(projectDir, {
  getApiKey,
  callGemini,
  parseJson,
  readProjectJson,
  writeStoryboard = true,
} = {}) {
  const config = readProjectJson(projectDir, "config_qanat.json", {});
  const storyboard = readProjectJson(projectDir, "storyboard.json", {});

  if (!needsListItemsRepair(config, storyboard)) {
    return { repaired: false, reason: "not_needed", storyboard };
  }

  const apiKey = getApiKey(projectDir);
  const format = config.video_format || (config.aspect_ratio === "9:16" ? "SHORTS" : "LONGO");

  const result = await repairListItemsWithAI(storyboard, config, {
    apiKey,
    callGemini,
    parseJson,
    format,
  });

  if (result.repaired && writeStoryboard) {
    const storyboardPath = path.join(projectDir, "storyboard.json");
    fs.writeFileSync(storyboardPath, JSON.stringify(result.storyboard, null, 2), "utf8");
    console.log(`[Listicle Repair] list_items gerado pela IA (${result.count} itens) → ${path.basename(projectDir)}`);
  } else if (!result.repaired && result.reason === "no_api") {
    console.warn("[Listicle Repair] API key ausente — list_items não reparado.");
  }

  return result;
}