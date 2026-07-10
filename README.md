# FiberTracebox

Sentry-style tracing, replay, and diagnostics infrastructure for CKB Fiber payments.

FiberTracebox turns Fiber payment attempts into structured traces with timelines, failure fingerprints, replay evidence, and
operator-ready reports. It is built for Fiber node operators, wallet/payment infrastructure teams, and developers who need to
debug routing, liquidity, peer, invoice, fee, and timeout failures.

## Submission

**Selected category:** Category 2: Node, Routing, Cross-Chain, and Diagnostics Infrastructure

**Hosted demo:** https://fibertracebox.online/

**Repository:** https://github.com/Ajayfrizzy/fibertracebox.git

## Project Overview

FiberTracebox is a diagnostics and observability platform for CKB Fiber payments. When a Fiber payment fails or needs
inspection, FiberTracebox records the payment lifecycle, classifies the failure, explains likely causes, recommends fixes, and
exports Markdown or JSON reports.

The target audience is:

- Fiber Network node operators.
- Wallet and payment infrastructure teams.
- Developers integrating Fiber payments.
- Teams that need traceable payment reliability evidence.

## Problem Solved

Fiber payment failures can be difficult to debug because the useful evidence is spread across node RPC output, channel state,
invoice data, payment hashes, graph availability, and logs. A raw failure response often does not explain whether the issue is
routing, liquidity, peer connectivity, channel policy, fee limit, invoice state, or timeout behavior.

FiberTracebox solves this by creating one operator-facing trace for each payment attempt. The trace shows what happened, where
the payment failed, what Fiber evidence was available, which failure fingerprint matched, and which fix should be tried next.

The project relates directly to Fiber Network infrastructure because it integrates with Fiber Network Node JSON-RPC, captures
node and channel evidence, supports invoice dry-runs and explicitly enabled live traces, and provides tooling for diagnosing
Fiber routing and payment reliability issues without exposing private FNN RPC endpoints publicly.

## System Design

### User Flow

1. Open the dashboard at https://fibertracebox.online/.
2. Run a deterministic sandbox scenario or create a Fiber RPC payment trace.
3. Inspect the generated trace timeline and failure stage.
4. Review the fingerprint, diagnosis, likely causes, and suggested fixes.
5. Run Replay-to-Fix for safe simulated replay strategies.
6. Compare failed and successful replay outcomes.
7. Export a Markdown or JSON report for operator handoff.
8. Use the CLI, SDK, or API for the same workflow outside the dashboard.

For a real Fiber failure, apply the recommended change to the test nodes and run Live Verification. FiberTracebox executes a
new server-enforced FNN dry-run, links it to the original trace, and records whether the failure was resolved, unchanged, or
replaced by a different fingerprint.

### Developer Flow

1. Next.js API routes receive trace, scenario, diagnosis, replay, report, health, and stats requests.
2. The adapter layer selects either the deterministic sandbox adapter or the Fiber RPC adapter.
3. The sandbox adapter creates repeatable payment failure traces for demos, tests, and Replay-to-Fix.
4. The Fiber RPC adapter talks to a configured FNN JSON-RPC endpoint and captures live node/payment evidence.
5. The diagnosis engine classifies failure fingerprints and maps them to likely causes and fixes.
6. The Replay-to-Fix engine tests safe strategy changes in sandbox mode and recommends the smallest successful fix.
7. The report generator exports portable Markdown and JSON evidence bundles.
8. Storage uses local memory/cache by default and Supabase PostgreSQL when configured.

## Architecture

- Next.js App Router frontend and API routes.
- React and TypeScript.
- Tailwind CSS dashboard.
- Adapter layer for sandbox mode and optional Fiber RPC mode.
- Diagnosis engine for failure fingerprint classification.
- Replay-to-Fix engine for deterministic replay analysis.
- Markdown and JSON report generator.
- Commander-based CLI.
- TypeScript SDK client.
- Optional Supabase PostgreSQL persistence.
- Vitest coverage for core and API behavior.

## Setup Environment

### Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run start
```

### Hosted CLI Setup

```bash
export FIBERTRACEBOX_API_URL=https://fibertracebox.online
export FIBERTRACEBOX_API_KEY=<your-api-key>
```

The API key is required only for protected write commands when server-side API key protection is enabled. Do not publish the
real key in public docs, screenshots, or submissions.

### Optional Live Fiber RPC Setup

Run FNN separately and keep its JSON-RPC endpoint private. On the FiberTracebox server, configure:

```bash
FIBER_RPC_URL=http://127.0.0.1:<fnn-rpc-port>
FIBER_RPC_ENABLED=true
FIBER_RPC_LIVE_ENABLED=true
FIBER_RPC_ALLOW_LIVE_PAYMENTS=false
```

`FIBER_RPC_ALLOW_LIVE_PAYMENTS=false` keeps live requests as dry-runs. Set it to `true` only when an operator explicitly wants
real live sends.

## Tooling

CKB/Fiber tooling and interfaces:

- Fiber Network Node JSON-RPC.
- `node_info` for node identity, pubkey, version, peer count, and node metadata.
- `list_channels` for channel state, peer pubkeys, balances, enabled state, and liquidity evidence.
- `send_payment` for invoice dry-runs and explicitly enabled live sends.
- `get_payment` for payment status evidence when a payment hash is available.
- Fiber invoice-based payment traces.
- Captured live two-node Fiber evidence.
- Deterministic Fiber-style failure scenarios.

Project tooling:

- Next.js dashboard and API routes.
- TypeScript SDK.
- Commander CLI.
- Supabase schema/migrations.
- Vitest tests.
- Markdown and JSON report exports.

## Current Functionality

FiberTracebox currently supports:

- Dashboard overview for trace health, recent failures, and replay queue.
- Deterministic sandbox scenarios for Fiber payment failures.
- Fiber RPC health probing.
- Live Fiber invoice dry-runs and live-send traces when explicitly enabled.
- Linked Live Verification dry-runs for failed Fiber RPC traces.
- Payment trace recording with lifecycle events.
- Millisecond-level payment timelines.
- Failure fingerprint classification.
- Diagnosis catalog with likely causes and suggested fixes.
- Replay-to-Fix engine for sandbox traces.
- Smallest successful fix recommendation.
- Replay comparison view.
- Trace search, filtering, and sorting.
- Trace detail pages with timeline, diagnosis, live evidence, and reports.
- Markdown and JSON report export.
- API routes for health, traces, scenarios, diagnosis, replay, reports, and stats.
- CLI commands for health checks, scenario runs, live traces, replay, trace listing, and reports.
- TypeScript SDK client.
- Optional Supabase persistence.
- API key protection for hosted write endpoints.

## Sandbox vs Live Fiber RPC Mode

| Capability | Sandbox mode | Live Fiber RPC mode |
| --- | --- | --- |
| Failure scenarios | Deterministic simulations | Real FNN failures when returned by RPC |
| Replay-to-Fix | Safe replay lab | Evidence-only; no automatic live route mutation |
| Node identity | Simulated labels | Real `node_info` values |
| Channel state | Simulated conditions | Real `list_channels` snapshot |
| Graph evidence | Simulated route model | Captured graph/channel availability when available |
| Payment settlement | Simulated | Dry-run by default; live send only when explicitly enabled |
| Reports | Full diagnosis and replay recommendation | Live evidence, fingerprint, provenance, and safety disclosure |

This safety boundary is intentional: live traces are evidence, while sandbox traces are the replay laboratory.

Live Fiber failures are never marked as replay successes. Replay-to-Fix accepts sandbox traces only. A live report can recommend
operator actions, but it cannot claim that an unexecuted amount, route, or liquidity change settled.

Live Verification is the real-node counterpart: after the operator applies a fix, it executes another FNN dry-run and links the
before/after traces. A `verified` outcome means the corrected dry-run returned no failure fingerprint. It proves the route check,
not final payment settlement.

## Standout Feature: Replay-to-Fix

For a failed sandbox trace, FiberTracebox can replay controlled strategy changes:

- same conditions
- reduced amount
- increased outbound capacity
- alternate route
- restored peer
- higher fee limit
- longer timeout
- split payment

It marks the smallest successful fix and includes that recommendation in the report.

## API Reference

```bash
GET  /api/health
POST /api/traces
GET  /api/traces
GET  /api/traces/:id
POST /api/traces/:id/diagnose
POST /api/traces/:id/replay
POST /api/traces/:id/verify
GET  /api/traces/:id/report
GET  /api/scenarios
POST /api/scenarios/run
GET  /api/stats
```

Hosted API base:

```bash
https://fibertracebox.online
```

Write endpoints should be protected with `FIBERTRACEBOX_API_KEY`. Clients can send it as `x-api-key` or
`Authorization: Bearer <key>`.

The server never sends this key to a browser or stores it in a cookie. For a public hackathon demo, enable only the deterministic
sandbox endpoint with `FIBERTRACEBOX_ALLOW_PUBLIC_SANDBOX=true`; live operations remain API-key protected. Rotate any key used by
a deployment predating this boundary.

## CLI Usage

From the project folder:

```bash
npm run cli -- health
npm run cli -- scenario run route-capacity
npm run cli -- scenario run peer-offline
npm run cli -- scenario run payment-timeout
npm run cli -- live <fiber-invoice>
npm run cli -- trace list
npm run cli -- trace inspect <traceId>
npm run cli -- replay <traceId>
npm run cli -- verify <liveTraceId> <fresh-or-corrected-invoice>
npm run cli -- report <traceId> --format markdown
npm run cli -- report <traceId> --format json
npm run demo:judge
```

Optional global binary:

```bash
npm run build:cli
npm link
fibertracebox health
fibertracebox scenario run route-capacity
fibertracebox live <fiber-invoice>
fibertracebox trace list
```

## Demo Flow

1. Open `/dashboard/judge-demo`.
2. Run the `route-capacity` full demo.
3. Open the generated trace and show the lifecycle timeline.
4. Point to the `ROUTE_CAPACITY_INSUFFICIENT` fingerprint and diagnosis.
5. Open Replay Lab and show failed/successful replay strategies.
6. Show the smallest-fix recommendation.
7. Export the Markdown report.
8. Explain the safety boundary: sandbox replay is deterministic and safe; live Fiber RPC captures real evidence without
   mutating live channels unless live payments are explicitly enabled.

## Real Fiber Evidence

The repository includes a curated live payment proof bundle in `payment-testing/`.

This bundle records a real live-send payment on Fiber testnet between two FNN processes operated locally by the project author.
Node1 was the sender and Node2 was the receiver/invoice creator; the author created and funded their channels. The embedded FNN
timestamps place the capture on `2026-07-04` at approximately `14:56 UTC`. The current hosted deployment uses the Node1
environment only and Node2 is not running. Its currently reported pubkey differs from the historical Node1 capture, so the
repository does not claim continuity of the cryptographic node identity.

| Evidence | Value |
| --- | --- |
| Sender Node1 pubkey | `03c93e93abdb37a60f7d4f827cdfef091b418515170f78132928e381c5bf6b298d` |
| Receiver Node2 pubkey | `0360779e54f1b2f380fe6889223ccf240c857bfebacd3c197a8d0124e9ab5d0484` |
| Fiber version | `0.9.0-rc5` |
| Invoice amount | `1 Fibt` (`100,000,000` raw units) |
| Payment hash | `0xf988452f37ad592cf14b42edf017e171dc2bd2ae4958d6b04ff03ee16afc60b9` |
| Sender final payment status | `Success` |
| Receiver invoice status | `Paid` |
| FiberTracebox trace ID | `trace_49a88732-e613-44c1-b65d-60e78c7c1de2` |
| Payment mode | Real live send, not a dry-run |

See `payment-testing/README.md` for the raw FNN evidence file index and `docs/demo-report.md` for a narrative report.

### Evidence Provenance

| Artifact or result | Source | Claim it supports |
| --- | --- | --- |
| `payment-testing/*.json` | Historical real two-node local testnet capture | Node/channel state, successful Node1 sender payment, and paid Node2 receiver invoice |
| `failed-transactions/**/*.json` | Real FNN JSON-RPC failures | Verified classifier inputs |
| Fiber RPC trace timeline | Live configured FNN calls | Observed node, channel, graph, invoice, and payment evidence only |
| Sandbox scenario timeline | Deterministic model | Repeatable failure reproduction for demos and CI |
| Replay-to-Fix results | Deterministic sandbox analysis | Hypothetical condition changes, never proof of live settlement |
| Live Verification result | Linked FNN dry-run after an operator change | Whether the real-node check cleared the original fingerprint |

## Real Failure Corpus

The repository includes raw failed-transaction captures in `failed-transactions/`.

| Fingerprint | Raw FNN evidence |
| --- | --- |
| `ROUTE_CAPACITY_INSUFFICIENT` | `max outbound liquidity 40099999000 is insufficient, required amount: 160000000000` |
| `ROUTE_NOT_FOUND` | `PathFind error: no path found` |
| `FEE_LIMIT_TOO_LOW` | `max_fee_amount is too low for trampoline routing` |
| `INVOICE_CANCELLED` | payment status `Failed` with `failed_error: InvoiceCancelled` |
| `PAYMENT_AMOUNT_INVALID` | `failed to parse uint hex ... PosOverflow` |
| `PEER_OFFLINE_ROUTE_UNAVAILABLE` | node2 RPC unavailable, node1 `peers_count: 0x0`, and no outbound route/liquidity |

These captures are used as the failure corpus for classifier coverage, report provenance, and demo evidence.

## Testing

```bash
npm run test
npm run test:e2e
npm run lint
npm run build
npm audit --omit=dev
```

## Deployment Notes

The hosted demo runs at `https://fibertracebox.online`. The public deployment is intended for the dashboard, deterministic
sandbox traces, Replay-to-Fix, docs, API routes, and report export.

The hosted Fiber RPC adapter connects to the Node1 deployment only. Its current pubkey differs from the historical Node1 capture,
which can occur after reinitializing node storage or keys. The two-node evidence was captured earlier while both local testnet
nodes were running.

Recommended production environment variables:

```bash
FIBERTRACEBOX_PUBLIC_URL=https://fibertracebox.online
FIBERTRACEBOX_API_KEY=<your-fibertracebox-api-key>
FIBERTRACEBOX_REQUIRE_API_KEY=true
FIBERTRACEBOX_ALLOW_PUBLIC_SANDBOX=true
FIBERTRACEBOX_ALLOW_PUBLIC_LIVE_DRY_RUN=true
FIBERTRACEBOX_PUBLIC_LIVE_RATE_LIMIT_MAX=10
FIBERTRACEBOX_TRUST_PROXY=true
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
FIBER_RPC_URL=http://127.0.0.1:<private-node1-rpc-port>
FIBER_RPC_ENABLED=true
FIBER_RPC_LIVE_ENABLED=true
FIBER_RPC_ALLOW_LIVE_PAYMENTS=false
```

Live Fiber RPC should remain private. The hosted demo does not expose a public FNN JSON-RPC endpoint.

`FIBERTRACEBOX_ALLOW_PUBLIC_LIVE_DRY_RUN=true` lets judges submit invoice or pubkey checks without receiving the operator API
key. This path is independently rate-limited, forces `dry_run: true` even if the request asks for a live send, and returns
sanitized evidence. Keep `FIBER_RPC_ALLOW_LIVE_PAYMENTS=false` for the public deployment.

### Security Boundary

Public access covers only deterministic sandbox actions and rate-limited, sanitized FNN dry-runs. Live sends, Live Verification,
complete operator evidence, complete live reports, and other protected write operations require the FiberTracebox API key.

The dashboard includes a masked **Operator Access** control. The project owner can enter the configured API key before a demo;
it is stored only in that browser tab's session storage, the field disappears after unlock, and a Lock action clears it. Never
type or reveal the key while recording. Real sends additionally require `FIBER_RPC_ALLOW_LIVE_PAYMENTS=true` and an explicit
confirmation in the dashboard.

Set `FIBERTRACEBOX_TRUST_PROXY=true` only when Caddy/Nginx overwrites `X-Forwarded-For`. Public trace responses redact live
pubkeys, channel IDs, balances, payment hashes, and raw RPC data. Authenticated API clients receive complete operator evidence.
Use an external rate limiter for multi-process deployments.

## Current Limitations

- Live replay does not mutate real Fiber routes, balances, channels, or payment sessions for safety.
- Live Verification requires an API key and always forces `dry_run: true` on the server.
- Live Verification is implemented and mock-tested, but no completed post-fix live verification is claimed while Node2 is offline.
- Unknown live RPC errors use `UNKNOWN_FIBER_RPC_FAILURE` with low confidence instead of being guessed as route failures.
- Replay-to-Fix is deterministic and intended for reproducible diagnosis, tests, and operator recommendations.
- The hosted demo does not expose a public FNN JSON-RPC endpoint.
- Current graph analysis captures availability, counts, receiver presence when known, and usable captured channels.
- Deeper live route simulation remains roadmap work.

## Future Functionality

- Deeper live Fiber graph and route simulation.
- More advanced liquidity analysis across multi-hop routes.
- Operator alerts and webhooks for repeated failure fingerprints.
- Team dashboards for payment reliability over time.
- Larger real-world FNN failure corpus for classifier coverage.
- Integration with wallets, merchants, LSPs, and payment processors.
- Expanded Live Verification flows with explicit operator approvals and linked evidence comparisons.
- Multi-asset Fiber payment diagnostics.
- Historical reporting for peer reliability, route quality, and payment success rates.
- Hosted user accounts, saved workspaces, and shared trace reports.

## Why This Matters

FiberTracebox is infrastructure, not another payment UI. It gives Fiber developers and operators an observability layer for
payment reliability: trace capture, failure fingerprinting, safe Replay-to-Fix analysis, live FNN evidence, CLI/API/SDK access,
and portable reports that turn scattered node output into an actionable debugging artifact.

## Team

Built by Ajao Oluwaseun for the CKB Fiber Network Infrastructure Hackathon.
