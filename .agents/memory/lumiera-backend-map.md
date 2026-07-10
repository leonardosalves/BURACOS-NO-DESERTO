# Mapeamento do Backend Lumiera

> 🔗 [[MEMORIA-LUMIERA]] · [[memory/lumiera-architecture-overview]] · [[memory/lumiera-code-map]]

O backend do Lumiera é um monólito Express.js em Node.js (`dashboard-qanat/backend`) que gerencia a inteligência dos agentes, integrações de IA, orquestração de áudio e vídeo, e APIs do YouTube.

---

## 1. Inicialização e Estrutura Principal

Estes módulos gerenciam o ciclo de vida do servidor, rotas e ambientes:

- **[server.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/server.js)**: O monólito Express. Registra todas as rotas de API, configura o CORS, serve arquivos estáticos e gerencia o middleware de erro global.
- **[projectConfigBootstrap.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/projectConfigBootstrap.js)**: Configura a inicialização inicial de novos projetos na máquina (criação de diretórios obrigatórios como `OUTPUT`, `ASSETS` e cache).
- **[projectsRoot.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/projectsRoot.js)**: Fornece APIs para gerenciar múltiplos projetos e carregar seus metadados.
- **[pythonEnv.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/pythonEnv.js)**: Abstração para executar scripts Python de forma isolada nos ambientes virtuais (`.venv-timesfm` e `.venv-chatterbox`).

---

## 2. IA, Prompts e Memória de Agente

O motor de inteligência que alimenta os robôs de criação de conteúdo:

- **[skillsRegistry.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/skillsRegistry.js)**: Gerencia o ciclo de carregamento de Skills L1 (locais) e L2 (Hermes). Contém a função crítica `injectStudioAgentsContext()` que insere restrições de formatação e conhecimentos nos prompts.
- **[agentMemory.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/agentMemory.js)**: Registra o histórico procedural das execuções e aprendizados promotores.
- **[videoAgentPlanner.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/videoAgentPlanner.js)**: Implementa o planner autônomo do VideoAgent. Ele interpreta intents e decide quais ferramentas (web, pesquisa, render) serão orquestradas para cumprir um objetivo.
- **[lumieraContextCompress.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/lumieraContextCompress.js)**: Compressor de tokens que remove redundâncias nos roteiros para caber nos limites estritos de janelas de prompts.

---

## 3. Síntese de Voz (Text-to-Speech)

O Lumiera possui um ecossistema modular para gerar vozes humanas ultra-realistas:

- **[kokoroTts.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/kokoroTts.js)** & **[kokoro_narration.py](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/kokoro_narration.py)**: Integração principal com o modelo de peso leve e alta expressividade Kokoro. Roda localmente gerando áudios excelentes.
- **[fishSpeechTts.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/fishSpeechTts.js)**: API para o FishSpeech, utilizado quando há necessidade de clonagem de voz ou múltiplos idiomas.
- **[gptSovitsTts.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/gptSovitsTts.js)**: Suporte local ao GPT-SoVITS.
- **[narrationChunks.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/narrationChunks.js)**: Divide o script narrativo em blocos gerenciáveis e realiza o merge final dos arquivos WAV gerados em um arquivo unificado.

---

## 4. Sonoplastia e Gerenciamento de Trilha (BGM)

Mapeamento do motor de áudio e sonoplastia do Lumiera:

- **[epidemicService.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/epidemicService.js)**: Conecta com a API da Epidemic Sound para pesquisar trilhas com base no clima ou gênero emocional do vídeo.
- **[bgmSonoplastia.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/bgmSonoplastia.js)**: Planeja os timings e pontos de início/parada da trilha sonora e efeitos.
- **[mix_bgm.py](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/mix_bgm.py)**: Script Python acionado pelo backend que realiza a mixagem real dos canais usando `pydub`, aplicando efeitos de ducking (redução automática do volume da música sob a voz da narração).

---

## 5. Orquestração Visual (Imagens, Vídeos e Mapas)

Responsável por planejar e gerar a mídia visual do storyboard:

- **[comfyuiService.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/comfyuiService.js)**: Interface de comunicação com o ComfyUI local ou nuvem via API WebSocket. Envia os prompts e baixa as imagens/vídeos gerados.
- **[seedanceT2v.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/seedanceT2v.js)**: Gerador dramático de Text-to-Video no estilo Seedance 2.0.
- **[satelliteMapService.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/satelliteMapService.js)**: Baixa imagens aéreas e dados de elevação geográficos para compor transições de localização 3D no mapa.
- **[motionScenePlanner.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/motionScenePlanner.js)**: Mapeia as cenas do storyboard e planeja os cortes, transições e efeitos de câmera.

---

## 6. Publicação, SEO e YouTube APIs

Orquestra a análise de tráfego, publicação e otimização de metadados:

- **[youtubeEditorialQueue.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/youtubeEditorialQueue.js)**: Controla a fila editorial de ideias de Shorts, agendando renders e uploads.
- **[youtubeMetadataOptimizer.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/youtubeMetadataOptimizer.js)**: Otimiza descrições, tags e gera variações de títulos com alto CTR baseando-se no nicho.
- **[youtubeStudioAdvanced.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/youtubeStudioAdvanced.js)** & **[youtubeStudioPro.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/youtubeStudioPro.js)**: Gerenciam interações avançadas de upload com o YouTube, lidando com autenticação OAuth e resiliência a falhas de conexão.
- **[socialPublishQueue.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/socialPublishQueue.js)**: Fila de upload multi-plataforma (TikTok, Instagram Reels e Kwai).

---

## 7. Análise de Nicho e Tendências

Módulos voltados para a identificação de nichos e análise de séries temporais:

- **[timesfmForecast.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/timesfmForecast.js)** & **[timesfm_forecast.py](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/timesfm_forecast.py)**: Implementação local da inteligência de forecasting TimesFM do Google Research. Analisa dados históricos de visualizações para prever tendências futuras de nichos.
- **[pioneerNicheDiscovery.js](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/backend/pioneerNicheDiscovery.js)**: Descobre nichos em canais estrangeiros cruzando visualizações com estimativas de RPM.
