import { PolymarketViewer } from "@/components/PolymarketViewer";

export const dynamic = "force-dynamic";

export default function PolymarketPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Polymarket Maximizer</h1>
        <p className="mt-1 text-sm text-muted">
          Multi-agent Polymarket alpha scanner. Fuses probabilities from
          multiple sources, detects cross-platform arbitrage, generates
          profit machine ideas, and scores overall alpha potential across
          prediction markets.
        </p>
      </div>

      <PolymarketViewer />
    </div>
  );
}
