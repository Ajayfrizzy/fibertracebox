# ROUTE_NOT_FOUND

## Raw FNN Evidence

`send-payment-unknown-target.json` reports:

```txt
Send payment error: Failed to build route, PathFind error: no path found
```

## Why This Fingerprint Is Correct

FNN reached path finding and explicitly reported that no path was found for the target. This is clean route-not-found evidence.

## Operator Fix

- Refresh topology/graph state.
- Confirm the receiver is announced or reachable.
- Open or announce a route connecting sender and receiver.
