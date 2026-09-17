// 브라우저에서 직접 Gemini API를 호출하기 위한 클라이언트 유틸리티.
// API 키는 사용자가 입력한 값을 그대로 사용하며, 우리 서버로는 절대 전송/저장하지 않는다.

const GEMINI_MODEL = "gemini-3.5-flash-lite";

export class GeminiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "GeminiError";
  }
}

export async function generateDraftAnswer(apiKey: string, question: string): Promise<string> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new GeminiError("Gemini API 키를 입력해주세요.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    trimmedKey
  )}`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `다음 질문에 대해 한국어로 2~3문장의 간단한 답변 초안을 작성해줘. 이 초안은 사람이 검토한 뒤 수정해서 게시할 예정이야.\n\n질문: ${question}`,
              },
            ],
          },
        ],
      }),
    });
  } catch (cause) {
    throw new GeminiError("Gemini API 요청 중 네트워크 오류가 발생했습니다.", cause);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GeminiError(`Gemini API 호출에 실패했습니다 (${res.status}).`, body);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string" || text.trim().length === 0) {
    throw new GeminiError("Gemini 응답에서 답변 텍스트를 찾을 수 없습니다.");
  }

  return text.trim();
}
