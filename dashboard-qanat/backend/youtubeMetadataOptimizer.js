import {
  detectVideoFormat,
  detectNicheCategory,
  selectVarietyProfile,
  NICHE_RPM_HINTS,
} from "./overlayOrchestration.js";

const LONG_BLOCK_NAMES = [
  "Abertura",
  "Bloco 2",
  "Bloco 3",
  "Bloco 4",
  "Bloco 5",
  "Bloco 6",
  "Bloco 7",
  "Bloco 8",
  "Bloco 9",
  "Bloco 10",
  "Bloco 11",
  "Conclusão",
];

const SHORT_BLOCK_NAMES = [
  "Gancho",
  "Contexto",
  "Desenvolvimento",
  "Virada",
  "Payoff + CTA",
];

const NICHE_TITLE_BIAS = {
  finance: "Priorize consequência financeira, números concretos e clareza de valor — nicho de RPM alto.",
  tech: "Priorize novidade, impacto futuro e 'por que isso importa agora'.",
  history: "Priorize mistério histórico, anacronismos e 'como era possível na época'.",
  nature: "Priorize escala, contraste visual e fenômenos que desafiam o senso comum.",
  industrial: "Priorize engenharia, escala humana vs. máquina e impacto físico.",
  default: "Priorize curiosidade universal e payoff claro no final.",
};

const PROFILE_TITLE_TYPES = {
  "documentary-prestige": [
    "Tom institucional premium (como BBC/Netflix)",
    "Paradoxo histórico sóbrio",
    "Detalhe que muda a narrativa oficial",
    "Pergunta que especialistas evitam",
    "Consequência que ecoa até hoje",
  ],
  "data-journalist": [
    "Número ou dado concreto chocante",
    "Comparação de escala (X vs Y)",
    "Tendência que ninguém conectou",
    "Causa raiz inesperada",
    "Projeção futura baseada em fato",
  ],
  "mystery-reveal": [
    "Lacuna temporal (o que aconteceu entre X e Y)",
    "Paradoxo impossível",
    "Detalhe ignorado por séculos",
    "Pergunta sem resposta óbvia",
    "Revelação que inverte tudo no final",
  ],
  "geography-explorer": [
    "Lugar que desafia a lógica",
    "Escala geográfica surpreendente",
    "Fenômeno local com impacto global",
    "Comparação entre dois territórios",
    "O que mapas não mostram",
  ],
  "social-proof": [
    "Reação que viralizou por um motivo",
    "Opinião impopular mas correta",
    "O que a maioria faz errado",
    "Prova social inesperada",
    "Desafio ao senso comum do feed",
  ],
  "industrial-impact": [
    "Engenharia que parece impossível",
    "Escala industrial absurda",
    "Falha que virou legado",
    "Número de tonelada/metros/horas",
    "O custo humano escondido",
  ],
  default: [
    "Curiosidade pura",
    "Emoção ou espanto",
    "Número ou fato concreto",
    "Urgência sutil",
    "Provocação inteligente",
  ],
};

const NICHE_TAG_POOLS = {
  finance: ["finanças", "investimentos", "dinheiro", "economia", "negócios"],
  tech: ["tecnologia", "inovação", "ciência", "futuro", "inteligência artificial"],
  history: ["história", "documentário", "curiosidades", "arqueologia", "mistérios"],
  nature: ["natureza", "geografia", "mundo", "viagem", "curiosidades"],
  industrial: ["engenharia", "industrial", "militar", "construção", "mecânica"],
  default: ["curiosidades", "educação", "documentário", "história", "mundo"],
};

function formatTimestamp(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function estimateTotalDuration(timings = {}) {
  const starts = Array.isArray(timings.starts) ? timings.starts : [];
  if (starts.length === 0) return 0;
  const last = starts[starts.length - 1];
  const blockEstimate = timings.block_durations?.[starts.length - 1];
  if (typeof blockEstimate === "number" && blockEstimate > 0) {
    return last + blockEstimate;
  }
  return last + (starts.length > 1 ? starts[1] - starts[0] : 60);
}

export function buildChaptersText(timings = {}, format = "LONG") {
  const starts = Array.isArray(timings.starts) ? timings.starts : [];
  if (starts.length === 0) return "";

  const blockNames = format === "SHORT" ? SHORT_BLOCK_NAMES : LONG_BLOCK_NAMES;
  let chaptersText = "";

  for (let i = 0; i < starts.length && i < blockNames.length; i++) {
    chaptersText += `${formatTimestamp(starts[i])} - ${blockNames[i]}\n`;
  }

  return chaptersText.trim();
}

function buildNicheStrategyBlock({ category = "default", profile = {}, rpmHint = {}, format = "LONG" }) {
  const titleTypes = PROFILE_TITLE_TYPES[profile.id] || PROFILE_TITLE_TYPES.default;
  const bias = NICHE_TITLE_BIAS[category] || NICHE_TITLE_BIAS.default;

  return `
## ESTRATÉGIA DE NICHO E RPM (obrigatório — alinhe títulos e thumbnails a isto):
- Categoria: ${category}
- Perfil criativo do projeto: ${profile.label || "Padrão"} (${profile.id || "default"})
- RPM estimado: ${rpmHint.rpm || "variável"}
- Paleta visual (use nas thumbnails): ${(rpmHint.palette || []).join(", ")}
- Viés de título: ${bias}
- Os 5 títulos devem seguir EXATAMENTE estes ângulos (1 título por tipo):
  1. ${titleTypes[0]}
  2. ${titleTypes[1]}
  3. ${titleTypes[2]}
  4. ${titleTypes[3]}
  5. ${titleTypes[4]}
- Formato ${format === "SHORT" ? "SHORT" : "LONG"}: ${format === "SHORT"
    ? "título precisa funcionar sozinho no feed; thumbnail é secundária"
    : "título + thumbnail formam um par — nunca repita as mesmas palavras nos dois"}`;
}

function buildThumbnailAbRules(format = "LONG") {
  const aspect = format === "SHORT" ? "9:16 vertical" : "16:9 horizontal";
  return `
## REGRAS PARA THUMBNAILS A/B (3 variantes para teste de CTR):
- Gere 3 variantes (A, B, C) com abordagens visuais DIFERENTES
- Cada variante deve parear com um dos títulos gerados (indique qual)
- Texto na capa: máximo 3-5 palavras, fonte grande, alto contraste
- NUNCA repita o título palavra por palavra no texto da capa — complemente
- Composição ${aspect}: indique posição do texto, elemento focal e expressão
- Use a paleta de cores do nicho fornecida acima
- Variante A: curiosidade / pergunta visual
- Variante B: contraste ou escala (antes/depois, pequeno vs gigante)
- Variante C: número, dado ou prova visual`;
}

function buildStoryContext(storyboard = {}) {
  const strategy = storyboard.strategy || {};
  if (!storyboard.strategy) return "";

  return `
Contexto Estratégico do Vídeo:
- Título Original: ${strategy.title_main || "N/A"}
- Hook: ${strategy.hook || "N/A"}
- Público-alvo: ${strategy.target_audience || "N/A"}
- Tom: ${strategy.tone || "N/A"}
- Nicho: ${strategy.niche || storyboard.niche || "N/A"}
- Comentário Pinado Sugerido: ${strategy.pinned_comment || "N/A"}
- CTA: ${strategy.cta || "N/A"}
`;
}

function buildShortMetadataRules() {
  return `
## CONTEXTO: VÍDEO CURTO (YouTube Shorts, 9:16, feed vertical)

Objetivo duplo:
1. PARAR O SCROLL no feed de Shorts (título + primeiras linhas da descrição)
2. GERAR REWATCH e comentários rápidos (loop, pergunta binária, payoff no final)

## REGRAS PARA OS TÍTULOS (CTR NO FEED DE SHORTS):
- Máximo 35-40 caracteres. Títulos ultra-curtos performam melhor no feed mobile.
- Deve funcionar SOZINHO (muita gente vê o Short antes da thumbnail carregar).
- 5 opções com ângulos diferentes: pergunta impossível, contraste absurdo, número específico, "ninguém fala sobre isso", cliffhanger de 3 palavras.
- PROIBIDO: "99% não sabem", "segredo chocante", "revelado", "veja", "descubra", clickbait vazio.
- Linguagem humana, como criador real (casual, direto, instigante).

## REGRAS PARA A DESCRIÇÃO (DESCOBERTA NO FEED):
- Linha 1: palavras-chave pesquisáveis + gancho (YouTube indexa isso no Shorts)
- Linha 2: promessa ultra-específica do payoff em até 8 segundos de leitura
- Linha 3: inclua obrigatoriamente #Shorts
- Resto: 2-3 frases com keywords do nicho + CTA leve ("salva pra assistir depois")
- NÃO use capítulos longos — Shorts não precisa de timestamps

## REGRAS PARA HASHTAGS PRINCIPAIS:
- 5-8 hashtags: #Shorts + nicho + tema específico do vídeo + 1 trending genérica
- Ordem: mais específica primeiro, mais ampla por último

## REGRAS PARA AS TAGS:
- 10-12 tags curtas (Shorts usa menos tags que vídeos longos)
- Mix: termos do feed + nicho + variações de busca

## REGRAS PARA O COMENTÁRIO PINADO:
- Pergunta de escolha rápida (ex: "Você já sabia disso? Sim / Não / Só metade")
- Ou enquete implícita com 2-3 opções numeradas
- Máximo 2 frases — comentários curtos geram mais respostas em Shorts

${buildThumbnailAbRules("SHORT")}`;
}

function buildLongMetadataRules() {
  return `
## CONTEXTO: VÍDEO LONGO (16:9, busca + recomendação + retenção)

Objetivo triplo:
1. CTR alto na home/busca (título + thumbnail como par)
2. RETENÇÃO nos primeiros 30s e no meio do vídeo
3. ENGAJAMENTO em comentários e inscrições

## REGRAS PARA OS TÍTULOS (CTR BUSCA + HOME):
- Máximo 45-50 caracteres. Curto converte melhor em mobile.
- Título = metade da história; thumbnail = outra metade (não entregue tudo no título).
- 5 opções: curiosidade, emoção, número concreto, urgência sutil, provocação inteligente.
- PROIBIDO: "99% não sabem", "segredo chocante", "revelado", "veja", "descubra", clickbait vazio.
- Linguagem humana (Veritasium, MagnatesMedia, Tom Scott em PT-BR).

## REGRAS PARA A DESCRIÇÃO:
- Linhas 1-2 CRUCIAIS (aparecem antes de "Mostrar mais"):
  - Linha 1: gancho emocional que complementa o título
  - Linha 2: promessa concreta do que o espectador vai aprender
- Corpo: parágrafo SEO com keywords naturais (não keyword stuffing)
- Bullets com 3 benefícios do vídeo
- CTA para inscrição e comentário
- 3-5 hashtags no final

## REGRAS PARA AS TAGS:
- 15 tags ordenadas por volume de busca estimado
- Mix: alto volume + cauda longa + variações comuns de digitação

## REGRAS PARA O COMENTÁRIO PINADO:
- Pergunta aberta que gera debate (não sim/não fechado)
- Convite sutil para inscrição ou para assistir outro vídeo relacionado
- 2-3 frases máximo

## REGRAS PARA OS CAPÍTULOS:
- Use os timestamps reais fornecidos
- Nomes curiosos e específicos — NUNCA "Introdução", "Bloco 2", "Conclusão"
- Cada capítulo deve parecer um mini-título clicável

## GANCHO DE RETENÇÃO (primeiros 30 segundos):
- 2-3 frases do que o narrador deve enfatizar na abertura para segurar quem clicou
- Foco em promessa + tensão + "por que agora"

## CTA DE MEIO DE VÍDEO (~40-50% do runtime):
- 1-2 frases para reengajar quem está prestes a sair (pergunta, teaser do próximo bloco, mini cliffhanger)

${buildThumbnailAbRules("LONG")}`;
}

const THUMBNAIL_OUTPUT_TEMPLATE = `## THUMBNAILS A/B

### Variante A — Curiosidade
- Título pareado: (número e texto do título escolhido)
- Texto na capa: (máx 5 palavras)
- Composição: (layout, posição do texto, elemento focal)
- Cores: (3 hex da paleta do nicho)
- Expressão/elemento: (rosto, objeto ou cena de destaque)

### Variante B — Contraste
- Título pareado: ...
- Texto na capa: ...
- Composição: ...
- Cores: ...
- Expressão/elemento: ...

### Variante C — Prova Visual
- Título pareado: ...
- Texto na capa: ...
- Composição: ...
- Cores: ...
- Expressão/elemento: ...`;

export function buildYoutubeMetadataPrompt({
  transcript,
  chaptersText = "",
  storyboard = {},
  config = {},
  format = "LONG",
  niche = "Geral",
  totalDuration = 0,
  category = "default",
  profile = {},
  rpmHint = {},
}) {
  const storyContext = buildStoryContext(storyboard);
  const nicheStrategy = buildNicheStrategyBlock({ category, profile, rpmHint, format });
  const formatRules = format === "SHORT" ? buildShortMetadataRules() : buildLongMetadataRules();
  const durationHint = totalDuration > 0
    ? `Duração estimada: ~${Math.round(totalDuration)}s (${format === "SHORT" ? "Short" : "Longo"})`
    : `Formato detectado: ${format === "SHORT" ? "Short (9:16)" : "Longo (16:9)"}`;

  const outputSections = format === "SHORT"
    ? `## TÍTULOS
(liste os 5 títulos numerados, com contagem de caracteres ao lado: "1. Título aqui (38 chars)")

## DESCRIÇÃO
(descrição completa pronta para colar no YouTube Shorts)

## HASHTAGS PRINCIPAIS
(hashtags separadas por espaço, prontas para colar)

## TAGS
(tags separadas por vírgula)

## COMENTÁRIO PINADO
(texto do comentário pinado)

${THUMBNAIL_OUTPUT_TEMPLATE}`
    : `## TÍTULOS
(liste os 5 títulos numerados, com contagem de caracteres ao lado: "1. Título aqui (47 chars)")

## DESCRIÇÃO
(descrição completa pronta para colar)

## TAGS
(tags separadas por vírgula)

## COMENTÁRIO PINADO
(texto do comentário pinado)

## CAPÍTULOS
(lista de capítulos com timestamps reais)

## GANCHO DE RETENÇÃO
(2-3 frases para os primeiros 30 segundos)

## CTA DE MEIO DE VÍDEO
(1-2 frases para ~40-50% do vídeo)

${THUMBNAIL_OUTPUT_TEMPLATE}`;

  return `Você é um especialista em SEO para YouTube, psicologia de cliques e crescimento orgânico. Seu objetivo é MAXIMIZAR CTR e engajamento para o formato correto do vídeo.

${formatRules}

${nicheStrategy}

${durationHint}
Nicho do canal/projeto: ${niche}

${storyContext}

Roteiro do Vídeo:
IMPORTANTE: o roteiro completo está abaixo. Use como fonte principal. Não diga que o roteiro não foi fornecido.

--- INÍCIO DO ROTEIRO ---
${transcript}
--- FIM DO ROTEIRO ---

${format === "LONG" && chaptersText ? `Marcadores com tempos exatos do projeto:\n${chaptersText}` : ""}

FORMATO DE SAÍDA OBRIGATÓRIO (use exatamente estes headers em Markdown):

${outputSections}`;
}

function buildFallbackThumbnails({ titles = [], rpmHint = {}, format = "LONG" }) {
  const palette = rpmHint.palette || ["#D4AF37", "#00E5FF", "#121214"];
  const aspect = format === "SHORT" ? "9:16" : "16:9";
  const paired = (idx) => titles[idx]?.text || `Título #${idx + 1}`;

  return `## THUMBNAILS A/B

### Variante A — Curiosidade
- Título pareado: 1. ${paired(0)}
- Texto na capa: IMPOSÍVEL?
- Composição: ${aspect}, texto superior esquerdo, elemento focal central grande
- Cores: ${palette.join(", ")}
- Expressão/elemento: close no detalhe mais intrigante do vídeo

### Variante B — Contraste
- Título pareado: 2. ${paired(1)}
- Texto na capa: ANTES × DEPOIS
- Composição: ${aspect}, split diagonal, metade escura metade clara
- Cores: ${palette[0]}, ${palette[2] || "#121214"}, #FFFFFF
- Expressão/elemento: comparação visual de escala (pequeno vs gigante)

### Variante C — Prova Visual
- Título pareado: 3. ${paired(2)}
- Texto na capa: O NÚMERO
- Composição: ${aspect}, número grande no centro, fundo desfocado
- Cores: ${palette.join(", ")}
- Expressão/elemento: dado ou contagem do roteiro em destaque`;
}

function buildFallbackTitles({ baseTitle, category, profile, format }) {
  const titleTypes = PROFILE_TITLE_TYPES[profile?.id] || PROFILE_TITLE_TYPES.default;
  const maxLen = format === "SHORT" ? 38 : 48;
  const seeds = [
    baseTitle.slice(0, maxLen),
    titleTypes[1]?.includes("Número") ? "1 dado que muda tudo" : "O detalhe que ninguém viu",
    titleTypes[2]?.includes("escala") ? "A escala é absurda" : "Como isso foi possível?",
    titleTypes[3]?.includes("Pergunta") ? "Por que esconderam isso?" : "Isso não deveria existir",
    titleTypes[4]?.includes("Revelação") ? "O final explica tudo" : "Você nunca mais vai ver igual",
  ];

  return seeds.map((t, i) => {
    const text = t.slice(0, maxLen);
    return `${i + 1}. ${text} (${text.length} chars)`;
  }).join("\n");
}

export function buildFallbackYoutubeMetadata({
  transcript,
  chaptersText = "",
  storyboard = {},
  config = {},
  format = "LONG",
  niche = "Geral",
  category = "default",
  profile = {},
  rpmHint = {},
}) {
  const strategy = storyboard?.strategy || {};
  const baseTitle = strategy.title_main || getFirstSentences(transcript, 1) || "O detalhe que muda tudo nessa história";
  const hook = strategy.hook || getFirstSentences(transcript, 2) || "Uma história que parece impossível, mas foi real.";
  const resolvedCategory = category || detectNicheCategory(niche);
  const nicheTags = NICHE_TAG_POOLS[resolvedCategory] || NICHE_TAG_POOLS.default;
  const keywords = extractKeywords(`${baseTitle} ${hook} ${transcript}`, 12);
  const tags = [...new Set([...keywords, ...nicheTags])].slice(0, format === "SHORT" ? 12 : 15);
  const titlesBlock = buildFallbackTitles({ baseTitle, category: resolvedCategory, profile, format });
  const parsedTitles = parseYoutubeMetadataMarkdown(`## TÍTULOS\n${titlesBlock}`).titles;
  const thumbnailsBlock = buildFallbackThumbnails({ titles: parsedTitles, rpmHint, format });

  if (format === "SHORT") {
    const hashtags = `#Shorts #${nicheTags[0].replace(/\s/g, "")} #${nicheTags[1]?.replace(/\s/g, "") || "curiosidades"}`;
    return `## TÍTULOS

${titlesBlock}

## DESCRIÇÃO

${hook}

${getFirstSentences(transcript, 1)}

${hashtags}

Salva esse Short pra assistir de novo.

## HASHTAGS PRINCIPAIS

${hashtags}

## TAGS

${tags.join(", ")}

## COMENTÁRIO PINADO

Você já sabia disso? Comenta: Sim, Não ou Só metade — quero ver quantos se surpreenderam.

${thumbnailsBlock}`;
  }

  const chapters = chaptersText?.trim()
    ? chaptersText.trim().split(/\r?\n/).map((line) => {
        const [ts, ...rest] = line.split(" - ");
        const label = rest.join(" - ").trim();
        const catchy = label.replace(/^Bloco \d+$/i, "O que aconteceu aqui").replace(/^Abertura$/i, "O começo que ninguém esperava");
        return `${ts} - ${catchy}`;
      }).join("\n")
    : "00:00 - O começo que prende até o final";

  return `## TÍTULOS

${titlesBlock}

## DESCRIÇÃO

${hook}

Neste vídeo você entende os detalhes por trás dessa história e por que ela continua relevante.

• O contexto que a maioria ignora
• O momento que muda a interpretação
• A conclusão que conecta tudo

Assista até o final e comenta qual parte mais te surpreendeu.

${nicheTags.slice(0, 4).map((t) => `#${t.replace(/\s/g, "")}`).join(" ")}

## TAGS

${tags.join(", ")}

## COMENTÁRIO PINADO

Qual detalhe dessa história mais te surpreendeu? Comenta aqui — quero ver qual parte chamou mais atenção. Se inscreve pra mais vídeos assim.

## CAPÍTULOS

${chapters}

## GANCHO DE RETENÇÃO

Nos primeiros 30 segundos, deixe claro que existe uma resposta concreta no final e que o que parece óbvio no começo vai ser questionado.

## CTA DE MEIO DE VÍDEO

Se você chegou até aqui, o próximo bloco é onde a história vira de verdade — fica mais um pouco.

${thumbnailsBlock}`;
}

function getFirstSentences(text, count = 2) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, count)
    .join(" ");
}

function extractKeywords(text, limit = 15) {
  const stopWords = new Set([
    "a", "o", "os", "as", "um", "uma", "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
    "e", "ou", "que", "para", "por", "com", "sem", "como", "mais", "mas", "foi", "ser", "são", "seu",
    "sua", "seus", "suas", "esse", "essa", "este", "esta", "isso", "não", "sim", "ao", "aos", "pela",
    "pelo", "pelos", "pelas", "quando", "onde", "porque", "sobre", "entre", "até", "também", "muito",
  ]);

  const counts = new Map();
  const words = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]{4,}/g) || [];

  for (const word of words) {
    if (!stopWords.has(word)) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function shortOverlayFromTitle(title = "", fallback = "ASSISTA AGORA") {
  const words = String(title).replace(/\s*\(\d+\s*chars?\)\s*$/i, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  const chunk = words.slice(0, 4).join(" ").toUpperCase();
  return chunk.length > 22 ? `${words.slice(0, 3).join(" ").toUpperCase()}` : chunk;
}

export function ensureThumbnailVariants(parsed = {}, palette = []) {
  const existing = Array.isArray(parsed.thumbnails) ? parsed.thumbnails.filter(Boolean) : [];
  if (existing.length >= 3) return existing.slice(0, 3);

  const titles = parsed.titles || [];
  const colors = palette.length ? palette : ["#D4AF37", "#00E5FF", "#121214"];
  const defaults = [
    {
      id: "A",
      label: "Curiosidade",
      overlayText: parsed.thumbnailHook || shortOverlayFromTitle(titles[0]?.text, "IMPOSSÍVEL?"),
      pairedTitle: titles[0]?.text ? `1. ${titles[0].text}` : "",
      colors,
    },
    {
      id: "B",
      label: "Contraste",
      overlayText: shortOverlayFromTitle(titles[1]?.text, "ANTES × DEPOIS"),
      pairedTitle: titles[1]?.text ? `2. ${titles[1].text}` : "",
      colors,
    },
    {
      id: "C",
      label: "Prova Visual",
      overlayText: shortOverlayFromTitle(titles[2]?.text, "O NÚMERO"),
      pairedTitle: titles[2]?.text ? `3. ${titles[2].text}` : "",
      colors,
    },
  ];

  const merged = [...existing];
  for (const fallback of defaults) {
    if (merged.length >= 3) break;
    if (!merged.some((item) => item.id === fallback.id)) merged.push(fallback);
  }

  return merged.slice(0, 3);
}

function parseThumbnailVariants(content = "") {
  const variants = [];
  const normalized = String(content).trim();
  if (!normalized) return variants;

  const blocks = normalized.split(/^###\s+/m).filter(Boolean);
  const extraBlocks = normalized.split(/^(?:\*\*)?Variante\s+[A-C]/gim).filter(Boolean);
  const allBlocks = blocks.length > 1 ? blocks : extraBlocks;

  for (const block of allBlocks) {
    const lines = block.split("\n");
    const header = lines[0]?.trim() || "";
    const headerMatch = header.match(/^(?:\*\*)?Variante\s+([A-C])\s*(?:\*\*)?\s*[—–:-]\s*(.+)$/i)
      || header.match(/^(?:\*\*)?Variante\s+([A-C])\b/i);
    const id = headerMatch?.[1]?.toUpperCase() || String.fromCharCode(65 + variants.length);
    const label = headerMatch?.[2]?.trim() || header;
    const fields = {};

    for (const line of lines.slice(1)) {
      const fieldMatch = line.match(/^-\s*(.+?):\s*(.+)$/);
      if (!fieldMatch) continue;
      const key = fieldMatch[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      fields[key] = fieldMatch[2].trim();
    }

    variants.push({
      id,
      label,
      pairedTitle: fields["titulo pareado"] || fields.titulo || "",
      overlayText: fields["texto na capa"] || fields.texto || "",
      composition: fields.composicao || "",
      colors: (fields.cores || "").split(/[,;]/).map((c) => c.trim()).filter(Boolean),
      focalElement: fields["expressao/elemento"] || fields.expressao || fields.elemento || fields.foco || "",
    });
  }

  return variants;
}

export function parseYoutubeMetadataMarkdown(text = "") {
  const sections = {};
  const parts = String(text).split(/^## /m).filter(Boolean);

  for (const part of parts) {
    const lines = part.split("\n");
    const key = lines[0]?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const content = lines.slice(1).join("\n").trim();
    if (key) sections[key] = content;
  }

  const titlesRaw = sections.TITULOS || "";
  const titles = titlesRaw
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?)\s*\((\d+)\s*chars?\)\s*$/i);
      if (match) return { text: match[1].trim(), chars: Number(match[2]) };
      return { text: line.replace(/\s*\(\d+\s*chars?\)\s*$/i, "").trim(), chars: line.length };
    });

  const thumbnailsRaw = sections["THUMBNAILS A/B"] || sections["THUMBNAILS AB"] || sections.THUMBNAILS || "";
  let thumbnails = parseThumbnailVariants(thumbnailsRaw);
  const thumbnailHook = sections["GANCHO PARA THUMBNAIL"] || thumbnails[0]?.overlayText || "";

  if (thumbnails.length < 3) {
    thumbnails = ensureThumbnailVariants({ titles, thumbnails, thumbnailHook });
  }

  return {
    titles,
    description: sections.DESCRICAO || "",
    tags: sections.TAGS || "",
    hashtags: sections["HASHTAGS PRINCIPAIS"] || "",
    pinnedComment: sections["COMENTARIO PINADO"] || "",
    chapters: sections.CAPITULOS || "",
    thumbnails,
    thumbnailHook,
    retentionHook: sections["GANCHO DE RETENCAO"] || "",
    midVideoCta: sections["CTA DE MEIO DE VIDEO"] || "",
    recommendedTitle: titles[0]?.text || "",
  };
}

export function resolveYoutubeMetadataContext({
  config = {},
  timings = {},
  storyboard = {},
  projectName = "",
}) {
  const totalDuration = estimateTotalDuration(timings);
  const format = detectVideoFormat(config, totalDuration);
  const niche = config.niche || storyboard?.strategy?.niche || storyboard?.niche || "Geral";
  const chaptersText = format === "LONG" ? buildChaptersText(timings, format) : "";
  const { profile, category } = selectVarietyProfile(projectName, niche);
  const rpmHint = NICHE_RPM_HINTS[category] || NICHE_RPM_HINTS.default;

  return {
    format,
    niche,
    totalDuration,
    chaptersText,
    category,
    profile,
    rpmHint,
    projectName,
  };
}