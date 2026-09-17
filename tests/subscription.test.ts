import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { confirmSubscriber, subscribeEmail, unsubscribeSubscriber } from "@/lib/subscription";

vi.mock("@/lib/email", () => ({
  sendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rateLimit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rateLimit")>("@/lib/rateLimit");
  return {
    ...actual,
    checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 2 }),
  };
});

import { sendConfirmationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

type FakeSubscriber = {
  id: string;
  email: string;
  status: "PENDING" | "CONFIRMED" | "UNSUBSCRIBED";
  consentedAt: Date;
  confirmToken: string | null;
  confirmTokenExpiresAt: Date | null;
  confirmedAt: Date | null;
  unsubscribeToken: string;
  unsubscribedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// 테스트용 최소 in-memory Prisma 대역. subscription.ts가 실제로 호출하는
// subscriber.findUnique / create / update 만 구현한다.
function createFakeDb(initial: FakeSubscriber[] = []) {
  const rows = new Map(initial.map((row) => [row.id, row]));
  let counter = 0;

  const findBy = (where: Partial<FakeSubscriber>) => {
    return [...rows.values()].find((row) =>
      Object.entries(where).every(([key, value]) => (row as any)[key] === value)
    );
  };

  return {
    subscriber: {
      findUnique: vi.fn(async ({ where }: { where: Partial<FakeSubscriber> }) => {
        return findBy(where) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Partial<FakeSubscriber> }) => {
        counter += 1;
        const row: FakeSubscriber = {
          id: `id-${counter}`,
          email: data.email!,
          status: (data.status as FakeSubscriber["status"]) ?? "PENDING",
          consentedAt: data.consentedAt ?? new Date(),
          confirmToken: data.confirmToken ?? null,
          confirmTokenExpiresAt: data.confirmTokenExpiresAt ?? null,
          confirmedAt: null,
          unsubscribeToken: `unsub-${counter}`,
          unsubscribedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        rows.set(row.id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: Partial<FakeSubscriber>; data: Partial<FakeSubscriber> }) => {
        const row = findBy(where);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row;
      }),
    },
  } as unknown as PrismaClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  (checkRateLimit as any).mockReturnValue({ allowed: true, remaining: 2 });
});

describe("subscribeEmail", () => {
  it("rejects an invalid email format", async () => {
    const db = createFakeDb();
    const result = await subscribeEmail(
      { email: "not-an-email", consent: true, ip: "1.1.1.1" },
      db
    );
    expect(result).toEqual({ ok: false, status: "invalid_email", message: expect.any(String) });
  });

  it("rejects when consent checkbox was not checked", async () => {
    const db = createFakeDb();
    const result = await subscribeEmail(
      { email: "user@example.com", consent: false, ip: "1.1.1.1" },
      db
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe("consent_required");
  });

  it("silently accepts without side effects when the honeypot field is filled", async () => {
    const db = createFakeDb();
    const result = await subscribeEmail(
      { email: "user@example.com", consent: true, company: "im-a-bot", ip: "1.1.1.1" },
      db
    );
    expect(result).toEqual({ ok: true, status: "created" });
    expect(db.subscriber.create).not.toHaveBeenCalled();
    expect(sendConfirmationEmail).not.toHaveBeenCalled();
  });

  it("creates a new PENDING subscriber and sends a confirmation email", async () => {
    const db = createFakeDb();
    const result = await subscribeEmail(
      { email: "New@Example.com", consent: true, ip: "1.1.1.1" },
      db
    );
    expect(result).toEqual({ ok: true, status: "created" });
    expect(db.subscriber.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "new@example.com", status: "PENDING" }) })
    );
    expect(sendConfirmationEmail).toHaveBeenCalledWith("new@example.com", expect.any(String));
  });

  it("does not create a duplicate row and reports already_confirmed for a CONFIRMED email", async () => {
    const db = createFakeDb([
      {
        id: "id-1",
        email: "already@example.com",
        status: "CONFIRMED",
        consentedAt: new Date(),
        confirmToken: null,
        confirmTokenExpiresAt: null,
        confirmedAt: new Date(),
        unsubscribeToken: "unsub-1",
        unsubscribedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await subscribeEmail(
      { email: "already@example.com", consent: true, ip: "1.1.1.1" },
      db
    );

    expect(result).toEqual({ ok: true, status: "already_confirmed" });
    expect(db.subscriber.create).not.toHaveBeenCalled();
    expect(db.subscriber.update).not.toHaveBeenCalled();
    expect(sendConfirmationEmail).not.toHaveBeenCalled();
  });

  it("resends a confirmation email for a duplicate PENDING signup", async () => {
    const db = createFakeDb([
      {
        id: "id-1",
        email: "pending@example.com",
        status: "PENDING",
        consentedAt: new Date(),
        confirmToken: "old-token",
        confirmTokenExpiresAt: new Date(Date.now() + 1000),
        confirmedAt: null,
        unsubscribeToken: "unsub-1",
        unsubscribedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await subscribeEmail(
      { email: "pending@example.com", consent: true, ip: "1.1.1.1" },
      db
    );

    expect(result).toEqual({ ok: true, status: "resent" });
    expect(db.subscriber.update).toHaveBeenCalled();
    expect(sendConfirmationEmail).toHaveBeenCalled();
  });

  it("is rate limited when checkRateLimit disallows the request", async () => {
    (checkRateLimit as any).mockReturnValue({ allowed: false, remaining: 0 });
    const db = createFakeDb();

    const result = await subscribeEmail(
      { email: "user@example.com", consent: true, ip: "9.9.9.9" },
      db
    );

    expect(result).toEqual({ ok: false, status: "rate_limited", message: expect.any(String) });
    expect(db.subscriber.create).not.toHaveBeenCalled();
  });
});

describe("confirmSubscriber", () => {
  it("rejects an unknown token", async () => {
    const db = createFakeDb();
    const result = await confirmSubscriber("does-not-exist", db);
    expect(result).toEqual({ ok: false, status: "invalid" });
  });

  it("rejects an expired token", async () => {
    const db = createFakeDb([
      {
        id: "id-1",
        email: "expired@example.com",
        status: "PENDING",
        consentedAt: new Date(),
        confirmToken: "expired-token",
        confirmTokenExpiresAt: new Date(Date.now() - 1000),
        confirmedAt: null,
        unsubscribeToken: "unsub-1",
        unsubscribedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await confirmSubscriber("expired-token", db);
    expect(result).toEqual({ ok: false, status: "expired" });
  });

  it("transitions PENDING -> CONFIRMED for a valid token", async () => {
    const db = createFakeDb([
      {
        id: "id-1",
        email: "valid@example.com",
        status: "PENDING",
        consentedAt: new Date(),
        confirmToken: "valid-token",
        confirmTokenExpiresAt: new Date(Date.now() + 1000 * 60),
        confirmedAt: null,
        unsubscribeToken: "unsub-1",
        unsubscribedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await confirmSubscriber("valid-token", db);
    expect(result).toEqual({ ok: true });
    expect(db.subscriber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CONFIRMED", confirmToken: null }),
      })
    );
  });
});

describe("unsubscribeSubscriber", () => {
  it("rejects an unknown token", async () => {
    const db = createFakeDb();
    const result = await unsubscribeSubscriber("does-not-exist", db);
    expect(result).toEqual({ ok: false, status: "invalid" });
  });

  it("transitions CONFIRMED -> UNSUBSCRIBED for a valid token", async () => {
    const db = createFakeDb([
      {
        id: "id-1",
        email: "bye@example.com",
        status: "CONFIRMED",
        consentedAt: new Date(),
        confirmToken: null,
        confirmTokenExpiresAt: null,
        confirmedAt: new Date(),
        unsubscribeToken: "unsub-token",
        unsubscribedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await unsubscribeSubscriber("unsub-token", db);
    expect(result).toEqual({ ok: true });
    expect(db.subscriber.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "UNSUBSCRIBED" }) })
    );
  });
});
