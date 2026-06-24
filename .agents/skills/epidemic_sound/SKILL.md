---
name: Epidemic Sound API
description: Basic documentation and guides for searching and downloading music/sound effects from Epidemic Sound MCP/REST API.
---
# Epidemic Sound API Guide

## Base URLs
- **Partner Content REST API (Primary, Recommended)**: `https://partner-content-api.epidemicsound.com/v0`
- **MCP Server (Beta, Fallback)**: `https://www.epidemicsound.com/a/mcp-service/mcp`

## Autenticação
A API suporta 3 métodos de autenticação:

### 1. API Key Authentication (Recomendado)
- Obter no Developer Portal: `https://developers.epidemicsound.com`
- Keys têm prefixo `epidemic_live_`
- Válida indefinidamente (single long-lived key)
```http
Authorization: Bearer epidemic_live_xxxxx
```

### 2. MCP API Key
- Obter em: `https://www.epidemicsound.com/account/api-keys`
- Válida por 30 dias, depois precisa regenerar
```http
Authorization: Bearer YOUR_API_KEY
```

### 3. Session JWT (Legacy)
- Token JWT do Keycloak obtido após login
- Issuer: `https://login.epidemicsound.com/auth/realms/accounts`
- Tem expiração (`exp` claim)

## Endpoints REST API (Primary)

### Buscar Músicas (Tracks)
```
GET /v0/tracks/search?term=<query>&limit=50
```
Response: `{ tracks: [{ id, title, bpm, length, stems: { full: { lqMp3Url } } }] }`

### Download de Música
```
GET /v0/tracks/{trackId}/download
```
Response: `{ "url": "https://pdn.epidemicsound.com/..." }`

### Buscar Efeitos Sonoros (SFX)
```
GET /v0/sound-effects/search?term=<query>&limit=50
```
Response: `{ soundEffects: [{ id, title, length, baseUrl }] }`

### Download de Efeito Sonoro
```
GET /v0/sound-effects/{sfxId}/download
```
Response: `{ "url": "https://..." }`

## MCP Server Tools (Fallback)
Conectar via SSE GET → receber `endpoint` event → POST JSON-RPC.

| Tool | Descrição |
|------|-----------|
| `search_music` | Busca músicas por keyword, BPM, mood, etc. |
| `find_similar_track` | Encontra tracks similares por ID |
| `search_sound_effects` | Busca SFX por termo |
| `find_similar_sound_effects` | SFX similares por ID |
| `download_music_track` | Download de track (mp3/wav, full/stems) |
| `download_sound_effect` | Download de SFX (mp3/wav) |
| `browse_voice_artists` | Lista vozes AI disponíveis |
| `generate_voiceover` | Gera narração AI a partir de texto |
| `get_voiceover_status` | Status de geração de voiceover |
| `download_voiceover` | Download de voiceover gerado |

## Implementação Recomendada
1. **Sempre tente REST API primeiro** (`partner-content-api.epidemicsound.com`)
2. **Fallback para MCP SSE** se REST falhar com 401/403
3. Integrar as buscas usando o token armazenado nas configurações do painel
4. Sempre prefira buscas por contexto/palavras-chave em inglês (ex: "suspense", "drone", "ancient egypt")
5. Adicione User-Agent de navegador real para evitar bloqueios WAF

## Notas Importantes
- A REST API é mais simples e confiável que o MCP SSE
- O MCP SSE pode ser bloqueado por WAF em IPs de datacenter
- Tokens JWT de sessão podem funcionar com ambas as APIs
- API Keys do Developer Portal (`epidemic_live_`) são o método mais estável
