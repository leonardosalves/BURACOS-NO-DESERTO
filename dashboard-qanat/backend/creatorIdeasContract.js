export function validateCreatorExpressInput(value = {}) {
  const theme = String(value.theme || "").trim();
  const niche = String(value.niche || "").trim();
  const project = String(value.project || "").trim();
  const tone =
    String(value.tone || "conversacional").trim() || "conversacional";

  if (!theme || !niche || !project) {
    return {
      ok: false,
      error: "Tema, nicho e nome do projeto são obrigatórios.",
    };
  }

  const safeProjectName = project.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (!/[a-zA-Z0-9]/.test(safeProjectName)) {
    return {
      ok: false,
      error: "O nome do projeto deve conter pelo menos uma letra ou número.",
    };
  }
  if (safeProjectName.length > 80) {
    return {
      ok: false,
      error: "O nome do projeto deve ter no máximo 80 caracteres.",
    };
  }

  return {
    ok: true,
    value: { theme, niche, project: safeProjectName, tone },
  };
}

export function validateCreatorExpressPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "a resposta não é um objeto JSON" };
  }

  const narrativeScript = String(value.narrative_script || "").trim();
  if (narrativeScript.length < 20) {
    return {
      ok: false,
      reason: "a IA não retornou uma narração válida",
    };
  }

  return { ok: true, reason: "" };
}

export class CreatorIdeasContractError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CreatorIdeasContractError";
    this.code = "CREATOR_IDEAS_INVALID_RESPONSE";
    this.details = details;
  }
}

export function validateCreatorIdeasPayload(
  value,
  { expectedCount = 10, minCount = null } = {}
) {
  const minimum = minCount ?? Math.max(5, Math.ceil(expectedCount * 0.7));

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "a resposta não é um objeto JSON" };
  }

  if (!value.diagnostic || typeof value.diagnostic !== "object") {
    if (Array.isArray(value.ideas) && value.ideas.length >= minimum) {
      value.diagnostic = {
        title_style: "",
        core_emotion: "",
        retention_topics: "",
      };
    } else {
      return { ok: false, reason: "o diagnóstico do nicho está ausente" };
    }
  }

  if (!Array.isArray(value.ideas)) {
    return { ok: false, reason: "o campo ideas está ausente" };
  }

  if (value.ideas.length < minimum) {
    return {
      ok: false,
      reason: `foram recebidas ${value.ideas.length} de ${expectedCount} ideias (mínimo ${minimum})`,
    };
  }

  const invalidIdeaIndex = value.ideas.findIndex(
    (idea) =>
      !idea || typeof idea !== "object" || !String(idea.title || "").trim()
  );
  if (invalidIdeaIndex >= 0) {
    value.ideas = value.ideas.filter(
      (idea) =>
        idea && typeof idea === "object" && String(idea.title || "").trim()
    );
    if (value.ideas.length < minimum) {
      return {
        ok: false,
        reason: `apenas ${value.ideas.length} ideias válidas com título (mínimo ${minimum})`,
      };
    }
  }

  const bestIndex = Number(value.best_idea_index);
  if (
    !Number.isInteger(bestIndex) ||
    bestIndex < 0 ||
    bestIndex >= value.ideas.length
  ) {
    value.best_idea_index = 0;
    if (!value.best_idea_reason) value.best_idea_reason = "";
  }

  return { ok: true, reason: "" };
}

export function buildCreatorIdeasRetryPrompt(basePrompt, reason) {
  return `${basePrompt}

CORREÇÃO OBRIGATÓRIA DA RESPOSTA ANTERIOR:
- A tentativa anterior foi rejeitada porque ${reason}.
- Gere novamente o objeto completo, desde o início.
- Retorne exatamente 10 itens no array "ideas".
- Inclua "diagnostic", "best_idea_index" e "best_idea_reason".
- Retorne somente JSON válido, sem markdown, raciocínio ou texto adicional.`;
}

export async function generateCreatorIdeasWithSingleRetry({
  basePrompt,
  generate,
  parse,
  expectedCount = 10,
  maxAttempts = 2,
  niche = "Geral",
  format = "SHORTS",
}) {
  const attemptsLimit = Math.max(1, Number(maxAttempts) || 2);
  let rejectionReason = "a resposta não pôde ser validada";

  for (let attempt = 1; attempt <= attemptsLimit; attempt += 1) {
    try {
      const prompt =
        attempt === 1
          ? basePrompt
          : buildCreatorIdeasRetryPrompt(basePrompt, rejectionReason);
      const responseText = await generate({ attempt, prompt });

      if (responseText == null) {
        return { handledExternally: true, data: null, attempts: attempt };
      }

      const parsed = await parse(responseText);
      const validation = validateCreatorIdeasPayload(parsed, { expectedCount });
      if (validation.ok) {
        return { handledExternally: false, data: parsed, attempts: attempt };
      }
      rejectionReason = validation.reason;
      console.warn(
        `[IdeasContract] Tentativa ${attempt}/${attemptsLimit} rejeitada: ${rejectionReason}` +
          (parsed?.ideas ? ` (recebidas: ${parsed.ideas.length} ideias)` : "")
      );
    } catch (error) {
      const lastError =
        error instanceof Error ? error : new Error(String(error));
      rejectionReason = `o JSON não pôde ser interpretado (${lastError.message})`;
      console.warn(
        `[IdeasContract] Tentativa ${attempt}/${attemptsLimit} erro: ${lastError.message}`
      );
    }
  }

  throw new CreatorIdeasContractError(
    `Resposta de ideias inválida após ${attemptsLimit} tentativas: ${rejectionReason}`,
    { attempts: attemptsLimit, reason: rejectionReason }
  );
}
