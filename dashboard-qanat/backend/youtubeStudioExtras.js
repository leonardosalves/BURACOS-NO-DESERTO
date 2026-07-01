import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  assertTitleTestScopes,
  fetchVideoVelocity,
  getYoutubeAccessToken,
  getYoutubeTokenScopes,
} from "./youtubeTitleAnalytics.js";
import {
  fetchChannelAlerts,
  fetchChannelOverview,
  fetchChannelVideosWithAnalytics,
  collectLumieraPublishedVideos,
} from "./youtubeChannelAnalytics.js";
import { loadStudioSettings, saveStudioSettings } from "./youtubeStudioSettings.js";

const execAsync = promisify(exec);

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function periodRange(days, offsetDays = 0) {
  const endMs = Date.now() - offsetDays * 24 * 60 * 60 * 1000;
  const startMs = endMs - days * 24 * 60 * 60 * 1000;
  return {
    startDate: new Date(startMs).toISOString().slice(0, 10),
    endDate: new Date(endMs).toISOString().slice(0, 10),
  };
}

async function queryYoutubeAnalytics(accessToken, params) {
  const res = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Falha ao buscar analytics do YouTube.");
  }
  return data;
}

function parseAnalyticsRows(analyticsData = {}) {
  const headers = analyticsData?.columnHeaders || [];
  const rows = analyticsData?.rows || [];
  return rows.map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header.name] = row[index];
    });
    return entry;
  });
}

function formatCount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function mapChannelMetricsRow(row = {}) {
  return {
    views: formatCount(row.views),
    estimatedMinutesWatched: formatCount(row.estimatedMinutesWatched),
    subscribersGained: formatCount(row.subscribersGained),
    likes: formatCount(row.likes),
    comments: formatCount(row.comments),
    impressions: formatCount(row.impressions),
    impressionClickThroughRate: formatCount(row.impressionClickThroughRate),
  };
}

async function fetchChannelMetricsForRange(accessToken, startDate, endDate, metrics) {
  const params = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics,
  });
  const data = await queryYoutubeAnalytics(accessToken, params);
  const row = parseAnalyticsRows(data)[0] || {};
  return mapChannelMetricsRow(row);
}

function pctChange(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
}

export async function fetchChannelPeriodComparison(workspaceDir, { days = 7 } = {}) {
  const scopeStatus = await getYoutubeTokenScopes(workspaceDir);
  if (!scopeStatus.connected || !scopeStatus.ready) {
    return { available: false, connected: scopeStatus.connected, scopesReady: scopeStatus.ready };
  }

  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const metrics = "views,estimatedMinutesWatched,subscribersGained,likes,comments";
  const currentRange = periodRange(days, 0);
  const previousRange = periodRange(days, days);

  const [current, previous] = await Promise.all([
    fetchChannelMetricsForRange(accessToken, currentRange.startDate, currentRange.endDate, metrics),
    fetchChannelMetricsForRange(accessToken, previousRange.startDate, previousRange.endDate, metrics),
  ]);

  const fields = ["views", "estimatedMinutesWatched", "subscribersGained", "likes", "comments"];
  const comparison = Object.fromEntries(
    fields.map((key) => [key, {
      current: current[key],
      previous: previous[key],
      changePct: pctChange(current[key], previous[key]),
    }]),
  );

  return {
    available: true,
    periodDays: days,
    currentRange,
    previousRange,
    comparison,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchChannelReachMetrics(workspaceDir, { days = 28 } = {}) {
  const scopeStatus = await getYoutubeTokenScopes(workspaceDir);
  if (!scopeStatus.connected || !scopeStatus.ready) {
    return { available: false, connected: scopeStatus.connected, scopesReady: scopeStatus.ready };
  }

  await assertTitleTestScopes(workspaceDir);
  const accessToken = await getYoutubeAccessToken(workspaceDir);
  const { startDate, endDate } = periodRange(days, 0);

  try {
    const metrics = await fetchChannelMetricsForRange(
      accessToken,
      startDate,
      endDate,
      "views,impressions,impressionClickThroughRate",
    );
    return {
      available: true,
      periodDays: days,
      startDate,
      endDate,
      metrics,
      note: metrics.impressions > 0
        ? "Impressões e CTR agregados do canal no período."
        : "Sem dados de impressões no período — métrica pode demorar a aparecer na API.",
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      available: false,
      periodDays: days,
      startDate,
      endDate,
      error: err.message,
      note: "Impressões/CTR indisponíveis nesta conta ou período. Use o YouTube Studio para detalhe por vídeo.",
      fetchedAt: new Date().toISOString(),
    };
  }
}

export async function suggestCommentReply({
  commentText,
  videoTitle = "",
  niche = "",
  authorName = "",
}, callGemini) {
  const prompt = `Você responde comentários de um canal YouTube em português do Brasil.
Nicho do canal: ${niche || "conteúdo em geral"}
Vídeo: ${videoTitle || "sem título"}
Autor do comentário: ${authorName || "espectador"}
Comentário: ${commentText}

Escreva UMA resposta curta (1-3 frases), autêntica, sem tom de IA, sem hashtags, sem pedir like/inscrição de forma agressiva.
Retorne só o texto da resposta, sem aspas nem prefixos.`;

  const text = await callGemini(prompt, { temperature: 0.7, maxRetries: 2 });
  return { suggestion: String(text || "").trim().slice(0, 10000) };
}

function formatWeeklyReportText(report) {
  const lines = [
    `Relatório semanal — ${report.channelTitle || "Canal YouTube"}`,
    `Período: ${report.periodLabel}`,
    "",
    `Inscritos: ${report.subscribers}`,
    `Views totais do canal: ${report.totalViews}`,
    `Views últimos 7d: ${report.views7d} (${report.views7dChange >= 0 ? "+" : ""}${report.views7dChange}% vs semana anterior)`,
    `Comentários sem resposta: ${report.unansweredComments}`,
    `Vídeos Lumiera em destaque (48h): ${report.hotVideos.length}`,
    "",
    "Top vídeos (7 dias):",
    ...report.topVideos.map((v, i) => `${i + 1}. ${v.title} — ${v.views} views`),
    "",
    report.hotVideos.length
      ? `Quentes: ${report.hotVideos.map((v) => `${v.projectName} (${v.views48h} views/48h)`).join(", ")}`
      : "Nenhum vídeo Lumiera acima do threshold esta semana.",
    "",
    `Gerado em ${report.generatedAt}`,
  ];
  return lines.join("\n");
}

export async function generateWeeklyReport(workspaceDir, projectsRoot, {
  views48hThreshold = 100,
} = {}) {
  const [overview, period, videos, alerts] = await Promise.all([
    fetchChannelOverview(workspaceDir),
    fetchChannelPeriodComparison(workspaceDir, { days: 7 }),
    fetchChannelVideosWithAnalytics(workspaceDir, { days: 7, limit: 10 }),
    fetchChannelAlerts(workspaceDir, projectsRoot, { views48hThreshold }),
  ]);

  const channel = overview?.channel || {};
  const report = {
    channelTitle: channel.title || "",
    periodLabel: `${period.currentRange?.startDate || ""} — ${period.currentRange?.endDate || ""}`,
    subscribers: channel.subscriberCount ?? 0,
    totalViews: channel.viewCount ?? 0,
    views7d: period.comparison?.views?.current ?? 0,
    views7dChange: period.comparison?.views?.changePct ?? 0,
    minutes7d: period.comparison?.estimatedMinutesWatched?.current ?? 0,
    unansweredComments: alerts.unansweredComments ?? 0,
    hotVideos: alerts.hotVideos || [],
    topVideos: (videos.videos || []).slice(0, 5).map((v) => ({
      title: v.title,
      videoId: v.videoId,
      views: v.metrics?.views ?? 0,
    })),
    generatedAt: new Date().toISOString(),
  };

  const text = formatWeeklyReportText(report);
  const reportsDir = path.join(workspaceDir, "youtube_weekly_reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const fileName = `report_${new Date().toISOString().slice(0, 10)}.txt`;
  const filePath = path.join(reportsDir, fileName);
  fs.writeFileSync(filePath, text, "utf8");
  fs.writeFileSync(path.join(workspaceDir, "youtube_weekly_report_latest.txt"), text, "utf8");

  saveStudioSettings(workspaceDir, {
    lastWeeklyReportAt: report.generatedAt,
    lastWeeklyReportPath: filePath,
  });

  return { ...report, text, filePath, fileName };
}

async function sendEmailViaPowerShell({ to, from, smtpHost, smtpPort, subject, body, username, password }) {
  const scriptPath = path.join(process.cwd(), `.lumiera_smtp_${Date.now()}.ps1`);
  const script = [
    "$sec = ConvertTo-SecureString -String $env:LUMIERA_SMTP_PASS -AsPlainText -Force",
    "$cred = New-Object System.Management.Automation.PSCredential($env:LUMIERA_SMTP_USER, $sec)",
    "Send-MailMessage -To $env:LUMIERA_SMTP_TO -From $env:LUMIERA_SMTP_FROM -Subject $env:LUMIERA_SMTP_SUBJECT -Body $env:LUMIERA_SMTP_BODY -SmtpServer $env:LUMIERA_SMTP_HOST -Port $env:LUMIERA_SMTP_PORT -UseSsl -Credential $cred",
  ].join("\n");
  fs.writeFileSync(scriptPath, script, "utf8");
  try {
    await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, {
      timeout: 30000,
      env: {
        ...process.env,
        LUMIERA_SMTP_TO: to,
        LUMIERA_SMTP_FROM: from,
        LUMIERA_SMTP_SUBJECT: subject,
        LUMIERA_SMTP_BODY: body,
        LUMIERA_SMTP_HOST: smtpHost,
        LUMIERA_SMTP_PORT: String(smtpPort || 587),
        LUMIERA_SMTP_USER: username,
        LUMIERA_SMTP_PASS: password,
      },
    });
  } finally {
    try { fs.unlinkSync(scriptPath); } catch { /* ignore */ }
  }
}

export async function sendWeeklyReportEmail(workspaceDir, projectsRoot, options = {}) {
  const settings = loadStudioSettings(workspaceDir);
  const to = String(options.to || settings.weeklyReportEmail || "").trim();
  const report = await generateWeeklyReport(workspaceDir, projectsRoot, options);

  if (!to) {
    return { sent: false, reason: "no_email", report };
  }

  const smtp = settings.smtp || {};
  if (!smtp.host || !smtp.user || !smtp.pass) {
    return {
      sent: false,
      reason: "no_smtp",
      report,
      note: "Configure smtp em youtube_studio_settings.json (host, user, pass, from) para envio automático.",
    };
  }

  try {
    await sendEmailViaPowerShell({
      to,
      from: smtp.from || smtp.user,
      smtpHost: smtp.host,
      smtpPort: smtp.port || 587,
      subject: `Lumiera — Relatório YouTube ${new Date().toLocaleDateString("pt-BR")}`,
      body: report.text,
      username: smtp.user,
      password: smtp.pass,
    });
    return { sent: true, to, report };
  } catch (err) {
    return { sent: false, reason: "send_failed", error: err.message, report };
  }
}

export async function fetchProjectYoutubeSnapshot(workspaceDir, projectsRoot, projectName, {
  views48hThreshold = 100,
} = {}) {
  const projects = collectLumieraPublishedVideos(projectsRoot);
  const entry = projects.find((p) => p.projectName === projectName);
  if (!entry?.videoId) {
    return { available: false, reason: "no_video_id", projectName };
  }

  const scopeStatus = await getYoutubeTokenScopes(workspaceDir);
  if (!scopeStatus.connected || !scopeStatus.ready) {
    return {
      available: false,
      connected: scopeStatus.connected,
      scopesReady: scopeStatus.ready,
      projectName,
      videoId: entry.videoId,
    };
  }

  let views48h = 0;
  let velocityError = null;
  try {
    const velocity = await fetchVideoVelocity(workspaceDir, entry.videoId);
    views48h = velocity.views48h ?? 0;
  } catch (err) {
    velocityError = err.message;
  }

  return {
    available: true,
    projectName: entry.projectName,
    videoId: entry.videoId,
    title: entry.title,
    niche: entry.niche,
    format: entry.format,
    views48h,
    isHot: views48h >= views48hThreshold,
    velocityError,
    studioUrl: `https://studio.youtube.com/video/${entry.videoId}/analytics`,
    watchUrl: `https://www.youtube.com/watch?v=${entry.videoId}`,
    fetchedAt: new Date().toISOString(),
  };
}

const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;

export function startYoutubeWeeklyReportScheduler({ workspaceDir, projectsRoot }) {
  const tick = async () => {
    try {
      const settings = loadStudioSettings(workspaceDir);
      const last = settings.lastWeeklyReportAt ? new Date(settings.lastWeeklyReportAt).getTime() : 0;
      if (Date.now() - last < WEEKLY_MS) return;
      const report = await generateWeeklyReport(workspaceDir, projectsRoot);
      console.log(`[YouTube] Relatório semanal gerado: ${report.fileName}`);
      if (settings.weeklyReportEmail && settings.smtp?.host) {
        const sent = await sendWeeklyReportEmail(workspaceDir, projectsRoot);
        if (sent.sent) console.log(`[YouTube] Relatório enviado para ${sent.to}`);
      }
    } catch (err) {
      console.warn("[YouTube] Falha no relatório semanal:", err.message);
    }
  };

  setTimeout(tick, 60_000);
  setInterval(tick, 12 * 60 * 60 * 1000);
}