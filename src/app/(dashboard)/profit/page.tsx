import { ProfitAgentUI } from "@/components/ProfitAgentUI";

export const dynamic = "force-dynamic";

export default function ProfitPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profit Agent</h1>
        <p className="mt-1 text-sm text-muted">
          Multi-agent swarm for vibe-coding profitable micro-SaaS. Analyzes
          revenue models, finds market gaps and asymmetry hooks, checks legal
          risks, generates Stripe/Paddle boilerplate, and scores profit potential
          (1-10).
        </p>
      </div>

      <ProfitAgentUI />
    </div>
  );
}
