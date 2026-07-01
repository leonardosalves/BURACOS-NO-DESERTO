# Loop Safety — Lumiera

Políticas para loops de agente no estúdio Lumiera.

## Denylist (nunca auto-merge / auto-fix)

- `config_qanat.json`, `studio_agents_config.json` — config local do Leo
- Credenciais, tokens API, `.env` com secrets
- Renders em andamento / filas de pipeline ativas
- Deletes em massa de projetos ou assets de mídia

## Human gates obrigatórios

- Breaking changes em API do backend (`dashboard-qanat/backend/server.js`)
- Mudanças em motores TTS (Kokoro, Chatterbox, Fish Speech)
- Publicação YouTube / upload multi-plataforma
- Promote de aprendizados do Studio Agents para memória global
- Aplicação de patches no skill workshop sem revisão

## MCP / conectores

- NotebookLM MCP — apenas leitura/pesquisa; confirmação humana para `studio_create`
- Canva MCP — assets de thumbnail; sem publicação automática
- Fish Speech / ComfyUI — serviços locais; não expor portas publicamente

## Kill switch

- Label/issue: `loop-pause-all`
- UI: Studio Agents → Loops → pausar via `loop-budget.md`
- Retomar só após limpar flag em `STATE.md`

## Semana 1 (L1)

- Report-only: atualizar STATE e rascunhos, **sem** commit automático
- L2+: fixes assistidos com verifier + lumiera-ops (commit explícito)