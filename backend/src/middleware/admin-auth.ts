import type { AdminRole } from "@prisma/client";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, RequestHandler } from "express";
import { env } from "../config/env";
import { prisma } from "../db";
import { AppError } from "./errors";

export type AdminPrincipal = {
  id: string;
  email: string;
  role: AdminRole;
};

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPrincipal;
    }
  }
}

export function signAdminAccessToken(principal: AdminPrincipal): string {
  return jwt.sign(
    { typ: "access", role: principal.role },
    env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", subject: principal.id, expiresIn: 15 * 60 },
  );
}

export function signAdminRefreshToken(principal: AdminPrincipal, tokenId: string): string {
  return jwt.sign(
    { typ: "refresh", role: principal.role },
    env.JWT_REFRESH_SECRET,
    { algorithm: "HS256", subject: principal.id, jwtid: tokenId, expiresIn: 7 * 24 * 60 * 60 },
  );
}

export function verifyAdminRefreshToken(token: string): JwtPayload {
  let payload: string | JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }
  if (
    typeof payload === "string" ||
    payload.typ !== "refresh" ||
    typeof payload.sub !== "string" ||
    typeof payload.jti !== "string"
  ) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }
  return payload;
}

function getBearerToken(request: Request): string | null {
  const authorization = request.get("authorization");
  const match = authorization ? /^Bearer ([^\s]+)$/.exec(authorization) : null;
  return match?.[1] ?? null;
}

export const requireAdmin: RequestHandler = async (request, _response, next) => {
  const token = getBearerToken(request);
  if (!token) {
    throw new AppError(401, "AUTHENTICATION_REQUIRED", "Admin access token is required");
  }
  let payload: string | JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Admin access token is invalid or expired");
  }
  if (
    typeof payload === "string" ||
    payload.typ !== "access" ||
    typeof payload.sub !== "string"
  ) {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Admin access token is invalid or expired");
  }
  const user = await prisma.adminUser.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!user?.isActive) {
    throw new AppError(401, "ADMIN_ACCOUNT_INACTIVE", "Admin account is unavailable");
  }
  request.admin = { id: user.id, email: user.email, role: user.role };
  next();
};

export function requireRoles(...roles: AdminRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.admin || !roles.includes(request.admin.role)) {
      next(new AppError(403, "ADMIN_FORBIDDEN", "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}
