import { Route } from "lucide-react";
import { TraceTable } from "@/components/traces/trace-table";
import { listTraces } from "@/lib/api/repository";
import { toPublicTrace } from "@/lib/api/public-trace";

export const dynamic = "force-dynamic";

export default async function TracesPage() {
  const traces = (await listTraces()).map(toPublicTrace);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-md bg-white text-ckb shadow-sm">
          <Route size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Payment Traces</h1>
          <p className="text-sm text-gray-500">Trace table with status, amount, fingerprint, latency, and creation time.</p>
        </div>
      </div>
      <TraceTable traces={traces} />
    </div>
  );
}
