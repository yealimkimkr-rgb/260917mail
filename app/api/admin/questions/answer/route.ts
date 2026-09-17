import { NextRequest, NextResponse } from "next/server";
import { answerQuestion } from "@/lib/questions";

function isAuthorized(key: string | null): boolean {
  const secret = process.env.ADMIN_SECRET;
  // ADMIN_SECRET이 설정되지 않은 환경에서는 항상 접근을 차단한다.
  if (!secret) return false;
  return key === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request.headers.get("x-admin-key"))) {
    return NextResponse.json({ message: "권한이 없습니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const { id, answer } = (body ?? {}) as { id?: string; answer?: string };
  if (!id || typeof id !== "string") {
    return NextResponse.json({ message: "id가 필요합니다." }, { status: 400 });
  }

  try {
    await answerQuestion(id, answer ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "답변 게시에 실패했습니다.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
