# Integration Matrix — YouTube Video Suite

## Engine × Capability Matrix

| Engine           |   Composition   | Timeline  | VO-First |  Multi-Format  | Templates | Server Render | Fallback |
| ---------------- | :-------------: | :-------: | :------: | :------------: | :-------: | :-----------: | :------: |
| **Remotion**     |  ✅ React/TSX   | ✅ Master |    ✅    | ✅ 9:16 / 16:9 |    ✅     |    ✅ CLI     |  FFmpeg  |
| **HyperFrames**  |  ✅ HTML/GSAP   |     —     |    —     |       ✅       |    ✅     |  ✅ headless  |  FFmpeg  |
| **VoxDirector**  |  ✅ Beat-based  |     —     |    ✅    |       —        |     —     |   ✅ script   |  FFmpeg  |
| **VoxExplainer** |   ✅ VO-first   |     —     |    ✅    |       —        |     —     |   ✅ script   |  FFmpeg  |
| **GbroCollage**  |   ✅ Collage    |     —     |    —     |    ✅ 9:16     |     —     |   ✅ script   |  FFmpeg  |
| **FFmpeg**       | ✅ concat/slide |     —     |    —     |       ✅       |     —     |   ✅ native   |    —     |

## Pipeline Flow

```
LLM Briefing → Script → TTS (Fish Speech) → Alignment (ffprobe)
                                  ↓
                           Beat Board (scenes)
                                  ↓
                      Gate 1: Metaphor → Gate 2: Style → Gate 3: Motion
                                  ↓
                        Scene Router → Engine Adapter
                                  ↓
                      Render → QA → Export → Delivery
```

## Integration Points

| Source     | Target            | Integration Type          | Contract                         |
| ---------- | ----------------- | ------------------------- | -------------------------------- |
| API        | LLM (Gemini)      | REST + Zod                | `BriefingOutput`, `ScriptOutput` |
| API        | TTS (Fish Speech) | REST                      | `config_qanat.json`              |
| API        | FFmpeg            | CLI subprocess            | stdin/stdout                     |
| API        | Remotion          | CLI `npx remotion render` | TSX composition                  |
| API        | HyperFrames       | Headless browser CLI      | HTML + `window.__hf`             |
| API        | VoxDirector       | Shell script              | JSON spec                        |
| API        | VoxExplainer      | Shell script              | JSON spec                        |
| API        | GbroCollage       | Shell script              | JSON spec                        |
| API        | PostgreSQL        | Prisma ORM                | Schema models                    |
| API        | Redis             | BullMQ                    | 14 named queues                  |
| Studio Web | API               | REST via Vite proxy       | OpenAPI 3.1                      |

## Vendor License Status

| Vendor              | License           | Commercial Use                  | Note                    |
| ------------------- | ----------------- | ------------------------------- | ----------------------- |
| Remotion            | Custom (BSL-like) | Requires license for production | Preserve license config |
| HyperFrames (zkbys) | Apache 2.0        | ✅                              | Open source             |
| VoxDirector         | MIT               | ✅                              | Open source             |
| VoxExplainer        | MIT               | ✅                              | Open source             |
| GbroCollage         | MIT               | ✅                              | Open source             |
