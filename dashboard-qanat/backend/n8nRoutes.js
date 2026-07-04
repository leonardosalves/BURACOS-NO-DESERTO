/**
 * Rotas API — integração n8n (mapa Lumiera, sync, webhooks).
 */

import fs from "fs";
import path from "path";
import {
  buildN8nWorkflowJson,
  executeInboundAction,
  getLumieraOperationMap,
  getN8nDashboard,
  loadN8nState,
  patchN8nNode,
  probeN8n,
  pullMapFromN8n,
  pushMapToN8n,
  updateN8nConfig,
} from "./lumieraN8nBridge.js";

export function registerN8nRoutes(app, deps) {
  const { WORKSPACE_DIR } = deps;

  const templatePath = path.join(WORKSPACE_DIR, "integrations", "n8n", "workflows", "lumiera-pipeline-map.json");

  app.get("/api/n8n/status", async (_req, res) => {
    try {
      const state = loadN8nState(WORKSPACE_DIR);
      const probe = await probeN8n(state.config.n8nBaseUrl, state.config.n8nApiKey);
      res.json({
        ...getN8nDashboard(WORKSPACE_DIR),
        n8n: probe,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/n8n/map", (_req, res) => {
    try {
      res.json(getLumieraOperationMap(WORKSPACE_DIR));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/n8n/events", (_req, res) => {
    try {
      const state = loadN8nState(WORKSPACE_DIR);
      res.json({ events: state.events || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/n8n/workflow-template", (_req, res) => {
    try {
      if (fs.existsSync(templatePath)) {
        const raw = JSON.parse(fs.readFileSync(templatePath, "utf8"));
        return res.json({ source: "file", workflow: raw });
      }
      res.json({ source: "generated", workflow: buildN8nWorkflowJson(WORKSPACE_DIR) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/n8n/config", (req, res) => {
    try {
      const config = updateN8nConfig(WORKSPACE_DIR, req.body || {});
      res.json({ ok: true, config, dashboard: getN8nDashboard(WORKSPACE_DIR) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/n8n/nodes/:id", (req, res) => {
    try {
      const node = patchN8nNode(WORKSPACE_DIR, req.params.id, req.body || {});
      res.json({ ok: true, node, map: getLumieraOperationMap(WORKSPACE_DIR) });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/n8n/sync/push", async (_req, res) => {
    try {
      const result = await pushMapToN8n(WORKSPACE_DIR);
      if (!result.ok) return res.status(400).json(result);
      res.json({ ...result, dashboard: getN8nDashboard(WORKSPACE_DIR) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/n8n/sync/pull", async (_req, res) => {
    try {
      const result = await pullMapFromN8n(WORKSPACE_DIR);
      if (!result.ok) return res.status(400).json(result);
      res.json({ ...result, dashboard: getN8nDashboard(WORKSPACE_DIR) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/n8n/probe", async (req, res) => {
    try {
      const state = loadN8nState(WORKSPACE_DIR);
      const baseUrl = req.body?.n8nBaseUrl || state.config.n8nBaseUrl;
      const apiKey = req.body?.n8nApiKey || state.config.n8nApiKey;
      const probe = await probeN8n(baseUrl, apiKey);
      res.json(probe);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Webhook inbound — n8n chama para executar etapas do Lumiera. */
  app.post("/api/n8n/inbound", async (req, res) => {
    try {
      const state = loadN8nState(WORKSPACE_DIR);
      const secret = state.config.webhookSecret;
      if (secret) {
        const incoming = req.headers["x-lumiera-webhook-secret"] || req.body?.secret;
        if (incoming !== secret) {
          return res.status(401).json({ error: "Webhook secret inválido." });
        }
      }
      const result = await executeInboundAction(WORKSPACE_DIR, req.body || {}, deps);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message, needsReauth: err.needsReauth });
    }
  });
}