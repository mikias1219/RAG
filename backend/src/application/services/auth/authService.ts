import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { badRequest, unauthorized } from "@/domain/errors/AppError";
import { getPrisma } from "@/infrastructure/db/prismaClient";

type AuthUser = {
  id: string;
  tenantId: string;
  companyId?: string | null;
  workspaceId?: string | null;
  membershipRole?: string | null;
  email: string;
  displayName?: string | null;
  role: string;
  status: string;
};

export class AuthService {
  private readonly prisma = getPrisma();
  private readonly prismaUser = (this.prisma as any).user;
  private readonly prismaCompany = (this.prisma as any).company;
  private readonly prismaWorkspace = (this.prisma as any).workspace;
  private readonly prismaWorkspaceMember = (this.prisma as any).workspaceMember;
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly opts: {
      jwtSecret: string;
      jwtExpiresIn: string;
      googleClientId?: string;
    }
  ) {
    this.googleClient = new OAuth2Client(opts.googleClientId);
  }

  async register(input: {
    tenantId: string;
    email: string;
    password: string;
    displayName?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    if (!email || input.password.length < 8) {
      throw badRequest("Email and password (min 8 chars) are required");
    }

    const existing = await this.prismaUser.findUnique({
      where: { tenantId_email: { tenantId: input.tenantId, email } }
    });
    if (existing) throw badRequest("User with this email already exists");

    const isSuperadminEmail = email === "superadmin@example.com";
    let canBootstrapSuperadmin = false;
    if (isSuperadminEmail) {
      const existingSuperadmin = await this.prismaUser.findFirst({
        where: { tenantId: input.tenantId, role: "superadmin" },
        select: { id: true }
      });
      canBootstrapSuperadmin = !existingSuperadmin;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prismaUser.create({
      data: {
        tenantId: input.tenantId,
        email,
        displayName: input.displayName?.trim() || null,
        passwordHash,
        role: canBootstrapSuperadmin ? "superadmin" : "user",
        status: canBootstrapSuperadmin ? "approved" : "pending"
      }
    });
    const workspace = await this.ensureDefaultWorkspace(input.tenantId);
    await this.prismaUser.update({
      where: { id: user.id },
      data: { workspaceId: workspace.id }
    });
    await this.ensureMembership({
      workspaceId: workspace.id,
      userId: user.id,
      role: canBootstrapSuperadmin ? "superadmin" : "user"
    });
    const authUser = await this.buildAuthUser(user);
    return this.issueToken(authUser);
  }

  async login(input: { tenantId: string; email: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prismaUser.findUnique({
      where: { tenantId_email: { tenantId: input.tenantId, email } }
    });
    if (!user?.passwordHash) throw unauthorized("Invalid email or password");

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid email or password");
    if (user.status !== "approved" && user.role !== "admin" && user.role !== "superadmin") {
      throw unauthorized("Your account is pending admin approval");
    }
    const authUser = await this.buildAuthUser(user);
    return this.issueToken(authUser);
  }

  async loginWithGoogle(input: { tenantId: string; idToken: string }) {
    if (!this.opts.googleClientId) {
      throw badRequest("Google login is not configured");
    }
    const ticket = await this.googleClient.verifyIdToken({
      idToken: input.idToken,
      audience: this.opts.googleClientId
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw unauthorized("Invalid Google token");

    const email = payload.email.toLowerCase();
    const googleSub = payload.sub;
    let user = await this.prismaUser.findFirst({
      where: { tenantId: input.tenantId, OR: [{ googleSub }, { email }] }
    });
    if (!user) {
      user = await this.prismaUser.create({
        data: {
          tenantId: input.tenantId,
          email,
          displayName: payload.name ?? null,
          googleSub,
          role: "user",
          status: "pending"
        }
      });
    } else if (!user.googleSub) {
      user = await this.prismaUser.update({
        where: { id: user.id },
        data: { googleSub, displayName: user.displayName ?? payload.name ?? null }
      });
    }

    if (user.status !== "approved" && user.role !== "admin" && user.role !== "superadmin") {
      throw unauthorized("Your account is pending admin approval");
    }
    const workspace = await this.ensureDefaultWorkspace(input.tenantId);
    await this.prismaUser.update({
      where: { id: user.id },
      data: { workspaceId: workspace.id }
    });
    await this.ensureMembership({
      workspaceId: workspace.id,
      userId: user.id,
      role: user.role === "superadmin" ? "superadmin" : user.role === "admin" ? "admin" : "user"
    });
    const authUser = await this.buildAuthUser(user);
    return this.issueToken(authUser);
  }

  async listUsers(input: { tenantId: string }) {
    return this.prismaUser.findMany({
      where: { tenantId: input.tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true
      }
    });
  }

  async setUserStatus(input: { tenantId: string; userId: string; status: "approved" | "rejected" }) {
    const updated = await this.prismaUser.updateMany({
      where: { id: input.userId, tenantId: input.tenantId, role: { notIn: ["admin", "superadmin"] } },
      data: { status: input.status }
    });
    if (updated.count === 0) throw badRequest("User not found");
  }

  async setUserRole(input: { tenantId: string; userId: string; role: "user" | "admin" }) {
    const updated = await this.prismaUser.updateMany({
      where: { id: input.userId, tenantId: input.tenantId, role: { not: "superadmin" } },
      data: { role: input.role }
    });
    if (updated.count === 0) throw badRequest("User not found");
  }

  async updateProfile(input: { tenantId: string; userId: string; displayName: string }) {
    const user = await this.prismaUser.update({
      where: { id: input.userId },
      data: { displayName: input.displayName.trim() },
      select: {
        id: true,
        tenantId: true,
        email: true,
        displayName: true,
        role: true,
        status: true
      }
    });
    if (user.tenantId !== input.tenantId) throw unauthorized("Invalid account scope");
    return user;
  }

  async listWorkspaces(input: { userId: string; tenantId: string }) {
    const memberships = await this.prismaWorkspaceMember.findMany({
      where: { userId: input.userId, workspace: { tenantId: input.tenantId } },
      include: { workspace: true }
    });
    return memberships.map((m: any) => ({
      id: m.workspace.id,
      tenantId: m.workspace.tenantId,
      companyId: m.workspace.companyId,
      slug: m.workspace.slug,
      displayName: m.workspace.displayName,
      industry: m.workspace.industry ?? "general",
      domainFocus: m.workspace.domainFocus ?? null,
      membershipRole: m.role
    }));
  }

  async getWorkspaceProfile(input: { userId: string; tenantId: string; workspaceId: string }) {
    const membership = await this.prismaWorkspaceMember.findFirst({
      where: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        workspace: { tenantId: input.tenantId }
      },
      include: { workspace: true }
    });
    if (!membership) throw unauthorized("You do not have access to this workspace");
    return {
      id: membership.workspace.id,
      tenantId: membership.workspace.tenantId,
      companyId: membership.workspace.companyId,
      slug: membership.workspace.slug,
      displayName: membership.workspace.displayName,
      industry: membership.workspace.industry ?? "general",
      domainFocus: membership.workspace.domainFocus ?? null,
      membershipRole: membership.role
    };
  }

  async updateWorkspaceProfile(input: {
    userId: string;
    tenantId: string;
    workspaceId: string;
    industry: "general" | "banking" | "construction";
    domainFocus?: string;
  }) {
    const membership = await this.prismaWorkspaceMember.findFirst({
      where: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        workspace: { tenantId: input.tenantId },
        role: { in: ["admin", "superadmin"] }
      }
    });
    if (!membership) throw unauthorized("Admin workspace access is required");
    const updated = await this.prismaWorkspace.update({
      where: { id: input.workspaceId },
      data: {
        industry: input.industry,
        domainFocus: input.domainFocus?.trim() || null
      }
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      companyId: updated.companyId,
      slug: updated.slug,
      displayName: updated.displayName,
      industry: updated.industry ?? "general",
      domainFocus: updated.domainFocus ?? null
    };
  }

  async switchWorkspace(input: { userId: string; tenantId: string; workspaceId: string }) {
    const membership = await this.prismaWorkspaceMember.findFirst({
      where: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        workspace: { tenantId: input.tenantId }
      },
      include: { workspace: true }
    });
    if (!membership) throw unauthorized("You do not have access to the requested workspace");
    const user = await this.prismaUser.findUnique({ where: { id: input.userId } });
    if (!user) throw unauthorized("User not found");
    await this.prismaUser.update({
      where: { id: input.userId },
      data: { workspaceId: input.workspaceId }
    });
    return this.issueToken({
      id: user.id,
      tenantId: user.tenantId,
      companyId: membership.workspace.companyId,
      workspaceId: membership.workspace.id,
      membershipRole: membership.role,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status
    });
  }

  verifyToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, this.opts.jwtSecret) as AuthUser & { exp?: number };
      if (!decoded.id || !decoded.tenantId || !decoded.email) {
        throw unauthorized("Invalid auth token");
      }
      return {
        id: decoded.id,
        tenantId: decoded.tenantId,
        companyId: decoded.companyId ?? null,
        workspaceId: decoded.workspaceId ?? null,
        membershipRole: decoded.membershipRole ?? null,
        email: decoded.email,
        displayName: decoded.displayName ?? null,
        role: decoded.role ?? "user",
        status: decoded.status ?? "pending"
      };
    } catch {
      throw unauthorized("Invalid or expired auth token");
    }
  }

  private issueToken(user: AuthUser) {
    const token = jwt.sign(user, this.opts.jwtSecret, {
      expiresIn: this.opts.jwtExpiresIn
    } as SignOptions);
    return { token, user };
  }

  private async ensureDefaultWorkspace(tenantId: string) {
    let company = await this.prismaCompany.findUnique({ where: { tenantId } });
    if (!company) {
      company = await this.prismaCompany.create({
        data: {
          tenantId,
          name: tenantId === "t_default" ? "Default Company" : `Company ${tenantId}`
        }
      });
    }
    let workspace = await this.prismaWorkspace.findFirst({
      where: { tenantId, slug: "main" }
    });
    if (!workspace) {
      workspace = await this.prismaWorkspace.create({
        data: {
          companyId: company.id,
          tenantId,
          slug: "main",
          displayName: "Main Workspace"
        }
      });
    }
    return workspace;
  }

  private async ensureMembership(input: { workspaceId: string; userId: string; role: string }) {
    const existing = await this.prismaWorkspaceMember.findFirst({
      where: { workspaceId: input.workspaceId, userId: input.userId }
    });
    if (!existing) {
      await this.prismaWorkspaceMember.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          role: input.role,
          status: "active"
        }
      });
    }
  }

  private async buildAuthUser(user: any): Promise<AuthUser> {
    const workspace = user.workspaceId
      ? await this.prismaWorkspace.findUnique({ where: { id: user.workspaceId } })
      : await this.ensureDefaultWorkspace(user.tenantId);
    if (!workspace) {
      throw unauthorized("No active workspace is available for this user");
    }
    await this.ensureMembership({
      workspaceId: workspace.id,
      userId: user.id,
      role: user.role === "superadmin" ? "superadmin" : user.role === "admin" ? "admin" : "user"
    });
    const membership = await this.prismaWorkspaceMember.findFirst({
      where: { userId: user.id, workspaceId: workspace.id }
    });
    return {
      id: user.id,
      tenantId: user.tenantId,
      companyId: workspace.companyId ?? null,
      workspaceId: workspace.id,
      membershipRole: membership?.role ?? null,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status
    };
  }

  private toAuthUser(user: {
    id: string;
    tenantId: string;
    email: string;
    displayName: string | null;
    role: string;
    status: string;
  }): AuthUser {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status
    };
  }
}
