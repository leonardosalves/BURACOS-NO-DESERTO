import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@videosuite.dev" },
    update: {},
    create: {
      id: randomUUID(),
      email: "demo@videosuite.dev",
      name: "Demo User",
    },
  });
  console.log(`  ✅ User: ${user.email}`);

  // Create a demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-workspace" },
    update: {},
    create: {
      id: randomUUID(),
      name: "Demo Workspace",
      slug: "demo-workspace",
      ownerId: user.id,
    },
  });
  console.log(`  ✅ Workspace: ${workspace.slug}`);

  // Create a sample project
  const project = await prisma.project.create({
    data: {
      id: randomUUID(),
      title: "10 Fatos Sobre Buracos Negros",
      format: "SHORTS",
      aspectRatio: "9:16",
      language: "pt-BR",
      nicheId: "ciencia",
      targetDurationSec: 60,
      fps: 24,
      status: "draft",
      workspaceId: workspace.id,
    },
  });
  console.log(`  ✅ Project: ${project.title}`);

  // Create sample scenes
  const scenes = [
    {
      order: 1,
      script:
        "Um buraco negro não é um buraco. É o objeto mais denso do universo.",
      caption: "O que é um buraco negro?",
      visualMetaphor: "Esfera negra absorvendo luz",
      engineHint: "hyperframes",
      durationSec: 8,
    },
    {
      order: 2,
      script:
        "Se você comprimir a Terra até virar um buraco negro, ela teria apenas 1,7 centímetros.",
      caption: "Terra comprimida",
      visualMetaphor: "Terra encolhendo com escala",
      engineHint: "remotion",
      durationSec: 7,
    },
    {
      order: 3,
      script:
        "O tempo para perto de um buraco negro. Um minuto lá pode ser anos aqui.",
      caption: "Dilatação temporal",
      visualMetaphor: "Relógios distorcidos",
      engineHint: "hyperframes",
      durationSec: 8,
    },
    {
      order: 4,
      script:
        "O Sagitário A-estrela, o buraco negro no centro da Via Láctea, tem 4 milhões de vezes a massa do Sol.",
      caption: "Sagitário A*",
      visualMetaphor: "Via Láctea com centro brilhante",
      engineHint: "remotion",
      durationSec: 9,
    },
    {
      order: 5,
      script:
        "Buracos negros não duram para sempre. Stephen Hawking provou que eles evaporam lentamente.",
      caption: "Radiação de Hawking",
      visualMetaphor: "Partículas escapando da borda",
      engineHint: "gbro-collage-broll",
      durationSec: 7,
    },
  ];

  for (const s of scenes) {
    await prisma.scene.create({
      data: {
        id: randomUUID(),
        projectId: project.id,
        order: s.order,
        engineHint: s.engineHint,
        durationSec: s.durationSec,
        script: s.script,
        caption: s.caption,
        visualMetaphor: s.visualMetaphor,
        paletteId: "neon",
        motionProfile: "smooth",
        status: "pending",
        version: 1,
      },
    });
  }
  console.log(`  ✅ ${scenes.length} scenes created`);

  console.log("🌱 Seed completed!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
