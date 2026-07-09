import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

describe("dashboard middleware", () => {
  const previousApiKey = process.env.FIBERTRACEBOX_API_KEY;

  afterEach(() => {
    restoreEnv("FIBERTRACEBOX_API_KEY", previousApiKey);
  });

  it("sets a non-secure dashboard write cookie for HTTP deployments", () => {
    process.env.FIBERTRACEBOX_API_KEY = "test-dashboard-key";

    const response = middleware(new NextRequest("http://67.207.88.22:3000/dashboard"));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("fibertracebox_write=test-dashboard-key");
    expect(setCookie).not.toContain("Secure");
  });

  it("keeps the dashboard write cookie secure for HTTPS deployments", () => {
    process.env.FIBERTRACEBOX_API_KEY = "test-dashboard-key";

    const response = middleware(new NextRequest("http://fibertracebox.example/dashboard", {
      headers: { "x-forwarded-proto": "https" }
    }));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("fibertracebox_write=test-dashboard-key");
    expect(setCookie).toContain("Secure");
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
