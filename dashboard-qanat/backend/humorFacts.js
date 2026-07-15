const FORMAT_RULES = {
  SHORTS:
    "roteiro de 35 a 60 segundos, uma descoberta central e no maximo 150 palavras",
  LONGO: "video de 6 a 12 minutos, contexto, viradas e explicacao aprofundada",
};

function clean(value, fallback = "") {
  return String(value ?? fallback)
    .replace(/\s+/g, " ")
    .trim();
}

export function buildHumorIdeasPrompt(input = {}) {
  const niche = clean(input.niche);
  const format = input.format === "SHORTS" ? "SHORTS" : "LONGO";
  const humorStyle = clean(input.humorStyle, "observacional inteligente");
  const audience = clean(input.audience, "publico geral brasileiro");
  const count = Math.min(10, Math.max(3, Number(input.count) || 6));
  if (niche.length < 3)
    throw new Error("Informe um nicho com pelo menos 3 caracteres.");

  return `Voce e a redacao factual de uma feature EXCLUSIVA chamada Fatos com Graca.
Ela nao pertence e nao deve copiar, alterar ou alimentar automaticamente nenhum outro criador de videos.

NICHO: ${niche}
FORMATO: ${format} — ${FORMAT_RULES[format]}
PUBLICO: ${audience}
HUMOR: ${humorStyle}

Crie ${count} ideias pouco saturadas baseadas em fatos reais, acontecimentos documentados ou fenomenos plausiveis claramente rotulados como hipotese. Nao invente fonte, numero, pessoa, estudo ou acontecimento. O humor deve nascer do contraste, da ironia e da observacao; nunca da falsificacao do fato. Prefira angulos que poucos canais tratam e explique por que parecem pouco explorados. Para cada ideia, indique termos concretos que o usuario possa pesquisar para confirmar o fato antes de publicar.

Responda APENAS JSON valido. Em sources, inclua somente paginas que voce realmente encontrou na pesquisa:
{"ideas":[{"id":"idea-1","title":"","hook":"","factualPremise":"","whyFunny":"","whyUnderexplored":"","formatFit":"SHORTS ou LONGO","durationSeconds":60,"verificationQueries":[""],"sources":[{"title":"","url":"https://..."}],"saturationRisk":"baixo|medio|alto","confidence":"alta|media|baixa"}]}`;
}

export function buildHumorNarrationPrompt(input = {}) {
  const idea = input.idea && typeof input.idea === "object" ? input.idea : {};
  const title = clean(idea.title || input.title);
  const premise = clean(idea.factualPremise || input.factualPremise);
  const format = input.format === "SHORTS" ? "SHORTS" : "LONGO";
  const humorStyle = clean(input.humorStyle, "observacional inteligente");
  const extra = clean(input.instructions);
  if (!title || !premise)
    throw new Error("Escolha uma ideia factual antes de gerar a narracao.");

  return `Escreva uma narracao humoristica factual e premium, totalmente isolada de qualquer outro fluxo do programa.

TITULO: ${title}
PREMISSA FACTUAL: ${premise}
FORMATO: ${format} — ${FORMAT_RULES[format]}
ESTILO DE HUMOR: ${humorStyle}
INSTRUCOES EXTRAS: ${extra || "nenhuma"}

Regras obrigatorias:
- Preserve a premissa factual; nao acrescente nomes, datas, estatisticas ou citacoes nao fornecidas.
- Se um detalhe precisar de confirmacao, marque-o em verificationNotes, nao o apresente como certeza.
- Crie humor com comparacoes e timing, sem transformar hipotese em fato.
- Comece com um gancho forte, avance com clareza e termine com payoff memoravel.
- Texto falado em portugues brasileiro natural; escreva unidades por extenso quando isso melhorar o TTS.

Responda APENAS JSON valido:
{"title":"","hook":"","narration":"","estimatedSeconds":60,"verificationNotes":[""],"factIntegrity":"intacta"}`;
}

function extractJson(text) {
  const raw = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const match = raw.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : raw);
}

export function parseHumorIdeasResponse(text) {
  const parsed = extractJson(text);
  const source = Array.isArray(parsed) ? parsed : parsed?.ideas;
  if (!Array.isArray(source))
    throw new Error("A IA nao retornou uma lista de ideias valida.");
  const ideas = source
    .slice(0, 10)
    .map((idea, index) => ({
      id: clean(idea?.id, `idea-${index + 1}`),
      title: clean(idea?.title),
      hook: clean(idea?.hook),
      factualPremise: clean(idea?.factualPremise),
      whyFunny: clean(idea?.whyFunny),
      whyUnderexplored: clean(idea?.whyUnderexplored),
      formatFit: idea?.formatFit === "SHORTS" ? "SHORTS" : "LONGO",
      durationSeconds: Math.max(20, Number(idea?.durationSeconds) || 60),
      verificationQueries: Array.isArray(idea?.verificationQueries)
        ? idea.verificationQueries
            .map((q) => clean(q))
            .filter(Boolean)
            .slice(0, 5)
        : [],
      sources: Array.isArray(idea?.sources)
        ? idea.sources
            .map((source) => ({
              title: clean(source?.title, "Fonte"),
              url: clean(source?.url),
            }))
            .filter((source) => /^https?:\/\//i.test(source.url))
            .slice(0, 4)
        : [],
      saturationRisk: ["baixo", "medio", "alto"].includes(idea?.saturationRisk)
        ? idea.saturationRisk
        : "medio",
      confidence: ["alta", "media", "baixa"].includes(idea?.confidence)
        ? idea.confidence
        : "media",
    }))
    .filter((idea) => idea.title && idea.factualPremise);
  if (!ideas.length)
    throw new Error("A IA nao retornou ideias factuais aproveitaveis.");
  return ideas;
}

export function parseHumorNarrationResponse(text) {
  const parsed = extractJson(text);
  const narration = clean(parsed?.narration);
  if (narration.length < 40)
    throw new Error("A narracao humoristica retornou vazia ou curta demais.");
  return {
    title: clean(parsed?.title),
    hook: clean(parsed?.hook),
    narration,
    estimatedSeconds: Math.max(20, Number(parsed?.estimatedSeconds) || 60),
    verificationNotes: Array.isArray(parsed?.verificationNotes)
      ? parsed.verificationNotes
          .map((note) => clean(note))
          .filter(Boolean)
          .slice(0, 8)
      : [],
    factIntegrity: clean(parsed?.factIntegrity, "intacta"),
  };
}
