import { z } from "zod";

// RFC 5322 전체를 검증하진 않지만, 흔한 오타(공백, 콤 누락, 도메인 없음 등)를
// 클라이언트/서버 양쪽에서 동일하게 걸러내기 위한 실용적인 이메일 형식 검증.
export const emailSchema = z
  .string()
  .trim()
  .min(1, "이메일을 입력해주세요.")
  .max(254, "이메일이 너무 깁니다.")
  .email("올바른 이메일 형식이 아닙니다.");

export const subscribeRequestSchema = z.object({
  email: emailSchema,
  consent: z.literal(true, {
    errorMap: () => ({ message: "개인정보 처리방침 동의가 필요합니다." }),
  }),
  // 봇 차단용 허니팟 필드. 사람 사용자에게는 화면에 보이지 않으며 항상 비어 있어야 한다.
  company: z.string().max(0, "스팸으로 감지되었습니다.").optional().default(""),
});

export type SubscribeRequest = z.infer<typeof subscribeRequestSchema>;

export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}
