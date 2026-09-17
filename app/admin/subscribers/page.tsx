import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function isAuthorized(key: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET;
  // ADMIN_SECRET이 설정되지 않은 환경(예: 로컬 데모)에서는 실수로 데이터가
  // 노출되지 않도록 기본값을 "미설정 = 접근 불가"로 둔다.
  if (!secret) return false;
  return key === secret;
}

export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams: { key?: string };
}) {
  if (!isAuthorized(searchParams.key)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-xl font-bold">접근 권한이 없습니다</h1>
        <p className="mt-2 text-gray-600">
          URL에 올바른 <code>?key=</code> 파라미터를 포함해 접속해주세요.
        </p>
      </main>
    );
  }

  const subscribers = await prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      email: true,
      status: true,
      consentedAt: true,
      confirmedAt: true,
      unsubscribedAt: true,
      createdAt: true,
    },
    take: 500,
  });

  const counts = subscribers.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold text-purple-900">구독자 목록</h1>
      <p className="mt-2 text-sm text-gray-600">
        전체 {subscribers.length}명 · 인증대기 {counts.PENDING ?? 0} · 구독중{" "}
        {counts.CONFIRMED ?? 0} · 해지 {counts.UNSUBSCRIBED ?? 0}
      </p>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4">이메일</th>
            <th className="py-2 pr-4">상태</th>
            <th className="py-2 pr-4">동의일시</th>
            <th className="py-2 pr-4">인증일시</th>
            <th className="py-2 pr-4">해지일시</th>
          </tr>
        </thead>
        <tbody>
          {subscribers.map((s) => (
            <tr key={s.email} className="border-b">
              <td className="py-2 pr-4">{s.email}</td>
              <td className="py-2 pr-4">{s.status}</td>
              <td className="py-2 pr-4">{s.consentedAt.toLocaleString("ko-KR")}</td>
              <td className="py-2 pr-4">
                {s.confirmedAt ? s.confirmedAt.toLocaleString("ko-KR") : "-"}
              </td>
              <td className="py-2 pr-4">
                {s.unsubscribedAt ? s.unsubscribedAt.toLocaleString("ko-KR") : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
