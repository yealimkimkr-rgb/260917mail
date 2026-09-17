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
