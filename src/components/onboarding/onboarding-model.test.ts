import { describe, expect, it } from "vitest";

import {
  canCompleteOnboarding,
  createOnboardingDraft,
  denyLocationPermission,
  recordFirstShard,
  selectCompanion,
} from "./onboarding-model";

describe("onboarding model", () => {
  it("stores personality and appearance as independent choices", () => {
    const draft = selectCompanion(
      createOnboardingDraft(),
      "ENFP",
      "avatar-istj-portrait",
    );

    expect(draft.mbti).toBe("ENFP");
    expect(draft.avatarId).toBe("avatar-istj-portrait");
  });

  it("defaults to a companion relationship", () => {
    expect(createOnboardingDraft().relationship).toBe("companion");
  });

  it("uses a labeled training walk when location permission is denied", () => {
    const draft = denyLocationPermission(createOnboardingDraft());

    expect(draft.walkMode).toBe("training");
    expect(draft.stage).toBe("first-walk");
  });

  it("cannot complete before the first shard action", () => {
    const readyExceptForShard = {
      ...selectCompanion(
        createOnboardingDraft(),
        "ENFP",
        "avatar-enfp-portrait",
      ),
      agentName: "小满",
      walkMode: "training" as const,
      stage: "first-shard" as const,
    };

    expect(canCompleteOnboarding(readyExceptForShard)).toBe(false);
    expect(canCompleteOnboarding(recordFirstShard(readyExceptForShard))).toBe(
      true,
    );
  });
});
