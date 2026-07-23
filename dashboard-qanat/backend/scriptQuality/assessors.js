/** Deterministic gates and advisory readiness checkers. */

export function assessEditorialContract({
  format = "LONGO",
  narrativeScript = "",
  strategy = {},
} = {}) {
  const script = String(narrativeScript || "").trim();
  const words = script ? script.split(/\s+/).filter(Boolean) : [];
  const sentences = script
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const hook = String(strategy?.hook || sentences[0] || "").trim();
  const thesis = String(
    strategy?.thesis || strategy?.promise || strategy?.title_main || ""
  ).trim();
  const ending = sentences.at(-1) || "";
  const issues = [];
  const recommendations = [];
  const isShort = format === "SHORTS" || format === "SHORT";
  const opening = (sentences[0] || hook).toLocaleLowerCase("pt-BR");
  const ctaPattern =
    /\b(inscrev|segue|acompanhe|comenta|deixe.*coment|salve|compartilh|veja o pr[oó]ximo)\b/i;
  const ctaSentenceIndexes = sentences
    .map((sentence, index) => (ctaPattern.test(sentence) ? index : -1))
    .filter((index) => index >= 0);
  const longestSentenceWords = sentences.reduce(
    (longest, sentence) =>
      Math.max(longest, sentence.split(/\s+/).filter(Boolean).length),
    0
  );
  const hasExplanationBridge =
    /\b(porque|por isso|ou seja|na pr[aá]tica|isso significa|o resultado|assim)\b/i.test(
      script
    );
  const hasPayoffLanguage =
    /\b(segredo|resultado|resposta|por isso|ent[aã]o|significa|conclus[aã]o|li[cç][aã]o)\b/i.test(
      ending
    );

  if (!thesis) issues.push("Sem tese ou promessa editorial identificável.");
  if (!hook) issues.push("Sem gancho verbal identificável.");
  if (
    /^(oi|ol[aá]|fala[,! ]|seja bem-vindo|bem-vindos|hoje eu vou)/i.test(
      opening
    )
  ) {
    issues.push("A abertura deve entregar a promessa, sem saudação genérica.");
  }
  if (hook.split(/\s+/).filter(Boolean).length > (isShort ? 12 : 28)) {
    issues.push("Gancho longo demais para a abertura.");
  }
  if (isShort) {
    if (words.length < 70 || words.length > 145) {
      issues.push("Short fora da faixa editorial de 70–145 palavras.");
    }
    // 4 frases bem formadas bastam para um short denso; 3 ou menos costuma
    // faltar gancho + desenvolvimento + payoff.
    if (sentences.length < 4) {
      issues.push(
        "Short sem desenvolvimento suficiente entre gancho e payoff (mínimo 4 frases)."
      );
    }
    if (!hasExplanationBridge) {
      recommendations.push(
        "Inclua uma ponte simples de causa e consequência para o payoff ficar claro."
      );
    }
    if (
      ctaSentenceIndexes.length > 0 &&
      ctaSentenceIndexes[0] < Math.max(1, sentences.length - 2)
    ) {
      recommendations.push(
        "Deixe o CTA do Short depois do payoff para não interromper a entrega principal."
      );
    }
  } else {
    if (words.length < 900) {
      issues.push("Vídeo longo ainda não tem desenvolvimento suficiente.");
    }
    if (sentences.length < 18) {
      issues.push("Vídeo longo precisa de mais progressão por capítulos.");
    }
    if (!hasExplanationBridge) {
      recommendations.push(
        "Adicione conexões explícitas entre fato, causa e consequência para a narração não ficar confusa."
      );
    }
    if (ctaSentenceIndexes.length === 0) {
      recommendations.push(
        "Inclua um CTA contextualizado depois da primeira entrega de valor, sem depender apenas do final."
      );
    } else if (
      ctaSentenceIndexes.every(
        (index) => index > Math.floor(sentences.length * 0.8)
      )
    ) {
      recommendations.push(
        "Antecipe um CTA leve para o meio do vídeo; mantenha o CTA final como fechamento."
      );
    }
  }
  if (
    !ending ||
    /^(comenta|o que achou|se inscreva|deixa.*coment)/i.test(ending)
  ) {
    issues.push("Final sem payoff declarativo ou CTA contextualizado.");
  }
  if (!hasPayoffLanguage && ending) {
    recommendations.push(
      "Feche retomando a resposta ou consequência central antes de convidar o espectador para a próxima ação."
    );
  }
  if (longestSentenceWords > (isShort ? 28 : 38)) {
    recommendations.push(
      "Quebre as frases mais longas para dar respiração à voz e facilitar a compreensão."
    );
  }

  return {
    ok: issues.length === 0,
    score: Math.max(0, 100 - issues.length * 20),
    format: isShort ? "SHORTS" : "LONGO",
    wordCount: words.length,
    sentenceCount: sentences.length,
    hook,
    thesis,
    ending,
    checks: {
      promise: Boolean(thesis),
      directOpening:
        Boolean(hook) &&
        !/^(oi|ol[aá]|fala[,! ]|seja bem-vindo|bem-vindos|hoje eu vou)/i.test(
          opening
        ),
      explanationBridge: hasExplanationBridge,
      payoff: hasPayoffLanguage,
      contextualCta: ctaSentenceIndexes.length > 0,
      ctaPlacement: ctaSentenceIndexes.length
        ? ctaSentenceIndexes.map((index) =>
            Math.round(((index + 1) / sentences.length) * 100)
          )
        : [],
      longestSentenceWords,
    },
    issues,
    recommendations,
  };
}

/**
 * Checks whether the narration is comfortable to listen to and synthesize.
 * It is advisory: a creator keeps control and can approve a deliberate style.
 */
export function assessNarrationReadiness({
  format = "LONGO",
  narrativeScript = "",
} = {}) {
  const script = String(narrativeScript || "").trim();
  const sentences = script
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const wordsBySentence = sentences.map(
    (sentence) => sentence.split(/\s+/).filter(Boolean).length
  );
  const isShort = format === "SHORTS" || format === "SHORT";
  const targetMax = isShort ? 24 : 32;
  const longSentences = wordsBySentence.filter((count) => count > targetMax);
  const acronyms = [
    ...new Set(script.match(/\b[A-Z]{2,}(?:-[A-Z]{2,})?\b/g) || []),
  ];
  const numbers = script.match(/\b\d{4,}\b/g) || [];
  const starters = sentences
    .map((sentence) =>
      sentence
        .replace(/^['"“”]/, "")
        .split(/\s+/)[0]
        ?.toLocaleLowerCase("pt-BR")
    )
    .filter(Boolean);
  const repeatedStarters = [
    ...new Set(
      starters.filter((starter, index) => starters.indexOf(starter) !== index)
    ),
  ];
  const inflatedAbstractions =
    script.match(
      /\b(?:transform(?:a|ou|aram|ado|ada)[^.!?]{0,70}\bem\s+(?:uma?\s+)?[^.!?]{0,45}\b(?:brutal|implac[aá]vel|devastador[ae]?|revolucion[aá]ri[oa])|engenharia\s+de\s+defesa\s+brutal)\b/gi
    ) || [];
  const recommendations = [];

  if (longSentences.length) {
    recommendations.push(
      `${longSentences.length} frase(s) acima de ${targetMax} palavras: quebre para a voz respirar.`
    );
  }
  if (acronyms.length) {
    recommendations.push(
      `Revise a leitura de siglas: ${acronyms.slice(0, 4).join(", ")}.`
    );
  }
  if (numbers.length >= (isShort ? 2 : 5)) {
    recommendations.push(
      "Há muitos números no texto; escreva por extenso os que precisam ser compreendidos ao ouvir."
    );
  }
  if (repeatedStarters.length) {
    recommendations.push(
      `Varie o início das frases para evitar cadência mecânica (${repeatedStarters.slice(0, 3).join(", ")}).`
    );
  }
  if (inflatedAbstractions.length) {
    recommendations.push(
      "Troque abstrações dramáticas por causa e consequência concretas; explique o que aconteceu em vez de rotular o fato como brutal ou revolucionário."
    );
  }

  const averageWordsPerSentence = wordsBySentence.length
    ? Math.round(
        (wordsBySentence.reduce((sum, count) => sum + count, 0) /
          wordsBySentence.length) *
          10
      ) / 10
    : 0;
  return {
    ok: Boolean(script) && inflatedAbstractions.length === 0,
    format: isShort ? "SHORTS" : "LONGO",
    sentenceCount: sentences.length,
    averageWordsPerSentence,
    longSentenceCount: longSentences.length,
    acronyms,
    numberCount: numbers.length,
    inflatedAbstractionCount: inflatedAbstractions.length,
    inflatedAbstractions,
    recommendations,
  };
}

const ASSERTIVE_CAUSAL_PATTERN =
  /\b(influenci(?:ar|a|am|ou|aram|ado|ados|ada|adas)|inspir(?:ar|a|am|ou|aram|ado|ados|ada|adas)|imit(?:ar|a|am|ou|aram|ado|ados|ada|adas)|copi(?:ar|a|am|ou|aram|ado|ados|ada|adas)|replic(?:ar|a|am|ou|aram|ado|ados|ada|adas)|adot(?:ar|a|am|ou|aram|ado|ados|ada|adas)|aplic(?:ar|a|am|ou|aram|ado|ados|ada|adas)|prov(?:ar|a|am|ou|aram|ado|ados|ada|adas)|comprov(?:ar|a|am|ou|aram|ado|ados|ada|adas)|demonstr(?:ar|a|am|ou|aram|ado|ados|ada|adas)|garant(?:ir|e|em|iu|iram|ido|idos|ida|idas)|fornec(?:er|e|em|eu|eram|ido|idos|ida|idas) (?:o |um )?(?:modelo|projeto|gabarito)|deu origem|deram origem|lev(?:ar|a|am|ou|aram) (?:os|as|ao|à)|graças a)\b/i;
const UNCERTAINTY_PATTERN =
  /\b(pode ter|talvez|é possível|hipótese|não há evidência|não foi comprovad|não significa que|sem prova de|analogia|semelhança)\b/i;
const VALIDATION_PENDING_PATTERN =
  /\b(confirmar|verificar|identificar|provar|comprovar|validar|investigar|fontes? acadêmicas?|evidência direta)\b/i;
const PSYCHOLOGICAL_INTENT_PATTERN =
  /\b(design sensorial|afeta (?:o )?cérebro|bloqueia (?:a )?visão lateral|anul(?:a|ando|ou) (?:a )?percepção|perda de referência espacial|caus(?:a|ava|ou) desorientação|profunda reverência|control(?:a|ava|ou) fisicamente (?:a )?percepção|projetad[oa]s? para (?:desorientar|intimidar|causar medo|provocar reverência|controlar))\b/i;
const SENSATIONAL_NEURO_PATTERN =
  /\b(?:mente|cérebro)\s+(?:seria\s+)?["“”']?hacke(?:ad[oa]|ar)|hacke(?:ar|ad[oa])\s+(?:a\s+)?(?:mente|cérebro)\b/i;
const VAGUE_STUDY_ATTRIBUTION_PATTERN =
  /\b(?:estudos?|pesquisas?|especialistas?)\s+(?:de|da|do|sobre|em)?[^.!?]{0,80}\b(?:sugerem|mostram|comprovam|demonstram|indicam|revelam)\b/i;
const DRAMATIC_TERMINAL_CLAIM_PATTERN =
  /\b(picadas?\s+(?:mortais|letais)|mortais|letais|fatais|mortal|letal|fatal|aniquil(?:ou|aram|ado|ada)|dizim(?:ou|aram|ado|ada)|massacr(?:ou|aram|ado|ada)|impedi(?:u|ram)\s+invas(?:ão|ões)\s+inteiras?|interrompe(?:u|ram)\s+invas(?:ão|ões)\s+inteiras?)\b/i;
const LETHAL_EVIDENCE_PATTERN =
  /\b(mortal|mortais|letal|letais|fatal|fatais|morte|mortes|matou|mataram|causou a morte)\b/i;
const TOTAL_DEFEAT_EVIDENCE_PATTERN =
  /\b(aniquil|dizim|massacr|impedi(?:u|ram)[^.!?]{0,30}invas|interrompe(?:u|ram)[^.!?]{0,30}invas)/i;

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function textOfFact(fact) {
  if (typeof fact === "string") return fact;
  if (!fact || typeof fact !== "object") return "";
  const base = String(
    fact.claim || fact.afirmacao || fact.fact || fact.text || fact.summary || ""
  ).trim();
  const url = String(fact.url || fact.source_url || "").trim();
  const sourceLabel = String(fact.source || fact.title || "").trim();
  if (url && !base.toLowerCase().includes(url.toLowerCase())) {
    return [base, sourceLabel ? `fonte: ${sourceLabel}` : "", `fonte: ${url}`]
      .filter(Boolean)
      .join(" — ")
      .trim();
  }
  if (
    sourceLabel &&
    !/https?:\/\//i.test(base) &&
    !base.toLowerCase().includes(sourceLabel.toLowerCase())
  ) {
    return [base, `fonte: ${sourceLabel}`].filter(Boolean).join(" — ").trim();
  }
  return base;
}

/**
 * Portão factual executável do NARRACAOPRO.
 * Não confia nas notas que a própria IA atribui a si mesma.
 */
export function assessNarracaoProIntegrity({
  format = "LONGO",
  narrativeScript = "",
  idea = {},
  trace = {},
  researchFacts = [],
  researchSources = [],
} = {}) {
  const script = String(narrativeScript || "").trim();
  const isShort = format === "SHORTS" || format === "SHORT";
  const issues = [];
  const warnings = [];
  const selectedFacts = asList(trace?.etapa_5_fatos_selecionados);
  const entities = asList(trace?.etapa_3_entidades).filter(
    (item) => item && typeof item === "object"
  );
  const traceResearch = asList(trace?.etapa_2_pesquisa);
  const externalResearchFacts = asList(researchFacts)
    .map(textOfFact)
    .filter((item) => item.length >= 12);
  const usableResearchFacts = [
    ...externalResearchFacts,
    ...traceResearch.map(textOfFact),
  ].filter((item) => item.length >= 12);
  const externalSourceCount = asList(researchSources).filter(
    (source) =>
      source &&
      (String(source.url || "").trim() || String(source.title || "").trim())
  ).length;
  const sourceCount =
    externalSourceCount +
    traceResearch.filter((item) =>
      /https?:\/\/|\bdoi\s*:?|\bfonte:\s*\S{4,}/i.test(textOfFact(item))
    ).length;
  const realityStatus = String(idea?.reality_status || "").toLowerCase();
  const validationNeeded = String(idea?.validation_needed || "").trim();
  const premise = [
    idea?.title,
    idea?.promise,
    idea?.hooks,
    idea?.evidence_anchor,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" ");
  const assertsCausality =
    ASSERTIVE_CAUSAL_PATTERN.test(script) ||
    ASSERTIVE_CAUSAL_PATTERN.test(premise);
  const assertsPsychologicalIntent = PSYCHOLOGICAL_INTENT_PATTERN.test(script);
  const usesSensationalNeuroscience = SENSATIONAL_NEURO_PATTERN.test(script);
  const usesVagueStudyAttribution =
    VAGUE_STUDY_ATTRIBUTION_PATTERN.test(script);
  const qualifiesUncertainty = UNCERTAINTY_PATTERN.test(script);
  const pendingCriticalValidation =
    validationNeeded &&
    !/^(nenhuma|nenhum|não há)\b/i.test(validationNeeded) &&
    VALIDATION_PENDING_PATTERN.test(validationNeeded);
  const ending =
    script
      .split(/(?<=[.!?…])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .at(-1) || "";
  const dramaticTerminalClaim =
    ending.match(DRAMATIC_TERMINAL_CLAIM_PATTERN)?.[0] || "";
  const evidenceCorpus = usableResearchFacts.join(" ");
  const dramaticClaimSupported = !dramaticTerminalClaim
    ? true
    : LETHAL_EVIDENCE_PATTERN.test(dramaticTerminalClaim)
      ? LETHAL_EVIDENCE_PATTERN.test(evidenceCorpus)
      : TOTAL_DEFEAT_EVIDENCE_PATTERN.test(evidenceCorpus);

  if (!script) issues.push("Narração vazia.");
  if (assertsCausality && pendingCriticalValidation && !qualifiesUncertainty) {
    issues.push(
      "A narração afirma uma relação causal que a própria ideia marcou como ainda não comprovada."
    );
  }
  if (
    assertsCausality &&
    ["plausible", "disputed"].includes(realityStatus) &&
    !qualifiesUncertainty
  ) {
    issues.push(
      `A ideia tem status "${realityStatus}", mas a narração apresenta a hipótese como fato.`
    );
  }
  if (assertsCausality && usableResearchFacts.length === 0) {
    issues.push(
      "Relação histórica de causa ou influência sem fato de pesquisa verificável."
    );
  }
  if (assertsCausality && sourceCount === 0) {
    issues.push(
      "Relação histórica de causa ou influência sem fonte identificável."
    );
  }
  if (usesSensationalNeuroscience && !qualifiesUncertainty) {
    issues.push(
      'Linguagem neuropsicológica sensacionalista ("hackear a mente/cérebro") apresentada como explicação factual.'
    );
  }
  if (
    assertsPsychologicalIntent &&
    !qualifiesUncertainty &&
    (externalResearchFacts.length === 0 || externalSourceCount === 0)
  ) {
    issues.push(
      "Intenção psicológica atribuída à arquitetura sem pesquisa externa e fonte identificável."
    );
  }
  if (usesVagueStudyAttribution && externalSourceCount === 0) {
    issues.push(
      'A narração usa atribuição vaga como "estudos sugerem" sem estudo identificável nos dados de pesquisa.'
    );
  }
  if (dramaticTerminalClaim && !dramaticClaimSupported) {
    issues.push(
      `Fechamento sensacionalista sem apoio explícito na pesquisa: "${dramaticTerminalClaim}". Descreva a consequência documentada sem inflar o resultado.`
    );
  }
  if (isShort && selectedFacts.length > 3) {
    warnings.push(
      `Short selecionou ${selectedFacts.length} fatos centrais; o recomendado é no máximo 3.`
    );
  }
  if (isShort && entities.length > 3) {
    warnings.push(
      `Short mistura ${entities.length} entidades; recomenda-se reduzir para uma tese e no máximo três entidades indispensáveis.`
    );
  }
  if (
    trace?.etapa_10_validacao_factual?.fusao_detectada === true ||
    trace?.etapa_10_validacao_factual?.teste_identidade_passou === false
  ) {
    issues.push("O próprio trace detectou fusão ou falha de identidade.");
  }
  if (
    trace?.etapa_11_validacao_narracao?.portoes_15_resultado &&
    !/todos passaram|aprovad/i.test(
      String(trace.etapa_11_validacao_narracao.portoes_15_resultado)
    )
  ) {
    issues.push("O trace informa que os portões editoriais não passaram.");
  }
  if (!trace || Object.keys(trace).length === 0) {
    issues.push(
      "A IA não entregou o trace NARRACAOPRO; a narração não pode ser aprovada."
    );
  }

  const requiredTraceFields = [
    "etapa_1_recorte",
    "etapa_2_pesquisa",
    "etapa_3_entidades",
    "etapa_4_tese",
    "etapa_5_fatos_selecionados",
    "etapa_6_cadeia_causal",
    "etapa_10_validacao_factual",
    "etapa_11_validacao_narracao",
    "etapa_12_validacao_entrega",
  ];
  const missingTraceFields = requiredTraceFields.filter(
    (field) =>
      trace?.[field] === null ||
      trace?.[field] === undefined ||
      trace?.[field] === "" ||
      (Array.isArray(trace?.[field]) && trace[field].length === 0)
  );
  if (missingTraceFields.length) {
    issues.push(
      `Trace NARRACAOPRO incompleto: ${missingTraceFields.join(", ")}.`
    );
  }

  return {
    ok: issues.length === 0,
    format: isShort ? "SHORTS" : "LONGO",
    issues,
    warnings,
    evidence: {
      researchFactCount: usableResearchFacts.length,
      sourceCount,
      externalResearchFactCount: externalResearchFacts.length,
      externalSourceCount,
      selectedFactCount: selectedFacts.length,
      entityCount: entities.length,
      assertsCausality,
      assertsPsychologicalIntent,
      usesSensationalNeuroscience,
      usesVagueStudyAttribution,
      pendingCriticalValidation,
      dramaticTerminalClaim: dramaticTerminalClaim || null,
      dramaticClaimSupported,
      realityStatus: realityStatus || "unknown",
      missingTraceFields,
    },
  };
}

/** Flags missing, repetitive, or weak visual coverage before assets are generated. */
export function assessVisualStoryboardReadiness({
  format = "LONGO",
  visualPrompts = [],
} = {}) {
  const scenes = Array.isArray(visualPrompts) ? visualPrompts : [];
  const isShort = format === "SHORTS" || format === "SHORT";
  const issues = [];
  const recommendations = [];
  const usefulScenes = scenes.filter((scene) =>
    String(
      scene?.prompt || scene?.visual_description || scene?.stock_query || ""
    ).trim()
  );
  const missingNarration = scenes.filter(
    (scene) =>
      !String(
        scene?.narration_text || scene?.asset?.narration_segment || ""
      ).trim()
  );
  const visualKeys = usefulScenes.map((scene) =>
    String(scene.prompt || scene.visual_description || scene.stock_query || "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 8)
      .join(" ")
  );
  const duplicateVisuals = [
    ...new Set(
      visualKeys.filter(
        (key, index) => key && visualKeys.indexOf(key) !== index
      )
    ),
  ];
  const longScenes = scenes.filter((scene) => {
    const duration = Number(scene?.duration_seconds ?? scene?.duration ?? 0);
    return Number.isFinite(duration) && duration > (isShort ? 6 : 15);
  });
  const firstVisual = String(
    scenes[0]?.prompt ||
      scenes[0]?.visual_description ||
      scenes[0]?.stock_query ||
      scenes[0]?.asset?.asset ||
      ""
  ).toLocaleLowerCase("pt-BR");

  if (!scenes.length) issues.push("Storyboard sem cenas visuais.");
  if (usefulScenes.length !== scenes.length)
    issues.push("Há cenas sem instrução visual utilizável.");
  if (missingNarration.length)
    issues.push(
      `${missingNarration.length} cena(s) sem trecho de narração associado.`
    );
  if (firstVisual.includes("logo") || firstVisual.includes("placeholder")) {
    issues.push(
      "O gancho visual começa com logo ou placeholder, em vez da imagem mais forte."
    );
  }
  if (duplicateVisuals.length) {
    recommendations.push(
      `${duplicateVisuals.length} orientação(ões) visuais repetida(s): varie enquadramento, ação ou tipo de imagem.`
    );
  }
  if (longScenes.length) {
    recommendations.push(
      `${longScenes.length} cena(s) longa(s) para ${isShort ? "Shorts" : "vídeo longo"}: crie uma mudança visual ou interruptor de padrão.`
    );
  }
  const minimumScenes = isShort ? 3 : 6;
  if (scenes.length > 0 && scenes.length < minimumScenes) {
    recommendations.push(
      `${isShort ? "Short" : "Vídeo longo"} tem poucas cenas planejadas; considere ao menos ${minimumScenes} para manter ritmo.`
    );
  }
  const modes = new Set(
    scenes
      .map((scene) =>
        String(scene?.media_mode || scene?.asset?.type || "").trim()
      )
      .filter(Boolean)
  );
  if (scenes.length >= 4 && modes.size <= 1) {
    recommendations.push(
      "Planeje variedade de linguagem visual (vídeo, foto, motion, mapa ou gráfico) para reduzir efeito slideshow."
    );
  }

  return {
    ok: issues.length === 0,
    format: isShort ? "SHORTS" : "LONGO",
    sceneCount: scenes.length,
    coveredScenes: usefulScenes.length,
    missingNarrationCount: missingNarration.length,
    duplicateVisualCount: duplicateVisuals.length,
    longSceneCount: longScenes.length,
    issues,
    recommendations,
  };
}

function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function uniqueMessages(messages) {
  return [...new Set(messages.map((message) => String(message || "").trim()).filter(Boolean))];
}

function scoreNarrationReadiness(narration) {
  const sentencePenalty = narration.longSentenceCount * 12;
  const acronymPenalty = Math.min(12, narration.acronyms.length * 3);
  const numberPenalty = Math.min(15, Math.max(0, narration.numberCount - 2) * 3);
  const densityPenalty =
    narration.averageWordsPerSentence > 26
      ? Math.min(20, (narration.averageWordsPerSentence - 26) * 2)
      : 0;
  const abstractionPenalty = Math.min(
    30,
    Number(narration.inflatedAbstractionCount || 0) * 20
  );
  return clampScore(
    100 -
      sentencePenalty -
      acronymPenalty -
      numberPenalty -
      densityPenalty -
      abstractionPenalty
  );
}

const RETENTION_STOPWORDS = new Set([
  "a",
  "agora",
  "ai",
  "ao",
  "aos",
  "as",
  "ate",
  "com",
  "como",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "ela",
  "ele",
  "em",
  "era",
  "essa",
  "esse",
  "esta",
  "este",
  "eu",
  "isso",
  "mas",
  "na",
  "nas",
  "nao",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "por",
  "porque",
  "que",
  "se",
  "sem",
  "um",
  "uma",
  "vai",
  "voce",
]);

const RETENTION_THRESHOLDS = {
  SHORTS: {
    openingSentences: 1,
    promiseWindowSentences: 3,
    hookMinConcreteWords: 4,
    minWords: 70,
    maxWords: 145,
    minSentences: 4,
    maxAverageWordsPerSentence: 22,
    maxLongSentenceWords: 28,
    repeatedStarterLimit: 2,
    repeatedPhraseLimit: 2,
    payoffWindowSentences: 2,
  },
  LONGO: {
    openingSentences: 3,
    promiseWindowSentences: 5,
    hookMinConcreteWords: 7,
    minWords: 900,
    maxWords: 4500,
    minSentences: 18,
    maxAverageWordsPerSentence: 28,
    maxLongSentenceWords: 38,
    repeatedStarterLimit: 4,
    repeatedPhraseLimit: 4,
    payoffWindowSentences: 3,
  },
};

function normalizeRetentionText(text) {
  return String(text || "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function retentionWords(text) {
  return normalizeRetentionText(text).split(/\s+/).filter(Boolean);
}

function concreteRetentionWords(text) {
  return retentionWords(text).filter(
    (word) => word.length > 3 && !RETENTION_STOPWORDS.has(word)
  );
}

function countSharedWords(source, target) {
  const sourceWords = new Set(concreteRetentionWords(source));
  if (!sourceWords.size) return 0;
  return concreteRetentionWords(target).filter((word) => sourceWords.has(word)).length;
}

function repeatedSentenceStarters(sentences, limit) {
  const counts = new Map();
  sentences.forEach((sentence) => {
    const starter = retentionWords(sentence)
      .filter((word) => !RETENTION_STOPWORDS.has(word))
      .slice(0, 2)
      .join(" ");
    if (starter) counts.set(starter, (counts.get(starter) || 0) + 1);
  });
  return [...counts.entries()]
    .filter(([, count]) => count > limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

function repeatedContentPhrases(words, limit) {
  const counts = new Map();
  for (let index = 0; index <= words.length - 3; index += 1) {
    const phraseWords = words.slice(index, index + 3);
    if (phraseWords.filter((word) => !RETENTION_STOPWORDS.has(word)).length < 2) {
      continue;
    }
    const phrase = phraseWords.join(" ");
    counts.set(phrase, (counts.get(phrase) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > limit)
    .map(([phrase, count]) => ({ phrase, count }))
    .slice(0, 5);
}

function assessDeterministicRetention({
  format = "LONGO",
  narrativeScript = "",
  strategy = {},
  editorial = {},
  narration = {},
} = {}) {
  const script = String(narrativeScript || "").trim();
  const sentences = script
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const words = script ? script.split(/\s+/).filter(Boolean) : [];
  const isShort = format === "SHORTS" || format === "SHORT";
  const normalizedFormat = isShort ? "SHORTS" : "LONGO";
  const thresholds = RETENTION_THRESHOLDS[normalizedFormat];
  const issues = [];
  const recommendations = [];
  const diagnostics = [];
  const opening = sentences.slice(0, thresholds.openingSentences).join(" ");
  const earlyWindow = sentences.slice(0, thresholds.promiseWindowSentences).join(" ");
  const payoffWindow = sentences.slice(-thresholds.payoffWindowSentences).join(" ");
  const ending = sentences.at(-1) || "";
  const declaredPromise = String(
    strategy?.promise || strategy?.thesis || strategy?.title_main || ""
  ).trim();
  const concreteHookWords = concreteRetentionWords(opening);
  const hasCuriosityGap =
    /\b(por que|como|segredo|mist[eé]rio|ningu[eé]m|parece|mas|s[oó] que|at[eé] que)\b/i.test(
      opening
    ) || /[?]/.test(opening);
  const hasStakes =
    /\b(muda|salva|destr[oó]i|risco|perigo|prova|revela|verdade|erro|consequ[eê]ncia|impacto)\b/i.test(
      opening
    );
  const hasProgression =
    /\b(primeiro|depois|ent[aã]o|por isso|o resultado|no fim|s[eé]culos depois|a partir disso)\b/i.test(
      script
    );
  const hasGenericGreeting =
    /^(oi|ol[aá]|fala[,! ]|seja bem-vindo|bem-vindos|hoje eu vou)\b/i.test(
      opening
    );
  const hasVagueClickbait =
    /\b(voce n[aã]o vai acreditar|você n[aã]o vai acreditar|o segredo que ningu[eé]m conta|a verdade escondida|isso vai mudar sua vida|olha isso|chocante)\b/i.test(
      opening
    );
  const promiseSharedWords = declaredPromise
    ? countSharedWords(declaredPromise, earlyWindow)
    : 0;
  const promiseConcreteWords = concreteRetentionWords(declaredPromise).length;
  const earlyPromiseDelivered =
    !declaredPromise || promiseConcreteWords < 3 || promiseSharedWords >= (isShort ? 1 : 3);
  const hasPayoff =
    Boolean(editorial.checks?.payoff) ||
    /\b(segredo|resposta|resultado|por isso|conclus[aã]o|li[cç][aã]o|significa|era|foi|revela|explica)\b/i.test(
      payoffWindow
    );
  const payoffCompletesPromise =
    !declaredPromise ||
    promiseConcreteWords < 3 ||
    countSharedWords(declaredPromise, payoffWindow) >= (isShort ? 2 : 3) ||
    hasPayoff;
  const hasContextualCta = Boolean(editorial.checks?.contextualCta);
  const averageWordsPerSentence = narration.averageWordsPerSentence || 0;
  const wordsBySentence = sentences.map(
    (sentence) => sentence.split(/\s+/).filter(Boolean).length
  );
  const longSentenceCount = wordsBySentence.filter(
    (count) => count > thresholds.maxLongSentenceWords
  ).length;
  const normalizedWords = retentionWords(script);
  const repeatedStarters = repeatedSentenceStarters(
    sentences,
    thresholds.repeatedStarterLimit
  );
  const repeatedPhrases = repeatedContentPhrases(
    normalizedWords,
    thresholds.repeatedPhraseLimit
  );

  const deduct = (severity, points, message, evidence = {}) => {
    diagnostics.push({ severity, points, message, evidence });
    if (severity === "blocking") issues.push(message);
    else recommendations.push(message);
  };

  if (!script) deduct("blocking", 100, "Roteiro vazio sem retenção avaliável.");
  if (hasGenericGreeting) {
    deduct(
      "blocking",
      18,
      "Gancho abre com saudação genérica antes de entregar uma promessa específica.",
      { opening }
    );
  }
  if (concreteHookWords.length < thresholds.hookMinConcreteWords) {
    deduct(
      "blocking",
      18,
      `Gancho pouco específico: ${concreteHookWords.length} palavra(s) concretas, mínimo ${thresholds.hookMinConcreteWords} para ${normalizedFormat}.`,
      { opening, concreteWords: concreteHookWords }
    );
  }
  if (hasVagueClickbait && !payoffCompletesPromise) {
    deduct(
      "blocking",
      22,
      "Abertura usa clickbait amplo, mas o final não entrega uma resposta concreta para a promessa.",
      { opening, payoffWindow }
    );
  }
  if (!earlyPromiseDelivered) {
    deduct(
      "blocking",
      16,
      `Promessa declarada demora a aparecer: janela inicial de ${thresholds.promiseWindowSentences} frase(s) compartilha só ${promiseSharedWords} termo(s) concreto(s).`,
      { promise: declaredPromise, earlyWindow }
    );
  }
  if (!hasCuriosityGap) {
    deduct(
      "advisory",
      8,
      "Abra com uma pergunta, contraste ou lacuna de curiosidade mais clara.",
      { opening }
    );
  }
  if (!hasStakes) {
    deduct(
      "advisory",
      8,
      "Declare cedo o que muda, o risco ou a consequência da história.",
      { opening }
    );
  }
  if (!hasProgression) {
    deduct(
      "advisory",
      8,
      "Use transições de progressão para criar sensação de avanço."
    );
  }
  if (!hasPayoff || !payoffCompletesPromise) {
    deduct(
      "blocking",
      22,
      "Retenção sem payoff final que retome a resposta, consequência ou promessa central.",
      { ending, payoffWindow, promise: declaredPromise }
    );
  }
  if (repeatedStarters.length) {
    deduct(
      "blocking",
      14,
      `Aberturas de frase repetidas demais: ${repeatedStarters
        .map((item) => `${item.phrase} (${item.count}x)`)
        .join(", ")}.`,
      { repeatedStarters }
    );
  }
  if (repeatedPhrases.length) {
    deduct(
      "blocking",
      14,
      `Frases ou blocos de palavras repetidos demais: ${repeatedPhrases
        .map((item) => `${item.phrase} (${item.count}x)`)
        .join(", ")}.`,
      { repeatedPhrases }
    );
  }
  if (sentences.length > 0 && sentences.length < thresholds.minSentences) {
    deduct(
      "blocking",
      12,
      `${normalizedFormat} sem quantidade mínima de frases para ritmo e payoff: ${sentences.length}/${thresholds.minSentences}.`,
      { sentenceCount: sentences.length }
    );
  }
  if (words.length > 0 && (words.length < thresholds.minWords || words.length > thresholds.maxWords)) {
    deduct(
      "advisory",
      10,
      `${normalizedFormat} fora da faixa de palavras recomendada para retenção: ${words.length} palavras, alvo ${thresholds.minWords}-${thresholds.maxWords}.`,
      { wordCount: words.length }
    );
  }
  if (longSentenceCount) {
    deduct(
      longSentenceCount >= (isShort ? 2 : 4) ? "blocking" : "advisory",
      Math.min(18, longSentenceCount * 6),
      `${longSentenceCount} frase(s) acima de ${thresholds.maxLongSentenceWords} palavras prejudicam o ritmo oral.`,
      { longSentenceCount, maxLongSentenceWords: thresholds.maxLongSentenceWords }
    );
  }
  if (averageWordsPerSentence > thresholds.maxAverageWordsPerSentence) {
    deduct(
      "advisory",
      8,
      `Densidade média alta para ${normalizedFormat}: ${averageWordsPerSentence} palavras por frase, limite ${thresholds.maxAverageWordsPerSentence}.`,
      { averageWordsPerSentence }
    );
  }
  if (!isShort && !hasContextualCta) {
    deduct(
      "advisory",
      0,
      "Inclua um CTA contextual no meio do vídeo sem interromper a entrega."
    );
  }

  const score = clampScore(
    100 - diagnostics.reduce((sum, item) => sum + item.points, 0)
  );

  return {
    ok: issues.length === 0,
    score,
    format: normalizedFormat,
    thresholds,
    checks: {
      hookSpecificity: concreteHookWords.length >= thresholds.hookMinConcreteWords,
      curiosityGap: hasCuriosityGap,
      stakes: hasStakes,
      earlyPromiseDelivered,
      progression: hasProgression,
      payoff: hasPayoff && payoffCompletesPromise,
      repetition: repeatedStarters.length === 0 && repeatedPhrases.length === 0,
      pacing:
        sentences.length >= thresholds.minSentences &&
        longSentenceCount === 0 &&
        averageWordsPerSentence <= thresholds.maxAverageWordsPerSentence,
      contextualCta: hasContextualCta,
    },
    evidence: {
      concreteHookWords,
      promiseSharedWords,
      repeatedStarters,
      repeatedPhrases,
      longSentenceCount,
      averageWordsPerSentence,
    },
    diagnostics,
    issues,
    recommendations,
  };
}

/**
 * Unified deterministic script-quality gate.
 * It combines executable checks and never uses model-authored checklist scores.
 */
export function assessAutomaticScriptQuality({
  format = "LONGO",
  narrativeScript = "",
  strategy = {},
  idea = {},
  trace = {},
  researchFacts = [],
  researchSources = [],
} = {}) {
  const editorial = assessEditorialContract({ format, narrativeScript, strategy });
  const narration = assessNarrationReadiness({ format, narrativeScript });
  const factual = assessNarracaoProIntegrity({
    format,
    narrativeScript,
    idea,
    trace,
    researchFacts,
    researchSources,
  });
  const retention = assessDeterministicRetention({
    format,
    narrativeScript,
    strategy,
    editorial,
    narration,
  });
  const narrationScore = scoreNarrationReadiness(narration);
  const factualScore = clampScore(100 - factual.issues.length * 30 - factual.warnings.length * 5);
  const rawScore =
    editorial.score * 0.35 +
    narrationScore * 0.2 +
    factualScore * 0.3 +
    retention.score * 0.15;
  const factualHardBlockers = factual.ok
    ? []
    : factual.issues.map((issue) => `Factual: ${issue}`);
  const hardBlockers = uniqueMessages([
    ...factualHardBlockers,
    ...(!narrativeScript || !String(narrativeScript).trim()
      ? ["Roteiro vazio não pode ser aprovado."]
      : []),
  ]);
  const score = clampScore(hardBlockers.length ? Math.min(rawScore, 49) : rawScore);
  const recommendations = uniqueMessages([
    ...editorial.issues,
    ...editorial.recommendations,
    ...narration.recommendations,
    ...retention.issues,
    ...retention.recommendations,
    ...factual.warnings,
  ]);

  return {
    score,
    overallScore: score,
    passed:
      hardBlockers.length === 0 &&
      score >= 80 &&
      editorial.ok &&
      retention.ok &&
      narration.ok,
    hardBlockers,
    recommendations,
    dimensions: {
      editorial: {
        ...editorial,
        score: clampScore(editorial.score),
      },
      narration: {
        ...narration,
        score: narrationScore,
      },
      factual: {
        ...factual,
        score: factualScore,
      },
      retention,
    },
  };
}

export function parseChecklistScore(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(10, Math.max(0, Math.round(value)));
  }
  const str = String(value).trim();
  const fraction = str.match(/^(\d{1,2})\s*\/\s*10$/);
  if (fraction) return Math.min(10, Math.max(0, parseInt(fraction[1], 10)));
  const num = parseInt(str.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(num) ? Math.min(10, Math.max(0, num)) : fallback;
}

export function normalizeScriptChecklist(raw) {
  const empty = {
    click_potential: 0,
    retention_potential: 0,
    comments_potential: 0,
    feedback: "",
    corrections: [],
  };
  if (!raw || typeof raw !== "object") return { ...empty };

  const feedback = String(
    raw.feedback ||
      raw.sugestoes ||
      raw.recommendations ||
      raw.recomendacoes ||
      raw.recomendacoes_ia ||
      raw.avaliacao ||
      ""
  ).trim();

  let corrections =
    raw.corrections || raw.correcoes || raw.fixes || raw.ajustes || [];
  if (typeof corrections === "string") {
    corrections = corrections
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(corrections)) corrections = [];

  return {
    click_potential: parseChecklistScore(
      raw.click_potential ??
        raw.clickPotential ??
        raw.potencial_clique ??
        raw.clique ??
        raw.clicks
    ),
    retention_potential: parseChecklistScore(
      raw.retention_potential ??
        raw.retentionPotential ??
        raw.potencial_retencao ??
        raw.retencao ??
        raw.retention
    ),
    comments_potential: parseChecklistScore(
      raw.comments_potential ??
        raw.commentsPotential ??
        raw.potencial_comentarios ??
        raw.comentarios ??
        raw.comments
    ),
    feedback,
    corrections: corrections.map((c) => String(c).trim()).filter(Boolean),
  };
}

export function isChecklistEmpty(checklist = {}) {
  const c = normalizeScriptChecklist(checklist);
  const scores =
    c.click_potential + c.retention_potential + c.comments_potential;
  return scores === 0 && !c.feedback.trim() && c.corrections.length === 0;
}

export function buildChecklistSchemaBlock() {
  return `
8. "checklist" (OBRIGATÓRIO — avalie o roteiro gerado, não deixe zerado):
{
  "click_potential": 0-10,
  "retention_potential": 0-10,
  "comments_potential": 0-10,
  "feedback": "2-4 frases com recomendações IA: o que está forte, o que melhorar no título/gancho/ritmo",
  "corrections": ["ajuste 1 acionável", "ajuste 2 acionável"]
}
Critérios:
- click_potential: título + gancho geram curiosidade real (não clickbait vazio)
- retention_potential: open loops, fatos de impacto, ritmo oral, payoff no final
- comments_potential: polêmia saudável, pergunta com stakes ou dado que convida debate
- corrections: máximo 4 itens curtos e específicos ao roteiro (ex.: "Gancho promete X mas bloco 3 não entrega")`;
}
