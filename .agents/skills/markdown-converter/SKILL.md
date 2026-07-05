> 🔗 [[MEMORIA-LUMIERA]] · [[memory/cocoloop-skills-curated]] · [[skills/pdf|pdf]] · [[skills/deer-flow-research|deer flow research]] · [[SKILLS]]

---

name: markdown-converter
description: |
Converte PDF, DOCX, PPTX, XLSX, áudio, imagens e URLs em Markdown (Microsoft markitdown).
Use para ingerir fontes de pesquisa no vault Obsidian e em .agents/memory/ antes do roteiro.
Triggers: PDF para markdown, converter documento, markitdown, ingestão pesquisa, extrair texto PDF.
metadata:
lumiera: true
source: hub.cocoloop.cn/skills/10190 (steipete/markdown-converter)
cocoloop_id: 10190
tier: A
tasks: [research, script]
formats: [SHORT, LONG]
---

# Markdown Converter (CocoLoop → Lumiera)

Adaptado de [Markdown Converter #10190](https://hub.cocoloop.cn/skills/10190). Motor: [Microsoft markitdown](https://github.com/microsoft/markitdown).

## Quando usar

- PDF de paper, relatório ou livro → `.md` para NotebookLM / DeerFlow / memória
- DOCX/PPTX de briefing → texto para roteiro
- Áudio de entrevista → transcrição + markdown
- YouTube URL → texto (via markitdown)

**Não substitui** [[skills/pdf]] para relatórios Lumiera formatados (youtube reports → PDF).

## Instalação

```powershell
# Zero install persistente (recomendado)
uvx markitdown "C:\caminho\fonte.pdf" -o "C:\caminho\fonte.md"

# Fixar versão (supply chain)
uvx markitdown==0.1.0 "fonte.pdf" -o "fonte.md"
```

Download skill: https://dl.cocoloop.cn/bss/skills/steipete-markdown-converter-1.0.0.zip

## Workflow Lumiera

1. Converter fonte → `fonte.md`
2. Copiar trechos relevantes para `.agents/memory/<nicho>.md` ou vault Obsidian
3. Opcional: adicionar como fonte NotebookLM (`nlm source_add`)
4. Disparar `POST /api/research/deep` com contexto enriquecido

## Destinos no Obsidian

- Vault estúdio: `.agents/` (hub [[MEMORIA-LUMIERA]])
- Vault pesquisa externo: ver [[skills/obsidian-vault]]

## Riscos

- Primeira execução `uvx` baixa pacotes da internet
- Azure Document Intelligence (`-d`) envia PDF à nuvem — só se necessário para scan
- Tabelas/PPT complexos podem perder formatação
