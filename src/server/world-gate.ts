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
