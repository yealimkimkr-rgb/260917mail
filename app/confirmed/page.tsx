const COPY: Record<string, { title: string; body: string }> = {
  ok: {
    title: "구독 인증이 완료되었습니다",
    body: "이제부터 정기 뉴스레터를 받아보실 수 있습니다.",
  },
  expired: {
    title: "인증 링크가 만료되었습니다",
    body: "메인 페이지에서 이메일을 다시 입력해 인증 메일을 재발송해주세요.",
  },
  invalid: {
    title: "유효하지 않은 인증 링크입니다",
    body: "링크가 올바른지 확인하시거나, 메인 페이지에서 다시 구독을 신청해주세요.",
  },
};

export default function ConfirmedPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const copy = COPY[searchParams.status ?? ""] ?? COPY.invalid;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-bold text-purple-900">{copy.title}</h1>
      <p className="text-gray-600">{copy.body}</p>
      <a href="/" className="mt-4 text-purple-700 underline">
        메인으로 돌아가기
      </a>
    </main>
  );
}
