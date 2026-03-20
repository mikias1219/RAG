import { Router } from "express";
import { z } from "zod";
import type { Container } from "@/infrastructure/container";
import { badRequest } from "@/domain/errors/AppError";
import { asyncHandler } from "@/shared/utils/asyncHandler";

const askSchema = z.object({
  sessionId: z.string().optional(),
  question: z.string().min(1).max(8000),
  documentIds: z.array(z.string().min(1)).min(1).max(50)
});

export function chatController(container: Container) {
  const router = Router();

  router.post(
    "/ask",
    asyncHandler(async (req, res) => {
        const auth = (req as any).auth;
      const parsed = askSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid body", parsed.error.flatten());

      const result = await container.chatService.ask({
          tenantId: auth.tenantId,
          workspaceId: auth.workspaceId ?? null,
          userId: auth.id,
        sessionId: parsed.data.sessionId,
        question: parsed.data.question,
        documentIds: parsed.data.documentIds
      });

      res.json(result);
    })
  );

  return router;
}

