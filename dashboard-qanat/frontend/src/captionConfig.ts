export type CaptionStyleId = 'shorts-viral' | 'documentary';

export type ShortCaptionEffectId = 'viral-pop' | 'viral-pulse' | 'viral-static';
export type LongCaptionEffectId = 'doc-pill' | 'doc-glow' | 'doc-minimal';

export const SHORT_CAPTION_STYLES: {
  id: CaptionStyleId;
  label: string;
  hint: string;
}[] = [
  { id: 'shorts-viral', label: 'Viral palavra-a-palavra', hint: '1 palavra por vez, destaque amarelo forte.' },
  { id: 'documentary', label: 'Blocos documentário', hint: '2 palavras por bloco, tom mais calmo (útil em reels explicativos).' },
];

export const LONG_CAPTION_STYLES: {
  id: CaptionStyleId;
  label: string;
  hint: string;
}[] = [
  { id: 'documentary', label: 'Documentário', hint: '2 palavras, fundo pill escuro — padrão 16:9.' },
  { id: 'shorts-viral', label: 'Estilo viral', hint: 'Palavra destacada sem pill — ritmo mais rápido em longos.' },
];

export const SHORT_CAPTION_EFFECTS: {
  id: ShortCaptionEffectId;
  label: string;
  hint: string;
}[] = [
  { id: 'viral-pop', label: 'Pop + destaque', hint: 'Escala spring na palavra ativa com caixa amarela.' },
  { id: 'viral-pulse', label: 'Pulso no BGM', hint: 'Pop + brilho pulsando no ritmo da trilha (~120 BPM).' },
  { id: 'viral-static', label: 'Estático', hint: 'Destaque amarelo sem animação de escala.' },
];

export const LONG_CAPTION_EFFECTS: {
  id: LongCaptionEffectId;
  label: string;
  hint: string;
}[] = [
  { id: 'doc-pill', label: 'Pill cinematográfico', hint: 'Fundo escuro arredondado atrás do bloco de palavras.' },
  { id: 'doc-glow', label: 'Brilho dourado', hint: 'Sem pill — palavra ativa com glow amarelo.' },
  { id: 'doc-minimal', label: 'Minimal', hint: 'Texto menor, sombra suave, menos contraste.' },
];

export function resolveShortCaptionStyle(raw?: string): CaptionStyleId {
  return raw === 'documentary' ? 'documentary' : 'shorts-viral';
}

export function resolveLongCaptionStyle(raw?: string): CaptionStyleId {
  return raw === 'shorts-viral' ? 'shorts-viral' : 'documentary';
}

export function resolveShortCaptionEffect(raw?: string, legacyBgmPulse?: boolean): ShortCaptionEffectId {
  if (raw === 'viral-pulse' || raw === 'viral-static' || raw === 'viral-pop') return raw;
  if (legacyBgmPulse === false) return 'viral-static';
  return 'viral-pop';
}

export function resolveLongCaptionEffect(raw?: string): LongCaptionEffectId {
  if (raw === 'doc-glow' || raw === 'doc-minimal') return raw;
  return 'doc-pill';
}