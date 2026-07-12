import type { PaymentTrace, ReplayRecommendation, ReplayResult, ReplayStrategy } from "@/lib/types/domain";

export const supportedAssetFallback = "CKB";

export function recommendSmallestFix(results: ReplayResult[]): ReplayResult | undefined {
  const explicitRecommended = results.find((result) => result.recommended && result.result === "success");
  if (explicitRecommended) {
    return explicitRecommended;
  }

  return selectSmallestSuccessfulChange(results);
}

export function createReplayRecommendation(trace: PaymentTrace, results: ReplayResult[]): ReplayRecommendation | undefined {
  if (trace.mode !== "sandbox") {
    return undefined;
  }
  const successful = results.filter((result) => result.result === "success");
  if (!successful.length) {
    return undefined;
  }

  const primaryResult = recommendSmallestFix(results);
  const alternatives = successful.filter((result) => result.id !== primaryResult?.id);
  const confidence = diagnosisConfidence(trace.failureFingerprint);

  if (trace.failureFingerprint === "ROUTE_CAPACITY_INSUFFICIENT") {
    const amount64 = Math.floor(trace.amount * 0.64);
    const deficit = capacityDeficit(trace);
    const reduced = results.find((result) => result.scenario === "reduced_amount_64" && result.result === "success");
    const capacity = results.find((result) => result.scenario === "increased_outbound_capacity" && result.result === "success");
    return {
      title: "Smallest route-capacity fix",
      summary: `Replay showed the original ${trace.amount} ${trace.asset} payment fails, 80% still fails, and a partial payment of ${amount64} ${trace.asset} succeeds. Splitting over the same static route does not complete the original total; exact outbound capacity repair and an alternate route succeeded.`,
      primaryAction: `Send at most ${amount64} ${trace.asset} now as a partial payment, or add capacity to send the full ${trace.amount} ${trace.asset}.`,
      operatorAction: capacity
        ? `If the operator controls liquidity, add at least ${deficit} ${trace.asset} outbound route capacity.`
        : undefined,
      confidence,
      primaryResult: reduced ?? primaryResult,
      alternatives: successful.filter((result) => result.id !== (reduced ?? primaryResult)?.id)
    };
  }

  if (trace.failureFingerprint === "PEER_OFFLINE") {
    return {
      title: "Restore peer or route around it",
      summary: "Replay reproduced the offline-peer failure, then succeeded when the peer was restored, when an alternate route avoided it, and after retry delay.",
      primaryAction: "Restore peer reachability, then retry. If restoration is outside your control, route around the peer.",
      confidence,
      primaryResult,
      alternatives
    };
  }

  if (trace.failureFingerprint === "PAYMENT_TIMEOUT") {
    return {
      title: "Increase timeout or reduce route complexity",
      summary: "Replay succeeded with a longer timeout, with an alternate route, and with a smaller amount that reduced route complexity.",
      primaryAction: "Increase the timeout window to cover observed settlement latency, or use the lower-complexity alternate route.",
      confidence,
      primaryResult,
      alternatives
    };
  }

  if (trace.failureFingerprint === "FEE_LIMIT_TOO_LOW") {
    return {
      title: "Raise fee ceiling or choose lower-fee path",
      summary: "Replay reproduced the fee-limit failure and succeeded after raising the fee limit or selecting a lower-fee alternate route.",
      primaryAction: "Raise the fee limit to the successful replay threshold, or route through the lower-fee path.",
      confidence,
      primaryResult,
      alternatives
    };
  }

  if (trace.failureFingerprint === "ASSET_UNSUPPORTED") {
    return {
      title: "Use a supported asset or compatible route",
      summary: "Replay failed with the same asset and succeeded with a supported asset or a route whose hops support the requested asset.",
      primaryAction: `Retry using ${supportedAssetFallback}, or select a route with explicit support for ${trace.asset}.`,
      confidence,
      primaryResult,
      alternatives
    };
  }

  if (trace.failureFingerprint === "INVOICE_CANCELLED") {
    return {
      title: "Request a fresh invoice",
      summary: "Replay confirms the cancelled invoice remains invalid under the same conditions and succeeds only after replacing it.",
      primaryAction: "Request a fresh invoice from the receiver and retry with the new payment hash.",
      operatorAction: "Check invoice status before retrying; do not replay payments against cancelled invoices.",
      confidence,
      primaryResult,
      alternatives
    };
  }

  if (trace.failureFingerprint === "INVOICE_INVALID") {
    return {
      title: "Request a fresh invoice",
      summary: "Replay confirms the original invoice cannot pass validation under the same conditions and succeeds only after replacing it.",
      primaryAction: "Request a fresh invoice from the receiver and retry with the new payment hash.",
      operatorAction: "Validate invoice expiry, amount, asset, and payee fields before route discovery.",
      confidence,
      primaryResult,
      alternatives
    };
  }

  if (trace.failureFingerprint === "PAYMENT_AMOUNT_INVALID") {
    return {
      title: "Correct the payment amount",
      summary: "Replay confirms the original request fails validation and succeeds only after the amount is corrected.",
      primaryAction: "Retry with a valid whole raw-unit amount inside the FNN-supported range.",
      operatorAction: "Add client-side amount bounds validation before calling send_payment.",
      confidence,
      primaryResult,
      alternatives
    };
  }

  if (trace.failureFingerprint === "PEER_OFFLINE_ROUTE_UNAVAILABLE") {
    return {
      title: "Restore peer connectivity",
      summary: "Replay confirms the unavailable peer condition and succeeds after the peer returns or routing avoids the unavailable peer.",
      primaryAction: "Restart or reconnect the peer, refresh node graph state, then retry.",
      confidence,
      primaryResult,
      alternatives
    };
  }

  return {
    title: "Smallest successful replay change",
    summary: primaryResult
      ? `${primaryResult.changedCondition} was the smallest successful replay change.`
      : "Replay produced at least one successful condition change.",
    primaryAction: primaryResult?.changedCondition ?? "Apply the successful replay condition.",
    confidence,
    primaryResult,
    alternatives
  };
}

export function selectSmallestSuccessfulChange(results: ReplayResult[]): ReplayResult | undefined {
  const rank: ReplayStrategy[] = [
    "supported_asset",
    "correct_amount",
    "fresh_invoice",
    "higher_fee_limit",
    "longer_timeout",
    "restored_peer",
    "retry_after_delay",
    "smaller_amount",
    "reduced_amount_64",
    "split_payment",
    "alternate_route",
    "asset_supported_route",
    "increased_outbound_capacity",
    "reduced_amount_80",
    "same_conditions"
  ];

  return results
    .filter((result) => result.result === "success")
    .sort((left, right) => rank.indexOf(left.scenario) - rank.indexOf(right.scenario))[0];
}

export function capacityDeficit(trace: PaymentTrace): number {
  if (trace.failureFingerprint === "ROUTE_CAPACITY_INSUFFICIENT") {
    return trace.amount - Math.floor(trace.amount * 0.64);
  }

  return Math.ceil(trace.amount * 0.2);
}

function diagnosisConfidence(fingerprint: PaymentTrace["failureFingerprint"]) {
  if (fingerprint === "PAYMENT_TIMEOUT" || fingerprint === "RETRY_PATH_UNAVAILABLE" || fingerprint === "PEER_OFFLINE_ROUTE_UNAVAILABLE") {
    return "medium" as const;
  }

  return "high" as const;
}
