#!/usr/bin/env node
import { Command } from "commander";
import { FiberTraceboxClient } from "../sdk/client";

const program = new Command();
const client = new FiberTraceboxClient(process.env.FIBERTRACEBOX_API_URL ?? "http://localhost:3000");

program
  .name("fibertracebox")
  .description("CLI for FiberTracebox failure replay and Fiber payment trace diagnostics.")
  .version("0.1.0");

program.command("health").description("Check API, database, and mode status.").action(async () => {
  print(await client.health());
});

program.command("judge-demo").description("Run the canonical route-capacity demo with Replay-to-Fix enabled.").action(async () => {
  const result = await client.runScenario("route-capacity", true);
  const traceId = result.trace.id;

  print({
    traceId,
    status: result.trace.status,
    fingerprint: result.trace.failureFingerprint,
    recommended: result.recommended,
    traceUrl: `${process.env.FIBERTRACEBOX_API_URL ?? "http://localhost:3000"}/dashboard/traces/${traceId}`,
    replayUrl: `${process.env.FIBERTRACEBOX_API_URL ?? "http://localhost:3000"}/dashboard/replay?trace=${traceId}`,
    markdownReport: `${process.env.FIBERTRACEBOX_API_URL ?? "http://localhost:3000"}/api/traces/${traceId}/report?format=markdown`
  });
});

const scenario = program.command("scenario").description("Run deterministic sandbox scenarios.");
scenario
  .command("run")
  .argument("<name>", "Scenario name, such as route-capacity, peer-offline, or payment-timeout")
  .description("Run a sandbox scenario and create a trace.")
  .action(async (name: string) => {
    print(await client.runScenario(name));
  });

const trace = program.command("trace").description("Inspect traces.");
trace.command("list").description("List payment traces.").action(async () => {
  print(await client.listTraces());
});
trace
  .command("inspect")
  .argument("<traceId>", "Trace ID")
  .description("Inspect a trace with events, diagnosis, replay results, and report status.")
  .action(async (traceId: string) => {
    print(await client.getTrace(traceId));
  });

program
  .command("live")
  .argument("<invoice>", "Fiber invoice address")
  .option("--send", "Send a live payment instead of a dry-run")
  .option("--amount <amount>", "Override invoice amount in Shannon", parseNumber)
  .option("--fee-limit <amount>", "Max fee amount in Shannon", parseNumber)
  .description("Create a live Fiber RPC trace from an invoice.")
  .action(async (invoice: string, options: { send?: boolean; amount?: number; feeLimit?: number }) => {
    print(
      await client.createTrace({
        invoice,
        dryRun: !options.send,
        ...(options.amount !== undefined ? { amount: options.amount } : {}),
        ...(options.feeLimit !== undefined ? { feeLimit: options.feeLimit } : {})
      })
    );
  });

program
  .command("replay")
  .argument("<traceId>", "Trace ID")
  .description("Run Replay-to-Fix scenarios for a trace.")
  .action(async (traceId: string) => {
    print(await client.replayTrace(traceId));
  });

program
  .command("verify")
  .argument("<traceId>", "Failed live Fiber trace ID")
  .argument("<invoice>", "Fresh or corrected Fiber invoice")
  .option("--amount <amount>", "Amount override in Shannon", parseNumber)
  .option("--fee-limit <amount>", "Max fee amount in Shannon", parseNumber)
  .description("Verify an operator fix with a linked FNN dry-run.")
  .action(async (traceId: string, invoice: string, options: { amount?: number; feeLimit?: number }) => {
    print(await client.verifyLiveTrace(traceId, {
      invoice,
      dryRun: true,
      ...(options.amount !== undefined ? { amount: options.amount } : {}),
      ...(options.feeLimit !== undefined ? { feeLimit: options.feeLimit } : {})
    }));
  });

program
  .command("report")
  .argument("<traceId>", "Trace ID")
  .option("--format <format>", "markdown or json", "markdown")
  .description("Generate a trace debug report.")
  .action(async (traceId: string, options: { format: "markdown" | "json" }) => {
    const report = await client.getReport(traceId, options.format);
    if (typeof report === "string") {
      process.stdout.write(report);
      return;
    }
    print(report);
  });

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

function print(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

function parseNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive number, received "${value}"`);
  }

  return parsed;
}
