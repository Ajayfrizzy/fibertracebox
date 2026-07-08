import { describe, expect, it } from "vitest";
import { SandboxAdapter } from "@/lib/adapters/sandbox-adapter";
import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { classifyFiberRpcFailure } from "@/lib/core/fiber-error-classifier";
import { generateReport } from "@/lib/core/report-generator";
import { createReplayRecommendation, recommendSmallestFix, runReplayToFix } from "@/lib/core/replay-engine";
import type { FailureFingerprint, PaymentTrace } from "@/lib/types/domain";

describe("FiberTracebox core", () => {
  it("creates successful and failed sandbox traces", async () => {
    const adapter = new SandboxAdapter();
    const success = await adapter.runPaymentAttempt({ scenario: "successful-payment" });
    const failed = await adapter.runPaymentAttempt({ scenario: "route-capacity" });

    expect(success.status).toBe("success");
    expect(success.events.at(-1)?.severity).toBe("success");
    expect(failed.status).toBe("failed");
    expect(failed.failureFingerprint).toBe("ROUTE_CAPACITY_INSUFFICIENT");
  });

  it("classifies and diagnoses route capacity failures", async () => {
    const adapter = new SandboxAdapter();
    const trace = await adapter.runPaymentAttempt({ scenario: "route-capacity" });
    const diagnosis = diagnoseTrace(trace);

    expect(diagnosis?.fingerprint).toBe("ROUTE_CAPACITY_INSUFFICIENT");
    expect(diagnosis?.suggestedFixes).toContain("Split the payment across multiple paths");
    expect(diagnosis?.confidence).toBe("high");
  });

  it("does not diagnose successful traces from non-error lifecycle text", async () => {
    const adapter = new SandboxAdapter();
    const trace = await adapter.runPaymentAttempt({ scenario: "successful-payment" });
    const diagnosis = diagnoseTrace(trace);
    const report = generateReport(trace);

    expect(diagnosis).toBeUndefined();
    expect(report.json.diagnosis).toBeUndefined();
    expect(report.markdown).toContain("No failure diagnosis is required for this trace.");
    expect(report.markdown).not.toContain("FEE_LIMIT_TOO_LOW");
  });

  it("recommends a smallest successful replay fix", async () => {
    const adapter = new SandboxAdapter();
    const trace = await adapter.runPaymentAttempt({ scenario: "route-capacity" });
    const results = runReplayToFix(trace);
    const recommended = recommendSmallestFix(results);

    expect(results.some((result) => result.result === "failed")).toBe(true);
    expect(results.some((result) => result.result === "success")).toBe(true);
    expect(recommended?.scenario).toBe("split_payment");
    expect(results.find((result) => result.recommended)?.id).toBe(recommended?.id);
  });

  it("runs the exact route capacity replay ladder", async () => {
    const adapter = new SandboxAdapter();
    const trace = await adapter.runPaymentAttempt({ scenario: "route-capacity" });
    const results = runReplayToFix(trace);
    const byScenario = Object.fromEntries(results.map((result) => [result.scenario, result]));
    const recommendation = createReplayRecommendation(trace, results);

    expect(results.map((result) => result.scenario)).toEqual([
      "same_conditions",
      "reduced_amount_80",
      "reduced_amount_64",
      "increased_outbound_capacity",
      "alternate_route",
      "split_payment"
    ]);
    expect(byScenario.reduced_amount_80.result).toBe("failed");
    expect(byScenario.reduced_amount_80.changedCondition).toContain("400 CKB");
    expect(byScenario.reduced_amount_64.result).toBe("success");
    expect(byScenario.reduced_amount_64.changedCondition).toContain("320 CKB");
    expect(byScenario.increased_outbound_capacity.changedCondition).toContain("180 CKB");
    expect(byScenario.alternate_route.latencyMs).toBe(73);
    expect(byScenario.split_payment.changedCondition).toContain("250 CKB + 250 CKB");
    expect(recommendation?.primaryAction).toContain("Split the payment");
    expect(recommendation?.operatorAction).toContain("180 CKB");
  });

  it("runs peer offline replay scenarios", async () => {
    const adapter = new SandboxAdapter();
    const trace = await adapter.runPaymentAttempt({ scenario: "peer-offline" });
    const results = runReplayToFix(trace);
    const byScenario = Object.fromEntries(results.map((result) => [result.scenario, result]));

    expect(byScenario.same_conditions.result).toBe("failed");
    expect(byScenario.restored_peer.result).toBe("success");
    expect(byScenario.alternate_route.result).toBe("success");
    expect(byScenario.retry_after_delay.result).toBe("success");
    expect(recommendSmallestFix(results)?.scenario).toBe("restored_peer");
  });

  it("runs route-unavailable replay scenarios for live peer-offline evidence", () => {
    const trace: PaymentTrace = {
      id: "trace_peer_route_unavailable",
      createdAt: "2026-07-07T00:00:00.000Z",
      mode: "fiber-rpc",
      senderNode: "sender",
      receiverNode: "receiver",
      amount: 1000,
      asset: "Fibt",
      status: "failed",
      latencyMs: 20,
      failureStage: "fiber_rpc_error",
      failureFingerprint: "PEER_OFFLINE_ROUTE_UNAVAILABLE",
      events: [],
      replayResults: []
    };
    const results = runReplayToFix(trace);
    const byScenario = Object.fromEntries(results.map((result) => [result.scenario, result]));

    expect(byScenario.same_conditions.result).toBe("failed");
    expect(byScenario.restored_peer.result).toBe("success");
    expect(byScenario.retry_after_delay.result).toBe("success");
    expect(byScenario.alternate_route.result).toBe("success");
    expect(recommendSmallestFix(results)?.scenario).toBe("restored_peer");
  });

  it("runs timeout replay scenarios", async () => {
    const adapter = new SandboxAdapter();
    const trace = await adapter.runPaymentAttempt({ scenario: "payment-timeout" });
    const results = runReplayToFix(trace);
    const byScenario = Object.fromEntries(results.map((result) => [result.scenario, result]));

    expect(byScenario.same_conditions.result).toBe("failed");
    expect(byScenario.longer_timeout.result).toBe("success");
    expect(byScenario.alternate_route.result).toBe("success");
    expect(byScenario.smaller_amount.result).toBe("success");
    expect(recommendSmallestFix(results)?.scenario).toBe("longer_timeout");
  });

  it("runs fee limit replay scenarios", async () => {
    const adapter = new SandboxAdapter();
    const trace = await adapter.runPaymentAttempt({ scenario: "fee-limit-too-low" });
    const results = runReplayToFix(trace);
    const byScenario = Object.fromEntries(results.map((result) => [result.scenario, result]));

    expect(byScenario.same_conditions.result).toBe("failed");
    expect(byScenario.higher_fee_limit.result).toBe("success");
    expect(byScenario.alternate_route.result).toBe("success");
    expect(recommendSmallestFix(results)?.scenario).toBe("higher_fee_limit");
  });

  it("runs asset unsupported replay scenarios", async () => {
    const adapter = new SandboxAdapter();
    const trace = await adapter.runPaymentAttempt({ scenario: "asset-unsupported" });
    const results = runReplayToFix(trace);
    const byScenario = Object.fromEntries(results.map((result) => [result.scenario, result]));

    expect(byScenario.same_conditions.result).toBe("failed");
    expect(byScenario.supported_asset.result).toBe("success");
    expect(byScenario.asset_supported_route.result).toBe("success");
    expect(recommendSmallestFix(results)?.scenario).toBe("supported_asset");
  });

  it("generates markdown and JSON reports", async () => {
    const adapter = new SandboxAdapter();
    const trace = await adapter.runPaymentAttempt({ scenario: "peer-offline" });
    trace.replayResults = runReplayToFix(trace);
    const report = generateReport(trace);

    expect(report.markdown).toContain("# FiberTracebox Report");
    expect(report.markdown).toContain("PEER_OFFLINE");
    expect(report.json.smallestFix?.scenario).toBe("restored_peer");
    expect(report.json.recommendation?.confidence).toBe("high");
  });

  it("includes replay recommendation in report output after replay", async () => {
    const adapter = new SandboxAdapter();
    const trace = await adapter.runPaymentAttempt({ scenario: "route-capacity" });
    trace.replayResults = runReplayToFix(trace);
    const report = generateReport(trace);

    expect(report.markdown).toContain("Smallest route-capacity fix");
    expect(report.markdown).toContain("Split the payment");
    expect(report.markdown).toContain("add at least 180 CKB outbound route capacity");
    expect(report.json.recommendation?.primaryResult?.scenario).toBe("split_payment");
  });

  it("classifies real Fiber-style RPC failures", () => {
    const samples: Array<{ message: string; data?: unknown; fingerprint: FailureFingerprint }> = [
      { message: "route not found for target", fingerprint: "ROUTE_NOT_FOUND" },
      { message: "unable to find path to payee", fingerprint: "ROUTE_NOT_FOUND" },
      { message: "insufficient capacity on selected route", fingerprint: "ROUTE_CAPACITY_INSUFFICIENT" },
      { message: "payment amount exceeds max htlc on hop", fingerprint: "ROUTE_CAPACITY_INSUFFICIENT" },
      { message: "peer is not connected", fingerprint: "PEER_OFFLINE" },
      { message: "required peer unreachable", data: { detail: "peer offline" }, fingerprint: "PEER_OFFLINE" },
      { message: "channel not ready for forwarding", fingerprint: "CHANNEL_INACTIVE" },
      { message: "channel disabled by policy", fingerprint: "CHANNEL_INACTIVE" },
      { message: "unsupported asset for route", fingerprint: "ASSET_UNSUPPORTED" },
      { message: "unknown udt currency", fingerprint: "ASSET_UNSUPPORTED" },
      { message: "max fee amount exceeds fee limit", fingerprint: "FEE_LIMIT_TOO_LOW" },
      { message: "route fee exceeded caller fee ceiling", fingerprint: "FEE_LIMIT_TOO_LOW" },
      { message: "payment timed out before settlement", fingerprint: "PAYMENT_TIMEOUT" },
      { message: "tlc timeout while waiting for settlement", fingerprint: "PAYMENT_TIMEOUT" },
      { message: "invalid invoice: expired", fingerprint: "INVOICE_INVALID" },
      { message: "failed to parse invoice payload", fingerprint: "INVOICE_INVALID" },
      { message: "InvoiceCancelled", fingerprint: "INVOICE_CANCELLED" },
      { message: "payment status Failed", data: { failed_error: "InvoiceCancelled" }, fingerprint: "INVOICE_CANCELLED" },
      { message: "failed to parse uint hex 0xffff: ParseIntError { kind: PosOverflow }", fingerprint: "PAYMENT_AMOUNT_INVALID" },
      { message: "payment amount should be less than 18446744073709551615", fingerprint: "PAYMENT_AMOUNT_INVALID" },
      {
        message: "Send payment error: Failed to build route, PathFind error: no path found",
        fingerprint: "ROUTE_NOT_FOUND"
      },
      {
        message:
          "Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 40099999000 is insufficient, required amount: 160000000000",
        fingerprint: "ROUTE_CAPACITY_INSUFFICIENT"
      },
      {
        message:
          "Send payment error: Failed to build route, Graph other error: max_fee_amount is too low for trampoline routing: recommend_minimal_fee=200100, maximal_fee=2010000 current_fee=0",
        fingerprint: "FEE_LIMIT_TOO_LOW"
      },
      {
        message: "peer_offline_route_unavailable",
        data: { peers_count: "0x0", failed_error: "max outbound liquidity 0 is insufficient" },
        fingerprint: "PEER_OFFLINE_ROUTE_UNAVAILABLE"
      },
      { message: "retry path unavailable after first route failed", fingerprint: "RETRY_PATH_UNAVAILABLE" },
      { message: "no more retry candidates", fingerprint: "RETRY_PATH_UNAVAILABLE" }
    ];

    for (const sample of samples) {
      expect(classifyFiberRpcFailure(sample.message, sample.data).fingerprint).toBe(sample.fingerprint);
    }
  });

  it("adds evidence provenance to sandbox reports", async () => {
    const adapter = new SandboxAdapter();
    const trace = await adapter.runPaymentAttempt({ scenario: "route-capacity" });
    trace.replayResults = runReplayToFix(trace);
    const report = generateReport(trace);

    expect(report.markdown).toContain("## Evidence Source");
    expect(report.markdown).toContain("Trace source: sandbox");
    expect(report.json.evidenceProvenance.traceSource).toBe("sandbox");
    expect(report.json.evidenceProvenance.replayMode).toContain("deterministic sandbox");
    expect(report.json.evidenceProvenance.liveMutation).toBe("no");
  });

  it("adds live failure RPC details to report provenance", () => {
    const trace: PaymentTrace = {
      id: "trace_live_failure",
      createdAt: "2026-07-06T00:00:00.000Z",
      mode: "fiber-rpc",
      senderNode: "sender-pubkey",
      receiverNode: "receiver-pubkey",
      amount: 100_000_000,
      asset: "Fibt",
      status: "failed",
      latencyMs: 12,
      failureStage: "fiber_rpc_error",
      failureFingerprint: "FEE_LIMIT_TOO_LOW",
      events: [
        {
          id: "event_request",
          traceId: "trace_live_failure",
          timestampMs: 0,
          stage: "request_received",
          message: "Live Fiber payment dry-run requested",
          severity: "info",
          metadata: { dryRun: true, adapter: "fnn-json-rpc" }
        },
        {
          id: "event_error",
          traceId: "trace_live_failure",
          timestampMs: 12,
          stage: "fiber_rpc_error",
          message: "max fee amount exceeds fee limit",
          severity: "error",
          metadata: {
            rpcMethod: "send_payment",
            rpcCode: -32000,
            fingerprint: "FEE_LIMIT_TOO_LOW",
            classificationReason: "FNN reported that the route fee exceeded the configured fee limit."
          }
        }
      ],
      replayResults: []
    };
    const report = generateReport(trace);

    expect(report.markdown).toContain("Observed failure stage: fiber_rpc_error");
    expect(report.markdown).toContain("Failed RPC method: send_payment");
    expect(report.markdown).toContain("FNN error code: -32000");
    expect(report.json.evidenceProvenance.observedFailure).toMatchObject({
      stage: "fiber_rpc_error",
      fingerprint: "FEE_LIMIT_TOO_LOW",
      rpcMethod: "send_payment",
      rpcCode: -32000
    });
  });

  it("recommends fresh invoices and corrected amounts for real Fiber validation failures", () => {
    const cancelledTrace = {
      id: "trace_cancelled",
      createdAt: "2026-07-07T00:00:00.000Z",
      mode: "fiber-rpc" as const,
      senderNode: "sender",
      receiverNode: "receiver",
      amount: 1000,
      asset: "Fibt",
      status: "failed" as const,
      latencyMs: 25,
      failureStage: "payment_result",
      failureFingerprint: "INVOICE_CANCELLED" as const,
      events: [],
      replayResults: []
    };
    const amountTrace = {
      ...cancelledTrace,
      id: "trace_amount",
      failureFingerprint: "PAYMENT_AMOUNT_INVALID" as const
    };

    const cancelledResults = runReplayToFix(cancelledTrace);
    const amountResults = runReplayToFix(amountTrace);

    expect(cancelledResults.find((result) => result.scenario === "fresh_invoice")?.result).toBe("success");
    expect(amountResults.find((result) => result.scenario === "correct_amount")?.result).toBe("success");
    expect(createReplayRecommendation(cancelledTrace, cancelledResults)?.primaryAction).toContain("fresh invoice");
    expect(createReplayRecommendation(amountTrace, amountResults)?.primaryAction).toContain("valid whole raw-unit amount");
  });
});
