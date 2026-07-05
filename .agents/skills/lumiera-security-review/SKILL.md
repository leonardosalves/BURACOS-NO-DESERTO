> 🔗 [[MEMORIA-LUMIERA]] · [[skills/lumiera-security-review|lumiera security review]] · [[SKILLS]]

---

name: lumiera-security-review
description: |
Revisão de segurança do backend Lumiera antes de merge ou deploy.
Use ao alterar server.js, rotas API, auth, uploads, MCP keys ou CORS.
Triggers: security review, revisar segurança, API keys, CORS, server.js, upload.
metadata:
lumiera: true
tasks: [ops]
category: ops
---

# Lumiera Security Review

Checklist read-only para `dashboard-qanat/backend/server.js` e módulos `*Routes.js`.

## Quando usar

- PR ou commit que toca rotas `/api/*`
- Novo endpoint de upload ou execução de comando
- Mudança em `.cursor/mcp.json` ou secrets
- Antes de expor o dashboard na rede local

## Checklist (bloquear merge se falhar crítico)

### Crítico

- [ ] **Sem secrets no git** — API keys em `.cursor/mcp.json`, `.env`, `config_qanat.json` não devem ir para commits públicos
- [ ] **Path traversal** — rotas que leem/escrevem arquivos validam `activeProject` e rejeitam `..`, paths absolutos e caracteres inválidos
- [ ] **Command injection** — `exec`, `spawn`, `child_process` não interpolam input do usuário sem allowlist
- [ ] **eval / Function** — ausentes em código de produção
- [ ] **CORS** — `cors()` não está `origin: '*'` em rotas com credenciais sensíveis (verificar `server.js`)

### Alto

- [ ] **Uploads** — limite de tamanho, extensão/MIME allowlist, destino dentro do workspace do projeto
- [ ] **NotebookLM login** — `POST /api/notebooklm/login` não expõe tokens no response body
- [ ] **Rate limit** — rotas caras (`/api/ai/*`, render) têm proteção ou são localhost-only
- [ ] **Error leakage** — respostas 500 não vazam stack trace completo para o frontend em produção

### Médio

- [ ] **Dependências** — `npm audit` sem high/critical novos no backend
- [ ] **Headers** — respostas estáticas/API sem `X-Powered-By` desnecessário
- [ ] **Logs** — `.lumiera-logs/` não grava API keys

## Arquivos prioritários

| Arquivo                                        | Risco                            |
| ---------------------------------------------- | -------------------------------- |
| `dashboard-qanat/backend/server.js`            | Monólito — rotas, uploads, spawn |
| `dashboard-qanat/backend/notebooklmService.js` | Auth externa, paths              |
| `.cursor/mcp.json`                             | API keys MCP                     |

## Saída esperada

```markdown
## Security Review — <branch ou arquivo>

**Veredito:** PASS | PASS com ressalvas | FAIL

### Crítico

- ...

### Recomendações

1. ...
```

## Não altera roteiro

Esta skill **não** modifica Creator, Flow Lab, prompts nem pipeline de narração — só audita código de infraestrutura.
