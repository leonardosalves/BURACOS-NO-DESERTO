---
name: grill-with-docs
description: |
  Entrevista implacável para afiar plano/design; cria ADRs e glossário no caminho.
  Triggers Lumiera: grill, entrevista requisitos, afiar spec, antes de feature grande.
disable-model-invocation: true
metadata:
  lumiera: true
  source: mattpocock/skills
  tasks: [ops]
  category: ops
---

Run a `/grilling` session, using the `/domain-modeling` skill.

## Lumiera

- **Complementa** `speckit-clarify` — use grill antes de `speckit-specify` em features ambíguas
- **Saídas:** `CONTEXT.md`, `docs/adr/`, glossário em `.agents/memory/`
- **Não duplica** o fluxo `specify → plan → tasks` — grill esclarece; speckit formaliza
