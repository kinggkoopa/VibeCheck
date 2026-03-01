import { ToolOrchestrator } from "@/components/ToolOrchestrator";
import { listTools } from "@/features/tools/actions";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const tools = await listTools();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tool Belt</h1>
        <p className="mt-1 text-sm text-muted">
          Export code to v0, Replit, CodeSandbox, StackBlitz, or GitHub Gist
          with one click. Auto-export sends to all tools simultaneously.
        </p>
      </div>

      <ToolOrchestrator tools={tools} />
    </div>
  );
}
