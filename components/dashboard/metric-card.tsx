import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  compactValue?: boolean;
}

export function MetricCard({ label, value, detail, icon: Icon, compactValue = false }: MetricCardProps) {
  return (
    <div className="h-full min-w-0 overflow-hidden rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-gray-500">{label}</p>
          <p
            className={`mt-2 max-w-full break-words font-semibold leading-tight text-ink ${
              compactValue ? "text-xl" : "text-3xl"
            }`}
          >
            {value}
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-panel text-ckb">
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-3 break-words text-sm text-gray-600">{detail}</p>
    </div>
  );
}
