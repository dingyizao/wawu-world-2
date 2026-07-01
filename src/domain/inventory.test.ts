import { describe, expect, it } from "vitest";

import {
  ITEM_CATALOG,
  cabinetWindows,
  itemsByCategory,
  itemProvenance,
} from "./inventory";

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

  it("builds four visual cabinet windows with counts and featured items", () => {
    const windows = cabinetWindows([
      { ...ITEM_CATALOG.find((item) => item.id === "tea-set")!, instanceId: "a", sourceActionId: "checkin:park" },
      { ...ITEM_CATALOG.find((item) => item.id === "umbrella")!, instanceId: "b", sourceActionId: "training:bridge" },
      { ...ITEM_CATALOG.find((item) => item.id === "camera")!, instanceId: "c", sourceActionId: "creation:desk" },
    ]);

    expect(windows.map(({ category }) => category)).toEqual([
      "furniture",
      "clothing",
      "souvenir",
      "postcard",
    ]);
    expect(windows.map(({ label }) => label)).toEqual(["摆件柜", "衣装柜", "纪念柜", "明信片夹"]);
    expect(windows.find(({ category }) => category === "furniture")?.count).toBe(1);
    expect(windows.find(({ category }) => category === "furniture")?.featuredItem?.name).toBe("盖碗茶具");
    expect(windows.find(({ category }) => category === "postcard")?.count).toBe(0);
  });
});
