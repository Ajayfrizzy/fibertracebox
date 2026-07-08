# INVOICE_CANCELLED

## Raw FNN Evidence

`get-invoice-cancelled.json` reports:

```txt
status: Cancelled
```

`get-payment-after-cancel.json` reports:

```txt
status: Failed
failed_error: InvoiceCancelled
```

## Why This Fingerprint Is Correct

The invoice payment hash was created, then cancelled by the receiver. FNN later reported the payment session as failed with
`InvoiceCancelled`, so the correct diagnosis is invoice cancellation rather than route discovery failure.

## Operator Fix

- Request a fresh invoice.
- Check invoice status before retrying.
- Do not replay payments against cancelled invoice payment hashes.
