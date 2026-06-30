---
name: ugc-scriptwriter
description: |
  Roteiros UGC/narração autêntica para Shorts e vídeos Lumiera — voz falada, específica, sem tom de IA.
  Use ao gerar ou revisar narrative_script, narração de listicle, hooks e CTAs do Script Master.
  Triggers: roteiro, narração, UGC, humanizar, tom natural, script Shorts, talking head, sem robô.
---

# UGC Scriptwriter (Lumiera)

Adaptado do [Motion-Creative/ugc-scriptwriter](https://github.com/Motion-Creative/skills/tree/main/ugc-scriptwriter) para narração documental/Shorts em PT-BR.

## Princípios (obrigatório)

| Princípio | Na prática |
|-----------|------------|
| Autenticidade | Parece alguém contando, não lendo release |
| Especificidade | Nomes, datas, números, cenas — nunca adjetivo vazio |
| Conversacional | Frases curtas; teste em voz alta |
| Foco | Uma tese; 2–3 fatos fortes no Short |
| Payoff real | O final entrega o que o gancho prometeu |

## Voz certa vs errada

**Certo:** "Depois de três mil testes, o metal estourou exatamente na quina da janela."

**Errado:** "Você prefere voar na janela redonda?" / "Comenta aí qual te surpreendeu mais!"

## Arco emocional (Shorts 30–50s)

```
Gancho (reconhecimento) → Problema (1 frase) → Virada (fato) → Prova (dado) → Fechamento (declarativo)
```

## Fechamentos PROIBIDOS

- Perguntas vazias ao espectador: "Você prefere…?", "Qual você escolheria…?", "O que achou?"
- CTAs de engajamento forçado: "Comenta", "Deixa o like", "Marca alguém"
- Perguntas binárias sem payoff: "Redonda ou quadrada?"

## Fechamentos BONS

- Frase declarativa que fecha o loop do gancho
- Ironia ou consequência moderna: "Por isso hoje toda janela de avião é oval."
- Mic drop factual: número, nome, ano — e ponto final.

## Workflow Lumiera

1. Pesquisar fatos verificáveis (NotebookLM + pesquisa web com fontes)
2. Escrever gancho que anuncia payoff real
3. Corpo: 1 fato forte por bloco/item
4. Revisar em voz alta — cortar o que tropeça
5. Final declarativo, nunca pergunta de comentário

## Comprimento

| Formato | Palavras | Duração |
|---------|----------|---------|
| Shorts | 65–130 | 30–50s |
| Shorts Top 3 | 65–95 | 30–45s |
| Longo | 1500–3000 | 10–20 min |

Quando em dúvida, corte.

## Framework viral (n8n — skill `viral-short-form`)

Para Shorts, combine este skill com o framework viral:

- **Curadoria:** impactful | practical | provocative | astonishing
- **8 ganchos:** question, shock, problem_solution, before_after, breaking, challenge, secret, personal
- **Corpo:** 3–5 wow-facts com números antes do payoff
- **Power-ups:** authority bump, then-vs-now, stat escalation (1–2 por roteiro)

O post original sugere CTA com pergunta forward-looking; no Lumiera priorizamos **mic drop declarativo**. Pergunta final só se tiver stakes reais no tema — nunca binária vazia.