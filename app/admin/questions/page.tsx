import { listAllQuestions } from "@/lib/questions";
import AdminAnswerForm from "@/components/AdminAnswerForm";

export const dynamic = "force-dynamic";

function isAuthorized(key: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return key === secret;
}

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: { key?: string };
}) {
  const key = searchParams.key;

  if (!isAuthorized(key)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-xl font-bold">접근 권한이 없습니다</h1>
        <p className="mt-2 text-gray-600">
          URL에 올바른 <code>?key=</code> 파라미터를 포함해 접속해주세요.
        </p>
      </main>
    );
  }

  const questions = await listAllQuestions();
  const pending = questions.filter((q) => q.status !== "ANSWERED");
  const answered = questions.filter((q) => q.status === "ANSWERED");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-purple-900">질문 관리</h1>
      <p className="mt-2 text-sm text-gray-600">
        답변 대기 {pending.length}건 · 게시 완료 {answered.length}건
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800">답변 대기</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">대기 중인 질문이 없습니다.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pending.map((q) => (
              <li key={q.id} className="rounded-lg border border-purple-100 bg-white p-4 shadow-sm">
                <p className="font-medium text-gray-900">
                  {q.question}
                  {q.askerName && <span className="ml-2 text-sm text-gray-400">— {q.askerName}</span>}
                </p>
                {q.aiDraftAnswer && (
                  <p className="mt-2 rounded-md bg-purple-50 p-2 text-sm text-gray-600">
                    <span className="font-semibold text-purple-700">AI 초안: </span>
                    {q.aiDraftAnswer}
                  </p>
                )}
                <AdminAnswerForm
                  questionId={q.id}
                  initialDraft={q.aiDraftAnswer ?? ""}
                  adminKey={key!}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-800">게시 완료</h2>
        {answered.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">게시된 답변이 없습니다.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {answered.map((q) => (
              <li key={q.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="font-medium text-gray-900">
                  {q.question}
                  {q.askerName && <span className="ml-2 text-sm text-gray-400">— {q.askerName}</span>}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-gray-700">{q.answer}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
