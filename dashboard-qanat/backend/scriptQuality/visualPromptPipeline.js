import {
  isVideoSceneType,
  isExplicitStillType,
  VIDEO_EXT_RE,
} from "../shared/mediaTypes.js";
import {
  buildSceneSpecificPrompt,
  enrichVisualPromptsSpecificity,
  isPromptTooGeneric,
  isSceneSpecificFallbackPrompt,
} from "../scenePromptSpecificity.js";
import { resolveStockSearchQuery } from "../stockSearchQuery.js";
import { enrichSceneFunctionsOnVisualPrompts } from "../motionDirector.js";
import { tagSceneWithMotion } from "../creatorSceneTagger.js";

export const SHORTS_MIN_VIDEO_SCENES = 3;
export const SHORTS_VIDEO_SCENE_TYPE = "vídeo IA (max 10s)";
export const IMAGE_SCENE_TYPE = "imagem IA 2k";

const MOTION_PROMPT_RE =
  /\b(motion|moving|drone|aerial|timelapse|slow[\s-]?motion|camera pan|fly[\s-]?through|storm|drilling|pecking|tracking shot|handheld|dolly|crane|zoom in|zoom out|cinematic motion|max\s*\d{1,2}\s*s(?:ec(?:onds)?)?|\d{1,2}\s*(?:s|sec|secs|seconds))\b/i;

/** Movimento REAL no prompt — ignora caudas residual "Cinematic motion, max 10 seconds". */
const REAL_MOTION_PROMPT_RE =
  /\b(moving|drone|timelapse|slow[\s-]?motion|camera pan|fly[\s-]?through|storm|drilling|pecking|tracking shot|handheld|dolly|crane (?:shot|move|camera)|zoom in|zoom out|orbit|whip pan|push[\s-]?in)\b/i;

function adaptPromptForVideoScene(prompt = "") {
  const p = String(prompt || "").trim();
  if (!p)
    return "Cinematic motion, photorealistic, dramatic lighting, no text, max 10 seconds";
  if (/cinematic motion|max 10/i.test(p)) return p;
  return `${p.replace(/\.\s*$/, "")}. Cinematic motion, max 10 seconds, no text.`;
}

/**
 * Remove diretivas exclusivas de VÍDEO de prompts de IMAGE.
 * Evita lixo tipo "Cinematic motion, max 10 seconds" em stills.
 */
export function stripVideoDirectivesFromImagePrompt(prompt = "") {
  let p = String(prompt || "").trim();
  if (!p) return p;
  p = p
    // caudas comuns do pipeline de vídeo
    .replace(
      /\s*[,.]?\s*Cinematic motion(?:\s*,\s*max\s*\d{1,2}\s*seconds?)?(?:\s*,\s*no text)?\.?/gi,
      ""
    )
    .replace(/\s*[,.]?\s*max\s*\d{1,2}\s*seconds?(?:\s*,\s*no text)?\.?/gi, "")
    .replace(/\s*[,.]?\s*Diegetic sound only:[^.]*\.?/gi, "")
    .replace(/\s*[,.]?\s*absolutely no speech[^.]*\.?/gi, "")
    .replace(
      /\s*[,.]?\s*no speech,\s*no narration,\s*no dialogue[^.]*\.?/gi,
      ""
    )
    .replace(
      /\s*[,.]?\s*(?:duration|runtime|length)\s*(?:of\s*)?\d{1,2}\s*(?:s|sec|secs|seconds)\b[^.]*\.?/gi,
      ""
    )
    .replace(
      /\s*[,.]?\s*\d{1,2}\s*(?:s|sec|secs|seconds)\s*(?:clip|shot|footage)?\.?/gi,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\.\s*\./g, ".")
    .trim();
  return p.replace(/\s*,\s*$/, "").replace(/\s*\.\s*$/, "") + (p ? "." : "");
}

export function parseBlockNumber(blockRaw, sceneRaw) {
  if (blockRaw != null && blockRaw !== "") {
    const n = Number(blockRaw);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  if (sceneRaw != null && sceneRaw !== "") {
    const sceneStr = String(sceneRaw).trim();
    const dotMatch = sceneStr.match(/^(\d+)\./);
    if (dotMatch) return parseInt(dotMatch[1], 10);
    const n = Number(sceneStr);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return null;
}

export function countUniqueVisualBlocks(visualPrompts = []) {
  const blocks = new Set();
  for (const vp of visualPrompts) {
    const b = parseBlockNumber(vp?.block ?? vp?.bloco, vp?.scene ?? vp?.cena);
    if (b) blocks.add(b);
  }
  return blocks.size;
}

export function needsVisualPromptsRepair(
  storyboard = {},
  { blockCount = 5, format = "LONGO" } = {}
) {
  const vps = storyboard.visual_prompts || [];
  if (!Array.isArray(vps) || vps.length === 0) return true;
  const emptyNarr = vps.filter(
    (vp) => !String(vp.narration_text || vp.narracao || "").trim()
  ).length;
  const emptyPrompt = vps.filter(
    (vp) => !String(vp.prompt || vp.visual_prompt || "").trim()
  ).length;
  if (emptyNarr > 0 || emptyPrompt > 0) return true;

  const unresolvedPrompts = vps.filter((vp) => {
    const narration = String(vp.narration_text || vp.narracao || "").trim();
    const prompt = String(vp.prompt || vp.visual_prompt || "").trim();
    return (
      isSceneSpecificFallbackPrompt(prompt) ||
      isPromptTooGeneric(prompt, narration)
    );
  });
  if (unresolvedPrompts.length > 0) return true;

  const blockPhrases = storyboard.technical_config?.block_phrases || [];
  const expectedBlocks =
    blockPhrases.length > 0 ? blockPhrases.length : blockCount;
  const uniqueBlocks = countUniqueVisualBlocks(vps);
  if (uniqueBlocks < expectedBlocks) return true;

  const minScenes =
    format === "SHORTS"
      ? Math.max(5, expectedBlocks)
      : Math.max(8, expectedBlocks);
  if (vps.length < Math.min(minScenes, expectedBlocks * 2)) return true;

  return false;
}

/** Remove durações inventadas pela IA — só mantém as gravadas pelo Whisper. */
export function sanitizeVisualPromptDurations(visualPrompts = []) {
  if (!Array.isArray(visualPrompts)) return [];
  return visualPrompts.map((vp) => {
    if (vp?.duration_from_whisper) return { ...vp };
    const next = { ...vp };
    delete next.duration;
    delete next.duration_seconds;
    delete next.duracao;
    delete next.duracaoSegundos;
    return next;
  });
}

function pickEvenlyDistributedIndices(total, count) {
  if (count <= 0 || total <= 0) return [];
  if (count >= total) return Array.from({ length: total }, (_, i) => i);
  if (count === 1) return [0];
  const indices = [];
  for (let i = 0; i < count; i++) {
    indices.push(Math.round((i * (total - 1)) / (count - 1)));
  }
  return [...new Set(indices)];
}

/** Garante pelo menos N cenas de vídeo IA em Shorts (gancho, meio e payoff). */
export function enforceShortsVideoSceneMix(
  visualPrompts = [],
  { format = "LONGO", minVideos = SHORTS_MIN_VIDEO_SCENES } = {}
) {
  if (
    format !== "SHORTS" ||
    !Array.isArray(visualPrompts) ||
    visualPrompts.length === 0
  ) {
    return visualPrompts;
  }

  const vps = visualPrompts.map((vp) => ({ ...vp }));
  const effectiveMin = Math.min(minVideos, vps.length);
  const currentVideos = vps.filter((vp) => isVideoSceneType(vp.type)).length;
  if (currentVideos >= effectiveMin) return vps;

  const need = effectiveMin - currentVideos;
  const preferred = pickEvenlyDistributedIndices(
    vps.length,
    effectiveMin
  ).filter((index) => !isVideoSceneType(vps[index].type));

  const scored = vps
    .map((vp, index) => ({ index, vp, isVideo: isVideoSceneType(vp.type) }))
    .filter((entry) => !entry.isVideo)
    .map((entry) => {
      let score = 0;
      const prompt = String(entry.vp.prompt || entry.vp.visual_prompt || "");
      if (MOTION_PROMPT_RE.test(prompt)) score += 12;
      if (entry.index === 0) score += 10;
      if (entry.index === vps.length - 1) score += 6;
      if (entry.index === Math.floor(vps.length / 2)) score += 4;
      return { ...entry, score };
    })
    .sort((a, b) => b.score - a.score);

  const toConvert = new Set(preferred.slice(0, need));
  for (const entry of scored) {
    if (toConvert.size >= need) break;
    toConvert.add(entry.index);
  }

  for (const index of toConvert) {
    const vp = vps[index];
    const notes = String(vp.editor_notes || "").trim();
    vps[index] = {
      ...vp,
      type: SHORTS_VIDEO_SCENE_TYPE,
      prompt: adaptPromptForVideoScene(vp.prompt || vp.visual_prompt || ""),
      editor_notes:
        notes && /vídeo|video/i.test(notes)
          ? notes
          : `${notes || "Ken Burns zoom in"} — vídeo IA para movimento ativo (Shorts)`.trim(),
    };
  }

  return vps;
}

/** Normaliza texto de narração para comparar cenas quase iguais. */
export function normalizeNarrationCompareKey(text = "") {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Similaridade 0–1 entre duas narrações de cena.
 * 1 = idênticas; inclusão de uma na outra conta como alta.
 */
export function narrationTextSimilarity(a = "", b = "") {
  const na = normalizeNarrationCompareKey(a);
  const nb = normalizeNarrationCompareKey(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  // Uma narração contida na outra = mesma cena (ex.: cópia truncada no fim do bloco)
  if (longer.includes(shorter) && shorter.length >= 12) {
    return Math.max(0.88, shorter.length / longer.length);
  }
  const ta = new Set(na.split(" ").filter((w) => w.length > 2));
  const tb = new Set(nb.split(" ").filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / Math.max(ta.size, tb.size);
}

function preferVisualPromptKeep(a = {}, b = {}) {
  // Prefere cena com Whisper, prompt mais rico, narração mais longa
  const score = (vp) => {
    let s = 0;
    if (vp.duration_from_whisper) s += 8;
    if (Number(vp.duration_seconds) > 0 || Number(vp.duration) > 0) s += 3;
    const narr = String(vp.narration_text || vp.narration_excerpt || "").trim();
    const prompt = String(vp.prompt || vp.visual_prompt || "").trim();
    s += Math.min(6, Math.floor(narr.length / 40));
    s += Math.min(4, Math.floor(prompt.length / 80));
    if (vp.is_pov) s += 2;
    return s;
  };
  return score(a) >= score(b) ? a : b;
}

/**
 * Remove cenas quase-duplicadas no MESMO bloco (comum: última cena do bloco 2x —
 * uma com segundos Whisper e a cópia sem). Não mexe entre blocos.
 */
export function dedupeNearDuplicateVisualPromptsInBlocks(
  visualPrompts = [],
  { similarityThreshold = 0.82 } = {}
) {
  if (!Array.isArray(visualPrompts) || visualPrompts.length < 2) {
    return Array.isArray(visualPrompts) ? visualPrompts : [];
  }

  const byBlock = new Map();
  const order = [];
  visualPrompts.forEach((vp, globalIdx) => {
    const block = Math.max(1, Math.floor(Number(vp?.block) || 1));
    if (!byBlock.has(block)) {
      byBlock.set(block, []);
      order.push(block);
    }
    byBlock.get(block).push({ vp, globalIdx });
  });

  const kept = [];
  let removed = 0;

  for (const block of order) {
    const items = byBlock.get(block) || [];
    const blockKept = [];
    for (const { vp } of items) {
      const narr = String(
        vp?.narration_text || vp?.narration_excerpt || ""
      ).trim();
      let dupeIdx = -1;
      for (let i = 0; i < blockKept.length; i += 1) {
        const prev = blockKept[i];
        const prevNarr = String(
          prev?.narration_text || prev?.narration_excerpt || ""
        ).trim();
        // Só dedupe se houver narração e similaridade alta
        if (!narr || !prevNarr) continue;
        const sim = narrationTextSimilarity(narr, prevNarr);
        if (sim >= similarityThreshold) {
          dupeIdx = i;
          break;
        }
      }
      if (dupeIdx >= 0) {
        blockKept[dupeIdx] = preferVisualPromptKeep(blockKept[dupeIdx], vp);
        removed += 1;
      } else {
        blockKept.push(vp);
      }
    }
    // Renumera cenas do bloco  b.1, b.2, ...
    blockKept.forEach((vp, idx) => {
      kept.push({
        ...vp,
        block,
        scene: `${block}.${idx + 1}`,
      });
    });
  }

  if (removed > 0) {
    console.log(
      `[scriptQuality] Dedupe visual_prompts: removed ${removed} near-duplicate scene(s) within blocks`
    );
  }
  return kept;
}

/**
 * Ensures every sentence in the approved narration is covered by at least one
 * visual_prompt. Missing sentences are injected as new scenes at the correct
 * position and all scenes are renumbered.
 */
export function ensureNarrationCoverage(
  vps = [],
  { narrativeScript = "", ideaTitle = "" } = {}
) {
  const approvedNarration = String(narrativeScript || "").trim();
  if (!approvedNarration || !vps.length) return vps;

  const isPovVp = (vp) =>
    vp?.is_pov === true ||
    vp?.no_channel_narration === true ||
    String(vp?.scene_kind || "").toLowerCase() === "pov";

  // POV = sem VO de canal; nunca cobrir / reinjetar narração nessas cenas
  const channelVps = vps.filter((vp) => !isPovVp(vp));

  const sentences = approvedNarration
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  if (!sentences.length) return vps;

  const coveredByScene = (sentence) => {
    const sent = normalizeNarrationCompareKey(sentence);
    if (!sent) return true;
    const needle = sent.slice(0, Math.min(40, sent.length));
    return channelVps.some((vp) => {
      const haystack = normalizeNarrationCompareKey(
        vp.narration_text || vp.narration_excerpt || ""
      );
      if (!haystack) return false;
      if (haystack.includes(needle) || sent.includes(haystack.slice(0, 40))) {
        return true;
      }
      // Evita reinjetar frase já coberta por cena quase igual (fim de bloco)
      return narrationTextSimilarity(sent, haystack) >= 0.75;
    });
  };

  const missing = [];
  for (const sentence of sentences) {
    if (!coveredByScene(sentence)) {
      missing.push(sentence);
    }
  }
  if (!missing.length) return vps;

  // Group consecutive missing sentences
  const groups = [];
  let currentGroup = [missing[0]];
  for (let m = 1; m < missing.length; m++) {
    const prevIdx = sentences.indexOf(currentGroup[currentGroup.length - 1]);
    const curIdx = sentences.indexOf(missing[m]);
    if (curIdx === prevIdx + 1) {
      currentGroup.push(missing[m]);
    } else {
      groups.push(currentGroup);
      currentGroup = [missing[m]];
    }
  }
  groups.push(currentGroup);

  for (const group of groups) {
    const narration_text = group.join(" ");
    const firstGroupSentenceIdx = sentences.indexOf(group[0]);

    // Find insertion point among NON-POV scenes only (POV = gap de VO)
    let insertAt = 0;
    for (let vi = 0; vi < vps.length; vi++) {
      if (isPovVp(vps[vi])) continue;
      const vpNarr = String(vps[vi]?.narration_text || "").toLowerCase();
      const vpSentenceIdx = sentences.findIndex((s) =>
        vpNarr.includes(s.slice(0, 30).toLowerCase())
      );
      if (vpSentenceIdx >= 0 && vpSentenceIdx > firstGroupSentenceIdx) {
        insertAt = vi;
        break;
      }
      insertAt = vi + 1;
    }
    // Nunca inserir no meio do par POV A/B
    while (insertAt < vps.length && isPovVp(vps[insertAt])) insertAt += 1;

    let targetBlock =
      insertAt < vps.length
        ? vps[insertAt].block
        : vps[vps.length - 1]?.block || 1;
    if (insertAt < vps.length && isPovVp(vps[insertAt])) {
      const prevNon = [...vps]
        .slice(0, insertAt)
        .reverse()
        .find((vp) => !isPovVp(vp));
      targetBlock = prevNon?.block || targetBlock;
    }

    const sceneDraft = {
      scene: `${targetBlock}.0`,
      block: targetBlock,
      narration_text,
      type: "imagem IA 2k",
      editor_notes: "Ken Burns zoom in",
    };
    const prompt = buildSceneSpecificPrompt(sceneDraft);
    vps.splice(insertAt, 0, {
      ...sceneDraft,
      prompt,
      stock_query: resolveStockSearchQuery(
        { ...sceneDraft, prompt },
        { strategyTitle: ideaTitle, format: "LONGO" }
      ),
    });
  }

  // Renumber scenes after injection
  const blockGroups = {};
  for (const vp of vps) {
    const b = vp.block || 1;
    if (!blockGroups[b]) blockGroups[b] = [];
    blockGroups[b].push(vp);
  }
  for (const [b, scenes] of Object.entries(blockGroups)) {
    scenes.forEach((vp, idx) => {
      vp.scene = `${b}.${idx + 1}`;
    });
  }
  console.log(
    `[scriptQuality] Narration coverage fix: injected ${missing.length} missing sentence(s) into visual_prompts`
  );

  // Coverage inject pode deixar a última cena do bloco quase duplicada
  return dedupeNearDuplicateVisualPromptsInBlocks(vps);
}

/**
 * Alinha type da cena com intenção real (prompt / production / POV / asset).
 * Corrige o caso: prompt pede vídeo (ex. 8s) mas type veio "image" ou "imagem IA 2k".
 * type "image" sozinho é tratado como still — a menos que o prompt indique vídeo.
 */
export function normalizeVisualPromptMediaTypes(visualPrompts = []) {
  if (!Array.isArray(visualPrompts) || !visualPrompts.length) {
    return Array.isArray(visualPrompts) ? visualPrompts : [];
  }

  return visualPrompts.map((vp) => {
    const next = { ...vp };
    const production =
      next.production && typeof next.production === "object"
        ? { ...next.production }
        : {};
    const prompt = String(next.prompt || next.visual_prompt || "").trim();
    const notes = String(next.editor_notes || "").trim();
    const rawType = String(next.type || next.tipo || "").trim();
    const rawMediaMode = String(next.media_mode || "")
      .trim()
      .toLowerCase();
    const hasSpecialMediaMode =
      rawMediaMode &&
      !["image", "imagem", "still", "video", "vídeo"].includes(rawMediaMode);
    const broll = String(
      production.broll_type || production.media_type || ""
    ).toLowerCase();
    const assetPath = String(
      next.asset?.asset || next.asset || next.file || ""
    );

    const isPov =
      next.is_pov === true ||
      String(next.scene_kind || "").toLowerCase() === "pov" ||
      String(next.video_role || "").toUpperCase() === "A" ||
      String(next.video_role || "").toUpperCase() === "B";

    const explicitStill =
      isExplicitStillType(rawType) ||
      broll === "image" ||
      broll === "imagem" ||
      broll === "still";

    const assetIsVideo = VIDEO_EXT_RE.test(
      String(next.asset?.asset || next.asset || "")
    );

    const notesSuggestVideo = /\b(video|vídeo|footage|film|clip)\b/i.test(
      notes
    );
    const realMotion = REAL_MOTION_PROMPT_RE.test(prompt);
    // Still tipado: só vira vídeo se houver movimento real (drilling, pan, etc.)
    // NÃO promove só por "Cinematic motion, max 10 seconds" residual.
    const residualOrGenericMotion =
      MOTION_PROMPT_RE.test(prompt) ||
      /\b(8|9|10)\s*(s\b|sec\b|secs\b|seconds\b|segundos\b)/i.test(prompt);

    const forceVideo =
      !hasSpecialMediaMode &&
      (isPov ||
        assetIsVideo ||
        isVideoSceneType(rawType) ||
        broll === "video" ||
        broll === "vídeo");

    const wantsVideo =
      !hasSpecialMediaMode &&
      (forceVideo ||
        realMotion ||
        notesSuggestVideo ||
        (!explicitStill && residualOrGenericMotion) ||
        (!explicitStill &&
          /\b(first[\s-]?person|pov|gopro|point of view)\b/i.test(prompt)));

    if (wantsVideo) {
      next.type = SHORTS_VIDEO_SCENE_TYPE;
      if (!hasSpecialMediaMode) next.media_mode = "video";
      production.broll_type = "video";
      next.prompt = adaptPromptForVideoScene(prompt);
    } else {
      next.type = IMAGE_SCENE_TYPE;
      if (!hasSpecialMediaMode) next.media_mode = "image";
      production.broll_type = "image";
      next.prompt = stripVideoDirectivesFromImagePrompt(prompt);
    }

    production.generate_from_prompt = next.prompt;
    if (Object.hasOwn(next, "visual_prompt")) {
      next.visual_prompt = next.prompt;
    }
    next.production = production;
    return next;
  });
}

/**
 * Contrato final para visual_prompts recém-gerados.
 * Nunca deixa o tipo bruto "IMAGE" escapar e mantém todos os campos de mídia
 * sincronizados antes de salvar ou devolver o storyboard ao Creator.
 */
export function finalizeGeneratedVisualPromptMedia(
  visualPrompts = [],
  { format = "LONGO" } = {}
) {
  const normalized = normalizeVisualPromptMediaTypes(visualPrompts);
  const mixed = enforceShortsVideoSceneMix(normalized, { format });
  const typed = normalizeVisualPromptMediaTypes(mixed);
  const aspectRatio =
    format === "SHORTS" || format === "SHORT" ? "9:16" : "16:9";

  // scene_function / extracted_data / suggested_shot (criadores → motion)
  const withFunctions = enrichSceneFunctionsOnVisualPrompts(typed).map((vp) =>
    tagSceneWithMotion(vp, {
      format: aspectRatio,
      niche: "",
    })
  );

  return sanitizeVisualPromptDurations(withFunctions).map((vp) => ({
    ...vp,
    aspect_ratio: aspectRatio,
  }));
}

/**
 * Normaliza block/scene nos visual_prompts e redistribui quando a IA
 * devolveu poucas cenas ou concentrou tudo em um único bloco.
 */
export function normalizeVisualPromptBlocks(
  parsedData = {},
  {
    blockCount = 5,
    format = "LONGO",
    ideaTitle = "",
    skipPromptEnrichment = false,
  } = {}
) {
  const result = { ...parsedData };
  const vps = Array.isArray(result.visual_prompts)
    ? [...result.visual_prompts]
    : [];
  if (!vps.length) return result;

  const blockPhrases = result.technical_config?.block_phrases || [];
  const expectedBlocks =
    blockPhrases.length > 0 ? blockPhrases.length : blockCount;

  let normalized = vps.map((vp, index) => {
    const block =
      parseBlockNumber(vp.block ?? vp.bloco, vp.scene ?? vp.cena) ??
      Math.min(
        expectedBlocks,
        Math.floor((index * expectedBlocks) / Math.max(vps.length, 1)) + 1
      );
    const sceneStr = String(vp.scene ?? vp.cena ?? "").trim();
    const sceneInBlock = sceneStr.match(new RegExp(`^${block}\\.(\\d+)$`));
    return {
      ...vp,
      block,
      scene: sceneInBlock ? sceneStr : `${block}.${index + 1}`,
    };
  });

  const uniqueBlocks = countUniqueVisualBlocks(normalized);
  const tooFewScenes =
    normalized.length < Math.max(expectedBlocks, format === "SHORTS" ? 5 : 8);
  const blocksCollapsed = uniqueBlocks < expectedBlocks;

  if (blocksCollapsed && normalized.length >= expectedBlocks) {
    const perBlock = Math.ceil(normalized.length / expectedBlocks);
    normalized = normalized.map((vp, index) => {
      const block = Math.min(expectedBlocks, Math.floor(index / perBlock) + 1);
      const sceneInBlock = (index % perBlock) + 1;
      return { ...vp, block, scene: `${block}.${sceneInBlock}` };
    });
  } else if (
    !skipPromptEnrichment &&
    (blocksCollapsed || tooFewScenes) &&
    String(result.narrative_script || "").trim()
  ) {
    const deterministic = buildDeterministicVisualPromptsFromNarration(
      result.narrative_script,
      {
        blockCount: expectedBlocks,
        format,
        ideaTitle,
      }
    );
    if (deterministic.length > 0) {
      const enriched = enrichVisualPromptsSpecificity(
        finalizeGeneratedVisualPromptMedia(deterministic, { format }),
        {
          strategyTitle: ideaTitle,
          format: format === "SHORTS" ? "SHORTS" : "LONGO",
        }
      );
      result.visual_prompts = finalizeGeneratedVisualPromptMedia(enriched, {
        format,
      });
      return result;
    }
  }

  normalized = ensureNarrationCoverage(normalized, {
    narrativeScript: result.narrative_script,
    ideaTitle,
  });

  normalized = dedupeNearDuplicateVisualPromptsInBlocks(normalized);
  const typed = finalizeGeneratedVisualPromptMedia(normalized, { format });
  const enriched = skipPromptEnrichment
    ? typed
    : enrichVisualPromptsSpecificity(typed, {
        strategyTitle: ideaTitle,
        format: format === "SHORTS" ? "SHORTS" : "LONGO",
      });
  result.visual_prompts = finalizeGeneratedVisualPromptMedia(enriched, {
    format,
  });
  return result;
}

export function buildDeterministicVisualPromptsFromNarration(
  approvedNarration = "",
  { blockCount = 12, format = "LONGO", ideaTitle = "" } = {}
) {
  const text = String(approvedNarration || "").trim();
  if (!text) return [];
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  const resolveSceneStockQuery = (scene) =>
    resolveStockSearchQuery(scene, {
      strategyTitle: ideaTitle,
      format: format === "SHORTS" ? "SHORTS" : "LONGO",
    });
  if (!sentences.length) {
    const narration_text = text.slice(0, 280);
    const sceneDraft = {
      scene: "1.1",
      block: 1,
      narration_text,
      type: "imagem IA 2k",
      editor_notes: "Ken Burns zoom in",
    };
    const prompt = buildSceneSpecificPrompt(sceneDraft);
    const singleScene = [
      {
        ...sceneDraft,
        prompt,
        stock_query: resolveSceneStockQuery({ ...sceneDraft, prompt }),
      },
    ];
    return enrichVisualPromptsSpecificity(
      enforceShortsVideoSceneMix(singleScene, { format }),
      { strategyTitle: ideaTitle }
    );
  }
  const targetScenes =
    format === "SHORTS"
      ? Math.min(12, Math.max(5, sentences.length))
      : Math.min(50, Math.max(20, sentences.length));
  const perScene = Math.max(1, Math.ceil(sentences.length / targetScenes));
  const vps = [];
  let block = 1;
  let sceneInBlock = 1;
  for (let i = 0; i < sentences.length; i += perScene) {
    const chunk = sentences.slice(i, i + perScene).join(" ");
    const sceneDraft = {
      scene: `${block}.${sceneInBlock}`,
      block,
      narration_text: chunk,
      type: "imagem IA 2k",
      editor_notes: "Ken Burns zoom in",
    };
    const prompt = buildSceneSpecificPrompt(sceneDraft);
    vps.push({
      ...sceneDraft,
      prompt,
      stock_query: resolveSceneStockQuery({ ...sceneDraft, prompt }),
    });
    sceneInBlock += 1;
    if (sceneInBlock > Math.max(2, Math.ceil(blockCount / 4))) {
      block += 1;
      sceneInBlock = 1;
    }
  }
  return enrichVisualPromptsSpecificity(
    enforceShortsVideoSceneMix(vps, { format }),
    { strategyTitle: ideaTitle }
  );
}
