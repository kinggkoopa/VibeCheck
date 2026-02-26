import { ResultsTuner } from "@/components/ResultsTuner";

export const dynamic = "force-dynamic";

export default function ResultsBoosterPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Results Booster</h1>
        <p className="mt-1 text-sm text-muted">
          Post-generation optimizer. Scores code quality, detects
          hallucinations, suggests improvements, and produces boosted output
          with higher reliability and security.
        </p>
      </div>

      <ResultsTuner />
    </div>
  );
}
