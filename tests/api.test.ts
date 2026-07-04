import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as healthGet } from "@/app/api/health/route";
import { POST as tracesPost } from "@/app/api/traces/route";
import { POST as scenarioPost } from "@/app/api/scenarios/run/route";
import { GET as traceGet } from "@/app/api/traces/[id]/route";
import { POST as replayPost } from "@/app/api/traces/[id]/replay/route";
import { extractLiveFiberEvidence } from "@/lib/core/live-fiber-evidence";

describe("API routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns health status", async () => {
    const response = await healthGet();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.mode).toBe("sandbox");
  });

  it("runs a sandbox scenario route", async () => {
    const request = new Request("http://localhost/api/scenarios/run", {
      method: "POST",
      body: JSON.stringify({ scenario: "route-capacity" })
    });

    const response = await scenarioPost(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.trace.failureFingerprint).toBe("ROUTE_CAPACITY_INSUFFICIENT");
    expect(json.diagnosis.fingerprint).toBe("ROUTE_CAPACITY_INSUFFICIENT");
  });

  it("keeps sandbox scenarios on the sandbox adapter when live Fiber RPC is enabled", async () => {
    const previousEnabled = process.env.FIBER_RPC_ENABLED;
    const previousLiveEnabled = process.env.FIBER_RPC_LIVE_ENABLED;
    const previousUrl = process.env.FIBER_RPC_URL;

    process.env.FIBER_RPC_ENABLED = "true";
    process.env.FIBER_RPC_LIVE_ENABLED = "true";
    process.env.FIBER_RPC_URL = "http://secret-rpc.local";

    try {
      const request = new Request("http://localhost/api/scenarios/run", {
        method: "POST",
        body: JSON.stringify({ scenario: "route-capacity" })
      });

      const response = await scenarioPost(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.trace.mode).toBe("sandbox");
      expect(json.trace.failureFingerprint).toBe("ROUTE_CAPACITY_INSUFFICIENT");
      expect(JSON.stringify(json)).not.toContain("secret-rpc");
    } finally {
      restoreEnv("FIBER_RPC_ENABLED", previousEnabled);
      restoreEnv("FIBER_RPC_LIVE_ENABLED", previousLiveEnabled);
      restoreEnv("FIBER_RPC_URL", previousUrl);
    }
  });

  it("runs a full demo scenario and replay in one request", async () => {
    const request = new Request("http://localhost/api/scenarios/run", {
      method: "POST",
      body: JSON.stringify({ scenario: "route-capacity", replay: true })
    });

    const response = await scenarioPost(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.trace.status).toBe("replayed");
    expect(json.trace.replayResults.length).toBeGreaterThan(0);
    expect(json.recommended.scenario).toBe("split_payment");
  });

  it("can read a full demo trace after scenario creation", async () => {
    const request = new Request("http://localhost/api/scenarios/run", {
      method: "POST",
      body: JSON.stringify({ scenario: "route-capacity", replay: true })
    });

    const response = await scenarioPost(request);
    const json = await response.json();
    const detailResponse = await traceGet(new Request(`http://localhost/api/traces/${json.trace.id}`), {
      params: { id: json.trace.id }
    });
    const detailJson = await detailResponse.json();

    expect(detailResponse.status).toBe(200);
    expect(detailJson.trace.id).toBe(json.trace.id);
    expect(detailJson.trace.replayResults.length).toBeGreaterThan(0);
  });

  it("runs replay route for a failed trace", async () => {
    const request = new Request("http://localhost/api/scenarios/run", {
      method: "POST",
      body: JSON.stringify({ scenario: "peer-offline" })
    });
    const scenarioResponse = await scenarioPost(request);
    const scenarioJson = await scenarioResponse.json();

    const replayResponse = await replayPost(new Request("http://localhost/api/traces/id/replay", { method: "POST" }), {
      params: { id: scenarioJson.trace.id }
    });
    const replayJson = await replayResponse.json();

    expect(replayResponse.status).toBe(200);
    expect(replayJson.replayResults.some((result: { scenario: string }) => result.scenario === "restored_peer")).toBe(true);
    expect(replayJson.recommended.scenario).toBe("restored_peer");
  });

  it("rejects replay for successful traces with a clear message", async () => {
    const request = new Request("http://localhost/api/scenarios/run", {
      method: "POST",
      body: JSON.stringify({ scenario: "successful-payment" })
    });
    const scenarioResponse = await scenarioPost(request);
    const scenarioJson = await scenarioResponse.json();

    const replayResponse = await replayPost(new Request("http://localhost/api/traces/id/replay", { method: "POST" }), {
      params: { id: scenarioJson.trace.id }
    });
    const replayJson = await replayResponse.json();

    expect(replayResponse.status).toBe(400);
    expect(replayJson.error).toBe("Replay-to-Fix only runs for failed traces");
  });

  it("rejects invalid trace creation bodies", async () => {
    const request = new Request("http://localhost/api/traces", {
      method: "POST",
      body: JSON.stringify({ scenario: "route-capacity", amount: -1, unexpected: true })
    });

    const response = await tracesPost(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Invalid request body");
    expect(json.details.length).toBeGreaterThan(0);
  });

  it("requires live Fiber inputs when Fiber RPC mode is enabled", async () => {
    const previousEnabled = process.env.FIBER_RPC_ENABLED;
    const previousLiveEnabled = process.env.FIBER_RPC_LIVE_ENABLED;
    const previousUrl = process.env.FIBER_RPC_URL;

    process.env.FIBER_RPC_ENABLED = "true";
    process.env.FIBER_RPC_LIVE_ENABLED = "true";
    process.env.FIBER_RPC_URL = "http://secret-rpc.local";
    const consoleError = console.error;
    console.error = () => undefined;

    try {
      const request = new Request("http://localhost/api/traces", {
        method: "POST",
        body: JSON.stringify({ scenario: "route-capacity" })
      });

      const response = await tracesPost(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe("Live Fiber RPC mode requires an invoice or targetPubkey");
      expect(JSON.stringify(json)).not.toContain("secret-rpc");
    } finally {
      console.error = consoleError;
      restoreEnv("FIBER_RPC_ENABLED", previousEnabled);
      restoreEnv("FIBER_RPC_LIVE_ENABLED", previousLiveEnabled);
      restoreEnv("FIBER_RPC_URL", previousUrl);
    }
  });

  it("records failed live Fiber RPC attempts without leaking RPC URLs", async () => {
    const previousEnabled = process.env.FIBER_RPC_ENABLED;
    const previousLiveEnabled = process.env.FIBER_RPC_LIVE_ENABLED;
    const previousUrl = process.env.FIBER_RPC_URL;

    process.env.FIBER_RPC_ENABLED = "true";
    process.env.FIBER_RPC_LIVE_ENABLED = "true";
    process.env.FIBER_RPC_URL = "http://secret-rpc.local";
    const consoleError = console.error;
    console.error = () => undefined;

    try {
      const request = new Request("http://localhost/api/traces", {
        method: "POST",
        body: JSON.stringify({ invoice: "fibt1liveinvoiceexample", dryRun: true })
      });

      const response = await tracesPost(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.trace.status).toBe("failed");
      expect(json.trace.mode).toBe("fiber-rpc");
      expect(JSON.stringify(json)).not.toContain("secret-rpc");
    } finally {
      console.error = consoleError;
      restoreEnv("FIBER_RPC_ENABLED", previousEnabled);
      restoreEnv("FIBER_RPC_LIVE_ENABLED", previousLiveEnabled);
      restoreEnv("FIBER_RPC_URL", previousUrl);
    }
  });

  it("sends Fiber RPC params in the FNN JSON-RPC shape", async () => {
    const previousEnabled = process.env.FIBER_RPC_ENABLED;
    const previousLiveEnabled = process.env.FIBER_RPC_LIVE_ENABLED;
    const previousUrl = process.env.FIBER_RPC_URL;

    process.env.FIBER_RPC_ENABLED = "true";
    process.env.FIBER_RPC_LIVE_ENABLED = "true";
    process.env.FIBER_RPC_URL = "http://fiber-rpc.local";

    const requests: unknown[] = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      const body = requests.at(-1) as { method?: string };

      if (body.method === "node_info") {
        return Response.json({ jsonrpc: "2.0", id: 1, result: { pubkey: "pubkey-1", version: "test" } });
      }

      if (body.method === "list_channels") {
        return Response.json({ jsonrpc: "2.0", id: 2, result: { channels: [] } });
      }

      return Response.json({
        jsonrpc: "2.0",
        id: 3,
        result: { status: "success", payment_hash: "0xabc", fee: "0x0" }
      });
    });

    try {
      const request = new Request("http://localhost/api/traces", {
        method: "POST",
        body: JSON.stringify({
          invoice: "fibt1liveinvoiceexample",
          dryRun: true,
          amount: 100,
          feeLimit: 2
        })
      });

      const response = await tracesPost(request);
      const json = await response.json();
      const sendPaymentRequest = requests.find((body) => (body as { method?: string }).method === "send_payment") as {
        params: Array<Record<string, unknown>>;
      };

      expect(response.status).toBe(201);
      expect(json.trace.status).toBe("success");
      expect(fetchMock).toHaveBeenCalled();
      expect(sendPaymentRequest.params).toEqual([
        {
          dry_run: true,
          invoice: "fibt1liveinvoiceexample",
          amount: "0x64",
          max_fee_amount: "0x2"
        }
      ]);
    } finally {
      restoreEnv("FIBER_RPC_ENABLED", previousEnabled);
      restoreEnv("FIBER_RPC_LIVE_ENABLED", previousLiveEnabled);
      restoreEnv("FIBER_RPC_URL", previousUrl);
    }
  });

  it("captures live Fiber channel and payment evidence in trace metadata", async () => {
    const previousEnabled = process.env.FIBER_RPC_ENABLED;
    const previousLiveEnabled = process.env.FIBER_RPC_LIVE_ENABLED;
    const previousUrl = process.env.FIBER_RPC_URL;

    process.env.FIBER_RPC_ENABLED = "true";
    process.env.FIBER_RPC_LIVE_ENABLED = "true";
    process.env.FIBER_RPC_URL = "http://fiber-rpc.local";

    const paymentHash = "0xf988452f37ad592cf14b42edf017e171dc2bd2ae4958d6b04ff03ee16afc60b9";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { method?: string };

      if (body.method === "node_info") {
        return Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: {
            pubkey: "sender-pubkey",
            version: "0.9.0-rc5",
            peers_count: "0x1",
            features: ["BASIC_MPP_REQUIRED"]
          }
        });
      }

      if (body.method === "list_channels") {
        return Response.json({
          jsonrpc: "2.0",
          id: 2,
          result: {
            channels: [
              {
                channel_id: "0xchannel",
                enabled: true,
                local_balance: "0x5f5e100",
                remote_balance: "0x9502f9000",
                pubkey: "receiver-pubkey",
                is_public: true,
                is_acceptor: false,
                state: { state_name: "ChannelReady" },
                tlc_expiry_delta: "0xdbba00",
                tlc_fee_proportional_millionths: "0x3e8"
              }
            ]
          }
        });
      }

      if (body.method === "graph_nodes") {
        return Response.json({ jsonrpc: "2.0", id: 3, result: { nodes: [{ pubkey: "sender-pubkey" }] } });
      }

      if (body.method === "graph_channels") {
        return Response.json({ jsonrpc: "2.0", id: 4, result: { channels: [{ channel_id: "0xchannel" }] } });
      }

      if (body.method === "parse_invoice") {
        return Response.json({
          jsonrpc: "2.0",
          id: 5,
          result: {
            invoice: {
              amount: "0x5f5e100",
              currency: "Fibt",
              data: {
                payment_hash: paymentHash,
                attrs: [{ payee_public_key: "receiver-pubkey" }]
              }
            }
          }
        });
      }

      if (body.method === "get_invoice") {
        return Response.json({ jsonrpc: "2.0", id: 6, result: { status: "Paid" } });
      }

      return Response.json({
        jsonrpc: "2.0",
        id: 7,
        result: { status: "Success", payment_hash: paymentHash, fee: "0x0" }
      });
    });

    try {
      const request = new Request("http://localhost/api/traces", {
        method: "POST",
        body: JSON.stringify({ invoice: "fibt1liveinvoiceexample", dryRun: true })
      });

      const response = await tracesPost(request);
      const json = await response.json();
      const evidence = extractLiveFiberEvidence(json.trace);

      expect(response.status).toBe(201);
      expect(json.trace.status).toBe("success");
      expect(evidence?.node?.version).toBe("0.9.0-rc5");
      expect(evidence?.payment?.paymentHash).toBe(paymentHash);
      expect(evidence?.payment?.invoiceStatus).toBe("Paid");
      expect(evidence?.channels[0]).toMatchObject({
        channelId: "0xchannel",
        stateName: "ChannelReady",
        enabled: true,
        peerPubkey: "receiver-pubkey"
      });
      expect(evidence?.graph?.available).toBe(true);
    } finally {
      restoreEnv("FIBER_RPC_ENABLED", previousEnabled);
      restoreEnv("FIBER_RPC_LIVE_ENABLED", previousLiveEnabled);
      restoreEnv("FIBER_RPC_URL", previousUrl);
    }
  });

  it("recovers duplicate successful Fiber payment sessions as successful traces", async () => {
    const previousEnabled = process.env.FIBER_RPC_ENABLED;
    const previousLiveEnabled = process.env.FIBER_RPC_LIVE_ENABLED;
    const previousUrl = process.env.FIBER_RPC_URL;

    process.env.FIBER_RPC_ENABLED = "true";
    process.env.FIBER_RPC_LIVE_ENABLED = "true";
    process.env.FIBER_RPC_URL = "http://fiber-rpc.local";

    const paymentHash = "0x0d22059848d6bc205e3bd12f67415c3933ccf38bc014acea31a525fe539e5f30";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { method?: string };

      if (body.method === "node_info") {
        return Response.json({ jsonrpc: "2.0", id: 1, result: { pubkey: "sender-pubkey", version: "test" } });
      }

      if (body.method === "list_channels") {
        return Response.json({ jsonrpc: "2.0", id: 2, result: { channels: [{}] } });
      }

      if (body.method === "parse_invoice") {
        return Response.json({
          jsonrpc: "2.0",
          id: 3,
          result: {
            invoice: {
              amount: "0x2540be400",
              currency: "Fibt",
              data: {
                payment_hash: paymentHash,
                attrs: [{ payee_public_key: "receiver-pubkey" }]
              }
            }
          }
        });
      }

      if (body.method === "send_payment") {
        return Response.json({
          jsonrpc: "2.0",
          id: 4,
          error: {
            code: -32602,
            message: `InvalidParameter: Payment session already exists: Hash256(${paymentHash}) with payment session status: Success`
          }
        });
      }

      return Response.json({
        jsonrpc: "2.0",
        id: 5,
        result: { payment_hash: paymentHash, status: "Success", fee: "0x0" }
      });
    });

    try {
      const request = new Request("http://localhost/api/traces", {
        method: "POST",
        body: JSON.stringify({ invoice: "fibt1liveinvoiceexample", dryRun: true })
      });

      const response = await tracesPost(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.trace.status).toBe("success");
      expect(json.trace.amount).toBe(10_000_000_000);
      expect(json.trace.asset).toBe("Fibt");
      expect(json.trace.receiverNode).toBe("receiver-pubkey");
      expect(json.trace.failureFingerprint).toBeUndefined();
      expect(json.trace.events.at(-1).severity).toBe("success");
    } finally {
      restoreEnv("FIBER_RPC_ENABLED", previousEnabled);
      restoreEnv("FIBER_RPC_LIVE_ENABLED", previousLiveEnabled);
      restoreEnv("FIBER_RPC_URL", previousUrl);
    }
  });

  it("requires an API key when write protection is enabled", async () => {
    const previousRequired = process.env.FIBERTRACEBOX_REQUIRE_API_KEY;
    const previousKey = process.env.FIBERTRACEBOX_API_KEY;

    process.env.FIBERTRACEBOX_REQUIRE_API_KEY = "true";
    delete process.env.FIBERTRACEBOX_API_KEY;

    try {
      const request = new Request("http://localhost/api/scenarios/run", {
        method: "POST",
        body: JSON.stringify({ scenario: "route-capacity" })
      });

      const response = await scenarioPost(request);
      const json = await response.json();

      expect(response.status).toBe(503);
      expect(json.error).toBe("API write access is not configured");
    } finally {
      restoreEnv("FIBERTRACEBOX_REQUIRE_API_KEY", previousRequired);
      restoreEnv("FIBERTRACEBOX_API_KEY", previousKey);
    }
  });

  it("accepts same-origin dashboard write cookie when API key protection is enabled", async () => {
    const previousKey = process.env.FIBERTRACEBOX_API_KEY;
    process.env.FIBERTRACEBOX_API_KEY = "test-dashboard-key";

    try {
      const request = new Request("http://localhost/api/scenarios/run", {
        method: "POST",
        headers: { cookie: "fibertracebox_write=test-dashboard-key" },
        body: JSON.stringify({ scenario: "route-capacity" })
      });

      const response = await scenarioPost(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.trace.mode).toBe("sandbox");
    } finally {
      restoreEnv("FIBERTRACEBOX_API_KEY", previousKey);
    }
  });

  it("still rejects external writes without API key or dashboard cookie", async () => {
    const previousKey = process.env.FIBERTRACEBOX_API_KEY;
    process.env.FIBERTRACEBOX_API_KEY = "test-dashboard-key";

    try {
      const request = new Request("http://localhost/api/scenarios/run", {
        method: "POST",
        body: JSON.stringify({ scenario: "route-capacity" })
      });

      const response = await scenarioPost(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    } finally {
      restoreEnv("FIBERTRACEBOX_API_KEY", previousKey);
    }
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
