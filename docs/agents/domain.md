# Domain docs — Lumiera

## Before exploring, read

1. **`CONTEXT.md`** (raiz) — glossário e seams
2. **`.agents/memory/lumiera-code-map.md`** — mapa estrutural + APIs
3. **`.agents/MEMORIA-LUMIERA.md`** — hub Obsidian do estúdio
4. **`docs/adr/`** — decisões arquiteturais (quando existirem)
5. **`.specify/memory/constitution.md`** — princípios SDD

Layout: **single-context** (monorepo Lumiera, um CONTEXT global).

API compacta para agentes:

```http
GET http://127.0.0.1:3005/api/studio-agents/code-map?compact=text
```

## Vocabulary

Use os termos de `CONTEXT.md` (Creator, Clip Factory, SHORT/LONG, etc.) em issues, testes e ADRs.

## ADR conflicts

Se uma proposta contradiz ADR existente, cite explicitamente:

> _Contradiz ADR-0001 — mas vale reabrir porque…_

`/grill-with-docs` e `/domain-modeling` criam glossário/ADRs sob demanda.