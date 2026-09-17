import { Resend } from "resend";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  return new Resend(apiKey);
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? "Newsletter <onboarding@resend.dev>";
}

export class EmailSendError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "EmailSendError";
  }
}

export async function sendConfirmationEmail(
  email: string,
  confirmToken: string
): Promise<void> {
  const confirmUrl = `${getAppUrl()}/api/confirm?token=${encodeURIComponent(
    confirmToken
  )}`;

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: "뉴스레터 구독을 완료해주세요",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#581c87;">구독 인증이 필요합니다</h2>
          <p>아래 버튼을 눌러 뉴스레터 구독을 완료해주세요. 이 링크는 24시간 동안만 유효합니다.</p>
          <p style="margin: 24px 0;">
            <a href="${confirmUrl}"
               style="background:#9333ea;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
              구독 인증하기
            </a>
          </p>
          <p style="color:#6b7280;font-size:12px;">
            본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.
          </p>
        </div>
      `,
    });

    // Resend는 실패 시 예외 대신 { error } 필드를 반환하므로 명시적으로 확인해야 한다.
    if (error) {
      throw error;
    }
  } catch (cause) {
    // 발송 실패를 절대 조용히 삼키지 않는다: 운영 로그에서 추적 가능하도록 남긴다.
    console.error("[email] 인증 메일 발송 실패", { email, cause });
    throw new EmailSendError("인증 메일 발송에 실패했습니다.", cause);
  }
}

export async function sendWelcomeEmail(email: string, unsubscribeToken: string): Promise<void> {
  const unsubscribeUrl = `${getAppUrl()}/api/unsubscribe?token=${encodeURIComponent(
    unsubscribeToken
  )}`;

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: "구독이 완료되었습니다",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#581c87;">구독해주셔서 감사합니다!</h2>
          <p>이제부터 정기 뉴스레터를 받아보실 수 있습니다.</p>
          <p style="color:#6b7280;font-size:12px;margin-top:32px;">
            더 이상 받고 싶지 않다면 <a href="${unsubscribeUrl}" style="color:#7e22ce;">여기</a>를 눌러 언제든 구독을 해지할 수 있습니다.
          </p>
        </div>
      `,
    });

    if (error) {
      throw error;
    }
  } catch (cause) {
    console.error("[email] 환영 메일 발송 실패", { email, cause });
    throw new EmailSendError("환영 메일 발송에 실패했습니다.", cause);
  }
}
