# Skills do Lumiera

Índice das skills em `.agents/skills/`. Cada pasta tem um atalho com nome legível no grafo.

Hub: [[MEMORIA-LUMIERA]] · Agentes: [[AGENTS]] · Memória: [[MEMORY]] · Externas: [[skills/skills-registry-external|Registro externo]]

## Produção de vídeo

- [[skills/hyperframes|HyperFrames]] — doc: [[skills/hyperframes/SKILL]]
- [[skills/remotion_docs|Remotion Docs]] — doc: [[skills/remotion_docs/SKILL]]
- [[skills/epidemic_sound|Epidemic Sound]] — doc: [[skills/epidemic_sound/SKILL]]

## Roteiro e viral (Shorts)

- [[skills/viral-short-form|Viral Short Form]] — doc: [[skills/viral-short-form/SKILL]] · refs Vyral em `references/`
- [[skills/viral-hooks|Viral Hooks]] — doc: [[skills/viral-hooks/SKILL]]
- [[skills/viral-youtube-shorts|YouTube Shorts]] — doc: [[skills/viral-youtube-shorts/SKILL]]
- [[skills/ugc-scriptwriter|UGC Scriptwriter]] — doc: [[skills/ugc-scriptwriter/SKILL]]

## Publicação e SEO

- [[skills/youtube-seo|YouTube SEO]] — doc: [[skills/youtube-seo/SKILL]]
- [[skills/youtube-thumbnail|YouTube Thumbnail]] — doc: [[skills/youtube-thumbnail/SKILL]]

## Ops e catálogo

- [[skills/lumiera-ops|Lumiera Ops]] — commit + reiniciar servidores
- [[skills/skills-registry-external|Skills externas]] — awesome-agent-skills, skillsmp, mcpmarket

## Por que vários arquivos SKILL?

Cada skill vive em `skills/<nome>/SKILL.md`. No grafo, use os atalhos acima — todos ligados a este índice.

## Instalar skill nova

```powershell
.\scripts\install-external-skill.ps1 vyralcontent/content-skills@viral-hooks
```

Depois adapte para Lumiera (ver [[skills/skills-registry-external/SKILL]]).