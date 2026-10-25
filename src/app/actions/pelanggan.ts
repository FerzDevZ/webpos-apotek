"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export type PelangganState = { error?: string; sukses?: boolean } | null;

const PelangganSchema = z.object({
  id: z.string().trim().optional(),
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
  telp: z.string().trim().max(30).optional(),
  alamat: z.string().trim().max(200).optional(),
  tipe: z.enum(["UMUM", "MEMBER"]).default("UMUM"),
  catatan: z.string().trim().max(300).optional(),
});

/** Semua role boleh mengelola pelanggan — kasir butuh ini di lantai toko. */
export async function simpanPelanggan(_prev: PelangganState, formData: FormData): Promise<PelangganState> {
  await requireAuth();
  const parsed = PelangganSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const { id, nama, telp, alamat, tipe, catatan } = parsed.data;

  if (id) {
    await db.customer.update({
      where: { id },
      data: { nama, telp: telp || null, alamat: alamat || null, tipe, catatan: catatan || null },
    });
  } else {
    await db.customer.create({
      data: { nama, telp: telp || null, alamat: alamat || null, tipe, catatan: catatan || null },
    });
  }
  revalidatePath("/pelanggan");
  return { sukses: true };
}
