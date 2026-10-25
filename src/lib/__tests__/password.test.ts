import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("password (scrypt)", () => {
  it("hash lalu verify = benar", () => {
    const hash = hashPassword("rahasia123");
    expect(verifyPassword("rahasia123", hash)).toBe(true);
  });

  it("password salah ditolak", () => {
    const hash = hashPassword("rahasia123");
    expect(verifyPassword("rahasia1234", hash)).toBe(false);
    expect(verifyPassword("", hash)).toBe(false);
  });

  it("salt acak: hash sama dua kali tidak identik tapi dua-duanya valid", () => {
    const a = hashPassword("sama");
    const b = hashPassword("sama");
    expect(a).not.toBe(b);
    expect(verifyPassword("sama", a)).toBe(true);
    expect(verifyPassword("sama", b)).toBe(true);
  });

  it("format rusak ditolak tanpa melempar", () => {
    expect(verifyPassword("x", "bukan-hash")).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "argon2$abc$def")).toBe(false);
  });
});
