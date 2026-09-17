import { NextRequest, NextResponse } from "next/server";
import { subscribeEmail } from "@/lib/subscription";
import { getClientIp } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const { email, consent, company } = (body ?? {}) as {
    email?: string;
    consent?: boolean;
    company?: string;
  };

  const ip = getClientIp(request.headers);

  const result = await subscribeEmail(
    { email: email ?? "", consent: Boolean(consent), company, ip },
    // db 기본 인자 사용
    undefined
  );

  if (!result.ok) {
    const statusCode =
      result.status === "rate_limited"
        ? 429
        : result.status === "email_send_failed"
        ? 502
        : 400;
    return NextResponse.json({ message: result.message }, { status: statusCode });
  }

  const messages: Record<string, string> = {
    created: "인증 메일을 발송했습니다. 메일함을 확인해주세요.",
    resent: "인증 메일을 다시 발송했습니다. 메일함을 확인해주세요.",
    reactivated: "인증 메일을 발송했습니다. 메일함을 확인해주세요.",
    already_confirmed: "이미 구독 중인 이메일입니다.",
  };

  return NextResponse.json({ message: messages[result.status] }, { status: 200 });
}
