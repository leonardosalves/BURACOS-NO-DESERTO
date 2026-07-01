> 🔗 [[MEMORIA-LUMIERA]] · [[SKILLS]]

# Painel YouTube Studio no Lumiera

> Branch: `feature/youtube-studio-panel`  
> Status: Fases 1–6 concluídas (Studio Pro + UX em abas)

## Objetivo

Trazer métricas essenciais do YouTube Studio para dentro do Lumiera — inscritos, views do canal, desempenho por vídeo — sem sair do dashboard, reutilizando OAuth e Analytics já usados no teste A/B de títulos.

## Contexto existente

| Recurso | Arquivo | Uso atual |
|---------|---------|-----------|
| OAuth YouTube | `youtube_token.json` + `youtube_client_secrets.json` | Upload, título A/B |
| Escopos analytics | `youtubeTitleAnalytics.js` | `yt-analytics.readonly`, `youtube.readonly`, `youtube.force-ssl` |
| Analytics por vídeo | `fetchVideoAnalytics()` | Experimento de título no projeto |
| Integrações UI | `IntegrationSettings.tsx` | Revincular conta |

## Fases

### Fase 1 — Canal + tabela de vídeos (esta branch)

**Backend** (`youtubeChannelAnalytics.js`):

- `GET /api/youtube/channel/overview` — `channels.list` (snippet + statistics)
- `GET /api/youtube/channel/videos?days=28&limit=25` — playlist de uploads + Analytics API batch

**Frontend** (`YoutubeStudioPanel.tsx`):

- Aba global na sidebar: **Canal YouTube**
- Cards: inscritos, views totais, quantidade de vídeos
- Tabela: thumbnail, título, views (período), likes, comentários, minutos assistidos
- Estados: desconectado, escopos faltando, erro de API, refresh manual

**Integração**:

- `App.tsx`: novo `AppTab` `youtube-studio`, botão na sidebar
- `sectionHelpContent.tsx`: ajuda da aba

### Fase 2 — Comentários recentes (esta branch)

- `GET /api/youtube/channel/comments?limit=20&filter=all|unanswered&keyword=` via `commentThreads.list`
- Painel de comentários com link **Responder no Studio**
- Filtros: todos / sem resposta / palavra-chave (nicho do projeto ativo como sugestão)

### Fase 3 — Alertas e polling (concluída)

- `GET /api/youtube/channel/alerts?viewsThreshold=100` — comentários sem resposta + views 48h dos projetos Lumiera
- Polling frontend a cada 20 min enquanto o dashboard está aberto
- Badge vermelho na sidebar **Canal YouTube** (`badgeCount = sem resposta + vídeos quentes`)
- Tabela de vídeos marca linhas Lumiera e destaca alto desempenho em 48h

## Design de API

### `GET /api/youtube/channel/overview`

```json
{
  "connected": true,
  "scopesReady": true,
  "channel": {
    "id": "UC...",
    "title": "Canal",
    "thumbnailUrl": "https://...",
    "subscriberCount": 12345,
    "viewCount": 987654,
    "videoCount": 42
  },
  "fetchedAt": "2026-07-01T12:00:00.000Z"
}
```

### `GET /api/youtube/channel/videos?days=28&limit=25`

```json
{
  "periodDays": 28,
  "startDate": "2026-06-03",
  "endDate": "2026-07-01",
  "videos": [
    {
      "videoId": "abc",
      "title": "...",
      "publishedAt": "2026-06-10",
      "thumbnailUrl": "https://...",
      "metrics": {
        "views": 1200,
        "likes": 45,
        "comments": 12,
        "estimatedMinutesWatched": 340,
        "shares": 8,
        "subscribersGained": 3
      }
    }
  ]
}
```

## Wireframe (Fase 1)

```
┌─ Canal YouTube ─────────────────────────────────────┐
│ [Avatar] Nome do Canal          [Atualizar] 12:34   │
├─────────────────────────────────────────────────────┤
│  Inscritos    │  Views totais  │  Vídeos no canal  │
│   12,3K       │    987K        │       42          │
├─────────────────────────────────────────────────────┤
│ Período: últimos 28 dias                            │
│ ┌────┬──────────────────┬──────┬──────┬──────┬────┐ │
│ │thumb│ Título          │Views │Likes │Coment│Min │ │
│ └────┴──────────────────┴──────┴──────┴──────┴────┘ │
└─────────────────────────────────────────────────────┘
```

## OAuth / escopos

Reutiliza `TITLE_TEST_REQUIRED_SCOPES` de `youtubeTitleAnalytics.js`:

- `youtube.readonly` — listar canal e vídeos
- `yt-analytics.readonly` — métricas por vídeo
- `youtube.force-ssl` — já exigido para edição de título

Revincular: **Configurações → Integrações → Revincular YouTube** (ou Upload → Integrações).

## Limitações vs YouTube Studio

| Métrica | Lumiera Fase 1 | YouTube Studio |
|---------|----------------|----------------|
| Views em tempo real | Não (polling + delay API) | Sim |
| Impressões / CTR thumbnail | Não (Reporting API restrita) | Sim |
| Retenção por vídeo | Fase 1.5 / já existe no título A/B | Sim |
| Comentários | Fase 2 | Sim |
| Revenue / RPM | Fora de escopo | Sim (YPP) |

## Arquivos tocados (Fase 1)

- `dashboard-qanat/backend/youtubeChannelAnalytics.js` (novo)
- `dashboard-qanat/backend/server.js` (rotas)
- `dashboard-qanat/frontend/src/YoutubeStudioPanel.tsx` (novo)
- `dashboard-qanat/frontend/src/App.tsx` (aba + sidebar)
- `dashboard-qanat/frontend/src/sectionHelpContent.tsx` (ajuda)

## Critérios de aceite Fase 1

- [x] Aba **Canal YouTube** visível na sidebar
- [x] Com conta conectada e escopos OK: cards + tabela carregam
- [x] Sem conta: empty state com link para integrações
- [x] Escopos faltando: mensagem clara + botão revincular
- [x] Refresh manual atualiza timestamp
- [x] Erros da API retornam `needsReauth` quando aplicável

### `GET /api/youtube/channel/comments`

```json
{
  "channelId": "UC...",
  "filter": "unanswered",
  "keyword": "construção",
  "comments": [
    {
      "threadId": "...",
      "videoId": "abc",
      "videoTitle": "...",
      "authorDisplayName": "User",
      "text": "Que vídeo incrível!",
      "isAnswered": false,
      "studioUrl": "https://studio.youtube.com/video/abc/comments",
      "watchUrl": "https://www.youtube.com/watch?v=abc&lc=..."
    }
  ]
}
```

## Critérios de aceite Fase 2

- [x] Lista comentários recentes do canal
- [x] Filtro **Sem resposta** oculta threads já respondidas pelo canal
- [x] Filtro por palavra-chave (nicho do projeto como default)
- [x] Cada item tem link para YouTube Studio e para o vídeo

### `GET /api/youtube/channel/alerts`

```json
{
  "badgeCount": 3,
  "unansweredComments": 2,
  "hotVideos": [{ "projectName": "MeuProjeto", "videoId": "abc", "views48h": 240 }],
  "lumieraVideoById": { "abc": { "projectName": "MeuProjeto", "videoId": "abc" } },
  "pollIntervalMinutes": 20,
  "alerts": [{ "type": "unanswered_comments", "count": 2, "label": "2 comentário(s) sem resposta" }]
}
```

## Critérios de aceite Fase 3

- [x] Endpoint de alertas leve para polling
- [x] Polling automático a cada 20 min no frontend
- [x] Badge na sidebar quando há alertas
- [x] Cruzamento videoId ↔ projeto Lumiera na tabela

### Fase 4 — Detalhe, Lumiera e respostas (concluída)

- `GET /api/youtube/channel/video/:videoId/detail` — analytics + retenção + views 48h
- `GET /api/youtube/channel/lumiera-videos` — projetos com `post_id` ou experimento de título
- `POST /api/youtube/channel/comments/reply` — responder comentário pelo Lumiera
- UI: painel Lumiera, detalhe do vídeo (sparkline retenção), campo de resposta inline

## Critérios de aceite Fase 4

- [x] Lista projetos Lumiera publicados no YouTube com métricas
- [x] Clique no vídeo abre detalhe com retenção e velocity 48h
- [x] Resposta a comentários publicada via API (OAuth force-ssl)
- [x] Descoberta de videoId também via `youtube_title_experiment.json`

### Fase 5 — Performance e alertas configuráveis (concluída)

- `GET /api/youtube/channel/summary` — overview + vídeos + Lumiera + alertas em uma chamada
- Cache em `youtube_channel_cache.json` (5 min métricas, 3 min alertas)
- `?refresh=1` força atualização
- Threshold de views 48h configurável no painel (localStorage + badge sidebar)

## Critérios de aceite Fase 5

- [x] Carregamento inicial via endpoint único `summary`
- [x] Cache reduz chamadas repetidas à API do YouTube
- [x] Botão Atualizar força refresh (`refresh=1`)
- [x] Threshold de alerta 48h editável e persistido

### Fase 6 — Studio Pro, abas e configuração na UI (concluída)

- Painel principal em abas: **Resumo · Vídeos · Comentários · Ferramentas**
- **Studio Pro**: inbox zero, SLA, fila de aprovação, SEO, heatmap, YPP, checklist pré-upload, notas
- **Configurações na UI** (`YoutubeStudioSettings`): e-mail relatórios, SMTP, metas 48h por projeto, PWA
- **Testes A/B de título** no painel (`GET /api/youtube/channel/title-experiments`)
- **Checklist pós-publicação** integrado na aba Resumo (por projeto Lumiera)
- Correção de gráficos com altura em pixels (heatmap, velocity, retenção)

## Critérios de aceite Fase 6

- [x] Abas reduzem scroll vertical do painel
- [x] SMTP e metas 48h editáveis sem editar JSON manualmente
- [x] Experimentos A/B ativos listados com rankings e ações (aplicar vencedor / encerrar)
- [x] Checklist pós-upload acessível pelo card Lumiera no Resumo