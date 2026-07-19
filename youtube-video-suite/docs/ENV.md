# YouTube Video Suite — Environment Variables

## Required

| Variable       | Description                  | Example                                            |
| -------------- | ---------------------------- | -------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/videosuite` |
| `REDIS_URL`    | Redis connection string      | `redis://localhost:6379`                           |

## Optional (API Keys)

| Variable              | Description                   | Fallback                       |
| --------------------- | ----------------------------- | ------------------------------ |
| `GEMINI_API_KEY`      | Google Gemini API key for LLM | Reads from `config_qanat.json` |
| `FISH_SPEECH_API_URL` | Fish Speech TTS endpoint      | Reads from `config_qanat.json` |
| `FISH_SPEECH_API_KEY` | Fish Speech API key           | Reads from `config_qanat.json` |

## Server

| Variable      | Default       | Description             |
| ------------- | ------------- | ----------------------- |
| `PORT`        | `3001`        | API server port         |
| `NODE_ENV`    | `development` | Node environment        |
| `STORAGE_DIR` | `./storage`   | Asset storage directory |

## Docker Compose Defaults

The `docker-compose.yml` provides:

- **PostgreSQL**: `videosuite:videosuite_dev@postgres:5432/videosuite`
- **Redis**: `redis://redis:6379`
- **API**: Port `3001`
- **Studio Web**: Port `5180`

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d postgres redis

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Run migrations
pnpm --filter @video-suite/api prisma migrate dev

# 4. Seed database
pnpm --filter @video-suite/api prisma db seed

# 5. Start API
pnpm --filter @video-suite/api dev

# 6. Start Studio Web
pnpm --filter @video-suite/studio-web dev
```
