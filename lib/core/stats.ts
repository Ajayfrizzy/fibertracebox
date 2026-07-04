import type { FailureFingerprint, PaymentTrace, Stats } from "@/lib/types/domain";

export function calculateStats(traces: PaymentTrace[]): Stats {
  const totalTraces = traces.length;
  const successCount = traces.filter((trace) => trace.status === "success").length;
  const failedCount = traces.filter((trace) => trace.status === "failed").length;
  const averageLatency = totalTraces
    ? Math.round(traces.reduce((sum, trace) => sum + trace.latencyMs, 0) / totalTraces)
    : 0;
  const fingerprintCounts = traces.reduce<Record<string, number>>((counts, trace) => {
    if (trace.failureFingerprint) {
      counts[trace.failureFingerprint] = (counts[trace.failureFingerprint] ?? 0) + 1;
    }
    return counts;
  }, {});
  const mostCommonFailureFingerprint = Object.entries(fingerprintCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as
    | FailureFingerprint
    | undefined;
  const replayAttempts = traces.flatMap((trace) => trace.replayResults);
  const replaySuccessRate = replayAttempts.length
    ? Math.round((replayAttempts.filter((result) => result.result === "success").length / replayAttempts.length) * 100)
    : 0;

  return {
    totalTraces,
    successCount,
    failedCount,
    averageLatency,
    mostCommonFailureFingerprint: mostCommonFailureFingerprint ?? null,
    replaySuccessRate
  };
}
