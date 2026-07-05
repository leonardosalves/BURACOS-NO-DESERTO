# CocoLoop Skills — curado Lumiera

> 🔗 [[MEMORIA-LUMIERA]] · [[skills/skills-registry-external]] · [[SKILLS]]

Índice das skills adotadas do [CocoLoop Hub](https://hub.cocoloop.cn/) para o estúdio Lumiera (jul/2026).

## Tier A — adotadas

| Skill                        | Hub                   | Uso no Lumiera                                 |
| ---------------------------- | --------------------- | ---------------------------------------------- |
| [[skills/video-understanding | video understanding]] | [#768](https://hub.cocoloop.cn/skills/768)     | Análise multimodal de vídeo referência (transcrição, resumo) |
| [[skills/markdown-converter  | markdown converter]]  | [#10190](https://hub.cocoloop.cn/skills/10190) | PDF/DOCX/PPT → Markdown para memória e pesquisa              |
| [[skills/summarize-cli       | summarize cli]]       | [#165](https://hub.cocoloop.cn/skills/165)     | Triagem rápida de URL/PDF antes do DeerFlow                  |

## Tier B — opcional

| Skill                      | Hub                 | Uso no Lumiera                               |
| -------------------------- | ------------------- | -------------------------------------------- |
| [[skills/tavily-search-pro | tavily search pro]] | [#1155](https://hub.cocoloop.cn/skills/1155) | Pesquisa com citações (requer `TAVILY_API_KEY`) |

## Rejeitadas (não instalar)

Ver [[memory/cocoloop-skills-rejected]].

## Fluxo recomendado

```
Fonte (PDF/URL/vídeo)
    → markdown-converter / summarize-cli / video-understanding
    → .agents/memory/ ou NotebookLM
    → deer-flow-research (se aprofundar)
    → Creator roteiro (ugc-scriptwriter)
```

## Instalação CLI upstream

As skills em `.agents/skills/` são **adaptações Lumiera** (SKILL.md). Os binários/scripts vêm do zip do hub:

- video-understanding: https://dl.cocoloop.cn/bss/skills/video-understanding.zip
- markdown-converter: https://dl.cocoloop.cn/bss/skills/steipete-markdown-converter-1.0.0.zip
- summarize: https://dl.cocoloop.cn/bss/skills/20206-02-10-clawhub-summarize-1-0-0.zip
- tavily-search-pro: https://dl.cocoloop.cn/bss/skills/tavily-search-pro.zip

## Relacionadas

- [[skills/openmontage-reference-video]]
- [[skills/deer-flow-research]]
- [[skills/agent-reach]]
- [[memory/deep-research-reports]]
- [[memory/competitor-intelligence]]
