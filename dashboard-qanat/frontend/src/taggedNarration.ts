/** Geração de narração com tags TTS para Fish Audio, ElevenLabs v3 e MiniMax. */

export type TaggedNarrationPlatform = 'fish' | 'eleven' | 'minimax';

export const taggedNarrationMeta: Record<
  TaggedNarrationPlatform,
  { title: string; subtitle: string; accentClass: string; borderClass: string }
> = {
  fish: {
    title: 'Fish Audio S2 - Tags Inline',
    subtitle: 'Cole no fish.audio — tags em PT-BR, posição mid-frase',
    accentClass: 'text-cyan-300',
    borderClass: 'border-cyan-400/20 bg-cyan-500/5',
  },
  eleven: {
    title: 'ElevenLabs v3 - Audio Tags',
    subtitle: 'Cole no ElevenLabs v3 — emoção, pausa e entrega',
    accentClass: 'text-purple-300',
    borderClass: 'border-purple-400/20 bg-purple-500/5',
  },
  minimax: {
    title: 'MiniMax - Direção Narrativa',
    subtitle: 'Cole no MiniMax — direção global + tags por bloco',
    accentClass: 'text-amber-300',
    borderClass: 'border-amber-400/20 bg-amber-500/5',
  },
};

type SentenceRole =
  | 'hook'
  | 'question'
  | 'reveal'
  | 'tension'
  | 'mystery'
  | 'number'
  | 'exclamation'
  | 'cta'
  | 'payoff'
  | 'calm'
  | 'neutral';

interface SentenceAnalysis {
  text: string;
  role: SentenceRole;
  pivotWord: string | null;
  pivotIndex: number;
  hasNumber: boolean;
  numberMatch: string | null;
  intensity: number;
}

const PIVOT_PATTERN = /\b(mas|porém|porem|só que|so que|no entanto|entretanto|a verdade|até que|ate que|foi quando|foi aí que|foi ai que|o detalhe|o problema|só então|so entao|e então|e entao|por isso)\b/i;

const TENSION_PATTERN = /\b(nunca|impossível|impossivel|morto|morreu|desapareceu|guerra|perigo|ameaça|ameaca|assust|perturb|bizar|inexplic|estranh|sinistr)\b/i;

const MYSTERY_PATTERN = /\b(mistério|misterio|enigma|ninguém sabe|ninguem sabe|desconhecido|secreto|oculto|escondid|ninguém explica|ninguem explica)\b/i;

const CTA_PATTERN = /\b(comenta|inscrev|salva|compartilh|curte|deixa seu|me conta|se inscrev)\b/i;

const PAYOFF_PATTERN = /\b(portanto|em resumo|no fim|conclusão|conclusao|a resposta|descobrimos|ficou claro|é por isso|e por isso)\b/i;

function normalizeText(text: string) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function splitSentences(text: string): string[] {
  const clean = normalizeText(text);
  if (!clean) return [];
  return clean.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)?.map((s) => s.trim()).filter(Boolean) || [clean];
}

function findPivot(sentence: string): { word: string; index: number } | null {
  const match = sentence.match(PIVOT_PATTERN);
  if (!match || match.index == null) return null;
  return { word: match[0], index: match.index };
}

function findNumber(sentence: string): string | null {
  const match = sentence.match(/\b(\d+[\d.,]*\s*(?:%|mil|milhões?|milhoes?|bilhões?|bilhoes?|anos?|séculos?|seculos?)?)\b/i);
  return match ? match[1] : null;
}

function analyzeSentence(sentence: string, index: number, total: number): SentenceAnalysis {
  const text = sentence.trim();
  const lower = text.toLowerCase();
  const pivot = findPivot(text);
  const numberMatch = findNumber(text);
  const isQuestion = text.endsWith('?');
  const isExclamation = text.endsWith('!');

  let role: SentenceRole = 'neutral';
  let intensity = 3;

  if (index === 0) {
    role = 'hook';
    intensity = 7;
  } else if (isQuestion) {
    role = 'question';
    intensity = 6;
  } else if (pivot) {
    role = 'reveal';
    intensity = 8;
  } else if (CTA_PATTERN.test(lower) && index >= total - 2) {
    role = 'cta';
    intensity = 4;
  } else if (PAYOFF_PATTERN.test(lower) && index >= total - 3) {
    role = 'payoff';
    intensity = 7;
  } else if (numberMatch) {
    role = 'number';
    intensity = 6;
  } else if (isExclamation) {
    role = 'exclamation';
    intensity = 7;
  } else if (TENSION_PATTERN.test(lower)) {
    role = 'tension';
    intensity = 7;
  } else if (MYSTERY_PATTERN.test(lower)) {
    role = 'mystery';
    intensity = 6;
  } else if (index === total - 1) {
    role = 'payoff';
    intensity = 5;
  } else {
    role = 'calm';
    intensity = 4;
  }

  return {
    text,
    role,
    pivotWord: pivot?.word || null,
    pivotIndex: pivot?.index ?? -1,
    hasNumber: Boolean(numberMatch),
    numberMatch,
    intensity,
  };
}

function insertAt(text: string, index: number, insertion: string): string {
  if (index <= 0) return `${insertion} ${text}`.replace(/\s+/g, ' ').trim();
  const before = text.slice(0, index).trimEnd();
  const after = text.slice(index).trimStart();
  return `${before} ${insertion} ${after}`.replace(/\s+/g, ' ').trim();
}

function emphasizeNumber(sentence: string, number: string, tag: string): string {
  const idx = sentence.toLowerCase().indexOf(number.toLowerCase());
  if (idx < 0) return `${tag} ${sentence}`;
  return insertAt(sentence, idx, tag);
}

function splitAtPivot(sentence: string, pivotIndex: number, pivotWord: string, midTag: string): string {
  const before = sentence.slice(0, pivotIndex).trimEnd();
  const after = sentence.slice(pivotIndex).trimStart();
  if (!before) return `${midTag} ${after}`;
  return `${before} ${midTag} ${after}`;
}

function formatFishSentence(analysis: SentenceAnalysis, index: number, total: number): string {
  const { text, role, pivotIndex, pivotWord, numberMatch } = analysis;

  switch (role) {
    case 'hook':
      return `[tom documental envolvente, curioso] ${text}`;
    case 'question':
      return `[tom interrogativo, intrigado] ${text}`;
    case 'reveal':
      if (pivotIndex >= 0 && pivotWord) {
        return splitAtPivot(text, pivotIndex, pivotWord, '[pausa longa]');
      }
      return `[ênfase dramática] ${text}`;
    case 'tension':
      return `[voz baixa, tensa] ${text}`;
    case 'mystery':
      return `[sussurrando, misterioso] ${text}`;
    case 'number':
      if (numberMatch) return emphasizeNumber(text, numberMatch, '[ênfase]');
      return `[tom focado] ${text}`;
    case 'exclamation':
      return `[animado, energia alta] ${text}`;
    case 'cta':
      return `[tom acolhedor, convidativo] ${text}`;
    case 'payoff':
      return index === total - 1
        ? `[tom conclusivo, satisfatório] ${text}`
        : `[pausa] ${text}`;
    case 'calm':
      return `[tom calmo, narrativo] ${text}`;
    default:
      return text;
  }
}

function formatElevenSentence(analysis: SentenceAnalysis, index: number, total: number): string {
  const { text, role, pivotIndex, pivotWord, numberMatch } = analysis;

  switch (role) {
    case 'hook':
      return `[dramatic tone] ${text}`;
    case 'question':
      return `[curious] ${text}`;
    case 'reveal':
      if (pivotIndex >= 0 && pivotWord) {
        return splitAtPivot(text, pivotIndex, pivotWord, '[pause]');
      }
      return `[dramatic tone] ${text}`;
    case 'tension':
      return `[whispers] ${text}`;
    case 'mystery':
      return `[whispers] [curious] ${text}`;
    case 'number':
      if (numberMatch) return emphasizeNumber(text, numberMatch, '[pause]');
      return `[calm] ${text}`;
    case 'exclamation':
      return `[excited] ${text}`;
    case 'cta':
      return `[warm] ${text}`;
    case 'payoff':
      return index === total - 1 ? `[awe] ${text}` : `[pause] ${text}`;
    case 'calm':
      return `[calm] ${text}`;
    default:
      return text;
  }
}

function formatMinimaxSentence(analysis: SentenceAnalysis, index: number, total: number): string {
  const { text, role, pivotIndex, pivotWord } = analysis;
  const pause = (ms: number) => `(pause ${ms}ms)`;

  switch (role) {
    case 'hook':
      return `[envolvente] ${text} ${pause(400)}`;
    case 'question':
      return `[curioso] ${text} ${pause(600)}`;
    case 'reveal':
      if (pivotIndex >= 0 && pivotWord) {
        const split = splitAtPivot(text, pivotIndex, pivotWord, pause(900));
        return `[dramático] ${split}`;
      }
      return `[dramático] ${text} ${pause(800)}`;
    case 'tension':
      return `[tenso, voz baixa] ${text} ${pause(700)}`;
    case 'mystery':
      return `[misterioso] ${text} ${pause(600)}`;
    case 'number':
      return `[ênfase] ${text} ${pause(500)}`;
    case 'exclamation':
      return `[energético] ${text} ${pause(400)}`;
    case 'cta':
      return `[acolhedor] ${text} ${pause(300)}`;
    case 'payoff':
      return `[conclusivo] ${text} ${pause(index === total - 1 ? 500 : 700)}`;
    case 'calm':
      return `[narrativo] ${text} ${pause(450)}`;
    default:
      return `${text} ${pause(400)}`;
  }
}

function detectOverallTone(analyses: SentenceAnalysis[]): string {
  const roles = analyses.map((a) => a.role);
  if (roles.includes('mystery') || roles.includes('tension')) {
    return 'documental, curioso e misterioso, com pausas naturais e tensão controlada';
  }
  if (roles.includes('exclamation') || roles.filter((r) => r === 'hook').length) {
    return 'documental envolvente, dinâmico, com energia na abertura e clareza no payoff';
  }
  return 'documental premium, calmo e confiante, ritmo de narrador profissional';
}

function convertLegacyTaggedToPlain(taggedScript: string): string {
  return taggedScript
    .replace(/<break\s+time="([\d.]+)s"\s*\/>/gi, ' ')
    .replace(/\[(?:pause|pausa)\]/gi, ' ')
    .replace(/\(breath\)/gi, ' ')
    .replace(/\(sigh\)/gi, ' ')
    .replace(/\(laughs?\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyLegacyTagHints(sentence: string, platform: TaggedNarrationPlatform): string {
  let result = sentence;

  if (platform === 'fish') {
    result = result
      .replace(/\[pause\]|\[pausa\]/gi, '[pausa]')
      .replace(/\(breath\)/gi, '[inhale]')
      .replace(/\(sigh\)/gi, '[suspiro]')
      .replace(/\(laughs?\)/gi, '[risada leve]')
      .replace(/<break\s+time="([\d.]+)s"\s*\/>/gi, (_, sec) => {
        const ms = Math.round(parseFloat(sec) * 1000);
        return ms >= 1200 ? '[pausa longa]' : '[pausa]';
      });
  } else if (platform === 'eleven') {
    result = result
      .replace(/\[pause\]|\[pausa\]/gi, '[pause]')
      .replace(/\(breath\)/gi, '[sighs]')
      .replace(/\(sigh\)/gi, '[sighs]')
      .replace(/\(laughs?\)/gi, '[laughs softly]')
      .replace(/<break\s+time="([\d.]+)s"\s*\/>/gi, '[pause]');
  } else {
    result = result
      .replace(/\[pause\]|\[pausa\]/gi, '(pause 600ms)')
      .replace(/\(breath\)/gi, '(pause 350ms)')
      .replace(/\(sigh\)/gi, '(pause 500ms)')
      .replace(/\(laughs?\)/gi, '(pause 300ms)')
      .replace(/<break\s+time="([\d.]+)s"\s*\/>/gi, (_, sec) => `(pause ${Math.round(parseFloat(sec) * 1000)}ms)`);
  }

  return result.replace(/\s+/g, ' ').trim();
}

function hasRichLegacyTags(taggedScript: string): boolean {
  return /\[pause\]|\[pausa\]|\[ênfase\]|\[rápido\]|\[lento\]|\(breath\)|\(sigh\)|<break\s+time=/i.test(taggedScript);
}

function applyCinematicMarkers(taggedScript: string, platform: TaggedNarrationPlatform): string {
  let result = taggedScript;

  if (platform === 'fish') {
    result = result
      .replace(/\[ênfase\]\s*/gi, '[ênfase] ')
      .replace(/\[rápido\]/gi, '[rápido]')
      .replace(/\[lento\]/gi, '[lento]')
      .replace(/\[pausa\]|\[pause\]/gi, '[pausa]');
  } else if (platform === 'eleven') {
    result = result
      .replace(/\[ênfase\]\s*/gi, '[emphasis] ')
      .replace(/\[rápido\]/gi, '[fast]')
      .replace(/\[lento\]/gi, '[slowly]')
      .replace(/\[pausa\]|\[pause\]/gi, '[pause]');
  } else {
    result = result
      .replace(/\[ênfase\]\s*/gi, '[ênfase] ')
      .replace(/\[rápido\]/gi, '(fast pace)')
      .replace(/\[lento\]/gi, '(slow pace)')
      .replace(/\[pausa\]|\[pause\]/gi, '(pause 600ms)');
  }

  return result.replace(/\s+/g, ' ').trim();
}

function buildFromAnalyses(
  analyses: SentenceAnalysis[],
  platform: TaggedNarrationPlatform,
): string {
  const formatter =
    platform === 'fish'
      ? formatFishSentence
      : platform === 'eleven'
        ? formatElevenSentence
        : formatMinimaxSentence;

  const lines = analyses.map((a, i) => formatter(a, i, analyses.length));

  if (platform === 'minimax') {
    const tone = detectOverallTone(analyses);
    return `Direção de voz: narrador ${tone}.\n\n${lines.join('\n\n')}`;
  }

  if (platform === 'fish' && analyses.length > 0) {
    return `[tom de narrador documental em português brasileiro]\n\n${lines.join('\n\n')}`;
  }

  return lines.join('\n\n');
}

export function buildTaggedNarration(
  text: string,
  platform: TaggedNarrationPlatform,
  options: { taggedScript?: string } = {},
): string {
  const taggedScript = normalizeText(options.taggedScript || '');
  const sourceText = normalizeText(text);

  if (!sourceText && !taggedScript) return '';

  if (taggedScript && hasRichLegacyTags(taggedScript)) {
    const cinematic = applyCinematicMarkers(taggedScript, platform);
    const converted = applyLegacyTagHints(cinematic, platform);
    if (platform === 'minimax') {
      return `Direção de voz: narrador documental em PT-BR, com pausas naturais e entrega humana.\n\n${converted}`;
    }
    if (platform === 'fish') {
      return `[tom de narrador documental em português brasileiro]\n\n${converted}`;
    }
    return converted;
  }

  const plain = sourceText || convertLegacyTaggedToPlain(taggedScript);
  const sentences = splitSentences(plain);
  if (!sentences.length) return '';

  const analyses = sentences.map((s, i) => analyzeSentence(s, i, sentences.length));
  return buildFromAnalyses(analyses, platform);
}

/** @deprecated Use buildTaggedNarration */
export function addExpressionTags(text: string, platform: TaggedNarrationPlatform): string {
  return buildTaggedNarration(text, platform);
}