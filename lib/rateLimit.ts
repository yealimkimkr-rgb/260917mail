// 메모리 기반 고정 윈도우 rate limiter.
//
// 주의: 서버리스(Vercel) 환경에서는 인스턴스마다 메모리가 분리되어 있어
// 완벽한 전역 제한은 아니지만, 단일 인스턴스에 몰리는 스팸/봇 트래픽을
// 걸러내는 1차 방어선으로는 충분하다. 더 강한 보장이 필요하면 Upstash Redis
// 같은 외부 저장소 기반 limiter로 교체한다.
const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 3);

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

// 무제한으로 쌓이는 것을 막기 위한 주기적 청소.
function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  pruneExpired(now);

  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return headers.get("x-real-ip") ?? "unknown";
}
