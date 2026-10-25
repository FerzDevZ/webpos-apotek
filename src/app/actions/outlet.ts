"use server";

/**
 * Simpan profil outlet. MVP: single-row (satu apotek). Tabelnya sudah siap
 * multi-outlet; begitu fase 2 mulai, ganti findFirst/update dengan pilihan
 * outlet aktif per user.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ROLE } from "@/lib/constants";

export type OutletState = { error?: string; sukses?: boolean } | null;

const teks = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`);

const OutletSchema = z.object({
  nama: z.string().trim().min(2, "Nama apotek minimal 2 karakter").max(100),
  alamat: teks(200).optional().default(""),
  telp: teks(30).optional().default(""),
  apoteker: teks(100).optional().default(""),
  sia: teks(50).optional().default(""),
  sipa: teks(50).optional().default(""),
  footer: teks(200).optional().default(""),
});

export async function simpanOutlet(_prev: OutletState, formData: FormData): Promise<OutletState> {
  await requireRole(ROLE.ADMIN);

  const parsed = OutletSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const existing = await db.outlet.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) {
    await db.outlet.update({ where: { id: existing.id }, data: parsed.data });
  } else {
    await db.outlet.create({ data: parsed.data });
  }

  revalidatePath("/pengaturan/outlet");
  return { sukses: true };
}
