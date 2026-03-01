import { AlphaImpactViz } from "@/components/AlphaImpactViz";

export const dynamic = "force-dynamic";

export default function AlphaSimPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alpha Simulator</h1>
        <p className="mt-1 text-sm text-muted">
          Simulates and safeguards algorithms during edits. Maps system
          dependencies, forecasts alpha degradation from proposed changes,
          proposes minimal safe tweaks, creates restore points, and issues a
          Preservation Guarantee verdict.
        </p>
      </div>

      <AlphaImpactViz />
    </div>
  );
}
