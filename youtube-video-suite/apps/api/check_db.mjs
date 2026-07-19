import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const projects = await p.project.findMany({
  include: { jobs: true, renders: true },
  orderBy: { createdAt: "desc" },
});
for (const proj of projects) {
  console.log(`\n=== ${proj.title} (${proj.id.slice(0, 8)}) ===`);
  console.log("  Status:", proj.status);
  console.log(
    "  Jobs:",
    proj.jobs.length,
    proj.jobs.map((j) => `${j.queue}:${j.status}`)
  );
  console.log("  Renders:", proj.renders.length);
}
await p.$disconnect();
