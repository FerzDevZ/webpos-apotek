/**
 * Data Access Layer (DAL) untuk autentikasi & otorisasi.
 *
 * Dua pintu:
 * - `getCurrentUser()` — dipakai Server Component saat render. Di-cache per sesi
 *   di browser lewat 'use cache: private' (proyek ini mengaktifkan cacheComponents,
 *   jadi pembacaan cookies() harus lewat private cache dan berada dalam <Suspense>).
 * - `getAuthUser()` — dipakai Server Action. Tanpa cache: setiap mutasi wajib
 *   memverifikasi ulang ke DB (user bisa dinonaktifkan / role diganti selama sesi masih hidup).
 */
import { redirect } from "next/navigation";
import { db } from "./db";
import { readSession } from "./session";
import type { Role } from "./constants";

export type AuthUser = {
  id: string;
  nama: string;
  email: string;
  role: Role;
  outletId: string | null;
};

async function loadUser(userId: string): Promise<AuthUser | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, nama: true, email: true, role: true, outletId: true, aktif: true },
  });
  // User yang sudah dinonaktifkan dipaksa keluar walau tokennya belum kedaluwarsa.
  if (!user || !user.aktif) return null;
  return {
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role as Role,
    outletId: user.outletId,
  };
}

/** Untuk render Server Component. WAJIB dipanggil di dalam <Suspense>. */
export async function getCurrentUser(): Promise<AuthUser> {
  "use cache: private";

  const session = await readSession();
  if (!session) redirect("/login");

  const user = await loadUser(session.userId);
  if (!user) redirect("/login");

  return user;
}

/** Untuk Server Action / Route Handler — selalu segar, tidak pernah di-cache. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await readSession();
  if (!session) return null;
  return loadUser(session.userId);
}

/**
 * Guard mutasi: ambil user ter-verifikasi atau gagal.
 * Dipakai di awal setiap Server Action, tepat sebelum menyentuh data.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

/** Guard mutasi + role. Role yang tidak cocuk dialihkan ke dashboard. */
export async function requireRole(...roles: Role[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
