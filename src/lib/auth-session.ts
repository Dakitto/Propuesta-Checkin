import { createHmac, timingSafeEqual } from "crypto";

import { SessionData } from "@/types";

export const SESSION_COOKIE_NAME = "portal-session";

type Role = SessionData["role"];

type SessionPayload = SessionData & {
  exp: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret(): string {
  return process.env.AUTH_SESSION_SECRET || "change-this-session-secret";
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(session: SessionData): string {
  const payload: SessionPayload = {
    ...session,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function parseSessionToken(token: string | undefined): SessionData | null {
  if (!token) return null;

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (!payload.username || !payload.role || !payload.loggedInAt) return null;
    if (payload.exp < Date.now()) return null;
    if (payload.role !== "admin" && payload.role !== "checker") return null;

    return {
      username: payload.username,
      role: payload.role,
      loggedInAt: payload.loggedInAt,
    };
  } catch {
    return null;
  }
}

function normalizeCredential(value: string): string {
  return value.trim();
}

export function resolveCredentials() {
  return {
    admin: {
      username: normalizeCredential(process.env.AUTH_ADMIN_USERNAME || "admin"),
      password: normalizeCredential(process.env.AUTH_ADMIN_PASSWORD || "admin2026"),
      role: "admin" as Role,
    },
    checker: {
      username: normalizeCredential(process.env.AUTH_CHECKER_USERNAME || "chequeador"),
      password: normalizeCredential(process.env.AUTH_CHECKER_PASSWORD || "chequeador2026"),
      role: "checker" as Role,
    },
  };
}

export function authenticateUser(username: string, password: string): SessionData | null {
  const credentials = resolveCredentials();
  const normalizedUsername = normalizeCredential(username);
  const normalizedPassword = normalizeCredential(password);

  const users = [credentials.admin, credentials.checker];
  const user = users.find(
    (entry) => entry.username === normalizedUsername && entry.password === normalizedPassword,
  );

  if (!user) {
    return null;
  }

  return {
    username: user.username,
    role: user.role,
    loggedInAt: new Date().toISOString(),
  };
}
