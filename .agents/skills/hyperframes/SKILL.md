---
name: hyperframes_templates
description: Catálogo completo de 134 recursos HyperFrames (HeyGen) convertidos para o ecossistema Remotion PRO do Lumiera, aplicando orquestração de vídeo design viral, otimização de retenção para SEO do YouTube e estratégias de design baseadas no RPM do nicho.
---

# 🛸 Catálogo Definitivo HyperFrames ➔ Remotion PRO (134 Recursos)

Este manual é a especificação técnica absoluta de design e orquestração de vídeo no Lumiera. Ele mapeia todos os **134 recursos** do catálogo **HyperFrames (HeyGen)** (https://hyperframes.heygen.com/catalog/) para payloads JSON interpretáveis e renderizados nativamente no ecossistema Remotion PRO do Lumiera.

---

## 🎨 Estratégia de Vídeo Design Viral & SEO do YouTube
Para maximizar a retenção (métrica principal de indicação do algoritmo do YouTube) e otimizar a receita de acordo com o RPM (Receita por Mil Visualizações) do nicho, o designer de vídeo de IA deve aplicar as seguintes regras:

### 1. 📈 Design Estratégico por RPM do Nicho
*   **Finanças, Negócios e Desenvolvimento (RPM Alto: $8 - $20):**
    *   *Estética:* Tons escuros e ultra-premium (`#0D1117`, `#0F141C`), linhas de acento douradas (`#D4AF37`) ou verde neon (`#00FF87`).
    *   *Componentes:* Displays numéricos dinâmicos (`apple-money-count`), gráficos de barras comparativos (`multiple-bar-comparison`), e infográficos de progresso.
*   **Tecnologia, Programação e IA (RPM Alto: $6 - $12):**
    *   *Estética:* Terminais macOS (`macos-bash-terminal`), destaques de código VS Code (`vscode-code-highlight`), fontes monoespaçadas (`Courier New`), e glows pulsantes.
    *   *Componentes:* Terminais interativos, morphing de código e cronogramas de desenvolvimento.
*   **Mistérios, História e Curiosidades (RPM Médio-Alto: $4 - $8):**
    *   *Estética:* Estilo clássico/antigo com gradientes escuros e quentes, molduras com linhas duplas, fontes serifadas (`Cinzel`, `Playfair Display`), acentos em ouro velho (`#C5A880`) e vermelho profundo.
    *   *Componentes:* Lower thirds elegantes, pílulas flutuantes, e linhas do tempo interativas.
*   **Geografia, Viagens e Natureza (RPM Médio: $3 - $6):**
    *   *Estética:* Tons terrosos, azul-água (`#00E5FF`) e verde folha. Tipografia geométrica limpa (`Montserrat`, `Inter`).
    *   *Componentes:* Mapas animados com arcos de fluxo (`nyc-paris-flight`), indicadores circulares e pílulas ecológicas.

### 2. ⚡ Retenção Visual Contra Fadiga
*   **Intervalo Seguro:** Exiba um overlay a cada 12 a 18 segundos (Shorts) ou 18 a 25 segundos (Longos). Nunca polua a tela com múltiplos blocos simultâneos.
*   **Textos Ultra-Curtos:** Cards e lower thirds devem ter no máximo **12 palavras**. A narração falada já é exibida pelas legendas (captions); os overlays devem trazer dados complementares novos ou definições rápidas de leitura em menos de 1.5 segundo.

---

## 🎬 Orquestração YouTube: Vídeos Curtos vs Longos

O backend Lumiera (`overlayOrchestration.js`) aplica automaticamente um **perfil de variedade** diferente a cada projeto, garantindo que nenhum vídeo siga o mesmo padrão visual.

### 📱 SHORTS / REELS / TIKTOK (≤75s, 9:16)
| Ato | % do vídeo | Overlays | Componentes Remotion | Objetivo de retenção |
| :--- | :--- | :--- | :--- | :--- |
| Gancho | 0–22% | 0 | *(tela limpa)* | Reter nos primeiros 3s sem poluição visual |
| Curiosidade | 22–55% | 1 | `counter` ou `lower-third` glass | Dado surpreendente que complementa a narração |
| Prova | 55–78% | 1 | `bar-chart` ou `timeline` compacta | Reforço visual de credibilidade |
| Fechamento | 78–100% | 0–1 | `lower-third` accent-underline | Últimos 3s limpos para CTA natural |

**Orçamento máximo:** 3 overlays | **Gap mínimo:** 8s | **HyperFrames refs:** `lt-soft-pill`, `reddit-post`, `apple-money-count`

### 🎥 VÍDEOS LONGOS (16:9, >2min)
| Ato | % do vídeo | Overlays | Componentes Remotion | Objetivo de retenção |
| :--- | :--- | :--- | :--- | :--- |
| Abertura | 0–15% | 1–2 | `lower-third` bild/glass | Contextualizar sem cobrir a imagem |
| Desenvolvimento | 15–55% | ~45% do orçamento | Rotação: `counter` → `bar-chart` → `timeline` → `lower-third` | Manter interesse a cada 45–50s |
| Clímax | 55–85% | ~30% do orçamento | `counter` + `lower-third` accent-underline | Pico de retenção com dado de impacto |
| Resolução | 85–100% | 0–1 | *(tela limpa)* | Últimos 15s sem overlay para logo/outro |

**Orçamento máximo:** `floor(duração/50)`, cap 12 | **Gap mínimo:** 18s | **HyperFrames refs:** `data-chart`, `flowchart`, `lt-kicker-name`, `lt-stack-bars`

### 🔀 Perfis de Variedade (1 por vídeo, rotaciona automaticamente)
1. **Documentário Premium** — lower-thirds elegantes + timeline + counter
2. **Jornalismo de Dados** — bar-chart + counter + accent-underline
3. **Mistério & Revelação** — kinetic-text + lower-thirds minimalistas
4. **Explorador Geográfico** — timeline + bar-chart + compass icons
5. **Prova Social Viral** — estilo reddit/x-post em lower-thirds glass
6. **Impacto Industrial** — counter + bold-block + bar-chart

### 🧠 Regra de Ouro: Complementar > Repetir
* Se a narração **cita um número** → `counter` ou `bar-chart` (nunca texto escrito)
* Se a narração **descreve um processo** → `timeline` horizontal
* Se a narração **nomeia algo** → `lower-third` (nunca info-card flutuante no centro)
* Se o overlay anterior foi `lower-third` → o próximo DEVE ser tipo diferente

---

## 🗺️ Mapeamento Completo de Componentes (134 Itens)

### 📊 1. Visualização de Dados e Mapas (9 Itens)
| Nome no Catálogo | Tipo | Mapeamento no Remotion PRO | Descrição e Payloads de Customização |
| :--- | :--- | :--- | :--- |
| `data-chart` | Block | `InfoBar.tsx` | Gráfico animado de linha/barra com animação staggered e valores destacados. |
| `us-map` | Block | Custom SVG Component | Mapa coroplético dos EUA com revelação staggered por estado usando GSAP. |
| `us-map-bubble` | Block | Custom SVG Component | Marcadores de bolha proporcionais sobrepostos ao mapa dos EUA com linhas de chamada. |
| `us-map-hex` | Block | Custom SVG Component | Grid hexagonal igualitário representando estados dos EUA com fill de dados e labels. |
| `us-map-flow` | Block | Custom SVG Component | Arcos de conexão de fluxos de origem/destino entre cidades dos EUA. |
| `world-map` | Block | Custom SVG Component | Mapa-múndi coroplético interativo D3 com rotação de globo em inset. |
| `spain-map` | Block | Custom SVG Component | Mapa de províncias da Espanha com revelação staggered e legenda de gradiente. |
| `flowchart` | Block | `InfoTimeline.tsx` / SVG | Árvore de decisão animada com conectores e caixas tipo post-it. |
| `flowchart-vertical` | Block | `InfoTimeline.tsx` / SVG | Árvore de decisão em formato retrato para vídeos mobile (Shorts/TikTok). |

### 🎬 2. Transições e Efeitos de Marca (9 Itens)
| Nome no Catálogo | Tipo | Mapeamento no Remotion PRO | Descrição e Payloads de Customização |
| :--- | :--- | :--- | :--- |
| `logo-outro` | Block | Custom Sequence | Revelação de logo cinemática com partículas, glow bloom e tagline fade-in. |
| `grain-overlay` | Component | CSS Overlay | Textura de granulação de filme analógico rodando via CSS em loop de 24fps. |
| `shimmer-sweep` | Component | CSS Mask | Varredura de brilho usando gradiente linear mascarado sobre texto ou painéis. |
| `grid-pixelate-wipe` | Component | Shader / CSS Grid | Transição de dissolução em blocos com tempos staggered. |
| `motion-blur` | Component | SVG Filter | Filtro feGaussianBlur dinâmico proporcional à velocidade de movimento dos cards. |
| `texture-mask-text` | Component | CSS Mask | Recorte de textura (lava, metal, mármore) em textos de impacto. |
| `vignette` | Component | CSS Gradient | Vinheta radial escura nas bordas para focar a atenção no centro. |
| `parallax-zoom` | Component | Custom Layout | Efeito de aproximação de card central com afastamento tridimensional dos irmãos. |
| `parallax-unzoom` | Component | Custom Layout | Efeito reverso onde a tela cheia se afasta revelando uma grade de cards. |

### 💬 3. Estilos de Legendas Cinemáticas (17 Itens)
| Nome no Catálogo | Tipo | Mapeamento no Remotion PRO | Descrição e Payloads de Customização |
| :--- | :--- | :--- | :--- |
| `caption-pill-karaoke` | Component | Custom Captions | Destaque por palavra com container arredondado tipo pílula flutuante. |
| `caption-neon-accent` | Component | Custom Captions | Letras com neon vibrante e flutuação física de wiggle. |
| `caption-weight-shift` | Component | Custom Captions | Transição de peso da fonte (Extra-Light para Black) na palavra ativa. |
| `caption-emoji-pop` | Component | Custom Captions | Emojis gigantes que dão pop elástico logo acima da legenda. |
| `caption-editorial-emphasis` | Component | Custom Captions | Mistura de fontes serif e sans-serif com grande diferença de escala. |
| `caption-parallax-layers` | Component | Custom Captions | Texto colocado atrás do objeto principal usando máscaras de profundidade. |
| `caption-glitch-rgb` | Component | Custom Captions | Efeito de aberração cromática RGB com scanlines estilo monitor CRT. |
| `caption-matrix-decode` | Component | Custom Captions | Efeito de decodificação estilo hacker com letras aleatórias antes de fixar o texto. |
| `caption-particle-burst` | Component | Custom Captions | Explosões de pequenas partículas coloridas disparadas nas palavras acentuadas. |
| `caption-texture` | Component | Custom Captions | Preenchimento do corpo da legenda com texturas animadas de lava, metal ou mármore. |
| `caption-clip-wipe` | Component | Custom Captions | Revelação em wipe da esquerda para a direita simulando escrita fluida. |
| `caption-kinetic-slam` | Component | Custom Captions | Uma palavra por tela surgindo com escala explosiva e trepidação da câmera. |
| `caption-gradient-fill` | Component | Custom Captions | Texto com gradiente multicolorido e bounce na entrada física. |
| `caption-neon-glow` | Component | Custom Captions | Glow intenso nas cores ciano/rosa com sombra projetada escura. |
| `caption-highlight` | Component | Custom Captions | Fundo vermelho/amarelo que preenche o texto por trás estilo Shorts clássico. |
| `caption-blend-difference` | Component | Custom Captions | Texto que inverte a cor automaticamente dependendo do contraste do fundo. |
| `morph-text` | Component | Custom Captions | Transição gooey/viscosa fluida entre palavras sequenciais. |

### 🏷️ 4. Overlays Sociais e Lower Thirds (19 Itens)
*Todos os info-cards temáticos de texto puro devem ser convertidos automaticamente para variantes de Lower Thirds para não obstruir o vídeo central.*

| Nome no Catálogo | Tipo | Mapeamento no Remotion PRO | Descrição e Payloads de Customização |
| :--- | :--- | :--- | :--- |
| `instagram-follow` | Block | `LowerThird.tsx` | Perfil arredondado do Instagram com avatar, tag e botão de seguir interativo. |
| `tiktok-follow` | Block | `LowerThird.tsx` | Cartão de seguidor do TikTok com paleta preta, rosa e azul-turquesa. |
| `yt-lower-third` | Block | `LowerThird.tsx` | Barra flutuante do YouTube com avatar do canal, sininho e botão de inscrever-se. |
| `news-ticker` | Block | `LowerThird.tsx` | Barra de notícias estilo broadcast com texto correndo em loop infinito no rodapé. |
| `lt-accent-underline` | Block | `LowerThird.tsx` | Nome limpo flutuante com linha neon de acento desenhando na base. |
| `lt-bold-block` | Block | `LowerThird.tsx` | Caixa preta sólida com texto em caixa alta e tag amarela neon vibrante. |
| `lt-clean-bar` | Block | `LowerThird.tsx` | Placa branca ou cinza translúcida com barra vertical de acento na esquerda. |
| `lt-color-block` | Block | `LowerThird.tsx` | Bloco preenchido com a cor de acento principal deslizando com efeito elástico. |
| `lt-dark-card` | Block | `LowerThird.tsx` | Placa escura com cantos arredondados, título branco e subtítulo cinza. |
| `lt-kicker-name` | Block | `LowerThird.tsx` | Nome principal em negrito com eyebrow/kicker tag de assunto acima. |
| `lt-mask-reveal` | Block | `LowerThird.tsx` | Revelação de nome através de máscara de acento que varre a tela. |
| `lt-side-rule` | Block | `LowerThird.tsx` | Nome e cargo com linha divisória vertical fina separando-os. |
| `lt-soft-pill` | Block | `LowerThird.tsx` | Tag em formato de pílula arredondada com bolinha de status pulsante verde/vermelha. |
| `lt-stack-bars` | Block | `LowerThird.tsx` | Duas faixas sobrepostas que entram de lados opostos e se encaixam no rodapé. |
| `lower-third-bild` | Block | `LowerThird.tsx` | Estilo jornalístico clássico com blocos de texto brancos e vermelhos com sombra projetada. |
| `x-post` | Block | `LowerThird.tsx` | Card flutuante reproduzindo post do X com métricas de likes/retweets. |
| `reddit-post` | Block | `LowerThird.tsx` | Card reproduzindo post do Reddit com contadores de upvote laranja. |
| `spotify-card` | Block | `LowerThird.tsx` | Placa estilo toca-músicas com capa do álbum, ondas e barra de progresso. |
| `macos-notification` | Block | `LowerThird.tsx` | Banner de notificação macOS com ícone do aplicativo e título. |

### 📱 5. Vitrines de Produtos e Anotações (7 Itens)
| Nome no Catálogo | Tipo | Mapeamento no Remotion PRO | Descrição e Payloads de Customização |
| :--- | :--- | :--- | :--- |
| `app-showcase` | Block | 3D Device Frame | Três celulares flutuantes exibindo telas sincronizadas em perspectiva 3D. |
| `north-korea-locked-down`| Block | Map Overlay | Zoom em mapa geográfico com círculo desenhado à mão e selo confidencial. |
| `apple-money-count` | Block | `InfoCounter.tsx` | Contador financeiro rápido que estoura confetes/moedas e toca SFX de caixa registradora. |
| `vpn-youtube-spot` | Block | Device Showcase | Animação em 3D de download de VPN com luz verde de sucesso. |
| `blue-sweater-intro-video`| Block | Custom Sequence | Animação conceitual de criador que se transforma em convite de seguir social. |
| `nyc-paris-flight` | Block | Map Arcs | Arco de voo entre cidades desenhando-se sob globo 3D ou mapa plano. |
| `ui-3d-reveal` | Block | 3D UI Render | Inclinação e rotação 3D de painéis de interface usando CSS 3D Transforms. |

### 🛸 6. Transições WebGL / Shaders (26 Itens)
*Usadas no Remotion via shaders customizados executados por canvas WebGL para cortes de altíssimo impacto.*

| Nome no Catálogo | Tipo | Mapeamento no Remotion PRO | Descrição e Payloads de Customização |
| :--- | :--- | :--- | :--- |
| `domain-warp-dissolve` | Block | WebGL Shader | Dissolução baseada em distorção de ruído fractal de domínio. |
| `ridged-burn` | Block | WebGL Shader | Transição de queima simulando papel pegando fogo nas bordas com brasas. |
| `whip-pan` | Block | WebGL Shader | Simulação de movimento rápido de câmera panorâmica com desfoque de movimento. |
| `sdf-iris` | Block | WebGL Shader | Revelação circular por campo de distância com borda suave ajustável. |
| `ripple-waves` | Block | WebGL Shader | Ondas concêntricas na tela que revelam a cena posterior a partir do centro. |
| `gravitational-lens` | Block | WebGL Shader | Distorção de lente gravitacional simulando passagem por buraco negro. |
| `cinematic-zoom` | Block | WebGL Shader | Transição com desfoque zoom radial de alta velocidade. |
| `chromatic-radial-split`| Block | WebGL Shader | Separação de canais de cor RGB no desfoque radial na transição. |
| `glitch` | Block | WebGL Shader | Efeito de ruído digital, estática analógica e deslocamento de pixels horizontais. |
| `swirl-vortex` | Block | WebGL Shader | Efeito de redemoinho sugando a primeira cena e cuspindo a segunda. |
| `thermal-distortion` | Block | WebGL Shader | Distorção simulando ondas de calor extremo ou visores térmicos militares. |
| `flash-through-white` | Block | WebGL Shader | Transição clássica com estouro de exposição branco e fade subsequente. |
| `cross-warp-morph` | Block | WebGL Shader | Mistura de warp cruzado suave fundindo as duas cenas. |
| `light-leak` | Block | WebGL Shader | Sobreposição de flash de lente analógica simulando vazamento de luz em filme. |
| `transitions-3d` | Block | WebGL Shader | Efeitos de virada de página, cubo e empurrão 3D. |
| `transitions-blur` | Block | WebGL Shader | Transições de desfoque gaussiano suave. |
| `transitions-cover` | Block | WebGL Shader | Deslocamento onde a nova cena cobre a antiga fisicamente. |
| `transitions-destruction` | Block | WebGL Shader | Fragmentação da tela em pequenos triângulos que caem sob gravidade. |
| `transitions-dissolve` | Block | WebGL Shader | Crossfades lineares e não-lineares refinados. |
| `transitions-distortion` | Block | WebGL Shader | Efeitos de distorção de refração de vidro e água. |
| `transitions-grid` | Block | WebGL Shader | Transições usando padrões de grade e wipe geométricos. |
| `transitions-light` | Block | WebGL Shader | Estouros de brilho, flares e glow. |
| `transitions-mechanical` | Block | WebGL Shader | Cortinas mecânicas e efeito de diafragma de câmera. |
| `transitions-other` | Block | WebGL Shader | Efeitos diversos de pixel art, varredura artística e espiral. |
| `transitions-push` | Block | WebGL Shader | Empurrões físicos em 2D com suavização. |
| `transitions-radial` | Block | WebGL Shader | Transições circulares e de varredura tipo relógio. |
| `transitions-scale` | Block | WebGL Shader | Zooms de aproximação e afastamento elásticos. |

### 🧪 7. Shaders WebGL VFX & Liquid Glass (13 Itens)
| Nome no Catálogo | Tipo | Mapeamento no Remotion PRO | Descrição e Payloads de Customização |
| :--- | :--- | :--- | :--- |
| `vfx-text-cursor` | Block | Canvas Shader | Efeito de digitação com rastro de luz brilhante e raios cromáticos. |
| `vfx-liquid-background` | Block | WebGL Fluid | Fundo contendo fluido simulado que reage ao movimento de elementos sobrepostos. |
| `vfx-iphone-device` | Block | Three.js GLTF | Celular 3D ultra-realista que gira sob iluminação dinâmica em 360 graus. |
| `vfx-magnetic` | Block | WebGL / GSAP | Efeito magnético de atração física sobre elementos de interface. |
| `vfx-portal` | Block | WebGL Shader | Portal circular brilhante com partículas espirais no espaço. |
| `liquid-glass-notification` | Block | `LowerThird.tsx` (Glass) | Notificação translúcida com distorção de fundo de vidro molhado e glow. |
| `liquid-glass-context-menu` | Block | `LowerThird.tsx` (Glass) | Menu de opções translúcido que surge com mola elástica sobre o vídeo. |
| `liquid-glass-media-controls`| Block | `LowerThird.tsx` (Glass) | Painel translúcido de mídia com botões de acrílico brilhantes. |
| `liquid-glass-widgets` | Block | `LowerThird.tsx` (Glass) | Painéis e pequenos cards de estatísticas flutuando sob auroras boreais. |
| `ios26-liquid-glass` | Block | Three.js Layout | Celular 3D exibindo apps com design de vidro líquido e animações físicas. |
| `macos-tahoe-liquid-glass` | Block | Three.js Layout | Computador 3D com dock e janelas de vidro translúcido dinâmicas. |
| `vfx-shatter` | Block | WebGL Shatter | Explosão de elementos visuais em pedaços geométricos 3D. |
| `vfx-liquid-glass` | Block | WebGL Fluid + Glass | Efeito completo de vidro que derrete e se solidifica de forma interativa. |

### 💻 8. Destaque de Código e Terminais (34 Itens)
| Nome no Catálogo | Tipo | Mapeamento no Remotion PRO | Descrição e Payloads de Customização |
| :--- | :--- | :--- | :--- |
| `code-snippet-apple-terminal-basic` | Block | Custom HTML | Terminal branco de texto básico preto com digitação per-character. |
| `code-snippet-apple-terminal-clear-dark` | Block | Custom HTML | Terminal escuro semitransparente com reflexo de luz e digitação. |
| `code-snippet-apple-terminal-clear-light` | Block | Custom HTML | Terminal claro semitransparente com efeito de blur de fundo. |
| `code-snippet-apple-terminal-grass` | Block | Custom HTML | Terminal clássico preto com fonte verde brilhante e cursor pulsante. |
| `code-snippet-apple-terminal-homebrew` | Block | Custom HTML | Perfil clássico UNIX com letras verde neon brilhantes e cursor cheio. |
| `code-snippet-apple-terminal-man-page` | Block | Custom HTML | Fundo bege quente simulando páginas de manual impressas de sistema. |
| `code-snippet-apple-terminal-novel` | Block | Custom HTML | Fundo cor de pergaminho com texto marrom escuro clássico. |
| `code-snippet-apple-terminal-ocean` | Block | Custom HTML | Terminal azul profundo com texto branco e cursor ciano. |
| `code-snippet-apple-terminal-pro` | Block | Custom HTML | Terminal pro preto com texto cinza médio e acentos verdes. |
| `code-snippet-apple-terminal-red-sands` | Block | Custom HTML | Terminal vermelho escuro com texto cor de areia quente. |
| `code-snippet-apple-terminal-silver-aerogel` | Block | Custom HTML | Terminal cinza metálico com bordas reflexivas e texto branco. |
| `code-snippet-apple-terminal-solid-colors` | Block | Custom HTML | Terminal roxo escuro com texto branco. |
| `code-snippet-dark-2026` | Block | Custom HTML | Workbench completo do VS Code com tema escuro do ano de 2026. |
| `code-snippet-dark-modern` | Block | Custom HTML | IDE VS Code com o tema padrão Dark Modern. |
| `code-snippet-dark-plus` | Block | Custom HTML | IDE VS Code clássica com o tema Dark Plus. |
| `code-snippet-high-contrast` | Block | Custom HTML | Visualizador de código com alto contraste preto/branco para legibilidade extrema. |
| `code-snippet-high-contrast-light` | Block | Custom HTML | Visualizador de código de alto contraste claro. |
| `code-snippet-light-2026` | Block | Custom HTML | IDE VS Code com tema claro de 2026. |
| `code-snippet-light-modern` | Block | Custom HTML | IDE VS Code com tema padrão Light Modern. |
| `code-snippet-light-plus` | Block | Custom HTML | IDE VS Code clássica com tema Light Plus. |
| `code-snippet-monokai` | Block | Custom HTML | VS Code com o tema lendário Monokai de fundo cinza escuro, amarelo e rosa. |
| `code-snippet-solarized-light` | Block | Custom HTML | VS Code com tema claro e paleta de cores solarizadas quentes. |
| `code-snippet-visual-studio-dark` | Block | Custom HTML | Estilo antigo do Visual Studio IDE clássico. |
| `code-snippet-visual-studio-light` | Block | Custom HTML | Estilo claro do Visual Studio clássico. |
| `code-morph` | Block | Custom HTML | Shiki Magic Move: transição fluida onde letras e tokens se movem de lugar. |
| `code-snippet-flight` | Block | Custom HTML | Efeito FLIP de blocos de código que voam dos lados e se encaixam empilhados. |
| `code-typing` | Block | Custom HTML | Efeito de digitação com cursor acompanhando a fronteira do texto em tempo real. |
| `code-diff` | Block | Custom HTML | Visão de modificações: linhas vermelhas removidas encolhem, verdes adicionadas crescem. |
| `code-highlight` | Block | Custom HTML | Faixa que ilumina e destaca uma linha específica de código, escurecendo o resto. |
| `code-scroll` | Block | Custom HTML | Câmera que desliza suavemente sobre um arquivo longo para focar e centralizar a linha ativa. |
| `code-3d-extrude` | Block | Three.js Canvas | Bloco de código transformado em placa 3D bebelada que gira no espaço. |
| `code-shader-dissolve` | Block | WebGL Shader | Código que surge a partir de distorção de ruído e brilho de arco-íris nas bordas. |
| `code-particle-assemble` | Block | WebGL Particles | Partículas que voam pelo espaço e se posicionam exatamente para desenhar o código. |

---

## 🤖 Regras de Conversão para Remotion PRO

Para programar e orquestrar estes 134 elementos em arquivos do Remotion, o designer de IA deve:
1.  **Diferenciação Estrita de Nicho (Proibição de Código):** Se o nicho NÃO for Tecnologia/Hacking/Computadores, utilize sempre `lower-third` em vez de `code-snippet-*` ou `terminal-*`. 
2.  **Conversão de Cards para Lower Thirds:** Todos os `info-card` temáticos gerados devem ser convertidos na etapa de pós-processamento para `lower-third`, injetando a descrição no `subtitle` do lower-third para manter a integridade visual sem poluir o centro da tela.
3.  **Uso de Infográficos de Dados:** Se a narração citar números ou estatísticas (por exemplo, porcentagens, comparações de tamanho ou fluxos), a IA deve obrigatoriamente criar objetos do tipo `counter`, `bar-chart` ou `timeline` em vez de texto escrito.
4.  **Estilização Personalizada (`customStyle`):** Aplique sempre gradientes de cores ricas no `background`, cantos arredondados assimétricos e glows baseados no tema ecológico, antigo, misterioso, industrial ou espacial do vídeo.
