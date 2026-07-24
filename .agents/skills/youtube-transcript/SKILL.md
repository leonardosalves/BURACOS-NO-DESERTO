---
name: youtube-transcript
description: Use sempre que o usuário precisar da transcrição, legendas ou texto falado de um vídeo do YouTube. Triggers: "extrair transcricao", "obter legendas", "transcricao desse video", "puxar legendas youtube", "baixar legendas", "o que este video do youtube diz". Caminho primário via DeepAPI ou yt-dlp / Lumiera backend como fallback local.
license: MIT
metadata:
  lumiera: true
  source: davidondrej/skills/skills/research-and-web/youtube-transcript
---

# YouTube Transcript (DeepAPI & Fallback Local Lumiera)

Skill especializada em extração de transcrições e legendas de vídeos do YouTube para análise de conteúdo, geração de resumos ou roteirização no Lumiera.

## 1. Local para Salvar Transcrições

- Se o usuário estiver em um projeto ativo no Lumiera → Salve no diretório do projeto como `.txt` ou `.md`.
- Caso contrário → Salve na pasta `~/Downloads/`.
- **Convenção de Nome:** `Canal_Titulo_do_Video.txt` (espaços substituídos por `_`). Se os metadados não estiverem disponíveis, use o ID do vídeo (ex.: `yt_transcript_dQw4w9WgXcQ.txt`).

## 2. Caminho Primário — DeepAPI Scraper

Usa a API do DeepAPI (`POST /v1/scrape/youtube/transcript`) para evitar bloqueios de IP de bots que afetam ferramentas locais.

```bash
KEY=${DEEPAPI_API_KEY:-$(grep -o 'DEEPAPI_API_KEY=\S+' ~/.zshrc 2>/dev/null | head -1 | cut -d= -f2)}
BASE=${DEEPAPI_API_BASE_URL:-https://deepapi.co}
IDK=$(uuidgen 2>/dev/null || date +%s%N)

curl -s --max-time 120 "$BASE/v1/scrape/youtube/transcript" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDK" \
  -d '{
    "url": "URL_DO_VIDEO_YOUTUBE",
    "maxCostUsd": "0.05",
    "waitForFinishSecs": 60
  }' > /tmp/yt_transcript.json
```

Extraia o texto limpo com `jq`:

```bash
jq -r '.output[0].text' /tmp/yt_transcript.json > "$OUT_PATH/$NAME.txt"
```

## 3. Caminho de Fallback — Local via `yt-dlp` (Serviço Lumiera)

Caso a chave DeepAPI não esteja presente ou ocorra falha de conexão:

1. **Obter Metadados e Legendas VTT:**
   ```bash
   yt-dlp --write-sub --write-auto-sub --sub-lang "pt,pt-BR,en" --skip-download -o "/tmp/yt_sub.%(ext)s" "URL_DO_VIDEO"
   ```
2. **Limpeza VTT com a função do Lumiera (`cleanVttTranscript`):**
   - Remove cabeçalhos `WEBVTT`, `Kind: captions` e timestamps `-->`.
   - Remove deduplicações de rolagens de legendas ao vivo do YouTube (_rolling VTT_).
   - Salva o arquivo de texto limpo e legível.

## 4. Integração com o Pipeline Criador do Lumiera

Uma vez extraída a transcrição:

- Pode ser injetada no painel **Inspirado em vídeo** ou **Pesquisa Profunda**.
- Alimenta a geração de roteiros no `Script Master` preservando o tom e os fatos originais.
