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
    if (sentences.length < 5) {
      issues.push(
        "Short sem desenvolvimento suficiente entre gancho e payoff."
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

  const averageWordsPerSentence = wordsBySentence.length
    ? Math.round(
        (wordsBySentence.reduce((sum, count) => sum + count, 0) /
          wordsBySentence.length) *
          10
      ) / 10
    : 0;
  return {
    ok: Boolean(script),
    format: isShort ? "SHORTS" : "LONGO",
    sentenceCount: sentences.length,
    averageWordsPerSentence,
    longSentenceCount: longSentences.length,
    acronyms,
    numberCount: numbers.length,
    recommendations,
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
