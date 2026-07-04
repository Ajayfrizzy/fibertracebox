"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";

export function CopyCommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="group relative mt-1 rounded-md bg-ink">
      <pre className="mono whitespace-pre-wrap break-words p-3 pr-24 text-xs leading-5 text-gray-100">
        <code>{command}</code>
      </pre>
      <button
        type="button"
        onClick={copyCommand}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
        aria-label={copied ? "Command copied" : "Copy command"}
      >
        {copied ? <Check size={13} /> : <Clipboard size={13} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
