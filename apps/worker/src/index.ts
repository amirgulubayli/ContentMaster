import { getPlatformProfile } from "@content-empire/connectors";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

const queueName = "content-empire-jobs";

export const orchestrationQueue = new Queue(queueName, {
  connection
});

const worker = new Worker(
  queueName,
  async (job) => {
    const platform = job.data.platform as Parameters<typeof getPlatformProfile>[0];
    const profile = getPlatformProfile(platform);

    return {
      jobId: job.id,
      routedVia: profile.defaultMode,
      sessionFallbackAvailable: profile.sessionFallback,
      note: `Handled ${job.name} for ${platform}.`
    };
  },
  { connection }
);

worker.on("completed", (job, result) => {
  console.log("job completed", job.id, result);
});

worker.on("failed", (job, error) => {
  console.error("job failed", job?.id, error);
});

console.log("worker started", {
  queueName
});
