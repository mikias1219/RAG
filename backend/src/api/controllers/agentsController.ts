import { Router } from "express";
import type { Container } from "@/infrastructure/container";
import { asyncHandler } from "@/shared/utils/asyncHandler";
import { badRequest } from "@/domain/errors/AppError";

export function agentsController(container: Container) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      res.json({ agents: container.agentService.getAllAgents() });
    })
  );

  router.post(
    "/:agentId/run",
    asyncHandler(async (req, res) => {
      const agent = container.agentService.getAgent(req.params.agentId);
      if (!agent) throw badRequest("Unknown agent");
      const context = (req.body?.context ?? {}) as Record<string, unknown>;
      const result = await container.agentService.executeAgent(agent, context);
      res.json(result);
    })
  );

  return router;
}
