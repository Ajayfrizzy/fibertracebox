import { getPaymentAdapter } from "@/lib/adapters";
import { getTrace, saveDiagnosis, saveTrace } from "@/lib/api/repository";
import { jsonError, jsonOk, publicApiError } from "@/lib/api/http";
import { assertWriteAccess } from "@/lib/api/security";
import { parseLiveVerificationInput, parseTraceId } from "@/lib/api/validation";
import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { createVerificationEvents, evaluateLiveVerification } from "@/lib/core/live-verification";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertWriteAccess(request, "traces:verify");
    const { id } = await context.params;
    const traceId = parseTraceId(id);
    const original = await getTrace(traceId);
    if (!original) throw publicApiError("Trace not found", 404);
    if (original.mode !== "fiber-rpc") throw publicApiError("Live verification requires a Fiber RPC trace", 400);
    if (original.status !== "failed") throw publicApiError("Live verification requires a failed Fiber RPC trace", 400);

    const adapter = getPaymentAdapter();
    if (adapter.getMode() !== "fiber-rpc") throw publicApiError("Fiber RPC live mode is not enabled", 503);

    const input = await parseLiveVerificationInput(request);
    const verificationTrace = await adapter.runPaymentAttempt(input);
    const initialResult = evaluateLiveVerification(original, verificationTrace);
    const events = createVerificationEvents(initialResult);
    verificationTrace.events.push(events.verificationEvent);
    original.events.push(events.originalEvent);

    await Promise.all([saveTrace(original), saveTrace(verificationTrace)]);
    const diagnosis = diagnoseTrace(verificationTrace);
    if (diagnosis) await saveDiagnosis(verificationTrace.id, diagnosis);

    return jsonOk({ ...initialResult, verificationTrace }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
