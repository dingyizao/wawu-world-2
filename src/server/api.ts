import { randomUUID } from "node:crypto";

import { MBTI_CATALOG, getMbtiProfile } from "../domain/mbti";
import { createInitialState } from "../domain/state";
import type {
  GameStateV1,
  MbtiType,
  Relationship,
} from "../domain/types";
import type { GameRepository } from "./repository";
import {
  authenticatedUserId,
  createAuthenticatedSession,
  ONBOARDING_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  type SessionCookieStore,
} from "./session";

export interface OnboardingInput {
  agentName: string;
  mbti: MbtiType;
  avatarId: string;
  relationship: Relationship;
  tuning: {
    initiative: number;
    expression: number;
    autonomy: number;
  };
}

type ErrorBody = { error: "INVALID_INPUT" | "UNAUTHORIZED" };
type ResetBody = { ok: true; redirectTo: "/onboarding" };

export type ApiResult =
  | { status: 200 | 201; body: GameStateV1 }
  | { status: 400 | 401; body: ErrorBody };

export type ResetResult =
  | { status: 200; body: ResetBody }
  | { status: 401; body: ErrorBody };

const RELATIONSHIPS = new Set<Relationship>([
  "mirror",
  "companion",
  "chronicler",
  "guardian",
]);
const MBTI_TYPES = new Set(MBTI_CATALOG.map((profile) => profile.type));
const BALANCE_FIELDS = ["startingBalance", "memoryShards", "balance", "wallet"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validTuning(value: unknown): value is OnboardingInput["tuning"] {
  if (!isRecord(value)) {
    return false;
  }
  return ["initiative", "expression", "autonomy"].every((key) => {
    const tuning = value[key];
    return (
      typeof tuning === "number" &&
      Number.isFinite(tuning) &&
      tuning >= 0 &&
      tuning <= 1
    );
  });
}

function parseOnboardingInput(value: unknown): OnboardingInput | null {
  if (
    !isRecord(value) ||
    BALANCE_FIELDS.some((field) => field in value) ||
    typeof value.agentName !== "string" ||
    value.agentName.trim() === "" ||
    typeof value.avatarId !== "string" ||
    value.avatarId.trim() === "" ||
    typeof value.mbti !== "string" ||
    !MBTI_TYPES.has(value.mbti as MbtiType) ||
    typeof value.relationship !== "string" ||
    !RELATIONSHIPS.has(value.relationship as Relationship) ||
    !validTuning(value.tuning)
  ) {
    return null;
  }
  return {
    agentName: value.agentName.trim(),
    mbti: value.mbti as MbtiType,
    avatarId: value.avatarId,
    relationship: value.relationship as Relationship,
    tuning: value.tuning,
  };
}

export async function completeOnboarding(
  repository: GameRepository,
  cookies: SessionCookieStore,
  input: unknown,
  options: {
    now?: Date;
    userId?: string;
    production?: boolean;
  } = {},
): Promise<ApiResult> {
  const parsed = parseOnboardingInput(input);
  if (parsed === null) {
    return { status: 400, body: { error: "INVALID_INPUT" } };
  }

  const userId = options.userId ?? randomUUID();
  const profile = getMbtiProfile(parsed.mbti);
  const initial = createInitialState(userId);
  const state: GameStateV1 = {
    ...initial,
    onboarding: { stage: "complete" },
    agent: {
      name: parsed.agentName,
      mbti: parsed.mbti,
      relationship: parsed.relationship,
      ...parsed.tuning,
      portraitAssetId: parsed.avatarId,
      walkAssetId: profile.walkAssetId,
    },
  };

  await repository.saveInitialState(userId, state);
  await createAuthenticatedSession(repository, cookies, userId, options);
  return { status: 201, body: state };
}

export async function getStateResponse(
  repository: GameRepository,
  cookies: Pick<SessionCookieStore, "get">,
  options: { now?: Date } = {},
): Promise<ApiResult> {
  const userId = await authenticatedUserId(repository, cookies, options);
  if (userId === null) {
    return { status: 401, body: { error: "UNAUTHORIZED" } };
  }
  const state = await repository.getState(userId);
  if (state === null || state.onboarding.stage !== "complete") {
    return { status: 401, body: { error: "UNAUTHORIZED" } };
  }
  return { status: 200, body: state };
}

export async function resetCurrentUser(
  repository: GameRepository,
  cookies: Pick<SessionCookieStore, "get"> & {
    delete(name: string): void;
  },
  options: { now?: Date } = {},
): Promise<ResetResult> {
  const userId = await authenticatedUserId(repository, cookies, options);
  if (userId === null) {
    return { status: 401, body: { error: "UNAUTHORIZED" } };
  }

  await repository.resetUser(userId);
  cookies.delete(SESSION_COOKIE_NAME);
  cookies.delete(ONBOARDING_COOKIE_NAME);
  return { status: 200, body: { ok: true, redirectTo: "/onboarding" } };
}
