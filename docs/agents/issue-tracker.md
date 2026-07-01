# Issue tracker — Lumiera

Híbrido: **Spec Kit** para features + **local markdown** para issues rápidas. GitHub Issues opcional.

## Primary — Spec Kit (features)

| Artefato | Caminho |
|----------|---------|
| Spec | `specs/<###-feature>/spec.md` |
| Plan | `specs/<###-feature>/plan.md` |
| Tasks | `specs/<###-feature>/tasks.md` |

Skills `speckit-*` e `code-review` (eixo Spec) leem daqui. Branch/commit deve referenciar o slug da spec.

## Secondary — Local markdown (mattpocock)

Issues e PRDs rápidos em `.scratch/`:

- `.scratch/<feature-slug>/PRD.md`
- `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- `Status:` no topo do arquivo (ver `triage-labels.md`)
- Comentários em `## Comments` no final do arquivo

Skills `to-prd`, `to-issues`, `triage`, `qa` usam este fluxo quando não há spec em `specs/`.

## Optional — GitHub Issues

Remote: `github.com/leonardosalves/BURACOS-NO-DESERTO`

```powershell
gh issue view 123
gh issue create --title "..." --body "..."
```

**PRs como request surface:** não — triage só em issues/specs locais.

## Fetch workflow

1. Referência `#NNN` em commit → `gh issue view NNN` (se GitHub) ou path em `.scratch/`
2. Branch `feature/foo` → `specs/*-foo/spec.md` ou `.scratch/foo/PRD.md`
3. Usuário passa path explícito → ler arquivo

## Publish workflow

- Feature grande → criar pasta em `specs/` via `speckit-specify`
- Issue pontual → `.scratch/<slug>/issues/01-<slug>.md`