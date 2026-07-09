import type { PaymentTrace, TraceEvent } from "@/lib/types/domain";

export interface LiveFiberChannelEvidence {
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

export interface LiveFiberGraphEvidence {
  attempted: boolean;
  available: boolean;
  nodeCount?: number;
  channelCount?: number;
  receiverPresent?: boolean;
  usableChannelCount?: number;
  publicChannelCount?: number;
  errors?: string[];
}

export interface LiveFiberPaymentEvidence {
  paymentHash?: string;
  status?: string;
  fee?: string | number;
  failedError?: string | null;
  invoiceStatus?: string;
  dryRun?: boolean;
  rpcMethod?: string;
  invoiceRpcMethod?: string;
  recoveredFrom?: string;
}

export interface LiveFiberErrorEvidence {
  rpcMethod?: string;
  rpcCode?: number;
  message?: string;
  fingerprint?: string;
  classificationReason?: string;
  paymentHash?: string;
  rpcData?: unknown;
}

export interface LiveFiberEvidence {
  node?: {
    pubkey?: string;
    version?: string;
    nodeName?: string | null;
    channelCount?: number;
    peersCount?: string | number;
    features?: string[];
  };
  payment?: LiveFiberPaymentEvidence;
  error?: LiveFiberErrorEvidence;
  channels: LiveFiberChannelEvidence[];
  graph?: LiveFiberGraphEvidence;
  rpcMethods: string[];
}

export function extractLiveFiberEvidence(trace: PaymentTrace): LiveFiberEvidence | undefined {
  if (trace.mode !== "fiber-rpc") {
    return undefined;
  }

  const nodeEvent = findEvent(trace.events, "node_info");
  const channelEvent = findEvent(trace.events, "channel_snapshot");
  const graphEvent = findEvent(trace.events, "graph_snapshot");
  const paymentEvent = trace.events.find(
    (event) => event.stage === "payment_result" || event.stage === "route_dry_run" || event.stage === "invoice_status"
  );
  const errorEvent = findEvent(trace.events, "fiber_rpc_error");

  const channels = readArray(channelEvent?.metadata?.channels)
    .map(readChannel)
    .filter((channel) => Object.keys(channel).length > 0);
  const graph = readGraph(graphEvent?.metadata);
  const payment = readPayment(paymentEvent?.metadata);
  const error = readError(errorEvent);
  const node = nodeEvent?.metadata
    ? {
        pubkey: readString(nodeEvent.metadata.pubkey),
        version: readString(nodeEvent.metadata.version),
        nodeName: readNullableString(nodeEvent.metadata.nodeName),
        channelCount: readNumber(nodeEvent.metadata.channelCount),
        peersCount: readStringOrNumber(nodeEvent.metadata.peersCount),
        features: readStringArray(nodeEvent.metadata.features)
      }
    : undefined;

  if (!node && !payment && !error && !channels.length && !graph) {
    return undefined;
  }

  return {
    node,
    payment,
    error,
    channels,
    graph,
    rpcMethods: extractRpcMethods(trace.events)
  };
}

export function formatEvidenceAmount(value: string | number | undefined): string {
  if (value === undefined || value === "") {
    return "unknown";
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  if (value.startsWith("0x")) {
    try {
      return `${value} (${BigInt(value).toLocaleString()} raw units)`;
    } catch {
      return value;
    }
  }

  return value;
}

function findEvent(events: TraceEvent[], stage: string) {
  return events.find((event) => event.stage === stage);
}

function readChannel(value: unknown): LiveFiberChannelEvidence {
  if (!value || typeof value !== "object") {
    return {};
  }

  const record = value as Record<string, unknown>;
  return {
    channelId: readString(record.channelId),
    stateName: readString(record.stateName),
    enabled: readBoolean(record.enabled),
    localBalance: readString(record.localBalance),
    remoteBalance: readString(record.remoteBalance),
    peerPubkey: readString(record.peerPubkey),
    isPublic: readBoolean(record.isPublic),
    isAcceptor: readBoolean(record.isAcceptor),
    failureDetail: readNullableString(record.failureDetail),
    tlcExpiryDelta: readString(record.tlcExpiryDelta),
    tlcFeeProportionalMillionths: readString(record.tlcFeeProportionalMillionths)
  };
}

function readGraph(metadata: Record<string, unknown> | undefined): LiveFiberGraphEvidence | undefined {
  if (!metadata) {
    return undefined;
  }

  return {
    attempted: readBoolean(metadata.attempted) ?? false,
    available: readBoolean(metadata.available) ?? false,
    nodeCount: readNumber(metadata.nodeCount),
    channelCount: readNumber(metadata.channelCount),
    receiverPresent: readBoolean(metadata.receiverPresent),
    usableChannelCount: readNumber(metadata.usableChannelCount),
    publicChannelCount: readNumber(metadata.publicChannelCount),
    errors: readStringArray(metadata.errors)
  };
}

function readPayment(metadata: Record<string, unknown> | undefined): LiveFiberPaymentEvidence | undefined {
  if (!metadata) {
    return undefined;
  }

  const payment: LiveFiberPaymentEvidence = {
    paymentHash: readString(metadata.paymentHash),
    status: readString(metadata.status),
    fee: readStringOrNumber(metadata.fee),
    failedError: readNullableString(metadata.failedError),
    invoiceStatus: readString(metadata.invoiceStatus),
    dryRun: readBoolean(metadata.dryRun),
    rpcMethod: readString(metadata.rpcMethod),
    invoiceRpcMethod: readString(metadata.invoiceRpcMethod),
    recoveredFrom: readString(metadata.recoveredFrom)
  };

  return Object.values(payment).some((value) => value !== undefined) ? payment : undefined;
}

function readError(event: TraceEvent | undefined): LiveFiberErrorEvidence | undefined {
  if (!event?.metadata) {
    return undefined;
  }

  const error: LiveFiberErrorEvidence = {
    rpcMethod: readString(event.metadata.rpcMethod),
    rpcCode: readNumber(event.metadata.rpcCode),
    message: event.message,
    fingerprint: readString(event.metadata.fingerprint),
    classificationReason: readString(event.metadata.classificationReason),
    paymentHash: readString(event.metadata.paymentHash),
    rpcData: event.metadata.rpcData
  };

  return Object.values(error).some((value) => value !== undefined) ? error : undefined;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === "string");
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length ? value : undefined;
}

function readNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  return readString(value);
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStringOrNumber(value: unknown): string | number | undefined {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function extractRpcMethods(events: TraceEvent[]): string[] {
  const methods = new Set<string>();

  for (const event of events) {
    const rpcMethod = readString(event.metadata?.rpcMethod);
    if (rpcMethod) {
      methods.add(rpcMethod);
    }

    const invoiceRpcMethod = readString(event.metadata?.invoiceRpcMethod);
    if (invoiceRpcMethod) {
      methods.add(invoiceRpcMethod);
    }

    if (event.stage === "graph_snapshot") {
      methods.add("graph_nodes");
      methods.add("graph_channels");
    }
  }

  return Array.from(methods);
}
