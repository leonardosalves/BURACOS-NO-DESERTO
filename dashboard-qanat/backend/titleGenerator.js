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

function clip(text = "", max = 50) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, max);
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

    const words = cleaned.split(" ").filter((w) => w.length > 3 && !PT_STOP_WORDS.has(w.toLowerCase()));
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

export function extractTitleFacts({ transcript = "", storyboard = {} } = {}) {
  const strategy = storyboard?.strategy || {};
  const text = String(transcript || "").replace(/\s+/g, " ").trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 12);
  const midIdx = Math.floor(sentences.length / 2);

  const numbers = [...text.matchAll(/\b\d+[\d.,]*\s*(?:%|mil|milhões?|bilhões?|anos?|séculos?|km|metros?|toneladas?|pessoas?|dias?|horas?)?\b/gi)]
    .map((m) => m[0].trim())
    .slice(0, 6);

  const properNouns = [...text.matchAll(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+(?:de|da|do|das|dos)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+|\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+){0,2}\b/g)]
    .map((m) => m[0])
    .filter((w) => !["O", "A", "Os", "As", "Um", "Uma", "No", "Na", "Em", "De", "Do", "Da", "E", "Mas", "Se"].includes(w.split(" ")[0]))
    .slice(0, 10);

  const hook = strategy.hook || sentences[0] || "";
  const payoff = sentences[sentences.length - 1] || "";
  const twist = sentences[midIdx] || sentences[Math.max(0, sentences.length - 3)] || "";
  const coreTopic = strategy.title_main || extractSubject(text) || sentences.slice(0, 2).join(" ").slice(0, 120);
  const keyPhrases = extractKeyPhrases(text);

  return {
    hook: clip(hook, 200),
    coreTopic: clip(coreTopic, 160),
    payoff: clip(payoff, 160),
    twist: clip(twist, 160),
    numbers,
    properNouns: [...new Set(properNouns)],
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
- Máximo ${maxChars} caracteres (conte antes de responder).
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
## FATOS EXTRAÍDOS DO ROTEIRO (use nos títulos — não invente além disso):
- Tema central: ${facts.coreTopic}
- Gancho do vídeo: ${facts.hook || "—"}
- Virada do meio: ${facts.twist || "—"}
- Payoff / virada final: ${facts.payoff || "—"}
- Números citados: ${facts.numbers?.length ? facts.numbers.join(", ") : "nenhum — use detalhe concreto do texto"}
- Nomes/lugares: ${facts.properNouns?.length ? facts.properNouns.join(", ") : "extraia do roteiro"}
- Frases-chave: ${facts.keyPhrases?.length ? facts.keyPhrases.join(" | ") : "—"}
- Resumo em 1 linha: ${facts.oneLineSummary || "—"}`;
}

function trimToWordBoundary(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.55 ? cut.slice(0, lastSpace) : cut).trim();
}

export function generateTitlesFromFacts(facts = {}, { format = "LONG" } = {}) {
  const max = format === "SHORT" ? 40 : 50;
  const noun = facts.properNouns?.[0] || "";
  const noun2 = facts.properNouns?.[1] || "";
  const num = facts.numbers?.[0] || "";
  const topic = sanitizeTitle(facts.coreTopic);
  const topicShort = topic.split(/\s+/).slice(0, 4).join(" ");
  const phrase = facts.keyPhrases?.[0] || topicShort;
  const twistWords = sanitizeTitle(facts.twist).split(/\s+/).slice(0, 5).join(" ");

  const candidates = [
    num && noun ? { text: `${num} — o que ${noun} esconde`, angle: "numero" } : null,
    noun ? { text: `Por que ${noun} ainda importa hoje`, angle: "pergunta" } : null,
    noun && noun2 ? { text: `${noun} e ${noun2}: a conexão que faltava`, angle: "nome" } : null,
    twistWords.length > 12 ? { text: `${twistWords} — mas tem um detalhe`, angle: "paradoxo" } : null,
    phrase ? { text: `${phrase} não era o que parecia`, angle: "paradoxo" } : null,
    num ? { text: `${num}: o número que muda a história`, angle: "numero" } : null,
    noun ? { text: `O que aconteceu com ${noun} depois disso`, angle: "lacuna" } : null,
    topicShort ? { text: `${topicShort} — e o detalhe esquecido`, angle: "detalhe" } : null,
    noun ? { text: `${noun} fez isso e ninguém explicou`, angle: "nome" } : null,
    format === "SHORT" && noun ? { text: `${noun}?`, angle: "cliffhanger" } : null,
    format === "SHORT" && num ? { text: `${num} em 40 segundos`, angle: "numero" } : null,
  ].filter(Boolean);

  return candidates.map((c) => ({
    text: trimToWordBoundary(sanitizeTitle(c.text), max),
    angle: c.angle,
    chars: trimToWordBoundary(sanitizeTitle(c.text), max).length,
  }));
}

export function buildTitleRepairPrompt({ titles = [], transcript = "", format = "LONG", facts = {} }) {
  const maxChars = format === "SHORT" ? 40 : 50;
  const titleList = titles.map((t, i) => `${i + 1}. ${t.text} (score: ${t.score ?? "?"}, ${t.chars} chars)`).join("\n");
  const generated = generateTitlesFromFacts(facts, { format }).slice(0, 3);
  const examples = generated.map((t) => `- [${t.angle}] ${t.text}`).join("\n");

  return `Você é editor de títulos para YouTube em PT-BR. Os títulos abaixo estão genéricos, robóticos ou confusos. Reescreva os 5 títulos do zero.

FORMATO: ${format === "SHORT" ? "Shorts" : "Vídeo longo"}
LIMITE: ${maxChars} caracteres cada (rigoroso)

FATOS DO VÍDEO (obrigatório usar pelo menos 1 fato por título):
${JSON.stringify(facts, null, 2).slice(0, 2500)}

EXEMPLOS DE BOA QUALIDADE (inspire-se no estilo, não copie):
${examples || "(use nomes, números e detalhes do roteiro)"}

TÍTULOS ATUAIS (ruins — descarte o estilo):
${titleList}

ROTEIRO (trecho):
${String(transcript).slice(0, 4000)}

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
    ...(facts.keyPhrases || []),
  ].map((s) => String(s).toLowerCase());

  let factHits = 0;
  for (const token of factTokens) {
    if (token.length > 2 && t.toLowerCase().includes(token.toLowerCase().split(" ")[0])) {
      factHits++;
      if (factHits >= 2) break;
    }
  }
  score += factHits * 8;

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
  const tooFew = titles.length < 5;
  const tooSimilar = titles.length >= 2 && titleSimilarity(titles[0].text || titles[0], titles[1].text || titles[1]) > 0.6;
  return avg < 28 || hasBanned || tooFew || tooSimilar;
}

export function polishTitles(titles = [], { format = "LONG", facts = {} } = {}) {
  const max = format === "SHORT" ? 40 : 50;
  const polished = [];
  const seen = [];

  for (const item of titles) {
    let text = sanitizeTitle(item.text || item);
    if (!text) continue;
    text = trimToWordBoundary(text, max);

    const tooSimilar = seen.some((prev) => titleSimilarity(prev, text) > 0.5);
    if (tooSimilar) continue;

    const chars = text.length;
    const score = scoreTitle(text, format, facts);
    if (score < 5) continue;

    polished.push({
      text,
      chars,
      score,
      angle: item.angle || null,
    });
    seen.push(text);
  }

  polished.sort((a, b) => b.score - a.score);
  return polished.slice(0, 5);
}

export function applyTitleQualityToParsed(parsed = {}, context = {}) {
  const { format = "LONG", facts = {} } = context;
  let titles = polishTitles(parsed.titles || [], { format, facts });

  const generated = generateTitlesFromFacts(facts, { format });
  titles = polishTitles([...titles, ...generated], { format, facts });

  while (titles.length < 5 && facts.coreTopic) {
    const seed = trimToWordBoundary(sanitizeTitle(facts.coreTopic), format === "SHORT" ? 38 : 48);
    if (!titles.some((t) => titleSimilarity(t.text, seed) > 0.45)) {
      titles.push({ text: seed, chars: seed.length, score: scoreTitle(seed, format, facts) });
    } else break;
  }

  titles.sort((a, b) => b.score - a.score);
  titles = titles.slice(0, 5);

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
    { text: strategy.title_main },
    ...(strategy.title_variations || []).map((t) => ({ text: t })),
  ].filter((t) => t.text);

  let polished = polishTitles(rawTitles, { format: fmt, facts });
  const generated = generateTitlesFromFacts(facts, { format: fmt });
  polished = polishTitles([...polished, ...generated], { format: fmt, facts });

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