import { Router } from "express";
import { z } from "zod";
import type { Container } from "@/infrastructure/container";
import { badRequest } from "@/domain/errors/AppError";
import { asyncHandler } from "@/shared/utils/asyncHandler";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(120).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const googleSchema = z.object({
  idToken: z.string().min(1)
});

export function authController(container: Container) {
  const router = Router();
  const tenantId = "t_default";

  router.post(
    "/register",
    asyncHandler(async (req, res) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid body", parsed.error.flatten());
      const result = await container.authService.register({
        tenantId,
        email: parsed.data.email,
        password: parsed.data.password,
        displayName: parsed.data.displayName
      });
      res.status(201).json(result);
    })
  );

  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid body", parsed.error.flatten());
      const result = await container.authService.login({
        tenantId,
        email: parsed.data.email,
        password: parsed.data.password
      });
      res.json(result);
    })
  );

  router.post(
    "/google",
    asyncHandler(async (req, res) => {
      const parsed = googleSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid body", parsed.error.flatten());
      const result = await container.authService.loginWithGoogle({
        tenantId,
        idToken: parsed.data.idToken
      });
      res.json(result);
    })
  );

  router.get(
    "/me",
    asyncHandler(async (req, res) => {
      const header = req.header("authorization");
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
      if (!token) throw badRequest("Missing Bearer token");
      const user = container.authService.verifyToken(token);
      res.json({ user });
    })
  );

  router.post(
    "/logout",
    asyncHandler(async (_req, res) => {
      // Stateless JWT logout; client should drop token.
      res.status(204).send();
    })
  );

  return router;
}
