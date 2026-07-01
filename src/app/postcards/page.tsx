import Image from "next/image";
import Link from "next/link";

import { MobileShell } from "../../components/mobile-shell";

export default function PostcardsPage() {
  return (
    <MobileShell active="/house">
      <header className="showcase-header">
        <span className="eyebrow">城市明信片 · 演示内容</span>
        <h1>把走过的路，寄给未来的你们</h1>
      </header>
      <div className="postcard-card">
        <Image alt="" height={360} src="/assets/generated/items/postcard.png" width={520} />
        <strong>少城公园 · 训练同行纪念</strong>
        <p>这张卡不会冒充真实到访记录。</p>
      </div>
      <div className="feature-links"><Link href="/house">回到储物柜</Link></div>
    </MobileShell>
  );
}
