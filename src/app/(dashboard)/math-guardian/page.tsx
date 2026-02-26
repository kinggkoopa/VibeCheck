import { MathAnalyzerReport } from "@/components/MathAnalyzerReport";

export const dynamic = "force-dynamic";

export default function MathGuardianPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Math Guardian</h1>
        <p className="mt-1 text-sm text-muted">
          Pre-modification analysis agent. Scans code for all math constructs
          (formulas, variables, dependencies), verifies correctness, maps alpha
          contributions, and produces a Respect Score (1-10) with edit
          recommendations. Blocks edits until the math system is understood.
        </p>
      </div>

      <MathAnalyzerReport />
    </div>
  );
}
