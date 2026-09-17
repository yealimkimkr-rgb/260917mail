import AskQuestionForm from "@/components/AskQuestionForm";

export default function AskPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-purple-900">궁금한 점을 물어보세요</h1>
        <p className="mt-2 text-gray-600">
          질문을 남기면 검토 후 답변을 게시해드립니다. 게시된 답변은{" "}
          <a href="/qna" className="text-purple-700 underline">
            Q&amp;A 페이지
          </a>
          에서 볼 수 있어요.
        </p>
      </div>
      <AskQuestionForm />
    </main>
  );
}
