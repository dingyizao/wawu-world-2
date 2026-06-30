import type { GameStateV1 } from "../domain/types";

export function destinationFor(
  state: GameStateV1 | null,
  requestedPath: string,
): string {
  return state?.onboarding.stage === "complete"
    ? requestedPath
    : "/onboarding";
}

export function isGateBypass(pathname: string): boolean {
  return (
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/onboarding/") ||
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image")
  );
}

export type RequestGateDecision = "allow" | "redirect" | "unauthorized";

export function requestGateDecision(
  pathname: string,
  hasSession: boolean,
  onboardingComplete: boolean,
): RequestGateDecision {
  if (
    isGateBypass(pathname) ||
    (hasSession && onboardingComplete)
  ) {
    return "allow";
  }
  return pathname.startsWith("/api/") ? "unauthorized" : "redirect";
}
