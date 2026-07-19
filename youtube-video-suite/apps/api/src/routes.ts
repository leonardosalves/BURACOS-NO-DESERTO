import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { generateBriefing, generateScript } from "./llm.js";
import { addJobToQueue } from "./queue.js";
import { ProjectManifestSchema } from "@video-suite/scene-contract";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

export async function registerRoutes(fastify: FastifyInstance) {
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
      return reply
        .status(500)
        .send({
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
}
