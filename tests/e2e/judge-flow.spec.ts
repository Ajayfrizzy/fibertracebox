import { expect, test } from "@playwright/test";

test("judge can run, inspect, replay, and export the deterministic demo", async ({ page, request }) => {
  await page.goto("/dashboard/judge-demo");
  await expect(page.getByRole("heading", { name: "Five-minute FiberTracebox walkthrough" })).toBeVisible();

  await page.getByRole("button", { name: "Run Full Demo" }).click();
  await expect(page).toHaveURL(/\/dashboard\/traces\/trace_/);
  await expect(page.getByText("ROUTE_CAPACITY_INSUFFICIENT", { exact: true })).toBeVisible();
  await expect(page.getByText("split_payment", { exact: true })).toBeVisible();

  const traceId = page.url().split("/").at(-1);
  expect(traceId).toBeTruthy();
  const report = await request.get(`/api/traces/${traceId}/report?format=markdown`);
  expect(report.ok()).toBe(true);
  expect(await report.text()).toContain("# FiberTracebox Report");

  await page.getByRole("button", { name: /Replay in Lab|Retry Replay/ }).click();
  await expect(page.getByRole("heading", { name: "Replay Lab" })).toBeVisible();
  await expect(page.getByText("Smallest route-capacity fix", { exact: true })).toBeVisible();
});
