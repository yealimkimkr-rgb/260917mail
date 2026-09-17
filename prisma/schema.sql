-- Raw SQL equivalent of prisma/schema.prisma, provided for reference /
-- for teams not using Prisma migrate directly against PostgreSQL.

CREATE TYPE subscriber_status AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED');

CREATE TABLE subscribers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     TEXT NOT NULL UNIQUE,
  status                    subscriber_status NOT NULL DEFAULT 'PENDING',

  consented_at              TIMESTAMPTZ NOT NULL,

  confirm_token             UUID UNIQUE,
  confirm_token_expires_at  TIMESTAMPTZ,
  confirmed_at              TIMESTAMPTZ,

  unsubscribe_token         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  unsubscribed_at           TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscribers_status ON subscribers (status);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscribers_updated_at
BEFORE UPDATE ON subscribers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TYPE question_status AS ENUM ('PENDING', 'DRAFTED', 'ANSWERED');

CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question        TEXT NOT NULL,
  asker_name      TEXT,

  -- 방문자가 입력한 Gemini API 키로 클라이언트에서 직접 생성한 답변 초안.
  -- API 키 자체는 서버에 전송/저장하지 않는다.
  ai_draft_answer TEXT,

  -- 관리자가 검토 후 게시하는 최종 답변.
  answer          TEXT,
  status          question_status NOT NULL DEFAULT 'PENDING',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at     TIMESTAMPTZ
);

CREATE INDEX idx_questions_status ON questions (status);
