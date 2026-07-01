import React from 'react';

export type SectionHelpEntry = {
  title: string;
  body: React.ReactNode;
};

/** Textos de ajuda (? ) por seção — reutilizados em todo o dashboard. */
export const SECTION_HELP: Record<string, SectionHelpEntry> = {
  'tab-status': {
    title: 'Aba Render',
    body: (
      <>
        Central de compilação do vídeo. Contém: qualidade pré-render, cards de render (Padrão, Remotion, PRO, HyperFrames) e lista de arquivos na pasta OUTPUT.
      </>
    ),
  },
  'tab-workflow': {
    title: 'Workflow e Tarefas',
    body: (
      <>
        Checklist do projeto: narração, assets, block_timings, planejamento de overlays e passos antes do render. Use para destravar o que falta no pipeline.
      </>
    ),
  },
  'tab-timeline': {
    title: 'Roteiro e Tags',
    body: (
      <>
        Edição do roteiro por blocos, frases de impacto, palavras-chave em destaque e tags de narração para TTS. Salva em config e storyboard.
        A barra <strong>OpenCut</strong> oferece zoom do preview, fundo do canvas, importação de transcrição JSON, volume/velocidade por clip e exclusão em lote — use o <span className="text-gold-400/90">?</span> em cada controle.
      </>
    ),
  },
  'timeline-opencut': {
    title: 'Barra OpenCut',
    body: (
      <>
        <strong>Zoom</strong> — escala das miniaturas na grade (só preview).{' '}
        <strong>Fundo</strong> — cor do canvas no render final.{' '}
        <strong>Importar transcrição</strong> — JSON Whisper → word_transcripts.json para legendas.{' '}
        <strong>Volume / Velocidade</strong> — por clip de vídeo no card do asset.{' '}
        <strong>Multi-seleção</strong> — checkbox ou Shift/Ctrl+clique; Excluir remove todos de uma vez.
      </>
    ),
  },
  'tab-music': {
    title: 'Trilha BGM',
    body: (
      <>
        Biblioteca musical do projeto, sugestões da IA/Epidemic Sound, volume por bloco e mix com narração. Arquivos em MUSIC/.
      </>
    ),
  },
  'tab-ai': {
    title: 'IA · Metadados',
    body: (
      <>
        Títulos, descrição, tags, capítulos, thumbnail e metadados para YouTube/Reels/TikTok. Geração via Gemini com cache no projeto.
      </>
    ),
  },
  'tab-upload': {
    title: 'Upload',
    body: (
      <>
        Envio para YouTube e outras plataformas: privacidade, agendamento, capítulos, comentário fixo e integrações (Canva, etc.).
      </>
    ),
  },
  'tab-editor': {
    title: 'Editor',
    body: (
      <>
        Storyboard visual: cenas, prompts, assets por bloco, duração e notas de edição. Alterações gravadas em storyboard.json.
      </>
    ),
  },
  'tab-terminal': {
    title: 'Terminal',
    body: (
      <>
        Log em tempo real do backend durante render, mix, IA e erros. Útil para diagnosticar falhas sem sair do dashboard.
      </>
    ),
  },
  'tab-agents': {
    title: 'Studio Agents',
    body: (
      <>
        Quatro sub-abas: <strong>Automação</strong> (VideoAgent), <strong>Qualidade</strong> (captura/overlays),
        <strong> Memória</strong> (Obsidian, nichos, logs) e <strong>Skills</strong> (Hermes + configuração).
      </>
    ),
  },
  'tab-youtube-studio': {
    title: 'Canal YouTube',
    body: (
      <>
        Visão geral do canal com cache, comparativo 7d vs 7d, impressões/CTR quando disponível, templates e sugestão IA para comentários, marcar como tratado, relatório semanal, polling e notificações configuráveis.
      </>
    ),
  },
  'tab-projects': {
    title: 'Biblioteca de Projetos',
    body: (
      <>
        Todos os projetos do workspace organizados por <strong>Longos (16:9)</strong> e <strong>Shorts (9:16)</strong>,
        agrupados por nicho. Busca global, recentes e criação rápida por formato/nicho.
      </>
    ),
  },
  'tab-agent-reach': {
    title: 'Pesquisa Web (Agent Reach)',
    body: (
      <>
        Busca na internet sem terminal: <strong>Exa</strong> (web semântica), <strong>Jina</strong> (ler URL),
        GitHub, Bilibili e RSS. Integrado automaticamente em ideias, roteiros e pesquisa profunda (DeerFlow).
      </>
    ),
  },
  'tab-trend-forecast': {
    title: 'Radar de Tendências (TimesFM)',
    body: (
      <>
        Previsão de nichos e vídeos Short/Longo em alta usando <strong>TimesFM 2.5</strong> (Google Research) sobre séries de views do YouTube Analytics.
        Gera ranking de crescimento, ideias derivadas e opcionalmente enfileira na fila editorial. Sem TimesFM instalado, usa fallback estatístico.
      </>
    ),
  },
  'tab-comfy-mcp': {
    title: 'Comfy Cloud MCP',
    body: (
      <>
        Conecta agentes (Cursor, Grok, Claude) ao <strong>Comfy Cloud</strong> via MCP — geração de imagem, vídeo, áudio e 3D na nuvem.
        Configure API key, copie o JSON para <code>.cursor/mcp.json</code> e monitore a fila. O ComfyUI local (LTX) continua na aba Workflow.
      </>
    ),
  },
  'tab-creator': {
    title: 'Novo Projeto com IA',
    body: (
      <>
        Assistente em etapas: ideias virais, roteiro, checklist, storyboard e criação da pasta do projeto. Ponto de entrada para vídeos novos.
      </>
    ),
  },
  'quality-pre-render': {
    title: 'Qualidade Pré-Render',
    body: (
      <>
        Score 0–100 antes do render. Problemas com botão <strong>Corrigir automaticamente</strong> o Lumiera resolve sozinho (ex.: overlays no gancho). Só aparece passo a passo manual quando você precisa agir.
      </>
    ),
  },
  'render-standard': {
    title: 'Renderizador Padrão',
    body: (
      <>
        Compilação clássica com legendas Gold/Water Blue e zoom Ken Burns. Opção sem títulos grandes no centro da tela.
      </>
    ),
  },
  'render-remotion': {
    title: 'Remotion Engine',
    body: (
      <>
        Timeline sincronizada, narração e legendas da transcrição. Base para versões PRO e HyperFrames.
      </>
    ),
  },
  'render-remotion-pro': {
    title: 'Remotion PRO',
    body: (
      <>
        Infográficos automáticos: lower-thirds, kinetic-text, counters, bar-charts e timelines. Planejamento de overlays via IA antes do render.
      </>
    ),
  },
  'render-hyperframes': {
    title: 'HyperFrames AI',
    body: (
      <>
        Overlays orquestrados pelo catálogo HyperFrames (variantes glass, Lottie, customStyle). Opção ProRes com fundo transparente.
      </>
    ),
  },
  'render-output': {
    title: 'Vídeos na OUTPUT',
    body: (
      <>
        Arquivos MP4/ProRes gerados na pasta OUTPUT do projeto. Preview, download e caminho do arquivo final.
      </>
    ),
  },
  'workflow-toolkit': {
    title: 'Workflow e Tarefas',
    body: (
      <>
        Passos obrigatórios e opcionais: narração, timings, assets, overlays planejados e qualidade. Indica o que bloqueia o render.
      </>
    ),
  },
  'narration-replace': {
    title: 'Trocar narração',
    body: (
      <>
        Substitua <code>narracao_mestra_premium.mp3</code> em projetos já prontos. Após o upload, sincronize com Whisper para regenerar <code>word_transcripts.json</code> e <code>block_timings.json</code>. Use TTS abaixo para gerar áudio novo a partir do roteiro.
      </>
    ),
  },
  'timeline-highlights': {
    title: 'Palavras-chave em destaque',
    body: (
      <>
        Termos que o TTS e as legendas enfatizam (volume, cor ou timing). Uma por bloco ou lista global no config.
      </>
    ),
  },
  'timeline-impact': {
    title: 'Textos de impacto',
    body: (
      <>
        Frases curtas exibidas na linha do tempo (até 12 blocos). Complementam a narração nos momentos de virada.
      </>
    ),
  },
  'music-library': {
    title: 'Biblioteca BGM',
    body: (
      <>
        Faixas locais e recomendações por bloco. Volume global e por projeto; ducking durante overlays e narração.
      </>
    ),
  },
  'ai-metadata': {
    title: 'Metadados YouTube',
    body: (
      <>
        Título, descrição, tags, privacidade, capítulos, comentário fixo e thumbnail A/B. Cache em youtube_metadata_cache.json.
      </>
    ),
  },
  'settings-ia': {
    title: 'Configurações de IA',
    body: (
      <>
        Provedor (API, OpenRouter, Gemini Chrome), modelo, temperatura e modo do navegador. Afeta roteiro, overlays e metadados.
      </>
    ),
  },
  'settings-apis': {
    title: 'APIs e Mídia',
    body: (
      <>
        Chaves Gemini, OpenRouter, Epidemic Sound, ElevenLabs e paths de pastas de projetos/vídeos.
      </>
    ),
  },
  'settings-render': {
    title: 'Render global',
    body: (
      <>
        FPS, gap entre blocos, volume BGM padrão, resolução e flags de debug de overlay no Remotion.
      </>
    ),
  },
  'settings-visual': {
    title: 'Visual do projeto',
    body: (
      <>
        Legendas, grain, vignette, zoom Shorts/Long, preset documentário, cor de destaque e cards sociais/geo.
      </>
    ),
  },
  'settings-producao': {
    title: 'Produção do projeto',
    body: (
      <>
        Intensidade de overlays, gap mínimo, duração máxima, duck BGM e volume musical — salvo em config_qanat.json.
      </>
    ),
  },
  'settings-marca': {
    title: 'Marca e logos',
    body: (
      <>
        Catálogo de logos, canais YouTube vinculados e avatar para watermark/outro no render.
      </>
    ),
  },
  'settings-integracoes': {
    title: 'Integrações',
    body: (
      <>
        Canva, extensão Gemini Chrome, NotebookLM e outros conectores externos ao Lumiera.
      </>
    ),
  },
  'agents-overview': {
    title: 'Studio Agents',
    body: (
      <>
        Use as sub-abas no topo: Automação (VideoAgent), Qualidade, Memória e Skills. Resumo do projeto e contadores ficam sempre visíveis no cabeçalho.
      </>
    ),
  },
  'agents-stats': {
    title: 'Estatísticas',
    body: (
      <>
        <strong>Nichos:</strong> arquivos de memória por tema.<br />
        <strong>Promovidos:</strong> regras confirmadas (≥N ocorrências).<br />
        <strong>Em observação:</strong> candidatos ainda em teste.
      </>
    ),
  },
  'agents-actions': {
    title: 'Ações',
    body: (
      <>
        <strong>Capturar qualidade</strong> — registra score e issues; mostra preview dos padrões salvos.<br />
        <strong>Refletir e aprender</strong> — igual à captura, com fonte &quot;reflect&quot; no log.<br />
        <strong>Consolidar memória</strong> — abre modal com candidatos que serão promovidos antes de confirmar.<br />
        <strong>Planejar overlays</strong> — gera overlays_ai com aprendizados injetados.
      </>
    ),
  },
  'agents-videoagent': {
    title: 'VideoAgent — Automação',
    body: (
      <>
        <strong>Só ver plano</strong> — gera preview instantâneo com regras locais (sem Gemini). Se &quot;Enriquecer com IA&quot; estiver
        marcado, tenta melhorar o plano depois via extensão Chrome. <strong>Executar automaticamente</strong> — roda a cadeia no servidor
        e dispara Creator / pesquisa / fila editorial.
      </>
    ),
  },
  'agents-config': {
    title: 'Configuração Agents',
    body: (
      <>
        Liga/desliga aprendizados no modo agente, captura automática na qualidade (experimental) e limiar de promoção (padrão 3 ocorrências).
      </>
    ),
  },
  'agents-learnings': {
    title: 'Aprendizados',
    body: (
      <>
        Regras filtradas pelo formato do projeto (Shorts ou Longo). Azul = padrão de sucesso do formato; verde = promovido do nicho; cinza = em observação. Edite em Obsidian (<code>MEMORY.md</code> ou <code>memory/</code>).
      </>
    ),
  },
  'agents-niche-memory': {
    title: 'Memória por nicho',
    body: (
      <>
        Tabela de arquivos em .agents/memory/: runs, padrões promovidos e candidatos por tema. Clique na linha para abrir a nota no Obsidian; o nicho do projeto ativo aparece destacado.
      </>
    ),
  },
  'agents-log': {
    title: 'Log recente',
    body: (
      <>
        Registro diário em .agents/agent_runs/ com capturas, scores e projetos processados pelos agentes.
      </>
    ),
  },
  'agents-obsidian': {
    title: 'Memória no Obsidian',
    body: (
      <>
        Vault em <code>.agents/</code> — memória do programa. O hub é <code>MEMORIA-LUMIERA.md</code>; toda nota deve
        ligar a ele (references, nichos, logs). Use <strong>Reparar grafo</strong> se aparecerem nós soltos no
        Obsidian; o Lumiera também repara ao carregar Studio Agents.
      </>
    ),
  },
  'agents-skills': {
    title: 'Skills Hermes / OpenClaw',
    body: (
      <>
        Skills em <code>.agents/skills/</code> com carregamento progressivo. Bundles em{' '}
        <code>.agents/skill-bundles/</code> agrupam skills por tarefa (overlay, roteiro, SEO). O planejamento com
        memória injeta o bundle ativo + aprendizados promovidos. Propostas de edição ficam no workshop até você aprovar.
      </>
    ),
  },
  'overlay-timing': {
    title: 'Timing overlays IA',
    body: (
      <>
        Verificação de start e duração de cada overlay planejado antes do render. Verde = OK; âmbar/vermelho = problema de cena, bloco ou reparo automático.
      </>
    ),
  },
  'music-mixer': {
    title: 'Estúdio de mixagem BGM',
    body: (
      <>
        Define qual faixa toca em cada bloco e regenera o mix com crossfade de 2s. O volume global vem de Configurações → Render.
      </>
    ),
  },
  'music-mapping': {
    title: 'Configuração de trilha',
    body: (
      <>
        Modo por bloco ou trilha única. Associe arquivos da pasta MUSIC/ a cada capítulo do vídeo.
      </>
    ),
  },
  'music-available': {
    title: 'Músicas disponíveis',
    body: (
      <>
        Faixas MP3/WAV no projeto: preview, exclusão em massa e download de novas músicas via Epidemic ou upload manual.
      </>
    ),
  },
  'epidemic-sound': {
    title: 'API Epidemic Sound',
    body: (
      <>
        Busca BGM e SFX no catálogo Epidemic (MCP SSE), download ao projeto e sonoplastia IA que mapeia faixas automaticamente ao roteiro.
      </>
    ),
  },
  'ai-provider-panel': {
    title: 'Provedor de IA',
    body: (
      <>
        Status da conexão ativa (Gemini, Grok ou OpenRouter). Chaves e modelo em Configurações → IA.
      </>
    ),
  },
  'ai-chat': {
    title: 'Chat de engenharia IA',
    body: (
      <>
        Assistente contextual: palavras-chave, textos de impacto, sugestões de BGM. Respostas podem trazer JSON aplicável com um clique.
      </>
    ),
  },
  'thumbnails-ab': {
    title: 'Thumbnails A/B',
    body: (
      <>
        Três variantes de capa com texto overlay pareado ao título. Gere localmente (sharp) ou via Canva Connect.
      </>
    ),
  },
  'upload-platforms': {
    title: 'Upload multi-plataforma',
    body: (
      <>
        Metadados por rede (YouTube, Instagram, TikTok), seleção do vídeo em OUTPUT, agendamento e comentário fixo pós-upload.
      </>
    ),
  },
  'editor-project': {
    title: 'Editor de projetos',
    body: (
      <>
        Carregue um projeto para substituir imagens, vídeos e trilhas por bloco. Abas: roteiro JSON, estrutura e linha do tempo de assets.
      </>
    ),
  },
  'editor-script': {
    title: 'Editor de roteiro',
    body: (
      <>
        Edite narração, prompts visuais e ordem das cenas. Enriqueça com NotebookLM ou adicione cenas ao fim do storyboard.
      </>
    ),
  },
  'creator-wizard': {
    title: 'Criador automatizado',
    body: (
      <>
        Wizard em 7 passos: ideias virais, roteiro Script Master, checklist, storyboard, render, metadados YouTube e publicação.
      </>
    ),
  },
  'creator-script-strategy': {
    title: 'Estratégia do roteiro',
    body: (
      <>
        Saída do Script Master: título, hook, variações, checklist (clique/retention/comentários) e blocos editáveis com prompts visuais.
      </>
    ),
  },
  'creator-listicle': {
    title: 'Top N — Rankings',
    body: (
      <>
        Modo listicle: ideias virais ranqueadas por nicho para Shorts com HUD de contagem e títulos curtos para retenção.
      </>
    ),
  },
  'narration-review': {
    title: 'Revisão de narração',
    body: (
      <>
        A narração é gerada e, com NotebookLM conectado (<code>nlm login</code>), enriquecida automaticamente com fatos das fontes — mesmo estilo do botão &quot;Enriquecer com NotebookLM&quot; no editor. Revise por bloco antes de aprovar o roteiro completo.
      </>
    ),
  },
  'settings-config': {
    title: 'Configurações',
    body: (
      <>
        Central de IA, APIs, render global, visual do projeto, produção, marca (logo/canal) e integrações OAuth (YouTube, Canva, Instagram).
      </>
    ),
  },
  'timeline-media-blocks': {
    title: 'Arquivos de mídia por bloco',
    body: (
      <>
        Lista de imagens, vídeos e áudios mapeados a cada bloco da linha do tempo. Edite prompts, duração e substitua assets.
      </>
    ),
  },
  'creator-step-ideas': {
    title: 'Passo 1 — Ideias',
    body: (
      <>
        Script Master gera 10 ideias virais por nicho ou aceita roteiro manual. Escolha uma ideia para montar narração e storyboard.
      </>
    ),
  },
  'creator-step-select-idea': {
    title: 'Seleção de ideia',
    body: (
      <>
        Compare as 10 propostas da IA (gancho, promessa, emoção) e selecione uma para gerar o roteiro completo.
      </>
    ),
  },
  'editor-json': {
    title: 'JSON do roteiro',
    body: (
      <>
        Visualização e edição direta do storyboard.json e arquivos de configuração do projeto — para usuários avançados.
      </>
    ),
  },
  'creator-step-narration': {
    title: 'Passo 2 — Narração',
    body: (
      <>
        Upload do áudio de narração gravado ou gerado externamente. Base para sincronização e block_timings.
      </>
    ),
  },
  'creator-step-sync': {
    title: 'Passo 3 — Sincronização',
    body: (
      <>
        Transcrição inteligente alinha o áudio aos blocos do roteiro e gera timings para legendas e overlays.
      </>
    ),
  },
  'creator-step-ready': {
    title: 'Passo 4 — Pronto para render',
    body: (
      <>
        Checklist final: narração, assets, BGM e storyboard validados. Avance para render ou metadados.
      </>
    ),
  },
  'creator-step-metadata': {
    title: 'Passo 6 — Metadados',
    body: (
      <>
        Títulos, descrição, tags, capítulos e thumbnails A/B gerados pela IA para o YouTube.
      </>
    ),
  },
  'creator-step-publish': {
    title: 'Passo 7 — Publicar',
    body: (
      <>
        Abre a aba Upload com metadados aplicados para envio ao YouTube e outras plataformas.
      </>
    ),
  },
  'creator-blocks': {
    title: 'Roteiro por blocos',
    body: (
      <>
        Cada bloco tem narração, duração e prompt visual editáveis. Salvo automaticamente no storyboard.json.
      </>
    ),
  },
  'lumiera-agent': {
    title: 'Lumiera Agent',
    body: (
      <>
        Chat flutuante do assistente global: dúvidas sobre o projeto, atalhos e sugestões sem sair da tela atual.
      </>
    ),
  },
};