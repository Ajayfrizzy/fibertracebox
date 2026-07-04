"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ReplayComparison } from "@/components/replay/replay-comparison";
import { RecommendationCard } from "@/components/replay/recommendation-card";
import { ReplayResults } from "@/components/replay/replay-results";
import { createReplayRecommendation, recommendSmallestFix } from "@/lib/core/replay-analysis";
import type { PaymentTrace } from "@/lib/types/domain";

interface ReplayLabClientProps {
  traceId: string;
  initialTrace: PaymentTrace;
}

export function ReplayLabClient({ traceId, initialTrace }: ReplayLabClientProps) {
  const [trace, setTrace] = useState(initialTrace);
  const [loading, setLoading] = useState(initialTrace.replayResults.length === 0);

  useEffect(() => {
    let cancelled = false;

    async function loadTrace() {
      try {
        const response = await fetch(`/api/traces/${traceId}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as { trace?: PaymentTrace };
        if (!cancelled && response.ok && payload.trace) {
          setTrace(payload.trace);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTrace();

    return () => {
      cancelled = true;
    };
  }, [traceId]);

  const smallestFix = recommendSmallestFix(trace.replayResults);
  const recommendation = createReplayRecommendation(trace, trace.replayResults);

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
          <Loader2 className="animate-spin text-ckb" size={15} />
          Loading replay evidence
        </div>
      )}
      <RecommendationCard recommendation={recommendation} />
      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <ReplayComparison trace={trace} result={smallestFix} />
        <ReplayResults results={trace.replayResults} title="Replay Evidence" />
      </section>
    </div>
  );
}
