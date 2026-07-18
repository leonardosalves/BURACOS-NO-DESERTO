# Feature Specification: Templates Remotion inteligentes + NARRADORPRO

**Feature Branch**: `047-intelligent-remotion-templates`  
**Created**: 2026-07-13  
**Status**: Complete (v1.4.0 — policy, anti-random, NARRADORPRO, native effects, identity frames, heatmap)  
**Input**: Seleção semântica de templates (não aleatória), limpeza de placeholders, policy na área de Render (efeitos, intro, end card, chapter, frame, subscribe mid), orquestração com NARRADORPRO, editor de timing completo para instâncias.

## Referências

- Plano detalhado: `specs/047-intelligent-remotion-templates/plan.md`
- Instrução orquestrador: `.agents/remotiontemplatesinstruction.md`
- Feature base: `specs/044-motion-scenes/`

## Princípio

**Semântica > volume.** Template só entra se a narração/fatos/policy pedirem. Placeholders de demo nunca chegam ao render. Asset da cena substitui mídia de exemplo.

## User Stories

### US1 — Policy na Render (P1)

Como editor, quero na área de Render ligar/desligar efeitos, intro, end card, chapter title, subscribe mid e frame, ou manter o modo legado.

### US2 — End card substitui brand outro (P1)

Como editor, ao ativar End Card Remotion, o vídeo final de logo + inscreva-se padrão não é anexado; o template End Card ocupa o final.

### US3 — Chapter Title entre blocos (P1)

Como editor, ao ativar Chapter Title, cada bloco recebe o template com o título do capítulo entre blocos.

### US4 — Efeitos cinematográficos reais (P1)

Como editor, ao ativar efeitos (Parallax, Film Burn, Vignette Pulse, …), o renderer aplica o efeito sobre o asset da cena — não um fullscreen de placeholder.

### US5 — NARRADORPRO orquestra conteúdo (P1)

Como sistema, o NARRADORPRO decide quote, lower third, chart, text, background e content-animation com dados da narração/pesquisa.

### US6 — Seleção por nicho (P1)

Como editor, na revisão da narração o catálogo do nicho define os candidatos; a IA não escolhe template de outro nicho nem por rotação cega.

### US7 — Subscribe mid em Shorts (P2)

Como editor, com toggle ativo em 9:16, Subscribe Reminder aparece no meio do vídeo.

### US8 — Frame de identidade (P2)

Como editor, posso ativar um frame full-duration; se o nicho ainda não tem frame, o controle fica desabilitado com a lógica pronta.

### US9 — Props limpos + asset (P1)

Como viewer, vejo dados reais e o asset da cena no template, nunca “Jane Smith” ou gradiente Mountain.

### US10 — Inspector completo no Timing (P2)

Como editor, no Timing Studio edito todos os props, mídia, layout e intensidade do template da instância (não o source global).

## Success Criteria

- SC-001: Zero boost por índice modular de triggers genéricos em produção “smart”
- SC-002: Policy `end_card` omite logo_final_
- SC-003: `sceneAsset` bound em image-media e cinematic quando a cena tem asset
- SC-004: Logs de decisão (`studio_template_decision`) auditáveis
- SC-005: Testes de policy e binder verdes
- SC-006: Commits por fase

## Out of Scope

- Arte final de todos os frames de nicho
- Reescrita manual de 100% dos sources no dia 1
- Edição de sourceCode no Timing editor
