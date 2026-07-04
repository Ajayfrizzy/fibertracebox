import { BadgeCheck, ShieldCheck } from "lucide-react";
import type { ReplayRecommendation } from "@/lib/types/domain";

export function RecommendationCard({ recommendation }: { recommendation?: ReplayRecommendation }) {
  if (!recommendation) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white p-5 text-sm text-gray-600">
        Run Replay-to-Fix to generate a smallest-fix recommendation.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ckb bg-emerald-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-ckb">
          <BadgeCheck size={20} />
        </span>
        <div>
          <p className="mono text-xs font-semibold uppercase text-ckb">Recommended fix</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{recommendation.title}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-700">{recommendation.summary}</p>
        </div>
      </div>
      <div className="mt-4 rounded-md bg-white p-4">
        <p className="text-sm font-semibold text-ink">{recommendation.primaryAction}</p>
        {recommendation.operatorAction && <p className="mt-2 text-sm text-gray-700">{recommendation.operatorAction}</p>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-2 py-1 font-semibold text-emerald-700">
          <ShieldCheck size={15} />
          Confidence: {recommendation.confidence}
        </span>
        {recommendation.primaryResult && (
          <span className="mono rounded-md border border-line bg-white px-2 py-1 text-xs text-gray-600">
            {recommendation.primaryResult.scenario}
          </span>
        )}
      </div>
    </div>
  );
}
