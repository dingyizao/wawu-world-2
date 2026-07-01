import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MobileShell } from "../../components/mobile-shell";
import { authenticatedUserId } from "../../server/session";
import { getGameRepository } from "../../server/storage";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const repository = getGameRepository();
  const userId = await authenticatedUserId(repository, await cookies());
  const state = userId ? await repository.getState(userId) : null;
  if (!state?.agent) {
    redirect("/onboarding");
  }
  const type = state.agent.portraitAssetId.replace("avatar-", "").replace("-portrait", "");
  return (
    <MobileShell active="/agent">
      <section className="agent-profile-card">
        <Image
          alt={`${state.agent.name}的头像`}
          height={260}
          src={`/assets/generated/avatars/${type}-portrait.png`}
          width={260}
        />
        <div>
          <span className="eyebrow">我的 AI 分身</span>
          <h1>{state.agent.name}</h1>
          <p>{state.agent.mbti} · 同行关系：{state.agent.relationship}</p>
          <div className="feature-links">
            <Link href="/agent/report">查看今日记忆日报</Link>
            <Link href="/agent/creation">进入分身创造台</Link>
            <Link href="/routes">浏览成都主题路线</Link>
          </div>
        </div>
      </section>
    </MobileShell>
  );
}
