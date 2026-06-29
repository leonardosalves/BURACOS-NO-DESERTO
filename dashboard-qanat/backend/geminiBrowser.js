/**
 * Modo Gemini via painel lateral do Chrome (extensão) em vez da API.
 * O backend monta o prompt; o usuário cola a resposta do Gemini no navegador.
 */

import { normalizeMetadataMarkdown } from "./youtubeMetadataOptimizer.js";

export function getGeminiBrowserMode(config) {
  return Boolean(config?.gemini_browser_mode);
}

export function buildBrowserChatPrompt(systemInstruction, messages = []) {
  const history = messages
    .map((msg) => {
      const role = msg.role === "assistant" ? "Assistente" : "Usuário";
      return `${role}:\n${String(msg.content || "").trim()}`;
    })
    .join("\n\n");

  return [
    "=== INSTRUÇÕES DO SISTEMA (Lumiera Agent) ===",
    systemInstruction.trim(),
    "",
    "=== CONVERSA ===",
    history || "(sem mensagens anteriores)",
    "",
    "=== SUA RESPOSTA ===",
    "Responda como o Lumiera Agent, em português brasileiro.",
    "Se precisar executar ações no projeto, inclua o bloco ```lumiera-action no final.",
  ].join("\n");
}

export const GEMINI_BROWSER_INSTRUCTIONS = [
  "A extensão Lumiera Gemini Bridge consulta gemini.google.com automaticamente.",
  "Mantenha-se logado na sua conta Google no Chrome.",
  "Instale em tools/lumiera-gemini-bridge se ainda não tiver carregado a extensão.",
];

export function extractBrowserResponse(body) {
  const text = body?.browser_response;
  if (text == null) return null;
  const trimmed = String(text).trim();
  return trimmed || null;
}

/** Metadados YouTube = markdown/texto (## TÍTULOS, Variante A/B/C, etc.) — não JSON. */
export function looksLikeMetadataResponse(text) {
  const t = String(text || "");
  return /##\s*T[ÍI]TULOS/i.test(t)
    || /##\s*DESCRI[ÇC][ÃA]O/i.test(t)
    || /##\s*HASHTAGS/i.test(t)
    || /##\s*TAGS/i.test(t)
    || /VARIANTE\s+[ABC]/i.test(t)
    || /Variante\s+[ABC]\s*[—–\-]/i.test(t)
    || /THUMBNAILS?\s+A\/B/i.test(t)
    || /COMENT[ÁA]RIO\s+PINADO/i.test(t)
    || /T[íi]tulo\s+pareado/i.test(t)
    || /Texto\s+na\s+capa/i.test(t)
    || (/T[ÍI]TULOS/i.test(t) && /DESCRI[ÇC][ÃA]O/i.test(t));
}

export function looksLikeOverlayJsonResponse(text) {
  const t = String(text || "").trim();
  return /"overlays"\s*:\s*\[/.test(t)
    || (/^\{/.test(t) && /"type"\s*:\s*"(?:lower-third|counter|bar-chart|timeline|kinetic-text|info-card)"/i.test(t));
}

const OVERLAY_ITEM_TYPE_RE = "(?:lower-third|counter|bar-chart|timeline|kinetic-text|info-card)";

function extractBalancedJsonSpan(src, startIdx, openChar, closeChar) {
  if (src[startIdx] !== openChar) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < src.length; i += 1) {
    const ch = src[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return src.slice(startIdx, i + 1);
    }
  }
  return null;
}

/** Extrai JSON de overlays sem lixo trailing (ex.: "Máximo 7 overlays" do prompt). */
export function extractOverlayJsonPayload(text = "") {
  let src = String(text || "").trim();
  if (!src) return null;
  if (src.startsWith("```")) {
    src = src.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/g, "").trim();
  }

  const overlaysKey = src.search(/"overlays"\s*:\s*\[/i);
  if (overlaysKey >= 0) {
    const braceStart = src.lastIndexOf("{", overlaysKey);
    if (braceStart >= 0) {
      const obj = extractBalancedJsonSpan(src, braceStart, "{", "}");
      if (obj) {
        try {
          const parsed = JSON.parse(obj);
          if (parsed && Array.isArray(parsed.overlays)) return obj;
        } catch {
          // tenta fallbacks abaixo
        }
      }
    }
  }

  const typeIdx = src.search(new RegExp(`"type"\\s*:\\s*"${OVERLAY_ITEM_TYPE_RE}"`, "i"));
  if (typeIdx >= 0) {
    const arrStart = src.lastIndexOf("[", typeIdx);
    if (arrStart >= 0) {
      const arr = extractBalancedJsonSpan(src, arrStart, "[", "]");
      if (arr) {
        try {
          const parsed = JSON.parse(arr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return JSON.stringify({ overlays: parsed });
          }
        } catch {
          // ignore
        }
      }
    }
  }

  if (src.startsWith("{")) {
    const obj = extractBalancedJsonSpan(src, 0, "{", "}");
    if (obj) return obj;
  }

  return null;
}

export function createMetadataSessionId() {
  return `meta-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function extractMetadataSessionFromPrompt(prompt) {
  const m = String(prompt || "").match(/LUMIERA_METADATA_SESSION:([a-z0-9-]+)/i);
  return m?.[1] || null;
}

export function looksLikeLumieraPrompt(text) {
  const t = String(text || "");
  return /LUMIERA_TASK:/i.test(t)
    || /PRIORIDADE ABSOLUTA/i.test(t)
    || /--- INÍCIO DO ROTEIRO ---/i.test(t)
    || /--- FIM DO ROTEIRO ---/i.test(t)
    || /FORMATO DE SAÍDA OBRIGATÓRIO/i.test(t)
    || /=== Metadados YouTube ===/i.test(t)
    || /especialista em títulos e SEO para YouTube em PT-BR/i.test(t)
    || /SOBRE O QUE É ESTE VÍDEO \(OBRIGATÓRIO/i.test(t);
}

export function looksLikeMetadataTemplate(text) {
  const t = String(text || "");
  return /\(máx 5 palavras\)/i.test(t)
    || /\(número e texto do título escolhido\)/i.test(t)
    || /\(layout, posição do texto, elemento focal\)/i.test(t)
    || /\(rosto, objeto ou cena de destaque\)/i.test(t);
}

export function hasFilledYoutubeTitles(text) {
  const t = String(text || "");
  if (/\d+\.\s+[^(\n]{8,}\(\d+\s*chars?\)/i.test(t)) return true;
  if (/##\s*T[ÍI]TULOS/i.test(t) && /\d+\.\s+.{15,}/m.test(t)) return true;
  return false;
}

export function isTemplateFieldValue(value = "") {
  const v = String(value || "").trim();
  if (!v || v === "..." || v === "…") return true;
  return /^\([^)]*\)$/i.test(v)
    || /máx 5 palavras/i.test(v)
    || /número e texto do título escolhido/i.test(v)
    || /layout, posição do texto/i.test(v)
    || /rosto, objeto ou cena de destaque/i.test(v);
}

export function hasCompleteMetadataSections(text) {
  const t = normalizeMetadataMarkdown(text);
  const desc = (t.match(/##\s*DESCRI[ÇC][ÃA]O[^\n]*\n([\s\S]*?)(?=\n##\s+|$)/i)?.[1] || "").trim();
  const tags = (t.match(/##\s*TAGS[^\n]*\n([\s\S]*?)(?=\n##\s+|$)/i)?.[1] || "").trim();
  const hashtags = (t.match(/##\s*HASHTAGS[^\n]*\n([\s\S]*?)(?=\n##\s+|$)/i)?.[1] || "").trim();
  const pinned = (t.match(/##\s*COMENT[ÁA]RIO\s+PINADO[^\n]*\n([\s\S]*?)(?=\n##\s+|$)/i)?.[1] || "").trim();
  const hasTitles = hasFilledYoutubeTitles(t);
  const hasDesc = desc.length >= 50;
  const hasTags = tags.length >= 8;
  const hasHashtags = hashtags.length >= 3;
  const hasPinned = pinned.length >= 12;
  if (!hasTitles || !hasDesc) return false;
  return hasTags && (hasPinned || hasHashtags);
}

export function hasRealMetadataContent(text) {
  const t = String(text || "").trim();
  if (t.length < 180) return false;
  if (looksLikeLumieraPrompt(t)) return false;
  if (looksLikeOverlayJsonResponse(t)) return false;
  if (looksLikeMetadataTemplate(t) && !hasFilledYoutubeTitles(t)) return false;
  return hasCompleteMetadataSections(t);
}

export function looksLikeFallbackMetadata(text) {
  const t = String(text || "");
  if (hasFilledYoutubeTitles(t)) return false;
  if (/Variante\s+[ABC]\s*[—–\-]/i.test(t) && !looksLikeMetadataTemplate(t)) return false;
  return /O detalhe que muda tudo nessa história/i.test(t)
    || /O começo que prende até o final/i.test(t)
    || /Usei metadados locais/i.test(t);
}

export function isMetadataBrowserResponseReady(text) {
  if (looksLikeFallbackMetadata(text)) return false;
  return hasRealMetadataContent(text);
}

export function resolveBrowserPromptOpts(title = "", prompt = "") {
  const t = String(title || "").toLowerCase();
  const p = String(prompt || "");
  if (/metadados youtube/i.test(t) || /especialista em títulos e seo/i.test(p)) {
    return { taskType: "metadata", responseFormat: "markdown" };
  }
  if (/planejar overlays/i.test(t) || /"overlays"\s*:\s*\[/i.test(p)) {
    return { taskType: "overlay", responseFormat: "json" };
  }
  return { taskType: "generic", responseFormat: "text" };
}

export function buildBrowserTaskPrompt(title, systemText, userText = "", opts = {}) {
  const resolved = { ...resolveBrowserPromptOpts(title, systemText), ...opts };
  const taskMarker = resolved.taskType ? `LUMIERA_TASK:${resolved.taskType}\n` : "";
  const parts = [
    `=== ${title} ===`,
    `${taskMarker}${String(systemText || "").trim()}`,
  ];
  if (userText) {
    parts.push("", "=== ENTRADA ===", String(userText).trim());
  }
  const footer = resolved.responseFormat === "markdown"
    ? "Responda em português brasileiro. Use exatamente os headers Markdown pedidos no prompt (## TÍTULOS, ## DESCRIÇÃO, etc.)."
    : resolved.responseFormat === "json"
      ? "Responda em português brasileiro. Retorne APENAS JSON válido, sem markdown."
      : "Responda em português brasileiro. Siga exatamente o formato pedido no prompt.";
  parts.push("", "=== SUA RESPOSTA ===", footer);
  return parts.join("\n");
}

export function offerGeminiBrowserPayload({ title, prompt, planSessionId = null, metadataSessionId = null }) {
  return {
    needs_browser: true,
    title: title || "Gemini no Chrome",
    prompt,
    instructions: GEMINI_BROWSER_INSTRUCTIONS,
    plan_session_id: planSessionId || undefined,
    metadata_session_id: metadataSessionId || undefined,
  };
}

export const GEMINI_BROWSER_PENDING = "__GEMINI_BROWSER_PENDING__";

export function buildPromptFromBodyOverride(bodyOverride) {
  const system = bodyOverride?.systemInstruction?.parts?.[0]?.text || "";
  const messages = (bodyOverride?.contents || []).map((c) => ({
    role: c.role === "model" ? "assistant" : "user",
    content: (c.parts || []).map((p) => p.text || "").filter(Boolean).join("\n"),
  }));
  return buildBrowserChatPrompt(system, messages);
}