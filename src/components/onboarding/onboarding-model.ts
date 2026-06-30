import { getMbtiProfile } from "../../domain/mbti";
import type {
  MbtiType,
  OnboardingStage,
  Relationship,
  WalkMode,
} from "../../domain/types";

export interface OnboardingDraft {
  stage: OnboardingStage;
  agentName: string;
  mbti: MbtiType | null;
  avatarId: string | null;
  relationship: Relationship;
  tuning: {
    initiative: number;
    expression: number;
    autonomy: number;
  };
  walkMode: WalkMode | null;
  firstShardCollected: boolean;
}

export function createOnboardingDraft(): OnboardingDraft {
  return {
    stage: "meet",
    agentName: "",
    mbti: null,
    avatarId: null,
    relationship: "companion",
    tuning: { initiative: 0.7, expression: 0.7, autonomy: 0.7 },
    walkMode: null,
    firstShardCollected: false,
  };
}

export function selectCompanion(
  draft: OnboardingDraft,
  mbti: MbtiType,
  avatarId: string,
): OnboardingDraft {
  const profile = getMbtiProfile(mbti);
  return {
    ...draft,
    mbti,
    avatarId,
    stage: "tune",
    tuning: {
      initiative: profile.initiative,
      expression: profile.expression,
      autonomy: profile.autonomy,
    },
  };
}

export function denyLocationPermission(
  draft: OnboardingDraft,
): OnboardingDraft {
  return { ...draft, walkMode: "training", stage: "first-walk" };
}

export function allowLocationPermission(
  draft: OnboardingDraft,
): OnboardingDraft {
  return { ...draft, walkMode: "real", stage: "first-walk" };
}

export function recordFirstShard(
  draft: OnboardingDraft,
): OnboardingDraft {
  return { ...draft, firstShardCollected: true, stage: "complete" };
}

export function canCompleteOnboarding(draft: OnboardingDraft): boolean {
  return (
    draft.stage === "complete" &&
    draft.agentName.trim().length > 0 &&
    draft.mbti !== null &&
    draft.avatarId !== null &&
    draft.walkMode !== null &&
    draft.firstShardCollected
  );
}
