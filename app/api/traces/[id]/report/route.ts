import { generateReport } from "@/lib/core/report-generator";
import { getTrace, saveReport } from "@/lib/api/repository";
import { jsonError, jsonOk, publicApiError } from "@/lib/api/http";
import { assertSandboxDemoAccess, hasApiKeyAccess } from "@/lib/api/security";
import { toPublicTrace } from "@/lib/api/public-trace";
import { parseReportFormat, parseTraceId } from "@/lib/api/validation";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const traceId = parseTraceId(id);
    const storedTrace = await getTrace(traceId);
    if (!storedTrace) {
      throw publicApiError("Trace not found", 404);
    }

    if (storedTrace.mode === "fiber-rpc" && !hasApiKeyAccess(request)) {
      throw publicApiError("API key required for live Fiber reports", 401);
    }
    if (storedTrace.mode === "sandbox") {
      assertSandboxDemoAccess(request);
    }
    const authenticated = hasApiKeyAccess(request);
    const trace = authenticated ? storedTrace : toPublicTrace(storedTrace);

    const report = generateReport(trace);
    if (authenticated) {
      await saveReport(trace.id, report.markdown, report.json);
    }

    const url = new URL(request.url);
    const format = parseReportFormat(url.searchParams.get("format"));

    if (format === "markdown") {
      return new Response(report.markdown, {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8"
        }
      });
    }

    if (format === "json") {
      return jsonOk(report.json);
    }

    return jsonOk(report);
  } catch (error) {
    return jsonError(error);
  }
}
