# FiberTracebox Report

## Trace Summary

- Trace ID: trace_49a88732-e613-44c1-b65d-60e78c7c1de2
- Payment status: success
- Amount: 1 Fibt (100,000,000 Shannon)
- Sender: 03c93e93abdb37a60f7d4f827cdfef091b418515170f78132928e381c5bf6b298d
- Receiver: 0360779e54f1b2f380fe6889223ccf240c857bfebacd3c197a8d0124e9ab5d0484
- Mode: fiber-rpc
- Latency: 6ms
- Failure time: not applicable
- Failure stage: not applicable
- Failure fingerprint: not applicable
- Payment hash: 0xf988452f37ad592cf14b42edf017e171dc2bd2ae4958d6b04ff03ee16afc60b9

## Root Cause

No failure diagnosis is required for this trace.

## Live Fiber Evidence

- FNN sender pubkey: 03c93e93abdb37a60f7d4f827cdfef091b418515170f78132928e381c5bf6b298d
- FNN receiver pubkey: 0360779e54f1b2f380fe6889223ccf240c857bfebacd3c197a8d0124e9ab5d0484
- Fiber version: 0.9.0-rc5
- Payment hash: 0xf988452f37ad592cf14b42edf017e171dc2bd2ae4958d6b04ff03ee16afc60b9
- Sender final payment status: Success
- Receiver invoice status: Paid
- Invoice amount: 1 Fibt (100,000,000 raw units)
- Channel evidence: both nodes reported public, enabled `ChannelReady` channels before payment.

| channel id | state | enabled | node1 local balance | node1 remote balance | node2 local balance | node2 remote balance |
| --- | --- | --- | --- | --- | --- | --- |
| 0x25581acac34c45d88fa2a76d70f565b9a49983630cf10b368a892c9c5a99cd61 | ChannelReady | true | 0x9502f9000 | 0x5f5e100 | 0x5f5e100 | 0x9502f9000 |
| 0x893051a3080b5cd96587fab0b9ecd699e2557e8b0993e67805e300d38f23ecda | ChannelReady | true | 0x702198d00 | 0x2540be400 | 0x2540be400 | 0x702198d00 |

## Timeline

| ms | stage | severity | message |
| --- | --- | --- | --- |
| 0 | request_received | info | Live Fiber payment dry-run requested |
| 2 | node_info | success | Connected to Fiber Network Node RPC |
| 6 | payment_result | success | Existing Fiber payment session is Success |

## Replay Results

| strategy | changed condition | result | latency ms | recommended |
| --- | --- | --- | --- | --- |
| Not run | Not run | Not run | - | - |

## Smallest-Fix Recommendation

No replay fix is required for a successful trace.



Confidence: not applicable

## Suggested Next Actions

- No failure action is required. Archive this trace/report as live payment evidence.

## Mode Disclosure

Fiber RPC mode: live FNN evidence is captured from node, channel, graph, invoice, and payment RPC calls. Replay-to-Fix remains analytical for live traces because changing live route conditions can move funds or mutate channels.
