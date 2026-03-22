import { Worker } from "bullmq";
import { loadEnv } from "@/config/env";
import { createLogger } from "@/config/logger";
import { buildContainer } from "@/infrastructure/container";
import { OKDE_INGESTION_QUEUE } from "@/infrastructure/queue/ingestionQueue";

async function main() {
  const env = loadEnv();
  if (!env.REDIS_URL || !env.INGESTION_QUEUE_ENABLED) {
    throw new Error("Set REDIS_URL and INGESTION_QUEUE_ENABLED=true to run ingestion worker");
  }
  const logger = createLogger(env);
  const container = buildContainer({ env, logger });

  const worker = new Worker(
    OKDE_INGESTION_QUEUE,
    async (job) => {
      const data = job.data as {
        tenantId: string;
        workspaceId: string | null;
        jobId: string;
      };
      await container.ingestDocumentService.processJobFromQueue({
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        jobId: data.jobId
      });
    },
    { connection: { url: env.REDIS_URL }, concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id, name: job?.name }, "ingestion worker job failed");
  });
  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "ingestion worker job completed");
  });

  logger.info({ queue: OKDE_INGESTION_QUEUE }, "OKDE ingestion worker listening");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
