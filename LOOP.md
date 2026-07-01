# Loop Configuration — Lumiera Studio

> [Loop Engineering](https://github.com/cobusgreyling/loop-engineering) integrado ao Studio Agents.
> UI: **Dashboard → Studio Agents → Loops**

## Active Loops

| Pattern | Cadence | Status | Command / Trigger |
|---------|---------|--------|-------------------|
| Changelog Drafter | 1d ou antes de release | L1 (report + draft) | Ver aba Loops / Grok `/loop` |
| Studio Agents ops | sob demanda | L1 | VideoAgent + lumiera-ops |

## Lumiera Bridges

| Primitive | Lumiera |
|-----------|---------|
| Skills | `.agents/skills/` + Hermes bundles |
| Memory / STATE | `STATE.md`, `.agents/memory/` |
| MCP | NotebookLM, Canva (ver `docs/safety.md`) |
| Human gate | Workshop skills, upload YouTube, config local |
| Verify | `loop-verifier` skill + quality capture no Studio Agents |

## Human Gates (this project)

- Breaking changes em API/render pipeline → revisão humana
- Motores TTS, Fish Speech, ComfyUI → human gate
- `config_qanat.json`, `studio_agents_config.json` → **nunca** auto-edit
- Publicação social / YouTube → sempre humano
- Primeiras 3 releases com este loop: humano aprova draft completo

## Budget & Cadence

- Max sub-agent spawns por run: 2 (scanner + drafter ou drafter + verifier)
- Preferir rodar após merges estabilizarem (fim do dia)
- Ver `loop-budget.md` e skill `loop-budget`

## State & Memory

- Hub state: **`STATE.md`** (prioridades, watch list, critique)
- Pattern state: `changelog-drafter-state.md`
- Studio memory: `.agents/memory/` (Hermes promote)

## Output Convention

- Draft: `RELEASE_NOTES_DRAFT.md`
- Estado: `STATE.md` + `changelog-drafter-state.md`
- Log: `loop-run-log.md`
- Memória estúdio: `.agents/memory/videoagent-lumiera.md`

## Safety & MCP

- Políticas: `docs/safety.md`
- MCP não obrigatório para changelog-drafter; NotebookLM opcional para pesquisa de release

## Links

- Pattern: [changelog-drafter](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/changelog-drafter.md)
- Audit: `npx @cobusgreyling/loop-audit . --suggest`
- Studio Agents Hermes: `.agents/skills/studio-agents-hermes/SKILL.md`