import { randomUUID } from "crypto";

const DEFAULT_TTL_MINUTES = 60 * 24; // 24시간

// 구독 해지 토큰은 UUID v4로 생성해 추측이 불가능하도록 한다.
export function generateToken(): string {
  return randomUUID();
}

export function getConfirmTokenTtlMinutes(): number {
  const raw = process.env.CONFIRM_TOKEN_TTL_MINUTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_MINUTES;
}

export function getTokenExpiry(fromDate: Date = new Date()): Date {
  const ttlMinutes = getConfirmTokenTtlMinutes();
  return new Date(fromDate.getTime() + ttlMinutes * 60_000);
}

export function isExpired(expiresAt: Date | null, now: Date = new Date()): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() < now.getTime();
}
