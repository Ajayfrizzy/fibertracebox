"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clipboard, Search } from "lucide-react";
import type { FailureFingerprint, PaymentMode, PaymentStatus, PaymentTrace } from "@/lib/types/domain";
import { formatTraceAmount } from "@/lib/core/amount-format";
import { formatTraceCreatedAt } from "@/lib/core/time-format";
import { StatusBadge } from "@/components/traces/status-badge";

interface TraceTableProps {
  traces: PaymentTrace[];
  compact?: boolean;
}

type SortKey = "created_desc" | "created_asc" | "latency_desc" | "latency_asc";

const pageSize = 8;

export function TraceTable({ traces, compact = false }: TraceTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [mode, setMode] = useState<PaymentMode | "all">("all");
  const [fingerprint, setFingerprint] = useState<FailureFingerprint | "all">("all");
  const [sort, setSort] = useState<SortKey>("created_desc");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fingerprints = useMemo(
    () => Array.from(new Set(traces.map((trace) => trace.failureFingerprint).filter(Boolean))).sort() as FailureFingerprint[],
    [traces]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const next = traces.filter((trace) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          trace.id,
          trace.senderNode,
          trace.receiverNode,
          trace.asset,
          trace.failureFingerprint ?? "",
          trace.status,
          trace.mode
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = status === "all" || trace.status === status;
      const matchesMode = mode === "all" || trace.mode === mode;
      const matchesFingerprint = fingerprint === "all" || trace.failureFingerprint === fingerprint;

      return matchesQuery && matchesStatus && matchesMode && matchesFingerprint;
    });

    return next.sort((left, right) => {
      switch (sort) {
        case "created_asc":
          return left.createdAt.localeCompare(right.createdAt);
        case "latency_desc":
          return right.latencyMs - left.latencyMs;
        case "latency_asc":
          return left.latencyMs - right.latencyMs;
        case "created_desc":
        default:
          return right.createdAt.localeCompare(left.createdAt);
      }
    });
  }, [fingerprint, mode, query, sort, status, traces]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = compact ? filtered.slice(0, 6) : filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setMode("all");
    setFingerprint("all");
    setSort("created_desc");
    setPage(1);
  }

  async function copyTraceId(id: string) {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  if (!traces.length) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
        <p className="text-sm font-semibold text-ink">No traces recorded yet.</p>
        <p className="mt-1 text-sm text-gray-500">Run a sandbox scenario to create a deterministic Fiber payment trace.</p>
        <Link
          href="/dashboard/sandbox"
          className="mt-4 inline-flex items-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          Open Sandbox
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      {!compact && (
        <div className="border-b border-line bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(4,minmax(0,0.7fr))_auto]">
            <label className="relative">
              <span className="sr-only">Search traces</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-md border border-line bg-panel pl-9 pr-3 text-sm text-ink outline-none focus:border-ckb focus:bg-white"
                placeholder="Search ID, node, asset, fingerprint"
              />
            </label>
            <FilterSelect
              label="Status"
              value={status}
              onChange={(value) => {
                setStatus(value as PaymentStatus | "all");
                setPage(1);
              }}
              options={["all", "success", "pending", "failed", "replayed"]}
            />
            <FilterSelect
              label="Mode"
              value={mode}
              onChange={(value) => {
                setMode(value as PaymentMode | "all");
                setPage(1);
              }}
              options={["all", "sandbox", "fiber-rpc"]}
            />
            <FilterSelect
              label="Fingerprint"
              value={fingerprint}
              onChange={(value) => {
                setFingerprint(value as FailureFingerprint | "all");
                setPage(1);
              }}
              options={["all", ...fingerprints]}
            />
            <FilterSelect
              label="Sort"
              value={sort}
              onChange={(value) => setSort(value as SortKey)}
              options={["created_desc", "created_asc", "latency_desc", "latency_asc"]}
              labels={{
                created_desc: "Newest",
                created_asc: "Oldest",
                latency_desc: "Latency high",
                latency_asc: "Latency low"
              }}
            />
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink shadow-sm hover:border-ckb"
            >
              Reset
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <span>
              Showing <span className="font-semibold text-ink">{visible.length}</span> of{" "}
              <span className="font-semibold text-ink">{filtered.length}</span> matching traces
            </span>
            {filtered.length !== traces.length && <span>{traces.length} total recorded</span>}
          </div>
        </div>
      )}

      {filtered.length ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max divide-y divide-line text-sm">
              <thead className="bg-panel text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  {!compact && <th className="px-4 py-3 font-semibold">Amount</th>}
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Fingerprint</th>
                  {!compact && <th className="px-4 py-3 font-semibold">Mode</th>}
                  <th className="px-4 py-3 font-semibold">Latency</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  {!compact && <th className="px-4 py-3 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((trace) => (
                  <tr key={trace.id} className="group hover:bg-panel/70">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        className="mono block max-w-[220px] truncate font-semibold text-ckb hover:underline"
                        href={`/dashboard/traces/${trace.id}`}
                      >
                        {compact ? trace.id.slice(0, 18) : trace.id}
                      </Link>
                    </td>
                    {!compact && (
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">
                        {formatTraceAmount(trace)}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={trace.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="mono text-xs text-gray-700">{trace.failureFingerprint ?? "none"}</span>
                    </td>
                    {!compact && <td className="whitespace-nowrap px-4 py-3 text-gray-700">{trace.mode}</td>}
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{trace.latencyMs}ms</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatTraceCreatedAt(trace.createdAt)}</td>
                    {!compact && (
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/traces/${trace.id}`}
                            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:border-ckb"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            onClick={() => copyTraceId(trace.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink shadow-sm hover:border-ckb"
                          >
                            {copiedId === trace.id ? <Check size={14} /> : <Clipboard size={14} />}
                            {copiedId === trace.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!compact && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
              <span className="text-gray-600">
                Page <span className="font-semibold text-ink">{safePage}</span> of{" "}
                <span className="font-semibold text-ink">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-2 font-semibold text-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-2 font-semibold text-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm font-semibold text-ink">No traces match the current filters.</p>
          <p className="mt-1 text-sm text-gray-500">Adjust the search, status, fingerprint, or mode filters.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  labels = {}
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-line bg-panel px-3 text-sm text-ink outline-none focus:border-ckb focus:bg-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatOption(value: string) {
  if (value === "all") {
    return "All";
  }

  return value.replaceAll("_", " ");
}
