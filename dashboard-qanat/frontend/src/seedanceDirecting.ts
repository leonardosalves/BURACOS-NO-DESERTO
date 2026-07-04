export type DirectingBrief = {
  dramatic_function?: string;
  camera_intent?: string;
  lighting_intent?: string;
  performance_intent?: string;
  sound_intent?: string;
};

export type SeedanceRefs = {
  identity?: string;
  motion?: string;
  camera?: string;
  audio?: string;
  style?: string;
  environment?: string;
  first_frame?: string;
  last_frame?: string;
};

export const DIRECTING_BRIEF_FIELDS = [
  { id: 'dramatic_function' as const, label: 'Função dramática', hint: 'Turno, POV, poder, subtexto' },
  { id: 'camera_intent' as const, label: 'Intenção de câmera', hint: 'Push-in, orbit, handheld, static' },
  { id: 'lighting_intent' as const, label: 'Iluminação', hint: 'Golden hour, chiaroscuro, neon' },
  { id: 'performance_intent' as const, label: 'Performance', hint: 'Expressão, gesto, ritmo de ação' },
  { id: 'sound_intent' as const, label: 'Som', hint: 'Silêncio, SFX, ambiente' },
];

export const SEEDANCE_REF_SLOTS = [
  { id: 'identity' as const, label: 'Identidade', hint: '@Image1 — rosto, personagem, objeto âncora' },
  { id: 'motion' as const, label: 'Movimento', hint: '@Video1 — gesto, walk cycle' },
  { id: 'camera' as const, label: 'Câmera', hint: '@Video2 — movimento de câmera' },
  { id: 'audio' as const, label: 'Áudio', hint: '@Audio1 — ritmo, tom' },
  { id: 'style' as const, label: 'Estilo', hint: '@Image2 — paleta, grading' },
  { id: 'environment' as const, label: 'Ambiente', hint: '@Image3 — cenário, época' },
  { id: 'first_frame' as const, label: 'Primeiro frame', hint: 'Composição de abertura' },
  { id: 'last_frame' as const, label: 'Último frame', hint: 'Composição de fechamento' },
];

export function emptyDirectingBrief(): DirectingBrief {
  return {
    dramatic_function: '',
    camera_intent: '',
    lighting_intent: '',
    performance_intent: '',
    sound_intent: '',
  };
}

export function emptySeedanceRefs(): SeedanceRefs {
  return Object.fromEntries(SEEDANCE_REF_SLOTS.map((s) => [s.id, ''])) as SeedanceRefs;
}

export function sceneHasDirecting(vp: { directing_brief?: DirectingBrief } | null | undefined): boolean {
  const b = vp?.directing_brief;
  if (!b) return false;
  return DIRECTING_BRIEF_FIELDS.some((f) => String(b[f.id] || '').trim().length > 0);
}

export function sceneHasRefs(vp: { seedance_refs?: SeedanceRefs } | null | undefined): boolean {
  const r = vp?.seedance_refs;
  if (!r) return false;
  return SEEDANCE_REF_SLOTS.some((s) => String(r[s.id] || '').trim().length > 0);
}

export function countScenesWithDirecting(visualPrompts: Array<{ directing_brief?: DirectingBrief }> = []): number {
  return visualPrompts.filter(sceneHasDirecting).length;
}