# Scenario Guide

The sandbox adapter supports these deterministic scenarios:

- `successful-payment`
- `route-not-found`
- `route-capacity`
- `peer-offline`
- `channel-inactive`
- `asset-unsupported`
- `fee-limit-too-low`
- `payment-timeout`
- `liquidity-imbalance`
- `retry-path-unavailable`

Each scenario creates a trace with lifecycle events in milliseconds. Failed scenarios include a failure stage and structured
failure fingerprint.

The full demo runs `route-capacity`, replays it, and shows a report. The expected story is:

1. Original 500 CKB payment fails at capacity probing.
2. Replay under the same conditions reproduces the failure.
3. Smaller amount succeeds.
4. Increased outbound capacity succeeds.
5. Alternate route and split payment may also succeed.
6. The report recommends the smallest successful fix.

## How This Connects To Live Fiber

Sandbox scenarios are deterministic so evaluators and operators can reproduce the same failure story every time. Live Fiber mode
then proves the integration path against real FNN nodes: invoice parsing, payment hash, payment status, channel snapshots,
and report export. Sandbox replay demonstrates the diagnostic method; the live evidence trace demonstrates that the same
trace/report surface works against actual Fiber infrastructure.

The repository proof is a historical real live-send capture from two local Fiber testnet nodes: Node1 sender and Node2 receiver.
The hosted deployment currently uses the Node1 environment only and reports a different pubkey from the historical capture. Live Verification is available when a receiver or fresh invoice source
is reachable, but the submission does not claim a completed verification run after Node2 was stopped.
