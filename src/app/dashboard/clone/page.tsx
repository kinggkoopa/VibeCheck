import { CloneSetup } from "@/components/CloneSetup";

export const dynamic = "force-dynamic";

export default function ClonePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clone My Setup</h1>
        <p className="mt-1 text-sm text-muted">
          Export your entire MetaVibeCoder configuration for backup or to set up
          a new machine. Import a previous export to restore everything.
        </p>
      </div>

      <CloneSetup />
    </div>
  );
}
