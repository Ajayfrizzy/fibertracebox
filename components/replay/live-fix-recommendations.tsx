import { ArrowDown, FlaskConical, Lightbulb, ShieldCheck } from "lucide-react";
import type { LiveFixRecommendation } from "@/lib/types/domain";

export function LiveFixRecommendations({ recommendations }: { recommendations: LiveFixRecommendation[] }) {
  if (!recommendations.length) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white p-6 text-sm text-gray-600">
        No verified recommendation is available for this unclassified live failure. Inspect the sanitized FNN error and node logs.
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mono text-xs font-semibold uppercase text-ckb">Live Replay-to-Fix</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">Recommended Fix Plan</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Generated from the observed FNN failure. These changes are suggested, not executed; Live Verification records the real dry-run result.
          </p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-panel text-ckb"><Lightbulb size={18} /></span>
      </div>

      <div className="mt-4 grid gap-3">
        {recommendations.map((item) => (
          <article key={item.id} className={`rounded-md border p-4 ${item.recommended ? "border-ckb bg-emerald-50" : "border-line bg-panel"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mono text-xs font-semibold uppercase text-gray-500">{item.strategy?.replaceAll("_", " ") ?? "operator action"}</p>
                <h3 className="mt-1 text-sm font-semibold text-ink">{item.title}</h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold uppercase text-amber-800">
                <FlaskConical size={13} /> Suggested
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-700">{item.verificationStep}</p>
            {item.recommended && <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ckb"><ShieldCheck size={13} /> Primary recommendation</p>}
          </article>
        ))}
      </div>

      <a href="#live-verification" className="mt-4 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm">
        <ArrowDown size={16} /> Verify a change with FNN
      </a>
    </section>
  );
}
