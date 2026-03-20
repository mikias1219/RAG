import { Router } from "express";
import { asyncHandler } from "@/shared/utils/asyncHandler";
import { forbidden } from "@/domain/errors/AppError";
import { getPrisma } from "@/infrastructure/db/prismaClient";

export function auditController() {
  const router = Router();
  const prisma = getPrisma();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const auth = (req as any).auth;
      if (!["admin", "superadmin"].includes(auth.role)) throw forbidden("Admin only");
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const rows = await prisma.auditLog.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: limit
      });
      res.json({
        items: rows.map((r) => ({
          ...r,
          metadata: JSON.parse(r.metadataJson) as unknown
        }))
      });
    })
  );

  return router;
}
