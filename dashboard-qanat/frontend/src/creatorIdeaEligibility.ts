export type CreatorIdea = Record<string, unknown> & {
  title?: string;
  reality_status?: string;
  evidence_anchor?: string;
  validation_needed?: string;
  script_eligible?: boolean;
};

export type CreatorIdeasData = {
  diagnostic?: unknown;
  ideas: CreatorIdea[];
  best_idea_index: number;
  best_idea_reason?: string;
  rejected_idea_count?: number;
  [key: string]: unknown;
};

const hasNoCriticalValidation = (value: unknown) =>
  /^(nenhuma|nenhum|não há|nao ha|sem)\b/i.test(String(value ?? "").trim());

export function isCreatorIdeaScriptEligible(idea: CreatorIdea): boolean {
  if (!idea || idea.script_eligible === false) return false;

  const realityStatus = String(idea.reality_status ?? "")
    .trim()
    .toLowerCase();
  const evidenceAnchor = String(idea.evidence_anchor ?? "").trim();
  const validationNeeded = String(idea.validation_needed ?? "").trim();

  return (
    ["documented", "current"].includes(realityStatus) &&
    evidenceAnchor.length >= 12 &&
    hasNoCriticalValidation(validationNeeded)
  );
}

export function sanitizeCreatorIdeasData(
  value: unknown
): CreatorIdeasData | null {
  if (!value || typeof value !== "object") return null;

  const data = value as CreatorIdeasData;
  const originalIdeas = Array.isArray(data.ideas) ? data.ideas : [];
  const requestedBestIndex = Number(data.best_idea_index);
  const requestedBestIdea = Number.isInteger(requestedBestIndex)
    ? originalIdeas[requestedBestIndex]
    : undefined;
  const ideas = originalIdeas.filter(isCreatorIdeaScriptEligible);
  const remappedBestIndex = requestedBestIdea
    ? ideas.indexOf(requestedBestIdea)
    : -1;
  const bestIdeaIndex =
    ideas.length === 0 ? -1 : remappedBestIndex >= 0 ? remappedBestIndex : 0;

  return {
    ...data,
    ideas,
    best_idea_index: bestIdeaIndex,
    best_idea_reason:
      remappedBestIndex >= 0
        ? String(data.best_idea_reason ?? "")
        : ideas.length
          ? "Recomendação recalculada entre as ideias com premissa documentada, âncora factual concreta e nenhuma validação crítica pendente."
          : "",
    rejected_idea_count:
      Number(data.rejected_idea_count || 0) +
      (originalIdeas.length - ideas.length),
  };
}
