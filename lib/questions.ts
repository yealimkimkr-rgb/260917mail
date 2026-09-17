import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db";

const MAX_QUESTION_LENGTH = 1000;
const MAX_ANSWER_LENGTH = 4000;

export type CreateQuestionInput = {
  question: string;
  askerName?: string;
  aiDraftAnswer?: string;
};

export async function createQuestion(
  input: CreateQuestionInput,
  db: PrismaClient = defaultPrisma
) {
  const question = input.question.trim();
  if (!question) {
    throw new Error("질문 내용을 입력해주세요.");
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    throw new Error(`질문은 ${MAX_QUESTION_LENGTH}자 이내로 입력해주세요.`);
  }

  const aiDraftAnswer = input.aiDraftAnswer?.trim() || null;

  return db.question.create({
    data: {
      question,
      askerName: input.askerName?.trim() || null,
      aiDraftAnswer,
      // AI 초안이 있으면 관리자 검토 대기(DRAFTED), 없으면 질문만 등록된 상태(PENDING).
      status: aiDraftAnswer ? "DRAFTED" : "PENDING",
    },
  });
}

export async function listAnsweredQuestions(db: PrismaClient = defaultPrisma) {
  return db.question.findMany({
    where: { status: "ANSWERED" },
    orderBy: { answeredAt: "desc" },
    select: {
      id: true,
      question: true,
      answer: true,
      askerName: true,
      answeredAt: true,
    },
  });
}

export async function listAllQuestions(db: PrismaClient = defaultPrisma) {
  return db.question.findMany({ orderBy: { createdAt: "desc" } });
}

export async function answerQuestion(
  id: string,
  answer: string,
  db: PrismaClient = defaultPrisma
) {
  const trimmed = answer.trim();
  if (!trimmed) {
    throw new Error("답변 내용을 입력해주세요.");
  }
  if (trimmed.length > MAX_ANSWER_LENGTH) {
    throw new Error(`답변은 ${MAX_ANSWER_LENGTH}자 이내로 입력해주세요.`);
  }

  const existing = await db.question.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("존재하지 않는 질문입니다.");
  }

  return db.question.update({
    where: { id },
    data: { answer: trimmed, status: "ANSWERED", answeredAt: new Date() },
  });
}
