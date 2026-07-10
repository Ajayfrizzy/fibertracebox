import Link from "next/link";
import { Activity, AlertTriangle, Boxes, Clock3, Gauge, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TraceTable } from "@/components/traces/trace-table";
import { listTraces } from "@/lib/api/repository";
import { calculateStats } from "@/lib/core/stats";
import { ScenarioRunner } from "@/components/sandbox/scenario-runner";
import { LivePaymentRunner } from "@/components/fiber/live-payment-runner";
import { scenarios } from "@/lib/core/scenarios";
import { formatTraceAmount } from "@/lib/core/amount-format";
import { getDatabaseMode } from "@/lib/api/repository";
import { getFiberRpcStatus, getPaymentAdapter } from "@/lib/adapters";
import { probeFiberRpc } from "@/lib/adapters/fiber-rpc-adapter";
import { toPublicTrace } from "@/lib/api/public-trace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const traces = (await listTraces()).map(toPublicTrace);
  const stats = calculateStats(traces);
  const recentTraces = traces.slice(0, 6);
  const failedQueue = traces.filter((trace) => trace.status === "failed").slice(0, 4);
  const replayQueue = traces.filter((trace) => trace.mode === "sandbox" && (trace.status === "failed" || trace.status === "replayed")).slice(0, 4);
  const databaseMode = getDatabaseMode();
  const adapter = getPaymentAdapter();
  const fiberRpc = getFiberRpcStatus();
  const fiberRpcProbe = await probeFiberRpc();

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="min-w-0 rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-full flex-1 basis-full lg:basis-0">
              <p className="mono text-xs font-semibold uppercase text-ckb">Operations overview</p>
              <h1 className="mt-2 break-words text-2xl font-semibold text-ink sm:text-3xl">Fiber payment diagnostics</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Review current trace health, run deterministic failures, replay broken routes, and export evidence for operator handoff.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/sandbox"
                className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                <Play size={16} />
                Run Demo
              </Link>
              <Link
                href="/dashboard/replay"
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:border-ckb"
              >
                <RotateCcw size={16} />
                Replay Queue
              </Link>
            </div>
          </div>

          <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <StatusPanel label="Database" value={databaseMode} detail={databaseMode === "memory" ? "Local volatile store" : "Supabase enabled"} />
            <StatusPanel label="Adapter" value={adapter.getMode()} detail={fiberRpc.adapterReadyOnly ? "Fiber RPC adapter-ready" : "Active payment source"} />
            <StatusPanel
              label="Fiber RPC"
              value={fiberRpc.liveEnabled ? "live" : fiberRpc.adapterReadyOnly ? "adapter-ready" : "sandbox"}
              detail={fiberRpcProbe ? (fiberRpcProbe.ok ? "FNN reachable" : "FNN unreachable") : fiberRpc.requested ? "Configuration requested" : "Sandbox mode"}
            />
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="mono text-xs font-semibold uppercase text-gray-500">Failure queue</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">Needs attention</h2>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-red-50 text-red-700">
              <AlertTriangle size={20} />
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {failedQueue.length ? (
              failedQueue.map((trace) => (
                <Link
                  key={trace.id}
                  href={`/dashboard/traces/${trace.id}`}
                  className="block min-w-0 rounded-md border border-line bg-panel px-3 py-3 hover:border-ckb hover:bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="mono min-w-0 flex-1 truncate text-xs font-semibold text-ckb">{trace.id}</span>
                    <span className="text-xs font-semibold text-red-700">{trace.latencyMs}ms</span>
                  </div>
                  <p className="mt-1 break-words text-sm font-semibold text-ink">{trace.failureFingerprint?.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatTraceAmount(trace)} · {trace.senderNode} to {trace.receiverNode}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-gray-600">
                No failed traces in the queue.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total traces" value={stats.totalTraces} detail="Recorded attempts" icon={Activity} />
        <MetricCard label="Success" value={stats.successCount} detail="Settled payments" icon={ShieldCheck} />
        <MetricCard label="Failed" value={stats.failedCount} detail="Needs diagnosis" icon={AlertTriangle} />
        <MetricCard label="Avg latency" value={`${stats.averageLatency}ms`} detail="Across traces" icon={Clock3} />
        <MetricCard
          label="Top fingerprint"
          value={stats.mostCommonFailureFingerprint ? stats.mostCommonFailureFingerprint.replaceAll("_", " ") : "none"}
          detail="Most common failure"
          icon={Gauge}
          compactValue
        />
        <MetricCard label="Replay success" value={`${stats.replaySuccessRate}%`} detail="Replay scenarios" icon={RotateCcw} />
      </section>

      <section className="mt-6 grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-6">
          <LivePaymentRunner
            liveEnabled={fiberRpc.liveEnabled}
            allowLivePayments={fiberRpc.allowLivePayments}
            publicDryRunsEnabled={fiberRpc.publicDryRunsEnabled}
            probe={
              fiberRpcProbe
                ? {
                    ok: fiberRpcProbe.ok,
                    error: fiberRpcProbe.error,
                    pubkey: fiberRpcProbe.nodeInfo?.pubkey,
                    version: fiberRpcProbe.nodeInfo?.version,
                    nodeName: fiberRpcProbe.nodeInfo?.node_name,
                    channelCount: fiberRpcProbe.channelCount
                  }
                : undefined
            }
          />
          <ScenarioRunner scenarios={scenarios.slice(0, 4)} />
          <div className="min-w-0 rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-ink">Replay Queue</h2>
                <p className="text-sm text-gray-500">Failed and replayed traces available for comparison.</p>
              </div>
              <Link href="/dashboard/replay" className="text-sm font-semibold text-ckb hover:underline">
                Open lab
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {replayQueue.length ? (
                replayQueue.map((trace) => (
                  <Link
                    key={trace.id}
                    href={`/dashboard/replay?trace=${trace.id}`}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-panel px-3 py-2 text-sm hover:bg-white"
                  >
                    <span className="mono min-w-0 truncate font-semibold text-ckb">{trace.id}</span>
                    <span className="shrink-0 text-xs text-gray-500">{trace.status}</span>
                  </Link>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-line bg-panel p-3 text-sm text-gray-600">
                  Run a failure scenario to populate replay candidates.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-ink">Recent Traces</h2>
              <p className="text-sm text-gray-500">Latest sandbox and adapter-ready payment attempts.</p>
            </div>
            <Link href="/dashboard/traces" className="text-sm font-semibold text-ckb hover:underline">
              View all
            </Link>
          </div>
          <TraceTable traces={recentTraces} compact />
        </div>
      </section>
    </div>
  );
}

function StatusPanel({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 rounded-md bg-panel p-3">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mono mt-1 break-words text-sm font-semibold text-ink">{value}</p>
      <p className="mt-1 break-words text-xs text-gray-500">{detail}</p>
    </div>
  );
}
