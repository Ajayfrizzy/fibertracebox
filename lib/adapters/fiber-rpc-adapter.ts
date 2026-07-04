import { publicApiError } from "@/lib/api/http";
import { createId } from "@/lib/core/ids";
import type {
  FailureFingerprint,
  PaymentAttemptInput,
  PaymentDataAdapter,
  PaymentStatus,
  PaymentTrace,
  ReplayResult,
  ReplayStrategy,
  TraceEvent,
  TraceSeverity
} from "@/lib/types/domain";

interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: number;
  result: T;
}

interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure;

interface FiberNodeInfo {
  version?: string;
  commit_hash?: string;
  pubkey?: string;
  node_name?: string;
  addresses?: string[];
  chain_hash?: string;
  features?: string[];
  peers_count?: string | number;
}

interface FiberListChannelsResult {
  channels?: FiberChannelResult[];
}

interface FiberChannelResult {
  channel_id?: string;
  enabled?: boolean;
  failure_detail?: string | null;
  funding_udt_type_script?: unknown;
  is_acceptor?: boolean;
  is_one_way?: boolean;
  is_public?: boolean;
  local_balance?: string;
  offered_tlc_balance?: string;
  pending_tlcs?: unknown[];
  pubkey?: string;
  received_tlc_balance?: string;
  remote_balance?: string;
  state?: {
    state_name?: string;
  };
  tlc_expiry_delta?: string;
  tlc_fee_proportional_millionths?: string;
}

interface FiberPaymentResult {
  payment_hash?: string;
  status?: string;
  created_at?: number;
  last_updated_at?: number;
  failed_error?: string | null;
  fee?: number | string;
  routers?: unknown[];
}

interface FiberInvoiceResult {
  invoice?: {
    amount?: string | number;
    currency?: string;
    data?: {
      payment_hash?: string;
      attrs?: Array<Record<string, string>>;
    };
  };
  invoice_address?: string;
  status?: string;
}

interface FiberRpcSnapshot {
  nodeInfo?: FiberNodeInfo;
  channelCount?: number;
  channels?: LiveFiberChannelSnapshot[];
  graph?: LiveFiberGraphSnapshot;
}

export interface FiberRpcProbeResult extends FiberRpcSnapshot {
  ok: boolean;
  error?: string;
}

interface LiveFiberChannelSnapshot {
  channelId?: string;
  stateName?: string;
  enabled?: boolean;
  localBalance?: string;
  remoteBalance?: string;
  peerPubkey?: string;
  isPublic?: boolean;
  isAcceptor?: boolean;
  failureDetail?: string | null;
  tlcExpiryDelta?: string;
  tlcFeeProportionalMillionths?: string;
}

interface LiveFiberGraphSnapshot {
  attempted: boolean;
  available: boolean;
  nodeCount?: number;
  channelCount?: number;
  errors?: string[];
}

class FiberRpcClient {
  private nextId = 1;

  constructor(
    private readonly rpcUrl: string,
    private readonly headers: Record<string, string> = {}
  ) {}

  async call<T>(method: string, params?: unknown): Promise<T> {
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.headers
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: this.nextId++,
        method,
        ...(params === undefined ? {} : { params: [params] })
      })
    });

    const payload = (await response.json().catch(() => undefined)) as JsonRpcResponse<T> | undefined;

    if (!response.ok) {
      throw new Error(`FNN RPC HTTP ${response.status}`);
    }

    if (!payload) {
      throw new Error("FNN RPC returned invalid JSON");
    }

    if ("error" in payload) {
      throw new Error(payload.error.message || `FNN RPC error ${payload.error.code}`);
    }

    return payload.result;
  }
}

export class FiberRpcAdapter implements PaymentDataAdapter {
  private readonly client: FiberRpcClient;

  constructor(
    private readonly rpcUrl = process.env.FIBER_RPC_URL,
    private readonly allowLivePayments = process.env.FIBER_RPC_ALLOW_LIVE_PAYMENTS === "true"
  ) {
    if (!rpcUrl) {
      throw publicApiError("Fiber RPC URL is not configured", 503);
    }

    this.client = new FiberRpcClient(rpcUrl, fiberRpcHeaders());
  }

  getMode() {
    return "fiber-rpc" as const;
  }

  async probe(): Promise<FiberRpcProbeResult> {
    try {
      const snapshot = await this.snapshot();
      return { ok: true, ...snapshot };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "FNN RPC probe failed" };
    }
  }

  async runPaymentAttempt(input: PaymentAttemptInput): Promise<PaymentTrace> {
    if (!input.invoice && !input.targetPubkey) {
      throw publicApiError("Live Fiber RPC mode requires an invoice or targetPubkey", 400);
    }

    if (input.keysend && !input.amount) {
      throw publicApiError("Keysend payments require amount", 400);
    }

    const dryRun = input.dryRun ?? !this.allowLivePayments;
    const startedAt = Date.now();
    const traceId = createId("trace");
    const events: TraceEvent[] = [];

    appendEvent(events, traceId, 0, "request_received", dryRun ? "Live Fiber payment dry-run requested" : "Live Fiber payment requested", "info", {
      dryRun,
      adapter: "fnn-json-rpc"
    });

    try {
      const snapshot = await this.snapshot();
      appendEvent(events, traceId, Date.now() - startedAt, "node_info", "Connected to Fiber Network Node RPC", "success", {
        pubkey: snapshot.nodeInfo?.pubkey,
        version: snapshot.nodeInfo?.version,
        nodeName: snapshot.nodeInfo?.node_name,
        channelCount: snapshot.channelCount,
        peersCount: readNodeInfoCount(snapshot.nodeInfo, "peers_count"),
        features: snapshot.nodeInfo?.features
      });

      if (snapshot.channels?.length) {
        appendEvent(events, traceId, Date.now() - startedAt, "channel_snapshot", `Captured ${snapshot.channels.length} live Fiber channels`, "success", {
          channelCount: snapshot.channels.length,
          channels: snapshot.channels
        });
      }

      if (snapshot.graph) {
        appendEvent(
          events,
          traceId,
          Date.now() - startedAt,
          "graph_snapshot",
          snapshot.graph.available ? "Captured live Fiber graph snapshot" : "Fiber graph snapshot unavailable",
          snapshot.graph.available ? "success" : "warning",
          { ...snapshot.graph }
        );
      }

      const invoice = input.invoice ? await this.readInvoice(input.invoice) : undefined;
      const result = await this.client.call<FiberPaymentResult>("send_payment", buildSendPaymentParams(input, dryRun));
      const invoiceStatus = invoice?.paymentHash ? await this.readInvoiceStatus(invoice.paymentHash) : undefined;
      const latencyMs = Math.max(1, Date.now() - startedAt);
      const status = normalizePaymentStatus(result.status);
      const failedError = result.failed_error?.trim();

      appendEvent(
        events,
        traceId,
        latencyMs,
        dryRun ? "route_dry_run" : "payment_result",
        paymentResultMessage(result, dryRun),
        status === "failed" ? "error" : status === "success" ? "success" : "info",
        {
          paymentHash: result.payment_hash,
          status: result.status,
          fee: result.fee,
          failedError,
          invoiceStatus,
          dryRun,
          routers: Array.isArray(result.routers) ? result.routers.length : undefined
        }
      );

      const fingerprint = status === "failed" ? classifyFiberFailure(failedError || result.status || "payment failed") : undefined;
      const amount = input.amount ?? invoice?.amount ?? 0;
      const asset = input.asset ?? invoice?.currency ?? "CKB";

      return {
        id: traceId,
        createdAt: new Date(startedAt).toISOString(),
        mode: "fiber-rpc",
        senderNode: snapshot.nodeInfo?.pubkey ?? snapshot.nodeInfo?.node_name ?? "fiber-rpc-node",
        receiverNode: input.targetPubkey ?? invoice?.payeePublicKey ?? invoiceReceiverLabel(input.invoice),
        amount,
        asset,
        status,
        latencyMs,
        failureStage: fingerprint ? (dryRun ? "route_dry_run" : "payment_result") : undefined,
        failureFingerprint: fingerprint,
        events,
        replayResults: []
      };
    } catch (error) {
      const latencyMs = Math.max(1, Date.now() - startedAt);
      const message = error instanceof Error ? error.message : "FNN RPC payment failed";
      const recovered = await this.tryRecoverExistingPayment(input, events, traceId, startedAt, message);

      if (recovered) {
        return recovered;
      }

      const fingerprint = classifyFiberFailure(message);

      appendEvent(events, traceId, latencyMs, "fiber_rpc_error", message, "error", { fingerprint });

      return {
        id: traceId,
        createdAt: new Date(startedAt).toISOString(),
        mode: "fiber-rpc",
        senderNode: "fiber-rpc-node",
        receiverNode: input.targetPubkey ?? invoiceReceiverLabel(input.invoice),
        amount: input.amount ?? 0,
        asset: input.asset ?? "CKB",
        status: "failed",
        latencyMs,
        failureStage: "fiber_rpc_error",
        failureFingerprint: fingerprint,
        events,
        replayResults: []
      };
    }
  }

  async getTrace(_id: string): Promise<PaymentTrace | null> {
    return null;
  }

  async runReplay(trace: PaymentTrace, scenario: ReplayStrategy): Promise<ReplayResult> {
    return {
      id: createId("replay"),
      traceId: trace.id,
      scenario,
      changedCondition: "Live Fiber replay disabled",
      result: "failed",
      latencyMs: 0,
      explanation:
        "FiberTracebox does not run simulated replay changes against live Fiber nodes because those actions may move funds or mutate channel state.",
      recommended: false
    };
  }

  private async snapshot(): Promise<FiberRpcSnapshot> {
    const [nodeInfo, channels, graph] = await Promise.all([
      this.client.call<FiberNodeInfo>("node_info"),
      this.client.call<FiberListChannelsResult>("list_channels", {}).catch(() => undefined),
      this.graphSnapshot()
    ]);
    const normalizedChannels = Array.isArray(channels?.channels) ? channels.channels.map(toLiveFiberChannelSnapshot) : [];

    return {
      nodeInfo,
      channelCount: Array.isArray(channels?.channels) ? channels.channels.length : undefined,
      channels: normalizedChannels,
      graph
    };
  }

  private async readInvoice(invoiceAddress: string): Promise<ParsedFiberInvoice | undefined> {
    try {
      const parsed = await this.client.call<FiberInvoiceResult>("parse_invoice", { invoice: invoiceAddress });
      return parseFiberInvoice(parsed);
    } catch {
      return undefined;
    }
  }

  private async readInvoiceStatus(paymentHash: string): Promise<string | undefined> {
    try {
      const invoice = await this.client.call<FiberInvoiceResult>("get_invoice", { payment_hash: paymentHash });
      return invoice.status;
    } catch {
      return undefined;
    }
  }

  private async graphSnapshot(): Promise<LiveFiberGraphSnapshot> {
    const errors: string[] = [];
    const [nodes, channels] = await Promise.all([
      this.client.call<unknown>("graph_nodes", {}).catch((error) => {
        errors.push(`graph_nodes: ${safeErrorMessage(error)}`);
        return undefined;
      }),
      this.client.call<unknown>("graph_channels", {}).catch((error) => {
        errors.push(`graph_channels: ${safeErrorMessage(error)}`);
        return undefined;
      })
    ]);
    const nodeCount = countGraphItems(nodes, ["nodes", "graph_nodes"]);
    const channelCount = countGraphItems(channels, ["channels", "graph_channels"]);

    return {
      attempted: true,
      available: errors.length === 0,
      ...(nodeCount !== undefined ? { nodeCount } : {}),
      ...(channelCount !== undefined ? { channelCount } : {}),
      ...(errors.length ? { errors } : {})
    };
  }

  private async tryRecoverExistingPayment(
    input: PaymentAttemptInput,
    events: TraceEvent[],
    traceId: string,
    startedAt: number,
    originalMessage: string
  ): Promise<PaymentTrace | undefined> {
    const paymentHash = extractPaymentHash(originalMessage) ?? (input.invoice ? (await this.readInvoice(input.invoice))?.paymentHash : undefined);
    if (!paymentHash) {
      return undefined;
    }

    try {
      const [snapshot, invoice, payment] = await Promise.all([
        this.snapshot().catch(() => undefined),
        input.invoice ? this.readInvoice(input.invoice) : Promise.resolve(undefined),
        this.client.call<FiberPaymentResult>("get_payment", { payment_hash: paymentHash })
      ]);
      const invoiceStatus = paymentHash ? await this.readInvoiceStatus(paymentHash) : undefined;
      const status = normalizePaymentStatus(payment.status);
      const latencyMs = Math.max(1, Date.now() - startedAt);

      appendEvent(
        events,
        traceId,
        latencyMs,
        "payment_result",
        `Existing Fiber payment session is ${payment.status ?? status}`,
        status === "failed" ? "error" : status === "success" ? "success" : "info",
        {
          paymentHash,
          status: payment.status,
          fee: payment.fee,
          failedError: payment.failed_error,
          invoiceStatus,
          dryRun: input.dryRun ?? !this.allowLivePayments,
          recoveredFrom: originalMessage
        }
      );

      const failedError = payment.failed_error?.trim();
      const fingerprint = status === "failed" ? classifyFiberFailure(failedError || payment.status || originalMessage) : undefined;

      return {
        id: traceId,
        createdAt: new Date(startedAt).toISOString(),
        mode: "fiber-rpc",
        senderNode: snapshot?.nodeInfo?.pubkey ?? snapshot?.nodeInfo?.node_name ?? "fiber-rpc-node",
        receiverNode: input.targetPubkey ?? invoice?.payeePublicKey ?? invoiceReceiverLabel(input.invoice),
        amount: input.amount ?? invoice?.amount ?? 0,
        asset: input.asset ?? invoice?.currency ?? "CKB",
        status,
        latencyMs,
        failureStage: fingerprint ? "payment_result" : undefined,
        failureFingerprint: fingerprint,
        events,
        replayResults: []
      };
    } catch {
      const duplicateStatus = extractExistingSessionStatus(originalMessage);
      if (!duplicateStatus) {
        return undefined;
      }

      const invoice = input.invoice ? await this.readInvoice(input.invoice) : undefined;
      const invoiceStatus = paymentHash ? await this.readInvoiceStatus(paymentHash) : undefined;
      const status = normalizePaymentStatus(duplicateStatus);
      const latencyMs = Math.max(1, Date.now() - startedAt);

      appendEvent(
        events,
        traceId,
        latencyMs,
        "payment_result",
        `Existing Fiber payment session is ${duplicateStatus}`,
        status === "failed" ? "error" : status === "success" ? "success" : "info",
        { paymentHash, status: duplicateStatus, invoiceStatus, dryRun: input.dryRun ?? !this.allowLivePayments, recoveredFrom: originalMessage }
      );

      return {
        id: traceId,
        createdAt: new Date(startedAt).toISOString(),
        mode: "fiber-rpc",
        senderNode: "fiber-rpc-node",
        receiverNode: input.targetPubkey ?? invoice?.payeePublicKey ?? invoiceReceiverLabel(input.invoice),
        amount: input.amount ?? invoice?.amount ?? 0,
        asset: input.asset ?? invoice?.currency ?? "CKB",
        status,
        latencyMs,
        failureStage: status === "failed" ? "payment_result" : undefined,
        failureFingerprint: status === "failed" ? classifyFiberFailure(originalMessage) : undefined,
        events,
        replayResults: []
      };
    }
  }
}

export async function probeFiberRpc(): Promise<FiberRpcProbeResult | undefined> {
  if (!process.env.FIBER_RPC_URL) {
    return undefined;
  }

  return new FiberRpcAdapter(process.env.FIBER_RPC_URL).probe();
}

function buildSendPaymentParams(input: PaymentAttemptInput, dryRun: boolean) {
  const params: Record<string, unknown> = {
    dry_run: dryRun
  };

  if (input.invoice) params.invoice = input.invoice;
  if (input.targetPubkey) params.target_pubkey = input.targetPubkey;
  if (input.amount !== undefined) params.amount = toFiberHexAmount(input.amount, "amount");
  if (input.feeLimit !== undefined) params.max_fee_amount = toFiberHexAmount(input.feeLimit, "feeLimit");

  return params;
}

function toFiberHexAmount(value: number, field: string): string {
  if (!Number.isInteger(value)) {
    throw publicApiError(`Fiber RPC ${field} must be a whole Shannon value`, 400);
  }

  return `0x${BigInt(value).toString(16)}`;
}

function normalizePaymentStatus(value: string | undefined): PaymentStatus {
  const normalized = value?.toLowerCase();
  if (normalized === "success") return "success";
  if (normalized === "created" || normalized === "pending" || normalized === "inflight" || normalized === "in_flight") return "pending";
  if (normalized === "failed") return "failed";
  return "pending";
}

function paymentResultMessage(result: FiberPaymentResult, dryRun: boolean) {
  if (result.failed_error) {
    return result.failed_error;
  }

  if (dryRun) {
    return `FNN dry-run returned ${result.status ?? "unknown"} for payment ${result.payment_hash ?? "unknown"}`;
  }

  return `FNN returned ${result.status ?? "unknown"} for payment ${result.payment_hash ?? "unknown"}`;
}

function classifyFiberFailure(message: string): FailureFingerprint {
  const searchable = message.toLowerCase();

  if (searchable.includes("route") && (searchable.includes("not found") || searchable.includes("no route"))) return "ROUTE_NOT_FOUND";
  if (searchable.includes("capacity") || searchable.includes("liquidity") || searchable.includes("balance")) return "ROUTE_CAPACITY_INSUFFICIENT";
  if (searchable.includes("peer") && (searchable.includes("offline") || searchable.includes("disconnect") || searchable.includes("connect"))) {
    return "PEER_OFFLINE";
  }
  if (searchable.includes("channel") && (searchable.includes("inactive") || searchable.includes("disabled") || searchable.includes("closed"))) {
    return "CHANNEL_INACTIVE";
  }
  if (searchable.includes("fee")) return "FEE_LIMIT_TOO_LOW";
  if (searchable.includes("timeout") || searchable.includes("timed out")) return "PAYMENT_TIMEOUT";
  if (searchable.includes("invoice")) return "INVOICE_INVALID";
  if (searchable.includes("retry")) return "RETRY_PATH_UNAVAILABLE";
  if (searchable.includes("invalidparameter") || searchable.includes("invalid params") || searchable.includes("payment session")) return "INVOICE_INVALID";

  return "ROUTE_NOT_FOUND";
}

interface ParsedFiberInvoice {
  amount?: number;
  currency?: string;
  paymentHash?: string;
  payeePublicKey?: string;
}

function parseFiberInvoice(result: FiberInvoiceResult | undefined): ParsedFiberInvoice | undefined {
  const invoice = result?.invoice;
  if (!invoice) {
    return undefined;
  }

  const attrs = invoice.data?.attrs ?? [];
  const payeePublicKey = attrs.find((attr) => typeof attr.payee_public_key === "string")?.payee_public_key;

  return {
    amount: parseHexNumber(invoice.amount),
    currency: invoice.currency,
    paymentHash: invoice.data?.payment_hash,
    payeePublicKey
  };
}

function toLiveFiberChannelSnapshot(channel: FiberChannelResult): LiveFiberChannelSnapshot {
  return {
    channelId: channel.channel_id,
    stateName: channel.state?.state_name,
    enabled: channel.enabled,
    localBalance: channel.local_balance,
    remoteBalance: channel.remote_balance,
    peerPubkey: channel.pubkey,
    isPublic: channel.is_public,
    isAcceptor: channel.is_acceptor,
    failureDetail: channel.failure_detail,
    tlcExpiryDelta: channel.tlc_expiry_delta,
    tlcFeeProportionalMillionths: channel.tlc_fee_proportional_millionths
  };
}

function parseHexNumber(value: string | number | undefined): number | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return undefined;
  }

  const parsed = value.startsWith("0x") ? Number(BigInt(value)) : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractPaymentHash(message: string): string | undefined {
  return message.match(/0x[a-fA-F0-9]{64}/)?.[0];
}

function extractExistingSessionStatus(message: string): string | undefined {
  return message.match(/payment session status:\s*([A-Za-z_]+)/i)?.[1];
}

function countGraphItems(value: unknown, keys: string[]): number | undefined {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key].length;
    }
  }

  return undefined;
}

function readNodeInfoCount(nodeInfo: FiberNodeInfo | undefined, key: keyof FiberNodeInfo): string | number | undefined {
  const value = nodeInfo?.[key];
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/https?:\/\/\S+/g, "[redacted-url]");
  }

  return "unavailable";
}

function appendEvent(
  events: TraceEvent[],
  traceId: string,
  timestampMs: number,
  stage: string,
  message: string,
  severity: TraceSeverity,
  metadata?: Record<string, unknown>
) {
  events.push({
    id: createId("event"),
    traceId,
    timestampMs,
    stage,
    message,
    severity,
    metadata
  });
}

function invoiceReceiverLabel(invoice: string | undefined) {
  if (!invoice) {
    return "fiber-invoice-target";
  }

  return `${invoice.slice(0, 12)}...${invoice.slice(-6)}`;
}

function fiberRpcHeaders() {
  const headers: Record<string, string> = {};

  if (process.env.FIBER_RPC_BEARER_TOKEN) {
    headers.authorization = `Bearer ${process.env.FIBER_RPC_BEARER_TOKEN}`;
  }

  if (process.env.FIBER_RPC_API_KEY) {
    headers["x-api-key"] = process.env.FIBER_RPC_API_KEY;
  }

  return headers;
}
