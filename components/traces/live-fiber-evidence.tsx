import { Activity, GitBranch, RadioTower } from "lucide-react";
import { extractLiveFiberEvidence, formatEvidenceAmount } from "@/lib/core/live-fiber-evidence";
import type { PaymentTrace } from "@/lib/types/domain";

export function LiveFiberEvidence({ trace }: { trace: PaymentTrace }) {
  const evidence = extractLiveFiberEvidence(trace);

  if (!evidence) {
    return null;
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono text-xs font-semibold uppercase text-ckb">Live Fiber Evidence</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">FNN-backed payment and channel proof</h2>
          <p className="mt-1 text-sm text-gray-500">Captured from Fiber Network Node RPC during this trace.</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-panel text-ckb">
          <RadioTower size={20} />
        </span>
      </div>

      <dl className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <EvidenceItem label="FNN pubkey" value={evidence.node?.pubkey ?? trace.senderNode} />
        <EvidenceItem label="FNN version" value={evidence.node?.version ?? "unknown"} />
        <EvidenceItem label="Payment hash" value={evidence.payment?.paymentHash ?? "not captured"} />
        <EvidenceItem label="FNN payment status" value={evidence.payment?.status ?? trace.status} />
        <EvidenceItem label="Invoice status" value={evidence.payment?.invoiceStatus ?? "not observed"} />
        <EvidenceItem label="Fee" value={formatEvidenceAmount(evidence.payment?.fee)} />
        <EvidenceItem label="Channel count" value={String(evidence.node?.channelCount ?? evidence.channels.length)} />
        <EvidenceItem label="Dry run" value={evidence.payment?.dryRun === undefined ? "unknown" : evidence.payment.dryRun ? "yes" : "no"} />
      </dl>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-panel text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Channel</th>
              <th className="px-3 py-2 font-semibold">State</th>
              <th className="px-3 py-2 font-semibold">Enabled</th>
              <th className="px-3 py-2 font-semibold">Local balance</th>
              <th className="px-3 py-2 font-semibold">Remote balance</th>
              <th className="px-3 py-2 font-semibold">Peer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {evidence.channels.length ? (
              evidence.channels.map((channel, index) => (
                <tr key={channel.channelId ?? index}>
                  <td className="mono max-w-[220px] truncate px-3 py-2 text-xs font-semibold text-ckb">{channel.channelId ?? "unknown"}</td>
                  <td className="px-3 py-2 text-gray-700">{channel.stateName ?? "unknown"}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {channel.enabled === undefined ? "unknown" : channel.enabled ? "true" : "false"}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{formatEvidenceAmount(channel.localBalance)}</td>
                  <td className="px-3 py-2 text-gray-700">{formatEvidenceAmount(channel.remoteBalance)}</td>
                  <td className="mono max-w-[220px] truncate px-3 py-2 text-xs text-gray-700">{channel.peerPubkey ?? "unknown"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-4 text-sm text-gray-500" colSpan={6}>
                  Channel snapshot was not captured for this trace.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {evidence.graph && (
        <div className="mt-4 rounded-md border border-line bg-panel p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <GitBranch size={16} />
            Graph snapshot
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {evidence.graph.available
              ? `Available${evidence.graph.nodeCount !== undefined ? `, ${evidence.graph.nodeCount} nodes` : ""}${
                  evidence.graph.channelCount !== undefined ? `, ${evidence.graph.channelCount} channels` : ""
                }.`
              : "Not available from this FNN RPC surface."}
          </p>
          {evidence.graph.errors?.length ? <p className="mono mt-2 text-xs text-gray-500">{evidence.graph.errors.join("; ")}</p> : null}
        </div>
      )}
    </section>
  );
}

function EvidenceItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-panel p-3">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
        <Activity size={13} />
        {label}
      </dt>
      <dd className="mono mt-1 break-words text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}
