import { createServerSupabaseClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    href: "/optimizer",
    title: "Prompt Optimizer",
    description: "Transform vague prompts into precise, effective instructions.",
    icon: "⚡",
    color: "text-yellow-400",
  },
  {
    href: "/agents",
    title: "Agent Swarm",
    description: "Orchestrate multiple AI agents to plan, code, review, and test.",
    icon: "◎",
    color: "text-blue-400",
  },
  {
    href: "/critique",
    title: "Critique Dashboard",
    description: "Get detailed code reviews with actionable feedback.",
    icon: "△",
    color: "text-red-400",
  },
  {
    href: "/memory",
    title: "Persistent Memory",
    description: "Store and recall context across sessions with vector search.",
    icon: "◇",
    color: "text-green-400",
  },
] as const;

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted">
          Welcome back{user?.email ? `, ${user.email}` : ""}. Pick a tool to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {FEATURES.map((feature) => (
          <a
            key={feature.href}
            href={feature.href}
            className="group rounded-xl border border-border bg-surface p-6 transition-colors hover:border-primary/50 hover:bg-surface-elevated"
          >
            <span className={`text-2xl ${feature.color}`}>{feature.icon}</span>
            <h2 className="mt-3 text-lg font-semibold">{feature.title}</h2>
            <p className="mt-1 text-sm text-muted">{feature.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
