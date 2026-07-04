"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, FlaskConical, Loader2, Send } from "lucide-react";
import { apiHeaders } from "@/lib/api/client-auth";

interface LivePaymentRunnerProps {
  liveEnabled: boolean;
  allowLivePayments: boolean;
  probe?: {
    ok: boolean;
    error?: string;
    pubkey?: string;
    version?: string;
    nodeName?: string;
    channelCount?: number;
  };
}

export function LivePaymentRunner({ liveEnabled, allowLivePayments, probe }: LivePaymentRunnerProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState("");
  const [amount, setAmount] = useState("");
  const [feeLimit, setFeeLimit] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runLivePayment() {
    setRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/traces", {
        method: "POST",
        headers: apiHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({
          invoice: invoice.trim(),
          ...(amount ? { amount: Number(amount) } : {}),
          ...(feeLimit ? { feeLimit: Number(feeLimit) } : {}),
          dryRun: !allowLivePayments || dryRun
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { trace?: { id: string }; error?: string };

      if (!response.ok || !payload.trace?.id) {
        throw new Error(payload.error ?? "Live Fiber payment failed");
      }

      router.push(`/dashboard/traces/${payload.trace.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Live Fiber payment failed");
    } finally {
      setRunning(false);
    }
  }

  const disabled = !liveEnabled || running || !invoice.trim();
  const statusText = !liveEnabled
    ? "Fiber RPC live mode is disabled"
    : probe?.ok
      ? `FNN connected${probe.channelCount === undefined ? "" : `, ${probe.channelCount} channels`}`
      : probe?.error ?? "FNN probe unavailable";

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mono text-xs font-semibold uppercase text-ckb">Live Fiber RPC</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">Run a real node payment check</h2>
          <p className="mt-1 text-sm text-gray-500">{statusText}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-panel text-ckb">
          {dryRun || !allowLivePayments ? <FlaskConical size={19} /> : <Send size={19} />}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-semibold text-ink">
          Invoice
          <textarea
            value={invoice}
            onChange={(event) => setInvoice(event.target.value)}
            rows={3}
            placeholder="Paste a Fiber invoice address"
            className="min-h-24 resize-y rounded-md border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none focus:border-ckb"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-ink">
            Amount override
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="invoice default"
              className="rounded-md border border-line px-3 py-2 text-sm font-normal outline-none focus:border-ckb"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-ink">
            Fee limit
            <input
              value={feeLimit}
              onChange={(event) => setFeeLimit(event.target.value)}
              inputMode="decimal"
              placeholder="optional"
              className="rounded-md border border-line px-3 py-2 text-sm font-normal outline-none focus:border-ckb"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={!allowLivePayments || dryRun}
            disabled={!allowLivePayments}
            onChange={(event) => setDryRun(event.target.checked)}
            className="h-4 w-4 accent-ckb"
          />
          Dry-run only
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runLivePayment}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? <Loader2 className="animate-spin" size={16} /> : dryRun || !allowLivePayments ? <FlaskConical size={16} /> : <Send size={16} />}
            {dryRun || !allowLivePayments ? "Run Dry-Run" : "Send Payment"}
          </button>
          {probe?.pubkey && <span className="mono max-w-full truncate text-xs text-gray-500">{probe.pubkey}</span>}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          <div>
            <p className="font-semibold">Action failed</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
