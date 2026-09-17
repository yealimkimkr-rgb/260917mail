"use client";

import { FormEvent, useEffect, useState } from "react";
import { generateDraftAnswer } from "@/lib/gemini";

const API_KEY_STORAGE_KEY = "gemini_api_key";

type SubmitState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "success"; message: string }
  | { phase: "error"; message: string };

export default function AskQuestionForm() {
  const [apiKey, setApiKey] = useState("");
  const [question, setQuestion] = useState("");
  const [askerName, setAskerName] = useState("");
  const [state, setState] = useState<SubmitState>({ phase: "idle" });

  // 브라우저에 저장해둔 API 키가 있으면 불러온다. 서버에는 절대 저장하지 않는다.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(API_KEY_STORAGE_KEY);
      if (saved) setApiKey(saved);
    } catch {
      // localStorage를 사용할 수 없는 환경(프라이빗 모드 등)에서는 조용히 무시한다.
    }
  }, []);

  function persistApiKey(value: string) {
    setApiKey(value);
    try {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, value);
    } catch {
      // 저장 실패는 기능에 치명적이지 않으므로 무시한다.
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!question.trim()) {
      setState({ phase: "error", message: "궁금한 내용을 입력해주세요." });
      return;
    }

    setState({ phase: "submitting" });

    // Gemini API 키로 답변 초안을 먼저 생성해본다. 실패해도 질문 자체는 등록한다.
    let aiDraftAnswer: string | undefined;
    if (apiKey.trim()) {
      try {
        aiDraftAnswer = await generateDraftAnswer(apiKey, question);
      } catch {
        // 초안 생성 실패는 질문 등록을 막지 않는다. 관리자가 직접 답변을 작성하면 된다.
      }
    }

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, askerName, aiDraftAnswer }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState({ phase: "error", message: data.message ?? "질문 등록에 실패했습니다." });
        return;
      }

      setState({
        phase: "success",
        message: aiDraftAnswer
          ? "질문이 등록되었습니다. AI 초안을 바탕으로 곧 답변을 게시할게요!"
          : "질문이 등록되었습니다. 곧 답변을 게시할게요!",
      });
      setQuestion("");
    } catch {
      setState({ phase: "error", message: "네트워크 오류가 발생했습니다. 다시 시도해주세요." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div>
        <label htmlFor="geminiApiKey" className="block text-sm font-medium text-gray-700">
          Gemini API 키 (선택)
        </label>
        <input
          id="geminiApiKey"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => persistApiKey(e.target.value)}
          placeholder="AIza..."
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <p className="mt-1 text-xs text-gray-500">
          입력한 키는 이 브라우저에만 저장되며, 우리 서버로는 전송되지 않습니다. 질문을 보내면
          브라우저에서 직접 Gemini API를 호출해 답변 초안을 만들어봅니다.
        </p>
      </div>

      <div>
        <label htmlFor="askerName" className="block text-sm font-medium text-gray-700">
          이름/닉네임 (선택)
        </label>
        <input
          id="askerName"
          type="text"
          value={askerName}
          onChange={(e) => setAskerName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      <div>
        <label htmlFor="question" className="block text-sm font-medium text-gray-700">
          궁금한 내용
        </label>
        <textarea
          id="question"
          required
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      <button
        type="submit"
        disabled={state.phase === "submitting"}
        className="w-full rounded-md bg-purple-600 px-4 py-2 text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-200"
      >
        {state.phase === "submitting" ? "처리 중..." : "질문 보내기"}
      </button>

      {state.phase === "success" && (
        <p role="status" className="text-sm text-green-600">
          {state.message}
        </p>
      )}
      {state.phase === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
    </form>
  );
}
