"use server";

/**
 * Mesin kasir. Semua keputusan stok (FEFO) terjadi DI SINI, di server —
 * klien hanya mengirim daftar (itemId, unitId, qty). Kasir tidak pernah
 * memilih batch: sistem yang memilih yang kedaluwarsa paling dekat.
 *
 * Obat wajib resep tidak bisa lewat sini — jalurnya lewat modul Resep
 * (satu-satunya pintu legal untuk penjualan obat keras).
 */
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { wajibResep } from "@/lib/constants";
import { computeTotals, hitungKembali } from "@/lib/money";
import { alokasiFefo } from "@/lib/fefo";

export type KasirState = { error?: string; saleId?: string } | null;

const LineSchema = z.object({
  itemId: z.string().min(1),
  unitId: z.string().min(1),
  qtyUnit: z.coerce.number().int().min(1).max(1_000),
});

const BayarSchema = z.object({
  lines: z.array(LineSchema).min(1, "Keranjang kosong").max(200),
  customerId: z.string().optional(),
  diskonNota: z.coerce.number().int().min(0).default(0),
  metodeBayar: z.enum(["TUNAI", "QRIS", "DEBIT", "TRANSFER"]),
  bayar: z.coerce.number().int().min(0),
  catatan: z.string().trim().max(200).optional(),
});

export type CariItemHasil = {
  id: string;
  nama: string;
  kode: string;
  golongan: string;
  requiresResep: boolean;
  satuanDasar: string;
  stokLayak: number;
  units: { id: string; nama: string; faktor: number; hargaJual: number; isDefault: boolean }[];
};

/** Pencarian untuk layar kasir (dipanggil dari client). */
export async function cariItemKasir(q: string): Promise<CariItemHasil[]> {
  await requireAuth();
  const semua = await db.item.findMany({
    where: { aktif: true },
    include: { units: true, batches: { select: { expiry: true, qtySisa: true } } },
    orderBy: { nama: "asc" },
  });
  const kunci = q.trim().toLowerCase();
  const batas = new Date();
  batas.setHours(0, 0, 0, 0);

  return semua
    .filter((i) => {
      if (!kunci) return true;
      const he = `${i.nama} ${i.kode} ${i.barcode ?? ""}`.toLowerCase();
      return he.includes(kunci);
    })
    .slice(0, 12)
    .map((i) => ({
      id: i.id,
      nama: i.nama,
      kode: i.kode,
      golongan: i.golongan,
      requiresResep: wajibResep(i.golongan, i.requiresResep),
      satuanDasar: i.satuanDasar,
      stokLayak: i.batches.reduce(
        (a, b) => (b.qtySisa > 0 && b.expiry.getTime() >= batas.getTime() ? a + b.qtySisa : a),
        0,
      ),
      units: i.units.map((u) => ({
        id: u.id,
        nama: u.nama,
        faktor: u.faktor,
        hargaJual: u.hargaJual,
        isDefault: u.isDefault,
      })),
    }));
}

export async function selesaikanPenjualan(_prev: KasirState, formData: FormData): Promise<KasirState> {
  const user = await requireAuth();

  let input: z.infer<typeof BayarSchema>;
  try {
    input = BayarSchema.parse({
      lines: JSON.parse(String(formData.get("linesJson") ?? "[]")),
      customerId: formData.get("customerId") || undefined,
      diskonNota: formData.get("diskonNota") || 0,
      metodeBayar: formData.get("metodeBayar"),
      bayar: formData.get("bayar") || 0,
      catatan: formData.get("catatan") || undefined,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Data tidak valid" };
    return { error: "Data tidak valid" };
  }

  // Muat item + unit + batch sekali.
  const itemIds = [...new Set(input.lines.map((l) => l.itemId))];
  const items = await db.item.findMany({
    where: { id: { in: itemIds }, aktif: true },
    include: { units: true, batches: { where: { qtySisa: { gt: 0 } }, orderBy: { expiry: "asc" } } },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const hasilBaris: {
    itemId: string;
    itemNama: string;
    unitId: string;
    unitNama: string;
    faktor: number;
    qtyUnit: number;
    qtyDasar: number;
    hargaSatuan: number;
    alokasi: { batchId: string; qty: number; hargaBeli: number }[];
  }[] = [];

  for (const l of input.lines) {
    const item = itemMap.get(l.itemId);
    if (!item) return { error: "Ada barang yang tidak dikenal — muat ulang halaman kasir" };
    if (wajibResep(item.golongan, item.requiresResep)) {
      return { error: `${item.nama} wajib resep — layani lewat modul Resep` };
    }
    const unit = item.units.find((u) => u.id === l.unitId);
    if (!unit) return { error: `Satuan untuk ${item.nama} tidak valid` };
    const qtyDasar = l.qtyUnit * unit.faktor;
    if (qtyDasar > 2_000_000) return { error: `Jumlah ${item.nama} tidak masuk akal` };

    const fefo = alokasiFefo(item.batches, qtyDasar);
    if (fefo.qtyKurang > 0) {
      return {
        error: `Stok ${item.nama} tidak cukup: kurang ${fefo.qtyKurang} ${item.satuanDasar}${fefo.qtyExpired > 0 ? " (sebagian batch sudah kadaluarsa)" : ""}`,
      };
    }
    hasilBaris.push({
      itemId: item.id,
      itemNama: item.nama,
      unitId: unit.id,
      unitNama: unit.nama,
      faktor: unit.faktor,
      qtyUnit: l.qtyUnit,
      qtyDasar,
      hargaSatuan: unit.hargaJual,
      alokasi: fefo.allocations.map((a) => ({ batchId: a.batchId, qty: a.qty, hargaBeli: a.hargaBeli })),
    });
  }

  if (input.bayar < 0) return { error: "Pembayaran tidak valid" };

  const lines = hasilBaris.map((b) => ({ hargaSatuan: b.hargaSatuan, qtyUnit: b.qtyUnit }));
  const totals = computeTotals(lines, input.diskonNota);
  if (input.metodeBayar === "TUNAI" && input.bayar < totals.total) {
    return { error: "Uang bayar kurang dari total" };
  }

  const noStruk = await buatNoStruk();
  const saleId = await db.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        noStruk,
        kasirId: user.id,
        outletId: user.outletId,
        customerId: input.customerId || null,
        subtotal: totals.subtotal,
        diskon: totals.diskon,
        total: totals.total,
        bayar: input.bayar,
        kembali: hitungKembali(input.bayar, totals.total),
        metodeBayar: input.metodeBayar,
        status: "PAID",
        catatan: input.catatan || null,
      },
    });
    for (const b of hasilBaris) {
      for (const a of b.alokasi) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            itemId: b.itemId,
            batchId: a.batchId,
            unitId: b.unitId,
            qtyUnit: b.qtyUnit,
            faktor: b.faktor,
            qtyDasar: b.qtyDasar,
            hargaSatuan: b.hargaSatuan,
            subtotal: b.hargaSatuan * b.qtyUnit,
            namaSnapshot: b.itemNama,
          },
        });
        await tx.batch.update({ where: { id: a.batchId }, data: { qtySisa: { decrement: a.qty } } });
        await tx.stockMovement.create({
          data: {
            itemId: b.itemId,
            batchId: a.batchId,
            qty: -a.qty,
            tipe: "SALE",
            refType: "SALE",
            refId: sale.id,
            userId: user.id,
          },
        });
      }
    }
    return sale.id;
  });

  revalidatePath("/kasir");
  revalidatePath("/laporan");
  redirect(`/struk/${saleId}?cetak=1`);
}

async function buatNoStruk(): Promise<string> {
  const now = new Date();
  const prefiks = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const jumlahHariIni = await db.sale.count({
    where: { noStruk: { startsWith: prefiks } },
  });
  return `${prefiks}-${String(jumlahHariIni + 1).padStart(4, "0")}`;
}

export async function voidPenjualan(saleId: string, alasan: string): Promise<KasirState> {
  const user = await requireAuth();
  // Hanya ADMIN/APOTEKER yang boleh membatalkan.
  if (user.role !== "ADMIN" && user.role !== "APOTEKER") return { error: "Hanya admin/apoteker boleh membatalkan" };
  if (alasan.trim().length < 3) return { error: "Alasan wajib diisi" };

  const sale = await db.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!sale) return { error: "Struk tidak ditemukan" };
  if (sale.status !== "PAID") return { error: "Struk sudah dibatalkan" };

  await db.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: saleId },
      data: { status: "VOID", voidedAt: new Date(), voidReason: alasan.trim() },
    });
    for (const it of sale.items) {
      await tx.batch.update({ where: { id: it.batchId }, data: { qtySisa: { increment: it.qtyDasar } } });
      await tx.stockMovement.create({
        data: {
          itemId: it.itemId,
          batchId: it.batchId,
          qty: it.qtyDasar,
          tipe: "VOID_SALE",
          refType: "SALE",
          refId: saleId,
          userId: user.id,
          catatan: alasan.trim(),
        },
      });
    }
  });

  revalidatePath(`/struk/${saleId}`);
  revalidatePath("/laporan");
  revalidatePath("/kasir");
  return { saleId };
}
