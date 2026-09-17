import { NextRequest, NextResponse } from "next/server";
import { confirmSubscriber } from "@/lib/subscription";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await confirmSubscriber(token);

  const redirectUrl = new URL("/confirmed", request.url);
  redirectUrl.searchParams.set("status", result.ok ? "ok" : result.status);

  return NextResponse.redirect(redirectUrl);
}
