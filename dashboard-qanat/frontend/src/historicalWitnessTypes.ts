export type HistoricalWitnessBlock = {
  block?: number;
  narration?: string;
  causalRole?: string;
  factBasis?: string;
  visualEvidence?: string;
  visualPrompt?: string;
  negativePrompt?: string;
  durationSeconds?: number;
};

export type HistoricalWitnessBlueprint = {
  title?: string;
  hook?: string;
  promise?: string;
  characterLock?: string;
  voiceDirection?: string;
  globalNegativePrompt?: string;
  historicalFrame?: Record<string, string>;
  blocks?: HistoricalWitnessBlock[];
};

export type HistoricalWitnessIdea = {
  title: string;
  event: string;
  period: string;
  location: string;
  hiddenTruth: string;
  popularBelief?: string;
  characterView: string;
  hook: string;
  certainty?: string;
  whyItMatters?: string;
  reality_status?: string;
  evidence_anchor?: string;
  saturation_level?: string;
  saturation_evidence?: string;
  undercovered_reason?: string;
  format_fit?: string;
  recommended_duration?: string;
  premium_upgrade?: string;
  validation_needed?: string;
};

export type HistoricalWitnessCharacter = {
  id: string;
  label: string;
  hint: string;
  description: string;
  custom?: boolean;
};

export type HistoricalWitnessContext = {
  contentMode: "HISTORICAL_WITNESS";
  niche: string;
  format: "LONGO" | "SHORTS";
  character: HistoricalWitnessCharacter;
  idea: HistoricalWitnessIdea;
  blueprint: HistoricalWitnessBlueprint;
  appliedAt: string;
};
