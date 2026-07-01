---
name: speckit-tasks
description: |
  Gerar tasks.md acionável a partir do plan Lumiera. Triggers: speckit.tasks, /speckit.tasks, quebrar em tarefas, checklist implementação.
license: MIT
metadata:
  lumiera: true
  tasks: [ops]
  category: ops
---

# /speckit.tasks

**Pré-requisito**: `spec.md` + `plan.md` na mesma pasta `specs/<feature>/`.

1. Gerar `tasks.md` via `.specify/templates/tasks-template.md`.
2. Cada task: ID, arquivo(s), dependências, `[P]` se paralelo.
3. Incluir fase final: commit + `lumiera-ops`.

Hub: [[skills/speckit-lumiera/SKILL]]