# Lumiera Constitution

Princípios vinculantes para desenvolvimento no Lumiera (Spec-Driven Development).
Baseado em [GitHub Spec Kit](https://github.com/github/spec-kit) e adaptado ao pipeline de vídeo.

**Version**: 1.0.0 | **Ratified**: 2026-07-01

## I. Ops automáticas (NON-NEGOTIABLE)

- Todo agente que alterar código **deve** commitar (`git add` + `git commit`) ao finalizar.
- Backend alterado (`dashboard-qanat/backend/**`) → reiniciar porta **3005** (`scripts/restart-backend.ps1`).
- **Não commitar** por padrão: `config_qanat.json`, `studio_agents_config.json`.
- Skill obrigatória: `.agents/skills/lumiera-ops/SKILL.md`.

## II. Legendas e overlays

- Legendas **nunca** cobertas por cards, gráficos ou overlays.
- Estilo premium: tipografia limpa, sombra/contorno, legibilidade em 9:16 e 16:9.
- Cards temáticos → preferir `lower-third`; dados → infográficos (`counter`, `bar-chart`, `timeline`).
- Catálogo HyperFrames + regras em `.agents/skills/hyperframes/SKILL.md`.

## III. YouTube, RPM e retenção

- Design visual alinhado ao nicho/RPM (tech/finance, history, nature).
- Shorts: VVSA, gancho nos 3s, funil Short→Longo (skills viral-youtube-shorts, viral-hooks).
- Metadados e upload: youtube-seo, social-publisher.

## IV. Qualidade de código

- Mudanças focadas — sem refator drive-by.
- Reutilizar funções e padrões existentes no arquivo antes de criar abstrações novas.
- Ler contexto ao redor antes de editar; diff mínimo que resolve o pedido.

## V. Spec-Driven Development (SDD)

Fluxo para features ou tarefas complexas (não para typos de uma linha):

1. **Constitution** — este arquivo; gates em todo `plan.md`.
2. **Specify** — `specs/<###-nome>/spec.md` (o *quê* e *por quê*, sem stack).
3. **Clarify** — ambiguidades resolvidas *antes* do plano.
4. **Plan** — `plan.md` com stack Lumiera real (backend, frontend, Remotion, Python).
5. **Tasks** — `tasks.md` com caminhos de arquivo e dependências.
6. **Implement** — executar tasks em ordem; commit por grupo lógico.
7. **Analyze** — consistência spec ↔ plan ↔ tasks antes de merge.

Templates: `.specify/templates/`. Skill hub: `.agents/skills/speckit-lumiera/SKILL.md`.

## VI. Segurança e configs

- API keys só em config local do usuário ou env — nunca hardcoded em commits.
- Não expor tokens em logs ou respostas ao usuário.

## Governance

- Conflitos entre spec e constitution → ajustar spec/plan, não diluir princípio.
- Amendments: PR + bump de versão neste arquivo.