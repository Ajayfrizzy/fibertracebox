import type {
  HealthResponse,
  ListScenariosResponse,
  LiveVerificationResponse,
  ReplayResponse,
  ReportResponse,
  ScenarioRunResponse,
  StatsResponse,
  TraceDetailResponse
} from "../lib/types/api";
import type { PaymentAttemptInput } from "../lib/types/domain";

export class FiberTraceboxClient {
  constructor(
    private readonly baseUrl = process.env.FIBERTRACEBOX_API_URL ?? "http://localhost:3000",
    private readonly apiKey = process.env.FIBERTRACEBOX_API_KEY
  ) {}

  async health(): Promise<HealthResponse> {
    return this.request("/api/health");
  }

  async createTrace(input: PaymentAttemptInput = {}): Promise<ScenarioRunResponse> {
    return this.request("/api/traces", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async listTraces() {
    return this.request("/api/traces");
  }

  async getTrace(id: string): Promise<TraceDetailResponse> {
    return this.request(`/api/traces/${id}`);
  }

  async runScenario(name: string, replay = false): Promise<ScenarioRunResponse> {
    return this.request("/api/scenarios/run", {
      method: "POST",
      body: JSON.stringify({ scenario: name, replay })
    });
  }

  async listScenarios(): Promise<ListScenariosResponse> {
    return this.request("/api/scenarios");
  }

  async replayTrace(id: string): Promise<ReplayResponse> {
    return this.request(`/api/traces/${id}/replay`, {
      method: "POST"
    });
  }

  async verifyLiveTrace(id: string, input: PaymentAttemptInput): Promise<LiveVerificationResponse> {
    return this.request(`/api/traces/${id}/verify`, { method: "POST", body: JSON.stringify(input) });
  }

  async getReport(id: string, format: "markdown" | "json" | "both" = "both"): Promise<ReportResponse | string | ReportResponse["json"]> {
    const suffix = format === "both" ? "" : `?format=${format}`;
    const response = await fetch(`${this.baseUrl}${`/api/traces/${id}/report${suffix}`}`, {
      headers: this.authHeaders()
    });
    if (!response.ok) {
      throw new Error(`FiberTracebox API error ${response.status}: ${await response.text()}`);
    }

    if (format === "markdown") {
      return response.text();
    }

    return response.json();
  }

  async stats(): Promise<StatsResponse> {
    return this.request("/api/stats");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...this.authHeaders(),
        ...init.headers
      }
    });

    if (!response.ok) {
      throw new Error(`FiberTracebox API error ${response.status}: ${await response.text()}`);
    }

    return response.json() as Promise<T>;
  }

  private authHeaders(): HeadersInit {
    return this.apiKey ? { "x-api-key": this.apiKey } : {};
  }
}
