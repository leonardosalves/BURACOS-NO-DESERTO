export type NicheTagStyle = {
  bg: string;
  text: string;
  border: string;
  dot: string;
};

const KNOWN_NICHES: Record<string, NicheTagStyle> = {
  curiosidades: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-300',
    border: 'border-violet-500/35',
    dot: 'bg-violet-400',
  },
  'curiosidades e fatos surpreendentes': {
    bg: 'bg-fuchsia-500/15',
    text: 'text-fuchsia-300',
    border: 'border-fuchsia-500/35',
    dot: 'bg-fuchsia-400',
  },
  historia: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/35',
    dot: 'bg-amber-400',
  },
  história: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/35',
    dot: 'bg-amber-400',
  },
  geografia: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/35',
    dot: 'bg-emerald-400',
  },
  tecnologia: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300',
    border: 'border-cyan-500/35',
    dot: 'bg-cyan-400',
  },
  financas: {
    bg: 'bg-lime-500/15',
    text: 'text-lime-300',
    border: 'border-lime-500/35',
    dot: 'bg-lime-400',
  },
  finanças: {
    bg: 'bg-lime-500/15',
    text: 'text-lime-300',
    border: 'border-lime-500/35',
    dot: 'bg-lime-400',
  },
  geral: {
    bg: 'bg-zinc-500/15',
    text: 'text-zinc-400',
    border: 'border-zinc-600/40',
    dot: 'bg-zinc-500',
  },
  customized: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-300',
    border: 'border-rose-500/35',
    dot: 'bg-rose-400',
  },
  custom: {
    bg: 'bg-pink-500/15',
    text: 'text-pink-300',
    border: 'border-pink-500/35',
    dot: 'bg-pink-400',
  },
};

const FALLBACK_PALETTE: NicheTagStyle[] = [
  { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/35', dot: 'bg-sky-400' },
  { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/35', dot: 'bg-indigo-400' },
  { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/35', dot: 'bg-orange-400' },
  { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/35', dot: 'bg-teal-400' },
  { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/35', dot: 'bg-blue-400' },
];

function normalizeNicheKey(niche?: string) {
  return String(niche || 'Geral')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getNicheTagStyle(niche?: string): NicheTagStyle {
  const key = normalizeNicheKey(niche);
  if (KNOWN_NICHES[key]) return KNOWN_NICHES[key];
  return FALLBACK_PALETTE[hashString(key) % FALLBACK_PALETTE.length];
}

export function formatNicheLabel(niche?: string) {
  const raw = String(niche || 'Geral').trim() || 'Geral';
  if (raw.length <= 22) return raw;
  return `${raw.slice(0, 20)}…`;
}