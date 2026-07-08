# PAYMENT_AMOUNT_INVALID

## Raw FNN Evidence

`send-payment-validation-error.json` reports:

```txt
failed to parse uint hex ... ParseIntError { kind: PosOverflow }
```

## Why This Fingerprint Is Correct

FNN rejected the request before routing because the payment amount was outside the valid raw-unit range.

## Operator Fix

- Validate amount bounds before calling `send_payment`.
- Use whole raw units within the FNN-supported range.
- Retry with a corrected amount.
