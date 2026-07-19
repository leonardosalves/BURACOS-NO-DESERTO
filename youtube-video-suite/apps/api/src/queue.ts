import { Queue, QueueOptions } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 1000 },
  },
};

export const queues = {
  planning: new Queue("planning", defaultQueueOptions),
  script: new Queue("script", defaultQueueOptions),
  tts: new Queue("tts", defaultQueueOptions),
  alignment: new Queue("alignment", defaultQueueOptions),
  metaphor: new Queue("metaphor", defaultQueueOptions),
  styleframe: new Queue("styleframe", defaultQueueOptions),
  imageGeneration: new Queue("image-generation", defaultQueueOptions),
  gbroRender: new Queue("gbro-render", defaultQueueOptions),
  voxRender: new Queue("vox-render", defaultQueueOptions),
  hyperframesRender: new Queue("hyperframes-render", defaultQueueOptions),
  remotionRender: new Queue("remotion-render", defaultQueueOptions),
  audioMix: new Queue("audio-mix", defaultQueueOptions),
  qa: new Queue("qa", defaultQueueOptions),
  delivery: new Queue("delivery", defaultQueueOptions),
};

export type QueueName = keyof typeof queues;

export async function addJobToQueue(
  queueName: QueueName,
  jobName: string,
  data: any,
  opts?: { jobId?: string }
) {
  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }
  return queue.add(jobName, data, opts);
}
