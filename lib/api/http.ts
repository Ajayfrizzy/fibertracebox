import { NextResponse } from "next/server";

export class PublicApiError extends Error {
  constructor(
    readonly publicMessage: string,
    readonly status = 400,
    readonly details?: unknown
  ) {
    super(publicMessage);
    this.name = "PublicApiError";
  }
}

export function publicApiError(message: string, status = 400, details?: unknown) {
  return new PublicApiError(message, status, details);
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown, fallbackStatus = 500) {
  if (error instanceof PublicApiError) {
    return NextResponse.json(
      {
        error: error.publicMessage,
        ...(error.details ? { details: error.details } : {})
      },
      { status: error.status }
    );
  }

  if (fallbackStatus >= 500) {
    console.error("FiberTracebox API error", error);
  }

  const message = fallbackStatus >= 500 ? "Unexpected server error" : "Request failed";
  return NextResponse.json({ error: message }, { status: fallbackStatus });
}
