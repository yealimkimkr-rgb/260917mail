import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db";
import { sendConfirmationEmail, sendWelcomeEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";
import { subscribeRequestSchema } from "@/lib/validation";
import { generateToken, getTokenExpiry, isExpired } from "@/lib/tokens";

export type SubscribeInput = {
  email: string;
  consent: boolean;
  company?: string; // honeypot
  ip: string;
};

export type SubscribeResult =
  | { ok: true; status: "created" | "resent" | "reactivated" }
  | { ok: true; status: "already_confirmed" }
  | {
      ok: false;
      status: "invalid_email" | "consent_required" | "spam_detected" | "rate_limited" | "email_send_failed";
      message: string;
    };

// 실서비스 Prisma 클라이언트를 기본값으로 쓰되, 테스트에서는 mock을 주입할 수 있도록
// 의존성 주입 형태로 작성한다.
export async function subscribeEmail(
  input: SubscribeInput,
  db: PrismaClient = defaultPrisma
): Promise<SubscribeResult> {
  // 허니팟: 사람 사용자에게는 보이지 않는 필드이므로, 값이 채워져 있으면 봇으로 간주하고
  // 성공한 것처럼 조용히 무시한다 (봇에게 탐지 사실을 알리지 않기 위함).
  if (input.company && input.company.trim().length > 0) {
    return { ok: true, status: "created" };
  }

  const parsed = subscribeRequestSchema.safeParse({
    email: input.email,
    consent: input.consent,
    company: input.company ?? "",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "consent") {
      return { ok: false, status: "consent_required", message: issue.message };
    }
    return {
      ok: false,
      status: "invalid_email",
      message: issue?.message ?? "올바른 이메일 형식이 아닙니다.",
    };
  }

  const rateLimitResult = checkRateLimit(`subscribe:${input.ip}`);
  if (!rateLimitResult.allowed) {
    return {
      ok: false,
      status: "rate_limited",
      message: "잠시 후 다시 시도해주세요.",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.subscriber.findUnique({ where: { email } });

  if (existing?.status === "CONFIRMED") {
    // 이미 인증된 이메일은 중복 가입 처리하지 않는다. 스캐닝 방지를 위해 항상
    // "요청 접수" 톤의 메시지를 반환하고, 존재 여부를 직접 노출하지 않는다.
    return { ok: true, status: "already_confirmed" };
  }

  const confirmToken = generateToken();
  const confirmTokenExpiresAt = getTokenExpiry();
  const now = new Date();

  if (existing) {
    // PENDING(재발송) 또는 UNSUBSCRIBED(재구독) -> 토큰을 새로 발급하고 PENDING으로 전환.
    await db.subscriber.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        confirmToken,
        confirmTokenExpiresAt,
        consentedAt: now,
        confirmedAt: null,
        unsubscribedAt: null,
      },
    });
  } else {
    await db.subscriber.create({
      data: {
        email,
        status: "PENDING",
        confirmToken,
        confirmTokenExpiresAt,
        consentedAt: now,
      },
    });
  }

  try {
    await sendConfirmationEmail(email, confirmToken);
  } catch {
    // sendConfirmationEmail이 이미 에러를 로깅했으므로 여기서는 사용자 응답만 결정한다.
    return {
      ok: false,
      status: "email_send_failed",
      message: "인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  return { ok: true, status: existing ? (existing.status === "UNSUBSCRIBED" ? "reactivated" : "resent") : "created" };
}

export type ConfirmResult =
  | { ok: true }
  | { ok: false; status: "invalid" | "expired" };

export async function confirmSubscriber(
  token: string,
  db: PrismaClient = defaultPrisma
): Promise<ConfirmResult> {
  if (!token) {
    return { ok: false, status: "invalid" };
  }

  const subscriber = await db.subscriber.findUnique({ where: { confirmToken: token } });

  if (!subscriber) {
    return { ok: false, status: "invalid" };
  }

  // 이미 해지된 상태에서 과거 인증 링크를 다시 누른 경우는 유효하지 않은 것으로 취급한다.
  if (subscriber.status === "UNSUBSCRIBED") {
    return { ok: false, status: "invalid" };
  }

  if (isExpired(subscriber.confirmTokenExpiresAt)) {
    return { ok: false, status: "expired" };
  }

  if (subscriber.status === "CONFIRMED") {
    // 이미 인증된 링크를 다시 클릭한 경우 (멱등 처리).
    return { ok: true };
  }

  await db.subscriber.update({
    where: { id: subscriber.id },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      // 인증 토큰은 1회성이므로 재사용을 막기 위해 즉시 무효화한다.
      confirmToken: null,
      confirmTokenExpiresAt: null,
    },
  });

  try {
    await sendWelcomeEmail(subscriber.email, subscriber.unsubscribeToken);
  } catch {
    // 환영 메일 발송 실패는 구독 인증 자체를 실패시키지 않는다 (이미 CONFIRMED 전환 완료).
  }

  return { ok: true };
}

export type UnsubscribeResult = { ok: true } | { ok: false; status: "invalid" };

export async function unsubscribeSubscriber(
  token: string,
  db: PrismaClient = defaultPrisma
): Promise<UnsubscribeResult> {
  if (!token) {
    return { ok: false, status: "invalid" };
  }

  const subscriber = await db.subscriber.findUnique({ where: { unsubscribeToken: token } });

  if (!subscriber) {
    return { ok: false, status: "invalid" };
  }

  if (subscriber.status !== "UNSUBSCRIBED") {
    await db.subscriber.update({
      where: { id: subscriber.id },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    });
  }

  return { ok: true };
}
