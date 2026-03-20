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
    "/:id/evaluate",
    asyncHandler(async (req, res) => {
      const auth = (req as any).auth;
      const row = await prisma.workflow.findFirst({
        where: { id: req.params.id, tenantId: auth.tenantId }
      });
      if (!row) throw badRequest("Workflow not found");
      const rules = JSON.parse(row.rulesJson) as Array<{ condition: Record<string, unknown>; action: Record<string, unknown> }>;
      const ctx = (req.body?.context ?? {}) as Record<string, unknown>;
      const matched = await container.workflowService.evaluateWorkflow(
        {
          id: row.id,
          tenantId: row.tenantId,
          workspaceId: row.workspaceId ?? undefined,
          name: row.name,
          description: row.description ?? undefined,
          rules,
          enabled: row.enabled,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        },
        ctx
      );
      res.json({ matched, workflowId: row.id });
    })
  );

  return router;
}
