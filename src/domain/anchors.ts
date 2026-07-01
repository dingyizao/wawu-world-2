export const CHENGDU_ANCHORS = [
  { id: "park", name: "少城公园", icon: "anchor-park", rewardItemId: "tea-set" },
  { id: "teahouse", name: "盖碗茶铺", icon: "anchor-teahouse", rewardItemId: "tea-token" },
  { id: "old-alley", name: "旧巷转角", icon: "anchor-alley", rewardItemId: "alley-map" },
  { id: "old-shop", name: "百年老铺", icon: "anchor-old-shop", rewardItemId: "red-shop-sign" },
  { id: "food", name: "街巷小吃", icon: "anchor-food", rewardItemId: "spice-jar" },
  { id: "temple", name: "古寺钟声", icon: "anchor-temple", rewardItemId: "dialect-bell" },
  { id: "bridge", name: "河岸小桥", icon: "anchor-bridge", rewardItemId: "umbrella" },
  { id: "market", name: "晨间市集", icon: "anchor-market", rewardItemId: "bamboo-basket" },
  { id: "photo", name: "旧照相馆", icon: "anchor-photo", rewardItemId: "camera" },
  { id: "culture", name: "川剧小院", icon: "anchor-culture", rewardItemId: "opera-mask" },
] as const;

export function checkInAnchor(input: {
  mode: "real" | "training";
  distance?: number;
}) {
  if (
    input.mode === "real" &&
    (!Number.isFinite(input.distance) || (input.distance ?? Infinity) > 120)
  ) {
    throw new Error("TOO_FAR_FROM_ANCHOR");
  }
  return {
    training: input.mode === "training",
    realUnlock: input.mode === "real",
  };
}
