const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;

function stripCodeFence(value) {
  return String(value || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function buildYoutubeEditorialFixPrompt({
  currentTitle = "",
  currentDescription = "",
  narration = "",
} = {}) {
  const realNarration = String(narration || "").trim();
  const firstNarration = realNarration.split(/\s+/).slice(0, 90).join(" ");

  return `Você é um editor sênior de YouTube. Corrija SOMENTE a embalagem editorial de um vídeo já renderizado.

REGRAS:
- Não altere fatos, números ou promessas.
- O título deve corresponder claramente ao que é entregue nos primeiros segundos.
- Para vídeos Shorts (ou telas pequenas): coloque as palavras-chave mais importantes no início do título para que os espectadores em telas pequenas capturem a vibe imediatamente ("put your most important keywords at the start of your title so viewers immediately get the vibe on small screens").
- Não invente conteúdo que não aparece na narração.
- Português brasileiro natural.
- Título com no máximo 100 caracteres.
- Descrição concisa, factual, com contexto e sem promessas falsas.
- Preserve hashtags úteis já existentes, no máximo 5.
- Retorne APENAS JSON válido neste formato:
{"title":"...","description":"...","reason":"..."}

Título atual:
${String(currentTitle || "").trim()}

Descrição atual:
${String(currentDescription || "").trim()}

Abertura real da narração:
${firstNarration}

Narração completa:
${realNarration}`;
}

export function parseYoutubeEditorialFix(value) {
  let parsed = value;
  if (typeof parsed === "string") {
    const cleaned = stripCodeFence(parsed);
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start < 0 || end <= start) {
        throw new Error("IA não retornou o JSON editorial esperado.");
      }
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Resposta editorial da IA inválida.");
  }
  const title = String(parsed.title || "").trim().slice(0, MAX_TITLE_LENGTH);
  const description = String(parsed.description || "")
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH);
  if (!title || !description) {
    throw new Error("IA não retornou título e descrição válidos.");
  }
  return {
    title,
    description,
    reason: String(parsed.reason || "").trim(),
  };
}

export async function resolveYoutubeEditorialWithAi({
  currentTitle = "",
  currentDescription = "",
  narration = "",
  generate,
} = {}) {
  if (typeof generate !== "function") {
    throw new Error("Gerador de IA não configurado.");
  }
  const prompt = buildYoutubeEditorialFixPrompt({
    currentTitle,
    currentDescription,
    narration,
  });
  const response = await generate(prompt);
  return {
    ...parseYoutubeEditorialFix(response),
    prompt,
  };
}
