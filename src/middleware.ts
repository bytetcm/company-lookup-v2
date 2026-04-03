import { NextRequest, NextResponse } from "next/server";

/**
 * Rate limiting middleware — IP-based throttle for API routes.
 * 
 * Uses in-memory Map (resets on cold start, but that's fine for Vercel
 * serverless — each instance gets its own limit window).
 * 
 * For production at scale: upgrade to @upstash/ratelimit + Redis.
 */

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;  // 30 requests per minute per IP

const ipRequests = new Map<string, { count: number; resetAt: number }>();

function getRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = ipRequests.get(ip);

  if (!record || now > record.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  record.count++;
  const remaining = Math.max(0, MAX_REQUESTS - record.count);
  return { allowed: record.count <= MAX_REQUESTS, remaining };
}

export function middleware(request: NextRequest) {
  // Only rate-limit API routes
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const { allowed, remaining } = getRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: "請求過於頻繁，請稍後再試 (Rate limited)" },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
