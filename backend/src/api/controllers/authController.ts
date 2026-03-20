import { Router } from "express";
import { z } from "zod";
import type { Container } from "@/infrastructure/container";
import { badRequest } from "@/domain/errors/AppError";
import { asyncHandler } from "@/shared/utils/asyncHandler";

const registerSchema = z.object({
  tenantId: z.string().min(1).optional(),
  email: z.string().min(1),
  password: z.string().min(8),
  displayName: z.string().min(1).max(120).optional()
});

const loginSchema = z.object({
  tenantId: z.string().optional(),
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  pass: z.string().optional()
});

const googleSchema = z.object({
  tenantId: z.string().optional(),
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

const switchWorkspaceSchema = z.object({
  workspaceId: z.string().min(1)
});

const workspaceProfileSchema = z.object({
  industry: z.enum(["general", "banking", "construction"]),
  domainFocus: z.string().max(300).optional()
});

export function authController(container: Container) {
  const router = Router();
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
      const tenantId = parsed.data.tenantId ?? resolveTenantId(req);
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
      const tenantId = parsed.data.tenantId ?? resolveTenantId(req);
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
      const tenantId = parsed.data.tenantId ?? resolveTenantId(req);
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
      const workspaces = await container.authService.listWorkspaces({
        userId: user.id,
        tenantId: user.tenantId
      });
      res.json({ user, workspaces });
    })
  );

  router.get(
    "/workspaces",
    asyncHandler(async (req, res) => {
      const header = req.header("authorization");
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
      if (!token) throw badRequest("Missing Bearer token");
      const auth = container.authService.verifyToken(token);
      const items = await container.authService.listWorkspaces({
        userId: auth.id,
        tenantId: auth.tenantId
      });
      res.json({ items });
    })
  );

  router.post(
    "/switch-workspace",
    asyncHandler(async (req, res) => {
      const header = req.header("authorization");
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
      if (!token) throw badRequest("Missing Bearer token");
      const auth = container.authService.verifyToken(token);
      const parsed = switchWorkspaceSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid body: workspaceId is required");
      const switched = await container.authService.switchWorkspace({
        userId: auth.id,
        tenantId: auth.tenantId,
        workspaceId: parsed.data.workspaceId
      });
      res.json(switched);
    })
  );

  router.get(
    "/workspace-profile",
    asyncHandler(async (req, res) => {
      const header = req.header("authorization");
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
      if (!token) throw badRequest("Missing Bearer token");
      const auth = container.authService.verifyToken(token);
      if (!auth.workspaceId) throw badRequest("No active workspace selected");
      const profile = await container.authService.getWorkspaceProfile({
        userId: auth.id,
        tenantId: auth.tenantId,
        workspaceId: auth.workspaceId
      });
      res.json({ workspace: profile });
    })
  );

  router.patch(
    "/workspace-profile",
    asyncHandler(async (req, res) => {
      const header = req.header("authorization");
      const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
      if (!token) throw badRequest("Missing Bearer token");
      const auth = container.authService.verifyToken(token);
      if (!auth.workspaceId) throw badRequest("No active workspace selected");
      const parsed = workspaceProfileSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Invalid body", parsed.error.flatten());
      const workspace = await container.authService.updateWorkspaceProfile({
        userId: auth.id,
        tenantId: auth.tenantId,
        workspaceId: auth.workspaceId,
        industry: parsed.data.industry,
        domainFocus: parsed.data.domainFocus
      });
      res.json({ workspace });
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
      const users = await container.authService.listUsers({ tenantId: auth.tenantId });
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
        tenantId: auth.tenantId,
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
        tenantId: auth.tenantId,
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

function resolveTenantId(req: any) {
  return (
    req?.body?.tenantId ||
    req?.header?.("x-tenant-id") ||
    req?.query?.tenantId ||
    "t_default"
  );
}
