const COPY: Record<string, { title: string; body: string }> = {
  ok: {
    title: "구독이 해지되었습니다",
    body: "더 이상 뉴스레터가 발송되지 않습니다. 언제든 다시 구독하실 수 있습니다.",
  },
  invalid: {
    title: "유효하지 않은 요청입니다",
    body: "구독 해지 링크가 올바른지 확인해주세요.",
  },
};

export default function UnsubscribedPage({
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
