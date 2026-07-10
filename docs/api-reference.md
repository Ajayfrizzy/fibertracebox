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

Authenticated Fiber RPC responses may include live FNN evidence such as node pubkey, version, payment hash, channel snapshots,
graph availability, payment status, and invoice status. Unauthenticated public responses redact sensitive live identifiers,
balances, payment hashes, and raw RPC data.

## `POST /api/traces/:id/diagnose`

Runs failure fingerprint classification and diagnosis for a trace.

Requires write access.

## `POST /api/traces/:id/replay`

Runs Replay-to-Fix strategies and marks the recommended smallest fix. This endpoint accepts sandbox traces only; it rejects
Fiber RPC traces because simulated strategies are not live FNN results.

Requires write access.

## `POST /api/traces/:id/verify`

Verifies an operator change for a failed Fiber RPC trace. It requires an API key and Fiber RPC live mode. The server forces
`dry_run: true`, creates a separate trace from the actual FNN response, and links it to the original failure.

```json
{
  "invoice": "<fresh-or-corrected-fiber-invoice>",
  "amount": 100000000,
  "feeLimit": 200000
}
```

Possible outcomes are `verified`, `still_failing`, `changed_failure`, and `inconclusive`. `verified` means the dry-run cleared the
failure fingerprint; it does not claim final payment settlement.

## `GET /api/traces/:id/report`

Returns both Markdown and JSON report output. Use `?format=markdown` or `?format=json` for a single representation.

Sandbox reports are publicly available only when public sandbox mode is enabled. Complete Fiber RPC reports require API-key
access. Public report generation does not persist output; authenticated report generation may persist it.

Fiber RPC reports include a Live Fiber Evidence section when trace metadata contains FNN node, payment, channel, or graph
evidence.

## `GET /api/scenarios`

Lists deterministic sandbox scenarios.

## `POST /api/scenarios/run`

Runs a deterministic scenario. It requires write access unless `FIBERTRACEBOX_ALLOW_PUBLIC_SANDBOX=true` explicitly enables the
rate-limited public hackathon demo.

```json
{
  "scenario": "peer-offline"
}
```

## `GET /api/stats`

Returns aggregate trace counts, average latency, most common failure fingerprint, and replay success rate.
