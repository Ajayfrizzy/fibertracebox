import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";
import { normalizeReplayResultsForTrace } from "@/lib/core/replay-engine";
import type { Diagnosis, PaymentTrace, ReplayResult, TraceEvent } from "@/lib/types/domain";

const memory = {
  traces: new Map<string, PaymentTrace>(),
  diagnoses: new Map<string, Diagnosis>(),
  reports: new Map<string, { traceId: string; markdown: string; json: unknown }>()
};

const localStorePath = path.join(process.cwd(), ".next", "cache", "fibertracebox-memory-store.json");
let localStoreLoaded = false;
let localStoreWrite = Promise.resolve();

interface LocalStore {
  traces: PaymentTrace[];
  diagnoses: Diagnosis[];
  reports: Array<{ traceId: string; markdown: string; json: unknown }>;
}

function toTraceRow(trace: PaymentTrace) {
  return {
    id: trace.id,
    created_at: trace.createdAt,
    mode: trace.mode,
    sender_node: trace.senderNode,
    receiver_node: trace.receiverNode,
    amount: trace.amount,
    asset: trace.asset,
    status: trace.status,
    latency_ms: trace.latencyMs,
    failure_stage: trace.failureStage ?? null,
    failure_fingerprint: trace.failureFingerprint ?? null
  };
}

function fromTraceRows(trace: Record<string, unknown>, events: TraceEvent[] = [], replayResults: ReplayResult[] = []): PaymentTrace {
  return {
    id: String(trace.id),
    createdAt: String(trace.created_at),
    mode: trace.mode as PaymentTrace["mode"],
    senderNode: String(trace.sender_node),
    receiverNode: String(trace.receiver_node),
    amount: Number(trace.amount),
    asset: String(trace.asset),
    status: trace.status as PaymentTrace["status"],
    latencyMs: Number(trace.latency_ms),
    failureStage: trace.failure_stage ? String(trace.failure_stage) : undefined,
    failureFingerprint: trace.failure_fingerprint as PaymentTrace["failureFingerprint"],
    events,
    replayResults
  };
}

function toEventRow(event: TraceEvent) {
  return {
    id: event.id,
    trace_id: event.traceId,
    timestamp_ms: event.timestampMs,
    stage: event.stage,
    message: event.message,
    severity: event.severity,
    metadata: event.metadata ?? null
  };
}

function fromEventRow(row: Record<string, unknown>): TraceEvent {
  return {
    id: String(row.id),
    traceId: String(row.trace_id),
    timestampMs: Number(row.timestamp_ms),
    stage: String(row.stage),
    message: String(row.message),
    severity: row.severity as TraceEvent["severity"],
    metadata: (row.metadata as Record<string, unknown> | null) ?? undefined
  };
}

function toReplayRow(result: ReplayResult) {
  return {
    id: result.id,
    trace_id: result.traceId,
    scenario: result.scenario,
    changed_condition: result.changedCondition,
    result: result.result,
    latency_ms: result.latencyMs,
    explanation: result.explanation,
    recommended: result.recommended
  };
}

function fromReplayRow(row: Record<string, unknown>): ReplayResult {
  return {
    id: String(row.id),
    traceId: String(row.trace_id),
    scenario: row.scenario as ReplayResult["scenario"],
    changedCondition: String(row.changed_condition),
    result: row.result as ReplayResult["result"],
    latencyMs: Number(row.latency_ms),
    explanation: String(row.explanation),
    recommended: Boolean(row.recommended)
  };
}

export function getDatabaseMode() {
  return hasSupabaseServerConfig() ? "supabase" : "memory";
}

export async function saveTrace(trace: PaymentTrace): Promise<PaymentTrace> {
  await loadLocalStore();
  memory.traces.set(trace.id, trace);

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    await persistLocalStore();
    return trace;
  }

  const { error: traceError } = await supabase.from("traces").upsert(toTraceRow(trace));
  if (traceError) throw traceError;

  if (trace.events.length) {
    const { error: eventsError } = await supabase.from("trace_events").upsert(trace.events.map(toEventRow));
    if (eventsError) throw eventsError;
  }

  return trace;
}

export async function listTraces(): Promise<PaymentTrace[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    await loadLocalStore();
    return Array.from(memory.traces.values())
      .map(normalizeTrace)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  const { data, error } = await supabase
    .from("traces")
    .select("*, trace_events(*), replay_results(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const events = Array.isArray(record.trace_events)
      ? (record.trace_events as Record<string, unknown>[]).map(fromEventRow).sort((left, right) => left.timestampMs - right.timestampMs)
      : [];
    const replayResults = Array.isArray(record.replay_results)
      ? (record.replay_results as Record<string, unknown>[]).map(fromReplayRow)
      : [];

    return normalizeTrace(fromTraceRows(record, events, replayResults));
  });
}

export async function getTrace(id: string): Promise<PaymentTrace | null> {
  await loadLocalStore();
  const localTrace = memory.traces.get(id);

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return localTrace ? normalizeTrace(localTrace) : null;
  }

  const [{ data: trace, error: traceError }, { data: events, error: eventError }, { data: replays, error: replayError }] =
    await Promise.all([
      supabase.from("traces").select("*").eq("id", id).single(),
      supabase.from("trace_events").select("*").eq("trace_id", id).order("timestamp_ms", { ascending: true }),
      supabase.from("replay_results").select("*").eq("trace_id", id).order("created_at", { ascending: true })
    ]);

  if (traceError) {
    if (traceError.code === "PGRST116") return localTrace ?? null;
    throw traceError;
  }
  if (eventError) throw eventError;
  if (replayError) throw replayError;

  return normalizeTrace(fromTraceRows(trace, (events ?? []).map(fromEventRow), (replays ?? []).map(fromReplayRow)));
}

export async function saveDiagnosis(traceId: string, diagnosis: Diagnosis): Promise<Diagnosis> {
  await loadLocalStore();
  memory.diagnoses.set(traceId, diagnosis);

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    await persistLocalStore();
    return diagnosis;
  }

  const { error } = await supabase.from("diagnoses").upsert({
    trace_id: traceId,
    fingerprint: diagnosis.fingerprint,
    title: diagnosis.title,
    explanation: diagnosis.explanation,
    likely_causes: diagnosis.likelyCauses,
    suggested_fixes: diagnosis.suggestedFixes,
    confidence: diagnosis.confidence,
    replay_strategies: diagnosis.replayStrategies
  });
  if (error) throw error;

  return diagnosis;
}

export async function getDiagnosis(traceId: string): Promise<Diagnosis | undefined> {
  await loadLocalStore();
  const local = memory.diagnoses.get(traceId);
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return local;
  }

  const { data, error } = await supabase.from("diagnoses").select("*").eq("trace_id", traceId).maybeSingle();
  if (error) throw error;
  if (!data) return local;

  return {
    traceId,
    fingerprint: data.fingerprint,
    title: data.title,
    explanation: data.explanation,
    likelyCauses: data.likely_causes,
    suggestedFixes: data.suggested_fixes,
    confidence: data.confidence,
    replayStrategies: data.replay_strategies
  };
}

export async function saveReplayResults(traceId: string, results: ReplayResult[]): Promise<ReplayResult[]> {
  await loadLocalStore();
  const trace = memory.traces.get(traceId);
  if (trace) {
    memory.traces.set(traceId, {
      ...trace,
      status: trace.status === "failed" ? "replayed" : trace.status,
      replayResults: results
    });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    await persistLocalStore();
    return results;
  }

  const { error: rpcError } = await supabase.rpc("replace_replay_results", {
    p_trace_id: traceId,
    p_results: results.map(toReplayRow)
  });

  if (!rpcError) {
    return results;
  }

  if (rpcError.code !== "PGRST202") {
    throw rpcError;
  }

  const { error: deleteError } = await supabase.from("replay_results").delete().eq("trace_id", traceId);
  if (deleteError) throw deleteError;

  const { error: replayError } = await supabase.from("replay_results").insert(results.map(toReplayRow));
  if (replayError) throw replayError;

  const { error: traceError } = await supabase.from("traces").update({ status: "replayed" }).eq("id", traceId).eq("status", "failed");
  if (traceError) throw traceError;

  return results;
}

export async function saveReport(traceId: string, markdown: string, json: unknown): Promise<void> {
  await loadLocalStore();
  memory.reports.set(traceId, { traceId, markdown, json });

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    await persistLocalStore();
    return;
  }

  const { error } = await supabase.from("reports").upsert({
    trace_id: traceId,
    markdown,
    json
  });
  if (error) throw error;
}

async function loadLocalStore() {
  if (localStoreLoaded || hasSupabaseServerConfig()) {
    return;
  }

  localStoreLoaded = true;

  try {
    const raw = await readFile(localStorePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalStore>;

    for (const trace of parsed.traces ?? []) {
      memory.traces.set(trace.id, trace);
    }
    for (const diagnosis of parsed.diagnoses ?? []) {
      if (diagnosis.traceId) {
        memory.diagnoses.set(diagnosis.traceId, diagnosis);
      }
    }
    for (const report of parsed.reports ?? []) {
      memory.reports.set(report.traceId, report);
    }
  } catch (error) {
    if (!isMissingFileError(error)) {
      console.error("Failed to load local FiberTracebox store", error);
    }
  }
}

async function persistLocalStore() {
  if (hasSupabaseServerConfig()) {
    return;
  }

  const store: LocalStore = {
    traces: Array.from(memory.traces.values()),
    diagnoses: Array.from(memory.diagnoses.values()),
    reports: Array.from(memory.reports.values())
  };

  const write = async () => {
    await mkdir(path.dirname(localStorePath), { recursive: true });
    const temporaryPath = `${localStorePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(store, null, 2));
    await rename(temporaryPath, localStorePath);
  };

  localStoreWrite = localStoreWrite.then(write, write);
  await localStoreWrite;
}

function isMissingFileError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT");
}

function normalizeTrace(trace: PaymentTrace): PaymentTrace {
  const normalizedReplayResults = normalizeReplayResultsForTrace(trace);
  const traceWithNormalizedReplays = normalizedReplayResults === trace.replayResults
    ? trace
    : { ...trace, replayResults: normalizedReplayResults };

  if (trace.status !== "failed") {
    return traceWithNormalizedReplays;
  }

  const duplicateSuccessEvent = trace.events.find(
    (event) => event.message.toLowerCase().includes("payment session already exists") && event.message.toLowerCase().includes("status: success")
  );

  if (!duplicateSuccessEvent) {
    return traceWithNormalizedReplays;
  }

  return {
    ...traceWithNormalizedReplays,
    status: "success",
    failureStage: undefined,
    failureFingerprint: undefined,
    events: trace.events.map((event) =>
      event.id === duplicateSuccessEvent.id
        ? {
            ...event,
            stage: "payment_result",
            message: "Existing Fiber payment session is Success",
            severity: "success"
          }
        : event
    )
  };
}
