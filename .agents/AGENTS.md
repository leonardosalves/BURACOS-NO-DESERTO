# Agent Instructions & Guidelines

## 1. Obligatory Pre-requisite Check
- Before performing any work or analysis, the agent MUST read this file and follow its rules.

## 2. Commit, Restart & Git Management Rules (OBRIGATÓRIO — SEM EXCEÇÃO)

### Commits
- **COMMITS ARE MANDATORY**: Whenever you make any changes to the codebase (files added, modified, or deleted), you MUST immediately run `git add` and `git commit`.
- Do NOT finish a turn or leave changes uncommitted.
- Do NOT ask the user to commit — the agent commits autonomously.
- **Não commitar por padrão** (config local do usuário): `config_qanat.json`, `dashboard-qanat/backend/studio_agents_config.json` — salvo pedido explícito.

### Reinício de servidores (automático quando necessário)
- **Backend** (`dashboard-qanat/backend/**` alterado): reiniciar `node server.js` na porta **3005** — sem esperar o usuário pedir.
- **Frontend** (proxy `vite.config.ts` ou rotas API): reiniciar Vite na porta **5176** se a mudança exigir.
- Script: `scripts/restart-backend.ps1` ou skill `.agents/skills/lumiera-ops/SKILL.md`.
- Regra Cursor: `.cursor/rules/lumiera-ops.mdc` (`alwaysApply: true`).

### Ordem ao finalizar tarefa
1. Implementar → 2. Reiniciar servidores afetados → 3. Commit → 4. Informar usuário (commit + servidores).

## 3. Subtitles (Legends) and Overlays Rules
- **NO OVERLAPS**: Ensure that information cards, charts, timelines, or any other overlays do NOT display on top of the subtitles. Subtitles must remain visible, uncluttered, and readable at all times.
- **LEGEND STYLING**: Subtitles/legends must look highly premium, organized, and cinematic. Avoid messy, plain, or disorganized formatting. Use clean fonts (e.g., modern uppercase sans-serif like Montserrat or Impact, with text-shadow / outline for readability), proper word-wrapping, and professional layout sizing.

## 4. YouTube SEO, RPM & HyperFrames Orchestration Rules
- **ROLE**: Act as a professional video design agent that optimizes visual retention based on YouTube's SEO algorithms.
- **RPM DESIGN STRATEGY**: Adapt visual theme aesthetics based on the video's niche and RPM potential:
  * *High RPM (Tech/Finance):* Premium dark backgrounds, neon-accented glows, code mockups/terminals, precise numeric counters.
  * *Medium-High RPM (History/Mystery):* Serif typography (`Cinzel`), double borders, warm ambient glows, "ancient"/"mysterious" styles.
  * *Medium RPM (Nature/Geography):* Green/earth tones, clean sans-serif layouts (`Montserrat`, `Inter`), minimal side rules.
- **ELIMINATE THEMATIC FLOATING CARDS**: Convert all text-heavy or thematic `info-card` overlays into elegant `lower-third` overlays (mapping descriptions to subtitles and adjusting positions) to keep the center of the video clean and cinematic.
- **INFOGRAPHIC PRIORITY**: Always show dynamic infographics (like `counter`, `bar-chart`, `timeline`) on screen instead of text overlays when displaying percentages, statistics, or steps.
- **CATALOG EXCLUSIVITY**: Use exclusively the Remotion-transformed resources listed in `SKILL.md` (e.g., Soft Pill, Accent Underline, Shimmer, Shaders, macOS bash, etc.) to compose and edit each video.

## 5. Spec-Driven Development (Spec Kit)

Para **features novas**, integrações ou tarefas multi-arquivo, seguir o fluxo [GitHub Spec Kit](https://github.com/github/spec-kit) adaptado ao Lumiera:

1. Constitution → `.specify/memory/constitution.md`
2. Specify → `specs/<###-nome>/spec.md`
3. Clarify → ambiguidades antes do plano
4. Plan → `plan.md` (stack Lumiera)
5. Tasks → `tasks.md`
6. Implement → executar tasks + `lumiera-ops`

Hub: [[skills/speckit-lumiera|Spec Kit Lumiera]] · Bundle: `dev-sdd.json` · Regra Cursor: `.cursor/rules/speckit-sdd.mdc`

**Não** rodar `specify init` na raiz (projeto brownfield).

## 6. Skills (Obsidian)

Catálogo: [[SKILLS]] · Hub: [[MEMORIA-LUMIERA]]

- [[skills/epidemic_sound|Epidemic Sound]]
- [[skills/hyperframes|HyperFrames]]
- [[skills/remotion_docs|Remotion Docs]]
- [[skills/remotion-best-practices|Remotion Best Practices]] — interpolate, legendas, rules/
- [[skills/social-publisher|Social Publisher]] — upload multi-plataforma
- [[skills/ai-ugc-ads|AI UGC Ads]] — brief criador, Spark Ads, teste 3x3x3
- [[skills/ad-concept-generator|Ad Concept Generator]] — conceito paid a partir do gancho
- [[skills/content-strategy|Content Strategy]] — pilares, clusters, calendário (Corey Haines)
- [[skills/remotion-render|Remotion Render]] — LumieraTimeline, render local
- [[skills/video-marketing|Video Marketing]] — estratégia short/long (kostja94)
- [[skills/ugc-scriptwriter|UGC Scriptwriter]]
- [[skills/viral-short-form|Viral Short Form]] (+ `references/` Vyral)
- [[skills/viral-short-form-ideas|Viral Short-Form Ideas]] — pilares, matriz, Creator
- [[skills/viral-hooks|Viral Hooks]] — ganchos 1–3s
- [[skills/viral-captions-and-ctas|Captions & CTAs]] — legendas, hashtags, comentário fixo
- [[skills/viral-youtube-shorts|YouTube Shorts]] — VVSA, funil
- [[skills/youtube-seo|YouTube SEO]] — metadados e upload
- [[skills/youtube-thumbnail|YouTube Thumbnail]] — capas CTR / Canva
- [[skills/skills-registry-external|Registro skills externas]] — awesome-agent-skills, skillsmp
- [[skills/studio-agents-hermes|Studio Agents Hermes]] — bundles OpenClaw + disclosure Hermes
- [[skills/lumiera-ops|Lumiera Ops — commit + reiniciar servidores]]
- [[skills/speckit-lumiera|Spec Kit Lumiera]] — SDD: specify, plan, tasks, implement
- [[skills/speckit-specify|speckit specify]] · [[skills/speckit-plan|plan]] · [[skills/speckit-tasks|tasks]] · [[skills/speckit-implement|implement]] · [[skills/speckit-clarify|clarify]]
