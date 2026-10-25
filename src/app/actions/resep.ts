"use server";

/**
 * Resep dokter & pelayanannya.
 * - Obat KERAS/NARKOTIKA/PSIKOTROPIKA hanya legal dijual lewat JALUR INI.
 * - Stok dialokasi FEFO saat "Proses ke Penjualan", bukan saat resep dicatat
 *   (resep bisa ditulis dulu, obat diambil kemudian).
 * - iter: berapa kali resep boleh dilayani. Setiap penjualan mengurangi.
 */
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ROLE } from "@/lib/constants";
import { alokasiFefo } from "@/lib/fefo";
import { computeTotals } from "@/lib/money";
import { parseQtyMilli } from "@/lib/money";
import { bolehDiulang } from "@/lib/signa";

export type ResepState = { error?: string } | null;

const BarisNonRacikan = z.object({
  itemId: z.string().min(1, "Pilih obat"),
  /** jumlah dalam satuan dasar, boleh desimal ("2.5") -> disimpan milli */
  jumlah: z.string().trim().min(1),
  signa: z.string().trim().max(120).optional(),
});

const BarisRacikan = z.object({
  itemId: z.string().optional(),
  namaBahan: z.string().trim().min(1, "Nama bahan wajib diisi").max(120),
  jumlah: z.string().trim().min(1),
  jumlahDosis: z.coerce.number().int().min(1).max(1000).default(1),
  subtotalManual: z.coerce.number().int().min(0).max(100_000_000).default(0),
});

const ResepSchema = z.object({
  pasienNama: z.string().trim().min(2, "Nama pasien wajib diisi").max(120),
  pasienTelp: z.string().trim().max(30).optional(),
  umur: z.coerce.number().int().min(0).max(150).optional(),
  dokter: z.string().trim().min(2, "Nama dokter wajib diisi").max(120),
  noSIP: z.string().trim().max(50).optional(),
  customerId: z.string().trim().optional(),
  tipe: z.enum(["NON_RACIKAN", "RACIKAN"]),
  iter: z.coerce.number().int().min(1).max(99).default(1),
  catatan: z.string().trim().max(300).optional(),
});

const NonRacikanSchema = z.array(BarisNonRacikan).max(30);
const RacikanSchema = z.array(BarisRacikan).max(30);

function noResepBaru(): string {
  const now = new Date();
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `RS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${rand}`;
}

export async function simpanResep(_prev: ResepState, formData: FormData): Promise<ResepState> {
  await requireRole(ROLE.ADMIN, ROLE.APOTEKER);

  const dasar = ResepSchema.safeParse(Object.fromEntries(formData));
  if (!dasar.success) return { error: dasar.error.issues[0]?.message ?? "Input tidak valid" };
  const d = dasar.data;
  const tipe = formData.get("tipe") === "RACIKAN" ? "RACIKAN" : "NON_RACIKAN";

  let nonRacikan: z.infer<typeof NonRacikanSchema> = [];
  let racikan: z.infer<typeof RacikanSchema> = [];
  try {
    if (tipe === "NON_RACIKAN") {
      nonRacikan = NonRacikanSchema.parse(JSON.parse(String(formData.get("nonRacikanJson") ?? "[]")));
      if (nonRacikan.length === 0) return { error: "Minimal 1 obat pada resep" };
    } else {
      racikan = RacikanSchema.parse(JSON.parse(String(formData.get("racikanJson") ?? "[]")));
      if (racikan.length === 0) return { error: "Minimal 1 bahan pada racikan" };
    }
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Data resep tidak valid" };
    return { error: "Data resep rusak — isi ulang" };
  }

  if (tipe === "NON_RACIKAN") {
    const itemIds = nonRacikan.map((b) => b.itemId);
    const count = await db.item.count({ where: { id: { in: itemIds } } });
    if (count !== new Set(itemIds).size) return { error: "Ada obat yang tidak dikenal" };
    for (const b of nonRacikan) {
      if (parseQtyMilli(b.jumlah) <= 0) return { error: "Jumlah obat minimal 0.001" };
    }
  } else {
    // bahan racikan yang menunjuk stok harus dikenal + punya satuan dasar
    const racikanItemIds = racikan.map((b) => b.itemId).filter((x): x is string => !!x);
    if (racikanItemIds.length > 0) {
      const n = await db.item.count({ where: { id: { in: racikanItemIds } } });
      if (n !== new Set(racikanItemIds).size) return { error: "Ada bahan racikan yang tidak dikenal" };
    }
    for (const b of racikan) {
      if (parseQtyMilli(b.jumlah) <= 0) return { error: `Takaran "${b.namaBahan}" minimal 0.001` };
    }
  }

  const resepId = await db.$transaction(async (tx) => {
    const resep = await tx.resep.create({
      data: {
        noResep: noResepBaru(),
        pasienNama: d.pasienNama,
        pasienTelp: d.pasienTelp || null,
        umur: d.umur ?? null,
        dokter: d.dokter,
        noSIP: d.noSIP || null,
        customerId: d.customerId || null,
        tipe,
        iter: d.iter,
        catatan: d.catatan || null,
      },
    });

    if (tipe === "NON_RACIKAN") {
      const items = await tx.item.findMany({ where: { id: { in: nonRacikan.map((b) => b.itemId) } } });
      const itemMap = new Map(items.map((i) => [i.id, i]));
      for (const b of nonRacikan) {
        const item = itemMap.get(b.itemId)!;
        const qtyMilli = parseQtyMilli(b.jumlah);
        // Harga sementara: per satuan dasar × jumlah. Final dihitung saat penjualan.
        const subtotal = Math.ceil(qtyMilli / 1000) * item.hargaJualDasar;
        await tx.resepItem.create({
          data: {
            resepId: resep.id,
            itemId: b.itemId,
            namaBahan: item.nama,
            qtyMilli,
            satuan: item.satuanDasar,
            aturanPakai: b.signa ? b.signa : null,
            isRacikan: false,
            subtotal,
          },
        });
      }
    } else {
      // satuan bahan stok mengikuti satuan dasar itemnya
      const bahanIds = racikan.map((b) => b.itemId).filter((x): x is string => !!x);
      const bahanItems = bahanIds.length ? await tx.item.findMany({ where: { id: { in: bahanIds } }, select: { id: true, satuanDasar: true } }) : [];
      const bahanMap = new Map(bahanItems.map((i) => [i.id, i]));
      for (const b of racikan) {
        await tx.resepItem.create({
          data: {
            resepId: resep.id,
            itemId: b.itemId || null,
            namaBahan: b.namaBahan,
            qtyMilli: parseQtyMilli(b.jumlah),
            satuan: b.itemId ? (bahanMap.get(b.itemId)?.satuanDasar ?? "bagian") : "bagian",
            aturanPakai: null,
            jumlahDosis: b.jumlahDosis,
            isRacikan: true,
            subtotal: b.subtotalManual,
          },
        });
      }
    }
    return resep.id;
  });

  revalidatePath("/resep");
  redirect(`/resep/${resepId}`);
}

/** Proses resep jadi penjualan: alokasi FEFO, kurangi stok, kurangi iter. */
export async function prosesResepKePenjualan(resepId: string): Promise<ResepState> {
  const user = await requireRole(ROLE.ADMIN, ROLE.APOTEKER);

  const resep = await db.resep.findUnique({
    where: { id: resepId },
    include: { items: true, sale: { select: { id: true } } },
  });
  if (!resep) return { error: "Resep tidak ditemukan" };
  if (resep.sale) return { error: "Resep ini sudah diproses menjadi penjualan" };

  const sudahDilayani = await db.sale.count({ where: { resepId } });
  if (!bolehDiulang(resep.iter, sudahDilayani)) {
    return { error: `Iter resep habis (iter ${resep.iter}, sudah dilayani ${sudahDilayani}x)` };
  }

  // Ambil semua item obat yang terlibat + batch untuk FEFO.
  const itemIds = resep.items.filter((i) => i.itemId).map((i) => i.itemId!);
  const items = itemIds.length
    ? await db.item.findMany({
        where: { id: { in: itemIds }, aktif: true },
        include: { units: true, batches: { where: { qtySisa: { gt: 0 } }, orderBy: { expiry: "asc" } } },
      })
    : [];
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const baris: {
    itemId: string;
    namaSnapshot: string;
    unitId: string | null;
    faktor: number;
    qtyUnit: number;
    qtyDasar: number;
    hargaSatuan: number;
    subtotal: number;
    alokasi: { batchId: string; qty: number }[];
  }[] = [];

  for (const ri of resep.items) {
    if (ri.isRacikan) {
      // Racikan tidak memakan stok langsung di MVP — harganya input manual.
      // (Pemecahan stok per bahan racikan masuk penyempurnaan berikutnya.)
      continue;
    }
    const item = itemMap.get(ri.itemId!);
    if (!item) return { error: `Obat "${ri.namaBahan}" tidak lagi tersedia/aktif` };
    if (ri.qtyMilli <= 0) return { error: `Jumlah "${ri.namaBahan}" tidak valid` };

    // qtyMilli bisa pecahan (2.5 tablet). Alokasi FEFO butuh integer: bulatkan ke atas.
    const qtyDasar = Math.ceil(ri.qtyMilli / 1000);
    const fefo = alokasiFefo(item.batches, qtyDasar);
    if (fefo.qtyKurang > 0) {
      return { error: `Stok "${ri.namaBahan}" tidak cukup: kurang ${fefo.qtyKurang} ${item.satuanDasar}` };
    }
    // Harga: per satuan dasar × qtyDasar.
    const hargaSatuan = item.hargaJualDasar;
    baris.push({
      itemId: item.id,
      namaSnapshot: item.nama,
      unitId: null,
      faktor: 1,
      qtyUnit: qtyDasar,
      qtyDasar,
      hargaSatuan,
      subtotal: hargaSatuan * qtyDasar,
      alokasi: fefo.allocations.map((a) => ({ batchId: a.batchId, qty: a.qty })),
    });
  }

  const subtotalRacikan = resep.items.filter((i) => i.isRacikan).reduce((a, i) => a + i.subtotal, 0);
  const totals = computeTotals(baris.map((b) => ({ hargaSatuan: b.hargaSatuan, qtyUnit: b.qtyUnit })), 0);
  const grandTotal = totals.total + subtotalRacikan;

  const noStruk = `RX-${noResepBaru().slice(3)}`;
  const saleId = await db.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        noStruk,
        kasirId: user.id,
        outletId: user.outletId,
        customerId: resep.customerId,
        resepId: resep.id,
        subtotal: totals.subtotal + subtotalRacikan,
        diskon: 0,
        total: grandTotal,
        bayar: grandTotal,
        kembali: 0,
        metodeBayar: "TUNAI",
        status: "PAID",
        catatan: `Resep ${resep.noResep} — ${resep.pasienNama}`,
      },
    });
    for (const b of baris) {
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
            subtotal: b.subtotal,
            namaSnapshot: b.namaSnapshot,
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
            catatan: `Resep ${resep.noResep}`,
          },
        });
      }
    }
    return sale.id;
  });

  revalidatePath("/resep");
  revalidatePath(`/resep/${resepId}`);
  revalidatePath("/laporan");
  redirect(`/struk/${saleId}?cetak=1`);
}
