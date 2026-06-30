import { describe, expect, it } from "vitest";

import { requestGateDecision } from "./world-gate";

describe("requestGateDecision", () => {
  it("allows only explicit public API paths without a session", () => {
    expect(requestGateDecision("/api/health", false, false)).toBe("allow");
    expect(
      requestGateDecision("/api/onboarding/complete", false, false),
    ).toBe("allow");
  });

  it("returns unauthorized for protected APIs without a completed session", () => {
    expect(requestGateDecision("/api/state", false, false)).toBe(
      "unauthorized",
    );
  });

  it("redirects protected pages without a completed session", () => {
    expect(requestGateDecision("/map", false, false)).toBe("redirect");
  });

  it("allows protected paths with both session and onboarding marker", () => {
    expect(requestGateDecision("/api/state", true, true)).toBe("allow");
    expect(requestGateDecision("/map", true, true)).toBe("allow");
  });
});
