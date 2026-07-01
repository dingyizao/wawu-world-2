import Image from "next/image";
import Link from "next/link";

import { MobileShell } from "../../components/mobile-shell";

export default function RoutesPage() {
  return (
    <MobileShell active="/map">
      <header className="showcase-header">
        <span className="eyebrow">成都主题路线 · 演示内容</span>
        <h1>十个城市锚点，等你们一起走近</h1>
      </header>
      <Image alt="" className="showcase-scene" height={480} src="/assets/generated/scenes/fallback-chengdu-map.png" width={760} />
      <div className="feature-links">
        <Link href="/map">开始少城记忆路线</Link>
        <Link href="/challenges">查看本周同行挑战</Link>
      </div>
    </MobileShell>
  );
}
