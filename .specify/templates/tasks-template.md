# Tasks: [FEATURE NAME]

**Input**: `specs/[###-feature-name]/spec.md`, `plan.md`
**Prerequisites**: plan.md aprovado, constitution check verde

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes)
- **[Story]**: US1, US2, …
- Incluir caminhos absolutos ou relativos ao repo Lumiera

## Phase 1: Setup

- [ ] T001 Criar branch `feat/[###-feature-name]`
- [ ] T002 [P] Garantir pasta `specs/[###-feature-name]/` com spec + plan

## Phase 2: Foundational (blocking)

- [ ] T003 [P] Backend: rotas/API se necessário (`dashboard-qanat/backend/...`)
- [ ] T004 [P] Tipos/config frontend se necessário (`App.tsx`, tipos)

**Checkpoint**: infra pronta para user stories

## Phase 3: User Story 1 (P1) 🎯 MVP

- [ ] T005 [US1] [descrição + arquivo]
- [ ] T006 [US1] [...]

**Checkpoint**: US1 testável no dashboard ou render

## Phase 4+: User Stories adicionais

[...]

## Phase N: Polish

- [ ] TXXX [P] Ajuda `?` / `sectionHelpContent` se UI nova
- [ ] TXXX Commit + `restart-backend.ps1` se backend
- [ ] TXXX Atualizar `.agents/MEMORIA-LUMIERA.md` se decisão arquitetural

## Dependencies

- US1 antes de US2 se [razão]
- Render só após backend pass-through validado