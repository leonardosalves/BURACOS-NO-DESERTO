# Memória global do Lumiera Studio Agents

Preferências e decisões duráveis do estúdio (carregadas no modo Agentes).

## Regras globais (todos os formatos)
- Ancorar overlays à `scene_ref` da narração, não a percentuais cegos do vídeo.
- Variar tipo e posição entre overlays consecutivos.
- Editar aqui ou na aba Studio Agents — o dashboard lê as primeiras 4 linhas com `-`.

## Shorts (9:16)
- Gancho limpo até **1.5s** — sem overlays informativos no hook.
- Pattern interrupt visual a cada 8–12s.
- Legendas ≤8 palavras por chunk (`shorts-viral`).
- Listicle Short: máx. 2 overlays IA + HUD `rank-progress`; sem lower-third/kinetic/bar-chart.
- Overlays informativos ≥5s na tela quando possível.

## Longos (16:9)
- Gancho limpo até **5s** antes do primeiro overlay informativo.
- Gap mínimo **18s** entre overlays informativos (12s em listicle longo).
- BGM por bloco (`bgm_mappings`), não `single_bgm`.
- Chapter stingers + progress bar em documentários.
- Legendas `documentary` — frases completas.

## Obsidian
- Hub: [[MEMORIA-LUMIERA]]
- Por nicho: `memory/<slug>.md` — categorias `SHORT/` ou `LONG/` indicam escopo do padrão.

## Índice memória por nicho

- [[memory/agent-frameworks-reference]]
- [[memory/competitor-intelligence]]
- [[memory/curiosidades-e-fatos-surpreendentes]]
- [[memory/curiosidades-e-objetos-do-cotidiano]]
- [[memory/curiosidades]]
- [[memory/customized]]
- [[memory/engenharia-antiga]]
- [[memory/engenharia-curiosidade]]
- [[memory/engenharia]]
- [[memory/geral]]
- [[memory/google-gemini-sdk-reference]]
- [[memory/google-research-reference]]
- [[memory/historia]]
- [[memory/lumiera-code-map]]
- [[memory/mattpocock-skills]]
- [[memory/openmontage-lumiera]]
- [[memory/videoagent-lumiera]]

atualizado: 2026-07-02T05:24:19.931Z
