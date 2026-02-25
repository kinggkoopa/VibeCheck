"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/settings", label: "API Keys" },
  { href: "/dashboard/optimizer", label: "Prompt Optimizer" },
  { href: "/dashboard/agents", label: "Agent Swarm" },
  { href: "/dashboard/critique", label: "Code Critique" },
  { href: "/dashboard/iterate", label: "Auto-Iterate" },
  { href: "/dashboard/tools", label: "Tool Belt" },
  { href: "/dashboard/memory", label: "Memory Vault" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/remote", label: "Remote Control" },
  { href: "/dashboard/vision", label: "Vision Analysis" },
  { href: "/dashboard/life", label: "Life Planner" },
  { href: "/dashboard/clone", label: "Clone Setup" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" className="text-lg font-bold">
          Meta<span className="text-primary-light">Vibe</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/15 text-primary-light font-medium"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted">MetaVibeCoder v1</p>
      </div>
    </aside>
  );
}
