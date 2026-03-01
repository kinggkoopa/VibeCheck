import { KalshiDashboard } from "@/components/KalshiDashboard";

export const dynamic = "force-dynamic";

export default function KalshiPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kalshi Alpha</h1>
        <p className="mt-1 text-sm text-muted">
          Multi-agent Kalshi prediction market edge detector. Fetches live
          markets, analyzes mispricings with probability models, detects
          cross-platform arbitrage, generates profit tool ideas, and scores
          overall edge potential.
        </p>
      </div>

      <KalshiDashboard />
    </div>
  );
}
