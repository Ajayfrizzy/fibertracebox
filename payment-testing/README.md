# Live Fiber Payment Evidence

This folder contains the raw two-node Fiber evidence used for the FiberTracebox hackathon demo.

## Purpose

The files prove that FiberTracebox was tested against real local Fiber Network Nodes, not only sandbox data. The live run uses
a receiver-generated Fiber invoice, sender-side payment execution, sender-side final payment confirmation, receiver-side invoice
confirmation, and a FiberTracebox trace/report.

## Evidence Summary

| Evidence | Value |
| --- | --- |
| Sender Node1 pubkey | `03c93e93abdb37a60f7d4f827cdfef091b418515170f78132928e381c5bf6b298d` |
| Receiver Node2 pubkey | `0360779e54f1b2f380fe6889223ccf240c857bfebacd3c197a8d0124e9ab5d0484` |
| Fiber version | `0.9.0-rc5` |
| Payment hash | `0xf988452f37ad592cf14b42edf017e171dc2bd2ae4958d6b04ff03ee16afc60b9` |
| Invoice amount | `0x5f5e100` = `100,000,000` raw units = `1 Fibt` |
| Sender final status | `Success` |
| Receiver invoice status | `Paid` |
| FiberTracebox trace ID | `trace_49a88732-e613-44c1-b65d-60e78c7c1de2` |

## File Index

| File | Meaning |
| --- | --- |
| `01-node1-node-info.json` | Sender FNN identity, version, features, peers, and channel count |
| `02-node2-node-info.json` | Receiver FNN identity, version, features, peers, and channel count |
| `03-node1-channels-before-payment.json` | Sender-side channel state before the live payment |
| `04-node2-channels-before-payment.json` | Receiver-side channel state before the live payment |
| `05-node2-fresh-invoice.json` | Fresh receiver invoice for the live payment |
| `06-node1-send-payment.json` | Sender payment creation response; the session starts as `Created` |
| `07-node1-get-payment.json` | Sender final payment confirmation; status is `Success` |
| `08-node2-get-invoice.json` | Receiver invoice confirmation; status is `Paid` |
| `trace_49a88732-e613-44c1-b65d-60e78c7c1de2-fibertracebox-report.md` | FiberTracebox live trace report |
| `../failed-transactions/` | Raw failed Fiber payment proof bundles and fingerprint reports |

## Verification Notes

- Both nodes report Fiber `0.9.0-rc5`.
- Both nodes report multiple public `ChannelReady` channels.
- The payment hash is the same in the fresh invoice, sender payment result, sender final status, and receiver invoice status.
- `send_payment` returning `Created` is not final settlement proof. The final proof is `get_payment` returning `Success` and
  `get_invoice` returning `Paid`.

## Safety Notes

These files do not contain private keys, seed phrases, FNN secret passwords, Supabase service role keys, or FiberTracebox API
keys. Do not add those values to this folder.

## Adding Real Failure Evidence

For the strongest diagnostics proof, capture failed FNN payments and store them under `failed-transactions/` at the repository root.
Recommended failure bundles:

- `route-not-found/`: send to an unreachable target and include raw `send_payment`, `get_payment` when available, and the FiberTracebox report.
- `peer-offline/`: stop or disconnect a peer, attempt payment, and include node/channel snapshots before and after.
- `route-capacity/`: send above known route/channel capacity and include channel balance snapshots plus the failure report.
- `fee-limit-too-low/`: send with an intentionally low fee limit and include the raw FNN error and report.

Each bundle should include:

- `README.md` with date, Fiber version, nodes used, expected failure, and safety notes.
- Raw FNN JSON output files with secrets removed.
- The exported FiberTracebox Markdown report.
- A short note confirming whether the trace was dry-run, existing-session observation, or live-send mode.
