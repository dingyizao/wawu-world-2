import { ITEM_CATALOG, itemDefinition } from "../domain/inventory";

const MODEL = "doubao-seed-2-0-mini-260215";

export async function generateCreation(prompt: string) {
  const fallback = () => {
    const score = Array.from(prompt).reduce(
      (total, character) => total + (character.codePointAt(0) ?? 0),
      0,
    );
    return {
      item: ITEM_CATALOG[score % ITEM_CATALOG.length],
      modelSource: "safe-fallback" as const,
      note: "模型失败，已按你的描述匹配预置物品",
    };
  };

  try {
    const { Config, LLMClient } = await import("coze-coding-dev-sdk");
    const client = new LLMClient(new Config({ timeout: 8_000 }));
    const response = await client.invoke(
      [
        {
          role: "system",
          content:
            "从候选物品中选择一个最符合描述的物品。只返回 JSON：{\"itemId\":\"候选ID\",\"note\":\"一句话\"}。",
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt,
            candidates: ITEM_CATALOG.map(({ id, name }) => ({ id, name })),
          }),
        },
      ],
      { model: MODEL, thinking: "disabled", temperature: 0.6 },
    );
    const parsed = JSON.parse(response.content) as {
      itemId?: unknown;
      note?: unknown;
    };
    const item =
      typeof parsed.itemId === "string"
        ? itemDefinition(parsed.itemId)
        : null;
    if (!item) {
      return fallback();
    }
    return {
      item,
      modelSource: "coze" as const,
      note:
        typeof parsed.note === "string"
          ? Array.from(parsed.note).slice(0, 72).join("")
          : "分身根据你的描述选中了这个物件",
    };
  } catch {
    return fallback();
  }
}
