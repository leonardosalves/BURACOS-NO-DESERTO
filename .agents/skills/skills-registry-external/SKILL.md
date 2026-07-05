> 🔗 [[MEMORIA-LUMIERA]] · [[SKILLS]]

---

name: skills-registry-external
description: |
Catálogo de skills externas úteis ao Lumiera — fontes, instalação e prioridade de adoção.
Consulte ao avaliar novas skills do awesome-agent-skills, skillsmp ou mcpmarket.
Triggers: instalar skill, awesome-agent-skills, skillsmp, skill externa, catálogo.
---

# Registro de Skills Externas (Lumiera)

Índice curado a partir de [heilcheng/awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills) e buscas `npx skills find`.

## Já integradas no Lumiera (`.agents/skills/`)

| Skill local             | Fonte upstream                                       | Uso no programa                                  |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| viral-short-form        | vyralcontent/content-skills + n8n Lucas Walter       | Creator, scriptQuality.js                        |
| viral-short-form-ideas  | vyralcontent/content-skills                          | Ideação Creator, ranking_ideas                   |
| viral-hooks             | vyralcontent/content-skills                          | Ganchos Creator / bloco 1                        |
| viral-captions-and-ctas | vyralcontent/content-skills                          | Legendas shorts-viral, CTAs, metadados           |
| viral-youtube-shorts    | vyralcontent/content-skills                          | Projetos SHORTS, metadados                       |
| youtube-thumbnail       | charlie947/social-media-skills                       | Canva, variantes de capa                         |
| youtube-seo             | kostja94/marketing-skills + youtubeMetadataOptimizer | IA·Metadados, upload                             |
| ugc-scriptwriter        | motion-creative/skills                               | Narração humanizada                              |
| hyperframes             | HeyGen→Lumiera catálogo                              | Overlays, render PRO                             |
| remotion_docs           | remotion-dev/remotion                                | Timeline Remotion                                |
| epidemic_sound          | REST/MCP                                             | Trilha BGM                                       |
| lumiera-ops             | interno                                              | commit + reiniciar servidores                    |
| studio-agents-hermes    | interno (padrões Hermes/OpenClaw)                    | Bundles, workshop, API skills                    |
| video-marketing         | kostja94/marketing-skills (via VoltAgent)            | Creator ideias/roteiro, estratégia short+long    |
| remotion-render         | inference-sh/skills (adaptado Lumiera)               | LumieraTimeline, render local PRO                |
| remotion-best-practices | remotion-dev/skills                                  | Bundle `long-documentary`, rules/ oficiais       |
| social-publisher        | claude-office-skills/skills                          | Bundle `publish-seo`, `upload_metadata`          |
| ai-ugc-ads              | chadboyda/agent-gtm-skills                           | Bundle `shorts-viral`, ads UGC Shorts            |
| ad-concept-generator    | motion-creative/skills                               | Bundle `shorts-viral`, conceito antes do roteiro |
| content-strategy        | coreyhaines31/marketingskills                        | Pilares, funil Short↔Long, Creator ideias        |
| deer-flow-research      | bytedance/deer-flow (adaptado)                       | Pesquisa profunda VideoAgent                     |
| agent-reach             | Panniantong/Agent-Reach                              | Busca web Exa + 15 plataformas                   |
| mcp-builder             | anthropics/skills                                    | Novos MCPs (Comfy, APIs)                         |
| webapp-testing          | anthropics/skills                                    | QA Playwright dashboard :5176                    |
| frontend-design         | anthropics/skills                                    | Redesign dashmin-ui                              |
| skill-creator           | anthropics/skills                                    | Autoria + evals `.agents/skills/`                |
| doc-coauthoring         | anthropics/skills                                    | Specs, roteiros longos, PRDs                     |
| pdf                     | anthropics/skills                                    | Relatórios PDF, OCR                              |
| claude-api              | anthropics/skills                                    | Referência Claude/Anthropic SDK                  |

## Matt Pocock engineering ([mattpocock/skills](https://github.com/mattpocock/skills))

Instalação: `npx skills add mattpocock/skills --yes` ou `.\scripts\setup-mattpocock-skills.ps1`

| Skill local                 | Uso Lumiera                                            | Bundle  |
| --------------------------- | ------------------------------------------------------ | ------- |
| grill-with-docs             | Antes de feature ambígua (complementa speckit-clarify) | dev-sdd |
| tdd                         | Backend `dashboard-qanat/backend/` test-first          | dev-sdd |
| diagnosing-bugs             | Debug Creator, Clip Factory, render                    | dev-sdd |
| code-review                 | Review diff vs spec/standards                          | dev-sdd |
| writing-great-skills        | Autoria `.agents/skills/`                              | dev-sdd |
| to-prd / to-issues / triage | Issues em `.scratch/`                                  | —       |
| setup-matt-pocock-skills    | Config `docs/agents/` (rodar uma vez)                  | —       |

**Não duplicar:** `speckit-lumiera` cobre specify/plan/tasks/implement — preferir speckit para features Lumiera.

Demais 30 skills (writing-beats, obsidian-vault, wizard, etc.) instaladas mas sem bundle — usar sob demanda.

## Hermes Agent + OpenClaw — padrões adotados

| Conceito upstream                      | Implementação Lumiera                                 |
| -------------------------------------- | ----------------------------------------------------- |
| Hermes `skills_list` / `skill_view`    | `skillsRegistry.js` + API `/api/studio-agents/skills` |
| Hermes skill bundles                   | `.agents/skill-bundles/*.json`                        |
| Hermes `skill_manage` + write_approval | `.agents/pending/skills/` + workshop UI               |
| OpenClaw `<workspace>/.agents/skills`  | `.agents/skills/` (já usado)                          |
| OpenClaw agent allowlists              | `skillAllowlist` em `studio_agents_config.json`       |
| OpenClaw gating `metadata.openclaw`    | `metadata.lumiera` + `formats` / `tasks`              |

Fontes: [Hermes skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills) · [OpenClaw skills](https://docs.openclaw.ai/tools/skills)

## MCP Market / SkillsMP — mapeamento

| Marketplace   | Slug                                                          | ≈ Pacote real                                  |
| ------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| mcpmarket.com | viral-short-form-video-master                                 | vyralcontent/content-skills (viral-short-form) |
| skills.sh     | vyralcontent/content-skills@*                                 | Mesma família Vyral (MIT)                      |
| skills.sh     | josiahsiegel/claude-plugin-marketplace@viral-video-short-form | Variante plugin Claude                         |

## Anthropic Skills ([anthropics/skills](https://github.com/anthropics/skills))

Instalação: `npx skills add anthropics/skills@<nome> --yes --copy`

| Skill                                             | Bundle  | Status                                |
| ------------------------------------------------- | ------- | ------------------------------------- |
| mcp-builder                                       | dev-sdd | **Instalada**                         |
| webapp-testing                                    | dev-ui  | **Instalada**                         |
| frontend-design                                   | dev-ui  | **Instalada**                         |
| skill-creator                                     | dev-sdd | **Instalada**                         |
| doc-coauthoring                                   | dev-sdd | **Instalada**                         |
| pdf                                               | —       | **Instalada**                         |
| claude-api                                        | —       | **Instalada** (só se integrar Claude) |
| docx / pptx / xlsx                                | —       | Grok bundled (não duplicar)           |
| algorithmic-art, canvas-design, slack-gif-creator | —       | Ignoradas (fora do core vídeo)        |

Ver [[memory/agent-frameworks-reference]] para mapeamento com OpenAI Agents, Google ADK e Cookbook.

## Frameworks multi-agente (referência, não port Python)

| Repo                                                                          | Padrões úteis ao Lumiera                           |
| ----------------------------------------------------------------------------- | -------------------------------------------------- |
| [openai/openai-agents-python](https://github.com/openai/openai-agents-python) | Handoffs, tools como contrato, guardrails, tracing |
| [google/adk-python](https://github.com/google/adk-python)                     | Composição de agentes, tool registry, sessão/state |
| [openai/openai-cookbook](https://github.com/openai/openai-cookbook)           | RAG, evals, agent loops, structured outputs        |

Lumiera já implementa equivalentes em Node: [[skills/studio-agents-hermes]], `deerFlowResearch.js`, `videoAgentPlanner.js`.

## Google Gemini SDK

| Repo                                                                                                | Status Lumiera                                                 |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [deprecated-generative-ai-python](https://github.com/google-gemini/deprecated-generative-ai-python) | ❌ Arquivado — não instalar                                    |
| [googleapis/js-genai](https://github.com/googleapis/js-genai)                                       | 📋 Referência — migrar `callGeminiWithRetry` → `@google/genai` |
| [googleapis/python-genai](https://github.com/googleapis/python-genai)                               | Scripts Python (TimesFM venv)                                  |

Ver [[memory/google-gemini-sdk-reference]].

## Google Research

Monorepo [google-research/google-research](https://github.com/google-research/google-research) — catálogo curado, não clonar inteiro.

| Projeto                                                         | Status                                                |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| TimesFM ([timesfm](https://github.com/google-research/timesfm)) | **Integrado** — `timesfmForecast.js`                  |
| better_storylines, assemblenet, videoprism, CIQA                | Candidatos — ver [[memory/google-research-reference]] |

## Candidatas futuras (avaliar antes de instalar)

| Repo@skill                      | Motivo                  | Prioridade                      |
| ------------------------------- | ----------------------- | ------------------------------- |
| remotion-dev/remotion@remotion  | Atualizar remotion_docs | Média                           |
| openai/sora                     | Vídeo IA externo        | Baixa (Lumiera usa Remotion/HF) |
| anthropics/skills@theme-factory | Temas de artefatos      | Baixa                           |

## Como instalar skill externa

```powershell
# Buscar
npx skills find "youtube thumbnail"

# Instalar em .agents/skills (revisar SKILL.md depois — adaptar Lumiera)
npx skills add vyralcontent/content-skills@viral-hooks --yes

# Ou copiar manualmente para .agents/skills/<nome>/
```

Após instalar:

1. Remover promoções de terceiros (ex.: Vyral) se não forem relevantes
2. Adicionar seção **Lumiera** (arquivos de código, triggers PT-BR)
3. Criar stub `skills/<nome>.md` no Obsidian
4. Atualizar [[SKILLS]] e [[AGENTS]]
5. Commit

## VoltAgent / awesome-agent-skills (1000+ skills)

Catálogo curado: [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills). Instalação via `npx skills add owner/repo@skill` (skills.sh).

| VoltAgent / skills.sh                          | Status Lumiera | Notas                                            |
| ---------------------------------------------- | -------------- | ------------------------------------------------ |
| kostja94/marketing-skills@video-marketing      | **Instalada**  | Bundle `shorts-viral`; não duplica `youtube-seo` |
| inference-sh/skills@remotion-render            | **Adaptada**   | Render local `remotion-renderer/`; belt opcional |
| remotion-dev/skills@remotion-best-practices    | **Instalada**  | Bundle `long-documentary`                        |
| claude-office-skills/skills@social-publisher   | **Instalada**  | Bundle `publish-seo`                             |
| chadboyda/agent-gtm-skills@ai-ugc-ads          | **Instalada**  | Bundle `shorts-viral`                            |
| motion-creative/skills@ad-concept-generator    | **Instalada**  | Bundle `shorts-viral`                            |
| remotion-dev/remotion@* (sub-skills)           | Candidata      | Atualizar `remotion_docs` pontualmente           |
| coreyhaines31/marketingskills@content-strategy | **Instalada**  | Bundles `shorts-viral`, `long-documentary`       |

Relacionado: [heilcheng/awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills) — índice alternativo já referenciado abaixo.

## CocoLoop Hub ([hub.cocoloop.cn](https://hub.cocoloop.cn/))

Índice Obsidian: [[memory/cocoloop-skills-curated]] · rejeitadas: [[memory/cocoloop-skills-rejected]]

| Skill local         | CocoLoop #                                    | Tier | Uso no Lumiera                               |
| ------------------- | --------------------------------------------- | ---- | -------------------------------------------- |
| video-understanding | [768](https://hub.cocoloop.cn/skills/768)     | A    | Vídeo referência → transcrição/resumo Gemini |
| markdown-converter  | [10190](https://hub.cocoloop.cn/skills/10190) | A    | PDF/DOCX → `.md` para memória / DeerFlow     |
| summarize-cli       | [165](https://hub.cocoloop.cn/skills/165)     | A    | Triagem URL/PDF antes da pesquisa profunda   |
| tavily-search-pro   | [1155](https://hub.cocoloop.cn/skills/1155)   | B    | Research com citações (`TAVILY_API_KEY`)     |

CLI upstream: baixar zip do hub (links em `memory/cocoloop-skills-curated.md`). SKILL.md em `.agents/skills/` é adaptação Lumiera.

**Não adotar:** humanize-ai-text (#177), YouTube Maton (#15289) — ver [[memory/cocoloop-skills-rejected]].

## Diretórios de descoberta

- [CocoLoop Skill Hub](https://hub.cocoloop.cn/)
- [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
- [awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills)
- [agent-skill.co](https://agent-skill.co)
- [skillsmp.com](https://skillsmp.com)
- [skills.sh](https://skills.sh)

## Critério de adoção Lumiera

Adotar se a skill melhora: **roteiro**, **retenção Short/Longo**, **SEO/upload**, **overlays**, **narração**, **trilha** ou **ops do agente**. Ignorar skills genéricas de infra/deploy salvo necessidade explícita.
