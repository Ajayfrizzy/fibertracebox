import { timingSafeEqual } from "node:crypto";
import { publicApiError } from "@/lib/api/http";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitBuckets = new Map<string, RateLimitEntry>();

export function assertWriteAccess(request: Request, scope: string) {
  enforceRateLimit(request, scope);
  enforceApiKey(request);
}

export function assertSandboxDemoAccess(request: Request) {
  enforceRateLimit(request, "sandbox:demo");
  if (process.env.FIBERTRACEBOX_ALLOW_PUBLIC_SANDBOX === "true") {
    return;
  }
  enforceApiKey(request);
}

export function assertPublicLiveDryRunAccess(request: Request) {
  enforceRateLimit(request, "fiber:public-dry-run", "FIBERTRACEBOX_PUBLIC_LIVE_RATE_LIMIT_MAX", 10);
  if (process.env.FIBERTRACEBOX_ALLOW_PUBLIC_LIVE_DRY_RUN !== "true") {
    throw publicApiError("Unauthorized", 401);
  }
}

export function hasApiKeyAccess(request: Request): boolean {
  const configuredKey = process.env.FIBERTRACEBOX_API_KEY?.trim();
  const providedKey = getProvidedApiKey(request);
  return Boolean(configuredKey && providedKey && safeEqual(providedKey, configuredKey));
}

function enforceApiKey(request: Request) {
  const configuredKey = process.env.FIBERTRACEBOX_API_KEY?.trim();
  const requireApiKey = process.env.NODE_ENV === "production" || process.env.FIBERTRACEBOX_REQUIRE_API_KEY === "true";

  if (!configuredKey) {
    if (requireApiKey) {
      throw publicApiError("API write access is not configured", 503);
    }
    return;
  }

  const providedKey = getProvidedApiKey(request);
  if (!providedKey || !safeEqual(providedKey, configuredKey)) {
    throw publicApiError("Unauthorized", 401);
  }
}

function enforceRateLimit(request: Request, scope: string, limitVariable = "FIBERTRACEBOX_RATE_LIMIT_MAX", fallbackLimit = 60) {
  const limit = readPositiveInteger(process.env[limitVariable], fallbackLimit);
  const windowMs = readPositiveInteger(process.env.FIBERTRACEBOX_RATE_LIMIT_WINDOW_MS, 60_000);
  const now = Date.now();
  const key = `${scope}:${getClientAddress(request)}`;
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  current.count += 1;
  if (current.count > limit) {
    throw publicApiError("Rate limit exceeded", 429);
  }
}

function getProvidedApiKey(request: Request): string | undefined {
  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey) {
    return headerKey;
  }

  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return undefined;
}

function getClientAddress(request: Request): string {
  // Only trust forwarding headers when the deployment explicitly sits behind a
  // proxy that overwrites them. Otherwise clients could rotate spoofed values.
  if (process.env.FIBERTRACEBOX_TRUST_PROXY === "true") {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "proxy";
  }
  return "direct";
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
