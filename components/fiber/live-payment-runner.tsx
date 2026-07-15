"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, FlaskConical, KeyRound, LockKeyhole, Loader2, Send, ShieldCheck } from "lucide-react";
import { apiHeaders, getStoredApiKey, storeApiKey } from "@/lib/api/client-auth";

interface LivePaymentRunnerProps {
  liveEnabled: boolean;
  allowLivePayments: boolean;
  publicDryRunsEnabled: boolean;
  probe?: {
    ok: boolean;
    error?: string;
    pubkey?: string;
    version?: string;
    nodeName?: string;
    channelCount?: number;
  };
}

export function LivePaymentRunner({ liveEnabled, allowLivePayments, publicDryRunsEnabled, probe }: LivePaymentRunnerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"invoice" | "pubkey">("invoice");
  const [invoice, setInvoice] = useState("");
  const [targetPubkey, setTargetPubkey] = useState("");
  const [amount, setAmount] = useState("");
  const [feeLimit, setFeeLimit] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [operatorAccess, setOperatorAccess] = useState(() => Boolean(getStoredApiKey()));
  const [showOperatorUnlock, setShowOperatorUnlock] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runLivePayment() {
    const publicSession = publicDryRunsEnabled && !operatorAccess;
    const effectiveDryRun = publicSession || !allowLivePayments || dryRun;
    if (!effectiveDryRun && !window.confirm("This live Fiber request can move funds. Continue with the authenticated live send?")) {
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const body =
        mode === "invoice"
          ? {
              invoice: invoice.trim(),
              ...(amount ? { amount: Number(amount) } : {}),
              ...(feeLimit ? { feeLimit: Number(feeLimit) } : {}),
              dryRun: effectiveDryRun
            }
          : {
              targetPubkey: targetPubkey.trim(),
              keysend: true,
              amount: Number(amount),
              ...(feeLimit ? { feeLimit: Number(feeLimit) } : {}),
              dryRun: effectiveDryRun
            };

      const response = await fetch("/api/traces", {
        method: "POST",
        headers: apiHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(body)
      });
      const payload = (await response.json().catch(() => ({}))) as { trace?: { id: string }; error?: string };

      if (!response.ok || !payload.trace?.id) {
        if (response.status === 401) {
          storeApiKey("");
          setOperatorAccess(false);
          setShowOperatorUnlock(true);
        }
        throw new Error(response.status === 401 ? "Invalid or missing FiberTracebox API key" : payload.error ?? "Live Fiber payment failed");
      }

      router.push(`/dashboard/traces/${payload.trace.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Live Fiber payment failed");
    } finally {
      setRunning(false);
    }
  }

  const rpcUnavailable = liveEnabled && probe?.ok === false;
  const publicSession = publicDryRunsEnabled && !operatorAccess;
  const effectiveDryRun = publicSession || !allowLivePayments || dryRun;
  const missingInput = mode === "invoice" ? !invoice.trim() : !targetPubkey.trim() || !amount.trim();
  const disabled = !liveEnabled || rpcUnavailable || running || missingInput || (!publicSession && !operatorAccess);
  const statusText = !liveEnabled
    ? "Fiber RPC live mode is disabled"
    : probe?.ok
      ? `FNN connected${probe.channelCount === undefined ? "" : `, ${probe.channelCount} channels`}`
      : "Live Fiber RPC is unavailable";

  return (
    <div className="min-w-0 rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mono text-xs font-semibold uppercase text-ckb">Live Fiber RPC</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">Run a real node payment check</h2>
          <p className="mt-1 break-words text-sm text-gray-500">{statusText}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-panel text-ckb">
          {effectiveDryRun ? <FlaskConical size={19} /> : <Send size={19} />}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <div className="inline-grid w-fit grid-cols-2 rounded-md border border-line bg-panel p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("invoice");
              setError(null);
            }}
            className={`rounded px-3 py-1.5 ${mode === "invoice" ? "bg-white text-ink shadow-sm" : "text-gray-600"}`}
          >
            Invoice
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("pubkey");
              setError(null);
            }}
            className={`rounded px-3 py-1.5 ${mode === "pubkey" ? "bg-white text-ink shadow-sm" : "text-gray-600"}`}
          >
            Pubkey
          </button>
        </div>

        {mode === "invoice" ? (
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
        ) : (
          <label className="grid gap-1 text-sm font-semibold text-ink">
            Target pubkey
            <textarea
              value={targetPubkey}
              onChange={(event) => setTargetPubkey(event.target.value)}
              rows={3}
              placeholder="Paste receiver compressed pubkey"
              className="min-h-24 resize-y rounded-md border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none focus:border-ckb"
            />
          </label>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-ink">
            {mode === "invoice" ? "Amount override" : "Amount"}
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder={mode === "invoice" ? "invoice default" : "required"}
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
            checked={effectiveDryRun}
            disabled={publicSession || !allowLivePayments}
            onChange={(event) => setDryRun(event.target.checked)}
            className="h-4 w-4 accent-ckb"
          />
          Dry-run only
        </label>

        {operatorAccess ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span className="inline-flex items-center gap-2 font-semibold"><ShieldCheck size={16} /> Operator access active</span>
            <button type="button" onClick={() => { storeApiKey(""); setApiKey(""); setOperatorAccess(false); setShowOperatorUnlock(false); setDryRun(true); }} className="inline-flex items-center gap-1 font-semibold text-emerald-900 hover:underline">
              <LockKeyhole size={14} /> Lock
            </button>
          </div>
        ) : showOperatorUnlock || !publicDryRunsEnabled ? (
          <div className="grid gap-2 rounded-md border border-line bg-panel p-3">
            <label className="grid gap-1 text-sm font-semibold text-ink">Operator API key
              <span className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="new-password" spellCheck={false} placeholder="Stored only for this browser session" className="w-full rounded-md border border-line bg-white py-2 pl-9 pr-3 text-sm font-normal outline-none focus:border-ckb" />
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!apiKey.trim()} onClick={() => { storeApiKey(apiKey); setApiKey(""); setOperatorAccess(true); setShowOperatorUnlock(false); setError(null); }} className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><KeyRound size={15} /> Unlock Operator Mode</button>
              {publicDryRunsEnabled && <button type="button" onClick={() => { setApiKey(""); setShowOperatorUnlock(false); }} className="px-3 py-2 text-sm font-semibold text-gray-600">Cancel</button>}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span>Public dry-run mode is enabled. Responses contain sanitized FNN evidence.</span>
            <button type="button" onClick={() => setShowOperatorUnlock(true)} className="inline-flex items-center gap-1 font-semibold text-emerald-900 hover:underline"><KeyRound size={14} /> Operator Access</button>
          </div>
        )}

        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runLivePayment}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? <Loader2 className="animate-spin" size={16} /> : effectiveDryRun ? <FlaskConical size={16} /> : <Send size={16} />}
            {effectiveDryRun ? "Run Dry-Run" : mode === "invoice" ? "Send Payment" : "Send Keysend"}
          </button>
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
