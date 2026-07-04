import { runReplayToFix, recommendSmallestFix } from "@/lib/core/replay-engine";
import { getTrace, saveReplayResults } from "@/lib/api/repository";
import { jsonError, jsonOk, publicApiError } from "@/lib/api/http";
import { assertWriteAccess } from "@/lib/api/security";
import { parseTraceId } from "@/lib/api/validation";
import type { ReplayResponse } from "@/lib/types/api";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertWriteAccess(request, "traces:replay");
    const traceId = parseTraceId(context.params.id);
    const trace = await getTrace(traceId);
    if (!trace) {
      throw publicApiError("Trace not found", 404);
    }

    if (trace.status !== "failed" && trace.status !== "replayed") {
      throw publicApiError("Replay-to-Fix only runs for failed traces", 400);
    }

    const replayResults = runReplayToFix(trace);
    await saveReplayResults(trace.id, replayResults);
    const updatedTrace = {
      ...trace,
      status: trace.status === "failed" ? ("replayed" as const) : trace.status,
      replayResults
    };
    const response: ReplayResponse = {
      trace: updatedTrace,
      replayResults,
      recommended: recommendSmallestFix(replayResults)
    };

    return jsonOk(response);
  } catch (error) {
    return jsonError(error);
  }
}
