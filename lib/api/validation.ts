import { z, type ZodError, type ZodTypeAny } from "zod";
import { publicApiError } from "@/lib/api/http";
import { resolveScenarioName } from "@/lib/core/scenarios";
import type { PaymentAttemptInput, ScenarioName } from "@/lib/types/domain";

const scenarioAliasSchema = z.string().trim().min(1).max(80);
const nodeIdSchema = z.string().trim().min(1).max(200);
const assetSchema = z.string().trim().min(2).max(32).regex(/^[A-Z0-9._-]+$/, "Use an uppercase asset symbol");
const invoiceSchema = z.string().trim().min(8).max(4096);
const pubkeySchema = z.string().trim().regex(/^(0x)?[0-9a-fA-F]{66}$/, "Use a compressed secp256k1 pubkey");

const paymentAttemptBodySchema = z
  .object({
    scenario: scenarioAliasSchema.optional(),
    senderNode: nodeIdSchema.optional(),
    receiverNode: nodeIdSchema.optional(),
    amount: z.number().finite().positive().max(10_000_000_000).optional(),
    asset: assetSchema.optional(),
    feeLimit: z.number().finite().positive().max(10_000_000_000).optional(),
    timeoutMs: z.number().int().positive().max(300_000).optional(),
    invoice: invoiceSchema.optional(),
    targetPubkey: pubkeySchema.optional(),
    keysend: z.boolean().optional(),
    dryRun: z.boolean().optional(),
    maxParts: z.number().int().positive().max(64).optional()
  })
  .strict()
  .refine((body) => !(body.invoice && body.scenario), {
    message: "Provide either invoice or scenario, not both"
  });

const scenarioRunBodySchema = z
  .object({
    scenario: scenarioAliasSchema.optional(),
    name: scenarioAliasSchema.optional(),
    replay: z.boolean().optional()
  })
  .strict()
  .refine((body) => !(body.scenario && body.name), {
    message: "Provide either scenario or name, not both"
  });

const traceIdSchema = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9:_-]+$/, "Invalid trace ID");

const reportFormatSchema = z.enum(["markdown", "json"]).nullable();

export async function parsePaymentAttemptInput(request: Request): Promise<PaymentAttemptInput> {
  const body = await parseJsonBody(request, paymentAttemptBodySchema);
  return {
    ...body,
    scenario: body.scenario ? parseScenarioName(body.scenario) : undefined
  };
}

export async function parseScenarioRunInput(request: Request): Promise<{ scenario: ScenarioName; replay: boolean }> {
  const body = await parseJsonBody(request, scenarioRunBodySchema);
  return {
    scenario: parseScenarioName(body.scenario ?? body.name),
    replay: body.replay ?? false
  };
}

export function parseTraceId(value: string): string {
  const result = traceIdSchema.safeParse(value);
  if (!result.success) {
    throw publicApiError("Invalid trace ID", 400, formatZodError(result.error));
  }
  return result.data;
}

export function parseReportFormat(value: string | null): "markdown" | "json" | null {
  const result = reportFormatSchema.safeParse(value);
  if (!result.success) {
    throw publicApiError("Invalid report format", 400, formatZodError(result.error));
  }
  return result.data;
}

async function parseJsonBody<TSchema extends ZodTypeAny>(request: Request, schema: TSchema): Promise<z.infer<TSchema>> {
  let raw: unknown = {};
  const body = await request.text();

  if (body.trim()) {
    try {
      raw = JSON.parse(body);
    } catch {
      throw publicApiError("Request body must be valid JSON", 400);
    }
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw publicApiError("Invalid request body", 400, formatZodError(result.error));
  }

  return result.data;
}

function parseScenarioName(value: string | undefined): ScenarioName {
  try {
    return resolveScenarioName(value);
  } catch {
    throw publicApiError("Unknown scenario", 400);
  }
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "body",
    message: issue.message
  }));
}
