# Tasks: Specificity Prompt Refactor

**Input**: `specs/048-specificity-prompt-refactor/spec.md`, `plan.md`
**Prerequisites**: plan.md aprovado, constitution check verde

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes)
- **[Story]**: US1, US2, …

## Phase 1: Setup

- [ ] T001 Criar branch ou comitar spec/plan.
- [ ] T002 Garantir pasta `specs/048-specificity-prompt-refactor/` com spec + plan.

## Phase 2: Foundational (blocking)

- [ ] T003 [US1] Backend: importar `stripAccents` de `shared/commonUtils.js` e atualizar `normalizeText` em `scenePromptSpecificity.js`.
- [ ] T004 [US1] Backend: criar novo arquivo de testes unitários `dashboard-qanat/backend/scenePromptSpecificity.test.js` e validar as regras básicas.

**Checkpoint**: Normalização com stripAccents validada por testes.

## Phase 3: User Story 2 (P2) 🎯 Polish

- [ ] T005 [US2] Backend: refatorar e reduzir o arquivo `scriptQuality/promptBuilders.js` separando schemas, diretrizes e regras repetitivas em funções ou sub-módulos para melhorar a manutenção.
- [ ] T006 [US2] Backend: testar a sintaxe de todos os arquivos modificados e rodar as suítes de testes (`scriptQualityEditorial`, `scriptQualityMediaType`, `scriptQualityDedupeVisual`, etc.)

**Checkpoint**: PromptBuilders refatorado e suite de testes rodando sem regressões.

## Phase 4: Ops & Finalize

- [ ] T007 Commit final + reiniciar os servidores backend.
- [ ] T008 Atualizar walkthrough final.
