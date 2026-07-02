import { describe, expect, it } from "vitest";

import { createInitialState } from "../domain/state";
import type { OnboardingStage } from "../domain/types";
import {
  completeOnboarding,
  getStateResponse,
  resetCurrentUser,
  type OnboardingInput,
} from "./api";
import { MemoryGameRepository } from "./repository";
import {
  ONBOARDING_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  type SessionCookieStore,
} from "./session";
import { destinationFor, isGateBypass } from "./world-gate";

class TestCookieStore implements SessionCookieStore {
  readonly values = new Map<string, string>();
  readonly writes: Array<{
    name: string;
    value: string;
    options: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: "/";
      expires: Date;
    };
  }> = [];
  readonly deletes: string[] = [];

  get(name: string) {
    const value = this.values.get(name);
    return value === undefined ? undefined : { value };
  }

  set(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: "/";
      expires: Date;
    },
  ) {
    this.values.set(name, value);
    this.writes.push({ name, value, options });
  }

  delete(name: string) {
    this.values.delete(name);
    this.deletes.push(name);
  }
}

const validInput: OnboardingInput = {
  agentName: "阿瓦",
  mbti: "ENFP",
  avatarId: "avatar-enfp-portrait-alt",
  relationship: "companion",
  tuning: {
    initiative: 0.8,
    expression: 0.7,
    autonomy: 0.6,
  },
};

function stateAt(stage: OnboardingStage) {
  const state = createInitialState("user-1");
  return { ...state, onboarding: { stage } };
}

describe("destinationFor", () => {
  it("redirects incomplete users to onboarding", () => {
    expect(destinationFor(stateAt("mbti"), "/map")).toBe("/onboarding");
    expect(destinationFor(null, "/map")).toBe("/onboarding");
  });

  it("keeps the requested world path for completed users", () => {
    expect(destinationFor(stateAt("complete"), "/map")).toBe("/map");
  });

  it("only bypasses onboarding, health and Next asset paths", () => {
    expect(isGateBypass("/onboarding")).toBe(true);
    expect(isGateBypass("/api/onboarding/complete")).toBe(true);
    expect(isGateBypass("/api/health")).toBe(true);
    expect(isGateBypass("/_next/static/chunk.js")).toBe(true);
    expect(isGateBypass("/_next/image?url=x")).toBe(true);
    expect(isGateBypass("/map")).toBe(false);
    expect(isGateBypass("/api/state")).toBe(false);
  });
});

describe("onboarding API service", () => {
  it.each([
    ["empty name", { ...validInput, agentName: "  " }],
    ["invalid MBTI", { ...validInput, mbti: "NOPE" }],
    [
      "out-of-range tuning",
      {
        ...validInput,
        tuning: { ...validInput.tuning, autonomy: 1.1 },
      },
    ],
  ])("rejects %s", async (_name, input) => {
    const result = await completeOnboarding(
      new MemoryGameRepository(),
      new TestCookieStore(),
      input,
    );

    expect(result.status).toBe(400);
  });

  it.each([
    { startingBalance: 999 },
    { memoryShards: 999 },
    { wallet: { memoryShards: 999 } },
  ])("rejects client-supplied balance fields", async (balanceField) => {
    const result = await completeOnboarding(
      new MemoryGameRepository(),
      new TestCookieStore(),
      { ...validInput, ...balanceField },
    );

    expect(result.status).toBe(400);
  });

  it("persists a completed initial state and sets secure server cookies", async () => {
    const repository = new MemoryGameRepository();
    const cookies = new TestCookieStore();
    const now = new Date("2026-06-30T00:00:00.000Z");

    const result = await completeOnboarding(
      repository,
      cookies,
      validInput,
      {
        now,
        userId: "generated-user",
        production: true,
      },
    );

    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({
      onboarding: { stage: "complete" },
      user: { id: "generated-user" },
      wallet: { memoryShards: 0 },
      agent: {
        name: "阿瓦",
        mbti: "ENFP",
        portraitAssetId: "avatar-enfp-portrait-alt",
      },
    });
    expect(cookies.writes.map((cookie) => cookie.name)).toEqual([
      SESSION_COOKIE_NAME,
      ONBOARDING_COOKIE_NAME,
    ]);
    for (const cookie of cookies.writes) {
      expect(cookie.options).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
      });
      expect(cookie.options.expires).toEqual(
        new Date("2026-07-30T00:00:00.000Z"),
      );
    }
    expect(
      await repository.findSession(cookies.values.get(SESSION_COOKIE_NAME)!),
    ).toBeNull();
  });
});

describe("state API service", () => {
  it("returns 401 without a valid session", async () => {
    const result = await getStateResponse(
      new MemoryGameRepository(),
      new TestCookieStore(),
    );

    expect(result).toEqual({
      status: 401,
      body: { error: "UNAUTHORIZED" },
    });
  });

  it("returns the current state for the authenticated session", async () => {
    const repository = new MemoryGameRepository();
    const cookies = new TestCookieStore();
    await completeOnboarding(repository, cookies, validInput, {
      now: new Date("2026-06-30T00:00:00.000Z"),
      userId: "authenticated-user",
    });

    const result = await getStateResponse(repository, cookies, {
      now: new Date("2026-07-01T00:00:00.000Z"),
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      user: { id: "authenticated-user" },
      onboarding: { stage: "complete" },
    });
  });
});

describe("account reset API service", () => {
  it("rejects reset without a valid session", async () => {
    const result = await resetCurrentUser(
      new MemoryGameRepository(),
      new TestCookieStore(),
    );

    expect(result).toEqual({
      status: 401,
      body: { error: "UNAUTHORIZED" },
    });
  });

  it("deletes the current user state and clears session cookies", async () => {
    const repository = new MemoryGameRepository();
    const cookies = new TestCookieStore();
    await completeOnboarding(repository, cookies, validInput, {
      now: new Date("2026-06-30T00:00:00.000Z"),
      userId: "reset-user",
    });

    const result = await resetCurrentUser(repository, cookies, {
      now: new Date("2026-07-01T00:00:00.000Z"),
    });

    expect(result).toEqual({
      status: 200,
      body: { ok: true, redirectTo: "/onboarding" },
    });
    expect(cookies.deletes).toEqual([
      SESSION_COOKIE_NAME,
      ONBOARDING_COOKIE_NAME,
    ]);
    expect(await repository.getState("reset-user")).toBeNull();
    await expect(
      getStateResponse(repository, cookies, {
        now: new Date("2026-07-01T00:00:01.000Z"),
      }),
    ).resolves.toEqual({
      status: 401,
      body: { error: "UNAUTHORIZED" },
    });
  });
});
