import { type NextRequest, NextResponse } from "next/server";

import {
  ONBOARDING_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "./server/session";
import { isGateBypass } from "./server/world-gate";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isGateBypass(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const onboardingComplete =
    request.cookies.get(ONBOARDING_COOKIE_NAME)?.value === "complete";
  if (hasSession && onboardingComplete) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/onboarding", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
