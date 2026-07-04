import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { DiagnosisCard } from "@/components/traces/diagnosis-card";
import { Timeline } from "@/components/traces/timeline";
import { StatusBadge } from "@/components/traces/status-badge";
import { LiveFiberEvidence } from "@/components/traces/live-fiber-evidence";
import { ReplayResults } from "@/components/replay/replay-results";
import { ReplayActionButton } from "@/components/replay/replay-actions";
import { ReportActions } from "@/components/reports/report-actions";
import { formatRawTraceAmount, formatTraceAmount } from "@/lib/core/amount-format";
import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { generateReport } from "@/lib/core/report-generator";
import { getDiagnosis, getTrace, saveDiagnosis } from "@/lib/api/repository";

interface TraceDetailPageProps {
  params: {
    id: string;
  };
}

export default async function TraceDetailPage({ params }: TraceDetailPageProps) {
  const trace = await getTrace(params.id);
  if (!trace) {
    notFound();
  }

  let diagnosis = trace.status === "success" ? undefined : await getDiagnosis(trace.id);
  if (!diagnosis && trace.status !== "success") {
    diagnosis = diagnoseTrace(trace);
    if (diagnosis) {
      await saveDiagnosis(trace.id, diagnosis);
    }
  }
  const report = generateReport(trace);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/dashboard/traces" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-ink">
          <ArrowLeft size={16} />
          Back to traces
        </Link>
        <div className="flex flex-wrap gap-2">
          <ReplayActionButton traceId={trace.id} />
          <a
            href={`/api/traces/${trace.id}/report?format=markdown`}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm"
          >
            <FileText size={16} />
            Export Report
          </a>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mono text-xs font-semibold uppercase text-gray-500">Trace ID</p>
              <h1 className="mono mt-1 break-all text-xl font-semibold text-ink">{trace.id}</h1>
            </div>
            <StatusBadge status={trace.status} />
          </div>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Amount", formatTraceAmount(trace), formatRawTraceAmount(trace)],
              ["Mode", trace.mode],
              ["Latency", `${trace.latencyMs}ms`],
              ["Failure stage", trace.failureStage ?? "not applicable"],
              ["Sender", trace.senderNode],
              ["Receiver", trace.receiverNode]
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-md bg-panel p-3">
                <dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt>
                <dd className="mt-1 break-words font-medium text-ink">{value}</dd>
                {detail && <dd className="mono mt-1 break-words text-xs text-gray-500">{detail}</dd>}
              </div>
            ))}
          </dl>
        </div>

        <DiagnosisCard diagnosis={diagnosis} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <Timeline events={trace.events} />
        <ReplayResults results={trace.replayResults} />
      </section>

      <div className="mt-6">
        <LiveFiberEvidence trace={trace} />
      </div>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Exportable Debug Report</h2>
            <p className="text-sm text-gray-500">Markdown and JSON report output for trace reviews and operator handoff.</p>
          </div>
          <ReportActions traceId={trace.id} markdown={report.markdown} />
        </div>
        <pre className="mono mt-4 max-h-[360px] overflow-auto rounded-md bg-ink p-4 text-xs leading-6 text-gray-100">
          {report.markdown}
        </pre>
      </section>

      <a
        href={`/api/traces/${trace.id}/report?format=json`}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ckb hover:underline"
      >
        <Download size={16} />
        Open JSON report
      </a>
    </div>
  );
}
