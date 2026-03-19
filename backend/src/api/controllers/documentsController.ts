import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import type { Container } from "@/infrastructure/container";
import { badRequest, tooLarge } from "@/domain/errors/AppError";
import { toPagination } from "@/domain/valueObjects/Pagination";
import { asyncHandler } from "@/shared/utils/asyncHandler";

export function documentsController(container: Container) {
  const router = Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: container.env.MAX_UPLOAD_BYTES }
  });

  router.get(
    "/",
    asyncHandler(async (req, res) => {
        const auth = (req as any).auth;
      const pagination = toPagination({
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined
      });

        const result = await container.documentsRepo.listDocuments({ tenantId: auth.tenantId, pagination });
      res.json({ page: pagination.page, pageSize: pagination.pageSize, total: result.total, items: result.items });
    })
  );

  router.post(
    "/upload",
    upload.single("file"),
    asyncHandler(async (req, res) => {
        const auth = (req as any).auth;
      if (!req.file) throw badRequest("Missing file");
      if ((req.file as any).truncated) throw tooLarge("Upload exceeded MAX_UPLOAD_BYTES");

      const documentId = randomUUID();
      const jobId = randomUUID();
      const contentType = req.file.mimetype || "application/octet-stream";
      const bytes = req.file.buffer;
      const filename = req.file.originalname || "upload";

      const result = await container.ingestDocumentService.enqueue({
          tenantId: auth.tenantId,
        jobId,
        documentId,
        filename,
        contentType,
        bytes
      });

      res.status(202).json(result);
    })
  );

  router.get(
    "/jobs",
    asyncHandler(async (req, res) => {
      const auth = (req as any).auth;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const jobs = await container.ingestDocumentService.listJobs({
        tenantId: auth.tenantId,
        limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50
      });
      res.json({ items: jobs });
    })
  );

  router.get(
    "/jobs/:jobId",
    asyncHandler(async (req, res) => {
      const auth = (req as any).auth;
      const job = await container.ingestDocumentService.getJob({
        tenantId: auth.tenantId,
        jobId: req.params.jobId
      });
      if (!job) throw badRequest("Job not found");
      res.json(job);
    })
  );

  router.post(
    "/jobs/:jobId/retry",
    asyncHandler(async (req, res) => {
      const auth = (req as any).auth;
      const result = await container.ingestDocumentService.retryJob({
        tenantId: auth.tenantId,
        jobId: req.params.jobId
      });
      res.json(result);
    })
  );

  return router;
}

