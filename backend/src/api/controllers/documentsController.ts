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
      const contentType = req.file.mimetype || "application/octet-stream";
      const bytes = req.file.buffer;
      const filename = req.file.originalname || "upload";

      let extractedText = "";
      if (contentType.startsWith("text/")) {
        extractedText = bytes.toString("utf8");
      } else if (contentType === "application/json") {
        extractedText = bytes.toString("utf8");
      } else {
        throw badRequest("Unsupported contentType. Use text/plain or application/json.", {
          contentType
        });
      }

      const result = await container.ingestDocumentService.ingest({
          tenantId: auth.tenantId,
        documentId,
        filename,
        contentType,
        bytes,
        extractedText
      });

      res.status(201).json(result);
    })
  );

  return router;
}

