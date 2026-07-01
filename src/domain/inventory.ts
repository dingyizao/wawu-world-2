export type ItemCategory = "furniture" | "clothing" | "souvenir" | "postcard";

export type ItemDefinition = {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: "寻常" | "珍藏" | "稀有";
  assetPath: string;
};

export type InventoryDisplayItem = ItemDefinition & {
  instanceId: string;
  sourceActionId: string;
};

export type CabinetWindow = {
  category: ItemCategory;
  label: string;
  description: string;
  count: number;
  featuredItem: InventoryDisplayItem | null;
};

export const CABINET_CATEGORIES: Array<{
  id: ItemCategory;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "furniture",
    label: "摆件柜",
    shortLabel: "摆件",
    description: "茶具、椅凳、灯笼和街巷里带回来的小型陈设。",
  },
  {
    id: "clothing",
    label: "衣装柜",
    shortLabel: "衣物",
    description: "雨衣、鞋、伞和可随身佩戴的同行装束。",
  },
  {
    id: "souvenir",
    label: "纪念柜",
    shortLabel: "纪念",
    description: "票根、相机、铃铛和真实或训练同行留下的城市信物。",
  },
  {
    id: "postcard",
    label: "明信片夹",
    shortLabel: "明信片",
    description: "地图、相册、食谱和适合翻看的纸面记忆。",
  },
];

const definitions: Array<[string, string, ItemCategory, ItemDefinition["rarity"]]> = [
  ["alley-map", "巷陌手绘图", "postcard", "珍藏"],
  ["bamboo-basket", "竹编小篮", "furniture", "寻常"],
  ["bamboo-chair", "青竹椅", "furniture", "珍藏"],
  ["bus-ticket", "旧公交票", "souvenir", "寻常"],
  ["camera", "漫游相机", "souvenir", "稀有"],
  ["cassette-tape", "城市磁带", "souvenir", "珍藏"],
  ["dialect-bell", "方言铃", "souvenir", "珍藏"],
  ["embroidered-bag", "蜀绣小包", "clothing", "珍藏"],
  ["enamel-bowl", "搪瓷碗", "furniture", "寻常"],
  ["folding-fan", "竹骨折扇", "clothing", "珍藏"],
  ["memory-badge", "记忆徽章", "clothing", "稀有"],
  ["old-radio", "老收音机", "furniture", "稀有"],
  ["opera-mask", "川剧脸谱", "souvenir", "稀有"],
  ["paper-lantern", "纸灯笼", "furniture", "珍藏"],
  ["photo-album", "共同相册", "postcard", "珍藏"],
  ["postcard", "成都明信片", "postcard", "寻常"],
  ["rabbit-charm", "玉兔挂件", "clothing", "珍藏"],
  ["raincoat", "同行雨衣", "clothing", "寻常"],
  ["recipe-scroll", "家常食谱", "postcard", "珍藏"],
  ["red-shop-sign", "朱红店招", "furniture", "珍藏"],
  ["spice-jar", "香料小罐", "furniture", "寻常"],
  ["stamp-book", "探城集章册", "postcard", "稀有"],
  ["street-sign", "旧街牌", "souvenir", "珍藏"],
  ["tea-set", "盖碗茶具", "furniture", "稀有"],
  ["tea-token", "茶铺木牌", "souvenir", "寻常"],
  ["travel-pass", "同行通行证", "postcard", "珍藏"],
  ["umbrella", "青竹伞", "clothing", "珍藏"],
  ["walking-shoes", "漫游鞋", "clothing", "稀有"],
  ["window-flower", "窗花", "furniture", "寻常"],
  ["wooden-stool", "木方凳", "furniture", "寻常"],
];

export const ITEM_CATALOG: ItemDefinition[] = definitions.map(
  ([id, name, category, rarity]) => ({
    id,
    name,
    category,
    rarity,
    assetPath: `/assets/generated/items/${id}.png`,
  }),
);

export function itemsByCategory(category: ItemCategory) {
  return ITEM_CATALOG.filter((item) => item.category === category);
}

export function cabinetWindows(items: InventoryDisplayItem[]): CabinetWindow[] {
  return CABINET_CATEGORIES.map((category) => {
    const categoryItems = items.filter((item) => item.category === category.id);
    return {
      category: category.id,
      label: category.label,
      description: category.description,
      count: categoryItems.length,
      featuredItem: categoryItems[0] ?? null,
    };
  });
}

export function itemDefinition(id: string) {
  return ITEM_CATALOG.find((item) => item.id === id) ?? null;
}

export function itemProvenance(sourceActionId: string) {
  if (sourceActionId.startsWith("training:")) {
    return "训练所得";
  }
  if (sourceActionId.startsWith("creation:")) {
    return "分身创造";
  }
  return "真实打卡所得";
}
