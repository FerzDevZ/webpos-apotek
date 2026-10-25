"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ROLE } from "@/lib/constants";

export type SupplierState = { error?: string; sukses?: boolean } | null;

const SupplierSchema = z.object({
  id: z.string().trim().optional(),
  nama: z.string().trim().min(2, "Nama supplier minimal 2 karakter").max(120),
  telp: z.string().trim().max(30).optional(),
  alamat: z.string().trim().max(200).optional(),
});

export async function simpanSupplier(_prev: SupplierState, formData: FormData): Promise<SupplierState> {
  await requireRole(ROLE.ADMIN, ROLE.APOTEKER);
  const parsed = SupplierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const { id, nama, telp, alamat } = parsed.data;

  if (id) {
    await db.supplier.update({ where: { id }, data: { nama, telp: telp || null, alamat: alamat || null } });
  } else {
    await db.supplier.create({ data: { nama, telp: telp || null, alamat: alamat || null } });
  }
  revalidatePath("/supplier");
  return { sukses: true };
}

export async function hapusSupplier(id: string): Promise<void> {
  await requireRole(ROLE.ADMIN, ROLE.APOTEKER);
  // Tolak hapus bila punya riwayat batch/pembelian — referensi harus utuh.
  const dipakai = await db.supplier.findUnique({
    where: { id },
    select: { _count: { select: { batches: true, purchases: true } } },
  });
  if (!dipakai) return;
  if (dipakai._count.batches === 0 && dipakai._count.purchases === 0) {
    await db.supplier.delete({ where: { id } });
  }
  revalidatePath("/supplier");
}
