/**
 * Expande números, unidades e abreviações para fala em português (TTS).
 * Usado na narração por partes e demais motores — o texto na tela/roteiro
 * pode continuar com dígitos; o que vai ao TTS fica em forma falável.
 */

const ONES = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const TENS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const HUNDREDS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function underThousand(n) {
  const num = Math.floor(Number(n));
  if (num === 0) return "";
  if (num === 100) return "cem";
  if (num < 20) return ONES[num];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const o = num % 10;
    return o ? `${TENS[t]} e ${ONES[o]}` : TENS[t];
  }
  const h = Math.floor(num / 100);
  const rest = num % 100;
  const head = HUNDREDS[h];
  if (!rest) return head;
  return `${head} e ${underThousand(rest)}`;
}

/**
 * Converte inteiro não-negativo (até bilhões) para português.
 */
export function numberToPortugueseWords(value) {
  let n = Math.floor(Math.abs(Number(value)));
  if (!Number.isFinite(n)) return String(value);
  if (n === 0) return "zero";

  const parts = [];
  const billions = Math.floor(n / 1_000_000_000);
  n %= 1_000_000_000;
  const millions = Math.floor(n / 1_000_000);
  n %= 1_000_000;
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;

  if (billions) {
    parts.push(
      billions === 1 ? "um bilhão" : `${underThousand(billions)} bilhões`
    );
  }
  if (millions) {
    parts.push(
      millions === 1 ? "um milhão" : `${underThousand(millions)} milhões`
    );
  }
  if (thousands) {
    parts.push(thousands === 1 ? "mil" : `${underThousand(thousands)} mil`);
  }
  if (rest) parts.push(underThousand(rest));

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} e ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

/**
 * Parse número BR: 1.280 / 1,5 / 1280
 */
export function parseBrazilianNumber(raw = "") {
  let s = String(raw || "")
    .trim()
    .replace(/\s/g, "");
  if (!s) return null;
  // 1.280.500,25
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+,\d+$/.test(s)) {
    s = s.replace(",", ".");
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    // US style 1,280.5
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function numberStringToPortugueseWords(raw = "") {
  const n = parseBrazilianNumber(raw);
  if (n == null) return String(raw);
  const neg = n < 0 ? "menos " : "";
  const abs = Math.abs(n);
  const intPart = Math.floor(abs);
  const decStr = String(abs).includes(".") ? String(abs).split(".")[1] : "";
  let out = neg + numberToPortugueseWords(intPart);
  if (decStr && /[1-9]/.test(decStr)) {
    const digits = decStr
      .split("")
      .map((d) => ONES[Number(d)] || d)
      .join(" ");
    out += ` vírgula ${digits}`;
  }
  return out;
}

/** Unidades e abreviações → forma falada (evita "t" sozinho, "m" errado, etc.) */
const UNIT_MAP = [
  // ordem: mais longos primeiro
  { re: /\bt\b/gi, word: "toneladas" }, // cuidado: só com número à esquerda
  { re: /\bton\.?\b/gi, word: "toneladas" },
  { re: /\btoneladas?\b/gi, word: "toneladas" }, // reforço fonético explícito
  { re: /\bkg\b/gi, word: "quilogramas" },
  { re: /\bkm\b/gi, word: "quilômetros" },
  { re: /\bcm\b/gi, word: "centímetros" },
  { re: /\bmm\b/gi, word: "milímetros" },
  { re: /\bm²\b/gi, word: "metros quadrados" },
  { re: /\bm2\b/gi, word: "metros quadrados" },
  { re: /\bm³\b/gi, word: "metros cúbicos" },
  { re: /\bm3\b/gi, word: "metros cúbicos" },
  { re: /\bm\b/gi, word: "metros" },
  { re: /\bmetros?\b/gi, word: "metros" },
  { re: /\bkm\/h\b/gi, word: "quilômetros por hora" },
  { re: /\bmph\b/gi, word: "milhas por hora" },
  { re: /\b%\b/g, word: " por cento" },
  { re: /\bh\b/gi, word: "horas" },
  { re: /\bmin\b/gi, word: "minutos" },
  { re: /\bseg\b/gi, word: "segundos" },
  { re: /\bºC\b/g, word: "graus Celsius" },
  { re: /\b°C\b/g, word: "graus Celsius" },
];

/**
 * Expande "450 m", "11 mil t", "62 d.C." etc. para fala natural.
 */
export function expandTextForTtsSpeech(text = "") {
  let out = String(text || "");
  if (!out.trim()) return out;

  // Datas / eras — antes de números genéricos
  out = out.replace(
    /(\d{1,4})\s*(?:a\.\s*c\.?|a\s+c\.?|ac)(?![\p{L}\p{N}_])/giu,
    (_, num) => `${numberStringToPortugueseWords(num)} antes de Cristo`
  );
  out = out.replace(
    /(\d{1,4})\s*(?:d\.\s*c\.?|d\s+c\.?|dc)(?![\p{L}\p{N}_])/giu,
    (_, num) => `${numberStringToPortugueseWords(num)} depois de Cristo`
  );
  out = out.replace(
    /(?<![\p{L}\p{N}_])(?:a\.\s*c\.?|a\s+c\.?|ac)(?![\p{L}\p{N}_])/giu,
    "antes de Cristo"
  );
  out = out.replace(
    /(?<![\p{L}\p{N}_])(?:d\.\s*c\.?|d\s+c\.?|dc)(?![\p{L}\p{N}_])/giu,
    "depois de Cristo"
  );

  function unitToWord(unitRaw, singular = false) {
    const u = String(unitRaw).toLowerCase().replace(/\./g, "");
    let unitWord = "unidades";
    if (u === "t" || u.startsWith("ton")) unitWord = "toneladas";
    else if (u === "kg") unitWord = "quilogramas";
    else if (u === "km") unitWord = "quilômetros";
    else if (u === "km/h") unitWord = "quilômetros por hora";
    else if (u === "cm") unitWord = "centímetros";
    else if (u === "mm") unitWord = "milímetros";
    else if (u === "m2" || u === "m²") unitWord = "metros quadrados";
    else if (u === "m3" || u === "m³") unitWord = "metros cúbicos";
    else if (u === "m") unitWord = "metros";
    else if (u === "%") unitWord = "por cento";
    else if (u === "h") unitWord = "horas";
    else if (u === "min") unitWord = "minutos";
    else if (u === "seg") unitWord = "segundos";
    else if (u.includes("c")) unitWord = "graus Celsius";
    if (singular) {
      unitWord = unitWord
        .replace(/toneladas/, "tonelada")
        .replace(/quilogramas/, "quilograma")
        .replace(/quilômetros por hora/, "quilômetro por hora")
        .replace(/quilômetros/, "quilômetro")
        .replace(/centímetros/, "centímetro")
        .replace(/milímetros/, "milímetro")
        .replace(/metros quadrados/, "metro quadrado")
        .replace(/metros cúbicos/, "metro cúbico")
        .replace(/metros/, "metro")
        .replace(/horas/, "hora")
        .replace(/minutos/, "minuto")
        .replace(/segundos/, "segundo");
    }
    return unitWord;
  }

  // Número (+ mil/milhões) + unidade — "11 mil t", "450 m", "15%"
  out = out.replace(
    /(\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(milhões|milhoes|bilhões|bilhoes|mil)?\s*(km\/h|km|kg|cm|mm|m²|m2|m³|m3|m\b|ton\.?|toneladas?|t\b|%|h\b|min\b|seg\b|ºC|°C)/gi,
    (full, numRaw, scaleRaw, unitRaw) => {
      const n = parseBrazilianNumber(numRaw);
      let numWords = numberStringToPortugueseWords(numRaw);
      const scale = String(scaleRaw || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (scale === "mil") numWords = `${numWords} mil`;
      else if (scale.startsWith("milh")) {
        numWords =
          n === 1
            ? "um milhão"
            : `${numberStringToPortugueseWords(numRaw)} milhões`;
      } else if (scale.startsWith("bilh")) {
        numWords =
          n === 1
            ? "um bilhão"
            : `${numberStringToPortugueseWords(numRaw)} bilhões`;
      }
      const singular = n === 1 && !scale;
      return `${numWords} ${unitToWord(unitRaw, singular)}`;
    }
  );

  // "mil t" / "milhões t" residual se o número já foi expandido
  out = out.replace(
    /\b(mil|milhões|milhoes|bilhões|bilhoes)\s+(t|ton\.?|toneladas?|km|m|kg)\b/gi,
    (_, scale, unit) => `${scale} ${unitToWord(unit, false)}`
  );

  // Anos de 4 dígitos (1900–2099) → "mil novecentos..."
  out = out.replace(/\b(1[0-9]{3}|20[0-9]{2})\b/g, (y) =>
    numberStringToPortugueseWords(y)
  );

  // Demais inteiros/decimais isolados (não dentro de palavras)
  out = out.replace(
    /(?<![\w/])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)(?![\w/])/g,
    (raw) => numberStringToPortugueseWords(raw)
  );

  // Reforço articulado — palavra inteira com flag unicode (não quebrar "quilômetros")
  out = out.replace(/(?<![\p{L}])toneladas(?![\p{L}])/giu, "to neladas");
  out = out.replace(/(?<![\p{L}])tonelada(?![\p{L}])/giu, "to nelada");
  out = out.replace(/(?<![\p{L}])quilômetros(?![\p{L}])/giu, "qui lômetros");
  out = out.replace(/(?<![\p{L}])quilômetro(?![\p{L}])/giu, "qui lômetro");
  out = out.replace(/(?<![\p{L}])metros(?![\p{L}])/giu, "me tros");
  out = out.replace(/(?<![\p{L}])metro(?![\p{L}])/giu, "me tro");

  // Séculos romanos comuns
  out = out.replace(/\bséc\.?\s*([IVXLC]+)\b/gi, (_, rom) => {
    const map = {
      I: "primeiro",
      II: "segundo",
      III: "terceiro",
      IV: "quarto",
      V: "quinto",
      VI: "sexto",
      VII: "sétimo",
      VIII: "oitavo",
      IX: "nono",
      X: "décimo",
      XI: "décimo primeiro",
      XII: "décimo segundo",
      XIII: "décimo terceiro",
      XIV: "décimo quarto",
      XV: "décimo quinto",
      XVI: "décimo sexto",
      XVII: "décimo sétimo",
      XVIII: "décimo oitavo",
      XIX: "décimo nono",
      XX: "vigésimo",
      XXI: "vigésimo primeiro",
    };
    const key = String(rom).toUpperCase();
    return map[key] ? `século ${map[key]}` : `século ${key}`;
  });

  // Limpa hifens de sílaba forçada para motores que preferem espaço
  // Mantemos hífen: muitos TTS PT-BR respeitam "to-ne-la-da"
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

/**
 * Aplica expansão só no texto falado; preserva tags [pausa] se stripTags=false.
 * Por padrão remove tags TTS e expande.
 */
export function prepareTextForTtsEngine(text = "", { stripTags = true } = {}) {
  let out = String(text || "");
  if (stripTags) {
    out = out
      .replace(
        /\[(?:pausa|pause|ênfase|enfase|rápido|rapido|lento)[^\]]*\]/gi,
        " "
      )
      .replace(/\((?:breath|pause|pausa)[^)]*\)/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return expandTextForTtsSpeech(out);
}
