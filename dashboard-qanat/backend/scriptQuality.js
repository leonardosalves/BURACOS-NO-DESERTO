/** Regras e pós-processamento para roteiros naturais, coerentes e com mensagem clara. */

import { resolveStockSearchQuery } from "./stockSearchQuery.js";
import { isPioneerStrategyText } from "./pioneerNicheDiscovery.js";
import { buildTitleCraftRules } from "./titleGenerator.js";
import {
  buildCinematicNarrationRules,
  buildEpidemicMoodPrompt,
} from "./videoProEnhancements.js";
import {
  enrichVisualPromptsSpecificity,
  buildSceneSpecificPrompt,
  isSceneSpecificFallbackPrompt,
  VISUAL_PROMPT_SPECIFICITY_RULES,
} from "./scenePromptSpecificity.js";

export { VISUAL_PROMPT_SPECIFICITY_RULES } from "./scenePromptSpecificity.js";

export const ROBOTIC_PHRASE_PATTERNS = [
  /neste vídeo vamos/gi,
  /sem mais delongas/gi,
  /fique até o final/gi,
  /você não vai acreditar/gi,
  /prepare-se para/gi,
  /mergulhe (?:neste|nesta|no|na)/gi,
  /desvende os segredos/gi,
  /jornada fascinante/gi,
  /universo (?:intrigante|fascinante)/gi,
  /é importante ressaltar/gi,
  /vale a pena mencionar/gi,
  /em conclusão/gi,
  /sem dúvida alguma/gi,
  /cada vez mais/gi,
  /no mundo de hoje/gi,
  /a verdade é que/gi,
];

/** Framework viral short-form (Lucas Walter / n8n — adaptado Lumiera). */
export const VIRAL_HOOK_TYPES = [
  { id: "question", label: "Pergunta", example: "Por que ninguém fala disso?" },
  {
    id: "shock",
    label: "Choque/Surpresa",
    example: "Isso quase derrubou a Boeing.",
  },
  {
    id: "problem_solution",
    label: "Problema/Solução",
    example: "A janela quadrada matava passageiros.",
  },
  {
    id: "before_after",
    label: "Antes/Depois",
    example: "Antes: quadrado. Depois: oval.",
  },
  {
    id: "breaking",
    label: "Notícia/Urgência",
    example: "Em 1985, a regra mudou de um dia pro outro.",
  },
  {
    id: "challenge",
    label: "Desafio/Teste",
    example: "Adivinha qual avião ainda voa com janela quadrada.",
  },
  {
    id: "secret",
    label: "Segredo/Conspiração leve",
    example: "A FAA escondeu o relatório por anos.",
  },
  {
    id: "personal",
    label: "Impacto pessoal",
    example: "Você já sentou ao lado disso sem saber.",
  },
];

export const VIRAL_STORY_CATEGORIES = [
  "impactful",
  "practical",
  "provocative",
  "astonishing",
];

export const VIRAL_SHORT_FORM_REINFORCEMENT = `
FRAMEWORK VIRAL SHORT-FORM (n8n/Lucas Walter — adaptado Lumiera):

CURADORIA DE HISTÓRIA (escolha 1 categoria antes de escrever):
- impactful: consequência real na vida das pessoas
- practical: dá para usar/aplicar hoje
- provocative: desafia crença comum (com fatos, não opinião vazia)
- astonishing: dado ou imagem que parece impossível
FILTROS DUROS — descarte histórias: ad-driven, puramente políticas, sem substância factual.

GANCHO (≤10 palavras, voz ativa, gatilho emocional, número quando couber):
Tipos: pergunta | choque | problema/solução | antes/depois | urgência | desafio | segredo leve | impacto pessoal.
O gancho ANUNCIA o payoff — não prometa o que o roteiro não entrega.

ESTRUTURA 30–50s (80–130 palavras, ritmo oral):
1. Gancho escolhido (bloco 1)
2. Uma frase que contextualiza (bloco 2)
3. 3–5 wow-facts com números, datas, analogias do dia a dia (blocos 3–4)
4. 1–2 frases sobre por que importa / risco / consequência moderna (bloco 4)
5. Fechamento DECLARATIVO (mic drop factual) — fecha o loop do gancho

POWER-UPS (use 1–2 por roteiro, sem forçar):
- authority bump: cite fonte, órgão ou especialista em 1 frase
- hook spice: número + consequência imediata no gancho
- then-vs-now: contraste temporal em 1 linha
- stat escalation: cada fato sobe a aposta (menor → maior)
- real-world fallout: "hoje isso significa que..."
- zoom-out: última frase liga o micro ao macro
- rhythm check: alterne frases de 3–5 palavras com 1 frase explicativa

FINAL — REGRA LUMIERA (prioridade sobre CTA de comentário):
- PREFERIDO: frase declarativa com consequência, ironia factual ou número final
- PERMITIDO com moderação: pergunta forward-looking COM stakes reais ligadas ao tema (ex.: "Quantos aviões ainda voam com janelas quadradas?")
- PROIBIDO: "Você prefere…?", "Qual você escolheria…?", "Comenta aí", "O que achou?", perguntas binárias sem payoff
`;

/** Princípios UGC (Motion-Creative/ugc-scriptwriter) — narração falada autêntica. */
export const UGC_SCRIPTWRITER_REINFORCEMENT = `
MODO UGC / NARRAÇÃO FALADA (skill ugc-scriptwriter):
- Escreva como alguém CONTANDO ao vivo — passa no teste "ler em voz alta sem tropeçar".
- Especificidade > adjetivos: nomes, datas, números, cenas concretas (não "incrível" sem prova).
- Arco: gancho → problema (1 frase) → virada → prova (dado) → fechamento DECLARATIVO.
- PROIBIDO no final: "Você prefere…?", "Qual você…?", "Comenta aí", "Deixa nos comentários", "O que achou?".
- BOM final: consequência moderna, ironia factual ou mic drop — ex.: "Por isso toda janela de avião hoje é oval."
- Máximo 2–3 fatos fortes no Short; corte tudo que não avança a tese.
`;

export const SCRIPT_CREATIVE_REINFORCEMENT = `
ARQUITETURA DA MENSAGEM (OBRIGATÓRIO — não pule):

1. TESE ÚNICA: Antes de escrever, defina em UMA frase o que o espectador deve entender ao final. Todo o roteiro serve só essa tese. Se um parágrafo não ajuda a explicar a tese, remova.

2. PROGRESSÃO LÓGICA: Cada bloco responde implicitamente: "Por que estou ouvindo isso AGORA?" e "O que eu aprendo neste trecho?". Proibido saltar de assunto sem ponte.

3. LINGUAGEM HUMANA (PT-BR oral): Escreva como alguém contando para um amigo inteligente — frases curtas, verbos concretos, exemplos específicos (nomes, datas, números, cenas). Evite tom de redação escolar, release de imprensa ou Wikipedia.

4. PROIBIDO (soa robótico / vazio / clickbait falso):
   - "Neste vídeo vamos...", "Sem mais delongas", "Fique até o final", "Você não vai acreditar"
   - "Prepare-se", "Mergulhe", "Desvende os segredos", "Jornada fascinante", "Universo intrigante"
   - "É importante ressaltar", "Vale a pena mencionar", "Em conclusão", "No mundo de hoje"
   - Adjetivos vazios sem prova: incrível, surpreendente, impressionante, extraordinário (use só com dado ou exemplo logo em seguida)
   - Três frases seguidas começando igual ou com a mesma estrutura

5. CLAREZA PARA QUEM NUNCA OUVIU FALAR DO ASSUNTO:
   - Na primeira menção de um conceito, explique em linguagem simples (1 frase).
   - Use analogias do dia a dia quando o tema for técnico ou histórico.
   - Feche loops abertos: se abrir uma pergunta no bloco 1, responda antes do final.

6. RETENÇÃO SEM ENROLAR: Gancho forte nos 3 primeiros segundos, mas o gancho deve ANUNCIAR o payoff real — não prometer o que o roteiro não entrega.

7. REVISÃO FINAL (faça mentalmente antes de responder):
   - Leia a narração em voz alta. Onde tropeçar ou soar artificial, reescreva.
   - O espectador consegue resumir o vídeo em uma frase? Se não, o roteiro está confuso.
   - Cada block_phrase deve ser o início EXATO da narração daquele bloco (4-8 palavras, únicas entre si).

${UGC_SCRIPTWRITER_REINFORCEMENT}
`;

export function buildFormatScriptRules(format = "LONGO") {
  if (format === "SHORTS") {
    return `
REGRAS ESPECÍFICAS — SHORTS (30–50 segundos, 3–4 blocos):

- UMA ideia, UMA virada, UM payoff. Nada de sub-temas paralelos.
- Bloco 1 (gancho): ≤10 palavras, voz ativa — use um dos tipos de gancho viral (pergunta, choque, problema/solução, antes/depois, urgência, desafio, segredo leve, impacto pessoal).
- Bloco 2 (contexto): 1 frase — quem/o quê/onde. Sem história paralela.
- Bloco 3 (wow-facts): 2–3 fatos com números, datas ou analogias do dia a dia — cada fato sobe a aposta.
- Bloco 4 (virada + stakes): o detalhe que muda a perspectiva + por que isso importa hoje (risco, consequência moderna).
- Bloco 5 (payoff): responde o gancho do bloco 1 em 1-2 frases DECLARATIVAS — mic drop factual. Sem pergunta vazia ao espectador.
- Narração total: 80–130 palavras. Frases de até 12 palavras na maioria.
- Ritmo: alterne frase curta (3–5 palavras) + frase explicativa. Nunca dois parágrafos densos seguidos.
- O espectador deve entender a mensagem mesmo sem som (pela lógica do texto).

${VIRAL_SHORT_FORM_REINFORCEMENT}
`;
  }

  return `
REGRAS ESPECÍFICAS — VÍDEO LONGO (10–20 min, 12 blocos):

- Estrutura em capítulos mentais: Gancho → Promessa → Contexto → 4-6 blocos de desenvolvimento (cada um com mini-payoff) → Tensão → Revelação principal → Síntese → CTA.
- Cada bloco termina com ponte para o próximo ("Mas o detalhe que muda tudo vem agora..." só se o próximo bloco realmente entregar).
- Repita a tese central com palavras diferentes no bloco 7 e no bloco 11 (âncora de memória), sem copiar frases.
- Profundidade SIM, enrolação NÃO: cada bloco adiciona fato, exemplo ou consequência nova — nunca repete o mesmo argumento com sinônimos.
- Dados e datas quando possível; histórias humanas de 2-3 frases para emocionar.
- Narração: 1500–3000 palavras. Parágrafos de 3-5 frases no máximo.
- Ao final, o espectador deve conseguir explicar o tema para outra pessoa em 30 segundos.
`;
}

/**
 * Lightweight deterministic editorial gate. It does not replace creative
 * judgment; it exposes structural omissions before narration/TTS starts.
 */
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
  const isShort = format === "SHORTS" || format === "SHORT";

  if (!thesis) issues.push("Sem tese ou promessa editorial identificável.");
  if (!hook) issues.push("Sem gancho verbal identificável.");
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
  } else {
    if (words.length < 900) {
      issues.push("Vídeo longo ainda não tem desenvolvimento suficiente.");
    }
    if (sentences.length < 18) {
      issues.push("Vídeo longo precisa de mais progressão por capítulos.");
    }
  }
  if (
    !ending ||
    /^(comenta|o que achou|se inscreva|deixa.*coment)/i.test(ending)
  ) {
    issues.push("Final sem payoff declarativo ou CTA contextualizado.");
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
    issues,
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
- retention_potential: open loops, wow-facts, ritmo oral, payoff no final
- comments_potential: polêmia saudável, pergunta com stakes ou dado que convida debate
- corrections: máximo 4 itens curtos e específicos ao roteiro (ex.: "Gancho promete X mas bloco 3 não entrega")`;
}

export function buildScriptChecklistEvaluationPrompt({
  narrative_script = "",
  strategy = {},
  format = "SHORTS",
  ideaTitle = "",
  niche = "",
} = {}) {
  const title = strategy.title_main || ideaTitle || "";
  const hook = strategy.hook || "";
  return `Você é avaliador de qualidade para vídeos YouTube (Script Master Lumiera).

Avalie o roteiro abaixo e preencha o checklist de qualidade com notas REAIS de 1 a 10 (nunca deixe tudo 0).

FORMATO: ${format}
NICHO: ${niche || "geral"}
TÍTULO: ${title}
GANCHO: ${hook}

NARRAÇÃO:
"""
${String(narrative_script).trim().slice(0, 6000)}
"""

Responda APENAS JSON válido:
{
  "checklist": {
    "click_potential": 0-10,
    "retention_potential": 0-10,
    "comments_potential": 0-10,
    "feedback": "recomendações IA em PT-BR",
    "corrections": ["correção 1", "correção 2"]
  }
}`;
}

export function buildIdeasQualityAddendum() {
  return `
Para cada ideia, inclua em "why_it_works" como a mensagem central será compreensível para leigos.
Evite ideias cujo título promete algo que 40 segundos (Shorts) ou 12 minutos (Longo) não conseguem entregar com clareza.
`;
}

/** Curadoria viral + hook angles para geração de ideias (framework n8n adaptado). */
export function buildViralIdeasAddendum(format = "LONGO") {
  const hookList = VIRAL_HOOK_TYPES.map(
    (h) => `  - ${h.id}: ${h.label} (ex.: "${h.example}")`
  ).join("\n");
  const isShorts = format === "SHORTS";

  return `
FRAMEWORK VIRAL DE IDEIAS (curadoria + ganchos — use em TODAS as 10 ideias):

CATEGORIAS DE HISTÓRIA (campo "viral_category" — varie entre as 10 ideias):
- impactful | practical | provocative | astonishing
Descarte ideias: ad-driven, puramente políticas, sem substância factual.

TIPOS DE GANCHO (campo "hook_angle" — use tipos DIFERENTES entre ideias):
${hookList}

${
  isShorts
    ? `PROCESSO MENTAL POR IDEIA SHORT (não entregue rascunho — só metadados):
1. Esboce 3 ganchos candidatos (campo "hook_candidates": array de 3 strings ≤10 palavras)
2. Escolha o melhor em "hook_angle" + "hooks" (gancho principal para o roteiro)
3. Planeje 3–5 wow-facts verificáveis em "wow_facts_preview" (números/datas curtos)`
    : `Para LONGO: "hook_angle" indica o tipo de abertura; "hooks" = gancho de retenção dos primeiros 30s.`
}

REGRAS:
- Cada ideia deve ter "viral_category" e "hook_angle" (id do tipo, ex.: "shock", "before_after")
- "hooks" = gancho principal ≤10 palavras em PT-BR, voz ativa
- Varie categorias e tipos de gancho — não repita o mesmo hook_angle em mais de 2 ideias
- Filtros: sem clickbait falso, sem política partidária, sem tema sem fatos verificáveis
`;
}

/** Impede que a busca de nicho puxe temas de outros canais/vídeos anteriores do usuário. */
export function buildNicheIsolationAddendum(niche = "") {
  const n = String(niche).trim();
  return `
ISOLAMENTO DE NICHO (CRÍTICO — violação invalida a resposta):
- O usuário está explorando APENAS o nicho: "${n}"
- NÃO use, adapte, mencione nem sugira temas de outros canais, nichos ou vídeos que o usuário possa ter feito antes — a menos que estejam literalmente dentro de "${n}"
- Esta busca é independente do histórico do usuário no programa. Trate "${n}" como um canal novo, sem memória de projetos passados
- Cada sugestão deve ser defensável como pertencente a "${n}"; se não couber, descarte
- Se "${n}" for amplo, distribua sugestões em subáreas DIFERENTES do próprio nicho (não desvie para nichos adjacentes que o usuário não pediu)`;
}

/** Variedade de ângulos dentro do nicho informado — sem viés fixo para história/engenharia. */
export function buildNicheVarietyInstruction(niche = "") {
  const n = String(niche).trim();
  return `
DIRETRIZ DE VARIABILIDADE (somente dentro de "${n}"):
- Explore ângulos DIFERENTES entre si, todos estritamente dentro de "${n}"
- Varie quando fizer sentido: perguntas do público, mitos vs realidade, recordes, comparações improváveis, impacto no cotidiano, controverses, ciência, origem surpreendente, antes/depois, erros famosos, lendas verificáveis
- Proibido puxar temas de engenharia antiga, impérios ou invenções clássicas SE "${n}" não for explicitamente sobre história ou engenharia
- Busque fatos frescos sobre "${n}" — como se fosse a primeira pesquisa desse canal, sem repetir clichês de outros nichos`;
}

export const SHORTS_LISTICLE_RANK_OPTIONS = [3, 5];

export function resolveListicleBlockCount({
  rankCount = 20,
  format = "LONGO",
} = {}) {
  const rank = clampListicleRankCount(rankCount, format);
  return rank + 2;
}

export function clampListicleRankCount(rankCount = 20, format = "LONGO") {
  const rank = Math.min(50, Math.max(3, Number(rankCount) || 20));
  if (format === "SHORTS") {
    if (SHORTS_LISTICLE_RANK_OPTIONS.includes(rank)) return rank;
    return rank <= 4 ? 3 : 5;
  }
  return rank;
}

export function buildListicleIdeasAddendum({
  rankCount = 20,
  listTopic = "",
  rankOrder = "desc",
} = {}) {
  const orderLabel =
    rankOrder === "asc" ? "1 até N (build-up)" : "N até 1 (countdown)";
  return `
MODO LISTICLE / TOP N (OBRIGATÓRIO):
- Gere exatamente 10 ideias de vídeo no formato "Top ${rankCount}" sobre: "${listTopic}"
- Cada título deve incluir o número (${rankCount}) e o tema de forma específica (ex: "Top ${rankCount} Invenções Chinesas Que o Ocidente Ignora")
- Ordem narrativa sugerida: ${orderLabel}
- Em "why_it_works", explique por que o formato ranking retém (curiosidade do #1, debate nos comentários, rewatch)
- Inclua campo extra em cada ideia: "listicle_angle" (ex: "surpresa histórica", "impacto no dia a dia", "mito vs realidade")
- Varie o recorte: país, época, categoria técnica, impacto humano, invenções esquecidas
- Evite itens genéricos repetidos entre ideias (ex: não sugerir 10x "Top ${rankCount} invenções" com o mesmo ângulo)
`;
}

const LISTICLE_RANKING_ARCHETYPES = [
  "mais subestimados / esquecidos pelo público",
  "que mudaram o mundo (impacto global)",
  "mais perigosos / destrutivos / letais",
  "mais controversos (geram debate nos comentários)",
  "que você usa todo dia sem saber a origem",
  "de um país ou civilização específica",
  "piores falhas / erros históricos",
  "recordes que parecem impossíveis",
  "que especialistas discordam no #1",
  "para iniciantes entenderem o nicho",
  "antes vs depois de um evento marcante",
  "mais lucrativos / de maior ROI / impacto econômico",
];

export function buildListicleRankingIdeasPrompt({
  niche = "",
  format = "LONGO",
  compact = false,
} = {}) {
  const archetypes = LISTICLE_RANKING_ARCHETYPES.map(
    (a, i) => `${i + 1}. ${a}`
  ).join("\n");
  const isShorts = format === "SHORTS";
  const formatRules = isShorts
    ? `- FORMATO SHORTS (exclusivo): "suggested_rank_count" deve ser APENAS 3 ou 5 — nunca outro número
- Títulos com "Top 3" ou "Top 5" conforme a profundidade do tema no nicho
- Mix obrigatório: ~6 ideias Top 3 (gancho rápido, 35-50s) e ~6 ideias Top 5 (mais denso, 45-60s)
- "best_format" sempre "SHORTS" em todas as ideias
- Rankings Top 3: ângulos de choque imediato, 1 fato forte por item
- Rankings Top 5: ângulos com mais variedade/categorias, ainda cabendo em Short`
    : `- FORMATO LONGO: "suggested_rank_count" entre 5 e 20 (varie: Top 5, 10, 15, 20 conforme profundidade)
- "best_format" preferencialmente "LONGO" (algumas ideias podem ser "SHORTS" se o tema for naturalmente curto)`;

  return `Você é um estrategista de YouTube especializado em vídeos LISTICLE / TOP N com alta retenção.

O usuário escolheu o NICHO: "${niche}"
Formato preferido: ${format}${isShorts ? " (SHORTS — apenas Top 3 e Top 5)" : ""}

SUA MISSÃO: Sugerir exatamente 12 ideias de RANKINGS interessantes, específicos e variados DENTRO desse nicho — não títulos genéricos.

${
  compact
    ? `- Foque só no nicho "${niche}". Varie ângulos (subestimados, controversos, recordes, etc.).`
    : `${buildNicheIsolationAddendum(niche)}

${buildNicheVarietyInstruction(niche)}

${SCRIPT_CREATIVE_REINFORCEMENT}`
}

ARQUÉTIPOS DE RANKING (use pelo menos 8 tipos diferentes entre as 12 ideias):
${archetypes}

REGRAS DE QUALIDADE (obrigatório):
- Cada ideia deve ser um ranking DISTINTO — não 12 variações do mesmo tema
- Títulos em PT-BR, específicos, com número no título
${formatRules}
- Inclua 3 "sample_items" como NOMES CURTOS de itens (máx. 40 caracteres cada — só o nome, sem explicação entre parênteses)
- "controversy_hook": por que o #1 vai surpreender ou gerar comentário
- "why_interesting": 1 frase sobre apelo de retenção (curiosidade, choque, nostalgia, debate)
- "list_topic": tema interno curto para gerar o roteiro (ex: "invenções chinesas antigas subestimadas")
- Proibido: rankings vagos ("Top 10 coisas legais"), clichês saturados, itens fictícios
- Priorize ângulos que o público do nicho BUSCA mas raramente encontra em listas bem feitas

Responda APENAS JSON válido (sem markdown, sem texto extra):
{
  "niche_analysis": {
    "audience_profile": "quem assiste esse nicho",
    "what_they_search": "o que buscam no YouTube",
    "comment_triggers": "o que faz comentar",
    "best_ranking_styles": "que estilos de top N funcionam aqui"
  },
  "ranking_ideas": [
    {
      "title": "Top 15 ...",
      "suggested_rank_count": 15,
      "list_topic": "tema curto para roteiro",
      "listicle_angle": "subestimados | controversos | impacto diário | ...",
      "promise": "promessa do vídeo",
      "why_interesting": "por que esse ranking prende",
      "controversy_hook": "gancho do #1 surpreendente",
      "sample_items": ["item real 1", "item real 2", "item real 3"],
      "emotion": "emoção dominante",
      "best_format": "LONGO ou SHORTS"
    }
  ],
  "best_index": 0,
  "best_reason": "por que essa é a melhor ideia de ranking agora"
}`;
}

function normalizeRankingIdeaItem(item = {}) {
  const count = Number(
    item.suggested_rank_count ??
      item.suggestedRankCount ??
      item.rank_count ??
      item.quantidade ??
      0
  );
  return {
    title: String(item.title || item.titulo || "").trim(),
    suggested_rank_count: count > 0 ? count : 15,
    list_topic: String(
      item.list_topic || item.listTopic || item.tema || item.topic || ""
    ).trim(),
    listicle_angle: String(
      item.listicle_angle ||
        item.listicleAngle ||
        item.angle ||
        item.angulo ||
        ""
    ).trim(),
    promise: String(item.promise || item.promessa || "").trim(),
    why_interesting: String(
      item.why_interesting ||
        item.whyInteresting ||
        item.why_it_works ||
        item.por_que ||
        ""
    ).trim(),
    controversy_hook: String(
      item.controversy_hook ||
        item.controversyHook ||
        item.gancho ||
        item.hook ||
        ""
    ).trim(),
    sample_items: Array.isArray(item.sample_items)
      ? item.sample_items
      : Array.isArray(item.sampleItems)
        ? item.sampleItems
        : Array.isArray(item.exemplos)
          ? item.exemplos
          : [],
    emotion: String(item.emotion || item.emocao || "").trim(),
    best_format: String(
      item.best_format || item.bestFormat || item.formato || "LONGO"
    ).trim(),
  };
}

export function normalizeListicleIdeasResponse(
  data = {},
  { format = "LONGO" } = {}
) {
  if (Array.isArray(data)) {
    return normalizeListicleIdeasResponse({ ranking_ideas: data }, { format });
  }
  if (!data || typeof data !== "object") {
    return {
      niche_analysis: {},
      ranking_ideas: [],
      best_index: 0,
      best_reason: "",
    };
  }

  const ideasKey = Object.keys(data).find((k) =>
    /ranking_ideas|rankingideas|ideias_ranking|ideias_de_ranking|lista_rankings|rankings|ideias/i.test(
      k
    )
  );
  const analysisKey = Object.keys(data).find((k) =>
    /niche_analysis|analise_nicho|nicheanalysis|analise_do_nicho/i.test(k)
  );

  let rawIdeas =
    data.ranking_ideas ?? data[ideasKey] ?? data.ideas ?? data.rankings ?? [];
  if (!Array.isArray(rawIdeas) && rawIdeas && typeof rawIdeas === "object") {
    rawIdeas = Object.values(rawIdeas);
  }
  if (!Array.isArray(rawIdeas)) rawIdeas = [];

  const ranking_ideas = rawIdeas
    .map(normalizeRankingIdeaItem)
    .map((item) => {
      if (format !== "SHORTS") return item;
      const rank = clampListicleRankCount(item.suggested_rank_count, "SHORTS");
      return {
        ...item,
        suggested_rank_count: rank,
        best_format: "SHORTS",
        title: item.title.replace(/\btop\s+\d+\b/gi, `Top ${rank}`),
      };
    })
    .filter((item) => item.title.length > 3);

  const rawAnalysis = data.niche_analysis ?? data[analysisKey] ?? {};
  const niche_analysis =
    typeof rawAnalysis === "object" && rawAnalysis !== null ? rawAnalysis : {};

  const best_index = Math.max(
    0,
    Math.min(
      ranking_ideas.length - 1,
      Number(
        data.best_index ??
          data.bestIndex ??
          data.melhor_indice ??
          data.best_idea_index ??
          0
      ) || 0
    )
  );

  return {
    niche_analysis,
    ranking_ideas,
    best_index,
    best_reason: String(
      data.best_reason ??
        data.bestReason ??
        data.melhor_motivo ??
        data.best_idea_reason ??
        ""
    ).trim(),
  };
}

export function buildListicleScriptRules({
  rankCount = 20,
  rankOrder = "desc",
  format = "LONGO",
  listTopic = "",
  blockCount = 22,
} = {}) {
  const orderDesc = rankOrder !== "asc";
  const itemBlocks = blockCount - 2;
  const isShortsTop3 = format === "SHORTS" && itemBlocks <= 3;
  const wordsPerItem =
    format === "SHORTS" ? (isShortsTop3 ? "15-22" : "20-30") : "80-140";
  const totalWords =
    format === "SHORTS"
      ? isShortsTop3
        ? "65-95"
        : "110-150"
      : `${itemBlocks * 90}-${itemBlocks * 150}`;
  const shortsDuration = isShortsTop3 ? "30-45 segundos" : "45-60 segundos";

  return `
MODO LISTICLE / TOP N — ESTRUTURA OBRIGATÓRIA (prioridade sobre regras de documentário padrão):

TEMA DA LISTA: "${listTopic}"
ITENS NA LISTA: ${itemBlocks}
${format === "SHORTS" ? `DURAÇÃO ALVO (SHORTS): ${shortsDuration}` : ""}
ORDEM: ${orderDesc ? `countdown ${itemBlocks} → 1 (maior retenção — comece pelo item #${itemBlocks})` : `build-up 1 → ${itemBlocks} (crescendo até o #${itemBlocks})`}
TOTAL DE BLOCOS: ${blockCount} (bloco 1 = intro, blocos 2-${blockCount - 1} = um item cada, bloco ${blockCount} = recap + CTA)

ESTRUTURA DOS BLOCOS:
- Bloco 1 (INTRO): gancho em 3 segundos + promessa da lista + por que ESSA lista importa hoje. Não revele o #1 ainda.
- Blocos 2-${blockCount - 1} (ITENS): EXATAMENTE 1 item por bloco, nesta ordem:
  ${orderDesc ? `  • Bloco 2 = item #${itemBlocks}, bloco 3 = #${itemBlocks - 1} ... bloco ${blockCount - 1} = #1` : `  • Bloco 2 = item #1, bloco 3 = #2 ... bloco ${blockCount - 1} = #${itemBlocks}`}
  Cada bloco de item DEVE conter:
    1. Chamada do ranking ("Número ${orderDesc ? "X" : "X"}..." ou "Em ${orderDesc ? "X" : "X"}º lugar...")
    2. Nome do item/invenção/evento (claro e específico)
    3. Contexto: ano, inventor, país ou civilização (quando aplicável)
    4. ${format === "SHORTS" ? "1 fato concreto que surpreende (o mais forte — não enfileire fatos)" : "2 fatos concretos que surpreendem"}
    5. Impacto no mundo moderno (1 frase curta)
    6. Ponte oral de 3-5 palavras para o próximo item (exceto no último item antes do outro)
- Bloco ${blockCount} (OUTRO): ${format === "SHORTS" ? "1 frase de recap declarativa + mic drop (consequência ou fato final)" : "recap do top 3 em 2 frases + fechamento declarativo — sem perguntas vazias"}
${
  format === "SHORTS"
    ? `
NARRAÇÃO SHORTS — HUMANA, ENXUTA E CLARA (prioridade máxima):
- TOTAL: ${totalWords} palavras. Se passar do teto, CORTE antes de entregar — menos é mais.
- Por item: ~${wordsPerItem} palavras — nome + 1 fato forte + 1 linha de impacto. Proibido empilhar 3 fatos no mesmo item.
- Intro: máximo 2 frases curtas (gancho + promessa do ranking).
- Tom oral PT-BR: como quem CONTA ao vivo — use transições naturais ("Olha isso", "E o mais insano?", "Agora o topo").
- Frases de até 10-12 palavras na maioria. Ritmo de countdown, zero enrolação.
- O telespectador deve entender a mensagem de CADA item na primeira escuta, mesmo sem conhecer o tema.
- 1 ideia por frase. Se uma frase não avança o ranking, remova.
`
    : ""
}

NARRAÇÃO CINEMATOGRÁFICA (narrative_script_tagged):
- [pausa] antes de cada número do ranking e antes do #1
- [ênfase] no nome do item e em números/datas
- [rápido] na ponte entre itens; [lento] no impacto histórico
- narrative_script = texto limpo SEM marcadores

REGRAS DE NARRAÇÃO:
- ${totalWords} palavras no total (teto rígido — prefira ficar abaixo do máximo)
- ~${wordsPerItem} palavras por item
- Humanize: linguagem falada, transições orais, zero tom de redação ou Wikipedia
- Frases curtas, ritmo de countdown — sem enrolação entre itens
- NUNCA pule um número da lista; NUNCA repita o mesmo item
- Itens devem ser REAIS e verificáveis — sem invenção fictícia
- Diversifique tipos de itens (não 20 itens iguais da mesma categoria)

VISUAL_PROMPTS (crítico para listicle):
- Mínimo 3 cenas por item (bloco de item)
- A PRIMEIRA cena de cada item deve ter "text_overlay": "#N — NOME DO ITEM" (N = rank daquele bloco)
- Prompts visuais: objeto/invenção em close, contexto histórico, impacto moderno
- ${format === "SHORTS" ? 'SHORTS: mínimo 3 cenas com type "vídeo IA (max 10s)" distribuídas (gancho, meio, payoff); demais imagem 2K' : "80-90% imagem 2K, 10-20% vídeo IA"}

IMPACT_TEXTS (obrigatório):
- Um impact_text por bloco de item: {"block": N, "start_offset": 0.0, "end_offset": 4.0, "text": "#20 — NOME"}
- Intro: {"block": 1, "start_offset": 0.0, "end_offset": 5.0, "text": "TOP ${itemBlocks}"}

CAMPO EXTRA NO JSON — "listicle":
{
  "content_mode": "LISTICLE",
  "rank_count": ${itemBlocks},
  "rank_order": "${orderDesc ? "desc" : "asc"}",
  "topic": "${listTopic}"
}

CAMPO EXTRA — "list_items" (array com ${itemBlocks} objetos):
{
  "rank": 20,
  "title": "Nome do item",
  "year": "ano ou período",
  "origin": "país/civilização",
  "block": 2,
  "hook_line": "frase de gancho do item",
  "visual_hook": "english search term for stock"
}
`;
}

export function buildHumanizeRepairPrompt({
  format,
  ideaTitle,
  rawScript,
  blockCount,
}) {
  return `Você é um roteirista brasileiro especialista em clareza e naturalidade para YouTube.

O roteiro abaixo foi gerado por IA e pode estar robótico, confuso ou com mensagem difusa. REESCREVA apenas os campos de texto da narração.

FORMATO: ${format}
TÍTULO DA IDEIA: ${ideaTitle}
BLOCOS ESPERADOS: ${blockCount}

ROTEIRO ATUAL (JSON parcial):
${JSON.stringify(rawScript, null, 2).slice(0, 12000)}

TAREFAS OBRIGATÓRIAS:
1. Reescreva "narrative_script" em PT-BR natural, como narração falada — frases que soam bem em voz alta.
2. Reescreva "narrative_script_tagged" com as mesmas palavras + tags de áudio ([pause], (breath), etc.).
3. Reescreva "technical_config.script" dividido em exatamente ${blockCount} parágrafos (um por bloco), separados por linha em branco.
4. Atualize "technical_config.block_phrases" — cada "phrase" deve ser o início EXATO do bloco (4-8 palavras, todas diferentes).
5. Atualize "strategy.hook" se estiver genérico.
6. Mantenha a TESE do vídeo; remova frases vazias, clichês de IA e trechos que não ajudam o espectador a entender.
7. FINAL declarativo — sem "Você prefere…?" nem CTAs de comentário forçados.
8. NÃO altere visual_prompts, bgm_mappings nem impact_texts.

${UGC_SCRIPTWRITER_REINFORCEMENT}
8. Em "narrative_script_tagged", use marcadores cinematográficos com moderação: [pausa], [ênfase], [rápido], [lento] — ver regras de narração cinematográfica.

Responda APENAS JSON com as chaves:
{
  "narrative_script": "...",
  "narrative_script_tagged": "...",
  "technical_config": {
    "script": "...",
    "block_phrases": [{"block": 1, "phrase": "..."}]
  },
  "strategy": { "hook": "..." }
}`;
}

const LAME_ENDING_RE =
  /^(você|voce|qual você|qual voce|e você|e voce|o que você|o que voce|comenta|deixa nos coment|marque alguém|marque alguem|curtiu|gostou|concorda|qual te surpreendeu|qual origem)/i;

export function sanitizeLameEndingQuestions(text = "") {
  let out = String(text).trim();
  if (!out) return out;

  const sentences = out.split(/(?<=[.!?…])\s+/).filter(Boolean);
  if (sentences.length < 2) return out;

  const last = sentences[sentences.length - 1].trim();
  if (!last.endsWith("?")) return out;

  if (
    LAME_ENDING_RE.test(last) ||
    /\bvocê prefere\b/i.test(last) ||
    /\bqual você\b/i.test(last)
  ) {
    out = sentences.slice(0, -1).join(" ").trim();
    if (!out.endsWith(".") && !out.endsWith("!") && !out.endsWith("…")) {
      out += ".";
    }
  }
  return out;
}

export function sanitizeRoboticPhrases(text = "") {
  let out = String(text);
  const replacements = [
    [/neste vídeo vamos (?:explorar|descobrir|entender)/gi, "Olha só"],
    [/sem mais delongas[,.]?/gi, ""],
    [/fique até o final[,.]?/gi, ""],
    [/você não vai acreditar[,.]?/gi, ""],
    [/é importante ressaltar que/gi, ""],
    [/vale a pena mencionar que/gi, ""],
    [/no mundo de hoje[,.]?/gi, ""],
    [/  +/g, " "],
    [/\n{3,}/g, "\n\n"],
  ];
  for (const [pattern, repl] of replacements) {
    out = out.replace(pattern, repl);
  }
  return out.trim();
}

export function applyScriptTextQuality(parsedData = {}, format = "LONGO") {
  const result = { ...parsedData };
  const fields = ["narrative_script", "narrative_script_tagged"];

  for (const key of fields) {
    if (typeof result[key] === "string") {
      result[key] = sanitizeLameEndingQuestions(
        sanitizeRoboticPhrases(result[key])
      );
    }
  }

  if (result.technical_config) {
    let script = result.technical_config.script;
    if (Array.isArray(script)) script = script.join("\n\n");
    if (typeof script === "string") {
      result.technical_config = {
        ...result.technical_config,
        script: sanitizeRoboticPhrases(script),
      };
    }
  }

  if (result.strategy?.hook) {
    result.strategy = {
      ...result.strategy,
      hook: sanitizeRoboticPhrases(result.strategy.hook),
    };
  }

  return result;
}

export function extractScriptSliceForRepair(parsedData = {}) {
  return {
    narrative_script: parsedData.narrative_script || "",
    narrative_script_tagged: parsedData.narrative_script_tagged || "",
    technical_config: {
      script: parsedData.technical_config?.script || "",
      block_phrases: parsedData.technical_config?.block_phrases || [],
    },
    strategy: {
      hook: parsedData.strategy?.hook || "",
    },
  };
}

export function mergeHumanizedScript(
  original = {},
  repaired = {},
  format = "LONGO"
) {
  const merged = { ...original };
  if (repaired.narrative_script)
    merged.narrative_script = repaired.narrative_script;
  if (repaired.narrative_script_tagged)
    merged.narrative_script_tagged = repaired.narrative_script_tagged;
  if (repaired.strategy?.hook) {
    merged.strategy = { ...merged.strategy, hook: repaired.strategy.hook };
  }
  if (repaired.technical_config) {
    merged.technical_config = {
      ...merged.technical_config,
      ...repaired.technical_config,
    };
  }
  return applyScriptTextQuality(merged, format);
}

export function buildIdeaContextHeader({
  niche,
  format,
  idea = {},
  isListicle = false,
  listicleRank = 20,
  listicleTopic = "",
  rankOrder = "desc",
  listicleBlockCount = 22,
} = {}) {
  let header = `O usuário selecionou a seguinte ideia de vídeo para o nicho "${niche}" (Formato: "${format}")${isListicle ? ` — MODO LISTICLE TOP ${listicleRank}` : ""}:

Título: "${idea.title || ""}"

Promessa: "${idea.promise || ""}"

Emoção: "${idea.emotion || ""}"`;

  if (isListicle) {
    header += `\n\nTEMA DA LISTA: ${listicleTopic}
ORDEM DO RANKING: ${rankOrder === "asc" ? "1 → N (build-up)" : "N → 1 (countdown)"}
BLOCOS TOTAIS: ${listicleBlockCount} (intro + ${listicleRank} itens + outro)`;
    if (idea.listicle_angle)
      header += `\nÂNGULO DO RANKING: ${idea.listicle_angle}`;
    if (Array.isArray(idea.sample_items) && idea.sample_items.length) {
      header += `\nITENS SUGERIDOS (use ou refine): ${idea.sample_items.join(", ")}`;
    }
  }

  const customHookVal = idea.hook || idea.hooks || "";
  if (customHookVal) {
    header += `\nGancho de Retenção Inicial (Hook) sugerido: "${customHookVal}"`;
  }

  if (idea.hook_angle) {
    const hookType = VIRAL_HOOK_TYPES.find((h) => h.id === idea.hook_angle);
    header += `\nTipo de gancho viral: ${hookType ? `${hookType.label} (${hookType.id})` : idea.hook_angle}`;
  }
  if (idea.viral_category) {
    header += `\nCategoria viral: ${idea.viral_category}`;
  }
  if (Array.isArray(idea.wow_facts_preview) && idea.wow_facts_preview.length) {
    header += `\nWow-facts planejados (use ou refine com pesquisa): ${idea.wow_facts_preview.join(" | ")}`;
  }
  if (Array.isArray(idea.hook_candidates) && idea.hook_candidates.length) {
    header += `\nGanchos candidatos: ${idea.hook_candidates.join(" / ")}`;
  }

  if (idea.blocks) {
    let blocksStr = "";
    if (Array.isArray(idea.blocks)) {
      blocksStr = idea.blocks
        .map((b) => `Block ${b.block || b.index || 1}: ${b.content}`)
        .join("\n");
    } else {
      blocksStr = String(idea.blocks);
    }
    header += `\nEstrutura/Ganchos por Bloco recomendados pelo usuário:\n"${blocksStr}"`;
  }

  if (idea.isCustom) {
    header += `\n\nATENÇÃO: A ideia original pode estar em inglês. A narração deve ser em PT-BR natural e humana.`;
  }

  return header;
}

export const SHORTS_MIN_VIDEO_SCENES = 3;
export const SHORTS_VIDEO_SCENE_TYPE = "vídeo IA (max 10s)";

const MOTION_PROMPT_RE =
  /\b(motion|moving|drone|aerial|crowd|water|waves|fire|explosion|walking|running|traffic|timelapse|slow motion|camera pan|fly through|flowing|storm|wind|spinning|rotating|collapse|falling|crashing|surge|ripple)\b/i;

export function isVideoSceneType(type = "") {
  const t = String(type || "").toLowerCase();
  return t.includes("vídeo") || t.includes("video") || t.includes("mp4");
}

function adaptPromptForVideoScene(prompt = "") {
  const p = String(prompt || "").trim();
  if (!p)
    return "Cinematic motion, photorealistic, dramatic lighting, no text, max 10 seconds";
  if (/cinematic motion|max 10/i.test(p)) return p;
  return `${p.replace(/\.\s*$/, "")}. Cinematic motion, max 10 seconds, no text.`;
}

function pickEvenlyDistributedIndices(total, count) {
  if (count <= 0 || total <= 0) return [];
  if (count >= total) return Array.from({ length: total }, (_, i) => i);
  if (count === 1) return [0];
  const indices = [];
  for (let i = 0; i < count; i++) {
    indices.push(Math.round((i * (total - 1)) / (count - 1)));
  }
  return [...new Set(indices)];
}

/** Garante pelo menos N cenas de vídeo IA em Shorts (gancho, meio e payoff). */
export function enforceShortsVideoSceneMix(
  visualPrompts = [],
  { format = "LONGO", minVideos = SHORTS_MIN_VIDEO_SCENES } = {}
) {
  if (
    format !== "SHORTS" ||
    !Array.isArray(visualPrompts) ||
    visualPrompts.length === 0
  ) {
    return visualPrompts;
  }

  const vps = visualPrompts.map((vp) => ({ ...vp }));
  const effectiveMin = Math.min(minVideos, vps.length);
  const currentVideos = vps.filter((vp) => isVideoSceneType(vp.type)).length;
  if (currentVideos >= effectiveMin) return vps;

  const need = effectiveMin - currentVideos;
  const preferred = pickEvenlyDistributedIndices(
    vps.length,
    effectiveMin
  ).filter((index) => !isVideoSceneType(vps[index].type));

  const scored = vps
    .map((vp, index) => ({ index, vp, isVideo: isVideoSceneType(vp.type) }))
    .filter((entry) => !entry.isVideo)
    .map((entry) => {
      let score = 0;
      const prompt = String(entry.vp.prompt || entry.vp.visual_prompt || "");
      if (MOTION_PROMPT_RE.test(prompt)) score += 12;
      if (entry.index === 0) score += 10;
      if (entry.index === vps.length - 1) score += 6;
      if (entry.index === Math.floor(vps.length / 2)) score += 4;
      return { ...entry, score };
    })
    .sort((a, b) => b.score - a.score);

  const toConvert = new Set(preferred.slice(0, need));
  for (const entry of scored) {
    if (toConvert.size >= need) break;
    toConvert.add(entry.index);
  }

  for (const index of toConvert) {
    const vp = vps[index];
    const notes = String(vp.editor_notes || "").trim();
    vps[index] = {
      ...vp,
      type: SHORTS_VIDEO_SCENE_TYPE,
      prompt: adaptPromptForVideoScene(vp.prompt || vp.visual_prompt || ""),
      editor_notes:
        notes && /vídeo|video/i.test(notes)
          ? notes
          : `${notes || "Ken Burns zoom in"} — vídeo IA para movimento ativo (Shorts)`.trim(),
    };
  }

  return vps;
}

export const CINEMATIC_PROMPT_ENGINEERING_RULES = `
REGRAS DE PROMPT ENGINEERING CINEMATOGRÁFICO (OBRIGATÓRIO):

1. TRADUÇÃO VISUAL UNIVERSAL (ASSUNTOS INFINITOS):
   - A narração pode falar sobre QUALQUER assunto (história, filosofia, ciência, finanças, cotidiano, memes, mecânica, psicologia, etc.).
   - Seu papel é traduzir ideias abstratas em imagens/vídeos CONCRETOS. O que o espectador deve ver fisicamente na tela?
   - Proibido usar descrições abstratas ou genéricas: "a generic person", "some object", "illustrating the scene", "the exact subject from this scene", "subject".
   - Sempre identifique o objeto físico central, pessoa, cenário, textura ou conceito visual que representa o texto da narração e descreva-o com máxima precisão física.

2. ESPECIFICIDADE E DETALHAMENTO DO TEMA:
   - Se a narração cita algo histórico, use a estética visual, arquitetura, vestimentas e texturas exatas daquele período histórico específico.
   - Se cita biologia, anatomia ou natureza, use termos reais de biomas, espécies, reações biológicas e closes microscópicos/macroscópicos realistas.
   - Se cita finanças, negócios ou dados, crie cenas com infográficos dinâmicos integrados ao cenário, displays numéricos, salas de decisão ou layouts modernos limpos.
   - Se cita qualquer outro assunto (espiritualidade, culinária, esportes, etc.), descreva os elementos táteis, as ferramentas reais utilizadas, os ambientes característicos e a iluminação que define a atmosfera do tema.

3. LINGUAGEM CINEMATOGRÁFICA OBRIGATÓRIA:
   - Sempre especifique: tipo de câmera/ângulo (low angle, tracking shot, aerial drone, macro, isometric), movimento de câmera (slow panning, tilt, steadycam), iluminação (cinematic backlighting, golden hour, moody shadows), profundidade de campo, atmosfera.
   - Descreva texturas físicas táteis (metal escovado, tijolo rústico, poeira no ar, pele humana detalhada, superfícies brilhantes, etc.).
   - Estilo de época: film grain, lentes antigas correspondentes, iluminação clássica.
   - Estilo contemporâneo/futurista: cores nítidas e limpas, contraste balanceado, iluminação volumétrica profissional.
   - Movimento: Para cenas que sugerem peso ou calma, descreva movimento extremamente lento e deliberado ("slow deliberate motion", "inch by inch").

4. FOCO EM RETENÇÃO E IMPACTO:
   - Crie imagens com forte apelo estético ("uau" visual), usando cores complementares ou contrastes de luz marcantes.
   - Mostre o elemento humano (pessoas trabalhando, observando, expressando emoção) sempre que possível para criar conexão psicológica.
   - Organize a composição da cena de forma limpa para acomodar overlays de texto e legendas (deixando espaço livre no topo, centro ou terço inferior conforme a cena).

5. CONFIGURAÇÃO DE QUALIDADE FINA:
   - Termine prompts de vídeo com: "photorealistic, highly detailed, 8K".
   - Termine prompts de imagem com: "photorealistic, 2K resolution, highly detailed".
6. RACIOCÍNIO INTERNO (faça antes de cada prompt):
   - Qual é o fato surpreendente deste trecho?
   - Qual era o mecanismo real usado?
   - O que uma foto ou filmagem da época mostraria?
   - Como mostrar escala + detalhe técnico + emoção humana ao mesmo tempo?
   - Qual ângulo de câmera vai gerar mais impacto?

7. TEXTO EM PORTUGUÊS DO BRASIL (REGRA INQUEBRÁVEL):
   - Em TODO prompt gerado (imagem ou vídeo), se a cena contiver QUALQUER texto visível (text_overlay, rótulo, número, display, placa, inscrição), adicione ao final do prompt:
     "Todo e qualquer texto, rótulo, número, inscrição, legenda, display ou elemento visível e legível na imagem ou vídeo deve estar escrito em português do Brasil. Exemplos corretos: '1,4 VOLTS', '#3 — AÇO DE DAMASCO', 'R$ 47.900', 'NÚMERO 1'. Nunca gere texto em inglês."

8. OTIMIZAÇÃO DE COMPOSIÇÃO POR ASPECT RATIO:
   - Priorize composição vertical 9:16 (Shorts): framing apertado, sujeito centralizado ou em terços superiores/inferiores, movimentos de câmera preferencialmente verticais.
   - Também deve funcionar em 16:9 (Long form): composição widescreen cinematográfica, shots amplos ou pans horizontais quando apropriado.`;

export function buildVisualPromptsRules({
  format = "LONGO",
  isListicle = false,
  listicleRank = 20,
} = {}) {
  const sceneCount =
    format === "SHORTS"
      ? isListicle
        ? `${listicleRank * 2 + 4}-${listicleRank * 3 + 6}`
        : "5-12"
      : isListicle
        ? `${listicleRank * 3}+`
        : "40-80+";
  const typeMixRule =
    format === "SHORTS"
      ? `- SHORTS: mínimo ${SHORTS_MIN_VIDEO_SCENES} cenas com type "${SHORTS_VIDEO_SCENE_TYPE}" — gancho, virada e payoff devem ter movimento; distribua vídeos ao longo do Short (não concentre no final). Demais cenas: imagem IA 2k.`
      : `- 80-90% "imagem IA 2k"; 10-20% "${SHORTS_VIDEO_SCENE_TYPE}" para movimento ativo.`;

  return `
REGRAS DOS PROMPTS VISUAIS (OBRIGATÓRIO — sem isso o roteiro fica inutilizável):

- CUBRA 100% DA NARRAÇÃO APROVADA. Cada 1-2 frases = 1 objeto em visual_prompts.
- Gere ${sceneCount} cenas no mínimo.
- CADA objeto DEVE ter "narration_text" preenchido com o trecho EXATO falado na cena (copiado da narração aprovada).
- CADA objeto DEVE ter "prompt" em inglês — hiper-detalhado e cinematográfico (NÃO genérico).
- O "prompt" deve descrever VISUALMENTE a cena: sujeito ESPECÍFICO + ação + enquadramento + texturas + iluminação. NUNCA use frases vagas como "the exact subject from this scene" ou "subject".
- Se a cena incluir text_overlay, impact_text ou qualquer texto visível na imagem/vídeo, adicione ao final do prompt: "Any visible text must be in Portuguese (Brazilian)."
${typeMixRule}
- Nunca deixe narration_text ou prompt vazios.
- NÃO inclua "duration" nem "duration_seconds" — os segundos de cada cena são calculados pelo Whisper após a narração (100% da voz, sem estimativa).
- Inclua stock_query em inglês em cada cena.
${isListicle ? `- LISTICLE: text_overlay na primeira cena de cada item (#N — NOME).` : ""}
${VISUAL_PROMPT_SPECIFICITY_RULES}
${CINEMATIC_PROMPT_ENGINEERING_RULES}`;
}

export function buildVisualPromptsJsonSchema({
  blockCount = 5,
  isListicle = false,
  listicleRank = 20,
} = {}) {
  return `
4. "visual_prompts": [
   GERE UM OBJETO PARA CADA SEGMENTO DA NARRAÇÃO. Cubra o vídeo inteiro. Cada objeto:
   {
     "scene": "1.1",
     "block": 1,
     "narration_text": "Trecho EXATO da narração aprovada para esta cena (1-2 frases, NUNCA vazio)",
     "type": "imagem IA 2k" ou "vídeo IA (max 10s)",
     "prompt": "Prompt CINEMATOGRÁFICO em inglês: sujeito ESPECÍFICO + ação + ângulo de câmera + texturas + iluminação. Se tiver texto visível: 'Any visible text must be in Portuguese (Brazilian).'",
     "editor_notes": "Ken Burns zoom in, dissolve, etc.",
     "stock_query": "2-5 palavras em inglês: sujeito específico + ação (ex.: gannet plunge dive)"
   }
]`;
}

/** Extrai número de bloco inteiro — aceita block/bloco ou scene no formato "2.1". */
export function parseBlockNumber(raw, sceneRaw) {
  if (raw != null && raw !== "") {
    const n = Number(String(raw).trim());
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  if (sceneRaw != null && sceneRaw !== "") {
    const sceneStr = String(sceneRaw).trim();
    const dotMatch = sceneStr.match(/^(\d+)\./);
    if (dotMatch) return parseInt(dotMatch[1], 10);
    const n = Number(sceneStr);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return null;
}

export function countUniqueVisualBlocks(visualPrompts = []) {
  const blocks = new Set();
  for (const vp of visualPrompts) {
    const b = parseBlockNumber(vp?.block ?? vp?.bloco, vp?.scene ?? vp?.cena);
    if (b) blocks.add(b);
  }
  return blocks.size;
}

/** Prompts vindos do Gemini Browser Bridge — não sobrescrever com glossário local. */
export function browserVisualPromptsUsable(
  visualPrompts = [],
  { format = "LONGO" } = {}
) {
  const vps = Array.isArray(visualPrompts) ? visualPrompts : [];
  if (!vps.length) return false;

  const withPrompt = vps.filter((vp) => {
    const p = String(vp.prompt || vp.visual_prompt || "").trim();
    return p.length >= 40 && !isSceneSpecificFallbackPrompt(p);
  });
  const minGood =
    format === "SHORTS"
      ? Math.max(3, Math.min(5, vps.length))
      : Math.max(8, Math.min(12, vps.length));
  if (withPrompt.length < Math.min(minGood, vps.length)) return false;

  const emptyNarr = vps.filter(
    (vp) => !String(vp.narration_text || vp.narracao || "").trim()
  ).length;
  if (emptyNarr > Math.floor(vps.length * 0.25)) return false;

  return true;
}

export function needsVisualPromptsRepair(
  storyboard = {},
  { blockCount = 5, format = "LONGO" } = {}
) {
  const vps = storyboard.visual_prompts || [];
  if (!Array.isArray(vps) || vps.length === 0) return true;
  const emptyNarr = vps.filter(
    (vp) => !String(vp.narration_text || vp.narracao || "").trim()
  ).length;
  const emptyPrompt = vps.filter(
    (vp) => !String(vp.prompt || vp.visual_prompt || "").trim()
  ).length;
  if (emptyNarr > 0 || emptyPrompt > 0) return true;

  const blockPhrases = storyboard.technical_config?.block_phrases || [];
  const expectedBlocks =
    blockPhrases.length > 0 ? blockPhrases.length : blockCount;
  const uniqueBlocks = countUniqueVisualBlocks(vps);
  if (uniqueBlocks < expectedBlocks) return true;

  const minScenes =
    format === "SHORTS"
      ? Math.max(5, expectedBlocks)
      : Math.max(8, expectedBlocks);
  if (vps.length < Math.min(minScenes, expectedBlocks * 2)) return true;

  return false;
}

/** Remove durações inventadas pela IA — só mantém as gravadas pelo Whisper. */
export function sanitizeVisualPromptDurations(visualPrompts = []) {
  if (!Array.isArray(visualPrompts)) return [];
  return visualPrompts.map((vp) => {
    if (vp?.duration_from_whisper) return { ...vp };
    const next = { ...vp };
    delete next.duration;
    delete next.duration_seconds;
    delete next.duracao;
    delete next.duracaoSegundos;
    return next;
  });
}

/**
 * Normaliza block/scene nos visual_prompts e redistribui quando a IA
 * devolveu poucas cenas ou concentrou tudo em um único bloco.
 */
export function normalizeVisualPromptBlocks(
  parsedData = {},
  {
    blockCount = 5,
    format = "LONGO",
    ideaTitle = "",
    skipPromptEnrichment = false,
  } = {}
) {
  const result = { ...parsedData };
  const vps = Array.isArray(result.visual_prompts)
    ? [...result.visual_prompts]
    : [];
  if (!vps.length) return result;

  const blockPhrases = result.technical_config?.block_phrases || [];
  const expectedBlocks =
    blockPhrases.length > 0 ? blockPhrases.length : blockCount;

  let normalized = vps.map((vp, index) => {
    const block =
      parseBlockNumber(vp.block ?? vp.bloco, vp.scene ?? vp.cena) ??
      Math.min(
        expectedBlocks,
        Math.floor((index * expectedBlocks) / Math.max(vps.length, 1)) + 1
      );
    const sceneStr = String(vp.scene ?? vp.cena ?? "").trim();
    const sceneInBlock = sceneStr.match(new RegExp(`^${block}\\.(\\d+)$`));
    return {
      ...vp,
      block,
      scene: sceneInBlock ? sceneStr : `${block}.${index + 1}`,
    };
  });

  const uniqueBlocks = countUniqueVisualBlocks(normalized);
  const tooFewScenes =
    normalized.length < Math.max(expectedBlocks, format === "SHORTS" ? 5 : 8);
  const blocksCollapsed = uniqueBlocks < expectedBlocks;

  if (blocksCollapsed && normalized.length >= expectedBlocks) {
    const perBlock = Math.ceil(normalized.length / expectedBlocks);
    normalized = normalized.map((vp, index) => {
      const block = Math.min(expectedBlocks, Math.floor(index / perBlock) + 1);
      const sceneInBlock = (index % perBlock) + 1;
      return { ...vp, block, scene: `${block}.${sceneInBlock}` };
    });
  } else if (
    !skipPromptEnrichment &&
    (blocksCollapsed || tooFewScenes) &&
    String(result.narrative_script || "").trim()
  ) {
    const deterministic = buildDeterministicVisualPromptsFromNarration(
      result.narrative_script,
      {
        blockCount: expectedBlocks,
        format,
        ideaTitle,
      }
    );
    if (deterministic.length > 0) {
      result.visual_prompts = sanitizeVisualPromptDurations(
        enrichVisualPromptsSpecificity(
          enforceShortsVideoSceneMix(deterministic, { format }),
          { strategyTitle: ideaTitle }
        )
      );
      return result;
    }
  }

  const mixed = enforceShortsVideoSceneMix(normalized, { format });
  result.visual_prompts = sanitizeVisualPromptDurations(
    skipPromptEnrichment
      ? mixed
      : enrichVisualPromptsSpecificity(mixed, { strategyTitle: ideaTitle })
  );
  return result;
}

export function buildVisualPromptsFromNarrationPrompt({
  approvedNarration = "",
  format = "LONGO",
  blockCount = 5,
  isListicle = false,
  listicleRank = 20,
  listTopic = "",
  rankOrder = "desc",
  ideaTitle = "",
  existingPrompts = [],
}) {
  const skeleton =
    Array.isArray(existingPrompts) && existingPrompts.length > 0
      ? `\nESQUELETO DE CENAS (mantenha scene/block/type; PREENCHA narration_text e prompt em TODOS):\n${JSON.stringify(
          existingPrompts.map((vp) => ({
            scene: vp.scene,
            block: vp.block,
            type: vp.type || "imagem IA 2k",
          })),
          null,
          2
        ).slice(0, 6000)}`
      : "";

  return `Você é um Prompt Engineer especialista em criar prompts visuais hiper-detalhados e cinematográficos para YouTube (curiosidades históricas, engenharia, construções, fatos surpreendentes). A narração já foi aprovada pelo usuário — NÃO altere palavras da narração nos trechos das cenas.

TÍTULO: ${ideaTitle}
FORMATO: ${format}
BLOCOS: ${blockCount}${isListicle ? ` (LISTICLE TOP ${listicleRank}, ordem ${rankOrder === "asc" ? "1→N" : "N→1"}, tema: ${listTopic})` : ""}

NARRAÇÃO APROVADA (fonte única — copie trechos para narration_text):
"""
${approvedNarration.trim()}
"""
${skeleton}

${buildVisualPromptsRules({ format, isListicle, listicleRank })}

TAREFA: Gere visual_prompts cobrindo 100% da narração + technical_config com:
- script: narração dividida em ${blockCount} parágrafos (quebra de linha entre blocos)
- block_phrases: início exato de cada bloco (4-8 palavras)

Responda APENAS JSON:
{
  "visual_prompts": [ { "scene", "block", "narration_text", "type", "prompt", "editor_notes", "stock_query", "production": { "data_type": "location|stat_number|timeline_date|curiosity_punch|comparison|broll_only", "broll_type": "image|video", "remotion_hint": "counter|location-intro|bar-chart|timeline|kinetic-text|null" }, "directing_brief": { "dramatic_function", "camera_intent", "lighting_intent", "performance_intent", "sound_intent" }, "seedance_refs": { "identity", "motion", "camera", "audio", "style", "environment", "first_frame", "last_frame" } } ],
  "technical_config": {
    "script": "...",
    "block_phrases": [{"block": 1, "phrase": "..."}],
    "impact_texts": [],
    "highlight_keywords": [],
    "bgm_mappings": []
  }
}`;
}

export function mergeVisualPromptsRepair(original = {}, repaired = {}) {
  const merged = { ...original };
  if (
    Array.isArray(repaired.visual_prompts) &&
    repaired.visual_prompts.length > 0
  ) {
    merged.visual_prompts = repaired.visual_prompts;
  }
  if (repaired.technical_config) {
    merged.technical_config = {
      ...merged.technical_config,
      ...repaired.technical_config,
    };
  }
  return merged;
}

/**
 * Build a focused AI prompt to translate scene narrations into proper English visual prompts.
 * Used as intermediate fallback - lighter/faster than the full visual_prompts repair prompt.
 */
export function buildBatchScenePromptsAiRequest(
  scenes = [],
  { ideaTitle = "" } = {}
) {
  const sceneSummary = scenes.map((s) => ({
    scene: s.scene,
    narration: String(s.narration_text || "").slice(0, 300),
    type: s.type || "imagem IA 2k",
    has_text_overlay: !!(s.text_overlay || s.impact_text),
  }));

  return `You are an expert Prompt Engineer specialized in creating hyper-detailed, cinematic visual prompts for YouTube documentary videos. The niche/subject of the video can be anything (history, science, space, nature, technology, finance, philosophy, pop culture, life hacks, mystery, and infinite other subjects).

TITLE: ${ideaTitle}

Your goal is to translate abstract narration blocks into CONCRETE visual descriptions. What should the viewer physically see?

For EACH scene below, generate:
1. "prompt": A photorealistic visual description in ENGLISH following these MANDATORY rules:
   - NEVER be generic. NO placeholders ("a person", "an object", "illustrating this", "the subject").
   - Extract the core physical reality of the narration: describe specific items, models, settings, climates, periods, or entities related to it.
   - Specify: camera type/angle (low angle, tracking, aerial drone, macro, isometric), camera movement, lighting (golden hour, volumetric light, volumetric shadows, neon glow), textures (worn brick, rust, dust under light beams, skin pores, reflective glass), and atmosphere.
   - Esthetic: match the epoch or theme. Use film grain & classic lenses for old/period scenes. Use sharp, high-contrast, clean looks for modern, scientific, or tech scenes.
   - Slow down motion for heavy things: use "slow deliberate motion", "inch by inch" or "snail pace" to depict scale/weight.
   - Image: end with "photorealistic, 2K resolution, highly detailed".
   - Video: end with "photorealistic, highly detailed, 8K".
   - If has_text_overlay is true, append: "Any visible text must be in Portuguese (Brazilian)."
2. "stock_query": 2-5 words in English for stock footage search (e.g. "quantum computing server room", "1930s style vintage phone", "deep forest sunlight").
3. "editor_notes": Editing instructions (timing, transitions, text layout spacing).

SCENES:
${JSON.stringify(sceneSummary, null, 2)}

Respond ONLY with a JSON array:
[{ "scene": "1.1", "prompt": "...", "stock_query": "...", "editor_notes": "..." }]`;
}

/** Apply batch AI prompt responses back to scenes array. */
export function applyBatchScenePromptsAiResponse(scenes = [], aiScenes = []) {
  if (!Array.isArray(aiScenes) || aiScenes.length === 0) return scenes;
  const map = new Map();
  for (const ai of aiScenes) {
    if (ai?.scene && ai?.prompt) map.set(String(ai.scene), ai);
  }
  return scenes.map((s) => {
    const ai = map.get(String(s.scene));
    if (!ai) return s;
    return {
      ...s,
      prompt: String(ai.prompt || s.prompt || "").trim(),
      stock_query: String(ai.stock_query || s.stock_query || "").trim(),
      editor_notes: String(ai.editor_notes || s.editor_notes || "").trim(),
    };
  });
}

export function buildNarrationOnlyPrompt({
  niche,
  format,
  idea = {},
  isListicle = false,
  listicleRank = 20,
  listicleTopic = "",
  rankOrder = "desc",
  listicleBlockCount = 22,
  notebooklmContext = "",
  webResearchContext = "",
  cinematicNarrationRules = "",
}) {
  const ideaHeader = buildIdeaContextHeader({
    niche,
    format,
    idea,
    isListicle,
    listicleRank,
    listicleTopic,
    rankOrder,
    listicleBlockCount,
  });

  const userBlockCount =
    Array.isArray(idea?.blocks) && idea.blocks.length > 0
      ? idea.blocks.length
      : format === "SHORTS"
        ? 4
        : 8;

  const isPioneerNiche =
    idea?.pioneerNiche === true || Boolean(idea?.pioneerMeta);
  // Para pioneer-niche, o NotebookLM pode ter dados de projetos anteriores.
  // Usamos o contexto apenas como guia de estilo/humanização, não como fonte de fatos.
  const nlmBlock = notebooklmContext
    ? isPioneerNiche
      ? `\n[ESTILO/HUMANIZAÇÃO — use apenas como referência de tom e fluência, NÃO como fonte de fatos. Os fatos devem vir exclusivamente do tema descrito acima]:\n${notebooklmContext}\n`
      : notebooklmContext
    : "";

  return `Você é o "Lumiera Script Master" (Roteirista Profissional para YouTube).

${ideaHeader}
${nlmBlock}${webResearchContext}

FASE 1 — APENAS NARRAÇÃO (o usuário revisará e aprovará antes dos blocos visuais):

Gere SOMENTE a narração completa do vídeo em português brasileiro. NÃO gere visual_prompts, technical_config, list_items nem bgm ainda.

${SCRIPT_CREATIVE_REINFORCEMENT}

${
  isListicle
    ? buildListicleScriptRules({
        rankCount: listicleRank,
        rankOrder: rankOrder || "desc",
        format,
        listTopic: listicleTopic,
        blockCount: listicleBlockCount,
      })
    : buildFormatScriptRules(format)
}

${format === "SHORTS" && !isListicle ? VIRAL_SHORT_FORM_REINFORCEMENT : ""}

${cinematicNarrationRules}

REGRAS DESTA FASE:
- HUMANIZE: escreva como narração FALADA — alguém contando ao vivo para um amigo curioso. Frases que soam bem em voz alta.
- RESUMA AO MÁXIMO: cada palavra deve carregar informação. Corte adjetivos vazios, repetições e frases que não avançam a mensagem.
- CLAREZA: o telespectador precisa entender a tese do vídeo e cada item do ranking na primeira escuta — sem jargão sem explicação.
- Revise cada frase: elimine tom robótico, clichês de IA, tom de redação escolar e trechos desconexos.
- Formato: "${format}"${isListicle ? ` — LISTICLE TOP ${listicleRank}` : ""}.
- ${
    isListicle
      ? `Estruture em ${listicleBlockCount} blocos (intro + ${listicleRank} itens + outro). ${format === "SHORTS" && listicleRank <= 3 ? "Top 3 Short: máximo ~90 palavras, 1 fato forte por item." : ""}`
      : format === "SHORTS"
        ? `SHORTS: use EXATAMENTE ${userBlockCount} blocos. Narração TOTAL: 80-130 palavras. Cada bloco = 1 a 3 frases curtas (máx. 12 palavras cada). NÃO ultrapasse 130 palavras. NÃO invente fatos fora do tema descrito acima.`
        : `LONGO: use EXATAMENTE ${userBlockCount} blocos. 10-20 minutos, 1500-3000 palavras. Explore profundamente o tema.`
  }
- Escreva BLOCO A BLOCO primeiro (frases curtas, 1 ideia por bloco), depois una em narrative_script.
- Se houver pesquisa NotebookLM acima, priorize fatos verificáveis dela — estilo documental brasileiro enxuto.

Responda APENAS JSON válido (sem markdown):
{
  "strategy": {
    "title_main": "Título específico ao tema",
    "hook": "Gancho de 3 segundos",
    "target_audience": "Público-alvo",
    "tone": "Tom do vídeo"
  },
  "narrative_script": "Narração COMPLETA em texto corrido, SEM marcadores de áudio.",
  "narrative_script_tagged": "A MESMA narração com tags de performance ([pausa], [ênfase], (breath), etc.)",
  "technical_config": {
    "script": "Narração dividida em parágrafos — um parágrafo por bloco, separados por quebra dupla de linha.",
    "block_phrases": [{"block": 1, "phrase": "início exato do bloco (4-8 palavras)"}]
  }
}`;
}

export function buildFullScriptFromNarrationPrompt({
  niche,
  format,
  idea = {},
  isListicle = false,
  listicleRank = 20,
  listicleTopic = "",
  rankOrder = "desc",
  listicleBlockCount = 22,
  approvedNarration = "",
  approvedNarrationTagged = "",
  notebooklmContext = "",
  webResearchContext = "",
  titleCraftRules = "",
  epidemicMoodPrompt = "",
}) {
  const ideaHeader = buildIdeaContextHeader({
    niche,
    format,
    idea,
    isListicle,
    listicleRank,
    listicleTopic,
    rankOrder,
    listicleBlockCount,
  });

  const taggedBlock = approvedNarrationTagged?.trim()
    ? `\nNARRAÇÃO COM TAGS (use se ainda válida após edições do usuário):\n"""\n${approvedNarrationTagged.trim()}\n"""`
    : "\nGere narrative_script_tagged a partir da narração aprovada com tags cinematográficas moderadas.";

  return `Você é o "Lumiera Script Master" (Roteirista, Diretor Criativo e Editor para YouTube).

${ideaHeader}
${notebooklmContext}${webResearchContext}

FASE 2 — ROTEIRO COMPLETO (narração já aprovada pelo usuário):

A narração abaixo foi REVISADA e APROVADA. Use o texto EXATO em "narrative_script" — NÃO reescreva, NÃO resuma, NÃO altere palavras.
Monte blocos, prompts visuais, trilha e configuração técnica ANCORADOS nesta narração.

NARRAÇÃO APROVADA:
"""
${approvedNarration.trim()}
"""
${taggedBlock}

${SCRIPT_CREATIVE_REINFORCEMENT}

${
  isListicle
    ? buildListicleScriptRules({
        rankCount: listicleRank,
        rankOrder: rankOrder || "desc",
        format,
        listTopic: listicleTopic,
        blockCount: listicleBlockCount,
      })
    : buildFormatScriptRules(format)
}

${titleCraftRules}

${epidemicMoodPrompt}

SUA MISSÃO:
- narrative_script e narrative_script_tagged = narração aprovada (tagged pode ser gerada/atualizada se o usuário editou só o texto limpo).
- DIVIDA a narração em segmentos e gere visual_prompts cobrindo 100% do texto — TODOS os campos narration_text e prompt PREENCHIDOS.
- technical_config.script = narração dividida em ${listicleBlockCount} parágrafos (um por bloco).
- ${
    isListicle
      ? `EXATAMENTE ${listicleBlockCount} blocos (intro + ${listicleRank} itens + outro). Gere list_items e listicle.`
      : `Estruture em ${format === "SHORTS" ? "5" : "12"} blocos lógicos em block_phrases.`
  }

${buildVisualPromptsRules({ format, isListicle, listicleRank })}

FORMATO DE RESPOSTA — JSON válido com:
1. "strategy" (title_main, title_variations, hook, target_audience, tone, pinned_comment, cta)
2. "narrative_script" (texto aprovado, idêntico)
3. "narrative_script_tagged"
${buildVisualPromptsJsonSchema({ blockCount: listicleBlockCount, isListicle, listicleRank })}
5. "bgm_recommendations"
6. "editing_map"
7. "hyperframe_prompt"
${buildChecklistSchemaBlock()}
9. "technical_config" (script, block_phrases, impact_texts, highlight_keywords, bgm_mappings)
${isListicle ? `10. "listicle" e 11. "list_items" (${listicleRank} itens)` : ""}

REGRAS FINAIS:
- Retorne APENAS JSON puro, sem markdown.
- visual_prompts deve cobrir TODA a narração sem lacunas e sem campos vazios.`;
}

/** Fase 2 enxuta — só montagem técnica; narração já aprovada (menor resposta = menos truncamento no Gemini browser). */
export function buildCreatorPhase2Prompt(ctx = {}) {
  const {
    niche,
    format,
    idea = {},
    isListicle = false,
    listicleRank = 20,
    listicleTopic = "",
    rankOrder = "desc",
    listicleBlockCount = 22,
    approvedNarration = "",
    approvedNarrationTagged = "",
    existingStrategy = {},
    notebooklmContext = "",
    webResearchContext = "",
    epidemicMoodPrompt = "",
  } = ctx;

  const ideaHeader = buildIdeaContextHeader({
    niche,
    format,
    idea,
    isListicle,
    listicleRank,
    listicleTopic,
    rankOrder,
    listicleBlockCount,
  });

  const strategySeed =
    existingStrategy?.title_main || existingStrategy?.hook
      ? `\nESTRATÉGIA DA FASE 1 (reutilize e complete se faltar campo):\n${JSON.stringify(existingStrategy, null, 2).slice(0, 2500)}`
      : "";

  const taggedBlock = approvedNarrationTagged?.trim()
    ? `\nNARRAÇÃO COM TAGS:\n"""\n${approvedNarrationTagged.trim()}\n"""`
    : "";

  return `Você é o Lumiera Script Master — FASE 2: montar roteiro técnico.

${ideaHeader}
${notebooklmContext}${webResearchContext}${strategySeed}

A narração abaixo foi APROVADA — copie EXATAMENTE em narrative_script (não reescreva).

NARRAÇÃO APROVADA:
"""
${approvedNarration.trim()}
"""
${taggedBlock}

${buildVisualPromptsRules({ format, isListicle, listicleRank })}
${epidemicMoodPrompt}

TAREFA: Gere APENAS a estrutura técnica ancorada na narração.
- visual_prompts: cubra 100% da narração (${format === "SHORTS" ? "5-12" : "25-50"} cenas mínimo)
- technical_config.script: ${listicleBlockCount} parágrafos (um por bloco)
${isListicle ? `- listicle + list_items com EXATAMENTE ${listicleRank} itens` : ""}

Responda APENAS JSON válido (sem markdown) com:
1. "strategy" (title_main, title_variations[3], hook, target_audience, tone, pinned_comment, cta)
2. "narrative_script" (idêntico à narração aprovada)
3. "narrative_script_tagged"
${buildVisualPromptsJsonSchema({ blockCount: listicleBlockCount, isListicle, listicleRank })}
5. "bgm_recommendations" (um por bloco)
6. "editing_map"
7. "hyperframe_prompt"
${buildChecklistSchemaBlock()}
9. "technical_config"
${isListicle ? `10. "listicle" e 11. "list_items" (${listicleRank} itens)` : ""}`;
}

/** Roteiro completo em uma fase (narração + visual_prompts + technical_config). */
export function buildCreatorFullScriptPrompt(ctx = {}) {
  const {
    niche,
    format,
    idea = {},
    isListicle = false,
    listicleRank = 20,
    listicleTopic = "",
    rankOrder = "desc",
    listicleBlockCount = 22,
    notebooklmContext = "",
    webResearchContext = "",
    cinematicNarrationRules = "",
    titleCraftRules = "",
    epidemicMoodPrompt = "",
  } = ctx;

  const ideaHeader = buildIdeaContextHeader({
    niche,
    format,
    idea,
    isListicle,
    listicleRank,
    listicleTopic,
    rankOrder,
    listicleBlockCount,
  });

  let customAddendum = "";
  if (idea.isCustom) {
    customAddendum += `\n\nATENÇÃO: A ideia original, os ganchos e a estrutura fornecida pelo usuário podem estar em português ou inglês. O roteiro gerado e a narração devem ser obrigatoriamente em Português do Brasil (PT-BR) de forma extremamente natural, humanizada, fluida e cativante — estilo UGC falado (skill ugc-scriptwriter). Fechamento DECLARATIVO; proibido "Você prefere…?" ou perguntas vazias de comentário. No entanto, os ganchos visuais ("visual_prompts") e termos de busca ('prompt' e 'stock_query') devem permanecer em inglês para manter a compatibilidade com a geração de assets.`;
    const customHookVal = idea.hook || idea.hooks || "";
    const pioneerMode =
      idea.pioneerNiche ||
      isPioneerStrategyText(idea.title) ||
      isPioneerStrategyText(idea.promise) ||
      isPioneerStrategyText(customHookVal) ||
      /TEMA DO VÍDEO/i.test(String(idea.promise || ""));
    if (pioneerMode) {
      customAddendum += `\n\nMODO NICHO PIONEIRO: O vídeo deve ser SOBRE O TEMA/ÂNGULO descrito na promessa (fatos, história, objeto, fenômeno real). PROIBIDO fazer vídeo sobre "nicho virgem", saturação de mercado, gap de pontos, como encontrar nichos no YouTube, "farsa do mercado saturado" ou estratégia de criador. Se a promessa tiver "Contexto estratégico", use só como nota interna — não vire isso no roteiro.`;
    }
    if (webResearchContext) customAddendum += webResearchContext;
  }

  const formatRules = isListicle
    ? buildListicleScriptRules({
        rankCount: listicleRank,
        rankOrder: rankOrder || "desc",
        format,
        listTopic: listicleTopic,
        blockCount: listicleBlockCount,
      })
    : buildFormatScriptRules(format);

  const titleRules =
    titleCraftRules ||
    buildTitleCraftRules(format === "SHORTS" ? "SHORT" : "LONG");
  const cinemaRules = cinematicNarrationRules || buildCinematicNarrationRules();
  const moodPrompt =
    epidemicMoodPrompt ||
    buildEpidemicMoodPrompt(
      niche,
      {
        niche,
        content_mode: isListicle ? "LISTICLE" : undefined,
        list_topic: listicleTopic,
      },
      { listicle: { topic: listicleTopic } }
    );

  const userBlockCount =
    Array.isArray(idea?.blocks) && idea.blocks.length > 0
      ? idea.blocks.length
      : format === "SHORTS"
        ? 4
        : 8;
  const blockStructureRule = isListicle
    ? `MODO LISTICLE ATIVO: use EXATAMENTE ${listicleBlockCount} blocos (intro + ${listicleRank} itens + outro). Cada item = 1 bloco. Não resuma vários itens no mesmo bloco.`
    : `ESTRUTURA OBRIGATÓRIA: use EXATAMENTE ${userBlockCount} blocos na narração e em 'technical_config.block_phrases' — esse é o número definido pelo usuário. NÃO adicione nem remova blocos. Cada bloco deve cobrir o conteúdo descrito na Estrutura/Ganchos por Bloco fornecida acima.`;

  const durationRule = isListicle
    ? `LISTICLE: ${listicleBlockCount} blocos obrigatórios. Tempo estimado: ${format === "SHORTS" ? (listicleRank >= 5 ? "45-60 segundos" : "35-50 segundos") : `${Math.round(listicleRank * 0.75)}-${Math.round(listicleRank * 1.2)} minutos`}. Um item por bloco, ordem ${rankOrder === "asc" ? "crescente" : "decrescente"}.`
    : format === "SHORTS"
      ? `SHORTS: 30-50 segundos, ${userBlockCount} blocos. Narração TOTAL: 80-130 palavras. Cada bloco = 1 frase curta a 3 frases no máximo. Frases de até 12 palavras. NÃO ultrapasse 130 palavras no total.`
      : "LONGO: O roteiro DEVE ser muito profundo, detalhado e extenso. O tempo de vídeo ideal é de 10 a 20 minutos (1500 a 3000 palavras). Explore cada detalhe do assunto ao máximo, traga histórias, metáforas, contexto histórico, dados e crie uma narrativa imersiva. NUNCA faça um roteiro superficial ou curto.";

  const visualTypeMix =
    format === "SHORTS"
      ? `- SHORTS: mínimo ${SHORTS_MIN_VIDEO_SCENES} cenas com type "${SHORTS_VIDEO_SCENE_TYPE}" — gancho (cena 1), virada (meio) e payoff (final) devem ter movimento ativo. Distribua os vídeos ao longo do Short; não concentre todos no fim.
- SHORTS: demais cenas = "imagem IA 2k" (photorealistic 2k, Ken Burns).`
      : `- 80-90% devem ser IMAGEM IA 2K (photorealistic 2k resolution, cinematic, para usar com efeito Ken Burns zoom lento).
- 10-20% devem ser VÍDEO IA (máximo estrito de 10 segundos, apenas para movimento ativo: água, fogo, multidão, câmera em movimento).`;

  const aspectRule =
    format === "SHORTS"
      ? "Composição vertical 9:16, framing apertado, sujeito centralizado ou em terços superiores/inferiores."
      : "Composição widescreen 16:9, shots amplos ou pans horizontais quando apropriado, profundidade de campo cinematográfica.";

  const listicleJsonTail = isListicle
    ? `
10. "listicle": {
   "content_mode": "LISTICLE",
   "rank_count": ${listicleRank},
   "rank_order": "${rankOrder === "asc" ? "asc" : "desc"}",
   "topic": "${String(listicleTopic).replace(/"/g, '\\"')}"
}
11. "list_items": [
   { "rank": ${listicleRank}, "title": "nome do item", "year": "ano", "origin": "país", "block": 2, "hook_line": "gancho", "visual_hook": "english stock term" }
]`
    : "";

  return `Você é o "Lumiera Script Master" (Roteirista Profissional, Estrategista de Retenção, Diretor Criativo e Editor de Vídeos para YouTube).

${ideaHeader}${customAddendum}
${notebooklmContext}

SUA MISSÃO PRINCIPAL:

Crie um roteiro COMPLETO de narração para o vídeo e DIVIDA TODA a narração em segmentos sequenciais. Para CADA segmento da narração, gere um prompt visual correspondente (imagem 2K ou vídeo IA máx 10s). A narração inteira deve ser coberta — sem lacunas. Se precisar de 50, 80 ou 100 segmentos, gere todos. O array "visual_prompts" É o roteiro do vídeo.

${SCRIPT_CREATIVE_REINFORCEMENT}

${formatRules}

${titleRules}

${cinemaRules}

${moodPrompt}

Reforco especifico para montagem do roteiro:

- A MENSAGEM CENTRAL deve estar clara na promessa da ideia ("${idea.promise || ""}"). Cada bloco aproxima o espectador dessa compreensão.
- Preserve exatamente o formato JSON solicitado abaixo (com todas as chaves, incluindo 'technical_config').
- ${blockStructureRule}
- Nao reduza a cobertura visual: o array visual_prompts continua cobrindo toda a narracao, como o programa ja espera.

Regras do Roteiro:

1. Pesquise internamente o nicho (tendências, dores, desejos, medos, polêmicas, curiosidades).
2. Não repita temas de vídeos anteriores.
3. Prenda a atenção nos primeiros 3 segundos.
4. Use open loop, curiosidade progressiva, microcliffhangers e payoff final.
5. Narração em português brasileiro: deve ser extremamente humana, fluida, natural, carismática e cheia de vida.
6. Formato: "${format}"${isListicle ? ` — LISTICLE TOP ${listicleRank}` : ""}.
   ${durationRule}

${buildVisualPromptsRules({ format, isListicle, listicleRank })}

${visualTypeMix}

- Prompts variados: close-ups, planos abertos, aéreas, texturas, detalhes, paisagens, mapas, infográficos visuais.
- Nunca coloque texto dentro dos prompts visuais.
- Cada prompt deve ter um stock_query para busca em Pexels/Pixabay/Canva.
- REGRA INQUEBRÁVEL DE TEXTO PT-BR: Se a cena incluir text_overlay, impact_text, rótulo, número, display ou QUALQUER texto visível na imagem/vídeo, adicione ao final do prompt: "Todo e qualquer texto, rótulo, número, inscrição, legenda, display ou elemento visível e legível na imagem ou vídeo deve estar escrito em português do Brasil."
- COMPOSIÇÃO DE ASPECTO: ${aspectRule}
${isListicle ? `- LISTICLE: inclua "text_overlay" em toda primeira cena de cada item (ex: "#15 — PÓLVORA").` : ""}

FORMATO DE RESPOSTA - JSON válido com estas propriedades:

1. "strategy": { "title_main", "title_variations" (5), "hook", "target_audience", "tone", "pinned_comment", "cta" }
2. "narrative_script": narração COMPLETA em texto corrido (limpa, sem tags).
3. "narrative_script_tagged": mesma narração com tags de áudio ([pause], (breath), <break time="1.5s"/>, etc.).
${buildVisualPromptsJsonSchema({ blockCount: listicleBlockCount, isListicle, listicleRank })}
5. "bgm_recommendations": [ um objeto por bloco com "block", "recommendation", "search_theme" ]
6. "editing_map"
7. "hyperframe_prompt"
${buildChecklistSchemaBlock()}
9. "technical_config": { "script", "block_phrases", "impact_texts", "highlight_keywords", "bgm_mappings" }
${listicleJsonTail}

REGRAS FINAIS:

- Retorne APENAS JSON puro, sem markdown, sem explicações.
- O JSON deve ser 100% válido. Escape aspas internas com barra invertida.
- O array visual_prompts deve cobrir TODA a narração sem lacunas.
- NÃO inclua "duration" nos visual_prompts — os segundos de cada cena vêm do Whisper após a narração.
- Gere quantas cenas forem necessárias (${isListicle ? `${listicleRank * 3}+ para listicle` : "40-80+ para Longo, 5-10 para Shorts"}).`;
}

export function extractNarrativeScriptFromRaw(responseText = "") {
  const raw = String(responseText || "");
  const patterns = [
    /"narrative_script"\s*:\s*"([\s\S]*?)"\s*,\s*"narrative_script_tagged"/i,
    /"narrative_script"\s*:\s*"((?:\\.|[^"\\])*)"/i,
    /'narrative_script'\s*:\s*'((?:\\.|[^'\\])*)'/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (!m?.[1]) continue;
    const decoded = m[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .trim();
    if (decoded.length >= 40) return decoded;
  }
  return "";
}

export function enrichBrowserVisualPromptsParsed(
  parsed = {},
  responseText = ""
) {
  const out = { ...parsed };
  const current = Array.isArray(out.visual_prompts) ? out.visual_prompts : [];
  const salvaged = salvageScriptJson(responseText) || {};
  const salvagedVps = Array.isArray(salvaged.visual_prompts)
    ? salvaged.visual_prompts
    : [];

  const pickBetter = (a, b) => {
    if (browserVisualPromptsUsable(a)) return a;
    if (browserVisualPromptsUsable(b)) return b;
    return b.length >= a.length ? b : a;
  };

  const best = pickBetter(current, salvagedVps);
  if (best.length) out.visual_prompts = best;

  return out;
}

export function enrichBrowserNarrationParsed(parsed = {}, responseText = "") {
  const out = { ...parsed };
  const current = String(out.narrative_script || "").trim();
  const salvaged = salvageScriptJson(responseText) || {};
  const salvagedNarr = String(salvaged.narrative_script || "").trim();
  const extracted = extractNarrativeScriptFromRaw(responseText);
  const techScript =
    typeof out.technical_config?.script === "string"
      ? out.technical_config.script.trim()
      : "";

  const best =
    [current, salvagedNarr, extracted, techScript].sort(
      (a, b) => b.length - a.length
    )[0] || "";

  if (best.length > current.length) out.narrative_script = best;

  const tagged = String(
    out.narrative_script_tagged || salvaged.narrative_script_tagged || ""
  ).trim();
  if (tagged.length > 40) out.narrative_script_tagged = tagged;
  else if (best.length > 80 && !out.narrative_script_tagged)
    out.narrative_script_tagged = best;

  if (!out.strategy && salvaged.strategy) out.strategy = salvaged.strategy;
  if (!out.technical_config && salvaged.technical_config)
    out.technical_config = salvaged.technical_config;

  return out;
}

export function salvageScriptJson(responseText = "") {
  const raw = String(responseText || "").trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(extractJsonCandidateForSalvage(raw));
    if (String(parsed?.narrative_script || "").trim().length >= 40)
      return parsed;
  } catch {
    /* try partial */
  }
  const out = {};
  const strategyMatch = raw.match(
    /"strategy"\s*:\s*(\{[\s\S]*?\})\s*,\s*"(?:narrative_script|visual_prompts)"/
  );
  if (strategyMatch) {
    try {
      out.strategy = JSON.parse(strategyMatch[1]);
    } catch {
      /* ignore */
    }
  }
  const extractedNarr = extractNarrativeScriptFromRaw(raw);
  if (extractedNarr) out.narrative_script = extractedNarr;
  const narrMatch = raw.match(/"narrative_script"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (narrMatch && !out.narrative_script) {
    try {
      out.narrative_script = JSON.parse(`"${narrMatch[1]}"`);
    } catch {
      out.narrative_script = narrMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"');
    }
  }
  const taggedMatch = raw.match(
    /"narrative_script_tagged"\s*:\s*"((?:\\.|[^"\\])*)"/
  );
  if (taggedMatch) {
    try {
      out.narrative_script_tagged = JSON.parse(`"${taggedMatch[1]}"`);
    } catch {
      out.narrative_script_tagged = taggedMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"');
    }
  }
  const techMatch = raw.match(/"technical_config"\s*:\s*(\{[\s\S]*\})\s*\}?/);
  if (techMatch) {
    try {
      out.technical_config = JSON.parse(techMatch[1].replace(/,\s*$/g, ""));
    } catch {
      /* ignore */
    }
  }
  const vpMatch = raw.match(/"visual_prompts"\s*:\s*(\[[\s\S]*)/);
  if (vpMatch) {
    try {
      let arrText = vpMatch[1];
      const open = (arrText.match(/\[/g) || []).length;
      const close = (arrText.match(/\]/g) || []).length;
      for (let i = 0; i < open - close; i++) arrText += "]";
      out.visual_prompts = JSON.parse(arrText);
    } catch {
      /* ignore */
    }
  }
  return Object.keys(out).length ? out : null;
}

function extractJsonCandidateForSalvage(text) {
  const candidate = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = candidate.search(/[\[{]/);
  if (start < 0) return candidate;
  let slice = candidate.slice(start);
  const openBraces =
    (slice.match(/\{/g) || []).length - (slice.match(/\}/g) || []).length;
  const openBrackets =
    (slice.match(/\[/g) || []).length - (slice.match(/\]/g) || []).length;
  for (let i = 0; i < openBrackets; i++) slice += "]";
  for (let i = 0; i < openBraces; i++) slice += "}";
  return slice;
}

export function buildDeterministicVisualPromptsFromNarration(
  approvedNarration = "",
  { blockCount = 12, format = "LONGO", ideaTitle = "" } = {}
) {
  const text = String(approvedNarration || "").trim();
  if (!text) return [];
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  const resolveSceneStockQuery = (scene) =>
    resolveStockSearchQuery(scene, { strategyTitle: ideaTitle });
  if (!sentences.length) {
    const narration_text = text.slice(0, 280);
    const sceneDraft = {
      scene: "1.1",
      block: 1,
      narration_text,
      type: "imagem IA 2k",
      editor_notes: "Ken Burns zoom in",
    };
    const prompt = buildSceneSpecificPrompt(sceneDraft);
    const singleScene = [
      {
        ...sceneDraft,
        prompt,
        stock_query: resolveSceneStockQuery(
          { ...sceneDraft, prompt },
          { strategyTitle: ideaTitle }
        ),
      },
    ];
    return enrichVisualPromptsSpecificity(
      enforceShortsVideoSceneMix(singleScene, { format }),
      { strategyTitle: ideaTitle }
    );
  }
  const targetScenes =
    format === "SHORTS"
      ? Math.min(12, Math.max(5, sentences.length))
      : Math.min(50, Math.max(20, sentences.length));
  const perScene = Math.max(1, Math.ceil(sentences.length / targetScenes));
  const vps = [];
  let block = 1;
  let sceneInBlock = 1;
  for (let i = 0; i < sentences.length; i += perScene) {
    const chunk = sentences.slice(i, i + perScene).join(" ");
    const sceneDraft = {
      scene: `${block}.${sceneInBlock}`,
      block,
      narration_text: chunk,
      type: "imagem IA 2k",
      editor_notes: "Ken Burns zoom in",
    };
    const prompt = buildSceneSpecificPrompt(sceneDraft);
    vps.push({
      ...sceneDraft,
      prompt,
      stock_query: resolveSceneStockQuery(
        { ...sceneDraft, prompt },
        { strategyTitle: ideaTitle }
      ),
    });
    sceneInBlock += 1;
    if (sceneInBlock > Math.max(2, Math.ceil(blockCount / 4))) {
      block += 1;
      sceneInBlock = 1;
    }
  }
  return enrichVisualPromptsSpecificity(
    enforceShortsVideoSceneMix(vps, { format }),
    { strategyTitle: ideaTitle }
  );
}

export function buildNarrationHumanizeRepairPrompt({
  format,
  ideaTitle,
  narrative_script = "",
  narrative_script_tagged = "",
  blockCount = 12,
  isListicle = false,
  listicleRank = 20,
  listTopic = "",
} = {}) {
  const wordCeiling =
    format === "SHORTS"
      ? isListicle && listicleRank <= 3
        ? 95
        : isListicle
          ? 150
          : 130
      : null;

  const listicleNote = isListicle
    ? `
MODO LISTICLE TOP ${listicleRank}${listTopic ? ` — "${listTopic}"` : ""}:
- Mantenha TODOS os ${listicleRank} itens do ranking na ordem correta — não pule nem funda itens.
- Por item: nome + 1 fato forte + impacto em 1 frase. Proibido empilhar vários fatos no mesmo item.
- Transições orais curtas entre itens ("Agora o #2", "E em primeiro lugar...").
${wordCeiling ? `- TETO: ${wordCeiling} palavras no total. Se passar, CORTE até caber — priorize clareza sobre volume.` : ""}`
    : "";

  return `Você é um roteirista brasileiro especialista em narração natural, enxuta e clara para YouTube.

A narração abaixo pode estar robótica, longa demais ou confusa. REESCREVA apenas os campos de narração.

FORMATO: ${format}
TÍTULO: ${ideaTitle}
BLOCOS ESPERADOS (estrutura mental): ${blockCount}
${listicleNote}

NARRAÇÃO ATUAL:
${JSON.stringify({ narrative_script, narrative_script_tagged }, null, 2).slice(0, 10000)}

OBJETIVO: deixar a narração O MAIS RESUMIDA POSSÍVEL sem perder clareza — o telespectador deve compreender a mensagem do vídeo na primeira escuta.

TAREFAS:
1. Reescreva "narrative_script" em PT-BR natural e HUMANO — como quem CONTA ao vivo, não quem LÊ um texto.
2. ENXUGUE: remova adjetivos vazios, repetições, frases de preenchimento e explicações redundantes. 1 fato forte > 3 fatos fracos.
3. Mantenha nomes, datas, números e o nome de cada item do ranking (âncoras de credibilidade).
4. Frases curtas (maioria com até 12 palavras). Uma ideia por frase.
5. Reescreva "narrative_script_tagged" com as MESMAS palavras + tags ([pause], (breath), [pausa], [ênfase], [rápido], [lento]).
6. Mantenha a tese e a estrutura; remova clichês de IA ("neste vídeo", "prepare-se", "incrível" sem prova).
7. FINAL: frase declarativa (mic drop) — remova perguntas vazias ("Você prefere…?", "Comenta aí").

${UGC_SCRIPTWRITER_REINFORCEMENT}

Responda APENAS JSON:
{
  "narrative_script": "...",
  "narrative_script_tagged": "..."
}`;
}

export function mergeHumanizedNarration(
  original = {},
  repaired = {},
  format = "LONGO"
) {
  const merged = { ...original };
  if (repaired.narrative_script)
    merged.narrative_script = repaired.narrative_script;
  if (repaired.narrative_script_tagged)
    merged.narrative_script_tagged = repaired.narrative_script_tagged;
  return applyScriptTextQuality(merged, format);
}

export function mergeEnrichedNarration(
  original = {},
  enriched = {},
  format = "LONGO"
) {
  const merged = mergeHumanizedNarration(original, enriched, format);
  if (enriched.strategy && typeof enriched.strategy === "object") {
    merged.strategy = { ...merged.strategy, ...enriched.strategy };
  }
  if (
    enriched.technical_config &&
    typeof enriched.technical_config === "object"
  ) {
    merged.technical_config = {
      ...merged.technical_config,
      ...enriched.technical_config,
    };
  }
  return merged;
}

export function normalizeNarrationBlocks(parsedData = {}, expectedBlocks = 5) {
  const result = { ...parsedData };
  const tc = { ...(result.technical_config || {}) };

  if (Array.isArray(tc.script)) {
    tc.script = tc.script
      .map((p) => String(p).trim())
      .filter(Boolean)
      .join("\n\n");
  }

  let paragraphs =
    typeof tc.script === "string"
      ? tc.script
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

  if (!paragraphs.length && result.narrative_script?.trim()) {
    const sentences = result.narrative_script.trim().split(/(?<=[.!?…])\s+/);
    if (expectedBlocks > 1 && sentences.length >= expectedBlocks) {
      const perBlock = Math.ceil(sentences.length / expectedBlocks);
      paragraphs = [];
      for (let i = 0; i < expectedBlocks; i += 1) {
        const chunk = sentences
          .slice(i * perBlock, (i + 1) * perBlock)
          .join(" ")
          .trim();
        if (chunk) paragraphs.push(chunk);
      }
    }
  }

  if (paragraphs.length && !result.narrative_script?.trim()) {
    result.narrative_script = paragraphs.join(" ");
  }

  if (paragraphs.length) {
    tc.script = paragraphs.join("\n\n");
    if (!Array.isArray(tc.block_phrases) || !tc.block_phrases.length) {
      tc.block_phrases = paragraphs.map((p, i) => ({
        block: i + 1,
        phrase: p.split(/\s+/).slice(0, 6).join(" "),
      }));
    }
  }

  if (
    Array.isArray(tc.block_phrases) &&
    tc.block_phrases.length > expectedBlocks
  ) {
    tc.block_phrases = tc.block_phrases.slice(0, expectedBlocks);
  }

  result.technical_config = tc;
  return result;
}

// ---------------------------------------------------------------------------
// Visual Prompt Engineer — Premium reprocessing
// ---------------------------------------------------------------------------

const NICHE_STYLE_MAP = {
  mystery:
    "Dark cinematic mood, deep shadows, volumetric lighting, warm gold accents, mysterious atmosphere, heavy realistic textures (oxidized bronze, ancient clay, forged steel)",
  true_crime:
    "Dark moody cinematic, high contrast, cold blue shadows, tense atmosphere, forensic detail, noir lighting",
  history:
    "Period-accurate cinematic, film grain, classic lenses, warm amber lighting for ancient scenes, cool steel for modern, rich textures of the era",
  science:
    "Clean modern cinematic, bright precise lighting with color accents, sharp detail, scientific visualization, volumetric light beams",
  pets: "Vibrant warm colors, soft cheerful lighting, expressive close-ups, playful atmosphere, shallow depth of field on animal features",
  luxury:
    "Premium cinematic, golden hour lighting, rich textures (leather, marble, chrome), heroic camera angles, sophisticated composition",
  motivation:
    "Epic inspirational, golden light, powerful compositions, silhouette shots, dramatic sky backgrounds, warm tones",
  horror:
    "Dark disturbing, high contrast, cold blue/red tones, deep shadows, unsettling angles, grain and noise, tension-building lighting",
  finance:
    "Luxurious clean, elegant lighting, wealth visual elements (gold, graphs, modern offices), sophisticated compositions, premium feel",
  geography:
    "Epic landscape cinematography, aerial drone shots, green/earth tones, clean sans-serif layout spaces, natural lighting",
  tech: "Premium dark backgrounds, neon-accented glows, code mockups/terminals, precise numeric counters, sharp modern aesthetics",
  food: "Warm appetizing lighting, macro close-ups, steam/texture detail, vibrant saturated colors, shallow depth of field",
  sports:
    "Dynamic action cinematography, fast motion, dramatic lighting, stadium atmospheres, freeze-frame moments",
  default:
    "Cinematic documentary style, dramatic lighting, sharp detail, photorealistic textures, professional composition",
};

export function detectNicheFromContent(
  strategy = {},
  narrative = "",
  hyperframe = ""
) {
  const text = [
    strategy.title_main,
    strategy.hook,
    strategy.tone,
    strategy.target_audience,
    narrative.slice(0, 2000),
    hyperframe,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /\b(true.?crime|assassin|serial.?killer|desaparec|murder|forensic|csi)\b/i.test(
      text
    )
  )
    return "true_crime";
  if (
    /\b(horror|creepy|assombr|fantasma|demon|ghost|terror|medo|noite.?escura)\b/i.test(
      text
    )
  )
    return "horror";
  if (
    /\b(mistério|mystery|enigma|antiq|históri|ancient|civiliza|arqueolog|ruína|artifact)\b/i.test(
      text
    )
  )
    return "mystery";
  if (
    /\b(histór|history|guerra|war|impér|empire|revolução|revolution|século|century)\b/i.test(
      text
    )
  )
    return "history";
  if (
    /\b(ciência|science|físic|physics|químic|chemistry|biolog|experiment|quantum)\b/i.test(
      text
    )
  )
    return "science";
  if (
    /\b(pet|cachorro|gato|dog|cat|animal|fofo|cute|filhote|puppy|kitten)\b/i.test(
      text
    )
  )
    return "pets";
  if (
    /\b(luxo|luxury|mansão|mansion|ferrari|lamborghini|supercar|imóvel|yacht|rolex)\b/i.test(
      text
    )
  )
    return "luxury";
  if (
    /\b(motivaç|motivation|sucesso|success|mentalidade|mindset|inspiração|empreend)\b/i.test(
      text
    )
  )
    return "motivation";
  if (
    /\b(finanç|finance|dinheiro|money|investimento|invest|bitcoin|cripto|renda|salário)\b/i.test(
      text
    )
  )
    return "finance";
  if (
    /\b(geografi|geography|país|country|mapa|map|continent|ocean|montanha|desert)\b/i.test(
      text
    )
  )
    return "geography";
  if (
    /\b(tech|tecnolog|ia |\bai\b|robot|comput|software|hardware|program|code|server)\b/i.test(
      text
    )
  )
    return "tech";
  if (
    /\b(comida|food|receita|recipe|cozinha|kitchen|chef|gastrono|sabor|ingrediente)\b/i.test(
      text
    )
  )
    return "food";
  if (
    /\b(esporte|sport|futebol|soccer|basketball|atleta|olimp|campeon)\b/i.test(
      text
    )
  )
    return "sports";
  return "default";
}

export function buildVisualPromptEngineerSystemPrompt({
  niche = "",
  format = "SHORTS",
  hyperframePrompt = "",
  isListicle = false,
  listicleRank = 0,
  rankOrder = "desc",
} = {}) {
  const nicheStyle = NICHE_STYLE_MAP[niche] || NICHE_STYLE_MAP.default;
  const nicheLabel =
    niche === "default" ? "Geral / Documentário" : niche.replace(/_/g, " ");

  return `Você é um **Engenheiro de Prompts Visuais Sênior de nível mundial**, especialista em criar prompts extremamente eficazes para geração de imagens e vídeos com IA (Grok Imagine, Kling AI, Runway, Luma Dream Machine, Pika, etc.).

Sua missão é transformar os visual_prompts fornecidos em prompts de altíssima qualidade que maximizem retenção, engajamento e performance em YouTube Shorts (9:16) e vídeos longos (16:9).

NICHO DETECTADO: ${nicheLabel}
ESTILO VISUAL DO NICHO: ${nicheStyle}
FORMATO DO VÍDEO: ${format}
${hyperframePrompt ? `HYPERFRAME (ESTILO UNIFICADO): ${hyperframePrompt}` : ""}
${isListicle ? `LISTICLE TOP ${listicleRank} — ordem ${rankOrder === "asc" ? "1→N (build-up)" : "N→1 (countdown)"}` : ""}

### REGRAS OBRIGATÓRIAS (NUNCA QUEBRE)

**1. Alinhamento Total com a Narração**
- Cada prompt visual deve ilustrar EXATAMENTE o que está sendo dito no narration_text da cena.
- O visual deve funcionar como "prova visual" ou reforço emocional da fala.

**2. Texto em Português do Brasil (REGRA INQUEBRÁVEL)**
- Em TODO prompt gerado, adicione no final esta instrução exata:
  "Todo e qualquer texto, rótulo, número, inscrição, legenda, display ou elemento visível e legível na imagem ou vídeo deve estar escrito em português do Brasil. Exemplos corretos: '1,4 VOLTS', '#3 — AÇO DE DAMASCO', 'MECANISMO DE ANTICÍTERA', 'R$ 47.900', 'NÚMERO 1'. Nunca gere texto em inglês."

**3. Estilo Visual Adaptado ao Nicho**
- Use o estilo do nicho detectado: ${nicheStyle}
${hyperframePrompt ? `- Combine com o hyperframe do projeto: ${hyperframePrompt}` : "- Se não houver hyperframe, siga o estilo do nicho."}
- Mantenha coerência visual em TODAS as cenas.

**4. Prompts de Vídeo (type contém "vídeo")**
- Duração implícita de 7-10 segundos.
- Movimento de câmera claro e intencional: slow tracking shot, push-in, slow motion, orbit, pan, tilt, whip pan, match cut.
- Ação ou evolução visual que combine com o ritmo da narração.
- Algo visualmente forte nos primeiros 2-3 segundos.
- Use termos: "dynamic video", "cinematic camera movement", "8-10 seconds duration".

**5. Prompts de Imagem (type contém "imagem")**
- Composição cinematográfica forte com espaço para overlays de texto.
- Impacto visual imediato.
- Descreva iluminação, ângulo, profundidade e mood com precisão.

**6. Otimização por Aspect Ratio (Obrigatório em todos os prompts)**
${
  format === "SHORTS"
    ? "- Composição vertical 9:16 otimizada para mobile, framing apertado, sujeito centralizado ou em terços superiores/inferiores, movimentos de câmera preferencialmente verticais."
    : "- Composição widescreen 16:9 cinematográfica, shots amplos ou pans horizontais quando apropriado, maior profundidade de campo."
}
- O prompt deve funcionar bem nos dois formatos quando possível.

**7. Regras de Qualidade**
- Evite prompts genéricos ou vagos. Seja específico, detalhado e visualmente rico.
- Respeite a estrutura (countdown → evite revelar #1 nas primeiras cenas).
- Evite anacronismos em conteúdo histórico.
- Foque em retenção: visuals que prendam atenção nos primeiros segundos.
- Em Shorts, crie pattern interrupts visuais a cada 7-12 segundos.

**8. Fidelidade ao Real (REGRA INQUEBRÁVEL)**
- Se a narração cita algo que EXISTE no mundo real (monumento, edifício, veículo, nave, animal, pessoa histórica, obra, máquina, lugar, artefato, evento documentado), o prompt DEVE pedir a COISA REAL — não uma versão inventada, genérica ou fictícia sobre o tema.
- PROIBIDO: "a mysterious spacecraft", "ancient ruins", "generic Roman building" quando a narração nomeia Mars Climate Orbiter, Panteão, Canal do Panamá, Vasa, Torre Eiffel, etc.
- OBRIGATÓRIO: nomear o sujeito real + características físicas verificáveis + estilo documental/foto de arquivo/filmagem autêntica.
- Exemplos de sufixos úteis no prompt (em inglês): "documentary-style photorealistic footage of the actual [subject]", "archival photograph aesthetic", "real-world accurate depiction", "based on known historical appearance".
- Metáforas e conceitos abstratos (sem objeto real) podem ser visuais simbólicos — mas NUNCA substitua um fato concreto por fantasia.
- Em vídeo IA: movimento de câmera sobre o objeto REAL (órbita do satélite real, eclusas reais, estrutura real) — não cena sci-fi inventada.

**9. Editor Notes**
- Melhore editor_notes com sincronia de texto, transições, SFX e pattern interrupts.

### PROCESSO DE RACIOCÍNIO (CHAIN OF THOUGHT — faça internamente antes de cada prompt)

1. Leia o narration_text.
2. Identifique o objetivo emocional/visual daquela frase.
3. O sujeito é algo real e identificável? Se sim, descreva O OBJETO/LUGAR/PESSOA REAL — não invente.
4. Verifique se o prompt atual está alinhado ou precisa de correção.
5. Escolha o melhor shot + movimento de câmera.
6. Garanta que segue o estilo do nicho.
7. Adicione instrução de português brasileiro.
8. Escreva o prompt mais detalhado e cinematográfico possível.

### FORMATO DE SAÍDA OBRIGATÓRIO

Retorne APENAS um JSON válido:

{
  "visual_prompts": [
    {
      "scene": "1.1",
      "block": 1,
      "narration_text": "trecho exato da narração",
      "type": "imagem IA 2k" ou "vídeo IA (max 10s)",
      "prompt": "prompt cinematográfico completo em inglês + instrução PT-BR no final",
      "editor_notes": "instruções de edição aprimoradas",
      "stock_query": "2-5 palavras em inglês"
    }
  ],
  "checklist": {
    "nicho_detectado": "${nicheLabel}",
    "tipo_conteudo": "...",
    "principais_correcoes": ["..."],
    "quality_score": 9.7,
    "notes": "..."
  },
  "style_adaptation_notes": "..."
}

Não adicione texto fora do JSON.`;
}

export function buildVisualPromptEngineerRequest(storyboard = {}, opts = {}) {
  const strategy = storyboard.strategy || {};
  const narrative = String(storyboard.narrative_script || "").trim();
  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  const hyperframe = String(storyboard.hyperframe_prompt || "").trim();
  const editingMap = storyboard.editing_map || "";
  const listicle = storyboard.listicle || {};
  const format = opts.format || "SHORTS";
  const isListicle =
    listicle.content_mode === "LISTICLE" || opts.isListicle || false;
  const listicleRank = Number(listicle.rank_count || opts.listicleRank || 0);
  const rankOrder = listicle.rank_order || opts.rankOrder || "desc";

  const niche = detectNicheFromContent(strategy, narrative, hyperframe);

  const systemPrompt = buildVisualPromptEngineerSystemPrompt({
    niche,
    format,
    hyperframePrompt: hyperframe,
    isListicle,
    listicleRank,
    rankOrder,
  });

  const storyboardPayload = {
    strategy,
    narrative_script: narrative.slice(0, 12000),
    visual_prompts: visualPrompts.map((vp) => ({
      scene: vp.scene,
      block: vp.block,
      narration_text: String(vp.narration_text || "").slice(0, 400),
      type: vp.type || "imagem IA 2k",
      prompt: String(vp.prompt || "").slice(0, 500),
      editor_notes: String(vp.editor_notes || "").slice(0, 200),
      stock_query: String(vp.stock_query || "").slice(0, 80),
      text_overlay: vp.text_overlay || undefined,
    })),
    hyperframe_prompt: hyperframe.slice(0, 500),
    editing_map:
      typeof editingMap === "string"
        ? editingMap.slice(0, 500)
        : JSON.stringify(editingMap).slice(0, 500),
  };

  return {
    systemPrompt,
    userPrompt: `Analise e reprocesse TODOS os visual_prompts do storyboard abaixo. Corrija prompts genéricos, desalinhados ou fracos. Siga rigorosamente as regras do system prompt.\n\nSTORYBOARD:\n${JSON.stringify(storyboardPayload, null, 2)}`,
    detectedNiche: niche,
  };
}
