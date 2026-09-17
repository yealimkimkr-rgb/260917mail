import { listAnsweredQuestions } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function QnaPage() {
  const questions = await listAnsweredQuestions();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-purple-900">Q&amp;A</h1>
      <p className="mt-2 text-gray-600">
        구독자분들이 남겨주신 질문에 답변한 내용입니다.{" "}
        <a href="/ask" className="text-purple-700 underline">
          질문하러 가기
        </a>
      </p>

      {questions.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">아직 게시된 답변이 없습니다.</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {questions.map((q) => (
            <li key={q.id} className="rounded-lg border border-purple-100 bg-white p-4 shadow-sm">
              <p className="font-medium text-gray-900">
                Q. {q.question}
                {q.askerName && <span className="ml-2 text-sm text-gray-400">— {q.askerName}</span>}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-gray-700">A. {q.answer}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
