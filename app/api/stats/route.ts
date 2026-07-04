import { listTraces } from "@/lib/api/repository";
import { jsonError, jsonOk } from "@/lib/api/http";
import { calculateStats } from "@/lib/core/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const traces = await listTraces();
    return jsonOk(calculateStats(traces));
  } catch (error) {
    return jsonError(error);
  }
}
