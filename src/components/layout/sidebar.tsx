"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "◆" },
  { href: "/optimizer", label: "Prompt Optimizer", icon: "⚡" },
  { href: "/agents", label: "Agent Swarm", icon: "◎" },
  { href: "/critique", label: "Critique", icon: "△" },
  { href: "/memory", label: "Memory", icon: "◇" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="text-lg font-bold">
          Meta<span className="text-primary-light">Vibe</span>Coder
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary-light"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4">
        <p className="text-xs text-muted">MetaVibeCoder v1.0</p>
      </div>
    </aside>
  );
}
