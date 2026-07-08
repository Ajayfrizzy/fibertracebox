# Failed Transaction Evidence

This folder stores raw FNN JSON-RPC captures for FiberTracebox failure fingerprints.

The raw output must match the folder label. A request-shape validation error such as
`keysend payment should not have payment_hash` is not valid proof for route,
capacity, peer, fee, or invoice failures.

## Current Clean Evidence

- `node1-info.json` and `node2-info.json` prove live Fiber nodes:
  - version `0.9.0-rc5`
  - node pubkeys `03c93e93...` and `0360779e...`
  - `channel_count: 0x6`
  - `pending_channel_count: 0x0`
  - `peers_count: 0x1`
- `invalid-amount/send-payment-validation-error.json` proves `PAYMENT_AMOUNT_INVALID` with `PosOverflow`.
- `route-capacity/send-payment-error.json` proves insufficient route capacity with `max outbound liquidity ... is insufficient`.
- `route-not-found/send-payment-unknown-target.json` proves no route with `PathFind error: no path found`.
- `fee-limit-too-low/send-payment-low-fee-error.json` proves the fee cap is too low with `max_fee_amount is too low for trampoline routing`.
- `cancelled-invoice/get-invoice-cancelled.json` and `cancelled-invoice/get-payment-after-cancel.json` prove a cancelled invoice with `status: Cancelled` and `failed_error: InvoiceCancelled`.
- `peer-offline/send-payment-route-unavailable.json` proves the offline peer condition as route unavailability: node2 RPC was down, node1 had `peers_count: 0x0`, and FNN failed with `max outbound liquidity 0 is insufficient`.

## Capturing Clean Failures

Run the helper from the repository root after both local FNN RPC ports are live:

```bash
bash failed-transactions/capture-clean-failures.sh all-noninteractive
```

For peer-offline/route-unavailable, stop node2 when prompted:

```bash
bash failed-transactions/capture-clean-failures.sh peer-offline
```

The helper writes raw JSON into the existing category folders. It uses these corrected request rules:

- Keysend: use `target_pubkey`, `amount`, `keysend: true`; do not send `payment_hash`.
- Invoice payment: use `invoice`; do not set `keysend: true`.
- `get_invoice` and `cancel_invoice`: pass `{"payment_hash":"0x..."}`.
- `get_payment`: pass `{"payment_hash":"0x..."}`.

## Expected Exact Failure Text

- `route-capacity`: `max outbound liquidity`, `InsufficientBalance`, `insufficient capacity`, or `insufficient liquidity`.
- `route-not-found`: `route not found`, `NoPathFound`, `no route found`, `target not found`, or `failed to find route`.
- `peer-offline`: this capture is labeled as offline peer causing route unavailability. Expected evidence is node2 RPC down, node1 `peers_count: 0x0`, and FNN `max outbound liquidity 0 is insufficient`.
- `fee-limit-too-low`: `max_fee_amount is too low`, `fee limit`, `route fee exceeds max fee`, or `fee too low`.
- `cancelled-invoice`: `get-invoice-cancelled.json` must show `status: Cancelled`; `get-payment-after-cancel.json` should show `status: Failed` with a cancelled-invoice failure.








ce801787b2a6861b9a9bd19a00edd6ed1a22373df666a4007498885bf7ad74e7