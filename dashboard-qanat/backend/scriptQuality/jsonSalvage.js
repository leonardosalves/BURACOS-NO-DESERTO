import { isSceneSpecificFallbackPrompt } from "../scenePromptSpecificity.js";
import {
  deriveNarrationBlockPhrases,
  splitNarrationIntoBlocks,
} from "../../shared/narrationBlocks.js";

export function extractNarrativeScriptFromRaw(responseText = "") {
  const raw = String(responseText || "");
  const patterns = [
    /"narrative_script"\s*:\s*"([\s\S]*?)"\s*,\s*"narrative_script_tagged"/i,
    /"narrative_script"\s*:\s*"((?:\\.|[^"\\])*)"/i,
    /'narrative_script'\s*:\s*'((?:\\.|[^'\\])*)'/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (!m?.[1]) continue;
    const decoded = m[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .trim();
    if (decoded.length >= 40) return decoded;
  }
  return "";
}

export function extractJsonCandidateForSalvage(text) {
  const candidate = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = candidate.search(/[\[{]/);
  if (start < 0) return candidate;
  let slice = candidate.slice(start);
  const openBraces =
    (slice.match(/\{/g) || []).length - (slice.match(/\}/g) || []).length;
  const openBrackets =
    (slice.match(/\[/g) || []).length - (slice.match(/\]/g) || []).length;
  for (let i = 0; i < openBrackets; i++) slice += "]";
  for (let i = 0; i < openBraces; i++) slice += "}";
  return slice;
}

export function salvageScriptJson(responseText = "") {
  const raw = String(responseText || "").trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(extractJsonCandidateForSalvage(raw));
    if (String(parsed?.narrative_script || "").trim().length >= 40)
      return parsed;
  } catch {
    /* try partial */
  }
  const out = {};
  const strategyMatch = raw.match(
    /"strategy"\s*:\s*(\{[\s\S]*?\})\s*,\s*"(?:narrative_script|visual_prompts)"/
  );
  if (strategyMatch) {
    try {
      out.strategy = JSON.parse(strategyMatch[1]);
    } catch {
      /* ignore */
    }
  }
  const extractedNarr = extractNarrativeScriptFromRaw(raw);
  if (extractedNarr) out.narrative_script = extractedNarr;
  const narrMatch = raw.match(/"narrative_script"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (narrMatch && !out.narrative_script) {
    try {
      out.narrative_script = JSON.parse(`"${narrMatch[1]}"`);
    } catch {
      out.narrative_script = narrMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"');
    }
  }
  const taggedMatch = raw.match(
    /"narrative_script_tagged"\s*:\s*"((?:\\.|[^"\\])*)"/
  );
  if (taggedMatch) {
    try {
      out.narrative_script_tagged = JSON.parse(`"${taggedMatch[1]}"`);
    } catch {
      out.narrative_script_tagged = taggedMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"');
    }
  }
  const techMatch = raw.match(/"technical_config"\s*:\s*(\{[\s\S]*\})\s*\}?/);
  if (techMatch) {
    try {
      out.technical_config = JSON.parse(techMatch[1].replace(/,\s*$/g, ""));
    } catch {
      /* ignore */
    }
  }
  const vpMatch = raw.match(/"visual_prompts"\s*:\s*(\[[\s\S]*)/);
  if (vpMatch) {
    try {
      let arrText = vpMatch[1];
      const open = (arrText.match(/\[/g) || []).length;
      const close = (arrText.match(/\]/g) || []).length;
      for (let i = 0; i < open - close; i++) arrText += "]";
      out.visual_prompts = JSON.parse(arrText);
    } catch {
      /* ignore */
    }
  }
  return Object.keys(out).length ? out : null;
}

export function browserVisualPromptsUsable(
  visualPrompts = [],
  { format = "LONGO" } = {}
) {
  const vps = Array.isArray(visualPrompts) ? visualPrompts : [];
  if (!vps.length) return false;

  const withPrompt = vps.filter((vp) => {
    const p = String(vp.prompt || vp.visual_prompt || "").trim();
    return p.length >= 40 && !isSceneSpecificFallbackPrompt(p);
  });
  const minGood =
    format === "SHORTS"
      ? Math.max(3, Math.min(5, vps.length))
      : Math.max(8, Math.min(12, vps.length));
  if (withPrompt.length < Math.min(minGood, vps.length)) return false;

  const emptyNarr = vps.filter(
    (vp) => !String(vp.narration_text || vp.narracao || "").trim()
  ).length;
  const emptyPrompt = vps.filter(
    (vp) => !String(vp.prompt || vp.visual_prompt || "").trim()
  ).length;
  if (emptyNarr > 0 || emptyPrompt > 0) return true;

  return false;
}

export function enrichBrowserVisualPromptsParsed(
  parsed = {},
  responseText = ""
) {
  const out = { ...parsed };
  const current = Array.isArray(out.visual_prompts) ? out.visual_prompts : [];
  const salvaged = salvageScriptJson(responseText) || {};
  const salvagedVps = Array.isArray(salvaged.visual_prompts)
    ? salvaged.visual_prompts
    : [];

  const pickBetter = (a, b) => {
    if (browserVisualPromptsUsable(a)) return a;
    if (browserVisualPromptsUsable(b)) return b;
    return b.length >= a.length ? b : a;
  };

  const best = pickBetter(current, salvagedVps);
  if (best.length) out.visual_prompts = best;

  return out;
}

export function enrichBrowserNarrationParsed(parsed = {}, responseText = "") {
  const out = { ...parsed };
  const current = String(out.narrative_script || "").trim();
  const salvaged = salvageScriptJson(responseText) || {};
  const salvagedNarr = String(salvaged.narrative_script || "").trim();
  const extracted = extractNarrativeScriptFromRaw(responseText);
  const techScript =
    typeof out.technical_config?.script === "string"
      ? out.technical_config.script.trim()
      : "";

  const best =
    [current, salvagedNarr, extracted, techScript].sort(
      (a, b) => b.length - a.length
    )[0] || "";

  if (best.length > current.length) out.narrative_script = best;

  const tagged = String(
    out.narrative_script_tagged || salvaged.narrative_script_tagged || ""
  ).trim();
  if (tagged.length > 40) out.narrative_script_tagged = tagged;
  else if (best.length > 80 && !out.narrative_script_tagged)
    out.narrative_script_tagged = best;

  if (!out.strategy && salvaged.strategy) out.strategy = salvaged.strategy;
  if (!out.technical_config && salvaged.technical_config)
    out.technical_config = salvaged.technical_config;

  return out;
}

const LAME_ENDING_RE =
  /^(você|voce|qual você|qual voce|e você|e voce|o que você|o que voce|comenta|deixa nos coment|marque alguém|marque alguem|curtiu|gostou|concorda|qual te surpreendeu|qual origem)/i;

export function sanitizeLameEndingQuestions(text = "") {
  let out = String(text).trim();
  if (!out) return out;

  const sentences = out.split(/(?<=[.!?…])\s+/).filter(Boolean);
  if (sentences.length < 2) return out;

  const last = sentences[sentences.length - 1].trim();
  if (!last.endsWith("?")) return out;

  if (
    LAME_ENDING_RE.test(last) ||
    /\bvocê prefere\b/i.test(last) ||
    /\bqual você\b/i.test(last)
  ) {
    out = sentences.slice(0, -1).join(" ").trim();
    if (!out.endsWith(".") && !out.endsWith("!") && !out.endsWith("…")) {
      out += ".";
    }
  }
  return out;
}

export function sanitizeRoboticPhrases(text = "") {
  let out = String(text);
  const replacements = [
    [/neste vídeo vamos (?:explorar|descobrir|entender)/gi, "Olha só"],
    [/sem mais delongas[,.]?/gi, ""],
    [/fique até o final[,.]?/gi, ""],
    [/você não vai acreditar[,.]?/gi, ""],
    [/é importante ressaltar que/gi, ""],
    [/vale a pena mencionar que/gi, ""],
    [/no mundo de hoje[,.]?/gi, ""],
    [/  +/g, " "],
    [/\n{3,}/g, "\n\n"],
  ];
  for (const [pattern, repl] of replacements) {
    out = out.replace(pattern, repl);
  }
  return out.trim();
}

export function applyScriptTextQuality(parsedData = {}, format = "LONGO") {
  const result = { ...parsedData };
  const fields = ["narrative_script", "narrative_script_tagged"];

  for (const key of fields) {
    if (typeof result[key] === "string") {
      result[key] = sanitizeLameEndingQuestions(
        sanitizeRoboticPhrases(result[key])
      );
    }
  }

  if (result.technical_config) {
    let script = result.technical_config.script;
    if (Array.isArray(script)) script = script.join("\n\n");
    if (typeof script === "string") {
      result.technical_config = {
        ...result.technical_config,
        script: sanitizeRoboticPhrases(script),
      };
    }
  }

  if (result.strategy?.hook) {
    result.strategy = {
      ...result.strategy,
      hook: sanitizeRoboticPhrases(result.strategy.hook),
    };
  }

  return result;
}

export function extractScriptSliceForRepair(parsedData = {}) {
  const slice = {
    narrative_script: parsedData.narrative_script || "",
    narrative_script_tagged: parsedData.narrative_script_tagged || "",
    technical_config: {
      script: parsedData.technical_config?.script || "",
      block_phrases: parsedData.technical_config?.block_phrases || [],
    },
    strategy: {
      hook: parsedData.strategy?.hook || "",
    },
  };
  if (
    parsedData.visual_orchestration &&
    typeof parsedData.visual_orchestration === "object"
  ) {
    slice.visual_orchestration = parsedData.visual_orchestration;
  }
  return slice;
}

export function mergeHumanizedScript(
  original = {},
  repaired = {},
  format = "LONGO"
) {
  const merged = { ...original };
  if (repaired.narrative_script)
    merged.narrative_script = repaired.narrative_script;
  if (repaired.narrative_script_tagged)
    merged.narrative_script_tagged = repaired.narrative_script_tagged;
  if (repaired.strategy?.hook) {
    merged.strategy = { ...merged.strategy, hook: repaired.strategy.hook };
  }
  if (repaired.technical_config) {
    merged.technical_config = {
      ...merged.technical_config,
      ...repaired.technical_config,
    };
  }
  if (
    repaired.visual_orchestration &&
    typeof repaired.visual_orchestration === "object"
  ) {
    merged.visual_orchestration = repaired.visual_orchestration;
  }
  return applyScriptTextQuality(merged, format);
}

export function mergeVisualPromptsRepair(original = {}, repaired = {}) {
  const merged = { ...original };
  if (
    Array.isArray(repaired.visual_prompts) &&
    repaired.visual_prompts.length > 0
  ) {
    merged.visual_prompts = repaired.visual_prompts;
  }
  if (repaired.technical_config) {
    merged.technical_config = {
      ...merged.technical_config,
      ...repaired.technical_config,
    };
  }
  return merged;
}

export function applyBatchScenePromptsAiResponse(scenes = [], aiScenes = []) {
  if (!Array.isArray(aiScenes) || aiScenes.length === 0) return scenes;
  const map = new Map();
  for (const ai of aiScenes) {
    if (ai?.scene && ai?.prompt) map.set(String(ai.scene), ai);
  }
  return scenes.map((s) => {
    const ai = map.get(String(s.scene));
    if (!ai) return s;
    return {
      ...s,
      prompt: String(ai.prompt || s.prompt || "").trim(),
      stock_query: String(ai.stock_query || s.stock_query || "").trim(),
      editor_notes: String(ai.editor_notes || s.editor_notes || "").trim(),
    };
  });
}

export function mergeHumanizedNarration(
  original = {},
  repaired = {},
  format = "LONGO"
) {
  const merged = { ...original };
  if (repaired.narrative_script)
    merged.narrative_script = repaired.narrative_script;
  if (repaired.narrative_script_tagged)
    merged.narrative_script_tagged = repaired.narrative_script_tagged;
  return applyScriptTextQuality(merged, format);
}

export function mergeEnrichedNarration(
  original = {},
  enriched = {},
  format = "LONGO"
) {
  const merged = mergeHumanizedNarration(original, enriched, format);
  if (enriched.strategy && typeof enriched.strategy === "object") {
    merged.strategy = { ...merged.strategy, ...enriched.strategy };
  }
  if (
    enriched.technical_config &&
    typeof enriched.technical_config === "object"
  ) {
    merged.technical_config = {
      ...merged.technical_config,
      ...enriched.technical_config,
    };
  }
  return merged;
}

export function normalizeNarrationBlocks(parsedData = {}, expectedBlocks = 5) {
  const result = { ...parsedData };
  const tc = { ...(result.technical_config || {}) };

  if (Array.isArray(tc.script)) {
    tc.script = tc.script
      .map((p) => String(p).trim())
      .filter(Boolean)
      .join("\n\n");
  }

  const paragraphs = splitNarrationIntoBlocks({
    narrativeScript: result.narrative_script,
    blockScript: tc.script,
    blockPhrases: tc.block_phrases,
    expectedBlocks,
  });

  if (paragraphs.length && !result.narrative_script?.trim()) {
    result.narrative_script = paragraphs.join(" ");
  }

  if (paragraphs.length) {
    tc.script = paragraphs.join("\n\n");
    tc.block_phrases = deriveNarrationBlockPhrases(
      paragraphs,
      tc.block_phrases
    );
  }

  result.technical_config = tc;
  return result;
}
