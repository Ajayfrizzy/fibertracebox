import type { TraceEvent } from "@/lib/types/domain";
import { SeverityBadge } from "@/components/traces/status-badge";

export function Timeline({ events }: { events: TraceEvent[] }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Failure Timeline</h2>
          <p className="text-sm text-gray-500">Lifecycle events captured in milliseconds.</p>
        </div>
        <span className="mono rounded-md border border-line bg-panel px-2 py-1 text-xs text-gray-600">{events.length} events</span>
      </div>
      <ol className="space-y-4">
        {events.map((event) => (
          <li key={event.id} className="grid gap-3 border-l-2 border-line pl-4 sm:grid-cols-[88px_1fr]">
            <div className="mono text-sm font-semibold text-ckb">{event.timestampMs}ms</div>
            <div className="rounded-md border border-line bg-panel p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono text-xs font-semibold uppercase text-gray-700">{event.stage}</span>
                <SeverityBadge severity={event.severity} />
              </div>
              <p className="mt-2 text-sm text-gray-700">{event.message}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
