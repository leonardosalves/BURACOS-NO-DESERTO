/**
 * shortsSceneChunker.js
 * Divide o narration_text de cenas de SHORTS em speech_segments de <= 10s,
 * RESPEITANDO frases (nunca corta no meio). Calibrado para o Fish Speech.
 *
 * A soma dos segmentos preserva integralmente o texto original,
 * mantendo a validação de integridade do narrationChunks.js.
 */

import { normalizeNarrationIntegrityText } from "./narrationChunks.js";

// ── Constantes (Fish Speech) ──────────────────────────────────
export const SHORTS_MAX_SCENE_SECONDS = 10;
export const FISH_BASE_WORDS_PER_SECOND = 2.1; // Fish com pausas de pontuação (PT-BR)

// Palavras que NÃO podem terminar um segmento (ficam "penduradas")
const PALAVRAS_PENDURADAS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "ou",
  "que",
  "ao",
  "à",
  "aos",
  "para",
  "por",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "um",
  "uma",
  "o",
  "a",
  "os",
  "as",
  "se",
  "com",
  "como",
  "mas",
  "nem",
  "pois",
  "quando",
]);

// ── Detecta o formato do projeto (SHORTS vs LONG) ─────────────
export function resolveStoryboardFormat(storyboard = {}, config = {}) {
  const fmt = String(
    config.format ||
      storyboard.format ||
      storyboard.technical_config?.format ||
      ""
  ).toUpperCase();
  return fmt === "SHORTS" || fmt === "SHORT" ? "SHORTS" : "LONG";
}

// ── Estimativa de duração da fala no Fish ─────────────────────
// Conta palavras + pausas de pontuação (o Fish pausa de verdade em . , ! ?)
export function estimateFishSpeechSeconds(text, prosodySpeed = 1) {
  const spoken = String(text || "").trim();
  if (!spoken) return 0;
  const words = spoken.split(/\s+/).filter(Boolean).length;
  const speed =
    Number.isFinite(prosodySpeed) && prosodySpeed > 0 ? prosodySpeed : 1;
  const wps = FISH_BASE_WORDS_PER_SECOND * speed;
  const longPauses = (spoken.match(/[.!?…]/g) || []).length; // ~0.4s cada
  const shortPauses = (spoken.match(/[,;:—]/g) || []).length; // ~0.2s cada
  return words / wps + longPauses * 0.4 + shortPauses * 0.2;
}

function terminaPendurado(trecho) {
  const ultima = String(trecho)
    .trim()
    .split(/\s+/)
    .pop()
    ?.toLowerCase()
    .replace(/[.,;:!?…]/g, "");
  return PALAVRAS_PENDURADAS.has(ultima);
}

// Divide em FRASES (pontuação final . ! ? …) mantendo a pontuação anexada
function splitSentences(text) {
  return (
    String(text || "")
      .match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)
      ?.map((s) => s.trim())
      .filter(Boolean) || []
  );
}

// Divide uma frase longa em CLÁUSULAS (pontuação interna , ; : —)
function splitClauses(sentence) {
  return (
    String(sentence || "")
      .match(/[^,;:—]+[,;:—]+|[^,;:—]+$/g)
      ?.map((c) => c.trim())
      .filter(Boolean) || [sentence]
  );
}

/**
 * Divide o narration_text em speech_segments de <= maxSeconds.
 * NUNCA corta no meio de frase/cláusula.
 * Retorna no formato esperado pelo narrationChunks.js: { id, speaker, role, text }
 */
export function splitNarrationIntoSpeechSegments(
  text,
  {
    maxSeconds = SHORTS_MAX_SCENE_SECONDS,
    prosodySpeed = 1,
    speaker = "Narrador",
    role = "narrator",
  } = {}
) {
  const original = String(text || "").trim();
  if (!original) return [];

  // Já cabe em um segmento só
  if (estimateFishSpeechSeconds(original, prosodySpeed) <= maxSeconds) {
    return [{ id: "speech-01", speaker, role, text: original }];
  }

  // 1) Decompõe em unidades: frases; se uma frase estoura, vira cláusulas
  const units = [];
  for (const sentence of splitSentences(original)) {
    if (estimateFishSpeechSeconds(sentence, prosodySpeed) <= maxSeconds) {
      units.push(sentence);
    } else {
      // Frase longa demais → quebra em cláusulas (respeita vírgulas/dois-pontos)
      units.push(...splitClauses(sentence));
    }
  }

  // 2) Agrupa unidades contíguas em segmentos de até maxSeconds
  const segments = [];
  let current = "";
  for (const unit of units) {
    const candidate = current ? `${current} ${unit}` : unit;
    const cabe =
      estimateFishSpeechSeconds(candidate, prosodySpeed) <= maxSeconds;
    if (cabe || !current) {
      current = candidate; // cabe, ou unidade sozinha (não corta no meio)
    } else {
      segments.push(current);
      current = unit;
    }
  }
  if (current) segments.push(current);

  // 3) Evita terminar segmento em palavra pendurada (move para o próximo)
  const refined = [];
  for (let i = 0; i < segments.length; i += 1) {
    let seg = segments[i].trim();
    if (terminaPendurado(seg) && i < segments.length - 1) {
      const ultimaPalavra = seg.split(/\s+/).pop();
      seg = seg.slice(0, seg.lastIndexOf(ultimaPalavra)).trim();
      segments[i + 1] = `${ultimaPalavra} ${segments[i + 1]}`.trim();
    }
    if (seg) refined.push(seg);
  }

  return refined.map((segText, i) => ({
    id: `speech-${String(i + 1).padStart(2, "0")}`,
    speaker,
    role,
    text: segText.trim(),
  }));
}

// ── Garante que os segmentos preservam o texto original (integridade) ──
export function segmentsPreserveIntegrity(segments, originalText) {
  const joined = segments.map((s) => s.text).join(" ");
  return (
    normalizeNarrationIntegrityText(joined) ===
    normalizeNarrationIntegrityText(originalText)
  );
}
