# Mapeamento do Frontend Lumiera

> 🔗 [[MEMORIA-LUMIERA]] · [[memory/lumiera-architecture-overview]] · [[memory/lumiera-code-map]]

O frontend do Lumiera é um dashboard React SPA moderno construído com Vite (`dashboard-qanat/frontend/src`), estilizado com CSS Vanilla e estruturado em torno do conceito de abas funcionais (Tabs) operadas pelos Agentes do Estúdio.

---

## 1. Núcleo, Layout e Estado Global

Os componentes estruturais que mantêm o dashboard ativo e unificado:

- **[App.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/App.tsx)**: O ponto de entrada principal do React. Gerencia o estado global do projeto ativo, abas selecionadas, carregamento de configurações e instâncias de conexão de agentes. É o arquivo central de orquestração.
- **[AppShell.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/AppShell.tsx)**: Contém o layout geral do dashboard, incluindo a barra lateral de navegação (Sidebar), cabeçalhos de status do backend e o tema escuro premium (Glassmorphism).
- **[index.css](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/index.css)**: Armazena o sistema de design (Design System) com tokens de CSS, variáveis HSL de cor, gradientes e animações para botões e cards interativos.
- **[appTypes.ts](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/appTypes.ts)**: Declaração de tipos TypeScript fundamentais do projeto (Estruturas de Storyboard, Blocks, Overlays, Timings e Metadados do YouTube).

---

## 2. Abas Principais (Funcionalidades de Criação)

O Lumiera divide o fluxo de trabalho em abas, organizando o processo desde a ideia até a publicação:

### 2.1. Creator Tab (Roteirização e Brainstorm)

- **[AppCreatorTab.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/AppCreatorTab.tsx)**: Controla a aba do Creator. Gerencia os estágios de geração de ideias virais, ganchos (Hooks) e a estruturação de roteiros em blocos sequenciais.
- **[ListicleCreatorStep.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/ListicleCreatorStep.tsx)**: Editor específico para criação de vídeos no estilo Listicle (Top 5 curiosidades, fatos surpreendentes), que quebra a redação em rankings numerados.
- **[ListicleRankingIdeas.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/ListicleRankingIdeas.tsx)**: Painel de ideias de listas geradas com IA baseado no nicho do canal.

### 2.2. Timeline & Studio Tab (Montagem e Sincronização)

- **[TimelineStudio.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/TimelineStudio.tsx)**: O ambiente multitrilha principal de edição. Oferece visualização unificada de faixas de vídeo, narração, efeitos sonoros (SFX) e música de fundo.
- **[RichTimelineEditor.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/RichTimelineEditor.tsx)**: Editor visual avançado para manipular os blocos do script em correspondência com faixas temporais.
- **[SceneTimingEditor.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/SceneTimingEditor.tsx)**: Interface de precisão onde o usuário visualiza a forma de onda (waveform) do áudio gerado pelo TTS e pode ajustar os milissegundos de entrada/saída de cada palavra.
- **[sceneTimingEngine.ts](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/sceneTimingEngine.ts)**: Motor matemático que calcula e propaga durações de fala e cortes visuais automáticos.

### 2.3. Overlays Tab (HyperFrames e Design)

- **[AppOverlays.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/AppOverlays.tsx)**: Tela de gerenciamento de animações e overlays sobrepostos ao vídeo.
- **[OverlayTimelineEditor.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/OverlayTimelineEditor.tsx)**: Permite ajustar a janela de exibição dos elementos gráficos em relação ao áudio e à cena de fundo.
- **[OverlayPreview.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/OverlayPreview.tsx)**: Renderiza um canvas simulado 9:16 ou 16:9 que mostra como os infográficos (contadores, gráficos de barra, linhas do tempo) estão posicionados no frame.
- **[BlockProgressBarEditor.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/BlockProgressBarEditor.tsx)**: Ferramenta dedicada a customizar a barra de progresso visual de blocos (indicadores que mostram a evolução do vídeo).

### 2.4. YouTube Studio e Distribuição

- **[YoutubeStudioPanel.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/YoutubeStudioPanel.tsx)**: Painel de gestão do canal do YouTube. Integra analytics de visualizações de Shorts, fila de publicação programada e configuração automática de metadados.
- **[YoutubeStudioPro.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/YoutubeStudioPro.tsx)**: Recursos analíticos de SEO avançados, como testes A/B de títulos e tags, e análise de RPM por nicho.
- **[SocialPublishPanel.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/SocialPublishPanel.tsx)**: Painel para postagem e agendamento dos vídeos renderizados nas contas conectadas do TikTok, Instagram e Kwai.

---

## 3. Painéis Especiais e Utilitários

Funcionalidades de suporte integradas:

- **[AgentReachPanel.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/AgentReachPanel.tsx)**: Interface do agente de pesquisa que varre múltiplos sites e redes em tempo real para obter informações quentes para os roteiros.
- **[TrendForecastPanel.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/TrendForecastPanel.tsx)**: Gráficos de séries temporais gerados a partir do TimesFM para acompanhar o crescimento ou declínio de temas específicos.
- **[VideoResurrectorPanel.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/VideoResurrectorPanel.tsx)**: Painel para reciclar vídeos com baixa audiência ("ressuscitar"), aplicando novos ganchos narrativos baseados em tendências de busca recentes.
- **[StudioAgents.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/StudioAgents.tsx)**: Central de gerenciamento dos Agentes de IA ativos e seus bundles correspondentes de prompt (Hermes).
- **[AppSettingsTab.tsx](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/frontend/src/AppSettingsTab.tsx)**: Aba para gerenciar credenciais de APIs (Gemini, Epidemic, Canva, YouTube OAuth) e volumes padrão de áudio.
