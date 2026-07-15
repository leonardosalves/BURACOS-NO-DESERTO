# Relatório de Refatoração e Notas de Design — Lumiera Backend

Este documento acompanha as refatorações planejadas e executadas nos Lotes 2 e 3 do Lumiera Backend.

---

## 1. Bugs Latentes Encontrados (Lote 3)

### 🐛 Bug #1: Chaves Incorretas em `buildIdeaContextHeader`
* **Local**: `dashboard-qanat/backend/scriptQuality/promptBuilders.js`
* **Problema**: Os chamadores `buildNarrationOnlyPrompt` e `buildCreatorFullScriptPrompt` enviam as propriedades `listTopic` e `blockCount`, mas a assinatura do método espera `listicleTopic` e `listicleBlockCount`. Isso causa cabeçalhos com tema vazio e contagem de blocos presa no default (22) nos prompts enviados para a IA.
* **Status**: **Pendente de Correção** (Aguardando aplicação pelo Fable).

### 🐛 Bug #2: Parâmetros Mortos em `buildVisualPromptsJsonSchema`
* **Local**: `dashboard-qanat/backend/scriptQuality/promptBuilders.js`
* **Problema**: O método recebe `{ blockCount = 5, isListicle = false, listicleRank = 20 }` mas a string retornada é estática e não interpola nada.
* **Status**: **Pendente de Limpeza** (Decidir com o dono se deve ser removido ou implementado).

### 🐛 Bug #3: Typo em Prompt de Escrita
* **Local**: `dashboard-qanat/backend/scriptQuality/promptBuilders.js`
* **Problema**: Contém a palavra `"TAREFFA:"` com duplo 'F' em `buildVisualPromptsFromNarrationPrompt`.
* **Status**: **Pendente de Correção**.

---

## 2. Pendências de Comportamento e Regras de Negócio

### 🔍 Regex de Detecção de Fallback em `scenePromptSpecificity.js`
* **Problema**: O método `isSceneSpecificFallbackPrompt(prompt)` usa a regex `/Photorealistic (?:2k |cinematic ).*Documentary science style, dramatic lighting/i`. No entanto, prompts gerados para vídeos começam com `Photorealistic ${focal}` (onde focal pode ser `macro close-up of...` ou `wide aerial shot of...`). Esses prompts de vídeo gerados pelo fallback não são detectados como tal porque o focal não é detectado pela regex.
* **Proposta**: Atualizar a detecção para:
  ```javascript
  export function isSceneSpecificFallbackPrompt(prompt = "") {
    return /^Photorealistic /i.test(String(prompt).trim()) &&
      FALLBACK_STYLE_MARKER.test(prompt);
  }
  ```
* **Status**: **Pendente de Aprovação** para aplicação pelo Fable.

---

## 3. TODOs de Performance (Lote 2)

### ⚡ Cache em `youtubeChannelAnalytics.js`
* **Problema**: A chamada global síncrona em `getCachedPayload` pode causar latência sob concorrência intensa.
* **Recomendação**: Converter para leitura e filtragem assíncrona ou otimizar em memória.
