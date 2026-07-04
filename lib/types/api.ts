import type { Diagnosis, PaymentTrace, ReplayResult, ScenarioName, Stats, TraceReport, TraceWithAnalysis } from "./domain";

export interface ApiError {
  error: string;
}

export interface HealthResponse {
  status: "ok";
  database: "supabase" | "memory";
  mode: "sandbox" | "fiber-rpc";
  fiberRpcEnabled: boolean;
  fiberRpc: {
    requested: boolean;
    configured: boolean;
    adapterReadyOnly: boolean;
    liveEnabled: boolean;
    allowLivePayments?: boolean;
    probe?: {
      ok: boolean;
      error?: string;
      pubkey?: string;
      version?: string;
      nodeName?: string;
      addresses?: string[];
      channelCount?: number;
    };
  };
}

export interface ScenarioRunResponse {
  trace: PaymentTrace;
  diagnosis?: Diagnosis;
  replayResults?: ReplayResult[];
  recommended?: ReplayResult;
}

export interface ReplayResponse {
  trace: PaymentTrace;
  replayResults: ReplayResult[];
  recommended?: ReplayResult;
}

export interface ListScenariosResponse {
  scenarios: Array<{
    name: ScenarioName;
    label: string;
    description: string;
  }>;
}

export type TraceDetailResponse = TraceWithAnalysis;
export type StatsResponse = Stats;
export type ReportResponse = TraceReport;
