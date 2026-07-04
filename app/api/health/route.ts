import { getFiberRpcStatus, getPaymentAdapter } from "@/lib/adapters";
import { probeFiberRpc } from "@/lib/adapters/fiber-rpc-adapter";
import { getDatabaseMode } from "@/lib/api/repository";
import { jsonError, jsonOk } from "@/lib/api/http";
import type { HealthResponse } from "@/lib/types/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adapter = getPaymentAdapter();
    const fiberRpc = getFiberRpcStatus();
    const probe = await probeFiberRpc();
    const response: HealthResponse = {
      status: "ok",
      database: getDatabaseMode(),
      mode: adapter.getMode(),
      fiberRpcEnabled: fiberRpc.liveEnabled,
      fiberRpc: {
        ...fiberRpc,
        ...(probe
          ? {
              probe: {
                ok: probe.ok,
                error: probe.error,
                pubkey: probe.nodeInfo?.pubkey,
                version: probe.nodeInfo?.version,
                nodeName: probe.nodeInfo?.node_name,
                addresses: probe.nodeInfo?.addresses,
                channelCount: probe.channelCount
              }
            }
          : {})
      }
    };

    return jsonOk(response);
  } catch (error) {
    return jsonError(error);
  }
}
