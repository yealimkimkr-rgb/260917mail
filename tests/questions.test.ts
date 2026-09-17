import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { answerQuestion, createQuestion, listAnsweredQuestions } from "@/lib/questions";

type FakeQuestion = {
  id: string;
  question: string;
  askerName: string | null;
  aiDraftAnswer: string | null;
  answer: string | null;
  status: "PENDING" | "DRAFTED" | "ANSWERED";
  createdAt: Date;
  answeredAt: Date | null;
};

function createFakeDb(initial: FakeQuestion[] = []) {
  const rows = new Map(initial.map((row) => [row.id, row]));
  let counter = 0;

  return {
    question: {
      create: vi.fn(async ({ data }: { data: Partial<FakeQuestion> }) => {
        counter += 1;
        const row: FakeQuestion = {
          id: `id-${counter}`,
          question: data.question!,
          askerName: data.askerName ?? null,
          aiDraftAnswer: data.aiDraftAnswer ?? null,
          answer: null,
          status: (data.status as FakeQuestion["status"]) ?? "PENDING",
          createdAt: new Date(),
          answeredAt: null,
        };
        rows.set(row.id, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return rows.get(where.id) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where?: { status?: string } } = {}) => {
        let result = [...rows.values()];
        if (where?.status) {
          result = result.filter((r) => r.status === where.status);
        }
        return result;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<FakeQuestion> }) => {
        const row = rows.get(where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row;
      }),
    },
  } as unknown as PrismaClient;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createQuestion", () => {
  it("rejects an empty question", async () => {
    const db = createFakeDb();
    await expect(createQuestion({ question: "   " }, db)).rejects.toThrow(
      "질문 내용을 입력해주세요."
    );
    expect(db.question.create).not.toHaveBeenCalled();
  });

  it("stores status DRAFTED when an AI draft answer is provided", async () => {
    const db = createFakeDb();
    const created = await createQuestion(
      { question: "환불은 어떻게 하나요?", aiDraftAnswer: "환불 절차 초안입니다." },
      db
    );
    expect(created.status).toBe("DRAFTED");
  });

  it("stores status PENDING when no AI draft answer is provided", async () => {
    const db = createFakeDb();
    const created = await createQuestion({ question: "배송은 얼마나 걸리나요?" }, db);
    expect(created.status).toBe("PENDING");
  });
});

describe("answerQuestion", () => {
  it("rejects an empty answer", async () => {
    const db = createFakeDb([
      {
        id: "id-1",
        question: "질문",
        askerName: null,
        aiDraftAnswer: null,
        answer: null,
        status: "PENDING",
        createdAt: new Date(),
        answeredAt: null,
      },
    ]);
    await expect(answerQuestion("id-1", "   ", db)).rejects.toThrow("답변 내용을 입력해주세요.");
  });

  it("rejects an unknown question id", async () => {
    const db = createFakeDb();
    await expect(answerQuestion("missing", "답변", db)).rejects.toThrow(
      "존재하지 않는 질문입니다."
    );
  });

  it("transitions a question to ANSWERED with the given answer", async () => {
    const db = createFakeDb([
      {
        id: "id-1",
        question: "질문",
        askerName: null,
        aiDraftAnswer: "초안",
        answer: null,
        status: "DRAFTED",
        createdAt: new Date(),
        answeredAt: null,
      },
    ]);

    const result = await answerQuestion("id-1", "최종 답변입니다.", db);
    expect(result.status).toBe("ANSWERED");
    expect(result.answer).toBe("최종 답변입니다.");
    expect(result.answeredAt).toBeInstanceOf(Date);
  });
});

describe("listAnsweredQuestions", () => {
  it("only returns ANSWERED questions", async () => {
    const db = createFakeDb([
      {
        id: "id-1",
        question: "Q1",
        askerName: null,
        aiDraftAnswer: null,
        answer: "A1",
        status: "ANSWERED",
        createdAt: new Date(),
        answeredAt: new Date(),
      },
      {
        id: "id-2",
        question: "Q2",
        askerName: null,
        aiDraftAnswer: null,
        answer: null,
        status: "PENDING",
        createdAt: new Date(),
        answeredAt: null,
      },
    ]);

    const result = await listAnsweredQuestions(db);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("Q1");
  });
});
