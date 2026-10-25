"use server";

/**
 * Manajemen pengguna. Khusus ADMIN.
 * Penjagaan: tidak bisa menonaktifkan diri sendiri (mengunci akun sendiri).
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, getAuthUser } from "@/lib/auth";
import { ROLE, type Role } from "@/lib/constants";
import { hashPassword } from "@/lib/password";

export type PenggunaState = { error?: string; sukses?: boolean } | null;

const BuatSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  email: z.string().trim().toLowerCase().email("Email tidak valid").max(120),
  password: z.string().min(6, "Password minimal 6 karakter").max(100),
  role: z.enum(["ADMIN", "APOTEKER", "KASIR"]),
});

const RoleSchema = z.enum(["ADMIN", "APOTEKER", "KASIR"]);

export async function buatPengguna(_prev: PenggunaState, formData: FormData): Promise<PenggunaState> {
  await requireRole(ROLE.ADMIN);
  const parsed = BuatSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const d = parsed.data;

  const bentrok = await db.user.findUnique({ where: { email: d.email }, select: { id: true } });
  if (bentrok) return { error: `Email "${d.email}" sudah terdaftar` };

  await db.user.create({
    data: { nama: d.nama, email: d.email, passwordHash: hashPassword(d.password), role: d.role },
  });
  revalidatePath("/pengguna");
  return { sukses: true };
}

export async function toggleAktifPengguna(userId: string): Promise<void> {
  const saya = await getAuthUser();
  if (!saya || saya.role !== ROLE.ADMIN) return;
  if (saya.id === userId) return; // jangan kunci diri sendiri

  const user = await db.user.findUnique({ where: { id: userId }, select: { aktif: true } });
  if (!user) return;
  await db.user.update({ where: { id: userId }, data: { aktif: !user.aktif } });
  revalidatePath("/pengguna");
}

export async function resetPassword(userId: string, passwordBaru: string): Promise<PenggunaState> {
  await requireRole(ROLE.ADMIN);
  if (passwordBaru.length < 6) return { error: "Password minimal 6 karakter" };
  await db.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(passwordBaru) } });
  revalidatePath("/pengguna");
  return { sukses: true };
}

export async function gantiRole(userId: string, role: string): Promise<void> {
  const saya = await getAuthUser();
  if (!saya || saya.role !== ROLE.ADMIN) return;
  if (saya.id === userId) return; // jangan turunkan role sendiri
  if (!RoleSchema.safeParse(role).success) return;
  await db.user.update({ where: { id: userId }, data: { role: role as Role } });
  revalidatePath("/pengguna");
}
