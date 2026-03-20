import { Router } from "express";
import { z } from "zod";
import type { Container } from "@/infrastructure/container";
import { asyncHandler } from "@/shared/utils/asyncHandler";
import { badRequest, forbidden } from "@/domain/errors/AppError";
import { getPrisma } from "@/infrastructure/db/prismaClient";

const createBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  rules: z
    .array(
      z.object({
        condition: z.record(z.string(), z.unknown()),
        action: z.record(z.string(), z.unknown())
      })
    )
    .min(1)
});

const executeBody = z.object({
  context: z.record(z.string(), z.unknown()).default({})
});

export function workflowController(container: Container) {
  const router = Router();
  const prisma = getPrisma();

  function requireManager(auth: { role: string }) {
    if (!["admin", "manager", "superadmin"].includes(auth.role)) {
      throw forbidden("Manager, admin, or superadmin required");
    }
  }

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const auth = (req as any).auth;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const rows = await prisma.workflow.findMany({
        where: {
          tenantId: auth.tenantId,
          ...(auth.workspaceId
            ? { OR: [{ workspaceId: auth.workspaceId }, { workspaceId: null }] }
            : {})
        },
        orderBy: { updatedAt: "desc" },
        take: limit
      });
      res.json({
        items: rows.map((w) => ({
          ...w,
          rules: JSON.parse(w.rulesJson) as unknown[]
        }))
      });
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const auth = (req as any).auth;
      requireManager(auth);
      const body = createBody.safeParse(req.body);
      if (!body.success) throw badRequest("Invalid workflow body", body.error.flatten());

      const row = await prisma.workflow.create({
        data: {
          tenantId: auth.tenantId,
          workspaceId: auth.workspaceId ?? null,
          name: body.data.name,
          description: body.data.description ?? "",
          rulesJson: JSON.stringify(body.data.rules),
          enabled: true
        }
      });

      await prisma.auditLog.create({
        data: {
          tenantId: auth.tenantId,
          workspaceId: auth.workspaceId ?? null,
          userId: auth.id,
          action: "workflow.create",
          resourceType: "workflow",
          resourceId: row.id,
          metadataJson: JSON.stringify({ name: row.name }),
          requestId: (req as any).requestId ?? null
        }
      });

      res.status(201).json({
        workflow: { ...row, rules: body.data.rules }
      });
    })
  );

  router.post(
    "/:id/execute",
    asyncHandler(async (req, res) => {
      const auth = (req as any).auth;
      const body = executeBody.safeParse(req.body ?? {});
      if (!body.success) throw badRequest("Invalid execute body", body.error.flatten());
      const result = await container.workflowExecutionService.execute({
        workflowId: req.params.id,
        tenantId: auth.tenantId,
        workspaceId: auth.workspaceId ?? null,
        context: body.data.context,
        triggeredBy: "api.execute"
      });
      res.json(result);
    })
  );

  router.post(
    "/:id/evaluate",
    asyncHandler(async (req, res) => {
      const auth = (req as any).auth;
      const body = executeBody.safeParse(req.body ?? {});
      if (!body.success) throw badRequest("Invalid evaluate body", body.error.flatten());
      const result = await container.workflowExecutionService.execute({
        workflowId: req.params.id,
        tenantId: auth.tenantId,
        workspaceId: auth.workspaceId ?? null,
        context: body.data.context,
        triggeredBy: "api.evaluate"
      });
      res.json({ matched: result.matched, workflowId: result.workflowId, runId: result.runId });
    })
  );

  return router;
}
