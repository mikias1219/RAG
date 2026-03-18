import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import type { Logger } from "pino";
import type { AppEnv } from "@/config/env";
import { buildRoutes } from "@/api/routes";
import { errorMiddleware } from "@/api/middlewares/errorMiddleware";
import { requestIdMiddleware } from "@/api/middlewares/requestIdMiddleware";

export function buildApp(opts: { env: AppEnv; logger: Logger }) {
  const { env, logger } = opts;

  const app = express();
  app.set("trust proxy", true);

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: (req as any).requestId })
    })
  );

  app.use(requestIdMiddleware());
  app.use("/api", buildRoutes({ env, logger }));

  app.use(errorMiddleware({ logger, isProd: env.NODE_ENV === "production" }));

  return app;
}

