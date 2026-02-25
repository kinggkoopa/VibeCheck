import { createClient } from "@/lib/supabase/server";

export default async function MemoryPage() {
  const supabase = await createClient();

  const { data: memories } = await supabase
    .from("memories")
    .select("id, content, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Persistent Memory</h1>
        <p className="mt-1 text-sm text-muted">
          Your vector memory store. Memories are embedded and searchable via
          semantic similarity (pgvector).
        </p>
      </div>

      {!memories || memories.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">
            No memories stored yet. Memories are created automatically during
            agent swarm runs and can be added via the API.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <p className="text-sm">{m.content}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-muted">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
                {m.metadata && Object.keys(m.metadata).length > 0 && (
                  <span className="text-xs text-muted">
                    {JSON.stringify(m.metadata)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
