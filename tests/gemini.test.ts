import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiError, generateDraftAnswer } from "@/lib/gemini";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("generateDraftAnswer", () => {
  it("rejects when no API key is given", async () => {
    await expect(generateDraftAnswer("", "질문")).rejects.toThrow(
      "Gemini API 키를 입력해주세요."
    );
  });

  it("throws GeminiError when the API responds with a non-OK status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "invalid key",
    }) as unknown as typeof fetch;

    await expect(generateDraftAnswer("bad-key", "질문")).rejects.toBeInstanceOf(GeminiError);
  });

  it("throws GeminiError when the response has no candidate text", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [] }),
    }) as unknown as typeof fetch;

    await expect(generateDraftAnswer("key", "질문")).rejects.toBeInstanceOf(GeminiError);
  });

  it("returns the trimmed candidate text on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "  답변 초안입니다.  " }] } }],
      }),
    }) as unknown as typeof fetch;

    const result = await generateDraftAnswer("key", "질문");
    expect(result).toBe("답변 초안입니다.");
  });
});
