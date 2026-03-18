import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

export function requestIdMiddleware() {
  return function requestId(req: Request, res: Response, next: NextFunction) {
    const existing = req.header("x-request-id");
    const requestId = existing && existing.length > 0 ? existing : randomUUID();
    (req as any).requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  };
}

