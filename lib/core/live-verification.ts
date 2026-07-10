import { createId } from "@/lib/core/ids";
import type { LiveVerificationOutcome, LiveVerificationResult, PaymentTrace, TraceEvent } from "@/lib/types/domain";

export function evaluateLiveVerification(original: PaymentTrace, verificationTrace: PaymentTrace): LiveVerificationResult {
  const outcome = determineOutcome(original, verificationTrace);
  return {
    originalTraceId: original.id,
    verificationTrace,
    outcome,
    summary: verificationSummary(outcome),
    originalFingerprint: original.failureFingerprint,
    verificationFingerprint: verificationTrace.failureFingerprint
  };
}

export function createVerificationEvents(result: LiveVerificationResult): { originalEvent: TraceEvent; verificationEvent: TraceEvent } {
  const severity = result.outcome === "verified" ? "success" : result.outcome === "inconclusive" ? "warning" : "error";
  const metadata = {
    verificationOutcome: result.outcome,
    originalTraceId: result.originalTraceId,
    verificationTraceId: result.verificationTrace.id,
    originalFingerprint: result.originalFingerprint,
    verificationFingerprint: result.verificationFingerprint,
    dryRun: true
  };

  return {
    originalEvent: {
      id: createId("event"),
      traceId: result.originalTraceId,
      timestampMs: result.verificationTrace.latencyMs,
      stage: "live_verification",
      message: result.summary,
      severity,
      metadata
    },
    verificationEvent: {
      id: createId("event"),
      traceId: result.verificationTrace.id,
      timestampMs: result.verificationTrace.latencyMs + 1,
      stage: "verification_link",
      message: `Verification of live trace ${result.originalTraceId}: ${result.summary}`,
      severity,
      metadata
    }
  };
}

function determineOutcome(original: PaymentTrace, verification: PaymentTrace): LiveVerificationOutcome {
  if ((verification.status === "success" || verification.status === "pending") && !verification.failureFingerprint) {
    return "verified";
  }
  if (verification.status === "failed" && verification.failureFingerprint === original.failureFingerprint) {
    return "still_failing";
  }
  if (verification.status === "failed" && verification.failureFingerprint) {
    return "changed_failure";
  }
  return "inconclusive";
}

function verificationSummary(outcome: LiveVerificationOutcome) {
  switch (outcome) {
    case "verified":
      return "FNN accepted the corrected dry-run without a failure fingerprint; the route check is verified, but settlement was not attempted.";
    case "still_failing":
      return "The corrected dry-run returned the same failure fingerprint; the proposed fix is not yet verified.";
    case "changed_failure":
      return "The corrected dry-run passed the original failure point but returned a different failure fingerprint.";
    case "inconclusive":
      return "The corrected dry-run did not provide enough final evidence to verify the proposed fix.";
  }
}
