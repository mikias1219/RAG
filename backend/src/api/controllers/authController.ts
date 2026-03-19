import { Router } from "express";
import { z } from "zod";
import type { Container } from "@/infrastructure/container";
import { badRequest } from "@/domain/errors/AppError";
import { asyncHandler } from "@/shared/utils/asyncHandler";

const registerSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(8),
  displayName: z.string().min(1).max(120).optional()
});

const loginSchema = z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  pass: z.string().optional()
});

const googleSchema = z.object({
  idToken: z.string().min(1)
});

const statusSchema = z.object({
  status: z.enum(["approved", "rejected"])
});

const roleSchema = z.object({
  role: z.enum(["user", "admin"])
});

const meUpdateSchema = z.object({
  displayName: z.string().min(1).max(120)
});

export function authController(container: Container) {
  const router = Router();
  const tenantId = "t_default";
  const updateMeHandler = asyncHandler(async (req, res) => {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    if (!token) throw badRequest("Missing Bearer token");
    const auth = container.authService.verifyToken(token);
    const parsed = meUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid body: displayName is required");
    const updated = await container.authService.updateProfile({
      tenantId: auth.tenantId,
      userId: auth.id,
      displayName: parsed.data.displayName
    });
    res.json({ user: updated });
  });

  router.post(
    "/register",
    asyncHandler(async (req, res) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid body: email/password/displayName format is incorrect");
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
      if (!parsed.success) throw badRequest("Invalid body: email and password are required");
      const email = (parsed.data.email ?? parsed.data.username ?? "").trim();
      const password = (parsed.data.password ?? parsed.data.pass ?? "").trim();
      if (!email || !password) throw badRequest("Invalid body: email and password are required");
      const result = await container.authService.login({
        tenantId,
        email,
        password
      });
      res.json(result);
    })
  );

  router.post(
    "/google",
    asyncHandler(async (req, res) => {
      const parsed = googleSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid body: missing Google token");
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

  router.patch("/me", updateMeHandler);
  router.post("/me", updateMeHandler);

  router.get(
    "/users",
    asyncHandler(async (req, res) => {
      const header = req.header("authorization");
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
      if (!token) throw badRequest("Missing Bearer token");
      const auth = container.authService.verifyToken(token);
      if (auth.role !== "superadmin") throw badRequest("Superadmin access required");
      const users = await container.authService.listUsers({ tenantId });
      res.json({ items: users });
    })
  );

  router.patch(
    "/users/:userId/status",
    asyncHandler(async (req, res) => {
      const header = req.header("authorization");
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
      if (!token) throw badRequest("Missing Bearer token");
      const auth = container.authService.verifyToken(token);
      if (auth.role !== "superadmin") throw badRequest("Superadmin access required");

      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid body", parsed.error.flatten());
      await container.authService.setUserStatus({
        tenantId,
        userId: req.params.userId,
        status: parsed.data.status
      });
      res.status(204).send();
    })
  );

  router.patch(
    "/users/:userId/role",
    asyncHandler(async (req, res) => {
      const header = req.header("authorization");
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
      if (!token) throw badRequest("Missing Bearer token");
      const auth = container.authService.verifyToken(token);
      if (auth.role !== "superadmin") throw badRequest("Superadmin access required");

      const parsed = roleSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid body", parsed.error.flatten());
      await container.authService.setUserRole({
        tenantId,
        userId: req.params.userId,
        role: parsed.data.role
      });
      res.status(204).send();
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
