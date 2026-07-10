import { getPaymentAdapter } from "@/lib/adapters";
import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { getDiagnosis, listTraces, saveDiagnosis, saveTrace } from "@/lib/api/repository";
import { jsonError, jsonOk, publicApiError } from "@/lib/api/http";
import { assertPublicLiveDryRunAccess, assertWriteAccess, hasApiKeyAccess } from "@/lib/api/security";
import { parsePaymentAttemptInput } from "@/lib/api/validation";
import { toPublicTrace, toPublicTraceSummary } from "@/lib/api/public-trace";

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
    const input = await parsePaymentAttemptInput(request);
    const authenticated = hasApiKeyAccess(request);
    const publicDryRun = !authenticated && process.env.FIBERTRACEBOX_ALLOW_PUBLIC_LIVE_DRY_RUN === "true";
    if (authenticated) {
      assertWriteAccess(request, "traces:create");
    } else if (publicDryRun) {
      assertPublicLiveDryRunAccess(request);
    } else {
      assertWriteAccess(request, "traces:create");
    }
    const adapter = getPaymentAdapter();
    if (adapter.getMode() !== "fiber-rpc") {
      throw publicApiError("Manual trace creation requires Fiber RPC mode", 503);
    }
    const trace = await adapter.runPaymentAttempt(publicDryRun ? { ...input, dryRun: true } : input);
    await saveTrace(trace);

    const diagnosis = diagnoseTrace(trace);
    if (diagnosis) {
      await saveDiagnosis(trace.id, diagnosis);
    }

    return jsonOk(
      { trace: publicDryRun ? toPublicTrace(trace) : trace, diagnosis: diagnosis ?? (await getDiagnosis(trace.id)) },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error);
  }
}
