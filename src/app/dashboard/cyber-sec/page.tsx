import { CyberThreatUI } from "@/components/CyberThreatUI";

export const dynamic = "force-dynamic";

export default function CyberSecPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cyber Shield</h1>
        <p className="mt-1 text-sm text-muted">
          Multi-agent swarm for vibe-coding cybersecurity tools and hardened
          applications. Vulnerability scanning with Semgrep rules, MITRE
          ATT&amp;CK threat modeling, crypto validation, pentest planning, and
          compliance checking.
        </p>
      </div>

      <CyberThreatUI />
    </div>
  );
}
