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
- Bloco 5 (payoff + CTA): responde o gancho do bloco 1 em 1-2 frases + pergunta para comentário.
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
7. NÃO altere visual_prompts, bgm_mappings nem impact_texts.

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
      result[key] = sanitizeRoboticPhrases(result[key]);
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