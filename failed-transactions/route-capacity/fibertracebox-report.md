# ROUTE_CAPACITY_INSUFFICIENT

## Raw FNN Evidence

`send-payment-error.json` reports:

```txt
Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 40100000000 is insufficient, required amount: 160000000000
```

## Why This Fingerprint Is Correct

FNN found route-building context but rejected the payment because available outbound liquidity was lower than the requested
amount. This is a route-capacity/liquidity failure, not an invoice or peer-connectivity failure.

## Operator Fix

- Reduce the amount.
- Split the payment.
- Add outbound liquidity or use a route with enough forwardable capacity.
