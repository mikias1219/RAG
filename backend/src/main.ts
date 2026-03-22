import { buildApp } from "@/app";
import { loadEnv } from "@/config/env";
import { createLogger } from "@/config/logger";

async function main() {
  const env = loadEnv();
  const logger = createLogger(env);

  const app = buildApp({ env, logger });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "backend listening");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

