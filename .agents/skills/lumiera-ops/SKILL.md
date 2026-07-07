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
   - `.\scripts\ensure-lumiera.ps1` (backend 3005 + frontend 5176 + watchdog)
   - Se falhar: ler `.lumiera-logs\backend-stderr.log` e `frontend-stderr.log`
   - Corrigir causa (porta, dependência, proxy, crash) e rodar ensure de novo
1. **Backend** — NUNCA derrube processo ocupado (render/Gemini):
   - Código em `dashboard-qanat/backend/**` alterado → `.\scripts\restart-backend.ps1 -Force` (só após commit, 1×)
   - Só garantir que está no ar → `.\scripts\ensure-backend.ps1` (não mata se porta 3005 ativa)
   - Watchdog v2 **não mata** backend com health lento — só sobe se porta 3005 estiver livre
2. **Reiniciar** Vite (5176) se tocou em proxy/API config
3. **Commit** com `git add` + `git commit` — nunca deixar diff pendente
4. Não commitar por padrão: `config_qanat.json`, `studio_agents_config.json` (config local do Leo)
5. Watchdog permanente (1× no PC): `.\scripts\install-lumiera-startup.ps1`

## Scripts

```powershell
.\scripts\ensure-lumiera.ps1         # verifica e corrige tudo (preferir ao finalizar)
.\scripts\restart-backend.ps1 -Force   # após mudar backend
.\scripts\ensure-backend.ps1           # só sobe se offline
.\scripts\ensure-frontend.ps1        # só sobe Vite se offline
.\scripts\status-lumiera.ps1           # diagnóstico
```

## Regra de ouro

> O usuário não deve repetir "commita e reinicia". Isso é padrão automático do agente.
