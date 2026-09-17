"use client";

import { FormEvent, useState } from "react";

export default function AdminAnswerForm({
  questionId,
  initialDraft,
  adminKey,
}: {
  questionId: string;
  initialDraft: string;
  adminKey: string;
}) {
  const [answer, setAnswer] = useState(initialDraft);
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");

    try {
      const res = await fetch("/api/admin/questions/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id: questionId, answer }),
      });
      if (!res.ok) {
        setState("error");
        return;
      }
      // 게시 후 서버 컴포넌트가 최신 상태를 다시 보여주도록 새로고침한다.
      window.location.reload();
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        placeholder="답변을 입력하세요"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
      />
      <button
        type="submit"
        disabled={state === "submitting" || !answer.trim()}
        className="rounded-md bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-200"
      >
        {state === "submitting" ? "게시 중..." : "답변 게시"}
      </button>
      {state === "error" && <p className="text-sm text-red-600">답변 게시에 실패했습니다.</p>}
    </form>
  );
}
