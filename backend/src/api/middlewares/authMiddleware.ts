import type { NextFunction, Request, Response } from "express";
import type { AuthService } from "@/application/services/auth/authService";
import { unauthorized } from "@/domain/errors/AppError";

export function authMiddleware(authService: AuthService) {
  return function requireAuth(req: Request, _res: Response, next: NextFunction) {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
    if (!token) return next(unauthorized("Missing Bearer token"));

    const user = authService.verifyToken(token);
    (req as any).auth = user;
    next();
  };
}
