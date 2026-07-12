import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { createId } from "@/lib/core/ids";
import { capacityDeficit, selectSmallestSuccessfulChange, supportedAssetFallback } from "@/lib/core/replay-analysis";
import type { PaymentTrace, ReplayRecommendation, ReplayResult, ReplayStrategy } from "@/lib/types/domain";

export { createReplayRecommendation, recommendSmallestFix } from "@/lib/core/replay-analysis";

const defaultStrategies: ReplayStrategy[] = [
  "same_conditions",
  "smaller_amount",
  "increased_outbound_capacity",
  "alternate_route",
  "restored_peer",
  "retry_after_delay",
  "higher_fee_limit",
  "longer_timeout",
  "split_payment",
  "supported_asset",
  "asset_supported_route",
  "fresh_invoice",
  "correct_amount"
];

export function runReplayStrategy(trace: PaymentTrace, scenario: ReplayStrategy): ReplayResult {
  return createReplayResult(trace, scenario);
}

export function runReplayToFix(trace: PaymentTrace): ReplayResult[] {
  if (trace.mode !== "sandbox") {
    return [];
  }
  const strategies = listReplayStrategiesForTrace(trace);
  const results = strategies.map((strategy) => runReplayStrategy(trace, strategy));
  const recommended = chooseRecommendedForTrace(trace, results);

  return results.map((result) => ({
    ...result,
    recommended: result.id === recommended?.id
  }));
}

export function listReplayStrategiesForTrace(trace: PaymentTrace): ReplayStrategy[] {
  if (trace.mode !== "sandbox") {
    return [];
  }
  const diagnosis = diagnoseTrace(trace);
  return strategiesForTrace(trace, diagnosis?.replayStrategies);
}

function strategiesForTrace(trace: PaymentTrace, diagnosisStrategies: ReplayStrategy[] = []): ReplayStrategy[] {
  switch (trace.failureFingerprint) {
    case "ROUTE_CAPACITY_INSUFFICIENT":
      return ["same_conditions", "reduced_amount_80", "reduced_amount_64", "increased_outbound_capacity", "alternate_route", "split_payment"];
    case "PEER_OFFLINE":
      return ["same_conditions", "restored_peer", "alternate_route", "retry_after_delay"];
    case "PAYMENT_TIMEOUT":
      return ["same_conditions", "longer_timeout", "alternate_route", "smaller_amount"];
    case "FEE_LIMIT_TOO_LOW":
      return ["same_conditions", "higher_fee_limit", "alternate_route"];
    case "ASSET_UNSUPPORTED":
      return ["same_conditions", "supported_asset", "asset_supported_route"];
    case "INVOICE_INVALID":
      return ["same_conditions", "fresh_invoice"];
    case "INVOICE_CANCELLED":
      return ["same_conditions", "fresh_invoice"];
    case "PAYMENT_AMOUNT_INVALID":
      return ["same_conditions", "correct_amount"];
    case "PEER_OFFLINE_ROUTE_UNAVAILABLE":
      return ["same_conditions", "restored_peer", "retry_after_delay", "alternate_route"];
    default:
      return Array.from(new Set(["same_conditions", ...(diagnosisStrategies.length ? diagnosisStrategies : defaultStrategies)])) as ReplayStrategy[];
  }
}

function createReplayResult(trace: PaymentTrace, scenario: ReplayStrategy): ReplayResult {
  const resultFor = (
    result: ReplayResult["result"],
    changedCondition: string,
    latencyMs: number,
    explanation: string
  ): ReplayResult => ({
    id: createId("replay"),
    traceId: trace.id,
    scenario,
    changedCondition,
    result,
    latencyMs,
    explanation,
    recommended: false
  });

  if (trace.status === "success") {
    return resultFor("success", "Original payment already succeeded", trace.latencyMs, "No replay fix is required for a successful trace.");
  }

  const amount = trace.amount;
  const asset = trace.asset;
  const fingerprint = trace.failureFingerprint;

  switch (scenario) {
    case "same_conditions":
      return resultFor(
        "failed",
        "Original amount, route, peer state, fee limit, timeout, and asset unchanged",
        trace.latencyMs + 7,
        "The original failure reproduces under the same conditions, confirming the fingerprint is stable."
      );
    case "reduced_amount_80": {
      const target = Math.floor(amount * 0.8);
      return resultFor(
        fingerprint === "ROUTE_CAPACITY_INSUFFICIENT" ? "failed" : "failed",
        `Reduced amount to 80%: ${target} ${asset}`,
        Math.max(44, trace.latencyMs - 14),
        fingerprint === "ROUTE_CAPACITY_INSUFFICIENT"
          ? `${target} ${asset} still exceeds the constrained route capacity, so the payment fails again.`
          : "This replay step is only meaningful for route-capacity failures."
      );
    }
    case "reduced_amount_64": {
      const target = Math.floor(amount * 0.64);
      const succeeds = fingerprint === "ROUTE_CAPACITY_INSUFFICIENT";
      return resultFor(
        succeeds ? "success" : "failed",
        `Reduced amount to 64%: ${target} ${asset}`,
        succeeds ? Math.max(38, trace.latencyMs - 26) : trace.latencyMs - 8,
        succeeds
          ? `${target} ${asset} matches the observed maximum forwardable capacity and settles.`
          : "Reducing to 64% did not target this failure fingerprint."
      );
    }
    case "smaller_amount": {
      const target = Math.floor(amount * 0.72);
      const succeeds = fingerprint === "LIQUIDITY_IMBALANCE" || fingerprint === "PAYMENT_TIMEOUT";
      return resultFor(
        succeeds ? "success" : "failed",
        `Reduced amount to ${target} ${asset}`,
        Math.max(46, trace.latencyMs - 34),
        fingerprint === "PAYMENT_TIMEOUT"
          ? `The smaller ${target} ${asset} payment uses a lower-complexity path and settles inside the timeout.`
          : succeeds
            ? `A smaller ${target} ${asset} payment reduces directional liquidity pressure.`
            : "Reducing amount did not address this failure fingerprint."
      );
    }
    case "increased_outbound_capacity": {
      const deficit = capacityDeficit(trace);
      const succeeds = fingerprint === "ROUTE_CAPACITY_INSUFFICIENT" || fingerprint === "LIQUIDITY_IMBALANCE";
      return resultFor(
        succeeds ? "success" : "failed",
        `Added exact outbound route capacity deficit: ${deficit} ${asset}`,
        Math.max(42, trace.latencyMs - 18),
        succeeds
          ? `Adding ${deficit} ${asset} raises route capacity to the original payment amount and removes the constrained hop.`
          : "Additional outbound capacity does not resolve this failure mode."
      );
    }
    case "alternate_route": {
      const succeeds = fingerprint !== "INVOICE_INVALID";
      const lowerFee = fingerprint === "FEE_LIMIT_TOO_LOW";
      return resultFor(
        succeeds ? "success" : "failed",
        lowerFee ? "Selected alternate route with lower aggregate fee" : "Selected alternate route excluding the failing condition",
        alternateRouteLatency(trace),
        lowerFee
          ? "The alternate route stays under the original fee limit and settles."
          : succeeds
            ? "A route with different hops avoids the original failure point with slightly higher latency."
            : "An alternate route cannot fix an invalid invoice."
      );
    }
    case "restored_peer": {
      const succeeds = fingerprint === "PEER_OFFLINE" || fingerprint === "PEER_OFFLINE_ROUTE_UNAVAILABLE";
      return resultFor(
        succeeds ? "success" : "failed",
        "Restored unreachable peer before retry",
        Math.max(40, trace.latencyMs - 20),
        succeeds ? "Restoring peer reachability gives FNN a usable route again." : "Restoring a peer does not target the observed fingerprint."
      );
    }
    case "retry_after_delay": {
      const succeeds = fingerprint === "PEER_OFFLINE" || fingerprint === "PEER_OFFLINE_ROUTE_UNAVAILABLE";
      return resultFor(
        succeeds ? "success" : "failed",
        "Retried after peer health delay",
        trace.latencyMs + 21,
        succeeds
          ? "A delayed retry succeeds after the peer returns to the reachable set."
          : "Retry delay did not target the observed failure fingerprint."
      );
    }
    case "higher_fee_limit": {
      const succeeds = fingerprint === "FEE_LIMIT_TOO_LOW" || fingerprint === "RETRY_PATH_UNAVAILABLE";
      return resultFor(
        succeeds ? "success" : "failed",
        "Raised fee limit to 1.8x original ceiling",
        Math.max(45, trace.latencyMs - 9),
        succeeds ? "The route settles once the fee ceiling covers current policy requirements." : "The failure is not fee-limit driven."
      );
    }
    case "longer_timeout": {
      const succeeds = fingerprint === "PAYMENT_TIMEOUT";
      return resultFor(
        succeeds ? "success" : "failed",
        "Extended timeout window to 3x original value",
        trace.latencyMs + 28,
        succeeds ? "The payment settles when the timeout window covers the slow route." : "Increasing timeout does not resolve the original constraint."
      );
    }
    case "split_payment": {
      const first = Math.ceil(amount / 2);
      const second = amount - first;
      const succeeds =
        fingerprint === "LIQUIDITY_IMBALANCE" ||
        fingerprint === "RETRY_PATH_UNAVAILABLE" ||
        fingerprint === "FEE_LIMIT_TOO_LOW";
      return resultFor(
        succeeds ? "success" : "failed",
        `Split payment into ${first} ${asset} + ${second} ${asset}`,
        Math.max(54, trace.latencyMs - 5),
        fingerprint === "ROUTE_CAPACITY_INSUFFICIENT"
          ? `The route has only ${Math.floor(amount * 0.64)} ${asset} total forwardable capacity. After the first part, the same static route cannot carry the second part, so the full ${amount} ${asset} payment is not completed.`
          : succeeds
            ? "Splitting widens eligible paths and lowers per-route capacity pressure while preserving the original total amount."
            : "Split payment does not resolve this failure fingerprint."
      );
    }
    case "supported_asset": {
      const succeeds = fingerprint === "ASSET_UNSUPPORTED";
      return resultFor(
        succeeds ? "success" : "failed",
        `Retried with supported asset ${supportedAssetFallback}`,
        Math.max(34, trace.latencyMs - 5),
        succeeds
          ? `${supportedAssetFallback} is supported by the receiver and route, so settlement succeeds.`
          : "Changing asset did not target the observed fingerprint."
      );
    }
    case "asset_supported_route": {
      const succeeds = fingerprint === "ASSET_UNSUPPORTED";
      return resultFor(
        succeeds ? "success" : "failed",
        `Selected route advertising support for ${asset}`,
        trace.latencyMs + 17,
        succeeds
          ? `The alternate route explicitly supports ${asset}, so the original asset can settle.`
          : "An asset-supported route was not relevant to this fingerprint."
      );
    }
    case "fresh_invoice": {
      const succeeds = fingerprint === "INVOICE_CANCELLED" || fingerprint === "INVOICE_INVALID";
      return resultFor(
        succeeds ? "success" : "failed",
        "Requested a fresh receiver invoice before retry",
        Math.max(34, trace.latencyMs - 3),
        succeeds
          ? "A fresh invoice replaces the cancelled or invalid payment hash and gives the sender a valid retry target."
          : "Requesting a fresh invoice did not target this failure fingerprint."
      );
    }
    case "correct_amount": {
      const succeeds = fingerprint === "PAYMENT_AMOUNT_INVALID";
      return resultFor(
        succeeds ? "success" : "failed",
        `Corrected amount to a valid ${asset} raw-unit value`,
        Math.max(30, trace.latencyMs - 2),
        succeeds
          ? "The corrected amount passes FNN request validation and can proceed to route evaluation."
          : "Correcting amount did not target this failure fingerprint."
      );
    }
  }
}

function chooseRecommendedForTrace(trace: PaymentTrace, results: ReplayResult[]): ReplayResult | undefined {
  if (trace.failureFingerprint === "ROUTE_CAPACITY_INSUFFICIENT") {
    return (
      results.find((result) => result.scenario === "reduced_amount_64" && result.result === "success") ??
      results.find((result) => result.scenario === "increased_outbound_capacity" && result.result === "success")
    );
  }

  return selectSmallestSuccessfulChange(results);
}

function alternateRouteLatency(trace: PaymentTrace): number {
  if (trace.failureFingerprint === "ROUTE_CAPACITY_INSUFFICIENT") {
    return 73;
  }

  if (trace.failureFingerprint === "PEER_OFFLINE") {
    return trace.latencyMs + 18;
  }

  if (trace.failureFingerprint === "PAYMENT_TIMEOUT") {
    return Math.max(72, trace.latencyMs - 72);
  }

  if (trace.failureFingerprint === "FEE_LIMIT_TOO_LOW") {
    return trace.latencyMs + 11;
  }

  return trace.latencyMs + 12;
}
