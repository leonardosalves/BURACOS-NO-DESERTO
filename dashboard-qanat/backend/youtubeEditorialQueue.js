import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fetchChannelVideosWithAnalytics } from "./youtubeChannelAnalytics.js";

const QUEUE_FILE = "youtube_editorial_queue.json";
const STATUSES = ["inbox", "script", "render", "published"];

function queuePath(workspaceDir) {
  return path.join(workspaceDir, QUEUE_FILE);
}

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function loadEditorialQueue(workspaceDir) {
  const stored = readJsonSafe(queuePath(workspaceDir)) || {};
  const items = Array.isArray(stored.items) ? stored.items : [];
  return {
    items: items
      .filter((item) => item && item.title)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)),
    updatedAt: stored.updatedAt || null,
  };
}

export function saveEditorialQueue(workspaceDir, items) {
  const normalized = (items || []).slice(0, 80).map((item) => ({
    id: item.id || randomUUID(),
    title: String(item.title || "").trim().slice(0, 240),
    hookPt: String(item.hookPt || "").trim().slice(0, 500),
    source: String(item.source || "manual").trim(),
    sourceVideoId: item.sourceVideoId || null,
    sourceViews: item.sourceViews ?? null,
    mechanic: String(item.mechanic || "").trim().slice(0, 200),
    whyWorks: String(item.whyWorks || "").trim().slice(0, 400),
    format: item.format === "LONG" || item.format === "LONGO" ? "LONGO" : "SHORTS",
    status: STATUSES.includes(item.status) ? item.status : "inbox",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  const payload = { items: normalized, updatedAt: new Date().toISOString() };
  fs.writeFileSync(queuePath(workspaceDir), JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function titleKey(title) {
  return String(title || "").trim().toLowerCase().slice(0, 120);
}

export function enqueueEditorialIdeas(workspaceDir, ideas = [], meta = {}) {
  const { items } = loadEditorialQueue(workspaceDir);
  const seen = new Set(items.map((i) => titleKey(i.title)));
  const source = meta.source || "competitor-research";
  const format = meta.format === "LONG" ? "LONGO" : "SHORTS";

  for (const idea of ideas) {
    const title = String(idea.title || idea.titleIdea || "").trim();
    if (!title) continue;
    const key = titleKey(title);
    if (seen.has(key)) continue;
    seen.add(key);
    items.unshift({
      id: randomUUID(),
      title,
      hookPt: idea.hookPt || idea.angle || "",
      source,
      mechanic: idea.mechanicSource || idea.mechanic || "",
      whyWorks: idea.whyNotCopy || idea.whyWorks || "",
      format,
      status: "inbox",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return saveEditorialQueue(workspaceDir, items);
}

export function updateEditorialItemStatus(workspaceDir, id, status) {
  if (!STATUSES.includes(status)) {
    throw new Error(`Status inválido. Use: ${STATUSES.join(", ")}`);
  }
  const { items } = loadEditorialQueue(workspaceDir);
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) throw new Error("Item não encontrado na fila.");
  items[idx] = { ...items[idx], status, updatedAt: new Date().toISOString() };
  return saveEditorialQueue(workspaceDir, items);
}

export function removeEditorialItem(workspaceDir, id) {
  const { items } = loadEditorialQueue(workspaceDir);
  return saveEditorialQueue(workspaceDir, items.filter((i) => i.id !== id));
}

function detectMechanicFromTitle(title = "") {
  const t = title.toLowerCase();
  if (/\btop\s*\d+|\d+\s*(coisas|fatos|inven|segredos|máquinas|maquinas)/i.test(title)) return "listicle com número";
  if (/segredo|revela|ninguém|ninguem|escondid/i.test(t)) return "revelação / segredo";
  if (/vs\.?|versus|compar/i.test(t)) return "comparação";
  if (/como|por que|porquê/i.test(t)) return "explicação causal";
  return "curiosidade histórica";
}

function buildWinnerVariation(video, index, niche = "") {
  const title = String(video.title || "").trim();
  const views = Number(video.metrics?.views || 0);
  const mechanic = detectMechanicFromTitle(title);
  const hookBase = title.replace(/#\S+/g, "").trim();
  const templates = [
    `O segredo de [OBJETO ANTIGO] que ${niche ? `${niche} ` : ""}ignora`,
    `Top 3: [TEMA] que mudou a história (mesma mecânica de ranking)`,
    `3 fatos brutais sobre [TEMA] — estilo "${hookBase.slice(0, 32)}"`,
  ];
  const variation = templates[index % templates.length];
  return {
    sourceVideoId: video.videoId,
    sourceTitle: title,
    sourceViews: views,
    title: variation,
    hookPt: hookBase || title,
    mechanic,
    whyWorks: `${views.toLocaleString("pt-BR")} views em 7d — replicar mecânica "${mechanic}", trocar objeto/época`,
    pillar: "astonishing",
    format: video.videoFormat === "SHORT" ? "SHORTS" : "LONGO",
  };
}

export async function generateTopWinnerIdeas(workspaceDir, projectsRoot, {
  days = 7,
  limit = 3,
  niche = "",
  llmFn = null,
} = {}) {
  const report = await fetchChannelVideosWithAnalytics(workspaceDir, {
    days,
    limit: 25,
    forceRefresh: true,
    projectsRoot,
  });
  const winners = (report.videos || [])
    .filter((v) => (v.metrics?.views || 0) > 0)
    .slice(0, Math.min(Math.max(limit, 1), 5));

  if (!winners.length) {
    return { ok: false, error: "Nenhum vídeo com views no período.", ideas: [], winners: [] };
  }

  let ideas = winners.map((v, i) => buildWinnerVariation(v, i, niche));

  if (llmFn) {
    const prompt = `Você é estrategista YouTube PT-BR. Nicho: ${niche || "curiosidades históricas"}.

Estes vídeos performaram melhor nos últimos ${days} dias (NÃO copie título — replique MECÂNICA):
${winners.map((v, i) => `${i + 1}. "${v.title}" — ${v.metrics?.views || 0} views`).join("\n")}

Gere exatamente ${winners.length} ideias NOVAS no mesmo formato/mecânica, com novo objeto/época/ângulo.
JSON puro:
{"ideas":[{"title":"","hookPt":"","mechanic":"","whyWorks":"","format":"SHORTS"}]}`;

    try {
      const text = await llmFn(prompt);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.ideas) && parsed.ideas.length) {
          ideas = parsed.ideas.slice(0, winners.length).map((idea, i) => ({
            sourceVideoId: winners[i]?.videoId,
            sourceTitle: winners[i]?.title,
            sourceViews: winners[i]?.metrics?.views,
            title: idea.title || ideas[i].title,
            hookPt: idea.hookPt || ideas[i].hookPt,
            mechanic: idea.mechanic || ideas[i].mechanic,
            whyWorks: idea.whyWorks || ideas[i].whyWorks,
            format: idea.format === "LONG" || idea.format === "LONGO" ? "LONGO" : "SHORTS",
          }));
        }
      }
    } catch (err) {
      console.warn("[TopWinners] IA falhou, usando templates:", err.message);
    }
  }

  const queue = enqueueEditorialIdeas(workspaceDir, ideas, { source: "top-winners", format: "SHORT" });

  return {
    ok: true,
    days,
    winners: winners.map((v) => ({
      videoId: v.videoId,
      title: v.title,
      views: v.metrics?.views || 0,
      format: v.videoFormat,
    })),
    ideas,
    queueCount: queue.items.length,
  };
}