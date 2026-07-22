/**
 * transitionPlanner.js
 * Atribui transições shotcraft entre cenas do motion plan.
 * Seleciona por energia, formato e nicho — evita repetição consecutiva.
 */

import { findCard, cardsByCategory } from "./shotcraftCatalog.js";
import { resolveNicheMotionPrefs } from "./nicheMotionPreferences.js";

const TRANSITION_CARDS = [
  "shot-transitions", "wipe-transitions", "page-turn-transitions",
  "transition-hidden-cut", "transition-travel", "circle-match-iris",
  "line-carry-transition", "color-block-step-wipe", "bottom-push-stack-wipe",
  "tear-streak-transitions", "print-texture-transitions", "bubble-swarm-takeover",
];

const FAST_TRANSITIONS = new Set([
  "tear-streak-transitions", "shot-transitions", "transition-hidden-cut",
  "color-block-step-wipe", "bottom-push-stack-wipe",
]);

const MEDIUM_TRANSITIONS = new Set([
  "wipe-transitions", "page-turn-transitions", "transition-travel",
  "circle-match-iris", "line-carry-transition", "print-texture-transitions",
  "bubble-swarm-takeover",
]);

/**
 * Escolhe a transição para uma cena baseado em contexto.
 */
function pickTransition({
  index,
  totalScenes,
  isShort,
  nichePrefs,
  previousTransition,
  sceneEnergy = "medium",
}) {
  // Preferência do nicho
  const nicheTrans = nichePrefs?.transicao;
  if (nicheTrans && index > 0 && index % 3 === 0) {
    // Usa transição do nicho a cada 3 cenas para consistência
    if (nicheTrans !== previousTransition) return nicheTrans;
  }

  // Pool baseado no formato
  const pool = isShort
    ? TRANSITION_CARDS.filter((id) => FAST_TRANSITIONS.has(id))
    : TRANSITION_CARDS;

  // Filtra energia da cena
  const energyPool = sceneEnergy === "high"
    ? pool.filter((id) => {
        const card = findCard(id);
        return card?.energy === "high" || FAST_TRANSITIONS.has(id);
      })
    : pool;

  const candidates = (energyPool.length ? energyPool : pool).filter(
    (id) => id !== previousTransition
  );

  if (!candidates.length) return TRANSITION_CARDS[index % TRANSITION_CARDS.length];

  // Rotação determinística com variação
  const pick = candidates[index % candidates.length];
  return pick;
}

/**
 * Atribui transições a todas as cenas do motion plan.
 * Retorna array de { scene_ref, transition_id, transition_style, duration_s }.
 */
export function assignTransitionsToMotionPlan({
  motionPlan = null,
  motionScenes = [],
  format = "16:9",
  niche = "",
} = {}) {
  const isShort = format === "9:16" || String(format).toUpperCase().includes("SHORT");
  const nichePrefs = resolveNicheMotionPrefs(niche);
  const scenes = motionPlan?.cenas || motionScenes || [];
  if (!scenes.length) return [];

  const assignments = [];
  let previousTransition = null;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneRef = String(scene.scene_ref || i + 1);
    const energy = scene.motion_shot?.props?.energy || scene.energy || "medium";

    // Primeira cena: transição de entrada forte
    const transitionId = i === 0
      ? (nichePrefs.transicao || "shot-transitions")
      : pickTransition({
          index: i,
          totalScenes: scenes.length,
          isShort,
          nichePrefs,
          previousTransition,
          sceneEnergy: energy,
        });

    const card = findCard(transitionId);
    const style = card?.styles?.[0] || transitionId;
    const durationS = isShort
      ? Math.min(0.6, card?.minDurationSec || 0.5)
      : Math.min(1.2, card?.maxDurationSec || 1.0);

    assignments.push({
      scene_ref: sceneRef,
      transition_id: transitionId,
      transition_style: style,
      duration_s: durationS,
      energy: card?.energy || "medium",
    });

    previousTransition = transitionId;
  }

  return assignments;
}

/**
 * Aplica transições ao motion plan (mutação controlada).
 */
export function applyTransitionsToMotionPlan(plan, assignments = []) {
  if (!plan?.cenas?.length || !assignments.length) return plan;
  const byRef = new Map(assignments.map((a) => [String(a.scene_ref), a]));
  const cenas = plan.cenas.map((cena) => {
    const key = String(cena.scene_ref);
    const trans = byRef.get(key);
    if (!trans) return cena;
    return {
      ...cena,
      transicao_entrada: trans.transition_id,
      transicao_style: trans.transition_style,
      transicao_duration_s: trans.duration_s,
    };
  });
  return { ...plan, cenas };
}

export { TRANSITION_CARDS, FAST_TRANSITIONS, MEDIUM_TRANSITIONS };
