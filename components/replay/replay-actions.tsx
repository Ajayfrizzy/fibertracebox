"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, FlaskConical, Loader2 } from "lucide-react";
import { apiHeaders } from "@/lib/api/client-auth";

export function ReplayActionButton({ traceId }: { traceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runReplay() {
    setLoading(true);
    setCompleted(false);
    setError(null);
    try {
      const response = await fetch(`/api/traces/${traceId}/replay`, { method: "POST", headers: apiHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractError(payload, "Replay failed"));
      }
      setCompleted(true);
      router.refresh();
      router.push(`/dashboard/replay?trace=${encodeURIComponent(traceId)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Replay failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-full">
      <button
        type="button"
        onClick={runReplay}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-ckb px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? <Loader2 className="animate-spin" size={16} /> : <FlaskConical size={16} />}
        {loading && completed ? "Opening Replay" : error ? "Retry Replay" : "Replay in Lab"}
      </button>
      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 shrink-0" size={15} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function extractError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}
