export const ROBOTIC_PHRASE_PATTERNS = [
  /neste vídeo vamos/i,
  /sem mais delongas/i,
  /fique até o final/i,
  /você não vai acreditar/i,
  /prepare-se para/i,
  /mergulhe (?:neste|nesta|no|na)/i,
  /desvende os segredos/i,
  /jornada fascinante/i,
  /universo (?:intrigante|fascinante)/i,
  /é importante ressaltar/i,
  /vale a pena mencionar/i,
  /em conclusão/i,
  /sem dúvida alguma/i,
  /cada vez mais/i,
  /no mundo de hoje/i,
  /a verdade é que/i,
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
[CAMADA OPCIONAL DE APRESENTAÇÃO — PRIORIDADE 5-6. Submissa ao NARRACAOPRO. Aplicar somente após tese definida, fatos verificados e cadeia causal construída.]

FRAMEWORK VIRAL SHORT-FORM (adaptado Lumiera):

CURADORIA DE HISTÓRIA (escolha 1 categoria antes de escrever):
- impactful: consequência real na vida das pessoas
- practical: dá para usar/aplicar hoje
- provocative: desafia crença comum (com fatos, não opinião vazia)
- astonishing: dado ou imagem que parece impossível
FILTROS DUROS — descarte histórias: ad-driven, puramente políticas, sem substância factual.

GANCHO (≤10 palavras, voz ativa, gatilho emocional, número quando couber):
Tipos: pergunta | choque | problema/solução | antes/depois | urgência | desafio | segredo leve | impacto pessoal.
O gancho ANUNCIA o payoff — não prometa o que o roteiro não entrega.

ORÇAMENTO DE FATOS (definido pelo NARRACAOPRO — não sobrepor):
- Shorts 30–60s: máximo 2–3 fatos centrais, pelo menos 1 mecanismo explicado, pelo menos 1 consequência concreta, nenhum fato decorativo.

POWER-UPS (use 1–2 por roteiro, sem forçar — não adicionar fatos extras):
- authority bump: cite fonte, órgão ou especialista em 1 frase
- hook spice: número + consequência imediata no gancho
- then-vs-now: contraste temporal em 1 linha
- stat escalation: cada fato sobe a aposta (menor → maior)
- real-world fallout: "hoje isso significa que..."
- zoom-out: última frase liga o micro ao macro
- rhythm check: alterne frases de 3–5 palavras com 1 frase explicativa

FINAL — REGRA LUMIERA (conforme NARRACAOPRO — fechamento declarativo é o padrão):
- PREFERIDO: frase declarativa com consequência, ironia factual ou número final
- PERMITIDO com moderação: pergunta forward-looking COM stakes reais ligadas ao tema
- PROIBIDO: "Você prefere…?", "Qual você escolheria…?", "Comenta aí", "O que achou?", perguntas binárias sem payoff

RESTRIÇÕES DESTA CAMADA (invioláveis):
- NÃO substituir explicação por impacto visual ou emocional
- NÃO exigir fatos além do orçamento do NARRACAOPRO
- NÃO exagerar conclusões além do que as fontes sustentam
- NÃO alterar relações causais estabelecidas pela pesquisa
- NÃO forçar linguagem sensacionalista
- NÃO modificar o nível de certeza de uma afirmação
- NÃO transformar hipótese em fato
`;

/** Princípios UGC — referência compacta (regras completas no NARRACAOPRO). */
export const UGC_SCRIPTWRITER_REINFORCEMENT = `
LEMBRETE UGC: Escreva como alguém CONTANDO ao vivo. Teste: ler em voz alta sem tropeçar. Especificidade > adjetivos. Fechamento DECLARATIVO conforme NARRACAOPRO.
`;

export const SCRIPT_CREATIVE_REINFORCEMENT = `
[CAMADA CRIATIVA — PRIORIDADE 6-7. Submissa ao NARRACAOPRO. Em caso de conflito, o NARRACAOPRO prevalece.]

RECURSOS CRIATIVOS PERMITIDOS (sugestões, não ordens):

1. RITMO: Alterne frases curtas (impacto) com frases médias (explicação). Nunca dois blocos densos seguidos.

2. CONTRASTE: antigo vs. moderno, aparência vs. realidade, promessa vs. consequência — somente quando verdadeiro e sustentado pelas fontes.

3. ORDEM DAS FRASES: Reorganize para progressão de aposta (menor → maior), mas não altere relações causais.

4. IMAGEM MENTAL: Quando o tema for abstrato, sugira cena concreta do dia a dia para ancorar a explicação.

5. TRANSIÇÃO: Use pontes causais ("Mas esse era apenas o primeiro problema", "A explicação está no modo como..."). Não use suspense artificial.

6. REVISÃO ORAL: Leia mentalmente em voz alta. Onde tropeçar ou soar artificial, reescreva.

7. BLOCK_PHRASE: Cada block_phrase = início EXATO da narração do bloco (4-8 palavras, únicas entre si).

RESTRIÇÕES DESTA CAMADA (invioláveis):
- NÃO adicionar fatos além do orçamento do NARRACAOPRO
- NÃO mudar a tese (definida pelo NARRACAOPRO)
- NÃO criar frases de grandiosidade ("símbolo do progresso", "mudou o mundo para sempre")
- NÃO introduzir clichês ou frases proibidas pelo NARRACAOPRO
- NÃO alterar o tipo de fechamento (declarativo é o padrão)
`;
