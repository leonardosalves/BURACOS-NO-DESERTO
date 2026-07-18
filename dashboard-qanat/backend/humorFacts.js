const FORMAT_RULES = {
  SHORTS:
    "roteiro de 35 a 60 segundos, uma descoberta central e no maximo 150 palavras",
  LONGO: "video de 6 a 12 minutos, contexto, viradas e explicacao aprofundada",
};

const TOPIC_STOP_WORDS = new Set([
  "a",
  "as",
  "ao",
  "aos",
  "com",
  "como",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "era",
  "essa",
  "esse",
  "esta",
  "este",
  "historia",
  "historia",
  "ideia",
  "mais",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "para",
  "por",
  "porque",
  "que",
  "se",
  "segredo",
  "sem",
  "sobre",
  "sua",
  "um",
  "uma",
  "voce",
]);

const TOPIC_ALIAS_GROUPS = Object.freeze([
  ["concreto romano", "cimento romano", "pozzolana", "opus caementicium"],
  [
    "mecanismo de anticitera",
    "maquina de anticitera",
    "computador grego",
    "computador de 2 mil anos",
    "computador de dois mil anos",
    "antikythera mechanism",
  ],
  ["estradas incas", "qhapaq nan", "qhapaq ñan", "rede viaria inca"],
  ["badgir", "windcatcher", "torre de vento persa", "ar condicionado persa"],
  ["bateria de bagda", "baghdad battery", "pilha de bagda"],
  ["aquedutos romanos", "caimento dos aquedutos", "inclinacao dos aquedutos"],
]);

const ENGINEERING_SIGNALS = Object.freeze([
  "arquitet",
  "argamassa",
  "canal",
  "ceram",
  "construc",
  "edific",
  "engenh",
  "engren",
  "estrad",
  "estrutur",
  "ferrament",
  "fortific",
  "hidraul",
  "maquina",
  "material",
  "mecanism",
  "metal",
  "miner",
  "obra",
  "pedra",
  "pedreira",
  "ponte",
  "porta",
  "sistema",
  "tecnica",
  "templo",
  "tunel",
]);

function clean(value, fallback = "") {
  return String(value ?? fallback)
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTopic(value = "") {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function topicTokens(value = "") {
  return new Set(
    normalizeTopic(value)
      .split(" ")
      .filter(
        (token) =>
          token.length >= 4 &&
          !TOPIC_STOP_WORDS.has(token) &&
          !["antiga", "antigo", "engenharia", "romano", "romana"].includes(
            token
          )
      )
  );
}

function matchesAliasGroup(left, right) {
  const leftNormalized = normalizeTopic(left);
  const rightNormalized = normalizeTopic(right);
  return TOPIC_ALIAS_GROUPS.some((aliases) => {
    const normalizedAliases = aliases.map(normalizeTopic);
    return (
      normalizedAliases.some((alias) => leftNormalized.includes(alias)) &&
      normalizedAliases.some((alias) => rightNormalized.includes(alias))
    );
  });
}

export function areHumorTopicsSimilar(left, right) {
  const leftNormalized = normalizeTopic(left);
  const rightNormalized = normalizeTopic(right);
  if (!leftNormalized || !rightNormalized) return false;
  if (
    Math.min(leftNormalized.length, rightNormalized.length) >= 12 &&
    (leftNormalized.includes(rightNormalized) ||
      rightNormalized.includes(leftNormalized))
  ) {
    return true;
  }
  if (matchesAliasGroup(leftNormalized, rightNormalized)) return true;

  const leftTokens = topicTokens(leftNormalized);
  const rightTokens = topicTokens(rightNormalized);
  if (!leftTokens.size || !rightTokens.size) return false;
  const shared = [...leftTokens].filter((token) => rightTokens.has(token));
  const unionSize = new Set([...leftTokens, ...rightTokens]).size;
  const containment =
    shared.length / Math.min(leftTokens.size, rightTokens.size);
  const jaccard = shared.length / Math.max(unionSize, 1);
  const distinctiveShared = shared.some((token) => token.length >= 8);
  return (
    (shared.length >= 2 && (containment >= 0.5 || jaccard >= 0.32)) ||
    (distinctiveShared && containment >= 0.34)
  );
}

export function filterNovelHumorIdeas(
  ideas = [],
  excludedTopics = [],
  acceptedIdeas = [],
  options = {}
) {
  const accepted = [...acceptedIdeas];
  const novel = [];
  const rejected = [];
  const nicheNormalized = normalizeTopic(options.niche);

  for (const idea of ideas) {
    const candidate = clean(
      `${idea?.title || ""} ${idea?.factualPremise || ""}`
    );
    const candidateNormalized = normalizeTopic(candidate);
    if (
      /\b(alien|alienigena|extraterrestre|visitantes de outro mundo)\b/i.test(
        candidateNormalized
      ) ||
      idea?.confidence === "baixa" ||
      !Array.isArray(idea?.sources) ||
      idea.sources.length === 0
    ) {
      rejected.push({
        title: clean(idea?.title),
        conflict: "premissa especulativa ou sem fonte verificavel",
      });
      continue;
    }
    if (
      nicheNormalized.includes("engenharia") &&
      !ENGINEERING_SIGNALS.some((signal) =>
        candidateNormalized.includes(signal)
      )
    ) {
      rejected.push({
        title: clean(idea?.title),
        conflict: `fora do nicho: ${clean(options.niche)}`,
      });
      continue;
    }
    const conflict = [
      ...excludedTopics,
      ...accepted.map((item) =>
        clean(`${item?.title || ""} ${item?.factualPremise || ""}`)
      ),
    ]
      .filter(Boolean)
      .find((topic) => areHumorTopicsSimilar(candidate, topic));
    if (conflict) {
      rejected.push({ title: clean(idea?.title), conflict: clean(conflict) });
      continue;
    }
    novel.push(idea);
    accepted.push(idea);
  }

  return { ideas: novel, rejected };
}

export function buildHumorIdeasPrompt(input = {}) {
  const niche = clean(input.niche);
  const format = input.format === "SHORTS" ? "SHORTS" : "LONGO";
  const humorStyle = clean(input.humorStyle, "observacional inteligente");
  const audience = clean(input.audience, "publico geral brasileiro");
  const count = Math.min(10, Math.max(3, Number(input.count) || 6));
  const generationSeed = clean(input.generationSeed, String(Date.now()));
  const exclusionAddendum = clean(input.exclusionAddendum);
  const explorationAxes = clean(input.explorationAxes);
  const freshnessInstruction = clean(input.freshnessInstruction);
  if (niche.length < 3)
    throw new Error("Informe um nicho com pelo menos 3 caracteres.");

  return `Voce e a redacao factual de uma feature EXCLUSIVA chamada Fatos com Graca.
Ela nao pertence e nao deve copiar, alterar ou alimentar automaticamente nenhum outro criador de videos.

NICHO: ${niche}
FORMATO: ${format} — ${FORMAT_RULES[format]}
PUBLICO: ${audience}
HUMOR: ${humorStyle}
RODADA DE PESQUISA: ${generationSeed}

Crie ${count} ideias pouco saturadas baseadas em fatos reais, acontecimentos documentados ou fenomenos plausiveis claramente rotulados como hipotese. Nao invente fonte, numero, pessoa, estudo ou acontecimento. O humor deve nascer do contraste, da ironia e da observacao; nunca da falsificacao do fato. Prefira angulos que poucos canais tratam e explique por que parecem pouco explorados. Para cada ideia, indique termos concretos que o usuario possa pesquisar para confirmar o fato antes de publicar.

${freshnessInstruction}
${explorationAxes}
${exclusionAddendum}

REGRA DE NOVIDADE OBRIGATORIA:
- Nao troque apenas o titulo, o gancho ou a piada de um assunto bloqueado.
- Considere repeticao o mesmo objeto, pessoa, obra, evento, mecanismo, descoberta ou alegacao central.
- Antes de responder, compare cada pauta com a lista proibida e substitua qualquer colisao por outro assunto.
- As ideias desta mesma resposta tambem precisam tratar de assuntos diferentes entre si.

ADERENCIA AO NICHO — OBRIGATORIA:
- Todas as pautas devem pertencer LITERALMENTE a "${niche}".
- Nao use metaforas como "engenharia da natureza", "engenharia do clima", "bioengenharia involuntaria" ou temas historicos apenas adjacentes para fingir aderencia.
- Se o nicho mencionar engenharia, cada pauta deve tratar de uma obra, tecnica, maquina, mecanismo, material, infraestrutura, ferramenta, processo construtivo ou sistema criado por seres humanos.
- Nao use alienigenas, visitantes de outro mundo ou sensacionalismo especulativo como premissa.
- Toda pauta precisa ter ao menos uma fonte verificavel e confianca media ou alta.

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

function splitNarrationForScenes(narration, sceneCount) {
  const sentences = clean(narration)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => clean(sentence))
    .filter(Boolean);
  const count = Math.max(1, Math.min(sceneCount || 1, sentences.length || 1));
  const groups = Array.from({ length: count }, () => []);
  sentences.forEach((sentence, index) => {
    const groupIndex = Math.min(
      count - 1,
      Math.floor((index * count) / Math.max(sentences.length, 1))
    );
    groups[groupIndex].push(sentence);
  });
  return groups.map((group) => group.join(" ")).filter(Boolean);
}

export function buildHumorProductionPrompt(input = {}) {
  const narration = clean(input.narration);
  const title = clean(input.title);
  const hook = clean(input.hook);
  const format = input.format === "SHORTS" ? "SHORTS" : "LONGO";
  const humorStyle = clean(input.humorStyle, "observacional inteligente");
  const premise = clean(input.factualPremise);
  if (narration.length < 40)
    throw new Error("Gere a narracao humoristica antes de planejar as cenas.");

  return `Voce e o diretor visual da feature Fatos com Graca do Lumiera.

Crie um plano de producao cena a cena para a narracao abaixo. A graca visual deve complementar a fala sem transformar o video em meme poluido.

TITULO: ${title}
GANCHO: ${hook}
PREMISSA FACTUAL: ${premise}
FORMATO: ${format} — ${FORMAT_RULES[format]}
HUMOR: ${humorStyle}

NARRACAO APROVADA — NAO ALTERAR NENHUMA PALAVRA:
${narration}

Responda APENAS JSON valido:
{
  "title":"",
  "hook":"",
  "visualComedyDirection":"como o humor aparece nos visuais sem exagero",
  "continuityBible":"personagem, paleta, lente, luz e elementos consistentes",
  "musicDirection":"direcao musical",
  "sfxDirection":"efeitos pontuais e sincronizados, sem poluicao",
  "scenes":[{
    "id":"scene-01",
    "durationSeconds":5,
    "narration":"trecho EXATO da narracao aprovada",
    "visualBeat":"acao visual e timing da piada",
    "mediaType":"image ou video",
    "mediaReason":"por que esta midia e a melhor opcao para comunicar esta cena",
    "imagePrompt":"obrigatorio quando mediaType=image; vazio quando video",
    "videoPrompt":"obrigatorio quando mediaType=video; vazio quando image",
    "shot":"plano e lente",
    "camera":"movimento",
    "onScreenText":"texto curto ou vazio",
    "sfxCue":"efeito e momento exato ou vazio",
    "transition":"transicao"
  }]
}

Regras:
- Cubra a narracao inteira, na ordem, sem omitir, resumir ou reescrever palavras.
- Shorts: 5 a 9 cenas. Longo: 10 a 24 cenas.
- Escolha mediaType cena por cena; nao force video em todas.
- Use image quando a cena depende de composicao precisa, artefato, retrato, documento, mapa, arquitetura estatica, comparacao ou momento congelado. Planeje movimento editorial posterior com push-in, parallax ou recorte quando apropriado.
- Use video somente quando movimento real e indispensavel para entender a acao, mecanismo, transformacao, deslocamento, reacao, timing fisico da piada ou movimento de camera.
- Uma imagem forte e factual e melhor que um video generico sem acao relevante.
- Preencha somente o prompt correspondente ao mediaType escolhido. O outro prompt deve ser vazio.
- O prompt escolhido deve funcionar isoladamente, mas respeitar continuityBible.
- Humor visual elegante: no maximo um gag principal por cena.
- SFX somente quando reforcar uma virada; nunca em toda cena.
- Nao invente fatos alem da premissa e da narracao.`;
}

export function parseHumorProductionResponse(text, narration) {
  const parsed = extractJson(text);
  const rawScenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
  if (!rawScenes.length)
    throw new Error("A IA nao retornou cenas humoristicas validas.");

  // Prompts vêm da IA; a fala é redistribuída localmente para preservar cada
  // palavra aprovada antes de o plano entrar no wizard.
  const narrationParts = splitNarrationForScenes(narration, rawScenes.length);
  const scenes = rawScenes
    .slice(0, narrationParts.length)
    .map((scene, index) => {
      const imagePrompt = clean(scene?.imagePrompt);
      const videoPrompt = clean(scene?.videoPrompt);
      const requestedMediaType = clean(scene?.mediaType).toLowerCase();
      const mediaType =
        requestedMediaType === "image" || requestedMediaType === "imagem"
          ? "image"
          : requestedMediaType === "video" || requestedMediaType === "vídeo"
            ? "video"
            : videoPrompt && !imagePrompt
              ? "video"
              : "image";
      const selectedPrompt = mediaType === "video" ? videoPrompt : imagePrompt;
      if (!selectedPrompt) {
        throw new Error(
          `A cena ${index + 1} escolheu ${mediaType}, mas nao trouxe o prompt correspondente.`
        );
      }
      return {
        id: clean(scene?.id, `scene-${String(index + 1).padStart(2, "0")}`),
        order: index + 1,
        durationSeconds: Math.max(2, Number(scene?.durationSeconds) || 5),
        narration: narrationParts[index],
        visualBeat: clean(scene?.visualBeat),
        mediaType,
        mediaReason: clean(scene?.mediaReason),
        imagePrompt: mediaType === "image" ? imagePrompt : "",
        videoPrompt: mediaType === "video" ? videoPrompt : "",
        shot: clean(scene?.shot, "plano medio cinematografico"),
        camera: clean(
          scene?.camera,
          mediaType === "image" ? "push-in editorial suave" : "movimento suave"
        ),
        onScreenText: clean(scene?.onScreenText),
        sfxCue: clean(scene?.sfxCue),
        transition: clean(scene?.transition),
      };
    });

  if (
    clean(scenes.map((scene) => scene.narration).join(" ")) !== clean(narration)
  ) {
    throw new Error("Falha de integridade ao distribuir a narracao nas cenas.");
  }

  return {
    title: clean(parsed?.title),
    hook: clean(parsed?.hook),
    narration: clean(narration),
    visualComedyDirection: clean(parsed?.visualComedyDirection),
    continuityBible: clean(parsed?.continuityBible),
    musicDirection: clean(parsed?.musicDirection),
    sfxDirection: clean(parsed?.sfxDirection),
    scenes,
  };
}
