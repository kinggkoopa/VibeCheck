import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Wrench,
  Palette,
  Gamepad2,
  TrendingUp,
  Shield,
  Settings,
  Key,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SetupWizard } from "@/components/SetupWizard";

export const dynamic = "force-dynamic";

/* ─── Domain cards matching sidebar groups ─── */

interface DomainCard {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  itemCount: number;
  accent: string;
}

const DOMAIN_CARDS: DomainCard[] = [
  {
    title: "Core Tools",
    description:
      "Prompt optimization, agent swarms, code critique, and iterative refinement",
    href: "/dashboard/optimizer",
    icon: Wrench,
    itemCount: 7,
    accent: "border-primary/40 hover:border-primary/60",
  },
  {
    title: "Creative",
    description:
      "Template generation, creative remixing, vision analysis, and music education",
    href: "/dashboard/template-vibe",
    icon: Palette,
    itemCount: 4,
    accent: "border-success/40 hover:border-success/60",
  },
  {
    title: "Game Dev",
    description:
      "Full-stack game creation with Godot, Unreal, and general engine support",
    href: "/dashboard/gaming",
    icon: Gamepad2,
    itemCount: 4,
    accent: "border-warning/40 hover:border-warning/60",
  },
  {
    title: "Finance & Data",
    description:
      "Profit analysis, prediction markets, trading simulation, and math verification",
    href: "/dashboard/profit",
    icon: TrendingUp,
    itemCount: 6,
    accent: "border-danger/40 hover:border-danger/60",
  },
  {
    title: "Security & Intel",
    description: "Security auditing, hardening, and open-source intelligence",
    href: "/dashboard/cyber-sec",
    icon: Shield,
    itemCount: 2,
    accent: "border-primary-light/40 hover:border-primary-light/60",
  },
  {
    title: "System",
    description:
      "API keys, taste profile, memory vault, analytics, and remote tools",
    href: "/dashboard/settings",
    icon: Settings,
    itemCount: 9,
    accent: "border-muted/40 hover:border-muted/60",
  },
];

/* ─── Setup progress checks ─── */

interface SetupCheck {
  label: string;
  icon: LucideIcon;
  done: boolean;
  href: string;
}

function getSetupChecks(
  keyCount: number,
  hasTasteProfile: boolean
): SetupCheck[] {
  return [
    {
      label: "API Key",
      icon: Key,
      done: keyCount > 0,
      href: "/dashboard/settings",
    },
    {
      label: "Taste Profile",
      icon: User,
      done: hasTasteProfile,
      href: "/dashboard/settings",
    },
    {
      label: "First Run",
      icon: Zap,
      done: keyCount > 0,
      href: "/dashboard/agents",
    },
  ];
}

/* ─── Page ─── */

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch key count
  const { data: keys } = await supabase.rpc("list_user_keys");
  const keyCount = keys?.length ?? 0;

  // Check if user has a taste profile (any row in taste_prefs)
  const { data: tasteData } = user
    ? await supabase
        .from("taste_prefs")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const hasTasteProfile = !!tasteData;

  const setupChecks = getSetupChecks(keyCount, hasTasteProfile);
  const setupComplete = setupChecks.every((c) => c.done);

  return (
    <div className="space-y-8">
      {/* Setup Wizard — shown for brand-new users */}
      <SetupWizard keyCount={keyCount} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back
          {user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {keyCount > 0
            ? `${keyCount} API key${keyCount > 1 ? "s" : ""} configured. Ready to vibe.`
            : "Add an API key to get started."}
        </p>
      </div>

      {/* Setup Progress — visible when setup is incomplete */}
      {!setupComplete && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold">Setup Progress</h2>
          <div className="flex flex-wrap gap-3">
            {setupChecks.map((check) => {
              const Icon = check.icon;
              return (
                <Link
                  key={check.label}
                  href={check.href}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    check.done
                      ? "border-success/30 bg-success/5 text-success"
                      : "border-warning/30 bg-warning/5 text-warning hover:border-warning/50"
                  }`}
                >
                  {check.done ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-[10px] text-white">
                      ✓
                    </span>
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {check.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Domain Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOMAIN_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className={`group rounded-xl border-l-4 bg-surface p-5 transition-colors hover:bg-surface-elevated ${card.accent}`}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated transition-colors group-hover:bg-primary/10">
                  <Icon className="h-4 w-4 text-muted transition-colors group-hover:text-primary-light" />
                </div>
                <div>
                  <h2 className="font-semibold">{card.title}</h2>
                  <span className="text-xs text-muted">
                    {card.itemCount} tool{card.itemCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
