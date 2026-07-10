# FiberTracebox

Sentry-style tracing, replay, and diagnostics infrastructure for CKB Fiber payments.

FiberTracebox turns Fiber payment attempts into structured traces with timelines, failure fingerprints, replay evidence, and
operator-ready reports. It is built for Fiber node operators, wallet/payment infrastructure teams, and developers who need to
debug routing, liquidity, peer, invoice, fee, and timeout failures.

## Submission

**Selected category:** Category 2: Node, Routing, Cross-Chain, and Diagnostics Infrastructure

**Hosted demo:** https://fibertracebox.online/

**Repository:** https://github.com/Ajayfrizzy/fibertracebox.git

**Dashboard screenshots:** https://drive.google.com/drive/folders/1Mkt6u65gf5GFoBmF6sOC99IjfMMvO5Ll?usp=drive_link

**Demo walkthrough video:** https://drive.google.com/drive/folders/19O9uawG__a2WE1diRS9USbl7Dgo0Wxi1?usp=sharing

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

See `payment-testing/README.md` for the raw FNN evidence file index and `docs/demo-report.md` for a narrative report.

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
npm run build
```

## Deployment Notes

The hosted demo runs at `https://fibertracebox.online`. The public deployment is intended for the dashboard, deterministic
sandbox traces, Replay-to-Fix, docs, API routes, and report export.

Recommended production environment variables:

```bash
FIBERTRACEBOX_PUBLIC_URL=https://fibertracebox.online
FIBERTRACEBOX_API_KEY=<your-fibertracebox-api-key>
FIBERTRACEBOX_REQUIRE_API_KEY=true
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
FIBER_RPC_ENABLED=false
FIBER_RPC_LIVE_ENABLED=false
FIBER_RPC_ALLOW_LIVE_PAYMENTS=false
```

Live Fiber RPC should remain private. The hosted demo does not expose a public FNN JSON-RPC endpoint.

## Current Limitations

- Live replay does not mutate real Fiber routes, balances, channels, or payment sessions for safety.
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
- Safer controlled live replay flows with explicit operator approvals.
- Multi-asset Fiber payment diagnostics.
- Historical reporting for peer reliability, route quality, and payment success rates.
- Hosted user accounts, saved workspaces, and shared trace reports.

## Why This Matters

FiberTracebox is infrastructure, not another payment UI. It gives Fiber developers and operators an observability layer for
payment reliability: trace capture, failure fingerprinting, safe Replay-to-Fix analysis, live FNN evidence, CLI/API/SDK access,
and portable reports that turn scattered node output into an actionable debugging artifact.

## Team

Built by Ajao Oluwaseun for the CKB Fiber Network Infrastructure Hackathon.
