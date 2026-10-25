/**
 * Hash password dengan scrypt (bawaan node:crypto, tanpa dependency tambahan).
 *
 * Format tersimpan: `scrypt$<salt-hex>$<hash-hex>`. Prefix algoritma disimpan
 * supaya kalau suatu hari ganti ke argon2, hash lama tetap bisa diverifikasi
 * dan dimigrasi bertahap.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const ALGO = "scrypt";
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN);
  return `${ALGO}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== ALGO || !saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const candidate = scryptSync(password, salt, expected.length);
  // timingSafeEqual melempar kalau panjang beda — cek dulu.
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}
