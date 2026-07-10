export type PaymentMode = "sandbox" | "fiber-rpc";

export type PaymentStatus = "success" | "pending" | "failed" | "replayed";

export type TraceSeverity = "info" | "warning" | "error" | "success";

export type FailureFingerprint =
  | "ROUTE_NOT_FOUND"
  | "ROUTE_CAPACITY_INSUFFICIENT"
  | "PEER_OFFLINE"
  | "CHANNEL_INACTIVE"
  | "ASSET_UNSUPPORTED"
  | "FEE_LIMIT_TOO_LOW"
  | "PAYMENT_TIMEOUT"
  | "INVOICE_INVALID"
  | "INVOICE_CANCELLED"
  | "PAYMENT_AMOUNT_INVALID"
  | "LIQUIDITY_IMBALANCE"
  | "RETRY_PATH_UNAVAILABLE"
  | "PEER_OFFLINE_ROUTE_UNAVAILABLE"
  | "UNKNOWN_FIBER_RPC_FAILURE";

export type ReplayStrategy =
  | "same_conditions"
  | "reduced_amount_80"
  | "reduced_amount_64"
  | "smaller_amount"
  | "increased_outbound_capacity"
  | "alternate_route"
  | "restored_peer"
  | "retry_after_delay"
  | "higher_fee_limit"
  | "longer_timeout"
  | "split_payment"
  | "supported_asset"
  | "asset_supported_route"
  | "fresh_invoice"
  | "correct_amount";

export type Confidence = "low" | "medium" | "high";

export type ScenarioName =
  | "successful-payment"
  | "route-not-found"
  | "route-capacity"
  | "peer-offline"
  | "channel-inactive"
  | "asset-unsupported"
  | "fee-limit-too-low"
  | "payment-timeout"
  | "liquidity-imbalance"
  | "retry-path-unavailable";

export interface TraceEvent {
  id: string;
  traceId: string;
  timestampMs: number;
  stage: string;
  message: string;
  severity: TraceSeverity;
  metadata?: Record<string, unknown>;
}

export interface ReplayResult {
  id: string;
  traceId: string;
  scenario: ReplayStrategy;
  changedCondition: string;
  result: "success" | "failed";
  latencyMs: number;
  explanation: string;
  recommended: boolean;
}

export interface ReplayRecommendation {
  title: string;
  summary: string;
  primaryAction: string;
  operatorAction?: string;
  confidence: Confidence;
  primaryResult?: ReplayResult;
  alternatives: ReplayResult[];
}

export interface PaymentTrace {
  id: string;
  createdAt: string;
  mode: PaymentMode;
  senderNode: string;
  receiverNode: string;
  amount: number;
  asset: string;
  status: PaymentStatus;
  latencyMs: number;
  failureStage?: string;
  failureFingerprint?: FailureFingerprint;
  events: TraceEvent[];
  replayResults: ReplayResult[];
}

export type LiveVerificationOutcome = "verified" | "still_failing" | "changed_failure" | "inconclusive";

export interface LiveVerificationResult {
  originalTraceId: string;
  verificationTrace: PaymentTrace;
  outcome: LiveVerificationOutcome;
  summary: string;
  originalFingerprint?: FailureFingerprint;
  verificationFingerprint?: FailureFingerprint;
}

export interface Diagnosis {
  traceId?: string;
  fingerprint: FailureFingerprint;
  title: string;
  explanation: string;
  likelyCauses: string[];
  suggestedFixes: string[];
  confidence: Confidence;
  replayStrategies: ReplayStrategy[];
}

export interface PaymentAttemptInput {
  scenario?: ScenarioName;
  senderNode?: string;
  receiverNode?: string;
  amount?: number;
  asset?: string;
  feeLimit?: number;
  timeoutMs?: number;
  invoice?: string;
  targetPubkey?: string;
  keysend?: boolean;
  dryRun?: boolean;
  maxParts?: number;
}

export interface TraceWithAnalysis {
  trace: PaymentTrace;
  diagnosis?: Diagnosis;
  reportStatus: "ready" | "not_applicable";
}

export interface TraceReport {
  markdown: string;
  json: {
    trace: PaymentTrace;
    diagnosis?: Diagnosis;
    smallestFix?: ReplayResult;
    recommendation?: ReplayRecommendation;
    liveEvidence?: unknown;
    liveVerifications: Array<{
      verificationTraceId: string;
      outcome: LiveVerificationOutcome;
      summary: string;
      originalFingerprint?: FailureFingerprint;
      verificationFingerprint?: FailureFingerprint;
    }>;
    evidenceProvenance: {
      traceSource: PaymentMode;
      replayMode: string;
      liveMutation: "yes" | "no";
      rpcMethods: string[];
      observedFailure?: {
        stage?: string;
        fingerprint?: FailureFingerprint;
        rpcMethod?: string;
        rpcCode?: number;
        classificationReason?: string;
      };
      notes: string[];
    };
    suggestedNextActions: string[];
    disclosure: string;
  };
}

export interface Stats {
  totalTraces: number;
  successCount: number;
  failedCount: number;
  averageLatency: number;
  mostCommonFailureFingerprint: FailureFingerprint | null;
  replaySuccessRate: number;
}

export interface ScenarioDefinition {
  name: ScenarioName;
  label: string;
  fingerprint?: FailureFingerprint;
  description: string;
  defaultAmount: number;
  defaultAsset: string;
}

export interface PaymentDataAdapter {
  runPaymentAttempt(input: PaymentAttemptInput): Promise<PaymentTrace>;
  getTrace(id: string): Promise<PaymentTrace | null>;
  runReplay(trace: PaymentTrace, scenario: ReplayStrategy): Promise<ReplayResult>;
  getMode(): PaymentMode;
}
