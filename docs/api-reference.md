# API Reference

## `GET /api/health`

Returns app status, database mode, payment adapter mode, and Fiber RPC enablement.

## `POST /api/traces`

Creates a manual trace or sandbox trace.

Hosted write requests require `x-api-key` or `Authorization: Bearer <key>` when `FIBERTRACEBOX_API_KEY` is configured.

```json
{
  "scenario": "route-capacity",
  "amount": 500,
  "asset": "CKB"
}
```

## `GET /api/traces`

Lists traces with ID, status, amount, asset, fingerprint, latency, sender, receiver, and creation time.

## `GET /api/traces/:id`

Returns the full trace with lifecycle events, diagnosis, replay results, and report status.

For Fiber RPC traces, lifecycle event metadata may include live FNN evidence such as node pubkey, version, payment hash,
channel snapshots, graph availability, payment status, and invoice status when available.

## `POST /api/traces/:id/diagnose`

Runs failure fingerprint classification and diagnosis for a trace.

Requires write access.

## `POST /api/traces/:id/replay`

Runs Replay-to-Fix strategies and marks the recommended smallest fix.

Requires write access.

## `GET /api/traces/:id/report`

Returns both Markdown and JSON report output. Use `?format=markdown` or `?format=json` for a single representation.

Requires write access because report generation persists report output.

Fiber RPC reports include a Live Fiber Evidence section when trace metadata contains FNN node, payment, channel, or graph
evidence.

## `GET /api/scenarios`

Lists deterministic sandbox scenarios.

## `POST /api/scenarios/run`

Runs a deterministic scenario:

Requires write access.

```json
{
  "scenario": "peer-offline"
}
```

## `GET /api/stats`

Returns aggregate trace counts, average latency, most common failure fingerprint, and replay success rate.
