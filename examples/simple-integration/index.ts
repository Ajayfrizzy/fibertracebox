import { FiberTraceboxClient } from "../../sdk";

async function main() {
  const client = new FiberTraceboxClient(process.env.FIBERTRACEBOX_API_URL ?? "http://localhost:3000");
  const run = await client.runScenario("route-capacity");
  await client.replayTrace(run.trace.id);
  const report = await client.getReport(run.trace.id, "markdown");
  console.log(report);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
