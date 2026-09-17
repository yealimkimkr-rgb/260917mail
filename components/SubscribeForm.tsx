"use client";

import { FormEvent, useMemo, useState } from "react";
import { isValidEmail } from "@/lib/validation";

type SubmitState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "success"; message: string }
  | { phase: "error"; message: string };

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState(""); // honeypot, 항상 비어있어야 함
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<SubmitState>({ phase: "idle" });

  const emailError = useMemo(() => {
    if (!touched || email.length === 0) return null;
    return isValidEmail(email) ? null : "올바른 이메일 형식이 아닙니다.";
  }, [email, touched]);

  const canSubmit = isValidEmail(email) && consent && state.phase !== "submitting";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);

    if (!isValidEmail(email)) {
      setState({ phase: "error", message: "올바른 이메일 형식이 아닙니다." });
      return;
    }
    if (!consent) {
      setState({ phase: "error", message: "개인정보 처리방침 동의가 필요합니다." });
      return;
    }

    setState({ phase: "submitting" });

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, company }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState({ phase: "error", message: data.message ?? "구독 신청에 실패했습니다." });
        return;
      }

      setState({ phase: "success", message: data.message ?? "구독 신청이 완료되었습니다." });
      setEmail("");
      setConsent(false);
      setTouched(false);
    } catch {
      setState({ phase: "error", message: "네트워크 오류가 발생했습니다. 다시 시도해주세요." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="you@example.com"
          className={`mt-1 w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
            emailError
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-300 focus:ring-gray-400"
          }`}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "email-error" : undefined}
        />
        {emailError && (
          <p id="email-error" className="mt-1 text-sm text-red-600">
            {emailError}
          </p>
        )}
      </div>

      {/* 허니팟: 실제 사용자에게는 보이지 않으며 봇만 채워 넣는다. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
        <label htmlFor="company">회사명</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="flex items-start gap-2">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="consent" className="text-sm text-gray-600">
          뉴스레터 수신에 동의하며,{" "}
          <a href="/privacy" target="_blank" className="underline">
            개인정보 처리방침
          </a>
          을 확인했습니다.
        </label>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {state.phase === "submitting" ? "처리 중..." : "구독하기"}
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
