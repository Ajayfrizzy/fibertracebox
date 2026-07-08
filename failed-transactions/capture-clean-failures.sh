#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

NODE1_RPC="${NODE1_RPC:-http://127.0.0.1:8227}"
NODE2_RPC="${NODE2_RPC:-http://127.0.0.1:8237}"
NODE1_PUBKEY="${NODE1_PUBKEY:-03c93e93abdb37a60f7d4f827cdfef091b418515170f78132928e381c5bf6b298d}"
NODE2_PUBKEY="${NODE2_PUBKEY:-0360779e54f1b2f380fe6889223ccf240c857bfebacd3c197a8d0124e9ab5d0484}"
TRAMPOLINE_1_PUBKEY="${TRAMPOLINE_1_PUBKEY:-02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71}"
TRAMPOLINE_2_PUBKEY="${TRAMPOLINE_2_PUBKEY:-0291a6576bd5a94bd74b27080a48340875338fff9f6d6361fe6b8db8d0d1912fcc}"
CURRENCY="${CURRENCY:-Fibt}"

json_escape() {
  jq -Rn --arg value "$1" '$value'
}

rpc() {
  local url="$1"
  local id="$2"
  local method="$3"
  local params="${4:-}"
  local payload

  if [[ -n "$params" ]]; then
    payload="{\"id\":$id,\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params}"
  else
    payload="{\"id\":$id,\"jsonrpc\":\"2.0\",\"method\":\"$method\"}"
  fi

  curl -sS --fail-with-body "$url" \
    -H 'content-type: application/json' \
    -d "$payload"
}

write_rpc() {
  local file="$1"
  local url="$2"
  local id="$3"
  local method="$4"
  local params="${5:-}"

  mkdir -p "$(dirname "$file")"
  rpc "$url" "$id" "$method" "$params" | jq . > "$file"
}

require_tools() {
  for tool in curl jq openssl; do
    command -v "$tool" >/dev/null || {
      echo "missing required tool: $tool" >&2
      exit 1
    }
  done
}

payment_hash_from_invoice_file() {
  jq -r '.result.invoice.data.payment_hash // empty' "$1"
}

payment_hash_from_payment_file() {
  jq -r '.result.payment_hash // empty' "$1"
}

invoice_address_from_file() {
  jq -r '.result.invoice_address // empty' "$1"
}

poll_payment_until_terminal() {
  local url="$1"
  local payment_hash="$2"
  local output_file="$3"
  local attempts="${4:-20}"

  for _ in $(seq 1 "$attempts"); do
    write_rpc "$output_file" "$url" 390 "get_payment" "[{\"payment_hash\":\"$payment_hash\"}]"
    local status
    status="$(jq -r '.result.status // .error.message // empty' "$output_file")"
    case "$status" in
      Failed|Success)
        return 0
        ;;
    esac
    sleep 2
  done
}

wait_until_rpc_down() {
  local url="$1"
  local attempts="${2:-30}"

  for _ in $(seq 1 "$attempts"); do
    if ! rpc "$url" 399 "node_info" >/dev/null 2>&1; then
      return 0
    fi
    echo "Waiting for $url to stop accepting RPC..." >&2
    sleep 1
  done

  echo "$url is still reachable; aborting peer-offline capture." >&2
  return 1
}

capture_node_info() {
  write_rpc "$ROOT_DIR/node1-info.json" "$NODE1_RPC" 1 "node_info"
  write_rpc "$ROOT_DIR/node2-info.json" "$NODE2_RPC" 2 "node_info"
}

capture_invalid_amount() {
  write_rpc "$ROOT_DIR/invalid-amount/send-payment-validation-error.json" "$NODE1_RPC" 10 "send_payment" \
    "[{\"target_pubkey\":\"$NODE2_PUBKEY\",\"amount\":\"0xffffffffffffffffffffffffffffffffffff\",\"keysend\":true,\"dry_run\":true}]"
}

capture_route_capacity() {
  write_rpc "$ROOT_DIR/route-capacity/node1-info.json" "$NODE1_RPC" 101 "node_info"
  write_rpc "$ROOT_DIR/route-capacity/node2-info.json" "$NODE2_RPC" 102 "node_info"
  write_rpc "$ROOT_DIR/route-capacity/node1-channels.json" "$NODE1_RPC" 103 "list_channels" "[{}]"
  write_rpc "$ROOT_DIR/route-capacity/send-payment-error.json" "$NODE1_RPC" 104 "send_payment" \
    "[{\"target_pubkey\":\"$NODE2_PUBKEY\",\"amount\":\"0x2540be4000\",\"max_fee_amount\":\"0x5f5e100\",\"keysend\":true,\"dry_run\":true}]"
}

capture_route_not_found() {
  local valid_unknown_pubkey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"

  write_rpc "$ROOT_DIR/route-not-found/node1-info.json" "$NODE1_RPC" 501 "node_info"
  write_rpc "$ROOT_DIR/route-not-found/graph-nodes.json" "$NODE1_RPC" 502 "graph_nodes"
  write_rpc "$ROOT_DIR/route-not-found/graph-channels.json" "$NODE1_RPC" 503 "graph_channels"
  write_rpc "$ROOT_DIR/route-not-found/send-payment-unknown-target.json" "$NODE1_RPC" 504 "send_payment" \
    "[{\"target_pubkey\":\"$valid_unknown_pubkey\",\"amount\":\"0x3e8\",\"max_fee_amount\":\"0x3e8\",\"keysend\":true,\"dry_run\":true}]"
}

capture_fee_limit_too_low() {
  write_rpc "$ROOT_DIR/fee-limit-too-low/send-payment-low-fee-error.json" "$NODE1_RPC" 700 "send_payment" \
    "[{\"target_pubkey\":\"$NODE2_PUBKEY\",\"amount\":\"0x5f5e100\",\"max_fee_amount\":\"0x0\",\"trampoline_hops\":[\"$TRAMPOLINE_1_PUBKEY\",\"$TRAMPOLINE_2_PUBKEY\"],\"keysend\":true,\"dry_run\":true}]"
}

capture_cancelled_invoice() {
  local hold_payment_hash
  hold_payment_hash="0x$(openssl rand -hex 32)"

  write_rpc "$ROOT_DIR/cancelled-invoice/hold-invoice-created.json" "$NODE2_RPC" 300 "new_invoice" \
    "[{\"amount\":\"0x3e8\",\"currency\":\"$CURRENCY\",\"description\":\"cancelled invoice failure capture\",\"expiry\":\"0xe10\",\"payment_hash\":\"$hold_payment_hash\",\"hash_algorithm\":\"sha256\"}]"

  local invoice_address
  local payment_hash
  invoice_address="$(invoice_address_from_file "$ROOT_DIR/cancelled-invoice/hold-invoice-created.json")"
  payment_hash="$(payment_hash_from_invoice_file "$ROOT_DIR/cancelled-invoice/hold-invoice-created.json")"

  write_rpc "$ROOT_DIR/cancelled-invoice/hold-invoice-cancel.json" "$NODE2_RPC" 301 "cancel_invoice" \
    "[{\"payment_hash\":\"$payment_hash\"}]"
  write_rpc "$ROOT_DIR/cancelled-invoice/get-invoice-cancelled.json" "$NODE2_RPC" 302 "get_invoice" \
    "[{\"payment_hash\":\"$payment_hash\"}]"
  write_rpc "$ROOT_DIR/cancelled-invoice/send-payment-after-cancel.json" "$NODE1_RPC" 303 "send_payment" \
    "[{\"invoice\":$(json_escape "$invoice_address"),\"max_fee_rate\":\"0x3e8\",\"dry_run\":false}]"

  local payer_hash
  payer_hash="$(payment_hash_from_payment_file "$ROOT_DIR/cancelled-invoice/send-payment-after-cancel.json")"
  if [[ -n "$payer_hash" ]]; then
    poll_payment_until_terminal "$NODE1_RPC" "$payer_hash" "$ROOT_DIR/cancelled-invoice/get-payment-after-cancel.json" 30
  fi
}

capture_peer_offline() {
  rm -f "$ROOT_DIR/peer-offline/get-payment-route-unavailable.json"

  write_rpc "$ROOT_DIR/peer-offline/node1-info-before.json" "$NODE1_RPC" 600 "node_info"
  if rpc "$NODE2_RPC" 601 "node_info" | jq . > "$ROOT_DIR/peer-offline/node2-info-before.json"; then
    echo "Stop node2 now, then press Enter. The script will wait until node2 RPC is down before sending." >&2
    read -r _
    wait_until_rpc_down "$NODE2_RPC" 30
  else
    cat > "$ROOT_DIR/peer-offline/node2-info-before.json" <<'EOF'
{
  "capture_note": "node2 RPC was already unavailable before the peer-offline send"
}
EOF
  fi
  write_rpc "$ROOT_DIR/peer-offline/node1-channels-before.json" "$NODE1_RPC" 602 "list_channels" "[{}]"

  write_rpc "$ROOT_DIR/peer-offline/send-payment-route-unavailable.json" "$NODE1_RPC" 603 "send_payment" \
    "[{\"target_pubkey\":\"$NODE2_PUBKEY\",\"amount\":\"0x3e8\",\"max_fee_amount\":\"0x3e8\",\"timeout\":\"0x5\",\"keysend\":true,\"dry_run\":false}]"

  local payment_hash
  payment_hash="$(payment_hash_from_payment_file "$ROOT_DIR/peer-offline/send-payment-route-unavailable.json")"
  if [[ -n "$payment_hash" ]]; then
    poll_payment_until_terminal "$NODE1_RPC" "$payment_hash" "$ROOT_DIR/peer-offline/get-payment-route-unavailable.json" 30
  else
    jq '{
      jsonrpc,
      id,
      peer_offline_terminal_evidence: true,
      error
    }' "$ROOT_DIR/peer-offline/send-payment-route-unavailable.json" \
      > "$ROOT_DIR/peer-offline/get-payment-route-unavailable.json"
  fi
}

usage() {
  cat <<'EOF'
Usage: failed-transactions/capture-clean-failures.sh <case>

Cases:
  node-info
  invalid-amount
  route-capacity
  route-not-found
  fee-limit-too-low
  cancelled-invoice
  peer-offline
  all-noninteractive

Environment overrides:
  NODE1_RPC, NODE2_RPC, NODE1_PUBKEY, NODE2_PUBKEY, TRAMPOLINE_1_PUBKEY,
  TRAMPOLINE_2_PUBKEY, CURRENCY.
EOF
}

main() {
  require_tools

  case "${1:-}" in
    node-info) capture_node_info ;;
    invalid-amount) capture_invalid_amount ;;
    route-capacity) capture_route_capacity ;;
    route-not-found) capture_route_not_found ;;
    fee-limit-too-low) capture_fee_limit_too_low ;;
    cancelled-invoice) capture_cancelled_invoice ;;
    peer-offline) capture_peer_offline ;;
    all-noninteractive)
      capture_node_info
      capture_invalid_amount
      capture_route_capacity
      capture_route_not_found
      capture_fee_limit_too_low
      capture_cancelled_invoice
      ;;
    *)
      usage
      exit 2
      ;;
  esac
}

main "$@"
