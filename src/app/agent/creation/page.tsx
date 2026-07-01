import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CreationDesk } from "../../../components/inventory/creation-desk";
import { MobileShell } from "../../../components/mobile-shell";
import { authenticatedUserId } from "../../../server/session";
import { getGameRepository } from "../../../server/storage";

export const dynamic = "force-dynamic";

export default async function CreationPage() {
  const repository = getGameRepository();
  const userId = await authenticatedUserId(repository, await cookies());
  const state = userId ? await repository.getState(userId) : null;
  if (!state) {
    redirect("/onboarding");
  }
  return (
    <MobileShell active="/agent/creation">
      <header className="showcase-header">
        <span className="eyebrow">分身创造台</span>
        <h1>把一句话，换成一件能收藏的记忆</h1>
        <p>模型失败会明确降级到预置物品；只有物品成功入柜才扣除碎片。</p>
      </header>
      <CreationDesk balance={state.wallet.memoryShards} />
    </MobileShell>
  );
}
