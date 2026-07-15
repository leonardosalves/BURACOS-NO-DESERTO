# Implementation Plan: Specificity Prompt Refactor

**Branch**: `048-specificity-prompt-refactor` | **Date**: 2026-07-15 | **Spec**: `specs/048-specificity-prompt-refactor/spec.md`

## Summary

Refatoração dos utilitários de validação e normalização de especificidade visual de cenas no arquivo `scenePromptSpecificity.js` para consumir o helper `stripAccents` centralizado em `shared/commonUtils.js` e compilar expressões de forma otimizada. Adicionalmente, modularizar as regras e strings de templates gigantes em `scriptQuality/promptBuilders.js` para reduzir tamanho e melhorar a clareza e manutenção.

## Technical Context

**Backend**: `dashboard-qanat/backend/scenePromptSpecificity.js`, `dashboard-qanat/backend/scriptQuality/promptBuilders.js`

## Constitution Check

*GATE: deve passar antes de implementar. Ver `.specify/memory/constitution.md`.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| I. Ops (commit/restart) | ✅ Passa | Commits parciais serão realizados. O backend será reiniciado autonomamente. |
| II. Legendas/overlays | ✅ Passa | Nenhuma alteração de legendas nesta refatoração. |
| III. RPM/retenção | ✅ Passa | Os prompts e regras virais de scripts serão preservados integralmente. |
| IV. Código focado | ✅ Passa | Apenas os arquivos relacionados a promptBuilders e scenePromptSpecificity serão modificados. |
| V. SDD artifacts | ✅ Passa | Spec + Plan presentes. |
| VI. Segurança | ✅ Passa | Sem chaves ou credenciais expostas. |

## Project Structure

### Documentation (this feature)

```text
specs/048-specificity-prompt-refactor/
├── spec.md
├── plan.md          # this file
└── tasks.md         # from /speckit.tasks
```

## Proposed Changes

### [Component: Specificity & Prompt Builders]

#### [MODIFY] [scenePromptSpecificity.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/scenePromptSpecificity.js)
* Importar e reutilizar `stripAccents` do compartilhado `commonUtils.js`.
* Otimizar `normalizeText` para delegar à função unificada e aplicar `.toLowerCase()`.

#### [MODIFY] [promptBuilders.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/scriptQuality/promptBuilders.js)
* Extrair as regras duplicadas, estruturas repetitivas de prompts e constantes de JSON Schema para variáveis centralizadas no topo ou funções isoladas para reduzir o tamanho.

#### [NEW] [scenePromptSpecificity.test.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/scenePromptSpecificity.test.js)
* Escrever testes unitários específicos para validar que a normalização e detecção de prompts funciona corretamente após a refatoração.

## Verification Plan

### Automated Tests
- Executar o novo arquivo de testes unitários: `node --test dashboard-qanat/backend/scenePromptSpecificity.test.js`
- Executar a suíte de testes de roteiro:
  - `node --test dashboard-qanat/backend/scriptQualityEditorial.test.js`
  - `node --test dashboard-qanat/backend/scriptQualityMediaType.test.js`
  - `node --test dashboard-qanat/backend/scriptQualityDedupeVisual.test.js`
  - `node --test dashboard-qanat/backend/scriptQualityPov.test.js`
  - `node --test dashboard-qanat/backend/scriptQualityHistoricalWitness.test.js`
- Executar `node --check` em cada arquivo.
