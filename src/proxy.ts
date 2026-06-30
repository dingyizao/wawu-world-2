import { type NextRequest, NextResponse } from "next/server";

import {
  ONBOARDING_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "./server/session";
import { requestGateDecision } from "./server/world-gate";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const onboardingComplete =
    request.cookies.get(ONBOARDING_COOKIE_NAME)?.value === "complete";
  const decision = requestGateDecision(
    pathname,
    hasSession,
    onboardingComplete,
  );
  if (decision === "allow") {
    return NextResponse.next();
  }
  if (decision === "unauthorized") {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }
  return NextResponse.redirect(new URL("/onboarding", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
