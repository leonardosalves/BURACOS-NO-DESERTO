> 🔗 [[MEMORIA-LUMIERA]] · [[skills/lumiera-ops|lumiera ops]] · [[SKILLS]]

---

name: lumiera-ops
description: |
Checklist operacional Lumiera: commit automático após mudanças e reinício de backend/frontend quando necessário.
Use em TODA tarefa que altere código — não espere o usuário pedir "commita" ou "reinicia".
Triggers: commit, reiniciar, restart, servidor, backend, porta 3005, finalizar tarefa, ops.
---

# Lumiera Ops (obrigatório)

## Ao terminar qualquer implementação

1. **Backend** — use o script certo (evita derrubar servidor saudável):
   - Código em `dashboard-qanat/backend/**` alterado → `.\scripts\restart-backend.ps1 -Force`
   - Só garantir que está no ar → `.\scripts\ensure-backend.ps1`
2. **Reiniciar** Vite (5176) se tocou em proxy/API config
3. **Commit** com `git add` + `git commit` — nunca deixar diff pendente
4. Não commitar por padrão: `config_qanat.json`, `studio_agents_config.json` (config local do Leo)
5. Watchdog permanente (1× no PC): `.\scripts\install-lumiera-startup.ps1`

## Scripts

```powershell
.\scripts\restart-backend.ps1 -Force   # após mudar backend
.\scripts\ensure-backend.ps1           # só sobe se offline
.\scripts\status-lumiera.ps1           # diagnóstico
```

## Regra de ouro

> O usuário não deve repetir "commita e reinicia". Isso é padrão automático do agente.
