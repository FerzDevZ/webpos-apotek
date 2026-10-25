"use server";

/**
 * Simpan & nonaktifkan item obat. Hanya ADMIN dan APOTEKER.
 *
 * Strategi simpan satuan: REPLACE ALL di dalam transaksi (delete + create).
 * Aman untuk histori karena SaleItem/PurchaseItem menyimpan snapshot
 * (faktor, hargaSatuan, qtyDasar) — satuan lama boleh hilang tanpa
 * merusak struk lampau (unitId jadi null oleh SetNull).
 */
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { GOLONGAN, ROLE } from "@/lib/constants";
import { susunUnits, peringatanHarga, type BarisSatuanInput } from "@/lib/obat";

export type ItemState = { error?: string; warning?: string } | null;

const BarisSchema = z.object({
  nama: z.string().trim().min(1).max(30),
  faktor: z.coerce.number().int().min(1).max(10_000),
  hargaJual: z.coerce.number().int().min(0).max(100_000_000),
});

/** Checkbox dikirim sebagai hidden input "true"/"false" dari state form. */
const boolForm = z
  .enum(["true", "false"])
  .transform((v) => v === "true");

const ItemSchema = z.object({
  id: z.string().trim().optional(),
  kode: z.string().trim().max(30).optional(),
  barcode: z.string().trim().max(30).optional(),
  nama: z.string().trim().min(2, "Nama item minimal 2 karakter").max(120),
  kategori: z.string().trim().max(60).optional(),
  pabrik: z.string().trim().max(80).optional(),
  golongan: z.enum(Object.keys(GOLONGAN) as [keyof typeof GOLONGAN, ...(keyof typeof GOLONGAN)[]]),
  satuanDasar: z.string().trim().min(1, "Satuan dasar wajib diisi").max(20),
  hargaJualDasar: z.coerce.number().int().min(0).max(100_000_000),
  stokMinDasar: z.coerce.number().int().min(0).max(1_000_000).default(0),
  requiresResep: boolForm,
  bahanRacikan: boolForm,
  jualBebas: boolForm,
  defaultNama: z.string().trim().max(30).optional(),
});

const UnitsSchema = z.array(BarisSchema).max(10);

/** Kode internal otomatis: OBT-0001, OBT-0002, ... */
async function kodeOtomatis(): Promise<string> {
  const count = await db.item.count();
  for (let i = count + 1; i < count + 1000; i++) {
    const kandidat = `OBT-${String(i).padStart(4, "0")}`;
    const ada = await db.item.findUnique({ where: { kode: kandidat }, select: { id: true } });
    if (!ada) return kandidat;
  }
  throw new Error("Gagal membuat kode item");
}

export async function simpanItem(_prev: ItemState, formData: FormData): Promise<ItemState> {
  await requireRole(ROLE.ADMIN, ROLE.APOTEKER);

  const parsed = ItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }
  const d = parsed.data;

  let baris: BarisSatuanInput[] = [];
  try {
    const raw = formData.get("unitsJson");
    if (raw && String(raw).trim()) {
      baris = UnitsSchema.parse(JSON.parse(String(raw)));
    }
  } catch {
    return { error: "Data satuan rusak — isi ulang bagian satuan" };
  }

  const units = susunUnits(d.satuanDasar, d.hargaJualDasar, baris, d.defaultNama ?? "");
  if (!units.ok) return { error: units.error };

  // Kode & barcode unik (SQLite: cek manual dua langkah, race masih mungkin
  // di multi-user — cukup untuk MVP single-laptop).
  const kode = d.kode || (await kodeOtomatis());
  const bentrokKode = await db.item.findFirst({
    where: { kode, ...(d.id ? { id: { not: d.id } } : {}) },
    select: { id: true },
  });
  if (bentrokKode) return { error: `Kode "${kode}" sudah dipakai item lain` };

  if (d.barcode) {
    const bentrokBarcode = await db.item.findFirst({
      where: { barcode: d.barcode, ...(d.id ? { id: { not: d.id } } : {}) },
      select: { id: true },
    });
    if (bentrokBarcode) return { error: `Barcode "${d.barcode}" sudah dipakai item lain` };
  }

  const dataItem = {
    kode,
    barcode: d.barcode || null,
    nama: d.nama,
    kategori: d.kategori || null,
    pabrik: d.pabrik || null,
    golongan: d.golongan,
    satuanDasar: d.satuanDasar,
    hargaJualDasar: d.hargaJualDasar,
    stokMinDasar: d.stokMinDasar,
    requiresResep: d.requiresResep,
    bahanRacikan: d.bahanRacikan,
    jualBebas: d.jualBebas,
  };

  let itemId: string;
  if (d.id) {
    await db.$transaction(async (tx) => {
      await tx.item.update({ where: { id: d.id }, data: dataItem });
      await tx.itemUnit.deleteMany({ where: { itemId: d.id } });
      await tx.itemUnit.createMany({
        data: units.data.map((u) => ({
          itemId: d.id!,
          nama: u.nama,
          faktor: u.faktor,
          hargaJual: u.hargaJual,
          isDefault: u.isDefault ?? false,
        })),
      });
    });
    itemId = d.id;
  } else {
    itemId = await db.$transaction(async (tx) => {
      const item = await tx.item.create({ data: dataItem });
      await tx.itemUnit.createMany({
        data: units.data.map((u) => ({
          itemId: item.id,
          nama: u.nama,
          faktor: u.faktor,
          hargaJual: u.hargaJual,
          isDefault: u.isDefault ?? false,
        })),
      });
      return item.id;
    });
  }

  revalidatePath("/obat");
  revalidatePath(`/obat/${itemId}`);
  // Harga berjenjang janggal bukan penghalang simpan — kasih tahu lewat flash.
  redirect(`/obat/${itemId}?tersimpan=1${peringatanHarga(units.data).length ? "&peringatan=1" : ""}`);
}

export async function toggleAktifItem(itemId: string): Promise<void> {
  await requireRole(ROLE.ADMIN, ROLE.APOTEKER);
  const item = await db.item.findUnique({ where: { id: itemId }, select: { aktif: true } });
  if (!item) return;
  await db.item.update({ where: { id: itemId }, data: { aktif: !item.aktif } });
  revalidatePath("/obat");
  revalidatePath(`/obat/${itemId}`);
}
