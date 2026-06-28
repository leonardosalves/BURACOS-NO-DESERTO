/** Geração e refinamento de títulos YouTube (Shorts + Longo) ancorados no roteiro. */

const BANNED_TITLE_PATTERNS = [
  /você não vai acreditar/i,
  /99\s*%/i,
  /segredo(s)? (chocante|revelado)/i,
  /\b(revelado|revelação chocante)\b/i,
  /\b(veja|descubra|assista)( agora)?\b/i,
  /incrível|surpreendente|impressionante/i,
  /história incrível/i,
  /não é o que você pensa/i,
  /a verdade sobre tudo/i,
  /isso vai mudar sua vida/i,
  /prepare-se/i,
  /fique até o final/i,
  /sem mais delongas/i,
  /o segredo de/i,
  /a verdade sobre/i,
  /o que ninguém te conta/i,
  /isso muda tudo/i,
  /você precisa saber/i,
  /nunca mais será o mesmo/i,
];

const GENERIC_TITLE_WORDS = new Set([
  "coisa", "coisas", "algo", "tudo", "verdade", "segredo", "história", "fato", "fatos",
  "incrível", "surpreendente", "chocante", "revelado", "importante", "interessante",
  "fascinante", "extraordinário", "extraordinario", "jornada", "universo", "mundo",
]);

const PT_STOP_WORDS = new Set([
  "para", "como", "mais", "muito", "sobre", "entre", "depois", "antes", "quando",
  "onde", "porque", "porquê", "ainda", "também", "sempre", "nunca", "todo", "toda",
  "todos", "todas", "esse", "essa", "este", "esta", "isso", "aquilo", "aqui", "ali",
  "então", "assim", "mesmo", "mesma", "outro", "outra", "cada", "qual", "quais",
]);

const INVALID_TITLE_NOUNS = new Set([
  "você", "voce", "voc", "eu", "ele", "ela", "nós", "nos", "eles", "elas",
  "isso", "isto", "aquilo", "sem", "com", "para", "mas", "que", "como",
  "quando", "onde", "por", "se", "já", "ja", "top", "lugar", "número", "numero",
  "primeiro", "segundo", "terceiro", "ninguém", "ninguem", "alguém", "alguem",
]);

const INCOMPLETE_ENDINGS = new Set([
  "o", "a", "os", "as", "um", "uma", "de", "da", "do", "das", "dos",
  "em", "no", "na", "nos", "nas", "e", "ou", "que", "com", "por", "para", "se",
  "ao", "aos", "detalhe", "história", "historia", "segredo", "verdade", "coisa", "fato",
  "mudaram", "mudou", "fez", "era", "eram", "tinha", "foram", "ficou", "parecia",
]);

function clip(text = "", max = 50) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function isValidTitleNoun(word = "") {
  const w = String(word || "").trim();
  if (!w || w.length < 3) return false;
  const lower = w.toLowerCase().normalize("NFC");
  if (INVALID_TITLE_NOUNS.has(lower)) return false;
  if (GENERIC_TITLE_WORDS.has(lower)) return false;
  if (/^voc$/i.test(w)) return false;
  return true;
}

function filterProperNouns(nouns = []) {
  return nouns.filter((n) => {
    const parts = String(n).trim().split(/\s+/);
    return parts.every((p) => isValidTitleNoun(p));
  });
}

function isCompleteTitle(text = "", format = "LONG") {
  const t = sanitizeTitle(text);
  if (!t || t.length < 10) return false;

  const max = format === "SHORT" ? 40 : 50;
  if (t.length > max) return false;

  const words = t.split(/\s+/);
  const lastWord = words[words.length - 1]?.replace(/[.:;!?—–-]+$/, "").toLowerCase();
  if (INCOMPLETE_ENDINGS.has(lastWord)) return false;

  if (/ e o detalhe$/i.test(t) || / e a história$/i.test(t) || / e o segredo$/i.test(t)) {
    return false;
  }

  if (/\bvoc\b/i.test(t) && !/\bvocê\b/i.test(t)) return false;
  if (/\bvoce\b/i.test(t) && !/\bvocê\b/i.test(t)) return false;

  if (/^\d+\.\d+\s/i.test(t) && !/^\d+\.\d+\s*(mil|%|km|anos?|séculos?|metros?)/i.test(t)) {
    return false;
  }

  if (/fez isso e ninguém explicou$/i.test(t)) return false;
  if (/a conexão que faltava$/i.test(t) && /^(você|voce|voc|sem|isso|ele|ela)\b/i.test(t)) {
    return false;
  }

  return true;
}

function extractKeyPhrases(text = "", limit = 6) {
  const sentences = String(text).split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  const phrases = [];

  for (const sentence of sentences.slice(0, 8)) {
    const cleaned = sentence
      .replace(/["'«»]/g, "")
      .replace(/\b(o|a|os|as|um|uma|de|da|do|das|dos|em|no|na|que|se|por|com)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words = cleaned
      .split(" ")
      .map((w) => w.replace(/[.,;:!?]+$/, ""))
      .filter((w) => w.length > 3 && !PT_STOP_WORDS.has(w.toLowerCase()));
    if (words.length >= 3) {
      phrases.push(words.slice(0, 5).join(" "));
    }
  }

  return [...new Set(phrases)].slice(0, limit);
}

function extractSubject(text = "") {
  const first = String(text).split(/(?<=[.!?])\s+/)[0] || "";
  const match = first.match(/\b(?:o|a|os|as)\s+([a-záéíóúâêôãõç]+(?:\s+[a-záéíóúâêôãõç]+){0,3})/i);
  if (match) return match[1].trim();
  const words = first.split(/\s+/).filter((w) => w.length > 4);
  return words.slice(0, 3).join(" ") || "";
}

function isWeakStrategyTitle(title = "") {
  const t = sanitizeTitle(title);
  if (!t || t.length < 8) return true;
  return /^(customized|custom|untitled|test|geral|ideia|video|vídeo)$/i.test(t);
}

function titleOverlapsTranscript(title = "", transcript = "") {
  const titleWords = sanitizeTitle(title).toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const text = String(transcript).toLowerCase();
  if (!titleWords.length || !text) return false;
  const hits = titleWords.filter((w) => text.includes(w)).length;
  return hits >= Math.min(2, titleWords.length);
}

function extractContentKeywords(text = "", limit = 12) {
  const counts = new Map();
  const words = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z]{5,}/g) || [];

  for (const word of words) {
    if (PT_STOP_WORDS.has(word) || GENERIC_TITLE_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function extractStoryboardEntities(storyboard = {}) {
  const entities = [];

  for (const item of storyboard?.list_items || []) {
    if (item?.title) entities.push(String(item.title).trim());
    if (item?.origin) entities.push(String(item.origin).trim());
  }

  for (const item of storyboard?.impact_texts || []) {
    const txt = String(item?.text || "").replace(/^#\d+\s*[—-]\s*/i, "").trim();
    if (txt && txt.length > 3) entities.push(txt);
  }

  if (storyboard?.listicle?.topic) entities.push(String(storyboard.listicle.topic).trim());

  return [...new Set(entities.filter(Boolean))].slice(0, 12);
}

function resolveCoreTopic({ text, storyboard = {}, strategy = {} }) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 12);
  const listicle = storyboard?.listicle || {};

  if (listicle.topic) {
    const rank = listicle.rank_count || text.match(/\btop\s+(\d+)\b/i)?.[1];
    return rank ? `Top ${rank} ${listicle.topic}` : listicle.topic;
  }

  const listItems = (storyboard?.list_items || []).map((item) => item?.title).filter(Boolean).slice(0, 3);
  if (listItems.length >= 2) {
    return listItems.join(", ");
  }

  const subject = extractSubject(text);
  const opening = sentences.slice(0, 2).join(" ").slice(0, 120);
  const strategyTitle = sanitizeTitle(strategy.title_main || "");

  if (!isWeakStrategyTitle(strategyTitle) && titleOverlapsTranscript(strategyTitle, text)) {
    return strategyTitle;
  }

  return subject || opening || strategyTitle || sentences[0] || "";
}

export function titleRelevanceScore(title = "", transcript = "", facts = {}) {
  const t = sanitizeTitle(title).toLowerCase();
  const text = String(transcript).toLowerCase();
  if (!t || !text) return 0;

  let hits = 0;
  let checks = 0;

  for (const noun of facts.properNouns || []) {
    checks += 1;
    const token = String(noun).toLowerCase().split(/\s+/).find((w) => w.length > 3) || "";
    if (token && t.includes(token)) hits += 1;
  }

  for (const kw of facts.contentKeywords || []) {
    checks += 1;
    if (t.includes(String(kw).toLowerCase())) hits += 1;
  }

  if (facts.coreTopic) {
    const topicWords = facts.coreTopic.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    for (const word of topicWords.slice(0, 6)) {
      checks += 1;
      if (text.includes(word) && t.includes(word)) hits += 1;
    }
  }

  return checks > 0 ? hits / checks : 0;
}

export function titlesLackRelevance(titles = [], transcript = "", facts = {}) {
  if (!titles.length || !transcript) return true;
  const scores = titles.map((item) => titleRelevanceScore(item.text || item, transcript, facts));
  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const good = scores.filter((score) => score >= 0.15).length;
  return avg < 0.12 || good < 2;
}

export function extractTitleFacts({ transcript = "", storyboard = {} } = {}) {
  const strategy = storyboard?.strategy || {};
  const text = String(transcript || "").replace(/\s+/g, " ").trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 12);
  const midIdx = Math.floor(sentences.length / 2);

  const topCount = text.match(/\btop\s+(\d+)\b/i)?.[1]
    || storyboard?.listicle?.rank_count
    || null;

  const numbers = [...text.matchAll(/\b\d+[\d.,]*\s*(?:%|mil|milhões?|bilhões?|anos?|séculos?|km|metros?|toneladas?|pessoas?|dias?|horas?)?\b/gi)]
    .map((m) => m[0].trim())
    .filter((n) => {
      const bare = n.replace(/\s/g, "");
      if (/^\d+\.\d+$/.test(bare)) return false;
      if (/^\d+$/.test(bare) && bare !== String(topCount)) return false;
      return true;
    })
    .slice(0, 6);

  const capitalized = filterProperNouns(
    [...text.matchAll(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+(?:de|da|do|das|dos)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+|\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+){0,2}\b/g)]
      .map((m) => m[0])
      .filter((w) => !["O", "A", "Os", "As", "Um", "Uma", "No", "Na", "Em", "De", "Do", "Da", "E", "Mas", "Se"].includes(w.split(" ")[0])),
  );

  const storyboardEntities = extractStoryboardEntities(storyboard);
  const contentKeywords = extractContentKeywords(text);
  const properNouns = [...new Set([...storyboardEntities, ...capitalized])].slice(0, 12);

  const hook = sentences[0] || strategy.hook || "";
  const payoff = sentences[sentences.length - 1] || "";
  const twist = sentences[midIdx] || sentences[Math.max(0, sentences.length - 3)] || "";
  const coreTopic = resolveCoreTopic({ text, storyboard, strategy });
  const keyPhrases = extractKeyPhrases(text);

  return {
    hook: clip(hook, 200),
    coreTopic: clip(coreTopic, 160),
    payoff: clip(payoff, 160),
    twist: clip(twist, 160),
    numbers,
    properNouns,
    contentKeywords,
    keyPhrases,
    oneLineSummary: sentences.slice(0, 3).join(" ").slice(0, 280),
  };
}

export function buildTitleCraftRules(format = "LONG") {
  const maxChars = format === "SHORT" ? 40 : 50;
  const shortExtra = format === "SHORT"
    ? `
FÓRMULAS QUE FUNCIONAM EM SHORTS (use 1 por título):
- Pergunta específica: "Por que [X] fez [Y]?"
- Contraste: "[Coisa comum] era na verdade [twist]"
- Número + consequência: "[Número] [unidade] e ninguém explica"
- Nome próprio + ação: "[Quem] fez [o quê] em [onde]"
- Cliffhanger curto: 3-5 palavras que exigem contexto do vídeo`
    : `
FÓRMULAS QUE FUNCIONAM EM VÍDEOS LONGOS (use 1 por título):
- Lacuna: "O que aconteceu com [X] depois de [Y]?"
- Paradoxo: "[Fato aparente] — mas [twist do roteiro]"
- Escala: "Como [grupo] [fez algo impossível] em [época/lugar]"
- Detalhe ignorado: "O detalhe em [lugar/evento] que muda tudo"
- Consequência hoje: "Por que [evento histórico] ainda afeta [hoje]"`;

  return `
## ENGENHARIA DE TÍTULOS (PRIORIDADE MÁXIMA — qualidade acima de clickbait)

Cada título deve passar no "teste da avó": uma pessoa leiga entende DO QUE É o vídeo só lendo o título?

REGRAS OBRIGATÓRIAS:
- Máximo ${maxChars} caracteres (conte antes de responder) — frase COMPLETA, nunca corte no meio.
- Se não couber em ${maxChars} com sentido completo, reescreva mais curto — nunca termine em "e o detalhe", "de", "o" ou preposição.
- Ancore em FATOS do roteiro: nomes, lugares, datas, números, objeto concreto do vídeo.
- 5 títulos com ângulos DIFERENTES — nunca cinco variações da mesma frase.
- Título entrega metade da curiosidade; NÃO entregue o payoff completo (isso fica no vídeo).
- Português brasileiro natural — como título de canal grande (Ciência Todo Dia, Nerdologia, Manual do Mundo), não como anúncio ou blog SEO.
- Sem ponto final. Máximo 1 emoji (prefira zero).
- Comece com substantivo, nome ou número — evite "Como", "Por que" em todos os 5 títulos.
${shortExtra}

PROIBIDO (rejeite mentalmente antes de escrever):
- "Você não vai acreditar", "99%", "segredo chocante", "revelado", "veja", "descubra"
- "Incrível", "surpreendente", "impressionante" sem dado concreto na mesma frase
- Títulos genéricos: "A verdade sobre...", "O que ninguém te conta", "Isso muda tudo"
- Títulos que poderiam servir para QUALQUER vídeo do nicho (sem especificidade)

CHECKLIST (cada título deve marcar 3+ itens):
□ Menciona elemento específico do roteiro (nome, lugar, número ou evento)
□ Gera pergunta mental no espectador
□ Cabe no limite de caracteres
□ Não repete palavras-chave de outro título da lista
□ Soa humano quando lido em voz alta`;
}

export function buildTitleFactsBlock(facts = {}) {
  if (!facts.coreTopic) return "";
  return `
## SOBRE O QUE É ESTE VÍDEO (obrigatório — cada título deve refletir isto)
- Tema central do roteiro: ${facts.coreTopic}
- Resumo em 1 linha: ${facts.oneLineSummary || "—"}
- Gancho real do vídeo: ${facts.hook || "—"}
- Virada do meio: ${facts.twist || "—"}
- Payoff / virada final: ${facts.payoff || "—"}
- Números citados: ${facts.numbers?.length ? facts.numbers.join(", ") : "nenhum — use detalhe concreto do texto"}
- Nomes, itens e lugares: ${facts.properNouns?.length ? facts.properNouns.join(", ") : "extraia do roteiro"}
- Palavras-chave do roteiro: ${facts.contentKeywords?.length ? facts.contentKeywords.join(", ") : "—"}
- Frases-chave: ${facts.keyPhrases?.length ? facts.keyPhrases.join(" | ") : "—"}

REGRA DE OURO: se um título pudesse servir para outro vídeo do mesmo nicho, ele está ERRADO. Use pelo menos 1 nome, número ou termo específico desta lista em cada título.`;
}

export function fitTitleToLimit(text, max, format = "LONG") {
  let t = sanitizeTitle(text);
  if (!t) return null;
  if (t.length <= max) return isCompleteTitle(t, format) ? t : null;

  const dashParts = t.split(/\s*[—–-]\s+/);
  if (dashParts.length > 1) {
    const head = dashParts[0].trim();
    if (head.length >= 12 && head.length <= max && isCompleteTitle(head, format)) return head;
  }

  const words = t.split(/\s+/);
  while (words.length > 4) {
    words.pop();
    const candidate = words.join(" ").replace(/\s*[\u2014\u2013,-]\s*$/, "").trim();
    if (candidate.length <= max && candidate.length >= 12 && isCompleteTitle(candidate, format)) {
      return candidate;
    }
  }

  return null;
}

export function generateTitlesFromFacts(facts = {}, { format = "LONG" } = {}) {
  const max = format === "SHORT" ? 40 : 50;
  const noun = facts.properNouns?.find((n) => isValidTitleNoun(n)) || "";
  const noun2 = facts.properNouns?.filter((n) => n !== noun).find((n) => isValidTitleNoun(n)) || "";
  const num = facts.numbers?.find((n) => !/^\d+\.\d+$/.test(String(n).replace(/\s/g, ""))) || "";
  const topic = sanitizeTitle(facts.coreTopic);
  const topicShort = topic.split(/\s+/).slice(0, 5).join(" ");
  const phrase = facts.keyPhrases?.find((p) => p.split(/\s+/).length >= 3) || "";
  const twistWords = sanitizeTitle(facts.twist).split(/\s+/).slice(0, 5).join(" ");
  const topMatch = topic.match(/^top\s+(\d+)\s+(.+)$/i);
  const isListicle = Boolean(topMatch);

  const candidates = [
    isListicle && topMatch ? { text: `Top ${topMatch[1]} ${topMatch[2]} imperiais`, angle: "numero" } : null,
    isListicle && topMatch ? { text: `${topMatch[1]} ${topMatch[2]} que mudaram tudo`, angle: "numero" } : null,
    isListicle && topMatch ? { text: `${topMatch[1]} ${topMatch[2]} — o último surpreende`, angle: "cliffhanger" } : null,
    num && noun ? { text: `${num}: o lado oculto de ${noun}`, angle: "numero" } : null,
    noun ? { text: `Por que ${noun} ainda importa hoje`, angle: "pergunta" } : null,
    noun && noun2 ? { text: `${noun} e ${noun2} — a ligação real`, angle: "nome" } : null,
    twistWords.length > 12 ? { text: `${twistWords}, mas há um porém`, angle: "paradoxo" } : null,
    phrase ? { text: `${phrase} — a versão real`, angle: "paradoxo" } : null,
    num && !isListicle ? { text: `${num} e o impacto até hoje`, angle: "numero" } : null,
    noun ? { text: `O que ${noun} mudou depois disso`, angle: "lacuna" } : null,
    topicShort && !isListicle ? { text: `${topicShort} — o detalhe esquecido`, angle: "detalhe" } : null,
    format === "SHORT" && noun ? { text: `${noun} explicado em 40s`, angle: "cliffhanger" } : null,
    format === "SHORT" && num && !isListicle ? { text: `${num} em 40 segundos`, angle: "numero" } : null,
  ].filter(Boolean);

  return candidates
    .map((c) => {
      const fitted = fitTitleToLimit(c.text, max, format);
      if (!fitted) return null;
      return {
        text: fitted,
        angle: c.angle,
        chars: fitted.length,
        _source: "fallback",
      };
    })
    .filter(Boolean);
}

export function buildTitleRepairPrompt({ titles = [], transcript = "", format = "LONG", facts = {} }) {
  const maxChars = format === "SHORT" ? 40 : 50;
  const titleList = titles.map((t, i) => `${i + 1}. ${t.text} (score: ${t.score ?? "?"}, ${t.chars} chars)`).join("\n");
  const generated = generateTitlesFromFacts(facts, { format }).slice(0, 3);
  const examples = generated.map((t) => `- [${t.angle}] ${t.text}`).join("\n");

  return `Você é editor de títulos para YouTube em PT-BR. Os títulos abaixo NÃO representam o vídeo real — estão genéricos ou sobre outro assunto. Reescreva os 5 títulos do zero, ancorados no roteiro.

FORMATO: ${format === "SHORT" ? "Shorts" : "Vídeo longo"}
LIMITE: ${maxChars} caracteres cada (rigoroso)

SOBRE O QUE O VÍDEO REALMENTE FALA (use isto, não invente outro tema):
${JSON.stringify(facts, null, 2).slice(0, 2500)}

EXEMPLOS DE BOA QUALIDADE (inspire-se no estilo, não copie):
${examples || "(use nomes, números e detalhes do roteiro)"}

TÍTULOS ATUAIS (ruins — descarte o estilo):
${titleList}

ROTEIRO COMPLETO (fonte da verdade — cada título deve ser sobre ESTE conteúdo):
${String(transcript).slice(0, 8000)}

Retorne APENAS JSON:
{
  "titles": [
    { "text": "título 1", "angle": "pergunta|numero|paradoxo|nome|cliffhanger|lacuna|detalhe" },
    { "text": "título 2", "angle": "..." },
    { "text": "título 3", "angle": "..." },
    { "text": "título 4", "angle": "..." },
    { "text": "título 5", "angle": "..." }
  ],
  "recommendedIndex": 0
}

Cada título: específico ao roteiro, humano, sem clickbait vazio, ângulos todos diferentes.`;
}

export function buildStrategyTitleRepairPrompt({ strategy = {}, transcript = "", format = "LONG", facts = {}, ideaTitle = "" }) {
  const maxChars = format === "SHORT" ? 40 : 50;
  const current = [
    strategy.title_main,
    ...(strategy.title_variations || []),
  ].filter(Boolean);

  return `Reescreva o título principal e 5 variações para um vídeo YouTube em PT-BR.

IDEIA ORIGINAL: ${ideaTitle || facts.coreTopic}
FORMATO: ${format === "SHORT" ? "Shorts" : "Longo"}
LIMITE: ${maxChars} caracteres por título

FATOS DO ROTEIRO:
${JSON.stringify(facts, null, 2).slice(0, 2000)}

TÍTULOS ATUAIS (ruins):
${current.map((t, i) => `${i + 1}. ${t}`).join("\n")}

ROTEIRO (início):
${String(transcript).slice(0, 2500)}

${buildTitleCraftRules(format)}

Retorne APENAS JSON:
{
  "title_main": "melhor título",
  "title_variations": ["var1", "var2", "var3", "var4", "var5"]
}`;
}

export function sanitizeTitle(text = "") {
  let t = String(text || "").trim();
  t = t.replace(/^\d+\.\s*/, "");
  t = t.replace(/\s*\(\d+\s*chars?\)\s*$/i, "");
  t = t.replace(/^["'""]+|["'""]+$/g, "");
  t = t.replace(/\s+/g, " ");
  t = t.replace(/[.!?]+$/g, "");
  for (const pattern of BANNED_TITLE_PATTERNS) {
    if (pattern.test(t)) {
      t = t.replace(pattern, "").replace(/\s*—\s*$/, "").trim();
    }
  }
  if (t.length > 0 && t[0] === t[0].toLowerCase()) {
    t = t[0].toUpperCase() + t.slice(1);
  }
  return t.trim();
}

export function scoreTitle(text = "", format = "LONG", facts = {}) {
  const t = sanitizeTitle(text);
  if (!t || t.length < 8) return -10;

  const max = format === "SHORT" ? 40 : 50;
  let score = 0;

  if (t.length <= max) score += 15;
  else if (t.length <= max + 8) score += 5;
  else score -= 20;

  if (/\d/.test(t)) score += 12;
  if (/\?/.test(t)) score += 6;
  if (/[—–-]/.test(t)) score += 4;

  const words = t.toLowerCase().split(/\s+/);
  const genericHits = words.filter((w) => GENERIC_TITLE_WORDS.has(w)).length;
  score -= genericHits * 10;

  for (const pattern of BANNED_TITLE_PATTERNS) {
    if (pattern.test(t)) score -= 30;
  }

  const factTokens = [
    ...(facts.numbers || []),
    ...(facts.properNouns || []),
    ...(facts.contentKeywords || []),
    ...(facts.keyPhrases || []),
  ].map((s) => String(s).toLowerCase());

  let factHits = 0;
  for (const token of factTokens) {
    const probe = token.split(" ").find((w) => w.length > 3) || token;
    if (probe.length > 2 && t.toLowerCase().includes(probe)) {
      factHits++;
      if (factHits >= 3) break;
    }
  }
  score += factHits * 12;
  score += Math.round(titleRelevanceScore(t, facts.oneLineSummary || facts.coreTopic || "", facts) * 20);

  if (facts.coreTopic) {
    const topicWords = facts.coreTopic.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const overlap = topicWords.filter((w) => t.toLowerCase().includes(w)).length;
    score += Math.min(overlap * 4, 16);
  }

  if (t.split(/\s+/).length <= 3 && format === "SHORT") score += 5;
  if (t.split(/\s+/).length >= 12) score -= 8;
  if (t === t.toUpperCase() && t.length > 10) score -= 15;

  const startsGeneric = /^(como|por que|o que|a verdade|o segredo)\b/i.test(t);
  if (startsGeneric) score -= 3;

  if (!isCompleteTitle(t, format)) score -= 50;

  return score;
}

function titleSimilarity(a, b) {
  const wa = new Set(sanitizeTitle(a).toLowerCase().split(/\s+/));
  const wb = new Set(sanitizeTitle(b).toLowerCase().split(/\s+/));
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.max(wa.size, wb.size, 1);
}

export function titlesNeedRepair(titles = [], format = "LONG", facts = {}) {
  if (!titles.length) return true;
  const scored = titles.map((t) => scoreTitle(t.text || t, format, facts));
  const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
  const hasBanned = titles.some((t) => BANNED_TITLE_PATTERNS.some((p) => p.test(t.text || t)));
  const hasIncomplete = titles.some((t) => !isCompleteTitle(t.text || t, format));
  const tooFew = titles.length < 5;
  const tooSimilar = titles.length >= 2 && titleSimilarity(titles[0].text || titles[0], titles[1].text || titles[1]) > 0.6;
  const relevance = titles.map((item) => titleRelevanceScore(item.text || item, facts.oneLineSummary || facts.coreTopic || "", facts));
  const lowRelevance = relevance.filter((score) => score < 0.12).length >= Math.ceil(titles.length * 0.6);
  return avg < 28 || hasBanned || hasIncomplete || tooFew || tooSimilar || lowRelevance;
}

export function polishTitles(titles = [], { format = "LONG", facts = {} } = {}) {
  const max = format === "SHORT" ? 40 : 50;
  const polished = [];
  const seen = [];

  for (const item of titles) {
    const fitted = fitTitleToLimit(item.text || item, max, format);
    if (!fitted) continue;

    const tooSimilar = seen.some((prev) => titleSimilarity(prev, fitted) > 0.5);
    if (tooSimilar) continue;

    let score = scoreTitle(fitted, format, facts);
    if (item._source === "ai" || item._fromAi) score += 12;
    if (item._source === "fallback") score -= 10;
    if (score < 10) continue;

    polished.push({
      text: fitted,
      chars: fitted.length,
      score,
      angle: item.angle || null,
      _source: item._source || (item._fromAi ? "ai" : null),
    });
    seen.push(fitted);
  }

  polished.sort((a, b) => b.score - a.score);
  return polished.slice(0, 5);
}

export function applyTitleQualityToParsed(parsed = {}, context = {}) {
  const { format = "LONG", facts = {} } = context;
  const aiMarked = (parsed.titles || []).map((t) => ({ ...t, _fromAi: true, _source: "ai" }));
  let titles = polishTitles(aiMarked, { format, facts });

  const goodAiCount = titles.filter((t) => t.score >= 18 && isCompleteTitle(t.text, format)).length;

  const relevance = titles.map((item) => titleRelevanceScore(item.text, facts.oneLineSummary || facts.coreTopic || "", facts));
  const lowRelevance = relevance.length && relevance.filter((score) => score < 0.12).length >= Math.ceil(relevance.length * 0.6);

  if (goodAiCount < 3 || lowRelevance) {
    const generated = generateTitlesFromFacts(facts, { format });
    titles = polishTitles([...generated, ...aiMarked], { format, facts });
  }

  while (titles.length < 5 && facts.coreTopic) {
    const seed = fitTitleToLimit(facts.coreTopic, format === "SHORT" ? 40 : 50, format);
    if (!seed) break;
    if (!titles.some((t) => titleSimilarity(t.text, seed) > 0.45)) {
      const score = scoreTitle(seed, format, facts);
      if (score >= 5 && isCompleteTitle(seed, format)) {
        titles.push({ text: seed, chars: seed.length, score, _source: "seed" });
      }
    } else break;
  }

  titles.sort((a, b) => b.score - a.score);
  titles = titles.slice(0, 5).map(({ _source, ...t }) => t);

  const recommended = titles[0]?.text || parsed.recommendedTitle || "";

  return {
    ...parsed,
    titles,
    recommendedTitle: recommended,
  };
}

export function enhanceStrategyTitles(strategy = {}, { transcript = "", format = "LONG", facts: inputFacts = {} } = {}) {
  const facts = inputFacts.coreTopic ? inputFacts : extractTitleFacts({ transcript, storyboard: { strategy } });
  const fmt = format === "SHORTS" ? "SHORT" : format;

  const rawTitles = [
    { text: strategy.title_main, _fromAi: true, _source: "ai" },
    ...(strategy.title_variations || []).map((t) => ({ text: t, _fromAi: true, _source: "ai" })),
  ].filter((t) => t.text);

  let polished = polishTitles(rawTitles, { format: fmt, facts });
  const goodCount = polished.filter((t) => t.score >= 18).length;
  if (goodCount < 3) {
    const generated = generateTitlesFromFacts(facts, { format: fmt });
    polished = polishTitles([...rawTitles, ...generated], { format: fmt, facts });
  }

  polished.sort((a, b) => b.score - a.score);

  return {
    title_main: polished[0]?.text || sanitizeTitle(strategy.title_main) || facts.coreTopic?.slice(0, 48),
    title_variations: polished.slice(1, 6).map((t) => t.text),
    _titleScores: polished.map((t) => ({ text: t.text, score: t.score })),
  };
}

export function mergeRepairedTitles(parsed, repaired = {}) {
  if (!Array.isArray(repaired.titles) || !repaired.titles.length) return parsed;

  const titles = repaired.titles.map((t) => ({
    text: sanitizeTitle(t.text),
    chars: sanitizeTitle(t.text).length,
    angle: t.angle,
    _fromAi: true,
    _source: "ai",
  }));

  const idx = Number(repaired.recommendedIndex) || 0;
  const sorted = [...titles];
  if (idx > 0 && idx < sorted.length) {
    const [pick] = sorted.splice(idx, 1);
    sorted.unshift(pick);
  }

  return {
    ...parsed,
    titles: sorted.map((t) => ({ text: t.text, chars: t.chars, angle: t.angle })),
    recommendedTitle: sorted[0]?.text || parsed.recommendedTitle,
  };
}

export function mergeRepairedStrategyTitles(strategy = {}, repaired = {}) {
  if (!repaired.title_main && !repaired.title_variations?.length) return strategy;

  const title_main = sanitizeTitle(repaired.title_main || strategy.title_main);
  const title_variations = (repaired.title_variations || [])
    .map((t) => sanitizeTitle(t))
    .filter((t) => t && t !== title_main)
    .slice(0, 5);

  return {
    ...strategy,
    title_main,
    title_variations,
  };
}