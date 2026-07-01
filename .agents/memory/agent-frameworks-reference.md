# Agent Frameworks Reference
> 🔗 [[MEMORIA-LUMIERA]] · [[skills/studio-agents-hermes]] · [[skills/skills-registry-external]]

Referência de frameworks multi-agente — **padrões aplicáveis ao Lumiera**, sem portar Python para o backend Node.

## Stack atual Lumiera

| Camada | Implementação |
|--------|---------------|
| Orquestração | [[skills/studio-agents-hermes]] — bundles, workshop, API `/api/studio-agents/skills` |
| Pesquisa profunda | `deerFlowResearch.js` + [[skills/deer-flow-research]] |
| VideoAgent | `videoAgentPlanner.js` — intents, tool routing |
| Provider | Gemini default (`aiProviderRouter.js`) |
| MCP | NotebookLM, Supermemory, Canva — ver [[skills/mcp-builder]] |
| Memória | Supermemory + `.agents/memory/` |

## OpenAI Agents Python
Fonte: [openai/openai-agents-python](https://github.com/openai/openai-agents-python)

**O que adotar (conceitos, não código Python):**
- **Handoffs** — agente A delega a B com contexto mínimo → espelhar em VideoAgent intents (`deep_research`, `script`, `metadata`)
- **Tools como contrato** — nome + schema + descrição acionável → padrão MCP e `skillsRegistry.js`
- **Guardrails** — validação pré/pós tool call → [[skills/openmontage-reviewer]] quality gates
- **Tracing** — `agent_runs.json` + logs em `.agents/agent_runs/`

**Não portar:** runtime Python; Lumiera já tem loop Node em `/api/ai/chat` e VideoAgent.

## Google ADK Python
Fonte: [google/adk-python](https://github.com/google/adk-python)

**O que adotar:**
- **Agent composition** — root agent + sub-agents especializados → bundles em `.agents/skill-bundles/`
- **Tool registry** — descoberta progressiva → Hermes `skills_list` / `skill_view`
- **Session/state** — `wizardSession.ts`, `storyboard.json`, fila editorial
- **Gemini-native** — Lumiera já usa Gemini; ADK informa padrões de `FunctionDeclaration` e multi-turn tool loops

**Não portar:** deploy ADK/GCP; backend permanece Express local.

## OpenAI Cookbook
Fonte: [openai/openai-cookbook](https://github.com/openai/openai-cookbook)

**Receitas úteis ao Lumiera (adaptar para Gemini/Node):**

| Receita cookbook | Aplicação Lumiera |
|------------------|-------------------|
| RAG / retrieval | Pesquisa Exa + NotebookLM + `deep-research-reports.md` |
| Evals / LLM-as-judge | [[skills/skill-creator]] evals; quality gates roteiro |
| Agent loops | VideoAgent execute, DeerFlow planner→researchers→reporter |
| Fine-tuning | Baixa prioridade — prompts + skills cobrem nicho |
| Structured outputs | JSON schema em `scriptQuality.js`, metadados upload |

**Workflow:** copiar padrão da receita → implementar em `dashboard-qanat/backend/` com provider atual.

## Anthropic Skills
Fonte: [anthropics/skills](https://github.com/anthropics/skills)

**Instaladas no Lumiera (2026-07-01):**

| Skill | Bundle | Uso |
|-------|--------|-----|
| [[skills/mcp-builder|mcp builder]] | dev-sdd | Novos MCPs |
| [[skills/webapp-testing|webapp testing]] | dev-ui | QA dashboard :5176 |
| [[skills/frontend-design|frontend design]] | dev-ui | Redesign dashmin |
| [[skills/skill-creator|skill creator]] | dev-sdd | Autoria skills |
| [[skills/doc-coauthoring|doc coauthoring]] | dev-sdd | Specs, roteiros longos |
| [[skills/pdf|pdf]] | — | Relatórios PDF |
| [[skills/claude-api|claude api]] | — | Referência se integrar Claude |

**Não instaladas (fora do core):** algorithmic-art, slack-gif-creator, canvas-design, brand-guidelines (Anthropic), theme-factory.

## Próximos passos sugeridos

1. Handoff explícito VideoAgent ↔ DeerFlow (padrão OpenAI Agents)
2. Eval automatizado de roteiro pós-geração (cookbook LLM-judge)
3. MCP ComfyUI para Clip Factory (usar [[skills/mcp-builder]])

## Links
- [[SKILLS]]
- [[skills/skills-registry-external]]
- [[memory/videoagent-lumiera]]
- [[memory/lumiera-code-map]]