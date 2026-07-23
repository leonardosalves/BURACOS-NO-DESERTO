---
inclusion: always
---

# Lumiera — Ops obrigatórias (SEMPRE)

O agente NUNCA encerra um turno com código alterado sem executar este checklist:

## 1. Commit (obrigatório)

Após **qualquer** alteração em arquivos do repositório (código, regras, skills, docs do projeto):

1. `git add` nos arquivos alterados pelo agente (não incluir configs locais do usuário: `config_qanat.json`, `studio_agents_config.json`, a menos que o usuário peça).
2. `git commit` com mensagem clara em português ou inglês.
3. Informar o hash/mensagem do commit na resposta.

**Proibido:** deixar diff pendente e pedir ao usuário para commitar.

## 2. Build Frontend e Reiniciar servidores (OBRIGATÓRIO PARA QUALQUER AGENTE)

Qualquer agente DEVE executar o checklist abaixo sempre que alterar o Frontend ou Backend:

| Área                     | Arquivos alterados            | Ação OBRIGATÓRIA (Qualquer Agente)                                                                                                                                                                                                                                                                                            |
| ------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend / Interface** | `dashboard-qanat/frontend/**` | 1. **`cd dashboard-qanat/frontend; npm run build`** (OBRIGATÓRIO para atualizar o pacote de produção em `dist/` servido pelo aplicativo)<br>2. **`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restart-backend.ps1 -Force`** (OBRIGATÓRIO para o backend carregar os novos arquivos de produção na porta 3005) |
| **Backend**              | `dashboard-qanat/backend/**`  | **`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restart-backend.ps1 -Force`** (reiniciar backend na porta 3005)                                                                                                                                                                                                |

### Comandos (Windows / PowerShell)

Frontend Build + Backend Restart:

```powershell
cd "dashboard-qanat/frontend"; npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restart-backend.ps1 -Force
```

## 3. Ordem de execução ao finalizar tarefa

1. Implementar / corrigir
2. **Build Frontend (`npm run build` em `dashboard-qanat/frontend`)** — SE alterou qualquer arquivo de frontend
3. Reiniciar backend / servidores afetados
4. Commit (`git add` + `git commit`)
5. Resumir para o usuário (o que mudou + build + commit + servidores reiniciados)

## 4. Leitura obrigatória

Antes de trabalhar no Lumiera, QUALQUER agente DEVE ler `.agents/AGENTS.md` (seção 2 e 6).
