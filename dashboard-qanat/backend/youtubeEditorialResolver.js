const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;

function stripCodeFence(value) {
  return String(value || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function sanitizeShortsKeywordTitle(rawTitle = "") {
  let title = String(rawTitle || "").trim();
  if (!title) return title;

  const prefixMatch = title.match(/^([A-ZÀ-Ú][A-Za-zÀ-ú\s]{1,20}):\s*(.+)/i);
  if (prefixMatch) {
    const prefix = prefixMatch[1].trim();
    const rest = prefixMatch[2].trim();

    const isLocationOrGenericCategory = /^(china|brasil|eua|japão|japao|rússia|russia|alemanha|frança|franca|itália|italia|índia|india|dubai|inglaterra|uk|canadá|canada|méxico|mexico|espanha|egito|turquia|coréia|coreia|curiosidade|curiosidades|história|historia|geografia|incrivel|incrível|veja|descubra)$/i.test(prefix);

    if (isLocationOrGenericCategory && rest.length >= 5) {
      const lower = prefix.toLowerCase();
      if (new RegExp(`\\b${prefix}\\b`, "i").test(rest)) {
        title = rest;
      } else {
        const cleanRest = rest.replace(/[!?.]$/, "");
        const punct = rest.match(/[!?.]$/)?.[0] || "";

        let prep = "em";
        if (["brasil", "japão", "japao", "canadá", "canada", "méxico", "mexico", "egito"].includes(lower)) {
          prep = "no";
        } else if (["china", "rússia", "russia", "alemanha", "frança", "franca", "itália", "italia", "índia", "india", "inglaterra", "espanha", "turquia", "coréia", "coreia"].includes(lower)) {
          prep = "na";
        } else if (["eua", "uk"].includes(lower)) {
          prep = "nos";
        }

        if (["curiosidade", "curiosidades", "história", "historia", "geografia", "incrivel", "incrível", "veja", "descubra"].includes(lower)) {
          title = rest;
        } else {
          title = `${cleanRest} ${prep} ${prefix}${punct}`;
        }
      }
    }
  }

  return title;
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
- PARA SHORTS / TELAS PEQUENAS (REGRA OBRIGATÓRIA):
  Coloque a PALAVRA-CHAVE DO ASSUNTO PRINCIPAL (ex: "Hotel de 30 andares", "Ponte do Rio X") LOGO NAS PRIMEIRAS PALAVRAS DO TÍTULO.
  PROIBIDO usar prefixos de país ou categoria no início (ex: NUNCA use "China: Hotel...", "Brasil: Ponte...", "Curiosidade: ...").
  Exemplo INCORRETO: "China: Hotel de 30 andares construído em apenas 15 dias!"
  Exemplo CORRETO: "Hotel de 30 andares construído em apenas 15 dias na China"
  ("put your most important keywords at the start of your title so viewers immediately get the vibe on small screens").
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
  const rawTitle = String(parsed.title || "").trim().slice(0, MAX_TITLE_LENGTH);
  const title = sanitizeShortsKeywordTitle(rawTitle);
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
