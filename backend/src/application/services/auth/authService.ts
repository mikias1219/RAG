import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { badRequest, unauthorized } from "@/domain/errors/AppError";
import { getPrisma } from "@/infrastructure/db/prismaClient";

type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  displayName?: string | null;
};

export class AuthService {
  private readonly prisma = getPrisma();
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

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: input.tenantId, email } }
    });
    if (existing) throw badRequest("User with this email already exists");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId: input.tenantId,
        email,
        displayName: input.displayName?.trim() || null,
        passwordHash
      }
    });
    return this.issueToken(this.toAuthUser(user));
  }

  async login(input: { tenantId: string; email: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: input.tenantId, email } }
    });
    if (!user?.passwordHash) throw unauthorized("Invalid email or password");

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid email or password");
    return this.issueToken(this.toAuthUser(user));
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
    let user = await this.prisma.user.findFirst({
      where: { tenantId: input.tenantId, OR: [{ googleSub }, { email }] }
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          tenantId: input.tenantId,
          email,
          displayName: payload.name ?? null,
          googleSub
        }
      });
    } else if (!user.googleSub) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleSub, displayName: user.displayName ?? payload.name ?? null }
      });
    }

    return this.issueToken(this.toAuthUser(user));
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
        email: decoded.email,
        displayName: decoded.displayName ?? null
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

  private toAuthUser(user: {
    id: string;
    tenantId: string;
    email: string;
    displayName: string | null;
  }): AuthUser {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      displayName: user.displayName
    };
  }
}
