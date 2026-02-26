"use client";

import { useState, useEffect, useCallback, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  LayoutDashboard,
  Wrench,
  Palette,
  Gamepad2,
  TrendingUp,
  Shield,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  description: string;
}

interface NavGroup {
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const DASHBOARD_ITEM: NavItem = {
  href: "/dashboard",
  label: "Dashboard",
  description: "Overview and quick actions",
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "CORE TOOLS",
    icon: Wrench,
    items: [
      {
        href: "/dashboard/optimizer",
        label: "Prompt Optimizer",
        description: "Transform vague prompts into precise instructions",
      },
      {
        href: "/dashboard/agents",
        label: "Agent Swarm",
        description: "Multi-agent critique loop for code",
      },
      {
        href: "/dashboard/critique",
        label: "Code Critique",
        description: "Security and quality review of code",
      },
      {
        href: "/dashboard/iterate",
        label: "Auto-Iterate",
        description: "Automated improve-test-refine loops",
      },
      {
        href: "/dashboard/vibe-wizard",
        label: "Vibe Wizard",
        description: "Guided vibe-check workflow",
      },
      {
        href: "/dashboard/results-booster",
        label: "Results Booster",
        description: "Amplify and refine agent outputs",
      },
      {
        href: "/dashboard/swarm-coordinator",
        label: "Swarm Maestro",
        description: "Orchestrate multi-swarm workflows",
      },
    ],
  },
  {
    label: "CREATIVE",
    icon: Palette,
    items: [
      {
        href: "/dashboard/template-vibe",
        label: "Template Vibe",
        description: "Generate and customize web templates",
      },
      {
        href: "/dashboard/remix",
        label: "Creative Remix",
        description: "Remix and mashup creative content",
      },
      {
        href: "/dashboard/vision",
        label: "Vision Analysis",
        description: "Analyze images and visual content",
      },
      {
        href: "/dashboard/music-edu",
        label: "Music Edu",
        description: "Music theory and education tools",
      },
    ],
  },
  {
    label: "GAME DEV",
    icon: Gamepad2,
    items: [
      {
        href: "/dashboard/gaming",
        label: "Game Creator",
        description: "Full-stack game creation assistant",
      },
      {
        href: "/dashboard/godot",
        label: "Godot Viber",
        description: "Godot Engine development helper",
      },
      {
        href: "/dashboard/unreal",
        label: "Unreal Pro",
        description: "Unreal Engine expert assistant",
      },
      {
        href: "/dashboard/game-engine",
        label: "Game Engine",
        description: "General game engine guidance",
      },
    ],
  },
  {
    label: "FINANCE & DATA",
    icon: TrendingUp,
    items: [
      {
        href: "/dashboard/profit",
        label: "Profit Agent",
        description: "Revenue optimization strategies",
      },
      {
        href: "/dashboard/kalshi",
        label: "Kalshi Alpha",
        description: "Kalshi prediction market analysis",
      },
      {
        href: "/dashboard/polymarket",
        label: "Polymarket Max",
        description: "Polymarket strategy insights",
      },
      {
        href: "/dashboard/alpha-sim",
        label: "Alpha Simulator",
        description: "Simulate trading strategies",
      },
      {
        href: "/dashboard/math-guardian",
        label: "Math Guardian",
        description: "Mathematical verification engine",
      },
      {
        href: "/dashboard/comprehension",
        label: "Comprehension Gate",
        description: "Deep understanding validator",
      },
    ],
  },
  {
    label: "SECURITY & INTEL",
    icon: Shield,
    items: [
      {
        href: "/dashboard/cyber-sec",
        label: "Cyber Shield",
        description: "Security audit and hardening",
      },
      {
        href: "/dashboard/osint",
        label: "OSINT Hunter",
        description: "Open source intelligence tools",
      },
    ],
  },
  {
    label: "SYSTEM",
    icon: Settings,
    items: [
      {
        href: "/dashboard/settings",
        label: "API Keys",
        description: "Manage your BYOK API keys",
      },
      {
        href: "/dashboard/settings",
        label: "Taste Profile",
        description: "Customize your coding preferences",
      },
      {
        href: "/dashboard/memory",
        label: "Memory Vault",
        description: "Vector memory for context persistence",
      },
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        description: "Usage stats and performance metrics",
      },
      {
        href: "/dashboard/tools",
        label: "Tool Belt",
        description: "Utility tools and helpers",
      },
      {
        href: "/dashboard/life",
        label: "Life Planner",
        description: "Life and productivity planning",
      },
      {
        href: "/dashboard/remote",
        label: "Remote Control",
        description: "Remote session management",
      },
      {
        href: "/dashboard/opus-handoff",
        label: "Opus Handoff",
        description: "Hand off tasks to Opus model",
      },
      {
        href: "/dashboard/clone",
        label: "Clone Setup",
        description: "Clone and replicate configurations",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Storage key & defaults                                             */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "metavibe-sidebar-groups";

const DEFAULT_EXPANDED: Record<string, boolean> = {
  "CORE TOOLS": true,
  CREATIVE: false,
  "GAME DEV": false,
  "FINANCE & DATA": false,
  "SECURITY & INTEL": false,
  SYSTEM: true,
};

function loadExpandedState(): Record<string, boolean> {
  if (typeof window === "undefined") return DEFAULT_EXPANDED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      // Merge with defaults so new groups get a default value
      return { ...DEFAULT_EXPANDED, ...parsed };
    }
  } catch {
    // Corrupted storage — fall back
  }
  return DEFAULT_EXPANDED;
}

function saveExpandedState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked — silently ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Helper: does a group contain the current route?                    */
/* ------------------------------------------------------------------ */

function groupContainsPath(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => pathname === item.href);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const pathname = usePathname();

  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    DEFAULT_EXPANDED,
  );

  // Hydrate from localStorage after mount
  useEffect(() => {
    setExpanded(loadExpandedState());
  }, []);

  // Auto-expand any group whose item matches the current route
  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const group of NAV_GROUPS) {
        if (!next[group.label] && groupContainsPath(group, pathname)) {
          next[group.label] = true;
          changed = true;
        }
      }
      if (changed) {
        saveExpandedState(next);
        return next;
      }
      return prev;
    });
  }, [pathname]);

  const toggle = useCallback((label: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      saveExpandedState(next);
      return next;
    });
  }, []);

  const isDashboardActive = pathname === DASHBOARD_ITEM.href;

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-surface">
      {/* ── Header ── */}
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link href="/dashboard" className="text-lg font-bold">
          Meta<span className="text-primary-light">Vibe</span>
        </Link>
      </div>

      {/* ── Scrollable nav area ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {/* Dashboard (always visible, outside groups) */}
        <Link
          href={DASHBOARD_ITEM.href}
          title={DASHBOARD_ITEM.description}
          className={cn(
            "mb-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isDashboardActive
              ? "bg-primary/15 font-medium text-primary-light"
              : "text-muted hover:bg-surface-elevated hover:text-foreground",
          )}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {DASHBOARD_ITEM.label}
        </Link>

        {/* ── Groups ── */}
        {NAV_GROUPS.map((group) => {
          const isExpanded = expanded[group.label] ?? false;
          const GroupIcon = group.icon;

          return (
            <div key={group.label} className="mt-2">
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggle(group.label)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold tracking-wider text-muted",
                  "transition-colors hover:text-foreground",
                )}
              >
                <ChevronRight
                  className={cn(
                    "h-3 w-3 shrink-0 transition-transform duration-200",
                    isExpanded && "rotate-90",
                  )}
                />
                <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                <span>{group.label}</span>
              </button>

              {/* Collapsible items container */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-in-out",
                  isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <div className="mt-1 space-y-0.5 pb-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={`${group.label}-${item.label}`}
                          href={item.href}
                          title={item.description}
                          className={cn(
                            "flex items-center rounded-lg py-1.5 pl-9 pr-3 text-sm transition-colors",
                            isActive
                              ? "bg-primary/15 font-medium text-primary-light"
                              : "text-muted hover:bg-surface-elevated hover:text-foreground",
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-border p-4">
        <p className="text-xs text-muted">MetaVibeCoder v1</p>
      </div>
    </aside>
  );
}
