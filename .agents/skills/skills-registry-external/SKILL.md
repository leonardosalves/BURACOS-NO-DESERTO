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

| Skill local | Fonte upstream | Uso no programa |
|-------------|----------------|-----------------|
| viral-short-form | vyralcontent/content-skills + n8n Lucas Walter | Creator, scriptQuality.js |
| viral-short-form-ideas | vyralcontent/content-skills | Ideação Creator, ranking_ideas |
| viral-hooks | vyralcontent/content-skills | Ganchos Creator / bloco 1 |
| viral-captions-and-ctas | vyralcontent/content-skills | Legendas shorts-viral, CTAs, metadados |
| viral-youtube-shorts | vyralcontent/content-skills | Projetos SHORTS, metadados |
| youtube-thumbnail | charlie947/social-media-skills | Canva, variantes de capa |
| youtube-seo | kostja94/marketing-skills + youtubeMetadataOptimizer | IA·Metadados, upload |
| ugc-scriptwriter | motion-creative/skills | Narração humanizada |
| hyperframes | HeyGen→Lumiera catálogo | Overlays, render PRO |
| remotion_docs | remotion-dev/remotion | Timeline Remotion |
| epidemic_sound | REST/MCP | Trilha BGM |
| lumiera-ops | interno | commit + reiniciar servidores |
| studio-agents-hermes | interno (padrões Hermes/OpenClaw) | Bundles, workshop, API skills |

## Hermes Agent + OpenClaw — padrões adotados

| Conceito upstream | Implementação Lumiera |
|-------------------|----------------------|
| Hermes `skills_list` / `skill_view` | `skillsRegistry.js` + API `/api/studio-agents/skills` |
| Hermes skill bundles | `.agents/skill-bundles/*.json` |
| Hermes `skill_manage` + write_approval | `.agents/pending/skills/` + workshop UI |
| OpenClaw `<workspace>/.agents/skills` | `.agents/skills/` (já usado) |
| OpenClaw agent allowlists | `skillAllowlist` em `studio_agents_config.json` |
| OpenClaw gating `metadata.openclaw` | `metadata.lumiera` + `formats` / `tasks` |

Fontes: [Hermes skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills) · [OpenClaw skills](https://docs.openclaw.ai/tools/skills)

## MCP Market / SkillsMP — mapeamento

| Marketplace | Slug | ≈ Pacote real |
|-------------|------|----------------|
| mcpmarket.com | viral-short-form-video-master | vyralcontent/content-skills (viral-short-form) |
| skills.sh | vyralcontent/content-skills@* | Mesma família Vyral (MIT) |
| skills.sh | josiahsiegel/claude-plugin-marketplace@viral-video-short-form | Variante plugin Claude |

## Candidatas futuras (avaliar antes de instalar)

| Repo@skill | Motivo | Prioridade |
|------------|--------|------------|
| remotion-dev/remotion@remotion | Atualizar remotion_docs | Média |
| motion-creative/skills@ad-concept-generator | Conceitos UGC ads | Baixa |
| openai/sora | Vídeo IA externo | Baixa (Lumiera usa Remotion/HF) |
| anthropics/skill-creator | Autoria de novas skills | Referência |

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

## Diretórios de descoberta

- [awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills)
- [agent-skill.co](https://agent-skill.co)
- [skillsmp.com](https://skillsmp.com)
- [skills.sh](https://skills.sh)

## Critério de adoção Lumiera

Adotar se a skill melhora: **roteiro**, **retenção Short/Longo**, **SEO/upload**, **overlays**, **narração**, **trilha** ou **ops do agente**. Ignorar skills genéricas de infra/deploy salvo necessidade explícita.