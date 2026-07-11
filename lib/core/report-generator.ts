import { diagnoseTrace } from "@/lib/core/diagnosis-engine";
import { formatRawTraceAmount, formatTraceAmount } from "@/lib/core/amount-format";
import { extractLiveFiberEvidence, formatEvidenceAmount } from "@/lib/core/live-fiber-evidence";
import { createReplayRecommendation, recommendSmallestFix } from "@/lib/core/replay-engine";
import { createLiveFixRecommendations } from "@/lib/core/live-fix-recommendations";
import type { PaymentTrace, TraceReport } from "@/lib/types/domain";

export function generateReport(trace: PaymentTrace): TraceReport {
  const diagnosis = diagnoseTrace(trace);
  const smallestFix = recommendSmallestFix(trace.replayResults);
  const recommendation = createReplayRecommendation(trace, trace.replayResults);
  const liveFixRecommendations = createLiveFixRecommendations(trace, diagnosis);
  const suggestedNextActions =
    trace.status === "success" && !diagnosis
      ? ["No failure action is required. Archive this trace/report as live payment evidence."]
      : trace.mode === "fiber-rpc"
        ? [
            ...(diagnosis?.suggestedFixes ?? []),
            "Apply the operator change on the test nodes, then run Live Verification with a fresh or corrected FNN dry-run."
          ]
      : [
          ...(diagnosis?.suggestedFixes ?? []),
          recommendation?.primaryAction ??
            (smallestFix ? `Prioritize replay strategy: ${smallestFix.changedCondition}.` : "Run Replay-to-Fix before acting on the trace."),
          ...(recommendation?.operatorAction ? [recommendation.operatorAction] : [])
        ];
  const disclosure =
    trace.mode === "sandbox"
      ? "Sandbox mode: deterministic simulated Fiber payment conditions are used for repeatable diagnostics."
      : "Fiber RPC mode: live FNN evidence is captured from node, channel, graph, invoice, and payment RPC calls. Live Verification links a corrected FNN dry-run to the original failure without sending funds.";
  const rawAmount = formatRawTraceAmount(trace);
  const liveEvidence = extractLiveFiberEvidence(trace);
  const evidenceProvenance = buildEvidenceProvenance(trace, liveEvidence);
  const liveVerifications = extractLiveVerifications(trace);

  const eventRows = trace.events
    .map((event) => `| ${event.timestampMs} | ${event.stage} | ${event.severity} | ${event.message} |`)
    .join("\n");
  const replayRows = trace.replayResults.length
    ? trace.replayResults
        .map(
          (result) =>
            `| ${result.scenario} | ${result.changedCondition} | ${result.result} | ${result.latencyMs} | ${result.recommended ? "yes" : "no"} |`
        )
        .join("\n")
    : trace.mode === "fiber-rpc"
      ? "| Not executed | Live safety boundary | Suggested changes require FNN Live Verification | - | - |"
      : "| Not run | Not run | Not run | - | - |";
  const liveEvidenceSection = liveEvidence ? renderLiveEvidenceMarkdown(liveEvidence) : "";

  const markdown = `# FiberTracebox Report

## Trace Summary

- Trace ID: ${trace.id}
- Payment status: ${trace.status}
- Amount: ${formatTraceAmount(trace)}${rawAmount ? ` (${rawAmount})` : ""}
- Sender: ${trace.senderNode}
- Receiver: ${trace.receiverNode}
- Mode: ${trace.mode}
- Latency: ${trace.latencyMs}ms
- Failure time: ${trace.failureFingerprint ? `${trace.latencyMs}ms` : "not applicable"}
- Failure stage: ${trace.failureStage ?? "not applicable"}
- Failure fingerprint: ${trace.failureFingerprint ?? "not applicable"}
${liveEvidence?.payment?.paymentHash ? `- Payment hash: ${liveEvidence.payment.paymentHash}` : ""}

## Root Cause

${diagnosis ? diagnosis.explanation : "No failure diagnosis is required for this trace."}

${liveEvidenceSection}

${renderLiveVerifications(liveVerifications)}

## Evidence Source

- Trace source: ${evidenceProvenance.traceSource}
- Replay mode: ${evidenceProvenance.replayMode}
- Live mutation: ${evidenceProvenance.liveMutation}
- RPC methods observed: ${evidenceProvenance.rpcMethods.length ? evidenceProvenance.rpcMethods.join(", ") : "not applicable"}
${renderObservedFailure(evidenceProvenance.observedFailure)}
${evidenceProvenance.notes.map((note) => `- ${note}`).join("\n")}

## Timeline

| ms | stage | severity | message |
| --- | --- | --- | --- |
${eventRows}

## Replay Results

| strategy | changed condition | result | latency ms | recommended |
| --- | --- | --- | --- | --- |
${replayRows}

${renderLiveFixRecommendations(liveFixRecommendations)}

## ${trace.mode === "fiber-rpc" ? "Replay-to-Fix Recommendation" : "Smallest-Fix Recommendation"}

${recommendation ? `${recommendation.title}: ${recommendation.primaryAction}` : smallestFix ? `${smallestFix.changedCondition}: ${smallestFix.explanation}` : liveFixRecommendations[0] ? `${liveFixRecommendations[0].title} This is a suggested live fix; verify it with a new server-enforced FNN dry-run.` : trace.status === "success" ? "No replay fix is required for a successful trace." : "No verified fix recommendation is available for this failure."}

${recommendation?.operatorAction ?? ""}

Confidence: ${recommendation?.confidence ?? diagnosis?.confidence ?? "not applicable"}

## Suggested Next Actions

${suggestedNextActions.map((action) => `- ${action}`).join("\n")}

## Mode Disclosure

${disclosure}
`;

  return {
    markdown,
    json: {
      trace,
      diagnosis,
      smallestFix,
      recommendation,
      liveFixRecommendations,
      liveEvidence,
      liveVerifications,
      evidenceProvenance,
      suggestedNextActions,
      disclosure
    }
  };
}

function renderLiveFixRecommendations(recommendations: TraceReport["json"]["liveFixRecommendations"]) {
  if (!recommendations.length) return "";
  const rows = recommendations
    .map((item) => `| ${item.recommended ? "primary" : "alternative"} | ${item.strategy ?? "operator_action"} | ${item.title} | ${item.verificationStep} |`)
    .join("\n");
  return `## Live Replay-to-Fix Recommendations

These recommendations are derived from the observed FNN failure. They were not executed against the node.

| priority | strategy | suggested change | verification step |
| --- | --- | --- | --- |
${rows}`;
}

function extractLiveVerifications(trace: PaymentTrace): TraceReport["json"]["liveVerifications"] {
  return trace.events.flatMap((event) => {
    if (event.stage !== "live_verification") return [];
    const verificationTraceId = event.metadata?.verificationTraceId;
    const outcome = event.metadata?.verificationOutcome;
    if (typeof verificationTraceId !== "string" || !isVerificationOutcome(outcome)) return [];
    return [{
      verificationTraceId,
      outcome,
      summary: event.message,
      originalFingerprint: typeof event.metadata?.originalFingerprint === "string" ? event.metadata.originalFingerprint as PaymentTrace["failureFingerprint"] : undefined,
      verificationFingerprint: typeof event.metadata?.verificationFingerprint === "string" ? event.metadata.verificationFingerprint as PaymentTrace["failureFingerprint"] : undefined
    }];
  });
}

function renderLiveVerifications(verifications: TraceReport["json"]["liveVerifications"]) {
  if (!verifications.length) return "";
  const rows = verifications.map((item) => `| ${item.verificationTraceId} | ${item.outcome} | ${item.verificationFingerprint ?? "none"} | ${item.summary} |`).join("\n");
  return `## Live Verification\n\n| verification trace | outcome | resulting fingerprint | evidence summary |\n| --- | --- | --- | --- |\n${rows}`;
}

function isVerificationOutcome(value: unknown): value is "verified" | "still_failing" | "changed_failure" | "inconclusive" {
  return value === "verified" || value === "still_failing" || value === "changed_failure" || value === "inconclusive";
}

function renderLiveEvidenceMarkdown(liveEvidence: NonNullable<ReturnType<typeof extractLiveFiberEvidence>>) {
  const nodeLines = [
    liveEvidence.node?.pubkey ? `- FNN node pubkey: ${liveEvidence.node.pubkey}` : undefined,
    liveEvidence.node?.version ? `- FNN version: ${liveEvidence.node.version}` : undefined,
    liveEvidence.node?.channelCount !== undefined ? `- FNN channel count: ${liveEvidence.node.channelCount}` : undefined,
    liveEvidence.node?.peersCount !== undefined ? `- FNN peers count: ${liveEvidence.node.peersCount}` : undefined,
    liveEvidence.payment?.paymentHash ? `- Payment hash: ${liveEvidence.payment.paymentHash}` : undefined,
    liveEvidence.payment?.status ? `- FNN payment status: ${liveEvidence.payment.status}` : undefined,
    liveEvidence.payment?.invoiceStatus ? `- Invoice status observed by FNN: ${liveEvidence.payment.invoiceStatus}` : undefined,
    liveEvidence.payment?.fee !== undefined ? `- Fee: ${formatEvidenceAmount(liveEvidence.payment.fee)}` : undefined,
    liveEvidence.payment?.dryRun !== undefined ? `- Dry run requested: ${liveEvidence.payment.dryRun ? "yes" : "no"}` : undefined,
    liveEvidence.payment?.dryRun
      ? "- Live mutation: no new payment should be sent unless the existing session is observed through FNN RPC."
      : undefined,
    liveEvidence.payment?.recoveredFrom
      ? "- Existing session recovery: FiberTracebox observed a prior payment session instead of creating a new one."
      : undefined,
    liveEvidence.error?.rpcMethod ? `- Failed RPC method: ${liveEvidence.error.rpcMethod}` : undefined,
    liveEvidence.error?.rpcCode !== undefined ? `- FNN error code: ${liveEvidence.error.rpcCode}` : undefined,
    liveEvidence.error?.fingerprint ? `- Classified failure: ${liveEvidence.error.fingerprint}` : undefined,
    liveEvidence.error?.classificationReason ? `- Classification reason: ${liveEvidence.error.classificationReason}` : undefined,
    liveEvidence.error?.paymentHash ? `- Error payment hash: ${liveEvidence.error.paymentHash}` : undefined,
    liveEvidence.error?.message ? `- FNN error message: ${liveEvidence.error.message}` : undefined
  ].filter(Boolean);

  const channelRows = liveEvidence.channels.length
    ? liveEvidence.channels
        .map(
          (channel) =>
            `| ${channel.channelId ?? "unknown"} | ${channel.stateName ?? "unknown"} | ${
              channel.enabled === undefined ? "unknown" : channel.enabled ? "true" : "false"
            } | ${formatEvidenceAmount(channel.localBalance)} | ${formatEvidenceAmount(channel.remoteBalance)} | ${
              channel.peerPubkey ?? "unknown"
            } |`
        )
        .join("\n")
    : "| Not captured | - | - | - | - | - |";

  const graphLines = liveEvidence.graph
    ? [
        `- Graph snapshot attempted: ${liveEvidence.graph.attempted ? "yes" : "no"}`,
        `- Graph snapshot available: ${liveEvidence.graph.available ? "yes" : "no"}`,
        liveEvidence.graph.nodeCount !== undefined ? `- Graph node count: ${liveEvidence.graph.nodeCount}` : undefined,
        liveEvidence.graph.channelCount !== undefined ? `- Graph channel count: ${liveEvidence.graph.channelCount}` : undefined,
        liveEvidence.graph.receiverPresent !== undefined
          ? `- Receiver present in graph: ${liveEvidence.graph.receiverPresent ? "yes" : "no"}`
          : undefined,
        liveEvidence.graph.usableChannelCount !== undefined
          ? `- Usable captured ChannelReady channels: ${liveEvidence.graph.usableChannelCount}`
          : undefined,
        liveEvidence.graph.publicChannelCount !== undefined ? `- Public captured channels: ${liveEvidence.graph.publicChannelCount}` : undefined,
        liveEvidence.graph.errors?.length ? `- Graph notes: ${liveEvidence.graph.errors.join("; ")}` : undefined
      ].filter(Boolean)
    : [];

  return `## Live Fiber Evidence

${nodeLines.length ? nodeLines.join("\n") : "- Live node/payment metadata was not captured."}

| channel id | state | enabled | local balance | remote balance | peer pubkey |
| --- | --- | --- | --- | --- | --- |
${channelRows}

${graphLines.length ? `### Graph Snapshot\n\n${graphLines.join("\n")}` : ""}
`;
}

function buildEvidenceProvenance(
  trace: PaymentTrace,
  liveEvidence: NonNullable<ReturnType<typeof extractLiveFiberEvidence>> | undefined
) {
  const dryRunRequested = readDryRunRequested(trace);
  const liveMutation =
    trace.mode === "fiber-rpc" && liveEvidence?.payment?.dryRun === false && dryRunRequested !== true ? ("yes" as const) : ("no" as const);
  const replayMode =
    trace.mode === "sandbox"
      ? "deterministic sandbox replay"
      : "live fix recommendations with changes verified only through a separate FNN dry-run";
  const notes =
    trace.mode === "sandbox"
      ? [
          "Sandbox events are deterministic and safe for repeatable demos and CI.",
          "Replay-to-Fix changes simulated route conditions without moving funds."
        ]
      : [
          "Fiber RPC events come from configured FNN JSON-RPC calls.",
          liveEvidence?.payment?.dryRun || dryRunRequested
            ? "Dry-run mode requests route/payment checks without intentionally sending a new live payment."
            : "Live send mode was enabled for this trace.",
          "Live Replay-to-Fix recommendations are not execution evidence until a linked Live Verification dry-run is recorded.",
          "Live Verification uses a new server-enforced dry-run and never represents sandbox replay as live evidence."
        ];

  return {
    traceSource: trace.mode,
    replayMode,
    liveMutation,
    rpcMethods: liveEvidence?.rpcMethods ?? [],
    observedFailure:
      trace.status === "failed"
        ? {
            stage: trace.failureStage,
            fingerprint: trace.failureFingerprint,
            rpcMethod: liveEvidence?.error?.rpcMethod,
            rpcCode: liveEvidence?.error?.rpcCode,
            classificationReason: liveEvidence?.error?.classificationReason
          }
        : undefined,
    notes
  };
}

function readDryRunRequested(trace: PaymentTrace): boolean | undefined {
  for (const event of trace.events) {
    const value = event.metadata?.dryRun;
    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function renderObservedFailure(observedFailure: ReturnType<typeof buildEvidenceProvenance>["observedFailure"]) {
  if (!observedFailure) {
    return "- Observed failure: not applicable";
  }

  return [
    `- Observed failure stage: ${observedFailure.stage ?? "unknown"}`,
    `- Observed failure fingerprint: ${observedFailure.fingerprint ?? "unknown"}`,
    observedFailure.rpcMethod ? `- Failed RPC method: ${observedFailure.rpcMethod}` : undefined,
    observedFailure.rpcCode !== undefined ? `- FNN error code: ${observedFailure.rpcCode}` : undefined,
    observedFailure.classificationReason ? `- Classification reason: ${observedFailure.classificationReason}` : undefined
  ]
    .filter(Boolean)
    .join("\n");
}
