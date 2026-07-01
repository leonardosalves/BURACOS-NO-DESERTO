# OpenMontage → Lumiera

> 🔗 [[MEMORIA-LUMIERA]] · [[skills/openmontage-reference-video]] · [[skills/openmontage-preflight]] · [[skills/openmontage-reviewer]]

Adaptação dos padrões de produção do [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) (AGPL-3.0) para o Lumiera — **skills e fluxos em markdown**, sem portar `tools/` Python.

## O que o OpenMontage original faz

1. **Pipelines YAML** — research → proposal → script → scene_plan → assets → edit → compose → publish (12 pipelines)
2. **Video Reference Analyst** — URL → VideoAnalysisBrief → 2–3 conceitos diferenciados
3. **Capability preflight** — `provider_menu()` / `support_envelope()` antes de propor
4. **Reviewer meta-skill** — quality gates por estágio (CHAI: accurate, complete, constructive)
5. **Layer 3 skills** — ~70 skills provider-specific em `.agents/skills/`

## O que o Lumiera adapta

| OpenMontage | Lumiera (nosso) |
|-------------|-----------------|
| `video-reference-analyst` | `POST /api/workflow/analyze-reference` + painel Studio Agents |
| `provider_menu()` | `GET /api/workflow/capability-menu` |
| `reviewer` meta-skill | Skill `openmontage-reviewer` + `preRenderAdvice.js` existente |
| Pipelines YAML | Creator + VideoAgent + workflow Lumiera |
| Remotion + HyperFrames | Já integrados — apresentar ambos ao usuário |
| Clip Factory (longo→shorts) | Fila editorial + Shorts viral (futuro) |
| Documentary + Archive.org | NotebookLM + Pexels/Pixabay |

## APIs

- `GET /api/workflow/capability-menu` — envelope TTS, stock, render, ComfyUI, LLM, NotebookLM
- `POST /api/workflow/analyze-reference` — `{ url, format, niche, topic, useAi }` → brief + conceitos

## UI

- **Studio Agents → Automação** — painel **Inspirado em vídeo — OpenMontage** acima do VideoAgent
- Botões: **Usar no VideoAgent** · **Abrir no Creator**

## Skills Lumiera

- [[skills/openmontage-reference-video]] — análise URL → brief → conceitos
- [[skills/openmontage-preflight]] — capability envelope antes de produzir
- [[skills/openmontage-reviewer]] — gates de qualidade por estágio

## Bundle

- `openmontage-prod.json` — referência + preflight + reviewer + viral/SEO

## Licença

OpenMontage é **AGPL-3.0**. Lumiera reimplementa padrões documentados nas skills públicas com atribuição — não copia código Python wholesale.

## Pipelines OpenMontage × Lumiera

| Pipeline OM | Equivalente Lumiera |
|-------------|---------------------|
| `short-form-viral` | shorts-viral bundle + Creator SHORT |
| `documentary` | long-documentary bundle + NotebookLM |
| `animation` | HyperFrames + ComfyUI LTX |
| `talking-head` | Fish Speech / Chatterbox clone |
| `clip-factory` | (planejado) longo → shorts na fila editorial |
| `hybrid` | VideoAgent multi-step |