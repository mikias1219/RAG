import type { NextFunction, Request, Response } from "express";
import type { Logger } from "pino";
import { AppError } from "@/domain/errors/AppError";

export function errorMiddleware(opts: { logger: Logger; isProd: boolean }) {
  const { logger, isProd } = opts;
  return function onError(err: unknown, req: Request, res: Response, _next: NextFunction) {
    const requestId = (req as any).requestId;

    if (err instanceof AppError) {
      if (err.statusCode >= 500) {
        logger.error({ err, requestId }, "app error");
      } else {
        logger.warn({ err, requestId }, "app error");
      }
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          requestId
        }
      });
      return;
    }

    logger.error({ err, requestId }, "unhandled error");
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: isProd ? "Internal server error" : (err as any)?.message ?? "Internal server error",
        requestId
      }
    });
  };
}

