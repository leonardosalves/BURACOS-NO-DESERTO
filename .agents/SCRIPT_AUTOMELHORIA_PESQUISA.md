> 🔗 [[MEMORIA-LUMIERA]] · [[SKILLS]]

# SCRIPT_AUTOMELHORIA_PESQUISA

## GATILHO

Executar após ETAPA 10 (Montar Pacote) e antes do handoff.

## FASE 1 — VERIFICAÇÃO DE COBERTURA

Para cada elemento da cadeia causal, responder:

```
CONTEXTO:     Tenho fonte com confiança ≥ 7? [sim|não]
PROBLEMA:     Está claramente definido?       [sim|não]
CAUSA:        Tenho evidência, não só correlação? [sim|não]
FUNCIONAMENTO: Mecanismo explicado com fonte? [sim|não]
EVIDÊNCIA:    2+ fontes independentes?       [sim|não]
CONSEQUÊNCIA: Resultado concreto identificado? [sim|não]
SIGNIFICADO:  Relevância atual sustentada?   [sim|não]
```

Se 2+ = NÃO → voltar à etapa de pesquisa com consulta específica.

## FASE 2 — VERIFICAÇÃO DE ENTIDADE

Para cada fato com confiança ≥ 7:

```
FATO_ID: ___
1. A data pertence a ESTE objeto/pessoa? [sim|não]
2. O local é correto para ESTE evento?   [sim|não]
3. A função foi comprovada NESTE caso?   [sim|não]
4. Estou generalizando caso específico?  [sim|não]
5. A fonte sustenta a afirmação COMPLETA? [sim|não]
```

Se algum = NÃO → separar, qualificar ou rebaixar confiança.

## FASE 3 — DETECÇÃO DE EXAGERO RESIDUAL

Varrer todas as afirmações do pacote. Marcar qualquer uma que contenha:

- Superlativo absoluto ("o mais", "único", "nunca", "sempre", "impossível")
- Linguagem de mistério ("segredo", "proibido", "escondido", "chocante")
- Generalização indevida ("todo", "nenhum", "todos sabem")

Para cada marcação: a fonte sustenta o superlativo/generalização?

- Sim → manter
- Não → reescrever com qualificação

## FASE 4 — VERIFICAÇÃO DE INDEPENDÊNCIA DE FONTES

Para cada fato "confirmado" (confiança ≥ 9):

```
FONTE_A: ___ (origem: ___)
FONTE_B: ___ (origem: ___)
A e B são independentes? [sim|não]
  (Independente = não copiaram uma da outra, não citam a mesma fonte primária única)
```

Se NÃO independentes → rebaixar para confiança 7–8 (provável).

## FASE 5 — VERIFICAÇÃO DE ATUALIDADE

Para cada fato:

- A fonte é anterior a 5 anos? → Verificar se houve correção/retratação
- A fonte é anterior a 10 anos? → Buscar atualização obrigatória
- Se não encontrar atualização → registrar em lacunas: "Fonte de [ano]. Não encontrei atualização."

## FASE 6 — TESTE DE SUFICIÊNCIA PARA O FORMATO

```
FORMATO: {{SHORTS|LONGO}}
DURAÇÃO: {{duracao}}

Para SHORTS:
- Tenho 2-3 fatos com confiança ≥ 7? [sim|não]
- Tenho 1 mecanismo explicável em ~20 palavras? [sim|não]
- Tenho 1 consequência concreta? [sim|não]
- A pergunta central é respondível em {{duracao}}? [sim|não]

Para LONGO:
- Tenho fatos para 5+ capítulos? [sim|não]
- Cada capítulo tem 2+ fatos confirmados? [sim|não]
- A progressão entre capítulos é lógica? [sim|não]
```

Se algum = NÃO → pesquisar mais OU recomendar redução de escopo ao NARRACAOPRO.

## FASE 7 — DECISÃO

- Todas as fases passaram → `"aprovado_para_narracao": true`
- 1-2 falhas pontuais → corrigir, re-rodar fase específica
- 3+ falhas → nova iteração de pesquisa (máx. 3 total)
- Kill criteria → entregar com ressalvas, `"aprovado_para_narracao": false`

## REGISTRO INTERNO (não incluído no pacote)

Após cada execução:

- Quais consultas foram mais produtivas?
- Quais tipos de fonte falharam?
- Qual foi o erro mais comum (fusão, exagero, desatualização)?
- O que fazer diferente na próxima pesquisa?
