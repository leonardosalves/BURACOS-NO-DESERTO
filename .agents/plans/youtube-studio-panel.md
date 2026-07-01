> 🔗 [[MEMORIA-LUMIERA]] · [[SKILLS]]

# Painel YouTube Studio no Lumiera

> Branch: `feature/youtube-studio-panel`  
> Status: Fase 2 em implementação (Fase 1 concluída)

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

### Fase 3 — Alertas e polling

- Polling a cada 15–30 min (analytics tem delay de ~48h para algumas métricas)
- Badge no sidebar se views 48h > threshold
- Cruzar `videoId` dos projetos Lumiera com linhas da tabela

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

- [ ] Lista comentários recentes do canal
- [ ] Filtro **Sem resposta** oculta threads já respondidas pelo canal
- [ ] Filtro por palavra-chave (nicho do projeto como default)
- [ ] Cada item tem link para YouTube Studio e para o vídeo