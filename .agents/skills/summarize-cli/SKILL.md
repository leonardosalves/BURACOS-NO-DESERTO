> 🔗 [[MEMORIA-LUMIERA]] · [[memory/cocoloop-skills-curated]] · [[skills/deer-flow-research|deer flow research]] · [[SKILLS]]

---

name: summarize-cli
description: |
Resumo rápido de URL, PDF, imagem, áudio ou YouTube via CLI summarize (steipete).
Use como triagem barata antes da pesquisa profunda DeerFlow — "vale aprofundar?".
Triggers: resumir URL, resumo rápido, summarize, triagem artigo, resumo YouTube, pré-pesquisa.
metadata:
lumiera: true
source: hub.cocoloop.cn/skills/165 (steipete/summarize)
cocoloop_id: 165
tier: A
tasks: [research, ideas]
formats: [SHORT, LONG]
---

# Summarize CLI (CocoLoop → Lumiera)

Adaptado de [summarize #165](https://hub.cocoloop.cn/skills/165). Wrapper do CLI [summarize](https://github.com/steipete/summarize) (Homebrew / npm).

## Quando usar

- Artigo longo ou vídeo YouTube → resumo em 30s antes de gastar DeerFlow
- Triagem: "esse link tem material para um Short?"
- Múltiplas URLs em paralelo (humano ou script)

**Não substitui** [[skills/deer-flow-research]] para relatório com citações e fila editorial.

## Pré-requisitos

```powershell
# Instalar CLI (uma vez)
# brew install steipete/tap/summarize   # macOS
# ou seguir README upstream

# API — usar mesma chave Gemini do Lumiera quando possível
$env:GOOGLE_API_KEY = "..."   # ou OPENAI_API_KEY / ANTHROPIC_API_KEY
```

Download skill: https://dl.cocoloop.cn/bss/skills/20206-02-10-clawhub-summarize-1-0-0.zip

## Uso

```bash
summarize "https://example.com/article" --length short
summarize "https://youtu.be/xxx" --model google/gemini-2.5-flash
summarize "C:\path\paper.pdf" --json
```

## Workflow Lumiera

```
URL/PDF → summarize (short) → decisão humana
                ↓ sim
         deer-flow-research → .agents/memory/deep-research-reports.md
                ↓
         Creator ideias / roteiro
```

## Overlap

| Skill                | Papel                                    |
| -------------------- | ---------------------------------------- |
| `agent-reach`        | Busca e fetch multi-plataforma           |
| `deer-flow-research` | Pesquisa profunda com planner + reporter |
| `notebooklm-mcp`     | Síntese com fontes do caderno            |

## Riscos

- Conteúdo enviado ao provedor do modelo escolhido
- CLI mantido por dev individual (T3) — fixar versão em produção
