/**
 * Mapa estrutural compacto do Lumiera — reduz exploração por grep (padrão codebase-memory-mcp).
 * Atualize ao adicionar rotas críticas. API: GET /api/studio-agents/code-map
 */

export const LUMIERA_CODE_MAP = {
  version: 1,
  updated: "2026-07-01",
  stack: {
    backend: "dashboard-qanat/backend/server.js (Express :3005)",
    frontend: "dashboard-qanat/frontend/src/App.tsx (Vite :5176)",
    render: "dashboard-qanat/remotion-renderer/src/LumieraTimeline.tsx",
    agents: ".agents/ (skills, memory, bundles)",
  },
  entryPoints: [
    { path: "dashboard-qanat/backend/server.js", role: "Monólito API — Creator, render, Studio Agents, YouTube" },
    { path: "dashboard-qanat/frontend/src/App.tsx", role: "UI principal — tabs Creator, Timeline, Workflow, Studio" },
    { path: "dashboard-qanat/backend/skillsRegistry.js", role: "Bundles Hermes + injectStudioAgentsContext" },
    { path: "dashboard-qanat/backend/agentMemory.js", role: "Memória procedural — capture/promote learnings" },
    { path: "dashboard-qanat/backend/videoAgentPlanner.js", role: "VideoAgent → intents Lumiera" },
  ],
  apiGroups: [
    {
      prefix: "/api/studio-agents",
      files: ["server.js"],
      routes: [
        "GET status", "GET skills", "GET skills/:slug?ref=", "GET learnings",
        "POST plan-overlays", "POST capture", "GET code-map",
      ],
    },
    {
      prefix: "/api/ai/creator",
      files: ["server.js"],
      routes: ["POST script (phase: narration|full)", "POST ideas"],
    },
    {
      prefix: "/api/workflow",
      files: ["workflowRoutes.js"],
      routes: ["POST clip-factory", "POST analyze-reference", "GET capability-menu"],
    },
    {
      prefix: "/api/projects",
      files: ["server.js"],
      routes: ["GET storyboard", "PUT wizard-session", "GET config"],
    },
    {
      prefix: "/api/youtube/channel",
      files: ["server.js"],
      routes: ["GET editorial-queue", "PATCH editorial-queue/:id"],
    },
  ],
  promptInjection: [
    { fn: "injectStudioAgentsContext", file: "skillsRegistry.js", tasks: ["ideas", "script", "metadata", "overlay"] },
    { fn: "buildLearningsPromptAddendum", file: "agentMemory.js", cap: "12 learnings" },
    { fn: "buildSkillsPromptAddendum", file: "skillsRegistry.js", cap: "1200 chars/skill" },
    { fn: "compressTranscriptForPrompt", file: "lumieraContextCompress.js", note: "metadados/SEO" },
  ],
  tokenTips: [
    "Prefira GET /api/studio-agents/code-map antes de varrer server.js inteiro.",
    "Instale codebase-memory-mcp para trace_path/search_graph (ver scripts/setup-context-mcp.ps1).",
    "Roteiro completo fica no disco; prompts usam compressTranscriptForPrompt.",
    "Skills L2: GET /api/studio-agents/skills/:slug?ref= — não carregar REFERENCES no prompt.",
  ],
};

export function getCompactCodeMapText() {
  const m = LUMIERA_CODE_MAP;
  const lines = [
    `# Lumiera code map v${m.version}`,
    "",
    "## Stack",
    ...Object.entries(m.stack).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## APIs",
    ...m.apiGroups.map((g) => `- ${g.prefix} → ${g.routes.join(", ")}`),
    "",
    "## Prompt injection",
    ...m.promptInjection.map((p) => `- ${p.fn} (${p.file})${p.tasks ? ` [${p.tasks.join(", ")}]` : ""}`),
    "",
    "## Dicas",
    ...m.tokenTips.map((t) => `- ${t}`),
  ];
  return lines.join("\n");
}