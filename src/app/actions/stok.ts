"use server";

/**
 * Penyesuaian stok (stock opname) & pembuangan (rusak/expired/retur).
 * Keduanya mengurangi/menambah qtySisa batch + menulis StockMovement,
 * sehingga kartu stok selalu bisa direkonsiliasi.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ROLE } from "@/lib/constants";

export type StokState = { error?: string; sukses?: boolean } | null;

const AdjustSchema = z.object({
  batchId: z.string().min(1),
  selisih: z.coerce.number().int().refine((v) => v !== 0, "Selisih tidak boleh 0"),
  alasan: z.string().trim().min(3, "Alasan wajib diisi (min. 3 karakter)").max(200),
});

const BuangSchema = z.object({
  batchId: z.string().min(1),
  qty: z.coerce.number().int().min(1, "Jumlah minimal 1"),
  alasan: z.enum(["EXPIRED", "RUSAK", "RETUR_PBF"]),
  catatan: z.string().trim().max(200).optional(),
});

export async function sesuaikanStok(_prev: StokState, formData: FormData): Promise<StokState> {
  await requireRole(ROLE.ADMIN, ROLE.APOTEKER);
  const parsed = AdjustSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const { batchId, selisih, alasan } = parsed.data;

  const batch = await db.batch.findUnique({ where: { id: batchId }, select: { qtySisa: true, itemId: true } });
  if (!batch) return { error: "Batch tidak ditemukan" };
  if (batch.qtySisa + selisih < 0) return { error: `Selisih melebihi stok saat ini (${batch.qtySisa})` };

  await db.$transaction([
    db.batch.update({ where: { id: batchId }, data: { qtySisa: { increment: selisih } } }),
    db.stockMovement.create({
      data: {
        itemId: batch.itemId,
        batchId,
        qty: selisih,
        tipe: "ADJUST",
        refType: "MANUAL",
        catatan: alasan,
      },
    }),
  ]);

  revalidatePath("/stok");
  revalidatePath("/obat");
  return { sukses: true };
}

export async function buangBatch(_prev: StokState, formData: FormData): Promise<StokState> {
  const user = await requireRole(ROLE.ADMIN, ROLE.APOTEKER);
  const parsed = BuangSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const { batchId, qty, alasan, catatan } = parsed.data;

  const batch = await db.batch.findUnique({ where: { id: batchId }, select: { qtySisa: true, itemId: true } });
  if (!batch) return { error: "Batch tidak ditemukan" };
  if (qty > batch.qtySisa) return { error: `Melebihi stok batch (${batch.qtySisa})` };

  await db.$transaction([
    db.batch.update({ where: { id: batchId }, data: { qtySisa: { decrement: qty } } }),
    db.expiryDisposal.create({
      data: { batchId, itemId: batch.itemId, qty, alasan, catatan: catatan || null, userId: user.id },
    }),
    db.stockMovement.create({
      data: {
        itemId: batch.itemId,
        batchId,
        qty: -qty,
        tipe: "DISPOSE",
        refType: "DISPOSAL",
        catatan: `${alasan}${catatan ? ` — ${catatan}` : ""}`,
        userId: user.id,
      },
    }),
  ]);

  revalidatePath("/stok");
  revalidatePath("/obat");
  return { sukses: true };
}
