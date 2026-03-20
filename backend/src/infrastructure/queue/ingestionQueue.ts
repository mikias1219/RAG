import { Queue } from "bullmq";

export const OKDE_INGESTION_QUEUE = "okde-ingestion";

export function createIngestionQueue(redisUrl: string): Queue {
  return new Queue(OKDE_INGESTION_QUEUE, {
    connection: { url: redisUrl },
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: 1000,
      removeOnFail: 5000
    }
  });
}
