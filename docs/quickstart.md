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

## Live Two-Node Evidence Demo

For the hackathon demo, use this flow after both FNN nodes are running:

1. On Node2, create a fresh invoice.
2. On Node1, confirm channels are `ChannelReady`.
3. Send or dry-run the invoice through FiberTracebox.
4. Open the resulting trace detail page.
5. Confirm the live evidence panel shows FNN pubkey, version, payment hash, payment status, channel snapshots, and graph
   availability.
6. Export the Markdown report.

The curated proof bundle lives in `payment-testing/`. It includes sender/receiver node info, channel snapshots, a fresh
invoice, sender `get_payment: Success`, receiver `get_invoice: Paid`, and the FiberTracebox trace report.

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

## CLI Demo

```bash
FIBERTRACEBOX_API_URL=http://localhost:3000 npm run cli -- health
FIBERTRACEBOX_API_URL=http://localhost:3000 npm run cli -- scenario run route-capacity
FIBERTRACEBOX_API_URL=http://localhost:3000 npm run cli -- live '<fiber-invoice>'
```
