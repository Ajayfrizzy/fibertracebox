import { getPaymentAdapter } from "@/lib/adapters";
import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { getDiagnosis, listTraces, saveDiagnosis, saveTrace } from "@/lib/api/repository";
import { jsonError, jsonOk } from "@/lib/api/http";
import { assertWriteAccess } from "@/lib/api/security";
import { parsePaymentAttemptInput } from "@/lib/api/validation";
import { hasApiKeyAccess } from "@/lib/api/security";
import { toPublicTraceSummary } from "@/lib/api/public-trace";

export async function GET(request: Request) {
  try {
    const traces = await listTraces();
    return jsonOk(
      traces.map((trace) => hasApiKeyAccess(request) ? ({
        id: trace.id,
        status: trace.status,
        amount: trace.amount,
        asset: trace.asset,
        fingerprint: trace.failureFingerprint,
        latencyMs: trace.latencyMs,
        createdAt: trace.createdAt,
        senderNode: trace.senderNode,
        receiverNode: trace.receiverNode,
        mode: trace.mode
      }) : toPublicTraceSummary(trace))
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertWriteAccess(request, "traces:create");
    const input = await parsePaymentAttemptInput(request);
    const adapter = getPaymentAdapter();
    const trace = await adapter.runPaymentAttempt(input);
    await saveTrace(trace);

    const diagnosis = diagnoseTrace(trace);
    if (diagnosis) {
      await saveDiagnosis(trace.id, diagnosis);
    }

    return jsonOk({ trace, diagnosis: diagnosis ?? (await getDiagnosis(trace.id)) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
