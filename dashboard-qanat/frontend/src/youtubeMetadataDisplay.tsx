import React from 'react';

export function detectJsonConfig(text: string) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.highlight_keywords || parsed.bgm_mappings || parsed.impact_texts) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function normalizeYoutubeMetadataDisplay(text: string) {
  const plainHeaders = [
    'TÍTULOS', 'DESCRIÇÃO', 'HASHTAGS PRINCIPAIS', 'HASHTAGS', 'TAGS',
    'COMENTÁRIO PINADO', 'CAPÍTULOS', 'THUMBNAILS A/B', 'THUMBNAILS AB', 'THUMBNAILS',
    'GANCHO DE RETENÇÃO', 'GANCHO PARA THUMBNAIL', 'CTA DE MEIO DE VÍDEO',
  ];
  const headerKeys = new Set(
    plainHeaders.map((h) => h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()),
  );
  return String(text)
    .replace(/\r\n/g, '\n')
    .replace(/^\s*\*\*(##\s+[^*\n]+)\*\*\s*$/gm, '$1')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim().replace(/:+$/, '');
      if (!trimmed || /^##\s+/i.test(trimmed)) return line;
      const key = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      if (headerKeys.has(key)) return `## ${trimmed}`;
      return line;
    })
    .join('\n')
    .trim();
}

export function renderFormattedText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    if (line.startsWith('### ')) {
      return <h4 key={idx} className="text-white font-bold text-sm mt-4 mb-2 tracking-wide font-sans">{line.slice(4)}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={idx} className="text-gold-500 font-bold text-base mt-5 mb-2.5 tracking-wide font-sans">{line.slice(3)}</h3>;
    }
    if (line.startsWith('# ')) {
      return (
        <h2 key={idx} className="text-white font-black text-lg mt-6 mb-3 tracking-wide font-sans border-b border-zinc-800 pb-1">
          {line.slice(2)}
        </h2>
      );
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <li key={idx} className="text-xs text-gray-300 ml-4 list-disc my-1 leading-relaxed">{line.slice(2)}</li>;
    }
    const parts = line.split('**');
    if (parts.length > 1) {
      return (
        <p key={idx} className="text-xs text-gray-350 my-1.5 leading-relaxed">
          {parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="text-white font-bold">{part}</strong> : part))}
        </p>
      );
    }
    return <p key={idx} className="text-xs text-gray-350 my-1.5 leading-relaxed min-h-[1em]">{line}</p>;
  });
}

export function buildThumbnailBrief(
  thumb: {
    id: string;
    label?: string;
    overlayText?: string;
    pairedTitle?: string;
    composition?: string;
    focalElement?: string;
    colors?: string[];
  },
  opts?: { profileLabel?: string; format?: string },
) {
  const format = opts?.format;
  return [
    `Variante ${thumb.id} — ${thumb.label || 'Thumbnail YouTube'}`,
    thumb.overlayText ? `Texto na capa: ${thumb.overlayText}` : '',
    thumb.pairedTitle ? `Título pareado: ${thumb.pairedTitle}` : '',
    thumb.composition ? `Composição: ${thumb.composition}` : '',
    thumb.focalElement ? `Foco visual: ${thumb.focalElement}` : '',
    thumb.colors?.length ? `Paleta: ${thumb.colors.join(', ')}` : '',
    opts?.profileLabel ? `Perfil: ${opts.profileLabel}` : '',
    format ? `Formato: ${format === 'SHORT' ? '9:16 Shorts' : '16:9 Longo'}` : '',
  ].filter(Boolean).join('\n');
}