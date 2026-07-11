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

The FNN JSON-RPC port must not be exposed directly to the internet. It should be bound to localhost or a private network, with
FiberTracebox placed behind the deployment's application authentication and API protection.

## Replay Safety Boundary

Replay-to-Fix executes deterministic strategies in sandbox mode. In live Fiber mode, it converts the diagnosed real failure into
ranked suggested fixes and verification steps, but does not mutate live routes or try alternate live conditions automatically.
That boundary is intentional: changing live payment conditions can move funds, alter channel state, or create duplicate payment
sessions.

For live traces, suggested fixes remain recommendations until a linked FNN Live Verification dry-run records the outcome. For
sandbox traces, the report contains executed deterministic replay results and smallest-fix analysis.

## Live Verification

Failed Fiber RPC traces expose a Live Verification form. After applying the recommended change to test-node state, submit a fresh
invoice or keysend target. The protected `POST /api/traces/:id/verify` endpoint forces `dry_run: true`, records a new FNN trace,
and links both traces with one of four outcomes:

- `verified`: no failure fingerprint returned; the route check passed, but settlement was not attempted.
- `still_failing`: the same fingerprint returned.
- `changed_failure`: FNN passed the original failure point and returned a different fingerprint.
- `inconclusive`: the response did not provide enough evidence.

Verification links are included in Markdown and JSON reports.

The current hosted deployment uses the Node1 environment only, although its current pubkey differs from the historical Node1
capture. The real Node1-to-Node2 settlement and failure bundles were captured
earlier on Fiber testnet while both locally operated project nodes were running. Node2 is currently offline, so the submission does
not claim a completed post-fix Live Verification run; that workflow is implemented and covered with mock FNN integration tests.

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
| Replay-to-Fix | Strategies executed in deterministic model | Ranked recommendations; outcomes require FNN Live Verification |
| Channel state | Scenario model | `list_channels` snapshot |
| Graph state | Scenario model | `graph_nodes` / `graph_channels` snapshot when available |
| Payment send | Simulated | Dry-run by default; live-send only with explicit opt-in |

## API Protection

Hosted deployments should set `FIBERTRACEBOX_API_KEY`. Write endpoints accept the key through `x-api-key` or
`Authorization: Bearer <key>`.

In production, write endpoints refuse to run without `FIBERTRACEBOX_API_KEY`. Local demos can opt into the same requirement with
`FIBERTRACEBOX_REQUIRE_API_KEY=true`.

The API key is never copied into a browser cookie. `FIBERTRACEBOX_ALLOW_PUBLIC_SANDBOX=true` permits evaluators to run
deterministic scenarios without authentication. This exception does not authorize Fiber RPC sends or complete live reports. Public live trace
responses redact node/channel/payment identifiers, balances, and raw RPC error data.

Public evaluator-facing FNN checks can be enabled separately with `FIBERTRACEBOX_ALLOW_PUBLIC_LIVE_DRY_RUN=true`. The route forces
`dry_run: true` regardless of the request body, applies `FIBERTRACEBOX_PUBLIC_LIVE_RATE_LIMIT_MAX` (default 10 per minute), and
sanitizes its response. This does not grant replay, verification, report, or live-send authorization.

Live sends, Live Verification, complete operator evidence, complete live reports, and protected write operations require the API
key. The operator API key must not be distributed to evaluators or embedded in client-side code.

The masked **Operator Access** control supports authenticated dashboard testing. The key remains in session storage for the
current browser tab and is removed by the **Lock** action. Unlocking does not itself enable fund movement: the server must also
set `FIBER_RPC_ALLOW_LIVE_PAYMENTS=true`, the operator must disable the dry-run control, and the browser requires confirmation.

Rate limits are in-memory per app process and configurable with:

- `FIBERTRACEBOX_RATE_LIMIT_MAX`
- `FIBERTRACEBOX_RATE_LIMIT_WINDOW_MS`

Use an external rate limiter such as Nginx, Redis, or the hosting platform's edge controls when running multiple app instances.
Only set `FIBERTRACEBOX_TRUST_PROXY=true` when that proxy overwrites forwarding headers from clients.

## Failure Classification Boundary

Only verified message/data patterns receive a specific live fingerprint. Unmatched FNN errors use
`UNKNOWN_FIBER_RPC_FAILURE` with low confidence. Add a sanitized real capture and classifier test before promoting a new pattern.
