import { describe, expect, it } from "vitest";

import {
  generateCompanionObservation,
  type CompanionModelClient,
} from "./companion-ai";

const context = {
  companionName: "小满",
  mbti: "ENFP" as const,
  family: "diplomat" as const,
  relationship: "companion" as const,
  anchors: [
    { id: "park", name: "少城公园" },
    { id: "teahouse", name: "盖碗茶铺" },
  ],
};

describe("companion observation", () => {
  it("sanitizes and length-limits valid model JSON", async () => {
    const client: CompanionModelClient = {
      generate: async () =>
        JSON.stringify({
          line: `一起去看看\u0000${"光".repeat(90)}`,
          suggestedAnchorId: "park",
          reason: "那里有风和树影",
        }),
    };

    const result = await generateCompanionObservation(context, {
      client,
      timeoutMs: 50,
    });

    expect(result.modelSource).toBe("coze");
    expect(Array.from(result.line)).toHaveLength(72);
    expect(result.line).not.toMatch(/[\u0000-\u001f]/);
    expect(result.suggestedAnchorId).toBe("park");
  });

  it("uses an explicit safe fallback for malformed output", async () => {
    const client: CompanionModelClient = {
      generate: async () => "not-json",
    };

    await expect(
      generateCompanionObservation(context, { client, timeoutMs: 50 }),
    ).resolves.toMatchObject({
      modelSource: "safe-fallback",
      suggestedAnchorId: "park",
    });
  });

  it("uses the fallback when the model times out", async () => {
    const client: CompanionModelClient = {
      generate: async () => new Promise(() => undefined),
    };

    const result = await generateCompanionObservation(context, {
      client,
      timeoutMs: 5,
    });

    expect(result.modelSource).toBe("safe-fallback");
    expect(result.line).toContain("小满");
  });
});
