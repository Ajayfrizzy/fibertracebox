# FEE_LIMIT_TOO_LOW

## Raw FNN Evidence

`send-payment-low-fee-error.json` reports:

```txt
max_fee_amount is too low for trampoline routing: recommend_minimal_fee=200100, maximal_fee=2010000 current_fee=0
```

## Why This Fingerprint Is Correct

FNN found a route context but rejected the payment because the caller's fee ceiling was below the minimum fee required by
trampoline routing.

## Operator Fix

- Raise the fee limit.
- Retry with a route whose aggregate fee fits the caller's policy.
- Refresh fee policy data before retrying.
