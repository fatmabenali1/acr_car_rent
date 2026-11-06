import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../db";
import { requireAdmin, signAdminAccessToken, signAdminRefreshToken, verifyAdminRefreshToken } from "../../middleware/admin-auth";
import { AppError } from "../../middleware/errors";
import { logAdminAction } from "../../services/admin-audit";

const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
}).strict();
const refreshSchema = z.object({ refreshToken: z.string().min(1).max(4096) }).strict();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_request, response) => {
    response.status(429).json({
      success: false,
      error: { code: "LOGIN_RATE_LIMITED", message: "Too many login attempts; try again later" },
    });
  },
});

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

function createTokenPair(user: { id: string; email: string; role: "ADMIN" | "STAFF" }) {
  const principal = { id: user.id, email: user.email, role: user.role };
  const tokenId = randomUUID();
  return {
    principal,
    tokenId,
    accessToken: signAdminAccessToken(principal),
    refreshToken: signAdminRefreshToken(principal, tokenId),
  };
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

authRouter.post("/login", loginLimiter, async (request, response) => {
  const input = loginSchema.parse(request.body);
  const user = await prisma.adminUser.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, role: true, passwordHash: true, isActive: true },
  });
  if (!user?.isActive || !(await bcrypt.compare(input.password, user?.passwordHash ?? ""))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  const pair = createTokenPair(user);
  await storeRefreshToken(user.id, pair.refreshToken);
  await logAdminAction({
    adminUserId: user.id,
    action: "LOGIN",
    resource: "auth",
    details: { method: "password" },
  });
  response.json({
    success: true,
    data: {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      tokenType: "Bearer",
      accessExpiresInSeconds: 900,
      refreshExpiresInSeconds: 604800,
      user: { id: user.id, email: user.email, role: user.role },
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

authRouter.post("/refresh", async (request, response) => {
  const { refreshToken } = refreshSchema.parse(request.body);
  const payload = verifyAdminRefreshToken(refreshToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    select: { id: true, userId: true, expiresAt: true, revokedAt: true, user: {
      select: { id: true, email: true, role: true, isActive: true },
    } },
  });
  if (
    !existing ||
    existing.userId !== payload.sub ||
    existing.revokedAt ||
    existing.expiresAt <= new Date() ||
    !existing.user.isActive
  ) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }

  const pair = createTokenPair(existing.user);
  await prisma.$transaction(async (transaction) => {
    const revoked = await transaction.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token has already been used");
    }
    await transaction.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashToken(pair.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  });
  response.json({
    success: true,
    data: {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      tokenType: "Bearer",
      accessExpiresInSeconds: 900,
      refreshExpiresInSeconds: 604800,
      user: { id: existing.user.id, email: existing.user.email, role: existing.user.role },
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

authRouter.post("/logout", async (request, response) => {
  const { refreshToken } = refreshSchema.parse(request.body);
  const payload = verifyAdminRefreshToken(refreshToken);
  const session = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    select: { id: true, userId: true },
  });
  if (!session || session.userId !== payload.sub) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid");
  }
  await prisma.refreshToken.updateMany({
    where: { id: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await logAdminAction({
    adminUserId: session.userId,
    action: "LOGOUT",
    resource: "auth",
    details: { method: "refresh_token" },
  });
  response.json({ success: true, data: { loggedOut: true }, meta: { timestamp: new Date().toISOString() } });
});

authRouter.get("/me", requireAdmin, async (request, response) => {
  response.json({
    success: true,
    data: request.admin,
    meta: { timestamp: new Date().toISOString() },
  });
});

export { authRouter };
