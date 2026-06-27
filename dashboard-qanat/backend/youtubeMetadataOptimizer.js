import { detectVideoFormat, detectNicheCategory } from "./overlayOrchestration.js";

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

## GANCHO PARA THUMBNAIL (se houver frame de capa):
- 1 frase que complementa o título sem repetir palavras
- Foco em expressão visual ou elemento gráfico chamativo`;
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
- 1-2 frases para reengajar quem está prestes a sair (pergunta, teaser do próximo bloco, mini cliffhanger)`;
}

export function buildYoutubeMetadataPrompt({
  transcript,
  chaptersText = "",
  storyboard = {},
  config = {},
  format = "LONG",
  niche = "Geral",
  totalDuration = 0,
}) {
  const storyContext = buildStoryContext(storyboard);
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

## GANCHO PARA THUMBNAIL
(1 frase para complementar título na capa)`
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
(1-2 frases para ~40-50% do vídeo)`;

  return `Você é um especialista em SEO para YouTube, psicologia de cliques e crescimento orgânico. Seu objetivo é MAXIMIZAR CTR e engajamento para o formato correto do vídeo.

${formatRules}

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

export function buildFallbackYoutubeMetadata({
  transcript,
  chaptersText = "",
  storyboard = {},
  config = {},
  format = "LONG",
  niche = "Geral",
}) {
  const strategy = storyboard?.strategy || {};
  const baseTitle = strategy.title_main || getFirstSentences(transcript, 1) || "O detalhe que muda tudo nessa história";
  const hook = strategy.hook || getFirstSentences(transcript, 2) || "Uma história que parece impossível, mas foi real.";
  const category = detectNicheCategory(niche);
  const nicheTags = NICHE_TAG_POOLS[category] || NICHE_TAG_POOLS.default;
  const keywords = extractKeywords(`${baseTitle} ${hook} ${transcript}`, 12);
  const tags = [...new Set([...keywords, ...nicheTags])].slice(0, format === "SHORT" ? 12 : 15);

  if (format === "SHORT") {
    const shortTitle = baseTitle.slice(0, 38);
    const hashtags = `#Shorts #${nicheTags[0].replace(/\s/g, "")} #${nicheTags[1]?.replace(/\s/g, "") || "curiosidades"}`;
    return `## TÍTULOS

1. ${shortTitle} (${shortTitle.length} chars)
2. Por que ninguém fala disso? (${"Por que ninguém fala disso?".length} chars)
3. Isso muda tudo (${"Isso muda tudo".length} chars)
4. Você sabia disso? (${"Você sabia disso?".length} chars)
5. Espera até o final (${"Espera até o final".length} chars)

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

## GANCHO PARA THUMBNAIL

O frame mais impactante do vídeo com texto curto que não repete o título.`;
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

1. ${baseTitle.slice(0, 48)} (${Math.min(baseTitle.length, 48)} chars)
2. O detalhe que quase ninguém percebeu (${"O detalhe que quase ninguém percebeu".length} chars)
3. Como isso foi possível? (${"Como isso foi possível?".length} chars)
4. A engenharia que intriga especialistas (${"A engenharia que intriga especialistas".length} chars)
5. Você nunca mais vai ver igual (${"Você nunca mais vai ver igual".length} chars)

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

Se você chegou até aqui, o próximo bloco é onde a história vira de verdade — fica mais um pouco.`;
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

  return {
    titles,
    description: sections.DESCRICAO || "",
    tags: sections.TAGS || "",
    hashtags: sections["HASHTAGS PRINCIPAIS"] || "",
    pinnedComment: sections["COMENTARIO PINADO"] || "",
    chapters: sections.CAPITULOS || "",
    thumbnailHook: sections["GANCHO PARA THUMBNAIL"] || "",
    retentionHook: sections["GANCHO DE RETENCAO"] || "",
    midVideoCta: sections["CTA DE MEIO DE VIDEO"] || "",
    recommendedTitle: titles[0]?.text || "",
  };
}

export function resolveYoutubeMetadataContext({ config = {}, timings = {}, storyboard = {} }) {
  const totalDuration = estimateTotalDuration(timings);
  const format = detectVideoFormat(config, totalDuration);
  const niche = config.niche || storyboard?.strategy?.niche || storyboard?.niche || "Geral";
  const chaptersText = format === "LONG" ? buildChaptersText(timings, format) : "";

  return { format, niche, totalDuration, chaptersText };
}