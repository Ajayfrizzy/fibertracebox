import { sandboxAdapter } from "@/lib/adapters/sandbox-adapter";
import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { recommendSmallestFix, runReplayToFix } from "@/lib/core/replay-engine";
import { saveDiagnosis, saveReplayResults, saveTrace } from "@/lib/api/repository";
import { jsonError, jsonOk } from "@/lib/api/http";
import { assertSandboxDemoAccess } from "@/lib/api/security";
import { parseScenarioRunInput } from "@/lib/api/validation";
import type { ScenarioRunResponse } from "@/lib/types/api";

export async function POST(request: Request) {
  try {
    assertSandboxDemoAccess(request);
    const { scenario, replay } = await parseScenarioRunInput(request);
    const trace = await sandboxAdapter.runPaymentAttempt({ scenario });
    await saveTrace(trace);

    const diagnosis = diagnoseTrace(trace);
    if (diagnosis) {
      await saveDiagnosis(trace.id, diagnosis);
    }

    const replayResults = replay ? runReplayToFix(trace) : [];
    if (replayResults.length) {
      await saveReplayResults(trace.id, replayResults);
    }

    const response: ScenarioRunResponse = {
      trace: replayResults.length
        ? {
            ...trace,
            status: trace.status === "failed" ? "replayed" : trace.status,
            replayResults
          }
        : trace,
      diagnosis,
      replayResults,
      recommended: recommendSmallestFix(replayResults)
    };

    return jsonOk(response, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
