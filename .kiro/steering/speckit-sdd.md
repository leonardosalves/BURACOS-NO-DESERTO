---
inclusion: manual
---

# Spec-Driven Development (Lumiera)

Para **features novas**, **integrações** ou **mudanças multi-arquivo**, use o fluxo Spec Kit antes de codar:

1. Ler `.specify/memory/constitution.md`
2. Skill hub: `.agents/skills/speckit-lumiera/SKILL.md`
3. Artefatos em `specs/<###-nome>/` (spec → plan → tasks)
4. Implementar via `/speckit.implement` ou seguindo `tasks.md`

## Atalhos

| Pedido do usuário         | Ação                                                                       |
| ------------------------- | -------------------------------------------------------------------------- |
| Feature nova / integração | `speckit-specify` → `speckit-plan` → `speckit-tasks` → `speckit-implement` |
| Requisitos vagos          | `speckit-clarify` primeiro                                                 |
| Só corrigir bug pequeno   | Pular SDD; ir direto ao código                                             |

## Não fazer

- `specify init` na raiz (brownfield — estrutura já existe)
- Pular commit/restart (constitution I)
