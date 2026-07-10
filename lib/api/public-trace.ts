import type { PaymentTrace, TraceEvent } from "@/lib/types/domain";

const redacted = "[redacted]";

export function toPublicTrace(trace: PaymentTrace): PaymentTrace {
  if (trace.mode !== "fiber-rpc") {
    return trace;
  }

  return {
    ...trace,
    senderNode: redactIdentifier(trace.senderNode),
    receiverNode: redactIdentifier(trace.receiverNode),
    events: trace.events.map(redactLiveEvent)
  };
}

export function toPublicTraceSummary(trace: PaymentTrace) {
  const safe = toPublicTrace(trace);
  return {
    id: safe.id,
    status: safe.status,
    amount: safe.amount,
    asset: safe.asset,
    mode: safe.mode,
    fingerprint: safe.failureFingerprint,
    latencyMs: safe.latencyMs,
    createdAt: safe.createdAt,
    senderNode: safe.senderNode,
    receiverNode: safe.receiverNode
  };
}

function redactLiveEvent(event: TraceEvent): TraceEvent {
  if (!event.metadata) return event;
  const metadata = cloneMetadata(event.metadata);

  for (const key of ["pubkey", "paymentHash", "rpcData", "recoveredFrom"]) {
    if (key in metadata) metadata[key] = redacted;
  }

  if (Array.isArray(metadata.channels)) {
    metadata.channels = metadata.channels.map((channel) => {
      if (!channel || typeof channel !== "object") return channel;
      const safe = { ...(channel as Record<string, unknown>) };
      for (const key of ["channelId", "peerPubkey", "localBalance", "remoteBalance"]) {
        if (key in safe) safe[key] = redacted;
      }
      return safe;
    });
  }

  return { ...event, metadata };
}

function cloneMetadata(metadata: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
}

function redactIdentifier(value: string) {
  if (!value || value === "fiber-rpc-node") return value;
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : redacted;
}
