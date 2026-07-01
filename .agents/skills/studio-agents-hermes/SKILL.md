> 🔗 [[MEMORIA-LUMIERA]] · [[skills/skills-registry-external|Skills externas]] · [[SKILLS]]

---
name: studio-agents-hermes
description: |
  Orquestração Studio Agents no padrão Hermes/OpenClaw — skills progressivas, bundles por tarefa, workshop com aprovação.
  Use ao planejar overlays, roteiro ou metadados com memória do estúdio; ao avaliar novas skills ou bundles.
  Triggers: studio agents, hermes, openclaw, skill bundle, workshop, progressive disclosure, skill_manage.
license: MIT
metadata:
  lumiera: true
  tasks: [overlay, script, ideas, metadata]
  formats: [SHORT, LONG]
  category: ops
---

# Studio Agents — Hermes + OpenClaw (Lumiera)

Padrões adotados de [Hermes Agent](https://hermes-agent.nousresearch.com) e [OpenClaw](https://docs.openclaw.ai/tools/skills) para o ecossistema `.agents/` do Lumiera.

## Mapeamento de conceitos

| Hermes / OpenClaw | Lumiera |
|-------------------|---------|
| `~/.agents/skills` (project) | `.agents/skills/` |
| `skills_list` (L0) | `GET /api/studio-agents/skills` |
| `skill_view` (L1/L2) | `GET /api/studio-agents/skills/:slug?ref=` |
| Skill bundles (`/backend-dev`) | `.agents/skill-bundles/*.json` |
| `skill_manage` + write_approval | `.agents/pending/skills/` (workshop) |
| Memória procedural | `.agents/memory/<nicho>.md` + promote |
| External dirs | `.agents/skills/` + `skills-lock.json` |

## Progressive disclosure (3 níveis)

1. **L0** — índice: `name`, `description`, `tasks`, `formats` (~ poucos tokens)
2. **L1** — `SKILL.md` corpo (trecho até 2200 chars no prompt)
3. **L2** — `references/*.md` ou `assets/*.md` sob demanda

O backend **não** injeta todas as skills no prompt — resolve o **bundle** da tarefa.

## Bundles padrão

| Bundle | Tarefa | Skills |
|--------|--------|--------|
| `studio-overlay-agent` | overlay | hyperframes, viral-youtube-shorts, viral-hooks |
| `shorts-viral` | script / ideas | viral-short-form, hooks, captions, ugc, ideas |
| `publish-seo` | metadata | youtube-seo, thumbnail, captions |
| `long-documentary` | overlay LONG | hyperframes, remotion, epidemic, seo |

Config: `studio_agents_config.json` → `skillBundleByTask`.

## Gating (OpenClaw-style)

Skills podem declarar no frontmatter (bloco `metadata`):

```yaml
metadata:
  lumiera: true
  formats: [SHORT]
  tasks: [overlay, script]
  platforms: [windows]
```

Skills fora do formato/tarefa ativo são omitidas do índice.

## Workshop (write approval)

Com `skillsWriteApproval: true` (padrão), alterações de skill ficam em `.agents/pending/skills/` até aprovação na UI Studio Agents.

API:

- `GET /api/studio-agents/skill-workshop`
- `POST /api/studio-agents/skill-workshop/:id/apply`
- `POST /api/studio-agents/skill-workshop/:id/reject`

## Código Lumiera

- `dashboard-qanat/backend/skillsRegistry.js` — list, view, bundles, workshop, prompt
- `dashboard-qanat/backend/agentMemory.js` — aprendizados por nicho
- `dashboard-qanat/backend/studioAgents.js` — captura / consolidação
- `StudioAgents.tsx` — UI memória + skills + Obsidian

## Quando o agente injeta skills

`buildStudioAgentsPromptAddendum()` combina:

1. Aprendizados promovidos (`applyLearningsInAgentMode`)
2. Bundle da tarefa (`skillsInAgentMode`)

Usado em `POST /api/studio-agents/plan-overlays` e extensível a roteiro/metadados.

## Instalar skill externa (OpenClaw/Hermes compatible)

```powershell
npx skills add vyralcontent/content-skills@viral-hooks --yes
# ou
.\scripts\install-external-skill.ps1 vyralcontent/content-skills@viral-hooks
```

Depois: seção Lumiera, stub Obsidian, atualizar bundle se necessário.

## Anti-patterns

- Dump de todas as SKILL.md no prompt (quebra token budget)
- Agente editar skill sem workshop quando `skillsWriteApproval: true`
- Bundle sem `instruction` — o modelo não sabe priorizar entre skills

## Aprendizados capturados (workshop — 2026-06-30)

**História** / SHORT / score 76 / banheiros_romanos_eram
- `SHORT/lt_repeat` Alternar tipos entre overlays — evitar dois lower-thirds seguidos
- `SHORT/overlay_timing` Overlay "lt-explosions" @ 1.9s: fora do bloco 1 (0.0–6.5s)
- `SHORT/overlay_timing` Overlay "lt-methane-gas" @ 14.0s: desvio 12.8s da palavra-chave (1.2s)
- `SHORT/overlay_timing` Overlay "info-ignition" @ 28.0s: desvio 26.8s da palavra-chave (1.2s)

## Aprendizados capturados (workshop — 2026-07-01)

**Engenharia antiga** / SHORT / score 84 / Automato_Heron_Primeiro
- `SHORT/lt_repeat` Alternar tipos entre overlays — evitar dois lower-thirds seguidos
- `SHORT/overlay_timing` Overlay "lt-heron-alexandria" @ 7.5s: desvio 7.5s da palavra-chave (0.0s)
- `SHORT/overlay_timing` Overlay "info-automatos-heron" @ 20.0s: desvio 20.0s da palavra-chave (0.0s)
- `SHORT/overlay_timing` Overlay "lt-motor-vapor" @ 35.0s: desvio 35.0s da palavra-chave (0.0s)

## Ver também

- `../skills-registry-external/SKILL.md` — catálogo upstream
- `../lumiera-ops/SKILL.md` — commit + reiniciar após mudanças