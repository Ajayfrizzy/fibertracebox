import { CheckCircle2, GitCompareArrows, XCircle } from "lucide-react";
import type { ReplayResult } from "@/lib/types/domain";

export function ReplayResults({ results, title = "Replay-to-Fix Results" }: { results: ReplayResult[]; title?: string }) {
  if (!results.length) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white p-6 text-sm text-gray-600">
        Replay-to-Fix has not been run for this trace yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <span className="grid h-9 w-9 place-items-center rounded-md bg-panel text-ckb">
          <GitCompareArrows size={18} />
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {results.map((result) => (
          <div
            key={result.id}
            className={`rounded-md border p-4 ${
              result.recommended ? "border-ckb bg-emerald-50" : "border-line bg-panel"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mono text-xs font-semibold uppercase text-gray-500">{result.scenario}</p>
                <h3 className="mt-1 text-sm font-semibold text-ink">{result.changedCondition}</h3>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold uppercase ${
                  result.result === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {result.result === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {result.result}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-700">{result.explanation}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
              <span className="mono">{result.latencyMs}ms</span>
              {result.recommended && <span className="font-semibold text-ckb">Smallest-fix recommendation</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
