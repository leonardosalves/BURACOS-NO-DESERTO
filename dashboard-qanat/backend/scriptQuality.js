/** Regras e pós-processamento para roteiros naturais, coerentes e com mensagem clara. */

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
REGRAS ESPECÍFICAS — SHORTS (30–50 segundos, 5 blocos):

- UMA ideia, UMA virada, UM payoff. Nada de sub-temas paralelos.
- Bloco 1 (gancho): pergunta ou afirmação chocante + promessa clara do que será explicado em 40 segundos.
- Bloco 2 (contexto): 1 frase — quem/o quê/onde. Sem história paralela.
- Bloco 3 (desenvolvimento): o "como" ou "por quê" em linguagem simples, com 1 exemplo concreto.
- Bloco 4 (virada): o detalhe que muda a perspectiva (o "plot twist" do Short).
- Bloco 5 (payoff): responde o gancho do bloco 1 em 1-2 frases DECLARATIVAS — fecha o loop com fato ou consequência. Sem pergunta ao espectador.
- Narração total: 80–130 palavras. Frases de até 12 palavras na maioria.
- Ritmo: alterne frase curta impactante + frase explicativa. Nunca dois parágrafos densos seguidos.
- O espectador deve entender a mensagem mesmo sem som (pela lógica do texto).
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

export function buildIdeasQualityAddendum() {
  return `
Para cada ideia, inclua em "why_it_works" como a mensagem central será compreensível para leigos.
Evite ideias cujo título promete algo que 40 segundos (Shorts) ou 12 minutos (Longo) não conseguem entregar com clareza.
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

export function resolveListicleBlockCount({ rankCount = 20, format = "LONGO" } = {}) {
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

export function buildListicleIdeasAddendum({ rankCount = 20, listTopic = "", rankOrder = "desc" } = {}) {
  const orderLabel = rankOrder === "asc" ? "1 até N (build-up)" : "N até 1 (countdown)";
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

export function buildListicleRankingIdeasPrompt({ niche = "", format = "LONGO", compact = false } = {}) {
  const archetypes = LISTICLE_RANKING_ARCHETYPES.map((a, i) => `${i + 1}. ${a}`).join("\n");
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

${compact
  ? `- Foque só no nicho "${niche}". Varie ângulos (subestimados, controversos, recordes, etc.).`
  : `${buildNicheIsolationAddendum(niche)}

${buildNicheVarietyInstruction(niche)}

${SCRIPT_CREATIVE_REINFORCEMENT}`}

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
    item.suggested_rank_count ?? item.suggestedRankCount ?? item.rank_count ?? item.quantidade ?? 0,
  );
  return {
    title: String(item.title || item.titulo || "").trim(),
    suggested_rank_count: count > 0 ? count : 15,
    list_topic: String(item.list_topic || item.listTopic || item.tema || item.topic || "").trim(),
    listicle_angle: String(item.listicle_angle || item.listicleAngle || item.angle || item.angulo || "").trim(),
    promise: String(item.promise || item.promessa || "").trim(),
    why_interesting: String(
      item.why_interesting || item.whyInteresting || item.why_it_works || item.por_que || "",
    ).trim(),
    controversy_hook: String(
      item.controversy_hook || item.controversyHook || item.gancho || item.hook || "",
    ).trim(),
    sample_items: Array.isArray(item.sample_items)
      ? item.sample_items
      : Array.isArray(item.sampleItems)
        ? item.sampleItems
        : Array.isArray(item.exemplos)
          ? item.exemplos
          : [],
    emotion: String(item.emotion || item.emocao || "").trim(),
    best_format: String(item.best_format || item.bestFormat || item.formato || "LONGO").trim(),
  };
}

export function normalizeListicleIdeasResponse(data = {}, { format = "LONGO" } = {}) {
  if (Array.isArray(data)) {
    return normalizeListicleIdeasResponse({ ranking_ideas: data }, { format });
  }
  if (!data || typeof data !== "object") {
    return { niche_analysis: {}, ranking_ideas: [], best_index: 0, best_reason: "" };
  }

  const ideasKey = Object.keys(data).find((k) =>
    /ranking_ideas|rankingideas|ideias_ranking|ideias_de_ranking|lista_rankings|rankings|ideias/i.test(k),
  );
  const analysisKey = Object.keys(data).find((k) =>
    /niche_analysis|analise_nicho|nicheanalysis|analise_do_nicho/i.test(k),
  );

  let rawIdeas = data.ranking_ideas ?? data[ideasKey] ?? data.ideas ?? data.rankings ?? [];
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
  const niche_analysis = typeof rawAnalysis === "object" && rawAnalysis !== null ? rawAnalysis : {};

  const best_index = Math.max(
    0,
    Math.min(
      ranking_ideas.length - 1,
      Number(data.best_index ?? data.bestIndex ?? data.melhor_indice ?? data.best_idea_index ?? 0) || 0,
    ),
  );

  return {
    niche_analysis,
    ranking_ideas,
    best_index,
    best_reason: String(
      data.best_reason ?? data.bestReason ?? data.melhor_motivo ?? data.best_idea_reason ?? "",
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
  const wordsPerItem = format === "SHORTS"
    ? (isShortsTop3 ? "15-22" : "20-30")
    : "80-140";
  const totalWords = format === "SHORTS"
    ? (isShortsTop3 ? "65-95" : "110-150")
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
${format === "SHORTS" ? `
NARRAÇÃO SHORTS — HUMANA, ENXUTA E CLARA (prioridade máxima):
- TOTAL: ${totalWords} palavras. Se passar do teto, CORTE antes de entregar — menos é mais.
- Por item: ~${wordsPerItem} palavras — nome + 1 fato forte + 1 linha de impacto. Proibido empilhar 3 fatos no mesmo item.
- Intro: máximo 2 frases curtas (gancho + promessa do ranking).
- Tom oral PT-BR: como quem CONTA ao vivo — use transições naturais ("Olha isso", "E o mais insano?", "Agora o topo").
- Frases de até 10-12 palavras na maioria. Ritmo de countdown, zero enrolação.
- O telespectador deve entender a mensagem de CADA item na primeira escuta, mesmo sem conhecer o tema.
- 1 ideia por frase. Se uma frase não avança o ranking, remova.
` : ""}

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
- 80-90% imagem 2K, 10-20% vídeo IA

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

export function buildHumanizeRepairPrompt({ format, ideaTitle, rawScript, blockCount }) {
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

const LAME_ENDING_RE = /^(você|voce|qual você|qual voce|e você|e voce|o que você|o que voce|comenta|deixa nos coment|marque alguém|marque alguem|curtiu|gostou|concorda|qual te surpreendeu|qual origem)/i;

export function sanitizeLameEndingQuestions(text = "") {
  let out = String(text).trim();
  if (!out) return out;

  const sentences = out.split(/(?<=[.!?…])\s+/).filter(Boolean);
  if (sentences.length < 2) return out;

  const last = sentences[sentences.length - 1].trim();
  if (!last.endsWith("?")) return out;

  if (LAME_ENDING_RE.test(last) || /\bvocê prefere\b/i.test(last) || /\bqual você\b/i.test(last)) {
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
      result[key] = sanitizeLameEndingQuestions(sanitizeRoboticPhrases(result[key]));
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

export function mergeHumanizedScript(original = {}, repaired = {}, format = "LONGO") {
  const merged = { ...original };
  if (repaired.narrative_script) merged.narrative_script = repaired.narrative_script;
  if (repaired.narrative_script_tagged) merged.narrative_script_tagged = repaired.narrative_script_tagged;
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
    if (idea.listicle_angle) header += `\nÂNGULO DO RANKING: ${idea.listicle_angle}`;
    if (Array.isArray(idea.sample_items) && idea.sample_items.length) {
      header += `\nITENS SUGERIDOS (use ou refine): ${idea.sample_items.join(", ")}`;
    }
  }

  const customHookVal = idea.hook || idea.hooks || "";
  if (customHookVal) {
    header += `\nGancho de Retenção Inicial (Hook) sugerido: "${customHookVal}"`;
  }

  if (idea.blocks) {
    let blocksStr = "";
    if (Array.isArray(idea.blocks)) {
      blocksStr = idea.blocks.map((b) => `Block ${b.block || b.index || 1}: ${b.content}`).join("\n");
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

export function buildVisualPromptsRules({ format = "LONGO", isListicle = false, listicleRank = 20 } = {}) {
  const sceneCount = format === "SHORTS"
    ? (isListicle ? `${listicleRank * 2 + 4}-${listicleRank * 3 + 6}` : "5-12")
    : (isListicle ? `${listicleRank * 3}+` : "40-80+");

  return `
REGRAS DOS PROMPTS VISUAIS (OBRIGATÓRIO — sem isso o roteiro fica inutilizável):

- CUBRA 100% DA NARRAÇÃO APROVADA. Cada 1-2 frases = 1 objeto em visual_prompts.
- Gere ${sceneCount} cenas no mínimo.
- CADA objeto DEVE ter "narration_text" preenchido com o trecho EXATO falado na cena (copiado da narração aprovada).
- CADA objeto DEVE ter "prompt" em inglês (photorealistic 2k / cinematic motion).
- 80-90% "imagem IA 2k"; 10-20% "vídeo IA (max 10s)" para movimento ativo.
- Nunca deixe narration_text ou prompt vazios.
- Inclua stock_query em inglês em cada cena.
${isListicle ? `- LISTICLE: text_overlay na primeira cena de cada item (#N — NOME).` : ""}`;
}

export function buildVisualPromptsJsonSchema({ blockCount = 5, isListicle = false, listicleRank = 20 } = {}) {
  return `
4. "visual_prompts": [
   GERE UM OBJETO PARA CADA SEGMENTO DA NARRAÇÃO. Cubra o vídeo inteiro. Cada objeto:
   {
     "scene": "1.1",
     "block": 1,
     "narration_text": "Trecho EXATO da narração aprovada para esta cena (1-2 frases, NUNCA vazio)",
     "type": "imagem IA 2k" ou "vídeo IA (max 10s)",
     "duration": "3 a 5 segundos",
     "prompt": "Prompt cinematográfico completo em inglês (NUNCA vazio)",
     "editor_notes": "Ken Burns zoom in, dissolve, etc.",
     "stock_query": "termo curto em inglês"
   }
]`;
}

export function needsVisualPromptsRepair(storyboard = {}) {
  const vps = storyboard.visual_prompts || [];
  if (!Array.isArray(vps) || vps.length === 0) return true;
  const emptyNarr = vps.filter((vp) => !String(vp.narration_text || vp.narracao || "").trim()).length;
  const emptyPrompt = vps.filter((vp) => !String(vp.prompt || vp.visual_prompt || "").trim()).length;
  return emptyNarr > 0 || emptyPrompt > 0;
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
  const skeleton = Array.isArray(existingPrompts) && existingPrompts.length > 0
    ? `\nESQUELETO DE CENAS (mantenha scene/block/type; PREENCHA narration_text e prompt em TODOS):\n${JSON.stringify(
      existingPrompts.map((vp) => ({
        scene: vp.scene,
        block: vp.block,
        type: vp.type || "imagem IA 2k",
        duration: vp.duration || "5 segundos",
      })),
      null,
      2,
    ).slice(0, 6000)}`
    : "";

  return `Você é diretor de vídeo YouTube. A narração já foi aprovada pelo usuário — NÃO altere palavras da narração nos trechos das cenas.

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
  "visual_prompts": [ { "scene", "block", "narration_text", "type", "duration", "prompt", "editor_notes", "stock_query" } ],
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
  if (Array.isArray(repaired.visual_prompts) && repaired.visual_prompts.length > 0) {
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
    niche, format, idea, isListicle, listicleRank, listicleTopic, rankOrder, listicleBlockCount,
  });

  return `Você é o "Lumiera Script Master" (Roteirista Profissional para YouTube).

${ideaHeader}
${notebooklmContext}${webResearchContext}

FASE 1 — APENAS NARRAÇÃO (o usuário revisará e aprovará antes dos blocos visuais):

Gere SOMENTE a narração completa do vídeo em português brasileiro. NÃO gere visual_prompts, technical_config, list_items nem bgm ainda.

${SCRIPT_CREATIVE_REINFORCEMENT}

${isListicle
    ? buildListicleScriptRules({
      rankCount: listicleRank,
      rankOrder: rankOrder || "desc",
      format,
      listTopic: listicleTopic,
      blockCount: listicleBlockCount,
    })
    : buildFormatScriptRules(format)}

${cinematicNarrationRules}

REGRAS DESTA FASE:
- HUMANIZE: escreva como narração FALADA — alguém contando ao vivo para um amigo curioso. Frases que soam bem em voz alta.
- RESUMA AO MÁXIMO: cada palavra deve carregar informação. Corte adjetivos vazios, repetições e frases que não avançam a mensagem.
- CLAREZA: o telespectador precisa entender a tese do vídeo e cada item do ranking na primeira escuta — sem jargão sem explicação.
- Revise cada frase: elimine tom robótico, clichês de IA, tom de redação escolar e trechos desconexos.
- Formato: "${format}"${isListicle ? ` — LISTICLE TOP ${listicleRank}` : ""}.
- ${isListicle
    ? `Estruture mentalmente em ${listicleBlockCount} blocos (intro + ${listicleRank} itens + outro), mas entregue a narração em texto corrido. ${format === "SHORTS" && listicleRank <= 3 ? "Top 3 Short: máximo ~90 palavras, 1 fato forte por item." : ""}`
    : format === "SHORTS"
      ? "30-50 segundos, ~80-130 palavras, uma ideia clara com virada e payoff."
      : "10-20 minutos, 1500-3000 palavras, narrativa profunda e imersiva."}

Responda APENAS JSON válido (sem markdown):
{
  "strategy": {
    "title_main": "Título específico ao tema",
    "hook": "Gancho de 3 segundos",
    "target_audience": "Público-alvo",
    "tone": "Tom do vídeo"
  },
  "narrative_script": "Narração COMPLETA em texto corrido, SEM marcadores de áudio.",
  "narrative_script_tagged": "A MESMA narração com tags de performance ([pausa], [ênfase], (breath), etc.)"
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
    niche, format, idea, isListicle, listicleRank, listicleTopic, rankOrder, listicleBlockCount,
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

${isListicle
    ? buildListicleScriptRules({
      rankCount: listicleRank,
      rankOrder: rankOrder || "desc",
      format,
      listTopic: listicleTopic,
      blockCount: listicleBlockCount,
    })
    : buildFormatScriptRules(format)}

${titleCraftRules}

${epidemicMoodPrompt}

SUA MISSÃO:
- narrative_script e narrative_script_tagged = narração aprovada (tagged pode ser gerada/atualizada se o usuário editou só o texto limpo).
- DIVIDA a narração em segmentos e gere visual_prompts cobrindo 100% do texto — TODOS os campos narration_text e prompt PREENCHIDOS.
- technical_config.script = narração dividida em ${listicleBlockCount} parágrafos (um por bloco).
- ${isListicle
    ? `EXATAMENTE ${listicleBlockCount} blocos (intro + ${listicleRank} itens + outro). Gere list_items e listicle.`
    : `Estruture em ${format === "SHORTS" ? "5" : "12"} blocos lógicos em block_phrases.`}

${buildVisualPromptsRules({ format, isListicle, listicleRank })}

FORMATO DE RESPOSTA — JSON válido com:
1. "strategy" (title_main, title_variations, hook, target_audience, tone, pinned_comment, cta)
2. "narrative_script" (texto aprovado, idêntico)
3. "narrative_script_tagged"
${buildVisualPromptsJsonSchema({ blockCount: listicleBlockCount, isListicle, listicleRank })}
5. "bgm_recommendations"
6. "editing_map"
7. "hyperframe_prompt"
8. "checklist"
9. "technical_config" (script, block_phrases, impact_texts, highlight_keywords, bgm_mappings)
${isListicle ? `10. "listicle" e 11. "list_items" (${listicleRank} itens)` : ""}

REGRAS FINAIS:
- Retorne APENAS JSON puro, sem markdown.
- visual_prompts deve cobrir TODA a narração sem lacunas e sem campos vazios.`;
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
  const wordCeiling = format === "SHORTS"
    ? (isListicle && listicleRank <= 3 ? 95 : isListicle ? 150 : 130)
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

export function mergeHumanizedNarration(original = {}, repaired = {}, format = "LONGO") {
  const merged = { ...original };
  if (repaired.narrative_script) merged.narrative_script = repaired.narrative_script;
  if (repaired.narrative_script_tagged) merged.narrative_script_tagged = repaired.narrative_script_tagged;
  return applyScriptTextQuality(merged, format);
}