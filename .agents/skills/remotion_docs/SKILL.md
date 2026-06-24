---
name: Remotion Docs
description: Documentation and guides for building videos with Remotion, including transitions, effects, and video manipulation.
---

# Guia de Remotion: Transições, Efeitos e Manipulação de Vídeo

Este documento serve como referência de skill para trabalhar com a API do Remotion, focando em transições visuais, efeitos de cor/filtro, manipulação de pixels via Canvas, controle avançado de áudio e animações físicas.

---

## 1. Transições Integradas (`@remotion/transitions`)

O Remotion fornece o pacote `@remotion/transitions` para gerenciar cortes e transições fluidas entre cenas dentro de um componente `<TransitionSeries>`.

### Importação e Uso Básico
```tsx
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

export const MyVideo = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={60}>
        <SceneA />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition 
        presentation={slide({ direction: "from-left" })} 
        timing={linearTiming({ durationInFrames: 15 })} 
      />
      <TransitionSeries.Sequence durationInFrames={60}>
        <SceneB />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
```

### Lista Completa de Transições Disponíveis (19 Apresentações)

1. **`fade()`**: Dissolve cruzado clássico que interpola a opacidade da cena de saída para a cena de entrada.
2. **`slide(options?)`**: Empurra a cena atual para fora enquanto introduz a nova.
   - *Opções*: `{ direction: 'from-left' | 'from-right' | 'from-top' | 'from-bottom' }`
3. **`wipe(options?)`**: Desliza a cena de entrada por cima da cena de saída sem empurrá-la.
   - *Opções*: `{ direction: 'from-left' | 'from-right' | 'from-top' | 'from-bottom' }`
4. **`flip(options?)`**: Gira o frame em 3D de 0 a 180 graus revelando a próxima cena atrás dele.
   - *Opções*: `{ direction: 'from-left' | 'from-right' | 'from-top' | 'from-bottom' }`
5. **`clockWipe(options?)`**: Revela a nova cena em um movimento circular semelhante aos ponteiros de um relógio.
   - *Opções*: `{ width: number, height: number }`
6. **`iris(options?)`**: Revela a nova cena através de um formato geométrico (círculo) que se expande do centro.
   - *Opções*: `{ width: number, height: number }`
7. **`bookFlip(options?)`**: Simula a virada tridimensional de uma página de livro.
8. **`zoomBlur(options?)`**: Zoom rápido acompanhado por um desfoque radial/direcional dramático.
   - *Opções*: `{ radius: number }`
9. **`dreamyZoom(options?)`**: Zoom rápido acompanhado de um aumento na opacidade e brilho (efeito de sonho).
10. **`filmBurn(options?)`**: Simula a queima de filme físico com cores quentes/sobrepostas de luz vazando (light leak).
11. **`linearBlur(options?)`**: Aplica um desfoque direcional linear ao longo de um ângulo especificado enquanto faz a transição.
12. **`zoomInOut(options?)`**: Afasta o zoom da cena atual e aproxima suavemente o zoom da próxima cena.
13. **`dissolve(options?)`**: Transição de dissolvência baseada em ruído ou padrão pixelizado de dispersão.
14. **`ripple(options?)`**: Efeito de ondulação de água que distorce a cena de saída antes de revelar a entrada.
15. **`crosswarp(options?)`**: Estica e distorce os cantos da cena em uma distorção espacial de transição.
16. **`crossZoom(options?)`**: Dissolve cruzado combinado com efeitos de zoom rápidos em ambas as cenas.
17. **`swap(options?)`**: Desliza as cenas como azulejos que trocam de lugar na tela.
18. **`cube(options?)`**: Gira as duas cenas como se fossem as faces adjacentes de um cubo 3D.
    - *Opções*: `{ direction: 'from-left' | 'from-right' | 'from-top' | 'from-bottom' }`
19. **`none()`**: Corte seco instantâneo sem qualquer interpolação visual.

### Controle de Timing das Transições
Você pode definir o tempo da transição usando frames de forma linear ou com simulação de física de mola (Springs):
* **Linear**: `linearTiming({ durationInFrames: 30 })`
* **Mola**: `springTiming({ config: { damping: 12 } })` (A duração é calculada automaticamente com base na rigidez da mola).

---

## 2. Efeitos Visuais Avançados (Visual Effects)

Em Remotion, evite animações CSS tradicionais baseadas em `@keyframes` porque elas não garantem fidelidade por frame na renderização de vídeo. Utilize as propriedades e APIs abaixo para aplicar filtros dinâmicos.

### A. Filtros CSS Dinâmicos via `interpolate`
Modifique propriedades CSS de filtros de forma síncrona com a timeline do vídeo:
```tsx
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const DynamicFilter = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Transiciona o desfoque de 10px a 0 nos primeiros 2 segundos
  const blur = interpolate(frame, [0, fps * 2], [10, 0], {
    extrapolateRight: "clamp",
  });

  // Aumenta o contraste dinamicamente
  const contrast = interpolate(frame, [0, fps * 3], [1, 1.3], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ filter: `blur(${blur}px) contrast(${contrast})` }}>
      Conteúdo Estilizado
    </div>
  );
};
```
**Filtros CSS Recomendados:**
* `brightness(value)` (Ajuste de brilho)
* `contrast(value)` (Ajuste de contraste)
* `grayscale(value)` (Escala de cinza de 0 a 1)
* `sepia(value)` (Sepia/Visual Envelhecido)
* `invert(value)` (Inversão cromática de pixels)
* `hue-rotate(deg)` (Rotação de matriz cromática)
* `blur(px)` (Desfoque gaussiano suave)

### B. Manipulação de Pixels usando Canvas (`onVideoFrame`)
Para transformações extremamente detalhadas pixel a pixel (como visão térmica, duotone nativo ou remoção de tela verde/chroma key):
```tsx
import { useCallback, useRef } from "react";
import { AbsoluteFill, OffthreadVideo, useVideoConfig } from "remotion";

export const ChromaKeyCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useVideoConfig();

  const onVideoFrame = useCallback((frame: CanvasImageSource) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Desenha o frame atual do vídeo no Canvas
    ctx.drawImage(frame, 0, 0, width, height);

    // 2. Extrai os pixels para manipulação direta
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Exemplo: Filtro Duotone personalizado (Vermelho e Azul)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const avg = (r + g + b) / 3;
      
      data[i] = avg;       // Canal R recebe média
      data[i + 1] = 0;     // Canal G zerado
      data[i + 2] = 255 - avg; // Canal B invertido
    }

    // 3. Aplica os pixels modificados de volta no Canvas
    ctx.putImageData(imageData, 0, 0);
  }, [width, height]);

  return (
    <AbsoluteFill>
      <OffthreadVideo
        src="video_greenscreen.mp4"
        style={{ opacity: 0 }} // Mantém o vídeo invisível
        onVideoFrame={onVideoFrame}
      />
      <canvas ref={canvasRef} width={width} height={height} />
    </AbsoluteFill>
  );
};
```

### C. Filtros SVG (Displacement e Distorções)
Os filtros SVG são aplicados via CSS (`filter: url(#id)`) e fornecem distorções orgânicas e processuais:
```tsx
export const WaterTurbulence = () => {
  return (
    <>
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="water-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="20" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <div style={{ filter: "url(#water-filter)" }}>
        Conteúdo distorcido com efeito de água ou ondulação
      </div>
    </>
  );
};
```

### D. Shaders WebGL / GLSL
Para efeitos de transição tridimensionais complexos ou geradores procedurais de partículas e fundos, use componentes WebGL (ex: via Three.js / React Three Fiber / Shaders GLSL integrados a tags Canvas WebGL). Isso transfere o peso computacional para a GPU durante as renderizações com suporte a aceleração gráfica.

---

## 3. Controle de Áudio Avançado

### Audio Ducking e Fade-in/Fade-out Dinâmico
Use funções matemáticas para mapear e reduzir o volume das trilhas secundárias (BGM) durante a fala do narrador:
```tsx
import { Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const DynamicAudioTrack = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Exemplo: BGM inicia com volume normal, cai durante a narração e sobe novamente
  const volume = interpolate(
    frame,
    [0, fps * 1, fps * 5, fps * 6], 
    [1.0, 0.25, 0.25, 1.0], 
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <Audio 
      src="background_music.mp3" 
      volume={volume} 
      loop 
    />
  );
};
```
