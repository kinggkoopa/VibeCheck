import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Meta<span className="text-primary-light">Vibe</span>Coder
        </h1>
        <p className="mb-2 text-lg text-muted">
          S+++ AI-powered vibe coding. Bring your own keys.
        </p>
        <p className="mb-8 text-sm text-muted">
          Prompt optimizer &middot; Multi-agent swarm &middot; Persistent memory
          &middot; Auto-iteration
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-border px-6 py-3 font-medium text-foreground transition-colors hover:bg-surface-elevated"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
