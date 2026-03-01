import { RemoteSessionView } from "@/components/RemoteSessionView";

export const dynamic = "force-dynamic";

export default async function RemoteSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      <RemoteSessionView sessionId={id} />
    </div>
  );
}
