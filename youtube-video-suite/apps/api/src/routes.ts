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

  // ── System endpoints ──────────────────────────────────────────────────────

  // GET /health — full system health check
  fastify.get("/health", async () => {
    return healthCheck(prisma);
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
