import { Router } from "express";
import { z } from "zod";
import type { Container } from "@/infrastructure/container";
import { badRequest } from "@/domain/errors/AppError";
import { asyncHandler } from "@/shared/utils/asyncHandler";

const askSchema = z.object({
  sessionId: z.string().optional(),
  question: z.string().min(1).max(8000)
});

export function chatController(container: Container) {
  const router = Router();

  const tenantId = "t_default";
  const userId = "u_default";

  router.post(
    "/ask",
    asyncHandler(async (req, res) => {
      const parsed = askSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid body", parsed.error.flatten());

      const result = await container.chatService.ask({
        tenantId,
        userId,
        sessionId: parsed.data.sessionId,
        question: parsed.data.question
      });

      res.json(result);
    })
  );

  return router;
}

