import { OptimizerForm } from "@/features/optimizer/optimizer-form";

export default function OptimizerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prompt Optimizer</h1>
        <p className="mt-1 text-sm text-muted">
          Transform vague prompts into precise, high-performance instructions
          using your own LLM key.
        </p>
      </div>

      <OptimizerForm />
    </div>
  );
}
