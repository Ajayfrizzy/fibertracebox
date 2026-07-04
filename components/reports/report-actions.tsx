"use client";

import { useState } from "react";
import { Clipboard, Download } from "lucide-react";

interface ReportActionsProps {
  traceId: string;
  markdown: string;
}

export function ReportActions({ traceId, markdown }: ReportActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyReport() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadReport() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${traceId}-fibertracebox-report.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copyReport}
        className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm"
      >
        <Clipboard size={16} />
        {copied ? "Copied" : "Copy Report"}
      </button>
      <button
        type="button"
        onClick={downloadReport}
        className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white shadow-sm"
      >
        <Download size={16} />
        Download Report
      </button>
    </div>
  );
}
