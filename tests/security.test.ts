import { afterEach, describe, expect, it } from "vitest";
import { assertPublicLiveDryRunAccess, assertSandboxDemoAccess, hasApiKeyAccess } from "@/lib/api/security";
import { toPublicTrace } from "@/lib/api/public-trace";
import type { PaymentTrace } from "@/lib/types/domain";

describe("API security", () => {
  const previousKey = process.env.FIBERTRACEBOX_API_KEY;
  const previousPublicSandbox = process.env.FIBERTRACEBOX_ALLOW_PUBLIC_SANDBOX;
  const previousPublicLive = process.env.FIBERTRACEBOX_ALLOW_PUBLIC_LIVE_DRY_RUN;

  afterEach(() => {
    restoreEnv("FIBERTRACEBOX_API_KEY", previousKey);
    restoreEnv("FIBERTRACEBOX_ALLOW_PUBLIC_SANDBOX", previousPublicSandbox);
    restoreEnv("FIBERTRACEBOX_ALLOW_PUBLIC_LIVE_DRY_RUN", previousPublicLive);
  });

  it("allows public live checks only through explicit dry-run configuration", () => {
    process.env.FIBERTRACEBOX_ALLOW_PUBLIC_LIVE_DRY_RUN = "true";
    expect(() => assertPublicLiveDryRunAccess(new Request("http://localhost/api/traces"))).not.toThrow();
  });

  it("never treats cookies as API credentials", () => {
    process.env.FIBERTRACEBOX_API_KEY = "server-secret";
    const request = new Request("http://localhost/api/traces", {
      headers: { cookie: "fibertracebox_write=server-secret" }
    });
    expect(hasApiKeyAccess(request)).toBe(false);
  });

  it("allows the deterministic demo only through explicit configuration", () => {
    process.env.FIBERTRACEBOX_ALLOW_PUBLIC_SANDBOX = "true";
    expect(() => assertSandboxDemoAccess(new Request("http://localhost/api/scenarios/run"))).not.toThrow();
  });

  it("redacts sensitive live evidence without mutating stored data", () => {
    const trace: PaymentTrace = {
      id: "trace_live",
      createdAt: "2026-07-10T00:00:00.000Z",
      mode: "fiber-rpc",
      senderNode: "02" + "1".repeat(64),
      receiverNode: "03" + "2".repeat(64),
      amount: 100_000_000,
      asset: "CKB",
      status: "failed",
      latencyMs: 12,
      failureFingerprint: "ROUTE_CAPACITY_INSUFFICIENT",
      events: [
        {
          id: "event_live",
          traceId: "trace_live",
          timestampMs: 5,
          stage: "channel_snapshot",
          message: "captured",
          severity: "success",
          metadata: {
            pubkey: "secret-pubkey",
            paymentHash: "secret-hash",
            channels: [{ channelId: "secret-channel", peerPubkey: "secret-peer", localBalance: "0xff", remoteBalance: "0xee" }]
          }
        }
      ],
      replayResults: []
    };

    const safe = toPublicTrace(trace);
    expect(JSON.stringify(safe)).not.toContain("secret-");
    expect(JSON.stringify(trace)).toContain("secret-channel");
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
