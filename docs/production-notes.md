# Production Notes

## What Works in Sandbox

- Deterministic payment attempts.
- Millisecond lifecycle timelines.
- Structured failure fingerprints.
- Diagnosis, likely causes, and suggested fixes.
- Replay-to-Fix recommendations.
- Markdown and JSON report generation.
- API, dashboard, CLI, SDK, tests, and Supabase schema.
- Live evidence rendering for FNN-backed traces.

## What Is Simulated

- Fiber route discovery.
- Channel liquidity and capacity constraints.
- Peer reachability.
- Fee policy checks.
- Timeout and retry behavior.
- Settlement outcomes.

## Fiber RPC Integration

FiberTracebox can connect to a Fiber Network Node JSON-RPC endpoint for live health checks, channel snapshots, graph
availability checks, and invoice payment attempts.
It uses:

- `node_info` for node identity and version.
- `list_channels` for channel state, balances, peer pubkey, enabled state, and policy fields.
- `graph_nodes` / `graph_channels` when available for graph snapshot counts.
- `parse_invoice` and `get_invoice` when available for invoice metadata and status.
- `send_payment` for invoice dry-runs or explicitly enabled live sends.

Live Fiber RPC failures are classified from sanitized FNN error messages and error data. For example, route-not-found,
capacity/liquidity, peer reachability, fee-limit, invoice, timeout, and retry-path failures are mapped into FiberTracebox
fingerprints so the same report/diagnosis workflow works for real FNN failures and deterministic sandbox traces.

The classifier is covered with table-driven FNN-style samples in the test suite. When new raw failure outputs are captured
from local FNN testing, add their sanitized message/data patterns to those tests before expanding the classifier rules.

Set:

```bash
FIBER_RPC_URL=http://127.0.0.1:<fnn-rpc-port>
FIBER_RPC_ENABLED=true
FIBER_RPC_LIVE_ENABLED=true
FIBER_RPC_ALLOW_LIVE_PAYMENTS=false
```

With `FIBER_RPC_ALLOW_LIVE_PAYMENTS=false`, live requests are sent to FNN with `dry_run: true`. Set it to `true` only when
the operator intentionally wants FiberTracebox to send real payments.

Do not expose the FNN JSON-RPC port directly to the internet. Bind it to localhost or a private network and put FiberTracebox
behind your normal application authentication and API protection.

## Replay Safety Boundary

Replay-to-Fix is deterministic and safe in sandbox mode. In live Fiber mode, FiberTracebox captures real node, channel,
invoice, graph, and payment evidence, but does not mutate live routes or try alternate live conditions. That boundary is
intentional: changing live payment conditions can move funds, alter channel state, or create duplicate payment sessions.

For live traces, the report should be read as operator evidence. For sandbox traces, the report should be read as replayed
diagnosis and smallest-fix analysis.

Reports include an evidence-source section that names the trace source, replay mode, live mutation state, observed RPC
methods, and safety notes. If a dry-run observes an existing successful payment session, the report labels it as existing
session recovery rather than implying FiberTracebox sent a new live payment.

## Live Evidence Scope

Live traces can show real FNN pubkeys, Fiber version, payment hash, payment status, invoice status when visible from the
configured node, channel IDs, `ChannelReady` state, enabled flags, local/remote balances, graph availability, graph counts,
receiver presence when known, and usable captured channel counts. The raw two-node proof bundle for the hackathon lives in
`payment-testing/`.

## What Is Live vs Simulated

| Capability | Sandbox | Live Fiber RPC |
| --- | --- | --- |
| Failure generation | Deterministic model | Real FNN result or error |
| Replay-to-Fix | Simulated safely | Not executed against FNN |
| Channel state | Scenario model | `list_channels` snapshot |
| Graph state | Scenario model | `graph_nodes` / `graph_channels` snapshot when available |
| Payment send | Simulated | Dry-run by default; live-send only with explicit opt-in |

## API Protection

Hosted deployments should set `FIBERTRACEBOX_API_KEY`. Write endpoints accept the key through `x-api-key` or
`Authorization: Bearer <key>`.

In production, write endpoints refuse to run without `FIBERTRACEBOX_API_KEY`. Local demos can opt into the same requirement with
`FIBERTRACEBOX_REQUIRE_API_KEY=true`.

Rate limits are in-memory per app process and configurable with:

- `FIBERTRACEBOX_RATE_LIMIT_MAX`
- `FIBERTRACEBOX_RATE_LIMIT_WINDOW_MS`

Use an external rate limiter such as Nginx, Redis, or the hosting platform's edge controls when running multiple app instances.
