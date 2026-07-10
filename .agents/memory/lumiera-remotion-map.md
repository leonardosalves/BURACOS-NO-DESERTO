# Mapeamento do Remotion Renderer Lumiera

> 🔗 [[MEMORIA-LUMIERA]] · [[memory/lumiera-architecture-overview]] · [[memory/lumiera-code-map]] · [[skills/remotion-render]]

O motor de renderização do Lumiera é implementado em Remotion (`dashboard-qanat/remotion-renderer/src`), permitindo a geração determinística de vídeos MP4 a partir de uma linha do tempo descrita em formato JSON.

---

## 1. Ponto de Entrada e Linha do Tempo Canonical

- **[Root.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/Root.tsx)**: Registra as duas composições principais do Lumiera (`LumieraTimelineShorts` e `LumieraTimelineLongForm`), definindo resoluções (1080x1920 para Shorts, 1920x1080 para Longos), taxas de quadros (30 FPS) e os esquemas de propriedades padrão.
- **[LumieraTimeline.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/LumieraTimeline.tsx)**: A alma do renderizador React do Lumiera. Ele consome a estrutura de dados unificada e posiciona:
  - As faixas de áudio (`Audio` do Remotion para narração por bloco e trilha sonora BGM contínua).
  - O carrossel de mídias de fundo (`Sequence` de imagens e vídeos de estoque/difusão).
  - Legendas cinemáticas (sincronizadas no nível de milissegundos por palavra obtido na etapa de alinhamento).
  - O container de overlays gráficos em tela cheia (**OverlayLayer**).

---

## 2. Abstrações e Elementos Gráficos (Overlays - HyperFrames)

Os overlays são desenhados para capturar a atenção sem obstruir as legendas. Estão localizados em `dashboard-qanat/remotion-renderer/src/overlays`:

### 2.1. Navegação e Progresso

- **[OverlayLayer.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/OverlayLayer.tsx)**: Despachante (Dispatcher) central de overlays. Varre a lista de infográficos programados para o bloco atual e posiciona os componentes corretos nas coordenadas e tempos planejados.
- **[BlockProgressBar.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/BlockProgressBar.tsx)**: Uma barra de status estilizada na margem superior que indica visualmente o progresso do vídeo através de "checkpoints" (Ex: Tópico 1, Tópico 2, Conclusão).

### 2.2. Infográficos Dinâmicos e Tabelas

- **[InfoCounter.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/InfoCounter.tsx)**: Exibe contadores numéricos com efeito de roleta (Counter roll) suavizado por interpolação de molas (`spring()`), útil para estatísticas e percentuais de retenção.
- **[InfoTimeline.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/InfoTimeline.tsx)**: Monta diagramas de linhas do tempo dinâmicas (Step-by-step) onde os itens acendem sequencialmente de acordo com a locução.
- **[PictogramChart.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/PictogramChart.tsx)** & **[RankProgress.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/RankProgress.tsx)**: Gráficos dinâmicos de comparação e rankings ilustrados com ícones.

### 2.3. Identidade e Apresentação

- **[LowerThird.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/LowerThird.tsx)**: Placa de texto premium para apresentação de nomes, localizações ou conceitos curtos. _Nota: Substitui os InfoCards centralizados para manter o centro do frame limpo de sobreposição às legendas._
- **[InfoCard.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/InfoCard.tsx)**: Exibe cards de informação adicionais flutuantes.
- **[SocialPostCard.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/SocialPostCard.tsx)**: Simula uma postagem de rede social (ex: Twitter/Reddit) flutuando de forma realista na tela para atuar como prova social.

### 2.4. Mapas e Geografia

- **[LocationIntro.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/LocationIntro.tsx)** & **[CesiumGlobeLayer.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/CesiumGlobeLayer.tsx)**: Controla a renderização 3D de mapas mundiais cinemáticos. Faz um zoom progressivo suave até a coordenada geográfica do assunto do vídeo, aplicando camadas realistas de satélite.

---

## 3. Gestão e Otimização de Animações Lottie

Para evitar lentidão no carregamento dinâmico de animações no canvas do Chromium durante a renderização de produção, o Lumiera desenvolveu um sistema de indexação estática:

- **[lottieRegistry.generated.ts](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/lottieRegistry.generated.ts)**: Índice gerado de todos os Lotties catalogados.
- **[lottieAssetLoader.browser.ts](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/lottieAssetLoader.browser.ts)**: Lida com a leitura prévia em buffer dos arquivos JSON de animação para entrega instantânea ao componente de render.
- **[SafeLottie.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/SafeLottie.tsx)**: Invólucro de segurança que previne quebras de renderização caso um Lottie falhe ao ser decodificado.

---

## 4. Diretrizes de Legendas Cinemáticas

Implementadas no core de legendas do `LumieraTimeline.tsx`, as legendas seguem regras de design premium:

- **Estilo:** Caixa alta (Uppercase) em fontes grotescas sans-serif (como Montserrat Black ou Impact).
- **Legibilidade:** Sombra projetada (Text-shadow) preta com desfoque de 4px e contorno (Text-stroke) leve para garantir contraste absoluto sobre qualquer fundo (vídeo ou imagem).
- **Fluxo:** Envolvimento dinâmico de texto (Word wrapping) que limita a exibição a no máximo 6 a 8 palavras por linha em Shorts para aumentar a velocidade de leitura e a retenção.
