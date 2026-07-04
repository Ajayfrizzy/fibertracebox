import { describe, expect, it } from "vitest";
import { SandboxAdapter } from "@/lib/adapters/sandbox-adapter";
import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { generateReport } from "@/lib/core/report-generator";
import { createReplayRecommendation, recommendSmallestFix, runReplayToFix } from "@/lib/core/replay-engine";

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
});
