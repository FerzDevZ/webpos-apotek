import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken, type SessionPayload } from "../session";

const payload: SessionPayload = {
  userId: "user-1",
  role: "KASIR",
  exp: Math.floor(Date.now() / 1000) + 3600,
};

describe("session token (HMAC)", () => {
  it("roundtrip: sign lalu verify mengembalikan payload", () => {
    const token = signSessionToken(payload);
    expect(verifySessionToken(token)).toEqual(payload);
  });

  it("body yang dimanipulasi (naikkan role) ditolak", () => {
    const token = signSessionToken(payload);
    const [body, mac] = token.split(".");

    const jahat = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    jahat.role = "ADMIN";
    const bodyJahat = Buffer.from(JSON.stringify(jahat)).toString("base64url");

    expect(verifySessionToken(`${bodyJahat}.${mac}`)).toBeNull();
  });

  it("token kedaluwarsa ditolak", () => {
    const token = signSessionToken({ ...payload, exp: Math.floor(Date.now() / 1000) - 1 });
    expect(verifySessionToken(token)).toBeNull();
  });

  it("input sampah ditolak tanpa melempar", () => {
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("abc")).toBeNull();
    expect(verifySessionToken("a.b")).toBeNull();
  });
});
