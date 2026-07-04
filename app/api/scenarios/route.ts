import { scenarios } from "@/lib/core/scenarios";
import { jsonError, jsonOk } from "@/lib/api/http";
import type { ListScenariosResponse } from "@/lib/types/api";

export async function GET() {
  try {
    const response: ListScenariosResponse = {
      scenarios: scenarios.map((scenario) => ({
        name: scenario.name,
        label: scenario.label,
        description: scenario.description
      }))
    };

    return jsonOk(response);
  } catch (error) {
    return jsonError(error);
  }
}
