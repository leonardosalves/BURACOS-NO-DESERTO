/**
 * Intro e end card são segmentos EXCLUSIVOS do vídeo — não overlays em cima do B-roll.
 *
 * - Intro [0, introDur): só template visual · silêncio total (sem narração/BGM/SFX)
 * - Conteúdo [introDur, contentEnd): B-roll + narração + BGM + SFX
 * - End card [contentEnd, contentEnd+endDur): só template + BGM em fade out
 */

function roleOf(item = {}) {
  return String(
    item.studio_role || item.props?.studio_role || item.policy_injected || ""
  )
    .trim()
    .toLowerCase();
}

function isIntroItem(item) {
  return roleOf(item) === "intro" || item.source === "policy_intro";
}

function isEndCardItem(item) {
  return roleOf(item) === "end_card" || item.source === "policy_end_card";
}

export function findIntroEndFromOverlays(overlays = []) {
  const list = Array.isArray(overlays) ? overlays : [];
  const intro = list.find((o) => isIntroItem(o)) || null;
  const endCard = list.find((o) => isEndCardItem(o)) || null;
  return { intro, endCard };
}

export function findIntroEndFromMotionScenes(scenes = []) {
  const list = Array.isArray(scenes) ? scenes : [];
  const intro = list.find((s) => isIntroItem(s)) || null;
  const endCard = list.find((s) => isEndCardItem(s)) || null;
  return { intro, endCard };
}

function clampDur(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.min(max, Math.max(min, v));
}

/**
 * Reposiciona motion_scenes: intro no 0, end após o conteúdo, resto empurrado.
 */
export function applyExclusiveIntroEndToMotionScenes(scenes = []) {
  const list = Array.isArray(scenes) ? [...scenes] : [];
  const { intro, endCard } = findIntroEndFromMotionScenes(list);
  if (!intro && !endCard) return list;

  const introDur = intro ? clampDur(intro.duration_seconds, 1.5, 10, 3.5) : 0;
  const endDur = endCard ? clampDur(endCard.duration_seconds, 3, 12, 5) : 0;

  let contentEnd = 0;
  for (const s of list) {
    if (isIntroItem(s) || isEndCardItem(s)) continue;
    const start = Number(s.start_hint) || 0;
    const dur = Number(s.duration_seconds) || 0;
    contentEnd = Math.max(contentEnd, start + dur);
  }

  return list.map((s) => {
    if (isIntroItem(s)) {
      return {
        ...s,
        start_hint: 0,
        duration_seconds: introDur,
        props: {
          ...(s.props || {}),
          studio_role: "intro",
          exclusive_segment: true,
          mute_all_audio: true,
          presentation: "fullscreen",
          layout: "fullscreen",
        },
      };
    }
    if (isEndCardItem(s)) {
      return {
        ...s,
        start_hint: contentEnd + introDur,
        duration_seconds: endDur,
        props: {
          ...(s.props || {}),
          studio_role: "end_card",
          exclusive_segment: true,
          music_only: true,
          presentation: "fullscreen",
          layout: "fullscreen",
        },
      };
    }
    return {
      ...s,
      start_hint: (Number(s.start_hint) || 0) + introDur,
    };
  });
}

/**
 * Ajusta props do Remotion (scenes, captions, áudio, overlays) para segmentos exclusivos.
 * Idempotente: se B-roll já começa depois da intro e end card já está após o conteúdo,
 * só garante áudio (narração/BGM/SFX) e flags.
 */
export function applyExclusiveIntroEndToRemotionProps(props = {}) {
  if (!props || typeof props !== "object") return props;

  const overlaysIn = Array.isArray(props.overlays) ? props.overlays : [];
  const { intro, endCard } = findIntroEndFromOverlays(overlaysIn);
  if (!intro && !endCard && !props.forceExclusiveLayout) {
    return props;
  }

  const introDur = intro
    ? clampDur(intro.duration, 1.5, 10, 3.5)
    : clampDur(props.exclusiveLayout?.introDur, 0, 10, 0);
  const endDur = endCard
    ? clampDur(endCard.duration, 3, 12, 5)
    : clampDur(props.exclusiveLayout?.endDur, 0, 12, 0);

  if (introDur <= 0 && endDur <= 0) return props;

  const scenesIn = Array.isArray(props.scenes) ? props.scenes : [];
  let rawContentEnd = 0;
  for (const s of scenesIn) {
    rawContentEnd = Math.max(
      rawContentEnd,
      (Number(s.start) || 0) + (Number(s.duration) || 0)
    );
  }
  rawContentEnd = Math.max(rawContentEnd, Number(props.narrationDuration) || 0);

  const firstSceneStart =
    scenesIn.length > 0
      ? Math.min(...scenesIn.map((s) => Number(s.start) || 0))
      : 0;

  // B-roll ainda sob a intro? precisa empurrar cenas/captions/sfx
  const scenesNeedShift = introDur > 0 && firstSceneStart < introDur - 0.05;

  // Overlays de motion já empurrados pela policy?
  const otherOverlays = overlaysIn.filter(
    (o) => !isIntroItem(o) && !isEndCardItem(o)
  );
  const minOtherOverlay =
    otherOverlays.length > 0
      ? Math.min(...otherOverlays.map((o) => Number(o.start) || 0))
      : Infinity;
  const overlaysNeedShift =
    introDur > 0 &&
    otherOverlays.length > 0 &&
    minOtherOverlay < introDur * 0.5;

  const shiftScenes = scenesNeedShift ? introDur : 0;
  const shiftOverlays = overlaysNeedShift ? introDur : 0;

  // contentEnd no eixo já com cenas posicionadas
  const contentEndAfterScenes =
    (scenesNeedShift ? rawContentEnd + introDur : rawContentEnd) || introDur;
  // Se cenas já estavam shifted, rawContentEnd já inclui o pad
  const contentEndShifted = scenesNeedShift
    ? rawContentEnd + introDur
    : Math.max(rawContentEnd, introDur);

  const endStart = contentEndShifted;
  const newTotal = contentEndShifted + endDur;

  const scenes = scenesIn.map((s) => ({
    ...s,
    start: (Number(s.start) || 0) + shiftScenes,
  }));

  const captions = (Array.isArray(props.captions) ? props.captions : []).map(
    (c) => {
      if (!scenesNeedShift) return c;
      const padMs = Math.round(introDur * 1000);
      return {
        ...c,
        startMs: Math.max(0, (Number(c.startMs) || 0) + padMs),
        endMs: Math.max(0, (Number(c.endMs) || 0) + padMs),
        timestampMs:
          c.timestampMs == null
            ? c.timestampMs
            : Math.max(0, Number(c.timestampMs) + padMs),
      };
    }
  );

  const sfxTracks = (Array.isArray(props.sfxTracks) ? props.sfxTracks : [])
    .map((t) => {
      const start = (Number(t.start) || 0) + (scenesNeedShift ? introDur : 0);
      // Não toca SFX na intro nem no end card
      if (introDur > 0 && start < introDur) {
        return {
          ...t,
          start: introDur,
          duration: Math.max(0.05, Number(t.duration) || 0.2),
        };
      }
      if (endDur > 0 && start >= endStart) {
        return null;
      }
      const end = start + (Number(t.duration) || 0);
      if (endDur > 0 && end > endStart) {
        return { ...t, start, duration: Math.max(0.05, endStart - start) };
      }
      return { ...t, start };
    })
    .filter(Boolean);

  // BGM: silêncio na intro · cobre conteúdo + end card · fade out no end card
  const bgmTracks = (Array.isArray(props.bgmTracks) ? props.bgmTracks : []).map(
    (t) => {
      const oldStart = Number(t.start) || 0;
      // Garante que BGM não toca na intro
      let start = oldStart;
      if (scenesNeedShift) start = oldStart + introDur;
      start = Math.max(introDur, start);
      const duration = Math.max(0.5, newTotal - start);
      const fadeOutS = Math.max(
        Number(t.fadeOutS) || 0,
        endDur > 0 ? endDur * 0.9 : 2.5
      );
      return {
        ...t,
        start,
        duration,
        fadeInS: Number.isFinite(Number(t.fadeInS)) ? Number(t.fadeInS) : 1.2,
        fadeOutS,
      };
    }
  );

  const overlays = overlaysIn.map((o) => {
    if (isIntroItem(o)) {
      return {
        ...o,
        start: 0,
        duration: introDur,
        studio_role: "intro",
        props: {
          ...(o.props || {}),
          studio_role: "intro",
          exclusive_segment: true,
          mute_all_audio: true,
          presentation: "fullscreen",
          layout: "fullscreen",
        },
      };
    }
    if (isEndCardItem(o)) {
      return {
        ...o,
        start: endStart,
        duration: endDur,
        studio_role: "end_card",
        props: {
          ...(o.props || {}),
          studio_role: "end_card",
          exclusive_segment: true,
          music_only: true,
          presentation: "fullscreen",
          layout: "fullscreen",
        },
      };
    }
    return {
      ...o,
      start: (Number(o.start) || 0) + shiftOverlays,
    };
  });

  const bgmDuckPoints = Array.isArray(props.bgmDuckPoints)
    ? props.bgmDuckPoints.map((p) => {
        const n = Number(p);
        if (!Number.isFinite(n) || !scenesNeedShift) return p;
        return n > 1000 ? n + introDur * 1000 : n + introDur;
      })
    : props.bgmDuckPoints;

  const blockProgressBar = props.blockProgressBar
    ? {
        ...props.blockProgressBar,
        totalDuration: newTotal,
        blocks: Array.isArray(props.blockProgressBar.blocks)
          ? props.blockProgressBar.blocks.map((b) => ({
              ...b,
              start: (Number(b.start) || 0) + (scenesNeedShift ? introDur : 0),
            }))
          : props.blockProgressBar.blocks,
      }
    : props.blockProgressBar;

  const narrationAudioDur =
    Number(props.narrationPlayDuration) ||
    Number(props.narrationDuration) ||
    Math.max(0, contentEndShifted - introDur);

  return {
    ...props,
    scenes,
    captions,
    sfxTracks,
    bgmTracks,
    overlays,
    bgmDuckPoints,
    blockProgressBar,
    // Narração depois da intro · corta antes do end card
    narrationStart: introDur,
    narrationPlayDuration: narrationAudioDur,
    narrationDuration: Number(props.narrationDuration) || 0,
    totalDuration: Math.max(newTotal, Number(props.totalDuration) || 0),
    exclusiveLayout: {
      introDur,
      endDur,
      contentStart: introDur,
      contentEnd: contentEndShifted,
      endStart,
      muteIntroAudio: true,
      endCardMusicOnly: true,
      scenesShifted: scenesNeedShift,
      overlaysShifted: overlaysNeedShift,
    },
  };
}
