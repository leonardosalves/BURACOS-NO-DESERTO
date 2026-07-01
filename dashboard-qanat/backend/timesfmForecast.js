/**
 * Previsão de tendências YouTube via TimesFM (Google Research) + fallback estatístico.
 * https://github.com/google-research/timesfm
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { buildPythonSpawnEnv } from "./pythonEnv.js";
import { fetchChannelVideosWithAnalytics } from "./youtubeChannelAnalytics.js";
import { fetchVideoVelocityTimeline } from "./youtubeStudioAdvanced.js";
import { enqueueEditorialIdeas } from "./youtubeEditorialQueue.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORECAST_SCRIPT = path.join(__dirname, "timesfm_forecast.py");
const TIMESFM_VENV_PYTHON = path.join(__dirname, ".venv-timesfm", "Scripts", "python.exe");
const COMPETITOR_MEMORY = ".agents/memory/competitor-intelligence.md";

const PT_STOPWORDS = new Set([
  "para", "como", "mais", "sobre", "esse", "essa", "este", "esta", "você", "voce",
  "quando", "onde", "porque", "porquê", "entre", "depois", "antes", "ainda", "muito",
  "todo", "toda", "todos", "todas", "pelo", "pela", "pelos", "pelas", "numa", "num",
  "the", "and", "with", "from", "that", "this", "your", "what", "why", "how",
]);

function readJsonSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) || {};
  } catch {
    return {};
  }
}

function resolveTimesfmPython(pythonPath) {
  const candidates = [
    process.env.TIMESFM_PYTHON_PATH,
    TIMESFM_VENV_PYTHON,
    pythonPath,
    process.env.PYTHON_PATH,
  ].filter(Boolean);
  for (const cand of candidates) {
    if (fs.existsSync(cand)) return cand;
  }
  return pythonPath || (process.platform === "win32" ? "python.exe" : "python3");
}

function quoteSpawnArg(value) {
  const text = String(value);
  if (!/[\s"]/g.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function parseJsonLine(stdout) {
  const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].startsWith("{")) continue;
    try {
      return JSON.parse(lines[i]);
    } catch {
      // continue
    }
  }
  return null;
}

export async function probeTimesfmStatus({ pythonPath } = {}) {
  const python = resolveTimesfmPython(pythonPath);
  const venvReady = fs.existsSync(TIMESFM_VENV_PYTHON);
  const scriptReady = fs.existsSync(FORECAST_SCRIPT);

  let timesfmInstalled = false;
  let torchInstalled = false;
  let probeError = null;

  if (scriptReady && python) {
    try {
      const check = await new Promise((resolve) => {
        const args = ["-c", "import timesfm, torch; print('ok')"];
        const spawnArgs = process.platform === "win32"
          ? [[quoteSpawnArg(python), ...args.map(quoteSpawnArg)].join(" "), { shell: true, windowsHide: true, env: buildPythonSpawnEnv() }]
          : [python, args, { shell: false, env: buildPythonSpawnEnv() }];
        const child = spawn(...spawnArgs);
        let out = "";
        child.stdout.on("data", (d) => { out += d.toString(); });
        child.on("close", (code) => resolve({ code, out }));
        child.on("error", (err) => resolve({ code: 1, out: err.message }));
      });
      timesfmInstalled = check.code === 0 && check.out.includes("ok");
      torchInstalled = timesfmInstalled;
      if (!timesfmInstalled) probeError = check.out.trim() || "timesfm não instalado";
    } catch (err) {
      probeError = err.message;
    }
  }

  return {
    ok: true,
    scriptReady,
    venvReady,
    python,
    timesfmInstalled,
    torchInstalled,
    fallbackAvailable: true,
    setupScript: "scripts/setup-timesfm.ps1",
    repo: "https://github.com/google-research/timesfm",
    probeError,
    fetchedAt: new Date().toISOString(),
  };
}

function runTimesfmForecast({ series, horizon, pythonPath, maxContext = 512 }) {
  return new Promise((resolve, reject) => {
    const python = resolveTimesfmPython(pythonPath);
    const args = [FORECAST_SCRIPT];
    const spawnArgs = process.platform === "win32"
      ? [[quoteSpawnArg(python), ...args.map(quoteSpawnArg)].join(" "), { cwd: __dirname, shell: true, env: buildPythonSpawnEnv() }]
      : [python, args, { cwd: __dirname, shell: false, env: buildPythonSpawnEnv() }];
    const child = spawn(...spawnArgs);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", reject);
    child.stdin.write(JSON.stringify({ series, horizon, maxContext }));
    child.stdin.end();
    child.on("close", (code) => {
      const parsed = parseJsonLine(stdout);
      if (!parsed?.ok) {
        reject(new Error(parsed?.error || stderr.trim() || stdout.trim() || `TimesFM falhou (exit ${code})`));
        return;
      }
      resolve(parsed);
    });
  });
}

function tokenizeTitle(title = "") {
  return String(title)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !PT_STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function extractNicheSeeds(workspaceDir, configNiche = "") {
  const seeds = new Set();
  const niche = String(configNiche || "").trim();
  if (niche) {
    tokenizeTitle(niche).forEach((w) => seeds.add(w));
    seeds.add(niche.toLowerCase().slice(0, 40));
  }
  const memPath = path.join(workspaceDir, COMPETITOR_MEMORY);
  if (fs.existsSync(memPath)) {
    const text = fs.readFileSync(memPath, "utf8");
    const matches = text.match(/\*\*([^*]{3,40})\*\*/g) || [];
    matches.slice(0, 12).forEach((m) => {
      const clean = m.replace(/\*\*/g, "").trim().toLowerCase();
      if (clean) seeds.add(clean);
    });
  }
  return [...seeds].slice(0, 16);
}

function buildNicheBuckets(videos, seeds = []) {
  const buckets = new Map();
  for (const seed of seeds) {
    buckets.set(seed, { id: `niche:${seed}`, label: seed, videos: [] });
  }

  for (const video of videos) {
    const tokens = new Set(tokenizeTitle(video.title));
    for (const seed of seeds) {
      const seedTokens = seed.split(/\s+/).filter((t) => t.length >= 3);
      const hit = seedTokens.length
        ? seedTokens.some((t) => tokens.has(t) || String(video.title || "").toLowerCase().includes(t))
        : String(video.title || "").toLowerCase().includes(seed);
      if (hit) buckets.get(seed)?.videos.push(video);
    }
  }

  // Auto-discover top title tokens when seeds are sparse
  const freq = new Map();
  for (const video of videos) {
    for (const tok of tokenizeTitle(video.title)) {
      freq.set(tok, (freq.get(tok) || 0) + 1);
    }
  }
  const auto = [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tok]) => tok);

  for (const tok of auto) {
    if (buckets.has(tok)) continue;
    buckets.set(tok, {
      id: `niche:${tok}`,
      label: tok,
      videos: videos.filter((v) => tokenizeTitle(v.title).includes(tok)),
    });
  }

  return [...buckets.values()].filter((b) => b.videos.length > 0);
}

function aggregateDailySeries(timelines) {
  const byDate = new Map();
  for (const tl of timelines) {
    for (const p of tl.points || []) {
      byDate.set(p.date, (byDate.get(p.date) || 0) + Number(p.views || 0));
    }
  }
  const dates = [...byDate.keys()].sort();
  return dates.map((date) => ({ date, views: byDate.get(date) || 0 }));
}

function pointsToValues(points) {
  return (points || []).map((p) => Number(p.views || p.value || 0));
}

function buildVideoIdeaFromForecast(video, forecastRow, index) {
  const title = String(video.title || "").trim();
  const growth = Number(forecastRow?.growthPct || 0);
  const fmt = String(video.videoFormat || "LONG").toUpperCase() === "SHORT" ? "SHORTS" : "LONGO";
  const hook = growth > 25
    ? `Tendência em alta (+${growth.toFixed(0)}% previsto) — variação do formato que já performa no canal.`
    : `Continuidade com mecânica vencedora — views previstas estáveis nos próximos dias.`;
  return {
    title: `Variação #${index + 1}: ${title.slice(0, 72)}`,
    hookPt: hook,
    mechanic: "timesfm-velocity",
    whyWorks: `Previsão TimesFM: crescimento ${growth.toFixed(1)}% no horizonte; ${video.metrics?.views || 0} views no período.`,
    format: fmt,
    sourceVideoId: video.videoId,
    growthPct: growth,
  };
}

function buildNicheIdea(niche, forecastRow, format = "SHORTS") {
  const label = String(niche.label || niche.id || "nicho").trim();
  const growth = Number(forecastRow?.growthPct || 0);
  return {
    title: `Explorar nicho em alta: ${label}`,
    hookPt: growth > 20
      ? `O cluster "${label}" deve crescer ~${growth.toFixed(0)}% — ângulo novo antes da saturação.`
      : `Nicho "${label}" com tração estável — teste de formato ${format === "LONGO" ? "longo" : "Short"}.`,
    mechanic: "timesfm-niche",
    whyWorks: `Série agregada do canal + concorrentes; previsão ${growth.toFixed(1)}%.`,
    format,
    growthPct: growth,
  };
}

export async function runTrendForecast(workspaceDir, {
  projectsRoot = null,
  pythonPath = null,
  horizon = 7,
  historyDays = 14,
  maxVideos = 12,
  format = "all",
  enqueueIdeas = false,
  niche = "",
} = {}) {
  const cfg = readJsonSafe(path.join(workspaceDir, "config_qanat.json"));
  const resolvedNiche = String(niche || cfg.niche || "").trim();

  const report = await fetchChannelVideosWithAnalytics(workspaceDir, {
    days: 28,
    limit: 50,
    forceRefresh: false,
    projectsRoot,
  });

  let videos = report.videos || [];
  const fmtFilter = String(format || "all").toUpperCase();
  if (fmtFilter === "SHORT" || fmtFilter === "SHORTS") {
    videos = videos.filter((v) => String(v.videoFormat || "").toUpperCase() === "SHORT");
  } else if (fmtFilter === "LONG" || fmtFilter === "LONGO") {
    videos = videos.filter((v) => String(v.videoFormat || "").toUpperCase() === "LONG");
  }

  const topVideos = [...videos]
    .sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0))
    .slice(0, Math.min(Math.max(Number(maxVideos) || 12, 4), 20));

  const timelines = await Promise.all(
    topVideos.map(async (v) => {
      try {
        const tl = await fetchVideoVelocityTimeline(workspaceDir, v.videoId, { days: historyDays });
        return { video: v, timeline: tl };
      } catch {
        return { video: v, timeline: { points: [], totalViews: v.metrics?.views || 0 } };
      }
    }),
  );

  const seeds = extractNicheSeeds(workspaceDir, resolvedNiche);
  const nicheBuckets = buildNicheBuckets(videos, seeds);

  const series = [];
  for (const { video, timeline } of timelines) {
    const values = pointsToValues(timeline.points);
    if (values.length < 3) {
      const total = Number(video.metrics?.views || timeline.totalViews || 0);
      const daily = total > 0 ? total / Math.max(historyDays, 7) : 0;
      for (let i = 0; i < Math.min(historyDays, 10); i += 1) values.push(daily);
    }
    series.push({
      id: `video:${video.videoId}`,
      label: video.title,
      kind: "video",
      format: video.videoFormat,
      videoId: video.videoId,
      thumbnailUrl: video.thumbnailUrl,
      values,
    });
  }

  for (const bucket of nicheBuckets.slice(0, 10)) {
    const bucketTimelines = timelines
      .filter(({ video }) => bucket.videos.some((bv) => bv.videoId === video.videoId))
      .map(({ timeline }) => timeline);
    const agg = aggregateDailySeries(bucketTimelines);
    const values = pointsToValues(agg);
    if (values.length < 3) continue;
    series.push({
      id: bucket.id,
      label: bucket.label,
      kind: "niche",
      videoCount: bucket.videos.length,
      values,
    });
  }

  if (!series.length) {
    return { ok: false, error: "Sem séries temporais suficientes. Conecte o YouTube e aguarde dados de Analytics." };
  }

  const forecastPayload = await runTimesfmForecast({
    series: series.map((s) => ({ id: s.id, label: s.label, values: s.values })),
    horizon: Math.min(Math.max(Number(horizon) || 7, 3), 14),
    pythonPath,
  });

  const byId = new Map((forecastPayload.results || []).map((r) => [r.id, r]));

  const risingVideos = timelines
    .map(({ video, timeline }) => {
      const row = byId.get(`video:${video.videoId}`);
      return {
        videoId: video.videoId,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        format: video.videoFormat,
        metrics: video.metrics,
        history: timeline.points || [],
        forecast: row?.forecast || [],
        growthPct: row?.growthPct ?? 0,
        forecastSum: row?.forecastSum ?? 0,
      };
    })
    .sort((a, b) => b.growthPct - a.growthPct);

  const risingNiches = nicheBuckets
    .map((bucket) => {
      const row = byId.get(bucket.id);
      return {
        niche: bucket.label,
        videoCount: bucket.videos.length,
        sampleTitles: bucket.videos.slice(0, 3).map((v) => v.title),
        growthPct: row?.growthPct ?? 0,
        forecast: row?.forecast || [],
        historySum7d: row?.historySum7d ?? 0,
      };
    })
    .sort((a, b) => b.growthPct - a.growthPct);

  const shortVideos = risingVideos.filter((v) => String(v.format).toUpperCase() === "SHORT");
  const longVideos = risingVideos.filter((v) => String(v.format).toUpperCase() !== "SHORT");

  const derivedIdeas = [
    ...risingVideos.slice(0, 4).map((v, i) => buildVideoIdeaFromForecast(
      { title: v.title, videoFormat: v.format, videoId: v.videoId, metrics: v.metrics },
      byId.get(`video:${v.videoId}`),
      i,
    )),
    ...risingNiches.slice(0, 3).map((n) => buildNicheIdea(
      { label: n.niche },
      byId.get(`niche:${n.niche}`) || { growthPct: n.growthPct },
      fmtFilter === "LONG" || fmtFilter === "LONGO" ? "LONGO" : "SHORTS",
    )),
  ];

  let editorialQueue = null;
  if (enqueueIdeas && derivedIdeas.length) {
    const enqueued = enqueueEditorialIdeas(workspaceDir, derivedIdeas, {
      source: "timesfm-forecast",
      format: fmtFilter === "LONG" || fmtFilter === "LONGO" ? "LONG" : "SHORT",
    });
    editorialQueue = { enqueued: derivedIdeas.length, total: enqueued.items.length };
  }

  return {
    ok: true,
    engine: forecastPayload.engine,
    horizon: forecastPayload.horizon,
    channelTitle: report.channelTitle,
    periodDays: report.periodDays,
    format: fmtFilter,
    risingNiches,
    risingVideos,
    shortTrends: shortVideos.slice(0, 8),
    longTrends: longVideos.slice(0, 8),
    derivedIdeas,
    editorialQueue,
    seeds,
    fetchedAt: new Date().toISOString(),
  };
}