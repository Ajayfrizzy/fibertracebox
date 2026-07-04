import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { formatTraceAmount } from "@/lib/core/amount-format";
import type { PaymentTrace, ReplayResult } from "@/lib/types/domain";

interface ReplayComparisonProps {
  trace: PaymentTrace;
  result?: ReplayResult;
}

export function ReplayComparison({ trace, result }: ReplayComparisonProps) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Original vs Replay</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-red-800">Original</p>
            <span className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold uppercase text-red-700">
              <XCircle size={14} />
              Failed
            </span>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-red-700">Amount</dt>
              <dd className="font-semibold text-red-950">{formatTraceAmount(trace)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-red-700">Latency</dt>
              <dd className="font-semibold text-red-950">{trace.latencyMs}ms</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-red-700">Failed at</dt>
              <dd className="mono text-right text-xs font-semibold text-red-950">{trace.failureStage}</dd>
            </div>
          </dl>
        </div>

        <div className="hidden items-center text-gray-400 md:flex">
          <ArrowRight size={22} />
        </div>

        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-emerald-800">Replay</p>
            <span className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold uppercase text-emerald-700">
              <CheckCircle2 size={14} />
              {result?.result ?? "Pending"}
            </span>
          </div>
          {result ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-emerald-700">What changed</dt>
                <dd className="mt-1 font-semibold text-emerald-950">{result.changedCondition}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-emerald-700">Latency</dt>
                <dd className="font-semibold text-emerald-950">{result.latencyMs}ms</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-emerald-800">Run Replay-to-Fix to generate comparison evidence.</p>
          )}
        </div>
      </div>
    </div>
  );
}
