import type { Diagnosis, FailureFingerprint } from "@/lib/types/domain";

export const diagnosisCatalog: Record<FailureFingerprint, Omit<Diagnosis, "traceId" | "fingerprint">> = {
  ROUTE_NOT_FOUND: {
    title: "No viable route found",
    explanation: "Route discovery could not find a path from sender to receiver under the current topology and policy filters.",
    likelyCauses: [
      "Receiver is not reachable from the sender's graph view",
      "Channels are private or not announced to the route source",
      "Policy filters excluded every candidate path"
    ],
    suggestedFixes: [
      "Refresh topology data before retrying",
      "Try an alternate route source",
      "Open or announce a route that connects the sender and receiver"
    ],
    confidence: "high",
    replayStrategies: ["same_conditions", "alternate_route", "split_payment"]
  },
  ROUTE_CAPACITY_INSUFFICIENT: {
    title: "Route capacity insufficient",
    explanation: "A route was discovered, but the available forwarding capacity was lower than the requested payment amount.",
    likelyCauses: [
      "Outbound liquidity is below the payment size",
      "One hop has a lower max HTLC than the payment amount",
      "The route can carry smaller payments but not this full amount"
    ],
    suggestedFixes: [
      "Reduce amount to the largest successful replay amount",
      "Split the payment across multiple paths",
      "Add outbound route capacity on the constrained hop"
    ],
    confidence: "high",
    replayStrategies: ["reduced_amount_80", "reduced_amount_64", "increased_outbound_capacity", "alternate_route", "split_payment"]
  },
  PEER_OFFLINE: {
    title: "Required peer offline",
    explanation: "The payment reached a route execution step that depended on a peer that was not reachable.",
    likelyCauses: [
      "Peer process is down or restarting",
      "Network connectivity between peers is broken",
      "Peer identity or address data is stale"
    ],
    suggestedFixes: [
      "Restore the peer and retry",
      "Use an alternate route that avoids the peer",
      "Refresh peer address data"
    ],
    confidence: "high",
    replayStrategies: ["same_conditions", "restored_peer", "alternate_route", "retry_after_delay"]
  },
  CHANNEL_INACTIVE: {
    title: "Channel inactive",
    explanation: "A route candidate included a channel that is known but not usable for forwarding.",
    likelyCauses: [
      "Channel is pending, disabled, or closing",
      "Local channel state is stale",
      "Route selection did not filter inactive channels"
    ],
    suggestedFixes: [
      "Exclude inactive channels during route selection",
      "Wait for channel activation before retrying",
      "Select an alternate route"
    ],
    confidence: "high",
    replayStrategies: ["same_conditions", "alternate_route"]
  },
  ASSET_UNSUPPORTED: {
    title: "Asset unsupported on route",
    explanation: "The payment requested an asset that is not supported by the receiver or one of the selected hops.",
    likelyCauses: [
      "Receiver invoice requests an unsupported asset",
      "Route channels only support CKB",
      "Asset metadata was not negotiated before execution"
    ],
    suggestedFixes: [
      "Retry with a supported asset",
      "Negotiate asset support before creating the invoice",
      "Select a route whose hops support the requested asset"
    ],
    confidence: "high",
    replayStrategies: ["same_conditions", "supported_asset", "asset_supported_route"]
  },
  FEE_LIMIT_TOO_LOW: {
    title: "Fee limit too low",
    explanation: "The available route required a fee above the caller's configured maximum fee limit.",
    likelyCauses: [
      "Fee limit is below route policy requirements",
      "A cheaper route was unavailable",
      "Fee estimate was based on stale policy data"
    ],
    suggestedFixes: [
      "Increase the fee limit to the successful replay threshold",
      "Refresh fee policies",
      "Try a lower-fee alternate route"
    ],
    confidence: "high",
    replayStrategies: ["same_conditions", "higher_fee_limit", "alternate_route"]
  },
  PAYMENT_TIMEOUT: {
    title: "Payment timed out",
    explanation: "The payment did not settle before the configured timeout window elapsed.",
    likelyCauses: [
      "Timeout is too short for route execution",
      "One hop responded slowly",
      "Retry budget was exhausted before settlement"
    ],
    suggestedFixes: [
      "Increase timeout to the successful replay threshold",
      "Avoid slow peers in route selection",
      "Split or retry with fewer hops"
    ],
    confidence: "medium",
    replayStrategies: ["same_conditions", "longer_timeout", "alternate_route", "smaller_amount"]
  },
  INVOICE_INVALID: {
    title: "Invoice invalid",
    explanation: "The receiver invoice could not be validated before payment execution.",
    likelyCauses: [
      "Invoice expired",
      "Receiver identity does not match the route target",
      "Amount or asset fields are malformed"
    ],
    suggestedFixes: [
      "Request a fresh invoice",
      "Validate invoice fields before route discovery",
      "Ensure sender and receiver agree on amount and asset"
    ],
    confidence: "high",
    replayStrategies: ["same_conditions"]
  },
  INVOICE_CANCELLED: {
    title: "Invoice cancelled",
    explanation: "FNN reported that the payment session failed because the receiver invoice was cancelled.",
    likelyCauses: [
      "The receiver cancelled the invoice before settlement",
      "The sender retried an invoice whose payment hash was already marked cancelled",
      "Invoice status was not checked before attempting payment"
    ],
    suggestedFixes: [
      "Request a fresh invoice from the receiver",
      "Check invoice status before retrying",
      "Do not replay payments against cancelled invoices"
    ],
    confidence: "high",
    replayStrategies: ["same_conditions"]
  },
  PAYMENT_AMOUNT_INVALID: {
    title: "Payment amount invalid",
    explanation: "FNN rejected the payment request before routing because the amount was malformed or outside valid bounds.",
    likelyCauses: [
      "Amount exceeded the valid raw-unit range",
      "Amount was not encoded as a valid whole raw-unit value",
      "Client-side request validation allowed an impossible payment amount"
    ],
    suggestedFixes: [
      "Validate amount before calling send_payment",
      "Use whole raw units within the FNN-supported range",
      "Retry with a corrected amount"
    ],
    confidence: "high",
    replayStrategies: ["same_conditions"]
  },
  LIQUIDITY_IMBALANCE: {
    title: "Directional liquidity imbalance",
    explanation: "Channels are active, but spendable liquidity is on the wrong side for this payment direction.",
    likelyCauses: [
      "Receiver-side liquidity is high while sender-side liquidity is low",
      "Recent traffic drained outbound capacity",
      "Route selection did not account for directional balance"
    ],
    suggestedFixes: [
      "Rebalance the channel",
      "Split payment into smaller parts",
      "Add outbound liquidity or select an alternate route"
    ],
    confidence: "high",
    replayStrategies: ["same_conditions", "smaller_amount", "split_payment", "increased_outbound_capacity", "alternate_route"]
  },
  RETRY_PATH_UNAVAILABLE: {
    title: "No retry path available",
    explanation: "The first route failed and the retry planner could not find another policy-compliant path.",
    likelyCauses: [
      "Retry budget allows too few path attempts",
      "Alternative paths exceed fee or capacity limits",
      "Topology view lacks enough route diversity"
    ],
    suggestedFixes: [
      "Allow alternate route replay",
      "Increase retry budget",
      "Split payment to widen the path set"
    ],
    confidence: "medium",
    replayStrategies: ["same_conditions", "alternate_route", "split_payment", "higher_fee_limit"]
  },
  PEER_OFFLINE_ROUTE_UNAVAILABLE: {
    title: "Peer offline caused route unavailability",
    explanation: "The target peer or node was unavailable, leaving FNN without a usable outbound route to the payment target.",
    likelyCauses: [
      "Target peer process is stopped or unreachable",
      "Node peer set dropped to zero before payment",
      "Channels exist but no connected peer can forward the payment"
    ],
    suggestedFixes: [
      "Restart or reconnect the peer",
      "Refresh peer and graph state before retrying",
      "Retry after the peer returns to the connected set"
    ],
    confidence: "medium",
    replayStrategies: ["same_conditions", "restored_peer", "retry_after_delay", "alternate_route"]
  }
};

export function classifyFailureFromEvents(events: Array<{ stage: string; message: string }>): FailureFingerprint | undefined {
  const searchable = events.map((event) => `${event.stage} ${event.message}`).join(" ").toLowerCase();

  if (searchable.includes("peer offline") && searchable.includes("route unavailable")) return "PEER_OFFLINE_ROUTE_UNAVAILABLE";
  if (searchable.includes("capacity") || searchable.includes("max htlc")) return "ROUTE_CAPACITY_INSUFFICIENT";
  if (searchable.includes("peer") && searchable.includes("offline")) return "PEER_OFFLINE";
  if (searchable.includes("channel") && searchable.includes("inactive")) return "CHANNEL_INACTIVE";
  if (searchable.includes("asset") && searchable.includes("unsupported")) return "ASSET_UNSUPPORTED";
  if (searchable.includes("fee") && searchable.includes("limit")) return "FEE_LIMIT_TOO_LOW";
  if (searchable.includes("timeout") || searchable.includes("timed out")) return "PAYMENT_TIMEOUT";
  if (searchable.includes("invoicecancelled") || searchable.includes("invoice cancelled") || searchable.includes("status cancelled")) {
    return "INVOICE_CANCELLED";
  }
  if (searchable.includes("posoverflow") || searchable.includes("payment amount") || searchable.includes("parse uint hex")) {
    return "PAYMENT_AMOUNT_INVALID";
  }
  if (searchable.includes("invoice") && searchable.includes("invalid")) return "INVOICE_INVALID";
  if (searchable.includes("liquidity") && searchable.includes("imbalance")) return "LIQUIDITY_IMBALANCE";
  if (searchable.includes("retry") && searchable.includes("unavailable")) return "RETRY_PATH_UNAVAILABLE";
  if (searchable.includes("route") && searchable.includes("not found")) return "ROUTE_NOT_FOUND";

  return undefined;
}

export function diagnoseTrace(trace: {
  id: string;
  status?: string;
  failureFingerprint?: FailureFingerprint;
  events: Array<{ stage: string; message: string }>;
}): Diagnosis | undefined {
  if (trace.status === "success" && !trace.failureFingerprint) {
    return undefined;
  }

  const fingerprint = trace.failureFingerprint ?? classifyFailureFromEvents(trace.events);
  if (!fingerprint) {
    return undefined;
  }

  return {
    traceId: trace.id,
    fingerprint,
    ...diagnosisCatalog[fingerprint]
  };
}
