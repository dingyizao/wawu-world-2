import { createHash, randomBytes } from "node:crypto";

import type { GameRepository } from "./repository";

export const SESSION_COOKIE_NAME = "wawu_session";
export const ONBOARDING_COOKIE_NAME = "wawu_onboarding";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  expires: Date;
}

export interface SessionCookieStore {
  get(name: string): { value: string } | undefined;
  set(
    name: string,
    value: string,
    options: SessionCookieOptions,
  ): void;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(
  expires: Date,
  production: boolean,
): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: production,
    path: "/",
    expires,
  };
}

export async function createAuthenticatedSession(
  repository: GameRepository,
  cookies: SessionCookieStore,
  userId: string,
  options: { now?: Date; production?: boolean } = {},
): Promise<void> {
  const now = options.now ?? new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  const token = randomBytes(32).toString("base64url");

  await repository.createSession(
    userId,
    hashSessionToken(token),
    expiresAt,
  );
  cookies.set(
    SESSION_COOKIE_NAME,
    token,
    cookieOptions(
      expiresAt,
      options.production ?? process.env.NODE_ENV === "production",
    ),
  );
  cookies.set(
    ONBOARDING_COOKIE_NAME,
    "complete",
    cookieOptions(
      expiresAt,
      options.production ?? process.env.NODE_ENV === "production",
    ),
  );
}

export async function authenticatedUserId(
  repository: GameRepository,
  cookies: Pick<SessionCookieStore, "get">,
  options: { now?: Date } = {},
): Promise<string | null> {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token === undefined) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await repository.findSession(tokenHash);
  if (session === null) {
    return null;
  }
  if (session.expiresAt.getTime() <= (options.now ?? new Date()).getTime()) {
    await repository.deleteSession(tokenHash);
    return null;
  }
  return session.userId;
}
