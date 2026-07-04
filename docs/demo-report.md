# FiberTracebox Demo Report

## Summary

FiberTracebox is Sentry-style tracing for CKB Fiber payments. It turns Fiber payment attempts into timelines, failure
fingerprints, replay evidence, and operator-ready reports.

The demo has two parts:

- deterministic sandbox replay for repeatable failure analysis
- real two-node Fiber evidence proving the app can observe live FNN payment activity

## Sandbox Failure Evidence

The sandbox route-capacity scenario demonstrates the core debugging flow:

1. A `500 CKB` payment attempt is created.
2. Route discovery succeeds.
3. Capacity probing finds only `320 CKB` forwardable capacity.
4. The trace is classified as `ROUTE_CAPACITY_INSUFFICIENT`.
5. Replay-to-Fix runs controlled alternate conditions.
6. The report recommends the smallest successful operational fix.

The replay ladder for route capacity is:

| Replay strategy | Expected result | Meaning |
| --- | --- | --- |
| same conditions | failed | Confirms the failure is reproducible |
| reduced amount 80% | failed | Shows 400 CKB still exceeds route capacity |
| reduced amount 64% | success | Shows 320 CKB can settle |
| increased outbound capacity | success | Shows liquidity repair fixes the route |
| alternate route | success | Shows another path can avoid the constraint |
| split payment | success | Preserves total amount while lowering per-path pressure |

## Live Fiber Evidence

The live proof bundle in `payment-testing/` records a real two-node Fiber payment.

| Evidence | Value |
| --- | --- |
| Sender Node1 pubkey | `03c93e93abdb37a60f7d4f827cdfef091b418515170f78132928e381c5bf6b298d` |
| Receiver Node2 pubkey | `0360779e54f1b2f380fe6889223ccf240c857bfebacd3c197a8d0124e9ab5d0484` |
| Fiber version | `0.9.0-rc5` |
| Invoice amount | `1 Fibt` (`100,000,000` raw units) |
| Payment hash | `0xf988452f37ad592cf14b42edf017e171dc2bd2ae4958d6b04ff03ee16afc60b9` |
| Sender payment status | `Success` |
| Receiver invoice status | `Paid` |
| FiberTracebox trace ID | `trace_49a88732-e613-44c1-b65d-60e78c7c1de2` |

## What This Proves

- FiberTracebox can run a repeatable diagnostic sandbox without requiring live funds.
- FiberTracebox can connect to a real FNN JSON-RPC endpoint.
- The live evidence includes node pubkeys, Fiber version, channel readiness, invoice amount, payment hash, final sender status,
  and final receiver invoice status.
- The exported report gives operators a portable artifact for debugging and handoff.
- Live replay is intentionally analytical. FiberTracebox captures real FNN evidence for live traces, while sandbox traces are
  the safe replay laboratory for alternate route and liquidity conditions.

## Demo Script

1. Open the dashboard.
2. Run the sandbox `route-capacity` scenario.
3. Open the failed trace and show the lifecycle timeline.
4. Run Replay-to-Fix and show the recommendation.
5. Export the Markdown report.
6. Open the live Fiber trace.
7. Show FNN pubkeys, payment hash, channel evidence, `Success`, and `Paid` status.
8. Close with: sandbox gives reproducible diagnostics; live mode proves real Fiber node integration.
