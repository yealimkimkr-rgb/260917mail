import { describe, expect, it } from "vitest";
import { isValidEmail } from "@/lib/validation";

describe("isValidEmail", () => {
  it.each([
    "user@example.com",
    "first.last@example.co.kr",
    "user+tag@example.com",
  ])("accepts a valid email: %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "not-an-email",
    "missing-domain@",
    "@missing-local.com",
    "with space@example.com",
    "double@@example.com",
  ])("rejects an invalid email: %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
