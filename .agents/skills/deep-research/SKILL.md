---
name: deep-research
description: 'Executar pesquisas profundas e embasadas em fontes via DeepAPI (POST /v1/research/deep) ou relatórios citados. Constrói prompts rigorosos de um parágrafo (padrão research-prompt), dispara a busca e salva relatórios em markdown citados. Use quando o usuário pedir "deep research", "pesquisa profunda", "pesquisa embasada em fontes", "deepapi research", ou pesquisas comparativas complexas.'
disable-model-invocation: true
license: MIT
metadata:
  lumiera: true
  source: davidondrej/skills/skills/research-and-web/deep-research
---

# Deep Research (via DeepAPI & Lumiera Research)

Skill para condução de pesquisas profundas, investigações de mercado, análises concorrenciais e levantamento de evidências científicas/técnicas com citações diretas.

## 1. Chave de API & Configuração

- A chave da DeepAPI é lida de `DEEPAPI_API_KEY` no ambiente ou em `~/.zshrc` / `.env`.
- **Atenção:** NUNCA execute `source ~/.zshrc` no bash (pode quebrar o ambiente com exit 126).
- Para obter a chave sem quebrar o ambiente:
  ```bash
  KEY=${DEEPAPI_API_KEY:-$(grep -o 'DEEPAPI_API_KEY=\S+' ~/.zshrc 2>/dev/null | head -1 | cut -d= -f2)}
  BASE=${DEEPAPI_API_BASE_URL:-https://deepapi.co}
  ```
- Se a chave não estiver configurada, utilize o fallback multimodal do Lumiera via Gemini / Tavily / Google Search (`/api/research/search`).

## 2. Passo 1 — Construção do Prompt de Pesquisa (`research-prompt`)

Escreva UM único parágrafo auto-contido seguindo a regra `research-prompt`:

1. Explique em linguagem simples o projeto/produto e o objetivo final da decisão.
2. Formule a pergunta central diretamente após o contexto.
3. Enumere **3 a 6 sub-perguntas inline** (1, 2, 3...) para garantir cobertura explícita.
4. Defina restrições de inclusão e exclusão (ex.: "somente dados de 2024-2026", "evitar declarações de marketing sem fonte").
5. Exija hierarquia de fontes (documentação oficial, relatórios financeiros, papéis científicos primeiro; fóruns/redes apenas como sinal secundário).

## 3. Passo 2 — Execução da Requisição

### Via DeepAPI:

```bash
IDK=$(uuidgen 2>/dev/null || date +%s%N)
curl -s --max-time 120 "$BASE/v1/research/deep" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDK" \
  -d '{
    "query": "PARAGRAFO_DE_PESQUISA_AQUI",
    "context": "CONTEXTO_ADICIONAL_SE_HOUVER",
    "instructions": "Retornar formato markdown com secoes claras e fontes citadas"
  }' > /tmp/deep_research_res.json
```

### Via Backend Lumiera (Fallback Interno):

Chame a rota de pesquisa profunda do Lumiera em `POST /api/research/deep-search` com `{ query, niche, topic }`.

## 4. Passo 3 — Formatação & Salvamento do Relatório

- Salve o relatório no diretório do projeto como `research_<tema>_<timestamp>.md` ou em `~/Downloads/`.
- Estrutura do relatório:
  1. **Resumo Executivo / Resposta Direta**
  2. **Principais Descobertas com Fontes Citadas**
  3. **Tabela Comparativa / Métricas** (quando aplicável)
  4. **Contradições e Incertezas Identificadas**
  5. **Referências e URLs das Fontes**
