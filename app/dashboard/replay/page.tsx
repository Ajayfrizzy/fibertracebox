import Link from "next/link";
import { AlertTriangle, Clock3, FileJson, FileText, Fingerprint, FlaskConical, Route } from "lucide-react";
import { ReplayActionButton } from "@/components/replay/replay-actions";
import { ReplayLabClient } from "@/components/replay/replay-lab-client";
import { ReportActions } from "@/components/reports/report-actions";
import { Timeline } from "@/components/traces/timeline";
import { StatusBadge } from "@/components/traces/status-badge";
import { formatTraceAmount } from "@/lib/core/amount-format";
import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { generateReport } from "@/lib/core/report-generator";
import { listReplayStrategiesForTrace, recommendSmallestFix } from "@/lib/core/replay-engine";
import { getDiagnosis, getTrace, listTraces, saveDiagnosis } from "@/lib/api/repository";

export const dynamic = "force-dynamic";

interface ReplayLabPageProps {
  searchParams?: Promise<{
    trace?: string;
  }>;
}

export default async function ReplayLabPage({ searchParams }: ReplayLabPageProps) {
  const query = await searchParams;
  const traces = await listTraces();
  const failedOrReplayed = traces.filter(
    (trace) => trace.mode === "sandbox" && (trace.status === "failed" || trace.status === "replayed")
  );
  const requested = query?.trace ? await getTrace(query.trace) : null;
  const requestedTrace = requested?.mode === "sandbox" ? requested : null;
  const selected =
    requestedTrace ?? failedOrReplayed.find((trace) => trace.status === "replayed") ?? failedOrReplayed[0];

  if (!selected) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-white text-ckb shadow-sm">
            <FlaskConical size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-ink">Replay Lab</h1>
            <p className="text-sm text-gray-500">Original vs replay comparison and smallest-fix recommendation.</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
          <h2 className="font-semibold text-ink">No failed trace available</h2>
          <p className="mt-2 text-sm text-gray-600">Run the route capacity sandbox scenario to create a replayable failure.</p>
          <Link
            href="/dashboard/sandbox"
            className="mt-4 inline-flex items-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Open Sandbox
          </Link>
        </div>
      </div>
    );
  }

  let diagnosis = await getDiagnosis(selected.id);
  if (!diagnosis) {
    diagnosis = diagnoseTrace(selected);
    if (diagnosis) {
      await saveDiagnosis(selected.id, diagnosis);
    }
  }

  const smallestFix = recommendSmallestFix(selected.replayResults);
  const report = generateReport(selected);
  const failureEvent = selected.events.find((event) => event.severity === "error") ?? selected.events.at(-1);
  const generatedScenarios = listReplayStrategiesForTrace(selected);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-white text-ckb shadow-sm">
            <FlaskConical size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-ink">Replay Lab</h1>
            <p className="text-sm text-gray-500">Failure replay, route comparison, and smallest-fix evidence.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReplayActionButton traceId={selected.id} />
          <ReportActions traceId={selected.id} markdown={report.markdown} />
        </div>
      </div>

      <section className="mb-6 rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mono text-xs font-semibold uppercase text-gray-500">Selected trace</p>
            <p className="mono mt-1 break-all text-sm font-semibold text-ink">{selected.id}</p>
          </div>
          <Link
            href={`/dashboard/traces/${selected.id}`}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm hover:border-ckb"
          >
            Open Trace Detail
          </Link>
        </div>
        {failedOrReplayed.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {failedOrReplayed.map((trace) => (
              <Link
                key={trace.id}
                href={`/dashboard/replay?trace=${trace.id}`}
                aria-current={trace.id === selected.id ? "page" : undefined}
                className={`shrink-0 rounded-md border px-3 py-2 text-left text-xs shadow-sm ${
                  trace.id === selected.id ? "border-ckb bg-emerald-50 text-ink" : "border-line bg-panel text-gray-700 hover:border-ckb"
                }`}
              >
                <span className="mono block font-semibold">{trace.id.slice(0, 18)}</span>
                <span className="mt-1 block">
                  {trace.status} · {trace.failureFingerprint ?? "no fingerprint"} · {trace.latencyMs}ms
                </span>
              </Link>
            ))}
          </div>
        )}
        {selected.status !== "failed" && selected.status !== "replayed" && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Replay-to-Fix only runs for failed traces. This trace is currently {selected.status}.
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mono text-xs font-semibold uppercase text-gray-500">Original failed payment</p>
              <h2 className="mono mt-2 break-all text-lg font-semibold text-ink">{selected.id}</h2>
            </div>
            <StatusBadge status={selected.status} />
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryItem label="Amount" value={formatTraceAmount(selected)} />
            <SummaryItem label="Failure time" value={`${selected.latencyMs}ms`} />
            <SummaryItem label="Sender" value={selected.senderNode} />
            <SummaryItem label="Receiver" value={selected.receiverNode} />
          </dl>
        </div>

        <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-red-50 text-red-700">
              <Fingerprint size={20} />
            </span>
            <div>
              <p className="mono text-xs font-semibold uppercase text-signal">{selected.failureFingerprint}</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">{diagnosis?.title ?? "Failure fingerprint"}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700">{diagnosis?.explanation}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-line bg-panel px-2 py-1 text-xs font-semibold text-gray-700">
                <AlertTriangle size={14} />
                Failed at {failureEvent?.stage} after {failureEvent?.timestampMs}ms
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Timeline events={selected.events} />
        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Generated Replay Scenarios</h2>
                <p className="text-sm text-gray-500">Selected from the failure fingerprint, not manually scripted in the UI.</p>
              </div>
              <Route className="text-ckb" size={20} />
            </div>
            <div className="mt-4 grid gap-2">
              {generatedScenarios.map((scenario) => (
                <div key={scenario} className="flex items-center justify-between gap-4 rounded-md bg-panel px-3 py-2">
                  <span className="mono text-xs font-semibold uppercase text-gray-700">{scenario}</span>
                  <span className="text-xs text-gray-500">auto</span>
                </div>
              ))}
            </div>
          </div>
          <ReplayLabClient traceId={selected.id} initialTrace={selected} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Report Export</h2>
            <p className="text-sm text-gray-500">Export the failure timeline, replay evidence, recommendation, and mode disclosure.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/traces/${selected.id}/report?format=markdown`}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm"
            >
              <FileText size={16} />
              Markdown
            </a>
            <a
              href={`/api/traces/${selected.id}/report?format=json`}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm"
            >
              <FileJson size={16} />
              JSON
            </a>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SummaryItem label="Original" value="Failed" icon={<AlertTriangle size={16} />} />
          <SummaryItem
            label="Replay"
            value={smallestFix ? "Success" : selected.replayResults.length ? "No successful fix" : "Pending"}
            icon={<Clock3 size={16} />}
          />
          <SummaryItem label="Confidence" value={diagnosis?.confidence ?? "pending"} />
        </div>
      </section>
    </div>
  );
}

function SummaryItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md bg-panel p-3">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-ink">{value}</dd>
    </div>
  );
}
