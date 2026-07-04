import { timingSafeEqual } from "node:crypto";
import { DASHBOARD_WRITE_COOKIE } from "@/lib/api/auth-constants";
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

function enforceApiKey(request: Request) {
  const configuredKey = process.env.FIBERTRACEBOX_API_KEY?.trim();
  const requireApiKey = process.env.NODE_ENV === "production" || process.env.FIBERTRACEBOX_REQUIRE_API_KEY === "true";

  if (!configuredKey) {
    if (requireApiKey) {
      throw publicApiError("API write access is not configured", 503);
    }
    return;
  }

  if (hasDashboardWriteCookie(request, configuredKey)) {
    return;
  }

  const providedKey = getProvidedApiKey(request);
  if (!providedKey || !safeEqual(providedKey, configuredKey)) {
    throw publicApiError("Unauthorized", 401);
  }
}

function hasDashboardWriteCookie(request: Request, configuredKey: string): boolean {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return false;
  }

  const value = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${DASHBOARD_WRITE_COOKIE}=`))
    ?.slice(DASHBOARD_WRITE_COOKIE.length + 1);

  return Boolean(value && safeEqual(decodeURIComponent(value), configuredKey));
}

function enforceRateLimit(request: Request, scope: string) {
  const limit = readPositiveInteger(process.env.FIBERTRACEBOX_RATE_LIMIT_MAX, 60);
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
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
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
