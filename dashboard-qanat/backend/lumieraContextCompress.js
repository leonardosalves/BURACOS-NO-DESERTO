/**
 * Compressão de contexto para prompts LLM — inspirado em Headroom (CCR + crushing),
 * sem dependência externa. Reduz tokens em roteiros longos e addenda do Studio Agents.
 */

const DEFAULT_MAX_TRANSCRIPT_LONG = 14000;
const DEFAULT_MAX_TRANSCRIPT_SHORT = 7000;
const DEFAULT_MAX_ADDENDUM = 4500;
const DEFAULT_MAX_STORYBOARD_JSON = 6000;

export function estimateTokens(text = "") {
  return Math.ceil(String(text).length / 4);
}

function collapseWhitespace(text = "") {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/**
 * Mantém início + fim do roteiro; omite blocos do meio com marcador reversível (CCR-style).
 */
export function compressTranscriptForPrompt(text = "", opts = {}) {
  const raw = collapseWhitespace(text);
  const maxChars = opts.maxChars
    ?? (opts.format === "SHORT" ? DEFAULT_MAX_TRANSCRIPT_SHORT : DEFAULT_MAX_TRANSCRIPT_LONG);
  if (raw.length <= maxChars) return raw;

  const blocks = raw.split(/\n{2,}/).filter(Boolean);
  if (blocks.length <= 4) {
    const head = Math.floor(maxChars * 0.55);
    const tail = maxChars - head - 80;
    return [
      raw.slice(0, head).trimEnd(),
      `\n\n[… trecho central omitido (${raw.length - head - tail} chars) — roteiro completo em transcripts_readable.txt …]\n\n`,
      raw.slice(-tail).trimStart(),
    ].join("");
  }

  const headCount = Math.max(2, Math.ceil(blocks.length * 0.35));
  const tailCount = Math.max(2, Math.ceil(blocks.length * 0.25));
  const omitted = blocks.length - headCount - tailCount;
  if (omitted <= 0) {
    return raw.slice(0, maxChars);
  }

  const head = blocks.slice(0, headCount).join("\n\n");
  const tail = blocks.slice(-tailCount).join("\n\n");
  const marker = `\n\n[… ${omitted} bloco(s) omitido(s) no meio — narração integral no projeto (${raw.length} chars) …]\n\n`;
  let out = `${head}${marker}${tail}`;
  if (out.length > maxChars) {
    out = out.slice(0, maxChars - 3) + "…";
  }
  return out;
}

/** Storyboard → só estratégia + blocos + list_items (sem prompts visuais gigantes). */
export function compressStoryboardForPrompt(storyboard = {}, maxChars = DEFAULT_MAX_STORYBOARD_JSON) {
  const slim = {
    strategy: storyboard.strategy
      ? {
          title_main: storyboard.strategy.title_main,
          hook: storyboard.strategy.hook,
          tone: storyboard.strategy.tone,
          pinned_comment: storyboard.strategy.pinned_comment,
        }
      : undefined,
    listicle: storyboard.listicle,
    list_items: Array.isArray(storyboard.list_items)
      ? storyboard.list_items.slice(0, 20).map((item) => ({
          rank: item.rank,
          title: item.title,
          hook_line: item.hook_line,
          visual_hook: item.visual_hook,
        }))
      : undefined,
    visual_prompts: Array.isArray(storyboard.visual_prompts)
      ? storyboard.visual_prompts.map((vp) => ({
          scene: vp.scene,
          block: vp.block,
          narration_text: vp.narration_text,
          duration: vp.duration,
          directing_brief: vp.directing_brief
            ? {
                dramatic_function: String(vp.directing_brief.dramatic_function || "").slice(0, 120),
                camera_intent: String(vp.directing_brief.camera_intent || "").slice(0, 80),
              }
            : undefined,
        }))
      : undefined,
  };
  let json = JSON.stringify(slim, null, 0);
  if (json.length <= maxChars) return json;
  if (slim.visual_prompts?.length > 8) {
    slim.visual_prompts = slim.visual_prompts.slice(0, 8);
    slim._truncated = `${storyboard.visual_prompts.length - 8} cenas omitidas`;
    json = JSON.stringify(slim, null, 0);
  }
  return json.length > maxChars ? json.slice(0, maxChars - 3) + "…" : json;
}

export function compressPromptAddendum(text = "", maxChars = DEFAULT_MAX_ADDENDUM) {
  const raw = collapseWhitespace(text);
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars - 120).trimEnd()}\n\n[… addendum truncado — use GET /api/studio-agents/learnings ou skills/:slug?ref= …]\n`;
}

export function compressPromptBundle(parts = [], maxTotalChars = DEFAULT_MAX_ADDENDUM) {
  const joined = parts.filter(Boolean).join("\n");
  return compressPromptAddendum(joined, maxTotalChars);
}

export function compressionStats(before = "", after = "") {
  const b = String(before).length;
  const a = String(after).length;
  if (b === 0) return { beforeChars: 0, afterChars: a, savedChars: 0, savedPercent: 0, estTokensBefore: 0, estTokensAfter: estimateTokens(after) };
  const saved = Math.max(0, b - a);
  return {
    beforeChars: b,
    afterChars: a,
    savedChars: saved,
    savedPercent: Math.round((saved / b) * 100),
    estTokensBefore: estimateTokens(before),
    estTokensAfter: estimateTokens(after),
  };
}