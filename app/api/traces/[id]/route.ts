import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { getDiagnosis, getTrace } from "@/lib/api/repository";
import { jsonError, jsonOk, publicApiError } from "@/lib/api/http";
import { parseTraceId } from "@/lib/api/validation";
import type { TraceDetailResponse } from "@/lib/types/api";
import { hasApiKeyAccess } from "@/lib/api/security";
import { toPublicTrace } from "@/lib/api/public-trace";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const traceId = parseTraceId(id);
    const trace = await getTrace(traceId);
    if (!trace) {
      throw publicApiError("Trace not found", 404);
    }

    let diagnosis = trace.status === "success" ? undefined : await getDiagnosis(trace.id);
    if (!diagnosis && trace.status !== "success") {
      diagnosis = diagnoseTrace(trace);
    }

    const response: TraceDetailResponse = {
      trace: hasApiKeyAccess(request) ? trace : toPublicTrace(trace),
      diagnosis,
      reportStatus: trace.status === "success" ? "not_applicable" : "ready"
    };

    return jsonOk(response);
  } catch (error) {
    return jsonError(error);
  }
}
