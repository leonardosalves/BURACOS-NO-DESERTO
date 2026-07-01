/**
 * Rotas Agent Reach — busca na internet sem terminal.
 */

import {
  AGENT_REACH_PLATFORMS,
  probeAgentReachStatus,
  runAgentReachSearch,
  fetchAgentReachResearchForTopic,
} from "./agentReachService.js";
import { enqueueEditorialIdeas } from "./youtubeEditorialQueue.js";

export function registerAgentReachRoutes(app, deps) {
  const { WORKSPACE_DIR } = deps;

  app.get("/api/agent-reach/status", async (_req, res) => {
    try {
      const status = await probeAgentReachStatus();
      res.json({ ...status, platformsCatalog: AGENT_REACH_PLATFORMS });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/agent-reach/platforms", (_req, res) => {
    res.json({ ok: true, platforms: AGENT_REACH_PLATFORMS });
  });

  app.post("/api/agent-reach/search", async (req, res) => {
    try {
      const platform = String(req.body?.platform || "exa").toLowerCase();
      const query = String(req.body?.query || req.body?.q || "").trim();
      const url = String(req.body?.url || "").trim();
      const numResults = Number(req.body?.numResults) || 6;

      if (!query && !url) {
        return res.status(400).json({ ok: false, error: "Informe query ou url." });
      }

      const result = await runAgentReachSearch({
        platform,
        query,
        url,
        workspaceDir: WORKSPACE_DIR,
        numResults,
      });

      if (!result.available) {
        return res.status(400).json({ ok: false, ...result });
      }

      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Falha na busca", details: err.message });
    }
  });

  app.post("/api/agent-reach/research", async (req, res) => {
    try {
      const topic = String(req.body?.topic || req.body?.query || "").trim();
      if (!topic) return res.status(400).json({ ok: false, error: "Informe o tema (topic)." });

      const niche = String(req.body?.niche || "Geral").trim();
      const formatRaw = String(req.body?.format || "SHORTS").toUpperCase();
      const format = formatRaw === "LONG" || formatRaw === "LONGO" ? "LONGO" : "SHORTS";

      const research = await fetchAgentReachResearchForTopic({
        topic,
        niche,
        workspaceDir: WORKSPACE_DIR,
        numResults: Number(req.body?.numResults) || 6,
      });

      if (!research.available) {
        return res.status(400).json({ ok: false, ...research });
      }

      let editorialQueue = null;
      if (req.body?.enqueueIdeas === true) {
        const ideas = [{
          title: `Pesquisar: ${topic.slice(0, 80)}`,
          hookPt: research.summary.slice(0, 280),
          whyWorks: `Fontes Agent Reach: ${(research.sources || []).length}`,
        }];
        const enqueued = enqueueEditorialIdeas(WORKSPACE_DIR, ideas, {
          source: "agent-reach",
          format: format === "LONGO" ? "LONG" : "SHORT",
        });
        editorialQueue = { enqueued: 1, total: enqueued.items.length };
      }

      res.json({
        ok: true,
        topic,
        niche,
        format,
        research,
        editorialQueue,
        fetchedAt: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Falha na pesquisa", details: err.message });
    }
  });
}