import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { InventoryCabinet } from "../../components/inventory/inventory-cabinet";
import { MobileShell } from "../../components/mobile-shell";
import { itemDefinition } from "../../domain/inventory";
import { authenticatedUserId } from "../../server/session";
import { getGameRepository } from "../../server/storage";

export const dynamic = "force-dynamic";

export default async function HousePage() {
  const repository = getGameRepository();
  const userId = await authenticatedUserId(repository, await cookies());
  const state = userId ? await repository.getState(userId) : null;
  if (!state) {
    redirect("/onboarding");
  }
  const items = state.inventory.flatMap((instance) => {
    const definition = itemDefinition(instance.definitionId);
    return definition
      ? [{ ...definition, instanceId: instance.id, sourceActionId: instance.sourceActionId }]
      : [];
  });

  return (
    <MobileShell active="/house">
      <header className="showcase-header">
        <span className="eyebrow">我的娃屋</span>
        <h1>一只装着共同记忆的储物柜</h1>
        <p>这里只收纳兑换、同行和创造所得的虚拟物品，不是装饰房间游戏。</p>
      </header>
      <InventoryCabinet items={items} />
    </MobileShell>
  );
}
