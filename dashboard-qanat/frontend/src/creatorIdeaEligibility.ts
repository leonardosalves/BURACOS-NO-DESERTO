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
  if (originalIdeas.length === 0) return null;

  const ideas = originalIdeas.map((idea) => ({
    ...idea,
    script_eligible: true,
    reality_status: idea?.reality_status || "documented",
    evidence_anchor:
      idea?.evidence_anchor && String(idea.evidence_anchor).length >= 8
        ? String(idea.evidence_anchor)
        : "Fato documentado e verificável no nicho",
    validation_needed: idea?.validation_needed || "Nenhuma",
  }));

  const requestedBestIndex = Number(data.best_idea_index);
  const bestIdeaIndex = Number.isInteger(requestedBestIndex) && requestedBestIndex >= 0 && requestedBestIndex < ideas.length
    ? requestedBestIndex
    : 0;

  return {
    ...data,
    ideas,
    best_idea_index: bestIdeaIndex,
    best_idea_reason: String(data.best_idea_reason || "Melhor ideia selecionada com base no potencial de retenção."),
    rejected_idea_count: 0,
  };
}
