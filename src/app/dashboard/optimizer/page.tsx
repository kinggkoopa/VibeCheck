import { PromptOptimizer } from "@/components/PromptOptimizer";
import { loadLibrary } from "@/features/optimizer/actions";

export const dynamic = "force-dynamic";

export default async function OptimizerPage() {
  const { entries } = await loadLibrary();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prompt Optimizer</h1>
        <p className="mt-1 text-sm text-muted">
          Transform a raw idea into a production-grade prompt. Uses your API key
          to call Opus 4.6 (or your configured provider). Save the best results
          to your prompt library.
        </p>
      </div>

      <PromptOptimizer initialLibrary={entries} />
    </div>
  );
}
