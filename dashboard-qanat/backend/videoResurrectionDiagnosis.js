const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number(value) || 0));

function safeRate(value, divisor, scale = 1000) {
  const d = Number(divisor) || 0;
  return d > 0 ? ((Number(value) || 0) / d) * scale : 0;
}

export function diagnoseResurrectionOpportunity(video = {}, analytics = null) {
  const format = String(video.format || "LONG").toUpperCase();
  const isShort = format === "SHORT" || format === "SHORTS";
  const metrics = analytics?.metrics || analytics || {};
  const recentViews = Number(metrics.views || 0);
  const averageViewDuration = Number(metrics.averageViewDuration || 0);
  const sharesPerThousand = safeRate(metrics.shares, recentViews);
  const subsPerThousand = safeRate(metrics.subscribersGained, recentViews);
  const ageDays = Number(video.ageDays || 0);
  const hasProject =
    video.hasLumieraProject === true || Boolean(video.projectPath);
  const hasAnalytics =
    analytics?.available !== false && Object.keys(metrics).length > 0;

  let score = 18;
  const reasons = [];
  const risks = [];

  score += clamp(ageDays / 18, 0, 18);
  if (hasProject) {
    score += 18;
    reasons.push("Projeto Lumiera disponível para reedição");
  } else {
    risks.push("Sem projeto-fonte: remake automatizado limitado");
  }
  if (isShort) score += 8;
  if (recentViews > 0) {
    score += clamp(Math.log10(recentViews + 1) * 7, 0, 21);
    reasons.push("Ainda recebe visualizações no período recente");
  } else if (hasAnalytics) {
    risks.push("Sem visualizações recentes");
  }
  if (sharesPerThousand >= 2) {
    score += 10;
    reasons.push("Compartilhamentos indicam valor recuperável");
  }
  if (subsPerThousand >= 1) {
    score += 8;
    reasons.push("Converte espectadores em inscritos");
  }

  let diagnosis = "insufficient_data";
  let treatment = hasProject ? "creative_remake" : "metadata_search_refresh";
  let treatmentLabel = hasProject
    ? "Criar nova versão editorial"
    : "Atualizar descoberta por busca";

  if (!hasAnalytics) {
    risks.push("Analytics detalhado ainda não coletado");
  } else if (isShort) {
    diagnosis =
      averageViewDuration > 0
        ? "short_creative_decay"
        : "short_needs_feed_metrics";
    treatment = hasProject ? "short_remake" : "short_recirculation";
    treatmentLabel = hasProject
      ? "Refazer Short: gancho, ritmo e loop"
      : "Recircular e vincular a conteúdo novo";
    reasons.push(
      "Shorts antigos dependem mais da resposta ao vídeo que dos metadados"
    );
  } else if (averageViewDuration >= 120 || sharesPerThousand >= 2) {
    diagnosis = "packaging_or_distribution";
    treatment = "long_repackage_and_recirculate";
    treatmentLabel = "Nova embalagem + Short derivado";
    score += 8;
  } else {
    diagnosis = "retention_or_topic_decay";
    treatment = hasProject ? "creative_remake" : "metadata_search_refresh";
    treatmentLabel = hasProject
      ? "Reeditar conteúdo e abertura"
      : "Atualizar SEO com cautela";
  }

  return {
    version: 1,
    score: Math.round(clamp(score)),
    tier: score >= 75 ? "high" : score >= 50 ? "medium" : "low",
    diagnosis,
    recommendedTreatment: treatment,
    treatmentLabel,
    reasons: reasons.slice(0, 5),
    risks: risks.slice(0, 4),
    analyticsAvailable: hasAnalytics,
    metrics: {
      recentViews,
      averageViewDuration,
      shares: Number(metrics.shares || 0),
      subscribersGained: Number(metrics.subscribersGained || 0),
      sharesPerThousand: Number(sharesPerThousand.toFixed(2)),
      subscribersPerThousand: Number(subsPerThousand.toFixed(2)),
    },
    analyzedAt: new Date().toISOString(),
  };
}

export function compareResurrectionOpportunity(a = {}, b = {}) {
  const scoreDiff =
    Number(b.diagnosis?.score || b.opportunityScore || 0) -
    Number(a.diagnosis?.score || a.opportunityScore || 0);
  if (scoreDiff) return scoreDiff;
  if (Boolean(a.hasLumieraProject) !== Boolean(b.hasLumieraProject)) {
    return a.hasLumieraProject ? -1 : 1;
  }
  return (
    new Date(a.publishedAt || 0).getTime() -
    new Date(b.publishedAt || 0).getTime()
  );
}
