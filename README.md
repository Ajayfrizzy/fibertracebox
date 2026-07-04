# FiberTracebox

Sentry-style tracing for CKB Fiber payments.

FiberTracebox is failure replay and reliability testing infrastructure for CKB Fiber. It turns failed Fiber payments into
explainable timelines, failure fingerprints, replay evidence, and operator-ready fix reports.

## Selected Category

CKB Fiber Network Infrastructure Hackathon, Category 2: Node, Routing, Cross-Chain, and Diagnostics Infrastructure.

## Infrastructure Gap Addressed

Fiber developers and node operators need repeatable ways to understand why a payment failed. A raw failure code is not enough:
operators need the timeline, failed stage, likely cause, replay evidence, and a minimal action to try next.

FiberTracebox demonstrates this in two modes:

- deterministic sandbox replay for repeatable failure demos and CI-style diagnostics
- live Fiber Network Node evidence for real invoices, pubkeys, payment hashes, channel state, and FNN status

## Standout Feature: Replay-to-Fix Engine

For a failed trace, FiberTracebox runs replay strategies:

- same conditions
- smaller amount
- increased outbound capacity
- alternate route
- restored peer
- higher fee limit
- longer timeout
- split payment

It marks the smallest successful fix and includes it in the report.

## Demo

1. Open the dashboard.
2. Run the `route-capacity` sandbox scenario.
3. Inspect the failed trace timeline and `ROUTE_CAPACITY_INSUFFICIENT` fingerprint.
4. Run Replay-to-Fix and show the smallest successful fix.
5. Export the Markdown or JSON report.
6. Switch to live Fiber RPC mode.
7. Submit a real Fiber invoice from the two-node test setup.
8. Show the live trace with FNN pubkeys, payment hash, channel snapshots, payment status, and report export.

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

See `payment-testing/README.md` for the raw FNN evidence file index, and `docs/demo-report.md` for the judge-friendly
narrative report.

## Architecture

- Next.js App Router frontend and API routes.
- TypeScript domain, API, CLI, and SDK.
- Tailwind CSS dashboard.
- Supabase PostgreSQL schema with server-side writes.
- Sandbox adapter for deterministic demos.
- Fiber RPC health probing, channel snapshotting, invoice dry-run/live-send adapter, and live evidence reporting.
- Commander CLI.
- Vitest coverage for core and API behavior.

## Features

- Payment trace recorder.
- Millisecond lifecycle timeline.
- Failure fingerprint classification.
- Diagnosis catalog with likely causes and fixes.
- Replay-to-Fix engine.
- Live Fiber evidence panel with FNN pubkey, payment hash, channel snapshots, graph availability, and payment status.
- Exportable Markdown and JSON reports.
- Dashboard, API, CLI, SDK, docs, scenarios, and tests.

## Sandbox vs Optional Live Fiber RPC Mode

Sandbox mode is fully working and does not require a live Fiber node. It simulates route discovery, peer reachability, channel
state, liquidity, fees, timeouts, retry paths, and settlement outcomes.

Fiber RPC mode can connect to an FNN JSON-RPC endpoint for node health, channel snapshots, graph availability, and invoice
payment checks. It defaults to `dry_run: true`; real sends require `FIBER_RPC_ALLOW_LIVE_PAYMENTS=true`.

Replay-to-Fix is deterministic and safe in sandbox mode. In live Fiber mode, FiberTracebox captures real node, channel,
invoice, graph, and payment evidence, but does not mutate live routes because that can move funds or change channel state.
This boundary is intentional: live traces are evidence, sandbox traces are the replay laboratory.

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

## CLI Usage

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
```

Set `FIBERTRACEBOX_API_URL` for hosted deployments. If write protection is enabled, set `FIBERTRACEBOX_API_KEY` in the shell
running the CLI. Run `npm run build:cli && npm link` once if you want the global `fibertracebox` command.

For live Fiber node checks, run FNN separately and set:

```bash
FIBER_RPC_URL=http://127.0.0.1:<fnn-rpc-port>
FIBER_RPC_ENABLED=true
FIBER_RPC_LIVE_ENABLED=true
FIBER_RPC_ALLOW_LIVE_PAYMENTS=false
```

Hosted write endpoints should be protected with `FIBERTRACEBOX_API_KEY`. Clients can send it as `x-api-key` or
`Authorization: Bearer <key>`. Production deployments refuse write requests if API-key protection is not configured.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Testing

```bash
npm run test
npm run build
```

## DigitalOcean VPS Deployment Summary

1. Create an Ubuntu droplet.
2. Install Node.js 20, Nginx, PM2, and Certbot.
3. Clone the repo and configure `.env.local`.
4. Run `npm install` and `npm run build`.
5. Start with PM2.
6. Configure Nginx as a reverse proxy.
7. Add SSL with Certbot.

See `docs/deployment-digitalocean.md`.

## Roadmap

- Graph-aware live Fiber route diagnostics using `graph_nodes`, `graph_channels`, channel policy, and liquidity snapshots.
- Replay-safe live simulation mode that explains alternate routes without mutating channels or moving funds.
- Fiber failure corpus built from real FNN `failed_error` and `failure_detail` samples.
- Trace redaction and retention policies.
- Multi-node topology import.
- CI scenario packs for Fiber routing changes.
- Regression fingerprints across software versions.

## Team

Built by Ajao Oluwaseun for the CKB Fiber Network Infrastructure Hackathon.