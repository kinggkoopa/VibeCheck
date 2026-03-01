import { MathComprehensionGate } from "@/components/MathComprehensionGate";

export const dynamic = "force-dynamic";

export default function ComprehensionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comprehension Gate</h1>
        <p className="mt-1 text-sm text-muted">
          Mandatory pre-edit workflow. Explains every formula in natural
          language, audits implicit assumptions, generates edge case tests,
          recommends safe enhancements, and computes a Math Mastery Level
          (0-100). Blocks edits until comprehension is achieved.
        </p>
      </div>

      <MathComprehensionGate />
    </div>
  );
}
