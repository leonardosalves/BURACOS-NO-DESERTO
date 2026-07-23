/**
 * Parsing robusto de JSON retornado por LLMs (markdown, trailing commas, aspas curvas).
 */

export function extractJsonCandidate(text) {
  const raw = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const firstObject = raw.indexOf("{");
  const firstArray = raw.indexOf("[");
  const start =
    firstObject === -1
      ? firstArray
      : firstArray === -1
        ? firstObject
        : Math.min(firstObject, firstArray);
  if (start === -1) return raw;

  const closeForOpen = raw[start] === "{" ? "}" : "]";
  const stack = [closeForOpen];
  let inString = false;
  let escaped = false;

  for (let i = start + 1; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      if (ch !== stack.pop()) break;
      if (stack.length === 0) return raw.slice(start, i + 1);
    }
  }

  const fallback = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return fallback ? fallback[0] : raw;
}

function repairTruncatedJson(str) {
  if (!str) return str;
  let text = String(str).trim().replace(/,\s*$/, "");

  const stack = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }

  if (inString) text += '"';
  text = text.replace(/,\s*$/, "");
  while (stack.length > 0) {
    text += stack.pop();
  }
  return text.replace(/,\s*([}\]])/g, "$1");
}

export function parseJsonLocally(responseText) {
  const variants = [
    responseText,
    String(responseText || "")
      .replace(/^\uFEFF/, "")
      .trim(),
    extractJsonCandidate(responseText),
  ];
  const seen = new Set();
  let lastError = null;

  for (const base of variants) {
    if (!base || seen.has(base)) continue;
    seen.add(base);
    const candidate = extractJsonCandidate(base);
    const attempts = [
      candidate,
      candidate.replace(/,\s*([}\]])/g, "$1"),
      candidate
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .replace(/,\s*([}\]])/g, "$1"),
      candidate.replace(/'/g, '"').replace(/,\s*([}\]])/g, "$1"),
      // Repair missing commas between adjacent objects/arrays/strings or property lines
      candidate
        .replace(
          /(["\d]|true|false|null|\]|\})\s*\r?\n\s*(?="[\w_]+"\s*:)/gi,
          "$1,\n"
        )
        .replace(/}\s*{/g, "},{")
        .replace(/]\s*\[/g, "],[")
        .replace(/}\s*\[/g, "},[")
        .replace(/]\s*{/g, "],[")
        .replace(/"\s*"/g, '","')
        .replace(/}\s*"/g, '},"')
        .replace(/"\s*{/g, '",{"')
        .replace(/]\s*"/g, '],"')
        .replace(/"\s*\[/g, '",[')
        .replace(/,\s*([}\]])/g, "$1"),
      // Repair truncated JSON by balancing quotes & brackets
      repairTruncatedJson(candidate),
      repairTruncatedJson(
        candidate
          .replace(
            /(["\d]|true|false|null|\]|\})\s*\r?\n\s*(?="[\w_]+"\s*:)/gi,
            "$1,\n"
          )
          .replace(/}\s*{/g, "},{")
          .replace(/]\s*\[/g, "],[")
          .replace(/"\s*"/g, '","')
      ),
    ];
    for (const variant of attempts) {
      try {
        return JSON.parse(variant);
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error("JSON inválido");
}

export function parseJsonFromLlm(text = "") {
  try {
    return parseJsonLocally(text);
  } catch {
    return null;
  }
}
