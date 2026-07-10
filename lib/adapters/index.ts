import { FiberRpcAdapter } from "@/lib/adapters/fiber-rpc-adapter";
import { sandboxAdapter } from "@/lib/adapters/sandbox-adapter";
import type { PaymentDataAdapter } from "@/lib/types/domain";

export function getPaymentAdapter(): PaymentDataAdapter {
  if (isFiberRpcLiveEnabled()) {
    return new FiberRpcAdapter(process.env.FIBER_RPC_URL);
  }

  return sandboxAdapter;
}

export function getFiberRpcStatus() {
  const requested = process.env.FIBER_RPC_ENABLED === "true";
  const configured = Boolean(process.env.FIBER_RPC_URL);

  return {
    requested,
    configured,
    adapterReadyOnly: requested && configured && !isFiberRpcLiveEnabled(),
    liveEnabled: isFiberRpcLiveEnabled(),
    allowLivePayments: process.env.FIBER_RPC_ALLOW_LIVE_PAYMENTS === "true",
    publicDryRunsEnabled: process.env.FIBERTRACEBOX_ALLOW_PUBLIC_LIVE_DRY_RUN === "true"
  };
}

function isFiberRpcLiveEnabled() {
  return process.env.FIBER_RPC_ENABLED === "true" && process.env.FIBER_RPC_LIVE_ENABLED === "true" && Boolean(process.env.FIBER_RPC_URL);
}
