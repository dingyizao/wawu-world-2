import { describe, expect, it } from "vitest";

import { MBTI_CATALOG, getMbtiProfile } from "./mbti";
import type { MbtiType } from "./types";

const MBTI_TYPES = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
] as const satisfies readonly MbtiType[];

describe("MBTI catalog", () => {
  it("defines exactly 16 unique MBTI types", () => {
    expect(MBTI_CATALOG).toHaveLength(16);
    expect(new Set(MBTI_CATALOG.map((entry) => entry.type))).toEqual(
      new Set(MBTI_TYPES),
    );
  });

  it("defines complete profiles with stable asset ids", () => {
    for (const profile of MBTI_CATALOG) {
      const type = profile.type.toLowerCase();

      expect(profile.family).toBeTruthy();
      expect(profile.label).toMatch(/[\u3400-\u9fff]/);
      expect(profile.description).toMatch(/[\u3400-\u9fff]/);
      expect(profile.personaTags.length).toBeGreaterThan(0);
      expect(profile.poiBias.length).toBeGreaterThan(0);
      expect(Number.isFinite(profile.initiative)).toBe(true);
      expect(Number.isFinite(profile.expression)).toBe(true);
      expect(Number.isFinite(profile.autonomy)).toBe(true);
      expect(profile.portraitAssetId).toBe(`avatar-${type}-portrait`);
      expect(profile.walkAssetId).toBe(`avatar-${type}-walk`);
    }
  });

  it("maps ENFP to an active discovery profile", () => {
    expect(getMbtiProfile("ENFP").poiBias).toContain("unexpected");
  });

  it("returns the matching profile", () => {
    for (const type of MBTI_TYPES) {
      expect(getMbtiProfile(type).type).toBe(type);
    }
  });
});
