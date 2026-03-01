import { RemoteControl } from "@/components/RemoteControl";

export const dynamic = "force-dynamic";

export default function RemotePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Remote Control</h1>
        <p className="mt-1 text-sm text-muted">
          Start a task on your laptop, continue on your phone. Generate a QR code or
          share URL to hand off sessions between devices.
        </p>
      </div>
      <RemoteControl />
    </div>
  );
}
