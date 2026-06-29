/**
 * Modo Gemini via painel lateral do Chrome (extensão) em vez da API.
 * O backend monta o prompt; o usuário cola a resposta do Gemini no navegador.
 */

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

export function buildBrowserTaskPrompt(title, systemText, userText = "") {
  const parts = [
    `=== ${title} ===`,
    String(systemText || "").trim(),
  ];
  if (userText) {
    parts.push("", "=== ENTRADA ===", String(userText).trim());
  }
  parts.push(
    "",
    "=== SUA RESPOSTA ===",
    "Responda em português brasileiro. Siga exatamente o formato pedido (JSON puro, sem markdown).",
  );
  return parts.join("\n");
}

export function offerGeminiBrowserPayload({ title, prompt }) {
  return {
    needs_browser: true,
    title: title || "Gemini no Chrome",
    prompt,
    instructions: GEMINI_BROWSER_INSTRUCTIONS,
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