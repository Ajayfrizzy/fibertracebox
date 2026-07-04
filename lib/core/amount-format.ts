import type { PaymentTrace } from "@/lib/types/domain";

const fiberCurrencies = new Set(["Fibb", "Fibt", "Fibd"]);
const shannonsPerCkb = 100_000_000;

export function formatTraceAmount(trace: Pick<PaymentTrace, "amount" | "asset" | "mode">): string {
  if (trace.mode === "fiber-rpc" && fiberCurrencies.has(trace.asset)) {
    return `${formatNumber(trace.amount / shannonsPerCkb)} ${trace.asset}`;
  }

  return `${formatNumber(trace.amount)} ${trace.asset}`;
}

export function formatRawTraceAmount(trace: Pick<PaymentTrace, "amount" | "asset" | "mode">): string | undefined {
  if (trace.mode !== "fiber-rpc" || !fiberCurrencies.has(trace.asset)) {
    return undefined;
  }

  return `${formatNumber(trace.amount)} Shannon`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8
  }).format(value);
}
