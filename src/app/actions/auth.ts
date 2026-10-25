"use server";

/**
 * Login & logout. Keamanan: pesan error selalu generik (tidak membocokkan
 * apakah email terdaftar), dan user nonaktif ditolak walau password benar.
 */
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSessionCookie, deleteSessionCookie } from "@/lib/session";
import type { Role } from "@/lib/constants";

export type LoginState = { error?: string } | null;

const LoginSchema = z.object({
  email: z.email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

// Hash dummy untuk menyamakan waktu respon saat email tidak terdaftar
// (mencegah enumerasi user lewat timing).
const DUMMY_HASH =
  "scrypt$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, role: true, aktif: true },
  });

  const cocok = user ? verifyPassword(password, user.passwordHash) : verifyPassword(password, DUMMY_HASH);
  if (!user || !user.aktif || !cocok) {
    return { error: "Email atau password salah" };
  }

  await createSessionCookie({ userId: user.id, role: user.role as Role });
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSessionCookie();
  redirect("/login");
}
