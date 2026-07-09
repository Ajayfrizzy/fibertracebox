import { NextResponse, type NextRequest } from "next/server";
import { DASHBOARD_WRITE_COOKIE } from "@/lib/api/auth-constants";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const apiKey = process.env.FIBERTRACEBOX_API_KEY?.trim();

  if (apiKey && isDashboardRequest(request)) {
    response.cookies.set(DASHBOARD_WRITE_COOKIE, apiKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttpsRequest(request),
      path: "/"
    });
  }

  return response;
}

function isDashboardRequest(request: NextRequest) {
  return request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/dashboard");
}

function isHttpsRequest(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return request.nextUrl.protocol === "https:";
}

export const config = {
  matcher: ["/", "/dashboard/:path*"]
};
