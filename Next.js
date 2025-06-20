import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const limiter = new Map();

export function middleware(req: NextRequest) {
  const ip = req.ip ?? "anonymous";
  const now = Date.now();
  const previous = limiter.get(ip) || 0;

  if (now - previous < 3000) { // 3 detik delay antar request
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  limiter.set(ip, now);
  return NextResponse.next();
}
