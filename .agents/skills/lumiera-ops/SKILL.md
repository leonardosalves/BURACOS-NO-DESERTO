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
1. **Backend** — modo **DEV** padrão no PC do Leo (Vite :5176 + API :3005):
   - **NUNCA** rodar `install-lumiera-windows-service.ps1` sem o Leo pedir explicitamente — muda o stack inteiro (mata Vite, serve `dist/` estático, NotebookLM sem login, projetos em perfil SYSTEM).
   - Permanência sem serviço Windows: `.\scripts\install-lumiera-permanent.ps1` (guardian + backend direto + Vite)
   - Se o PC estiver em modo serviço/uniport por engano: `.\restore-lumiera-dev-mode.bat` (Admin)
   - Código em `dashboard-qanat/backend/**` alterado → `.\scripts\restart-backend.ps1 -Force`
   - Só garantir que está no ar → `.\scripts\ensure-lumiera.ps1` (não mata render ativo)
   - Dashboard do Leo: **http://127.0.0.1:5176/** (não :3005, salvo uniport explícito)
2. **Reiniciar** Vite (5176) se tocou em proxy/API config
3. **Commit** com `git add` + `git commit` — nunca deixar diff pendente
4. Não commitar por padrão: `config_qanat.json`, `studio_agents_config.json` (config local do Leo)
5. Watchdog permanente (1× no PC): `.\scripts\install-lumiera-startup.ps1`

## Scripts

```powershell
.\scripts\install-lumiera-permanent.ps1  # 1× — nunca mais cair (PM2+guardian)
.\scripts\ensure-lumiera.ps1         # verifica e corrige tudo (preferir ao finalizar)
.\scripts\restart-backend.ps1 -Force   # após mudar backend (PM2 reload se instalado)
.\scripts\status-lumiera.ps1           # diagnóstico
```

## Regra de ouro

> O usuário não deve repetir "commita e reinicia". Isso é padrão automático do agente.
