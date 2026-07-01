> 🔗 [[MEMORIA-LUMIERA]] · [[skills/speckit-implement|speckit implement]] · [[SKILLS]]

---
name: speckit-implement
description: |
  Executar tasks.md do Spec Kit no Lumiera — implementação ordenada com commit/restart. Triggers: speckit.implement, /speckit.implement, executar plano, implementar spec.
license: MIT
metadata:
  lumiera: true
  tasks: [ops]
  category: ops
---

# /speckit.implement

**Pré-requisito**: `specs/<feature>/tasks.md`.

1. Executar tasks em ordem; marcar `[x]` no arquivo.
2. Respeitar `.specify/memory/constitution.md` (legendas, ops).
3. Após backend: `scripts/restart-backend.ps1`.
4. Commit ao final de cada grupo lógico — skill `lumiera-ops`.

Hub: [[skills/speckit-lumiera/SKILL]]