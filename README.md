# FiberTracebox

Sentry-style tracing for CKB Fiber payments.

FiberTracebox is failure replay and reliability testing infrastructure for CKB Fiber. It turns failed Fiber payments into
explainable timelines, failure fingerprints, replay evidence, and operator-ready fix reports.

## Submission Links

- Hosted demo: https://fibertracebox-five.vercel.app/
- Repository: https://github.com/Ajayfrizzy/fibertracebox.git
- Image/UI: https://drive.google.com/drive/folders/1Mkt6u65gf5GFoBmF6sOC99IjfMMvO5Ll?usp=drive_link
- Videos: https://drive.google.com/drive/folders/19O9uawG__a2WE1diRS9USbl7Dgo0Wxi1?usp=sharing

## Selected Category

CKB Fiber Network Infrastructure Hackathon, Category 2: Node, Routing, Cross-Chain, and Diagnostics Infrastructure.

## Infrastructure Gap Addressed

Fiber payments can fail for different operational reasons: no route, insufficient route capacity, offline peers, channel policy
limits, fee limits, invoice problems, timeout, or duplicate payment sessions. Today, a developer or node operator may have to
inspect raw FNN CLI/RPC output, channel state, invoice data, payment hashes, and logs separately to understand what happened.

The infrastructure gap is an operator-facing diagnostics layer for Fiber payments. A raw failure code or CLI response is not enough on its own; operators need a trace that shows when the request started, which stage failed, what Fiber evidence was
available, what the likely cause was, and what action should be tried next.

FiberTracebox demonstrates this in two modes:

- deterministic sandbox replay for repeatable failure demos, CI-style diagnostics, and Replay-to-Fix recommendations
- live Fiber Network Node evidence for real invoices, node pubkeys, payment hashes, channel state, balances, and FNN status

In short, FiberTracebox is a tracing and replay layer for Fiber payment reliability: it turns scattered payment/node output
into a timeline, failure fingerprint, diagnosis, and exportable report.

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

The hosted demo runs the deterministic sandbox and Replay-to-Fix workflow. Live Fiber RPC is intentionally demonstrated
locally against a private two-node FNN setup, with raw node outputs and FiberTracebox reports included in `payment-testing/`.
This avoids exposing Fiber node RPC publicly while still proving real Fiber integration.

1. Open the dashboard.
2. Run the `route-capacity` sandbox scenario.
3. Inspect the failed trace timeline and `ROUTE_CAPACITY_INSUFFICIENT` fingerprint.
4. Run Replay-to-Fix and show the smallest successful fix.
5. Export the Markdown or JSON report.
6. Open the live evidence bundle in `payment-testing/`.
7. Show the FiberTracebox live trace with FNN pubkeys, payment hash, channel snapshots, payment status, and report export.

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

## Vercel Deployment Summary

FiberTracebox can be deployed to Vercel for the hosted dashboard, deterministic sandbox, Replay-to-Fix flow, API routes,
docs, and report export.

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Use the default Next.js build settings.
4. Add the required environment variables in Vercel Project Settings.
5. Deploy and open the generated Vercel URL.

Recommended Vercel environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
FIBERTRACEBOX_API_KEY=<your-fibertracebox-api-key>
FIBERTRACEBOX_REQUIRE_API_KEY=true
FIBER_RPC_ENABLED=false
FIBER_RPC_LIVE_ENABLED=false
FIBER_RPC_ALLOW_LIVE_PAYMENTS=false
```

The hosted Vercel demo is intended for sandbox traces, Replay-to-Fix, docs, and report export. Live Fiber RPC is demonstrated
locally against a private two-node FNN setup, with raw evidence committed in `payment-testing/`. This avoids exposing an FNN
JSON-RPC port publicly while still proving real Fiber integration.

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
