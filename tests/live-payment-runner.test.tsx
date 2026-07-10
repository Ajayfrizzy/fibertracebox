// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LivePaymentRunner } from "@/components/fiber/live-payment-runner";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("LivePaymentRunner operator access", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("keeps public mode dry-run only and unlocks masked operator access for the session", () => {
    render(<LivePaymentRunner liveEnabled allowLivePayments publicDryRunsEnabled probe={{ ok: true, channelCount: 1 }} />);

    expect(screen.getByText(/Public dry-run mode is enabled/)).toBeTruthy();
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Operator Access" }));

    const keyInput = screen.getByLabelText("Operator API key");
    expect(keyInput.getAttribute("type")).toBe("password");
    fireEvent.change(keyInput, { target: { value: "operator-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock Operator Mode" }));

    expect(screen.getByText("Operator access active")).toBeTruthy();
    expect(window.sessionStorage.getItem("fibertracebox.apiKey")).toBe("operator-secret");
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Lock" }));
    expect(window.sessionStorage.getItem("fibertracebox.apiKey")).toBeNull();
    expect(screen.getByText(/Public dry-run mode is enabled/)).toBeTruthy();
  });
});
