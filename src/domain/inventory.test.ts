import { describe, expect, it } from "vitest";

import { ITEM_CATALOG, itemsByCategory, itemProvenance } from "./inventory";

describe("storage inventory", () => {
  it("filters manifest-backed items by cabinet category", () => {
    expect(itemsByCategory("furniture").every((item) => item.category === "furniture")).toBe(true);
    expect(ITEM_CATALOG).toHaveLength(30);
  });

  it("renders training and creation provenance explicitly", () => {
    expect(itemProvenance("training:park")).toBe("训练所得");
    expect(itemProvenance("creation:desk")).toBe("分身创造");
    expect(itemProvenance("checkin:park")).toBe("真实打卡所得");
  });
});
