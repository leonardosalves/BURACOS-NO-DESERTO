# Google Gemini SDK Reference
> 🔗 [[MEMORIA-LUMIERA]] · [[memory/agent-frameworks-reference]] · [[memory/lumiera-code-map]]

Referência para integração Gemini no Lumiera — **não usar o SDK Python deprecado**.

## Status dos SDKs Google (2026)

| Repo | Status | Lumiera |
|------|--------|---------|
| [google-gemini/deprecated-generative-ai-python](https://github.com/google-gemini/deprecated-generative-ai-python) | **Arquivado** — EOL nov/2025 | ❌ Não instalar |
| [googleapis/python-genai](https://github.com/googleapis/python-genai) | SDK unificado Python (Gemini, Veo, Imagen) | Só scripts Python auxiliares (TimesFM) |
| [googleapis/js-genai](https://github.com/googleapis/js-genai) | **SDK oficial Node/TS** — `@google/genai` | ✅ Alvo de migração do backend |
| `@google/generative-ai` (npm legado) | Sem features Gemini 2.0+ | ❌ Evitar em código novo |

Migração oficial: [ai.google.dev/gemini-api/docs/migrate](https://ai.google.dev/gemini-api/docs/migrate)

## Como o Lumiera chama Gemini hoje

**Implementação atual:** HTTP direto em `dashboard-qanat/backend/server.js` → `callGeminiWithRetry()`.

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=...
```

| Arquivo | Função |
|---------|--------|
| `server.js` | `callGeminiWithRetry`, `callGeminiLlm`, lista de modelos |
| `geminiBrowser.js` | Modo extensão Chrome (`gemini_browser_mode`) |
| `webResearchService.js` | Grounding + pesquisa web |
| `researchLlmHelpers.js` | DeerFlow / JSON repair |
| `workflowRoutes.js` | Metadados, overlays |
| `aiProviderRouter.js` | Fallback Gemini ↔ NVIDIA ↔ xAI |

**Modelos configurados:** `gemini-2.5-flash` (default), `gemini-2.5-pro`, `gemini-2.0-flash` (fallback).

**Chaves:** Configurações → APIs → Gemini (`config_qanat.json`).

## Por que migrar para `@google/genai`

O SDK unificado traz sem reimplementar:

- **Streaming** — `generateContentStream` para Creator em tempo real
- **Function calling** — VideoAgent tools nativos (substituir parsing manual de JSON)
- **MCP experimental** — `mcpToTool(client)` alinha com [[skills/mcp-builder]]
- **Interactions API** — estado server-side, agent `deep-research-pro-preview`
- **Google Search grounding** — `tools: [{ type: 'google_search' }]` (hoje parcial em `webResearchService.js`)
- **Caches** — `ai.caches` para prompts longos (skills + storyboard)
- **Files API** — upload de vídeo/áudio para análise multimodal

### Snippet alvo (Node ESM)

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: prompt,
  config: { temperature: 0.35 },
});
```

**Codegen para agentes:** colar `codegen_instructions.md` do [js-genai](https://github.com/googleapis/js-genai/blob/main/codegen_instructions.md) no contexto ao gerar código Gemini.

## Modo browser (alternativa sem API key)

`gemini_browser_mode` + extensão `tools/lumiera-gemini-bridge` — consulta gemini.google.com via Chrome. Útil quando quota API esgota; não substitui SDK para automação.

## Relação com outros frameworks Google

| Framework | Papel |
|-----------|-------|
| [google/adk-python](https://github.com/google/adk-python) | Agentes Python/GCP — ver [[memory/agent-frameworks-reference]] |
| Gemini Interactions API | Deep Research nativo — candidato a complementar DeerFlow |
| NotebookLM MCP | Pesquisa com fontes — já integrado |

## Próximo passo técnico (opcional)

1. `npm install @google/genai` em `dashboard-qanat/backend/`
2. Extrair `callGeminiWithRetry` → `geminiClient.js` usando SDK
3. Manter mesma interface para `workflowRoutes`, `researchLlmHelpers`, etc.
4. Habilitar streaming em `/api/ai/chat` e Creator

## Links
- [[memory/agent-frameworks-reference]]
- [[skills/deer-flow-research]]
- [[skills/mcp-builder]]
- Docs: [ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)
- SDK JS: [googleapis.github.io/js-genai](https://googleapis.github.io/js-genai/)