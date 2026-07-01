import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/map", label: "同行" },
  { href: "/agent", label: "分身" },
  { href: "/agent/creation", label: "创造" },
  { href: "/house", label: "娃屋" },
];

export function MobileShell({
  active,
  children,
}: {
  active: string;
  children: ReactNode;
}) {
  return (
    <main className="world-shell showcase-shell">
      {children}
      <nav className="world-nav" aria-label="主要功能">
        {NAV.map((item) => (
          <Link
            aria-current={active === item.href ? "page" : undefined}
            href={item.href}
            key={item.href}
            prefetch={false}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
