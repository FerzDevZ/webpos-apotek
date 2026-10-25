"use server";

/**
 * Penerimaan barang dari PBF. SATU-SATUNYA jalur stok masuk.
 * Satu faktur -> Purchase + PurchaseItem + Batch (upsert) + StockMovement PURCHASE.
 *
 * Upsert batch: kunci unik (itemId, noBatch, expiry). Batch yang sama
 * (item+noBatch+kadaluarsa identik) berarti lanjutan kiriman -> qty ditambah.
 */
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ROLE } from "@/lib/constants";
import { hargaPerDasar } from "@/lib/units";

export type PembelianState = { error?: string } | null;

const BarisSchema = z.object({
  itemId: z.string().min(1),
  unitId: z.string().optional(),
  qtyUnit: z.coerce.number().int().min(1).max(100_000),
  /** harga beli per SATUAN BELI (mis. per box), bukan per tablet */
  hargaBeliUnit: z.coerce.number().int().min(0).max(1_000_000_000),
  noBatch: z.string().trim().min(1, "Nomor batch wajib diisi").max(60),
  /** YYYY-MM-DD */
  expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kadaluarsa tidak valid"),
});

const FakturSchema = z.object({
  noFaktur: z.string().trim().min(3, "No. faktur wajib diisi").max(60),
  supplierId: z.string().trim().optional(),
  catatan: z.string().trim().max(200).optional(),
});

const RowsSchema = z.array(BarisSchema).min(1, "Minimal 1 baris barang").max(100);

export async function simpanPembelian(_prev: PembelianState, formData: FormData): Promise<PembelianState> {
  await requireRole(ROLE.ADMIN, ROLE.APOTEKER);

  const faktur = FakturSchema.safeParse(Object.fromEntries(formData));
  if (!faktur.success) return { error: faktur.error.issues[0]?.message ?? "Input tidak valid" };

  let baris: z.infer<typeof RowsSchema>;
  try {
    const raw = JSON.parse(String(formData.get("rowsJson") ?? "[]"));
    if (!Array.isArray(raw) || raw.length === 0) return { error: "Minimal 1 baris barang" };
    baris = RowsSchema.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Baris barang tidak valid" };
    return { error: "Data barang rusak — isi ulang daftar barang" };
  }

  // Validasi item & satuan sekali di depan supaya transaksi bersih.
  const itemIds = [...new Set(baris.map((b) => b.itemId))];
  const items = await db.item.findMany({
    where: { id: { in: itemIds } },
    include: { units: true },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));
  for (const b of baris) {
    const item = itemMap.get(b.itemId);
    if (!item) return { error: "Ada barang yang tidak dikenal — muat ulang halaman" };
    const unit = b.unitId ? item.units.find((u) => u.id === b.unitId) : item.units.find((u) => u.faktor === 1);
    if (!unit) return { error: `Satuan untuk ${item.nama} tidak valid` };
    if (unit.faktor !== 1 && b.hargaBeliUnit < unit.faktor) {
      return { error: `Harga ${unit.nama} untuk ${item.nama} terlalu kecil` };
    }
  }

  if (faktur.data.supplierId) {
    const sup = await db.supplier.findUnique({ where: { id: faktur.data.supplierId }, select: { id: true } });
    if (!sup) return { error: "Supplier tidak dikenal" };
  }

  const purchaseId = await db.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        noFaktur: faktur.data.noFaktur,
        supplierId: faktur.data.supplierId || null,
        catatan: faktur.data.catatan || null,
        total: 0,
      },
    });

    let total = 0;
    for (const b of baris) {
      const item = itemMap.get(b.itemId)!;
      const unit = b.unitId ? item.units.find((u) => u.id === b.unitId)! : item.units.find((u) => u.faktor === 1)!;
      const qtyDasar = b.qtyUnit * unit.faktor;
      // harga per satuan dasar dibulatkan ke bawah (HPP tidak boleh lebih mahal dari nyata)
      const hargaDasar = hargaPerDasar(b.hargaBeliUnit, unit.faktor);
      const subtotal = b.hargaBeliUnit * b.qtyUnit;
      total += subtotal;
      const expiry = new Date(`${b.expiry}T00:00:00`);

      // UPSERT batch pada (itemId, noBatch, expiry)
      const batchAda = await tx.batch.findUnique({
        where: { itemId_noBatch_expiry: { itemId: b.itemId, noBatch: b.noBatch, expiry } },
        select: { id: true, qtyAwal: true, qtySisa: true },
      });

      let batchId: string;
      if (batchAda) {
        await tx.batch.update({
          where: { id: batchAda.id },
          data: { qtyAwal: batchAda.qtyAwal + qtyDasar, qtySisa: batchAda.qtySisa + qtyDasar },
        });
        batchId = batchAda.id;
      } else {
        const batchBaru = await tx.batch.create({
          data: {
            itemId: b.itemId,
            supplierId: faktur.data.supplierId || null,
            noBatch: b.noBatch,
            expiry,
            qtyAwal: qtyDasar,
            qtySisa: qtyDasar,
            hargaBeli: hargaDasar,
          },
        });
        batchId = batchBaru.id;
      }

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          itemId: b.itemId,
          unitId: unit.id,
          qtyUnit: b.qtyUnit,
          faktor: unit.faktor,
          qtyDasar,
          hargaBeli: hargaDasar,
          noBatch: b.noBatch,
          expiry,
          batchId,
          subtotal,
        },
      });

      await tx.stockMovement.create({
        data: {
          itemId: b.itemId,
          batchId,
          qty: qtyDasar,
          tipe: "PURCHASE",
          refType: "PURCHASE",
          refId: purchase.id,
          catatan: `Faktur ${faktur.data.noFaktur}`,
        },
      });
    }

    await tx.purchase.update({ where: { id: purchase.id }, data: { total } });
    return purchase.id;
  });

  revalidatePath("/pembelian");
  revalidatePath("/stok");
  redirect(`/pembelian/${purchaseId}`);
}
