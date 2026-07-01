# Specs — Spec-Driven Development (Lumiera)

Pasta de especificações executáveis, no padrão [GitHub Spec Kit](https://github.com/github/spec-kit).

## Estrutura por feature

```text
specs/042-opencut-timeline/
├── spec.md      # O quê e por quê (sem stack)
├── plan.md      # Como (stack Lumiera)
├── tasks.md     # Checklist de implementação
└── quickstart.md  # Opcional — passos de teste manual
```

## Comandos para o agente (skills)

| Comando | Skill | Quando usar |
|---------|-------|-------------|
| `/speckit.constitution` | `speckit-constitution` | Início de projeto ou mudança de princípios |
| `/speckit.specify` | `speckit-specify` | Novo pedido de feature |
| `/speckit.clarify` | `speckit-clarify` | Antes do plano, se requisitos vagos |
| `/speckit.plan` | `speckit-plan` | Após spec clara |
| `/speckit.tasks` | `speckit-tasks` | Após plano validado |
| `/speckit.implement` | `speckit-implement` | Executar tasks.md |
| `/speckit.analyze` | `speckit-analyze` | Auditoria spec ↔ código |

Hub completo: `.agents/skills/speckit-lumiera/SKILL.md`

## Numeração

Use prefixo numérico de 3 dígitos: `001-`, `042-`, incrementando por feature.

## Brownfield

Este repositório já existe — não rode `specify init` na raiz. Use apenas `specs/` + `.specify/` já versionados.