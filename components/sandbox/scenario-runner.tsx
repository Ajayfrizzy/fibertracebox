"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Boxes, Loader2, Play } from "lucide-react";
import { apiHeaders } from "@/lib/api/client-auth";
import type { ScenarioName } from "@/lib/types/domain";

interface ScenarioRunnerProps {
  scenarios: Array<{
    name: ScenarioName;
    label: string;
    description: string;
  }>;
}

export function ScenarioRunner({ scenarios }: ScenarioRunnerProps) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runScenario(name: ScenarioName, replay = false) {
    setRunning(replay ? "full-demo" : name);
    setError(null);
    try {
      const response = await fetch("/api/scenarios/run", {
        method: "POST",
        headers: apiHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ scenario: name, replay })
      });
      const payload = (await response.json()) as { trace: { id: string } };
      if (!response.ok) {
        throw new Error(extractError(payload, "Scenario run failed"));
      }
      router.push(`/dashboard/traces/${payload.trace.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scenario run failed");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-panel text-ckb">
            <Boxes size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">Scenario Sandbox</h2>
            <p className="break-words text-sm text-gray-500">Run deterministic Fiber payment attempts without a live node.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => runScenario("route-capacity", true)}
          disabled={running !== null}
          className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-70"
        >
          {running === "full-demo" ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
          Run Full Demo
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          <div>
            <p className="font-semibold">Action failed</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.name}
            type="button"
            onClick={() => runScenario(scenario.name)}
            disabled={running !== null}
            className="min-w-0 rounded-lg border border-line bg-white p-4 text-left shadow-sm transition hover:border-ckb hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_44px] items-start gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold leading-snug text-ink">{scenario.label}</h3>
                <p className="mt-2 max-h-24 overflow-hidden break-words text-sm leading-6 text-gray-600">{scenario.description}</p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-panel text-ckb">
                {running === scenario.name ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
              </span>
            </div>
          </button>
        ))}
      </div>
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
