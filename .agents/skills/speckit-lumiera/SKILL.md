> 🔗 [[MEMORIA-LUMIERA]] · [[skills/speckit-lumiera|speckit lumiera]] · [[SKILLS]]

---
name: speckit-lumiera
description: |
  Spec-Driven Development no Lumiera — fluxo GitHub Spec Kit adaptado (constitution → specify → clarify → plan → tasks → implement).
  Use em pedidos complexos, novas features, integrações ou refactors multi-arquivo. Triggers: speckit, spec driven, especificação, plano técnico, tasks, implementar feature, SDD.
license: MIT
metadata:
  lumiera: true
  tasks: [ops, overlay, script, metadata, ideas]
  formats: [SHORT, LONG]
  category: ops
  source: github/spec-kit
---

# Spec Kit — Lumiera (SDD)

Toolkit [GitHub Spec Kit](https://github.com/github/spec-kit) adaptado para brownfield Lumiera.

## Quando usar

| Situação | Usar SDD? |
|----------|-----------|
| Feature nova (UI, API, render, pipeline) | ✅ Sim |
| Bug simples 1 arquivo | ❌ Direto |
| Integração externa (MCP, API) | ✅ Sim |
| Ajuste de copy/estilo pontual | ❌ Direto |

## Artefatos

| Artefato | Caminho |
|----------|---------|
| Constitution | `.specify/memory/constitution.md` |
| Templates | `.specify/templates/*.md` |
| Specs | `specs/<###-nome>/spec.md` |
| Índice | `specs/README.md` |

## Fluxo (ordem obrigatória)

```
constitution → specify → clarify* → plan → tasks → analyze* → implement
                     * recomendado / opcional
```

### 1. `/speckit.constitution`

- Ler `.specify/memory/constitution.md`.
- Atualizar só se o usuário pedir novos princípios.
- Todo `plan.md` deve ter **Constitution Check** preenchido.

### 2. `/speckit.specify`

1. Escolher ID: próximo `specs/###-slug/` (ver pastas existentes).
2. Copiar estrutura de `.specify/templates/spec-template.md`.
3. Preencher **o quê e por quê** — sem escolher React vs Remotion ainda.
4. User stories com P1, P2… independentemente testáveis.
5. Marcar `[NEEDS CLARIFICATION: …]` onde faltar dado.

### 3. `/speckit.clarify`

Antes do plano, perguntar ou inferir:

- Formato SHORT vs LONG?
- Toca render, só dashboard, ou Python?
- Projeto exemplo para testar?

Gravar respostas em seção **Clarifications** no `spec.md`.

### 4. `/speckit.plan`

1. Template: `.specify/templates/plan-template.md`.
2. Stack real Lumiera: `dashboard-qanat/backend`, `frontend`, `remotion-renderer`, scripts Python.
3. Constitution Check — todos ☐ → ✅ ou justificar em Complexity Tracking.
4. Listar arquivos exatos a criar/editar.

### 5. `/speckit.tasks`

1. Template: `.specify/templates/tasks-template.md`.
2. Tasks com IDs, `[P]` se paralelo, `[USn]` por story.
3. Incluir: commit, restart backend, ajuda `?` se UI nova.
4. Última fase: `lumiera-ops` (commit + reinício).

### 6. `/speckit.analyze`

Cruzar `spec.md` ↔ `plan.md` ↔ `tasks.md`:

- FR sem task?
- Task sem FR?
- Violação constitution = **CRITICAL**

### 7. `/speckit.implement`

1. Ler `tasks.md`; executar em ordem de dependência.
2. Marcar `[x]` conforme conclui.
3. Após cada fase: commit + restart se backend.
4. Não pular constitution (legendas, ops).

## Comandos satélite (skills dedicadas)

- `speckit-constitution` — só princípios
- `speckit-specify` — só spec.md
- `speckit-clarify` — só clarificações
- `speckit-plan` — só plan.md
- `speckit-tasks` — só tasks.md
- `speckit-implement` — execução
- `speckit-analyze` — auditoria

## Integração Studio Agents

Bundle: `.agents/skill-bundles/dev-sdd.json` — injeta esta skill + `lumiera-ops` em tarefas `ops`.

## Referência upstream

- Repo: https://github.com/github/spec-kit
- Docs: https://github.github.io/spec-kit/
- Não executar `specify init` na raiz do Lumiera (brownfield).