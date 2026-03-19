import { Router } from "express";
import type { Logger } from "pino";
import type { AppEnv } from "@/config/env";
import { healthController } from "@/api/controllers/healthController";
import { documentsController } from "@/api/controllers/documentsController";
import { chatController } from "@/api/controllers/chatController";
import { authController } from "@/api/controllers/authController";
import { buildContainer } from "@/infrastructure/container";
import { authMiddleware } from "@/api/middlewares/authMiddleware";

export function buildRoutes(opts: { env: AppEnv; logger: Logger }) {
  const { env, logger } = opts;
  const router = Router();
  const container = buildContainer({ env, logger });

  router.get("/health", healthController());
  router.use("/auth", authController(container));
  router.use("/documents", authMiddleware(container.authService), documentsController(container));
  router.use("/chat", authMiddleware(container.authService), chatController(container));

  return router;
}

