# Memória global do Lumiera Studio Agents

Preferências e decisões duráveis do estúdio (carregadas no modo Agentes).

## Regras globais (todos os formatos)

- Ancorar overlays à `scene_ref` da narração, não a percentuais cegos do vídeo.
- Variar tipo e posição entre overlays consecutivos.
- Editar aqui ou no Obsidian — o Lumiera lê todas as linhas `-` em **Regras globais** + **Shorts** ou **Longos** (conforme o formato do vídeo).

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
- **Aprendizado manual:** em qualquer `memory/<nicho>.md`, adicione a seção `## Notas do estúdio` com bullets `-`. O wizard e os agentes leem automaticamente.
- **Referências** (`competitor-intelligence`, etc.) entram nos prompts de **ideias** quando o nicho combina.

## Índice memória por nicho

- [[memory/agent-frameworks-reference]]
- [[memory/cocoloop-skills-curated]]
- [[memory/cocoloop-skills-rejected]]
- [[memory/comparacao-engenharia-moderna-x-antiga-origem]]
- [[memory/competitor-intelligence]]
- [[memory/curiosidade-engenharia-brasil]]
- [[memory/curiosidade-engenharia]]
- [[memory/curiosidades-e-fatos-surpreendentes]]
- [[memory/curiosidades-e-objetos-do-cotidiano]]
- [[memory/curiosidades]]
- [[memory/customized]]
- [[memory/deep-research-reports]]
- [[memory/engenharia-antiga-curiosidade]]
- [[memory/engenharia-antiga-curioso]]
- [[memory/engenharia-antiga]]
- [[memory/engenharia-curiosidade]]
- [[memory/engenharia-japao]]
- [[memory/engenharia-medieval]]
- [[memory/engenharia-tailandesa]]
- [[memory/engenharia]]
- [[memory/geral]]
- [[memory/google-gemini-sdk-reference]]
- [[memory/google-research-reference]]
- [[memory/historia-da-tecnologia]]
- [[memory/historia]]
- [[memory/lumiera-architecture-overview]]
- [[memory/lumiera-backend-map]]
- [[memory/lumiera-code-map]]
- [[memory/lumiera-frontend-map]]
- [[memory/lumiera-remotion-map]]
- [[memory/mattpocock-skills]]
- [[memory/openmontage-lumiera]]
- [[memory/video-reference-analyses]]
- [[memory/videoagent-lumiera]]

atualizado: 2026-07-22T21:42:21.098Z
