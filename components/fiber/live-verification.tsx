"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, KeyRound, Loader2, RadioTower } from "lucide-react";
import { apiHeaders, getStoredApiKey, storeApiKey } from "@/lib/api/client-auth";
import type { LiveVerificationResult, TraceEvent } from "@/lib/types/domain";

interface LiveVerificationProps {
  traceId: string;
  events: TraceEvent[];
}

export function LiveVerification({ traceId, events }: LiveVerificationProps) {
  const [mode, setMode] = useState<"invoice" | "pubkey">("invoice");
  const [invoice, setInvoice] = useState("");
  const [targetPubkey, setTargetPubkey] = useState("");
  const [amount, setAmount] = useState("");
  const [feeLimit, setFeeLimit] = useState("");
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LiveVerificationResult | null>(null);
  const prior = events.filter((event) => event.stage === "live_verification");

  async function verifyFix() {
    setRunning(true);
    setError(null);
    storeApiKey(apiKey);
    try {
      const body = mode === "invoice"
        ? {
            invoice: invoice.trim(),
            ...(amount ? { amount: Number(amount) } : {}),
            ...(feeLimit ? { feeLimit: Number(feeLimit) } : {})
          }
        : {
            targetPubkey: targetPubkey.trim(),
            keysend: true,
            amount: Number(amount),
            ...(feeLimit ? { feeLimit: Number(feeLimit) } : {})
          };
      const response = await fetch(`/api/traces/${traceId}/verify`, {
        method: "POST",
        headers: apiHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(body)
      });
      const payload = (await response.json().catch(() => ({}))) as LiveVerificationResult & { error?: string };
      if (!response.ok || !payload.verificationTrace?.id) throw new Error(payload.error ?? "Live verification failed");
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Live verification failed");
    } finally {
      setRunning(false);
    }
  }

  const missingTarget = mode === "invoice" ? !invoice.trim() : !targetPubkey.trim() || !amount.trim();

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-panel text-ckb"><RadioTower size={20} /></span>
        <div>
          <p className="mono text-xs font-semibold uppercase text-ckb">Live Verification</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">Verify the operator fix with FNN</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Apply the recommended change to your test nodes, then run a new dry-run. The result is linked to this failure as real RPC evidence.
          </p>
        </div>
      </div>

      <div className="mt-4 inline-grid grid-cols-2 rounded-md border border-line bg-panel p-1 text-sm font-semibold">
        {(["invoice", "pubkey"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setMode(value)} className={`rounded px-3 py-1.5 ${mode === value ? "bg-white text-ink shadow-sm" : "text-gray-600"}`}>
            {value === "invoice" ? "Fresh invoice" : "Target pubkey"}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3">
        {mode === "invoice" ? (
          <label className="grid gap-1 text-sm font-semibold text-ink">Fresh Fiber invoice
            <textarea value={invoice} onChange={(event) => setInvoice(event.target.value)} rows={3} className="resize-y rounded-md border border-line px-3 py-2 font-normal outline-none focus:border-ckb" />
          </label>
        ) : (
          <label className="grid gap-1 text-sm font-semibold text-ink">Target pubkey
            <textarea value={targetPubkey} onChange={(event) => setTargetPubkey(event.target.value)} rows={2} className="resize-y rounded-md border border-line px-3 py-2 font-normal outline-none focus:border-ckb" />
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-ink">{mode === "invoice" ? "Amount override (Shannon)" : "Amount (Shannon)"}
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" placeholder={mode === "invoice" ? "invoice default" : "required"} className="rounded-md border border-line px-3 py-2 font-normal outline-none focus:border-ckb" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-ink">Fee limit (Shannon)
            <input value={feeLimit} onChange={(event) => setFeeLimit(event.target.value)} inputMode="numeric" placeholder="optional" className="rounded-md border border-line px-3 py-2 font-normal outline-none focus:border-ckb" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-ink">API key
          <span className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" className="w-full rounded-md border border-line py-2 pl-9 pr-3 font-normal outline-none focus:border-ckb" />
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={verifyFix} disabled={running || missingTarget || !apiKey.trim()} className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {running ? <Loader2 className="animate-spin" size={16} /> : <RadioTower size={16} />} Verify Dry-Run
          </button>
          <span className="text-xs font-semibold text-gray-500">Dry-run is enforced by the server</span>
        </div>
      </div>

      {error && <div role="alert" className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={17} />{error}</div>}
      {result && <VerificationResult result={result} />}

      {prior.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-ink">Previous verification attempts</h3>
          <div className="mt-2 space-y-2">{prior.map((event) => <VerificationEvent key={event.id} event={event} />)}</div>
        </div>
      )}
    </section>
  );
}

function VerificationResult({ result }: { result: LiveVerificationResult }) {
  const verified = result.outcome === "verified";
  return <div className={`mt-4 rounded-md border p-4 ${verified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
    <div className="flex items-start gap-2">{verified ? <CheckCircle2 className="text-emerald-700" size={18} /> : <AlertCircle className="text-amber-700" size={18} />}
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold uppercase text-ink">{result.outcome.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-gray-700">{result.summary}</p>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded bg-white/70 p-2"><dt className="font-semibold uppercase text-gray-500">Before</dt><dd className="mono mt-1 break-words text-red-700">{result.originalFingerprint ?? "none"}</dd></div><div className="rounded bg-white/70 p-2"><dt className="font-semibold uppercase text-gray-500">Verification</dt><dd className="mono mt-1 break-words text-ckb">{result.verificationFingerprint ?? "no failure fingerprint"}</dd></div></dl>
        <Link href={`/dashboard/traces/${result.verificationTrace.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ckb"><ExternalLink size={14} /> Open verification trace</Link>
      </div>
    </div>
  </div>;
}

function VerificationEvent({ event }: { event: TraceEvent }) {
  const traceId = typeof event.metadata?.verificationTraceId === "string" ? event.metadata.verificationTraceId : undefined;
  const outcome = typeof event.metadata?.verificationOutcome === "string" ? event.metadata.verificationOutcome : "inconclusive";
  return <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-panel px-3 py-2 text-sm"><span><strong>{outcome.replaceAll("_", " ")}</strong>: {event.message}</span>{traceId && <Link href={`/dashboard/traces/${traceId}`} className="font-semibold text-ckb">Open trace</Link>}</div>;
}
