---
inclusion: fileMatch
fileMatchPattern: ["dashboard-qanat/**", "remotion-renderer/**", "scripts/**"]
---

# Ponytail dev — Lumiera (código)

Antes de escrever código novo, suba esta escada e pare no primeiro degrau que resolver:

1. **Precisa existir?** — não invente feature além do pedido (YAGNI).
2. **Já existe no repo?** — reutilize `server.js`, módulos em `backend/`, componentes em `frontend/src/`.
3. **Stdlib / API Node?** — `fs`, `path`, fetch nativo; evite dependência nova.
4. **Já instalado no projeto?** — Remotion, Express, skills em `.agents/skills/`.
5. **Uma função / um endpoint?** — prefira estender o módulo certo a criar camada paralela.
6. **Só então** o mínimo que funciona.

## Leitura antes de editar

- `GET /api/studio-agents/code-map` ou `.agents/memory/lumiera-code-map.md` — mapa de rotas.
- Com **codebase-memory-mcp**: `search_graph` / `trace_path` em vez de ler `server.js` inteiro.
- Não duplicar lógica entre `dashboard-qanat` e `dashboard-premium` sem necessidade.

## Nunca cortar

- Validação de entrada, UTF-8/mojibake (`textEncoding.js`), auth de API keys.
- Commits e restart backend após mudança (`.cursor/rules/lumiera-ops.mdc`).
- Testes manuais em projeto real quando tocar Creator/Timeline/Render.

## Anti-patterns

- Novo arquivo "helper" de 5 linhas — coloque no módulo vizinho.
- Refactor "de limpeza" fora do escopo do ticket.
- Carregar skill inteira no prompt — usar bundle + `?ref=` sob demanda.
