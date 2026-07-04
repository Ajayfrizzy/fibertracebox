# Architecture

FiberTracebox is structured as reusable diagnostics infrastructure:

- `lib/types`: domain and API contracts.
- `lib/adapters`: sandbox and adapter-ready Fiber RPC data sources.
- `lib/core`: trace classification, diagnosis, replay, live evidence extraction, reports, and stats.
- `lib/api`: persistence repository and route helpers.
- `app/api`: Next.js API routes.
- `app/dashboard`: operator/developer dashboard pages.
- `cli`: Commander-based API CLI.
- `sdk`: TypeScript API client.

## Request Flow

1. A payment attempt is created through `POST /api/traces` or `POST /api/scenarios/run`.
2. The selected `PaymentDataAdapter` returns a `PaymentTrace`.
3. The diagnosis engine classifies the failure fingerprint.
4. Server-side repository code persists traces and related rows.
5. Replay-to-Fix runs deterministic replay strategies against the trace.
6. Reports are generated as Markdown and JSON.

## Adapter Boundaries

The sandbox adapter is deterministic and replay-safe. It models route, liquidity, peer, fee, timeout, retry, and asset failure
conditions without requiring a live node.

The Fiber RPC adapter talks to an FNN JSON-RPC endpoint. It records `node_info`, `list_channels`, optional `graph_nodes` /
`graph_channels` availability, invoice parsing, payment status, and channel snapshots in trace event metadata.

Replay-to-Fix is intentionally split by mode. Sandbox traces are replayed under changed conditions. Live Fiber traces preserve
real node evidence and do not mutate routes, balances, channels, or payment sessions.

## Persistence

Supabase PostgreSQL is used when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present. Without those values,
the app falls back to in-memory persistence for local demos and tests.

The service role key is only read in server-side modules. Browser code uses API routes for all writes.
