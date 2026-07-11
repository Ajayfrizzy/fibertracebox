import { CopyCommandBlock } from "@/components/docs/copy-command-block";

const publicApiBaseUrl =
  normalizeOrigin(process.env.FIBERTRACEBOX_PUBLIC_URL ?? process.env.NEXT_PUBLIC_FIBERTRACEBOX_PUBLIC_URL) ??
  "https://fibertracebox.online";

const localCliExamples = [
  "npm run cli -- health",
  "npm run demo:judge",
  "npm run cli -- scenario run route-capacity",
  "npm run cli -- live <fiber-invoice>",
  "npm run cli -- trace list",
  "npm run cli -- replay <traceId>",
  "npm run cli -- verify <failed-live-trace-id> <fresh-invoice>",
  "npm run cli -- report <traceId> --format markdown"
];

const linkedCliExamples = [
  "npm run build:cli",
  "npm link",
  "fibertracebox health",
  "fibertracebox scenario run route-capacity",
  "fibertracebox live <fiber-invoice>",
  "fibertracebox trace list"
];

export default function DocsPage() {
  const apiExamples = getApiExamples(publicApiBaseUrl);

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 sm:px-6 lg:px-8">
      <div className="min-w-0 rounded-lg border border-line bg-white p-6 shadow-sm">
        <p className="mono text-xs font-semibold uppercase text-ckb">Docs/API</p>
        <h1 className="mt-2 break-words text-2xl font-semibold text-ink sm:text-3xl">FiberTracebox integration surface</h1>
        <p className="mt-3 leading-7 text-gray-700">
          The app runs fully in sandbox mode for deterministic demos and can also connect to a Fiber Network Node JSON-RPC
          endpoint for live payment dry-runs or explicitly enabled live sends.
        </p>
        <div className="mt-4 rounded-md border border-line bg-panel px-3 py-2">
          <p className="text-xs font-semibold uppercase text-gray-500">Live API base</p>
          <p className="mono mt-1 break-all text-sm font-semibold text-ink">{publicApiBaseUrl}</p>
        </div>
      </div>

      <section className="mt-6 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">API Examples</h2>
          <div className="mt-4 space-y-3">
            {apiExamples.map(([label, command]) => (
              <div key={label}>
                <p className="text-sm font-semibold text-gray-600">{label}</p>
                <CopyCommandBlock command={command} />
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">CLI Examples</h2>
          <p className="mt-1 text-sm text-gray-600">Use these from the project folder while developing locally.</p>
          <div className="mt-4 space-y-3">
            {localCliExamples.map((command) => (
              <CopyCommandBlock key={command} command={command} />
            ))}
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-ink">Optional linked binary</h3>
            <p className="mt-1 text-sm text-gray-600">
              Run <span className="mono">npm run build:cli</span>, then <span className="mono">npm link</span> once if
              you want the global <span className="mono">fibertracebox</span> command.
            </p>
            <div className="mt-3 space-y-3">
              {linkedCliExamples.map((command) => (
                <CopyCommandBlock key={command} command={command} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">CLI Setup</h2>
        <p className="mt-2 leading-7 text-gray-700">
          The local CLI reads <span className="mono">FIBERTRACEBOX_API_URL</span> and{" "}
          <span className="mono">FIBERTRACEBOX_API_KEY</span> from your shell environment. Set the API URL to this
          deployment when using the live link. If write protection is enabled, export the same API key used by the server
          before running write commands.
        </p>
        <CopyCommandBlock command={`export FIBERTRACEBOX_API_URL=${publicApiBaseUrl}`} />
        <CopyCommandBlock command="export FIBERTRACEBOX_API_KEY=<your-api-key>" />
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Sandbox Mode</h2>
        <p className="mt-2 leading-7 text-gray-700">
          Sandbox mode simulates Fiber payment failures using deterministic routes, channel capacity, peer state, fees,
          timeouts, retries, and liquidity conditions. Use it for repeatable demos, testing, and debugging without connecting to
          a live Fiber node.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Optional Fiber RPC Mode</h2>
        <p className="mt-2 leading-7 text-gray-700">
          Fiber RPC mode connects FiberTracebox to a Fiber Network Node. The app checks node health and channel state, then
          creates dry-run or live payment traces from invoices. Live sends require explicit server-side enablement.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Live Node Boundaries</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>Run your Fiber node separately and keep its JSON-RPC endpoint private.</li>
          <li>Use valid invoices, connected peers, open channels, and sufficient liquidity.</li>
          <li>Replay-to-Fix executes controlled strategies for sandbox traces. Live traces receive suggested fix plans whose outcomes are recorded only through FNN Live Verification.</li>
          <li>Live Verification links a corrected, server-enforced FNN dry-run when a receiver or fresh invoice is available.</li>
          <li>Use the Live Fiber RPC panel for FNN-backed checks and sandbox scenarios for synthetic demos.</li>
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Evidence Bundles</h2>
        <p className="mt-2 leading-7 text-gray-700">
          Reports include trace timelines, failure fingerprints, replay evidence, and recommended fixes. Markdown and JSON
          exports can be generated from each trace detail page or through the API.
        </p>
        <p className="mt-3 leading-7 text-gray-700">
          The repository proof bundle is a real local Fiber testnet live send from Node1 (sender) to Node2 (receiver), captured on
          2026-07-04. The hosted deployment currently uses the Node1 environment, but its current pubkey differs from the
          historical capture.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Capabilities</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>Sandbox failure simulation for route, capacity, peer, fee, timeout, and liquidity cases.</li>
          <li>Fiber RPC health checks, invoice dry-runs, and live-send traces when enabled.</li>
          <li>Failure diagnosis with fingerprints, likely causes, and suggested fixes.</li>
          <li>Replay-to-Fix recommendations for finding the smallest successful change.</li>
          <li>Linked Live Verification dry-runs for failed Fiber traces when a receiver is available.</li>
          <li>Markdown and JSON report exports for sharing trace evidence.</li>
          <li>Dashboard, API, CLI, and SDK surfaces for integrating payment diagnostics.</li>
        </ul>
      </section>
    </div>
  );
}

function getApiExamples(apiBaseUrl: string): Array<[string, string]> {
  return [
    ["Health", `curl ${apiBaseUrl}/api/health`],
    [
      "Run scenario",
      `curl -X POST ${apiBaseUrl}/api/scenarios/run -H 'content-type: application/json' -H "x-api-key: $FIBERTRACEBOX_API_KEY" -d '{"scenario":"route-capacity"}'`
    ],
    [
      "Live dry-run",
      `curl -X POST ${apiBaseUrl}/api/traces -H 'content-type: application/json' -H "x-api-key: $FIBERTRACEBOX_API_KEY" -d '{"invoice":"<fiber-invoice>","dryRun":true}'`
    ],
    ["Replay trace", `curl -X POST ${apiBaseUrl}/api/traces/<traceId>/replay -H "x-api-key: $FIBERTRACEBOX_API_KEY"`],
    ["Verify live fix", `curl -X POST ${apiBaseUrl}/api/traces/<traceId>/verify -H 'content-type: application/json' -H "x-api-key: $FIBERTRACEBOX_API_KEY" -d '{"invoice":"<fresh-invoice>"}'`],
    ["Markdown report", `curl ${apiBaseUrl}/api/traces/<traceId>/report?format=markdown`]
  ];
}

function normalizeOrigin(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }

  const trimmed = value.trim().replace(/\/+$/, "");

  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}
