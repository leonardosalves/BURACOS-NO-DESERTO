> 🔗 [[MEMORIA-LUMIERA]] · [[memory/cocoloop-skills-curated]] · [[skills/openmontage-reference-video|openmontage reference video]] · [[SKILLS]]

---

name: video-understanding
description: |
Análise multimodal de vídeo por URL (YouTube, TikTok, Reels…) — transcrição, resumo, descrição visual.
Use para desmontar vídeo de referência ou concorrente antes do roteiro Lumiera.
Triggers: analisar vídeo, URL referência, transcrever vídeo, entender Short, vídeo concorrente, desmontar vídeo.
metadata:
lumiera: true
source: hub.cocoloop.cn/skills/768 (bill492/video-understanding)
cocoloop_id: 768
tier: A
tasks: [ideas, script, research]
formats: [SHORT, LONG]
---

# Video Understanding (CocoLoop → Lumiera)

Adaptado de [video-understanding #768](https://hub.cocoloop.cn/skills/768). Complementa [[skills/openmontage-reference-video]] com saída estruturada (JSON: transcript, summary, speakers).

## Quando usar

- URL de vídeo viral / concorrente → extrair gancho, estrutura, ritmo
- Antes do roteiro: "o que esse vídeo faz que funciona?"
- Pesquisa de referência quando `analyze-reference` não bastar (transcrição com timestamps)

**Preferir** `POST /api/workflow/analyze-reference` para brief Lumiera com 5 aspectos e conceitos. **Usar esta skill** quando precisar de transcrição bruta ou análise Gemini multimodal direta.

## Pré-requisitos

```powershell
# CLI da skill (após baixar zip do hub)
pip install yt-dlp
# ffmpeg no PATH (Lumiera já usa)
# GEMINI_API_KEY no ambiente ou config_qanat
```

Download: https://dl.cocoloop.cn/bss/skills/video-understanding.zip

## Uso (CLI upstream)

```bash
uv run scripts/analyze_video.py "https://www.youtube.com/watch?v=..."
uv run scripts/analyze_video.py "https://www.tiktok.com/..." -q "Qual é o gancho nos primeiros 3 segundos?"
```

YouTube: análise direta (sem download). Outras plataformas: yt-dlp + Gemini File API.

## Workflow Lumiera

1. Usuário cola URL → rodar `analyze_video.py` ou pedir análise ao agente
2. Salvar resumo em `.agents/memory/competitor-intelligence.md` ou nota Obsidian do nicho
3. Cruzar com [[skills/deer-flow-research]] se precisar fatos verificáveis além do vídeo
4. Gerar roteiro com [[skills/ugc-scriptwriter]] + twist (nunca cópia)

## Overlap

| Ferramenta Lumiera            | Diferença                                  |
| ----------------------------- | ------------------------------------------ |
| `openmontage-reference-video` | Brief criativo + conceitos para o pipeline |
| `competitorResearch.js`       | Canal YouTube + IA + memória Obsidian      |
| DeerFlow                      | Pesquisa web/texto, não vídeo multimodal   |

## Riscos

- Vídeo enviado ao Google (Gemini) — não usar com material confidencial
- Custo de tokens em vídeos longos
- yt-dlp pode falhar em algumas redes
