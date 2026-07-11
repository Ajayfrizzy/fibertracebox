import type { Diagnosis, LiveFixRecommendation, PaymentTrace, ReplayStrategy } from "@/lib/types/domain";

export function createLiveFixRecommendations(trace: PaymentTrace, diagnosis?: Diagnosis): LiveFixRecommendation[] {
  if (trace.mode !== "fiber-rpc" || trace.status !== "failed" || !diagnosis) return [];

  return diagnosis.suggestedFixes.map((title, index) => {
    const strategy = inferStrategy(title, diagnosis);
    return {
      id: `${trace.id}-live-fix-${index + 1}`,
      title,
      strategy,
      status: "suggested" as const,
      recommended: index === 0,
      verificationStep: verificationStep(strategy, title)
    };
  });
}

function inferStrategy(title: string, diagnosis: Diagnosis): ReplayStrategy | undefined {
  const text = title.toLowerCase();
  const inferred =
    text.includes("fresh invoice") ? "fresh_invoice"
      : text.includes("split") ? "split_payment"
        : text.includes("amount") ? "smaller_amount"
          : text.includes("fee") ? "higher_fee_limit"
            : text.includes("timeout") ? "longer_timeout"
              : text.includes("asset") ? "supported_asset"
                : text.includes("alternate route") || text.includes("route source") ? "alternate_route"
                  : text.includes("peer") || text.includes("reconnect") ? "restored_peer"
                    : text.includes("retry") ? "retry_after_delay"
                      : text.includes("capacity") || text.includes("liquidity") || text.includes("rebalance")
                        ? "increased_outbound_capacity"
                        : undefined;

  if (inferred) return inferred;
  return diagnosis.replayStrategies.find((strategy) => strategy !== "same_conditions");
}

function verificationStep(strategy: ReplayStrategy | undefined, title: string): string {
  switch (strategy) {
    case "fresh_invoice":
      return "Paste a fresh receiver invoice below, then run the server-enforced FNN dry-run.";
    case "higher_fee_limit":
      return "Enter the corrected fee limit below, then run the server-enforced FNN dry-run.";
    case "smaller_amount":
    case "reduced_amount_64":
    case "reduced_amount_80":
    case "correct_amount":
      return "Enter the corrected amount below with a fresh invoice or target pubkey, then verify against FNN.";
    case "restored_peer":
    case "retry_after_delay":
      return "Apply the peer or connectivity change outside FiberTracebox, then verify against FNN with a fresh invoice or target pubkey.";
    case "increased_outbound_capacity":
      return "Apply the liquidity or channel change outside FiberTracebox, then verify against FNN with a fresh invoice or target pubkey.";
    case "alternate_route":
    case "split_payment":
    case "asset_supported_route":
    case "supported_asset":
    case "longer_timeout":
      return "Apply this request or node configuration change, then verify against FNN with a fresh invoice or target pubkey.";
    default:
      return `Apply this operator change, then use Live Verification to test it against FNN: ${title}.`;
  }
}
