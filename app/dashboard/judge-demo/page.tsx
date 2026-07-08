import Link from "next/link";
import { CheckCircle2, ExternalLink, FileText, FlaskConical, Play, RadioTower, Route } from "lucide-react";
import { ScenarioRunner } from "@/components/sandbox/scenario-runner";
import { listTraces } from "@/lib/api/repository";
import { scenarios } from "@/lib/core/scenarios";

export const dynamic = "force-dynamic";

const proofLinks = [
  { label: "Successful live proof", href: "/dashboard/docs", detail: "Use payment-testing/README.md in the repo" },
  { label: "Failure evidence corpus", href: "/dashboard/docs", detail: "Use failed-transactions/README.md in the repo" },
  { label: "Production notes", href: "/dashboard/docs", detail: "Sandbox/live boundary and safety model" }
];

const realFailureEvidence = [
  {
    title: "Route Capacity",
    fingerprint: "ROUTE_CAPACITY_INSUFFICIENT",
    message: "max outbound liquidity 40099999000 is insufficient, required amount: 160000000000",
    rawPath: "failed-transactions/route-capacity/send-payment-error.json",
    reportPath: "failed-transactions/route-capacity/fibertracebox-report.md"
  },
  {
    title: "Route Not Found",
    fingerprint: "ROUTE_NOT_FOUND",
    message: "PathFind error: no path found",
    rawPath: "failed-transactions/route-not-found/send-payment-unknown-target.json",
    reportPath: "failed-transactions/route-not-found/fibertracebox-report.md"
  },
  {
    title: "Fee Limit",
    fingerprint: "FEE_LIMIT_TOO_LOW",
    message: "max_fee_amount is too low for trampoline routing",
    rawPath: "failed-transactions/fee-limit-too-low/send-payment-low-fee-error.json",
    reportPath: "failed-transactions/fee-limit-too-low/fibertracebox-report.md"
  },
  {
    title: "Invoice Cancelled",
    fingerprint: "INVOICE_CANCELLED",
    message: "payment status Failed with failed_error InvoiceCancelled",
    rawPath: "failed-transactions/cancelled-invoice/get-payment-after-cancel.json",
    reportPath: "failed-transactions/cancelled-invoice/fibertracebox-report.md"
  },
  {
    title: "Invalid Amount",
    fingerprint: "PAYMENT_AMOUNT_INVALID",
    message: "failed to parse uint hex ... PosOverflow",
    rawPath: "failed-transactions/invalid-amount/send-payment-validation-error.json",
    reportPath: "failed-transactions/invalid-amount/fibertracebox-report.md"
  },
  {
    title: "Peer Route Unavailable",
    fingerprint: "PEER_OFFLINE_ROUTE_UNAVAILABLE",
    message: "node2 RPC unavailable, peers_count 0x0, max outbound liquidity 0",
    rawPath: "failed-transactions/peer-offline/send-payment-route-unavailable.json",
    reportPath: "failed-transactions/peer-offline/fibertracebox-report.md"
  }
];

export default async function JudgeDemoPage() {
  const traces = await listTraces();
  const latestReplay = traces.find((trace) => trace.status === "replayed" && trace.failureFingerprint === "ROUTE_CAPACITY_INSUFFICIENT");
  const latestLive = traces.find((trace) => trace.mode === "fiber-rpc");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <p className="mono text-xs font-semibold uppercase text-ckb">Judge Demo</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="max-w-3xl text-3xl font-semibold text-ink">Five-minute FiberTracebox walkthrough</h1>
            <p className="mt-3 max-w-3xl leading-7 text-gray-700">
              Show a failed Fiber-style payment, inspect the fingerprinted timeline, run Replay-to-Fix, export the operator
              report, then close with real FNN evidence from the live proof bundle.
            </p>
          </div>
          <Link href="/dashboard/sandbox" className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm">
            <Play size={16} />
            Start Demo
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DemoStep
          icon={<FlaskConical size={20} />}
          title="1. Trigger Failure"
          detail="Run route-capacity with replay enabled so the trace starts failed and ends with a recommendation."
        />
        <DemoStep icon={<Route size={20} />} title="2. Inspect Timeline" detail="Open the trace and show the failure stage and fingerprint." />
        <DemoStep
          icon={<CheckCircle2 size={20} />}
          title="3. Replay-to-Fix"
          detail="Show failed and successful replay strategies, then the smallest fix recommendation."
        />
        <DemoStep
          icon={<RadioTower size={20} />}
          title="4. Live Evidence"
          detail="Show FNN pubkeys, channel state, payment hash, and proof files for the real Fiber run."
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <ScenarioRunner scenarios={scenarios.filter((scenario) => scenario.name === "route-capacity")} />

          <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Current Demo Trace</h2>
            <p className="mt-1 text-sm text-gray-600">Use this after running the full demo action.</p>
            {latestReplay ? (
              <div className="mt-4 space-y-3">
                <p className="mono break-all rounded-md bg-panel p-3 text-xs font-semibold text-ckb">{latestReplay.id}</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/traces/${latestReplay.id}`}
                    className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm"
                  >
                    <ExternalLink size={16} />
                    Open Trace
                  </Link>
                  <Link
                    href={`/dashboard/replay?trace=${latestReplay.id}`}
                    className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm"
                  >
                    <Route size={16} />
                    Open Replay
                  </Link>
                  <a
                    href={`/api/traces/${latestReplay.id}/report?format=markdown`}
                    className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm"
                  >
                    <FileText size={16} />
                    Markdown Report
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-line bg-panel p-4 text-sm text-gray-600">
                No replayed route-capacity trace yet. Run the full demo above.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Live Fiber Proof Close</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              The hosted dashboard can stay sandbox-safe while the repo proves FNN integration with captured two-node evidence.
            </p>
            <div className="mt-4 grid gap-3">
              {proofLinks.map((link) => (
                <Link key={link.label} href={link.href} className="rounded-md border border-line bg-panel p-3 hover:border-ckb hover:bg-white">
                  <span className="block text-sm font-semibold text-ink">{link.label}</span>
                  <span className="mt-1 block text-xs text-gray-500">{link.detail}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Latest Live Trace</h2>
            {latestLive ? (
              <Link href={`/dashboard/traces/${latestLive.id}`} className="mt-3 block rounded-md bg-panel p-3 hover:bg-white">
                <span className="mono block break-all text-xs font-semibold text-ckb">{latestLive.id}</span>
                <span className="mt-2 block text-sm text-gray-700">
                  {latestLive.status} · {latestLive.failureFingerprint ?? "no failure fingerprint"}
                </span>
              </Link>
            ) : (
              <p className="mt-3 rounded-md border border-dashed border-line bg-panel p-4 text-sm text-gray-600">
                Run a live Fiber RPC dry-run or attach your new failed FNN evidence after local testing.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Real FNN Failure Evidence</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Raw JSON-RPC captures from live Fiber nodes, grouped by the fingerprint FiberTracebox should show in reports.
            </p>
          </div>
          <span className="mono rounded-md bg-panel px-3 py-2 text-xs font-semibold text-ckb">failed-transactions</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {realFailureEvidence.map((evidence) => (
            <div key={evidence.fingerprint} className="rounded-md border border-line bg-panel p-4">
              <p className="text-sm font-semibold text-ink">{evidence.title}</p>
              <p className="mono mt-1 break-words text-xs font-semibold text-ckb">{evidence.fingerprint}</p>
              <p className="mt-3 text-sm leading-6 text-gray-700">{evidence.message}</p>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <p className="break-words">Raw: {evidence.rawPath}</p>
                <p className="break-words">Report: {evidence.reportPath}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DemoStep({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-panel text-ckb">{icon}</span>
      <h2 className="mt-3 text-base font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">{detail}</p>
    </div>
  );
}
