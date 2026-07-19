# Pesquisa aprofundada para reproduzir e integrar esse estilo de vídeo ao seu sistema

## Leitura dos vídeos enviados e da linguagem visual

Pela inspeção direta dos cinco vídeos que você enviou, há uma gramática visual muito consistente entre eles, mesmo quando o tema muda. O núcleo não é “animação cinematográfica realista”; é **composição editorial**. Os frames são construídos como papel recortado, scrapbook, mapa pop-up, recortes fotográficos, etiquetas, títulos em cartazes rasgados, objetos isolados com sombra curta, e uma lógica de **montagem por camadas**. Em vez de câmera “filmando” uma cena, a sensação é de uma mesa de arte-direção em que elementos são colocados, deslocados, trocados e encaixados no tempo.

Nos exemplos mais fortes do lote — especialmente os dois vídeos no estilo “Vox/paper-collage” — a arte trabalha com cinco pilares: **campo de cor dominante**, **recortes com contorno claro**, **textura de papel**, **objetos simbólicos de leitura instantânea** e **subtítulo sempre legível no rodapé**. Isso bate diretamente com a proposta pública do repositório `gbro-collage-broll`, que descreve o estilo como “strong flat color fields”, fotos em halftone preto e branco, acentos em papel colorido, e movimento em que os elementos entram um a um para “montar” a imagem, em vez de fade ou zoom lento. citeturn3view1

Em movimento, os vídeos enviados usam um vocabulário muito restrito e controlado. O que aparece com mais frequência é: entrada lateral, pequeno overshoot, parallax leve, pivot/hinge, build de diagrama, troca de layout entre beats e “assemble-from-empty”. Isso também aparece de forma muito clara no `vox-explainer-skill`, que explicita uma regra estética importante: esse tipo de explainer deve se mover “como motion graphics, não como footage”, com uma tabela de movimentos permitidos/proibidos e restrições negativas no prompt de animação. citeturn12view0

O sistema de cor dos seus vídeos de referência varia por assunto, mas a lógica é a mesma. Nos vídeos mais festivos, a paleta é saturada e flat; nos mais históricos ou “mágicos”, o plano de fundo fica mais escuro e seco, com marinho, pergaminho, vinho, verde musgo e dourado como acentos; nos de infográfico histórico, surgem sépia, areia, cinza ferro, azul apagado e vermelho queimado. Em outras palavras: **não é uma estética de LUT**; é uma estética de **papéis, cartazes, recortes e acentos editoriais**.

A inspeção técnica dos arquivos também mostra algo útil para o produto: seus exemplos já cobrem **24 fps e 60 fps**, além de saídas em **16:9, retrato intermediário e 9:16**, o que indica que o sistema precisa nascer multi-formato, e não adaptar o layout no fim. Para essa família visual, o padrão mais seguro continua sendo **24 fps como default**, subindo para 60 fps apenas em peças verticalizadas muito densas ou com muito micro-movimento, como no exemplo mais “histórico/infográfico” do lote.

A síntese prática é esta: se você quiser reproduzir esse tipo de vídeo de forma escalável, precisa tratar a estética como um **sistema de composição editorial**, não como um prompt isolado. O produto precisa controlar: metáfora visual, cor-base, acentos, família de movimento, hierarquia tipográfica, densidade de elementos por beat, legenda, ritmo de montagem e consistência entre cenas. É exatamente por isso que os repositórios mais úteis para o seu caso não são só geradores; eles já trazem **workflow**, **gates de aprovação**, **cronologia de produção** e **renderização parametrizada**. citeturn3view0turn12view0turn3view1turn3view5turn6search17

## O que cada repositório resolve na sua stack

O `vox-director` resolve o caso “um tema entra, um filme sai” para explainers em collage paper-style. No README, ele se apresenta como um skill que transforma um tópico em roteiro, keyframes, movimento, voice-over, música e captions, automatizando tudo com Atlas Cloud + `ffmpeg`. O fluxo inclui **beat map para aprovação**, **style bake-off** para escolha de direção visual e saída final em `mp4`; o próprio repositório organiza referências de prompt, camada narrativa, vozes, armadilhas de API e um motor local de motion por elementos. citeturn3view0

O `vox-explainer-skill` é muito valioso porque explicita três decisões de produto que eu considero essenciais para a sua ferramenta. A primeira é **VO-first timing**: o áudio é gerado e medido antes do vídeo, e a duração da narração vira o relógio mestre da montagem. A segunda é o **style anchor pattern**: um frame-âncora aprovado mantém consistência de paleta, textura e enquadramento nas gerações seguintes. A terceira é a **resumabilidade**: o estado fica salvo em arquivos de projeto, permitindo refazer um beat sem destruir o resto do filme. O skill também declara claramente o pipeline tópico → script → voiceover → keyframes → animação → música → assembly local com `ffmpeg`. citeturn12view0

O `gbro-collage-broll` resolve uma peça diferente do quebra-cabeça: o **micro-B-roll editorial**. Ele foi pensado para converter uma frase de locução de cerca de cinco segundos em um clipe premium de paper-collage “assemble-from-empty”. O mais importante para o seu produto não é só o visual, mas o processo: o repositório impõe três gates — **metáfora**, **static frame**, **vídeo** — antes de gastar mais custo de geração. O default também é perfeito para Shorts: **9:16, 5 segundos, 720×1280, 24 fps, sem áudio**. citeturn3view1

O `HyperFrames` é o melhor bloco da stack para tudo que for **HTML-native motion design**: títulos, capítulos, overlays, páginas editoriais animadas, visualização de dados, capturas de site, player embutido, preview com timeline e render determinístico. A documentação oficial define o framework como um sistema que transforma HTML em vídeo determinístico, frame a frame, com HTML/CSS, mídia e animações seekable. O CLI cobre criação, preview, render, lint e diagnósticos; o Studio pode ser embutido na sua aplicação; e o Player pode ser embutido em qualquer página. Além disso, o framework tem caminhos oficiais de deploy com preview + `/api/render`, cloud gerenciado, AWS Lambda e Google Cloud Run/Workflows. citeturn3view5turn11view5turn14search0turn14search7turn11view0turn11view1turn11view2turn11view3

O `Remotion` entra melhor como camada de **composição mestre React**, preview em app React, render server-side e render distribuído na AWS. A documentação oficial mostra que o framework foi desenhado para criar apps e automações de vídeo com props parametrizadas, `Composition`, `Series`, Player embutível, SSR e Remotion Lambda. Para um produto como o seu, isso é excelente para o “master cut”, para reutilização de templates, e para versões de um mesmo projeto em múltiplos formatos. A ressalva é jurídica: o próprio projeto informa que o uso pode exigir **Company License** fora da faixa de licença gratuita. citeturn6search17turn6search7turn6search11turn15search1turn3view4turn11view6turn11view7

Minha recomendação de encaixe é a seguinte, como síntese arquitetural: use `vox-director` e `vox-explainer-skill` como **motores de geração end-to-end**; use `gbro-collage-broll` como **motor de insert/B-roll por frase**; use `HyperFrames` como **motor editorial HTML, preview embutido e render API**; e use `Remotion` como **master timeline React para composições reutilizáveis, player interativo e render final**. Essa distribuição respeita o propósito público declarado de cada projeto e reduz sobreposição desnecessária. citeturn3view0turn12view0turn3view1turn3view5turn11view0turn15search1turn11view6

## Arquitetura recomendada para integrar tudo ao seu programa atual

Como eu não recebi o código-fonte do seu sistema atual, a maneira mais segura de integração não é “misturar tudo no mesmo código”, e sim criar uma **camada central de contrato e orquestração**. O coração dessa ferramenta deve ser um objeto versionado que eu chamaria de `SceneManifest`. É ele que permite que uma cena nasça no `vox-explainer-skill`, seja enriquecida com B-roll do `gbro`, receba títulos/chapters no `HyperFrames` e, no final, seja empacotada numa composição mestra do `Remotion`.

A arquitetura que faz mais sentido para você é um **monorepo híbrido Node + Python**, com estes blocos: um frontend web para briefing e edição; uma API principal; workers Python para acionar `vox-director`, `vox-explainer-skill` e `gbro-collage-broll`; um renderer HyperFrames; um renderer Remotion; Redis/BullMQ para filas; Postgres para persistência; e S3/MinIO para assets, versões, contact sheets e renders finais. Isso conversa muito bem com os workflows públicos dos projetos, que já pressupõem CLI, arquivos de projeto, re-render parcial, e pipelines reproduzíveis. citeturn12view0turn3view1turn13view0turn13view2turn11view5turn3view4

Abaixo está a forma como eu desenharia o produto:

```text
apps/
  studio-web              -> Next.js + TypeScript + Tailwind
  api                     -> Fastify/Nest + Zod + Prisma
  worker-python           -> invoca vox-director / vox-explainer / gbro / ffmpeg
  hyperframes-renderer    -> preview + render HTML-native
  remotion-renderer       -> master compositions + player + SSR/Lambda

packages/
  scene-contract          -> SceneManifest, ProjectManifest, RenderManifest
  style-engine            -> tokens, paletas, motion profiles, subtitle system
  niche-presets           -> presets por nicho
  prompt-engine           -> geração de beats, hooks e metáforas
  qa-engine               -> contact sheets, frame checks, loudness, caption QA
  integrations            -> YouTube, storage, webhooks do seu sistema atual

infra/
  docker/
  terraform/
  scripts/
```

O `SceneManifest` precisa carregar, no mínimo: `projectId`, `sceneId`, `aspectRatio`, `durationSec`, `engineHint`, `script`, `caption`, `palette`, `motionProfile`, `assets[]`, `voiceover`, `music`, `renderSettings`, `qaChecks[]`, `status` e `version`. O ganho prático é enorme: você para de pensar em “qual repositório gera isso” e passa a pensar em “qual motor resolve melhor esta cena”.

O fluxo operacional que eu recomendo, passo a passo, é este:

1. **Briefing e decomposição em beats.**  
   O usuário escolhe formato, nicho, idioma, duração, densidade visual e objetivo do vídeo. Para explainers completos, o sistema pode seguir o padrão do `vox-director`, que já trabalha com beat map e aprovação antes da produção custosa. citeturn3view0

2. **Gate de metáfora visual.**  
   Reaproveite a lógica do `gbro-collage-broll`: antes de gerar frame ou vídeo, o usuário aprova a metáfora central, os objetos-chave, a cor-base e a ordem de montagem. Isso economiza custo e melhora direção de arte. citeturn3view1

3. **VO-first clock.**  
   Quando a peça tiver narração, siga a decisão do `vox-explainer-skill`: gerar e medir o VO antes do restante. Isso evita que a fala fique “espremida” na imagem e faz toda a timeline nascer certa. citeturn12view0

4. **Geração de styleframes e anchor frame.**  
   Gere uma ou mais propostas de keyframe/anchor. Se o usuário aprovar uma, ela passa a governar paleta, textura e enquadramento do bloco inteiro, como no `vox-explainer-skill`. citeturn12view0

5. **Roteamento por cena.**  
   Se a cena for um B-roll curto de uma frase, mande para `gbro`. Se for um bloco narrativo completo, mande para `vox-director` ou `vox-explainer-skill`. Se for título, chapter card, gráfico, callout, UI mockup ou overlay editorial, mande para `HyperFrames`. Se for master timeline, intro/outro, variações de layout e export final, mande para `Remotion`. Essa divisão é uma inferência de arquitetura baseada nas capacidades declaradas por cada projeto. citeturn3view0turn12view0turn3view1turn14search0turn15search1

6. **Montagem final e render.**  
   Para preview editorial embutido, use `HyperFrames Studio` ou `hyperframes-player`. Para preview React do master, use `@remotion/player`. Para render final na sua infra, escolha por cena qual backend renderiza melhor, e normalize tudo para um `RenderManifest`. O Remotion não permite embutir o Studio diretamente como componente React, então o correto é usar o Player no seu próprio UI; já o HyperFrames Studio foi desenhado para ser embutido em app próprio. citeturn15search0turn15search1turn14search0

7. **QA e re-render parcial.**  
   Adote as checagens que já aparecem nesses repositórios: contact sheet, verificação do primeiro frame vazio, comparação de último frame, lint estrutural, inspeção de overflow e possibilidade de refazer somente um beat/cena. citeturn3view1turn11view5turn14search4

## Design system para Shorts, vídeos longos e nichos

O seu frontend e o seu backend precisam compartilhar o mesmo design system. Não basta “mostrar bonito” na interface; o sistema precisa **gerar vídeo bonito de forma consistente**. Eu sugiro cinco camadas de token.

A primeira camada é **cor**. Em vez de uma paleta única, use uma matriz: `paper_base`, `accent_primary`, `accent_secondary`, `photo_tint`, `label_bg`, `caption_fill`, `caption_outline`. Isso permite reproduzir as famílias visuais observadas nos seus vídeos e também trocar de nicho sem quebrar a linguagem geral.

A segunda camada é **textura**. Defina tokens como `paperTexture`, `halftoneStrength`, `cutoutStroke`, `dropShadowSoft`, `tornEdgeMask`, `grainAmount`. O resultado é que o motor pode renderizar “a mesma marca” em food, história, cultura pop ou tecnologia, sem virar um slideshow genérico.

A terceira camada é **movimento**. Em vez de deixar cada cena “inventar” sua animação, crie perfis fechados: `assemble`, `slide-lock`, `parallax-lite`, `hinge-pop`, `diagram-build`, `label-snap`, `object-swap`, `camera-drift`, `chapter-reveal`. Isso se alinha à própria filosofia declarada no `vox-explainer-skill` e ao padrão do `gbro`, em que a graça vem da montagem pensada, não do excesso de motion. citeturn12view0turn3view1

A quarta camada é **tipografia**. Para essa linguagem, eu usaria sempre uma combinação de três famílias de função:  
**display recortada** para títulos e chapter cards;  
**sans editorial forte** para captions e callouts;  
**mono/serif utilitária** para labels, datas, números, fichas, mapas e notas.  
No frontend, isso ajuda o editor; no render, isso ajuda a manter o mesmo “sotaque visual”.

A quinta camada é **legenda**. Nos vídeos enviados, a legenda não é acessório; ela é parte do layout. O sistema deve padronizar padding, outline, safe area, número máximo de linhas e velocidade de leitura. Como `vox-director` e `vox-explainer-skill` já saem com legendagem/subtitle assembly, esse componente deve nascer como módulo de plataforma, não como pós-processo improvisado. citeturn3view0turn12view0

Para o produto, eu separaria Shorts e long-form assim:

- **Shorts** devem operar por batidas visuais de 1 a 3 segundos, texto maior, menos elementos simultâneos, hook muito rápido, variação de layout a cada poucos segundos e uso intenso de `gbro` para inserts. O default deve ser 9:16. Isso está em linha direta com o default do `gbro-collage-broll`. citeturn3view1
- **Vídeos longos** devem ter capítulos, recapitulação, visual motifs recorrentes, telas de transição, mapas/diagramas mais claros e um controle maior de respiradas. Aqui entram melhor `vox-director`/`vox-explainer-skill` para o corpo principal e `HyperFrames`/`Remotion` para capítulos, lower thirds, mapas, data cards e master assembly. citeturn3view0turn12view0turn13view0turn6search17

Para nichos, eu usaria este mapeamento inicial:

| Nicho                  | Família visual               | Paleta sugerida                           | Movimento dominante        | Motor padrão                |
| ---------------------- | ---------------------------- | ----------------------------------------- | -------------------------- | --------------------------- |
| História / geopolítica | scrapbook documental         | sépia, areia, ferro, vermelho queimado    | diagram-build + label-snap | vox-explainer + HyperFrames |
| Ciência / educação     | editorial limpo              | azul, off-white, amarelo, carvão          | assemble + chapter-reveal  | HyperFrames + Remotion      |
| Finanças / negócios    | infographic paper-collage    | verde escuro, creme, azul petróleo, coral | chart-build + slide-lock   | HyperFrames + Remotion      |
| IA / produtividade     | cardboard desk / neon accent | kraft, cinza, ciano neon                  | hinge-pop + object-swap    | gbro + HyperFrames          |
| Food / travel          | saturated folk collage       | turquesa, lima, laranja, rosa, creme      | assemble + parallax-lite   | vox-director + gbro         |
| Cultura pop / fantasia | dark paper theatre           | marinho, vinho, dourado, pergaminho       | glow-pop + drift           | vox-explainer + HyperFrames |

No frontend, isso deve virar um **Preset Browser** com preview ao vivo. O lado bom é que tanto o HyperFrames quanto o Remotion têm caminhos oficiais para preview em app: o HyperFrames oferece Studio embutível, timeline persistida em HTML e player embutível; o Remotion oferece Player React embutível e props dinâmicas em runtime. citeturn14search0turn14search5turn14search7turn15search1turn15search5turn6search3

## Passo a passo de implementação e implantação

O melhor caminho não é tentar escrever “a plataforma inteira” de uma vez. É mais seguro implantar em seis ondas.

**Primeira onda: vendorizar os motores.**  
Clone os cinco repositórios para uma pasta `vendor/` dentro do seu monorepo e não os espalhe pelo aplicativo. Isso deixa claro o que é core do seu produto e o que é engine third-party/open-source. O `vox-director`, o `vox-explainer-skill` e o `gbro` já foram pensados como skills/workflows reutilizáveis; HyperFrames e Remotion já possuem CLIs, players e caminhos de render escaláveis. citeturn3view0turn12view0turn3view1turn11view5turn11view6

**Segunda onda: contrato único e filas.**  
Implemente `ProjectManifest`, `SceneManifest` e `RenderManifest`, depois BullMQ/Redis para jobs assíncronos. Isso é o divisor entre um app “que roda prompts” e uma plataforma de produção audiovisual.

**Terceira onda: gates de aprovação.**  
O frontend deve ter, no mínimo, as telas de briefing, beat board, Gate 1 metáfora, Gate 2 styleframes/contact sheet, Gate 3 motion preview, timeline, fila de render e página de QA. Esse desenho é coerente com o `vox-director` (beat map + style bake-off antes do render) e com o `gbro` (três gates formais). citeturn3view0turn3view1

**Quarta onda: preview e edição.**  
Para o editor editorial, embuta o `HyperFrames Studio`; para os projetos React/master, use `@remotion/player` e, se quiser, um servidor com Remotion Studio separado para a equipe. Isso segue a limitação oficial do Remotion — o Studio não deve ser embutido como componente no seu app — e a vantagem oficial do HyperFrames, que foi desenhado para editor embutível com timeline, preview e hot reload. citeturn15search0turn14search0

**Quinta onda: render em produção.**  
Você tem três caminhos bons:

- **mais simples**: HyperFrames Cloud para renders HTML gerenciados, sem Chrome/FFmpeg local, e render local/SSR para o resto;
- **mais controlado em AWS**: `@hyperframes/aws-lambda` para cenas HyperFrames grandes e `@remotion/lambda` para composições Remotion;
- **mais controlado em GCP**: `@hyperframes/gcp-cloud-run` com Cloud Workflows.  
  Todos esses caminhos são oficiais na documentação. citeturn11view1turn11view2turn11view3turn11view6

**Sexta onda: compliance, custo e fallback.**  
Na prática, eu recomendo tratar o HyperFrames como o render/editorial base open-source e o Remotion como camada premium de composições React realmente necessárias. O motivo é simples: o HyperFrames está sob Apache 2.0 e enfatiza uso comercial sem fee por render no OSS; o Remotion pede atenção de licenciamento conforme porte e tipo de uso. Antes de ir para produção, valide isso no seu cenário comercial. citeturn7search1turn7search8turn11view7turn10search3

## Script para o seu agente e artefatos gerados nesta conversa

Eu gerei dois artefatos prontos para você usar no seu fluxo de implantação:

- [bootstrap_video_stack.sh](sandbox:/mnt/data/bootstrap_video_stack.sh)
- [AGENT_IMPLEMENTATION_BRIEF.md](sandbox:/mnt/data/AGENT_IMPLEMENTATION_BRIEF.md)

O primeiro cria uma base de monorepo, clona os repositórios em `vendor/`, gera `docker-compose.yml`, `.env.example` e um brief inicial para implementação. O segundo é um prompt direto para o seu agente implementar a ferramenta completa sobre essa base.

O comando inicial para bootstrap é:

```bash
bash /mnt/data/bootstrap_video_stack.sh /seu/caminho/youtube-video-suite
```

Se eu estivesse implantando isso no seu ambiente hoje, a ordem prática seria: executar o bootstrap, conectar o seu sistema atual por webhooks/API, implementar primeiro o contrato `SceneManifest`, depois os workers Python para `vox-director` / `vox-explainer-skill` / `gbro`, em seguida embutir `HyperFrames Studio` para o editor visual, e por fim acoplar `Remotion` apenas ao master timeline, variantes e render final. Essa ordem minimiza risco, reaproveita melhor os repositórios que você escolheu e produz mais cedo um sistema funcional de Shorts e long-form, sem amarrar o produto inteiro a um único motor. citeturn12view0turn3view1turn14search0turn15search1turn11view6
