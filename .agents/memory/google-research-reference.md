# Google Research Reference
> 🔗 [[MEMORIA-LUMIERA]] · [[memory/agent-frameworks-reference]] · [[memory/google-gemini-sdk-reference]]

Catálogo curado do monorepo [google-research/google-research](https://github.com/google-research/google-research) — **referência e inspiração**, não portar o repositório inteiro (5000+ commits, centenas de projetos isolados).

## Critério Lumiera

Adotar padrão ou código só se melhora: **roteiro**, **retenção**, **tendências**, **clip selection**, **SEO/upload** ou **pesquisa pré-roteiro**.

## Já integrado no Lumiera

| Projeto Google Research | Repo | Lumiera |
|-------------------------|------|---------|
| **TimesFM** | [google-research/timesfm](https://github.com/google-research/timesfm) (repo separado) | `timesfmForecast.js`, `timesfm_forecast.py`, Radar de Tendências, fila editorial |

```
dashboard-qanat/backend/timesfmForecast.js  → spawn Python .venv-timesfm
dashboard-qanat/backend/timesfmRoutes.js    → POST /api/trends/forecast
dashboard-qanat/backend/pioneerNicheDiscovery.js → Modo Pioneiro
```

Venv: `dashboard-qanat/backend/.venv-timesfm/` · env `TIMESFM_PYTHON_PATH`

## Alta prioridade (candidatos futuros)

| Pasta / projeto | Área | Aplicação Lumiera |
|-----------------|------|-------------------|
| **better_storylines** | Narrativa | Estrutura de beats em vídeos LONG/documentário |
| **assemblenet** | Vídeo / ação | Clip Factory — detectar cenas e cortes por ação |
| **t5** / **mt5** | NLP seq2seq | Resumir pesquisa DeerFlow → blocos de roteiro |
| **videoprism** | Embeddings vídeo | Similaridade clip↔clip, dedup B-roll |
| **TimesX/dataset_agent** | Agentes de dados | Padrões para pioneer niche + analytics |
| **CIQA** | Qualidade imagem | QA automático de thumbnails antes do upload |

## Média prioridade (consultar sob demanda)

| Projeto | Uso potencial |
|---------|---------------|
| **attribute_with_prefixlm** | Legendas contextuais por bloco |
| **cbertscore** | Eval automático de qualidade de roteiro (complementa [[skills/skill-creator]]) |
| **business_metric_aware_forecasting** | Previsão alinhada a RPM/views (estende TimesFM) |
| **RevThink** | Raciocínio reverso — revisar roteiro antes do render |
| **CoDi** | Multimodal generativo — baixa prioridade (Lumiera usa Remotion/HF) |

## Baixa prioridade / ignorar

Projetos de domínios distantes (quântico, biologia, NAS puro, RL genérico) — o monorepo é arquivo histórico de papers, não um framework único.

**Não clonar o monorepo inteiro.** Entrar na subpasta do paper, ler README, copiar só o script/padrão necessário para `dashboard-qanat/backend/` ou `.agents/skills/`.

## Workflow de adoção

1. Identificar subpasta no [google-research](https://github.com/google-research/google-research) ou repo irmão (ex. `timesfm`)
2. Verificar licença (geralmente Apache 2.0) e dependências Python/JAX
3. Isolar em venv dedicado (padrão `.venv-timesfm`)
4. Expor via rota API ou script spawn do Node
5. Documentar em `.agents/memory/` + commit

## Relação com Gemini SDK

Google Research = modelos e papers open-source (TimesFM, T5, AssemblyNet).

Gemini API = inferência hosted dos modelos comerciais (Flash, Pro, Deep Research).

Lumiera usa **ambos**: TimesFM local para séries temporais; Gemini API para LLM/grounding.

Ver [[memory/google-gemini-sdk-reference]].

## Links
- [[memory/competitor-intelligence]]
- [[skills/deer-flow-research]]
- [[skills/content-strategy]]
- Monorepo: [github.com/google-research/google-research](https://github.com/google-research/google-research)