import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100/dashboard/judge-demo",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      FIBERTRACEBOX_ALLOW_PUBLIC_SANDBOX: "true",
      FIBER_RPC_ENABLED: "false",
      FIBER_RPC_LIVE_ENABLED: "false"
    }
  }
});
