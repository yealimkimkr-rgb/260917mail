import { NextRequest, NextResponse } from "next/server";
import { createQuestion } from "@/lib/questions";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimitResult = checkRateLimit(`question:${ip}`);
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ message: "잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const { question, askerName, aiDraftAnswer } = (body ?? {}) as {
    question?: string;
    askerName?: string;
    aiDraftAnswer?: string;
  };

  try {
    const created = await createQuestion({
      question: question ?? "",
      askerName,
      aiDraftAnswer,
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "질문 등록에 실패했습니다.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
