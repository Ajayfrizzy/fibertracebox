# PEER_OFFLINE_ROUTE_UNAVAILABLE

## Raw FNN Evidence

`node2-info-before.json` records that node2 RPC was unavailable before the send attempt.

`node1-info-before.json` reports:

```txt
peers_count: 0x0
```

`send-payment-route-unavailable.json` reports:

```txt
Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 0 is insufficient, required amount: 1000
```

## Why This Fingerprint Is Correct

This is not a literal `peer offline` FNN error string. It is contextual evidence that the peer was offline/unavailable and the
sender had no usable outbound route or liquidity to the target after peer loss.

## Operator Fix

- Restart or reconnect the peer.
- Refresh peer and graph state.
- Retry after the peer returns to the connected set.
