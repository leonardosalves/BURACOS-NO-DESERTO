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

0. **Verificar erros** — SEMPRE antes de entregar:
   - `.\scripts\ensure-lumiera.ps1` (backend 3005 + frontend 5176)
   - Se falhar: ler `.lumiera-logs\pm2-backend-error.log` (modo PM2) ou `backend-stderr.log`
   - Corrigir causa (porta, dependência, proxy, crash) e rodar ensure de novo
1. **Backend** — preferir **modo PM2** (estável, auto-reinicio):
   - Instalar 1× no PC do Leo: `.\scripts\install-lumiera-pm2.ps1`
   - Código em `dashboard-qanat/backend/**` alterado → `.\scripts\restart-backend.ps1 -Force` (PM2 faz reload gracioso; bloqueia se `server.js` tiver erro de sintaxe)
   - Só garantir que está no ar → `.\scripts\ensure-lumiera.ps1` (não mata render ativo)
   - **Não** reinstalar watchdog PowerShell se PM2 estiver ativo
2. **Reiniciar** Vite (5176) se tocou em proxy/API config
3. **Commit** com `git add` + `git commit` — nunca deixar diff pendente
4. Não commitar por padrão: `config_qanat.json`, `studio_agents_config.json` (config local do Leo)
5. Watchdog permanente (1× no PC): `.\scripts\install-lumiera-startup.ps1`

## Scripts

```powershell
.\scripts\install-lumiera-pm2.ps1      # 1× — modo estável (recomendado)
.\scripts\ensure-lumiera.ps1         # verifica e corrige tudo (preferir ao finalizar)
.\scripts\restart-backend.ps1 -Force   # após mudar backend (PM2 reload se instalado)
.\scripts\status-lumiera.ps1           # diagnóstico
```

## Regra de ouro

> O usuário não deve repetir "commita e reinicia". Isso é padrão automático do agente.
