import test from "node:test";
import assert from "node:assert/strict";
import {
  pickPovBlockIndex,
  resolvePovPlacement,
  buildPovContractBlock,
  tagPovVisualPrompts,
  applyPovToStoryboard,
  enforcePovNoChannelNarrationPolicy,
  buildPovSpeakingRanges,
  buildPovKeyframeChain,
  linkPovVideosToKeyframes,
  isPovScene,
  POV_SCENE_COUNT,
  POV_BLOCK_DURATION_SEC,
  POV_FRAME_ROLES,
} from "./povBlock.js";

test("pickPovBlockIndex nunca usa intro nem outro em vídeos com 5+ blocos", () => {
  const seen = new Set();
  for (let i = 0; i < 40; i += 1) {
    const b = pickPovBlockIndex(8, { random: () => i / 40 });
    assert.ok(b >= 2 && b <= 7, `slot inválido: ${b}`);
    seen.add(b);
  }
  assert.ok(seen.size >= 2, `esperado variação, got ${[...seen]}`);
});

test("pickPovBlockIndex com 3 blocos cai no miolo", () => {
  assert.equal(pickPovBlockIndex(3, { random: () => 0.9 }), 2);
});

test("buildPovContractBlock vazio quando desligado", () => {
  assert.equal(buildPovContractBlock({ enablePov: false }), "");
});

test("buildPovContractBlock exige cadeia 3 imgs + 2 vídeos", () => {
  const text = buildPovContractBlock({
    enablePov: true,
    niche: "Profissões extintas",
    format: "LONGO",
    idea: { title: "O afiador de facas", promise: "Ver o ofício por dentro" },
    totalBlocks: 8,
    povBlockIndex: 4,
  });
  assert.match(text, /BLOCO POV/);
  assert.match(text, /BLOCO 4/);
  assert.match(text, /A_START/);
  assert.match(text, /A_END_B_START/);
  assert.match(text, /B_END/);
  assert.match(text, /VIDEO A/);
  assert.match(text, /VIDEO B/);
  assert.match(text, /keyframe_prompts/);
  assert.match(text, /use_source_audio/);
  assert.match(text, /SEM NARRAÇÃO DE CANAL/i);
});

test("keyframe chain: end A === start B (bridge único)", () => {
  const chain = buildPovKeyframeChain({
    pairId: "pov-block-4",
    idea: { title: "Afiador" },
    existingKeyframes: [
      { role: "A_START", prompt: "open hands holding whetstone POV" },
      { role: "A_END_B_START", prompt: "BRIDGE mid stroke same hands" },
      { role: "B_END", prompt: "blade gleaming finished POV" },
    ],
  });
  assert.equal(chain.list.length, 3);
  assert.equal(chain.byRole[POV_FRAME_ROLES.A_END_B_START].is_bridge, true);
  const linked = linkPovVideosToKeyframes(
    { scene: 1, prompt: "video A motion" },
    { scene: 2, prompt: "video B motion" },
    chain
  );
  assert.equal(
    linked.videoA.pov_image_prompts.last,
    linked.videoB.pov_image_prompts.first
  );
  assert.equal(
    linked.videoA.seedance_refs.last_frame,
    "BRIDGE mid stroke same hands"
  );
  assert.equal(
    linked.videoB.seedance_refs.first_frame,
    "BRIDGE mid stroke same hands"
  );
  assert.equal(
    linked.videoB.seedance_refs.last_frame,
    "blade gleaming finished POV"
  );
  // Keyframes = prompt only, never upload
  for (const kf of chain.list) {
    assert.equal(kf.prompt_only, true);
    assert.equal(kf.upload_required, false);
    assert.equal(kf.exclude_from_timeline, true);
  }
});

test("tagPovVisualPrompts marca A start + B end com áudio de source", () => {
  const vps = tagPovVisualPrompts(
    [
      { scene: 1, block: 3, prompt: "a" },
      { scene: 2, block: 4, prompt: "pov1" },
      { scene: 3, block: 4, prompt: "pov2" },
      { scene: 4, block: 4, prompt: "extra" },
      { scene: 5, block: 5, prompt: "b" },
    ],
    { blockIndex: 4 }
  );
  const pov = vps.filter((v) => v.is_pov);
  assert.equal(pov.length, POV_SCENE_COUNT);
  assert.equal(pov[0].video_role, "A");
  assert.equal(pov[0].continuity, "start");
  assert.equal(pov[1].video_role, "B");
  assert.equal(pov[1].continuity, "end");
  assert.equal(pov[0].use_source_audio, true);
  assert.equal(pov[0].no_channel_narration, true);
  assert.equal(pov[0].volume, 1);
  assert.equal(pov[0].type, "vídeo IA");
  assert.ok(
    String(pov[1].seedance_refs?.first_frame || "").includes("VIDEO A")
  );
  assert.equal(pov[0].pov_pair_id, pov[1].pov_pair_id);
});

test("applyPovToStoryboard injeta 2 cenas VIDEO se bloco vazio / repair apagou", () => {
  const out = applyPovToStoryboard(
    {
      idea: { title: "Diógenes no barril" },
      niche: "História",
      visual_prompts: [
        {
          scene: "1.1",
          block: 1,
          prompt: "intro wide shot of the marketplace",
        },
        { scene: "3.1", block: 3, prompt: "outro reflective ending shot" },
      ],
    },
    { enabled: true, blockIndex: 2, totalBlocks: 5 }
  );
  const pov = out.visual_prompts.filter((v) => v.is_pov);
  assert.equal(pov.length, 2);
  assert.equal(pov[0].video_role, "A");
  assert.equal(pov[1].video_role, "B");
  assert.equal(pov[0].block, 2);
  assert.equal(pov[1].block, 2);
  assert.equal(pov[0].type, "vídeo IA");
  assert.equal(out.pov.enabled, true);
  assert.equal(out.pov.keyframe_prompts.length, 3);
});

test("POV limpa VO de canal e prompt tem ação+fala 1ª pessoa", () => {
  const out = applyPovToStoryboard(
    {
      narrative_script:
        "Intro do canal sobre o filósofo. Meio da história. Conclusão do canal.",
      strategy: { title_main: "Diógenes no barril" },
      visual_prompts: [
        {
          scene: "1.1",
          block: 1,
          narration_text: "Intro do canal sobre o filósofo.",
          prompt: "intro",
        },
        {
          scene: "2.1",
          block: 2,
          narration_text:
            "Ele vivia em um jarro. Diógenes respondeu: 'Saia da frente do meu sol'.",
          prompt: "third person observation of diogenes",
        },
        {
          scene: "2.2",
          block: 2,
          narration_text: "Mais texto de canal no meio do POV.",
          prompt: "another third person shot",
        },
        {
          scene: "3.1",
          block: 3,
          narration_text: "Conclusão do canal.",
          prompt: "outro",
        },
      ],
    },
    { enabled: true, blockIndex: 2, totalBlocks: 4 }
  );
  const pov = out.visual_prompts.filter((v) => v.is_pov);
  assert.equal(pov.length, 2);
  assert.equal(String(pov[0].narration_text || "").trim(), "");
  assert.equal(String(pov[1].narration_text || "").trim(), "");
  assert.equal(pov[0].no_channel_narration, true);
  assert.ok(String(pov[0].character_speech || "").length > 8);
  assert.match(String(pov[0].prompt || ""), /First-person POV|first-person/i);
  assert.match(String(pov[0].prompt || ""), /Brazilian Portuguese|SPEAKS/i);
  assert.match(String(pov[1].prompt || ""), /CONTINUATION|VIDEO B/i);
  // Cenas de canal NÃO recebem dump do texto do POV
  const after = out.visual_prompts.find((v) => v.block === 3 && !v.is_pov);
  assert.ok(after);
  assert.ok(
    !String(after.narration_text || "").includes("Mais texto de canal no meio")
  );
});

test("applyPovToStoryboard grava keyframes e amarra A.last = B.first", () => {
  const out = applyPovToStoryboard(
    {
      visual_prompts: [
        {
          scene: 1,
          block: 3,
          prompt: "video a motion",
          seedance_refs: {
            first_frame: "A open frame detailed",
            last_frame: "SHARED BRIDGE frame detailed",
          },
        },
        {
          scene: 2,
          block: 3,
          prompt: "video b motion",
          seedance_refs: {
            first_frame: "wrong different bridge",
            last_frame: "B close frame detailed",
          },
        },
      ],
    },
    { enabled: true, blockIndex: 3, totalBlocks: 8 }
  );
  assert.equal(out.pov.enabled, true);
  assert.equal(out.pov.keyframe_prompts.length, 3);
  assert.deepEqual(out.pov.upload_required, ["VIDEO_A", "VIDEO_B"]);
  assert.ok(Array.isArray(out.pov.generation_order));
  // visual_prompts: só os 2 vídeos (keyframes ficam em pov.keyframe_prompts)
  const pov = out.visual_prompts.filter((v) => v.is_pov);
  assert.equal(pov.length, 2);
  assert.equal(
    out.visual_prompts.filter((v) => v.pov_keyframe || v.prompt_only).length,
    0
  );
  assert.equal(pov[0].pov_image_prompts.last, pov[1].pov_image_prompts.first);
  assert.equal(pov[0].pov_image_prompts.last, "SHARED BRIDGE frame detailed");
  assert.equal(out.pov.duration_seconds, POV_BLOCK_DURATION_SEC);
  assert.equal(out.pov.keyframe_prompts[0].upload_required, false);
});

test("resolvePovPlacement respeita force no miolo", () => {
  const p = resolvePovPlacement({
    enablePov: true,
    totalBlocks: 10,
    povBlockIndex: 6,
  });
  assert.equal(p.blockIndex, 6);
  assert.equal(p.enabled, true);
});

test("política GLOBAL limpa VO de canal em qualquer storyboard com POV", () => {
  const out = enforcePovNoChannelNarrationPolicy({
    pov: { enabled: true, block: 2 },
    narrative_script: "Antes do POV. Meio da história. Depois do POV.",
    strategy: { title_main: "Teste POV" },
    visual_prompts: [
      {
        scene: "1.1",
        block: 1,
        narration_text: "Antes do POV.",
        prompt: "intro",
      },
      {
        scene: "2.1",
        block: 2,
        is_pov: true,
        scene_kind: "pov",
        video_role: "A",
        narration_text: "Texto de canal no meio do POV A.",
        prompt: "third person shot",
      },
      {
        scene: "2.2",
        block: 2,
        is_pov: true,
        scene_kind: "pov",
        video_role: "B",
        narration_text: "Texto de canal no meio do POV B.",
        prompt: "another third person",
      },
      {
        scene: "3.1",
        block: 3,
        narration_text: "Depois do POV.",
        prompt: "outro",
      },
    ],
  });
  const pov = out.visual_prompts.filter((v) => v.is_pov);
  assert.equal(pov.length, 2);
  assert.equal(String(pov[0].narration_text || ""), "");
  assert.equal(String(pov[1].narration_text || ""), "");
  assert.equal(pov[0].no_channel_narration, true);
  assert.equal(out.pov.no_channel_narration, true);
  assert.match(String(pov[0].prompt || ""), /First-person|POV/i);
  assert.ok(String(pov[0].character_speech || "").length > 5);
  // POV não injeta prosa de canal na cena 3
  const after = out.visual_prompts.find((v) => !v.is_pov && v.block === 3);
  assert.ok(after);
  assert.equal(
    String(after.narration_text || "").includes(
      "Texto de canal no meio do POV"
    ),
    false
  );
});

test("ranges POV marcam fala no asset (sem mute de TTS)", () => {
  const ranges = buildPovSpeakingRanges([
    { start: 0, duration: 5, volume: 0 },
    {
      start: 12,
      duration: 10,
      is_pov: true,
      video_role: "A",
      volume: 1,
    },
    {
      start: 22,
      duration: 10,
      is_pov: true,
      video_role: "B",
      volume: 1,
    },
    { start: 32, duration: 5, volume: 0 },
  ]);
  assert.equal(ranges.length, 2);
  assert.equal(ranges[0].start, 12);
  assert.equal(ranges[1].end, 32);
  assert.ok(isPovScene({ is_pov: true }));
  assert.equal(isPovScene({ volume: 0 }), false);
});
