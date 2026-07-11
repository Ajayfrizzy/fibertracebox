# FiberTracebox Demo Report

## Summary

FiberTracebox is Sentry-style tracing for CKB Fiber payments. It turns Fiber payment attempts into timelines, failure
fingerprints, replay evidence, and operator-ready reports.

The hackathon thesis is that Fiber needs diagnostics infrastructure, not only payment execution. A raw FNN response can indicate
that something failed, but an operator needs a timeline, a fingerprint, the available channel/invoice/graph evidence, and the
safest next action.

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

The live proof bundle in `payment-testing/` records a real live-send payment on Fiber testnet between two locally operated FNN
processes. Node1 was the sender and Node2 was the receiver/invoice creator. The author created and funded the channels. Embedded
FNN timestamps place the invoice and payment on `2026-07-04` at approximately `14:56 UTC`.

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

## Real Failure Corpus

The failed-transaction corpus in `failed-transactions/` contains raw FNN JSON-RPC captures for:

- `ROUTE_CAPACITY_INSUFFICIENT`: max outbound liquidity below required amount.
- `ROUTE_NOT_FOUND`: `PathFind error: no path found`.
- `FEE_LIMIT_TOO_LOW`: `max_fee_amount is too low for trampoline routing`.
- `INVOICE_CANCELLED`: payment `Failed` with `failed_error: InvoiceCancelled`.
- `PAYMENT_AMOUNT_INVALID`: uint hex parse overflow.
- `PEER_OFFLINE_ROUTE_UNAVAILABLE`: node2 RPC unavailable, node1 `peers_count: 0x0`, and no outbound route/liquidity.

## What This Proves

- FiberTracebox can run a repeatable diagnostic sandbox without requiring live funds.
- FiberTracebox can connect to a real FNN JSON-RPC endpoint.
- FiberTracebox can classify FNN-style failure messages into operator-facing failure fingerprints.
- The live evidence includes node pubkeys, Fiber version, channel readiness, invoice amount, payment hash, final sender status,
  and final receiver invoice status.
- The exported report gives operators a portable artifact for debugging and handoff.
- Replay-to-Fix executes controlled strategies only in the deterministic sandbox. For live failures it generates suggested fixes,
  and Live Verification can link a later, server-enforced FNN dry-run after an operator applies one; no completed Live
  Verification capture is claimed because Node2 is not currently running.
- The hosted deployment currently uses the Node1 environment only. Its reported pubkey differs from the historical Node1
  capture, so Node2 and settlement evidence comes strictly from the historical local proof bundle.

## Evaluation Summary

FiberTracebox turns scattered Fiber node evidence into a debugging workflow:

1. Capture the payment attempt as a trace.
2. Fingerprint the failure.
3. Explain likely causes and operator fixes.
4. Replay likely fixes safely in the deterministic lab.
5. Export the result as Markdown or JSON for handoff.

## Suggested Evaluation Walkthrough

1. Open the dashboard.
2. Run the sandbox `route-capacity` scenario.
3. Inspect the failed trace and lifecycle timeline.
4. Run Replay-to-Fix and inspect the recommendation.
5. Export the Markdown report.
6. Open the historical live Fiber trace.
7. Inspect the FNN pubkeys, payment hash, channel evidence, `Success`, and `Paid` status.
8. Confirm the evaluation distinction: sandbox mode provides reproducible diagnostics, while live mode demonstrates real Fiber
   node integration.

The captured `Success` and `Paid` values prove the historical live settlement. The currently hosted single-node connection is
separate from that historical two-node environment and is not evidence of a currently running two-node deployment.
