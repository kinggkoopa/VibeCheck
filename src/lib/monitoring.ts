import "server-only";

/**
 * AI Latency Tracking — Lightweight performance monitoring.
 *
 * Tracks LLM call durations, logs slow calls, and provides
 * aggregate stats for the analytics dashboard.
 */

interface LatencyRecord {
  provider: string;
  action: string;
  durationMs: number;
  model?: string;
  timestamp: number;
}

// In-memory ring buffer for recent latency records (last 100)
const latencyBuffer: LatencyRecord[] = [];
const MAX_BUFFER = 100;

/** Record an LLM call's latency. */
export function recordLatency(record: Omit<LatencyRecord, "timestamp">): void {
  if (latencyBuffer.length >= MAX_BUFFER) {
    latencyBuffer.shift();
  }
  latencyBuffer.push({ ...record, timestamp: Date.now() });

  // Log slow calls (> 10s)
  if (record.durationMs > 10_000) {
    console.warn(
      `[monitoring] Slow LLM call: ${record.provider}/${record.action} took ${record.durationMs}ms`
    );
  }
}

/** Measure an async operation and record its latency. */
export async function withLatencyTracking<T>(
  provider: string,
  action: string,
  fn: () => Promise<T>,
  model?: string
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    recordLatency({
      provider,
      action,
      durationMs: Math.round(performance.now() - start),
      model,
    });
    return result;
  } catch (err) {
    recordLatency({
      provider,
      action,
      durationMs: Math.round(performance.now() - start),
      model,
    });
    throw err;
  }
}

/** Get aggregate latency stats. */
export function getLatencyStats(): {
  totalCalls: number;
  avgMs: number;
  p95Ms: number;
  slowCalls: number;
  byProvider: Record<string, { count: number; avgMs: number }>;
  byAction: Record<string, { count: number; avgMs: number }>;
} {
  if (latencyBuffer.length === 0) {
    return {
      totalCalls: 0,
      avgMs: 0,
      p95Ms: 0,
      slowCalls: 0,
      byProvider: {},
      byAction: {},
    };
  }

  const durations = latencyBuffer.map((r) => r.durationMs).sort((a, b) => a - b);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p95Idx = Math.floor(durations.length * 0.95);

  const byProvider: Record<string, { count: number; totalMs: number }> = {};
  const byAction: Record<string, { count: number; totalMs: number }> = {};

  for (const record of latencyBuffer) {
    // Provider stats
    if (!byProvider[record.provider]) {
      byProvider[record.provider] = { count: 0, totalMs: 0 };
    }
    byProvider[record.provider].count++;
    byProvider[record.provider].totalMs += record.durationMs;

    // Action stats
    if (!byAction[record.action]) {
      byAction[record.action] = { count: 0, totalMs: 0 };
    }
    byAction[record.action].count++;
    byAction[record.action].totalMs += record.durationMs;
  }

  const formatGroup = (group: Record<string, { count: number; totalMs: number }>) =>
    Object.fromEntries(
      Object.entries(group).map(([k, v]) => [
        k,
        { count: v.count, avgMs: Math.round(v.totalMs / v.count) },
      ])
    );

  return {
    totalCalls: latencyBuffer.length,
    avgMs: Math.round(avg),
    p95Ms: durations[p95Idx] ?? 0,
    slowCalls: durations.filter((d) => d > 10_000).length,
    byProvider: formatGroup(byProvider),
    byAction: formatGroup(byAction),
  };
}
