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
  { expectedCount = 10 } = {}
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "a resposta não é um objeto JSON" };
  }

  if (!value.diagnostic || typeof value.diagnostic !== "object") {
    return { ok: false, reason: "o diagnóstico do nicho está ausente" };
  }

  if (!Array.isArray(value.ideas)) {
    return { ok: false, reason: "o campo ideas está ausente" };
  }

  if (value.ideas.length !== expectedCount) {
    return {
      ok: false,
      reason: `foram recebidas ${value.ideas.length} de ${expectedCount} ideias`,
    };
  }

  const invalidIdeaIndex = value.ideas.findIndex(
    (idea) =>
      !idea ||
      typeof idea !== "object" ||
      !String(idea.title || "").trim()
  );
  if (invalidIdeaIndex >= 0) {
    return {
      ok: false,
      reason: `a ideia ${invalidIdeaIndex + 1} não possui título`,
    };
  }

  const bestIndex = Number(value.best_idea_index);
  if (
    !Number.isInteger(bestIndex) ||
    bestIndex < 0 ||
    bestIndex >= value.ideas.length
  ) {
    return { ok: false, reason: "best_idea_index é inválido" };
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
}) {
  const attemptsLimit = Math.max(1, Math.min(2, Number(maxAttempts) || 2));
  let rejectionReason = "a resposta não pôde ser validada";
  let lastError = null;

  for (let attempt = 1; attempt <= attemptsLimit; attempt += 1) {
    const prompt =
      attempt === 1
        ? basePrompt
        : buildCreatorIdeasRetryPrompt(basePrompt, rejectionReason);
    const responseText = await generate({ attempt, prompt });

    if (responseText == null) {
      return { handledExternally: true, data: null, attempts: attempt };
    }

    try {
      const parsed = await parse(responseText);
      const validation = validateCreatorIdeasPayload(parsed, { expectedCount });
      if (validation.ok) {
        return {
          handledExternally: false,
          data: parsed,
          attempts: attempt,
        };
      }
      rejectionReason = validation.reason;
      lastError = new Error(validation.reason);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      rejectionReason = `o JSON não pôde ser interpretado (${lastError.message})`;
    }
  }

  throw new CreatorIdeasContractError(
    "A IA não entregou as 10 ideias em um formato válido após a repetição automática.",
    {
      attempts: attemptsLimit,
      reason: rejectionReason,
      cause: lastError?.message || "resposta inválida",
    }
  );
}
