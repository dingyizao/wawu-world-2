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

const MBTI_LABELS: Record<MbtiType, string> = {
  INTJ: "策划者",
  INTP: "解谜者",
  ENTJ: "领航者",
  ENTP: "点子王",
  INFJ: "倾听者",
  INFP: "造梦者",
  ENFJ: "共鸣者",
  ENFP: "追光者",
  ISTJ: "记录员",
  ISFJ: "守护者",
  ESTJ: "执行官",
  ESFJ: "暖场者",
  ISTP: "实干家",
  ISFP: "漫游者",
  ESTP: "行动派",
  ESFP: "气氛家",
};

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
      expect(profile.personaTags.length).toBeGreaterThanOrEqual(3);
      expect(profile.personaTags.length).toBeLessThanOrEqual(4);
      expect(profile.poiBias.length).toBeGreaterThan(0);
      for (const tuning of [
        profile.initiative,
        profile.expression,
        profile.autonomy,
      ]) {
        expect(Number.isFinite(tuning)).toBe(true);
        expect(tuning).toBeGreaterThanOrEqual(0);
        expect(tuning).toBeLessThanOrEqual(1);
      }
      expect(profile.portraitAssetId).toBe(`avatar-${type}-portrait`);
      expect(profile.walkAssetId).toBe(`avatar-${type}-walk`);
    }
  });

  it("uses the approved avatar labels", () => {
    expect(
      Object.fromEntries(
        MBTI_CATALOG.map((profile) => [profile.type, profile.label]),
      ),
    ).toEqual(MBTI_LABELS);
  });

  it("exposes immutable shared profiles", () => {
    expect(Object.isFrozen(MBTI_CATALOG)).toBe(true);

    for (const profile of MBTI_CATALOG) {
      expect(Object.isFrozen(profile)).toBe(true);
      expect(Object.isFrozen(profile.personaTags)).toBe(true);
      expect(Object.isFrozen(profile.poiBias)).toBe(true);
      expect(getMbtiProfile(profile.type)).toBe(profile);
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
