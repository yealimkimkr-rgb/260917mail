import { NextRequest, NextResponse } from "next/server";
import { unsubscribeSubscriber } from "@/lib/subscription";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await unsubscribeSubscriber(token);

  const redirectUrl = new URL("/unsubscribed", request.url);
  redirectUrl.searchParams.set("status", result.ok ? "ok" : result.status);

  return NextResponse.redirect(redirectUrl);
}
