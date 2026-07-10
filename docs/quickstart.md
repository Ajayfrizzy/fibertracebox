# Quickstart

FiberTracebox runs without a live Fiber node by default. The sandbox adapter creates deterministic payment traces for demos,
tests, and operator training.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`, then run a scenario from the Sandbox page.

Production requires an API key for writes. To expose only the deterministic hackathon demo, set:

```bash
FIBERTRACEBOX_API_KEY=<rotated-server-secret>
FIBERTRACEBOX_REQUIRE_API_KEY=true
FIBERTRACEBOX_ALLOW_PUBLIC_SANDBOX=true
```

The server secret must never be placed in browser code, cookies, screenshots, or public submission material.

## Optional Live Fiber Node

FiberTracebox does not start a Fiber Network Node for you. Run FNN separately, then point FiberTracebox at its JSON-RPC
endpoint.

From the upstream `nervosnetwork/fiber` repo, a testnet node is started with the `fnn` binary, a testnet `config.yml`, a
wallet key under `ckb/key`, and:

```bash
FIBER_SECRET_KEY_PASSWORD='YOUR_PASSWORD' RUST_LOG='info' ./fnn -c config.yml -d .
```

Keep the FNN JSON-RPC listener bound to a trusted interface such as `127.0.0.1`. Do not expose it directly to the public
internet.

Then set FiberTracebox env:

```bash
FIBER_RPC_URL=http://127.0.0.1:<fnn-rpc-port>
FIBER_RPC_ENABLED=true
FIBER_RPC_LIVE_ENABLED=true
FIBER_RPC_ALLOW_LIVE_PAYMENTS=false
```

Restart `npm run dev`, open the dashboard, and check the Live Fiber RPC panel. With `FIBER_RPC_ALLOW_LIVE_PAYMENTS=false`,
FiberTracebox sends FNN `send_payment` calls with `dry_run: true`. Set `FIBER_RPC_ALLOW_LIVE_PAYMENTS=true` only when you
intend to send real payments.

Real live-node features require real Fiber state: connected peers, open channels, usable liquidity, and a valid invoice. The
sandbox scenario cards remain deterministic demos; use the Live Fiber RPC panel for FNN-backed payment checks.

## Captured Two-Node Evidence

The repository contains a historical real live-send capture from two locally operated Fiber testnet nodes. Node1 was the sender,
Node2 was the receiver/invoice creator, and the project author created and funded their channels. The current hosted deployment
uses the Node1 environment only; Node2 is not currently running. The hosted node currently reports a different pubkey from the
historical Node1 capture, so the proof bundle is treated as historical rather than a continuous node identity.

The captured workflow was:

1. On Node2, create a fresh invoice.
2. On Node1, confirm channels are `ChannelReady`.
3. Send the invoice through FiberTracebox as a real live payment.
4. Open the resulting trace detail page.
5. Confirm the live evidence panel shows FNN pubkey, version, payment hash, payment status, channel snapshots, and graph
   availability.
6. Export the Markdown report.

The curated proof bundle lives in `payment-testing/`. It includes sender/receiver node info, channel snapshots, a fresh
invoice, sender `get_payment: Success`, receiver `get_invoice: Paid`, and the FiberTracebox trace report.

The embedded invoice and payment timestamps are `2026-07-04T14:56:28.417Z` and `2026-07-04T14:56:53.403Z` respectively.

## API Demo

```bash
curl -X POST http://localhost:3000/api/scenarios/run \
  -H 'content-type: application/json' \
  -d '{"scenario":"route-capacity"}'
```

Live FNN dry-run:

```bash
curl -X POST http://localhost:3000/api/traces \
  -H 'content-type: application/json' \
  -d '{"invoice":"<fiber-invoice>","dryRun":true,"timeoutMs":60000}'
```

Use the returned trace ID:

```bash
curl -X POST http://localhost:3000/api/traces/<traceId>/replay
curl http://localhost:3000/api/traces/<traceId>/report?format=markdown
```

Use `/replay` only with sandbox traces. When a receiver is available, verify a corrected failed live trace with:

```bash
curl -X POST http://localhost:3000/api/traces/<failedLiveTraceId>/verify \
  -H 'content-type: application/json' \
  -H 'x-api-key: <key>' \
  -d '{"invoice":"<fresh-invoice>"}'
```

## CLI Demo

```bash
FIBERTRACEBOX_API_URL=http://localhost:3000 npm run cli -- health
FIBERTRACEBOX_API_URL=http://localhost:3000 npm run cli -- scenario run route-capacity
FIBERTRACEBOX_API_URL=http://localhost:3000 npm run cli -- live '<fiber-invoice>'
FIBERTRACEBOX_API_URL=http://localhost:3000 FIBERTRACEBOX_API_KEY='<key>' npm run cli -- verify '<failed-live-trace-id>' '<fresh-invoice>'
```
