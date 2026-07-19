import Fastify from "fastify";
import { queues } from "./queue.js";
import { registerRoutes } from "./routes.js";
import "./worker.js";

const fastify = Fastify({
  logger: true,
});

fastify.get("/health", async () => {
  return { status: "OK", queues: Object.keys(queues) };
});

const start = async () => {
  try {
    await registerRoutes(fastify);
    const port = Number(process.env.API_PORT) || 4000;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
