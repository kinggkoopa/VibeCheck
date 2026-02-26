import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCyberSecSwarm } from "@/core/agents/cyber-sec-graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** POST /api/agents/cyber-sec — execute the Cyber Shield agent swarm */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { idea, focus, compliance_targets, max_iterations } = await request.json();

    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
      return NextResponse.json(
        { error: "Security tool idea is required (min 10 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(idea, MAX_SIZES.task, "Idea");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const validFocus = ["vuln-scan", "threat-model", "hardened-code", "pentest", "full-audit"] as const;
    const validCompliance = ["SOC2", "HIPAA", "PCI-DSS", "GDPR", "ISO27001"];

    const result = await runCyberSecSwarm(idea.trim(), {
      focus: validFocus.includes(focus) ? focus : undefined,
      complianceTargets: Array.isArray(compliance_targets)
        ? compliance_targets.filter((t: string) => validCompliance.includes(t))
        : undefined,
      maxIterations: Math.min(Math.max(max_iterations ?? 2, 1), 5),
    });

    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "cyber_sec",
        provider: result.provider,
        iterations: result.iterations,
        security_score: result.report.securityScore.overall,
        security_level: result.report.securityLevel,
      },
    });

    return NextResponse.json({
      data: {
        report: result.report,
        messages: result.messages,
        iterations: result.iterations,
        provider: result.provider,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
