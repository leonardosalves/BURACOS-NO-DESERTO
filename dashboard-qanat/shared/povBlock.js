/**
 * Bloco POV (Point of View) do Creator.
 *
 * Um bloco exclusivo ~20s com exatamente 2 cenas (~10s cada):
 * - VIDEO A + VIDEO B com cadeia de KEYFRAMES (anti-bug de continuidade):
 *     IMG A_START → VIDEO A → IMG A_END (= B_START) → VIDEO B → IMG B_END
 * - 3 prompts de imagem = SOMENTE scaffolding para gerar os vídeos (I2V / first+last)
 *   → NÃO vão para timeline, NÃO exigem upload, NÃO contam como cenas do roteiro
 * - UPLOAD / timeline: somente VIDEO A e VIDEO B
 * - Personagem fala no asset; sem narração de canal; BGM de fundo
 *
 * Posicionamento: miolo da narrativa, sorteado — nunca sempre intro/outro.
 */

export const POV_BLOCK_DURATION_SEC = 20;
export const POV_SCENE_DURATION_SEC = 10;
export const POV_SCENE_COUNT = 2;
export const POV_SOURCE_AUDIO_VOLUME = 1;

/** Roles da cadeia de frames (3 imagens únicas). */
export const POV_FRAME_ROLES = {
  A_START: "A_START",
  A_END_B_START: "A_END_B_START",
  B_END: "B_END",
};

/**
 * Detecta cena/clip/asset POV (vídeo ou flag genérica).
 */
export function isPovScene(item = {}) {
  if (!item || typeof item !== "object") return false;
  if (isPovKeyframeOnly(item)) return false; // keyframe não é cena de timeline
  if (item.is_pov === true) return true;
  if (item.use_source_audio === true && item.scene_kind === "pov") return true;
  const kind = String(
    item.scene_kind || item.props?.scene_kind || ""
  ).toLowerCase();
  if (kind === "pov") return true;
  if (item.props?.is_pov === true) return true;
  const role = String(
    item.video_role || item.props?.video_role || ""
  ).toUpperCase();
  if (role === "A" || role === "B") {
    if (
      item.is_pov !== false &&
      (item.pov_pair_id || item.props?.pov_pair_id)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Keyframe de imagem: só para prompt/I2V — NÃO upload, NÃO timeline.
 */
export function isPovKeyframeOnly(item = {}) {
  if (!item || typeof item !== "object") return false;
  if (item.prompt_only === true || item.exclude_from_timeline === true)
    return true;
  if (item.upload_required === false && item.pov_keyframe === true) return true;
  if (item.pov_keyframe === true || item.is_pov_keyframe === true) return true;
  const kind = String(item.scene_kind || "").toLowerCase();
  if (kind === "pov_keyframe" || kind === "keyframe") return true;
  const role = String(item.role || item.frame_role || "").toUpperCase();
  if (
    role === POV_FRAME_ROLES.A_START ||
    role === POV_FRAME_ROLES.A_END_B_START ||
    role === POV_FRAME_ROLES.B_END
  ) {
    // Só conta como keyframe se não for a cena de vídeo
    const videoRole = String(item.video_role || "").toUpperCase();
    if (videoRole !== "A" && videoRole !== "B") return true;
  }
  return false;
}

/**
 * Cenas que precisam de upload na timeline: somente VIDEO A e VIDEO B.
 */
export function isPovTimelineUploadScene(item = {}) {
  if (!item || typeof item !== "object") return false;
  if (isPovKeyframeOnly(item)) return false;
  if (!isPovScene(item)) return false;
  const role = String(
    item.video_role || item.props?.video_role || ""
  ).toUpperCase();
  if (role === "A" || role === "B") return true;
  // POV genérico de vídeo
  const type = String(item.type || "").toLowerCase();
  return type.includes("video") || type.includes("vídeo");
}

/**
 * Filtra visual_prompts para timeline/upload: remove keyframes prompt-only.
 */
export function filterVisualPromptsForTimeline(visualPrompts = []) {
  if (!Array.isArray(visualPrompts)) return [];
  return visualPrompts.filter((vp) => !isPovKeyframeOnly(vp));
}

/**
 * Marca um keyframe como prompt-only (nunca upload).
 */
export function asPovKeyframePrompt(entry = {}) {
  return {
    ...entry,
    type: "imagem IA 2k",
    pov_keyframe: true,
    is_pov_keyframe: true,
    scene_kind: "pov_keyframe",
    prompt_only: true,
    upload_required: false,
    exclude_from_timeline: true,
    exclude_from_upload: true,
  };
}

/**
 * Sorteia o número do bloco (1-based) para o POV.
 * - Nunca bloco 1 (intro)
 * - Nunca o último bloco (outro/fecho)
 * - Prefere zona 30%–70%
 * - Randomiza entre os candidatos
 */
export function pickPovBlockIndex(totalBlocks, { random = Math.random } = {}) {
  const n = Math.max(1, Math.floor(Number(totalBlocks) || 1));
  if (n <= 1) return 1;
  if (n === 2) return 1;
  if (n === 3) return 2;

  const body = [];
  for (let i = 2; i <= n - 1; i += 1) body.push(i);

  const lo = Math.max(2, Math.floor(n * 0.3));
  const hi = Math.min(n - 1, Math.ceil(n * 0.7));
  let pool = body.filter((b) => b >= lo && b <= hi);
  if (!pool.length) pool = body;

  const r = typeof random === "function" ? random() : Math.random();
  const idx = Math.min(
    pool.length - 1,
    Math.max(0, Math.floor(r * pool.length))
  );
  return pool[idx];
}

/**
 * Resolve total de blocos e índice POV para um run de geração.
 */
export function resolvePovPlacement({
  enablePov = false,
  totalBlocks = 8,
  povBlockIndex = null,
  random = Math.random,
} = {}) {
  if (!enablePov) {
    return { enabled: false, totalBlocks: 0, blockIndex: 0 };
  }
  const n = Math.max(3, Math.floor(Number(totalBlocks) || 8));
  const forced = Number(povBlockIndex);
  const blockIndex =
    Number.isFinite(forced) && forced >= 2 && forced <= n - 1
      ? Math.floor(forced)
      : pickPovBlockIndex(n, { random });
  return {
    enabled: true,
    totalBlocks: n,
    blockIndex,
    durationSeconds: POV_BLOCK_DURATION_SEC,
    sceneCount: POV_SCENE_COUNT,
    sceneDurationSeconds: POV_SCENE_DURATION_SEC,
    pairId: `pov-block-${blockIndex}`,
  };
}

/**
 * Metadados de continuidade Video A (start) / Video B (end) + keyframes.
 */
export function povVideoRoleMeta(povSceneIndex = 1, blockIndex = 0) {
  const idx = Math.max(
    1,
    Math.min(POV_SCENE_COUNT, Math.floor(Number(povSceneIndex) || 1))
  );
  const pairId = `pov-block-${Math.max(1, Math.floor(Number(blockIndex) || 1))}`;
  if (idx === 1) {
    return {
      pov_scene: 1,
      video_role: "A",
      continuity: "start",
      pov_pair_id: pairId,
      video_label: "VIDEO_A",
      first_frame_role: POV_FRAME_ROLES.A_START,
      last_frame_role: POV_FRAME_ROLES.A_END_B_START,
    };
  }
  return {
    pov_scene: 2,
    video_role: "B",
    continuity: "end",
    pov_pair_id: pairId,
    video_label: "VIDEO_B",
    first_frame_role: POV_FRAME_ROLES.A_END_B_START,
    last_frame_role: POV_FRAME_ROLES.B_END,
  };
}

/** Fallback prompts PRO em inglês se a IA não preencher keyframes. */
export function defaultPovKeyframePrompts({
  pairId = "pov-block-1",
  idea = {},
  niche = "",
} = {}) {
  const subject = String(idea?.title || niche || "the craft").trim();
  const lock =
    "first-person POV, photorealistic 2k, consistent hands/tools/wardrobe/lighting, documentary handheld, no face of operator unless natural mirror, no text overlays, no watermark";
  return {
    [POV_FRAME_ROLES.A_START]: asPovKeyframePrompt({
      id: `${pairId}__a_start`,
      role: POV_FRAME_ROLES.A_START,
      prompt: `POV opening still of ${subject}: hands and tools entering frame, work about to begin, ${lock}`,
    }),
    [POV_FRAME_ROLES.A_END_B_START]: asPovKeyframePrompt({
      id: `${pairId}__a_end_b_start`,
      role: POV_FRAME_ROLES.A_END_B_START,
      prompt: `POV mid-action bridge still of ${subject}: same hands/tools mid-gesture, action unfinished — EXACT handoff frame between VIDEO A and VIDEO B, ${lock}`,
      is_bridge: true,
      used_as: ["VIDEO_A_last_frame", "VIDEO_B_first_frame"],
    }),
    [POV_FRAME_ROLES.B_END]: asPovKeyframePrompt({
      id: `${pairId}__b_end`,
      role: POV_FRAME_ROLES.B_END,
      prompt: `POV closing still of ${subject}: action completed/reveal finished, same identity and light as opening, ${lock}`,
    }),
  };
}

/**
 * Normaliza cadeia de 3 keyframes a partir de pov.keyframe_prompts / seedance_refs / defaults.
 * Garante: A_START, A_END_B_START (única ponte), B_END.
 */
export function buildPovKeyframeChain({
  pairId = "pov-block-1",
  idea = {},
  niche = "",
  existingKeyframes = null,
  videoA = null,
  videoB = null,
} = {}) {
  const defaults = defaultPovKeyframePrompts({ pairId, idea, niche });
  const byRole = { ...defaults };

  const ingest = (item) => {
    if (!item || typeof item !== "object") return;
    const role = String(item.role || item.frame_role || "")
      .trim()
      .toUpperCase();
    const prompt = String(item.prompt || item.image_prompt || "").trim();
    if (!role || !prompt) return;
    const key =
      role === "A_START" || role === POV_FRAME_ROLES.A_START
        ? POV_FRAME_ROLES.A_START
        : role === "B_END" || role === POV_FRAME_ROLES.B_END
          ? POV_FRAME_ROLES.B_END
          : role === "A_END" ||
              role === "B_START" ||
              role === "A_END_B_START" ||
              role === "BRIDGE" ||
              role === POV_FRAME_ROLES.A_END_B_START
            ? POV_FRAME_ROLES.A_END_B_START
            : null;
    if (!key) return;
    byRole[key] = asPovKeyframePrompt({
      ...byRole[key],
      ...item,
      id: item.id || byRole[key].id,
      role: key,
      prompt,
      is_bridge: key === POV_FRAME_ROLES.A_END_B_START,
      used_as:
        key === POV_FRAME_ROLES.A_END_B_START
          ? ["VIDEO_A_last_frame", "VIDEO_B_first_frame"]
          : key === POV_FRAME_ROLES.A_START
            ? ["VIDEO_A_first_frame"]
            : ["VIDEO_B_last_frame"],
    });
  };

  if (Array.isArray(existingKeyframes)) {
    existingKeyframes.forEach(ingest);
  } else if (existingKeyframes && typeof existingKeyframes === "object") {
    Object.values(existingKeyframes).forEach(ingest);
  }

  // Prefer seedance_refs / pov_image_prompts dos vídeos se existirem
  const aFirst = String(
    videoA?.pov_image_prompts?.first || videoA?.seedance_refs?.first_frame || ""
  ).trim();
  const aLast = String(
    videoA?.pov_image_prompts?.last || videoA?.seedance_refs?.last_frame || ""
  ).trim();
  const bFirst = String(
    videoB?.pov_image_prompts?.first || videoB?.seedance_refs?.first_frame || ""
  ).trim();
  const bLast = String(
    videoB?.pov_image_prompts?.last || videoB?.seedance_refs?.last_frame || ""
  ).trim();

  if (aFirst.length > 24) {
    byRole[POV_FRAME_ROLES.A_START] = {
      ...byRole[POV_FRAME_ROLES.A_START],
      prompt: aFirst,
    };
  }
  // Bridge: prefer A last; se B first existe e A last vazio, usa B first; se ambos, força igualdade = A last
  const bridgePrompt =
    aLast.length > 24
      ? aLast
      : bFirst.length > 24
        ? bFirst
        : byRole[POV_FRAME_ROLES.A_END_B_START].prompt;
  byRole[POV_FRAME_ROLES.A_END_B_START] = {
    ...byRole[POV_FRAME_ROLES.A_END_B_START],
    prompt: bridgePrompt,
    is_bridge: true,
    used_as: ["VIDEO_A_last_frame", "VIDEO_B_first_frame"],
  };
  if (bLast.length > 24) {
    byRole[POV_FRAME_ROLES.B_END] = {
      ...byRole[POV_FRAME_ROLES.B_END],
      prompt: bLast,
    };
  }

  const list = [
    byRole[POV_FRAME_ROLES.A_START],
    byRole[POV_FRAME_ROLES.A_END_B_START],
    byRole[POV_FRAME_ROLES.B_END],
  ];

  return {
    byRole,
    list,
    pairId,
    chain: [
      {
        step: 1,
        kind: "image",
        role: POV_FRAME_ROLES.A_START,
        label: "IMG start VIDEO A",
      },
      {
        step: 2,
        kind: "video",
        role: "A",
        label: "VIDEO A",
        first: POV_FRAME_ROLES.A_START,
        last: POV_FRAME_ROLES.A_END_B_START,
      },
      {
        step: 3,
        kind: "image",
        role: POV_FRAME_ROLES.A_END_B_START,
        label: "IMG end A = start B (bridge)",
      },
      {
        step: 4,
        kind: "video",
        role: "B",
        label: "VIDEO B",
        first: POV_FRAME_ROLES.A_END_B_START,
        last: POV_FRAME_ROLES.B_END,
      },
      {
        step: 5,
        kind: "image",
        role: POV_FRAME_ROLES.B_END,
        label: "IMG end VIDEO B",
      },
    ],
  };
}

/**
 * Liga prompts de imagem start/end nos 2 vídeos POV (B.start === A.end).
 */
export function linkPovVideosToKeyframes(
  videoA = {},
  videoB = {},
  keyframeChain = null
) {
  const chain =
    keyframeChain ||
    buildPovKeyframeChain({
      pairId: videoA.pov_pair_id || videoB.pov_pair_id || "pov-block-1",
      videoA,
      videoB,
    });
  const aStart = chain.byRole[POV_FRAME_ROLES.A_START].prompt;
  const bridge = chain.byRole[POV_FRAME_ROLES.A_END_B_START].prompt;
  const bEnd = chain.byRole[POV_FRAME_ROLES.B_END].prompt;

  const patchA = {
    ...videoA,
    type: "vídeo IA",
    is_pov: true,
    scene_kind: "pov",
    video_role: "A",
    continuity: "start",
    first_frame_role: POV_FRAME_ROLES.A_START,
    last_frame_role: POV_FRAME_ROLES.A_END_B_START,
    pov_image_prompts: {
      first: aStart,
      last: bridge,
      first_role: POV_FRAME_ROLES.A_START,
      last_role: POV_FRAME_ROLES.A_END_B_START,
    },
    seedance_refs: {
      ...(videoA.seedance_refs && typeof videoA.seedance_refs === "object"
        ? videoA.seedance_refs
        : {}),
      first_frame: aStart,
      last_frame: bridge,
    },
  };

  const patchB = {
    ...videoB,
    type: "vídeo IA",
    is_pov: true,
    scene_kind: "pov",
    video_role: "B",
    continuity: "end",
    first_frame_role: POV_FRAME_ROLES.A_END_B_START,
    last_frame_role: POV_FRAME_ROLES.B_END,
    pov_image_prompts: {
      first: bridge, // MESMO prompt da imagem final de A
      last: bEnd,
      first_role: POV_FRAME_ROLES.A_END_B_START,
      last_role: POV_FRAME_ROLES.B_END,
      first_shares_role: POV_FRAME_ROLES.A_END_B_START,
    },
    seedance_refs: {
      ...(videoB.seedance_refs && typeof videoB.seedance_refs === "object"
        ? videoB.seedance_refs
        : {}),
      first_frame: bridge,
      last_frame: bEnd,
    },
  };

  return { videoA: patchA, videoB: patchB, keyframeChain: chain };
}

/**
 * Contrato textual injetado nos prompts do NARRADORPRO / Script Master.
 */
export function buildPovContractBlock({
  enablePov = false,
  niche = "",
  idea = {},
  format = "LONGO",
  totalBlocks = 8,
  povBlockIndex = null,
  placement = null,
  random = Math.random,
} = {}) {
  if (!enablePov && !(placement && placement.enabled)) return "";

  const resolved =
    placement && placement.enabled
      ? placement
      : resolvePovPlacement({
          enablePov: true,
          totalBlocks,
          povBlockIndex,
          random,
        });

  const title = String(idea?.title || idea?.event || "").trim();
  const promise = String(idea?.promise || idea?.hook || "").trim();
  const characterHint = String(
    idea?.characterView ||
      idea?.character?.label ||
      idea?.character?.description ||
      idea?.emotion ||
      ""
  ).trim();
  const pairId = resolved.pairId || `pov-block-${resolved.blockIndex}`;

  return `
[CONTRATO OBRIGATÓRIO — BLOCO POV / POINT OF VIEW]
O Creator ativou o modo POV. O NARRADORPRO ministra as FALAS e a AÇÃO do personagem/profissional.

TEMA: ${niche || "—"} | FORMATO: ${format}
${title ? `TÍTULO: ${title}` : ""}
${promise ? `PROMESSA: ${promise}` : ""}
${characterHint ? `ÂNGULO DE PERSONAGEM/PROFISSÃO: ${characterHint}` : ""}

ESTRUTURA DO BLOCO POV (inalterável):
- Inserir UM bloco EXCLUSIVO de POV — só conteúdo POV, sem misturar com outros assuntos do bloco.
- Posição sorteada para ESTE run: BLOCO ${resolved.blockIndex} de ${resolved.totalBlocks} (1-based).
- Duração do bloco: ~${POV_BLOCK_DURATION_SEC} segundos no total.
- EXATAMENTE ${POV_SCENE_COUNT} cenas nesse bloco, ~${POV_SCENE_DURATION_SEC}s cada.
- Cada cena = visão em PRIMEIRA PESSOA (POV / GoPro / eyes of the character) do personagem ou profissional fazendo algo INTRÍNSECO à temática do vídeo.
- O personagem FALA ou COMENTA o assunto DO VÍDEO dentro do próprio clipe (diálogo embutido no asset).
- SEM NARRAÇÃO DE CANAL nessas 2 cenas: não há VO/TTS do narrador no trecho POV. O texto de 1ª pessoa é roteiro da FALA DO PERSONAGEM para o prompt do vídeo — NÃO entra no TTS do narrador.
- ÁUDIO NO RENDER: voz = áudio embutido dos 2 vídeos (Video A/B) + trilha BGM de fundo. Não é necessário “mutar TTS” — simplesmente não há narração de canal nessas cenas.
- Prompt visual em inglês com qualidade PRO. narration_text em PT-BR (1ª pessoa) = o que o personagem diz/age no vídeo.

═══ CADEIA ANTI-BUG: 3 IMAGENS (PROMPT ONLY) + 2 VÍDEOS (UPLOAD) ═══
Para continuidade real (I2V / first+last frame), gere EXATAMENTE esta pipeline:

  IMG A_START  →  VIDEO A  →  IMG A_END (= B_START)  →  VIDEO B  →  IMG B_END

IMPORTANTE SOBRE UPLOAD / TIMELINE:
- As 3 IMAGENS existem SÓ como prompts (e stills intermediários opcionais) para GERAR os vídeos.
- NÃO vão para a timeline. NÃO contam como cenas de upload. NÃO peça ao usuário para subir essas imagens no projeto.
- UPLOAD obrigatório = somente VIDEO A e VIDEO B (2 arquivos de vídeo).
- Em visual_prompts do bloco: só as 2 cenas type "vídeo IA". Keyframes ficam em pov.keyframe_prompts (prompt_only).

Três prompts de IMAGEM (inglês PRO, stills) + dois de VÍDEO:

1) KEYFRAME "A_START" — imagem de abertura do VIDEO A
   - role: "A_START"
   - Composição POV inicial (mãos/ferramenta entrando no frame, ação prestes a começar).

2) KEYFRAME "A_END_B_START" — UMA ÚNICA imagem-ponte
   - role: "A_END_B_START"
   - É ao mesmo tempo: last frame do VIDEO A E first frame do VIDEO B.
   - NÃO invente dois prompts diferentes — o MESMO prompt/texto serve para A.last e B.first.
   - Estado de meio de ação (gesto incompleto) para handoff sem jump-cut.

3) KEYFRAME "B_END" — imagem de fechamento do VIDEO B
   - role: "B_END"
   - Ação resolvida / revelação final, mesma identidade e luz.

4) CENA VIDEO A (type "vídeo IA", ~${POV_SCENE_DURATION_SEC}s)
   - "video_role": "A", "continuity": "start", "pov_pair_id": "${pairId}", "pov_scene": 1
   - seedance_refs.first_frame = prompt da IMG A_START (texto completo)
   - seedance_refs.last_frame = prompt da IMG A_END_B_START (texto completo, IDÊNTICO ao B.first)
   - pov_image_prompts: { "first": "...", "last": "..." }
   - Personagem FALA no vídeo (in-world speech).

5) CENA VIDEO B (type "vídeo IA", ~${POV_SCENE_DURATION_SEC}s)
   - "video_role": "B", "continuity": "end", "pov_pair_id": "${pairId}", "pov_scene": 2
   - seedance_refs.first_frame = MESMO texto da IMG A_END_B_START
   - seedance_refs.last_frame = prompt da IMG B_END
   - pov_image_prompts.first === video A pov_image_prompts.last (string idêntica)
   - Continua a fala/ação — sem reiniciar do zero.

Também retorne no JSON:
"pov": {
  "keyframe_prompts": [
    { "role": "A_START", "prompt_only": true, "upload_required": false, "prompt": "english PRO still..." },
    { "role": "A_END_B_START", "prompt_only": true, "upload_required": false, "prompt": "english PRO still BRIDGE..." },
    { "role": "B_END", "prompt_only": true, "upload_required": false, "prompt": "english PRO still..." }
  ],
  "upload_scenes": ["VIDEO_A", "VIDEO_B"]
}

REGRAS DE CONTINUIDADE (quebram se falharem):
- Mesma identidade visual, iluminação, ambiente e lente POV em TODAS as 3 imagens e 2 vídeos.
- A_END_B_START é UMA imagem compartilhada — nunca dois frames-ponte divergentes.
- B NÃO reinicia a ação do zero.
- type das 2 cenas de timeline do bloco: "vídeo IA" — SÓ estas exigem upload.
- keyframe_prompts = scaffolding de geração; NUNCA misturar no array visual_prompts como cenas de mídia.
- Marcar em CADA cena de VÍDEO:
  "is_pov": true,
  "scene_kind": "pov",
  "use_source_audio": true,
  "no_channel_narration": true,
  "volume": ${POV_SOURCE_AUDIO_VOLUME},
  "duration_seconds": ${POV_SCENE_DURATION_SEC}

POSICIONAMENTO (CRÍTICO):
- Slot ${resolved.blockIndex} já foi RANDOMIZADO no miolo (~30%–70%). NÃO mova para bloco 1 nem para o último.
- NUNCA intro, NUNCA outro/CTA. Depois do bloco POV a história CONTINUA na voz principal.

FALAS E AÇÃO (NARRADORPRO) — OBRIGATÓRIO NO PROMPT:
- narration_text das 2 cenas POV = SEMPRE string vazia "" (sem VO de canal).
- character_speech (PT-BR) = o que o personagem DIZ no vídeo (1ª pessoa / fala in-world).
- prompt (inglês PRO) DEVE descrever: (1) visão first-person POV, (2) AÇÃO concreta do personagem/profissional ligada ao tema, (3) a fala embutida no clipe, (4) ~10s, (5) continuidade A→B.
- NÃO use takes em 3ª pessoa observando o personagem de fora — é o ponto de vista DO personagem.
- No narrative_script principal do canal, a história cobre antes e depois; o miolo visual POV é só asset+BGM.
- Fora do bloco POV, retome a narração de canal normalmente nas cenas não-POV.

Retorne no JSON (fase completa/técnica) o bloco "pov" completo com keyframe_prompts (3 imagens) + as 2 cenas de vídeo em visual_prompts.
`;
}

function mergeSeedanceRefsForPov(
  existing = {},
  roleMeta = {},
  imagePrompts = {}
) {
  const refs = existing && typeof existing === "object" ? { ...existing } : {};
  const first = String(imagePrompts.first || refs.first_frame || "").trim();
  const last = String(imagePrompts.last || refs.last_frame || "").trim();
  if (first) refs.first_frame = first;
  if (last) refs.last_frame = last;
  if (roleMeta.video_role === "A") {
    if (!String(refs.first_frame || "").trim()) {
      refs.first_frame =
        "POV start still: first-person opening composition, hands/tools in lower third, natural depth of field, photorealistic 2k";
    }
    if (!String(refs.last_frame || "").trim()) {
      refs.last_frame =
        "POV bridge still mid-action: same hands/tools mid-gesture — handoff frame for VIDEO B first frame, locked identity/light";
    }
  } else if (roleMeta.video_role === "B") {
    if (!String(refs.first_frame || "").trim()) {
      refs.first_frame =
        "IDENTICAL to VIDEO A last_frame bridge still — same POV, hands, tools, state (start of take B)";
    }
    if (!String(refs.last_frame || "").trim()) {
      refs.last_frame =
        "POV end still: action resolved / reveal completed, same identity and lighting as A_START";
    }
  }
  if (!String(refs.audio || "").trim()) {
    refs.audio =
      "In-world character speech only (dialogue in Portuguese Brazilian), natural room tone, NO external narrator VO";
  }
  if (!String(refs.camera || "").trim()) {
    refs.camera =
      "First-person POV handheld, slight natural micro-shake, eyes-level";
  }
  return refs;
}

/**
 * Garante 2 cenas de vídeo no bloco POV (injeta se faltar).
 * Usado quando a IA/repair não deixou cenas suficientes no bloco sorteado.
 */
export function injectPovVideoPair(
  visualPrompts = [],
  { blockIndex = 1, idea = {}, niche = "" } = {}
) {
  const targetBlock = Math.max(1, Math.floor(Number(blockIndex) || 1));
  const vps = Array.isArray(visualPrompts)
    ? visualPrompts.map((vp) => ({ ...vp }))
    : [];
  const subject = String(
    idea?.title || idea?.title_main || niche || "the craft"
  ).trim();
  const makePrompt = (role) =>
    role === "A"
      ? `First-person POV VIDEO A (~${POV_SCENE_DURATION_SEC}s START take): hands-on work about ${subject}; character speaks one short Brazilian Portuguese line on-topic; handheld documentary; photorealistic 2k; in-world speech only — no external narrator; natural room tone`
      : `First-person POV VIDEO B (~${POV_SCENE_DURATION_SEC}s END take, CONTINUATION from A last frame): same hands/tools/wardrobe/light; finishes action with spoken comment about ${subject}; handheld; photorealistic 2k; in-world speech only — no external narrator`;

  const makeScene = (sceneIdx, role) => ({
    scene: `${targetBlock}.${sceneIdx}`,
    block: targetBlock,
    type: "vídeo IA",
    duration_seconds: POV_SCENE_DURATION_SEC,
    is_pov: true,
    scene_kind: "pov",
    video_role: role,
    prompt: makePrompt(role),
    narration_text: "",
    editor_notes:
      "POV exclusivo ~10s — personagem fala no asset; sem VO de canal; BGM continua",
  });

  const indices = [];
  vps.forEach((vp, i) => {
    if (Math.floor(Number(vp.block) || 0) === targetBlock) indices.push(i);
  });

  if (indices.length >= POV_SCENE_COUNT) {
    // Já há cenas no bloco — marca as 2 primeiras como esqueleto POV
    for (let k = 0; k < POV_SCENE_COUNT; k++) {
      const i = indices[k];
      const role = k === 0 ? "A" : "B";
      vps[i] = {
        ...vps[i],
        block: targetBlock,
        scene: String(vps[i].scene || `${targetBlock}.${k + 1}`),
        is_pov: true,
        scene_kind: "pov",
        video_role: role,
        type: "vídeo IA",
        duration_seconds:
          Number(vps[i].duration_seconds) > 0
            ? Number(vps[i].duration_seconds)
            : POV_SCENE_DURATION_SEC,
        prompt:
          String(vps[i].prompt || "").trim().length > 40
            ? vps[i].prompt
            : makePrompt(role),
        editor_notes:
          vps[i].editor_notes ||
          "POV exclusivo ~10s — personagem fala no asset; sem VO de canal",
      };
    }
    return vps;
  }

  if (indices.length === 1) {
    const i = indices[0];
    vps[i] = {
      ...vps[i],
      ...makeScene(1, "A"),
      prompt:
        String(vps[i].prompt || "").trim().length > 40
          ? vps[i].prompt
          : makePrompt("A"),
      narration_text: vps[i].narration_text || "",
    };
    vps.splice(i + 1, 0, makeScene(2, "B"));
    return vps;
  }

  // Bloco vazio: inserir após o último bloco < target
  let insertAt = vps.length;
  for (let i = 0; i < vps.length; i++) {
    if (Math.floor(Number(vps[i].block) || 0) > targetBlock) {
      insertAt = i;
      break;
    }
  }
  vps.splice(insertAt, 0, makeScene(1, "A"), makeScene(2, "B"));
  return vps;
}

/**
 * Prompt PRO de vídeo POV (1ª pessoa): AÇÃO + FALA embutida no asset.
 * O narrador de canal NÃO fala aqui — só o personagem no vídeo.
 */
export function buildProPovVideoPrompt({
  role = "A",
  idea = {},
  niche = "",
  characterSpeech = "",
  durationSec = POV_SCENE_DURATION_SEC,
} = {}) {
  const subject = String(
    idea?.title || idea?.title_main || idea?.event || niche || "the subject"
  ).trim();
  const speech = String(characterSpeech || "").trim();
  const speechClause = speech
    ? `Character SPEAKS clearly in Brazilian Portuguese (in-world, lips if visible): "${speech}"`
    : `Character SPEAKS one short Brazilian Portuguese line commenting on ${subject} (in-world only)`;
  const lock =
    "first-person POV / GoPro eyes-level, photorealistic 2k, documentary handheld micro-shake, consistent hands/tools/wardrobe/lighting, NO channel narrator VO, NO subtitles, NO watermark, NO face-cam talking-head unless natural mirror";

  if (String(role).toUpperCase() === "A") {
    return (
      `First-person POV VIDEO A (~${durationSec}s START take) about ${subject}. ` +
      `Hands/tools enter frame and BEGIN a concrete on-topic action the character/professional would do. ` +
      `${speechClause}. Natural room tone + character voice only. ${lock}. ` +
      `END mid-action on a bridgeable handoff frame for VIDEO B (same gesture unfinished).`
    );
  }
  return (
    `First-person POV VIDEO B (~${durationSec}s END take) CONTINUATION of VIDEO A about ${subject} ` +
    `(first frame MUST match VIDEO A last frame — same hands/tools/state/light). ` +
    `FINISH the action and deliver the spoken beat. ${speechClause}. ` +
    `In-world speech only; BGM may continue under. ${lock}. Resolve the action by the end of the take.`
  );
}

/** Fala padrão do personagem (PT-BR) se a IA não preencheu. */
export function defaultPovCharacterSpeech(role = "A", idea = {}, niche = "") {
  const subject = String(
    idea?.title || idea?.title_main || niche || "isso"
  ).trim();
  if (String(role).toUpperCase() === "A") {
    return `Olha isso de perto — é assim que ${subject} funciona na prática.`;
  }
  return `Entendeu? É por isso que ${subject} muda o jogo.`;
}

/**
 * Marca e normaliza cenas POV nos visual_prompts após a IA gerar.
 * Força par VIDEO A (start) + VIDEO B (end), áudio de source e prompt com AÇÃO+FALA.
 */
export function tagPovVisualPrompts(
  visualPrompts = [],
  { blockIndex, enabled = true, idea = {}, niche = "" } = {}
) {
  if (!enabled || !Array.isArray(visualPrompts)) {
    return Array.isArray(visualPrompts) ? visualPrompts : [];
  }

  const targetBlock = Math.max(1, Math.floor(Number(blockIndex) || 0));
  // Garante par A/B no bloco (injeta se repair/fallback removeu)
  let vps = injectPovVideoPair(visualPrompts, {
    blockIndex: targetBlock,
    idea,
    niche,
  });
  if (!vps.length) return [];

  let povScenes = vps.filter(
    (vp) =>
      vp.is_pov === true ||
      String(vp.scene_kind || "").toLowerCase() === "pov" ||
      String(vp.pov || "").toLowerCase() === "true" ||
      String(vp.video_role || "").toUpperCase() === "A" ||
      String(vp.video_role || "").toUpperCase() === "B"
  );

  if (!povScenes.length && targetBlock > 0) {
    povScenes = vps.filter(
      (vp) => Math.floor(Number(vp.block) || 0) === targetBlock
    );
  }

  const ordered = [...povScenes].sort((a, b) => {
    const sa = String(a.scene || "");
    const sb = String(b.scene || "");
    return sa.localeCompare(sb, undefined, { numeric: true });
  });
  const selected = ordered.slice(0, POV_SCENE_COUNT);
  const selectedSet = new Set(selected);

  return vps.map((vp) => {
    if (!selectedSet.has(vp)) {
      if (
        vp.is_pov === true ||
        String(vp.scene_kind || "").toLowerCase() === "pov"
      ) {
        if (Math.floor(Number(vp.block) || 0) === targetBlock) {
          return {
            ...vp,
            is_pov: false,
            scene_kind: vp.scene_kind === "pov" ? "broll" : vp.scene_kind,
            use_source_audio: false,
            no_channel_narration: false,
          };
        }
      }
      return vp;
    }
    const idx = selected.indexOf(vp) + 1;
    const roleMeta = povVideoRoleMeta(idx, targetBlock || vp.block);
    const existingImg = vp.pov_image_prompts || {};
    const seedance_refs = mergeSeedanceRefsForPov(
      vp.seedance_refs,
      roleMeta,
      existingImg
    );
    // Canal NÃO narra no POV — só fala do personagem no asset.
    const prevChannel = String(
      vp.narration_text || vp.narration_excerpt || ""
    ).trim();
    const quoted =
      prevChannel.match(/['"“«]([^'"”»]{8,160})['"”»]/) ||
      prevChannel.match(/:\s*['"“]?(.{8,160}?)['"”]?\s*$/);
    let characterSpeech =
      String(vp.character_speech || "").trim() ||
      (quoted ? String(quoted[1] || "").trim() : "") ||
      "";
    if (!characterSpeech) {
      characterSpeech = defaultPovCharacterSpeech(
        roleMeta.video_role,
        idea,
        niche
      );
    }

    const prompt = buildProPovVideoPrompt({
      role: roleMeta.video_role,
      idea,
      niche,
      characterSpeech,
      durationSec: POV_SCENE_DURATION_SEC,
    });

    return {
      ...vp,
      block: targetBlock || vp.block,
      is_pov: true,
      scene_kind: "pov",
      ...roleMeta,
      use_source_audio: true,
      no_channel_narration: true,
      // Sem VO de canal nestas cenas (áudio = asset + BGM)
      narration_text: "",
      narration_excerpt: "",
      character_speech: characterSpeech,
      // Prompt SEMPRE com ação + fala (não reaproveitar take 3ª pessoa da IA)
      prompt,
      volume: POV_SOURCE_AUDIO_VOLUME,
      duration_seconds: POV_SCENE_DURATION_SEC,
      type: "vídeo IA",
      seedance_refs,
      pov_image_prompts: {
        first: String(seedance_refs.first_frame || "").trim(),
        last: String(seedance_refs.last_frame || "").trim(),
        first_role: roleMeta.first_frame_role,
        last_role: roleMeta.last_frame_role,
      },
      editor_notes:
        "POV especial: SEM narrador de canal. Prompt = ação + fala do personagem no vídeo. BGM continua; VO do canal retoma DEPOIS.",
      production: {
        ...(vp.production && typeof vp.production === "object"
          ? vp.production
          : {}),
        broll_type: "video",
        data_type: "curiosity_punch",
        pov_video_role: roleMeta.video_role,
        pov_continuity: roleMeta.continuity,
        pov_first_frame_role: roleMeta.first_frame_role,
        pov_last_frame_role: roleMeta.last_frame_role,
      },
    };
  });
}

/**
 * Remove VO de canal das cenas POV.
 * NÃO despeja texto de canal em cenas vizinhas (isso poluía o roteiro).
 * A história do canal fica no narrative_script e nas cenas NÃO-POV.
 */
export function stripChannelNarrationFromPovScenes(visualPrompts = []) {
  if (!Array.isArray(visualPrompts) || !visualPrompts.length) {
    return Array.isArray(visualPrompts) ? visualPrompts : [];
  }
  return visualPrompts.map((vp) => {
    if (!isPovScene(vp)) return { ...vp };
    const text = String(vp.narration_text || vp.narration_excerpt || "").trim();
    const quoted =
      text.match(/['"“«]([^'"”»]{8,160})['"”»]/) ||
      text.match(/:\s*['"“]?(.{8,160}?)['"”]?\s*$/);
    const characterSpeech =
      String(vp.character_speech || "").trim() ||
      (quoted ? String(quoted[1] || "").trim() : "") ||
      String(vp.character_speech || "").trim();
    return {
      ...vp,
      narration_text: "",
      narration_excerpt: "",
      no_channel_narration: true,
      use_source_audio: true,
      character_speech: characterSpeech,
      editor_notes:
        "POV especial: SEM narrador de canal. Personagem fala no vídeo; BGM continua; VO do canal retoma DEPOIS.",
    };
  });
}

/**
 * Redistribui o narrative_script APENAS nas cenas de canal (não-POV),
 * em ordem, para o "resto do roteiro" não sumir nem ir parar no POV.
 */
export function rebalanceChannelNarrationAroundPov(storyboard = {}) {
  if (!storyboard || typeof storyboard !== "object") return storyboard;
  const vps = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts.map((vp) => ({ ...vp }))
    : [];
  if (!vps.length || !vps.some((vp) => isPovScene(vp))) return storyboard;

  const narrative = String(storyboard.narrative_script || "").trim();
  const sentences = narrative
    ? narrative
        .split(/(?<=[.!?…])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5)
    : [];

  const channelIdx = [];
  vps.forEach((vp, i) => {
    if (!isPovScene(vp)) channelIdx.push(i);
  });

  // Limpa POV
  for (let i = 0; i < vps.length; i++) {
    if (!isPovScene(vps[i])) continue;
    vps[i] = {
      ...vps[i],
      narration_text: "",
      narration_excerpt: "",
      no_channel_narration: true,
    };
  }

  if (channelIdx.length && sentences.length) {
    const n = channelIdx.length;
    const base = Math.floor(sentences.length / n);
    let extra = sentences.length % n;
    let cursor = 0;
    for (let k = 0; k < n; k++) {
      const take = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra -= 1;
      const slice = sentences.slice(cursor, cursor + take);
      cursor += take;
      const i = channelIdx[k];
      vps[i] = {
        ...vps[i],
        narration_text: slice.join(" "),
      };
    }
  }

  return { ...storyboard, visual_prompts: vps };
}

/**
 * Política GLOBAL (qualquer projeto): em cenas POV não há VO de canal.
 * - Limpa narration_text / narration_excerpt nas cenas is_pov
 * - Mantém character_speech (fala no asset, não TTS)
 * - Se storyboard.pov.enabled mas cenas sem tag, reaplica applyPovToStoryboard
 *
 * Use em GET/POST storyboard e após qualquer pipeline que toque visual_prompts.
 */
export function enforcePovNoChannelNarrationPolicy(storyboard = {}) {
  if (!storyboard || typeof storyboard !== "object") return storyboard;

  const vpsIn = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  if (!vpsIn.length) return storyboard;

  const povMeta =
    storyboard.pov && typeof storyboard.pov === "object"
      ? storyboard.pov
      : null;
  const hasPovMeta = !!(povMeta && (povMeta.enabled === true || povMeta.block));
  const hasPovScenes = vpsIn.some((vp) => isPovScene(vp));

  if (!hasPovMeta && !hasPovScenes) return storyboard;

  let next = { ...storyboard };
  const idea = next.idea || next.strategy || {};
  const niche = String(next.niche || idea.niche || "").trim();

  // Meta diz POV mas cenas não marcadas → reaplicar pipeline completo
  if (hasPovMeta && !hasPovScenes) {
    const blockIndex = Math.max(2, Math.floor(Number(povMeta.block) || 2));
    const totalBlocks = Math.max(
      3,
      Math.floor(Number(povMeta.total_blocks) || blockIndex + 1)
    );
    next = applyPovToStoryboard(next, {
      enabled: true,
      blockIndex,
      totalBlocks,
    });
  } else {
    next.visual_prompts = stripChannelNarrationFromPovScenes(vpsIn);
    // Reescreve prompts fracos / 3ª pessoa com AÇÃO + FALA 1ª pessoa
    next.visual_prompts = (next.visual_prompts || []).map((vp) => {
      if (!isPovScene(vp)) return vp;
      const role =
        String(vp.video_role || "A").toUpperCase() === "B" ? "B" : "A";
      let speech = String(vp.character_speech || "").trim();
      if (!speech) speech = defaultPovCharacterSpeech(role, idea, niche);
      const needsPrompt =
        !String(vp.prompt || "").trim() ||
        !/first-person|POV|in-world|Brazilian Portuguese/i.test(
          String(vp.prompt || "")
        );
      return {
        ...vp,
        character_speech: speech,
        prompt: needsPrompt
          ? buildProPovVideoPrompt({
              role,
              idea,
              niche,
              characterSpeech: speech,
            })
          : vp.prompt,
      };
    });
  }

  // Roteiro de canal só nas cenas não-POV (resto do script visível e ordenado)
  next = rebalanceChannelNarrationAroundPov(next);

  // Hard guarantee em todas as cenas POV
  next.visual_prompts = (next.visual_prompts || []).map((vp) => {
    if (!isPovScene(vp)) return vp;
    const role = String(vp.video_role || "A").toUpperCase() === "B" ? "B" : "A";
    let speech = String(vp.character_speech || "").trim();
    if (!speech) speech = defaultPovCharacterSpeech(role, idea, niche);
    return {
      ...vp,
      is_pov: true,
      scene_kind: "pov",
      narration_text: "",
      narration_excerpt: "",
      no_channel_narration: true,
      use_source_audio: true,
      character_speech: speech,
      prompt:
        String(vp.prompt || "").trim() ||
        buildProPovVideoPrompt({
          role,
          idea,
          niche,
          characterSpeech: speech,
        }),
      volume:
        Number.isFinite(Number(vp.volume)) && Number(vp.volume) > 0
          ? Number(vp.volume)
          : POV_SOURCE_AUDIO_VOLUME,
      editor_notes:
        "POV especial: SEM narrador de canal. Prompt = ação + fala do personagem. VO do canal retoma DEPOIS.",
    };
  });

  next.pov = {
    ...(next.pov && typeof next.pov === "object" ? next.pov : {}),
    enabled: true,
    use_source_audio: true,
    no_channel_narration: true,
  };

  return next;
}

/**
 * Aplica metadados POV + cadeia de keyframes (3 imgs + 2 vídeos) ao storyboard.
 * Chamar DEPOIS de repair/fallback de visual_prompts (não antes).
 * Política de VO de canal = enforcePovNoChannelNarrationPolicy (global).
 */
export function applyPovToStoryboard(
  parsedData = {},
  { enabled = false, blockIndex = 0, totalBlocks = 0 } = {}
) {
  if (!enabled || !parsedData || typeof parsedData !== "object") {
    return parsedData;
  }

  const next = { ...parsedData };
  const idea = next.idea || next.strategy || {};
  const niche = String(next.niche || idea.niche || "").trim();
  const ideaForPov = { title: idea.title_main || idea.title, ...idea };
  let vps = tagPovVisualPrompts(next.visual_prompts || [], {
    blockIndex,
    enabled: true,
    idea: ideaForPov,
    niche,
  });
  // Re-injeta com ideia/nicho se ainda faltar (tag já injeta skeleton; reforça prompts)
  const taggedPre = vps.filter((vp) => vp.is_pov === true);
  if (taggedPre.length < POV_SCENE_COUNT) {
    vps = tagPovVisualPrompts(
      injectPovVideoPair(vps, {
        blockIndex,
        idea: ideaForPov,
        niche,
      }),
      { blockIndex, enabled: true, idea: ideaForPov, niche }
    );
  }

  const tagged = vps.filter((vp) => vp.is_pov === true);
  const pairId =
    tagged[0]?.pov_pair_id ||
    next.pov?.pair_id ||
    `pov-block-${blockIndex || 1}`;

  // Ordena A depois B
  const orderedPov = [...tagged].sort((a, b) => {
    const ra = String(a.video_role || "").toUpperCase();
    const rb = String(b.video_role || "").toUpperCase();
    if (ra === "A" && rb !== "A") return -1;
    if (rb === "A" && ra !== "A") return 1;
    return (Number(a.scene) || 0) - (Number(b.scene) || 0);
  });
  let videoA = orderedPov[0] || null;
  let videoB = orderedPov[1] || orderedPov[0] || null;

  const existingKf = next.pov?.keyframe_prompts || next.pov?.keyframes || null;

  let chain = buildPovKeyframeChain({
    pairId,
    idea: { title: idea.title_main || idea.title, ...idea },
    niche,
    existingKeyframes: existingKf,
    videoA,
    videoB,
  });

  if (videoA && videoB) {
    const linked = linkPovVideosToKeyframes(videoA, videoB, chain);
    chain = linked.keyframeChain;
    const aIdx = vps.indexOf(videoA);
    const bIdx = vps.indexOf(videoB);
    // Se objetos já são cópias do map, localizar por is_pov + role
    const findIdx = (role) =>
      vps.findIndex(
        (vp) => vp.is_pov && String(vp.video_role || "").toUpperCase() === role
      );
    const ia = aIdx >= 0 ? aIdx : findIdx("A");
    const ib = bIdx >= 0 ? bIdx : findIdx("B");
    if (ia >= 0) vps[ia] = { ...vps[ia], ...linked.videoA };
    if (ib >= 0 && ib !== ia) vps[ib] = { ...vps[ib], ...linked.videoB };
    // Enforce B.first === A.last string
    if (ia >= 0 && ib >= 0 && ib !== ia) {
      const bridge = String(vps[ia].pov_image_prompts?.last || "").trim();
      if (bridge) {
        vps[ib] = {
          ...vps[ib],
          pov_image_prompts: {
            ...(vps[ib].pov_image_prompts || {}),
            first: bridge,
            first_role: POV_FRAME_ROLES.A_END_B_START,
            last:
              vps[ib].pov_image_prompts?.last ||
              chain.byRole[POV_FRAME_ROLES.B_END].prompt,
            last_role: POV_FRAME_ROLES.B_END,
          },
          seedance_refs: {
            ...(vps[ib].seedance_refs || {}),
            first_frame: bridge,
            last_frame:
              vps[ib].seedance_refs?.last_frame ||
              chain.byRole[POV_FRAME_ROLES.B_END].prompt,
          },
        };
      }
    }
  }

  // Garante que keyframes não virem cenas de upload no visual_prompts
  // e que VO de canal saia do POV (história retoma nas cenas vizinhas).
  next.visual_prompts = stripChannelNarrationFromPovScenes(
    filterVisualPromptsForTimeline(vps)
  );
  next.pov = {
    enabled: true,
    block: blockIndex,
    pair_id: pairId,
    total_blocks: totalBlocks || undefined,
    scene_count: POV_SCENE_COUNT,
    duration_seconds: POV_BLOCK_DURATION_SEC,
    scene_duration_seconds: POV_SCENE_DURATION_SEC,
    video_a: "start",
    video_b: "end",
    use_source_audio: true,
    no_channel_narration: true,
    // Scaffolding de geração apenas — NÃO upload / NÃO timeline
    keyframe_prompts: chain.list.map((k) => asPovKeyframePrompt(k)),
    upload_required: ["VIDEO_A", "VIDEO_B"],
    upload_scenes_only: true,
    frame_chain: chain.chain,
    generation_order: [
      "image:A_START (prompt only — not upload)",
      "image:A_END_B_START (prompt only — bridge, not upload)",
      "image:B_END (prompt only — not upload)",
      "video:A UPLOAD (first=A_START, last=A_END_B_START)",
      "video:B UPLOAD (first=A_END_B_START, last=B_END)",
    ],
  };

  // Roteiro de canal só fora do POV + zero VO no POV
  Object.assign(next, rebalanceChannelNarrationAroundPov(next));
  next.visual_prompts = (next.visual_prompts || []).map((vp) => {
    if (!isPovScene(vp)) return vp;
    return {
      ...vp,
      narration_text: "",
      narration_excerpt: "",
      no_channel_narration: true,
      use_source_audio: true,
    };
  });

  return next;
}

/**
 * Props de clip/timeline para assets POV (áudio do source; sem VO de canal).
 */
export function povClipAudioProps(item = {}) {
  if (!isPovScene(item)) return {};
  return {
    is_pov: true,
    scene_kind: "pov",
    use_source_audio: true,
    no_channel_narration: true,
    volume: Number.isFinite(Number(item.volume))
      ? Math.min(1, Math.max(0, Number(item.volume)))
      : POV_SOURCE_AUDIO_VOLUME,
    video_role: item.video_role || item.props?.video_role || undefined,
    continuity: item.continuity || item.props?.continuity || undefined,
    pov_pair_id: item.pov_pair_id || item.props?.pov_pair_id || undefined,
    pov_scene: item.pov_scene || item.props?.pov_scene || undefined,
  };
}

/**
 * Intervalos [start, end) das cenas POV (fala no asset + duck BGM).
 * Não mutam TTS — não há narração de canal nesses trechos.
 */
export function buildPovSpeakingRanges(scenes = []) {
  if (!Array.isArray(scenes)) return [];
  return scenes
    .filter((s) => isPovScene(s))
    .map((s) => {
      const start = Math.max(0, Number(s.start) || 0);
      const duration = Math.max(0.05, Number(s.duration) || 0);
      return {
        start,
        end: start + duration,
        video_role: s.video_role || null,
        pov_pair_id: s.pov_pair_id || null,
      };
    })
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);
}

/** @deprecated use buildPovSpeakingRanges — não há mute de TTS no POV */
export function buildPovNarrationMuteRanges(scenes = []) {
  return buildPovSpeakingRanges(scenes);
}
