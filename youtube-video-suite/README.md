# youtube-video-suite

Bootstrap de uma plataforma de criação automática de vídeos para YouTube Shorts e vídeos longos.

## Primeiros passos

1. Copie o ambiente:

   ```bash
   cp .env.example .env
   ```

2. Suba a infraestrutura:

   ```bash
   docker compose up -d
   ```

3. Instale pnpm, Node.js 22+, Python 3.11+, FFmpeg e Chrome/Chromium.

4. Instale dependências:

   ```bash
   corepack enable
   pnpm install
   ```

5. Leia:
   - `AGENT_IMPLEMENTATION_BRIEF.md`
   - `docs/ARCHITECTURE.md`

## Motores externos

Os repositórios são clonados em `vendor/`. Não altere diretamente sem registrar patches.
