/**
 * Fonte única de verdade para formato de vídeo (SHORT vs LONG).
 * Usado em overlay orchestration, quality check, memória e criação de projeto.
 */

export const VIDEO_FORMAT = {
  SHORT: "SHORT",
  LONG: "LONG",
};

/** Regras de sucesso por formato — injetadas na memória/prompts do Studio Agents. */
export const FORMAT_SUCCESS_RULES = {
  SHORT: [
    { category: "hook", description: "Gancho limpo até 1.5s — sem overlays informativos (só kinetic-text se necessário)" },
    { category: "overlay_timing", description: "Ancorar start do overlay ao scene_ref da narração, não a segundos absolutos" },
    { category: "overlay_timing", description: "Manter desvio palavra-chave ↔ overlay abaixo de 3s" },
    { category: "retention", description: "Pattern interrupt visual a cada 8–12s em Shorts" },
    { category: "caption", description: "Legendas ≤8 palavras por chunk (shorts-viral)" },
    { category: "listicle", description: "Listicle Short: máx. 2 overlays IA + HUD rank-progress; gap 12–15s; sem lower-third/kinetic/bar-chart" },
    { category: "overlay_budget", description: "Shorts: máx. 2 overlays IA no vídeo inteiro; gap mínimo 12s (15s relaxed)" },
  ],
  LONG: [
    { category: "hook", description: "Gancho limpo até 5s antes do primeiro overlay informativo" },
    { category: "overlay_timing", description: "Gap mínimo ~55s entre overlays (1/min); até 2/min em modo rich (gap ~30s)" },
    { category: "overlay_budget", description: "Longos: 1 overlay/min (normal); até 2/min quando necessário (rich)" },
    { category: "structure", description: "Usar chapter stingers e progress bar em documentários 16:9" },
    { category: "caption", description: "Legendas documentary — frases completas, ritmo mais lento" },
    { category: "bgm", description: "BGM por bloco (bgm_mappings), não single_bgm" },
  ],
};

export function detectVideoFormat(config = {}, totalDuration = 0) {
  const aspect = config.aspect_ratio || config.format || "";
  const explicit = String(config.video_format || config.format_type || "").toUpperCase();
  if (explicit === "SHORTS" || explicit === "SHORT") return VIDEO_FORMAT.SHORT;
  if (explicit === "LONGO" || explicit === "LONG") return VIDEO_FORMAT.LONG;
  if (aspect === "9:16" || (totalDuration > 0 && totalDuration <= 75)) return VIDEO_FORMAT.SHORT;
  if (totalDuration > 120) return VIDEO_FORMAT.LONG;
  return aspect === "16:9" ? VIDEO_FORMAT.LONG : VIDEO_FORMAT.SHORT;
}

export function resolveProjectFormat(config = {}, timings = {}) {
  const totalDuration = Number(timings.total_duration) || 0;
  const format = detectVideoFormat(config, totalDuration);
  const isListicle = String(config.content_mode || "").toUpperCase() === "LISTICLE";
  return {
    format,
    aspectRatio: format === VIDEO_FORMAT.SHORT ? "9:16" : "16:9",
    videoFormat: format === VIDEO_FORMAT.SHORT ? "SHORTS" : "LONGO",
    captionStyle: format === VIDEO_FORMAT.SHORT ? "shorts-viral" : "documentary",
    isListicle,
    totalDuration,
  };
}

export function getDefaultBlockTimings(format = VIDEO_FORMAT.SHORT) {
  if (format === VIDEO_FORMAT.SHORT) {
    return {
      starts: [0, 8, 16, 24, 32],
      durations: [8, 8, 8, 8, 8],
      total_duration: 40,
    };
  }
  return {
    starts: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110],
    durations: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    total_duration: 120,
  };
}

export function formatScopedCategory(format, category) {
  const f = format && format !== "ALL" ? format : null;
  const cat = String(category || "general").trim();
  if (!f) return cat;
  if (cat.startsWith(`${f}/`) || cat.startsWith("SHORT/") || cat.startsWith("LONG/")) return cat;
  return `${f}/${cat}`;
}

export function patternMatchesFormat(category, targetFormat) {
  const cat = String(category || "");
  if (cat.startsWith("SHORT/")) return targetFormat === VIDEO_FORMAT.SHORT;
  if (cat.startsWith("LONG/")) return targetFormat === VIDEO_FORMAT.LONG;
  return true;
}

export function getFormatSuccessRules(format = VIDEO_FORMAT.SHORT) {
  return FORMAT_SUCCESS_RULES[format] || FORMAT_SUCCESS_RULES.SHORT;
}