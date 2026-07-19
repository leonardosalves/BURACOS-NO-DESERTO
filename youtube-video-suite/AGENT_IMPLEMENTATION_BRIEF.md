# BRIEFING MESTRE PARA IMPLEMENTAÇÃO — YOUTUBE VIDEO SUITE

## 1. Papel do agente

Você é o engenheiro principal responsável por implementar uma plataforma completa de criação automática de vídeos para YouTube, compatível com Shorts verticais e vídeos longos horizontais.

Não produza apenas um protótipo visual. Entregue um sistema funcional, modular, testável e implantável, com frontend, backend, banco de dados, filas, armazenamento, motores de geração, preview, renderização e controle de qualidade.

Trabalhe diretamente no repositório criado pelo arquivo `bootstrap_video_stack.sh`.

---

## 2. Objetivo do produto

Criar uma ferramenta em que o usuário forneça:

- tema;
- roteiro ou instrução;
- nicho;
- idioma;
- formato Short ou Long;
- proporção;
- duração;
- estilo visual;
- voz;
- música;
- nível de densidade visual.

A plataforma deverá transformar esses dados em:

1. tese e estrutura narrativa;
2. beat map;
3. metáforas visuais;
4. styleframes;
5. narração;
6. cenas animadas;
7. legendas sincronizadas;
8. trilha e efeitos;
9. preview editável;
10. vídeo final renderizado;
11. variações em 9:16 e 16:9;
12. pacote de assets, projeto e relatórios de QA.

---

## 3. Repositórios e responsabilidade de cada motor

Integre estes projetos sem copiar lógica de maneira desorganizada:

### `vendor/vox-director`

Use como referência e adaptador para:

- criação de explainer completo;
- planejamento por beats;
- aprovação de beat map;
- style bake-off;
- geração de roteiro, keyframes, VO, música, captions e montagem;
- pipeline end-to-end.

Não acople o produto diretamente às estruturas internas do repositório. Crie um adapter que transforme `SceneManifest` no formato esperado pelo motor e converta a saída de volta para o contrato central.

### `vendor/vox-explainer-skill`

Use como referência e adaptador para:

- VO-first timing;
- style anchor;
- consistência visual entre cenas;
- re-render parcial;
- retomada do projeto;
- geração de keyframes;
- regras de motion graphics;
- estrutura de projeto resumível.

A duração real do áudio deve ser o relógio principal da timeline.

### `vendor/gbro-collage-broll`

Use como motor de inserts editoriais de curta duração.

Fluxo obrigatório:

1. Gate de metáfora;
2. Gate de frame estático;
3. Gate de movimento;
4. render final.

Padrão inicial:

- 9:16;
- 24 fps;
- aproximadamente 5 segundos;
- sem áudio;
- montagem `assemble-from-empty`;
- campo de cor flat;
- recortes com contorno;
- textura de papel;
- halftone;
- sombra curta;
- sem fade genérico.

### `vendor/hyperframes`

Use para:

- títulos;
- cards editoriais;
- mapas;
- gráficos;
- diagramas;
- overlays;
- legendas;
- lower thirds;
- capítulos;
- componentes HTML/CSS/GSAP;
- preview;
- editor visual;
- render determinístico.

O frontend pode embutir o player/editor compatível do HyperFrames, mas deve encapsulá-lo atrás de um componente próprio.

### `vendor/remotion`

Use para:

- master timeline;
- composição final;
- templates React;
- variantes multi-formato;
- intro e outro;
- sequenciamento;
- preview React;
- render server-side;
- export final.

Antes de produção comercial, preserve uma configuração explícita de licença. Não esconda o requisito de licenciamento.

### FFmpeg / FFprobe

Use para:

- concatenação;
- normalização de codecs;
- loudness;
- mux;
- thumbnails;
- contact sheets;
- proxy;
- waveform;
- análise técnica;
- validação de duração;
- geração de legendas queimadas quando necessário.

---

## 4. Princípio arquitetural obrigatório

O sistema inteiro deve trabalhar sobre três contratos versionados:

- `ProjectManifest`;
- `SceneManifest`;
- `RenderManifest`.

Nenhum motor externo pode ser chamado diretamente por componentes de interface.

Fluxo correto:

```text
Frontend
  -> API
  -> ProjectManifest
  -> Orchestrator
  -> SceneManifest
  -> Engine Adapter
  -> Job Queue
  -> Worker
  -> RenderManifest
  -> QA
  -> Aprovação
  -> Master Render
```

Implemente schemas Zod e tipos TypeScript. Para o worker Python, gere equivalentes Pydantic.

---

## 5. Estrutura esperada do monorepo

```text
apps/
  studio-web/
  api/
  worker-python/
  hyperframes-renderer/
  remotion-renderer/

packages/
  scene-contract/
  style-engine/
  niche-presets/
  prompt-engine/
  qa-engine/
  integrations/
  config/

vendor/
  vox-director/
  vox-explainer-skill/
  gbro-collage-broll/
  remotion/
  hyperframes/

infra/
  docker/
  scripts/
  terraform/

docs/
```

Use pnpm workspaces e Turborepo.

---

## 6. Stack obrigatória

### Frontend

- Next.js App Router;
- TypeScript estrito;
- React;
- Tailwind CSS;
- shadcn/ui;
- Zustand para estado de editor local;
- TanStack Query para dados remotos;
- React Hook Form;
- Zod;
- dnd-kit para timeline e ordenação;
- WebSocket ou Server-Sent Events para progresso;
- player HyperFrames encapsulado;
- player Remotion encapsulado.

### Backend

Escolha NestJS ou Fastify. Prefira Fastify caso não exista requisito prévio do sistema atual.

Use:

- TypeScript;
- Prisma;
- PostgreSQL;
- BullMQ;
- Redis;
- OpenAPI;
- Zod;
- autenticação por sessão/JWT;
- RBAC;
- webhooks assinados;
- idempotency keys;
- logs estruturados.

### Workers

- Python 3.11+;
- FastAPI apenas para endpoints internos quando necessário;
- Pydantic;
- asyncio;
- subprocess seguro;
- ffmpeg/ffprobe;
- OpenCV/Pillow para análises;
- adapters para os skills;
- heartbeat de jobs;
- retry controlado;
- cancelamento.

### Infraestrutura

- Docker Compose para desenvolvimento;
- S3 ou MinIO;
- PostgreSQL;
- Redis;
- containers isolados para renders;
- opção de AWS Lambda/Cloud Run;
- GitHub Actions;
- OpenTelemetry;
- Sentry;
- Prometheus/Grafana opcional.

---

## 7. Modelo de dados

Implemente no Prisma, no mínimo:

### User

- id;
- name;
- email;
- role;
- createdAt;
- updatedAt.

### Workspace

- id;
- name;
- ownerId;
- plan;
- storageQuota;
- renderQuota.

### Project

- id;
- workspaceId;
- title;
- format;
- nicheId;
- language;
- aspectRatio;
- fps;
- targetDurationSec;
- status;
- currentVersion;
- manifestJson;
- createdAt;
- updatedAt.

### Scene

- id;
- projectId;
- order;
- engineHint;
- durationSec;
- script;
- caption;
- visualMetaphor;
- paletteId;
- motionProfile;
- status;
- version;
- manifestJson.

### Asset

- id;
- workspaceId;
- projectId;
- sceneId opcional;
- type;
- role;
- storageKey;
- mimeType;
- width;
- height;
- durationSec;
- checksum;
- metadataJson;
- createdAt.

### Approval

- id;
- projectId;
- sceneId opcional;
- gate;
- status;
- comment;
- approvedBy;
- createdAt.

### Job

- id;
- projectId;
- sceneId opcional;
- queue;
- type;
- status;
- progress;
- attempts;
- errorCode;
- errorMessage;
- payloadJson;
- resultJson;
- startedAt;
- completedAt.

### Render

- id;
- projectId;
- sceneId opcional;
- engine;
- variant;
- status;
- storageKey;
- width;
- height;
- fps;
- durationSec;
- codec;
- manifestJson;
- createdAt.

### Preset

- id;
- workspaceId opcional;
- type;
- nicheId;
- name;
- version;
- configJson;
- isSystem.

### PromptVersion

- id;
- name;
- stage;
- version;
- content;
- active;
- metricsJson.

### AuditLog

- id;
- userId;
- workspaceId;
- action;
- resourceType;
- resourceId;
- metadataJson;
- createdAt.

---

## 8. Sistema de design do vídeo

Não confunda o design do aplicativo com o design do vídeo. Os dois devem compartilhar tokens, mas são sistemas separados.

Implemente `packages/style-engine`.

### Tokens de cor

```ts
type VideoPalette = {
  id: string;
  paperBase: string;
  paperSecondary: string;
  accentPrimary: string;
  accentSecondary: string;
  accentDanger: string;
  photoTint: string;
  labelBackground: string;
  captionFill: string;
  captionOutline: string;
  shadow: string;
};
```

### Tokens de textura

- `paperTexture`;
- `paperGrain`;
- `halftoneStrength`;
- `tornEdgeMask`;
- `cutoutStroke`;
- `dropShadowDistance`;
- `dropShadowBlur`;
- `inkBleed`;
- `noiseSeed`.

### Perfis de movimento

Implemente funções determinísticas para:

- `assemble`;
- `slide-lock`;
- `parallax-lite`;
- `hinge-pop`;
- `diagram-build`;
- `label-snap`;
- `object-swap`;
- `camera-drift`;
- `chapter-reveal`;
- `chart-build`.

Cada perfil deve aceitar:

- frame atual;
- fps;
- entrada;
- saída;
- overshoot;
- delay;
- direção;
- intensidade;
- seed.

Não use animação aleatória não determinística durante render.

### Sistema tipográfico

Defina papéis, não fontes rígidas:

- `displayCutout`;
- `editorialSans`;
- `utilityMono`;
- `documentarySerif`;
- `captionBold`.

Permita substituição por preset.

### Legendas

A legenda deve ser parte do layout.

Implemente:

- safe areas por formato;
- máximo de duas linhas;
- segmentação por palavras;
- highlighting opcional;
- outline;
- sombra;
- tamanho responsivo;
- velocidade de leitura;
- bloqueio de sobreposição com elementos;
- fallback automático de posição.

---

## 9. Presets de nicho

Implemente pelo menos estes presets iniciais:

### História / engenharia antiga

- paleta: sépia, areia, ferro, vermelho queimado;
- textura: papel documental;
- motion: diagram-build, label-snap, parallax-lite;
- assets: mapas, plantas, gravuras, recortes;
- motor padrão: vox-explainer + HyperFrames + Remotion.

### Geografia / geopolítica

- paleta: azul apagado, creme, vermelho editorial;
- motion: mapas, rotas, áreas destacadas, chapter-reveal;
- motor padrão: HyperFrames + Remotion.

### Ciência / educação

- paleta: azul, off-white, amarelo, carvão;
- motion: assemble, diagram-build, chart-build;
- motor padrão: HyperFrames + Remotion.

### Finanças / negócios

- paleta: verde escuro, creme, petróleo, coral;
- motion: chart-build, slide-lock, label-snap;
- motor padrão: HyperFrames + Remotion.

### IA / produtividade

- paleta: kraft, grafite, ciano;
- motion: hinge-pop, object-swap, UI cards;
- motor padrão: gbro + HyperFrames.

### Food / viagem

- paleta: turquesa, laranja, lima, creme;
- motion: assemble, parallax-lite;
- motor padrão: vox-director + gbro.

### Cultura pop / fantasia

- paleta: marinho, vinho, dourado, pergaminho;
- motion: glow controlado, drift, chapter-reveal;
- motor padrão: vox-explainer + HyperFrames.

Cada preset deve definir:

- paleta;
- textura;
- tipografia;
- densidade;
- ritmo;
- motor preferido;
- fallback;
- prompt base;
- regras negativas;
- legendas;
- transições;
- qualidade;
- custos máximos.

---

## 10. Fluxo UX obrigatório

### Tela 1 — Dashboard

Exibir:

- projetos recentes;
- status;
- formato;
- duração;
- progresso;
- falhas;
- custo estimado;
- ação de duplicar;
- ação de criar Short derivado de vídeo longo.

### Tela 2 — Novo projeto

Campos:

- título;
- assunto;
- tese;
- idioma;
- nicho;
- Short/Long;
- proporção;
- duração;
- fps;
- voz;
- estilo;
- nível de automação;
- orçamento máximo;
- referências.

### Tela 3 — Beat Board

Cada beat deve mostrar:

- fala;
- duração estimada;
- objetivo;
- metáfora;
- assets;
- motor;
- densidade;
- aprovação.

### Tela 4 — Gate 1: Metáfora

Apresentar de uma a três propostas.

O usuário pode:

- aprovar;
- editar;
- rejeitar;
- regenerar;
- aplicar a várias cenas.

### Tela 5 — Gate 2: Styleframes

Gerar contact sheet.

Mostrar:

- paleta;
- composição;
- textura;
- legibilidade;
- consistência;
- anchor frame.

### Tela 6 — Gate 3: Motion

Preview leve em baixa resolução.

Permitir:

- ajustar intensidade;
- direção;
- duração;
- overshoot;
- entrada;
- saída;
- seed.

### Tela 7 — Timeline

Recursos mínimos:

- tracks;
- cenas;
- áudio;
- legendas;
- música;
- overlays;
- drag-and-drop;
- trim;
- split;
- reorder;
- zoom;
- snapping;
- waveform;
- bloqueio;
- mute/solo;
- preview;
- undo/redo.

### Tela 8 — QA

Exibir:

- primeiro frame;
- último frame;
- contact sheet;
- overflow;
- safe area;
- legenda;
- duração;
- loudness;
- black frames;
- frozen frames;
- duplicação visual;
- inconsistência de paleta;
- áudio clipado;
- assets faltantes.

### Tela 9 — Exportação

Opções:

- 9:16;
- 16:9;
- 1:1;
- 4:5;
- 720p;
- 1080p;
- 1440p;
- 24/30/60 fps;
- MP4;
- WebM;
- vídeo limpo;
- vídeo com legenda;
- pacote de projeto;
- thumbnail;
- SRT;
- JSON de capítulos.

---

## 11. Pipeline de criação

### Etapa A — Briefing

Produzir:

- tese única;
- promessa;
- público;
- tom;
- restrições;
- fontes;
- CTA.

### Etapa B — Roteiro

O roteiro deve:

- ser oral;
- ter progressão lógica;
- evitar linguagem escolar;
- evitar frases vazias;
- usar números e cenas concretas;
- controlar duração;
- separar fala e indicação visual.

### Etapa C — VO-first

1. gerar voz;
2. medir duração real;
3. gerar timestamps;
4. recalcular beats;
5. atualizar manifests;
6. só então iniciar visual.

### Etapa D — Direção visual

Para cada beat:

- definir metáfora;
- definir objetos;
- definir ordem de montagem;
- escolher paleta;
- escolher textura;
- escolher motor;
- gerar styleframe;
- aprovar anchor.

### Etapa E — Geração de cenas

Roteamento:

```text
B-roll curto editorial -> gbro
Explainer completo -> vox-director ou vox-explainer
Mapa/gráfico/título/UI -> HyperFrames
Master timeline/variantes -> Remotion
Normalização e mux -> FFmpeg
```

### Etapa F — QA

Executar QA automático antes de mostrar como pronto.

### Etapa G — Master render

A composição final deve consumir apenas `RenderManifest` aprovados.

---

## 12. Filas BullMQ

Crie filas separadas:

- `planning`;
- `script`;
- `tts`;
- `alignment`;
- `metaphor`;
- `styleframe`;
- `image-generation`;
- `gbro-render`;
- `vox-render`;
- `hyperframes-render`;
- `remotion-render`;
- `audio-mix`;
- `qa`;
- `delivery`.

Cada job deve ter:

- idempotency key;
- timeout;
- retries;
- backoff exponencial;
- heartbeat;
- cancelamento;
- progresso;
- logs;
- resultado persistido;
- dead-letter handling.

Não execute render pesado dentro do processo HTTP.

---

## 13. APIs mínimas

Implemente rotas REST versionadas.

### Projetos

- `POST /v1/projects`
- `GET /v1/projects`
- `GET /v1/projects/:id`
- `PATCH /v1/projects/:id`
- `POST /v1/projects/:id/duplicate`
- `POST /v1/projects/:id/generate`
- `POST /v1/projects/:id/cancel`

### Cenas

- `GET /v1/projects/:id/scenes`
- `PATCH /v1/scenes/:sceneId`
- `POST /v1/scenes/:sceneId/regenerate`
- `POST /v1/scenes/:sceneId/render`
- `POST /v1/scenes/:sceneId/approve`

### Assets

- upload multipart/presigned;
- listagem;
- metadata;
- proxy;
- deleção;
- versionamento.

### Jobs

- status;
- progresso;
- cancelamento;
- retry;
- logs.

### Renders

- preview;
- final;
- variantes;
- download assinado;
- comparação.

### Presets

- sistema;
- workspace;
- duplicação;
- importação/exportação.

### Webhooks

- job completed;
- job failed;
- project ready;
- render ready;
- approval requested.

Assine webhooks com HMAC.

---

## 14. Adapters obrigatórios

Crie uma interface comum:

```ts
export interface VideoEngineAdapter {
  name: string;
  supports(scene: SceneManifest): boolean;
  estimate(scene: SceneManifest): Promise<EngineEstimate>;
  prepare(scene: SceneManifest): Promise<PreparedEngineInput>;
  execute(
    input: PreparedEngineInput,
    context: JobContext
  ): Promise<EngineOutput>;
  normalize(output: EngineOutput): Promise<RenderManifest>;
  cancel(jobId: string): Promise<void>;
  healthcheck(): Promise<HealthcheckResult>;
}
```

Implemente:

- `VoxDirectorAdapter`;
- `VoxExplainerAdapter`;
- `GbroCollageAdapter`;
- `HyperFramesAdapter`;
- `RemotionAdapter`;
- `FfmpegAdapter`.

Nenhum adapter deve depender da UI.

---

## 15. Sistema de prompts

Centralize prompts em `packages/prompt-engine`.

Cada prompt deve ter:

- nome;
- versão;
- objetivo;
- entradas;
- saída JSON;
- regras;
- negativos;
- exemplos;
- modelo;
- temperatura;
- custo estimado;
- métricas.

Prompts mínimos:

- tese;
- beat map;
- roteiro;
- metáfora visual;
- decomposição de objetos;
- styleframe;
- movimento;
- seleção de motor;
- QA semântico;
- música;
- efeitos sonoros;
- título e thumbnail.

A saída deve ser JSON validável, nunca texto livre sem schema.

---

## 16. Controle de qualidade

Implemente verificações automáticas:

### Vídeo

- resolução correta;
- fps correto;
- duração tolerada;
- codec aceito;
- pixel format;
- ausência de frames pretos longos;
- ausência de freeze acidental;
- primeiro frame;
- último frame;
- safe area;
- overflow;
- texto cortado;
- elementos fora da tela;
- repetição excessiva;
- consistência de cor;
- consistência do anchor frame.

### Áudio

- loudness alvo;
- true peak;
- clipping;
- silêncio;
- duração;
- VO audível;
- música abaixo da voz;
- ducking;
- fade correto;
- ausência de click.

### Legendas

- sincronização;
- leitura;
- linhas;
- caracteres;
- contraste;
- safe area;
- ortografia;
- ausência de sobreposição.

### Narrativa

- tese preservada;
- beat sem função removido;
- progressão;
- hook;
- payoff;
- CTA;
- fatos marcados para revisão.

Gere relatório JSON e HTML.

---

## 17. Segurança

Implemente:

- validação de MIME;
- limite de upload;
- antivírus opcional;
- nomes de arquivos normalizados;
- execução de subprocess sem shell interpolation;
- sandbox de render;
- timeout;
- rate limit;
- quotas;
- RBAC;
- segregação por workspace;
- URLs assinadas;
- criptografia de segredos;
- auditoria;
- CSP;
- proteção CSRF quando aplicável;
- assinatura de webhook.

Nunca monte comandos FFmpeg concatenando texto de usuário.

---

## 18. Observabilidade

Adicione:

- logs estruturados;
- correlation ID;
- project ID;
- scene ID;
- job ID;
- engine;
- duração;
- custo;
- tentativas;
- erro categorizado.

Métricas:

- jobs por status;
- tempo por estágio;
- custo por minuto;
- falhas por motor;
- fila acumulada;
- velocidade de render;
- uso de storage;
- taxa de aprovação por gate;
- regenerações;
- cache hit.

Tracing:

- API;
- fila;
- worker;
- engine;
- storage;
- render;
- webhook.

---

## 19. Testes

### Unitários

- schemas;
- roteamento;
- presets;
- motion profiles;
- adapters;
- cálculo de duração;
- segmentação de legendas.

### Integração

- Postgres;
- Redis;
- MinIO;
- upload;
- filas;
- workers;
- normalização FFmpeg.

### E2E

Fluxo completo:

1. criar projeto;
2. gerar beats;
3. aprovar metáfora;
4. gerar styleframe;
5. aprovar motion;
6. renderizar cena;
7. montar vídeo;
8. executar QA;
9. exportar.

### Golden tests

Mantenha projetos de referência com hash e screenshots para detectar regressões visuais.

---

## 20. Ordem de implementação

### Fase 1 — Fundação

- configurar monorepo;
- criar schemas;
- banco;
- filas;
- storage;
- auth;
- projetos;
- cenas;
- assets;
- jobs.

### Fase 2 — Pipeline mínimo

- briefing;
- roteiro;
- TTS;
- alignment;
- SceneManifest;
- FFmpeg;
- master render simples.

### Fase 3 — HyperFrames

- adapter;
- renderer;
- player;
- títulos;
- legendas;
- mapas;
- gráficos;
- overlays.

### Fase 4 — Remotion

- master timeline;
- Player;
- templates;
- variantes 9:16 e 16:9;
- render server-side.

### Fase 5 — Skills Vox e gbro

- adapters isolados;
- gates;
- style anchor;
- VO-first;
- re-render parcial;
- B-roll editorial.

### Fase 6 — Editor

- beat board;
- gates;
- timeline;
- waveform;
- preview;
- undo/redo.

### Fase 7 — QA e produção

- QA completo;
- observabilidade;
- quotas;
- cache;
- deploy;
- backups;
- CI/CD.

---

## 21. Critérios de aceite do MVP

O MVP só é considerado concluído quando:

1. um usuário cria um projeto;
2. escolhe Short ou Long;
3. define nicho;
4. o sistema gera beat map;
5. o usuário aprova metáfora;
6. o sistema gera styleframe;
7. o usuário aprova;
8. o sistema gera VO;
9. o sistema mede a duração real;
10. cenas são roteadas para motores;
11. pelo menos HyperFrames e Remotion funcionam;
12. o vídeo final é montado;
13. legendas são sincronizadas;
14. QA técnico é executado;
15. o arquivo final pode ser baixado;
16. o projeto pode ser retomado;
17. uma única cena pode ser regenerada;
18. 9:16 e 16:9 funcionam sem simplesmente recortar a composição;
19. erros aparecem com mensagens úteis;
20. o processo é reproduzível.

---

## 22. Regras de execução para o agente

- Não reescreva os repositórios externos dentro do core.
- Não crie dependência circular.
- Não use `any` sem justificativa.
- Não deixe `TODO` em código entregue.
- Não simule uma integração quando ela puder ser implementada.
- Quando uma API externa não estiver configurada, implemente adapter mock explícito.
- Documente todas as variáveis de ambiente.
- Gere migrations.
- Gere seed.
- Gere OpenAPI.
- Gere Dockerfiles.
- Gere CI.
- Gere testes.
- Execute lint, typecheck e testes antes de declarar conclusão.
- Faça commits pequenos e descritivos.
- Registre decisões em `docs/decisions/`.
- Preserve o sistema atual; integre por API, adapter ou módulo claramente delimitado.
- Antes de modificar arquitetura existente, faça inventário do código e escreva um plano de migração.
- Nunca apague funcionalidades existentes sem evidência e confirmação registrada.

---

## 23. Primeira tarefa do agente

Ao receber este arquivo:

1. leia todo o repositório;
2. inventarie stack e estrutura existentes;
3. verifique Node, pnpm, Python, Docker, FFmpeg e Git;
4. leia os READMEs dos cinco repositórios em `vendor/`;
5. compare licenças;
6. escreva `docs/IMPLEMENTATION_PLAN.md`;
7. escreva `docs/INTEGRATION_MATRIX.md`;
8. escreva `docs/RISKS.md`;
9. implemente a Fase 1;
10. execute os testes;
11. apresente o diff;
12. só então avance para a Fase 2.

A implementação deve ser incremental, verificável e funcional em cada etapa.
