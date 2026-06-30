> 🔗 [[MEMORIA-LUMIERA]] · [[skills/viral-short-form|Viral Short Form]] · [[SKILLS]]

---
name: viral-short-form
description: |
  Framework viral para Shorts/TikTok/Reels — curadoria de histórias, 8 tipos de gancho, wow-facts e power-ups.
  Adaptado do workflow n8n de Lucas Walter (1.8M+ views IG). Use ao gerar ideias, hooks e roteiros Short no Lumiera.
  Triggers: viral, short form, gancho, hook angle, wow-facts, TikTok script, Reels, n8n script.
---

# Viral Short-Form (Lumiera)

Base: [Reddit r/n8n — AI automation for viral scripts](https://www.reddit.com/r/n8n/comments/1loafvx/) + [GitHub workflow](https://github.com/lucaswalter/n8n-ai-workflows/blob/main/short_form_video_script_generator.json).

Integrado em `scriptQuality.js` como `VIRAL_SHORT_FORM_REINFORCEMENT` e `buildViralIdeasAddendum()`.

## Curadoria (escolha 1 por vídeo)

| Categoria | Quando usar |
|-----------|-------------|
| impactful | Consequência real na vida das pessoas |
| practical | Dá para aplicar hoje |
| provocative | Desafia crença comum — com fatos |
| astonishing | Dado ou imagem que parece impossível |

**Descartar:** ad-driven, puramente político, sem substância factual.

## 8 tipos de gancho (≤10 palavras)

| ID | Tipo | Exemplo PT-BR |
|----|------|---------------|
| question | Pergunta | "Por que ninguém fala disso?" |
| shock | Choque | "Isso quase derrubou a Boeing." |
| problem_solution | Problema/Solução | "A janela quadrada matava passageiros." |
| before_after | Antes/Depois | "Antes: quadrado. Depois: oval." |
| breaking | Urgência | "Em 1985, a regra mudou de um dia pro outro." |
| challenge | Desafio | "Adivinha qual avião ainda voa com janela quadrada." |
| secret | Segredo leve | "A FAA escondeu o relatório por anos." |
| personal | Impacto pessoal | "Você já sentou ao lado disso sem saber." |

Regras: voz ativa, gatilho emocional, número quando couber. O gancho **anuncia** o payoff.

## Estrutura 30–50s (Lumiera: 80–130 palavras)

```
1. Gancho (≤10 palavras)
2. Uma frase de contexto
3. 3–5 wow-facts (números, datas, analogias)
4. Por que importa / risco hoje (1–2 frases)
5. Fechamento declarativo (mic drop)
```

## Power-ups (1–2 por roteiro)

- **Authority bump** — cite fonte/órgão em 1 frase
- **Hook spice** — número + consequência no gancho
- **Then-vs-now** — contraste temporal
- **Stat escalation** — cada fato sobe a aposta
- **Real-world fallout** — "hoje isso significa que..."
- **Zoom-out** — liga micro ao macro no final
- **Rhythm check** — frases de 3–5 palavras alternadas com explicação

## Processo de ideação (3 passos)

1. Esboçar 3 ganchos candidatos (`hook_candidates`)
2. Escolher o melhor (`hook_angle` + `hooks`)
3. Planejar wow-facts verificáveis (`wow_facts_preview`)

## Fechamento — regra Lumiera

Combina com skill `ugc-scriptwriter`:

| Permitido | Proibido |
|-----------|----------|
| Mic drop declarativo | "Você prefere…?" |
| Pergunta com stakes reais no tema | "Comenta aí" / "O que achou?" |
| Consequência moderna factual | Pergunta binária sem payoff |

**Bom:** "Por isso toda janela de avião hoje é oval."

**Ruim:** "Você prefere voar na janela redonda?"

## Workflow Lumiera

1. Script Master → ideias com `viral_category`, `hook_angle`, `hooks`
2. Pesquisa web + NotebookLM → fatos verificáveis
3. Fase 1 narração → framework viral + UGC
4. `sanitizeLameEndingQuestions()` remove finais fracos automaticamente