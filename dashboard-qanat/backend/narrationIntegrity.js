const VISUAL_PROMPT_MARKERS = [
  /\bphotorealistic\b/i,
  /\bcinematic (?:wide|medium|close|interior|aerial|handheld|tracking|film)\b/i,
  /\b(?:camera movement|aspect ratio|duration):/i,
  /\b(?:no text overlay|no readable text|clean source media)\b/i,
  /\b(?:subtitles|labels|logos|watermarks)\b/i,
  /\b(?:dramatic lighting|sharp detail|natural light physics)\b/i,
  /\b(?:generate strictly as|portrait composition|landscape composition)\b/i,
  /\b(?:diegetic sound|no narration|no dialogue|no music)\b/i,
];

function normalizeComparable(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Detecta direção visual que jamais deve entrar no texto falado. */
export function isVisualPromptNarration(value = "", prompt = "") {
  const text = String(value || "").trim();
  if (!text) return false;

  const comparable = normalizeComparable(text);
  const promptComparable = normalizeComparable(prompt);
  if (
    promptComparable.length >= 24 &&
    (comparable === promptComparable || comparable.includes(promptComparable))
  ) {
    return true;
  }

  const markerCount = VISUAL_PROMPT_MARKERS.reduce(
    (count, marker) => count + (marker.test(text) ? 1 : 0),
    0
  );
  return markerCount >= 2;
}

/**
 * Remove uma contaminação exata por prompt quando ainda existe narração válida
 * antes/depois dela. Se sobrar apenas direção visual, retorna vazio.
 */
export function sanitizeNarrationCandidate(value = "", prompt = "") {
  let text = String(value || "").trim();
  const visualPrompt = String(prompt || "").trim();
  if (!text) return "";

  if (visualPrompt.length >= 24) {
    text = text.replace(visualPrompt, "").replace(/\s+/g, " ").trim();
  }

  return isVisualPromptNarration(text, visualPrompt) ? "" : text;
}

/** Monta transcript e frases por bloco sem repetir a mesma fala por tomada. */
export function buildNarrationArtifacts(visualPrompts = []) {
  const transcript = [];
  const blockMap = new Map();
  let previousTranscript = "";

  for (const vp of Array.isArray(visualPrompts) ? visualPrompts : []) {
    const narration = sanitizeNarrationCandidate(
      vp?.narration_text,
      vp?.prompt
    );
    if (!narration) continue;

    const isPov =
      vp?.is_pov === true ||
      vp?.no_channel_narration === true ||
      String(vp?.scene_kind || "").toLowerCase() === "pov";
    const normalized = normalizeComparable(narration);

    if (!isPov && normalized !== previousTranscript) {
      transcript.push(narration);
      previousTranscript = normalized;
    }

    const block = Number(vp?.block);
    if (!block) continue;
    if (!blockMap.has(block)) blockMap.set(block, []);
    const phrases = blockMap.get(block);
    if (!phrases.some((phrase) => normalizeComparable(phrase) === normalized)) {
      phrases.push(narration);
    }
  }

  return {
    transcript: transcript.join("\n\n"),
    blockPhrases: [...blockMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([block, phrases]) => ({ block, phrase: phrases.join(" ") })),
  };
}
