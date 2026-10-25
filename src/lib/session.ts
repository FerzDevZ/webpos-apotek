/**
 * Sesi login berupa cookie bertanda-tangan (HMAC-SHA256), tanpa dependency tambahan.
 *
 * Desain:
 * - Payload minimal: userId + role + exp. Token dibaca proxy untuk cek optimis,
 *   dan diverifikasi ulang ke DB di DAL (`src/lib/auth.ts`) untuk cek sesungguhnya.
 * - Tanpa tabel session di DB (MVP, single laptop). Kalau nanti butuh "logout semua
 *   perangkat", tambahkan tabel Session dan ganti payload jadi sessionId.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "./constants";

export const SESSION_COOKIE = "webpos_session";
/** Umur sesi 12 jam — seumur shift apotek, bukan berhari-hari. */
export const SESSION_MAX_AGE_SEC = 12 * 60 * 60;

export type SessionPayload = {
  userId: string;
  role: Role;
  /** epoch detik */
  exp: number;
};

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length > 0) return s;
  // Dev saja. Di produksi SESSION_SECRET wajib diisi (lihat .env.example).
  return "dev-only-insecure-secret";
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(data: string): string {
  return b64url(createHmac("sha256", secret()).update(data).digest());
}

/** Buat token: base64url(payload) + "." + base64url(hmac). */
export function signSessionToken(payload: SessionPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${sign(body)}`;
}

/**
 * Verifikasi tanda tangan + kedaluwarsa. Mengembalikan null untuk token
 * apa pun yang tidak valid — pemanggil tidak perlu membedakan alasannya.
 */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;

  const expected = Buffer.from(sign(body), "base64url");
  const got = Buffer.from(mac, "base64url");
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload?.userId || !payload?.role) return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Set cookie sesi. Hanya boleh dipanggil dari Server Action / Route Handler. */
export async function createSessionCookie(payload: Omit<SessionPayload, "exp">): Promise<void> {
  const token = signSessionToken({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // http di laptop apotek (LAN) tidak akan kirim cookie Secure — hanya aktif di produksi HTTPS.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Baca + verifikasi sesi dari cookie permintaan saat ini. */
export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}
