import type { PaymentStatus, TraceSeverity } from "@/lib/types/domain";

const statusClass: Record<PaymentStatus, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  replayed: "border-cyan-200 bg-cyan-50 text-cyan-700"
};

const severityClass: Record<TraceSeverity, string> = {
  info: "border-gray-200 bg-gray-50 text-gray-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusClass[status]}`}>
      {status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: TraceSeverity }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold uppercase ${severityClass[severity]}`}>
      {severity}
    </span>
  );
}
