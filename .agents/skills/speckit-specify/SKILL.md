---
name: speckit-specify
description: |
  Criar spec.md (o quê/por quê) para feature Lumiera — fase Specify do Spec Kit. Use quando o usuário descreve uma feature nova antes de código. Triggers: speckit.specify, /speckit.specify, especificar feature, criar spec, user stories.
license: MIT
metadata:
  lumiera: true
  tasks: [ops]
  category: ops
---

# /speckit.specify

1. Ler `.specify/memory/constitution.md`.
2. Criar `specs/<###-slug>/spec.md` a partir de `.specify/templates/spec-template.md`.
3. Foco em user stories, FR, success criteria — **sem** stack técnica.
4. Se pedido vago → marcar `NEEDS CLARIFICATION` e sugerir `/speckit.clarify`.

Hub: [[skills/speckit-lumiera/SKILL]]