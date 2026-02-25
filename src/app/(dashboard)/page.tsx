import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const QUICK_ACTIONS = [
  {
    href: "/dashboard/settings",
    title: "Configure API Keys",
    description: "Add your Anthropic, OpenRouter, Groq, or OpenAI keys",
    accent: "border-primary/40",
  },
  {
    href: "/dashboard/optimizer",
    title: "Optimize a Prompt",
    description: "Transform vague prompts into precise, high-quality instructions",
    accent: "border-success/40",
  },
  {
    href: "/dashboard/agents",
    title: "Run Agent Swarm",
    description: "Multi-agent critique loop: plan, code, review, test, iterate",
    accent: "border-warning/40",
  },
  {
    href: "/dashboard/critique",
    title: "Code Critique",
    description: "Get a detailed security and quality review of any code snippet",
    accent: "border-danger/40",
  },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch key count to show setup status
  const { data: keys } = await supabase.rpc("list_user_keys");
  const keyCount = keys?.length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {keyCount > 0
            ? `${keyCount} API key${keyCount > 1 ? "s" : ""} configured. Ready to vibe.`
            : "Add an API key in Settings to get started."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {QUICK_ACTIONS.map(({ href, title, description, accent }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-xl border-l-4 bg-surface p-5 transition-colors hover:bg-surface-elevated",
              accent
            )}
          >
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
