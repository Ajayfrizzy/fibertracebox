// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LivePaymentRunner } from "@/components/fiber/live-payment-runner";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("LivePaymentRunner operator access", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("keeps public mode dry-run only and unlocks masked operator access for the session", () => {
    const nodePubkey = "025cb868b35b602d1330597066a123e161ddd91bc556fe";
    render(<LivePaymentRunner liveEnabled allowLivePayments publicDryRunsEnabled probe={{ ok: true, channelCount: 1, pubkey: nodePubkey }} />);

    expect(screen.getByText(/Public dry-run mode is enabled/)).toBeTruthy();
    expect(screen.queryByText(nodePubkey)).toBeNull();
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Operator Access" }));

    const keyInput = screen.getByLabelText("Operator API key");
    expect(keyInput.getAttribute("type")).toBe("password");
    fireEvent.change(keyInput, { target: { value: "operator-secret" } });
    expect((keyInput as HTMLInputElement).value).toBe("operator-secret");
    fireEvent.click(screen.getByRole("button", { name: "Unlock Operator Mode" }));

    expect(screen.getByText("Operator access active")).toBeTruthy();
    expect(screen.queryByDisplayValue("operator-secret")).toBeNull();
    expect(window.sessionStorage.getItem("fibertracebox.apiKey")).toBe("operator-secret");
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Lock" }));
    expect(window.sessionStorage.getItem("fibertracebox.apiKey")).toBeNull();
    expect(screen.getByText(/Public dry-run mode is enabled/)).toBeTruthy();
  });
});
