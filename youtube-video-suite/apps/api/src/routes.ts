import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { generateBriefing, generateScript } from "./llm.js";
import { addJobToQueue } from "./queue.js";
import { ProjectManifestSchema } from "@video-suite/scene-contract";
import { randomUUID } from "crypto";
import { healthCheck, getMetrics, trackRequest } from "./observability.js";

const prisma = new PrismaClient();

export async function registerRoutes(fastify: FastifyInstance) {
  // Request tracking middleware
  fastify.addHook("onRequest", async (request) => {
    trackRequest(request.url);
  });

  // GET /metrics — request and render metrics
  fastify.get("/metrics", async () => {
    return getMetrics();
  });
  // POST /v1/projects
  fastify.post("/v1/projects", async (request, reply) => {
    const { title, format, nicheId, language, aspectRatio, targetDurationSec } =
      request.body as any;

    if (
      !title ||
      !format ||
      !nicheId ||
      !language ||
      !aspectRatio ||
      !targetDurationSec
    ) {
      return reply
        .status(400)
        .send({ error: "Missing required project parameters" });
    }

    try {
      // 1. Ensure a default User and Workspace exist to satisfy foreign keys
      let defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        defaultUser = await prisma.user.create({
          data: {
            name: "Default Editor",
            email: "editor@video-suite.local",
            role: "editor",
          },
        });
      }

      let defaultWorkspace = await prisma.workspace.findFirst({
        where: { ownerId: defaultUser.id },
      });
      if (!defaultWorkspace) {
        defaultWorkspace = await prisma.workspace.create({
          data: {
            name: "Default Workspace",
            ownerId: defaultUser.id,
          },
        });
      }

      // 2. Call LLM to generate briefing and script
      console.log(`[API] Generating briefing for project: ${title}...`);
      const briefing = await generateBriefing(title, nicheId);

      console.log(`[API] Generating script for project: ${title}...`);
      const script = await generateScript(briefing);

      // 3. Construct manifest json mapping to scene contract
      const projectId = randomUUID();
      const manifest: any = {
        projectId,
        title,
        format,
        aspectRatio,
        language,
        fps: 24,
        targetDurationSec,
        nicheId,
        status: "draft",
        version: 1,
        scenes: script.segments.map((seg) => ({
          projectId,
          sceneId: randomUUID(),
          aspectRatio,
          durationSec: seg.estimatedDurationSec,
          engineHint: seg.engineHint,
          script: seg.narrationText,
          caption: seg.narrationText,
          visualMetaphor: seg.visualDescription,
          paletteId: seg.paletteId,
          motionProfile: seg.motionProfile,
          assets: [],
          status: "pending",
          version: 1,
        })),
      };

      // Validate manifest structure using the shared contract schema
      const validatedManifest = ProjectManifestSchema.parse(manifest);

      // 4. Persist to DB
      const project = await prisma.project.create({
        data: {
          id: projectId,
          workspaceId: defaultWorkspace.id,
          title,
          format,
          nicheId,
          language,
          aspectRatio,
          targetDurationSec,
          status: "draft",
          currentVersion: 1,
          manifestJson: validatedManifest as any,
          scenes: {
            create: validatedManifest.scenes.map((scene, idx) => ({
              id: scene.sceneId,
              order: idx + 1,
              engineHint: scene.engineHint,
              durationSec: scene.durationSec,
              script: scene.script,
              caption: scene.caption,
              visualMetaphor: scene.visualMetaphor,
              paletteId: scene.paletteId,
              motionProfile: scene.motionProfile,
              status: "pending",
              version: 1,
              manifestJson: scene as any,
            })),
          },
        },
        include: {
          scenes: true,
        },
      });

      return project;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: err.message || "Failed to create project and generate script",
      });
    }
  });

  // GET /v1/projects/:id
  fastify.get("/v1/projects/:id", async (request, reply) => {
    const { id } = request.params as any;

    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          scenes: {
            orderBy: { order: "asc" },
          },
        },
      });

      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      return project;
    } catch (err: any) {
      fastify.log.error(err);
      return reply
        .status(500)
        .send({ error: "Failed to retrieve project details" });
    }
  });

  // POST /v1/projects/:id/generate
  fastify.post("/v1/projects/:id/generate", async (request, reply) => {
    const { id } = request.params as any;

    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: { scenes: true },
      });

      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      // Update project status
      await prisma.project.update({
        where: { id },
        data: { status: "generating" },
      });

      // Add jobs to BullMQ queues (start with tts queue)
      const jobPromises = project.scenes.map((scene) => {
        return addJobToQueue("tts", "generate-tts", {
          projectId: project.id,
          sceneId: scene.id,
          script: scene.script,
          language: project.language,
        });
      });

      await Promise.all(jobPromises);

      return {
        message: "Workflow pipeline started successfully",
        projectId: id,
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply
        .status(500)
        .send({ error: "Failed to queue project generation" });
    }
  });

  // GET /v1/projects/:id/scenes
  fastify.get("/v1/projects/:id/scenes", async (request, reply) => {
    const { id } = request.params as any;

    try {
      const scenes = await prisma.scene.findMany({
        where: { projectId: id },
        orderBy: { order: "asc" },
        include: { assets: true },
      });

      return scenes;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: "Failed to list scenes" });
    }
  });

  // POST /v1/scenes/:sceneId/render
  fastify.post("/v1/scenes/:sceneId/render", async (request, reply) => {
    const { sceneId } = request.params as any;

    try {
      const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
      if (!scene) {
        return reply.status(404).send({ error: "Scene not found" });
      }

      // Determine the correct render queue based on engineHint
      const queueName = engineHintToQueue(scene.engineHint);

      await addJobToQueue(queueName as any, "render-scene", {
        projectId: scene.projectId,
        sceneId: scene.id,
        manifestJson: scene.manifestJson,
      });

      return {
        message: `Scene render queued via ${queueName}`,
        sceneId,
        queue: queueName,
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: "Failed to queue scene render" });
    }
  });

  // POST /v1/scenes/:sceneId/approve
  fastify.post("/v1/scenes/:sceneId/approve", async (request, reply) => {
    const { sceneId } = request.params as any;
    const { gate } = (request.body as any) || {};

    try {
      const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
      if (!scene) {
        return reply.status(404).send({ error: "Scene not found" });
      }

      const nextStatus =
        gate === "metaphor"
          ? "metaphor_approved"
          : gate === "style"
            ? "style_approved"
            : "rendered";

      const updated = await prisma.scene.update({
        where: { id: sceneId },
        data: { status: nextStatus },
      });

      // Record approval
      await prisma.approval.create({
        data: {
          projectId: scene.projectId,
          sceneId,
          gate: gate || "general",
          status: "approved",
          approvedBy: "editor",
        },
      });

      return updated;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: "Failed to approve scene" });
    }
  });

  // PATCH /v1/scenes/:sceneId
  fastify.patch("/v1/scenes/:sceneId", async (request, reply) => {
    const { sceneId } = request.params as any;
    const updates = request.body as any;

    try {
      const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
      if (!scene) {
        return reply.status(404).send({ error: "Scene not found" });
      }

      const allowedFields = [
        "script",
        "caption",
        "visualMetaphor",
        "paletteId",
        "motionProfile",
        "engineHint",
        "durationSec",
      ];
      const data: Record<string, any> = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          data[field] = updates[field];
        }
      }

      if (Object.keys(data).length === 0) {
        return reply.status(400).send({ error: "No valid fields to update" });
      }

      const updated = await prisma.scene.update({
        where: { id: sceneId },
        data,
      });

      return updated;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: "Failed to update scene" });
    }
  });

  // GET /v1/engines/health
  fastify.get("/v1/engines/health", async (_request, _reply) => {
    const { healthcheckAll } = await import("./adapters/router.js");
    return healthcheckAll();
  });

  // ── Project Management ──────────────────────────────────────────────────────

  // GET /v1/projects — list all projects
  fastify.get("/v1/projects", async () => {
    return prisma.project.findMany({
      include: { scenes: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  // PATCH /v1/projects/:id — update project metadata
  fastify.patch("/v1/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as Record<string, unknown>;
    try {
      return await prisma.project.update({ where: { id }, data });
    } catch {
      return reply.status(404).send({ error: "Project not found" });
    }
  });

  // POST /v1/projects/:id/duplicate — clone a project
  fastify.post("/v1/projects/:id/duplicate", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const original = await prisma.project.findUniqueOrThrow({
        where: { id },
        include: { scenes: true },
      });

      const newId = randomUUID();
      const project = await prisma.project.create({
        data: {
          id: newId,
          title: `${original.title} (cópia)`,
          format: original.format,
          aspectRatio: original.aspectRatio,
          language: original.language,
          nicheId: original.nicheId,
          targetDurationSec: original.targetDurationSec,
          fps: original.fps,
          status: "draft",
          workspaceId: original.workspaceId,
          manifestJson: original.manifestJson || {},
        },
      });

      for (const scene of original.scenes) {
        await prisma.scene.create({
          data: {
            id: randomUUID(),
            projectId: newId,
            order: scene.order,
            engineHint: scene.engineHint,
            durationSec: scene.durationSec,
            script: scene.script,
            caption: scene.caption,
            visualMetaphor: scene.visualMetaphor,
            paletteId: scene.paletteId,
            motionProfile: scene.motionProfile,
            status: "pending",
            version: 1,
            manifestJson: scene.manifestJson || {},
          },
        });
      }

      return project;
    } catch {
      return reply.status(404).send({ error: "Project not found" });
    }
  });

  // POST /v1/projects/:id/cancel — cancel a running pipeline
  fastify.post("/v1/projects/:id/cancel", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await prisma.project.update({
        where: { id },
        data: { status: "failed" },
      });
    } catch {
      return reply.status(404).send({ error: "Project not found" });
    }
  });

  // ── Asset Prompt Generation ─────────────────────────────────────────────────
  // This is the core whiteboard system — generates prompts for manual image/video
  // creation and accepts uploads of the generated assets.

  // GET /v1/projects/:id/prompts — generate image/video prompts for each scene
  fastify.get("/v1/projects/:id/prompts", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const scenes = await prisma.scene.findMany({
        where: { projectId: id },
        orderBy: { order: "asc" },
      });

      const prompts = scenes.map((scene) => ({
        sceneId: scene.id,
        sceneOrder: scene.order,
        type: "image" as const,
        status: scene.status,
        prompt: buildAssetPrompt(scene),
        videoPrompt: buildVideoPrompt(scene),
        metadata: {
          visualMetaphor: scene.visualMetaphor,
          palette: scene.paletteId,
          motionProfile: scene.motionProfile,
          durationSec: scene.durationSec,
          engineHint: scene.engineHint,
        },
      }));

      return {
        projectId: id,
        totalScenes: scenes.length,
        pendingAssets: scenes.filter((s) => s.status === "pending").length,
        prompts,
        instructions: {
          pt: "Use estes prompts para gerar imagens/vídeos manualmente (ex: Midjourney, DALL-E, Runway). Depois, faça upload via POST /v1/scenes/:sceneId/assets.",
          en: "Use these prompts to generate images/videos manually. Then upload via POST /v1/scenes/:sceneId/assets.",
        },
      };
    } catch {
      return reply.status(404).send({ error: "Project not found" });
    }
  });

  // POST /v1/scenes/:sceneId/assets — upload an asset for a scene
  fastify.post("/v1/scenes/:sceneId/assets", async (request, reply) => {
    const { sceneId } = request.params as { sceneId: string };
    const { type, role, storageKey, mimeType, width, height, durationSec } =
      request.body as any;

    if (!type || !role || !storageKey) {
      return reply
        .status(400)
        .send({ error: "Required: type, role, storageKey" });
    }

    try {
      // Resolve scene to get projectId and workspaceId
      const scene = await prisma.scene.findUniqueOrThrow({
        where: { id: sceneId },
        include: { project: { select: { workspaceId: true } } },
      });

      const asset = await prisma.asset.create({
        data: {
          id: randomUUID(),
          sceneId,
          projectId: scene.projectId,
          workspaceId: scene.project.workspaceId,
          type,
          role,
          storageKey,
          mimeType: mimeType || "application/octet-stream",
          checksum: "pending",
          width,
          height,
          durationSec,
        },
      });

      return asset;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /v1/scenes/:sceneId/assets — list assets for a scene
  fastify.get("/v1/scenes/:sceneId/assets", async (request, reply) => {
    const { sceneId } = request.params as { sceneId: string };
    try {
      return await prisma.asset.findMany({
        where: { sceneId },
        orderBy: { createdAt: "asc" },
      });
    } catch {
      return reply.status(404).send({ error: "Scene not found" });
    }
  });

  // DELETE /v1/assets/:assetId — remove an asset
  fastify.delete("/v1/assets/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    try {
      await prisma.asset.delete({ where: { id: assetId } });
      return { deleted: true };
    } catch {
      return reply.status(404).send({ error: "Asset not found" });
    }
  });

  // ── Jobs ──────────────────────────────────────────────────────────────────

  // GET /v1/jobs — list recent jobs
  fastify.get("/v1/jobs", async (request) => {
    const limit = Math.min(Number((request.query as any).limit) || 50, 100);
    return prisma.job.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  });

  // GET /v1/jobs/:jobId — job status
  fastify.get("/v1/jobs/:jobId", async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    try {
      return await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
    } catch {
      return reply.status(404).send({ error: "Job not found" });
    }
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  // GET /v1/renders — list renders for a project
  fastify.get("/v1/renders", async (request) => {
    const projectId = (request.query as any).projectId;
    const where = projectId ? { projectId } : {};
    return prisma.render.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  });

  // GET /v1/renders/:renderId — render details
  fastify.get("/v1/renders/:renderId", async (request, reply) => {
    const { renderId } = request.params as { renderId: string };
    try {
      return await prisma.render.findUniqueOrThrow({ where: { id: renderId } });
    } catch {
      return reply.status(404).send({ error: "Render not found" });
    }
  });

  // POST /v1/scenes/:sceneId/regenerate — regenerate a scene
  fastify.post("/v1/scenes/:sceneId/regenerate", async (request, reply) => {
    const { sceneId } = request.params as { sceneId: string };
    try {
      const scene = await prisma.scene.findUniqueOrThrow({
        where: { id: sceneId },
      });

      // Reset scene status to pending
      await prisma.scene.update({
        where: { id: sceneId },
        data: { status: "pending", version: { increment: 1 } },
      });

      // Queue the render for the scene
      const queueName = engineHintToQueue(scene.engineHint);
      await addJobToQueue(queueName as any, "regenerate-scene", {
        projectId: scene.projectId,
        sceneId,
        manifestJson: scene,
      });

      return { queued: true, sceneId, queue: queueName };
    } catch {
      return reply.status(404).send({ error: "Scene not found" });
    }
  });
}

// ── Prompt Builders ─────────────────────────────────────────────────────────

function buildAssetPrompt(scene: any): string {
  const parts = [
    `Gere uma imagem para a cena "${scene.caption || "Sem título"}".`,
    `Metáfora visual: ${scene.visualMetaphor || "livre"}.`,
    `Paleta: ${scene.paletteId || "default"}.`,
    `Estilo de movimento: ${scene.motionProfile || "smooth"}.`,
    `Proporção: vertical 9:16.`,
    `O visual deve transmitir: "${scene.script?.slice(0, 120) || ""}..."`,
    `Estilo: cinematográfico, profissional, cores ricas.`,
    `Sem texto na imagem. Fundo limpo.`,
  ];
  return parts.join("\n");
}

function buildVideoPrompt(scene: any): string {
  const parts = [
    `Gere um vídeo curto (${scene.durationSec || 5}s) para a cena "${scene.caption || "Sem título"}".`,
    `Descrição: ${scene.visualMetaphor || scene.script?.slice(0, 80) || "livre"}.`,
    `Movimento: ${scene.motionProfile || "smooth"}, câmera suave.`,
    `Paleta de cores: ${scene.paletteId || "default"}.`,
    `Formato: 9:16 vertical, 24fps.`,
    `Sem texto overlay. Sem áudio.`,
    `Estilo: cinematográfico, profissional.`,
  ];
  return parts.join("\n");
}

function engineHintToQueue(engineHint: string): string {
  const map: Record<string, string> = {
    hyperframes: "hyperframes-render",
    remotion: "remotion-render",
    "gbro-collage-broll": "gbro-render",
    "vox-director": "vox-render",
    "vox-explainer": "vox-render",
    ffmpeg: "delivery",
  };
  return map[engineHint] || "delivery";
}
