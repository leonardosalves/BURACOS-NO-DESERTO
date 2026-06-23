---
name: Remotion Docs
description: Documentation and guides for building videos with Remotion, including transitions, effects, and video manipulation.
---

# Guia de Remotion: Transições, Efeitos e Manipulação de Vídeo

Este documento serve como referência de skill para trabalhar com a API do Remotion, focando em transições visuais, efeitos de cor/filtro, manipulação de pixels via Canvas e controle avançado de áudio.

## 1. Transições (Transitions)
Transições em Remotion podem ser implementadas sobrepondo sequências ou utilizando a biblioteca `@remotion/transitions`.
* **Desvanecimento (Fade/Cross-dissolve)**: Interpolação simples da opacidade do elemento de `0` a `1`.
* **Dreamy Zoom**: Efeito de aproximação rápida acompanhado por um aumento de opacidade e brilho.
* **Wipe (Corte Deslizante)**: Utilização de propriedades CSS como `clipPath: inset(0 0 0 X%)` para revelar a cena da esquerda para a direita de forma progressiva.
* **Slide**: Movimentação física de um elemento para fora enquanto o outro entra (`transform: translateX(...)`).

## 2. Efeitos Visuais (Effects)
Filtros e transformações aplicados diretamente em CSS para estilização de cor e foco:
* **Brightness & Contrast**: `filter: brightness(1.05) contrast(1.1)`.
* **Grayscale / Sepia**: `filter: grayscale(1)` ou `filter: sepia(0.2)`.
* **Blur & Sombra**: `filter: blur(4px) drop-shadow(0 8px 16px rgba(0,0,0,0.5))`.

## 3. Manipulação de Vídeo (Video Manipulation)
Desenhar frames de vídeo em um `<canvas>` em tempo real para controle pixel a pixel:
* **Uso com OffthreadVideo ou HTML5Video**: Renderizar o vídeo de forma invisível e desenhar seus frames em um Canvas usando a API `drawImage()` no callback de render da timeline.
* **Filtros Personalizados**: Ler os dados de pixel com `getImageData()`, aplicar transformações (ex: limiar de preto e branco, visão térmica, efeito duotone) e escrever de volta com `putImageData()`.

## 4. Controle de Áudio Avançado
Controle de volume dinâmico com base na linha do tempo ou eventos (ex: ducking automático e fade-ins/fade-outs):
* **Fórmulas de Atenuação**:
  ```typescript
  const volume = interpolate(currentMs, [startMs, endMs], [startVolume, endVolume], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  ```
* **Audio Ducking**: Reduzir dinamicamente o volume da trilha musical (BGM) sempre que a narração (captions/audio principal) estiver ativa, garantindo transições suaves ("crescendo" e "diminuendo" graduais).
