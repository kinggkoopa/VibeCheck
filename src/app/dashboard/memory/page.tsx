import { listRecentMemories } from "@/core/memory/vector";
import { MemoryVault } from "@/components/MemoryVault";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const memories = await listRecentMemories(50);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Memory Vault</h1>
        <p className="mt-1 text-sm text-muted">
          Your vector memory store. Add context, decisions, or patterns here.
          Memories are embedded server-side (pgvector) and auto-injected into
          prompts as relevant context.
        </p>
      </div>

      <MemoryVault initialMemories={memories} />
    </div>
  );
}
