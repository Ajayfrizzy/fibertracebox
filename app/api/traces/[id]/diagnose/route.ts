import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { getTrace, saveDiagnosis } from "@/lib/api/repository";
import { jsonError, jsonOk, publicApiError } from "@/lib/api/http";
import { assertWriteAccess } from "@/lib/api/security";
import { parseTraceId } from "@/lib/api/validation";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertWriteAccess(request, "traces:diagnose");
    const traceId = parseTraceId(context.params.id);
    const trace = await getTrace(traceId);
    if (!trace) {
      throw publicApiError("Trace not found", 404);
    }

    const diagnosis = diagnoseTrace(trace);
    if (!diagnosis) {
      throw publicApiError("Trace has no failure fingerprint to diagnose", 422);
    }

    await saveDiagnosis(trace.id, diagnosis);
    return jsonOk(diagnosis);
  } catch (error) {
    return jsonError(error);
  }
}
