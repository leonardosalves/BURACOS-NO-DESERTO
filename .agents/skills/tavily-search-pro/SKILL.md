> 🔗 [[MEMORIA-LUMIERA]] · [[memory/cocoloop-skills-curated]] · [[skills/agent-reach|agent reach]] · [[skills/deer-flow-research|deer flow research]] · [[SKILLS]]

---

name: tavily-search-pro
description: |
Pesquisa Tavily com citações — search, extract, crawl, research report.
Segunda fonte de pesquisa além do Exa/agent-reach; fact-check com fontes numeradas.
Triggers: tavily, pesquisa com citações, research report, fact check, crawl site, extract URL.
metadata:
lumiera: true
source: hub.cocoloop.cn/skills/1155 (Shaharsha/tavily-search-pro)
cocoloop_id: 1155
tier: B
tasks: [research]
formats: [SHORT, LONG]
---

# Tavily Search Pro (CocoLoop → Lumiera)

Adaptado de [tavily-search-pro #1155](https://hub.cocoloop.cn/skills/1155). **Opcional** — requer `TAVILY_API_KEY`.

## Quando usar

- Relatório com **citações numeradas** (estilo acadêmico/comercial)
- Extract de URLs específicas para RAG antes do roteiro
- Crawl leve de site de documentação ou concorrente
- Fact-check de afirmação do roteiro antes do render

**Preferir** [[skills/agent-reach]] + DeerFlow nativo para o fluxo padrão do VideoAgent.

## Instalação

```powershell
$env:TAVILY_API_KEY = "tvly-..."

# Baixar zip e instalar dependência Python da skill
# https://dl.cocoloop.cn/bss/skills/tavily-search-pro.zip
pip install tavily-python
```

## Modos

| Modo       | Uso Lumiera                           |
| ---------- | ------------------------------------- |
| `search`   | Busca geral + resposta LLM            |
| `extract`  | Uma URL → markdown para memória       |
| `crawl`    | Site pequeno (docs, blog concorrente) |
| `research` | Relatório mini/pro com fontes         |

## Workflow Lumiera

1. Tema do vídeo → `research` Tavily (pro) para relatório com refs
2. Anexar trechos a `.agents/memory/deep-research-reports.md`
3. Validar números/nomes no `scriptQuality.js` / revisão humana
4. Não duplicar se DeerFlow já rodou no mesmo dia para o mesmo tema

## Overlap

| Ferramenta          | Quando preferir                          |
| ------------------- | ---------------------------------------- |
| `agent-reach` (Exa) | Busca ampla, 15 plataformas, zero Tavily |
| DeerFlow API        | Pipeline integrado + fila editorial      |
| NotebookLM          | Síntese com fontes já curadas            |

## Riscos

- Custo por crédito (advanced/research consome mais)
- Queries enviadas aos servidores Tavily
- Chinês/PT-BR: validar qualidade dos resultados na prática
