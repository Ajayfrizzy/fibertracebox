import type { FailureFingerprint } from "@/lib/types/domain";

export interface FiberFailureClassification {
  fingerprint: FailureFingerprint;
  reason: string;
}

export function classifyFiberRpcFailure(message: string, data?: unknown): FiberFailureClassification {
  const searchable = `${message} ${stringifySearchable(data)}`.toLowerCase();

  if (
    hasAny(searchable, [
      "invoicecancelled",
      "invoice cancelled",
      "invoice status cancelled",
      "invoice status: cancelled",
      "payment status cancelled",
      "payment status: cancelled",
      "\"status\":\"cancelled\""
    ])
  ) {
    return { fingerprint: "INVOICE_CANCELLED", reason: "FNN reported the invoice or payment session was cancelled." };
  }

  if (
    hasAny(searchable, [
      "posoverflow",
      "failed to parse uint hex",
      "should be less than",
      "amount invalid",
      "invalid amount"
    ])
  ) {
    return { fingerprint: "PAYMENT_AMOUNT_INVALID", reason: "FNN rejected the request because the payment amount was invalid." };
  }

  if (
    hasAny(searchable, ["peer_offline_route_unavailable", "peer offline route unavailable"]) ||
    (searchable.includes("peers_count") && searchable.includes("0x0") && searchable.includes("max outbound liquidity 0"))
  ) {
    return {
      fingerprint: "PEER_OFFLINE_ROUTE_UNAVAILABLE",
      reason: "FNN evidence shows the target peer was unavailable and no usable outbound route/liquidity remained."
    };
  }

  if (hasAny(searchable, ["route not found", "no route", "cannot find route", "path not found", "unable to find path"])) {
    return { fingerprint: "ROUTE_NOT_FOUND", reason: "FNN reported that no route/path could be found." };
  }

  if (hasAny(searchable, ["fee limit", "max fee", "fee too low", "exceeds fee", "fee exceeded", "max_fee_amount", "fee ceiling"])) {
    return { fingerprint: "FEE_LIMIT_TOO_LOW", reason: "FNN reported that the route fee exceeded the configured fee limit." };
  }

  if (
    hasAny(searchable, [
      "insufficient capacity",
      "capacity insufficient",
      "insufficient liquidity",
      "not enough balance",
      "balance not enough",
      "max htlc",
      "amount exceeds",
      "liquidity",
      "outbound amount",
      "not enough capacity"
    ])
  ) {
    return {
      fingerprint: "ROUTE_CAPACITY_INSUFFICIENT",
      reason: "FNN reported a route capacity, liquidity, balance, or max-HTLC constraint."
    };
  }

  if (
    searchable.includes("peer") &&
    hasAny(searchable, ["offline", "not connected", "disconnected", "disconnect", "unreachable", "connect", "unknown peer"])
  ) {
    return { fingerprint: "PEER_OFFLINE", reason: "FNN reported that a required peer was unreachable or disconnected." };
  }

  if (
    searchable.includes("channel") &&
    hasAny(searchable, ["inactive", "disabled", "closed", "closing", "not ready", "not enabled", "unavailable", "not usable"])
  ) {
    return { fingerprint: "CHANNEL_INACTIVE", reason: "FNN reported that a selected channel was not usable for forwarding." };
  }

  if (hasAny(searchable, ["unsupported asset", "asset unsupported", "unsupported currency", "udt unsupported", "unknown udt"])) {
    return { fingerprint: "ASSET_UNSUPPORTED", reason: "FNN reported that the requested asset/currency is unsupported." };
  }

  if (hasAny(searchable, ["timeout", "timed out", "deadline", "expired waiting", "tlc timeout"])) {
    return { fingerprint: "PAYMENT_TIMEOUT", reason: "FNN reported a timeout or deadline while trying to settle." };
  }

  if (hasAny(searchable, ["invoice expired", "invalid invoice", "invoice invalid", "decode invoice", "parse invoice", "bad invoice"])) {
    return { fingerprint: "INVOICE_INVALID", reason: "FNN reported that the invoice could not be parsed or validated." };
  }

  if (hasAny(searchable, ["retry path", "no retry", "retry unavailable", "retry exhausted", "no more retry"])) {
    return { fingerprint: "RETRY_PATH_UNAVAILABLE", reason: "FNN reported that retry planning had no usable alternate path." };
  }

  if (hasAny(searchable, ["invalidparameter", "invalid params", "invalid parameter", "payment session"])) {
    return { fingerprint: "INVOICE_INVALID", reason: "FNN returned an invalid parameter/session error." };
  }

  return { fingerprint: "ROUTE_NOT_FOUND", reason: "FNN returned an unmapped payment failure; route discovery is the safest default." };
}

function hasAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function stringifySearchable(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}
