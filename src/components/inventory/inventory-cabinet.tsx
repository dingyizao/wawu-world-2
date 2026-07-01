"use client";

import Image from "next/image";
import { useState } from "react";

import {
  type ItemCategory,
  type ItemDefinition,
  itemProvenance,
} from "../../domain/inventory";

const FILTERS: Array<{ id: ItemCategory; label: string }> = [
  { id: "furniture", label: "摆件" },
  { id: "clothing", label: "衣物" },
  { id: "souvenir", label: "纪念" },
  { id: "postcard", label: "明信片" },
];

export function InventoryCabinet({
  items,
}: {
  items: Array<ItemDefinition & { instanceId: string; sourceActionId: string }>;
}) {
  const [category, setCategory] = useState<ItemCategory>(
    items[0]?.category ?? "furniture",
  );
  const visible = items.filter((item) => item.category === category);

  return (
    <>
      <div className="cabinet-filters">
        {FILTERS.map((filter) => (
          <button
            aria-pressed={category === filter.id}
            key={filter.id}
            onClick={() => setCategory(filter.id)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="empty-cabinet">
          <Image
            alt=""
            height={360}
            src="/assets/generated/scenes/empty-storage.png"
            width={640}
          />
          <strong>这一格还空着</strong>
          <p>去同行、打卡或让分身创造一个新物件。</p>
        </div>
      ) : (
        <div className="inventory-grid">
          {visible.map((item) => (
            <article className="inventory-card" key={item.instanceId}>
              <Image alt="" height={220} src={item.assetPath} width={220} />
              <span>{item.rarity}</span>
              <h2>{item.name}</h2>
              <p>{itemProvenance(item.sourceActionId)}</p>
              <button type="button">放到展示格</button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
