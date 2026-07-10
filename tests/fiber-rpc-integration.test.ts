import { afterEach, describe, expect, it, vi } from "vitest";
import { FiberRpcAdapter } from "@/lib/adapters/fiber-rpc-adapter";

describe("Fiber RPC adapter integration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("captures an FNN snapshot and sends a safe dry-run payload", async () => {
    const requests: Array<{ method: string; params?: unknown[] }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body)) as { id: number; method: string; params?: unknown[] };
        requests.push(request);
        const results: Record<string, unknown> = {
          node_info: { pubkey: "02" + "1".repeat(64), version: "0.9.0-test", peers_count: "0x1" },
          list_channels: {
            channels: [
              {
                channel_id: "0xchannel",
                enabled: true,
                local_balance: "0x5f5e100",
                remote_balance: "0x2faf080",
                pubkey: "03" + "2".repeat(64),
                state: { state_name: "ChannelReady" }
              }
            ]
          },
          graph_nodes: { nodes: [] },
          graph_channels: { channels: [] },
          send_payment: { payment_hash: "0xpayment", status: "Created", fee: "0x0" }
        };
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: results[request.method] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      })
    );

    const adapter = new FiberRpcAdapter("http://fnn.test", false);
    const trace = await adapter.runPaymentAttempt({
      targetPubkey: "03" + "3".repeat(64),
      keysend: true,
      amount: 100_000_000,
      asset: "CKB",
      dryRun: false
    });

    const send = requests.find((request) => request.method === "send_payment");
    expect(send?.params).toEqual([
      {
        dry_run: true,
        target_pubkey: "03" + "3".repeat(64),
        keysend: true,
        amount: "0x5f5e100"
      }
    ]);
    expect(trace).toMatchObject({ mode: "fiber-rpc", status: "pending", amount: 100_000_000 });
    expect(trace.events.map((event) => event.stage)).toEqual([
      "request_received",
      "node_info",
      "channel_snapshot",
      "graph_snapshot",
      "route_dry_run"
    ]);
  });

  it("allows an explicit live send only when the server enables live payments", async () => {
    const requests: Array<{ method: string; params?: unknown[] }> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { id: number; method: string; params?: unknown[] };
      requests.push(request);
      const result = request.method === "node_info"
        ? { pubkey: "02" + "1".repeat(64), version: "test" }
        : request.method === "list_channels"
          ? { channels: [] }
          : request.method === "graph_nodes"
            ? { nodes: [] }
            : request.method === "graph_channels"
              ? { channels: [] }
              : { status: "Created", payment_hash: "0xlive" };
      return Response.json({ jsonrpc: "2.0", id: request.id, result });
    }));

    const adapter = new FiberRpcAdapter("http://fnn.test", true);
    await adapter.runPaymentAttempt({ targetPubkey: "03" + "3".repeat(64), keysend: true, amount: 1, dryRun: false });
    const send = requests.find((request) => request.method === "send_payment");
    expect(send?.params).toEqual([{ dry_run: false, target_pubkey: "03" + "3".repeat(64), keysend: true, amount: "0x1" }]);
  });

  it("forces invoice requests to dry-run when live payments are disabled", async () => {
    const requests: Array<{ method: string; params?: unknown[] }> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { id: number; method: string; params?: unknown[] };
      requests.push(request);
      const result = request.method === "node_info"
        ? { pubkey: "02" + "1".repeat(64), version: "test" }
        : request.method === "list_channels"
          ? { channels: [] }
          : request.method === "graph_nodes"
            ? { nodes: [] }
            : request.method === "graph_channels"
              ? { channels: [] }
              : request.method === "parse_invoice"
                ? {}
                : { status: "Created", payment_hash: "0xinvoice" };
      return Response.json({ jsonrpc: "2.0", id: request.id, result });
    }));

    const adapter = new FiberRpcAdapter("http://fnn.test", false);
    await adapter.runPaymentAttempt({ invoice: "fibt1freshinvoiceexample", amount: 100, dryRun: false });
    const send = requests.find((request) => request.method === "send_payment");
    expect(send?.params).toEqual([{ dry_run: true, invoice: "fibt1freshinvoiceexample", amount: "0x64" }]);
  });
});
