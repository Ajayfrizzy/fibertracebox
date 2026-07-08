import { createId } from "@/lib/core/ids";
import { getScenario, resolveScenarioName } from "@/lib/core/scenarios";
import { runReplayStrategy } from "@/lib/core/replay-engine";
import type {
  FailureFingerprint,
  PaymentAttemptInput,
  PaymentDataAdapter,
  PaymentTrace,
  ReplayResult,
  ReplayStrategy,
  ScenarioName,
  TraceEvent
} from "@/lib/types/domain";

const stageByFingerprint: Record<FailureFingerprint, string> = {
  ROUTE_NOT_FOUND: "route_discovery",
  ROUTE_CAPACITY_INSUFFICIENT: "capacity_probe",
  PEER_OFFLINE: "peer_connect",
  CHANNEL_INACTIVE: "channel_status",
  ASSET_UNSUPPORTED: "asset_negotiation",
  FEE_LIMIT_TOO_LOW: "fee_policy",
  PAYMENT_TIMEOUT: "settlement",
  INVOICE_INVALID: "invoice_validation",
  INVOICE_CANCELLED: "invoice_status",
  PAYMENT_AMOUNT_INVALID: "request_validation",
  LIQUIDITY_IMBALANCE: "liquidity_check",
  RETRY_PATH_UNAVAILABLE: "retry_planner",
  PEER_OFFLINE_ROUTE_UNAVAILABLE: "peer_route_check"
};

const failureMessages: Record<FailureFingerprint, string> = {
  ROUTE_NOT_FOUND: "Route not found after graph search",
  ROUTE_CAPACITY_INSUFFICIENT: "Route capacity insufficient: max forwardable 320 CKB",
  PEER_OFFLINE: "Peer offline during route execution",
  CHANNEL_INACTIVE: "Channel inactive on selected route",
  ASSET_UNSUPPORTED: "Asset unsupported by receiver or route",
  FEE_LIMIT_TOO_LOW: "Fee limit too low for available route",
  PAYMENT_TIMEOUT: "Payment timed out before settlement",
  INVOICE_INVALID: "Invoice invalid before execution",
  INVOICE_CANCELLED: "Invoice cancelled before settlement",
  PAYMENT_AMOUNT_INVALID: "Payment amount invalid before route discovery",
  LIQUIDITY_IMBALANCE: "Directional liquidity imbalance detected",
  RETRY_PATH_UNAVAILABLE: "Retry path unavailable after first failure",
  PEER_OFFLINE_ROUTE_UNAVAILABLE: "Peer offline caused route unavailability"
};

const scenarioLatencies: Record<ScenarioName, number> = {
  "successful-payment": 52,
  "route-not-found": 61,
  "route-capacity": 84,
  "peer-offline": 73,
  "channel-inactive": 68,
  "asset-unsupported": 35,
  "fee-limit-too-low": 48,
  "payment-timeout": 180,
  "liquidity-imbalance": 91,
  "retry-path-unavailable": 116
};

export class SandboxAdapter implements PaymentDataAdapter {
  private traces = new Map<string, PaymentTrace>();

  getMode() {
    return "sandbox" as const;
  }

  async runPaymentAttempt(input: PaymentAttemptInput): Promise<PaymentTrace> {
    const scenarioName = resolveScenarioName(input.scenario);
    const scenario = getScenario(scenarioName);
    const traceId = createId("trace");
    const amount = input.amount ?? scenario.defaultAmount;
    const asset = input.asset ?? scenario.defaultAsset;
    const latencyMs = scenarioLatencies[scenarioName];
    const senderNode = input.senderNode ?? "fiber-devnet-sender-01";
    const receiverNode = input.receiverNode ?? "fiber-devnet-receiver-09";

    const trace: PaymentTrace = {
      id: traceId,
      createdAt: new Date().toISOString(),
      mode: "sandbox",
      senderNode,
      receiverNode,
      amount,
      asset,
      status: scenario.fingerprint ? "failed" : "success",
      latencyMs,
      failureStage: scenario.fingerprint ? stageByFingerprint[scenario.fingerprint] : undefined,
      failureFingerprint: scenario.fingerprint,
      events: scenario.fingerprint
        ? createFailureEvents(traceId, scenario.fingerprint, latencyMs, amount, asset)
        : createSuccessEvents(traceId, latencyMs, amount, asset),
      replayResults: []
    };

    this.traces.set(trace.id, trace);
    return trace;
  }

  async getTrace(id: string): Promise<PaymentTrace | null> {
    return this.traces.get(id) ?? null;
  }

  async runReplay(trace: PaymentTrace, scenario: ReplayStrategy): Promise<ReplayResult> {
    return runReplayStrategy(trace, scenario);
  }
}

function event(
  traceId: string,
  timestampMs: number,
  stage: string,
  message: string,
  severity: TraceEvent["severity"],
  metadata?: Record<string, unknown>
): TraceEvent {
  return {
    id: createId("event"),
    traceId,
    timestampMs,
    stage,
    message,
    severity,
    metadata
  };
}

function createSuccessEvents(traceId: string, latencyMs: number, amount: number, asset: string): TraceEvent[] {
  return [
    event(traceId, 0, "request_received", `Payment attempt created for ${amount} ${asset}`, "info"),
    event(traceId, 9, "invoice_validation", "Invoice validated", "success"),
    event(traceId, 18, "route_discovery", "Route found with 3 hops", "success", { hops: 3 }),
    event(traceId, 31, "fee_policy", "Fee quote accepted within limit", "success"),
    event(traceId, 44, "settlement", "HTLC locked and preimage received", "success"),
    event(traceId, latencyMs, "receipt", "Payment settled successfully", "success")
  ];
}

function createFailureEvents(
  traceId: string,
  fingerprint: FailureFingerprint,
  latencyMs: number,
  amount: number,
  asset: string
): TraceEvent[] {
  const stage = stageByFingerprint[fingerprint];
  const baseEvents: TraceEvent[] = [
    event(traceId, 0, "request_received", `Payment attempt created for ${amount} ${asset}`, "info"),
    event(traceId, 8, "invoice_validation", "Invoice fields parsed", fingerprint === "INVOICE_INVALID" ? "warning" : "success"),
    event(traceId, 18, "route_discovery", "Candidate routes loaded from sandbox graph", "info"),
    event(traceId, Math.max(24, latencyMs - 34), "policy_check", "Route policies evaluated", "info")
  ];

  if (fingerprint === "ROUTE_CAPACITY_INSUFFICIENT") {
    baseEvents.push(event(traceId, 62, "capacity_probe", "Candidate path capacity: 320 CKB available for 500 CKB request", "warning"));
  }

  baseEvents.push(
    event(traceId, latencyMs, stage, failureMessages[fingerprint], "error", {
      fingerprint,
      sandbox: true
    })
  );

  return baseEvents.sort((left, right) => left.timestampMs - right.timestampMs);
}

export const sandboxAdapter = new SandboxAdapter();
