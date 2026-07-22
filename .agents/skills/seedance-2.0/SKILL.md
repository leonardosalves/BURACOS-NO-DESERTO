---
name: seedance-2.0
description: Diretrizes de direção de cena e engenharia visual Seedance 2.0 (Emily2040/seedance-2.0) para produção de roteiros e prompts visuais de alta fidelidade e cinematografia intencional.
---

# Seedance 2.0 — Diretrizes de Direção Visual e Roteiro

Baseado no repositório `Emily2040/seedance-2.0` (Seedance 2.0 Skill OS).

## 1. Princípio Fundamental: "Dirija a Cena, Não a Decore"
Evite termos genéricos como "cinematic look", "4k resolution", "masterpiece" ou "beautiful lighting". Em vez disso, especifique:
- **Intenção dramática da cena** (o que o personagem sente/faz).
- **Tamanho de plano e câmera** (Medium close-up, Eye-level, Slow push-in).
- **Iluminação real e ambiente** (Soft window light behind her).
- **Micro-ações e timing físico** (Ela baixa a carta, as mãos ficam imóveis).
- **SFX / Cenas de áudio integradas** (Um rasgo sutil na cadeira, silêncio quase total).

## 2. Estrutura do Prompt de Cena (T2V / I2V / V2V)
Cada cena deve possuir:
1. **Plano & Câmera:** Ex: *Medium close-up, eye-level; slow push-in.*
2. **Sujeito & Ação Concreta:** Ex: *Ela baixa a carta; suas mãos ficam estáticas ao ler o trecho.*
3. **Ambiente & Luz:** Ex: *Luz suave de janela ao fundo, mantendo a expressão sóbria.*
4. **Áudio / SFX:** Ex: *Ruído sutil de papel dobrado, sem diálogo direto.*

## 3. Direção em Quad-Modal (Texto, Imagem, Vídeo, Áudio)
- Use **Imagens (`media_type: image`)** para retratos, documentos, mapas, arquitetura, selos, placas e momentos congelados.
- Use **Vídeos (`media_type: video`)** apenas quando o movimento físico for indispensável (deslocamento, mecanismos, transformação, reação).
- Mantenha a mesma voz de direção visual e consistência de iluminação em todas as cenas de uma história.
