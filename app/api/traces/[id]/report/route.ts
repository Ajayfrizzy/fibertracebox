import { generateReport } from "@/lib/core/report-generator";
import { getTrace, saveReport } from "@/lib/api/repository";
import { jsonError, jsonOk, publicApiError } from "@/lib/api/http";
import { assertWriteAccess } from "@/lib/api/security";
import { parseReportFormat, parseTraceId } from "@/lib/api/validation";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    assertWriteAccess(request, "traces:report");
    const traceId = parseTraceId(context.params.id);
    const trace = await getTrace(traceId);
    if (!trace) {
      throw publicApiError("Trace not found", 404);
    }

    const report = generateReport(trace);
    await saveReport(trace.id, report.markdown, report.json);

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
