import { CopyCommandBlock } from "@/components/docs/copy-command-block";

const apiExamples = [
  ["Health", "curl http://localhost:3000/api/health"],
  [
    "Run scenario",
    "curl -X POST http://localhost:3000/api/scenarios/run -H 'content-type: application/json' -H \"x-api-key: $FIBERTRACEBOX_API_KEY\" -d '{\"scenario\":\"route-capacity\"}'"
  ],
  [
    "Live dry-run",
    "curl -X POST http://localhost:3000/api/traces -H 'content-type: application/json' -H \"x-api-key: $FIBERTRACEBOX_API_KEY\" -d '{\"invoice\":\"<fiber-invoice>\",\"dryRun\":true}'"
  ],
  ["Replay trace", "curl -X POST http://localhost:3000/api/traces/<traceId>/replay -H \"x-api-key: $FIBERTRACEBOX_API_KEY\""],
  ["Markdown report", "curl http://localhost:3000/api/traces/<traceId>/report?format=markdown"]
];

const localCliExamples = [
  "npm run cli -- health",
  "npm run cli -- scenario run route-capacity",
  "npm run cli -- live <fiber-invoice>",
  "npm run cli -- trace list",
  "npm run cli -- replay <traceId>",
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
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <p className="mono text-xs font-semibold uppercase text-ckb">Docs/API</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">FiberTracebox integration surface</h1>
        <p className="mt-3 leading-7 text-gray-700">
          The app runs fully in sandbox mode for deterministic demos and can also connect to a Fiber Network Node JSON-RPC
          endpoint for live payment dry-runs or explicitly enabled live sends.
        </p>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
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
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
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
          <span className="mono">FIBERTRACEBOX_API_KEY</span> from your shell environment. If write protection is enabled,
          export the same API key used by the server before running write commands.
        </p>
        <CopyCommandBlock command="export FIBERTRACEBOX_API_URL=http://localhost:3000" />
        <CopyCommandBlock command="export FIBERTRACEBOX_API_KEY=<your-api-key>" />
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Sandbox Mode</h2>
        <p className="mt-2 leading-7 text-gray-700">
          Sandbox mode simulates Fiber payment lifecycle events with deterministic topology, capacity, peer, channel, fee,
          timeout, retry, and liquidity failures. It is designed for repeatable hackathon demos and CI tests without requiring a
          live Fiber node.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Optional Fiber RPC Mode</h2>
        <p className="mt-2 leading-7 text-gray-700">
          Set <span className="mono">FIBER_RPC_URL</span>, <span className="mono">FIBER_RPC_ENABLED=true</span>, and{" "}
          <span className="mono">FIBER_RPC_LIVE_ENABLED=true</span> to connect to FNN. The app probes{" "}
          <span className="mono">node_info</span> and <span className="mono">list_channels</span>, then uses{" "}
          <span className="mono">send_payment</span> for invoice checks. Live sends require{" "}
          <span className="mono">FIBER_RPC_ALLOW_LIVE_PAYMENTS=true</span>; otherwise requests are dry-runs.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Live Node Boundaries</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>Run FNN separately and keep its JSON-RPC port private.</li>
          <li>Use a valid Fiber invoice, connected peers, open channels, and sufficient liquidity.</li>
          <li>Replay-to-Fix remains analytical for live traces because replay changes can move funds or mutate channels.</li>
          <li>Sandbox scenario cards are synthetic demos; use the Live Fiber RPC panel for FNN-backed checks.</li>
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">What Works Today</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>Working sandbox adapter and deterministic scenario runner.</li>
          <li>Fiber RPC health probing and invoice dry-run/live-send adapter.</li>
          <li>Failure fingerprint catalog with diagnosis, likely causes, and fixes.</li>
          <li>Replay-to-Fix engine with recommended smallest fix.</li>
          <li>Markdown and JSON report generation.</li>
          <li>Dashboard, API routes, CLI, SDK, Supabase schema, and tests.</li>
        </ul>
      </section>
    </div>
  );
}
